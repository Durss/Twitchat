<template>
	<div :class="classes" @pointerdown="onMouseDown" @wheel="onMouseWheel">
		<input type="range" v-model.number="localValue" :min="min" :max="max" :step="step" @pointerdown.capture.stop="" @input="renderBar()">
		<div class="gratuations" :style="gratuationsStyles"></div>
		<div class="fill" :style="fillStyles"></div>
	</div>
</template>

<script lang="ts">
import { abs } from 'mathjs';
import type { StyleValue } from 'vue';
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{},
	emits:["update:modelValue"],
})
export default class Slider extends Vue {

	@Prop({type:Boolean, default: false})
	public secondary!:boolean;

	@Prop({type:Boolean, default: false})
	public alert!:boolean;

	@Prop({type:Boolean, default: false})
	public disabled!:boolean;

	@Prop({type:Number, default: 0})
	public modelValue!:number;

	@Prop({type:Number, default: 0})
	public min!:number;

	@Prop({type:Number, default: 30})
	public max!:number;

	@Prop({type:Number, default: 1})
	public step!:number;

	public localValue:number = 0;

	private pressed:boolean = false;
	private fillPercent:number = 20;
	private mouseUpHandler!:(e:PointerEvent) => void;
	private mouseMoveHandler!:(e:PointerEvent) => void;

	public get classes():string[] {
		let res:string[] = ["slider"];
		if(this.secondary) res.push("secondary");
		if(this.alert) res.push("alert");
		if(this.disabled) res.push("disabled");
		return res;
	}

	public get fillStyles():StyleValue {
		return {
			width: (this.fillPercent * 100)+"%"
		};
	}

	public get gratuationsStyles():StyleValue {
		const ratio = Math.abs(this.max - this.min) / this.step;
		if(ratio > 30) return {};
		return {
			backgroundSize: (100/ratio)+"% 50%",
		};
	}

	public mounted():void {
		this.localValue = this.modelValue;
		this.fillPercent = (this.localValue - this.min) / (this.max - this.min);
		this.mouseUpHandler = (e:PointerEvent) => this.onMouseUp(e);
		this.mouseMoveHandler = (e:PointerEvent) => this.onMouseMove(e);
		document.addEventListener("pointerup", this.mouseUpHandler)
		document.addEventListener("pointermove", this.mouseMoveHandler)
	}
	
	public beforeUnmout():void {
		document.removeEventListener("pointerup", this.mouseUpHandler)
		document.removeEventListener("pointermove", this.mouseMoveHandler)
	}

	public renderBar():void {
		this.fillPercent = (this.localValue - this.min)/(this.max - this.min);
		this.$emit("update:modelValue", this.localValue);
	}

	public onMouseWheel(e:WheelEvent):void {
		const add = (e.deltaY > 0)? -1 : 1;
		const prevValue = this.localValue;
		let v = this.localValue + add * this.step;
		//Rounding to compensate for bad JS maths.
		//For JS: 0.2 + 0.1 = 0.30000000000000004
		v = Math.round(v/this.step) / (1/this.step);
		const nonClampedValue = v;
		v = Math.max(this.min, Math.min(this.max, v));
		if(v === nonClampedValue) e.preventDefault();
		this.localValue = v;
		this.fillPercent = (v - this.min)/(this.max - this.min);
		if(this.localValue != prevValue) {
			this.$emit("update:modelValue", this.localValue);
		}
	}

	public onMouseUp(e:PointerEvent):void {
		this.pressed = false;
	}

	public onMouseDown(e:PointerEvent):void {
		this.pressed = true;
		(e.target as HTMLDivElement).setPointerCapture(e.pointerId);
		this.onMouseMove(e);
	}
	
	public onMouseMove(e:PointerEvent):void {
		if(!this.pressed) return;

		const prevValue = this.localValue;
		const bounds = (this.$el as HTMLElement).getBoundingClientRect();
		//Compute percent of the width clicked
		let percent = Math.max(0, Math.min(1, (e.clientX - bounds.left) / bounds.width));
		//Compute value and round it to the nearest step
		let value = percent * (this.max-this.min) + this.min;
		//using "/(1/step)" instead of " * step" because multiplication has terrible rounding issues.
		//For example: 3/10 = 0.3   but   3 * .1 = 0.30000000000000004
		value = Math.round(value/this.step) / (1/this.step);
		//Set local values
		this.localValue = value;
		this.fillPercent = (this.localValue - this.min) / (this.max - this.min);
		//Broadcast change
		if(this.localValue != prevValue) {
			this.$emit("update:modelValue", value);
		}
	}
}
</script>

<style scoped lang="less">
.slider{
	.bevel();
	height: 1em;
	position: relative;
	width: 100%;
	background-color: var(--color-primary-fadest);
	border-radius: 1em;
	touch-action: none;
	cursor: pointer;
	overflow: hidden;

	.gratuations {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: transparent;
		@c2: var(--color-primary-light);
		background: linear-gradient(90deg, transparent 0%, transparent calc(100% - 1px), @c2 100%);
		background-size: 100% 50%;
		background-repeat: repeat-x;
		background-position: left center;
		z-index: -1;
	}
	
	.fill {
		.emboss();
		margin-top: 1px;
		margin-left: 1px;
		width: 50px;
		border-radius: 1em;
		height: calc(100% - 2px);
		background-color: var(--color-primary);
		// transition: width .2s;
		min-width: 1px;
	}

	input {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		opacity: 0;
		z-index: -1;
	}

	&.disabled {
		opacity: .5;
		pointer-events: none;
	}
	
	&.secondary {
		background-color: var(--color-secondary-fadest);
		.fill {
			background-color: var(--color-secondary);
		}
		.gratuations {
			@c2: var(--color-secondary-light);
			background-image: linear-gradient(90deg, transparent 0%, transparent calc(100% - 1px), @c2 100%);
		}
	}
	
	&.alert {
		background-color: var(--color-alert-fadest);
		.fill {
			background-color: var(--color-alert);
		}
		.gratuations {
			@c2: var(--color-alert-light);
			background-image: linear-gradient(90deg, transparent 0%, transparent calc(100% - 1px), @c2 100%);
		}
	}
}
</style>