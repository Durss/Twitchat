import DataStore from '@/store/DataStore';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import OBSWebsocket from '@/utils/OBSWebsocket';
import PublicAPI from '@/utils/PublicAPI';
import TriggerActionHandler from '@/utils/TriggerActionHandler';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import TwitchatEvent from '@/utils/TwitchatEvent';
import Utils from '@/utils/Utils';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import type { IEmergencyActions, IEmergencyGetters, IEmergencyState } from '../StoreProxy';
import StoreProxy from '../StoreProxy';

//TODO makes this platform agnostic
export const storeEmergency = defineStore('emergency', {
	state: () => ({
		emergencyStarted:false,

		params: {
			enabled:false,
			emotesOnly:false,
			subOnly:false,
			followOnly:true,
			noTriggers:false,
			slowMode:false,
			followOnlyDuration:60,
			slowModeDuration:10,
			toUsers:"",
			obsScene:"",
			obsSources:[],
			chatCmd:"",
			chatCmdPerms:{
				broadcaster:true,
				mods:true,
				vips:false,
				subs:false,
				all:false,
				users:""
			},
			autoEnableOnFollowbot:true,
		},

		//Stores all the people that followed during an emergency
		follows: [],

	} as IEmergencyState),



	getters: {
	} as IEmergencyGetters
	& ThisType<UnwrapRef<IEmergencyState> & _StoreWithGetters<IEmergencyGetters> & PiniaCustomProperties>
	& _GettersTree<IEmergencyState>,



	actions: {
		setEmergencyParams(params:TwitchatDataTypes.EmergencyParamsData) {
			this.params = params;
			DataStore.set(DataStore.EMERGENCY_PARAMS, params);
		},

		async setEmergencyMode(enable:boolean):Promise<void> {
			const channelId = StoreProxy.auth.twitch.user.id;
			this.emergencyStarted = enable;
			const message:TwitchatDataTypes.MessageEmergencyModeInfo = {
				id:Utils.getUUID(),
				date:Date.now(),
				platform:"twitchat",
				type: "notice",
				message:"Emergency "+(enable? "enabled" : "disabled"),
				noticeId:TwitchatDataTypes.TwitchatNoticeType.EMERGENCY_MODE,
				enabled: enable,
			};
			TriggerActionHandler.instance.onMessage(message);
			StoreProxy.chat.addMessage(message);

			if(enable) {
				//ENABLE EMERGENCY MODE
				let roomSettings:TwitchDataTypes.RoomSettingsUpdate = {};
				if(this.params.slowMode) roomSettings.slowMode = this.params.slowModeDuration;
				if(this.params.emotesOnly) roomSettings.emotesOnly = true;
				if(this.params.subOnly) roomSettings.subOnly = true;
				if(this.params.followOnly) roomSettings.followOnly = this.params.followOnlyDuration;
				if(Object.keys(roomSettings).length > 0) {
					TwitchUtils.setRoomSettings(StoreProxy.auth.twitch.user.id, roomSettings);
				}
				if(this.params.toUsers) {
					const usersNames = this.params.toUsers.split(/[^a-zA-ZÀ-ÖØ-öø-ÿ0-9_]+/gi);
					//TODO make sure it still works
					for (let i = 0; i < usersNames.length; i++) {
						StoreProxy.users.getUserFrom("twitch", channelId, undefined, usersNames[i], undefined, (u)=> {
							TwitchUtils.banUser(u, channelId, 600, "Timed out because the emergency mode has been triggers on Twitchat");
						});
					}
				}
				if(this.params.noTriggers) TriggerActionHandler.instance.emergencyMode = true;
				if(this.params.obsScene) OBSWebsocket.instance.setCurrentScene(this.params.obsScene);
				if(this.params.obsSources) {
					for (let i = 0; i < this.params.obsSources.length; i++) {
						const s = this.params.obsSources[i];
						OBSWebsocket.instance.setSourceState(s, false);
					}
				}
			}else{
				//DISABLE EMERGENCY MODE
				//Unset all changes
				let roomSettings:TwitchDataTypes.RoomSettingsUpdate = {};
				if(this.params.slowMode) roomSettings.slowMode = 0;
				if(this.params.emotesOnly) roomSettings.emotesOnly = false;
				if(this.params.subOnly) roomSettings.subOnly = false;
				if(this.params.followOnly) roomSettings.followOnly = false;
				if(Object.keys(roomSettings).length > 0) {
					TwitchUtils.setRoomSettings(StoreProxy.auth.twitch.user.id, roomSettings);
				}
				if(this.params.toUsers) {
					const usersNames = this.params.toUsers.split(/[^a-zA-ZÀ-ÖØ-öø-ÿ0-9_]+/gi);
					//TODO make sure it still works
					for (let i = 0; i < usersNames.length; i++) {
						StoreProxy.users.getUserFrom("twitch", channelId, undefined, usersNames[i], undefined, (u)=> {
							TwitchUtils.unbanUser(u, channelId);
						});
					}
				}
				if(this.params.obsSources) {
					for (let i = 0; i < this.params.obsSources.length; i++) {
						const s = this.params.obsSources[i];
						OBSWebsocket.instance.setSourceState(s, true);
					}
				}
				TriggerActionHandler.instance.emergencyMode = false;
			}

			//Broadcast to any connected peers
			PublicAPI.instance.broadcast(TwitchatEvent.EMERGENCY_MODE, {enabled:enable});
		},

		addEmergencyFollower(payload:TwitchatDataTypes.MessageFollowingData) {
			this.follows.push(payload);
			DataStore.set(DataStore.EMERGENCY_FOLLOWERS, this.follows);
		},

		clearEmergencyFollows() {
			this.follows.splice(0);
			DataStore.set(DataStore.EMERGENCY_FOLLOWERS, this.follows);
		},

		handleChatCommand(message:TwitchatDataTypes.MessageChatData, cmd?:string) {
			if(!this.params.enabled) return;
			if(!cmd) cmd = message.message.trim().split(" ")[0].toLowerCase();
			if(cmd?.length < 2) return;

			//check if its a command to start the emergency mode
			if(Utils.checkPermissions(this.params.chatCmdPerms, message.user, message.channel_id)) {
				if(cmd === this.params.chatCmd.trim()) {
					this.setEmergencyMode(true);
				}
			}
		},
	} as IEmergencyActions
	& ThisType<IEmergencyActions
		& UnwrapRef<IEmergencyState>
		& _StoreWithState<"emergency", IEmergencyState, IEmergencyGetters, IEmergencyActions>
		& _StoreWithGetters<IEmergencyGetters>
		& PiniaCustomProperties
	>,
})