import SSEEvent from '@/events/SSEEvent';
import ApiHelper from '@/utils/ApiHelper';
import Config from '@/utils/Config';
import SSEHelper from '@/utils/SSEHelper';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import type { ITiltifyActions, ITiltifyGetters, ITiltifyState } from '../StoreProxy';
import StoreProxy from '../StoreProxy';
import DataStore from '../DataStore';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';


export const storeTiltify = defineStore('tiltify', {
	state: () => ({
		user:null,
		campaignList:[],
		token:null,
		connected:false,
		authResult:{code:"", csrf:""},
	} as ITiltifyState),



	getters: {
		
	} as ITiltifyGetters
	& ThisType<UnwrapRef<ITiltifyState> & _StoreWithGetters<ITiltifyGetters> & PiniaCustomProperties>
	& _GettersTree<ITiltifyState>,



	actions: {
		async populateData():Promise<void> {
			const tokenJSON = DataStore.get(DataStore.TILTIFY_TOKEN);
			const paramsJSON = DataStore.get(DataStore.TILTIFY);
			if(paramsJSON) {
				const parameters = JSON.parse(paramsJSON) as TiltifyStoreData;
			}
			if(tokenJSON) {
				const token = JSON.parse(tokenJSON) as TiltifyToken;
				const result = await ApiHelper.call("tiltify/token/refresh", "POST", {refreshToken:token.refresh_token}, false);
				if(result.json.token) {
					this.token = result.json.token;
					this.onAuthenticated();
				}else{
					DataStore.remove(DataStore.TILTIFY_TOKEN);
					StoreProxy.common.alert(StoreProxy.i18n.t("error.tiltify_connect_failed"));
				}
			}

			SSEHelper.instance.addEventListener(SSEEvent.TILTIFY_EVENT, (event) => {
				const data = event.data;
				if(!data) return;
				this.onEvent(event.data);
			});
		},
		
		setAuthResult(code:string, csrf:string):void {
			this.authResult.code = code;
			this.authResult.csrf = csrf;
		},

		async getOAuthURL():Promise<string> {
			const csrfToken = await ApiHelper.call("auth/CSRFToken", "GET");
			const redirectURI = document.location.origin + StoreProxy.router.resolve({name:"tiltify/auth"}).href;

			const url = new URL("https://v5api.tiltify.com/oauth/authorize");
			url.searchParams.set("client_id",Config.instance.TILTIFY_CLIENT_ID);
			url.searchParams.set("redirect_uri",redirectURI);
			url.searchParams.set("scope",Config.instance.TILTIFY_SCOPES);
			url.searchParams.set("response_type","code");
			url.searchParams.set("state", csrfToken.json.token);
			return url.href;
		},

		async getAccessToken():Promise<boolean> {
			try {
				const csrfResult = await ApiHelper.call("auth/CSRFToken", "POST", {token:this.authResult.csrf});
				if(!csrfResult.json.success) return false;
				const result = await ApiHelper.call("tiltify/auth", "POST", this.authResult, false)
				if(result.json.success) {
					this.token = result.json.token;
					await this.onAuthenticated();
					return true;
				}
				return false;
			}catch(error){
				return false;
			}
		},

		async onAuthenticated():Promise<void> {
			DataStore.set(DataStore.TILTIFY_TOKEN, this.token);
			
			await this.loadInfos();
			this.connected = true;
			
			window.setTimeout(async ()=> {
				const res = await ApiHelper.call("tiltify/token/refresh", "POST", {refreshToken:this.token!.refresh_token});
				if(res.status == 200 && res.json.token) {
					this.token = res.json.token;
					this.onAuthenticated();
				}
			}, (this.token!.expires_in - 60) * 1000);

		},

		async disconnect():Promise<boolean> {
			this.connected = false;
			DataStore.remove(DataStore.TILTIFY_TOKEN);
			const result = await ApiHelper.call("tiltify/auth", "DELETE", {token:this.token!.access_token}, false);
			if(result.json.success) {
				return true
			}
			return false;
		},

		onEvent(data:TiltifyDonationEventData | TiltifyCauseEventData):void {
			const me = StoreProxy.auth.twitch.user;
			switch(data.type) {
				case "donation": {
					const chunks = TwitchUtils.parseMessageToChunks(data.message || "", undefined, true);
					const campaign = this.campaignList.find(v=>v.id === data.campaignId);
					const message:TwitchatDataTypes.TiltifyDonationData = {
						id:Utils.getUUID(),
						eventType:"donation",
						platform:"twitch",
						channel_id:me.id,
						type:TwitchatDataTypes.TwitchatMessageType.TILTIFY,
						date:Date.now(),
						userName:data.username,
						amount:data.amount,
						amountFormatted:data.amount+""+data.currency,
						currency:data.currency,
						message:data.message,
						message_chunks: chunks,
						message_html:TwitchUtils.messageChunksToHTML(chunks),
						campaign:{
							id:data.campaignId,
							title:campaign?.name || "CAMPAIGN_NOT_FOUND",
							url:campaign?.url || "https://tiltify.com",
						}
					}
					if(/^\/.*/.test(message.campaign.url)) {
						message.campaign.url = "https://tiltify.com" + message.campaign.url
					}
					StoreProxy.chat.addMessage(message);
					StoreProxy.donationGoals.onDonation(message.userName, message.amount.toString(), "tiltify", message.campaign.id);
					break;
				}

				case "cause_update": {
					let campaign = this.campaignList.find(v=>v.id === data.campaignId);
					if(!campaign) {
						campaign = this.campaignList.find(v=>v.cause_id === data.causeId);
						break;
					}
					
					campaign.amount_raised.value = data.amount_raised.toString();
					campaign.total_amount_raised.value = data.total_amount_raised.toString();
					campaign.goal.value = data.amount_goal.toString();

					StoreProxy.donationGoals.onSourceValueUpdate("tiltify", campaign.id);
					break;
				}
			}
		},

		async loadInfos():Promise<{user:TiltifyUser, campaigns:TiltifyCampaign[]}> {
			const infos = await ApiHelper.call("tiltify/info", "GET", {token:this.token!.access_token}, false, 0);
			this.campaignList = infos.json.campaigns;
			const login = StoreProxy.auth.twitch.user.login.toLowerCase();
			if(login === "loxetv"
			|| login === "m0uftchup"
			|| login === "chezmarino"
			|| login === "shakawah") {
				ApiHelper.call("log", "POST", {cat:"random", log:{
						type:"tiltify_campaigns", login, user:{id:infos.json.user.id, name:infos.json.user.username}, campaigns:(this.campaignList || []).map(v=>{
							return {
								name:v.name,
								id:v.id,
								uid:v.user_id,
								legacy_id:v.legacy_id,
								team_id:v.team_id,
								cause_id:v.cause_id,
							};
						})
					}
				});
			}
			this.user = infos.json.user;
			StoreProxy.donationGoals.broadcastData();
			return {user:this.user, campaigns:this.campaignList};
		}
	
	} as ITiltifyActions
	& ThisType<ITiltifyActions
		& UnwrapRef<ITiltifyState>
		& _StoreWithState<"tiltify", ITiltifyState, ITiltifyGetters, ITiltifyActions>
		& _StoreWithGetters<ITiltifyGetters>
		& PiniaCustomProperties
	>,
})

if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeTiltify, import.meta.hot))
}

interface TiltifyStoreData {
	
}

export interface TiltifyToken {
	access_token: string;
	created_at: string;
	expires_in: number;
	refresh_token: string;
	scope: string;
	token_type: string;
}

export interface TiltifyDonationEventData{
	type:"donation";
	amount:number;
	currency:string;
	message:string;
	username:string;
	campaignId:string;
}

export interface TiltifyCauseEventData{
	type:"cause_update";
	amount_raised:number;
	total_amount_raised:number;
	amount_goal:number;
	currency:string;
	donateUrl:string;
	title:string;
	description:string;
	causeId:string;
	campaignId:string;
}

export interface TiltifyUser {
	avatar: Avatar;
	description: string;
	id: string;
	legacy_id: number;
	slug: string;
	social: Socials;
	total_amount_raised: {
		currency: string;
		value: string;
	};
	url: string;
	username: string;
}

export interface TiltifyCampaign {
	id: string;
	name: string;
	status: string;
	user?: unknown;
	description: string;
	url: string;
	cause_id: string;
	slug: string;
	inserted_at: string;
	updated_at: string;
	currency_code: string;
	user_id?: string;
	fundraising_event_id?: string;
	avatar: Avatar;
	team: {
		id: string;
		name: string;
		description: string;
		url: string;
		slug: string;
		avatar: Avatar;
		social: Socials;
		total_amount_raised: Totalamountraised;
		legacy_id: number;
	};
	team_id: string;
	amount_raised: Totalamountraised;
	published_at: string;
	retired_at?: unknown;
	supportable: string;
	goal: Totalamountraised;
	livestream?: unknown;
	total_amount_raised: Totalamountraised;
	original_goal: Totalamountraised;
	supporting_amount_raised: Totalamountraised;
	legacy_id: number;
	donate_url: string;
	has_schedule: boolean;
}

interface Totalamountraised {
	value: string;
	currency: string;
}

interface Avatar {
	width: number;
	alt: string;
	src: string;
	height: number;
}
interface Socials {
	twitch?: unknown;
	twitter?: unknown;
	facebook?: unknown;
	discord?: unknown;
	website?: unknown;
	snapchat?: unknown;
	instagram?: unknown;
	youtube?: unknown;
	tiktok?: unknown;
}