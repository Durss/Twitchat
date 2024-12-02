import ApiHelper from '@/utils/ApiHelper';
import Config from '@/utils/Config';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import DataStore from '../DataStore';
import type { IPatreonActions, IPatreonGetters, IPatreonState } from '../StoreProxy';
import StoreProxy from '../StoreProxy';
import type { PatreonDataTypes } from '@/utils/patreon/PatreonDataTypes';
import SSEHelper from '@/utils/SSEHelper';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';

let refreshTimeout:number = 0;

export const storePatreon = defineStore('patreon', {
	state: () => ({
		isMember: false,
		connected: false,
		oauthFlowParams: null,
		memberList: [],
		tierList: [],
	} as IPatreonState),



	getters: {
	} as IPatreonGetters
	& ThisType<UnwrapRef<IPatreonState> & _StoreWithGetters<IPatreonGetters> & PiniaCustomProperties>
	& _GettersTree<IPatreonState>,



	actions: {
		async populateData():Promise<void> {
			SSEHelper.instance.addEventListener("PATREON_MEMBER_CREATE", (event) =>{
				const data = event.data;
				if(!data) return;

				const message:TwitchatDataTypes.MessagePatreonData = {
					channel_id:StoreProxy.auth.twitch.user.id,
					date:Date.now(),
					eventType:"new_member",
					id:Utils.getUUID(),
					platform:"twitch",
					type:TwitchatDataTypes.TwitchatMessageType.PATREON,
					tier: data.tier,
					user:data.user,
				}
				StoreProxy.chat.addMessage(message);

				this.loadMemberList();
			})
		},
		
		setPatreonAuthResult(value):void { this.oauthFlowParams = value; },
		
		/**
		 * Get URL to redirect to to start oAuth flow
		 * @param premiumContext
		 * @returns 
		 */
		async getOAuthURL(premiumContext:boolean = false):Promise<string> {
			const {json} = await ApiHelper.call("auth/CSRFToken", "GET");
			const url = new URL("https://www.patreon.com/oauth2/authorize");
			url.searchParams.append("response_type", "code");
			url.searchParams.append("client_id", Config.instance.PATREON_CLIENT_ID);
			url.searchParams.append("redirect_uri", this.getRedirectURI(premiumContext));
			url.searchParams.append("scope", Config.instance.PATREON_SCOPES);
			url.searchParams.append("state", json.token);

			return url.href;
		},
		
		/**
		 * Disconnects the user
		 */
		disconnect():void {
			ApiHelper.call("patreon/user/disconnect", "POST", {}, false);
			this.connected = false;
			this.isMember = false;
			clearTimeout(refreshTimeout);
			DataStore.remove(DataStore.PATREON_AUTH_TOKEN);
		},

		/**
		 * Get redirect URI
		 * @param premiumContext 
		 * @returns 
		 */
		getRedirectURI(premiumContext:boolean = false):string {
			const suffix = premiumContext? "/premium" : "";
			return document.location.origin + StoreProxy.router.resolve({name:"patreon/auth"}).href + suffix;
		},

		/**
		 * Completes oauth flow
		 * @returns 
		 */
		async completeOAuthFlow(premiumContext:boolean = false):Promise<boolean> {
			const authParams = this.oauthFlowParams;
			if(!authParams) return false;
			const {json:csrf} = await ApiHelper.call("auth/CSRFToken", "POST", {token:authParams.csrf}, false);
			if(!csrf.success) {
				StoreProxy.common.alert(csrf.message || "Patreon authentication failed");
			}else{
				try {
					await this.authenticate(authParams.code, premiumContext);
					this.setPatreonAuthResult(null);
					return true;
				}catch(e:unknown) {
					console.log(e);
					StoreProxy.common.alert("Oops... something went wrong");
				}
			}
			return false;
		},

		/**
		 * Generate an auth token from an auth code 
		 * @param code 
		 */
		async authenticate(code:string, premiumContext:boolean = false):Promise<void> {
			const res = await ApiHelper.call("patreon/user/authenticate", "POST", {code:code, redirect_uri:this.getRedirectURI(premiumContext)}, false);

			if(res.status == 200) {
				await this.loadMemberState();
				this.connected = true;
			}
		},

		/**
		 * Get the user's data
		 */
		async loadMemberState():Promise<void> {
			const res = await ApiHelper.call("patreon/user/isMember", "GET");
			if(res.status != 200) {
				if(res.json.errorCode == "MAX_LINKED_ACCOUNTS") {
					StoreProxy.common.alert(StoreProxy.i18n.t('error.patreon_max_linked'))
				}
			}else{
				this.connected = true;
				this.isMember = res.json.data?.isMember === true;
				if(StoreProxy.auth.isPremium) {
					StoreProxy.chat.cleanupDonationRelatedMessages();
					this.loadMemberList();
				}
			}
		},

		/**
		 * Get the user's member list
		 */
		async loadMemberList():Promise<void> {
			const res = await ApiHelper.call("patreon/user/memberList", "GET");
			if(res.status == 200) {
				this.memberList	= res.json.data.memberList;
				this.tierList	= res.json.data.tierList;
				// const freeTier = this.tierList.find(t => t.attributes.amount_cents == 0);
				const activeMembers = this.memberList.filter(m => {
					return m.attributes.patron_status == "active_patron"
					&& m.attributes.currently_entitled_amount_cents > 0
				});

				StoreProxy.labels.updateLabelValue("PATREON_MEMBER_COUNT", activeMembers.length);
			}
		},

	} as IPatreonActions
	& ThisType<IPatreonActions
		& UnwrapRef<IPatreonState>
		& _StoreWithState<"patreon", IPatreonState, IPatreonGetters, IPatreonActions>
		& _StoreWithGetters<IPatreonGetters>
		& PiniaCustomProperties
	>,
})

if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storePatreon, import.meta.hot))
}

export interface IPatreonMember {
	attributes: {
		currently_entitled_amount_cents: number;
		full_name: string;
		is_follower: boolean;
		last_charge_date: string | null;
		last_charge_status: "Paid" | "Declined" | "Deleted" | "Pending" | "Refunded" | "Fraud" | "Other" | null;
		lifetime_support_cents: number;
		patron_status: "active_patron" | "declined_patron" | "former_patron";
	};
	id: string;
	relationships: {
		currently_entitled_tiers: {
			data: {
				id: string;
				type: string;
			}[];
		};
		pledge_history:{
			
			data: {
				id: string;
				type: string;
			}[];
		}
	};
	type: string;
}
export interface IPatreonTier {
	attributes: {
		amount_cents: number;
		description: string;
		image_url: any;
		published: boolean;
		published_at: string;
		title: string;
	};
	id: string;
	type: string;
}