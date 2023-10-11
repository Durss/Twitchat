<template>
	<div :class="classes" @pointerdown="onMouseDown" @wheel="onMouseWheel">
		<input type="range" v-model.number="localValue" :min="min" :max="max" :step="step" @pointerdown.capture.stop="" @input="renderBar()" ref="input">
		<div class="gratuations" :style="gratuationsStyles"></div>
		<div class="fill" :style="fillStyles"></div>
	</div>
</template>

<script lang="ts">
import { watch, type StyleValue } from 'vue';
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
	public premium!:boolean;

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
		if(this.secondary !== false) res.push("secondary");
		if(this.alert !== false) res.push("alert");
		if(this.premium !== false) res.push("premium");
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
		if(ratio > 50) return {};
		return {
			backgroundSize: (100/ratio)+"% 50%",
		};
	}

	public mounted():void {
		this.localValue = this.modelValue;
		this.fillPercent = (this.localValue - this.min) / (this.max - this.min);
		this.mouseUpHandler = (e:PointerEvent) => this.onMouseUp(e);
		this.mouseMoveHandler = (e:PointerEvent) => this.onMouseMove(e);
		document.addEventListener("pointerup", this.mouseUpHandler);
		document.addEventListener("pointermove", this.mouseMoveHandler);

		watch(()=>this.min, ()=> this.updateLimit());
		watch(()=>this.max, ()=> this.updateLimit());
	}
	
	public beforeUnmount():void {
		document.removeEventListener("pointerup", this.mouseUpHandler)
		document.removeEventListener("pointermove", this.mouseMoveHandler)
	}

	public renderBar():void {
		this.fillPercent = (this.localValue - this.min)/(this.max - this.min);
		this.$emit("update:modelValue", this.localValue);
	}

	public onMouseWheel(e?:WheelEvent):void {
		//Don't allow control via mouse wheel if not focused
		if(document.activeElement != this.$refs.input) return;

		const add = e? (e.deltaY > 0)? -1 : 1 : 0;
		const prevValue = this.localValue;
		let v = this.localValue + add * this.step;
		//Rounding to compensate for bad JS maths.
		//For JS: 0.2 + 0.1 = 0.30000000000000004
		v = Math.round(v/this.step) / (1/this.step);
		const nonClampedValue = v;
		v = Math.max(this.min, Math.min(this.max, v));
		if(v === nonClampedValue && e) e.preventDefault();
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
	
	private updateLimit():void {
		const bounds = (this.$el as HTMLElement).getBoundingClientRect();
		//Compute percent of the width clicked
		//Compute value and round it to the nearest step
		let value = this.fillPercent * (this.max-this.min) + this.min;
		//using "/(1/step)" instead of " * step" because multiplication has terrible rounding issues.
		//For example: 3/10 = 0.3   but   3 * .1 = 0.30000000000000004
		value = Math.round(value/this.step) / (1/this.step);
		//Set local values
		this.localValue = value;
		this.fillPercent = (this.localValue - this.min) / (this.max - this.min);
		//Broadcast change
		this.$emit("update:modelValue", this.localValue);
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
	}
	
	.fill {
		.emboss();
		position: relative;
		margin-top: 1px;
		margin-left: 1px;
		width: 50px;
		border-radius: 1em;
		height: calc(100% - 2px);
		background-color: var(--color-primary);
		min-width: 1px;
		z-index: 1;
		// transition: width .1s;
	}

	input {
		position: absolute;
		top: 0;
		left: 0;
		padding: 0;
		margin: 0;
		height: 100%;
		width: 100%;
		opacity: 0;
		z-index: 2;
		cursor: pointer;
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
	
	&.premium {
		background-color: var(--color-premium-fadest);
		.fill {
			background-color: var(--color-premium);
		}
		.gratuations {
			@c2: var(--color-premium-light);
			background-image: linear-gradient(90deg, transparent 0%, transparent calc(100% - 1px), @c2 100%);
		}
	}
}
</style>