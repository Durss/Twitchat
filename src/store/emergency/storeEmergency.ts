import DataStore from '@/store/DataStore';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import IRCClient from '@/utils/IRCClient';
import OBSWebsocket from '@/utils/OBSWebsocket';
import PublicAPI from '@/utils/PublicAPI';
import TriggerActionHandler from '@/utils/TriggerActionHandler';
import TwitchatEvent from '@/utils/TwitchatEvent';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import type { IEmergencyActions, IEmergencyGetters, IEmergencyState } from '../StoreProxy';

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

		setEmergencyMode(enable:boolean) {
			let channel = IRCClient.instance.channel;
			this.emergencyStarted = enable;
			const message:TwitchatDataTypes.EmergencyModeInfo = {
				type: "emergencyMode",
				enabled: enable,
			}
			TriggerActionHandler.instance.onMessage(message);
			IRCClient.instance.sendNotice("emergencyMode", "Emergency mode <mark>"+(enable?'enabled':'disabled')+"</mark>");

			if(enable) {
				//ENABLE EMERGENCY MODE
				if(this.params.slowMode) IRCClient.instance.client.slow(channel, 10);
				if(this.params.emotesOnly) IRCClient.instance.client.emoteonly(channel);
				if(this.params.subOnly) IRCClient.instance.client.subscribers(channel);
				if(this.params.followOnly) IRCClient.instance.client.followersonly(channel, this.params.followOnlyDuration);
				if(this.params.toUsers) {
					const users = this.params.toUsers.split(/[^a-zA-ZÀ-ÖØ-öø-ÿ0-9_]+/gi);
					for (let i = 0; i < users.length; i++) {
						const u = users[i];
						if(u.length > 2) {
							IRCClient.instance.client.timeout(channel, u, 600);
						}
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
				if(this.params.slowMode) IRCClient.instance.client.slowoff(channel);
				if(this.params.emotesOnly) IRCClient.instance.client.emoteonlyoff(channel);
				if(this.params.subOnly) IRCClient.instance.client.subscribersoff(channel);
				if(this.params.followOnly) IRCClient.instance.client.followersonlyoff(channel);
				if(this.params.toUsers) {
					const users = this.params.toUsers.split(/[^a-zA-ZÀ-ÖØ-öø-ÿ0-9_]+/gi);
					for (let i = 0; i < users.length; i++) {
						const u = users[i];
						if(u.length > 2) {
							IRCClient.instance.client.unban(channel, u);
						}
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

		async addEmergencyFollower(payload:TwitchatDataTypes.EmergencyFollowerData) {
			this.follows.push(payload);
			DataStore.set(DataStore.EMERGENCY_FOLLOWERS, this.follows);
		},

		async clearEmergencyFollows() {
			this.follows.splice(0)
			DataStore.set(DataStore.EMERGENCY_FOLLOWERS, this.follows);
		},
	} as IEmergencyActions
	& ThisType<IEmergencyActions
		& UnwrapRef<IEmergencyState>
		& _StoreWithState<"emergency", IEmergencyState, IEmergencyGetters, IEmergencyActions>
		& _StoreWithGetters<IEmergencyGetters>
		& PiniaCustomProperties
	>,
})