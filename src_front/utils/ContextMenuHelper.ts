import ContextMenuTimeoutDuration from "@/components/messages/components/ContextMenuTimeoutDuration.vue";
import TwitchatEvent from "@/events/TwitchatEvent";
import DataStore from "@/store/DataStore";
import StoreProxy from "@/store/StoreProxy";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type * as CMTypes from "@imengyu/vue3-context-menu";
import ContextMenu from "@imengyu/vue3-context-menu";
import { h, reactive, type RendererElement, type RendererNode, type VNode } from "vue";
import PublicAPI from "./PublicAPI";
import TriggerActionHandler from "./triggers/TriggerActionHandler";
import { TwitchScopes } from "./twitch/TwitchScopes";
import TwitchUtils from "./twitch/TwitchUtils";
import domtoimage from 'dom-to-image-more';
import Utils from "./Utils";
import Config from "./Config";

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
	public messageContextMenu(e:MouseEvent|TouchEvent, message:TwitchatDataTypes.ChatMessageTypes, canModerateMessage:boolean=false, canModerateUser:boolean=false, htmlNode:HTMLElement):void {
		const t		= StoreProxy.i18n.t;
		const me	= StoreProxy.auth.twitch.user;
		const options:CMTypes.MenuItem[]= [];
		let px = e.type == "touchstart"? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).x;
		let py = e.type == "touchstart"? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).y;
		const menu	= reactive({
			theme: 'mac '+StoreProxy.main.theme,
			x: px,
			y: py,
			items: [],
		})
		
		if(!DataStore.get(DataStore.TWITCHAT_RIGHT_CLICK_HINT_PROMPT)) {
			//Make sure the hint message is not sent anymore
			DataStore.set(DataStore.TWITCHAT_RIGHT_CLICK_HINT_PROMPT, true);
		}
		

		if(message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE
		|| message.type == TwitchatDataTypes.TwitchatMessageType.WHISPER) {
			const user			= message.user;
			const channelInfo	= user.channelInfo[message.channel_id];
	
			//Header
			options.push({
						label:user.displayName,
						disabled:true,
						customClass:"header"
					});
			
			//Shoutout
			if(canModerateUser) {
				options.push({ 
					label: t("chat.context_menu.shoutout"),
					icon: this.getIcon("icons/shoutout.svg"),
					onClick: () => StoreProxy.users.shoutout(message.channel_id, user),
				});
			}
	
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
					StoreProxy.params.openParamsPage(TwitchatDataTypes.ParameterPages.OVERLAYS, TwitchatDataTypes.ParamDeepSections.HIGHLIGHT);
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
									StoreProxy.chat.deleteMessage(m);
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
		
			//Update "highlight message" state according to overlay presence
			this.getHighlightOverPresence().then(res => {
				const item = menu.items[highlightIndex] as CMTypes.MenuItem;
				item.label = t("chat.context_menu.highlight");
				item.disabled = false;
				if(!res) item.customClass = "no_overlay";//Dirty way of knowing if overlay exists on the click handler of the item
			});
		}

		const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
		if(!isSafari && !Config.instance.OBS_DOCK_CONTEXT) {
			if(message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE
			|| message.type == TwitchatDataTypes.TwitchatMessageType.WHISPER
			|| message.type == TwitchatDataTypes.TwitchatMessageType.HYPE_CHAT
			|| message.type == TwitchatDataTypes.TwitchatMessageType.REWARD
			|| message.type == TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION
			|| message.type == TwitchatDataTypes.TwitchatMessageType.CHEER
			|| message.type == TwitchatDataTypes.TwitchatMessageType.STREAM_OFFLINE
			|| message.type == TwitchatDataTypes.TwitchatMessageType.STREAM_ONLINE
			|| message.type == TwitchatDataTypes.TwitchatMessageType.RAID) {
				//Add splitter after previous item if any
				if(options.length > 0) options[options.length-1].divided = true;
				options.push({ 
							label: Config.instance.OBS_DOCK_CONTEXT? t("chat.context_menu.export_clipboard") : t("chat.context_menu.export"),
							icon: Config.instance.OBS_DOCK_CONTEXT? this.getIcon("icons/copy.svg") : this.getIcon("icons/download.svg"),
							onClick: () => this.exportMessage(message, htmlNode),
						});
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
		const image = StoreProxy.image;
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

	/**
	 * Add custom slash commands created on the triggers
	 * @param options 
	 * @param message 
	 */
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
								| TwitchatDataTypes.MessageRaidData, htmlNode:HTMLElement):Promise<void> {

		StoreProxy.main.messageExportState = "progress";
		let errorTimeout = setTimeout(()=> {
			StoreProxy.main.messageExportState = "error";
		}, 10000)
		const bgcolor = StoreProxy.main.theme == "dark"? "#18181b" : "#EEEEEE";
		const fgcolor = StoreProxy.main.theme == "dark"? "#EEEEEE" : "#18181b";
		let user!:TwitchatDataTypes.TwitchatUser;
		let chanId:string = "";
		if(message.type == TwitchatDataTypes.TwitchatMessageType.HYPE_CHAT){
			user = message.message.user;
			chanId = message.message.channel_id;
		}else if(message.type == TwitchatDataTypes.TwitchatMessageType.STREAM_OFFLINE || message.type == TwitchatDataTypes.TwitchatMessageType.STREAM_ONLINE){
			user = message.info.user;
			chanId = StoreProxy.auth.twitch.user.id;
		}else{
			user = message.user;
			chanId = message.channel_id;
		}
		const messageId = message.type == TwitchatDataTypes.TwitchatMessageType.HYPE_CHAT? message.message.id : message.id;
		const fileName = user.id+"_"+user.login+"_"+messageId;
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
		<div><strong>User login:</strong> ${user.login}</div>
		<div><strong>User ID:</strong> ${user.id}</div>
		<div><strong>Channel ID:</strong> ${chanId}</div>`;
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
			let infoImg = new Image();
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
					let fallBackTO = setTimeout(() => resolve(), 1000);
					imgs.forEach((v:HTMLImageElement)=>{
						// let url = new URL(v.src);
						// url.searchParams.append("ck", Date.now().toString());
						// v.src = url.href;
						v.removeAttribute("loading");
						v.addEventListener("load", ()=>{
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
					let messageImg = new Image();
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
						Utils.downloadFile(fileName+".png", undefined, canvas.toDataURL(), "image/png");
						clone.remove();
						let downloaded = !Config.instance.OBS_DOCK_CONTEXT;
						
						canvas.toBlob((blob)=> {
							navigator.clipboard.write([
								new ClipboardItem({ 'image/png': blob!}),
							]).then(()=>{
								StoreProxy.main.messageExportState = downloaded? "complete" : "complete_copyOnly";
								clearTimeout(errorTimeout);
							}).catch((error)=> {
								console.log(error);
								StoreProxy.main.messageExportState = downloaded? "complete_downloadOnly" : "error";
								clearTimeout(errorTimeout);
							});
						}, "image/png");
					});
					messageImg.setAttribute("src", dataUrl);
				})
				.catch((error:any) => {
					console.error('DOM node export failed', error);
					StoreProxy.main.messageExportState = "error";
					clearTimeout(errorTimeout);
				});
			});
			infoImg.setAttribute("src", infoUrl);
		})
		.catch((error:any) => {
			console.error('DOM node export failed', error);
			StoreProxy.main.messageExportState = "error";
			clearTimeout(errorTimeout);
		});
	}
}