<template>
	<div :class="classes" @click.ctrl="logJSON()">
		<div v-if="firstTime" class="header">
			<img src="@/assets/icons/stars.svg" alt="new" class="stars">
			<p>First time on this channel</p>
		</div>
		
		<div v-if="automod" class="automod">
			<div class="header">The following message has been blocked by automod for the following reason(s) : {{automodReasons}}</div>
			<div class="actions">
				<Button title="Accept" @click="modMessage(true)" />
				<Button title="Reject" @click="modMessage(false)" highlight />
			</div>
		</div>

		<span class="time" v-if="$store.state.params.appearance.displayTime.value">{{time}}</span>

		<div class="infos">
			<img v-if="!disableConversation && isConversation"
				class="convBt"
				src="@/assets/icons/conversation.svg"
				alt="conversation"
				@mouseover="$emit('showConversation', $event, messageData)">
			
			<ChatModTools :messageData="messageData" class="mod" v-if="showModTools" />
			
			<img :src="b.image_url_1x" v-for="(b,index) in filteredBadges" :key="index" class="badge" :data-tooltip="b.title">
			
			<span class="miniBadges" v-if="miniBadges.length > 0">
				<span class="badge" v-for="(b,index) in miniBadges"
					:key="index"
					:class="b.class"
					:style="{backgroundColor:b.color}"
					:data-tooltip="b.label"></span>
			</span>
			
			<span @click="openUserCard()" class="login" :style="loginStyles">{{messageData.tags["display-name"]}}</span>
		</div>
		
		<span class="message" v-html="text"></span>
	</div>

</template>

<script lang="ts">
import store from '@/store';
import { IRCEventDataList } from '@/utils/IRCEvent';
import { PubSubTypes } from '@/utils/PubSub';
import TwitchUtils, { TwitchTypes } from '@/utils/TwitchUtils';
import Utils from '@/utils/Utils';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ChatModTools from './ChatModTools.vue';

@Options({
	components:{
		Button,
		ChatModTools,
	},
	props:{
		messageData:Object,
		// deleteOverlay:{type:Boolean, default:false},
		lightMode:{type:Boolean, default:false},
		disableConversation:{type:Boolean, default:false},
	},
	emits:['showConversation'],
})
export default class ChatMessage extends Vue {

	public messageData!:IRCEventDataList.Message;
	// public deleteOverlay!:boolean;
	public lightMode!:boolean;
	public disableConversation!:boolean;
	
	public firstTime:boolean = false;
	public automod:PubSubTypes.AutomodData | null = null;
	public automodReasons:string = "";
	public badges:TwitchTypes.Badge[] = [];

	public get classes():string[] {
		let res = ["chatmessage"];
		const message = this.messageData as IRCEventDataList.Message;

		//NOT used anymore !
		//See NewUsers.vue line ~150
		// if(this.deleteOverlay) res.push("deleteOverlay");
		
		if(this.automod) res.push("automod");
		if(this.firstTime) res.push("firstTimeOnChannel");
		if(this.messageData.tags['message-type'] == "action") res.push("slashMe");
		if(this.messageData.cyphered) res.push("cyphered");

		if(!this.lightMode) {
			if(store.state.params.appearance.highlightMentions.value
			&& store.state.user.login
			&& this.text.toLowerCase().indexOf(store.state.user.login.toLowerCase()) > -1) {
				res.push("mention");
			}

			if(message.tags.subscriber) {
				res.push("size_"+store.state.params.appearance.subsSize.value);
				if(store.state.params.appearance.highlightSubs.value) res.push("highlightSubs");
			}
			else if(message.tags.vip){
				res.push("size_"+store.state.params.appearance.vipsSize.value);
				if(store.state.params.appearance.highlightVips.value) res.push("highlightVips");
			}else
			if(message.tags.mod) {
				res.push("size_"+store.state.params.appearance.modsSize.value);
				if(store.state.params.appearance.highlightMods.value) res.push("highlightMods");
			}
			else res.push("size_"+store.state.params.appearance.defaultSize.value);
		}else {
			res.push("size_"+store.state.params.appearance.defaultSize.value);
		}

		return res;
	}

	public get showModTools():boolean {
		const message = this.messageData as IRCEventDataList.Message;
		return (store.state.mods as TwitchTypes.Moderator[]).findIndex(v=> v.user_id == message.tags['user-id']) > -1
			||
		(
			message.channel.replace(/^#/gi, "").toLowerCase() == store.state.user.login.toLowerCase()//TODO set actual channel id not the user id
			&& message.tags.username?.toLowerCase() != store.state.user.login.toLowerCase()
		);
	}

	public get time():string {
		const message = this.messageData as IRCEventDataList.Message;
		const d = new Date(parseInt(message.tags['tmi-sent-ts'] as string));
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes());
	}

	public get isConversation():boolean {
		return this.messageData.answers != undefined || this.messageData.answerTo != undefined;
	}
	
	/**
	 * Set login color
	 */
	public get loginStyles():unknown {
		const message = this.messageData as IRCEventDataList.Message;
		let res = {
			color:message.tags.color,
		};
		return res;
	}

	/**
	 * Get badges images
	 */
	public get filteredBadges():TwitchTypes.Badge[] {
		let res:TwitchTypes.Badge[] = [];
		if(store.state.params.appearance.showBadges.value
		&& !store.state.params.appearance.minimalistBadges.value) {
			try {
				const message = this.messageData as IRCEventDataList.Message;
				const channelID:string = message.tags['room-id'] as string;
				res = TwitchUtils.getBadgesImagesFromRawBadges(channelID, message.tags.badges);
			}catch(error){
				res = [];
			}
		}
		return res;
	}

	/**
	 * Gets text message with parsed emotes
	 */
	public get text():string {
		let result:string;
		const mess = this.messageData as IRCEventDataList.Message;
		let text = mess.message;
		try {
			let removeEmotes = !store.state.params.appearance.showEmotes.value;
			if(this.automod) {
				result = text;
				result = result.replace(/</g, "&lt;").replace(/>/g, "&gt;");//Avoid XSS attack
				result = result.replace(/&lt;(\/)?mark&gt;/g, "<$1mark>");//Reset <mark> tags used to highlight banned words on automod messages
			}else{
				//Allow custom parsing of emotes only if it's a message of ours
				//to avoid killing perfromances.
				const customParsing = mess.tags.username?.toLowerCase() == store.state.user.login.toLowerCase();
				let chunks = TwitchUtils.parseEmotes(text, mess.tags['emotes-raw'], removeEmotes, customParsing);
				result = "";
				for (let i = 0; i < chunks.length; i++) {
					const v = chunks[i];
					if(v.type == "text") {
						v.value = v.value.replace(/</g, "&lt;").replace(/>/g, "&gt;");//Avoid XSS attack
						result += Utils.parseURLs(v.value);
					}else if(v.type == "emote") {
						let tt = "<img src='"+v.value.replace(/1.0$/gi, "3.0")+"' height='112' width='112'><br><center>"+v.emote+"</center>";
						result += "<img src='"+v.value+"' data-tooltip=\""+tt+"\" class='emote'>";
					}
				}
			}
		}catch(error) {
			console.log(error);
			console.log(mess);
			result = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
		}
		
		return ": "+result;
	}

	/**
	 * Displays minimalist badges
	 */
	public get miniBadges():{color:string, label:string, class?:string}[] {
		let badges:{color:string, label:string, class?:string}[] = [];
		const message = this.messageData as IRCEventDataList.Message;
		if(store.state.params.appearance.showBadges.value
		&& store.state.params.appearance.minimalistBadges.value) {
			if(message.tags.badges?.predictions?.indexOf("pink")) badges.push({color:"#f50e9b", label:"Prediction", class:"prediction"});
			if(message.tags.badges?.predictions?.indexOf("blue")) badges.push({color:"#387aff", label:"Prediction", class:"prediction"});
			if(message.tags.badges?.vip) badges.push({color:"#e00bb9", label:"VIP"});
			if(message.tags.badges?.subscriber) badges.push({color:"#9147ff", label:"Sub"});
			if(message.tags.badges?.premium) badges.push({color:"#00a3ff", label:"Prime"});
			if(message.tags.badges?.moderator) badges.push({color:"#39db00", label:"Moderator"});
			if(message.tags.badges?.staff) badges.push({color:"#666666", label:"Twitch staff"});
			if(message.tags.badges?.broadcaster) badges.push({color:"#ff0000", label:"Broadcaster"});
		}
		return badges;
	}

	public openUserCard():void {
		if(this.lightMode) return;
		const message = this.messageData as IRCEventDataList.Message;
		store.dispatch("openUserCard", message.tags.username);
	}

	public logJSON():void {
		console.log(this.messageData);
	}

	/**
	 * Called when component is mounted
	 */
	public mounted():void {
		const mess = this.messageData as IRCEventDataList.Message;
		
		/* eslint-disable-next-line */
		this.firstTime = mess.tags['first-msg'] && !this.lightMode;

		//Manage automod content
		if(!this.lightMode && mess.automod) {
			this.automod = mess.automod;
			let reasons:string[] = [];
			for (let i = 0; i < mess.automod.message.content.fragments.length; i++) {
				const f = mess.automod.message.content.fragments[i];
				if(!f.automod) continue;
				for (const key in f.automod.topics) {
					if(reasons.indexOf(key) == -1) reasons.push(key);
				}
			}

			let textReasons:string[] = [];
			for (let i = 0; i < reasons.length; i++) {
				const r = reasons[i];
				switch(r) {
					case "race_ethnicity_or_religion":
						textReasons.push("racism or religion hatred");
						break;
					case "sex_based_terms":
						textReasons.push("sexual content");
						break;
					case "sexuality_sex_or_gender":
						textReasons.push("gender or sex hate");
						break;
					case "swearing":
					case "aggression":
					case "disability":
					case "misoginy":
					case "bullying":
					default:
						textReasons.push(r);
				}
			}
			this.automodReasons = textReasons.join(", ");
		}
	}

	/**
	 * Accept or reject an automoded chat message
	 */
	public async modMessage(accept:boolean):Promise<void> {
		const message = this.messageData as IRCEventDataList.Message;
		let success = await TwitchUtils.modMessage(accept, message.tags.id as string);
		if(!success) {
			store.state.alert = "Woops... something went wrong :(...";
		}else {
			//Delete the message.
			//If the message was allowed, twitch will send it back, no need to keep it.
			store.dispatch("delChatMessage", message.tags.id);
		}
	}
}
</script>

<style scoped lang="less">
.chatmessage{

	&.size_1 { font-size: 12px !important; }
	&.size_2 { font-size: 16px !important; }
	&.size_3 { font-size: 20px !important; }
	&.size_4 { font-size: 25px !important; }

	&.highlightSubs { background-color: fade(#9147ff, 20%); }
	&.highlightVips { background-color: fade(#e00bb9, 20%); }
	&.highlightMods { background-color: fade(#39db00, 20%); }

	&.mention{
		background-color: rgba(255, 0, 0, .35) !important;//oooo..bad me >_>
	}

	&.slashMe {
		.message {
			font-style: italic;
		}
	}

	&.deleteOverlay{
		//NOT used anymore !
		//See NewUsers.vue line ~150
		color: white;
		opacity: .5;
		text-decoration: line-through;
		background-color: red !important;//oooo..bad me >_>
	}

	.infos {
		display: inline;
		.convBt {
			opacity: 0.75;
			height: 1em;
			vertical-align: middle;
			cursor: pointer;
			&:hover {
				opacity: .75;
			}
			&:not(:last-child) {
				margin-right: 5px;
			}
		}
		.mod {
			display: inline;
			margin-right: 5px;
		}

		.badge {
			width: 18px;
			height: 18px;
			vertical-align: middle;
			&:last-of-type {
				margin-right: 5px;
			}
		}
	
		.login {
			font-weight: bold;
			cursor: pointer;
			text-shadow: 0 0px 1px fade(#000, 50%);
		}
	
		.miniBadges {
			padding: 1px;
			height: 12px;
			margin-right: 5px;
			display: inline-block;
			.badge {
				display: inline-block;
				width: 6px;
				height: 12px;
				margin: 0 1px 0px 0;
				&:last-child {
					margin-right: 0;
				}
				&.prediction {
					width: 12px;
					border-radius: 50%;
				}
			}
		}
	}

	.message {
		color: #d1d1d1;
		:deep( .emote ) {
			width: 28px;
			height: 28px;
			vertical-align: middle;
			object-fit: contain;
		}
	}

	&.firstTimeOnChannel {
		color: #fff;
		background-color: rgba(255, 255, 255, .15) !important;
		border-radius: 5px;
		margin: 5px 0;
		.header {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			margin-bottom: 10px;
			font-size: 20px;
			.stars {
				height: 30px;
				margin-bottom: 10px;
			}
		}
	}

	&.automod {
		margin-top: 5px;
		border-radius: 5px;
		background-color: fade(@mainColor_alert, 50%) !important;

		.message {
			:deep(mark) {
				background-color: #fff;
				border-radius: 5px;
				color: #c00;
				font-weight: bold;
				padding: 0px 3px;
			}
		}

		.automod {
			background-color: #fff;
			padding: 10px;
			border-radius: 5px;
			margin-bottom: 10px;

			.header {
				margin-bottom: 10px;
				color: black;
			}

			.actions {
				text-align: center;
				.button {
					padding: 2px 5px;
					border-radius: 5px;
					font-size: 18px;
					margin-right: 10px;
				}
			}
		}
	}

	&.cyphered {
		background-image: repeating-linear-gradient(-45deg, #ffffff10, #ffffff10 20px, #ffffff30 20px, #ffffff30 40px);
	}
}
</style>