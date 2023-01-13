<template>
	<div class="AutocompleteChatForm">
		<div
		v-for="(i, index) in filteredItems"
		:key="i.id"
		:ref="'item_'+i.id"
		:class="getClasses(index, i)"
		@click="selectItem(i)">
			<img
				class="image"
				loading="lazy" 
				:src="i.emote"
				:alt="i.label"
				:data-tooltip="i.label"
				v-if="i.type=='emote'">
			
			<img v-else-if="i.type == 'user'" class="image" src="@/assets/icons/user.svg" alt="user">

			<img v-else-if="i.type == 'cmd'" class="image" src="@/assets/icons/commands.svg" alt="cmd">
			<img v-if="i.type == 'cmd' && i.admin" class="image small" src="@/assets/icons/lock_fit.svg" alt="user" :data-tooltip="$t('global.cmd_admin')">
			<img v-if="i.type == 'cmd' && i.mod" class="image small" src="@/assets/icons/twitch_white.svg" alt="user" :data-tooltip="$t('global.cmd_mod')">

			<div class="name">{{i.label}}</div>
			<div class="source" v-if="i.type == 'emote' && i.source">( {{ i.source }} )</div>
			<div class="infos" v-if="i.type == 'cmd' && i.infos">{{i.infos}}</div>
			<div class="name alias" v-else-if="i.type=='cmd' && i.alias">(alias: {{i.alias}})</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import BTTVUtils from '@/utils/emotes/BTTVUtils';
import FFZUtils from '@/utils/emotes/FFZUtils';
import SevenTVUtils from '@/utils/emotes/SevenTVUtils';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { watch } from '@vue/runtime-core';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{
		emotes:Boolean,
		users:Boolean,
		commands:Boolean,
		search:String,
	},
	components:{},
	emits:["selectItem", "close"]
})
/**
 * This component is used to select an emote by typing ":xxx" on the
 * message field.
 */
export default class AutocompleteChatForm extends Vue {
	
	public search!:string;
	public emotes!:boolean;
	public users!:boolean;
	public commands!:boolean;

	public selectedIndex = 0;
	public filteredItems:ListItem[] = [];

	public getClasses(index:number, item:ListItem):string[] {
		let res = ["item"];
		if(index == this.selectedIndex)			res.push('selected');
		if(item.type == "cmd" && item.admin)	res.push('admin');
		if(item.type == "cmd" && item.mod)		res.push('mod');
		res.push(item.type);
		return res;
	}

	private keyDownHandler!:(e:KeyboardEvent) => void;

	public mounted():void {
		this.selectedIndex = 0;
		this.keyDownHandler = (e:KeyboardEvent)=> this.onkeyDown(e);
		document.addEventListener("keydown", this.keyDownHandler);
		watch(()=>this.search, ()=>{
			this.onSearchChange();
		});
		this.onSearchChange();
	}

	public beforeUnmount():void {
		document.removeEventListener("keydown", this.keyDownHandler);
	}

	public selectItem(item:ListItem):void {
		if(item.type == "cmd") {
			this.$emit("selectItem", item.cmd);
		}else{
			const prefix = (item.type == "user")? "@": "";
			this.$emit("selectItem", prefix + item.label);
		}
	}

	public onkeyDown(e:KeyboardEvent):void {
		switch(e.key) {
			case "Escape":
				this.$emit("close");
				break;
			case "PageUp":
				this.selectedIndex -= 10;
				e.preventDefault();
				break;
			case "PageDown":
				this.selectedIndex += 10;
				e.preventDefault();
				break;
			case "ArrowUp":
				this.selectedIndex --;
				e.preventDefault();
				break;
			case "ArrowDown":
				this.selectedIndex ++;
				e.preventDefault();
				break;
			case "Tab":
			case "Enter": {
				e.preventDefault();
				e.stopPropagation();
				this.selectItem(this.filteredItems[this.selectedIndex]);
				break;
			}
		}
		
		const len = this.filteredItems.length;
		this.selectedIndex = this.selectedIndex%len;
		if(this.selectedIndex < 0) this.selectedIndex = len-1;
		let el = this.$refs["item_"+this.filteredItems[this.selectedIndex].id] as HTMLElement[];
		if(el.length > 0) {
			el[0].scrollIntoView({block: "center", inline: "nearest"});
		}
	}

	private onSearchChange():void {
		let res:ListItem[] = [];
		const sUsers = this.$store("users");
		const sAuth = this.$store("auth");
		const sChat = this.$store("chat");
		const sTTS = this.$store("tts");
		const s = this.search.toLowerCase();
		if(s?.length > 0) {
			if(this.users) {
				const users = sUsers.users;
				for (let j = 0; j < users.length; j++) {
					const userName = users[j].displayName;
					if(userName.toLowerCase().indexOf(s) == 0) {
						res.push({
							type:"user",
							label:userName,
							id:userName,
						});
					}
				}
			}

			if(this.emotes) {
				let emotes = TwitchUtils.emotesCache ?? [];
				if(this.$store("params").appearance.bttvEmotes.value === true) {
					emotes = emotes.concat(BTTVUtils.instance.emotes);
				}
				
				if(this.$store("params").appearance.sevenTVEmotes.value === true) {
					emotes = emotes.concat(SevenTVUtils.instance.emotes);
				}
				
				if(this.$store("params").appearance.ffzEmotes.value === true) {
					emotes = emotes.concat(FFZUtils.instance.emotes);
				}

				if(emotes) {
					for (let j = 0; j < emotes.length; j++) {
						const e = emotes[j];
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

			if(this.commands) {
				const cmds = sChat.commands;
				const hasChannelPoints = sAuth.twitch.user.is_affiliate || sAuth.twitch.user.is_partner;
				const isAdmin = sAuth.twitch.user.is_admin === true;
				const isMod = true;
				for (let j = 0; j < cmds.length; j++) {
					const e = cmds[j] as TwitchatDataTypes.CommandData;
					if(e.cmd.toLowerCase().indexOf(s) > -1
					|| e.alias?.toLowerCase().indexOf(s) > -1) {

						//Remove TTS related commands if TTS isn't enabled
						if(e.needTTS === true && !sTTS.params.enabled) continue;
						
						//Remove admin specific commands if we're not an admin
						if(e.needAdmin === true && !isAdmin) continue;

						//Remove moderator specific commands if we're not a mod
						if(e.needModerator === true && !isMod) continue;
						
						//Remove channel point related commands if user isn't affiliate or partner
						if(e.needChannelPoints === true && !hasChannelPoints) continue;

						res.push({
							type:"cmd",
							label:e.cmd.replace(/{(.*?)\}/gi, "$1"),
							cmd:e.cmd,
							infos:e.details,
							id:e.id,
							alias:e.alias?.replace(/{(.*?)\}/gi, "$1"),
							admin:e.needAdmin === true,
							mod:e.needModerator === true,
						});
					}
				}
			}

			res.sort((a,b)=> {
				if(a.type == "cmd" && b.type == "cmd") {
					if(a.admin && !b.admin) return -1;
					if(!a.admin && b.admin) return 1;
					if(a.mod && !b.mod) return -1;
					if(!a.mod && b.mod) return 1;
				}
				if(a.label < b.label) return -1;
				if(a.label > b.label) return 1;
				return 0;
			})

			this.filteredItems = res;
		}
		
		if(this.filteredItems.length == 0) {
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
	type:"cmd";
	id:string;
	label:string;
	cmd:string;
	infos:string;
	alias?:string;
	admin?:boolean;
	mod?:boolean;
}
</script>

<style scoped lang="less">
.AutocompleteChatForm{
	padding: 10px;
	background-color: @mainColor_dark;
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
		display: flex;
		flex-direction: row;
		align-items: center;
		flex-wrap: wrap;
		cursor: pointer;

		&.selected, &:hover {
			background-color: fade(@mainColor_light, 20%);
		}

		&.cmd {
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
				background-color: fade(@mainColor_warn, 15%);

				&.selected, &:hover {
					background-color: fade(@mainColor_warn, 50%);
				}
			}

			&.mod {
				background-color: fade(@mainColor_normal, 15%);

				&.selected, &:hover {
					background-color: fade(@mainColor_normal, 50%);
				}
			}
		}

		.name, .source {
			color: #fff;
			font-size: .7em;
		}

		.source {
			opacity: .5;
			margin-left: .5em;
		}

		.infos {
			color: fade(#fff, 70%);
			font-size: 12px;
			font-style: italic;
			text-align: right;
			padding-right: 5px;
		}

		.image {
			height: 1.5em;
			width: 1.5em;
			padding: .25em;
			object-fit: contain;
			&.small {
				height: 1em;
				width: 1em;
				padding: .15em;
				margin-right: .25em;
				// border: 1px solid white;
				// border-radius: 50%;
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