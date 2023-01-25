<template>
	<div class="overlaycounter" v-if="counter">

		<div class="counter" id="holder" v-if="counter.min === false && counter.max === false">
			<span class="name" id="name">{{ counter.name }}</span>
			<span class="spacer" id="spacer"></span>
			<span class="value" id="value">{{ value }}</span>
		</div>

		<div class="progressBar" id="holder" v-else>
			<div class="fill" id="fill" :style="progressStyles"></div>
			<span class="name" id="name">{{ counter.name }}</span>
			<div class="goal" id="goal">
				<span class="min" id="min">{{ counter.min || 0 }}</span>
				<span class="value" id="value">{{ value || 0 }}</span>
				<span class="max" id="max">{{ counter.max || 0 }}</span>
			</div>
		</div>

	</div>
</template>

<script lang="ts">
import TwitchatEvent from '@/events/TwitchatEvent';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import gsap from 'gsap';
import { watch, type StyleValue } from 'vue';
import { Options, Vue, } from 'vue-class-component';

@Options({
	props:{
		embed: {
			type: Boolean,
			default: false,
		},
		staticCounterData: Object,
	},
	components:{}
})
export default class OverlayCounter extends Vue {

	public embed!:boolean;
	public staticCounterData!:TwitchatDataTypes.CounterData;

	public localValue:number = 0;
	public fillWidth:number = 0;
	public progrressMode:boolean = false;
	public counter:TwitchatDataTypes.CounterData|null = null;

	private id:string = "";

	private counterUpdateHandler!:(e:TwitchatEvent) => void;

	public get value():number {
		return parseFloat(this.localValue.toFixed(0));
	}

	public get progressStyles():StyleValue {
		let res:StyleValue = {};

		res.width = this.fillWidth+"%";
		
		return res;
	}

	public beforeMount(): void {
		if(this.embed !== false) {
			this.counter = this.staticCounterData;
			this.setCounterData(this.counter);
			this.onValueUpdate();
		}else{
			this.id = this.$route.query.cid as string ?? "";
			if(this.id) {
	
				this.counterUpdateHandler = (e:TwitchatEvent) => this.onCounterUpdate(e);
	
				PublicAPI.instance.addEventListener(TwitchatEvent.COUNTER_UPDATE, this.counterUpdateHandler);
				PublicAPI.instance.broadcast(TwitchatEvent.COUNTER_GET, {cid:this.id});
			}
		}

		watch(()=>this.counter?.value, ()=> {
			this.onValueUpdate();
		});
	}

	public beforeUnmount(): void {
		PublicAPI.instance.removeEventListener(TwitchatEvent.COUNTER_UPDATE, this.counterUpdateHandler);
	}

	private async onCounterUpdate(e:TwitchatEvent):Promise<void> {
		if(e.data) {
			const c = ((e.data as unknown) as {counter:TwitchatDataTypes.CounterData}).counter;
			if(c.id != this.id) return;
			// if(this.counter) {
			// 	const duration = Math.min(.25, Math.max(1, Math.abs(this.counter.value - c.value) * .1));
			// 	gsap.to(this.counter, {duration, value:c.value});
			// 	await Utils.promisedTimeout(duration * 1000);
			// }
			this.setCounterData(c);
		}
	}

	private onValueUpdate():void {
		if(!this.counter) return;
		// const duration = Math.min(5, Math.max(.25, Math.abs(this.counter.value - this.localValue) * .025));
		const duration = 1;
		gsap.to(this, {duration, localValue:this.counter?.value, ease:"sine.inOut"});

		let min = Math.min(this.counter.min || 0);
		let max = Math.min(this.counter.max || 0);
		let minPrev = min;
		min = Math.min(min, max);
		max = Math.max(minPrev, max);
		const percent = (this.counter.value - min)/(max - min);
		this.fillWidth = (percent*100);
	}

	private setCounterData(data:TwitchatDataTypes.CounterData):void {
		this.counter = data;
		this.progrressMode = this.counter.min === false && this.counter.max === false;
	}

}
</script>

<style scoped lang="less">
.overlaycounter{
	font-size: 1.5em;

	.counter {
		margin: .5em;
		box-shadow: 0 0 .5em rgba(0, 0, 0, 1);
		background-color: @mainColor_light;
		padding: 1em;
		border-radius: .5em;
		display: inline-flex;
		flex-direction: row;
		align-items: center;
		.name, .value, .spacer{
			font-size: 1.5em;
			text-shadow: 0px 0px .05em black;
			&.value {
				font-weight: bold;
				font-variant-numeric: ordinal;
			}
			&.spacer {
				margin: 0 .25em;
				&::before {
					content:"|";
				}
			}
		}
	}

	.progressBar {
		margin: .5em;
		box-shadow: 0 0 .5em rgba(0, 0, 0, 1);
		width: 6em * 4;
		height: 1em * 4;
		position: relative;
		background-color: @mainColor_light;
		border-radius: .5em;
		overflow: hidden;
		.name {
			font-size: 1.5em;
			font-weight: bold;
			z-index: 1;
			position: absolute;
			left: 0;
			top: 50%;
			transform: translate(0, calc(-50% - .3em));
			width: 100%;
			text-align: center;
			text-shadow: 0px 0px .05em black;
		}
		.fill {
			position: absolute;
			height: 100%;
			width: 100%;
			top: 0;
			left: 0;
			background: @mainColor_normal_extralight;
			height: 100%;
			transition: width 1s ease-in-out;
		}
	
		.goal {
			position: absolute;
			width: 100%;
			min-width: 100%;
			display: flex;
			flex-direction: row;
			justify-content: space-between;
			align-items: flex-end;
			bottom: 0;
			left: 0;

			span {
				text-shadow: 0px 0px .075em black;
				border-radius: .25em;
				padding: .15em .25em;

				&.value {
					font-weight: bold;
					font-size: 1.25em;
					font-variant-numeric: ordinal;
				}
			}
		}
	}

}
</style>