<template >
	<div :class="classes" v-show="debugForceOpen || open" @wheel.stop>
		<div class="hoverActions">
			<button class="openBt" @click="expand = true" data-tooltip="Edit filters">
				<img src="@/assets/icons/filters.svg" alt="open filters" class="icon">
			</button>
			<button class="deleteBt" @click="$emit('delete')" v-if="canDelete" data-tooltip="Delete column">
				<img src="@/assets/icons/cross_white.svg" alt="delete column" class="icon">
			</button>
		</div>

		<div class="holder" v-if="debugForceOpen || expand || forceExpand" @click="clickPreview($event)">
			<div class="content">
				<div class="head">
					<h1 class="title">Filters</h1>
					<button class="closeBt" @click="expand = false" v-if="!forceExpand">
						<img src="@/assets/icons/cross_white.svg" alt="close filters" class="icon">
					</button>
				</div>
				
				<div class="info" v-if="debugForceOpen || expand || forceExpand">Choose which message types to display on this column</div>
				
				<div class="presets">
					<Button @click="preset('chat')" title="Chat" :icon="$image('icons/whispers_purple.svg')" small white />
					<Button @click="preset('chatSafe')" title="Chat safe" :icon="$image('icons/shield_purple.svg')" small white />
					<Button @click="preset('moderation')" title="Moderation" :icon="$image('icons/mod_purple.svg')" small white />
					<Button @click="preset('activities')" title="Activities" :icon="$image('icons/stars_purple.svg')" small white />
					<Button @click="preset('games')" title="Games" :icon="$image('icons/bingo_purple.svg')" small white />
					<Button @click="preset('revenues')" title="Revenues" :icon="$image('icons/coin_purple.svg')" small white />
				</div>
				
				<div class="paramsList">

					<ToggleButton class="item toggleAll" v-model="toggleAll" clear />

					<ParamItem class="item" v-for="f in filters"
						clearToggle
						:key="'filter_'+f.storage"
						:paramData="f"
						@click.stop
						@change="saveData()"
						@mouseleave="mouseLeaveItem"
						@mouseenter="mouseEnterItem"
						v-model="config.filters[f.storage as 'message']" />
				
					<ParamItem class="item child"
						v-if="config.filters.message === true"
						key="subfilter_blockUsers"
						:childLevel="1"
						:paramData="param_blockUsers"
						clearToggle
						@click.stop
						@change="saveData()"
						v-model="config.userBlockList" />
				
					<ParamItem class="item child" v-for="f in messageFilters"
						v-if="config.filters.message === true"
						:key="'subfilter_'+f.storage"
						:childLevel="1"
						:paramData="f"
						clearToggle
						@click.stop
						@change="saveData()"
						@mouseleave="mouseLeaveItem"
						@mouseenter="previewSubMessage(f.storage as 'bots'/* couldn't find a way to strongly cast storage type */)"
						v-model="config.messageFilters[f.storage as 'bots']" />
						
				</div>

				<div class="error" v-if="error" @click="error=false">Please select at least one filter</div>

				<div class="ctas">
					<Button title="Cancel" small :icon="$image('icons/cross_white.svg')" highlight v-if="forceExpand" @click="$emit('delete')" />
					<Button title="Create" small :icon="$image('icons/add_purple.svg')" white v-if="forceExpand" @click="submitForm()" />
				</div>
			</div>

			<div class="previewList" ref="previewList" v-if="loadingPreview || previewData.length > 0">
				<div class="preview" v-if="loadingPreview">
					<img src="@/assets/loader/loader_white.svg" alt="loading" class="loader">
				</div>
	
				<div class="preview" v-for="m in previewData" :key="'preview_'+m.id" @click="clickPreview($event)">
					
					<ChatAd class="message"
						v-if="m.type == 'twitchat_ad'"
						:messageData="m" />
						
					<ChatNotice class="message"
						v-else-if="m.type == 'notice'"
						:messageData="m" />
	
					<ChatJoinLeave class="message"
						v-else-if="(m.type == 'join' || m.type == 'leave')"
						:messageData="m" />
	
					<ChatConnect class="message"
						v-else-if="(m.type == 'connect' || m.type == 'disconnect')"
						:messageData="m" />
	
					<ChatMessage class="message"
						v-else-if="m.type == 'message' || m.type == 'whisper'"
						:messageData="m" />
	
					<ChatPollResult class="message"
						v-else-if="m.type == 'poll'"
						:messageData="m" />
	
					<ChatPredictionResult class="message"
						v-else-if="m.type == 'prediction'"
						:messageData="m" />
	
					<ChatBingoResult class="message"
						v-else-if="m.type == 'bingo'"
						:messageData="m" />
	
					<ChatRaffleResult class="message"
						v-else-if="m.type == 'raffle'"
						:messageData="m" />
	
					<ChatCountdownResult class="message"
						v-else-if="m.type == 'countdown'"
						:messageData="m" />
	
					<ChatHypeTrainResult class="message"
						v-else-if="m.type == 'hype_train_summary'"
						:messageData="m" />
	
					<ChatFollowbotEvents class="message"
						v-else-if="m.type == 'followbot_list'"
						:messageData="m" />
	
					<ChatShoutout class="message"
						v-else-if="m.type == 'shoutout'"
						:messageData="m" />
	
					<ChatHighlight v-else class="message"
						lightMode
						:messageData="m" />
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import ParamItem from '@/components/params/ParamItem.vue';
import ToggleButton from '@/components/ToggleButton.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import { watch } from 'vue';
import { Options, Vue } from 'vue-class-component';
import ChatAd from '../ChatAd.vue';
import ChatBingoResult from '../ChatBingoResult.vue';
import ChatConnect from '../ChatConnect.vue';
import ChatCountdownResult from '../ChatCountdownResult.vue';
import ChatFollowbotEvents from '../ChatFollowbotEvents.vue';
import ChatHighlight from '../ChatHighlight.vue';
import ChatHypeTrainResult from '../ChatHypeTrainResult.vue';
import ChatJoinLeave from '../ChatJoinLeave.vue';
import ChatMessage from '../ChatMessage.vue';
import ChatNotice from '../ChatNotice.vue';
import ChatPollResult from '../ChatPollResult.vue';
import ChatPredictionResult from '../ChatPredictionResult.vue';
import ChatRaffleResult from '../ChatRaffleResult.vue';
import ChatShoutout from '../ChatShoutout.vue';

@Options({
	props:{
		modelValue:{type:Object, default: {}},
		open:{type:Boolean, default: false},
		forceExpand:{type:Boolean, default: false},
		config:Object,
	},
	components:{
		Button,
		ParamItem,
		ToggleButton,
		ChatAd,
		ChatConnect,
		ChatShoutout,
		ChatBingoResult,
		ChatCountdownResult,
		ChatFollowbotEvents,
		ChatHighlight,
		ChatHypeTrainResult,
		ChatJoinLeave,
		ChatMessage,
		ChatNotice,
		ChatPollResult,
		ChatPredictionResult,
		ChatRaffleResult,
	},
	emits: ['update:modelValue', 'submit', 'delete'],
})
export default class MessageListFilter extends Vue {
	
	public open!:boolean;
	public forceExpand!:boolean;
	public config!:TwitchatDataTypes.ChatColumnsConfig;
	
	public error:boolean = false;
	public expand:boolean = false;
	public toggleAll:boolean = false;
	public debugForceOpen:boolean = true;//Allows to force opening when debugging the form
	public typeToLabel!:{[key in typeof TwitchatDataTypes.MessageListFilterTypes[number]]:string};
	public typeToIcon!:{[key in typeof TwitchatDataTypes.MessageListFilterTypes[number]]:string};
	public filters:TwitchatDataTypes.ParameterData[] = [];
	public messageFilters:TwitchatDataTypes.ParameterData[] = [];
	public previewData:TwitchatDataTypes.ChatMessageTypes[] = [];
	public loadingPreview:boolean = false;
	public previewIndex:number = 0;
	public param_blockUsers:TwitchatDataTypes.ParameterData = {type:"text", longText:true, value:"", label:"Hide specific users", placeholder:"bot1, bot2, ....", icon:"hide.svg"};
	
	private mouseY = 0;
	private disposed = false;
	private touchMode = false;
	private clickHandler!:(e:MouseEvent|TouchEvent) => void;
	private mouseMoveHandler!:(e:MouseEvent|TouchEvent)=> void;
	private messagesCache:Partial<{[key in typeof TwitchatDataTypes.MessageListFilterTypes[number]]:TwitchatDataTypes.ChatMessageTypes[]}> = {}
	private subMessagesCache:Partial<{[key in keyof TwitchatDataTypes.ChatColumnsConfigMessageFilters]:TwitchatDataTypes.ChatMessageTypes[]}> = {}

	public get classes():string[] {
		const res = ["messagelistfilter"];
		if(this.debugForceOpen || this.expand || this.forceExpand) res.push("expand");
		return res;
	}

	public get canDelete():boolean {
		return this.$store('params').chatColumnsConfig.length > 1;
	}

	public beforeMount(): void {
		type messageFilterTypes = keyof TwitchatDataTypes.ChatColumnsConfigMessageFilters;
		this.param_blockUsers.value = this.config.userBlockList;

		//@ts-ignore
		this.typeToLabel = {};
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.TWITCHAT_AD] = "Twitchat updates and tips";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.RAID] = "Raids";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.POLL] = "Polls";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.JOIN] = "Users join";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.LEAVE] = "Users leave";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.CHEER] = "Bits";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.BINGO] = "Bingos";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.RAFFLE] = "Raffles";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.REWARD] = "Rewards";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.NOTICE] = "Notices";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.MESSAGE] = "Chat messages";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.WHISPER] = "Whispers";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.SHOUTOUT] = "Shoutouts";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.FOLLOWING] = "Follows";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.COUNTDOWN] = "Countdown";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.PREDICTION] = "Predictions";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION] = "Subs";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_SUMMARY] = "Hype train summaries";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN] = "Hype train cooldown";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.COMMUNITY_BOOST_COMPLETE] = "Community boosts";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION] = "Community challenge<br>contributions";
		
		//@ts-ignore
		this.typeToIcon = {};
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.TWITCHAT_AD] = "twitchat.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.RAID] = "raid.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.POLL] = "poll.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.JOIN] = "enter_white.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.LEAVE] = "leave_white.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.CHEER] = "bits.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.BINGO] = "bingo.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.RAFFLE] = "ticket.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.REWARD] = "channelPoints.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.NOTICE] = "info.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.MESSAGE] = "user.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.WHISPER] = "whispers.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.SHOUTOUT] = "shoutout.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.FOLLOWING] = "follow.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.COUNTDOWN] = "countdown.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.PREDICTION] = "prediction.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION] = "sub.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_SUMMARY] = "train.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN] = "train.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.COMMUNITY_BOOST_COMPLETE] = "boost.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION] = "channelpoints.svg";

		const sortedFilters:typeof TwitchatDataTypes.MessageListFilterTypes[number][] = [
			TwitchatDataTypes.TwitchatMessageType.FOLLOWING,
			TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION,
			TwitchatDataTypes.TwitchatMessageType.CHEER,
			TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_SUMMARY,
			TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN,
			TwitchatDataTypes.TwitchatMessageType.COMMUNITY_BOOST_COMPLETE,
			TwitchatDataTypes.TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION,
			TwitchatDataTypes.TwitchatMessageType.RAID,
			TwitchatDataTypes.TwitchatMessageType.SHOUTOUT,
			TwitchatDataTypes.TwitchatMessageType.REWARD,
			TwitchatDataTypes.TwitchatMessageType.POLL,
			TwitchatDataTypes.TwitchatMessageType.PREDICTION,
			TwitchatDataTypes.TwitchatMessageType.BINGO,
			TwitchatDataTypes.TwitchatMessageType.RAFFLE,
			TwitchatDataTypes.TwitchatMessageType.COUNTDOWN,
			TwitchatDataTypes.TwitchatMessageType.JOIN,
			TwitchatDataTypes.TwitchatMessageType.LEAVE,
			TwitchatDataTypes.TwitchatMessageType.TWITCHAT_AD,
			TwitchatDataTypes.TwitchatMessageType.WHISPER,
			TwitchatDataTypes.TwitchatMessageType.NOTICE,
			TwitchatDataTypes.TwitchatMessageType.MESSAGE,
		];

		this.filters = [];
		for (let i = 0; i < sortedFilters.length; i++) {
			const f = sortedFilters[i];
			const children:TwitchatDataTypes.ParameterData[] = [];
			//Add sub-filters to the message types so we can filter mods, new users, automod, etc...
			if(f === TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
				const keyToLabel:{[key in messageFilterTypes]:string} = {
					me:"Sent by me",
					viewers:"Sent by viewers",
					vips:"Sent by VIPs",
					subs:"Sent by Subs",
					moderators:"Sent by Moderators",
					bots:"Sent by bots",
					deleted:"Deleted messages",
					automod:"Blocked messages",
					suspiciousUsers:"Sent by suspicious users",
					commands:"Commands (starting with \"!\")",
				}
				const keyToIcon:{[key in messageFilterTypes]:string} = {
					me:"user.svg",
					viewers:"user.svg",
					vips:"vip.svg",
					subs:"sub.svg",
					moderators:"mod.svg",
					bots:"bot.svg",
					deleted:"delete.svg",
					automod:"shield.svg",
					suspiciousUsers:"shield.svg",
					commands:"commands.svg",
				}
				if(!this.config.messageFilters) this.config.messageFilters = {
					me:true,
					bots:true,
					automod:true,
					commands:true,
					deleted:true,
					suspiciousUsers:true,
					viewers:true,
					vips:true,
					subs:true,
					moderators:true,
				};
				for (const key in keyToLabel) {
					const k = key as messageFilterTypes;
					if(this.config.messageFilters[k] == undefined) {
						this.config.messageFilters[k] = true;
					}
					const param:TwitchatDataTypes.ParameterData = {type:"toggle", value:this.config.messageFilters[k], label:keyToLabel[k], storage:key, icon:keyToIcon[k]};
					if(k == 'commands') {
						const subParam:TwitchatDataTypes.ParameterData = {type:"text",
									longText:true,
									value:this.config.commandsBlockList,
									label:"Hide specific commands",
									placeholder:"!example, !so, !myuptime, ...",
									icon:"hide.svg",
									editCallback:(data:string)=> {
										this.config.commandsBlockList = data;
										this.saveData();
									}};
						param.children = [subParam];
					}
					children.push(param);
				}
				this.messageFilters = children;
			}

			this.filters.push({type:"toggle", value:this.config.filters[f], label:this.typeToLabel[f] ?? f, storage:f, icon:this.typeToIcon[f]});
		}
		
		this.clickHandler		= (e:MouseEvent|TouchEvent) => this.onMouseDown(e);
		this.mouseMoveHandler	= (e:MouseEvent|TouchEvent) => this.onMouseMove(e);
		document.addEventListener("touchstart", this.clickHandler);
		document.addEventListener("mousedown", this.clickHandler);
		document.addEventListener("mousemove", this.mouseMoveHandler);
		document.addEventListener("touchmove", this.mouseMoveHandler);
		
		//Close when rolling out col
		watch(()=>this.open, ()=>{ this.expand = false; });
		watch(()=>this.toggleAll, ()=>{
			for (let i = 0; i < this.filters.length; i++) {
				this.filters[i].value = this.toggleAll;
			}
			for (const key in this.config.messageFilters) {
				const k = key as messageFilterTypes;
				this.config.messageFilters[k] = this.toggleAll;
			}
		});
		requestAnimationFrame(()=>this.renderFrame());
	}

	public beforeUnmount():void {
		this.disposed = true;
		document.removeEventListener("touchstart", this.clickHandler);
		document.removeEventListener("mousedown", this.clickHandler);
		document.removeEventListener("mousemove", this.mouseMoveHandler);
		document.removeEventListener("touchmove", this.mouseMoveHandler);
	}

	public mouseEnterItem(event:MouseEvent, data:TwitchatDataTypes.ParameterData):void {
		this.previewMessage(data.storage as typeof TwitchatDataTypes.MessageListFilterTypes[number]);
	}

	public mouseLeaveItem(event:MouseEvent):void {
		if(this.touchMode) return;
		this.previewData = [];
	}

	public async previewMessage(type:typeof TwitchatDataTypes.MessageListFilterTypes[number]):Promise<void> {
		this.previewData = [];
		this.loadingPreview = true;
		this.previewIndex ++;
		const previewIndexLoc = this.previewIndex;
		const cached = this.messagesCache[type];
		if(cached && cached.length > 0) {
			this.previewData = cached;
			this.loadingPreview = false;
			return;
		}

		await this.$nextTick();

		this.messagesCache[type] = [];
		if(type == TwitchatDataTypes.TwitchatMessageType.NOTICE) {
			this.$store('debug').simulateNotice(TwitchatDataTypes.TwitchatNoticeType.BAN, (data:TwitchatDataTypes.ChatMessageTypes)=> {
				if(!data) return;
				this.messagesCache[type]?.push(data);
				if(previewIndexLoc != this.previewIndex) return;
				this.previewData.push(data);
			}, false);
			this.$store('debug').simulateNotice(TwitchatDataTypes.TwitchatNoticeType.EMERGENCY_MODE, (data:TwitchatDataTypes.ChatMessageTypes)=> {
				if(!data) return;
				this.messagesCache[type]?.push(data);
				if(previewIndexLoc != this.previewIndex) return;
				this.previewData.push(data);
			}, false);
			this.$store('debug').simulateNotice(TwitchatDataTypes.TwitchatNoticeType.STREAM_INFO_UPDATE, (data:TwitchatDataTypes.ChatMessageTypes)=> {
				if(!data) return;
				this.messagesCache[type]?.push(data);
				if(previewIndexLoc != this.previewIndex) return;
				this.previewData.push(data);
			}, false);
			this.loadingPreview = false;

		}else{

			this.$store('debug').simulateMessage(type, (data:TwitchatDataTypes.ChatMessageTypes)=> {
				this.loadingPreview = false;
	
				if(!data) return;

				this.messagesCache[type] = [data];
	
				if(previewIndexLoc != this.previewIndex) return;
				this.previewData = [data];
			}, false);
		}
	}

	public async previewSubMessage(type:keyof TwitchatDataTypes.ChatColumnsConfigMessageFilters):Promise<void> {
		this.previewData = [];
		this.loadingPreview = true;
		this.previewIndex ++;
		const previewIndexLoc = this.previewIndex;
		const cached = this.subMessagesCache[type];
		if(cached && cached.length > 0) {
			this.previewData = cached;
			this.loadingPreview = false;
			return;
		}

		await this.$nextTick();

		this.subMessagesCache[type] = [];
		this.$store('debug').simulateMessage(TwitchatDataTypes.TwitchatMessageType.MESSAGE, (data:TwitchatDataTypes.ChatMessageTypes)=> {
			this.loadingPreview = false;
			if(!data) return;
			
			const dataCast = data as TwitchatDataTypes.MessageChatData;

			if(type == "automod") {
				let words:string[] = [];
				do {
					words.push( Utils.pickRand(dataCast.message.split(" ")) );
				}while(Math.random() > .5)

				dataCast.twitch_automod = { reasons:["bullying"], words };
			}else if(type == "deleted") {
				dataCast.deleted = true;
			}else if(type == "suspiciousUsers") {
				dataCast.twitch_isSuspicious = true;
			}else if(type == "commands") {
				dataCast.message = dataCast.message_html = "!cucumber"
			}else {
				return;
			}

			if(previewIndexLoc != this.previewIndex) return;

			this.previewData.push(data);
			this.subMessagesCache[type] = this.previewData;

		}, false);
		
		if(type == "automod") {
			this.$store('debug').simulateMessage(TwitchatDataTypes.TwitchatMessageType.MESSAGE, (data:TwitchatDataTypes.ChatMessageTypes)=> {
				if(!data) return;

				const dataCast = data as TwitchatDataTypes.MessageChatData;
				dataCast.twitch_isRestricted = true;
				const users:TwitchatDataTypes.TwitchatUser[] = [];
				const list = this.$store("users").users;
				for (let i = 0; i < list.length; i++) {
					users.push(list[i]);
					if(Math.random() > .3) break;
				}

				dataCast.twitch_sharedBanChannels = users.map(v=> { return {id:v.id, login:v.login}; })

				if(previewIndexLoc != this.previewIndex) return;

				this.previewData.push(data);
				this.subMessagesCache[type] = this.previewData;
			}, false);
		}
	}

	/**
	 * Called when preview message is clicked.
	 * ONly usefull for touch interface so we can close it by clicking it
	 */
	public clickPreview(e:MouseEvent):void {
		e.stopPropagation();
		e.preventDefault();
		this.previewData = [];
	}

	/**
	 * Called when submitting form.
	 * This button is only here when creating anew column.
	 * In such case user is prompted for filters selection and has
	 * to select some in order to see the matching messages
	 */
	public submitForm():void {
		this.error = false;
		let noSelection = true;
		for (const key in this.config.filters) {
			if(this.config.filters[key as typeof TwitchatDataTypes.MessageListFilterTypes[number]] === true) {
				noSelection = false;
				break;
			}
		}
		if(noSelection) {
			this.error = true;
		}else{
			this.$emit("submit");
		}
	}

	/**
	 * Force data save
	 */
	public saveData():void {
		this.$store("params").saveChatColumnConfs();
	}

	/**
	 * Called when clicking a preset
	 */
	public preset(id:"chat"|"chatSafe"|"moderation"|"activities"|"games"|"revenues"):void {
		this.toggleAll = false;
		//Unselect all
		for (let i = 0; i < this.filters.length; i++) {
			this.filters[i].value = false;
		}
		type messageFilterTypes = keyof TwitchatDataTypes.ChatColumnsConfigMessageFilters;
		const ids:typeof TwitchatDataTypes.MessageListFilterTypes[number][] = [];
		switch(id) {
			case "chat": {
				ids.push( TwitchatDataTypes.TwitchatMessageType.NOTICE );
				ids.push( TwitchatDataTypes.TwitchatMessageType.MESSAGE );
				ids.push( TwitchatDataTypes.TwitchatMessageType.WHISPER );
				ids.push( TwitchatDataTypes.TwitchatMessageType.TWITCHAT_AD );
				// ids.push( TwitchatDataTypes.TwitchatMessageType.JOIN );
				// ids.push( TwitchatDataTypes.TwitchatMessageType.LEAVE );
				for (const key in this.config.messageFilters) {
					const k = key as messageFilterTypes;
					this.config.messageFilters[k] = true;
				}
				break;
			}
			case "chatSafe": {
				ids.push( TwitchatDataTypes.TwitchatMessageType.NOTICE );
				ids.push( TwitchatDataTypes.TwitchatMessageType.MESSAGE );
				ids.push( TwitchatDataTypes.TwitchatMessageType.WHISPER );
				ids.push( TwitchatDataTypes.TwitchatMessageType.TWITCHAT_AD );
				for (const key in this.config.messageFilters) {
					const k = key as messageFilterTypes;
					this.config.messageFilters[k] = k != "automod" && k != "deleted" && k != "suspiciousUsers";
				}
				break;
			}
			case "moderation": {
				ids.push( TwitchatDataTypes.TwitchatMessageType.NOTICE );
				ids.push( TwitchatDataTypes.TwitchatMessageType.RAID );
				ids.push( TwitchatDataTypes.TwitchatMessageType.SHOUTOUT );
				ids.push( TwitchatDataTypes.TwitchatMessageType.MESSAGE );
				ids.push( TwitchatDataTypes.TwitchatMessageType.WHISPER );
				for (const key in this.config.messageFilters) {
					const k = key as messageFilterTypes;
					this.config.messageFilters[k] = k == "automod" || k == "deleted" || k == "suspiciousUsers" || k == "moderators";
				}
				break;
			}
			case "activities": {
				ids.push( TwitchatDataTypes.TwitchatMessageType.RAID );
				ids.push( TwitchatDataTypes.TwitchatMessageType.POLL );
				ids.push( TwitchatDataTypes.TwitchatMessageType.CHEER );
				ids.push( TwitchatDataTypes.TwitchatMessageType.BINGO );
				ids.push( TwitchatDataTypes.TwitchatMessageType.RAFFLE );
				ids.push( TwitchatDataTypes.TwitchatMessageType.REWARD );
				ids.push( TwitchatDataTypes.TwitchatMessageType.SHOUTOUT );
				ids.push( TwitchatDataTypes.TwitchatMessageType.FOLLOWING );
				ids.push( TwitchatDataTypes.TwitchatMessageType.COUNTDOWN );
				ids.push( TwitchatDataTypes.TwitchatMessageType.PREDICTION );
				ids.push( TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION );
				ids.push( TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_SUMMARY );
				ids.push( TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN );
				ids.push( TwitchatDataTypes.TwitchatMessageType.COMMUNITY_BOOST_COMPLETE );
				ids.push( TwitchatDataTypes.TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION );
				break;
			}
			case "games": {
				ids.push( TwitchatDataTypes.TwitchatMessageType.POLL );
				ids.push( TwitchatDataTypes.TwitchatMessageType.BINGO );
				ids.push( TwitchatDataTypes.TwitchatMessageType.RAFFLE );
				ids.push( TwitchatDataTypes.TwitchatMessageType.REWARD );
				ids.push( TwitchatDataTypes.TwitchatMessageType.COUNTDOWN );
				ids.push( TwitchatDataTypes.TwitchatMessageType.PREDICTION );
				break;
			}
			case "revenues": {
				ids.push( TwitchatDataTypes.TwitchatMessageType.CHEER );
				ids.push( TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION );
				ids.push( TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_SUMMARY );
				ids.push( TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN );
				ids.push( TwitchatDataTypes.TwitchatMessageType.COMMUNITY_BOOST_COMPLETE );
				break;
			}
		}

		for (let i = 0; i < ids.length; i++) {
			const filter = this.filters.find(v => (v.storage as typeof TwitchatDataTypes.MessageListFilterTypes[number]) === ids[i]);
			if(filter) filter.value = true;
		}

		this.saveData();
	}

	/**
	 * Called when the mouse moves
	 */
	private async onMouseMove(e:MouseEvent|TouchEvent):Promise<void> {
		if(!this.open) return;

		this.touchMode = e.type != "mousemove";
		if(!this.touchMode) {
			this.mouseY = (e as MouseEvent).clientY;
		}else{
			this.mouseY = (e as TouchEvent).touches[0].clientY;
		}
	}

	private onMouseDown(e:MouseEvent|TouchEvent):void {
		if(!this.open) return;
		
		let target = e.target as HTMLDivElement;
		const ref = this.$el as HTMLDivElement;
		this.touchMode = e.type == "touchstart";
		while(target != document.body && target != ref && target) {
			target = target.parentElement as HTMLDivElement;
		}
		if(target != ref) {
			this.expand = false;
		}
	}

	/**
	 * Move message previews
	 */
	private renderFrame():void {
		if(this.disposed) return;
		requestAnimationFrame(()=>this.renderFrame());
		
		if(!this.open) return;
		
		const holder = this.$refs.previewList as HTMLDivElement;
		if(!holder) return;
		
		const parentBounds = (this.$el as HTMLDivElement).getBoundingClientRect()
		const bounds = holder.getBoundingClientRect();
		const margin = 50;
		let py = this.mouseY - parentBounds.top + margin;
		if(py + bounds.height > (this.$el as HTMLDivElement).offsetHeight) {
			py = this.mouseY - parentBounds.top - bounds.height - margin;
		}

		holder.style.top = py+"px";
	}

}
</script>

<style scoped lang="less">
.messagelistfilter{
	padding: 0;
	color: @mainColor_light;
	background: @mainColor_normal;
	max-height: 100%;//min(100%, 300px);
	height: 100%;//min(100%, 300px);
	width: 100%;//min(100%, 300px);
	display: flex;
	flex-direction: row;
	border-bottom-left-radius: .5em;
	transform: translateX(100%);
	transition: transform .25s;
	position: relative;
	// opacity: .9;
	// opacity: .4;
	pointer-events: none;

	&.expand {
		transform: translateX(0);
	}

	.hoverActions {
		@size: 1.25em;
		margin-left: -@size;
		width: @size;
		display: flex;
		flex-direction: column;
		button {
			display: flex;
			align-items: center;
			pointer-events: all;
			padding: calc(@size/4);
			margin-bottom: .25em;
			width: @size;
			height: @size;
			min-width: @size;
			min-height: @size;
			background-color: @mainColor_normal;
			border-top-left-radius: .25em;
			border-bottom-left-radius: .25em;
			.icon {
				height: 100%;
				width: 100%;
			}
		}
	}

	.holder {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		padding: 1em;
		padding-top: .5em;
		pointer-events: all;
		.content {

			flex-grow: 1;
			display: flex;
			flex-direction: column;
			height: 100%;
			margin: auto;
			max-width: 500px;

			.head {
				display: flex;
				flex-direction: row;
				width: 100%;
				align-items: center;
				.title {
					flex-grow: 1;
					text-align: center;
				}
				.closeBt {
					background: none;
					border: none;
					padding: 0;
					width: 1em;
					height: 1em;
					cursor: pointer;
					.icon {
						height: 100%;
						width: 100%;
					}
				}
			}

			.info {
				margin: .5em 0;
				text-align: center;
			}
			.presets {
				display: flex;
				flex-direction: row;
				justify-content: space-around;
				flex-wrap: wrap;
				button {
					margin-bottom: .5em;
				}
			}

			.paramsList {
				flex-grow: 1;
				overflow: auto;
				margin: auto;
				padding: 0 .25em;
				&>.item{
					margin: auto;
					// font-size: .8em;
					&:not(:first-child) {
						margin-top: .25em;
					}
					&:hover {
						background-color: fade(@mainColor_light, 10%);
					}

					&.toggleAll {
						margin-right: 0;
					}
					&.child {
						font-size: .95em;
						@offset:1.25em;
						margin-left: @offset;
						width: calc(100% - @offset);
					}
				}
			}
			.error {
				padding: .5em;
				border-radius: .5em;
				margin-top: .5em;
				text-align: center;
				font-size: .8em;
				font-weight: bold;
				cursor: pointer;
				color:@mainColor_alert;
				background: @mainColor_light;
				
			}
			.ctas {
				margin-top: .5em;
				display: flex;
				flex-direction: row;
				justify-content: space-evenly;
			}
		}

		.previewList {
			position: absolute;
			width: calc(100% - 1em*2);
			max-width: 500px;
			transform: translateX(-50%);
			left: 50%;
			top: 99999px;
			.preview {
				background-color: @mainColor_dark;
				padding: .25em .5em;
				border-radius: .5em;
				cursor: pointer;
				.message {
					pointer-events: none;
				}
				.loader {
					text-align: center;
					margin: auto;
					display: block;
				}
	
				&:not(:last-child) {
					margin-bottom: .25em;
				}
			}
		}
	}
}
</style>