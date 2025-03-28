<template>
	<div class="overlaycustomtrain">
		<transition name="scaleY">
			<OverlayCustomTrainRenderer class="train" v-if="configs && state && state.amount > 0"
				:showSuccess="false"
				:showApproaching="showApproaching"
				:showFail="false"
				:size="configs.textSize"
				:fontFamily="configs.textFont"
				:colorText="configs.colorFill"
				:colorBg="configs.colorBg"
				:eventCount="configs.triggerEventCount"

				:titleLevelUp="configs.levelUpLabel"
				:levelUpEmote="configs.levelUpEmote"

				:titleApproaching="configs.approachingLabel"
				:approachingEmote="configs.approachingEmote"

				:title="configs.title"

				:titleSuccess="configs.successLabel"
				:successEmote="configs.successEmote"

				:titleFail="configs.failedLabel"
				:failedEmote="configs.failedEmote"

				:levelName="configs.levelName"

				:isRecord="!configs.allTimeRecord? false : state.amount > configs.allTimeRecord.amount"
				:eventDone="(state?.activities.length || 2) - 1"
				:level="currentLevel.index"
				:percent="progressPercent"
				:amountLeft="Math.ceil(Math.max(0, 1-progressPercent) * currentLevel.goal)"
				/>
		</transition>
			{{ state?.amount.toFixed(1) }}
	</div>
</template>

<script lang="ts">
import { Component, toNative } from 'vue-facing-decorator';
import AbstractOverlay from './AbstractOverlay';
import PublicAPI from '@/utils/PublicAPI';
import TwitchatEvent from '@/events/TwitchatEvent';
import OverlayCustomTrainRenderer from './custom_train/OverlayCustomTrainRenderer.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';

@Component({
	components:{
		OverlayCustomTrainRenderer,
	},
	emits:[],
})
class OverlayCustomTrain extends AbstractOverlay {

	public showApproaching = false;
	public configs:TwitchatDataTypes.CustomTrainData | null = null;
	public state:TwitchatDataTypes.CustomTrainState | null = null;

	private overlayId:string = "";
	private customTrainStateHandler!:(e:TwitchatEvent<{configs:TwitchatDataTypes.CustomTrainData, state:TwitchatDataTypes.CustomTrainState}>) => void;


	public get progressPercent():number {
		if(!this.state || !this.configs) return 1;
		return (this.state.amount - this.currentLevel.offset) / this.currentLevel.goal;
	}

	public get currentLevel() {
		if(!this.state || !this.configs) return {index:0, offset:0, goal:1};

		const levels = (this.configs.levelAmounts.match(/(\d|\.)+/g) || [])
				.filter(v=> !isNaN(parseFloat(v)))
				.map(v=>parseFloat(v))
				.sort((a,b)=>a - b);

		levels.unshift(0);

		// Find neareset level
		let offset = 0;
		let goal = levels[0] || 0;
		let i = 0;
		for (i = 1; i < levels.length; i++) {
			const level = levels[i];
			if(level > this.state.amount || i === levels.length - 1) {
				offset = levels[i-1];
				goal = level - offset;
				break;
			}
		}
		return {index:i, offset, goal}
	}

	public beforeMount():void {
		this.customTrainStateHandler = (e) => this.onCustomTrainState(e)
		PublicAPI.instance.addEventListener(TwitchatEvent.CUSTOM_TRAIN_STATE, this.customTrainStateHandler);

		this.overlayId = this.$route.query.twitchat_overlay_id as string ?? "";
	}

	public beforeUnmount():void {
		PublicAPI.instance.removeEventListener(TwitchatEvent.CUSTOM_TRAIN_STATE, this.customTrainStateHandler);
	}

	public requestInfo():void {
		PublicAPI.instance.broadcast(TwitchatEvent.GET_CUSTOM_TRAIN_STATE, {id:this.overlayId});
	}

	public onCustomTrainState(e:TwitchatEvent<{configs:TwitchatDataTypes.CustomTrainData, state:TwitchatDataTypes.CustomTrainState}>):void {
		if(!e.data || !e.data.configs) return;
		if(e.data.configs.id !== this.overlayId) return;

		const prevLevel = this.currentLevel;
		this.configs = e.data.configs;
		this.state = e.data.state;
		if(this.state) {
			if(this.state.activities.length - 1 < this.configs.triggerEventCount) {
				this.showApproaching = true;
			}else if(this.showApproaching) {
				setTimeout(() => {
					this.showApproaching = false;
				}, 1000);
			}
		}
	}

}
export default toNative(OverlayCustomTrain);
</script>

<style scoped lang="less">
.overlaycustomtrain{
	.train {
		transition: all 0.25s;
		transform: scaleY(1);
	}

	.scaleY-enter-from,
	.scaleY-leave-to {
		transform: scaleY(0);
	}
}
</style>
