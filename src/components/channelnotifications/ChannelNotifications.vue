<template>
	<div class="channelnotifications">
		<div ref="content">
			<transition name="slide">
				<PollState class="content" v-if="currentContent == 'poll' && $store.state.currentPoll?.id" />
				<PredictionState class="content" v-else-if="currentContent == 'prediction' && $store.state.currentPrediction?.id" />
				<TrackedUsers class="content" v-else-if="currentContent == 'trackedUsers'" />
				<RaffleState class="content" v-else-if="currentContent == 'raffle' && $store.state.raffle.command" />
				<WhispersState class="content" v-else-if="currentContent == 'whispers' && whispersAvailable" />
			</transition>

			<transition name="slide">
				<RaidState class="content" v-if="$store.state.raiding" />
			</transition>

			<transition name="slide">
				<HypeTrainState class="content" v-if="$store.state.params.filters.showHypeTrain.value && $store.state.hypeTrain?.level" />
			</transition>
		</div>
	</div>
</template>

<script lang="ts">
import store from '@/store';
import { IRCEventDataList } from '@/utils/IRCEvent';
import { Options, Vue } from 'vue-class-component';
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
		PollState,
		RaffleState,
		RaidState,
		HypeTrainState,
		TrackedUsers,
		WhispersState,
		PredictionState,
	},
	emits:['goToLastRead', 'close'],
})
export default class ChannelNotifications extends Vue {

	public currentContent!:string;

	private clickHandler!:(e:MouseEvent) => void;

	public get whispersAvailable():boolean {
		const whispers:{[key:string]:IRCEventDataList.Whisper[]} = store.state.whispers;
		for (const key in store.state.whispers) {
			if (whispers[key].length > 0) return true;
		}
		return false;
	}

	public mounted():void {
		this.clickHandler = (e:MouseEvent) => this.onClick(e);
		document.addEventListener("mousedown", this.clickHandler);
	}

	public beforeUnmout():void {
		document.removeEventListener("mousedown", this.clickHandler);
	}

	private onClick(e:MouseEvent):void {
		let target = e.target as HTMLDivElement;
		const ref = this.$refs.content as HTMLDivElement;
		while(target != document.body && target != ref) {
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

	.content {
		pointer-events:all;
		// position: absolute;
		padding: 10px;
		padding-bottom: 20px;
		background-color: darken(@mainColor_normal, 20%);
		box-shadow: 0px 0px 20px 0px rgba(0,0,0,1);
		border-radius: 10px;
		border-bottom-right-radius: 0;
		border-bottom-left-radius: 0;
		display: flex;
		flex-direction: column;
		width: 100%;
		max-height: calc(100vh - 100px);
		overflow-y: auto;
		max-height: 500px;
		transform: scaleY(100%);
		transform-origin: bottom center;
	}

	.slide-enter-active {
		transition: all 0.2s;
	}

	.slide-leave-active {
		transition: all 0.2s;
	}
	
	.slide-enter-from,
	.slide-leave-to {
		max-height: 0;
		padding: 0;
		transform: scaleY(0);
	}
}
</style>