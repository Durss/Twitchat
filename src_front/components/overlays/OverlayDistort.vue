<template>
	<div class="overlaydistort">
		<!-- <div class="instructions">
			<img src="@/assets/img/shader_warning.png"/>
		</div> -->
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
import {toNative,  Component } from 'vue-facing-decorator';
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
class OverlayDistort extends AbstractOverlay {

	public distortionData:TwitchatDataTypes.HeatDistortionData|null = null;

	private distortionID:string = "";
	private parametersHandler!:(e:TwitchatEvent<"ON_DISTORT_OVERLAY_CONFIGS">)=>void;

	public async beforeMount():Promise<void> {
		this.distortionID = Utils.getQueryParameterByName("twitchat_overlay_id") || "";

		this.parametersHandler = (e:TwitchatEvent<"ON_DISTORT_OVERLAY_CONFIGS">)=>this.onParametersHandler(e);

		PublicAPI.instance.addEventListener("ON_DISTORT_OVERLAY_CONFIGS", this.parametersHandler);
	}

	public async beforeUnmount():Promise<void> {
		PublicAPI.instance.removeEventListener("ON_DISTORT_OVERLAY_CONFIGS", this.parametersHandler);
	}

	public requestInfo():void {
		PublicAPI.instance.broadcast("GET_DISTORT_OVERLAY_CONFIGS", {id: this.distortionID});
	}

	public async onParametersHandler(e:TwitchatEvent<"ON_DISTORT_OVERLAY_CONFIGS">):Promise<void> {
		const {params} = e.data;
		//If it's not for us, stop there
		if(!params || params.id != this.distortionID) return;
		this.distortionData = params;
	}
	
}
export default toNative(OverlayDistort);
</script>

<style scoped lang="less">
.overlaydistort{

	.instructions {
		position: fixed;
		top: 50%;
		left: 25%;
		transform: translate(-50%, -50%);
		font-size: 10em;
		font-weight: bold;
		text-transform: uppercase;
		color: #808000;
		font-family: Impact, Inter;
		width: 50vw;
		height: 100vh;
		border: 50px solid #808000;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
		z-index: -1;
		font-smooth: never;
		img {
			max-width: 40vw;
		}
	}
}
</style>