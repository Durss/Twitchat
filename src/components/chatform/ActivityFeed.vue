<template>
	<div :class="classes">
		<div class="head">
			<h1 v-if="!listMode">Activity feed</h1>
		</div>

		<div v-if="messages.length == 0" class="noActivity">- No activity yet -</div>

		<ActivityFeedFilters v-model="filters" class="filters" />
		
		<Button class="trainFilter" title="Hype train events"
			v-if="customActivities.length > 0"
			@click="customActivities = []"
			:icon="$image('icons/back.svg')" />

		<div v-if="messages.length > 0" class="messageList">
			

			<div v-for="(m,index) in messages" :key="m.tags.id">
				<ChatMessage
					class="message"
					ref="message"
					v-if="m.type == 'message'"
					:messageData="m"
					:data-index="index"
					:lightMode="true" />

				<ChatHighlight
					class="message"
					ref="message"
					v-if="m.type == 'highlight'"
					:messageData="m"
					:data-index="index"
					:lightMode="true" />

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
					v-else-if="m.type == 'hype_train_end'"
					:result="m"
					:filtering="customActivities.length > 0"
					@setCustomActivities="(list:any[])=> customActivities = list"/>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import Store from '@/store/Store';
import { TwitchatMessageType, getTwitchatMessageType, type ActivityFeedData } from '@/utils/IRCEventDataTypes';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';
import ChatBingoResult from '../messages/ChatBingoResult.vue';
import ChatHighlight from '../messages/ChatHighlight.vue';
import ChatMessage from '../messages/ChatMessage.vue';
import ChatNotice from '../messages/ChatNotice.vue';
import ChatPollResult from '../messages/ChatPollResult.vue';
import ChatPredictionResult from '../messages/ChatPredictionResult.vue';
import ChatRaffleResult from '../messages/ChatRaffleResult.vue';
import ActivityFeedFilters from './ActivityFeedFilters.vue';
import ChatCountdownResult from '../messages/ChatCountdownResult.vue';
import StoreProxy from '@/utils/StoreProxy';
import ChatHypeTrainResult from '../messages/ChatHypeTrainResult.vue';
import Button from '../Button.vue';

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
		ChatPollResult,
		ChatBingoResult,
		ChatRaffleResult,
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
	public customActivities:ActivityFeedData[] = [];
	
	private clickHandler!:(e:MouseEvent) => void;

	public isCommercial(m:ActivityFeedData):boolean { return m.type == "notice" && m.tags['msg-id'] == 'commercial' }

	public get classes():string[] {
		const res = ["activityfeed"];
		if(this.listMode === true) res.push("listMode");
		return res;
	}
	
	public get messages():ActivityFeedData[] {
		const list = this.customActivities.length > 0? this.customActivities : (StoreProxy.store.state.activityFeed as ActivityFeedData[]);

		const result:ActivityFeedData[] = [];

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

			let type = getTwitchatMessageType(m);
			
			if((type == TwitchatMessageType.SUB
			|| type == TwitchatMessageType.SUBGIFT
			|| type == TwitchatMessageType.SUB_PRIME
			|| type == TwitchatMessageType.SUBGIFT_UPGRADE) && showSubs) result.unshift(m);
			else if(type == TwitchatMessageType.REWARD && showRewards) result.unshift(m);
			else if(type == TwitchatMessageType.CHALLENGE_CONTRIBUTION && showRewards) result.unshift(m);
			else if(type == TwitchatMessageType.RAID && showRaids) result.unshift(m);
			else if(type == TwitchatMessageType.BITS && showBits) result.unshift(m);
			else if(type == TwitchatMessageType.FOLLOW && showFollow) result.unshift(m);
			else if(type == TwitchatMessageType.POLL && showPolls) result.unshift(m);
			else if(type == TwitchatMessageType.PREDICTION && showPredictions) result.unshift(m);
			else if(type == TwitchatMessageType.BINGO && showBingos) result.unshift(m);
			else if(type == TwitchatMessageType.RAFFLE && showRaffles) result.unshift(m);
			else if(type == TwitchatMessageType.COMMERCIAL) result.unshift(m);
			else if(type == TwitchatMessageType.COUNTDOWN) result.unshift(m);
			else if(type == TwitchatMessageType.HYPE_TRAIN_COOLDOWN_EXPIRED) result.unshift(m);
			else if(type == TwitchatMessageType.MESSAGE) result.unshift(m);
			else if(type == TwitchatMessageType.COMMUNITY_BOOST_COMPLETE) result.unshift(m);
			else if(type == TwitchatMessageType.HYPE_TRAIN_END) result.unshift(m);
			else if(type == TwitchatMessageType.AUTOBAN_JOIN) result.unshift(m);
		}
		
		return result;
	}

	public beforeMount():void {
		const f = Store.get(Store.ACTIVITY_FEED_FILTERS);
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
		if(!this.filters) this.filters = {};
	}

	public async mounted():Promise<void> {

		watch(()=>this.filters, ()=> {
			Store.set(Store.ACTIVITY_FEED_FILTERS, this.filters);
		});

		await this.$nextTick();
		if(!this.listMode) {
			this.clickHandler = (e:MouseEvent) => this.onClick(e);
			document.addEventListener("mousedown", this.clickHandler);
			this.open();
		}
	}

	public beforeUnmount():void {
		if(!this.listMode) {
			document.removeEventListener("mousedown", this.clickHandler);
		}
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
		font-size: .8em;
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