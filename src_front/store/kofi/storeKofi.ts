import SSEEvent from '@/events/SSEEvent';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import ApiHelper from '@/utils/ApiHelper';
import SSEHelper from '@/utils/SSEHelper';
import Utils from '@/utils/Utils';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import type { IKofiActions, IKofiGetters, IKofiState } from '../StoreProxy';
import StoreProxy from '../StoreProxy';
import DataStore from '../DataStore';


export const storeKofi = defineStore('kofi', {
	state: () => ({
		webhooktoken:"",
		webhooks:[],
		connected:false,
	} as IKofiState),



	getters: {

	} as IKofiGetters
	& ThisType<UnwrapRef<IKofiState> & _StoreWithGetters<IKofiGetters> & PiniaCustomProperties>
	& _GettersTree<IKofiState>,



	actions: {
		async populateData():Promise<void> {
			const json = DataStore.get(DataStore.KOFI_CONFIGS);
			if(json) {
				const data = JSON.parse(json) as IStoreData;
				this.webhooks = data.webhooks || []
			}

			ApiHelper.call("kofi/token", "GET", undefined, false).then(result =>{
				if(result.json.token) {
					this.webhooktoken = result.json.token;
					this.connected = true;
				}
			});

			SSEHelper.instance.addEventListener(SSEEvent.KO_FI_EVENT, (event) => {
				this.onEvent(event.data);
			});
			SSEHelper.instance.addEventListener(SSEEvent.KO_FI_FAILED_WEBHOOK, (webhook) => {
				const entry = this.webhooks.find(v=>v.url == webhook.data);
				if(entry) entry.fails ++;
				this.saveConfigs();
			});

			SSEHelper.instance.addEventListener(SSEEvent.KO_FI_DELETE_WEBHOOK, (webhook) => {
				const entry = this.webhooks.find(v=>v.url == webhook.data);
				if(entry) entry.enabled = false;
				this.saveConfigs();

				const message = StoreProxy.i18n.t("kofi.disabled_notification", {URL:webhook.data});
				const message_chunks = TwitchUtils.parseMessageToChunks(message, undefined, true);
				const m:TwitchatDataTypes.MessageCustomData = {
					id:Utils.getUUID(),
					channel_id:StoreProxy.auth.twitch.user.id,
					type:TwitchatDataTypes.TwitchatMessageType.CUSTOM,
					date:Date.now(),
					platform:"twitchat",
					user:{
						name: "Ko-Fi",
						color: "#ff5a16",
					},
					style: "error",
					icon:"kofi",
					message,
					message_chunks,
					message_html: TwitchUtils.messageChunksToHTML(message_chunks),
				};
				StoreProxy.chat.addMessage(m);
			});

		},

		async connect(token:string):Promise<boolean> {
			this.connected = false;
			this.webhooktoken = token;
			const result = await ApiHelper.call("kofi/token", "POST", {token:this.webhooktoken}, false);
			if(result.json.success) {
				this.connected = true;
				return true;
			}
			return false;
		},

		async disconnect():Promise<boolean> {
			this.connected = false;
			this.webhooktoken = "";
			const result = await ApiHelper.call("kofi/token", "DELETE", undefined, false);
			if(result.json.success) {
				this.connected = false;
				return true
			}
			return false;
		},

		onEvent(data:KofiEventData):void {
			const me = StoreProxy.auth.twitch.user;
			switch(data.type) {
				case "Donation": {
					const chunks = TwitchUtils.parseMessageToChunks(data.message || "", undefined, true);
					const message:TwitchatDataTypes.KofiDonationData = {
						id:Utils.getUUID(),
						eventType:"donation",
						platform:"twitch",
						channel_id:me.id,
						isPublic:data.is_public == true,
						type:TwitchatDataTypes.TwitchatMessageType.KOFI,
						date:Date.now(),
						userName:data.from_name,
						amount:parseFloat(data.amount),
						amountFormatted:data.amount+data.currency,
						currency:data.currency,
						message:data.message,
						message_chunks: chunks,
						message_html:TwitchUtils.messageChunksToHTML(chunks),
					}
					StoreProxy.chat.addMessage(message);
					break;
				}

				case "Subscription": {
					const chunks = TwitchUtils.parseMessageToChunks(data.message || "", undefined, true);
					const message:TwitchatDataTypes.KofiSubscriptionData = {
						id:Utils.getUUID(),
						eventType:"subscription",
						platform:"twitch",
						channel_id:me.id,
						isPublic:data.is_public == true,
						type:TwitchatDataTypes.TwitchatMessageType.KOFI,
						date:Date.now(),
						userName:data.from_name,
						amount:parseFloat(data.amount),
						amountFormatted:data.amount+"data.currency",
						currency:data.currency,
						message:data.message,
						message_chunks: chunks,
						message_html:TwitchUtils.messageChunksToHTML(chunks),
						tier:data.tier_name,
						firstTimeSub:data.is_first_subscription_payment == true,
					}
					StoreProxy.chat.addMessage(message);
					break;
				}

				case "Shop Order": {
					const chunks = TwitchUtils.parseMessageToChunks(data.message || "", undefined, true);
					const message:TwitchatDataTypes.KofiMerchData = {
						id:Utils.getUUID(),
						eventType:"merch",
						platform:"twitch",
						channel_id:me.id,
						isPublic:data.is_public == true,
						type:TwitchatDataTypes.TwitchatMessageType.KOFI,
						date:Date.now(),
						userName:data.from_name,
						amount:parseFloat(data.amount),
						amountFormatted:data.amount+data.currency,
						currency:data.currency,
						message:data.message,
						message_chunks: chunks,
						message_html:TwitchUtils.messageChunksToHTML(chunks),
						products:(data.shop_items || []).map(item=>{
							return {
								id:item.direct_link_code,
								name:item.product_name,
								quantity:item.quantity,
							}
						})
					}
					StoreProxy.chat.addMessage(message);
					break;
				}

				case "Commission": {
					const chunks = TwitchUtils.parseMessageToChunks(data.message || "", undefined, true);
					const message:TwitchatDataTypes.KofiCommissionData = {
						id:Utils.getUUID(),
						eventType:"commission",
						platform:"twitch",
						channel_id:me.id,
						isPublic:data.is_public == true,
						type:TwitchatDataTypes.TwitchatMessageType.KOFI,
						date:Date.now(),
						userName:data.from_name,
						amount:parseFloat(data.amount),
						amountFormatted:data.amount+data.currency,
						currency:data.currency,
						message:data.message,
						message_chunks: chunks,
						message_html:TwitchUtils.messageChunksToHTML(chunks),
						url:data.url,
					}
					StoreProxy.chat.addMessage(message);
					break;
				}
			}
		},
		
		addWebhook(url:string):void {
			this.webhooks.push({
				enabled: true,
				url,
				fails: 0
			});
			this.saveConfigs();
		},

		removeWebhook(webhook:IKofiState["webhooks"][number]):void {
			const index = this.webhooks.findIndex(v=> v.url == webhook.url);
			if(index >= 0) {
				this.webhooks.splice(index, 1);
				this.saveConfigs();
			}
		},

		async restartWebhook(webhook:IKofiState["webhooks"][number]):Promise<void> {
			const wh = this.webhooks.find(v=> v.url == webhook.url);
			if(wh) {
				wh.fails = 0;
				wh.enabled = true;
				this.saveConfigs();
			}
		},

		saveConfigs():void {
			this.webhooks = this.webhooks.splice(0, 5)//Limit to 5 webhooks
			const data:IStoreData = {
				webhooks:this.webhooks,
			};
			DataStore.set(DataStore.KOFI_CONFIGS, data);
		},

	} as IKofiActions
	& ThisType<IKofiActions
		& UnwrapRef<IKofiState>
		& _StoreWithState<"raffle", IKofiState, IKofiGetters, IKofiActions>
		& _StoreWithGetters<IKofiGetters>
		& PiniaCustomProperties
	>,
})

if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeKofi, import.meta.hot))
}
interface IStoreData {
	webhooks:{url:string, fails:number, enabled:boolean}[];
}

export interface KofiEventData {
	verification_token: string;
	message_id: string;
	timestamp: string;
	type: "Donation" | "Subscription" | "Shop Order" | "Commission";
	is_public: boolean;
	from_name: string;
	message: string;
	amount: string;
	url: string;
	email: string;
	currency: string;
	is_subscription_payment: boolean;
	is_first_subscription_payment: boolean;
	kofi_transaction_id: string;
	shop_items?: {
		direct_link_code: string;
		variation_name: string;
		quantity: number;
		//Unoffical tag.
		//It's populated from my backend after attempting to
		//scrape the product page
		product_name?: string;
	}[];
	tier_name?: string;
	shipping?: {
		full_name: string;
		street_address: string;
		city: string;
		state_or_province: string;
		postal_code: string;
		country: string;
		country_code: string;
		telephone: string;
	};
}
