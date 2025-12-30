<template>
	<div class="distortionexpand">
	</div>
</template>

<script lang="ts">
import bubble from '@/assets/img/distortions/bubble.png';
import bubbleShadow from '@/assets/img/distortions/bubble_shadow.png';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import AbstractDistortion, { type IDistortItem } from './AbstractDistortion';
import { gsap } from 'gsap/gsap-core';
import { Elastic } from 'gsap/gsap-core';

@Component({
	components:{},
	emits:[],
})
class DistortionExpand extends AbstractDistortion {

	@Prop()
	declare params:TwitchatDataTypes.HeatDistortionData;

	public mounted():void {
		super.initialize({cols:16, rows:8, uvScaleX:256/4096, uvScaleY:256/2048, frames:128, texture:bubble, overlay:bubbleShadow});
	}

	protected buildItem(px?:number, py?:number):IDistortItem {
		const item = super.buildItem(px, py);
		item.alphaSpeed = 0;
		item.frame = 20;//Math.round(Math.random()*50);
		item.scale = .001;
		item.scaleSpeed = 0;
		item.angle = Math.PI;
		let scale = 3 + Math.random()*2;
		if(Math.random() > .98) {
			scale = 15 + Math.random()*5;
			// item.frame = 0;
		}
		gsap.fromTo(item, {scale:0}, {scale, angle:0, ease:Elastic.easeOut, duration:1});
		gsap.to(item, {scale:0, angle:Math.PI, ease:"back.in(5)", duration:.5, delay:5, immediateRender:false, onComplete:()=>{
			console.log("ON_COMPLETE");
			this.removeItem(item);
		}});
		return item;
	}
	
}
export default toNative(DistortionExpand);
</script>

<style scoped lang="less">
.distortionexpand{
}
</style>