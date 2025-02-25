import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Groq from "groq-sdk";
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import { reactive, type UnwrapRef } from 'vue';
import DataStore from '../DataStore';
import type { IGroqActions, IGroqGetters, IGroqState } from '../StoreProxy';
import StoreProxy from "../StoreProxy";
import Utils from "@/utils/Utils";
import Database from "../Database";
import type { ChatCompletionCreateParamsNonStreaming } from "groq-sdk/resources/chat/completions";

let groq:Groq|null = null;

export const storeGroq = defineStore('groq', {
	state: () => ({
		apiKey: "",
		connected: false,
		creditsTotal: 0,
		creditsUsed: 0,
		defaultModel:"llama-3.3-70b-versatile",
		availableModels:[],
		answerHistory:[],
	} as IGroqState),



	getters: {
	} as IGroqGetters
	& ThisType<UnwrapRef<IGroqState> & _StoreWithGetters<IGroqGetters> & PiniaCustomProperties>
	& _GettersTree<IGroqState>,



	actions: {
		async populateData():Promise<void> {
			const apiKey = DataStore.get(DataStore.GROQ_API_KEY);
			if(apiKey) {
				this.apiKey = apiKey;
			}
			const configs = DataStore.get(DataStore.GROQ_CONFIGS);
			if(configs) {
				const {defaultModel} = JSON.parse(configs) as IStoreData;
				this.defaultModel = defaultModel;
			}
			if(this.apiKey) await this.connect();
		},

		async preloadMessageHistory():Promise<void> {
			Database.instance.getGroqHistoryList().then(res=>{
				if(res.length === 0) return;
				this.answerHistory = res;
			});
		},

		async connect():Promise<boolean> {
			this.connected = false;
			return new Promise<boolean>(async (resolve)=>{
				try {
					groq = new Groq({ apiKey: this.apiKey, dangerouslyAllowBrowser:true });
					groq.models.list().then((models) => {
						this.availableModels = models.data as typeof this.availableModels;
						this.availableModels.forEach((model) => {
							if(model.id.indexOf("vision") > -1) {
								model.type = "vision";
							}else{
								model.type = model.context_window >= 1024? "text" : "speech";
							}
						});
						this.connected = true;
						resolve(true);
					}).catch((error) => {
						console.error(error);
						resolve(false);
					});
					this.saveConfigs()

				}catch(error) {
					resolve(false);
				}
			});
		},

		disconnect():void {
			this.connected = false;
			DataStore.remove(DataStore.GROQ_API_KEY);
		},

		saveConfigs():void {
			DataStore.set(DataStore.GROQ_API_KEY, this.apiKey);
			const configs:IStoreData = {
				defaultModel: this.defaultModel,
			};
			DataStore.set(DataStore.GROQ_CONFIGS, configs);
		},

		async getSummary(messagesList:TwitchatDataTypes.MessageChatData[], preprompt?:string, repromptEntry?:TwitchatDataTypes.GroqHistoryItem):Promise<string> {
			if(!groq) await this.connect();
			if(!groq || !this.connected) return Promise.resolve("");

			const historyEntry:typeof this.answerHistory[number] = repromptEntry? repromptEntry : reactive({
				id: Utils.getUUID(),
				date:Date.now(),
				prompt: "",
				answer: "",
			});
			const prompt:Groq.Chat.Completions.ChatCompletionMessageParam[] = [];
			if(!repromptEntry) {
				prompt.push({
					role: "system",
					content: StoreProxy.i18n.t("groq.conversation_preprompt"),
				});
			}

			if(preprompt) {
				prompt.push({
						role: "system",
						content: preprompt,
					});
				historyEntry.preprompt = preprompt;
			}

			let mainPrompt = "";
			if(repromptEntry) {
				mainPrompt = repromptEntry.prompt;
			}else{
				const sortedList = messagesList.sort((a,b) => a.date - b.date);
				let currentUser = "";
				let split = false;
				//Merge consecutive messages from same users to reduce token usage
				const splitter = " — ";
				for (let i = 0; i < sortedList.length; i++) {
					const m = sortedList[i];
					if(currentUser != m.user.displayNameOriginal) {
						currentUser = m.user.displayNameOriginal;
						mainPrompt += "\n" + currentUser + ": ";
						split = false;
					}
					if(split) mainPrompt += splitter;
					mainPrompt += m.message;
					split = true;
				}
			}

			prompt.push({
					role: "user",
					content: mainPrompt,
				});

			historyEntry.prompt = mainPrompt;
			if(!repromptEntry) this.answerHistory.push(historyEntry);
			StoreProxy.params.openModal("groqHistory", true);

			let stream = await groq.chat.completions.create({
				messages: prompt,
				model: this.defaultModel,
				temperature: 0.5,
				max_tokens: 1024,
				top_p: 1,
				stop: null,
				stream: true,
				// response_format: {
				// 	type: "json_object",
				// }
			});

			if(repromptEntry) repromptEntry.answer = "";

			for await (const chunk of stream) {
				historyEntry.answer += chunk.choices[0]?.delta?.content || "";
			}

			if(!repromptEntry) {
				await Database.instance.addGroqHistory(historyEntry);
			}else{
				await Database.instance.updateGroqHistory(historyEntry);
			}
			return historyEntry.answer;
		},

		async removeAnswer(id:string):Promise<void> {
			return new Promise<void>((resolve)=>{
				StoreProxy.main.confirm(
					StoreProxy.i18n.t("groq.history.delete_confirm.title"),
					StoreProxy.i18n.t("groq.history.delete_confirm.message")
				).then((result)=>{
					this.answerHistory.splice(this.answerHistory.findIndex((entry)=>entry.id === id), 1);
					Database.instance.deleteGroqHistory(id);
					resolve();
				}).catch(()=>{
					resolve();
				});
			});
		},

		async repromptHistoryEntry(id:string, prompt:string):Promise<void> {
			const entry = this.answerHistory.find((entry)=>entry.id === id);
			if(!entry) return;
			await this.getSummary([], prompt, entry);
		},

		async executeQuery(preprompt:string, prompt:string, model:string = "", jsonSchema?:string):Promise<string|false> {
			if(!groq) await this.connect();
			if(!groq || !this.connected) return Promise.resolve("");

			const promptList:Groq.Chat.Completions.ChatCompletionMessageParam[] = [];

			if(preprompt) {
				if(jsonSchema) {
					preprompt += "\n"+StoreProxy.i18n.t("groq.json_preprompt", {SCHEMA:jsonSchema});
				}
				promptList.push({
					role: "system",
					content: preprompt,
				});
			}

			if(prompt) {
				promptList.push({
					role: "user",
					content: prompt,
				});
			}

			const options:ChatCompletionCreateParamsNonStreaming = {
				messages: promptList,
				model: this.defaultModel,
				temperature: 0.5,
				max_tokens: 1024,
				top_p: 1,
				stop: null,
				stream: false,
			};
			if(jsonSchema) {
				options.response_format = {
					type: "json_object",
				}
			}
			try {
				let result = await groq.chat.completions.create(options);
				return result.choices[0].message.content || "";
			}catch(error) {
				console.error(error);
				return false;
			}
		}

	} as IGroqActions
	& ThisType<IGroqActions
		& UnwrapRef<IGroqState>
		& _StoreWithState<"Groq", IGroqState, IGroqGetters, IGroqActions>
		& _StoreWithGetters<IGroqGetters>
		& PiniaCustomProperties
	>,
})

if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeGroq, import.meta.hot))
}

interface IStoreData {
	defaultModel:string;
}
