import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import ApiHelper from '@/utils/ApiHelper';
import Config from '@/utils/Config';
import SetIntervalWorker from '@/utils/SetIntervalWorker';
import Utils from '@/utils/Utils';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import DataStore from '../DataStore';
import type { IStreamlabsActions, IStreamlabsGetters, IStreamlabsState } from '../StoreProxy';
import StoreProxy from '../StoreProxy';


let socket:WebSocket|undefined = undefined;
let pingInterval:string = "";
let reconnectTimeout:number = -1;
let reconnectAttempts:number = 0;
let isAutoInit:boolean = false;
let autoReconnect:boolean = false;

export const storeStreamlabs = defineStore('streamlabs', {
	state: () => ({
		accessToken:"",
		socketToken:"",
		connected:false,
		authResult:{code:"", csrf:""},
		charityTeam:null,
	} as IStreamlabsState),



	getters: {
		
	} as IStreamlabsGetters
	& ThisType<UnwrapRef<IStreamlabsState> & _StoreWithGetters<IStreamlabsGetters> & PiniaCustomProperties>
	& _GettersTree<IStreamlabsState>,



	actions: {
		async populateData():Promise<void> {
			const sessionJSON = DataStore.get(DataStore.STREAMLABS);
			if(sessionJSON) {
				const json = JSON.parse(sessionJSON) as SreamlabsStoreData;
				this.accessToken = json.accessToken;
				this.charityTeam = json.charityTeam as typeof this.charityTeam || null;
				if(this.charityTeam) {
					//Get fresh new data
					this.connectToCharityCampaign(this.charityTeam.teamURL);
				}
				if(this.accessToken) {
					isAutoInit = true;
					const result = await ApiHelper.call("streamlabs/socketToken", "GET", {accessToken:this.accessToken}, false);
					if(result.json.success) {
						this.socketToken = result.json.socketToken || "";
						this.connect(this.socketToken);
					}else{
						StoreProxy.common.alert(StoreProxy.i18n.t("error.streamlabs_connect_failed"));
					}
				}
			}
		},

		async getOAuthURL():Promise<string> {
			const csrfToken = await ApiHelper.call("auth/CSRFToken", "GET");
			const redirectURI = document.location.origin + StoreProxy.router.resolve({name:"streamlabs/auth"}).href;
			const url = new URL("https://streamlabs.com/api/v2.0/authorize");
			url.searchParams.set("client_id",Config.instance.STREAMLABS_CLIENT_ID);
			url.searchParams.set("redirect_uri",redirectURI);
			url.searchParams.set("scope","socket.token");
			url.searchParams.set("response_type","code");
			url.searchParams.set("state", csrfToken.json.token);
			return url.href;
		},
		
		setAuthResult(code:string, csrf:string):void {
			this.authResult.code = code;
			this.authResult.csrf = csrf;
		},
		
		async getAccessToken():Promise<boolean> {
			try {
				const csrfResult = await ApiHelper.call("auth/CSRFToken", "POST", {token:this.authResult.csrf});
				if(!csrfResult.json.success) return false;
				const result = await ApiHelper.call("streamlabs/auth", "POST", this.authResult, false)
				if(result.json.success) {
					this.accessToken = result.json.accessToken!;
					this.socketToken = "";
					this.saveData();
					return await this.connect(result.json.socketToken!);
				}
				return false;
			}catch(error){
				return false;
			}
		},

		async connect(token:string, isReconnect:boolean = false):Promise<boolean> {
			if(!StoreProxy.auth.isPremium) return Promise.resolve(false);

			//Token changed
			if(isReconnect && token != this.socketToken) return Promise.resolve(false);
			
			this.disconnect(false);

			if(!isReconnect) {
				this.socketToken = token;
				this.saveData();
			}

			autoReconnect = true;

			return new Promise<boolean>((resolve, reject)=> {
	
				socket = new WebSocket(`wss://sockets.streamlabs.com/socket.io/?EIO=3&transport=websocket&token=${this.socketToken}`);
	
				socket.onopen = async () => {
					reconnectAttempts = 0;
					clearTimeout(reconnectTimeout);
				};
				
				socket.onmessage = (event:MessageEvent<string>) => {
					//PONG messages
					if(event.data == "3") return;
					//Connection acknwoledgment
					if(event.data == "40") {
						this.connected = true;
						resolve(true);
						return;
					}
					try {
						let codeLength = 0;
						for (; codeLength < event.data.length; codeLength++) {
							if(!/[0-9]/.test(event.data[codeLength])) break;
						}
						const code = event.data.substring(0, codeLength);
						const json = JSON.parse(event.data.replace(new RegExp("^"+code, ""), ""));
						//Welcome message
						if(code == "0") {
							const message = json as StreamlabsWelcomeData;
							//Send PING command regularly
							if(pingInterval) SetIntervalWorker.instance.delete(pingInterval);
							pingInterval = SetIntervalWorker.instance.create(()=>{
								socket?.send("2");
							}, message.pingInterval || 10000);
						}else

						//Authentication failed
						if(code == "44") {
							//Show error on top of page
							if(isAutoInit) {
								StoreProxy.common.alert(StoreProxy.i18n.t("error.streamlabs_connect_failed"));
							}
							this.disconnect(false);
							resolve(false);

						}else{
							const isPremium = StoreProxy.auth.isPremium;
							if(Array.isArray(json)) {
								const me = StoreProxy.auth.twitch.user;
								json.forEach(async entry=>{
									if(typeof entry == "string") return;
									const message = entry as StreamlabsDonationData | StreamlabsYoutubeSponsorData | StreamlabsYoutubeSuperchatData | StreamlabsMerchData | StreamlabsPatreonPledgeData | StreamlabsCharityDonationData;
									switch(message.type) {
										case "streamlabscharitydonation": {
											ApiHelper.call("log", "POST", {cat:"streamlabs", log:message});
											if(!this.charityTeam) break;
											//Load fresh new charity data
											await this.connectToCharityCampaign(this.charityTeam!.teamURL);
											console.log(message);
											message.message.forEach(message=> {
												//Parse all donations
												const chunks = TwitchUtils.parseMessageToChunks(message.message, undefined, true);
												const to = message.to?.name || me.login;
												const data:TwitchatDataTypes.StreamlabsCharityData = {
													id:Utils.getUUID(),
													eventType:"charity",
													platform:"twitchat",
													channel_id:me.id,
													type:TwitchatDataTypes.TwitchatMessageType.STREAMLABS,
													date:Date.now(),
													amount:parseFloat(message.amount),
													amountFormatted:message.formatted_amount || message.formattedAmount,
													goal:this.charityTeam!.amountGoal_cents/100,
													goalFormatted:this.charityTeam!.amountGoal_cents/100 + this.charityTeam!.currency,
													totalRaised:this.charityTeam!.amountRaised_cents/100,
													totalRaisedFormatted:this.charityTeam!.amountRaised_cents/100 + this.charityTeam!.currency,
													campaign:{
														id:this.charityTeam!.cause.id,
														title:this.charityTeam!.cause.title,
														url:this.charityTeam!.cause.website,
													},
													to,
													currency:message.currency ?? "",
													message:message.message,
													message_chunks:chunks,
													message_html:TwitchUtils.messageChunksToHTML(chunks),
													userName:message.from,
													isToSelf:to.toLowerCase() == me.login.toLowerCase() || to.toLowerCase() == me.displayNameOriginal.toLowerCase(),
												}
												StoreProxy.chat.addMessage(data);
											});
											break;
										}
										case "donation": {
											//Reject if not premium
											if(!isPremium) return;
											message.message.forEach(message=> {
												const chunks = TwitchUtils.parseMessageToChunks(message.message, undefined, true);
												const data:TwitchatDataTypes.StreamlabsDonationData = {
													id:Utils.getUUID(),
													eventType:"donation",
													platform:"twitchat",
													channel_id:me.id,
													type:TwitchatDataTypes.TwitchatMessageType.STREAMLABS,
													date:Date.now(),
													amount:message.amount,
													amountFormatted:message.formatted_amount || message.formattedAmount,
													currency:message.currency ?? "",
													message:message.message,
													message_chunks:chunks,
													message_html:TwitchUtils.messageChunksToHTML(chunks),
													userName:message.from,
												}
												StoreProxy.chat.addMessage(data);
											});
											break;
										}
										case "merch": {
											//Reject if not premium
											if(!isPremium) return;
											message.message.forEach(message=> {
												const chunks = TwitchUtils.parseMessageToChunks(message.message, undefined, true);
												const data:TwitchatDataTypes.StreamlabsMerchData = {
													id:Utils.getUUID(),
													eventType:"merch",
													platform:"twitchat",
													channel_id:me.id,
													type:TwitchatDataTypes.TwitchatMessageType.STREAMLABS,
													date:Date.now(),
													product:message.product,
													message:message.message,
													message_chunks:chunks,
													message_html:TwitchUtils.messageChunksToHTML(chunks),
													userName:message.from,
												}
												StoreProxy.chat.addMessage(data);
											});
											break;
										}
										case "pledge": {
											//Reject if not premium
											if(!isPremium) return;
											message.message.forEach(message=> {
												const data:TwitchatDataTypes.StreamlabsPatreonPledgeData = {
													id:Utils.getUUID(),
													eventType:"patreon_pledge",
													platform:"twitchat",
													channel_id:me.id,
													type:TwitchatDataTypes.TwitchatMessageType.STREAMLABS,
													date:Date.now(),
													userName:message.from,
													amount:message.amount,
													amountFormatted:message.formatted_amount || message.formattedAmount,
													currency:message.currency ?? "",
												}
												StoreProxy.chat.addMessage(data);
											});
											break;
										}
									}
								})
							}
						}
					}catch(error){
						console.log("Failed parsing Streamlabs JSON data");
						console.log(event.data);
						console.error(error);
					}
					isAutoInit = false;
				};
			
				socket.onclose = (event) => {
					//Do not reconnect if token changed
					if(token != this.socketToken) return;
					if(!autoReconnect) return;
	
					this.connected = false;
					if(pingInterval) SetIntervalWorker.instance.delete(pingInterval);
					clearTimeout(reconnectTimeout);
					reconnectAttempts ++;
					reconnectTimeout = setTimeout(()=> {
						socket = undefined;
						this.connect(token, true);
					}, 500 * reconnectAttempts);
				};
				
				socket.onerror = (error) => {
					resolve(false);
					this.connected = false;
					if(!autoReconnect) return;
					reconnectAttempts ++;
					if(pingInterval) SetIntervalWorker.instance.delete(pingInterval);
					clearTimeout(reconnectTimeout);
					reconnectTimeout = setTimeout(()=> {
						socket = undefined;
						this.connect(token, true);
					}, 500 * reconnectAttempts);
				};
			});
		},

		disconnect(clearStore:boolean = true):void {
			autoReconnect = false;
			this.connected = false;
			if(clearStore) {
				this.socketToken = "";
				this.accessToken = "";
				this.saveData();
			}
			if(pingInterval) SetIntervalWorker.instance.delete(pingInterval);
			clearTimeout(reconnectTimeout);
			if(socket && !this.connected) socket.close();
		},

		saveData():void {
			const data:SreamlabsStoreData = {
				accessToken:this.accessToken,
				socketToken:this.socketToken,
				charityTeam:this.charityTeam,
			}
			DataStore.set(DataStore.STREAMLABS, data);
		},

		async connectToCharityCampaign(url:string):Promise<boolean> {
			const teamRes = await fetch("https://streamlabscharity.com/api/v1/teams/@"+url.split("@").pop());
			if(teamRes.status != 200) return false;
			const teamJSON = await teamRes.json() as StreamlabsCharityTeamData;
			this.charityTeam = {
				teamURL:url,
				title:teamJSON.display_name,
				amountGoal_cents:teamJSON.goal.amount,
				amountRaised_cents:teamJSON.amount_raised,
				currency:teamJSON.goal.currency,
				pageUrl:`https://streamlabscharity.com/teams/@${teamJSON.slug}/${teamJSON.campaign.slug}?member=695641406655567174`,
				cause:{
					id:teamJSON.campaign.causable.id,
					title:teamJSON.campaign.causable.display_name,
					description:teamJSON.campaign.causable.description,
					website:teamJSON.campaign.causable.page_settings.website_url,
				}
			};

			this.saveData();

			return true;
		},

		disconnectCharityCampaign():void {
			this.charityTeam = null;
			this.saveData();
		}
	
	} as IStreamlabsActions
	& ThisType<IStreamlabsActions
		& UnwrapRef<IStreamlabsState>
		& _StoreWithState<"raffle", IStreamlabsState, IStreamlabsGetters, IStreamlabsActions>
		& _StoreWithGetters<IStreamlabsGetters>
		& PiniaCustomProperties
	>,
})

export interface SreamlabsStoreData {
	accessToken:string;
	socketToken:string;
	charityTeam:typeof StoreProxy.streamlabs.charityTeam;
}

interface StreamlabsWelcomeData {
    sid:string;
    upgrades:unknown[];
    pingInterval: number;
    pingTimeout: number;
    maxPayload: number;
}

interface StreamlabsDonationData {
	type: "donation";
	message:{
		priority: number;
		isTest: boolean;
		name:string;
		amount:number;
		formattedAmount:string;
		/**
		 * @deprecated apparently they changed for "formattedAmount"
		 */
		formatted_amount:string;
		message:string;
		currency:string;
		emotes:string;
		iconClassName:string;
		to:{
			name:string;
		};
		from:string;
		from_user_id:string;
		_id:string;
	}[];
	for:"streamlabs";
    event_id: string;
}

interface StreamlabsMerchData {
    type: "merch";
    message: {
		name: string;
		isTest: boolean,
		message: string;
		to: {
			name: string;
		};
		from: string;
		product: string;
		imageHref: string;
		condition: string;
		_id: string;
		priority: 10;
	}[];
	for:"streamlabs";
    event_id: string;
}

interface StreamlabsPatreonPledgeData {
    type: "pledge";
    message: {
		name:string;
		isTest: boolean;
		formattedAmount:string;
		/**
		 * @deprecated apparently they changed for "formattedAmount"
		 */
		formatted_amount:string;
		amount: 22;
		currency:string;
		to: {
			name:string;
		},
		from:string;
		_id:string;
		priority:string;
	}[];
	for:"patreon";
    event_id:string;
}

interface StreamlabsYoutubeSponsorData {
	type: "subscription";
	message: {
		sponsorSince:string;
		id:string;
		name:string;
		channelUrl:string;
		months:number;
		_id:string;
    }[];
	for: "youtube_account";
    event_id: string;
}

interface StreamlabsYoutubeSuperchatData {
	type: "superchat";
	message: {
		id:string;
		channelId:string;
		channelUrl:string;
		name:string;
		comment:string;
		amount:string;
		currency:string;
		displayString:string;
		messageType: number,
		createdAt:string;
		_id:string;
	}[];
	for: "youtube_account";
    event_id: string;
}

interface StreamlabsCharityDonationData {
	type: "streamlabscharitydonation";
	for:"streamlabs";
	message: {
		charityDonationId: string;
		formattedAmount: string;
		/**
		 * @deprecated apparently they changed for "formattedAmount"
		 */
		formatted_amount: string;
		currency: string;
		amount: string;
		message: string;
		to?: {
			name: string;
		};
		memberId: string;
		from: string;
		id: number;
		userId: string;
		campaignId: string;
		createdAt: string;
		custom: any[];
		_id: string;
		priority: number;
	}[];
    event_id: string;
}

export interface StreamlabsCharityTeamData {
	id: string;
	display_name: string;
	slug: string;
	public: boolean;
	amount_raised: number;
	amount_raised_usd: number;
	campaign: {
		id: string;
		display_name: string;
		slug: string;
		starts_at: string;
		ends_at: string;
		currency: string;
		amount_raised: number;
		amount_raised_usd: number;
		active_milestone_widget: boolean;
		creator: {
			id: string;
			display_name: string;
			slug: string;
			is_live: boolean;
			currency: string;
			avatar: {
				url: string;
			};
		};
		causable: {
			id: string;
			display_name: string;
			slug: string;
			description: string;
			enable_fundraising: boolean;
			rank: number;
			amount_raised: number;
			has_paypal: boolean;
			has_stripe: boolean;
			external_platforms: {
				ppgf: boolean;
				benevity: boolean;
				platform_id?: any;
			};
			avatar: {
				url: string;
			};
			page_settings: {
				header_url: string;
				website_url: string;
				video_url?: any;
				donation_box_settings: {
					opt_in: boolean;
					options: {
						option_1: {
							value: number;
							description: string;
						};
						option_2: {
							value: number;
							description: string;
						};
						option_3: {
							value: number;
							description: string;
						};
						option_4: {
							value: number;
							description: string;
						};
						description: string;
					};
					custom_donation_checkbox: boolean;
					custom_donation_checkbox_value: boolean;
					custom_donation_checkbox_display_name: string;
				};
				min_don_amount: number;
				twitter: string;
				facebook: string;
				twitch?: any;
				instagram: string;
				youtube: string;
				discord?: any;
				misc_url?: any;
				misc_url_2?: any;
				misc_url_3?: any;
				extras: {
					title_font: {
						kind: string;
						files: {
							'300': string;
							'600': string;
							'700': string;
							'800': string;
							italic: string;
							regular: string;
							'300italic': string;
							'600italic': string;
							'700italic': string;
							'800italic': string;
						};
						family: string;
						subsets: string[];
						version: string;
						category: string;
						variants: string[];
						lastModified: string;
					};
					title_weight: string;
					primary_button_color: string;
					secondary_button_color: string;
					primary_button_text_color: string;
					secondary_button_text_color: string;
				};
				toolkit_url?: any;
			};
			details: {
				country: string;
				currency: string;
			};
			tags: {
				id: string;
				name: string;
			}[];
			rating?: any;
		};
		goal: {
			id: string;
			amount: number;
			completed: boolean;
		};
		page_settings: {
			description: string;
			header_url: string;
		};
		active_giveaway?: any;
		rewards: any[];
	};
	rewards: any[];
	members:  {
		id: string;
		team_alerts: boolean;
		team_donation_goal: boolean;
		user: {
			id: string;
			display_name: string;
			slug: string;
			is_live: boolean;
			currency: string;
			avatar: {
				url: string;
			};
		};
	}[];
	goal:  {
		id: string;
		amount: number;
		currency: string;
	};
}