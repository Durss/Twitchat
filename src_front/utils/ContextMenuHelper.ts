import DataStore from "@/store/DataStore";
import StoreProxy from "@/store/StoreProxy";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import ContextMenu from "@imengyu/vue3-context-menu";
import type * as CMTypes from "@imengyu/vue3-context-menu";
import TwitchUtils from "./twitch/TwitchUtils";
import { TwitchScopes } from "./twitch/TwitchScopes";
import { h, reactive, type RendererElement, type RendererNode, type VNode } from "vue";
import ContextMenuTimeoutDuration from "@/components/messages/components/ContextMenuTimeoutDuration.vue";
import PublicAPI from "./PublicAPI";
import TwitchatEvent from "@/events/TwitchatEvent";
import TriggerActionHandler from "./triggers/TriggerActionHandler";

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
	public messageContextMenu(e:MouseEvent|TouchEvent, message:TwitchatDataTypes.MessageChatData|TwitchatDataTypes.MessageWhisperData, canModerateMessage:boolean=false, canModerateUser:boolean=false):void {
		const t				= StoreProxy.i18n.t;
		const me			= StoreProxy.auth.twitch.user;
		const channelInfo	= message.user.channelInfo[message.channel_id];

		e.preventDefault();

		let px = e.type == "touchstart"? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).x;
		let py = e.type == "touchstart"? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).y;
		
		if(!DataStore.get(DataStore.TWITCHAT_RIGHT_CLICK_HINT_PROMPT)) {
			//Make sure the hint message is not sent anymore
			DataStore.set(DataStore.TWITCHAT_RIGHT_CLICK_HINT_PROMPT, "true")
		}

		const options:CMTypes.MenuItem[]= [];
		const user = message.user;

		//Header
		options.push({
					label:user.displayName,
					disabled:true,
					customClass:"header"
				});
		
		//Shoutout
		options.push({ 
					label: t("chat.context_menu.shoutout"),
					icon: this.getIcon("icons/shoutout.svg"),
					onClick: () => StoreProxy.users.shoutout(message.channel_id, user),
				});

		//Reply
		if(message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
			options.push({ 
						label: t("chat.context_menu.answer"),
						icon: this.getIcon("icons/reply.svg"),
						onClick: () => {
							StoreProxy.chat.replyTo = message as TwitchatDataTypes.MessageChatData;
						}
					});
		}

		//Trakc/untrack user
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
		let highlightIndex = options.length;
		options.push({ 
			label: t("chat.context_menu.highlight_loading"),
			icon: this.getIcon("icons/highlight.svg"),
			disabled:true,
		});
		options[highlightIndex].onClick = () => {
			if(options[highlightIndex].customClass == "no_overlay") {
				//Open parameters if overlay is not found
				StoreProxy.params.openParamsPage(TwitchatDataTypes.ParameterPages.OVERLAYS, TwitchatDataTypes.ParamOverlaySections.HIGHLIGHT);
			}else{
				StoreProxy.chat.highlightChatMessageOverlay(message)
			}
		};
		
		//Save/unsave
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
					onClick: () => StoreProxy.users.openUserCard(user, message.channel_id),
				});

		//Moderation actions
		if(canModerateMessage) {
			//Add splitter after previous item
			options[options.length-1].divided = true;
			//Pin/Unpin message
			const m:TwitchatDataTypes.MessageChatData = message as TwitchatDataTypes.MessageChatData;
			options.push({ 
						label: m.is_pinned === true? t("chat.context_menu.unpin_twitch") : t("chat.context_menu.pin_twitch"),
						icon: m.is_pinned === true? this.getIcon("icons/unpin.svg") : this.getIcon("icons/pin.svg"),
						customClass:"disabled",
						onClick: () => {
							StoreProxy.main.alert(t("error.no_pin_api"));
						},
					});
					
			//Delete message
			let classes = "alert";
			if(m.deleted!== true) {
				if(!TwitchUtils.hasScopes([TwitchScopes.DELETE_MESSAGES])) classes += " disabled";
				options.push({ 
							label: t("chat.context_menu.delete"),
							icon: this.getIcon("icons/trash.svg"),
							customClass:classes,
							onClick: () => {
								if(!TwitchUtils.hasScopes([TwitchScopes.DELETE_MESSAGES])) {
									!TwitchUtils.requestScopes([TwitchScopes.DELETE_MESSAGES]);
									return;
								}
								StoreProxy.chat.deleteMessageByID(m.id)
							},
						});
			}
		}

		//User moderation actions
		if(canModerateUser) {
			let classesBan = "alert";
			if(!TwitchUtils.hasScopes([TwitchScopes.EDIT_BANNED])) classesBan += " disabled";
			let classesBlock = "alert";
			if(!TwitchUtils.hasScopes([TwitchScopes.EDIT_BLOCKED])) classesBlock += " disabled";
			if(!canModerateMessage) options[options.length-1].divided = true;

			//Timeout
			options.push(
					{ 
						label: t("chat.context_menu.to"),
						customClass:classesBan,
						icon: this.getIcon("icons/timeout.svg"),
						onClick: () => {
							this.timeoutUser(message, 1);
						},
						children: [
							{
								label: "1s",
								customClass:classesBan,
								onClick: () => this.timeoutUser(message, 1),
							},
							{
								label: "10s",
								customClass:classesBan,
								onClick: () => this.timeoutUser(message, 10),
							},
							{
								label: "1m",
								customClass:classesBan,
								onClick: () => this.timeoutUser(message, 60),
							},
							{
								label: "5m",
								customClass:classesBan,
								onClick: () => this.timeoutUser(message, 60 * 5),
							},
							{
								label: "10m",
								customClass:classesBan,
								onClick: () => this.timeoutUser(message, 60 * 10),
							},
							{
								label: "30m",
								customClass:classesBan,
								onClick: () => this.timeoutUser(message, 60 * 30),
							},
							{
								label: "1h",
								customClass:classesBan,
								onClick: () => this.timeoutUser(message, 60 * 60),
							},
							{
								label: "24h",
								customClass:classesBan,
								onClick: () => this.timeoutUser(message, 60 * 60 * 24),
							},
							{
								label: "1w",
								customClass:classesBan,
								onClick: () => this.timeoutUser(message, 60 * 60 * 24 * 7),
							},
							{
								label: "4w",
								customClass:classesBan,
								onClick: () => this.timeoutUser(message, 60 * 60 * 24 * 7 * 4),
							},
							{
								label: "1w",
								customRender: () => h(ContextMenuTimeoutDuration, {
									user:message.user,
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
							customClass:classesBan,
							onClick: () => {
								if(!TwitchUtils.requestScopes([TwitchScopes.EDIT_BANNED])) return;
								TwitchUtils.unbanUser(user, message.channel_id);
							},
						});
			}else{
				options.push({ 
							label: t("chat.context_menu.ban"),
							icon: this.getIcon("icons/ban.svg"),
							customClass:classesBan,
							onClick: () => this.banUser(message, message.channel_id),
						});
			}

			//Message not posted on our own channel, add a button to ban on our own channel.
			if(message.channel_id != me.id) {
				if(message.user.channelInfo[me.id]?.is_banned) {
					options.push({ 
							label: t("chat.context_menu.unban_myRoom"),
							icon: this.getIcon("icons/unban.svg"),
							customClass:classesBan,
							onClick: () => {
								if(!TwitchUtils.requestScopes([TwitchScopes.EDIT_BANNED])) return;
								TwitchUtils.unbanUser(user, me.id);
							},
						});
				}else{
					options.push({ 
							label: t("chat.context_menu.ban_myRoom"),
							icon: this.getIcon("icons/ban.svg"),
							customClass:classesBan,
							onClick: () => this.banUser(message, me.id),
						});
				}
			}

			//Block/unblock user
			if(message.user.is_blocked) {
				options.push({ 
							label: t("chat.context_menu.unblock"),
							icon: this.getIcon("icons/unblock.svg"),
							customClass:classesBlock,
							onClick: () => {
								if(!TwitchUtils.requestScopes([TwitchScopes.EDIT_BLOCKED])) return;
								TwitchUtils.unblockUser(user);
							},
						});
			}else{
				options.push({ 
							label: t("chat.context_menu.block"),
							icon: this.getIcon("icons/block.svg"),
							customClass:classesBlock,
							onClick: () => this.blockUser(message),
						});
			}
		}

		this.addCustomTriggerEntries(options, message);

		options.forEach(v=> {
			v.clickableWhenHasChildren = true;
		})
		const menu = reactive({
			theme: 'mac dark',
			x: px,
			y: py,
			items: options,
		})
		ContextMenu.showContextMenu(menu);
		
		//Update "highlight message" state according to overlay presence
		this.getHighlightOverPresence().then(res => {
			const item = menu.items[highlightIndex];
			item.label = t("chat.context_menu.highlight");
			item.disabled = false;
			if(!res) item.customClass = "no_overlay";//Dirty way of knowing if overlay exists on the click handler of the item
		});
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private initialize():void {
	}

	private getIcon(icon:string):VNode<RendererNode, RendererElement> {
		const image = StoreProxy.image;
		return h('img', {
			src: image(icon),
			style: {
			width: '1em',
			height: '1em',
			}
		})
	}

	private getHTMLLabel(labelKey:string):VNode<RendererNode, RendererElement> {
		const t = StoreProxy.i18n.t;
		return h("span", {class:"label", innerHTML:t(labelKey)});
	}

	/**
	 * Timeouts a user
	 * 
	 * @param duration ban duration. Don't specify to perma ban
	 */
	private timeoutUser(message:TwitchatDataTypes.MessageChatData|TwitchatDataTypes.MessageWhisperData, duration:number):void {
		if(!TwitchUtils.requestScopes([TwitchScopes.EDIT_BANNED])) return;
		if(message.fake === true) {
			//Avoid banning user for real if doing it from a fake message
			StoreProxy.users.flagBanned(message.platform, message.channel_id, message.user.id, duration);
		}else{
			TwitchUtils.banUser(message.user, message.channel_id, duration);
		}
	}

	/**
	 * Permanently ban a user after confirmation
	 */
	private banUser(message:TwitchatDataTypes.MessageChatData|TwitchatDataTypes.MessageWhisperData, channelId:string):void {
		if(!TwitchUtils.requestScopes([TwitchScopes.EDIT_BANNED])) return;
		const t = StoreProxy.i18n.t;
		StoreProxy.main.confirm(t("chat.mod_tools.ban_confirm_title", {USER:message.user.displayName}), t("chat.mod_tools.ban_confirm_desc"))
		.then(() => {
			if(message.fake === true) {
				//Avoid banning user for real if doing it from a fake message
				StoreProxy.users.flagBanned(message.platform, channelId, message.user.id);
			}else{
				TwitchUtils.banUser(message.user, channelId, undefined, t("global.moderation_action.ban_reason"));
			}
		})
	}

	/**
	 * Block a user after confirmation
	 */
	private blockUser(message:TwitchatDataTypes.MessageChatData|TwitchatDataTypes.MessageWhisperData):void {
		if(!TwitchUtils.requestScopes([TwitchScopes.EDIT_BLOCKED])) return;
		const t = StoreProxy.i18n.t;
		StoreProxy.main.confirm(t("chat.mod_tools.block_confirm_title", {USER:message.user.displayName}), t("chat.mod_tools.block_confirm_desc"))
		.then(() => {
			if(message.fake === true) {
				//Avoid banning user for real if doing it from a fake message
				StoreProxy.users.flagBlocked(message.platform, message.user.id);
			}else{
				TwitchUtils.blockUser(message.user);
			}
		})
	}

	/**
	 * Check if the "chat highlight" overlay exists or not
	 */
	private getHighlightOverPresence():Promise<boolean> {
		return new Promise((resolve, reject)=> {
			const timeout = setTimeout(() =>{
				resolve(false);
				PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_HIGHLIGHT_OVERLAY_PRESENCE, handler);
			}, 1000)
			let handler = (e:TwitchatEvent)=> {
				clearTimeout(timeout)
				resolve(true);
				PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_HIGHLIGHT_OVERLAY_PRESENCE, handler);
			}
			PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_HIGHLIGHT_OVERLAY_PRESENCE, handler);
			PublicAPI.instance.broadcast(TwitchatEvent.GET_CHAT_HIGHLIGHT_OVERLAY_PRESENCE);
		})
	}

	private addCustomTriggerEntries(options:CMTypes.MenuItem[], message:TwitchatDataTypes.MessageChatData|TwitchatDataTypes.MessageWhisperData):void {
		const items = StoreProxy.triggers.triggerList.filter(v=> v.addToContextMenu === true);
		for (let i = 0; i < items.length; i++) {
			const trigger = items[i];
			if(i===0) {
				options[options.length-1].divided = true;
			}
			options.push({ 
				label: trigger.chatCommand,
				icon: this.getIcon("icons/commands.svg"),
				onClick: () => {
					TriggerActionHandler.instance.executeTrigger(trigger, message, false, trigger.chatCommand);
				},
			});
		}
	}
}