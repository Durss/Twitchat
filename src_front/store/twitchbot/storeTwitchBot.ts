import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import ApiHelper from "@/utils/ApiHelper";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import DataStore from '../DataStore';
import type { ITwitchBotActions, ITwitchBotGetters, ITwitchBotState } from '../StoreProxy';
import StoreProxy from "../StoreProxy";

let oAuthCode:string = "";
let oAuthCsrf:string = "";
let refreshTokenTimeout = -1;
let popupCloseCheckInterval = -1;
export const storeTwitchBot = defineStore('switchbot', {
	state: () => ({
		connected:false,
		connecting:false,
		authToken: null,
		userInfos: null,
	} as ITwitchBotState),



	getters: {
	} as ITwitchBotGetters
	& ThisType<UnwrapRef<ITwitchBotState> & _StoreWithGetters<ITwitchBotGetters> & PiniaCustomProperties>
	& _GettersTree<ITwitchBotState>,



	actions: {
		async populateData():Promise<void> {
			const params = DataStore.get(DataStore.TWITCH_BOT);
			if(params) {
				const data = JSON.parse(params) as IStoreData;
				if(data?.authToken && data.authToken.access_token) {
					this.authToken = data.authToken;
					this.connect();
				}
			}
		},
		
		async connect(): Promise<boolean> {
			clearInterval(refreshTokenTimeout);
			if(oAuthCode && oAuthCsrf) {
				await this.completeOAuthProcess(oAuthCode, oAuthCsrf);
			}
			if(this.authToken) {
				let refreshDelay = this.authToken.expires_at - Date.now() - 10 * 60000;
				//Refresh token if it expires in less than 10min
				if(isNaN(refreshDelay) || refreshDelay <= 60000) {
					const res = await ApiHelper.call("auth/twitch/refreshtoken", "GET", {token:this.authToken.refresh_token});
					if(res) {
						this.authToken = res.json;
						this.authToken.expires_at = Date.now() + this.authToken.expires_in * 1000;
					}
				}

				const userRes = await TwitchUtils.validateToken(this.authToken.access_token);
				if(userRes && !isNaN((userRes as TwitchDataTypes.Token).expires_in)) {
					this.userInfos = userRes as TwitchDataTypes.Token;
				}

				//Refresh token 10min before it expires
				refreshDelay = this.authToken.expires_at - Date.now() - 10 * 60000;
				refreshTokenTimeout = window.setTimeout(() => {
					this.connect();
				}, refreshDelay);
				this.connected = true;
				this.saveParams();
				return true;
			}
			return false;
		},
		
		disconnect(): void {
			clearInterval(refreshTokenTimeout);
			this.connected = false;
			this.authToken = null;
			DataStore.remove(DataStore.TWITCH_BOT);
		},
		
		async startAuthFlow(event:MouseEvent): Promise<void> {
			this.connecting = true;
			let csrf = "";
			try {
				const {json} = await ApiHelper.call("auth/CSRFToken", "GET");
				csrf = json.token;
			}catch(e) {
				StoreProxy.common.alert(StoreProxy.i18n.t("error.csrf_failed"));
			}
			const url = TwitchUtils.getOAuthURL(csrf, ["chat:edit","user:write:chat","moderator:manage:announcements"], "/twitchbot");
			const win = window.open(url, "twitchbot", "width=800,height=600");
			if(win) {
				//detect popup close with cross origin support
				clearInterval(popupCloseCheckInterval);
				popupCloseCheckInterval = window.setInterval(() => {
					if(win.closed) {
						clearInterval(popupCloseCheckInterval);
						this.connecting = false;
					}
				}, 1000);
				window.addEventListener('message', async (event) => {
					clearInterval(popupCloseCheckInterval);
					if (event.data.type === 'TWITCHBOT_AUTH_RESULT') {
						const { code, csrf } = event.data.data;
						this.connected = await this.completeOAuthProcess(code, csrf);
						this.connecting = false;
					}
				});
				event.preventDefault();
			}else{
				//Couldn't open popup, redirect
				window.location.href = url;
			}
		},

		async completeOAuthProcess(code:string, csrf:string):Promise<boolean> {
			oAuthCode = code;
			oAuthCsrf = csrf;
			const result = await ApiHelper.call("auth/twitch", "GET", {code:oAuthCode, csrf:oAuthCsrf});
			oAuthCode = oAuthCsrf = "";
			if(result.status == 200) {
				this.authToken = result.json;
				this.authToken.expires_at = Date.now() + this.authToken.expires_in * 1000;
				this.connect();
				return true;
			}
			return false;
		},

		saveParams():void {
			let params:IStoreData = {
				authToken:this.authToken!,
			}
			DataStore.set(DataStore.TWITCH_BOT, params);
		},


	} as ITwitchBotActions
	& ThisType<ITwitchBotActions
		& UnwrapRef<ITwitchBotState>
		& _StoreWithState<"switchbot", ITwitchBotState, ITwitchBotGetters, ITwitchBotActions>
		& _StoreWithGetters<ITwitchBotGetters>
		& PiniaCustomProperties
	>,
})

if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeTwitchBot, import.meta.hot))
}

interface IStoreData {
	authToken:TwitchDataTypes.AuthTokenResult;
}