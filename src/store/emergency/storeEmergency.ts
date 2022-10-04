import DataStore from '@/store/DataStore';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { TwitchDataTypes } from '@/types/TwitchDataTypes';
import OBSWebsocket from '@/utils/OBSWebsocket';
import PublicAPI from '@/utils/PublicAPI';
import TriggerActionHandler from '@/utils/TriggerActionHandler';
import TwitchatEvent from '@/utils/TwitchatEvent';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
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
			autoBlockFollows:false,
			autoUnblockFollows:false,
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
			this.emergencyStarted = enable;
			const message:TwitchatDataTypes.EmergencyModeInfo = {
				type: "emergencyMode",
				enabled: enable,
			}
			TriggerActionHandler.instance.onMessage(message);
			StoreProxy.chat.addMessage({
				id:Utils.getUUID(),
				type:"notice",
				date:Date.now(),
				platform:"twitchat",
				message:"Emergency mode <mark>"+(enable?'enabled':'disabled')+"</mark>",
				noticeId:TwitchatDataTypes.TwitchatNoticeType.EMERGENCY_MODE,
			})

			if(enable) {
				//ENABLE EMERGENCY MODE
				let roomSettings:TwitchDataTypes.RoomSettingsUpdate = {};
				if(this.params.slowMode) roomSettings.slowMode = this.params.slowModeDuration;
				if(this.params.emotesOnly) roomSettings.emotesOnly = true;
				if(this.params.subOnly) roomSettings.subOnly = true;
				if(this.params.followOnly) roomSettings.followOnly = this.params.followOnlyDuration;
				if(Object.keys(roomSettings).length > 0) {
					TwitchUtils.setRoomSettings(roomSettings);
				}
				if(this.params.toUsers) {
					const usersNames = this.params.toUsers.split(/[^a-zA-ZÀ-ÖØ-öø-ÿ0-9_]+/gi);
					const users = await TwitchUtils.loadUserInfo(undefined, usersNames);
					for (let i = 0; i < users.length; i++) {
						TwitchUtils.banUser(users[i].id, 600, "Timed out because the emergency mode has been triggers on Twitchat");
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
					TwitchUtils.setRoomSettings(roomSettings);
				}
				if(this.params.toUsers) {
					const usersNames = this.params.toUsers.split(/[^a-zA-ZÀ-ÖØ-öø-ÿ0-9_]+/gi);
					const users = await TwitchUtils.loadUserInfo(undefined, usersNames);
					for (let i = 0; i < users.length; i++) {
						TwitchUtils.unbanUser(users[i].id);
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
			if(Utils.checkPermissions(this.params.chatCmdPerms, message.user)) {
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