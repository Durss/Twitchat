<template>
	<div class="overlaydistort">
		<DistortionLiquid :params="distortionData" v-if="distortionData" />
	</div>
</template>

<script lang="ts">
import TwitchatEvent from '@/events/TwitchatEvent';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import Utils from '@/utils/Utils';
import { Component } from 'vue-facing-decorator';
import AbstractOverlay from './AbstractOverlay.vue';
import DistortionLiquid from './distortions/DistortionLiquid.vue';

@Component({
	components:{
		DistortionLiquid,
	},
	emits:[],
})
export default class OverlayDistort extends AbstractOverlay {

	public distortionData:TwitchatDataTypes.HeatDistortionData|null = null;

	private distortionID:string = "";
	private parametersHandler!:(e:TwitchatEvent)=>void;

	public async beforeMount():Promise<void> {
		// const libraryPath = "https://threejsfundamentals.org/threejs/resources/threejs/r132/build/three.js";
		// const scripts = [...document.head.querySelectorAll("script")].map(v=>v.src);
		// if(!scripts.includes(libraryPath)) {
		// 	var script = document.createElement('script');
		// 	script.src = libraryPath;
		// 	document.head.appendChild(script); 
		// 	await new Promise<void>((resolve)=> {
		// 		script.addEventListener("load", ()=>{
		// 			resolve();
		// 		})
		// 	})
		// }

		this.distortionID = Utils.getQueryParameterByName("twitchat_overlay_id") || "";

		this.parametersHandler = (e:TwitchatEvent)=>this.onParametersHandler(e);

		PublicAPI.instance.addEventListener(TwitchatEvent.DISTORT_OVERLAY_PARAMETERS, this.parametersHandler);
	}

	public requestInfo():void {
		PublicAPI.instance.broadcast(TwitchatEvent.GET_DISTORT_OVERLAY_PARAMETERS, {distortionID: this.distortionID});
	}

	public async onParametersHandler(e:TwitchatEvent):Promise<void> {
		const data = (e.data as unknown) as TwitchatDataTypes.HeatDistortionData;
		this.distortionData = data;
	}
	
}
</script>

<style scoped lang="less">
.overlaydistort{
}
</style>