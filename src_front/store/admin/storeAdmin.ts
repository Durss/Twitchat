import { TwitchatDataTypes } from '@/types/TwitchatDataTypes'
import ApiHelper from '@/utils/ApiHelper'
import Utils from '@/utils/Utils'
import TwitchUtils from '@/utils/twitch/TwitchUtils'
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia'
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
			const users = await TwitchUtils.getUserInfo(undefined, [login]);
			if(users.length ===0 ) {
				StoreProxy.common.alert("User "+login+" not found");
				return;
			}
			const res = await ApiHelper.call("admin/beta/user", "POST", {uid:users[0]!.id});
			try {
				if(res.status === 200 && res.json.success) {
					const message:TwitchatDataTypes.MessageNoticeData = {
						date:Date.now(),
						id:Utils.getUUID(),
						noticeId:TwitchatDataTypes.TwitchatNoticeType.GENERIC,
						type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
						message:"User "+login+" added to beta-testers successfully",
						platform:"twitchat",
						channel_id:StoreProxy.auth.twitch.user.id,
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
				channel_id:StoreProxy.auth.twitch.user.id,
			};
			StoreProxy.chat.addMessage(message);
		},
		
		async removeBetaUser(login:string):Promise<void> {
			const users = await TwitchUtils.getUserInfo(undefined, [login]);
			if(users.length ===0 ) {
				StoreProxy.common.alert("User "+login+" not found");
				return;
			}
			const res = await ApiHelper.call("admin/beta/user", "DELETE", {uid:users[0]!.id});
			try {
				if(res.status === 200 && res.json.success) {
					const message:TwitchatDataTypes.MessageNoticeData = {
						date:Date.now(),
						id:Utils.getUUID(),
						noticeId:TwitchatDataTypes.TwitchatNoticeType.GENERIC,
						type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
						message:"User "+login+" removed successfully from beta-testers",
						platform:"twitchat",
						channel_id:StoreProxy.auth.twitch.user.id,
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
						channel_id:StoreProxy.auth.twitch.user.id,
			};
			StoreProxy.chat.addMessage(message);
		},
		
		async removeAllBetaUser():Promise<void> {
			const res = await ApiHelper.call("admin/beta/user/all", "DELETE");
			try {
				if(res.status === 200 && res.json.success) {
					const message:TwitchatDataTypes.MessageNoticeData = {
						date:Date.now(),
						id:Utils.getUUID(),
						noticeId:TwitchatDataTypes.TwitchatNoticeType.GENERIC,
						type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
						message:"All beta-testers successfully removed",
						platform:"twitchat",
						channel_id:StoreProxy.auth.twitch.user.id,
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
					channel_id:StoreProxy.auth.twitch.user.id,
			};
			StoreProxy.chat.addMessage(message);
		},
		
		async migrateUserDataToProd(login:string):Promise<void> {
			const users = await TwitchUtils.getUserInfo(undefined, [login]);
			if(users.length ===0 ) {
				StoreProxy.common.alert("User "+login+" not found");
				return;
			}
			const res = await ApiHelper.call("admin/beta/user/migrateToProduction", "POST", {uid:users[0]!.id});
			try {
				if(res.status === 200 && res.json.success) {
					const message:TwitchatDataTypes.MessageNoticeData = {
						date:Date.now(),
						id:Utils.getUUID(),
						noticeId:TwitchatDataTypes.TwitchatNoticeType.GENERIC,
						type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
						message:login+" data migrated successfully from beta to production",
						platform:"twitchat",
						channel_id:StoreProxy.auth.twitch.user.id,
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
					channel_id:StoreProxy.auth.twitch.user.id,
			};
			StoreProxy.chat.addMessage(message);
		},
		
		async giftPremium(login:string):Promise<void> {
			const users = await TwitchUtils.getUserInfo(undefined, [login]);
			if(users.length ===0 ) {
				StoreProxy.common.alert("User "+login+" not found");
				return;
			}
			const res = await ApiHelper.call("admin/premium", "POST", {uid:users[0]!.id});
			try {
				if(res.status === 200 && res.json.success) {
					const message:TwitchatDataTypes.MessageNoticeData = {
						date:Date.now(),
						id:Utils.getUUID(),
						noticeId:TwitchatDataTypes.TwitchatNoticeType.GENERIC,
						type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
						message:login+" has been offered premium membership",
						platform:"twitchat",
						channel_id:StoreProxy.auth.twitch.user.id,
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
				message:"An error occured when offering premium membership to "+login,
				platform:"twitchat",
					channel_id:StoreProxy.auth.twitch.user.id,
			};
			StoreProxy.chat.addMessage(message);
		},
		
		async ungiftPremium(login:string):Promise<void> {
			const users = await TwitchUtils.getUserInfo(undefined, [login]);
			if(users.length ===0 ) {
				StoreProxy.common.alert("User "+login+" not found");
				return;
			}
			const res = await ApiHelper.call("admin/premium", "DELETE", {uid:users[0]!.id});
			try {
				if(res.status === 200 && res.json.success) {
					const message:TwitchatDataTypes.MessageNoticeData = {
						date:Date.now(),
						id:Utils.getUUID(),
						noticeId:TwitchatDataTypes.TwitchatNoticeType.GENERIC,
						type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
						message:login+" has been removed from gifted premium membership",
						platform:"twitchat",
						channel_id:StoreProxy.auth.twitch.user.id,
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
				message:"An error occured when removing gifted premium membership from "+login,
				platform:"twitchat",
					channel_id:StoreProxy.auth.twitch.user.id,
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

if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeAdmin, import.meta.hot))
}