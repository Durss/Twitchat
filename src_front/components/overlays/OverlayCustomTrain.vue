<template>
	<div class="overlaycustomtrain">
		<transition name="scaleY">
			<OverlayCustomTrainRenderer class="train" v-if="configs && state && state.amount > 0 && state.activities.length >= configs.approachEventCount" key="train"
				:showSuccess="false"
				:showApproaching="showApproaching"
				:showFail="false"
				:size="configs.textSize"
				:fontFamily="fontName"
				:colorText="configs.colorFill"
				:colorBg="configs.colorBg"
				:eventCount="configs.triggerEventCount"
				:recordColorText="configs.recordColorFill"
				:recordColorBg="configs.recordColorBg"

				:titleLevelUp="configs.levelUpLabel"
				:levelUpEmote="configs.levelUpEmote"

				:titleApproaching="configs.approachingLabel"
				:approachingEmote="configs.approachingEmote"

				:title="configs.title"

				:titleSuccess="configs.successLabel"
				:titleSuccessSummary="configs.successLabelSummary"
				:successEmote="configs.successEmote"

				:titleFail="configs.failedLabel"
				:failedEmote="configs.failedEmote"

				:titleRecord="configs.recordLabel"
				:recordEmote="configs.recordEmote"

				:levelName="configs.levelName"

				:isRecord="!showApproaching && isRecord"
				:eventDone="state?.activities.length || 2"
				:level="showApproaching? 0 : currentLevel.index"
				:percent="showApproaching? 0 : progressPercent"
				:amountLeft="showApproaching? 0 : Math.ceil(Math.max(0, 1-progressPercent) * currentLevel.goal)"
				:amountLeftFormat="configs.currency"
				:expiresAt="configs.expires_at"
				:recordPercent="recordPercent"
				:recordLevel="recordLevel"

				@close="state = null"
				@lock="locked = true"
				@unlock="locked = false"
				/>
		</transition>
	</div>
</template>

<script lang="ts">
import { Component, toNative } from 'vue-facing-decorator';
import AbstractOverlay from './AbstractOverlay';
import PublicAPI from '@/utils/PublicAPI';
import TwitchatEvent from '@/events/TwitchatEvent';
import OverlayCustomTrainRenderer from './custom_train/OverlayCustomTrainRenderer.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';

@Component({
	components:{
		OverlayCustomTrainRenderer,
	},
	emits:[],
})
class OverlayCustomTrain extends AbstractOverlay {

	public locked = false;
	public isRecord = false;
	public recordPercent = -1;
	public recordLevel = -1;
	public showApproaching = false;
	public fontName = "";
	public configs:TwitchatDataTypes.CustomTrainData | null = null;
	public state:TwitchatDataTypes.CustomTrainState | null = null;

	private overlayId:string = "";
	private styleNode:HTMLStyleElement|null = null;
	private customTrainStateHandler!:(e:TwitchatEvent<{configs:TwitchatDataTypes.CustomTrainData, state:TwitchatDataTypes.CustomTrainState}>) => void;


	public get progressPercent():number {
		if(!this.state || !this.configs) return 1;
		return (this.state.amount - this.currentLevel.offset) / this.currentLevel.goal;
	}

	public get currentLevel() {
		if(!this.state || !this.configs) return {index:0, offset:0, goal:1};

		const levels = this.configs.levelAmounts.concat().sort((a,b)=>a - b);
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

		this.styleNode = document.createElement("style");
		document.head.appendChild(this.styleNode);
	}

	public beforeUnmount():void {
		PublicAPI.instance.removeEventListener(TwitchatEvent.CUSTOM_TRAIN_STATE, this.customTrainStateHandler);
		if(this.styleNode) {
			document.head.removeChild(this.styleNode);
			this.styleNode = null;
		}
	}

	public requestInfo():void {
		PublicAPI.instance.broadcast(TwitchatEvent.GET_CUSTOM_TRAIN_STATE, {id:this.overlayId});
	}

	public onCustomTrainState(e:TwitchatEvent<{configs:TwitchatDataTypes.CustomTrainData, state:TwitchatDataTypes.CustomTrainState}>):void {
		if(!e.data || !e.data.configs) return;
		if(e.data.configs.id !== this.overlayId) return;
		if(this.locked) return;

		this.configs = e.data.configs;
		this.state = e.data.state;
		
		this.fontName = "train-font-"+this.configs.id;

		this.styleNode!.innerHTML = `
		@font-face {
			font-family: "${this.fontName}";
			src: local("${this.configs.textFont}");
		}`;

		if(this.state) {
			if(this.state.activities.length < this.configs.triggerEventCount) {
				this.showApproaching = true;
			}else if(this.showApproaching) {
				// Show last ticked cell for 1 second
				setTimeout(() => {
					this.showApproaching = false;
				}, 1000);
			}

			const wasRecord = this.isRecord;

			const record = Utils.getAllTimeRecord(this.configs);
			this.isRecord = !this.configs.allTimeRecord || !record? false : this.state.amount >= record?.amount
			if(!wasRecord
			&& record
			&& this.currentLevel.index == record.level+1) {
				this.recordLevel = record.level+1;
				this.recordPercent = record.percent;
			}else{
				this.recordLevel = -1;
				this.recordPercent = -1;
			}
		}
	}

}
export default toNative(OverlayCustomTrain);
</script>

<style scoped lang="less">
.overlaycustomtrain{
	.train {
		transition: all .35s;
		transform: scaleY(1);
	}

	.scaleY-enter-from,
	.scaleY-leave-to {
		transform: scaleY(0);
	}
}
</style>
