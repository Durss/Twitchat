<template>
	<div class="overlayanimatedtext"
	v-if="params"
	:style="{
		fontFamily: params.textFont,
		fontSize: params.textSize+'px',
		color:params.colorBase,
	}">
		<div ref="text" v-if="text" v-html="text"></div>
	</div>
</template>

<script lang="ts">
import { Component, toNative } from 'vue-facing-decorator';
import AbstractOverlay from './AbstractOverlay';
import PublicAPI from '@/utils/PublicAPI';
import TwitchatEvent from '@/events/TwitchatEvent';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import SplitType from 'split-type'
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import DOMPurify from 'isomorphic-dompurify';

@Component({
	components:{},
	emits:[],
})
class OverlayAnimatedText extends AbstractOverlay {

	public text:string = "";
	public params!:TwitchatDataTypes.AnimatedTextData;

	private id:string = "";
	private configHandler!:(e:TwitchatEvent<TwitchatDataTypes.AnimatedTextData>)=>void;
	private textHandler!:(e:TwitchatEvent<{id:string, text:string}>)=>void;
	private messageQueue:string[] = [];

	public beforeMount():void {
		this.id = this.$route.query.twitchat_overlay_id as string ?? "";

		this.textHandler = (e)=>this.onText(e);
		this.configHandler = (e)=>this.onConfig(e);

		PublicAPI.instance.addEventListener(TwitchatEvent.ANIMATED_TEXT_SET, this.textHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.ANIMATED_TEXT_CONFIGS, this.configHandler);
	}

	public mounted(): void {
		this.messageQueue.push("Coucou <strong>ceci</strong> est un test");
		this.next();
	}

	public beforeUnmount():void {
		super.beforeUnmount();
		PublicAPI.instance.removeEventListener(TwitchatEvent.ANIMATED_TEXT_SET, this.textHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.ANIMATED_TEXT_CONFIGS, this.configHandler);
	}

	public requestInfo():void {
		PublicAPI.instance.broadcast(TwitchatEvent.GET_ANIMATED_TEXT_CONFIGS, {id:this.id});
	}

	/**
	 * Called when receiving overlay configs
	 * @param e
	 */
	public onConfig(e:Parameters<typeof this.configHandler>[0]):void {
		if(!e.data || e.data.id != this.id) return;
		const prevParams = this.params;
		this.params = e.data;

		let shouldRender = false;
		if(prevParams) {
			shouldRender ||= this.params.animDurationScale != prevParams.animDurationScale;
			shouldRender ||= this.params.animStrength != prevParams.animStrength;
			shouldRender ||= this.params.animStyle != prevParams.animStyle;
			if(this.text && shouldRender) {
				this.messageQueue.unshift(this.text);
				this.next();
			}
		}
	}

	/**
	 * Called when requesting to display a new text
	 * @param e
	 */
	public onText(e:Parameters<typeof this.textHandler>[0]):void {
		if(!e.data || e.data.id != this.id) return;
		this.messageQueue.push(e.data.text);
		if(this.messageQueue.length == 1) this.next();
	}

	/**
	 * Animate next text
	 */
	public async next():Promise<void> {
		if(this.messageQueue.length == 0) return;
		const text = this.messageQueue.shift();
		if(!text) return;
		this.text = DOMPurify.sanitize(text);
		await this.$nextTick();
		if(!this.params) {
			//Wait for params if not there yet
			while(true) {
				await Utils.promisedTimeout(50);
				if(this.params) break;
			}
		}
		await this.animate();
		this.next();
	}

	private async animate():Promise<void> {
		const split = new SplitType(this.$refs["text"] as HTMLElement, {split:["words","chars"], charClass:"char", wordClass:"word"})
		const ads = this.params.animDurationScale;
		const amp = this.params.animStrength;
		switch(this.params.animStyle) {
			case "wave": {
				gsap.fromTo(split.chars || [],
				{scale:0, opacity:0},
				{
					scale:1,
					opacity:1,
					ease:"back.out("+Math.pow(amp, 2)*5+")",
					duration:.5 * ads,
					stagger:.025 * ads
				});
				break;
			}

			case "wobble": {
				gsap.fromTo(split.chars || [],
				{scale:0, opacity:0},
				{
					scale:1,
					opacity:1,
					ease:"elastic.out("+(amp*1.5)+","+Math.max(.05, ((2-amp)/2*.5 + .1 - ads*.1))+")",
					duration:2 * ads,
					stagger:.025 * ads
				});
				break;
			}
		}
	}

}
export default toNative(OverlayAnimatedText);
</script>

<style scoped lang="less">
.overlayanimatedtext{
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);

	// :deep(.char),
	// :deep(.word) {
	// 	will-change: transform;
	// }

	:deep(strong) {
		// color: v-bind(params.colorHighlights)
	}
}
</style>
