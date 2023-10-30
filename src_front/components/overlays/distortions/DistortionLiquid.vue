<template>
	<div class="distortionliquid">
	</div>
</template>

<script lang="ts">
import { Component, Prop } from 'vue-facing-decorator';
import AbstractDistortion, { type IDistortItem } from './AbstractDistortion.vue';
import ripples from '@/assets/img/distortions/ripples_sh.png';
import hearts from '@/assets/img/distortions/hearts_sh.png';
import bubbles from '@/assets/img/distortions/bubbles_sh.png';
import twirl from '@/assets/img/distortions/twirl_sh.png';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import gsap from 'gsap/all';
import { Back } from 'gsap/all';
import { Elastic } from 'gsap/all';

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
		// super.initialize({cols:1, rows:1, uvScaleX:256/256, uvScaleY:256/256, frames:1, texture:twirl});
		super.initialize({cols:16, rows:8, uvScaleX:256/4096, uvScaleY:256/2048, frames:128, texture:ripples});
		this.clickHandler = (e:MouseEvent) => this.onClick(e);
		document.body.addEventListener("click", this.clickHandler);
		
		this.heatEventHandler = (e) => this.onHeatClick(e);
		//@ts-ignore
		window.addEventListener("heat-click", this.heatEventHandler);
	}

	public beforeUnmount():void {
		document.body.removeEventListener("click", this.clickHandler);
		//@ts-ignore
		window.removeEventListener("heat-click", this.heatEventHandler);
	}

	public onClick(e:MouseEvent):void {
		const vec3 = this.screenToWorld(e.clientX, e.clientY);
		this.addItem(this.buildItem(vec3.x, vec3.y))
	}
	
	private onHeatClick(event:{detail:{anonymous:boolean, x:number, y:number, uid:string, shift:boolean, alt:boolean, ctrl:boolean, testMode:boolean, login:string, page:string}}):void {
		console.log("CLICK");
	}

	// protected buildItem(px?:number, py?:number):IDistortItem {
	// 	const item = super.buildItem(px, py);
	// 	item.alphaSpeed = 0;
	// 	item.frame = Math.round(Math.random()*50);
	// 	item.scale = .001;
	// 	item.scaleSpeed = 0;
	// 	item.angle = Math.PI;
	// 	gsap.to(item, {scale:5 + Math.random()*5, angle:0, ease:Elastic.easeOut, duration:1});
	// 	gsap.to(item, {scale:0, angle:Math.PI, ease:"back.in(5)", duration:.5, delay:5, immediateRender:false});
	// 	return item;
	// }
	// protected computeItem(item:IDistortItem):boolean {
	// 	return item.scale > 0;
	// 	// item.scaleSpeed *= .995;
	// 	// item.scale += item.scaleSpeed;
	// 	// item.frame += item.alphaSpeed;
	// 	// return true;// (item.frame >= this.shCols*this.shRows && item.alphaSpeed > 0);
	// }
	
}
</script>

<style scoped lang="less">
.distortionliquid{
}
</style>