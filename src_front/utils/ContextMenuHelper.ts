import { TranslatableLanguagesMap } from "@/TranslatableLanguages";
import ContextMenuTimeoutDuration from "@/components/messages/components/ContextMenuTimeoutDuration.vue";
import TwitchatEvent from "@/events/TwitchatEvent";
import MessengerProxy from "@/messaging/MessengerProxy";
import DataStore from "@/store/DataStore";
import Database from "@/store/Database";
import StoreProxy from "@/store/StoreProxy";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import ContextMenu, { type MenuItem } from "@imengyu/vue3-context-menu";
import domtoimage from 'dom-to-image-more';
import { h, reactive, type RendererElement, type RendererNode, type VNode } from "vue";
import ApiHelper from "./ApiHelper";
import Config from "./Config";
import LandeWorker from "./LandeWorker";
import PublicAPI from "./PublicAPI";
import TriggerUtils from "./TriggerUtils";
import Utils from "./Utils";
import TriggerActionHandler from "./triggers/TriggerActionHandler";
import { TwitchScopes } from "./twitch/TwitchScopes";
import TwitchUtils from "./twitch/TwitchUtils";
import YoutubeHelper from "./youtube/YoutubeHelper";
import { YoutubeScopes } from "./youtube/YoutubeScopes";

/**
* Created : 07/04/2023
*/
export default class ContextMenuHelper {

	private static _instance:ContextMenuHelper;

	constructor() {

	}

	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():ContextMenuHelper {
		if(!ContextMenuHelper._instance) {
			ContextMenuHelper._instance = new ContextMenuHelper();
			ContextMenuHelper._instance.initialize();
		}
		return ContextMenuHelper._instance;
	}



	/******************
	* PUBLIC METHODS *
	******************/

	/**
	 * Open the context menu on right click on desktop or long press on mobile
	 *
	 * @param e
	 */
	public async messageContextMenu(e:MouseEvent|TouchEvent, message:TwitchatDataTypes.ChatMessageTypes, canModerateMessage:boolean=false, canModerateUser:boolean=false, htmlNode:HTMLElement):Promise<void> {
		const t		= StoreProxy.i18n.t;
		const myUID	= (message.platform == "youtube"? StoreProxy.auth.youtube.user?.id : StoreProxy.auth.twitch.user?.id) || "";
		const options:MenuItem[]= [];
		const px = e.type == "touchstart"? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).x;
		const py = e.type == "touchstart"? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).y;
		let highlightIndex = -1;
		const menu	= reactive({
			theme: 'mac '+StoreProxy.common.theme,
			x: px,
			y: py,
			items: [],
			mouseScroll:true,
			closeWhenScroll:false,
			updownButtonSpaceholder:false,
		})

		if(!DataStore.get(DataStore.TWITCHAT_RIGHT_CLICK_HINT_PROMPT)) {
			//Make sure the hint message is not sent anymore
			DataStore.set(DataStore.TWITCHAT_RIGHT_CLICK_HINT_PROMPT, true);
		}

		if(TwitchatDataTypes.IsTranslatableMessage[message.type] === true){
			const tMessage = message as TwitchatDataTypes.TranslatableMessage;
		// if(message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE
		// || message.type == TwitchatDataTypes.TwitchatMessageType.WHISPER) {
			const user			= tMessage.user;
			const channelInfo	= user.channelInfo[tMessage.channel_id];

			//Header
			options.push({
						label:user.displayName,
						disabled:true,
						customClass:"header"
					});

			if(message.platform == "twitch") {
				//Shoutout
				if(canModerateUser) {
					options.push({
						label: t("chat.context_menu.shoutout"),
						icon: this.getIcon("icons/shoutout.svg"),
						onClick: () => StoreProxy.users.shoutout(tMessage.channel_id, user),
					});
				}

				//Reply/quote
				if(tMessage.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
					let allowed = true;
					if(StoreProxy.chat.messageMode != "message"
					&& tMessage.channel_id != StoreProxy.stream.currentChatChannel.id) {
						allowed = false;
					}

					if(tMessage.channel_id != StoreProxy.auth.twitch.user.id
					&& !StoreProxy.stream.connectedTwitchChans.find(v=>v.user.id == tMessage.channel_id)) {
						allowed = false;
					}

					if(allowed) {
						options.push({
									label: StoreProxy.chat.messageMode == "message"? t("chat.context_menu.answer") : t("chat.context_menu.quote"),
									icon: StoreProxy.chat.messageMode == "message"? this.getIcon("icons/reply.svg") : this.getIcon("icons/quote.svg"),
									onClick: () => {
										StoreProxy.stream.currentChatChannel = {
											id: tMessage.channel_id,
											platform: message.platform,
											name: StoreProxy.stream.connectedTwitchChans.find(v=>v.user.id == tMessage.channel_id)?.user.login || "",
										}
										StoreProxy.chat.replyTo = tMessage as TwitchatDataTypes.MessageChatData;
									}
								});
					}
				}

				//Whisper
				if(user.id != myUID) {
					options.push({
								label: t("chat.context_menu.whisper"),
								icon: this.getIcon("icons/whispers.svg"),
								onClick: () => StoreProxy.chat.openWhisperWithUser(user),
							});
				}
			}

			//Track/untrack user
			if(user.is_tracked) {
				options.push({
							label: t("chat.context_menu.untrack"),
							icon: this.getIcon("icons/magnet.svg"),
							onClick: () => StoreProxy.users.untrackUser(user),
						});
			}else{
				options.push({
							label: t("chat.context_menu.track"),
							icon: this.getIcon("icons/magnet.svg"),
							onClick: () => StoreProxy.users.trackUser(user),
						});
			}

			//Chat highlight
			highlightIndex = options.length;
			options.push({
				label: t("chat.context_menu.highlight_loading"),
				icon: this.getIcon("icons/highlight.svg"),
				disabled:true,
			});
			options[highlightIndex].onClick = () => {
				if(options[highlightIndex].customClass == "no_overlay") {
					//Open parameters if overlay is not found
					StoreProxy.params.openParamsPage(TwitchatDataTypes.ParameterPages.OVERLAYS, TwitchatDataTypes.ParamDeepSections.HIGHLIGHT);
				}else{
					StoreProxy.chat.highlightChatMessageOverlay(tMessage)
				}
			};

			//Pin / Unpin message
			if(message.platform == "twitch" && message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
				options.push({
							label: message.is_pinned === true? t("chat.context_menu.unpin_twitch") : t("chat.context_menu.pin_twitch"),
							icon: message.is_pinned === true? this.getIcon("icons/unpin.svg") : this.getIcon("icons/pin.svg"),
							customClass:"disabled",
							onClick: () => {
								StoreProxy.common.alert(t("error.no_pin_api"));
							},
						});
			}

			//Save/unsave
			if(message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
				if(message.is_saved) {
					options.push({
								label: t("chat.context_menu.unsave"),
								icon: this.getIcon("icons/save.svg"),
								onClick: () => StoreProxy.chat.unsaveMessage(message),
							});

				}else{
					options.push({
								label: t("chat.context_menu.save"),
								icon: this.getIcon("icons/save.svg"),
								onClick: () => StoreProxy.chat.saveMessage(message),
							});
				}
			}

			//TTS actions
			if(StoreProxy.tts.params.enabled) {
				//Read message
				options.push({
							label: t("chat.context_menu.tts"),
							icon: this.getIcon("icons/tts.svg"),
							onClick: () => StoreProxy.tts.ttsReadMessage(message),
						});

				//Start/stop reading all this user's messages
				const username = user.login.toLowerCase();
				const permissions: TwitchatDataTypes.PermissionsData = StoreProxy.tts.params.ttsPerms;
				if (permissions.usersAllowed.findIndex(v => v.toLowerCase() === username) == -1) {
					options.push({
								label: t("chat.context_menu.tts_all_start"),
								icon: this.getIcon("icons/tts.svg"),
								onClick: () => StoreProxy.tts.ttsReadUser(user, true),
							});
				} else {
					options.push({
								label: t("chat.context_menu.tts_all_stop"),
								icon: this.getIcon("icons/tts.svg"),
								onClick: () => StoreProxy.tts.ttsReadUser(user, false),
							});
				}
			}

			//Open profile
			options.push({
						label: t("chat.context_menu.profile"),
						icon: this.getIcon("icons/user.svg"),
						onClick: () => StoreProxy.users.openUserCard(user, message.channel_id, user.platform),
					});

			//Q&A sessions
			const qnaSessions = StoreProxy.qna.activeSessions;//.filter(v => v.shareWithMods);
			if(qnaSessions.length > 0) {
				const children:MenuItem[] = [];
				for (let i = 0; i < qnaSessions.length; i++) {
					const session = qnaSessions[i];

					let label = session.command;
					if(session.ownerId != StoreProxy.auth.twitch.user.id) {
						let user = await StoreProxy.users.getUserFrom("twitch", message.channel_id, session.ownerId);
						label = "("+user.displayNameOriginal+") " + label;
					}
					children.push({
						label,
						onClick: () => {
							StoreProxy.qna.addMessageToSession(tMessage, session);
						}
					})
				}
				options.push(
					{
						label: t("chat.context_menu.shared_qna"),
						icon: this.getIcon("icons/qna.svg"),
						children
					});
			}

			//Moderation actions
			if(canModerateMessage) {
				const m:TwitchatDataTypes.MessageChatData = message as TwitchatDataTypes.MessageChatData;

				options.push({
					label: t("chat.context_menu.spoil"),
					icon: this.getIcon("icons/spoiler.svg"),
					onClick: () => StoreProxy.chat.flagAsSpoiler(m),
				});

				//Add splitter after previous item
				options[options.length-1].divided = true;

				//Delete message
				if(m.deleted !== true) {
					let classes = "alert";
					if(message.platform == "twitch" && !TwitchUtils.hasScopes([TwitchScopes.DELETE_MESSAGES])) classes += " disabled";
					if(message.platform == "youtube" && !YoutubeHelper.instance.hasScopes([YoutubeScopes.CHAT_MODERATE])) classes += " disabled";
					options.push({
								label: t("chat.context_menu.delete"),
								icon: this.getIcon("icons/trash.svg"),
								customClass:classes,
								onClick: () => {
									if(message.platform == "twitch" && !TwitchUtils.requestScopes([TwitchScopes.DELETE_MESSAGES])) return;
									if(message.platform == "youtube" && !YoutubeHelper.instance.requestScopes([YoutubeScopes.CHAT_MODERATE])) return;
									StoreProxy.chat.deleteMessage(m);
								},
							});
				}
			}

			//User moderation actions
			if(canModerateUser) {

				let classesMod = "alert";
				if(message.platform == "twitch" && !TwitchUtils.hasScopes([TwitchScopes.EDIT_BANNED])) classesMod += " disabled";
				if(message.platform == "youtube" && !YoutubeHelper.instance.hasScopes([YoutubeScopes.CHAT_MODERATE])) classesMod += " disabled";

				const classesBlock = "alert";
				if(message.platform == "twitch" && !TwitchUtils.hasScopes([TwitchScopes.EDIT_BLOCKED])) classesMod += " disabled";
				if(message.platform == "youtube" && !YoutubeHelper.instance.hasScopes([YoutubeScopes.CHAT_MODERATE])) classesMod += " disabled";
				if(!canModerateMessage) options[options.length-1].divided = true;

				if(message.platform == "twitch") {
					options.push({
						label: t("chat.context_menu.warn_user"),
						icon: this.getIcon("icons/alert.svg"),
						customClass:classesMod,
						onClick: () => {
							if(!TwitchUtils.requestScopes([TwitchScopes.CHAT_WARNING])) return;
							TwitchUtils.sendWarning(tMessage.user.id, t("chat.warn_chatter.default_reason"), message.channel_id);
						},
					});

					options.push({
						label: t("chat.context_menu.add_blocked_terms"),
						icon: this.getIcon("icons/block.svg"),
						customClass:classesMod,
						onClick: () => {
							if(!TwitchUtils.requestScopes([TwitchScopes.BLOCKED_TERMS])) return;
							const str = (tMessage.message_chunks || []).map(v=>{
								if(v.type == "cheermote" || v.type == "emote" || v.type == "url") {
									return "*";
								}else
								if(v.type == "text" || v.type == "user" || v.type == "highlight") {
									return v.value.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
								}
								return v.value.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
							}).join("");

							TwitchUtils.addBanword(str);
						},
					});
				}

				//Timeout
				options.push(
						{
							label: t("chat.context_menu.to"),
							customClass:classesMod,
							icon: this.getIcon("icons/timeout.svg"),
							children: [
								{
									label: "1s",
									customClass:classesMod,
									onClick: () => this.timeoutUser(tMessage, 1),
								},
								{
									label: "10s",
									customClass:classesMod,
									onClick: () => this.timeoutUser(tMessage, 10),
								},
								{
									label: "1m",
									customClass:classesMod,
									onClick: () => this.timeoutUser(tMessage, 60),
								},
								{
									label: "5m",
									customClass:classesMod,
									onClick: () => this.timeoutUser(tMessage, 60 * 5),
								},
								{
									label: "10m",
									customClass:classesMod,
									onClick: () => this.timeoutUser(tMessage, 60 * 10),
								},
								{
									label: "30m",
									customClass:classesMod,
									onClick: () => this.timeoutUser(tMessage, 60 * 30),
								},
								{
									label: "1h",
									customClass:classesMod,
									onClick: () => this.timeoutUser(tMessage, 60 * 60),
								},
								{
									label: "24h",
									customClass:classesMod,
									onClick: () => this.timeoutUser(tMessage, 60 * 60 * 24),
								},
								{
									label: "1w",
									customClass:classesMod,
									onClick: () => this.timeoutUser(tMessage, 60 * 60 * 24 * 7),
								},
								{
									label: "2w",
									customClass:classesMod,
									onClick: () => this.timeoutUser(tMessage, 60 * 60 * 24 * 7 * 2),
								},
								{
									label: "1w",
									customRender: () => h(ContextMenuTimeoutDuration, {
										user:tMessage.user,
										channelId:message.channel_id,
									})
								},
							]
						});

				//Ban/unban user
				if(channelInfo.is_banned) {
					options.push({
								label: t("chat.context_menu.unban"),
								icon: this.getIcon("icons/unban.svg"),
								customClass:classesMod,
								onClick: () => {
									if(message.platform == "twitch" && !TwitchUtils.requestScopes([TwitchScopes.EDIT_BANNED])) return;
									if(message.platform == "youtube" && !YoutubeHelper.instance.requestScopes([YoutubeScopes.CHAT_MODERATE])) return;
									this.unbanUser(tMessage, message.platform == "youtube"? tMessage.channel_id : message.channel_id);
								},
							});
				}else{
					options.push({
								label: t("chat.context_menu.ban"),
								icon: this.getIcon("icons/ban.svg"),
								customClass:classesMod,
								onClick: () => this.banUser(tMessage, message.channel_id),
							});
				}

				//Message not posted on our own channel, add a button to ban on our own channel.
				if(message.channel_id != myUID) {
					if(tMessage.user.channelInfo[myUID]?.is_banned) {
						options.push({
								label: t("chat.context_menu.unban_myRoom"),
								icon: this.getIcon("icons/unban.svg"),
								customClass:classesMod,
								onClick: () => {
									if(message.platform == "twitch" && !TwitchUtils.requestScopes([TwitchScopes.EDIT_BANNED])) return;
									if(message.platform == "youtube" && !YoutubeHelper.instance.requestScopes([YoutubeScopes.CHAT_MODERATE])) return;
									this.unbanUser(tMessage, myUID);
								},
							});
					}else{
						options.push({
								label: t("chat.context_menu.ban_myRoom"),
								icon: this.getIcon("icons/ban.svg"),
								customClass:classesMod,
								onClick: () => this.banUser(tMessage, myUID),
							});
					}
				}

				//Block/unblock user
				if(message.platform == "twitch") {
					if(tMessage.user.is_blocked) {
						options.push({
									label: t("chat.context_menu.unblock"),
									icon: this.getIcon("icons/unblock.svg"),
									customClass:classesBlock,
									onClick: () => {
										if(message.platform == "twitch" && !TwitchUtils.requestScopes([TwitchScopes.EDIT_BLOCKED])) return;
										if(message.platform == "youtube" && !YoutubeHelper.instance.requestScopes([YoutubeScopes.CHAT_MODERATE])) return;
										TwitchUtils.unblockUser(user);
									},
								});
					}else{
						options.push({
									label: t("chat.context_menu.block"),
									icon: this.getIcon("icons/block.svg"),
									customClass:classesBlock,
									onClick: () => this.blockUser(tMessage),
								});
					}
				}
			}

			if((message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE
			|| message.type == TwitchatDataTypes.TwitchatMessageType.WHISPER)
			&& StoreProxy.discord.quickActions?.length > 0) {
				//Add splitter after previous option
				if(options.length > 0) options[options.length-1].divided = true;

				const list = StoreProxy.discord.quickActions;
				const children:MenuItem[] = [];
				list.forEach(action=> {
					if(!action.message || !action.channelId) return;
					children.push({
						icon: this.getIcon("icons/whispers.svg"),
						label: (action.name || (action.message||"").substring(0,20)).replace(/ /gi, " "),
						onClick: () => this.discordQuickAction(message, action),
					});
				});
				options.push({
					label: t("chat.context_menu.discord_quick_actions"),
					icon: this.getIcon("icons/discord.svg"),
					children,
				});
			}

			this.addCustomTriggerEntries(options, tMessage);
		}else

		if(message.type == TwitchatDataTypes.TwitchatMessageType.CUSTOM) {
			//Chat highlight
			highlightIndex = options.length;
			options.push({
				label: t("chat.context_menu.highlight_loading"),
				icon: this.getIcon("icons/highlight.svg"),
				disabled:true,
			});
			options[highlightIndex].onClick = () => {
				if(options[highlightIndex].customClass == "no_overlay") {
					//Open parameters if overlay is not found
					StoreProxy.params.openParamsPage(TwitchatDataTypes.ParameterPages.OVERLAYS, TwitchatDataTypes.ParamDeepSections.HIGHLIGHT);
				}else{
					const iconToPlatform:{[icon:string]:TwitchatDataTypes.ChatPlatform} = {
						kick:"kick",
						youtube:"youtube",
						tiktok:"tiktok",
						twitch:"twitch",
						instagram:"instagram",
					};
					const highlightMessage:TwitchatDataTypes.MessageChatData = {
						id:Utils.getUUID(),
						answers:[],
						channel_id:"",
						date:message.date,
						message:message.message || "",
						message_html:message.message_html || "",
						message_chunks:message.message_chunks || [],
						is_short:false,
						message_size:(message.message || "").length,
						platform:"twitchat",
						type:TwitchatDataTypes.TwitchatMessageType.MESSAGE,
						user:{
							channelInfo:{},
							login:message.user?.name || "",
							displayName:message.user?.name || "",
							displayNameOriginal:message.user?.name || "",
							color:message.user?.color || "",
							id:Utils.getUUID(),
							platform:iconToPlatform[message.icon || ""] || "twitchat",
							pronouns: null,
							is_affiliate:false,
							is_blocked:false,
							is_bot:false,
							is_partner:false,
							is_tracked:false,
							pronounsLabel:"",
							pronounsTooltip:"",
						},
					}
					StoreProxy.chat.highlightChatMessageOverlay(highlightMessage);
				}
			};
		}


		//Update "highlight message" state according to overlay presence
		this.getHighlightOverPresence().then(res => {
			const item = menu.items[highlightIndex] as MenuItem;
			if(!item) return;
			item.label = t("chat.context_menu.highlight");
			item.disabled = false;
			if(!res) item.customClass = "no_overlay";//Dirty way of knowing if overlay exists on the click handler of the item
		});

		const spokenLanguages = StoreProxy.params.features.autoTranslateFirstSpoken.value as string[] || [];
		const langTarget = (StoreProxy.params.features.autoTranslateFirstLang.value as string[] || [])[0];
		// if(StoreProxy.auth.isRealPremium
		if(StoreProxy.auth.isPremium
		&& langTarget
		&& TwitchatDataTypes.IsTranslatableMessage[message.type]
		&& !(message as TwitchatDataTypes.TranslatableMessage).translation
		&& spokenLanguages.length > 0
		) {
			const translatable = message as TwitchatDataTypes.TranslatableMessage;
			const text = translatable.message_chunks?.filter(v=>v.type == 'text').map(v=>v.value).join("").trim() || "";
			if(text.length >= 4) {
				LandeWorker.instance.lande(text, (langs)=>{
					const iso3 = langs[0][0] as keyof typeof TranslatableLanguagesMap;
					//Force to english if confidence is too low as it tends to detect weird languages for basic english messages
					//Also force english if first returned lang is Affrikaan and second is english.
					//It detects most inglish messages as Afrikaan.
					const lang = (langs[0][1] < .6 || (langs[0][0] == "afr" && langs[1][0] == "eng"))? TranslatableLanguagesMap["eng"] : TranslatableLanguagesMap[iso3];
					const langTarget = (StoreProxy.params.features.autoTranslateFirstLang.value as string[])[0];
					if(lang.iso1 != langTarget && lang && !spokenLanguages.includes(lang.iso1)) {
						options.push({
									label: t("chat.context_menu.translate"),
									icon: this.getIcon("icons/translate.svg"),
									onClick: () => this.translate(translatable, lang, text),
								});
					}
				});
			}
		}

		if(message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE
		|| message.type == TwitchatDataTypes.TwitchatMessageType.WHISPER
		|| message.type == TwitchatDataTypes.TwitchatMessageType.HYPE_CHAT
		|| message.type == TwitchatDataTypes.TwitchatMessageType.REWARD
		|| message.type == TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION
		|| message.type == TwitchatDataTypes.TwitchatMessageType.CHEER
		|| message.type == TwitchatDataTypes.TwitchatMessageType.STREAM_OFFLINE
		|| message.type == TwitchatDataTypes.TwitchatMessageType.STREAM_ONLINE
		|| message.type == TwitchatDataTypes.TwitchatMessageType.MUSIC_ADDED_TO_QUEUE
		|| message.type == TwitchatDataTypes.TwitchatMessageType.USER_WATCH_STREAK
		|| message.type == TwitchatDataTypes.TwitchatMessageType.KOFI
		|| message.type == TwitchatDataTypes.TwitchatMessageType.STREAMLABS
		|| message.type == TwitchatDataTypes.TwitchatMessageType.STREAMELEMENTS
		|| message.type == TwitchatDataTypes.TwitchatMessageType.UNBAN_REQUEST
		|| message.type == TwitchatDataTypes.TwitchatMessageType.RAID) {
			const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
			const entryCount = options.length;
			let optionAdded = false;

			if(StoreProxy.discord.discordLinked === true
			&& StoreProxy.discord.ticketChanTarget
			&& message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
				optionAdded = true;
				options.push({
							label: t("chat.context_menu.discord_ticket"),
							icon: this.getIcon("icons/discord.svg"),
							onClick: () => this.createDiscordTicket(message),
						});
			}
			if(StoreProxy.discord.discordLinked === true && StoreProxy.discord.logChanTarget) {
				optionAdded = true;
				options.push({
							label: t("chat.context_menu.export_discord"),
							icon: this.getIcon("icons/discord.svg"),
							onClick: () => this.exportMessage(message, htmlNode, true),
						});
			}
			if(!isSafari && !Config.instance.OBS_DOCK_CONTEXT) {
				optionAdded = true;
				options.push({
					label: Config.instance.OBS_DOCK_CONTEXT? t("chat.context_menu.export_clipboard") : t("chat.context_menu.export"),
					icon: Config.instance.OBS_DOCK_CONTEXT? this.getIcon("icons/copy.svg") : this.getIcon("icons/download.svg"),
					onClick: () => this.exportMessage(message, htmlNode),
				});
			}
			if(optionAdded) {
				//Add splitter after previous item if any
				if(entryCount > 0) options[entryCount-1].divided = true;
			}
		}

		menu.items = options as never;
		if(options.length > 0) {
			options.forEach(v=> {
				v.clickableWhenHasChildren = true;
			});
			ContextMenu.showContextMenu(menu);
			e.preventDefault();
		}
	}



	/*******************
	* PRIVATE METHODS *
	*******************/
	private initialize():void {
	}

	private getIcon(icon:string):VNode<RendererNode, RendererElement> {
		const image = StoreProxy.asset;
		return h('img', {
			src: image(icon),
			style: {
			width: '1em',
			height: '1em',
			}
		})
	}

	/**
	 * Timeouts a user
	 *
	 * @param duration ban duration. Don't specify to perma ban
	 */
	private timeoutUser(message:TwitchatDataTypes.TranslatableMessage, duration:number):void {
		if(message.platform == "twitch" && !TwitchUtils.requestScopes([TwitchScopes.EDIT_BANNED])) return;
		if(message.platform == "youtube" && !YoutubeHelper.instance.requestScopes([YoutubeScopes.CHAT_MODERATE])) return;
		if(message.fake === true) {
			//Avoid banning user for real if doing it from a fake message
			StoreProxy.users.flagBanned(message.platform, message.channel_id, message.user.id, duration);
		}else{
			switch(message.platform) {
				case "twitch":
					TwitchUtils.banUser(message.user, message.channel_id, duration);
					break;
				case "youtube":
					YoutubeHelper.instance.banUser(message.user.id, (message as TwitchatDataTypes.MessageChatData).youtube_liveId!, duration);
					break;
			}
		}
	}

	/**
	 * Permanently ban a user after confirmation
	 */
	private banUser(message:TwitchatDataTypes.TranslatableMessage, channelId:string):void {
		if(message.platform == "twitch" && !TwitchUtils.requestScopes([TwitchScopes.EDIT_BANNED])) return;
		if(message.platform == "youtube" && !YoutubeHelper.instance.requestScopes([YoutubeScopes.CHAT_MODERATE])) return;
		const t = StoreProxy.i18n.t;
		StoreProxy.main.confirm(t("chat.mod_tools.ban_confirm_title", {USER:message.user.displayName}), t("chat.mod_tools.ban_confirm_desc"))
		.then(() => {
			if(message.fake === true) {
				//Avoid banning user for real if doing it from a fake message
				StoreProxy.users.flagBanned(message.platform, channelId, message.user.id);
				StoreProxy.common.alert("User is not banned for real because it's a fake message");
			}else{
				switch(message.platform) {
					case "twitch":
						TwitchUtils.banUser(message.user, channelId, undefined, t("global.moderation_action.ban_reason"));
						break;
					case "youtube":
						YoutubeHelper.instance.banUser(message.user.id, (message as TwitchatDataTypes.MessageChatData).youtube_liveId!);
						break;
				}
			}
		}).catch(error => {
			//ignore
		});
	}

	/**
	 * Unbans a user
	 */
	private unbanUser(message:TwitchatDataTypes.TranslatableMessage, channelId:string):void {
		if(message.fake === true) {
			//Avoid banning user for real if doing it from a fake message
			StoreProxy.users.flagUnbanned(message.platform, channelId, message.user.id);
		}else{
			switch(message.user.platform) {
				case "twitch":
					TwitchUtils.unbanUser(message.user, channelId);
					break;
				case "youtube":
					YoutubeHelper.instance.unbanUser(message.user.id, channelId);
					break;
			}
		}
	}

	/**
	 * Block a user after confirmation
	 */
	private blockUser(message:TwitchatDataTypes.TranslatableMessage):void {
		if(message.platform == "twitch" && !TwitchUtils.requestScopes([TwitchScopes.EDIT_BLOCKED])) return;
		if(message.platform == "youtube" && !YoutubeHelper.instance.requestScopes([YoutubeScopes.CHAT_MODERATE])) return;
		const t = StoreProxy.i18n.t;
		StoreProxy.main.confirm(t("chat.mod_tools.block_confirm_title", {USER:message.user.displayName}), t("chat.mod_tools.block_confirm_desc"))
		.then(() => {
			if(message.fake === true) {
				//Avoid banning user for real if doing it from a fake message
				StoreProxy.users.flagBlocked(message.platform, message.user.id);
			}else{
				TwitchUtils.blockUser(message.user);
			}
		}).catch(error => {
			//ignore
		});
	}

	/**
	 * Translates a message
	 */
	private translate(message:TwitchatDataTypes.TranslatableMessage, langSource:typeof TranslatableLanguagesMap[keyof typeof TranslatableLanguagesMap], text:string):void {
		const langTarget = (StoreProxy.params.features.autoTranslateFirstLang.value as string[])[0];
		ApiHelper.call("google/translate", "GET", {langSource:langSource.iso1, langTarget, text:text}, false)
		.then(res=>{
			if(res.status == 401) {
				StoreProxy.common.alert(StoreProxy.i18n.t("premium.restricted_access"));
			}else
			if(res.status == 429) {
				StoreProxy.common.alert(StoreProxy.i18n.t("error.quota_translation"));
			}else
			if(res.json.data.translation) {
				message.translation = {
					flagISO:langSource.flag,
					languageCode:langSource.iso1,
					languageName:langSource.name,
					translation:res.json.data.translation,
				}
				Database.instance.updateMessage(message as TwitchatDataTypes.ChatMessageTypes);
			}
		}).catch((error)=>{
			message.translation_failed = true;
			Database.instance.updateMessage(message as TwitchatDataTypes.ChatMessageTypes);
			StoreProxy.common.alert(StoreProxy.i18n.t("error.no_translation"));
		});
	}

	/**
	 * Check if the "chat highlight" overlay exists or not
	 */
	private getHighlightOverPresence():Promise<boolean> {
		return new Promise((resolve, reject)=> {
			const timeout = window.setTimeout(() =>{
				resolve(false);
				PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_HIGHLIGHT_OVERLAY_PRESENCE, handler);
			}, 1000)
			const handler = (e:TwitchatEvent)=> {
				clearTimeout(timeout)
				resolve(true);
				PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_HIGHLIGHT_OVERLAY_PRESENCE, handler);
			}
			PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_HIGHLIGHT_OVERLAY_PRESENCE, handler);
			PublicAPI.instance.broadcast(TwitchatEvent.GET_CHAT_HIGHLIGHT_OVERLAY_PRESENCE);
		})
	}

	/**
	 * Add custom slash commands created on the triggers
	 * @param options
	 * @param message
	 */
	private addCustomTriggerEntries(options:MenuItem[], message:TwitchatDataTypes.TranslatableMessage):void {
		const items = StoreProxy.triggers.triggerList.filter(v=> v.addToContextMenu === true);
		if(items.length === 0) return;
		const children:MenuItem[] = [];
		for (let i = 0; i < items.length; i++) {
			const trigger = items[i];
			if(i===0) {
				options[options.length-1].divided = true;
			}
			children.push({
				label: trigger.name || trigger.chatCommand,
				icon: this.getIcon("icons/commands.svg"),
				customClass:"noWrap",
				onClick: () => {
					TriggerActionHandler.instance.executeTrigger(trigger, message as TwitchatDataTypes.ChatMessageTypes, false, trigger.chatCommand);
				},
			});
		}
		//Sort items alphabetically
		children.sort((a,b)=> {
			return (a.label! as string).toLowerCase().localeCompare((b.label! as string).toLowerCase());
		});
		if(options.length > 0) {
			options[options.length-1].divided = true;
		}
		options.push({
			label: "Triggers",
			icon: this.getIcon("icons/commands.svg"),
			children,
		});
	}

	/**
	 * Exports a screenshot + data of the message
	 * @param message
	 */
	private async exportMessage(message:TwitchatDataTypes.MessageChatData
								| TwitchatDataTypes.MessageWhisperData
								| TwitchatDataTypes.MessageHypeChatData
								| TwitchatDataTypes.MessageRewardRedeemData
								| TwitchatDataTypes.MessageSubscriptionData
								| TwitchatDataTypes.MessageCheerData
								| TwitchatDataTypes.MessageStreamOnlineData
								| TwitchatDataTypes.MessageStreamOfflineData
								| TwitchatDataTypes.MessageMusicAddedToQueueData
								| TwitchatDataTypes.MessageWatchStreakData
								| TwitchatDataTypes.MessageKofiData
								| TwitchatDataTypes.MessageStreamlabsData
								| TwitchatDataTypes.MessageStreamelementsData
								| TwitchatDataTypes.MessageUnbanRequestData
								| TwitchatDataTypes.MessageRaidData, htmlNode:HTMLElement, discord:boolean = false):Promise<void> {

		StoreProxy.main.messageExportState = {id:"progress"};
		const errorTimeout = window.setTimeout(()=> {
			StoreProxy.main.messageExportState = {id:"error"};
		}, 10000)
		const bgcolor = StoreProxy.common.theme == "dark"? "#18181b" : "#EEEEEE";
		const fgcolor = StoreProxy.common.theme == "dark"? "#EEEEEE" : "#18181b";
		let user:TwitchatDataTypes.TwitchatUser|undefined = undefined;
		let chanId:string = "";
		let userName:string = "";
		if(message.type == TwitchatDataTypes.TwitchatMessageType.HYPE_CHAT){
			user = message.message.user;
			chanId = message.message.channel_id;
		}else if(message.type == TwitchatDataTypes.TwitchatMessageType.STREAM_OFFLINE || message.type == TwitchatDataTypes.TwitchatMessageType.STREAM_ONLINE){
			user = message.info.user;
			chanId = StoreProxy.auth.twitch.user.id;
		}else
		if(message.type == TwitchatDataTypes.TwitchatMessageType.STREAMELEMENTS) {
			userName = message.userName;
		}else
		if(message.type == TwitchatDataTypes.TwitchatMessageType.STREAMLABS) {
			userName = message.userName;
		}else
		if(message.type == TwitchatDataTypes.TwitchatMessageType.KOFI) {
			userName = message.userName;
		}else
		if(message.type != TwitchatDataTypes.TwitchatMessageType.MUSIC_ADDED_TO_QUEUE){
			user = message.user;
			chanId = message.channel_id;
		}
		const messageId = message.type == TwitchatDataTypes.TwitchatMessageType.HYPE_CHAT? message.message.id : message.id;
		const fileName = user? user.id+"_"+user.login+"_"+messageId : messageId;
		const gap = 10;
		const width = 600;
		const infosDiv = document.createElement("div");
		infosDiv.style.color = fgcolor;
		infosDiv.style.fontSize = "15px";
		infosDiv.style.lineHeight = "17px";
		infosDiv.style.width = width+"px";
		infosDiv.style.display = "flex";
		infosDiv.style.flexDirection = "column";
		infosDiv.style.position = "fixed";
		infosDiv.style.top = "-99999px";
		infosDiv.style.padding = "1em";
		infosDiv.style.borderRadius = ".3em";
		infosDiv.style.backgroundColor = bgcolor;
		let html = `<div><strong>Message type:</strong> ${message.type}</div>
		<div><strong>Date:</strong> ${Utils.formatDate(new Date(message.date), true)}</div>
		<div><strong>Platform:</strong> ${message.platform}</div>`;
		if(user) {
			html += `<div><strong>User login:</strong> ${user.login}</div>
			<div><strong>User ID:</strong> ${user.id}</div>`;
		}
		if(userName) {
			html += `<div><strong>User name:</strong> ${userName}</div>`;
		}
		if(chanId) {
			html += `<div><strong>Channel ID:</strong> ${chanId}</div>`;
		}
		//Add message ID if relevant
		if(message.type != TwitchatDataTypes.TwitchatMessageType.STREAM_OFFLINE
		&& message.type != TwitchatDataTypes.TwitchatMessageType.STREAM_ONLINE) {
			html += `<div><strong>Message ID:</strong> <span style="font-size:.8em">${messageId}</span></div>`;
		}
		infosDiv.innerHTML = html;
		document.body.appendChild(infosDiv);
		await Utils.promisedTimeout(0);//Leave time for the html node to render
		const bounds = infosDiv.getBoundingClientRect();

		//Generate image from virtual infos node
		domtoimage
		.toPng(infosDiv, {width:bounds.width, height:bounds.height})
		.then(async(infoUrl:string) => {
			infosDiv.remove();
			const infoImg = new Image();
			infoImg.addEventListener("load", async () => {
				//Generate image from message node
				const clone = htmlNode.cloneNode(true) as HTMLElement;
				htmlNode.parentElement?.parentElement?.appendChild(clone);
				clone.style.position = "fixed";
				clone.style.top = "0";
				clone.style.left = "-10000px";//Don't set a too high value here, it fucks up bounds calculations on firefox
				clone.style.width = width+"px";
				clone.style.position = "absolute";
				clone.style.fontSize = "18px";
				clone.style.opacity = "1";
				clone.style.padding = "1em";
				clone.style.borderRadius = ".3em";
				//Do not override any existing background color
				if(!window.getComputedStyle(htmlNode).getPropertyValue("background")) {
					clone.style.background = bgcolor;
				}
				clone.querySelector(".chatMessageTime")?.remove();
				clone.querySelectorAll("button").forEach(v=>v.remove());
				const imgs = clone.querySelectorAll("img");
				let loaded = 0;
				//Wait for all images to be loaded
				await new Promise<void>((resolve)=> {
					const fallBackTO = window.setTimeout(() => resolve(), 1000);
					imgs.forEach((v:HTMLImageElement)=>{
						if(/.*cloudfront.net/.test(v.src)) {
							//CORS bypass for cheermotes
							v.src = Config.instance.API_PATH+"/download?image="+encodeURIComponent(v.src);
						}

						v.removeAttribute("loading");
						v.addEventListener("load", ()=>{
							if(++loaded == imgs.length) {
								resolve();
								clearTimeout(fallBackTO);
							}
						});
						v.addEventListener("error", ()=>{
							if(++loaded == imgs.length) {
								resolve();
								clearTimeout(fallBackTO);
							}
						});
					});
				})

				const bounds = clone.getBoundingClientRect();
				//Add margin to make sure borders are not cut out (necessary on firefox...)
				bounds.width = Math.ceil(bounds.width + 5);
				bounds.height = Math.ceil(bounds.height + 5);

				domtoimage
				.toPng(clone, {width:bounds.width, height:bounds.height})
				.then((dataUrl:string) => {
					const messageImg = new Image();
					messageImg.addEventListener("load", () => {
						const cnvWidth	= Math.max(messageImg.width, infoImg.width);
						const canvas	= document.createElement("canvas");
						const ctx		= canvas.getContext("2d");
						canvas.width	= cnvWidth;
						canvas.height	= messageImg.height + infoImg.height + gap;
						if(!ctx) throw new Error("Context 2D creation failed");
						ctx.clearRect(0, 0, canvas.width, canvas.height);
						ctx.fillStyle = "rgba(255,255,255,0)";
						ctx.fillRect(0, 0, canvas.width, canvas.height);
						ctx.drawImage(messageImg, 0, 0, messageImg.width, messageImg.height);
						ctx.drawImage(infoImg, 0, messageImg.height + gap, infoImg.width, infoImg.height);
						if(discord) {
							canvas.toBlob((blob)=> {
								if(!blob) return;
								const json:any = {
									fileName,
									userName:user?.login,
									userId:user?.id,
									date:message.date,
									messageId:message.id,
									messageType:message.type,
									messagePlatform:message.platform,
								};
								if(message.hasOwnProperty("message")) {
									json.message = (message as TwitchatDataTypes.MessageChatData).message;
								}
								//Send image and message to discord
								const formData = new FormData();
								formData.append("message", JSON.stringify(json));
								formData.append("image", blob, fileName+".png");
								ApiHelper.call("discord/image", "POST", formData, false, 0, {"Content-Rype": "multipart/form-data"})
								.then(result=> {
									if(result.status == 200) {
										StoreProxy.main.messageExportState = {id:"discord"};
									}else{
										if(result.json.channelName) {
											StoreProxy.main.messageExportState = {id:"error_discord_access", params:{CHANNEL:result.json.channelName}};
										}else{
											StoreProxy.main.messageExportState = {id:"error"};
										}
									}
									clearTimeout(errorTimeout);
								}).catch(error =>{
									StoreProxy.main.messageExportState = {id:"error"};
									clearTimeout(errorTimeout);
								});
							});
						}else{
							//Download image
							Utils.downloadFile(fileName+".png", undefined, canvas.toDataURL(), "image/png");
							clone.remove();
							const downloaded = !Config.instance.OBS_DOCK_CONTEXT;

							canvas.toBlob((blob)=> {
								navigator.clipboard.write([
									new ClipboardItem({ 'image/png': blob!}),
								]).then(()=>{
									StoreProxy.main.messageExportState = {id:downloaded? "complete" : "complete_copyOnly"};
									clearTimeout(errorTimeout);
								}).catch((error)=> {
									console.log(error);
									StoreProxy.main.messageExportState = {id:downloaded? "complete_downloadOnly" : "error"};
									clearTimeout(errorTimeout);
								});
							}, "image/png");
						}
					});
					messageImg.setAttribute("src", dataUrl);
				})
				.catch((error:any) => {
					console.error('DOM node export failed', error);
					StoreProxy.main.messageExportState = {id:"error"};
					clearTimeout(errorTimeout);
				});
			});
			infoImg.setAttribute("src", infoUrl);
		})
		.catch((error:any) => {
			console.error('DOM node export failed', error);
			StoreProxy.main.messageExportState = {id:"error"};
			clearTimeout(errorTimeout);
		});
	}

	/**
	 * Executes a discord quick action
	 */
	private async discordQuickAction(message:TwitchatDataTypes.MessageChatData | TwitchatDataTypes.MessageWhisperData, action:TwitchatDataTypes.DiscordQuickActionData):Promise<void> {
		const text = await TriggerUtils.parseGlobalPlaceholders(action.message || "", false, message);
		const channelId = action.channelId || "";
		const res = await ApiHelper.call("discord/message", "POST", {message:text, channelId});
		if(res.status != 200) {
			let error = "";
			switch(res.json.errorCode) {
				case "POST_FAILED":
					error = StoreProxy.i18n.t("error.discord.MISSING_ACCESS", {CHANNEL:res.json.channelName});
					break;
				default:
					error = StoreProxy.i18n.t("error.discord.UNKNOWN");
					break;
			}
			const message:TwitchatDataTypes.MessageCustomData = {
				date:Date.now(),
				id:Utils.getUUID(),
				channel_id:channelId,
				platform:"twitchat",
				type:TwitchatDataTypes.TwitchatMessageType.CUSTOM,
				message: error,
				style: "error",
				icon: "alert",
			};
			StoreProxy.chat.addMessage(message);
		}
	}

	/**
	 * Creates a discord ticket
	 */
	private async createDiscordTicket(message:TwitchatDataTypes.MessageChatData):Promise<void> {
		const threadName = message.user.login+" (#"+message.user.id+")";
		const text = `**${message.user.login}** *(#${message.user.id})*:
> ${message.message}`;
		try {
			const channelId = StoreProxy.discord.ticketChanTarget;
			const result = await ApiHelper.call("discord/ticket", "POST", {message:text, channelId, threadName});
			if(result.json.success && result.json.messageLink) {
				MessengerProxy.instance.sendMessage("@"+message.user.login+" "+result.json.messageLink!, [message.platform], message.channel_id)
			}else if(!result.json.success) {
				if(result.json.errorCode == "POST_FAILED") {
					StoreProxy.common.alert(StoreProxy.i18n.t("error.discord.MISSING_ACCESS", {CHANNEL:result.json.channelName}));
					return;
				}else{
					StoreProxy.common.alert(StoreProxy.i18n.t("error.discord.UNKNOWN"));
					return;
				}
			}
		}catch(error) {

		}
	}
}
