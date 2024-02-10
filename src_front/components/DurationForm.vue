<template>
	<div class="durationform input-field">
		<contenteditable class="input" tag="span" ref="inputH"
			v-model="hours"
			v-autofocus="autofocus"
			:contenteditable="true"
			:no-nl="true"
			:no-html="true"
			maxLength="9"
			@keydown="onKeyDown($event, 'h')"
			@blur="clamp('h'); onChange()" />
		
		<p class="split">h</p>

		<contenteditable class="input" tag="span" ref="inputM"
			v-model="minutes"
			:contenteditable="true"
			:no-nl="true"
			:no-html="true"
			maxLength="9"
			@keydown="onKeyDown($event, 'm')"
			@blur="clamp('m'); onChange()" />

		<p class="split">m</p>

		<contenteditable class="input" tag="span" ref="inputS"
			v-model="seconds"
			:contenteditable="true"
			:no-nl="true"
			:no-html="true"
			maxLength="9"
			@keydown="onKeyDown($event, 's')"
			@blur="clamp('s'); onChange()" />

		<p class="split">s</p>
	</div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-facing-decorator';
import contenteditable from 'vue-contenteditable';
import Utils from '@/utils/Utils';

@Component({
	components:{
		contenteditable,
	},
	emits:["update:modelValue", "change"],
})
export default class DurationForm extends Vue {

	@Prop({default:0, type:Number})
	public modelValue!:number;

	@Prop({default:0, type:Number})
	public min!:number;

	@Prop({default:23*3600+59*60+59, type:Number})
	public max!:number;

	@Prop({default:false, type:Boolean})
	public autofocus!:boolean;

	public hours:string = "0";
	public minutes:string = "0";
	public seconds:string = "0";

	public beforeMount():void {
		this.initValue(this.modelValue)
	}

	public onChange():void {
		let v = (parseFloat(this.seconds) || 0) + (parseInt(this.minutes) || 0) * 60 + (parseInt(this.hours) || 0) * 3600;
		const prevV = v;
		if(v > this.max) v = this.max;
		if(v < this.min) v = this.min;
		if(v != prevV) v = this.initValue(v);
		console.log(v);
		this.$emit("update:modelValue", v);
		this.$emit("change", v);
	}

	public onKeyDown(event:KeyboardEvent, field:"h"|"m"|"s"):void {
		let add = event.key == "ArrowUp"? 1 : event.key == "ArrowDown"? -1 : 0
		if(event.shiftKey) add *= 10;
		if(add != 0) {
			switch(field){
				case "h": this.hours = (parseInt(this.hours) + add).toString(); break;
				case "m": this.minutes = (parseInt(this.minutes) + add).toString(); break;
				case "s": this.seconds = (parseFloat(this.seconds) + add).toString(); break;
			}
			this.clamp(field);
			this.onChange();
		}
		const input = event.target as HTMLElement;
		if(event.key == "ArrowRight" || event.key == "ArrowLeft") {
			const sel = window.getSelection();
			const dir = event.key == "ArrowRight"? 1 : -1;
			if(sel && sel.rangeCount > 0) {
				//Save caret index
				var range = sel.getRangeAt(0);
				let caretIndex = range.startOffset;
				let inputs = [this.$refs.inputH as Vue, this.$refs.inputM as Vue, this.$refs.inputS as Vue]
				if(dir == 1 && caretIndex == input.innerText.length
				|| dir == -1 && caretIndex == 0) {
					let index = inputs.findIndex(v=>v.$el == input);
					index += dir;
					if(index > 2) index = 0;
					if(index < 0) index = 2;
					(inputs[index].$el as HTMLSpanElement).focus();
				}
			}
		}
	}

	public clamp(field:"h"|"m"|"s"):void {
		switch(field){
			case "h": this.hours = Utils.toDigits(this.loop(parseInt(this.hours), 999), 2).toString(); break;
			case "m": this.minutes = Utils.toDigits(this.loop(parseInt(this.minutes), 59), 2).toString(); break;
			case "s": this.seconds = Utils.toDigits(this.loop(parseFloat(this.seconds), 59), 2).toString(); break;
		}
	}

	private initValue(value:number):number {
		const h = Math.floor(value/3600);
		const m = Math.floor((value-h*3600)/60);
		const s = value-m*60-h*3600;
		this.hours = h.toString();
		this.minutes = m.toString();
		this.seconds = s.toString();
		value = h * 3600 + m *60 + s;
		this.clamp("h");
		this.clamp("m");
		this.clamp("s");
		return value;
	}

	private loop(value:number, max:number):number {
		if(value > max) value = 0;
		if(value < 0) value = max;
		return value;
	}

}
</script>

<style scoped lang="less">
.durationform{
	color: var(--color-text);
	// width: fit-content;
	display: flex;
	align-items: center;
	flex-direction: row;
	min-width: fit-content;
	.input {
		flex-grow: 1;
		// padding: .2em;
		border-radius: 0;
		text-align: center;
		font-variant-numeric: tabular-nums;
		font-weight: 400;
	}
	.split {
		flex-shrink: 1;
		&:not(:last-child) {
			margin-right: 2px;
		}
	}
}
</style>