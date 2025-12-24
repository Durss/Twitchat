<template>
	<div class="autocompletechatform blured-background-window">
		<div
		v-for="(i, index) in filteredItems"
		:key="i.id"
		:ref="'item_'+i.id"
		:class="getClasses(index, i)"
		@click="selectItem(i)"
		v-tooltip="{content:i.type=='slashCommand'? i.tooltipKey : ''}">
			<img
				class="image"
				loading="lazy"
				:src="i.emote"
				:alt="i.label"
				v-tooltip="i.label"
				v-if="i.type=='emote'">

			<Icon v-else-if="i.type == 'user'" class="image" name="user" />
			<Icon v-else-if="i.type == 'slashCommand'" class="image" name="commands" alt="cmd" />
			<Icon v-else-if="i.type == 'chatCommand'" class="image" name="chatCommand" alt="cmd" />
			<Icon v-if="i.type == 'slashCommand' && i.rawCmd && i.rawCmd.needAdmin" class="image small" name="lock_fit" alt="user" v-tooltip="$t('global.cmd_admin')" />
			<Icon v-if="i.type == 'slashCommand' && i.rawCmd && i.rawCmd.twitchCmd" class="image small" name="twitch" alt="user" v-tooltip="$t('global.cmd_twitch')" />
			<Icon v-if="i.type == 'slashCommand' && i.rawCmd && i.rawCmd.needModerator" class="image small" name="mod" alt="user" v-tooltip="$t('global.cmd_mod')" />
			<Icon v-if="i.type == 'slashCommand' && i.isTrigger" class="image trigger" name="broadcast" />

			<div class="name">{{i.label}}</div>
			<div class="source" v-if="i.type == 'emote' && i.source">( {{ i.source }} )</div>
			<div class="infos" v-if="i.type == 'slashCommand' && (i.infos || i.infosKey)">{{i.infos || $t(i.infosKey || "")}}</div>
			<div class="name alias" v-else-if="i.type=='slashCommand' && i.alias">(alias: {{i.alias}})</div>
		</div>
		<div v-if="showGrantEmotesPermission" class="item grantPermission" @click="grantEmoteScope()">
			<Icon class="image" name="lock_fit" /> <div class="name">{{ $t("global.emote_scope") }}</div>
		</div>
		<div v-else-if="showEmotesLoading" class="item">
			<Icon class="image" name="loader" /> <i>{{ $t("chat.form.loading_emotes") }}</i>
		</div>
	</div>
</template>

<script lang="ts">
import { TriggerTypes, type TriggerData } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import BTTVUtils from '@/utils/emotes/BTTVUtils';
import FFZUtils from '@/utils/emotes/FFZUtils';
import SevenTVUtils from '@/utils/emotes/SevenTVUtils';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { watch } from '@vue/runtime-core';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';
import { TTButton } from '../TTButton.vue';

@Component({
	components:{
		TTButton,
	},
	emits:["selectItem", "close"]
})
/**
 * This component is used to select an emote by typing ":xxx" on the
 * message field.
 */
class AutocompleteChatForm extends Vue {

	@Prop
	public search!:string;
	@Prop
	public emotes!:boolean;
	@Prop
	public users!:boolean;
	@Prop
	public commands!:boolean;

	public selectedIndex = 0;
	public showEmotesLoading = false;
	public showGrantEmotesPermission = false;
	public filteredItems:ListItem[] = [];
	public triggerCommands:TriggerData[] = [];

	private keyUpHandler!:(e:KeyboardEvent) => void;
	private keyDownHandler!:(e:KeyboardEvent) => void;
	private emotesRequestToken = 0;

	public getClasses(index:number, item:ListItem):string[] {
		let res = ["item"];
		if(index == this.selectedIndex)				res.push('selected');
		if(item.type == "slashCommand" && item.disabled)	res.push('disabled');
		if(item.type == "slashCommand" && item.rawCmd) {
			if(item.rawCmd.needAdmin)		res.push('admin');
			if(item.rawCmd.needModerator)	res.push('mod');
			if(item.rawCmd.needBroadcaster)	res.push('mod');
		}
		res.push(item.type);
		return res;
	}

	public mounted():void {
		this.selectedIndex = 0;

		this.triggerCommands = this.$store.triggers.triggerList.filter(v=> v.type == TriggerTypes.SLASH_COMMAND || v.type == TriggerTypes.CHAT_COMMAND);

		this.keyUpHandler = (e:KeyboardEvent)=> this.onkeyUp(e);
		this.keyDownHandler = (e:KeyboardEvent)=> this.onkeyDown(e);
		document.addEventListener("keyup", this.keyUpHandler,);
		document.addEventListener("keydown", this.keyDownHandler);

		watch(()=>this.search, ()=>{
			this.onSearchChange();
		});
		this.onSearchChange();
	}

	public beforeUnmount():void {
		this.emotesRequestToken = -1;
		document.removeEventListener("keyup", this.keyUpHandler);
		document.removeEventListener("keydown", this.keyDownHandler);
	}

	/**
	 * Select an item via click or enter key
	 * @param item
	 */
	public selectItem(item:ListItem):void {
		if(item.type == "slashCommand") {
			if(item.disabled) {
				if(item.rawCmd && item.rawCmd.twitch_scopes) {
					this.$store.auth.requestTwitchScopes(item.rawCmd.twitch_scopes);
				}else
				if(item.rawCmd && item.rawCmd.needTTS) {
					this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.TTS);
				}
			}else{
				this.$emit("selectItem", item.cmd);
			}
		}else{
			const prefix = (item.type == "user")? "@": "";
			this.$emit("selectItem", prefix + item.label);
		}
	}

	/**
	 * Navigate through list via keyboard
	 */
	public onkeyUp(e:KeyboardEvent):void {
		switch(e.key) {
			case "Escape":
				this.$emit("close");
				break;
			case "Enter": {
				const item = this.filteredItems[this.selectedIndex];
				if(item) {
					e.preventDefault();
					e.stopPropagation();
					this.selectItem(item);
				}
				break;
			}
		}
	}

	/**
	 * Navigate through list via keyboard
	 */
	public onkeyDown(e:KeyboardEvent):void {
		switch(e.key) {
			case "PageUp":{
				this.selectedIndex -= 10;
				e.preventDefault();
				break;
			}
			case "PageDown":{
				this.selectedIndex += 10;
				e.preventDefault();
				break;
			}
			case "ArrowUp":{
				this.selectedIndex --;
				e.preventDefault();
				break;
			}
			case "ArrowDown":{
				this.selectedIndex ++;
				e.preventDefault();
				break;
			}
			case "Tab":{
				e.preventDefault();
				e.stopPropagation();
				this.selectItem(this.filteredItems[this.selectedIndex]!);
				break;
			}
			default: return;
		}

		const len = this.filteredItems.length;
		if(len === 0) return;

		this.selectedIndex = this.selectedIndex%len;
		if(this.selectedIndex < 0) this.selectedIndex = len-1;
		let el = this.$refs["item_"+this.filteredItems[this.selectedIndex]!.id] as HTMLElement[];
		if(el.length > 0) {
			el[0]!.scrollIntoView({block: "center", inline: "nearest"});
		}
	}

	/**
	 * Requests for emote scope
	 */
	public grantEmoteScope():void {
		TwitchUtils.requestScopes([TwitchScopes.READ_EMOTES]);
		this.$emit("close")
	}

	/**
	 * Called when writing somehting.
	 * Search any item matching the search
	 */
	private onSearchChange():void {
		let res:ListItem[] = [];
		const sUsers = this.$store.users;
		const sAuth = this.$store.auth;
		const sChat = this.$store.chat;
		const sTTS = this.$store.tts;
		const sDiscord = this.$store.discord;
		const s = this.search.toLowerCase();
		if(s?.length > 0) {
			//Search for users
			if(this.users) {
				const users = sUsers.users;
				for (let j = 0; j < users.length; j++) {
					const userName = users[j]!.displayNameOriginal;
					if(userName.toLowerCase().indexOf(s) == 0) {
						res.push({
							type:"user",
							label:userName,
							id:userName,
						});
					}
				}
			}

			//Search for emotes
			if(this.emotes) {
				let emotes = TwitchUtils.emotesCache ?? [];
				if(TwitchUtils.hasScopes([TwitchScopes.READ_EMOTES])) {
						if(emotes.length === 0) {
							// Emotes not loaded yet, load them or wait for them to load
							this.showEmotesLoading = true;
							this.emotesRequestToken++;
							const currentToken = this.emotesRequestToken;
							TwitchUtils.getEmotes().then(()=> {
								if (this.emotesRequestToken === currentToken) {
									this.showEmotesLoading = false;
									this.onSearchChange();
								}
							}).catch(() => {
								if (this.emotesRequestToken === currentToken) {
									this.showEmotesLoading = false;
								}
							})
							this.showGrantEmotesPermission = false;
						}
					}else{
						this.showGrantEmotesPermission = true;
					}
				if(this.$store.params.appearance.bttvEmotes.value === true) {
					emotes = emotes.concat(BTTVUtils.instance.emotes);
				}

				if(this.$store.params.appearance.sevenTVEmotes.value === true) {
					emotes = emotes.concat(SevenTVUtils.instance.emotes);
				}

				if(this.$store.params.appearance.ffzEmotes.value === true) {
					emotes = emotes.concat(FFZUtils.instance.emotes);
				}

				if(emotes) {
					for (const e of emotes) {
						if(e.code.toLowerCase().indexOf(s) > -1) {
							res.push({
								type:"emote",
								label:e.code,
								emote:e.images.url_1x,
								id:e.id,
								source:e.source
							});
						}
					}
				}
			}
			
			//Search for slash commands
			if(this.commands) {
				const currentChanId = this.$store.stream.currentChatChannel.id;
				const me = sAuth.twitch.user;
				const cmds = sChat.commands;
				const hasChannelPoints = me.is_affiliate || me.is_partner;
				const hasDiscordCmd = sDiscord.discordLinked && sDiscord.chatCmdTarget;
				const isBroadcaster = me.id === currentChanId;
				const isAdmin = this.$store.auth.twitch.user.is_admin === true;
				const isMod = me.channelInfo[currentChanId]?.is_moderator === true;

				//Search in global slash commands
				for (let j = 0; j < cmds.length; j++) {
					const e = cmds[j] as TwitchatDataTypes.CommandData;
					if(e.cmd.toLowerCase().indexOf(s) > -1
					|| e.alias?.toLowerCase().indexOf(s) > -1) {
						let disabled = false;

						//Remove TTS related commands if TTS isn't enabled
						if(e.needTTS === true && !sTTS.params.enabled) disabled = true;

						//Remove admin specific commands if we're not an admin
						if(e.needAdmin === true && !isAdmin) continue;

						//Remove broadcaster specific commands if we're not a mod
						if(e.needBroadcaster === true && !isBroadcaster) continue;

						//Remove moderator specific commands if we're not a mod
						if(e.needModerator === true && !isMod) continue;

						//Remove channel point related commands if user isn't affiliate or partner
						if(e.needChannelPoints === true && !hasChannelPoints) continue;

						//Remove discord related command if discord not configured
						if(e.needDiscordChan === true && !hasDiscordCmd) continue;

						res.push({
							type:"slashCommand",
							label:e.cmd.replace(/{(.*?)\}/gi, "$1"),
							cmd:e.cmd,
							infos:e.details,
							infosKey:e.detailsKey,
							id:e.id,
							alias:e.alias?.replace(/{(.*?)\}/gi, "$1"),
							disabled: disabled || (e.twitch_scopes !== undefined && !TwitchUtils.hasScopes(e.twitch_scopes)),
							rawCmd:e,
						});
					}
				}

				//Search on custom slash commands in the triggers
				for (const t of this.triggerCommands) {
					if(!t.enabled) continue;
					if(t.chatCommand && t.chatCommand.toLowerCase().indexOf(s) > -1) {
						const params = t.chatCommandParams ?? [];
						let paramsTxt = params.length > 0? " "+params.map(v=> "{"+v.tag+"}").join(" ") : "";
						if(!t.enabled) {
							paramsTxt += " "+this.$t("chat.form.trigger_cmd_disabled")
						}

						res.push({
							type:t.type == TriggerTypes.CHAT_COMMAND? "chatCommand" : "slashCommand",
							label:t.chatCommand + paramsTxt.replace(/\{/g, "[").replace(/\}/g, "]"),
							cmd:t.chatCommand + paramsTxt,
							infos:t.name ?? "",
							isTrigger:true,
							id:t.id,
							disabled:!t.enabled,
							tooltipKey:t.enabled? "" : this.$t("chat.form.trigger_cmd_disabled_tt"),
						});
					}
				}
			}

			res.sort((a,b)=> {
				if(a.type == "slashCommand" && b.type == "slashCommand") {
					if(a.disabled && !b.disabled) return 1;
					if(!a.disabled && b.disabled) return -1;
					if(a.rawCmd && !b.rawCmd) return -1;
					if(!a.rawCmd && b.rawCmd) return 1;
					if(a.rawCmd && b.rawCmd) {
						if(a.rawCmd.needAdmin && !b.rawCmd.needAdmin) return -1;
						if(!a.rawCmd.needAdmin && b.rawCmd.needAdmin) return 1;
						if(a.rawCmd.needModerator && !b.rawCmd.needModerator) return -1;
						if(!a.rawCmd.needModerator && b.rawCmd.needModerator) return 1;
						if(a.rawCmd.twitchCmd && !b.rawCmd.twitchCmd) return -1;
						if(!a.rawCmd.twitchCmd && b.rawCmd.twitchCmd) return 1;
					}
				}
				if(a.label < b.label) return -1;
				if(a.label > b.label) return 1;
				return 0;
			})

			this.filteredItems = res;
		}

		if(this.filteredItems.length == 0 && !this.showEmotesLoading) {
			this.$emit("close");
		}
	}
}

type ListItem = UserItem | EmoteItem | CommandItem;

interface UserItem {
	type:"user";
	id:string;
	label:string;
}

interface EmoteItem {
	type:"emote";
	id:string;
	label:string;
	emote:string;
	source?:"BTTV"|"FFZ"|"7TV";
}

interface CommandItem {
	/**
	 * chatCommand starts with "!" and slashCommand starts with "/"
	 */
	type:"slashCommand"|"chatCommand";
	id:string;
	label:string;
	cmd:string;
	infos?:string;
	infosKey?:string;
	alias?:string;
	disabled?:boolean;
	tooltipKey?:string;
	rawCmd?:TwitchatDataTypes.CommandData;
	isTrigger?:boolean;
}
export default toNative(AutocompleteChatForm);
</script>

<style scoped lang="less">
.autocompletechatform{
	padding: 10px;
	box-shadow: 0px 0px 20px 0px rgba(0,0,0,1);
	border-radius: 10px;
	max-width: 100%;
	display: flex;
	flex-direction: column;
	transform-origin: bottom center;
	left: auto;
	margin-left: auto;
	right: 0;
	overflow-x: hidden;
	overflow-y: auto;
	max-height: 80vh;

	.item {
		gap: 5px;
		display: flex;
		flex-direction: row;
		align-items: center;
		flex-wrap: wrap;
		cursor: pointer;
		min-height: 1.8em;
		color: var(--color-text);

		&.selected, &:hover {
			background-color: var(--background-color-fader);
		}

		&.slashCommand, &.chatCommand {
			// display: flex;
			// flex-direction: row;
			// justify-content: space-between;
			// align-items: center;
			.name {
				flex-grow: 1;
				white-space: nowrap;
				margin-right: 5px;
			}
			.image {
				padding: 5px;
			}

			&.admin {
				background-color: var(--color-secondary-fadest);

				&.selected, &:hover {
					background-color: var(--color-secondary-fader);
				}
			}

			&.mod {
				background-color: var(--color-primary-fadest);

				&.selected, &:hover {
					background-color: var(--color-primary-fader);
				}
			}
			&.disabled {
				// pointer-events: none;
				opacity: .5;
				font-style: italic;
			}
		}

		&.grantPermission {
			background-color: var(--color-secondary);
			border-radius: var(--border-radius);
			.image {
				width: auto;
				height: 1.5em;
				margin: 0 .25em;
			}
		}

		.name, .source {
			font-size: .8em;
			flex-grow:1;
		}

		.source {
			opacity: .5;
			margin-left: .5em;
		}

		.infos {
			font-size: .7em;
			font-style: italic;
			text-align: right;
			padding-right: .5em;
			opacity: .8;
		}

		.image {
			height: 1.5em;
			padding: .2em;
			object-fit: fill;
			&.small {
				height: 1em;
				width: 1em;
				padding: .1em;
			}
		}
		.alias {
			flex-basis: 100%;
			margin-left: 3em;
			font-style: italic;
			opacity: .8;
		}
	}
}
</style>
