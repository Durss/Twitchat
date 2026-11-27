import type { StoreActions } from "@/types/pinia-helpers";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { toast } from "@/utils/toast/toast";
import Utils from "@/utils/Utils";
import Groq from "groq-sdk";
import { acceptHMRUpdate, defineStore } from "pinia";
import { reactive } from "vue";
import Database from "../Database";
import DataStore from "../DataStore";
import type { IGroqActions, IGroqGetters, IGroqState } from "../StoreProxy";
import StoreProxy from "../StoreProxy";

let groq: Groq | null = null;
const OPEN_TAG = "⟦";
const CLOSE_TAG = "⟧";
const CHAT_LOG_TAG = "chat_log";
/**
 * Default model candidates by order of preference.
 * Groq regularly shuts models down: https://console.groq.com/docs/deprecations
 */
const PREFERRED_MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"];
/**
 * Minimum delay between 2 updates of a streamed answer.
 * Groq sends hundreds of tokens per second, each update re-renders the answer
 * and scrolls the history panel.
 */
const ANSWER_UPDATE_INTERVAL = 50;

const getModelType = (id: string): IGroqState["availableModels"][number]["type"] => {
	if (id.includes("whisper")) return "stt";
	if (id.includes("tts") || id.includes("orpheus")) return "tts";
	if (id.includes("guard")) return "guard";
	if (id.includes("vision")) return "vision";
	return "text";
};

/**
 * Switches the default model if it's not available anymore
 */
const refreshDefaultModel = (): void => {
	const store = StoreProxy.groq;
	const models = store.availableModels.filter((m) => m.type === "text");
	if (models.some((m) => m.id === store.defaultModel)) return;
	const fallback =
		PREFERRED_MODELS.find((id) => models.some((m) => m.id === id)) ?? models[0]?.id;
	if (!fallback) return;
	store.defaultModel = fallback;
	store.saveConfigs();
};

/**
 * Sends a request and, if its model has been shut down, sends it again with
 * the default model.
 * Checking the models list isn't enough as it may still advertise that model.
 */
const withFallbackModel = async <T>(
	model: string,
	request: (model: string) => Promise<T>,
): Promise<T> => {
	try {
		return await request(model);
	} catch (error) {
		const body = error instanceof Groq.APIError ? error.error : undefined;
		const code = (body as { error?: { code?: string } } | undefined)?.error?.code;
		if (code !== "model_decommissioned" && code !== "model_not_found") throw error;

		const store = StoreProxy.groq;
		store.availableModels = store.availableModels.filter((m) => m.id !== model);
		refreshDefaultModel();
		if (store.defaultModel === model) throw error;
		return request(store.defaultModel);
	}
};

/**
 * Params common to all text generations.
 * Reasoning tokens count towards max_completion_tokens. GPT-OSS models reason
 * at "medium" level by default which isn't needed here and could leave no room
 * for the actual answer. Not all models accept this value.
 */
const getCompletionParams = (
	messages: Groq.Chat.Completions.ChatCompletionMessageParam[],
	model: string,
) => ({
	messages,
	model,
	temperature: 0.5,
	max_completion_tokens: 2048,
	...(model.startsWith("openai/gpt-oss") && { reasoning_effort: "low" as const }),
});

/**
 * Some models write their reasoning within the answer, in <think> tags.
 * Also removes an unclosed block so it's not displayed while streaming.
 */
const stripReasoning = (text: string): string =>
	text.replace(/<think>[\s\S]*?(<\/think>\s*|$)/g, "");

type UserMap = TwitchatDataTypes.GroqHistoryItem["userMap"];

/**
 * Entries saved before follow-up questions were sent with their history.
 * A follow-up question replaced the preprompt and its answer the previous one.
 */
type LegacyGroqHistoryItem = Omit<TwitchatDataTypes.GroqHistoryItem, "turns"> & {
	turns?: TwitchatDataTypes.GroqHistoryTurn[];
	preprompt?: string;
	answer?: string;
};

const toCurrentHistoryItem = (entry: LegacyGroqHistoryItem): TwitchatDataTypes.GroqHistoryItem => {
	if (entry.turns) return entry as TwitchatDataTypes.GroqHistoryItem;
	const { preprompt = "", answer = "", ...rest } = entry;
	return { ...rest, turns: [{ question: preprompt, answer }] };
};

/**
 * Gets the anonymized name of a user, creates it if missing
 */
const getAnonUserName = (login: string, userMap: UserMap): string => {
	const key = Object.keys(userMap).find((v) => v.toLowerCase() === login.toLowerCase());
	if (key) return userMap[key]!;
	// Count names, not keys, as a user may have an alias
	const username = OPEN_TAG + new Set(Object.values(userMap)).size + CLOSE_TAG;
	userMap[login] = username;
	return username;
};

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Replaces mentions and names of known users with their anonymized version.
 * Mentions of unknown users are added to the map.
 */
const anonymize = (text: string, userMap: UserMap): string => {
	text = text.replace(/@(\w+)/g, (_, mention: string) => "@" + getAnonUserName(mention, userMap));
	// Longest first so a name containing another one is replaced entirely
	const names = Object.keys(userMap)
		.sort((a, b) => b.length - a.length)
		.map(escapeRegExp);
	if (names.length === 0) return text;
	// Whole words only, a user called "lol" shouldn't alter "lolilol"
	const nameRegex = new RegExp(
		`(?<![\\p{L}\\p{N}_])(?:${names.join("|")})(?![\\p{L}\\p{N}_])`,
		"giu",
	);
	return text.replace(nameRegex, (name) => getAnonUserName(name, userMap));
};

/**
 * Builds an anonymized chat log of the given messages, one line per user.
 * Fills the given user map.
 */
const buildChatLog = (messages: TwitchatDataTypes.MessageChatData[], userMap: UserMap): string => {
	const sortedList = [...messages].sort((a, b) => a.date - b.date);
	// Register all users first so their names are anonymized wherever they appear
	for (const m of sortedList) {
		const anonUser = getAnonUserName(m.user.displayNameOriginal, userMap);
		// Mentions use the login, which may differ from the display name
		if (!Object.keys(userMap).some((v) => v.toLowerCase() === m.user.login.toLowerCase())) {
			userMap[m.user.login] = anonUser;
		}
	}

	const lines: string[] = [];
	let currentUser = "";
	// Merge consecutive messages from same users to reduce token usage
	const splitter = " — ";
	for (const m of sortedList) {
		const anonUser = getAnonUserName(m.user.displayNameOriginal, userMap);
		// A message shouldn't be able to close the chat log and add instructions after it
		const message = m.message.replace(new RegExp(`</?${CHAT_LOG_TAG}>`, "gi"), "");
		if (currentUser != anonUser) {
			currentUser = anonUser;
			lines.push(anonUser + ": " + message);
		} else {
			lines[lines.length - 1] += splitter + message;
		}
	}
	return anonymize(lines.join("\n"), userMap);
};

/**
 * Builds the messages sent to Groq for the last question of the given entry.
 * The system message only gives rules, each question is a user message and
 * the previous answers are sent back so follow-up questions have the context.
 */
const buildConversation = (
	entry: TwitchatDataTypes.GroqHistoryItem,
): Groq.Chat.Completions.ChatCompletionMessageParam[] => {
	const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
		{ role: "system", content: StoreProxy.i18n.t("groq.conversation_preprompt") },
	];
	entry.turns.forEach((turn, index) => {
		let question = turn.question.trim() || StoreProxy.i18n.t("groq.summary_task");
		// The question comes after the chat log, so that's what the model answers
		if (index === 0) {
			question = `<${CHAT_LOG_TAG}>\n${entry.prompt.trim()}\n</${CHAT_LOG_TAG}>\n\n${question}`;
		}
		messages.push({ role: "user", content: question });
		if (turn.answer) messages.push({ role: "assistant", content: turn.answer });
	});
	return messages;
};

/**
 * Streams the answer to the given turn, which must be the last one of the entry
 * @returns the answer, empty if none could be generated
 */
const streamAnswer = async (
	client: Groq,
	entry: TwitchatDataTypes.GroqHistoryItem,
	turn: TwitchatDataTypes.GroqHistoryTurn,
): Promise<string> => {
	let rawAnswer = "";
	const updateAnswer = () => {
		turn.answer = stripReasoning(rawAnswer);
	};
	try {
		const messages = buildConversation(entry);
		const stream = await withFallbackModel(StoreProxy.groq.defaultModel, (model) =>
			client.chat.completions.create({
				...getCompletionParams(messages, model),
				stream: true,
			}),
		);

		let lastUpdate = 0;
		for await (const chunk of stream) {
			rawAnswer += chunk.choices[0]?.delta?.content || "";
			if (Date.now() - lastUpdate < ANSWER_UPDATE_INTERVAL) continue;
			lastUpdate = Date.now();
			updateAnswer();
		}
		updateAnswer();
		if (!turn.answer) throw new Error("Empty answer");
	} catch (error) {
		console.error(error);
		updateAnswer();
		toast(
			StoreProxy.i18n.t("groq.generation_error", {
				ERROR: (error as Error).message,
			}),
			{ type: "error" },
		);
	}
	return turn.answer;
};

export const storeGroq = defineStore("groq", {
	state: (): IGroqState => ({
		apiKey: "",
		connected: false,
		creditsTotal: 0,
		creditsUsed: 0,
		defaultModel: PREFERRED_MODELS[0]!,
		availableModels: [],
		answerHistory: [],
	}),

	getters: {
		enabled: function () {
			return StoreProxy.auth.featureFlags.includes("groq");
		},
	},

	actions: {
		async populateData(): Promise<void> {
			const apiKey = DataStore.get(DataStore.GROQ_API_KEY);
			if (apiKey) {
				this.apiKey = apiKey;
			}
			const configs = DataStore.get(DataStore.GROQ_CONFIGS);
			if (configs) {
				const { defaultModel } = JSON.parse(configs) as IStoreData;
				this.defaultModel = defaultModel;
			}
			if (this.apiKey) await this.connect();
		},

		async preloadMessageHistory(): Promise<void> {
			void Database.instance.getGroqHistoryList().then((res) => {
				if (res.length === 0) return;
				this.answerHistory = (res as LegacyGroqHistoryItem[]).map(toCurrentHistoryItem);
			});
		},

		async connect(): Promise<boolean> {
			this.connected = false;
			return new Promise<boolean>((resolve) => {
				try {
					groq = new Groq({ apiKey: this.apiKey, dangerouslyAllowBrowser: true });
					groq.models
						.list()
						.then((models) => {
							this.availableModels = (models.data as typeof this.availableModels)
								.filter((model) => model.active !== false)
								.map((model) => ({ ...model, type: getModelType(model.id) }));
							refreshDefaultModel();
							this.connected = true;
							resolve(true);
						})
						.catch((error) => {
							console.error(error);
							resolve(false);
						});
					this.saveConfigs();
				} catch (_error) {
					resolve(false);
				}
			});
		},

		disconnect(): void {
			this.connected = false;
			DataStore.remove(DataStore.GROQ_API_KEY);
		},

		saveConfigs(): void {
			DataStore.set(DataStore.GROQ_API_KEY, this.apiKey);
			const configs: IStoreData = {
				defaultModel: this.defaultModel,
			};
			DataStore.set(DataStore.GROQ_CONFIGS, configs);
		},

		async getSummary(
			messagesList: TwitchatDataTypes.MessageChatData[],
			preprompt: string = "",
		): Promise<string> {
			if (!groq) await this.connect();
			if (!groq || !this.connected) return "";

			const userMap: UserMap = {};
			const prompt = buildChatLog(messagesList, userMap);
			const historyEntry: TwitchatDataTypes.GroqHistoryItem = reactive({
				id: Utils.getUUID(),
				date: Date.now(),
				prompt,
				userMap,
				turns: [{ question: anonymize(preprompt.trim(), userMap), answer: "" }],
			});
			this.answerHistory.push(historyEntry);
			StoreProxy.params.openModal("groqHistory", true);

			const answer = await streamAnswer(groq, historyEntry, historyEntry.turns[0]!);
			if (!answer) {
				// Don't leave a new entry loading forever
				this.answerHistory = this.answerHistory.filter(
					(entry) => entry.id !== historyEntry.id,
				);
				if (this.answerHistory.length === 0) StoreProxy.params.closeModal();
				return "";
			}

			await Database.instance.addGroqHistory(historyEntry);
			return answer;
		},

		async removeAnswer(id: string): Promise<void> {
			return new Promise<void>((resolve) => {
				StoreProxy.main
					.confirm(
						StoreProxy.i18n.t("groq.history.delete_confirm.title"),
						StoreProxy.i18n.t("groq.history.delete_confirm.message"),
					)
					.then((_result) => {
						this.answerHistory.splice(
							this.answerHistory.findIndex((entry) => entry.id === id),
							1,
						);
						void Database.instance.deleteGroqHistory(id);
						resolve();
					})
					.catch(() => {
						resolve();
					});
			});
		},

		async repromptHistoryEntry(id: string, prompt: string): Promise<boolean> {
			const entry = this.answerHistory.find((entry) => entry.id === id);
			if (!entry || !prompt.trim()) return false;
			if (!groq) await this.connect();
			if (!groq || !this.connected) return false;

			const index =
				entry.turns.push({
					question: anonymize(prompt.trim(), entry.userMap),
					answer: "",
				}) - 1;
			// Reactive version so the answer is displayed while it's streamed
			const turn = entry.turns[index]!;
			const answer = await streamAnswer(groq, entry, turn);
			if (!answer) {
				// Don't leave the question loading forever
				entry.turns.splice(entry.turns.indexOf(turn), 1);
				return false;
			}

			await Database.instance.updateGroqHistory(entry);
			return true;
		},

		async executeQuery(
			preprompt: string,
			prompt: string,
			model: string = "",
			jsonSchema?: string,
		): Promise<string | false> {
			if (!groq) await this.connect();
			if (!groq || !this.connected) return Promise.resolve("");
			const client = groq;

			const promptList: Groq.Chat.Completions.ChatCompletionMessageParam[] = [];

			// JSON mode requires the messages to ask for JSON, even without preprompt
			if (jsonSchema) {
				const jsonPrompt = StoreProxy.i18n.t("groq.json_preprompt", { SCHEMA: jsonSchema });
				preprompt = preprompt ? preprompt + "\n" + jsonPrompt : jsonPrompt;
			}

			if (preprompt) {
				promptList.push({
					role: "system",
					content: preprompt,
				});
			}

			if (prompt) {
				promptList.push({
					role: "user",
					content: prompt,
				});
			}

			// Requested model may have been shut down since the trigger was configured
			const isAvailable = this.availableModels.some(
				(m) => m.id === model && m.type === "text",
			);

			try {
				const result = await withFallbackModel(
					isAvailable ? model : this.defaultModel,
					(targetModel) =>
						client.chat.completions.create({
							...getCompletionParams(promptList, targetModel),
							stream: false,
							response_format: jsonSchema ? { type: "json_object" } : undefined,
						}),
				);
				return stripReasoning(result.choices[0]?.message.content || "") || false;
			} catch (error) {
				console.error(error);
				return false;
			}
		},
	} satisfies StoreActions<"Groq", IGroqState, IGroqGetters, IGroqActions>,
});

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeGroq, import.meta.hot));
}

interface IStoreData {
	defaultModel: string;
}
