<template>
	<div class="distortshrink">
	</div>
</template>

<script lang="ts">
import bubbles from '@/assets/img/distortions/bubble.png';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import AbstractDistortion, { type IDistortItem } from './AbstractDistortion';
import { gsap } from 'gsap/gsap-core';
import { Elastic } from 'gsap/gsap-core';

@Component({
	components:{},
	emits:[],
})
class DistortShrink extends AbstractDistortion {

	@Prop()
	declare params:TwitchatDataTypes.HeatDistortionData;

	public mounted():void {
		super.initialize({cols:16, rows:8, uvScaleX:256/4096, uvScaleY:256/2048, frames:128, texture:bubbles});
	}

	protected buildItem(px?:number, py?:number):IDistortItem {
		const item = super.buildItem(px, py);
		item.alphaSpeed = 0;
		item.frame = Math.round(Math.random()*50);
		item.scale = .001;
		item.scaleSpeed = 0;
		item.angle = Math.PI;
		gsap.to(item, {scale:3 + Math.random()*2, angle:0, ease:Elastic.easeOut, duration:1});
		gsap.to(item, {scale:0, angle:Math.PI, ease:"back.in(5)", duration:.5, delay:5, immediateRender:false, onComplete:()=>{
			this.removeItem(item);
		}});
		return item;
	}
	
}
export default toNative(DistortShrink);
</script>

<style scoped lang="less">
.distortshrink{
}
</style>