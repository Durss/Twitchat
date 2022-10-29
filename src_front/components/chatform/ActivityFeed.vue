<template>
	<div :class="classes">
		<div class="head">
			<h1 v-if="!listMode !== false">Activity feed</h1>
		</div>

		<div v-if="messages.length == 0" class="noActivity">- No activity yet -</div>

		<ActivityFeedFilters v-model="filters" class="filters" />
		
		<Button class="trainFilter" title="Hype train events"
			v-if="customActivities.length > 0"
			@click="customActivities = []; updateActivityFeed();"
			:icon="$image('icons/back.svg')" />

		<div v-if="messages.length > 0" class="messageList">
			<div v-for="(m,index) in messages" :key="m.id">
				<ChatMessage
					class="message"
					ref="message"
					v-if="m.type == 'message'"
					:messageData="m"
					:data-index="index"
					:lightMode="true" />

				<ChatJoinLeave class="message"
					:messageData="m"
					v-if="m.type == 'join' || m.type == 'leave'"
					:ref="'message_'+m.id"
				/>

				<ChatPollResult
					class="message"
					ref="message"
					v-else-if="m.type == 'poll'"
					:pollData="m" />

				<ChatPredictionResult
					class="message"
					ref="message"
					v-else-if="m.type == 'prediction'"
					:predictionData="m" />

				<ChatNotice
					class="message"
					ref="message"
					v-else-if="isCommercial(m)"
					:messageData="m"
					/>

				<ChatBingoResult
					class="message"
					ref="message"
					v-else-if="m.type == 'bingo'"
					:bingoData="m" />

				<ChatRaffleResult
					class="message"
					ref="message"
					v-else-if="m.type == 'raffle'"
					:raffleData="m" />

				<ChatCountdownResult
					class="message"
					ref="message"
					v-else-if="m.type == 'countdown'"
					:countdownData="m" />

				<ChatHypeTrainResult
					class="message"
					ref="message"
					v-else-if="m.type == 'hype_train_summary'"
					:result="m"
					:filtering="customActivities.length > 0"
					@setCustomActivities="(list:any[])=> showCustomActivities(list)"/>
					
				<ChatNotice
					v-else-if="m.type == 'notice'"
					class="message"
					:messageData="m"
					:ref="'message_'+m.id"
					/>

				<ChatFollowbotEvents
					class="message"
					ref="message"
					:messageData="m"
					v-else-if="m.type == 'followbot_list'"
					:result="m" />

				<ChatHighlight
					class="message"
					ref="message"
					v-else
					:messageData="m"
					:data-index="index"
					:lightMode="true" />
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import DataStore from '@/store/DataStore';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ChatBingoResult from '../messages/ChatBingoResult.vue';
import ChatCountdownResult from '../messages/ChatCountdownResult.vue';
import ChatHighlight from '../messages/ChatHighlight.vue';
import ChatHypeTrainResult from '../messages/ChatHypeTrainResult.vue';
import ChatMessage from '../messages/ChatMessage.vue';
import ChatNotice from '../messages/ChatNotice.vue';
import ChatPollResult from '../messages/ChatPollResult.vue';
import ChatPredictionResult from '../messages/ChatPredictionResult.vue';
import ChatRaffleResult from '../messages/ChatRaffleResult.vue';
import ActivityFeedFilters from './ActivityFeedFilters.vue';
import ChatJoinLeave from '../messages/ChatJoinLeave.vue';
import ChatFollowbotEvents from '../messages/ChatFollowbotEvents.vue';

@Options({
	props:{
		listMode: {
			type: Boolean,
			default: false,
		},
	},
	components:{
		Button,
		ChatNotice,
		ChatMessage,
		ChatHighlight,
		ChatJoinLeave,
		ChatPollResult,
		ChatBingoResult,
		ChatRaffleResult,
		ChatFollowbotEvents,
		ActivityFeedFilters,
		ChatCountdownResult,
		ChatHypeTrainResult,
		ChatPredictionResult,
	}
})
export default class ActivityFeed extends Vue {

	public listMode!:boolean;

	public filterKeys = "sub,follow,bits,raid,poll,prediction,bingo,raffle";
	public filters:{[key:string]:boolean} = {};
	public messages:TwitchatDataTypes.ChatMessageTypes[] = [];
	public customActivities:TwitchatDataTypes.ChatMessageTypes[] = [];
	
	private clickHandler!:(e:MouseEvent) => void;

	public isCommercial(m:TwitchatDataTypes.ChatMessageTypes):boolean {
		return m.type == "notice" && (
			m.noticeId == TwitchatDataTypes.TwitchatNoticeType.COMMERCIAL_START ||
			m.noticeId == TwitchatDataTypes.TwitchatNoticeType.COMMERCIAL_ERROR ||
			m.noticeId == TwitchatDataTypes.TwitchatNoticeType.COMMERCIAL_COMPLETE
		)
	}

	public get classes():string[] {
		const res = ["activityfeed"];
		if(this.listMode !== false) res.push("listMode");
		return res;
	}
	
	public beforeMount():void {
		const f = DataStore.get(DataStore.ACTIVITY_FEED_FILTERS);
		let json:{[key:string]:boolean} = {};
		try {
			json = JSON.parse(f);
		}catch(e) {
			if(typeof(f) == "string") {
				//Migrate old data format:
				//	"sub,follow,bits,..."
				//To new format:
				//	{sub:true, follow:false, bits:true}
				const items = f.split(",");
				for (let i = 0; i < items.length; i++) {
					const key = items[i];
					json[key] = true;
				}
				for (let i = 0; i < this.filterKeys.split(",").length; i++) {
					const key = this.filterKeys.split(",")[i];
					if(json[key] === undefined) json[key] = false;
				}
			}
		}
		if(f) this.filters = json;
	}

	public async mounted():Promise<void> {

		watch(()=>this.filters, ()=> {
			DataStore.set(DataStore.ACTIVITY_FEED_FILTERS, this.filters);
			this.updateActivityFeed();
		});

		watch(()=>this.$store("chat").activityFeed, ()=> {
			this.updateActivityFeed()
		}, {deep:true});

		this.updateActivityFeed();

		await this.$nextTick();
		if(this.listMode === false) {
			this.clickHandler = (e:MouseEvent) => this.onClick(e);
			document.addEventListener("mousedown", this.clickHandler);
			this.open();
		}
	}

	public beforeUnmount():void {
		if(this.listMode === false) {
			document.removeEventListener("mousedown", this.clickHandler);
		}
	}

	public showCustomActivities(list:TwitchatDataTypes.ChatMessageTypes[]):void {
		this.customActivities = list;
		this.updateActivityFeed();
	}

	public updateActivityFeed():void {
		const s = Date.now();
		const list = this.customActivities.length > 0? this.customActivities : this.$store("chat").activityFeed;

		const result:TwitchatDataTypes.ChatMessageTypes[] = [];

		const showSubs			= this.filters["sub"] === true || this.filters["sub"] === undefined;
		const showFollow		= this.filters["follow"] === true || this.filters["follow"] === undefined;
		const showBits			= this.filters["bits"] === true || this.filters["bits"] === undefined;
		const showRaids			= this.filters["raid"] === true || this.filters["raid"] === undefined;
		const showRewards		= this.filters["rewards"] === true || this.filters["rewards"] === undefined;
		const showPolls			= this.filters["poll"] === true || this.filters["poll"] === undefined;
		const showPredictions	= this.filters["prediction"] === true || this.filters["prediction"] === undefined;
		const showBingos		= this.filters["bingo"] === true || this.filters["bingo"] === undefined;
		const showRaffles		= this.filters["raffle"] === true || this.filters["raffle"] === undefined;

		for (let i = 0; i < list.length; i++) {
			const m = list[i];
			let type = m.type;
			let show = false;
			if(m.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
				//It's an highlighted or elevated message
				show =  (this.$store("params").features.keepHighlightMyMessages.value === true && m.twitch_isHighlighted) || m.elevatedInfo != undefined;
			}
			
			else if((type == TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION)) show = showSubs;
			else if(type == TwitchatDataTypes.TwitchatMessageType.REWARD) show = showRewards;
			else if(type == TwitchatDataTypes.TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION) show = showRewards;
			else if(type == TwitchatDataTypes.TwitchatMessageType.RAID) show = showRaids;
			else if(type == TwitchatDataTypes.TwitchatMessageType.CHEER) show = showBits;
			else if(type == TwitchatDataTypes.TwitchatMessageType.FOLLOWING) show = showFollow;
			else if(type == TwitchatDataTypes.TwitchatMessageType.POLL) show = showPolls;
			else if(type == TwitchatDataTypes.TwitchatMessageType.PREDICTION) show = showPredictions;
			else if(type == TwitchatDataTypes.TwitchatMessageType.BINGO) show = showBingos;
			else if(type == TwitchatDataTypes.TwitchatMessageType.RAFFLE) show = showRaffles;
			else show = true;;

			if(show) result.unshift(m);
		}

		this.messages = result;
		const e = Date.now();
		// console.log(e-s);
	}

	private open():void {
		const ref = this.$el as HTMLDivElement;
		gsap.killTweensOf(ref);
		gsap.from(ref, {duration:.2, scaleY:0, clearProps:"scaleY", ease:"back.out(5)"});
	}

	private close():void {
		const ref = this.$el as HTMLDivElement;
		gsap.killTweensOf(ref);
		gsap.to(ref, {duration:.2, scaleY:0, clearProps:"scaleY, scaleX", ease:"back.in(5)", onComplete:() => {
			this.$emit("close");
		}});
	}

	private onClick(e:MouseEvent):void {
		let target = e.target as HTMLDivElement;
		const ref = this.$el as HTMLDivElement;
		while(target != document.body && target != ref && target) {
			target = target.parentElement as HTMLDivElement;
		}
		if(target != ref) {
			this.close();
		}
	}
}
</script>

<style scoped lang="less">
.activityfeed{
	.window();
	// width: min-content;
	right: 0;
	left: auto;
	margin-left: auto;
	transform-origin: bottom center;
	position: relative;

	.trainFilter {
		border-radius: 0;
		:deep(.label) {
			flex-grow: 1;
		}
	}

	&.listMode {
		background: none;
		box-shadow: unset;
		flex-grow: 1;
		padding: 0;
		overflow: visible;

		.head {
			top: 5px;
			right: 3px;
		}

		.messageList {
			max-height: unset;
			min-height: auto;
			flex-grow: 1;
			justify-self: flex-end;
		}

		.activityfeed {
			width: 100%;
		}
	}

	.head {
		h1 {
			color: @mainColor_light;
			align-self: center;
			text-align: center;
			margin-bottom: 10px;
		}
	}

	.filters {
		position: absolute;
		right: 0;
		top: 0;
	}

	.noActivity {
		font-style: italic;
		color: @mainColor_light;
		font-size: 12px;
		text-align: center;
		margin: 15px 0;
		opacity: .5;
	}

	.messageList{
		max-height: 50vh;
		min-height: 30px;
		overflow-y: auto;
		.message{
			margin: .5em 0;
			font-size: var(--messageSize);

			:deep(.time) {
				color: fade(#ffffff, 75%);
				margin-right: 5px;
				vertical-align: middle;
			}
		}
	}
}
</style>