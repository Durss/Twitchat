<template>
	<div class="distortionliquid">
	</div>
</template>

<script lang="ts">
import { Component, Prop } from 'vue-facing-decorator';
import AbstractDistortion, { type IDistortItem } from './AbstractDistortion';
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
	declare params:TwitchatDataTypes.HeatDistortionData;

	public mounted():void {
		// super.initialize({cols:1, rows:1, uvScaleX:256/256, uvScaleY:256/256, frames:1, texture:twirl});
		super.initialize({cols:16, rows:8, uvScaleX:256/4096, uvScaleY:256/2048, frames:128, texture:ripples});
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
	protected buildItem(px?:number, py?:number):IDistortItem {
		console.log(px)
		const item = super.buildItem(px, py);
		if(px != undefined) item.x = px;
		if(py != undefined) item.y = py;
		item.alphaSpeed = 0;
		item.frame = 0;
		item.scale = .001;
		item.scaleSpeed = 0;
		item.angle = Math.random() * Math.PI * 2;
		let scale = 20 * Math.random() + 3;
		gsap.to(item, {scale, frame:128, ease:"linear.none", duration:Math.max(1, scale * .25)});
		return item;
	}
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