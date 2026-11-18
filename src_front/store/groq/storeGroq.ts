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

const getAnonUserName = (login: string, userMap: { [login: string]: string }): string => {
	const key = Object.keys(userMap).find((v) => v.toLowerCase() === login.toLowerCase());
	let username = userMap[key || ""]!;
	if (!key) {
		username = OPEN_TAG + Object.keys(userMap).length + CLOSE_TAG;
		userMap[login] = username;
	}
	return username;
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
				this.answerHistory = res;
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
			preprompt?: string,
			repromptEntry?: TwitchatDataTypes.GroqHistoryItem,
		): Promise<string> {
			if (!groq) await this.connect();
			if (!groq || !this.connected) return Promise.resolve("");
			const client = groq;

			const historyEntry: (typeof this.answerHistory)[number] = repromptEntry
				? repromptEntry
				: reactive({
						id: Utils.getUUID(),
						date: Date.now(),
						prompt: "",
						answer: "",
						userMap: {},
					});
			const prompt: Groq.Chat.Completions.ChatCompletionMessageParam[] = [];
			if (!repromptEntry) {
				prompt.push({
					role: "system",
					content: StoreProxy.i18n.t("groq.conversation_preprompt"),
				});
			}

			if (preprompt) {
				if (repromptEntry) {
					const userMap = repromptEntry.userMap || {};

					//Replace usernames of the usermap with their anon equivalent
					for (const key in userMap) {
						preprompt = preprompt.replace(key, userMap[key]!);
					}

					// Replace mentions in the form of @xxx with anonymized versions
					const mentionRegex = /@(\w+)/g;
					preprompt = preprompt.replace(mentionRegex, (_, mention: string) => {
						return getAnonUserName(mention, userMap);
					});
				}
				prompt.push({
					role: "system",
					content: preprompt,
				});
				historyEntry.preprompt = preprompt;
			}

			let mainPrompt = "";
			if (repromptEntry) {
				mainPrompt = repromptEntry.prompt;
			} else {
				const sortedList = messagesList.sort((a, b) => a.date - b.date);
				let currentUser = "";
				let split = false;
				// User name to anon name map
				// {"login":"anon"}
				let userMap: { [login: string]: string } = {};
				// Merge consecutive messages from same users to reduce token usage
				const splitter = " — ";
				for (const m of sortedList) {
					let anonUser = getAnonUserName(m.user.displayNameOriginal, userMap);
					if (currentUser != anonUser) {
						currentUser = anonUser;
						mainPrompt += "\n" + currentUser + ": ";
						split = false;
					}
					if (split) mainPrompt += splitter;
					mainPrompt += m.message;
					split = true;
				}

				//Replace usernames of the usermap with their anon equivalent
				for (const key in userMap) {
					mainPrompt = mainPrompt.replace(key, userMap[key]!);
				}

				// Replace mentions in the form of @xxx with anonymized versions
				const mentionRegex = /@(\w+)/g;
				mainPrompt = mainPrompt.replace(mentionRegex, (_, mention: string) => {
					return getAnonUserName(mention, userMap);
				});

				historyEntry.userMap = userMap;
			}

			prompt.push({
				role: "user",
				content: mainPrompt,
			});

			historyEntry.prompt = mainPrompt;
			if (!repromptEntry) this.answerHistory.push(historyEntry);
			StoreProxy.params.openModal("groqHistory", true);

			let answer = "";
			let rawAnswer = "";
			const updateAnswer = () => {
				answer = stripReasoning(rawAnswer);
				// Keeps previous answer of a reprompted entry until there's a new one
				if (answer) historyEntry.answer = answer;
			};
			try {
				const stream = await withFallbackModel(this.defaultModel, (model) =>
					client.chat.completions.create({
						...getCompletionParams(prompt, model),
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
				if (!answer) throw new Error("Empty answer");
			} catch (error) {
				console.error(error);
				updateAnswer();
				toast(
					StoreProxy.i18n.t("groq.generation_error", {
						ERROR: (error as Error).message,
					}),
					{ type: "error" },
				);
				if (!answer) {
					// Don't leave a new entry loading forever
					if (!repromptEntry) {
						this.answerHistory = this.answerHistory.filter(
							(entry) => entry.id !== historyEntry.id,
						);
						if (this.answerHistory.length === 0) StoreProxy.params.closeModal();
					}
					return "";
				}
			}

			if (!repromptEntry) {
				await Database.instance.addGroqHistory(historyEntry);
			} else {
				await Database.instance.updateGroqHistory(historyEntry);
			}
			return historyEntry.answer;
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

		async repromptHistoryEntry(id: string, prompt: string): Promise<void> {
			const entry = this.answerHistory.find((entry) => entry.id === id);
			if (!entry) return;
			await this.getSummary([], prompt, entry);
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
