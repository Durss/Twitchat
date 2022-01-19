<template>
	<div class="channelnotifications">
		<div class="notifications">
			<Button :icon="require('@/assets/icons/poll.svg')" small bounce @click="currentContent = 'poll'" v-if="$store.state.currentPoll?.id" />
			<Button :icon="require('@/assets/icons/prediction.svg')" small bounce @click="currentContent = 'prediction'" v-if="$store.state.currentPrediction?.id" />
		</div>
		<div ref="content">
			<transition name="slide">
				<PollState class="content" v-if="currentContent == 'poll' && $store.state.currentPoll?.id" />
				<PredictionState class="content" v-else-if="currentContent == 'prediction' && $store.state.currentPrediction?.id" />
			</transition>
		</div>
	</div>
</template>

<script lang="ts">
import store from '@/store';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import PollState from './PollState.vue';
import PredictionState from './PredictionState.vue';

@Options({
	props:{},
	components:{
		Button,
		PollState,
		PredictionState,
	}
})
export default class ChannelNotifications extends Vue {

	public currentContent:string = '';

	private clickHandler!:(e:MouseEvent) => void;

	public mounted():void {
		this.clickHandler = (e:MouseEvent) => this.onClick(e);
		document.addEventListener("mousedown", this.clickHandler);
		console.log(store.state.currentPrediction);
	}

	public beforeunmout():void {
		document.removeEventListener("mousedown", this.clickHandler);
	}

	private onClick(e:MouseEvent):void {
		let target = e.target as HTMLDivElement;
		const ref = this.$refs.content as HTMLDivElement;
		while(target != document.body && target != ref) {
			target = target.parentElement as HTMLDivElement;
		}
		if(target != ref) {
			this.currentContent = '';
		}
	}
}
</script>

<style scoped lang="less">
.channelnotifications{
	width: 100%;

	.notifications {
		display: flex;
		flex-direction: row;
		justify-content: flex-end;
		padding-right: 3px;
		.button {
			transform-origin: bottom;
			border-bottom-right-radius: 0;
			border-bottom-left-radius: 0;
			margin-left: 1px;
			padding-bottom: 10px;
			:deep(.icon) {
				width: 15px;
			}
		}
	}

	.content {
		position: absolute;
		padding: 10px;
		padding-bottom: 20px;
		background-color: darken(@mainColor_normal, 30%);
		box-shadow: 0px 0px 20px 0px rgba(0,0,0,1);
		border-radius: 10px;
		border-bottom-right-radius: 0;
		border-bottom-left-radius: 0;
		display: flex;
		flex-direction: column;
		width: 100%;
		transform: translateY(-100%);
	}

	.slide-enter-active {
		transition: all 0.2s;
	}

	.slide-leave-active {
		transition: all 0.2s;
	}
	
	.slide-enter-from,
	.slide-leave-to {
		transform: translateY(0);
	}
}
</style>