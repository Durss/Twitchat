<template>
	<div class="channelnotifications">
		<div ref="content" class="holder">
			<transition name="slide">
				<PollState class="content" v-if="showPoll" />
				<ChatSuggestionState class="content" v-else-if="showChatPoll" />
				<PredictionState class="content" v-else-if="showPrediction" />
				<TrackedUsers class="content" v-else-if="showTrackedUsers" />
				<RaffleState class="content" v-else-if="showRaffle" />
				<WhispersState class="content" v-else-if="showWhispers" />
				<BingoState class="content" v-else-if="showBingo" />
				<DeezerState class="content" v-else-if="showDeezer" />
			</transition>

			<transition name="slide">
				<MessageSearch class="content" v-if="$store('chat').searchMessages" />
			</transition>

			<transition name="slide">
				<RaidState class="content" v-if="showRaid" />
			</transition>

			<transition name="slide">
				<HypeTrainState class="content" v-if="showHypeTrain" />
			</transition>

				<Button class="closeBt clearButton" v-if="showClose"
					aria-label="Close current content"
					:icon="$image('icons/cross_white.svg')"
					@click="$emit('close')" />
		</div>
	</div>
</template>

<script lang="ts">
import { watch } from '@vue/runtime-core';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import MessageSearch from '../chatform/MessageSearch.vue';
import BingoState from './BingoState.vue';
import ChatSuggestionState from './ChatSuggestionState.vue';
import DeezerState from './DeezerState.vue';
import HypeTrainState from './HypeTrainState.vue';
import PollState from './PollState.vue';
import PredictionState from './PredictionState.vue';
import RaffleState from './RaffleState.vue';
import RaidState from './RaidState.vue';
import TrackedUsers from './TrackedUsers.vue';
import WhispersState from './WhispersState.vue';

@Options({
	props:{
		currentContent:String,
	},
	components:{
		Button,
		PollState,
		RaidState,
		BingoState,
		DeezerState,
		RaffleState,
		TrackedUsers,
		MessageSearch,
		WhispersState,
		HypeTrainState,
		PredictionState,
		ChatSuggestionState,
	},
	emits:['close','showDimmer', 'hideDimmer'],
})
export default class ChannelNotifications extends Vue {

	public currentContent!:string;
	
	private clickHandler!:(e:MouseEvent) => void;

	public get showRaid():boolean { return this.$store("stream").currentRaid != null; }
	public get showHypeTrain():boolean { return this.$store("stream").hypeTrain != undefined; }
	public get showPoll():boolean { return this.currentContent == 'poll' && this.$store("poll").data?.id != null; }
	public get showChatPoll():boolean { return this.currentContent == 'chatpoll' && this.$store("chatSuggestion").data != null; }
	public get showPrediction():boolean { return this.currentContent == 'prediction' && this.$store("prediction").data?.id != null; }
	public get showRaffle():boolean { return this.currentContent == 'raffle' && this.$store("raffle").data != null && this.$store("raffle").data!.mode == "chat"; }
	public get showBingo():boolean { return this.currentContent == 'bingo' && this.$store("bingo").data != null; }
	public get showWhispers():boolean { return this.currentContent == 'whispers' && this.whispersAvailable; }
	public get showDeezer():boolean { return this.currentContent == 'deezer' && this.$store("music").deezerConnected; }
	public get showTrackedUsers():boolean { return this.currentContent == 'trackedUsers'; }

	public get showClose():boolean {
		return this.showPoll
			|| this.showBingo
			|| this.showRaffle
			|| this.showChatPoll
			|| this.showWhispers
			|| this.showPrediction
			|| this.showTrackedUsers
			|| this.showDeezer
		;
	}

	public get whispersAvailable():boolean {
		const whispers = this.$store("chat").whispers;
		for (const key in whispers) {
			if (whispers[key].length > 0) return true;
		}
		return false;
	}
	
	public mounted():void {
		this.clickHandler = (e:MouseEvent) => this.onClick(e);
		document.addEventListener("mousedown", this.clickHandler);

		watch(()=>this.showClose, ()=> {
			if(this.showClose) this.$emit("showDimmer");
			else this.$emit("hideDimmer");
		})
	}

	public beforeUnmount():void {
		document.removeEventListener("mousedown", this.clickHandler);
	}

	private onClick(e:MouseEvent):void {
		let target = e.target as HTMLDivElement;
		const ref = this.$refs.content as HTMLDivElement;
		while(target != document.body && target != ref && target) {
			target = target.parentElement as HTMLDivElement;
		}
		if(target != ref) {
			this.$emit("close");
		}
	}
}
</script>

<style scoped lang="less">
.channelnotifications{
	width: 100%;
	pointer-events:none;

	.holder {
		position: relative;

		.content {
			pointer-events:all;
			padding: 10px;
			padding-bottom: 10px;
			background-color: @windowStateColor;
			box-shadow: 0px 0px 20px 0px rgba(0,0,0,1);
			border-radius: 10px;
			border-bottom-right-radius: 0;
			border-bottom-left-radius: 0;
			display: flex;
			flex-direction: column;
			width: 100%;
			max-height: 50vh;//calc(100vh - 100px);
			overflow-y: auto;
			margin-bottom: 0;
			z-index: 1;
		}

		.closeBt {
			position: absolute;
			top:10px;
			right:10px;
			width: 1.5em;
			height: 1.5em;
			padding: 0;
			z-index: 1;
			pointer-events:all;
		}

		.slide-enter-active {
			transition: all 0.2s;
		}

		.slide-leave-active {
			transition: all 0.2s;
		}
		
		.slide-enter-from,
		.slide-leave-to {
			// max-height: 0;
			// padding: 0;
			// transform: scaleY(0);
			// transform: translateY(100%);
			// margin-bottom: -10vh;
			margin-bottom: -400px;//calc(-100vh + 100px);
		}
	}
}
</style>