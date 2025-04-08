import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import ApiHelper from '@/utils/ApiHelper';
import Config from '@/utils/Config';
import SetIntervalWorker from '@/utils/SetIntervalWorker';
import Utils from '@/utils/Utils';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import DataStore from '../DataStore';
import type { IStreamlabsActions, IStreamlabsGetters, IStreamlabsState } from '../StoreProxy';
import StoreProxy from '../StoreProxy';


let socket:WebSocket|undefined = undefined;
let pingInterval:string = "";
let reconnectTimeout:number = -1;
let reconnectAttempts:number = 0;
let charityRefreshTimeout:number = -1;
let isAutoInit:boolean = false;
let autoReconnect:boolean = false;
let resyncInProgress:boolean = false;
let donationPageIndex:number = 0;
let donationPrevPagesTotal:number = 0;

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
				const json = JSON.parse(sessionJSON) as StreamlabsStoreData;
				this.accessToken = json.accessToken;
				this.charityTeam = json.charityTeam as typeof this.charityTeam || null;
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
				if(this.charityTeam) {
					//Get fresh new data
					this.loadCharityCampaignInfo(this.charityTeam.teamURL);
				}
			}
			let cache = DataStore.get(DataStore.STREAMLABS_CHARITY_CACHE);
			if(cache) {
				const json = JSON.parse(cache) as {page:number, amount:number};
				if(donationPageIndex > 0) {
					donationPageIndex = json.page;
					donationPrevPagesTotal = json.amount;
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
			// if(!StoreProxy.auth.isPremium) return Promise.resolve(false);

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
											//Parse all donations
											message.message.forEach(message=> {
												// console.log(message, this.charityTeam);

												//Ignore if not for currently configure campaign ID
												if(message.campaignId != this.charityTeam?.campaignId && !message.isTest) return;

												const chunks = TwitchUtils.parseMessageToChunks(message.message, undefined, true);
												const to = message.to?.name || me.login;
												const isToSelf = to.toLowerCase() == me.login.toLowerCase() || to.toLowerCase() == me.displayNameOriginal.toLowerCase();
												const amount = parseFloat(message.amount);
												this.charityTeam!.amountRaised_cents += amount * 100;
												if(isToSelf) {
													this.charityTeam!.amountRaisedPersonnal_cents += amount * 100;
												}
												const data:TwitchatDataTypes.StreamlabsCharityData = {
													id:Utils.getUUID(),
													eventType:"charity",
													platform:"twitch",
													channel_id:me.id,
													type:TwitchatDataTypes.TwitchatMessageType.STREAMLABS,
													date:Date.now(),
													amount,
													amountFormatted:message.formatted_amount || message.formattedAmount,
													goal:this.charityTeam!.amountGoal_cents/100,
													goalFormatted:this.charityTeam!.amountGoal_cents/100 + this.charityTeam!.currency,
													totalRaised:this.charityTeam!.amountRaised_cents/100,
													totalRaisedFormatted:this.charityTeam!.amountRaised_cents/100 + this.charityTeam!.currency,
													campaign:{
														id:this.charityTeam!.cause.id,
														title:this.charityTeam!.cause.title,
														url:this.charityTeam!.teamURL,
													},
													to,
													currency:message.currency ?? "",
													message:message.message,
													message_chunks:chunks,
													message_html:TwitchUtils.messageChunksToHTML(chunks),
													userName:message.from,
													isToSelf,
												}
												StoreProxy.chat.addMessage(data);
											});

											clearTimeout(charityRefreshTimeout);
											charityRefreshTimeout = window.setTimeout(()=>{
												//Load fresh new charity data
												this.loadCharityCampaignInfo();
											}, 5000);
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
													platform:"twitch",
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
													platform:"twitch",
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
													platform:"twitch",
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
					reconnectTimeout = window.setTimeout(()=> {
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
					reconnectTimeout = window.setTimeout(()=> {
						socket = undefined;
						this.connect(token, true);
					}, 500 * reconnectAttempts);
				};
			});
		},

		disconnect(clearStore:boolean = true):void {
			autoReconnect = false;
			if(clearStore) {
				this.socketToken = "";
				this.accessToken = "";
				this.charityTeam = null;
				this.saveData();
			}
			if(pingInterval) SetIntervalWorker.instance.delete(pingInterval);
			clearTimeout(reconnectTimeout);
			if(socket && !this.connected) socket.close();
			this.connected = false;
		},

		saveData():void {
			const data:StreamlabsStoreData = {
				accessToken:this.accessToken,
				socketToken:this.socketToken,
				charityTeam:this.charityTeam,
			}
			DataStore.set(DataStore.STREAMLABS, data);
		},

		async loadCharityCampaignInfo(url?:string):Promise<boolean> {
			if(!url && this.charityTeam) url = this.charityTeam.teamURL;
			if(!url) return false;

			let memberId = "";
			try {
				const parsedUrl = new URL(url);
				memberId = parsedUrl.searchParams.get("member") || "";
			}catch(error) {}

			const teamRes = await fetch("https://streamlabscharity.com/api/v1/teams/@"+url.split("@").pop());
			if(teamRes.status != 200) return false;
			const prevValues = [];
			if(this.charityTeam) {
				prevValues.push(this.charityTeam.currency);
				prevValues.push(this.charityTeam.amountRaised_cents);
				prevValues.push(this.charityTeam.amountRaisedPersonnal_cents);
			}

			const teamJSON = await teamRes.json() as StreamlabsCharityTeamData;
			if(!this.charityTeam) {
				this.charityTeam = {
					id:teamJSON.id,
					teamURL:url,
					title:teamJSON.display_name,
					amountGoal_cents:teamJSON.campaign.goal.amount,
					amountRaised_cents:teamJSON.amount_raised,
					amountRaisedPersonnal_cents:0,
					currency:teamJSON.goal.currency,
					campaignId:teamJSON.campaign.id,
					pageUrl:`https://streamlabscharity.com/teams/@${teamJSON.slug}/${teamJSON.campaign.slug}?member=`+memberId,
					cause:{
						id:teamJSON.campaign.causable.id,
						title:teamJSON.campaign.causable.display_name,
						description:teamJSON.campaign.causable.description,
						website:teamJSON.campaign.causable.page_settings.website_url,
					}
				};
			}else{
				this.charityTeam.amountGoal_cents = teamJSON.campaign.goal.amount;
				this.charityTeam.amountRaised_cents = teamJSON.amount_raised;
			}

			StoreProxy.labels.updateLabelValue("STREAMLABS_CHARITY_GOAL", this.charityTeam.amountGoal_cents/100);
			StoreProxy.labels.updateLabelValue("STREAMLABS_CHARITY_RAISED", this.charityTeam.amountRaised_cents/100);
			StoreProxy.labels.updateLabelValue("STREAMLABS_CHARITY_IMAGE", teamJSON.campaign.causable.avatar.url);
			StoreProxy.labels.updateLabelValue("STREAMLABS_CHARITY_NAME", this.charityTeam.title);

			let leaderboardAmountCents = 0;

			//Get personnal raised amount from leaderboard
			const leaderBoardRes = await fetch("https://streamlabscharity.com/api/v1/teams/"+this.charityTeam.id+"/leaderboards");
			if(teamRes.status == 200) {
				const leaderboardJSON = await leaderBoardRes.json() as StreamlabsCharityLeaderboardData;
				const myName = StoreProxy.auth.twitch.user.displayNameOriginal.toLowerCase();
				leaderboardAmountCents = parseFloat(leaderboardJSON.top_streamers.find(v=>v.display_name.toLowerCase() == myName)?.amount || "0");
			}

			//Keep only the highest value between current and leadeboard amounts
			this.charityTeam.amountRaisedPersonnal_cents = Math.max(this.charityTeam.amountRaisedPersonnal_cents, leaderboardAmountCents);
			StoreProxy.labels.updateLabelValue("STREAMLABS_CHARITY_RAISED_PERSONNAL", this.charityTeam.amountRaisedPersonnal_cents/100);

			const newValues = [];
			if(this.charityTeam) {
				newValues.push(this.charityTeam.currency);
				newValues.push(this.charityTeam.amountRaised_cents);
				newValues.push(this.charityTeam.amountRaisedPersonnal_cents);
			}

			//Check if a value changed
			if(prevValues.join(",") != newValues.join(",")) {
				this.saveData();
				StoreProxy.donationGoals.onSourceValueUpdate("streamlabs_charity", this.charityTeam.campaignId);
			}

			StoreProxy.donationGoals.broadcastData();

			//Start full resync
			this.resyncFromDonationList();

			return true;
		},

		disconnectCharityCampaign():void {
			this.charityTeam = null;
			this.saveData();
		},

		async simulateEvents():Promise<void> {
			const events:StreamlabsCharityDonationData[] = [
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817149153","formattedAmount":"€10.00","formatted_amount":"€10.00","currency":"EUR","amount":"10.00","message":"","to":{"name":"Durss"},"memberId":"717456377752197490","from":"ArcticFury","id":70984,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 14:28:10","custom":[],"_id":"46a93e33745e27e0304dc2be0d57c788","priority":10}],"event_id":"evt_835c3b507b6ec154bbddd297bdab8006"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817153236","formattedAmount":"€1.00","formatted_amount":"€1.00","currency":"EUR","amount":"1.00","message":"Test et plus 1","to":{"name":"Durss"},"memberId":"717456377752197490","from":"FeralDragon","id":83955,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 16:44:25","custom":{"twitch_display_name":"dEito_daten"},"_id":"3e1c2a807a46606ce3bb1631c4c64f11","priority":10}],"event_id":"evt_f3d82e30ce3d77958f0b795f4ca1b25a"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817153244","formattedAmount":"€20.00","formatted_amount":"€20.00","currency":"EUR","amount":"20.00","message":"","to":{"name":"Durss"},"memberId":"717456377752197490","from":"SilentRaven","id":83688,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 16:44:28","custom":{"twitch_display_name":"pilout140"},"_id":"3417ad4b03bc8a37cb197baa6b6e9ebf","priority":10}],"event_id":"evt_3d767f9bbad0fe8ed825e96c53bd1cf1"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817153845","formattedAmount":"€10.00","formatted_amount":"€10.00","currency":"EUR","amount":"10.00","message":"Un petit don","to":{"name":"Durss"},"memberId":"717456377752197490","from":"StormChaser","id":93655,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 16:50:17","custom":[],"_id":"efc88d38c8572b38ae03a4659e0b2b41","priority":10}],"event_id":"evt_d3461b98926d8ea7c967d9c3116988f0"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817153895","formattedAmount":"€50.00","formatted_amount":"€50.00","currency":"EUR","amount":"50.00","message":"","to":{"name":"Durss"},"memberId":"717456377752197490","from":"CobaltShark","id":69473,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 16:50:44","custom":{"twitch_display_name":"beudbeud"},"_id":"06a0c1755494da326d0d778fd01fa67c","priority":10}],"event_id":"evt_4bb7e678a850530ea27f67c366534ddb"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817154016","formattedAmount":"€5.00","formatted_amount":"€5.00","currency":"EUR","amount":"5.00","message":"","to":{"name":"Durss"},"memberId":"717456377752197490","from":"SilentRaven","id":33609,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 16:51:54","custom":[],"_id":"af7f6098455d7a875030b70f8ec0f63a","priority":10}],"event_id":"evt_0a395fdaaf56f1b316b4d418f8d66e5b"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817154059","formattedAmount":"€20.00","formatted_amount":"€20.00","currency":"EUR","amount":"20.00","message":"On envoie la force !","to":{"name":"Durss"},"memberId":"717456377752197490","from":"BlazeKnight","id":22097,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 16:52:23","custom":{"twitch_display_name":"David_Kyden"},"_id":"2425fd9f99106a1b023811a7297670a9","priority":10}],"event_id":"evt_a31d9e794517cec5b47b4eeb886afa8b"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817154464","formattedAmount":"€15.00","formatted_amount":"€15.00","currency":"EUR","amount":"15.00","message":"Allez, le petit don. On est prêt pour ce grand week end o/","to":{"name":"Durss"},"memberId":"717456377752197490","from":"StormRider","id":11348,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 16:56:14","custom":[],"_id":"d40542155b96a5c6cc6c6ee72642a631","priority":10}],"event_id":"evt_b03fa5281b8044cc76b6b263b849c157"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817154672","formattedAmount":"€20.00","formatted_amount":"€20.00","currency":"EUR","amount":"20.00","message":"aller on lance la cagnotte","to":{"name":"Durss"},"memberId":"717456377752197490","from":"CrimsonPhantom","id":73713,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 16:58:17","custom":{"twitch_display_name":"BTzozo"},"_id":"0ac9b8cc043a9adb4819df01ef7d5df6","priority":10}],"event_id":"evt_89dc3d0c7f273bc72aa2714a06a40e30"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817154765","formattedAmount":"€100.00","formatted_amount":"€100.00","currency":"EUR","amount":"100.00","message":"Allez on lance les sub-goals","to":{"name":"Durss"},"memberId":"717456377752197490","from":"FireWing","id":18055,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 16:59:08","custom":[],"_id":"1321f5e9e9ab7cb811a75f1423b11efa","priority":10}],"event_id":"evt_bf8afc09c219171092c4d1e51b6fb70d"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817154818","formattedAmount":"€50.00","formatted_amount":"€50.00","currency":"EUR","amount":"50.00","message":"","to":{"name":"Durss"},"memberId":"717456377752197490","from":"TitanBrawler","id":41923,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 16:59:41","custom":{"twitch_display_name":"Durss"},"_id":"2c6f0077be7e623a3fe96b1dd2de31cc","priority":10}],"event_id":"evt_8a44d80b53cd731c1015f99e7270c0a4"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817154953","formattedAmount":"€50.00","formatted_amount":"€50.00","currency":"EUR","amount":"50.00","message":"","to":{"name":"Durss"},"memberId":"717456377752197490","from":"FrostNova","id":90841,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 17:01:02","custom":{"twitch_display_name":"Durss"},"_id":"633703a95246b263e096c058fc3f6ef2","priority":10}],"event_id":"evt_0cc8ee90fb07fb0c250781ff1fbb384e"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817155159","formattedAmount":"€20.00","formatted_amount":"€20.00","currency":"EUR","amount":"20.00","message":":)","to":{"name":"Durss"},"memberId":"717456377752197490","from":"VortexCrusher","id":42865,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 17:03:11","custom":[],"_id":"178c65118edf1a070a07580cee962168","priority":10}],"event_id":"evt_0cbfaadebd7809a6aefa892e7a1b55aa"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817156100","formattedAmount":"€20.00","formatted_amount":"€20.00","currency":"EUR","amount":"20.00","message":"Commentaire facultatif","to":{"name":"Durss"},"memberId":"717456377752197490","from":"TitanBrawler","id":66857,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 17:12:27","custom":{"twitch_display_name":"Pandur_xr"},"_id":"7f49fef3d3d2966f21e7bf687616f60d","priority":10}],"event_id":"evt_4b7cdba6f6d6af4ecf1a3f38906f1139"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817156732","formattedAmount":"€42.42","formatted_amount":"€42.42","currency":"EUR","amount":"42.42","message":"Un jour, Dieu demanda à Goo de crier, et depuis, Google.","to":{"name":"Durss"},"memberId":"717456377752197490","from":"FireWing","id":94383,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 17:18:43","custom":{"twitch_display_name":"PetitsPixels"},"_id":"17be55ac0cf489de51c01765d09ffb4c","priority":10}],"event_id":"evt_98bace1daf8711cd48af1eb679f84907"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817156935","formattedAmount":"€5.00","formatted_amount":"€5.00","currency":"EUR","amount":"5.00","message":"","to":{"name":"Durss"},"memberId":"717456377752197490","from":"VenomSpear","id":86576,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 17:20:44","custom":[],"_id":"d0d93c51ad6390a235f90a80601538b5","priority":10}],"event_id":"evt_cc783492a105708a6f5e199484b8621e"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817157067","formattedAmount":"€10.00","formatted_amount":"€10.00","currency":"EUR","amount":"10.00","message":"","to":{"name":"Durss"},"memberId":"717456377752197490","from":"LightningRaven","id":51739,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 17:22:04","custom":[],"_id":"5092e2f6c8355948167e38144510e3dc","priority":10}],"event_id":"evt_f3d4c5b672668cef1000e6f85018f01d"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817157571","formattedAmount":"€1.00","formatted_amount":"€1.00","currency":"EUR","amount":"1.00","message":"juste pour voir","to":{"name":"Durss"},"memberId":"717456377752197490","from":"StormBreaker","id":34879,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 17:27:00","custom":{"twitch_display_name":"dEito_daten"},"_id":"f46b59e23f3c8324b4f16d2436eaff3e","priority":10}],"event_id":"evt_a974cbec9f4fbf13c0f0148c21663379"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817158621","formattedAmount":"€25.00","formatted_amount":"€25.00","currency":"EUR","amount":"25.00","message":"","to":{"name":"Durss"},"memberId":"717456377752197490","from":"FeralDragon","id":28560,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 17:37:32","custom":{"twitch_display_name":"Bounitos"},"_id":"647724853860cc1a91d6ef191ef9b4d2","priority":10}],"event_id":"evt_dca5cddd9b8fd1ef8237795fd042c477"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817159151","formattedAmount":"€10.00","formatted_amount":"€10.00","currency":"EUR","amount":"10.00","message":"On soutient le boulot qui va être abattu ce week end.","to":{"name":"Durss"},"memberId":"717456377752197490","from":"PhantomDusk","id":80342,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 17:42:52","custom":[],"_id":"8c73a282f6d355694057ce2f89d8c844","priority":10}],"event_id":"evt_eace2804af1c9c466c58630605871a8b"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817159175","formattedAmount":"€15.00","formatted_amount":"€15.00","currency":"EUR","amount":"15.00","message":"Petit à petit, la cagnotte grandit avec des pixels","to":{"name":"Durss"},"memberId":"717456377752197490","from":"AquaViper","id":67565,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 17:43:04","custom":[],"_id":"4dd68a5c359fdeb8c67b734dd8f35360","priority":10}],"event_id":"evt_c65bca5fef08dc7b4c6a7a7642629687"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817159212","formattedAmount":"€50.00","formatted_amount":"€50.00","currency":"EUR","amount":"50.00","message":"it's nice to be important, but it's more important to be nice !","to":{"name":"Durss"},"memberId":"717456377752197490","from":"EmberFist","id":84146,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 17:43:27","custom":[],"_id":"8b263a105525a01a067373dcbe4a78fa","priority":10}],"event_id":"evt_5109d6d270f696646a3ebe4c6c351d78"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817159529","formattedAmount":"€20.00","formatted_amount":"€20.00","currency":"EUR","amount":"20.00","message":"","to":{"name":"Durss"},"memberId":"717456377752197490","from":"NeonFalcon","id":24499,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 17:46:45","custom":{"twitch_display_name":"Ouamesss"},"_id":"8c61fa8380d4ed9f700b06fc17c333c4","priority":10}],"event_id":"evt_ee4071a4a07c827ae1f0f2feb0c3a728"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817159978","formattedAmount":"€20.00","formatted_amount":"€20.00","currency":"EUR","amount":"20.00","message":"Let's go !","to":{"name":"Durss"},"memberId":"717456377752197490","from":"FeralDragon","id":75323,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 17:51:29","custom":{"twitch_display_name":"ERockmanu"},"_id":"a16c43bd00886f3b52e9ea40835a6cae","priority":10}],"event_id":"evt_7d74094b069a42e579a55be6053d1590"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817160002","formattedAmount":"€25.00","formatted_amount":"€25.00","currency":"EUR","amount":"25.00","message":"Tous ensemble !!!!","to":{"name":"Durss"},"memberId":"717456377752197490","from":"FrostNova","id":84960,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 17:51:41","custom":[],"_id":"4aedff2214f484f124d3786a041abb61","priority":10}],"event_id":"evt_e39da86303a422287159f995487c48ef"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817160024","formattedAmount":"€20.00","formatted_amount":"€20.00","currency":"EUR","amount":"20.00","message":"aller on participe un peu","to":{"name":"Durss"},"memberId":"717456377752197490","from":"CrimsonViper","id":41088,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 17:51:56","custom":{"twitch_display_name":"sebol38"},"_id":"e063989f114a78dbd4a830dc31e1f792","priority":10}],"event_id":"evt_5c0ee2b14b1f8d8de165f49c28d84413"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817160619","formattedAmount":"€10.00","formatted_amount":"€10.00","currency":"EUR","amount":"10.00","message":"Bourrez les dons !!!","to":{"name":"Durss"},"memberId":"717456377752197490","from":"PhantomDusk","id":46481,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 17:59:46","custom":{"twitch_display_name":"ZeWindsor"},"_id":"a8c82d3f9e01bfca3b0506a03107aaff","priority":10}],"event_id":"evt_79cf14ad9479136e1fe9278beec40506"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817160661","formattedAmount":"€100.00","formatted_amount":"€100.00","currency":"EUR","amount":"100.00","message":"","to":{"name":"Durss"},"memberId":"717456377752197490","from":"OnyxSaber","id":21878,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 18:00:26","custom":{"twitch_display_name":"Ouamesss"},"_id":"ca73aacb37ca859f30c72df2508dc1a7","priority":10}],"event_id":"evt_a73227619bac1063db8c88be431ce93a"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817161847","formattedAmount":"€20.00","formatted_amount":"€20.00","currency":"EUR","amount":"20.00","message":"","to":{"name":"Durss"},"memberId":"717456377752197490","from":"PhantomDusk","id":62279,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 18:14:46","custom":[],"_id":"97dab86bc9ed6163ef05663db5be4f71","priority":10}],"event_id":"evt_ab42af96f83b0ed845b78c76e6ea1592"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817162273","formattedAmount":"€50.00","formatted_amount":"€50.00","currency":"EUR","amount":"50.00","message":"","to":{"name":"Durss"},"memberId":"717456377752197490","from":"BlizzardWolf","id":58277,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 18:20:36","custom":[],"_id":"6b239e646feb481d1abb60a4edf024d3","priority":10}],"event_id":"evt_72079e33e924674b623e8eb3eb9a121e"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817162326","formattedAmount":"€50.00","formatted_amount":"€50.00","currency":"EUR","amount":"50.00","message":"Apero !","to":{"name":"Durss"},"memberId":"717456377752197490","from":"ViperClaw","id":82739,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 18:21:17","custom":{"twitch_display_name":"DeDe89110"},"_id":"7898665af05c517ca67f4c1b7fec4bbd","priority":10}],"event_id":"evt_8343147d4b98e090335b0a5eb3b28008"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817162726","formattedAmount":"€5.00","formatted_amount":"€5.00","currency":"EUR","amount":"5.00","message":"Hop une petite piecette pour la bonne cause !","to":{"name":"Durss"},"memberId":"717456377752197490","from":"ThunderWolf","id":52861,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 18:26:38","custom":[],"_id":"fbe9bd54d36097722720236305762c81","priority":10}],"event_id":"evt_bd98f0208bc784b05c6f81158cc60426"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817162957","formattedAmount":"€10.00","formatted_amount":"€10.00","currency":"EUR","amount":"10.00","message":"","to":{"name":"Durss"},"memberId":"717456377752197490","from":"PhoenixTalon","id":53794,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 18:29:36","custom":[],"_id":"e38814a58bdb02899401dad1a38ad7c9","priority":10}],"event_id":"evt_f6066bcc4f13d005803b7be09a85be6e"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817163000","formattedAmount":"€30.00","formatted_amount":"€30.00","currency":"EUR","amount":"30.00","message":"coucou les recalpotes","to":{"name":"Durss"},"memberId":"717456377752197490","from":"MidnightRogue","id":39314,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 18:30:22","custom":{"twitch_display_name":"alx5962"},"_id":"3e257d83c2a6546084e696e7f284d2be","priority":10}],"event_id":"evt_12227ead60fb4049ae861f8329cfdde0"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817163873","formattedAmount":"€10.00","formatted_amount":"€10.00","currency":"EUR","amount":"10.00","message":"","to":{"name":"Durss"},"memberId":"717456377752197490","from":"ThunderStrike","id":72600,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 18:42:07","custom":{"twitch_display_name":"La bande a Pixel"},"_id":"216bd2c6e54d21ec106910559810f22c","priority":10}],"event_id":"evt_a2272977264d69d93dfee08a87c3cdd7"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817164066","formattedAmount":"€20.00","formatted_amount":"€20.00","currency":"EUR","amount":"20.00","message":"","to":{"name":"Durss"},"memberId":"717456377752197490","from":"FireWing","id":98500,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 18:45:13","custom":[],"_id":"4c4d32187785994517ae65a9109a4bf2","priority":10}],"event_id":"evt_08c19b59453363b789aa9cfc5f2110b1"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817170811","formattedAmount":"€5.00","formatted_amount":"€5.00","currency":"EUR","amount":"5.00","message":"","to":{"name":"Durss"},"memberId":"717456377752197490","from":"SkyHunter","id":28376,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 19:30:33","custom":{"twitch_display_name":"Ryujin80"},"_id":"5d85a3673f527076cb6b1601af052a40","priority":10}],"event_id":"evt_30dba342d8350ba9a72af486ad689e10"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817171038","formattedAmount":"€20.00","formatted_amount":"€20.00","currency":"EUR","amount":"20.00","message":"","to":{"name":"Durss"},"memberId":"717456377752197490","from":"FeralDragon","id":54887,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 19:32:56","custom":{"twitch_display_name":"Bisonweed"},"_id":"1ab415e123ba6a0512bb400f9e9044e9","priority":10}],"event_id":"evt_92ffbc5d6ba4fd696185bb98424fb89e"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817171049","formattedAmount":"€25.00","formatted_amount":"€25.00","currency":"EUR","amount":"25.00","message":"Bonne chance ! Que le succès de votre projet caritatif dépasse toutes vos attentes !","to":{"name":"Durss"},"memberId":"717456377752197490","from":"WildFury","id":30784,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 19:33:03","custom":[],"_id":"d8d67e5b93fc8aa8374f65718cec317f","priority":10}],"event_id":"evt_0e11dcb72819febf8bbe2c69baba8e5b"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817176270","formattedAmount":"€30.00","formatted_amount":"€30.00","currency":"EUR","amount":"30.00","message":"","to":{"name":"Durss"},"memberId":"717456377752197490","from":"OnyxSaber","id":55408,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 20:29:16","custom":{"twitch_display_name":"bigfriendlygeek_bfg"},"_id":"f1bb42a7ed4ccdd44171ac39a23d78ed","priority":10}],"event_id":"evt_b929e7e025f87e07d6e70b0413b9c838"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817176347","formattedAmount":"€25.00","formatted_amount":"€25.00","currency":"EUR","amount":"25.00","message":"Avec amour d’Anvers en Belgique.","to":{"name":"Durss"},"memberId":"717456377752197490","from":"StormRider","id":24182,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 20:29:57","custom":{"twitch_display_name":"LemmyCaution66"},"_id":"34af89885d0532f74996f3042ca18fb2","priority":10}],"event_id":"evt_db13e7589d97e76af7112f73624d0f5d"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817176519","formattedAmount":"€5.00","formatted_amount":"€5.00","currency":"EUR","amount":"5.00","message":"Hop kdo !","to":{"name":"Durss"},"memberId":"717456377752197490","from":"FeralDragon","id":57182,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 20:32:14","custom":[],"_id":"11e44656961569ff5829015df4b3d7cd","priority":10}],"event_id":"evt_62922aa7dd46f7d6135c779fe60b8836"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817176583","formattedAmount":"€25.00","formatted_amount":"€25.00","currency":"EUR","amount":"25.00","message":"","to":{"name":"Durss"},"memberId":"717456377752197490","from":"OnyxSaber","id":18117,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 20:33:08","custom":[],"_id":"db585d5b5994d32fc3ee8350e62e8b9d","priority":10}],"event_id":"evt_60e9100626bc0837a42ab0c3272a3ae4"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817176674","formattedAmount":"€50.00","formatted_amount":"€50.00","currency":"EUR","amount":"50.00","message":"","to":{"name":"Durss"},"memberId":"717456377752197490","from":"OnyxSaber","id":66966,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 20:34:52","custom":{"twitch_display_name":"mickeilckeil"},"_id":"4dc40e04b1323cb294a5c6ee34013796","priority":10}],"event_id":"evt_33891cb428d4dd70ceae7282d3638491"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817176702","formattedAmount":"€25.00","formatted_amount":"€25.00","currency":"EUR","amount":"25.00","message":"","to":{"name":"Durss"},"memberId":"717456377752197490","from":"ThunderWolf","id":38942,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 20:35:21","custom":[],"_id":"90737a3879649b4d7c1fd508b94de06a","priority":10}],"event_id":"evt_47b4e3c2878a1cc106cd82f87d3cf8d6"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817176743","formattedAmount":"€50.00","formatted_amount":"€50.00","currency":"EUR","amount":"50.00","message":"","to":{"name":"Durss"},"memberId":"717456377752197490","from":"VenomSpear","id":57196,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 20:36:15","custom":[],"_id":"8b6dd05bbae3931854c036dfe9a71e98","priority":10}],"event_id":"evt_40d3c42700cd8b229449d831b4dbcce8"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817176759","formattedAmount":"€30.00","formatted_amount":"€30.00","currency":"EUR","amount":"30.00","message":"","to":{"name":"Durss"},"memberId":"717456377752197490","from":"NeonFalcon","id":33678,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 20:36:34","custom":[],"_id":"0b4a3b585622a9de0c0ffec16011cf50","priority":10}],"event_id":"evt_319205fe06dc134fcf49b36fea171afa"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817176873","formattedAmount":"€25.00","formatted_amount":"€25.00","currency":"EUR","amount":"25.00","message":"Durss 4Ever ;)","to":{"name":"Durss"},"memberId":"717456377752197490","from":"WildFury","id":24046,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 20:38:51","custom":{"twitch_display_name":"calif59"},"_id":"21e6b4313c103b118e70ad1a80830db9","priority":10}],"event_id":"evt_1a79986efbeb169cfc6737d110887084"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817176918","formattedAmount":"€20.00","formatted_amount":"€20.00","currency":"EUR","amount":"20.00","message":"","to":{"name":"Durss"},"memberId":"717456377752197490","from":"SilverScythe","id":15879,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 20:39:41","custom":{"twitch_display_name":"arya404"},"_id":"167e7e2370b49bdd8623d7647ce37bc1","priority":10}],"event_id":"evt_acac93f813c9100f7f2d0cc311500999"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817177119","formattedAmount":"€20.00","formatted_amount":"€20.00","currency":"EUR","amount":"20.00","message":"","to":{"name":"Durss"},"memberId":"717456377752197490","from":"ViperClaw","id":99094,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 20:43:57","custom":[],"_id":"35be62620f9540de52e59727803959b6","priority":10}],"event_id":"evt_9429ba73e2fa6a96456cfb38351581d9"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817177129","formattedAmount":"€5.00","formatted_amount":"€5.00","currency":"EUR","amount":"5.00","message":"","to":{"name":"Durss"},"memberId":"717456377752197490","from":"LunarKnight","id":64615,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 20:44:14","custom":[],"_id":"436b45a8e835bc763f73baa4dbdbf26a","priority":10}],"event_id":"evt_707570bc21c6ed2bcc987d763d7e844a"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817177169","formattedAmount":"€40.00","formatted_amount":"€40.00","currency":"EUR","amount":"40.00","message":"mas_power","to":{"name":"Durss"},"memberId":"717456377752197490","from":"VortexCrusher","id":10539,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 20:45:09","custom":[],"_id":"2813be786501cd32b545a114f6e9c8e5","priority":10}],"event_id":"evt_1f6663d56cbf9a56ad3c50af90284d43"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817177174","formattedAmount":"€25.00","formatted_amount":"€25.00","currency":"EUR","amount":"25.00","message":"","to":{"name":"Durss"},"memberId":"717456377752197490","from":"CobaltShark","id":38598,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 20:45:19","custom":{"twitch_display_name":"Amarok_Ommadawn"},"_id":"4b5ffca3f5d1d5474844dd81c028ae90","priority":10}],"event_id":"evt_ecd466b33706c6bbd6f2a4103ac4fba4"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817177185","formattedAmount":"€25.00","formatted_amount":"€25.00","currency":"EUR","amount":"25.00","message":"","to":{"name":"Durss"},"memberId":"717456377752197490","from":"ShadowWolf","id":56150,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 20:45:32","custom":[],"_id":"cf07bc8583b2229830e480dc36fd1f80","priority":10}],"event_id":"evt_cb017807e7ee0d21cdcfee98025569bb"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817177231","formattedAmount":"€10.00","formatted_amount":"€10.00","currency":"EUR","amount":"10.00","message":"","to":{"name":"Durss"},"memberId":"717456377752197490","from":"SkyHunter","id":15428,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 20:46:27","custom":[],"_id":"7d36b47f22db0a50424283f71dfe4d6c","priority":10}],"event_id":"evt_37a88f90df35d34899f55e7ef190933c"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817177246","formattedAmount":"€5.00","formatted_amount":"€5.00","currency":"EUR","amount":"5.00","message":"","to":{"name":"Durss"},"memberId":"717456377752197490","from":"VenomSpear","id":28805,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 20:46:48","custom":[],"_id":"abf91cecb6ea31c34496ed63d1238067","priority":10}],"event_id":"evt_8910ee0bd854edb16187d39e4875847f"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817177296","formattedAmount":"€30.00","formatted_amount":"€30.00","currency":"EUR","amount":"30.00","message":"bah du coup je redonne","to":{"name":"Durss"},"memberId":"717456377752197490","from":"SilverScythe","id":24303,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 20:47:50","custom":[],"_id":"6f4980bfb8db9ce60e508756d5f1c3d3","priority":10}],"event_id":"evt_9d37d5c8370643e64525f4695e7cd46a"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817177753","formattedAmount":"€150.00","formatted_amount":"€150.00","currency":"EUR","amount":"150.00","message":"","to":{"name":"Durss"},"memberId":"717456377752197490","from":"PhoenixTalon","id":18838,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 20:53:01","custom":[],"_id":"ea5266e0caf0075d1fbbc9ec0e00d775","priority":10}],"event_id":"evt_2c28da4e76a7a63a85abae4ccea2c364"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817177826","formattedAmount":"€4.00","formatted_amount":"€4.00","currency":"EUR","amount":"4.00","message":"Petit test après mon 1er don pas passé","to":{"name":"Durss"},"memberId":"717456377752197490","from":"MysticBlade","id":79223,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 20:54:50","custom":[],"_id":"a35f18b74d1c59e9c012bf72c9e15167","priority":10}],"event_id":"evt_23094e31e28a1e339014136c22084902"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817177951","formattedAmount":"€25.00","formatted_amount":"€25.00","currency":"EUR","amount":"25.00","message":"","to":{"name":"Durss"},"memberId":"717456377752197490","from":"LightningRaven","id":79251,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 20:57:44","custom":{"twitch_display_name":"atoon86"},"_id":"00a24de3b689ac0ae70e95f2eb5b012d","priority":10}],"event_id":"evt_9deaa68e200eea8cd3bb8f27206b8151"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817178255","formattedAmount":"€50.00","formatted_amount":"€50.00","currency":"EUR","amount":"50.00","message":"TO THE MOOOOOON !","to":{"name":"Durss"},"memberId":"717456377752197490","from":"NightCrawler","id":76278,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 21:07:17","custom":{"twitch_display_name":"obawicha"},"_id":"9ab7ffb4a2ca555567d54258131edb15","priority":10}],"event_id":"evt_f6e0fb2262a5b2806451d82431ecf07e"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817178291","formattedAmount":"€25.00","formatted_amount":"€25.00","currency":"EUR","amount":"25.00","message":"","to":{"name":"Durss"},"memberId":"717456377752197490","from":"NightCrawler","id":36127,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 21:08:33","custom":{"twitch_display_name":"gnome_neosam"},"_id":"d1e3988c99bd012b2cb8159255834ae4","priority":10}],"event_id":"evt_b2ce2a539fb58ab106c0b2785c6a6d56"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817178294","formattedAmount":"€25.00","formatted_amount":"€25.00","currency":"EUR","amount":"25.00","message":"","to":{"name":"Durss"},"memberId":"717456377752197490","from":"FlameFox","id":63127,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 21:08:34","custom":[],"_id":"310b9687034b3ebdd5332c9562494168","priority":10}],"event_id":"evt_01a7b82b8d641d4248b386614847d34b"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817178913","formattedAmount":"€25.00","formatted_amount":"€25.00","currency":"EUR","amount":"25.00","message":"","to":{"name":"Durss"},"memberId":"717456377752197490","from":"BlackWidow","id":28623,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 21:22:12","custom":{"twitch_display_name":"stban75"},"_id":"3f2760fa8d390fe6073e1bbbc7d4fd0c","priority":10}],"event_id":"evt_1bb8318c6d36e8ea2fb5985dd20c04a9"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817179006","formattedAmount":"€69.00","formatted_amount":"€69.00","currency":"EUR","amount":"69.00","message":"❤️","to":{"name":"Durss"},"memberId":"717456377752197490","from":"StormChaser","id":26370,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 21:24:18","custom":[],"_id":"dbe22d4de34d525624f059edfce6462d","priority":10}],"event_id":"evt_5cf735ef8942c3d956de062238f934ba"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817181602","formattedAmount":"€1.00","formatted_amount":"€1.00","currency":"EUR","amount":"1.00","message":"Je te découvre grace à zevent et j'adore","to":{"name":"Durss"},"memberId":"717456377752197490","from":"SilentRaven","id":49542,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 22:00:48","custom":{"twitch_display_name":"marzacode"},"_id":"71d35387605b39745b0d1a03980a4159","priority":10}],"event_id":"evt_38dd15b4c553f25357d45ce36068daad"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817181613","formattedAmount":"€100.00","formatted_amount":"€100.00","currency":"EUR","amount":"100.00","message":"Merci Durss et tous les invités pour ces bons moments partagés!","to":{"name":"Durss"},"memberId":"717456377752197490","from":"PhoenixTalon","id":83584,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 22:01:05","custom":[],"_id":"5c5b165649281577872282dd232ecf88","priority":10}],"event_id":"evt_425eb926f903473b533327924dc1b912"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817181669","formattedAmount":"€25.00","formatted_amount":"€25.00","currency":"EUR","amount":"25.00","message":"To the mooooooooon","to":{"name":"Durss"},"memberId":"717456377752197490","from":"FrostNova","id":67152,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 22:01:58","custom":{"twitch_display_name":"KansenWirus"},"_id":"ec8153e4ba98794b14428a30802239f1","priority":10}],"event_id":"evt_e309c5e67cb1982c25789b095870f2b3"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817181967","formattedAmount":"€25.00","formatted_amount":"€25.00","currency":"EUR","amount":"25.00","message":"","to":{"name":"Durss"},"memberId":"717456377752197490","from":"SilentRaven","id":36388,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 22:07:17","custom":{"twitch_display_name":"BelgaWill"},"_id":"5f7893c1eba3aebfd5a0bf7f025fc66c","priority":10}],"event_id":"evt_3407b82a474157f01e55e0f172534a64"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817182536","formattedAmount":"€20.00","formatted_amount":"€20.00","currency":"EUR","amount":"20.00","message":"","to":{"name":"Durss"},"memberId":"717456377752197490","from":"VenomSpear","id":12398,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 22:15:17","custom":{"twitch_display_name":"merak35"},"_id":"7391ffabeeb826c2871771f1757b4d0d","priority":10}],"event_id":"evt_8f65f28772b2d0d5fd074be960be05f7"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817182588","formattedAmount":"€5.00","formatted_amount":"€5.00","currency":"EUR","amount":"5.00","message":"","to":{"name":"Durss"},"memberId":"717456377752197490","from":"GoldenSpectre","id":75269,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 22:16:17","custom":[],"_id":"98ff7ce29f2c0d03d5e2602ddb219f82","priority":10}],"event_id":"evt_c5fbc65a8e9350a8c8cfc723959955b4"},
				{"type":"streamlabscharitydonation","for":"streamlabscharity","message":[{"charityDonationId":"455768204817183028","formattedAmount":"€50.00","formatted_amount":"€50.00","currency":"EUR","amount":"50.00","message":"","to":{"name":"Durss"},"memberId":"717456377752197490","from":"NightCrawler","id":34444,"userId":"717456361696403399","campaignId":"713449001231458231","createdAt":"2024-09-06 22:24:21","custom":{"twitch_display_name":"m_a_r_t_i_a_l"},"_id":"8789d55e599797b47c44d3df6940ec5f","priority":10}],"event_id":"evt_3611a48922eba410ce6ef6d635d7de91"}
			];
			const me = StoreProxy.auth.twitch.user;

			for (let i = 0; i < events.length; i++) {
				//Parse all donations
				const event = events[i];
				const message = event.message[0];
				message.campaignId = this.charityTeam!.campaignId;

				//Ignore if not for currently configure campaign ID
				if(message.campaignId != this.charityTeam!.campaignId) continue;

				const chunks = TwitchUtils.parseMessageToChunks(message.message, undefined, true);
				const to = message.to?.name || me.login;
				const isToSelf = to.toLowerCase() == me.login.toLowerCase() || to.toLowerCase() == me.displayNameOriginal.toLowerCase();
				const amount = parseFloat(message.amount);
				this.charityTeam!.amountRaised_cents += amount * 100;
				if(isToSelf || true) {
					this.charityTeam!.amountRaisedPersonnal_cents += amount * 100;
				}
				const data:TwitchatDataTypes.StreamlabsCharityData = {
					id:Utils.getUUID(),
					eventType:"charity",
					platform:"twitchat",
					channel_id:me.id,
					type:TwitchatDataTypes.TwitchatMessageType.STREAMLABS,
					date:Date.now(),
					amount,
					amountFormatted:message.formatted_amount || message.formattedAmount,
					goal:this.charityTeam!.amountGoal_cents/100,
					goalFormatted:this.charityTeam!.amountGoal_cents/100 + this.charityTeam!.currency,
					totalRaised:this.charityTeam!.amountRaised_cents/100,
					totalRaisedFormatted:this.charityTeam!.amountRaised_cents/100 + this.charityTeam!.currency,
					campaign:{
						id:this.charityTeam!.cause.id,
						title:this.charityTeam!.cause.title,
						url:this.charityTeam!.teamURL,
					},
					to,
					currency:message.currency ?? "",
					message:message.message,
					message_chunks:chunks,
					message_html:TwitchUtils.messageChunksToHTML(chunks),
					userName:message.from,
					isToSelf,
				}
				StoreProxy.chat.addMessage(data);

				await Utils.promisedTimeout(Math.random() * 5000);
			}
		},

		async resyncFromDonationList():Promise<void> {
			if(resyncInProgress || !this.charityTeam) return;
			resyncInProgress = true;

			const me = StoreProxy.auth.twitch.user;
			let pageIndex = donationPageIndex;
			let hasResults = false;
			let total = donationPrevPagesTotal;
			let lastPageTotal = 0;
			let prevValue = this.charityTeam.amountRaisedPersonnal_cents;
			let lastTip:StreamlabsCharityDonationHistoryEntry|undefined = undefined;
			do {
				hasResults = false;
				const donationsRes = await fetch("https://streamlabscharity.com/api/v1/teams/"+this.charityTeam.id+"/donations?page="+pageIndex);
				if(donationsRes.status == 200) {
					const donationsJSON = await donationsRes.json() as StreamlabsCharityDonationHistoryEntry[];
					hasResults = donationsJSON.length > 0;
					lastPageTotal = 0;
					if(hasResults) {
						let filtered = donationsJSON.filter(v => v.member && (
							v.member.user.display_name.toLowerCase() === me.login.toLowerCase()
							|| v.member.user.display_name.toLowerCase() === me.displayNameOriginal.toLowerCase()
						));
						filtered.forEach(v => {
							total += v.donation.converted_amount;
							lastPageTotal += v.donation.converted_amount;
						});
						if(filtered.length > 0) {
							lastTip = filtered.pop();
						}
					}
				}
				pageIndex ++;
			}while(hasResults);

			//Cache all previous pages result (last one excluded) to avoid calling them all again
			donationPageIndex = pageIndex - 1;
			donationPrevPagesTotal = total - lastPageTotal;

			let currentValue = StoreProxy.labels.getLabelByKey("STREAMLABS_CHARITY_RAISED_PERSONNAL") as number || 0;
			this.charityTeam.amountRaisedPersonnal_cents = Math.max(currentValue*100, total);

			DataStore.set(DataStore.STREAMLABS_CHARITY_CACHE, {page:donationPageIndex, amount:donationPrevPagesTotal});
			StoreProxy.labels.updateLabelValue("STREAMLABS_CHARITY_RAISED_PERSONNAL", this.charityTeam.amountRaisedPersonnal_cents/100);
			if(lastTip) {
				StoreProxy.labels.updateLabelValue("STREAMLABS_CHARITY_LAST_TIP_AMOUNT", lastTip.donation.converted_amount/100);
				StoreProxy.labels.updateLabelValue("STREAMLABS_CHARITY_LAST_TIP_USER", lastTip.member.user.display_name);
			}

			if(this.charityTeam.amountRaisedPersonnal_cents != prevValue) {
				StoreProxy.donationGoals.onSourceValueUpdate("streamlabs_charity", this.charityTeam.campaignId);
				StoreProxy.donationGoals.broadcastData();
				this.saveData();
			}

			resyncInProgress = false;
		}

	} as IStreamlabsActions
	& ThisType<IStreamlabsActions
		& UnwrapRef<IStreamlabsState>
		& _StoreWithState<"raffle", IStreamlabsState, IStreamlabsGetters, IStreamlabsActions>
		& _StoreWithGetters<IStreamlabsGetters>
		& PiniaCustomProperties
	>,
})

if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeStreamlabs, import.meta.hot))
}

export interface StreamlabsStoreData {
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
		formatted_amount:string;
		formattedAmount:string;
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
	for:"streamlabscharity";
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
		custom: unknown;
		_id: string;
		priority: number;
		senderId?: number;
		isTest?: boolean;
		isPreview?: boolean;
		unsavedSettings?: any[];
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

export interface StreamlabsCharityLeaderboardData {
	top_streamers: {
		amount: string;
		display_name: string;
	}[];
	top_donators: {
		display_name: string;
		amount: number;
		comment: {
			id: string;
			text: string;
		};
	}[];
}

export interface StreamlabsCharityDonationHistoryEntry {
	id: string;
	donation: {
		id: string;
		display_name: string;
		amount_usd: number;
		converted_currency: string;
		converted_amount: number;
		original_currency: string;
		original_amount: number;
		team_currency: string;
		team_amount: number;
		member_currency: string;
		member_amount: number;
		country: string;
		created_at: string;
		team_member_id: string;
		comment: {
			id: string;
			text: string;
		};
		extra_information: any;
	};
	member: {
		id: string;
		user: {
			id: string;
			display_name: string;
			slug: string;
			is_live: boolean;
			currency: string;
		}
	}
}
