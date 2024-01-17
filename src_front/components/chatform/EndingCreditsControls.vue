<template>
	<div class="endingcreditscontrols blured-background-window">
		<div class="speed">
			<div class="label"><Icon name="timer" /> {{ $t("credits_control.speed") }}</div>
			<Slider @change="onSpeed()" @stop="onStopDragSlider()" dotMode light class="slider" v-model="speed" :min="-10" :max="10"></Slider>
		</div>
		<TTButton @click="prev()" icon="prev">{{ $t("credits_control.prevBt") }}</TTButton>
		<TTButton @click="next()" icon="next">{{ $t("credits_control.nextBt") }}</TTButton>
		<TTButton @click="stop()" icon="stop">{{ $t("credits_control.stopBt") }}</TTButton>
		<TTButton @click="start()" icon="play">{{ $t("credits_control.force_startBt") }}</TTButton>
	</div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-facing-decorator';
import TTButton from '../TTButton.vue';
import type { JsonObject } from "type-fest";
import PublicAPI from '@/utils/PublicAPI';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Slider from '../Slider.vue';
import Icon from '../Icon.vue';
import TwitchatEvent from '@/events/TwitchatEvent';
import gsap from 'gsap';

@Component({
	components:{
		Icon,
		Slider,
		TTButton,
	},
	emits:[],
})
export default class EndingCreditsControls extends Vue {

	public speed:number = 0;
	public ignoreSpeedchange:boolean = false;

	public async stop():Promise<void> {
		const summary:TwitchatDataTypes.StreamSummaryData = {
			streamDuration:0,
			follows:[],
			raids:[],
			subs:[],
			resubs:[],
			subgifts:[],
			bits:[],
			hypeChats:[],
			rewards:[],
			shoutouts:[],
			hypeTrains:[],
			polls:[],
			predictions:[],
			chatters:[],
		}
		PublicAPI.instance.broadcast("SUMMARY_DATA", (summary as unknown) as JsonObject);
	}
	
	public async start():Promise<void> {
		const summary = await this.$store.stream.getSummary(undefined, true);
		PublicAPI.instance.broadcast("SUMMARY_DATA", (summary as unknown) as JsonObject);
	}

	public prev():void {
		PublicAPI.instance.broadcast(TwitchatEvent.ENDING_CREDITS_CONTROL, {prev:true});
	}

	public next():void {
		PublicAPI.instance.broadcast(TwitchatEvent.ENDING_CREDITS_CONTROL, {next:true});
	}

	public onSpeed():void {
		if(this.ignoreSpeedchange) return;
		const sign = this.speed < 0? -1 : 1;
		const speed = 100 / (1 + Math.exp(-.1 * (Math.abs(this.speed)*10 - 50))) * sign;
		PublicAPI.instance.broadcast(TwitchatEvent.ENDING_CREDITS_CONTROL, {speed:this.speed == 0? 0 : speed/5});
	}

	public onStopDragSlider():void {
		let tween = {speed:this.speed};
		this.speed = 0;
		this.onSpeed();
		this.ignoreSpeedchange = true;
		gsap.to(tween, {speed:0, duration:.25, onUpdate:()=>{
			this.speed = tween.speed;
		}, onComplete:()=>{
			this.ignoreSpeedchange = false;
		}});
	}

}
</script>

<style scoped lang="less">
.endingcreditscontrols{
	width: fit-content;
	left: auto;
	right: 0;
	margin-left: auto;
	transform-origin: bottom right;
	color:var(--color-light);
	gap: .25em;
	display: flex;
	flex-direction: column;

	.speed {
		@sliderSize: 200px;
		@width: 30px;
		text-align: center;
		.icon {
			height: 1em;
			vertical-align: bottom;
		}
		.slider {
			width: @sliderSize;
			height: @width;
			left: 50%;
			transform: rotate(-90deg) translateY(-100%);
			// margin: calc(@sliderSize / 2 - .5em) 0;//calc(-@sliderSize / 2 + 2.5em);//No idea why +2.5em works :]
			margin: calc(@sliderSize / 2 - .5em) calc(-@sliderSize / 2 + @width);
		}
		.label {
			margin-bottom: calc(@sliderSize / 2);
		}
	}
}
</style>