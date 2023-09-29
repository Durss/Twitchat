import type { HeatScreen } from '@/types/HeatDataTypes';
import Utils from '@/utils/Utils';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import DataStore from '../DataStore';
import type { IHeatActions, IHeatGetters, IHeatState } from '../StoreProxy';
import type HeatEvent from '@/events/HeatEvent';
import StoreProxy from '../StoreProxy';
import { TriggerTypes, type TriggerActionChatData, type TriggerData } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TriggerActionHandler from '@/utils/triggers/TriggerActionHandler';
import OBSWebsocket from '@/utils/OBSWebsocket';
import SpotifyHelper from '@/utils/music/SpotifyHelper';

export const storeHeat = defineStore('heat', {
	state: () => ({
		screenList:[],
	} as IHeatState),



	getters: {

	} as IHeatGetters
	& ThisType<UnwrapRef<IHeatState> & _StoreWithGetters<IHeatGetters> & PiniaCustomProperties>
	& _GettersTree<IHeatState>,



	actions: {

		createScreen():string {
			const screen:HeatScreen = {
				id:Utils.getUUID(),
				areas:[],
				activeOBSScene:"",
				enabled:true,
			}
			this.screenList.push(screen);

			this.saveScreens();
			return screen.id;
		},

		duplicateScreen(id:string):void {
			let screen = this.screenList.find(v=>v.id == id);
			if(!screen) return;

			screen = JSON.parse(JSON.stringify(screen));
			screen!.id = Utils.getUUID();

			this.screenList.push(screen!);

			this.saveScreens();
		},

		deleteScreen(id:string):void {
			let index = this.screenList.findIndex(v=>v.id == id);
			if(index == -1) return;
			this.screenList.splice(index, 1);

			this.saveScreens();
		},
		
		updateScreen(data:HeatScreen):void {
			let index = this.screenList.findIndex(v=>v.id == data.id);
			if(index == -1) {
				this.screenList.push(data);
			}else{
				this.screenList[index] = data;
			}

			this.saveScreens();
		},

		saveScreens():void {
			for (let i = 0; i < this.screenList.length; i++) {
				const screen = this.screenList[i];
				for (let j = 0; j < screen.areas.length; j++) {
					const a = screen.areas[j];
					if(a.points.length == 0) {
						screen.areas.splice(j, 1);
						j--;
					}
				}
			}
			DataStore.set(DataStore.HEAT_SCREENS, this.screenList);
		},

		async handleClickEvent(event:HeatEvent):Promise<void> {

			//Stop there if coordinates are missing, can't do anything without it
			if(!event.coordinates) return;

			const isTrigger = StoreProxy.triggers.triggerList.find(v=>v.type == TriggerTypes.HEAT_CLICK) != undefined;
			const isOverlay = StoreProxy.chat.botMessages.heatSpotify.enabled || StoreProxy.chat.botMessages.heatUlule.enabled;
			
			//If nothing requests for heat click events, ignore it
			if(!isTrigger && !isOverlay) return;

			const channelId = StoreProxy.auth.twitch.user.id;
			const anonymous = parseInt(event.uid || "anon").toString() !== event.uid;
			let user!:Pick<TwitchatDataTypes.TwitchatUser, "id" | "login" | "channelInfo">;
			if(!anonymous) {
				//Load user data
				user = await new Promise((resolve)=> {
					StoreProxy.users.getUserFrom("twitch", channelId, event.uid, undefined, undefined, (user)=>{
						resolve(user);
					});
				})
			}else{
				//Create a fake partial user with only ID set so the trigger's cooldowns
				//can properly be applied later.
				const channelInfo:{[key:string]:TwitchatDataTypes.UserChannelInfo} = {};
				channelInfo[channelId] = {
					badges:[],
					following_date_ms:-1,
					is_banned:false,
					is_broadcaster:false,
					is_following:false,
					is_gifter:false,
					is_moderator:false,
					is_new:false,
					is_raider:false,
					is_subscriber:false,
					is_vip:false,
					online:true,
				}
				user = { id:event.uid || "anon", login:"anon", channelInfo };
			}

			const message:TwitchatDataTypes.MessageHeatClickData = {
				date:Date.now(),
				id:Utils.getUUID(),
				platform:"twitch",
				type:TwitchatDataTypes.TwitchatMessageType.HEAT_CLICK,
				user,
				anonymous,
				channel_id:channelId,
				alt:event.alt === true,
				ctrl:event.ctrl === true,
				shift:event.shift === true,
				coords:{
					x:event.coordinates.x * 100,
					y:event.coordinates.y * 100,
				}
			}
			// TriggerActionHandler.instance.execute(message);
			// TriggerActionHandler.instance.executeTriggersByType(TriggerTypes.HEAT_CLICK, message, false);

			const screens = StoreProxy.heat.screenList;
			const obsScene = StoreProxy.main.currentOBSScene;
			//Parse all screens
			for (let i = 0; i < screens.length; i++) {
				const s = screens[i];
				//Screen disabled, ignore it
				if(!s.enabled) continue;
				//Check if requested OBS scene is active
				if(s.activeOBSScene && s.activeOBSScene != obsScene) continue;
				//Parse all areas
				for (let j = 0; j < s.areas.length; j++) {
					const a = s.areas[j];
					const isInside = Utils.isPointInsidePolygon({x:event.coordinates.x, y:event.coordinates.y}, a.points);
					//If click is inside the area, execute the trigger
					if(isInside){
						const clone = JSON.parse(JSON.stringify(message)) as TwitchatDataTypes.MessageHeatClickData;
						clone.areaId = a.id;
						TriggerActionHandler.instance.execute(clone);
					}
				}
			}

			//If OBS websocket is connected, check which sources are under pointer.
			//Checks for clickable overlays (spotify, ulule) as well as triggers related to sources
			if(OBSWebsocket.instance.connected) {
				const rects = await OBSWebsocket.instance.getSourcesDisplayRects();
				const spotifyRoute = StoreProxy.router.resolve({name:"overlay", params:{id:"music"}}).href;
				const ululeRoute = StoreProxy.router.resolve({name:"overlay", params:{id:"ulule"}}).href;

				//Init trigger data
				const action:TriggerActionChatData = {
					id:Utils.getUUID(),
					text:"",
					type:'chat',
				}
				const trigger:TriggerData = {
					id:Utils.getUUID(),
					type:TriggerTypes.TWITCHAT_MESSAGE,
					enabled:true,
					actions:[action],
					cooldown: {
						user: 0,
						global: 0,
						alert:false,
					}
				}

				const ululeProject = DataStore.get(DataStore.ULULE_PROJECT);
				const px = event.coordinates.x;
				const py = event.coordinates.y;

				for (let i = 0; i < rects.sources.length; i++) {
					const rect = rects.sources[i];
					const x = rects.canvas.width * px;
					const y = rects.canvas.height * py;
					const bounds = rect.transform;
					const polygon = [bounds.globalTL!, bounds.globalTR!, bounds.globalBR!, bounds.globalBL!];
					const isInside = Utils.isPointInsidePolygon({x,y}, polygon);

					//Click is outside overlay, ingore it
					if(!isInside) continue;

					const clone = JSON.parse(JSON.stringify(message)) as TwitchatDataTypes.MessageHeatClickData;
					clone.obsSource = rect.source.sourceName;
					TriggerActionHandler.instance.execute(clone, event.testMode);

					if(rect.source.inputKind == "browser_source") {
						let settings = await OBSWebsocket.instance.getSourceSettings(rect.source.sourceName);
						const url:string = settings.inputSettings.url as string;
						
						//Compute click position relative to the browser source
						const rotatedClick = Utils.rotatePointAround({x, y},
																{x:rect.transform.globalCenterX!, y:rect.transform.globalCenterY!},
																-rect.transform.globalRotation!);
						const rotatedTL = Utils.rotatePointAround(rect.transform.globalTL!,
																{x:rect.transform.globalCenterX!, y:rect.transform.globalCenterY!},
																-rect.transform.globalRotation!);
						rotatedClick.x -= rotatedTL.x;
						rotatedClick.y -= rotatedTL.y;
						const percentX = rotatedClick.x / rect.transform.width / rect.transform.globalScaleX!;
						const percentY = rotatedClick.y / rect.transform.height / rect.transform.globalScaleY!;

						//Send click info to browser source
						OBSWebsocket.instance.socket.call("CallVendorRequest", {
							requestType:"emit_event",
							vendorName:"obs-browser",
							requestData:{
								event_name:"heat-click",
								event_data:{anonymous, x:percentX, y:percentY,
									rotation:rect.transform.globalRotation,
									scaleX:rect.transform.globalScaleX!,
									scaleY:rect.transform.globalScaleY!,
									uid:user.id,
									login:user.login,
									isSub:user.channelInfo[channelId].is_subscriber,
									isBan:user.channelInfo[channelId].is_banned,
									isMod:user.channelInfo[channelId].is_moderator,
									isVip:user.channelInfo[channelId].is_vip,
									isFollower:user.channelInfo[channelId].is_following,
									testMode:event.testMode,
									alt:event.alt,
									ctrl:event.ctrl,
									shift:event.shift,
									page:await Utils.sha256(url)},
							}
						});
						console.log(url);


						//Spotify overlay
						if(url.indexOf(spotifyRoute) > -1
						&& StoreProxy.chat.botMessages.heatSpotify.enabled
						&& SpotifyHelper.instance.isPlaying) {
							//If anon users are not allowed, skip
							if(anonymous && StoreProxy.chat.botMessages.heatSpotify.allowAnon !== true) continue;
							//If user is banned, skip
							if(user.channelInfo![channelId]?.is_banned) continue;
							
							trigger.id = "heat_spotify_click";//Don't make this a random value or cooldown will break as it's based on this ID !
							action.text = StoreProxy.chat.botMessages.heatSpotify.message;
							trigger.cooldown!.global = StoreProxy.chat.botMessages.heatSpotify.cooldown!;
							
							TriggerActionHandler.instance.executeTrigger(trigger, message, event.testMode == true);
						}
						if(url.indexOf(ululeRoute) > -1 && StoreProxy.chat.botMessages.heatUlule.enabled && ululeProject) {
							//If anon users are not allowed, skip
							if(anonymous && StoreProxy.chat.botMessages.heatUlule.allowAnon !== true) continue;
							//If user is banned, skip
							if(user.channelInfo![channelId]?.is_banned) continue;

							trigger.id = "heat_ulule_click";//Don't make this a random value or cooldown will break as it's based on this ID !
							action.text = StoreProxy.chat.botMessages.heatUlule.message;
							trigger.cooldown!.global = StoreProxy.chat.botMessages.heatUlule.cooldown!;
							TriggerActionHandler.instance.executeTrigger(trigger, message, event.testMode == true);
						}
					}
				}

				const rectPoints:number[][] = [];
				rects.sources.forEach(v => {
					const points = [
						v.transform.globalTL!.x,
						v.transform.globalTL!.y,
						v.transform.globalTR!.x,
						v.transform.globalTR!.y,
						v.transform.globalBR!.x,
						v.transform.globalBR!.y,
						v.transform.globalBL!.x,
						v.transform.globalBL!.y,
					]
					rectPoints.push(points);
				});

				//Send click info to browser source
				OBSWebsocket.instance.socket.call("CallVendorRequest", {
					requestType:"emit_event",
					vendorName:"obs-browser",
					requestData:{
						event_name:"heat-rects",
						//Sending as string because vendor request doesn't seem to handle array of numbers.
						//I receive an empty array on the other side
						event_data:{rects:JSON.stringify(rectPoints)},
					}
				});
			}
		}

	} as IHeatActions
	& ThisType<IHeatActions
		& UnwrapRef<IHeatState>
		& _StoreWithState<"timer", IHeatState, IHeatGetters, IHeatActions>
		& _StoreWithGetters<IHeatGetters>
		& PiniaCustomProperties
	>,
})