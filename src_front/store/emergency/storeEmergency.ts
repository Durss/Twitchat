import TwitchatEvent from '@/events/TwitchatEvent';
import DataStore from '@/store/DataStore';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import OBSWebsocket from '@/utils/OBSWebsocket';
import PublicAPI from '@/utils/PublicAPI';
import TriggerActionHandler from '@/utils/triggers/TriggerActionHandler';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import type { IEmergencyActions, IEmergencyGetters, IEmergencyState } from '../StoreProxy';
import StoreProxy from '../StoreProxy';
import type {JsonObject} from 'type-fest';

const userToPrevModState:{[key:string]:{[key:string]:boolean}} = {}

//TODO make this platform agnostic
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
			toUsers:[],
			obsScene:"",
			obsSources:[],
			chatCmd:"",
			chatCmdPerms:Utils.getDefaultPermissions(true, true, false, false, false, false),
			autoEnableOnShieldmode:true,
			autoEnableOnFollowbot:true,
			enableShieldMode:false,
		},

		//Stores all the people that followed during an emergency
		follows: [],

	} as IEmergencyState),



	getters: {
	} as IEmergencyGetters
	& ThisType<UnwrapRef<IEmergencyState> & _StoreWithGetters<IEmergencyGetters> & PiniaCustomProperties>
	& _GettersTree<IEmergencyState>,



	actions: {
		populateData() {
			//Init emergency actions
			const emergency = DataStore.get(DataStore.EMERGENCY_PARAMS);
			if(emergency) {
				Utils.mergeRemoteObject(JSON.parse(emergency), (this.params as unknown) as JsonObject);
				// sEmergency.params = JSON.parse(emergency);
			}

			//Init emergency followers
			const emergencyFollows = DataStore.get(DataStore.EMERGENCY_FOLLOWERS);
			if(emergencyFollows) {
				this.reloadFollowbotList(JSON.parse(emergencyFollows));
			}

		},

		setEmergencyParams(params:TwitchatDataTypes.EmergencyParamsData) {
			this.params = params;
			DataStore.set(DataStore.EMERGENCY_PARAMS, params);
		},

		async setEmergencyMode(enable:boolean):Promise<void> {
			if(this.emergencyStarted == enable) return;//Ignore useless change
			const channelId = StoreProxy.auth.twitch.user.id;
			this.emergencyStarted = enable;
			let str = StoreProxy.i18n.t("emergency.disabled");
			if(enable) str = StoreProxy.i18n.t("emergency.enabled");
			const message:TwitchatDataTypes.MessageEmergencyModeInfo = {
				id:Utils.getUUID(),
				date:Date.now(),
				platform:"twitchat",
				type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
				message:str,
				noticeId:TwitchatDataTypes.TwitchatNoticeType.EMERGENCY_MODE,
				enabled: enable,
				channel_id:StoreProxy.auth.twitch.user.id,
			};
			StoreProxy.chat.addMessage(message);

			if(enable) {
				//ENABLE EMERGENCY MODE
				if(this.params.enableShieldMode) {
					TwitchUtils.setShieldMode(channelId, true);
				}else{
					const roomSettings:TwitchatDataTypes.IRoomSettings = {};
					if(this.params.slowMode) roomSettings.slowMode = this.params.slowModeDuration;
					if(this.params.emotesOnly) roomSettings.emotesOnly = true;
					if(this.params.subOnly) roomSettings.subOnly = true;
					if(this.params.followOnly) roomSettings.followOnly = this.params.followOnlyDuration;
					if(Object.keys(roomSettings).length > 0) {
						TwitchUtils.setRoomSettings(StoreProxy.auth.twitch.user.id, roomSettings);
					}
				}
				if(this.params.toUsers) {
					if(!userToPrevModState[channelId]) {
						userToPrevModState[channelId] = {};
					}
					const usersNames = this.params.toUsers;
					for (let i = 0; i < usersNames.length; i++) {
						StoreProxy.users.getUserFrom("twitch", channelId, undefined, usersNames[i], undefined, (u)=> {
							userToPrevModState[channelId][u.id] = u.channelInfo[channelId].is_moderator === true;
							TwitchUtils.banUser(u, channelId, 30 * 60, "Timed out because the emergency mode has been triggered on Twitchat");
						}, undefined, undefined, undefined, false);
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
			}else {
				//DISABLE EMERGENCY MODE
				//Unset all changes
				if(this.params.enableShieldMode) {
					TwitchUtils.setShieldMode(channelId, false);
				}else{
					const roomSettings:TwitchatDataTypes.IRoomSettings = {};
					if(this.params.slowMode) roomSettings.slowMode = 0;
					if(this.params.emotesOnly) roomSettings.emotesOnly = false;
					if(this.params.subOnly) roomSettings.subOnly = false;
					if(this.params.followOnly) roomSettings.followOnly = false;
					if(Object.keys(roomSettings).length > 0) {
						TwitchUtils.setRoomSettings(StoreProxy.auth.twitch.user.id, roomSettings);
					}
				}
				if(this.params.toUsers) {
					const usersNames = this.params.toUsers;
					for (let i = 0; i < usersNames.length; i++) {
						await StoreProxy.users.getUserFrom("twitch", channelId, undefined, usersNames[i], undefined, async (u)=> {
							await TwitchUtils.unbanUser(u, channelId);
							//Reset mod role if user was a mod before
							if(userToPrevModState[channelId][u.id] === true) {
								delete userToPrevModState[channelId];
								TwitchUtils.addRemoveModerator(false, channelId, u);
							}
						}, undefined, undefined, undefined, false);
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

		ignoreEmergencyFollower(payload:TwitchatDataTypes.MessageFollowingData) {
			const index = this.follows.findIndex(v=>v.id == payload.id);
			if(index > -1) {
				this.follows.splice(index, 1);
			}
			this.saveFollowbotList();
		},

		addEmergencyFollower(payload:TwitchatDataTypes.MessageFollowingData) {
			payload.followbot = true;
			this.follows.push(payload);
			this.saveFollowbotList();
		},

		clearEmergencyFollows() {
			this.follows.splice(0);
			this.saveFollowbotList();
		},

		async handleChatCommand(message:TwitchatDataTypes.TranslatableMessage, cmd?:string):Promise<void> {
			if(!this.params.enabled) return;
			if(!cmd) cmd = (message.message || "").trim().split(" ")[0].toLowerCase();
			if(cmd?.length < 2) return;

			//check if its a command to start the emergency mode
			if(await Utils.checkPermissions(this.params.chatCmdPerms, message.user, message.channel_id)) {
				if(cmd === this.params.chatCmd.trim()) {
					this.setEmergencyMode(true);
				}
			}
		},

		reloadFollowbotList(json:any) {
			//Convert imported data to proper data format used for display on the popin
			this.follows = json
			//This is just a security in case user have old data format saved to ignore them from parsing
			//and avoid exceptions
			.filter((entry:TwitchatDataTypes.EmergencyFollowEntryData) => {
				return entry.uid !== undefined && entry.login !== undefined;
			})
			.map((entry:TwitchatDataTypes.EmergencyFollowEntryData):TwitchatDataTypes.MessageFollowingData => {
				const date = entry.date || Date.now();
				const channel_id = entry.channelId || StoreProxy.auth.twitch.user.id;
				const platform = entry.platform || "twitch";
				return {
					id:Utils.getUUID(),
					date,
					channel_id,
					platform,
					followed_at:date,
					type:TwitchatDataTypes.TwitchatMessageType.FOLLOWING,
					user:StoreProxy.users.getUserFrom(platform, channel_id, entry.uid, entry.login, entry.login, undefined, true, false, undefined, false),
					followbot:true,
				}
			});
		},

		saveFollowbotList() {
			const saved:TwitchatDataTypes.EmergencyFollowEntryData[] = this.follows.map(entry => {
				return {
					platform:entry.platform,
					channelId:entry.channel_id,
					uid:entry.user.id,
					login:entry.user.login,
					date:entry.date,
				}
			});
			DataStore.set(DataStore.EMERGENCY_FOLLOWERS, saved);
		}
	} as IEmergencyActions
	& ThisType<IEmergencyActions
		& UnwrapRef<IEmergencyState>
		& _StoreWithState<"emergency", IEmergencyState, IEmergencyGetters, IEmergencyActions>
		& _StoreWithGetters<IEmergencyGetters>
		& PiniaCustomProperties
	>,
})

if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeEmergency, import.meta.hot))
}
