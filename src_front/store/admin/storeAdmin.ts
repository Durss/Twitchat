import { TwitchatDataTypes } from '@/types/TwitchatDataTypes'
import Config from '@/utils/Config'
import TwitchUtils from '@/utils/twitch/TwitchUtils'
import Utils from '@/utils/Utils'
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia'
import type { UnwrapRef } from 'vue'
import StoreProxy, { type IAdminActions, type IAdminGetters, type IAdminState } from '../StoreProxy'

export const storeAdmin = defineStore('Admin', {
	state: () => ({
	} as IAdminState),



	getters: {
	} as IAdminGetters
	& ThisType<UnwrapRef<IAdminState> & _StoreWithGetters<IAdminGetters> & PiniaCustomProperties>
	& _GettersTree<IAdminState>,



	actions: {
		async addBetaUser(login:string):Promise<void> {
			const users = await TwitchUtils.loadUserInfo(undefined, [login]);
			if(users.length ===0 ) {
				StoreProxy.main.alert("User "+login+" not found");
				return;
			}
			const headers = {
				'Authorization': 'Bearer '+StoreProxy.auth.twitch.access_token,
			};
			const res = await fetch(Config.instance.API_PATH+"/beta/user?uid="+users[0].id, {method:"POST", headers});
			try {
				if(res.status === 200 && (await res.json()).success) {
					const message:TwitchatDataTypes.MessageNoticeData = {
						date:Date.now(),
						id:Utils.getUUID(),
						noticeId:TwitchatDataTypes.TwitchatNoticeType.GENERIC,
						type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
						message:"User "+login+" added to beta-testers successfully",
						platform:"twitchat",
					};
					StoreProxy.chat.addMessage(message);
					return;
				}
			}catch(error){}
			const message:TwitchatDataTypes.MessageNoticeData = {
				date:Date.now(),
				id:Utils.getUUID(),
				noticeId:TwitchatDataTypes.TwitchatNoticeType.ERROR,
				type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
				message:"An error occured when adding "+login+" to beta-testers",
				platform:"twitchat",
			};
			StoreProxy.chat.addMessage(message);
		},
		
		async removeBetaUser(login:string):Promise<void> {
			const users = await TwitchUtils.loadUserInfo(undefined, [login]);
			if(users.length ===0 ) {
				StoreProxy.main.alert("User "+login+" not found");
				return;
			}
			const headers = {
				'Authorization': 'Bearer '+StoreProxy.auth.twitch.access_token,
			};
			const res = await fetch(Config.instance.API_PATH+"/beta/user?uid="+users[0].id, {method:"DELETE", headers});
			try {
				if(res.status === 200 && (await res.json()).success) {
					const message:TwitchatDataTypes.MessageNoticeData = {
						date:Date.now(),
						id:Utils.getUUID(),
						noticeId:TwitchatDataTypes.TwitchatNoticeType.GENERIC,
						type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
						message:"User "+login+" removed successfully from beta-testers",
						platform:"twitchat",
					};
					StoreProxy.chat.addMessage(message);
					return;
				}
			}catch(error){}
			const message:TwitchatDataTypes.MessageNoticeData = {
				date:Date.now(),
				id:Utils.getUUID(),
				noticeId:TwitchatDataTypes.TwitchatNoticeType.ERROR,
				type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
				message:"An error occured when removing "+login+" from beta-testers",
				platform:"twitchat",
			};
			StoreProxy.chat.addMessage(message);
		},
		
		async removeAllBetaUser():Promise<void> {
			const headers = {
				'Authorization': 'Bearer '+StoreProxy.auth.twitch.access_token,
			};
			const res = await fetch(Config.instance.API_PATH+"/beta/user/all", {method:"DELETE", headers});
			try {
				if(res.status === 200 && (await res.json()).success) {
					const message:TwitchatDataTypes.MessageNoticeData = {
						date:Date.now(),
						id:Utils.getUUID(),
						noticeId:TwitchatDataTypes.TwitchatNoticeType.GENERIC,
						type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
						message:"All beta-testers successfully removed",
						platform:"twitchat",
					};
					StoreProxy.chat.addMessage(message);
					return;
				}
			}catch(error){}
			const message:TwitchatDataTypes.MessageNoticeData = {
				date:Date.now(),
				id:Utils.getUUID(),
				noticeId:TwitchatDataTypes.TwitchatNoticeType.ERROR,
				type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
				message:"An error occured when removing all beta-testers",
				platform:"twitchat",
			};
			StoreProxy.chat.addMessage(message);
		},
		
		async migrateUserDataToProd(login:string):Promise<void> {
			const users = await TwitchUtils.loadUserInfo(undefined, [login]);
			if(users.length ===0 ) {
				StoreProxy.main.alert("User "+login+" not found");
				return;
			}
			const headers = {
				'Authorization': 'Bearer '+StoreProxy.auth.twitch.access_token,
			};
			const res = await fetch(Config.instance.API_PATH+"/beta/user/migrateToProduction?uid="+users[0].id, {method:"POST", headers});
			try {
				if(res.status === 200 && (await res.json()).success) {
					const message:TwitchatDataTypes.MessageNoticeData = {
						date:Date.now(),
						id:Utils.getUUID(),
						noticeId:TwitchatDataTypes.TwitchatNoticeType.GENERIC,
						type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
						message:login+" data migrated successfully from beta to production",
						platform:"twitchat",
					};
					StoreProxy.chat.addMessage(message);
					return;
				}
			}catch(error){}
			const message:TwitchatDataTypes.MessageNoticeData = {
				date:Date.now(),
				id:Utils.getUUID(),
				noticeId:TwitchatDataTypes.TwitchatNoticeType.ERROR,
				type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
				message:"An error occured when migrating "+login+" data from beta to production",
				platform:"twitchat",
			};
			StoreProxy.chat.addMessage(message);
		},
	} as IAdminActions
	& ThisType<IAdminActions
		& UnwrapRef<IAdminState>
		& _StoreWithState<"Admin", IAdminState, IAdminGetters, IAdminActions>
		& _StoreWithGetters<IAdminGetters>
		& PiniaCustomProperties
	>,
})