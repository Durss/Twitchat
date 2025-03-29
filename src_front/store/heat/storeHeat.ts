import type HeatEvent from '@/events/HeatEvent';
import type { HeatScreen } from '@/types/HeatDataTypes';
import { TriggerTypes, type TriggerActionChatData, type TriggerData } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import OBSWebsocket from '@/utils/OBSWebsocket';
import Utils from '@/utils/Utils';
import SpotifyHelper from '@/utils/music/SpotifyHelper';
import TriggerActionHandler from '@/utils/triggers/TriggerActionHandler';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import DataStore from '../DataStore';
import type { IHeatActions, IHeatGetters, IHeatState } from '../StoreProxy';
import StoreProxy from '../StoreProxy';
import TwitchatEvent from '@/events/TwitchatEvent';
import PublicAPI from '@/utils/PublicAPI';
import type { JsonObject } from "type-fest";
import type { LogHeat } from '@/utils/Logger';
import Logger from '@/utils/Logger';

export const storeHeat = defineStore('heat', {
	state: () => ({
		screenList:[],
		distortionList:[],
	} as IHeatState),



	getters: {

	} as IHeatGetters
	& ThisType<UnwrapRef<IHeatState> & _StoreWithGetters<IHeatGetters> & PiniaCustomProperties>
	& _GettersTree<IHeatState>,



	actions: {
		populateData():void {
			//Init heat screens
			const heatScreensParams = DataStore.get(DataStore.HEAT_SCREENS);
			if(heatScreensParams) {
				Utils.mergeRemoteObject(JSON.parse(heatScreensParams), (this.screenList as unknown) as JsonObject);
			}

			//Init heat distortions
			const heatDistortionParams = DataStore.get(DataStore.OVERLAY_DISTORTIONS);
			if(heatDistortionParams) {
				this.distortionList = JSON.parse(heatDistortionParams);
			}
		},

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

			screen = JSON.parse(JSON.stringify(screen)) as typeof screen;
			screen.id = Utils.getUUID();
			screen.areas.forEach(area => area.id=  Utils.getUUID());

			this.screenList.push(screen!);

			this.saveScreens();
		},

		deleteScreen(id:string):void {
			const index = this.screenList.findIndex(v=>v.id == id);
			if(index == -1) return;
			this.screenList.splice(index, 1);

			this.saveScreens();
		},

		updateScreen(data:HeatScreen):void {
			const index = this.screenList.findIndex(v=>v.id == data.id);
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

			const log:LogHeat = {
				id:Utils.getUUID(),
				date:Date.now(),
				info:"",
				targets:[],
				anonymous:false,
				x:event.coordinates.x,
				y:event.coordinates.y,
				alt:event.alt === true,
				ctrl:event.ctrl === true,
				shift:event.shift === true,
				testMode:event.testMode === true,
			}

			const isTrigger = StoreProxy.triggers.triggerList.find(v=>v.type == TriggerTypes.HEAT_CLICK) != undefined;
			const isOverlay = StoreProxy.chat.botMessages.heatSpotify.enabled || StoreProxy.chat.botMessages.heatUlule.enabled;
			const isDistortion = this.distortionList.filter(v=>v.enabled).length > 0

			//If nothing requests for heat click events, ignore it
			if(!isTrigger && !isOverlay && !isDistortion) {
				log.info = "Ignoring click because nothing needs it.";
				Logger.instance.log("heat", log);
				return;
			}

			const channelId = StoreProxy.auth.twitch.user.id;
			const anonymous = parseInt(event.uid || "anon").toString() !== event.uid;
			log.anonymous = anonymous;
			let user!:Pick<TwitchatDataTypes.TwitchatUser, "id" | "login" | "channelInfo" | "anonymous" | "platform">;
			if(!anonymous) {
				//Load user data
				user = await new Promise((resolve)=> {
					StoreProxy.users.getUserFrom("twitch", channelId, event.uid, undefined, undefined, (user)=>{
						resolve(user);
					}, undefined, undefined, undefined, false);
				});
				log.user = user;
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
				user = { id:event.uid || "anon", login:"anon", channelInfo, anonymous:true, platform:"twitch" };
			}

			//If user is banned, ignore its click
			if(user.channelInfo![channelId]?.is_banned) {
				log.info = "User \""+user.login+"\" is banned from your channel. Ingore their click.";
				Logger.instance.log("heat", log);
				return;
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
			TriggerActionHandler.instance.execute(message);

			//Parse all custom areas
			const screens = StoreProxy.heat.screenList;
			const obsScene = StoreProxy.common.currentOBSScene;
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
						log.targets.push({customAreaID:a.id, x:event.coordinates.x, y:event.coordinates.y});
						const clone = JSON.parse(JSON.stringify(message)) as TwitchatDataTypes.MessageHeatClickData;
						clone.areaId = a.id;
						TriggerActionHandler.instance.execute(clone);
					}
				}
			}

			//If OBS websocket is not connected, stop there
			if(!OBSWebsocket.instance.connected) {
				Logger.instance.log("heat", log);
				return;
			}

			OBSWebsocket.instance.log("Heat click");

			//OBS websocket is connected, check which sources are under pointer.
			//Checks for clickable overlays (spotify, ulule) as well as triggers related to sources
			const rects = await OBSWebsocket.instance.getSourcesDisplayRects();
			const spotifyRoute = StoreProxy.router.resolve({name:"overlay", params:{id:"music"}}).href;
			const ululeRoute = StoreProxy.router.resolve({name:"overlay", params:{id:"ulule"}}).href;
			const ululeProject = DataStore.get(DataStore.ULULE_PROJECT);
			const px = event.coordinates.x;
			const py = event.coordinates.y;

			//Init trigger data template
			const action:TriggerActionChatData = {
				id:Utils.getUUID(),
				text:"",
				type:'chat',
				sendAsReply:false,
			}
			const trigger:TriggerData = {
				id:Utils.getUUID(),
				type:TriggerTypes.TWITCHAT_MESSAGE,
				enabled:true,
				actions:[],
				cooldown: {
					user: 0,
					global: 0,
					alert:false,
				}
			}
			const clickEventDataTemplate:{requestType:string, vendorName:string, requestData:{event_name:string, event_data:TwitchatDataTypes.HeatClickData}} = {
				requestType:"emit_event",
				vendorName:"obs-browser",
				requestData:{
					event_name:"heat-click",
					event_data: {
						id:Utils.getUUID(),
						anonymous,
						x:0,
						y:0,
						channelId,
						uid:user.id,
						login:user.login,
						rotation:0,
						scaleX:0,
						scaleY:0,
						isBroadcaster:user.channelInfo[channelId].is_broadcaster,
						isSub:user.channelInfo[channelId].is_subscriber,
						isBan:user.channelInfo[channelId].is_banned,
						isMod:user.channelInfo[channelId].is_moderator,
						isVip:user.channelInfo[channelId].is_vip,
						isFollower:user.channelInfo[channelId].is_following || false,
						followDate:user.channelInfo[channelId].following_date_ms,
						testMode:event.testMode || false,
						alt:event.alt || false,
						ctrl:event.ctrl || false,
						shift:event.shift || false,
						twitchatOverlayID:"",
						page:"",
					}
				}
			};

			//Check if a distortion targetting current OBS scene exists
			for (let j = 0; j < this.distortionList.length; j++) {
				const d = this.distortionList[j];

				//Ignore disabled and trigger-only distortions
				if(!d.enabled || d.triggerOnly) continue;
				//Ignore distortions not linked to a scene
				if(d.obsItemPath.source.name || d.obsItemPath.groupName) continue;
				//Ignore distortions not linked to a scene
				// if(d.obsItemPath.sceneName != StoreProxy.common.currentOBSScene) continue;

				OBSWebsocket.instance.log("Reroute click from scene \""+d.obsItemPath.sceneName+"\" to overlay ID \""+d.id+"\"");
				const clickClone = JSON.parse(JSON.stringify(clickEventDataTemplate)) as typeof clickEventDataTemplate;
				clickClone.requestData.event_data.twitchatOverlayID = d.id;
				clickClone.requestData.event_data.x = event.coordinates.x;
				clickClone.requestData.event_data.y = event.coordinates.y;
				clickClone.requestData.event_data.scaleX = 1;
				clickClone.requestData.event_data.scaleY = 1;
				OBSWebsocket.instance.socket.call("CallVendorRequest", clickClone);
				log.targets.push({distortiontID: d.id, x:event.coordinates.x, y:event.coordinates.y});
			}

			// Parse all available OBS sources
			const distortionRerouted:{[key:string]:boolean} = {};
			mainloop:for (let i = 0; i < rects.sources.length; i++) {
				const rect = rects.sources[i];
				const x = rects.canvas.width * px;
				const y = rects.canvas.height * py;
				const bounds = rect.transform;
				const tl = {x:bounds.globalTL!.x + (bounds.cropLeft || 0), y:bounds.globalTL!.y + (bounds.cropTop || 0)}!
				const tr = {x:bounds.globalTR!.x - (bounds.cropRight || 0), y:bounds.globalTR!.y + (bounds.cropTop || 0)}!
				const br = {x:bounds.globalBR!.x - (bounds.cropRight || 0), y:bounds.globalBR!.y - (bounds.cropBottom || 0)}!
				const bl = {x:bounds.globalBL!.x + (bounds.cropLeft || 0), y:bounds.globalBL!.y - (bounds.cropBottom || 0)}!
				const polygon = [tl, tr, br, bl];
				const isInside = Utils.isPointInsidePolygon({x,y}, polygon);

				OBSWebsocket.instance.log("Is click inside source \""+rect.source.sourceName+"\"? "+isInside);

				//Click is outside OBS source, ingore it
				if(!isInside) continue;

				//Execute triggers related to that source
				const clone = JSON.parse(JSON.stringify(message)) as typeof message;
				clone.obsSource = rect.source.sourceName;
				TriggerActionHandler.instance.execute(clone, event.testMode);

				//Compute click position relative to the browser source
				const rotatedClick = Utils.rotatePointAround({x, y},
														{x:rect.transform.globalCenterX!, y:rect.transform.globalCenterY!},
														-rect.transform.globalRotation!);
				const rotatedTL = Utils.rotatePointAround(rect.transform.globalTL!,
														{x:rect.transform.globalCenterX!, y:rect.transform.globalCenterY!},
														-rect.transform.globalRotation!);
				rotatedClick.x -= rotatedTL.x;
				rotatedClick.y -= rotatedTL.y;
				const dx = Math.sqrt(Math.pow(bounds.globalTR!.x - bounds.globalTL!.x, 2) + Math.pow(bounds.globalTR!.y - bounds.globalTL!.y, 2));
				const dy = Math.sqrt(Math.pow(bounds.globalBL!.x - bounds.globalTL!.x, 2) + Math.pow(bounds.globalBL!.y - bounds.globalTL!.y, 2));
				const percentX = (rotatedClick.x) / dx;
				const percentY = (rotatedClick.y) / dy;
				const clickEventData =  JSON.parse(JSON.stringify(clickEventDataTemplate)) as typeof clickEventDataTemplate;
				clickEventData.requestData.event_data.x = percentX;
				clickEventData.requestData.event_data.y = percentY;
				clickEventData.requestData.event_data.rotation = rect.transform.globalRotation!;
				clickEventData.requestData.event_data.scale = rect.transform.globalScaleX!;
				clickEventData.requestData.event_data.scale = rect.transform.globalScaleY!;

				log.targets.push({obsSource:rect.source.sourceName || rect.sceneName, x:percentX, y:percentY});

				//If a distortion targets the current element, reroute events to its related browser source
				for (let j = 0; j < this.distortionList.length; j++) {
					const d = this.distortionList[j];
					//If distortion has already been triggered, avoid potential other triggers
					if(distortionRerouted[d.id] === true) {
						continue mainloop;
					}

					//Ignore disabled and trigger-only distortions
					if(!d.enabled || d.triggerOnly) {
						continue;
					}

					//Only check for group and source targets. Scene target are parsed before
					const name = d.obsItemPath.source.name || d.obsItemPath.groupName;

					//Is click on source ?
					if(rect.sceneName == name || rect.source.sourceName == name) {
						distortionRerouted[d.id] = true;
						const clickClone = JSON.parse(JSON.stringify(clickEventData)) as typeof clickEventData;
						clickClone.requestData.event_data.twitchatOverlayID = d.id;
						OBSWebsocket.instance.log("Reroute click from \""+rect.source.sourceName+"\" to overlay ID \""+d.id+"\"");
						OBSWebsocket.instance.socket.call("CallVendorRequest", clickClone);
						log.targets.push({distortiontID: d.id, x:percentX, y:percentY});
					}
				}

				//If it's a browser source throw an "heat-click" event on the page with
				//all necessary info about the click
				//If it's a spotify or ulule overlay execute any requested action
				if(rect.source.inputKind == "browser_source") {
					const settings = await OBSWebsocket.instance.getSourceSettings<{is_local_file:boolean, url:string, local_file:string}>(rect.source.sourceName);
					let url:string = settings.inputSettings.url as string;
					const isLocalFile = settings.inputSettings.is_local_file === true;
					if(isLocalFile) {
						url = settings.inputSettings.local_file as string || "";
					}

					let overlayID = "";
					if(!isLocalFile) {
						try {
							const parsedUrl = new URL(url);
							overlayID = parsedUrl.searchParams.get("twitchat_overlay_id") || "";
						}catch(error){}
					}

					const clickClone = JSON.parse(JSON.stringify(clickEventData)) as typeof clickEventData;
					clickClone.requestData.event_data.page = await Utils.sha256(url);
					clickClone.requestData.event_data.twitchatOverlayID = overlayID;
					//Send click info to browser source
					OBSWebsocket.instance.socket.call("CallVendorRequest", clickClone);

					//Spotify overlay
					if(url && url.indexOf(spotifyRoute) > -1
					&& StoreProxy.chat.botMessages.heatSpotify.enabled
					&& SpotifyHelper.instance.isPlaying) {
						//If anon users are not allowed, skip
						if(anonymous && StoreProxy.chat.botMessages.heatSpotify.allowAnon !== true) continue;

						const t = JSON.parse(JSON.stringify(trigger)) as typeof trigger;
						const a = JSON.parse(JSON.stringify(action)) as typeof action;
						t.id = "heat_spotify_click";//Don't make this a random value or cooldown will break as it's based on this ID !
						a.text = StoreProxy.chat.botMessages.heatSpotify.message;
						t.cooldown!.global = StoreProxy.chat.botMessages.heatSpotify.cooldown!;
						t.actions.push(a);

						TriggerActionHandler.instance.executeTrigger(t, message, event.testMode == true);
						log.targets.push({spotify: true, x:percentX, y:percentY});
					}
					if(url && url.indexOf(ululeRoute) > -1 && StoreProxy.chat.botMessages.heatUlule.enabled && ululeProject) {
						//If anon users are not allowed, skip
						if(anonymous && StoreProxy.chat.botMessages.heatUlule.allowAnon !== true) continue;

						const t = JSON.parse(JSON.stringify(trigger)) as typeof trigger;
						const a = JSON.parse(JSON.stringify(action)) as typeof action;
						t.id = "heat_ulule_click";//Don't make this a random value or cooldown will break as it's based on this ID !
						a.text = StoreProxy.chat.botMessages.heatUlule.message;
						t.cooldown!.global = StoreProxy.chat.botMessages.heatUlule.cooldown!;
						t.actions.push(a);

						TriggerActionHandler.instance.executeTrigger(t, message, event.testMode == true);
						log.targets.push({ulule: true, x:percentX, y:percentY});
					}
				}
			}

			/**
			 * Send all available OBS source rects to the browser sources.
			 * This is used by the heat overlay debug view:
			 * @see OverlayHeatDebug.vue
			 */
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
			Logger.instance.log("heat", log);
		},

		async deleteDistorsion(data:TwitchatDataTypes.HeatDistortionData):Promise<void> {
			for (let i = 0; i < this.distortionList.length; i++) {
				const d = this.distortionList[i];
				if(d.id == data.id) {
					this.distortionList.splice(i,1);
				}
			}

			let sourceName = "";
			if(data.obsItemPath.source.name) sourceName = data.obsItemPath.source.name;
			else if(data.obsItemPath.groupName) sourceName = data.obsItemPath.groupName;
			else if(data.obsItemPath.sceneName) sourceName = data.obsItemPath.sceneName;

			//Attempt to cleanup OBS from related filter and sources.
			//Won't work if user changed the filter's name or browser source's name
			//Won't work if user created filter and brower source manually instead of
			//the 1-click install button
			if(data.browserSourceName) {
				//The browser source is registered on the value object, remove it
				try {
					const res = await OBSWebsocket.instance.socket.call("GetSceneItemId", {sceneName:data.obsItemPath.sceneName, sourceName:data.browserSourceName})
					if(res.sceneItemId) {
						await OBSWebsocket.instance.socket.call("RemoveSceneItem", {sceneName:data.obsItemPath.sceneName, sceneItemId:res.sceneItemId});
					}
				}catch(error) {
					console.log("No source found on given scene for given ID", {sceneName:data.obsItemPath.sceneName, sourceName:data.browserSourceName});
				}
			}else{
				//The browser is unknown because user created the overlay manualy
				//Get the filter's params to extract the browser source name
				//TODO
				// const filters = await OBSWebsocket.instance.getSourceFilters(sourceName);
				// if(filters.length == 0) return;
				// const filter = filters.find(v=>v.filterKind == "shadertastic_filter");
				// console.log(filter);
				// await OBSWebsocket.instance.sea("RemoveSceneItem", {sceneName:data.obsItemPath.sceneName, sceneItemId:res.sceneItemId});
				// if(filter) {
				// 	const data = (filter.filterSettings as any).displacement_map_source.displacement_map;
				// 	OBSWebsocket.instance.socket.call("RemoveSourceFilter", {filterName:data.filterName, sourceName}).catch(()=>{
				// 		console.log("No filter found with given name on givent source", {filterName:data.filterName, sourceName});
				// 	});
				// }
			}

			if(data.filterName) {
				OBSWebsocket.instance.socket.call("RemoveSourceFilter", {filterName:data.filterName, sourceName}).catch(()=>{
					console.log("No filter found with given name on given source", {filterName:data.filterName, sourceName});
				});
			}
			this.saveDistorsions();
		},

		async saveDistorsions():Promise<void> {
			DataStore.set(DataStore.OVERLAY_DISTORTIONS, this.distortionList);

			for (let i = 0; i < this.distortionList.length; i++) {
				const data = {
					params:(this.distortionList[i] as unknown) as JsonObject,
				};
				PublicAPI.instance.broadcast(TwitchatEvent.DISTORT_OVERLAY_PARAMETERS, data);
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

if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeHeat, import.meta.hot))
}
