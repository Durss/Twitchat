<template>
	<div class="distortheart">
	</div>
</template>

<script lang="ts">
import heart from '@/assets/img/distortions/heart.png';
import heartShadow from '@/assets/img/distortions/heart_shadow.png';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import AbstractDistortion, { type IDistortItem } from './AbstractDistortion';
import { gsap } from 'gsap/gsap-core';

@Component({
	components:{},
	emits:[],
})
class DistortionHeart extends AbstractDistortion {

	@Prop()
	declare params:TwitchatDataTypes.HeatDistortionData;

	public mounted():void {
		super.initialize({cols:16, rows:8, uvScaleX:256/4096, uvScaleY:256/2048, frames:128, texture:heart, overlay:heartShadow});
	}

	protected buildItem(px?:number, py?:number):IDistortItem {
		const item = super.buildItem(px, py);
		item.alphaSpeed = 0;
		item.frame = Math.round(Math.random()*50);
		item.scale = .001;
		item.scaleSpeed = 0;
		item.angle = 0;
		let scale = 2 + Math.random()*4;
		if(Math.random() > .98) {
			scale = 10 + Math.random()*5;
		}
		gsap.fromTo(item, {scale:0}, {duration:1, scale, ease:"elastic.out", onComplete:()=> {
			gsap.fromTo(item, {scale:scale*1.5}, {duration:.35, scale, ease:"back.out", repeat:-1, repeatDelay:1.5});
			gsap.fromTo(item, {scale:scale*1.25}, {duration:.35, delay:.3, scale, ease:"back.out", repeat:-1, repeatDelay:1.5});
			window.setTimeout(() => {
				gsap.to(item, {duration:.5, scale:0, ease:"back.in", onComplete:()=> {
					this.removeItem(item);
				}});
			}, 5000);
		}});
		return item;
	}
	
}
export default toNative(DistortionHeart);
</script>

<style scoped lang="less">
.distortheart{
}
</style>