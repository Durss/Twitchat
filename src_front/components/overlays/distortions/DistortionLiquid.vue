<template>
	<div class="distortionliquid">
	</div>
</template>

<script lang="ts">
import ripples from '@/assets/img/distortions/ripples.png';
import ripplesShadow from '@/assets/img/distortions/ripples_shadow.png';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import AbstractDistortion, { type IDistortItem } from './AbstractDistortion';
import { gsap } from 'gsap/gsap-core';

@Component({
	components:{},
	emits:[],
})
class DistortionLiquid extends AbstractDistortion {

	@Prop()
	declare params:TwitchatDataTypes.HeatDistortionData;

	public mounted():void {
		super.initialize({cols:16, rows:8, uvScaleX:256/4096, uvScaleY:256/2048, frames:128, texture:ripples, overlay:ripplesShadow});
	}

	protected buildItem(px?:number, py?:number):IDistortItem {
		const item = super.buildItem(px, py);
		if(px != undefined) item.x = px;
		if(py != undefined) item.y = py;
		item.alphaSpeed = 0;
		item.frame = 0;
		item.scale = .001;
		item.scaleSpeed = 0;
		item.angle = 0;//Math.random() * Math.PI * 2;
		let scale = 20 * Math.random() + 3;
		gsap.to(item, {scale, frame:128, ease:"none", duration:Math.max(1, scale * .25), onComplete:()=>{
			this.removeItem(item);
		}});
		return item;
	}
	
}
export default toNative(DistortionLiquid);
</script>

<style scoped lang="less">
.distortionliquid{
}
</style>