<template>
	<div class="distortionliquid">
	</div>
</template>

<script lang="ts">
import { Component, Prop } from 'vue-facing-decorator';
import AbstractDistortion from './AbstractDistortion.vue';
import ripples from '@/assets/img/distortions/ripples_sh.png';
import hearts from '@/assets/img/distortions/hearts_sh.png';
import bubbles from '@/assets/img/distortions/bubbles_sh.png';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';

@Component({
	components:{},
	emits:[],
})
export default class DistortionLiquid extends AbstractDistortion {

	@Prop()
	public params!:TwitchatDataTypes.HeatDistortionData

	private clickHandler!:(e:MouseEvent) => void;
	private heatEventHandler!:(event:{detail:{anonymous:boolean, x:number, y:number, uid:string, shift:boolean, alt:boolean, ctrl:boolean, testMode:boolean, login:string, page:string}}) => void;

	public mounted():void {
		super.initialize({cols:16, rows:8, uvScaleX:256/4096, uvScaleY:256/2048, frames:128, texture:bubbles});
		this.clickHandler = (e:MouseEvent) => this.onClick(e);
		document.body.addEventListener("click", this.clickHandler);
		
		this.heatEventHandler = (e) => this.onHeatClick(e);
		//@ts-ignore
		window.addEventListener("heat-click", this.heatEventHandler);
	}

	public onClick(e:MouseEvent):void {
		const vec3 = this.screenToWorld(e.clientX, e.clientY);
		this.addItem(this.buildItem(vec3.x, vec3.y))
	}
	
	private onHeatClick(event:{detail:{anonymous:boolean, x:number, y:number, uid:string, shift:boolean, alt:boolean, ctrl:boolean, testMode:boolean, login:string, page:string}}):void {
		console.log("CLICK");
	}
	
}
</script>

<style scoped lang="less">
.distortionliquid{
}
</style>