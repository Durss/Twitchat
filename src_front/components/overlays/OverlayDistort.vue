<template>
	<div class="overlaydistort">
		<DistortionLiquid :params="distortionData" v-if="distortionData && distortionData.effect == 'liquid'" />
		<DistortionExpand :params="distortionData" v-if="distortionData && distortionData.effect == 'expand'" />
		<DistortionHeart :params="distortionData" v-if="distortionData && distortionData.effect == 'heart'" />
		<DistortShrink :params="distortionData" v-if="distortionData && distortionData.effect == 'shrink'" />
	</div>
</template>

<script lang="ts">
import TwitchatEvent from '@/events/TwitchatEvent';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import Utils from '@/utils/Utils';
import { Component } from 'vue-facing-decorator';
import AbstractOverlay from './AbstractOverlay';
import DistortionLiquid from './distortions/DistortionLiquid.vue';
import DistortionExpand from './distortions/DistortionExpand.vue';
import DistortShrink from './distortions/DistortShrink.vue';
import DistortionHeart from './distortions/DistortionHeart.vue';

@Component({
	components:{
		DistortionLiquid,
		DistortionExpand,
		DistortionHeart,
		DistortShrink,
	},
	emits:[],
})
export default class OverlayDistort extends AbstractOverlay {

	public distortionData:TwitchatDataTypes.HeatDistortionData|null = null;

	private distortionID:string = "";
	private parametersHandler!:(e:TwitchatEvent)=>void;

	public async beforeMount():Promise<void> {
		this.distortionID = Utils.getQueryParameterByName("twitchat_overlay_id") || "";

		this.parametersHandler = (e:TwitchatEvent)=>this.onParametersHandler(e);

		PublicAPI.instance.addEventListener(TwitchatEvent.DISTORT_OVERLAY_PARAMETERS, this.parametersHandler);
	}

	public async beforeUnmount():Promise<void> {
		PublicAPI.instance.removeEventListener(TwitchatEvent.DISTORT_OVERLAY_PARAMETERS, this.parametersHandler);
	}

	public requestInfo():void {
		PublicAPI.instance.broadcast(TwitchatEvent.GET_DISTORT_OVERLAY_PARAMETERS, {distortionID: this.distortionID});
	}

	public async onParametersHandler(e:TwitchatEvent):Promise<void> {
		const {params} = (e.data as unknown) as {params:TwitchatDataTypes.HeatDistortionData};
		//If it's not for us, stop there
		if(!params || params.id != this.distortionID) return;
		this.distortionData = params;
	}
	
}
</script>

<style scoped lang="less">
.overlaydistort{
}
</style>