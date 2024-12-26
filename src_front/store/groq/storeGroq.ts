import Groq from "groq-sdk";
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import DataStore from '../DataStore';
import type { IGroqActions, IGroqGetters, IGroqState } from '../StoreProxy';
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import StoreProxy from "../StoreProxy";

let groq:Groq|null = null;

export const storeGroq = defineStore('groq', {
	state: () => ({
		apiKey: "",
		connected: false,
		creditsTotal: 0,
		creditsUsed: 0,
		defaultModel:"llama-3.2-1b-preview",
		availableModels:[],
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

		async connect():Promise<boolean> {
			this.connected = false;
			return new Promise<boolean>(async (resolve)=>{
				try {
					groq = new Groq({ apiKey: this.apiKey, dangerouslyAllowBrowser:true });
					groq.models.list().then((models) => {
						groq!.models.retrieve("llama-3.2-1b-preview").then((model) => {
							console.log(model);
						});
						console.log(models);
						this.availableModels = models.data as typeof this.availableModels;
						this.availableModels.forEach((model) => {
							model.type = model.context_window >= 1024? "text" : "speech";
						});
						this.connected = true;
						resolve(true);
					}).catch((error) => {
						console.error(error);
						resolve(false);
					});
					// const success = await this.loadParams();
					// this.connected = success;
					// TTSUtils.instance.loadVoiceList();
					// resolve(this.connected);
					// if(this.connected) {
					// 	await this.loadApiCredits();
						this.saveConfigs()
					// 	await this.buildHistoryCache();
					// }

					// groq.chat.completions.create({
					// 	messages: [
					// 		{
					// 			role: "system",
					// 			content: "you are a helpful assistant.",
					// 		},
					// 		{
					// 			role: "user",
					// 			content: "Explain the importance of fast language models",
					// 		},
					// 	],
					// 	model: "llama3-8b-8192",
					// 	temperature: 0.5,
					// 	max_tokens: 1024,
					// 	top_p: 1,
					// 	stop: null,
					// 	stream: false,
					// });
					
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

		async getSummary(messagesList:TwitchatDataTypes.MessageChatData[]):Promise<string> {
			if(!groq) await this.connect();
			if(!groq || !this.connected) return Promise.resolve("");

			let res = await groq.chat.completions.create({
				messages: [
							{
								role: "system",
								content: StoreProxy.i18n.t("groq.conversation_preprompt"),
							},
							{
								role: "user",
								content: messagesList.map((message) => {
									if(message.is_short) return "";
									return message.user.displayNameOriginal + ": " + message.message;
								}).filter(m => m.trim().length > 0).join("\n"),
							},
						],
				model: this.defaultModel,
				temperature: 0.5,
				max_tokens: 1024,
				top_p: 1,
				stop: null,
				stream: false,
			});
			console.log(res.choices[0].message);
			return "This is a summary";
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