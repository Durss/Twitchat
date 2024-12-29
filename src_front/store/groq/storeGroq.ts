import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Groq from "groq-sdk";
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import { reactive, type UnwrapRef } from 'vue';
import DataStore from '../DataStore';
import type { IGroqActions, IGroqGetters, IGroqState } from '../StoreProxy';
import StoreProxy from "../StoreProxy";
import Utils from "@/utils/Utils";
import Database from "../Database";

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

		async getSummary(messagesList:TwitchatDataTypes.MessageChatData[], preprompt?:string):Promise<string> {
			if(!groq) await this.connect();
			if(!groq || !this.connected) return Promise.resolve("");

			const historyEntry:typeof this.answerHistory[number] = reactive({
				id: Utils.getUUID(),
				date:Date.now(),
				prompt: "",
				answer: "",
			});
			const prompt:Groq.Chat.Completions.ChatCompletionMessageParam[] = [];
			prompt.push({
					role: "system",
					content: StoreProxy.i18n.t("groq.conversation_preprompt"),
				});

			if(preprompt) {
				prompt.push({
						role: "system",
						content: preprompt,
					});
				historyEntry.preprompt = preprompt;
			}

			const sortedList = messagesList.sort((a,b) => a.date - b.date);
			let mainPrompt = "";
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
			
			prompt.push({
					role: "user",
					content: mainPrompt,
				});
			
			historyEntry.prompt = mainPrompt;
			this.answerHistory.push(historyEntry);
			
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

			for await (const chunk of stream) {
				historyEntry.answer = historyEntry.answer + chunk.choices[0]?.delta?.content || "";
			}
			
			await Database.instance.addGroqHistory(historyEntry);
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