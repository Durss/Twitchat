<template>
	<div class="overlaycustomtrain">
		<OverlayCustomTrainRenderer class="train" v-if="configs"
			:showSuccess="false"
			:showApproaching="false"
			:showFail="false"
			:size="configs.textSize"
			:fontFamily="configs.textFont"
			:colorText="configs.colorFill"
			:colorBg="configs.colorBg"
			:eventDone="1"
			:eventCount="configs.triggerEventCount"

			:titleApproaching="configs.approachingLabel"
			:approachingEmote="configs.approachingEmote"

			:title="configs.title"

			:titleSuccess="configs.successLabel"
			:successEmote="configs.successEmote"

			:titleFail="configs.failedLabel"
			:failedEmote="configs.failedEmote"

			:levelName="configs.levelName"
			/>
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

	public configs:TwitchatDataTypes.CustomTrainData | null = null;

	private overlayId:string = "";
	private customTrainStateHandler!:(e:TwitchatEvent<TwitchatDataTypes.CustomTrainData>) => void;

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

	public onCustomTrainState(e:TwitchatEvent<TwitchatDataTypes.CustomTrainData>):void {
		console.log(e)
		if(!e.data) return;
		if(e.data.id !== this.overlayId) return;
		this.configs = e.data;
	}

}
export default toNative(OverlayCustomTrain);
</script>

<style scoped lang="less">
.overlaycustomtrain{

}
</style>
