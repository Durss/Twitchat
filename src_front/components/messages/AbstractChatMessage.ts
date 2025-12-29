import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import ContextMenuHelper from '@/utils/ContextMenuHelper';
import PublicAPI from '@/utils/PublicAPI';
import Utils from '@/utils/Utils';
import { gsap } from 'gsap/gsap-core';
import { watch } from 'vue';
import { ComponentBase, Prop, Vue } from 'vue-facing-decorator';

@ComponentBase({
    name: "AbstractChatMessage"
})
export default class AbstractChatMessage extends Vue {

	@Prop
	public messageData!:TwitchatDataTypes.ChatMessageTypes;

	@Prop
	public childrenList!:TwitchatDataTypes.ChatMessageTypes[];
	
	@Prop({type:Boolean, default:false})
	public lightMode!:boolean;
	
	@Prop({type:Boolean, default:false})
	public contextMenuOff!:boolean;

	public time:string = "";

	protected canModerateMessage:boolean = false;
	protected canModerateUser_local:boolean = false;
	private refreshTimeout:number = -1;
	private clickHandler!:(e:MouseEvent)=>void;

	/**
	 * Check if the currently authenticated user can moderate the message
	 */
	public canModerateUser(user:TwitchatDataTypes.TwitchatUser, channelId:string):boolean {
		const authenticatedUser = user.platform == "youtube"? this.$store.auth.youtube.user : this.$store.auth.twitch.user;
		//Authenticated user may be undefined if disconnecting youtube but youtube messages are
		//loaded back from DB.
		if(!authenticatedUser?.channelInfo[channelId]) return false;
		return (
					//If broadcaster of the channel... or
					authenticatedUser.channelInfo[channelId]?.is_broadcaster ||
					//If moderator on this channel and user to moderate isn't also a moderator
					(authenticatedUser.channelInfo[channelId]?.is_moderator && !user.channelInfo[channelId]?.is_moderator)
				)
				//If not self
				&& user.id != authenticatedUser.id
	}

	// public beforeUpdate() {
	// 	console.log("UPDATE", this.messageData.type);
	// }

	public beforeMount() {
		if(this.messageData.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE
		|| this.messageData.type == TwitchatDataTypes.TwitchatMessageType.WHISPER) {
			this.canModerateUser_local = this.canModerateUser(this.messageData.user, this.messageData.channel_id);
		}else if(this.messageData.type == TwitchatDataTypes.TwitchatMessageType.HYPE_CHAT) {
			this.canModerateUser_local = this.canModerateUser(this.messageData.message.user, this.messageData.message.channel_id);
		}
		
		if(this.messageData.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE
		|| this.messageData.type == TwitchatDataTypes.TwitchatMessageType.HYPE_CHAT) {
			this.canModerateMessage = this.canModerateUser_local
									//If it's not announcement (they're not deletable)
									&& (!("twitch_announcementColor" in this.messageData) || this.messageData.twitch_announcementColor == undefined)
									//If message is not older than 6h. Passed this we cannot delete a message on Twitch
									&& Date.now() - this.messageData.date < 6 * 60 * 60000;
		}

		this.refreshDate();
		//Watch for "relative" param update to refresh time accordingly
		watch(()=>this.$store.params.appearance.displayTimeRelative.value, ()=> {
			clearTimeout(this.refreshTimeout);
			this.refreshDate();
		})
	}

	public mounted():void {
		this.clickHandler = (e:MouseEvent)=> {
			if(e.ctrlKey || e.metaKey) {
				this.copyJSON();
				e.stopPropagation();
			}else{
				this.$emit("onRead", this.messageData, e);
			}
		}
		this.$el.addEventListener("click", this.clickHandler);

		//Apply styles and watch for params change for caht messages
		if(this.messageData.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
			this.applyStyles();
	
			const params = this.$store.params.appearance;
			watch(()=> params.highlight1stEver.value, ()=> this.applyStyles());
			watch(()=> params.highlight1stEver_color.value, ()=> this.applyStyles());
			watch(()=> params.highlight1stToday.value, ()=> this.applyStyles());
			watch(()=> params.highlight1stToday_color.value, ()=> this.applyStyles());
			watch(()=> params.highlightMentions.value, ()=> this.applyStyles());
			watch(()=> params.highlightMentions_color.value, ()=> this.applyStyles());
			watch(()=> params.raidHighlightUser.value, ()=> this.applyStyles());
			watch(()=> params.raidHighlightUser_color.value, ()=> this.applyStyles());
			watch(()=> params.highlightMods.value, ()=> this.applyStyles());
			watch(()=> params.highlightMods_color.value, ()=> this.applyStyles());
			watch(()=> params.highlightVips.value, ()=> this.applyStyles());
			watch(()=> params.highlightVips_color.value, ()=> this.applyStyles());
			watch(()=> params.highlightPartners.value, ()=> this.applyStyles());
			watch(()=> params.highlightPartners_color.value, ()=> this.applyStyles());
			watch(()=> params.highlightSubs.value, ()=> this.applyStyles());
			watch(()=> params.highlightSubs_color.value, ()=> this.applyStyles());
		}
	}

	public beforeUnmount():void {
		clearTimeout(this.refreshTimeout);
		this.$el.removeEventListener("click", this.clickHandler);
	}

	/**
	 * Refreshes the date at a regular interval if needed
	 */
	public refreshDate() {
		const elapsedMode = this.$store.params.appearance.displayTimeRelative.value === true;
		const d = new Date(this.messageData.date);
		
		if(elapsedMode) {
			const elapsed = Date.now() - d.getTime();
			const step = elapsed < 60000? 1000 : elapsed < 60000*5? 5000 : elapsed < 60000*10? 10000 : 60000;
			
			this.time = Utils.elapsedDuration(d.getTime(), step);
			
			clearTimeout(this.refreshTimeout);
			this.refreshTimeout = window.setTimeout(()=> {
				this.refreshDate();
			}, step);
		}else{
			this.time = Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes());
		}
	}

	/**
	 * Copy JSON data of the message
	 */
	public copyJSON():void {
		Utils.copyToClipboard(JSON.stringify(this.messageData));
		console.log(this.messageData);
		gsap.fromTo(this.$el, {scale:1.2}, {duration:.5, scale:1, ease:"back.out(1.7)"});
	}

	/**
	 * Apply custom highlight colors
	 */
	public applyStyles():void {
		if(this.lightMode !== false) return;

		if(this.messageData.type != TwitchatDataTypes.TwitchatMessageType.MESSAGE) return;

		if(this.messageData.twitch_automod) return;
		if(this.messageData.automod) return;

		const holder = this.$el as HTMLElement;
		const params = this.$store.params.appearance;
		const chanInfo = this.messageData.user.channelInfo[this.messageData.channel_id];
		let color = "";
		if(this.messageData.twitch_isFirstMessage && params.highlight1stEver.value === true) {
			color = params.highlight1stEver_color.value as string;
		}else
		if(this.messageData.todayFirst && params.highlight1stToday.value === true) {
			color = params.highlight1stToday_color.value as string;
		}else
		if(this.messageData.hasMention && params.highlightMentions.value === true) {
			color = params.highlightMentions_color.value as string;
		}else
		if(chanInfo && chanInfo.is_raider && params.raidHighlightUser.value === true) {
			color = params.raidHighlightUser_color.value as string;
			//Watch for change to remove border when raider highlight
			//duration has complete for this user
			watch(()=> chanInfo.is_raider, () => {
				this.applyStyles();
			});
		}else
		if(chanInfo && chanInfo.is_moderator && params.highlightMods.value === true) {
			color = params.highlightMods_color.value as string;
		}else
		if(chanInfo && chanInfo.is_vip && params.highlightVips.value === true) {
			color = params.highlightVips_color.value as string;
		}else
		if(this.messageData.user.is_partner && params.highlightPartners.value === true) {
			color = params.highlightPartners_color.value as string;
		}else
		if(chanInfo && chanInfo.is_subscriber && params.highlightSubs.value === true) {
			color = params.highlightSubs_color.value as string;
		}
		if(color) {
			holder.style.border = "1px solid "+color+"90";
			// holder.style.borderLeftWidth = "10px";
			holder.style.backgroundColor = color+"10";
		}else{
			holder.style.border = "";
			holder.style.backgroundColor = "";
		}
	}

	/**
	 * Open the context menu on right click on desktop or long press on mobile
	 * 
	 * @param e 
	 */
	public onContextMenu(e:MouseEvent|TouchEvent, message:TwitchatDataTypes.ChatMessageTypes, htmlNode:HTMLElement):void {
		if(this.contextMenuOff !== false) return;
		if(e.target) {
			const el = e.target as HTMLElement;
			if(el.tagName == "A" && el.dataset.login === undefined) return;
		}
		if(window.getSelection()?.isCollapsed == false) return;
		const canModerate = this.canModerateMessage && message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE;
		
		ContextMenuHelper.instance.messageContextMenu(e, message, canModerate, this.canModerateUser_local, htmlNode);
		e.stopPropagation();
	}

	/**
	 * Opens up a user card
	 * @param user 
	 */
	public openUserCard(user:TwitchatDataTypes.TwitchatUser, chanId?:string, platform?:TwitchatDataTypes.ChatPlatform):void {
		this.$store.users.openUserCard(user, chanId, platform);
	}

	/**
	 * Delete current message from history
	 */
	public deleteMessage():void {
		this.$store.chat.deleteMessage(this.messageData);
	}

	/**
	 * Get user's profile page
	 */
	public getProfilePage(user:TwitchatDataTypes.TwitchatUser):string{
		switch(this.messageData.platform) {
			case "twitch": {
				return "https://www.twitch.tv/"+user.login;
			}
			case "youtube": {
				return "https://www.youtube.com/channel/"+user.id;
			}
		}
		return "#";
	}
}