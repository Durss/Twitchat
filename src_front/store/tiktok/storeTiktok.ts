import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import DataStore from '../DataStore';
import type { ITiktokActions, ITiktokGetters, ITiktokState } from '../StoreProxy';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import StoreProxy from '../StoreProxy';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';

let autoreconnect:boolean = false;
let initResolver!:(value: boolean) => void;
let socket!:WebSocket;
let reconnectTimeout:number = -1;
let debouncedLikes:{[uid:string]:{count:number, to:number}} = {};
let processedEvents:{[id:string]:true} = {};

export const storeTiktok = defineStore('tiktok', {
	state: () => ({
		connected:false,
		ip:"127.0.0.1",
		port:21213,
	} as ITiktokState),



	getters: {

	} as ITiktokGetters
	& ThisType<UnwrapRef<ITiktokState> & _StoreWithGetters<ITiktokGetters> & PiniaCustomProperties>
	& _GettersTree<ITiktokState>,



	actions: {
		async populateData():Promise<void> {
			const json = DataStore.get(DataStore.TIKTOK_CONFIGS);
			if(json) {
				const data = JSON.parse(json) as IStoreData;
				this.ip = data.ip || "127.0.0.1";
				this.port = data.port ||21213;
				autoreconnect = true;
				this.connect();
			}
		},

		async connect():Promise<boolean> {
			if(this.connected) return Promise.resolve(true);
			clearTimeout(reconnectTimeout);
			return new Promise<boolean>((resolve, reject) => {
				initResolver = resolve;
				socket = new WebSocket(`ws://${this.ip}:${this.port}/`);

				socket.onopen = () => {
					// console.log('🎤 TikTok connection succeed');
					this.connected = true;
					initResolver(true);
					this.saveConfigs();
				};

				socket.onmessage = (event:any) => this.onEvent(event);

				socket.onclose = (e) => {
					if(autoreconnect) {
						// console.log('🎤 TikTok connection lost');
						try {
							reconnectTimeout = window.setTimeout(()=> {
								this.connect();
							}, 10000)
						}catch(error) {
							console.log(error);
							reject("[Tiktok] Reconnection failed");
						}
					}
					this.connected = false;
					initResolver(false);
				}

				socket.onerror = (e) => {
					this.connected = false;
					initResolver(false);
					reject("[Tiktok] Socket error");
				}
			});
		},

		disconnect():void {
			clearTimeout(reconnectTimeout);
			autoreconnect = false;
			this.ip = "127.0.0.1";
			this.port = 21213;;
			if(socket && socket.readyState === socket.OPEN) {
				socket.close();
			}
			DataStore.remove(DataStore.TIKTOK_CONFIGS)
		},

		onEvent(event:MessageEvent):void {
			let json:TikTokMessage
			| TikTokGift
			| TikTokLike
			| TikTokMemberJoin
			| TikTokRoomStats
			| TikTokShare
			| TikTokSub
			| TikTokFollower = JSON.parse(event.data || ""); // Parse the JSON data
			let user:TwitchatDataTypes.TwitchatUser|null = null;

			//join event with actionId=1 are empty objects, ignore them
			//Particularly, there's an actionId=26 that regularly comes up
			if(json.event == "member" && json.data.actionId != 1) return;

			if(json.event == "chat"
			|| json.event == "follow"
			|| json.event == "gift"
			|| json.event == "like"
			|| json.event == "share"
			|| json.event == "member"
			|| json.event == "subscribe"
			) {

				//Message already processed, ignore it
				if(processedEvents[json.data.msgId] === true) return;
				processedEvents[json.data.msgId] = true;

				try {
					user = StoreProxy.users.getUserFrom("tiktok", json.data.tikfinityUserId.toString(), json.data.userId, json.data.uniqueId, json.data.nickname, undefined, json.data.followInfo?.followStatus === 1, false, json.data.isSubscriber, false);
					user.avatarPath = json.data.profilePictureUrl || (json.data.userDetails.profilePictureUrls? json.data.userDetails.profilePictureUrls[ json.data.userDetails.profilePictureUrls.length-1 ] : "");
					if(json.data.userBadges?.length > 0) {
						user.channelInfo[json.data.tikfinityUserId.toString()].badges = json.data.userBadges
						.filter(b=>b.url != undefined)
						.map(b => {
							return {
								id:"subscriber",
								icon:{ sd:b.url! },
								title:b.name || "",
							}
						})
						if(json.data.userBadges.find(b=>b.type == "pm_mt_moderator_im")) {
							user.channelInfo[json.data.tikfinityUserId.toString()].badges.push({
								icon:{sd:"mod"},
								id:"moderator",
							});
						}
					}
				}catch(error) {
					console.log(error);
					console.log(json);
				}
			}
			switch(json.event) {
				case "chat": {
					let messageStr = json.data.comment || "";
					//TODO find a way to use TwitchUtils.parseMessageToChunks() so links and mentions are also parsed
					//But so far it's super tricky as the way tiktok emotes work isn't compatible with how the method
					//parses emotes.
					//But it might also make sense to just parse the message then push the emotes at the end, so far
					//I haven't observed a message with emotes in the middle of a message
					//Example message, the result should be:
					// 🖼️‼️🖼️‼️🖼️‼️🖼️‼️
					/*
{
	"emotes": [
		{
		"emoteId": "7349208530156604202",
		"emoteImageUrl": "https://p16-webcast.tiktokcdn-us.com/webcast-oci-tx/sub_7cb85750f4599563d6bc0662b4e8215017a767c7f409ca8588a546e29442d3da~tplv-eppxg646nu-webp.webp",
		"placeInComment": 0
		},
		{
		"emoteId": "7349208530156604202",
		"emoteImageUrl": "https://p19-webcast.tiktokcdn-us.com/webcast-oci-tx/sub_7cb85750f4599563d6bc0662b4e8215017a767c7f409ca8588a546e29442d3da~tplv-eppxg646nu-webp.webp",
		"placeInComment": 2
		},
		{
		"emoteId": "7349208530156604202",
		"emoteImageUrl": "https://p19-webcast.tiktokcdn-us.com/webcast-oci-tx/sub_7cb85750f4599563d6bc0662b4e8215017a767c7f409ca8588a546e29442d3da~tplv-eppxg646nu-webp.webp",
		"placeInComment": 4
		},
		{
		"emoteId": "7349208530156604202",
		"emoteImageUrl": "https://p19-webcast.tiktokcdn-us.com/webcast-oci-tx/sub_7cb85750f4599563d6bc0662b4e8215017a767c7f409ca8588a546e29442d3da~tplv-eppxg646nu-webp.webp",
		"placeInComment": 6
		}
	],
	"comment": "‼️‼️‼️‼️"
}
*/
					let messageChunks:TwitchatDataTypes.ParseMessageChunk[] = [];//TwitchUtils.parseMessageToChunks(messageStr, [], false, "tiktok", true);

					// const parsedEmotes = TwitchUtils.parsedEmoteDataToRawEmoteData(json.data.emotes.map(e=>{
					// 	return {
					// 		emote_id:e.emoteId,
					// 		end:e.placeInComment,
					// 		start:e.placeInComment,
					// 	}
					// }));
					if(json.data.emotes) {
						let currentIndex = 0;
						json.data.emotes.sort((a, b) => a.placeInComment - b.placeInComment)
						.forEach((emote) => {
							const emoteIndex = emote.placeInComment;
							// Add the text before the emote if there's any
							if (emoteIndex > currentIndex) {
								let value = messageStr.slice(currentIndex, emoteIndex);
								if(value.length > 0) {
									messageChunks.push({
										type: 'text',
										value,
									});
								}
							}

							// Add the emote chunk
							messageChunks.push({
								type: "emote",
								value: "",
								emote: emote.emoteImageUrl,
								emoteHD: emote.emoteImageUrl,
							});

							// Update the current index to the position after the emote
							currentIndex = emoteIndex;
						});

						// Add the remaining text after the last emote
						if (currentIndex < messageStr.length) {
							messageChunks.push({
								type: 'text',
								value: messageStr.slice(currentIndex),
							});
						}
					}
					const message:TwitchatDataTypes.MessageChatData = {
						id:json.data.msgId,
						date:Date.now(),
						platform:"tiktok",
						channel_id:json.data.tikfinityUserId.toString(),
						user:user!,
						answers:[],
						is_short:false,
						message:messageStr,
						message_chunks:messageChunks,
						message_html:TwitchUtils.messageChunksToHTML(messageChunks),
						message_size:TwitchUtils.computeMessageSize(messageChunks),
						type:TwitchatDataTypes.TwitchatMessageType.MESSAGE,
						raw_data:json.data,
					}
					StoreProxy.chat.addMessage(message);
					return;
				}

				case "gift": {
					// Streak ended or non-streakable gift => process the gift with final repeat_count
					if (json.data.giftType !== 1 || json.data.repeatEnd) {
						const message:TwitchatDataTypes.MessageTikTokGiftData = {
							id:json.data.msgId,
							date:Date.now(),
							platform:"tiktok",
							channel_id:json.data.tikfinityUserId.toString(),
							user:user!,
							type:TwitchatDataTypes.TwitchatMessageType.TIKTOK_GIFT,
							count:json.data.repeatCount,
							image:json.data.giftPictureUrl,
							diamonds:json.data.diamondCount * json.data.repeatCount,
							giftId:json.data.giftId.toString(),
							giftName:json.data.giftName,
							raw_data:json.data,
						}
						StoreProxy.chat.addMessage(message);
					}
					return;
				}

				case "subscribe": {
					const message:TwitchatDataTypes.MessageTikTokSubData = {
						id:json.data.msgId,
						date:Date.now(),
						platform:"tiktok",
						channel_id:json.data.tikfinityUserId.toString(),
						user:user!,
						type:TwitchatDataTypes.TwitchatMessageType.TIKTOK_SUB,
						months:json.data.subMonth || 1,
					}
					StoreProxy.chat.addMessage(message);
					return;
				}

				case "follow": {
					const message:TwitchatDataTypes.MessageFollowingData = {
						channel_id:json.data.tikfinityUserId.toString(),
						platform:"tiktok",
						id:Utils.getUUID(),
						date:Date.now(),
						followed_at:Date.now(),
						type:TwitchatDataTypes.TwitchatMessageType.FOLLOWING,
						user:user!,
					};
					StoreProxy.chat.addMessage(message);
					return;
				}

				case "like": {
					if(debouncedLikes[user!.id]) {
						clearTimeout(debouncedLikes[user!.id].to);
					}else{
						debouncedLikes[user!.id] = {count:0, to:-1}
					}
					const to = window.setTimeout(()=> {
						const message:TwitchatDataTypes.MessageTikTokLikeData = {
							channel_id:json.data.tikfinityUserId.toString(),
							platform:"tiktok",
							id:Utils.getUUID(),
							date:Date.now(),
							type:TwitchatDataTypes.TwitchatMessageType.TIKTOK_LIKE,
							user:user!,
							count:debouncedLikes[user!.id].count,
							streamLikeCount:json.data.totalLikeCount,
						};
						StoreProxy.chat.addMessage(message);
						delete debouncedLikes[user!.id];
					}, 5000);
					debouncedLikes[user!.id].count += json.data.likeCount;
					debouncedLikes[user!.id].to = to;
					return;
				}

				case "share": {
					const message:TwitchatDataTypes.MessageTikTokShareData = {
						channel_id:json.data.tikfinityUserId.toString(),
						platform:"tiktok",
						id:Utils.getUUID(),
						date:Date.now(),
						type:TwitchatDataTypes.TwitchatMessageType.TIKTOK_SHARE,
						user:user!,
					};
					StoreProxy.chat.addMessage(message);
					return;
				}

				case "member": {
					return;
				}

				case "roomUser": {
					StoreProxy.stream.currentStreamInfo["tiktok"] = {//Super dirty """user""" ID I know :3. It should be an actual ID instead of "tiktok"
						category:"",
						lastSoDoneDate:0,
						live:true,
						started_at:0,
						tags:[],
						title:"",
						viewers:json.data.viewerCount,
						previewUrl:"",
					}
					StoreProxy.labels.updateLabelValue("VIEWER_COUNT_TIKTOK", json.data.viewerCount);
					return;
				}

				default: {
					//
				}
			}
		},

		saveConfigs():void {
			const data:IStoreData = {
				ip:this.ip,
				port:parseInt(this.port.toString()),//Seems stupid but it enforces the type. Some browser still return strings from "number" fields.
			};
			DataStore.set(DataStore.TIKTOK_CONFIGS, data);
		},

	} as ITiktokActions
	& ThisType<ITiktokActions
		& UnwrapRef<ITiktokState>
		& _StoreWithState<"tiktok", ITiktokState, ITiktokGetters, ITiktokActions>
		& _StoreWithGetters<ITiktokGetters>
		& PiniaCustomProperties
	>,
})

if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeTiktok, import.meta.hot))
}

interface IStoreData {
	ip:string;
	port:number;
}

type TikTokEventType = "follow" | "share" | "chat" | "gift" | "subscribe" | "member" | "like" | "social" | "emote" | "error" | "websocketConnected" | "connected" | "disconnected";

interface TikTokMessage {
	event: "chat";
	data: {
		emotes: {
			emoteId: string;
			emoteImageUrl: string;
			placeInComment: number;
		}[];
		comment?: string;
		userId: string;
		secUid: string;
		uniqueId: string;
		nickname: string;
		profilePictureUrl: string;
		followRole: number;
		userBadges: TikTokUserBadge[];
		userSceneTypes: number[];
		userDetails: TikTokUserDetails;
		followInfo: TikTokFollowInfos;
		isModerator: boolean;
		isNewGifter: boolean;
		isSubscriber: boolean;
		topGifterRank: number;
		gifterLevel: number;
		teamMemberLevel: number;
		msgId: string;
		createTime: string;
		tikfinityUserId: number;
		tikfinityUsername: string;
	}
}

interface TikTokGift {
	event: "gift";
	data: {
		giftId: number;
		repeatCount: number;
		groupId: string;
		userId: string;
		secUid: string;
		uniqueId: string;
		nickname: string;
		profilePictureUrl: string;
		followRole: number;
		userBadges: TikTokUserBadge[];
		userSceneTypes: number[];
		userDetails: TikTokUserDetails;
		followInfo: TikTokFollowInfos;
		isModerator: boolean;
		isNewGifter: boolean;
		isSubscriber: boolean;
		topGifterRank: number;
		gifterLevel: number;
		teamMemberLevel: number;
		msgId: string;
		createTime: string;
		displayType: string;
		label: string;
		repeatEnd: boolean;
		gift: {
			gift_id: number;
			repeat_count: number;
			repeat_end: number;
			gift_type: number;
		};
		describe: string;
		giftType: number;
		diamondCount: number;
		giftName: string;
		giftPictureUrl: string;
		timestamp: number;
		receiverUserId: string;
		originalName: string;
		originalDescribe: string;
		tikfinityUserId: number;
		tikfinityUsername: string;
	}
}

interface TikTokSub {
	event: "subscribe";
	data: {
		subMonth: number;
		oldSubscribeStatus: number;
		subscribingStatus: number;
		userId: string;
		secUid: string;
		uniqueId: string;
		nickname: string;
		profilePictureUrl: string;
		followRole: number;
		userBadges: TikTokUserBadge[];
		userDetails: TikTokUserDetails;
		followInfo: TikTokFollowInfos;
		isModerator: boolean;
		isNewGifter: boolean;
		isSubscriber: boolean;
		topGifterRank: any;
		msgId: string;
		createTime: string;
		displayType: string;
		label: string;
		tikfinityUserId: number;
		tikfinityUsername: string;
	}
}

interface TikTokLike {
	event: "like";
	data: {
		likeCount: number;
		totalLikeCount: number;
		userId: string;
		secUid: string;
		uniqueId: string;
		nickname: string;
		profilePictureUrl: string;
		followRole: number;
		userBadges: TikTokUserBadge[];
		userSceneTypes: number[];
		userDetails: TikTokUserDetails;
		followInfo: TikTokFollowInfos;
		isModerator: boolean;
		isNewGifter: boolean;
		isSubscriber: boolean;
		topGifterRank: number;
		gifterLevel: number;
		teamMemberLevel: number;
		msgId: string;
		createTime: string;
		displayType: string;
		label: string;
		tikfinityUserId: number;
		tikfinityUsername: string;
	}
}

interface TikTokMemberJoin {
	event: "member";
	data: {
		actionId: number;
		userId: string;
		secUid: string;
		uniqueId: string;
		nickname: string;
		profilePictureUrl: string;
		followRole: number;
		userBadges: TikTokUserBadge[];
		userSceneTypes: number[];
		userDetails: TikTokUserDetails;
		followInfo: TikTokFollowInfos;
		isModerator: boolean;
		isNewGifter: boolean;
		isSubscriber: boolean;
		topGifterRank: number;
		gifterLevel: number;
		teamMemberLevel: number;
		msgId: string;
		createTime: string;
		displayType: string;
		label: string;
		tikfinityUserId: number;
		tikfinityUsername: string;
	}
}

interface TikTokRoomStats {
	event: "roomUser";
	data: {
		viewerCount: number;
		topGifterRank: number;
		tikfinityUserId: number;
		tikfinityUsername: string;
		topViewers: {
			user: {
				userId: string;
				secUid: string;
				uniqueId?: string;
				nickname?: string;
				profilePictureUrl?: string;
				userBadges: TikTokUserBadge[];
				userSceneTypes: any[];
				userDetails: TikTokUserDetails;
				isModerator: boolean;
				isNewGifter: boolean;
				isSubscriber: boolean;
				topGifterRank: any;
				gifterLevel: number;
				teamMemberLevel: number;
			}
			coinCount: number;
		}[]
	}
}

interface TikTokShare {
	event: "share";
	data: {
		userId: string;
		secUid: string;
		uniqueId: string;
		nickname: string;
		profilePictureUrl: string;
		followRole: number;
		userBadges: TikTokUserBadge[];
		userSceneTypes: any[];
		userDetails: TikTokUserDetails;
		followInfo: TikTokFollowInfos;
		isModerator: boolean;
		isNewGifter: boolean;
		isSubscriber: boolean;
		topGifterRank: number;
		gifterLevel: number;
		teamMemberLevel: number;
		msgId: string;
		createTime: string;
		displayType: string;
		label: string;
		profile: string;
		name: string;
		username: string;
		tikfinityUserId: number;
		tikfinityUsername: string;
	}
}

interface TikTokFollower {
	event: "follow";
	data: {
		userId: string;
		secUid: string;
		uniqueId: string;
		nickname: string;
		profilePictureUrl: string;
		followRole: number;
		userBadges: TikTokUserBadge[];
		userSceneTypes: number[];
		userDetails: TikTokUserDetails;
		followInfo: TikTokFollowInfos;
		isModerator: boolean;
		isNewGifter: boolean;
		isSubscriber: boolean;
		topGifterRank: number;
		gifterLevel: number;
		teamMemberLevel: number;
		msgId: string;
		createTime: string;
		displayType: string;
		label: string;
		profile: string;
		name: string;
		username: string;
		tikfinityUserId: number;
		tikfinityUsername: string;
	}
}

interface TikTokUserDetails {
	createTime: string;
	bioDescription: string;
	profilePictureUrls: string[];
}

interface TikTokFollowInfos {
	followingCount: number;
	followerCount: number;
	followStatus: 0 | 1;
	pushStatus: 0 | number;
}

interface TikTokUserBadge {
	badgeSceneType: number;
	type: string;
	name?: string;
	privilegeId?: string;
	level?: number;
	displayType?: number;
	url?: string;
}
