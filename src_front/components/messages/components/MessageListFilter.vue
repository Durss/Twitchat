<template >
	<div :class="classes" v-show="open" @wheel.stop>
		<button class="openBt" @click="expand = true">
			<img src="@/assets/icons/filters.svg" alt="open filters" class="icon">
		</button>

		<div class="holder" v-if="expand">
			<div class="head">
				<h1 class="title">Filters</h1>
				<button class="closeBt" @click="expand = false">
					<img src="@/assets/icons/cross_white.svg" alt="close filters" class="icon">
				</button>
			</div>

			<div class="content">
				<div class="info" v-if="expand">Choose which message types to display on this column</div>
				<ParamItem class="item" v-for="f in filters"
				:key="f.storage"
				:paramData="f"
				clearToggle
				@mouseout="previewData = []"
				@mouseover="previewMessage(f.storage as 'message'/* couldn't find a way to strongly cast storage type */)"
				v-model="config.filters[f.storage as 'message']" />
			</div>

			<div class="preview" v-if="loadingPreview">
				<img src="@/assets/loader/loader_white.svg" alt="loading" class="loader">
			</div>

			<div class="preview" v-for="m in previewData" :key="m.id">
				
				<ChatAd class="message"
					v-if="m.type == 'twitchat_ad'"
					@showModal="(v: string) => $emit('showModal', v)"
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

				<ChatHighlight v-else class="message"
					lightMode
					:messageData="m" />
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import ParamItem from '@/components/params/ParamItem.vue';
import ToggleButton from '@/components/ToggleButton.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
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

@Options({
	props:{
		modelValue:{type:Object, default: {}},
		open:{type:Boolean, default: false},
		config:Object,
	},
	components:{
		Button,
		ParamItem,
		ToggleButton,
		ChatAd,
		ChatConnect,
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
	emits: ['update:modelValue'],
})
export default class MessageListFilter extends Vue {
	
	public open!:boolean;
	public config!:TwitchatDataTypes.ChatColumnsConfig;

	public test = (typeof TwitchatDataTypes.MessageListFilterTypes);
	public expand:boolean = false;
	public typeToLabel!:{[key in typeof TwitchatDataTypes.MessageListFilterTypes[number]]:string};
	public typeToIcon!:{[key in typeof TwitchatDataTypes.MessageListFilterTypes[number]]:string};
	public filters:TwitchatDataTypes.ParameterData[] = [];
	public previewData:TwitchatDataTypes.ChatMessageTypes[] = [];
	public loadingPreview:boolean = false;
	public previewIndex:number = 0;
	
	private clickHandler!:(e:MouseEvent) => void;
	private messagesCache:Partial<{[key in typeof TwitchatDataTypes.MessageListFilterTypes[number]]:TwitchatDataTypes.ChatMessageTypes[]}> = {}

	public get classes():string[] {
		const res = ["messagelistfilter"];
		if(this.expand) res.push("expand");
		return res;
	}

	public beforeMount(): void {
		//@ts-ignore
		this.typeToLabel = {};
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
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.FOLLOWING] = "follow.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.COUNTDOWN] = "countdown.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.PREDICTION] = "prediction.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION] = "sub.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_SUMMARY] = "train.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN] = "train.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.COMMUNITY_BOOST_COMPLETE] = "boost.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION] = "channelpoints.svg";

		const sortedFilters:typeof TwitchatDataTypes.MessageListFilterTypes[number][] = [
			TwitchatDataTypes.TwitchatMessageType.MESSAGE,
			TwitchatDataTypes.TwitchatMessageType.WHISPER,
			TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION,
			TwitchatDataTypes.TwitchatMessageType.FOLLOWING,
			TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_SUMMARY,
			TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN,
			TwitchatDataTypes.TwitchatMessageType.CHEER,
			TwitchatDataTypes.TwitchatMessageType.RAID,
			TwitchatDataTypes.TwitchatMessageType.REWARD,
			TwitchatDataTypes.TwitchatMessageType.POLL,
			TwitchatDataTypes.TwitchatMessageType.PREDICTION,
			TwitchatDataTypes.TwitchatMessageType.BINGO,
			TwitchatDataTypes.TwitchatMessageType.RAFFLE,
			TwitchatDataTypes.TwitchatMessageType.COMMUNITY_BOOST_COMPLETE,
			TwitchatDataTypes.TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION,
			TwitchatDataTypes.TwitchatMessageType.JOIN,
			TwitchatDataTypes.TwitchatMessageType.LEAVE,
			TwitchatDataTypes.TwitchatMessageType.COUNTDOWN,
			TwitchatDataTypes.TwitchatMessageType.NOTICE,
		];

		this.filters = [];
		for (let i = 0; i < sortedFilters.length; i++) {
			const f = sortedFilters[i];
			this.filters.push({type:"toggle", value:this.config.filters[f], label:this.typeToLabel[f] ?? f, storage:f, icon:this.typeToIcon[f]});
		}
		
		this.clickHandler = (e:MouseEvent) => this.onClick(e);
		document.addEventListener("mousedown", this.clickHandler);
		
		//Close when rolling out col
		watch(()=>this.open, ()=>{ this.expand = false; });
	}

	public beforeUnmount():void {
		document.removeEventListener("mousedown", this.clickHandler);
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
			this.previewData = [];
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
	
				this.messagesCache[type]?.push(data);
	
				if(previewIndexLoc != this.previewIndex) return;
				this.previewData = [data];
			}, false);
		}
	}

	private onClick(e:MouseEvent):void {
		let target = e.target as HTMLDivElement;
		const ref = this.$el as HTMLDivElement;
		while(target != document.body && target != ref && target) {
			target = target.parentElement as HTMLDivElement;
		}
		if(target != ref) {
			this.expand = false;
		}
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

	&.expand {
		transform: translateX(0);
	}

	.openBt {
		cursor: pointer;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-left: -2em;
		width: 2em;
		height: 2em;
		background-color: @mainColor_normal;
		border-top-left-radius: .5em;
		border-bottom-left-radius: .5em;
		.icon {
			height: 100%;
			width: 100%;
		}
	}

	.holder {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		padding: 1em;
		padding-top: .5em;

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
				width: 1.5em;
				height: 1.5em;
				cursor: pointer;
				.icon {
					height: 100%;
					width: 100%;
				}
			}
		}
		.content {
			flex-grow: 1;
			overflow: auto;
			.info {
				margin: .5em 0;
				text-align: center;
			}
			.item{
				font-size: .8em;
				&:not(:first-child) {
					margin-top: .25em;
				}
				&:hover {
					background-color: fade(@mainColor_light, 10%);
				}
			}
		}

		.preview {
			background-color: @mainColor_dark;
			padding: .25em .5em;
			border-radius: .5em;
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
</style>