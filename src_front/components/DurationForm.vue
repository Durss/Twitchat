<template>
	<div class="durationform input-field">
		<contenteditable class="input" v-if="showDays"
			tag="span"
			ref="inputD"
			v-model="days"
			:contenteditable="true"
			:no-nl="true"
			:no-html="true"
			:maxLength="3"
			@keydown="onKeyDown($event, 'd')"
			@focus="onFocus($event)"
			@blur="clamp('d'); onChange()" />

		<p class="split days" v-if="showDays">{{ $t("global.date_days") }}</p>

		<contenteditable class="input" v-if="showHours"
			tag="span"
			ref="inputH"
			v-model="hours"
			:contenteditable="true"
			:no-nl="true"
			:no-html="true"
			:maxLength="2"
			@keydown="onKeyDown($event, 'h')"
			@focus="onFocus($event)"
			@blur="clamp('h'); onChange()" />

		<p class="split" v-if="showHours">h</p>

		<contenteditable class="input" v-if="showMinutes"
			tag="span"
			ref="inputM"
			v-model="minutes"
			:contenteditable="true"
			:no-nl="true"
			:no-html="true"
			:maxLength="9"
			@keydown="onKeyDown($event, 'm')"
			@focus="onFocus($event)"
			@blur="clamp('m'); onChange()" />

		<p class="split" v-if="showMinutes">m</p>

		<contenteditable class="input"
			tag="span"
			ref="inputS"
			v-model="seconds"
			v-autofocus="autofocus"
			:contenteditable="true"
			:no-nl="true"
			:no-html="true"
			:id="id"
			:maxLength="9"
			@keydown="onKeyDown($event, 's')"
			@focus="onFocus($event)"
			@blur="clamp('s'); onChange()" />

		<p class="split">s</p>
	</div>
</template>

<script lang="ts">
import Utils from '@/utils/Utils';
import { watch, type ComponentPublicInstance } from 'vue';
import contenteditable from 'vue-contenteditable';
import { Component, Prop, Vue, toNative } from 'vue-facing-decorator';

@Component({
	components:{
		contenteditable,
	},
	emits:["update:modelValue", "change"],
})
class DurationForm extends Vue {

	@Prop({default:"", type:String})
	public id!:string;

	@Prop({default:0, type:Number})
	public modelValue!:number;

	@Prop({default:0, type:Number})
	public min!:number;

	@Prop({default:23*3600+59*60+59, type:Number})
	public max!:number;

	@Prop({default:false, type:Boolean})
	public autofocus!:boolean;

	@Prop({default:false, type:Boolean})
	public allowMs!:boolean;

	public days:string = "0";
	public hours:string = "0";
	public minutes:string = "0";
	public seconds:string = "0";

	public get showDays():boolean {
		return this.max > 24*60*60;
	}

	public get showHours():boolean {
		return this.max > 60*60;
	}

	public get showMinutes():boolean {
		return this.max > 60;
	}

	public beforeMount():void {
		this.initValue(this.modelValue)

		watch(()=>this.modelValue, ()=>{
			this.initValue(this.modelValue)
		})
	}

	public onChange():void {
		const f = this.allowMs !== false? parseFloat : parseInt;
		let v = (f(this.seconds) || 0) + (parseInt(this.minutes) || 0) * 60 + (parseInt(this.hours) || 0) * 3600 + (parseInt(this.days) || 0) * 24*3600;
		const prevV = v;
		if(v > this.max) v = this.max;
		if(v < this.min) v = this.min;
		if(v != prevV) v = this.initValue(v);
		this.$emit("update:modelValue", v);
		this.$emit("change", v);
	}

	public onKeyDown(event:KeyboardEvent, field:"d"|"h"|"m"|"s"):void {
		if(event.key == "ArrowUp" || event.key == "ArrowDown") {
			let add = event.key == "ArrowUp"? 1 : -1;
			if(event.shiftKey) add *= 10;
			const f = this.allowMs !== false? parseFloat : parseInt;
			if(add != 0) {
				switch(field){
					case "d": this.days = (parseInt(this.days) + add).toString(); break;
					case "h": this.hours = (parseInt(this.hours) + add).toString(); break;
					case "m": this.minutes = (parseInt(this.minutes) + add).toString(); break;
					case "s": this.seconds = (f(this.seconds) + add).toString(); break;
				}
				this.clamp(field);
				this.onChange();
			}
		}
		const input = event.target as HTMLElement;
		if(event.key == "ArrowRight" || event.key == "ArrowLeft") {
			const sel = window.getSelection();
			const dir = event.key == "ArrowRight"? 1 : -1;
			if(sel && sel.rangeCount > 0) {
				//Save caret index
				var range = sel.getRangeAt(0);
				let caretIndex = range.startOffset;
				let inputs = [this.$refs.inputD as ComponentPublicInstance, this.$refs.inputH as ComponentPublicInstance, this.$refs.inputM as ComponentPublicInstance, this.$refs.inputS as ComponentPublicInstance].filter(v=>v && v.$el != undefined);
				if(dir == 1 && caretIndex == input.innerText.length
				|| dir == -1 && caretIndex == 0) {
					let index = inputs.findIndex(v=>v.$el == input);
					index += dir;
					if(index > inputs.length-1) index = 0;
					if(index < 0) index = inputs.length-1;
					(inputs[index]!.$el as HTMLSpanElement).focus();
				}
			}
		}
	}
	public onFocus(event:FocusEvent):void {
		const input = event.target as HTMLElement;
		const range = document.createRange();
		range.selectNodeContents(input);
		const sel = window.getSelection();
		if(sel) {
			sel.removeAllRanges();
			sel.addRange(range);
		}
	}

	public clamp(field:"d"|"h"|"m"|"s"):void {
		const f = this.allowMs !== false? parseFloat : parseInt;
		switch(field){
			case "d": this.days = Utils.toDigits(this.loop(parseInt(this.days), 999), 1).toString(); break;
			case "h": this.hours = Utils.toDigits(this.loop(parseInt(this.hours), 24), 2).toString(); break;
			case "m": this.minutes = Utils.toDigits(this.loop(parseInt(this.minutes), 59), 2).toString(); break;
			case "s": this.seconds = Utils.toDigits(this.loop(f(this.seconds), 59), 2).toString(); break;
		}
	}

	private initValue(value:number):number {
		const d = Math.floor(value / (24*3600));
		const h = Math.floor((value - d*24*3600) / 3600);
		const m = Math.floor((value - d*24*3600 - h*3600) / 60);
		const s = value - m*60 - h*3600 - d*24*3600;
		this.days = d.toString();
		this.hours = h.toString();
		this.minutes = m.toString();
		this.seconds = s.toString();
		value = d * 24 * 3600 + h * 3600 + m *60 + s;
		this.clamp("d");
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
export default toNative(DurationForm);
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

		&.days {
			margin-right: .5em;
		}
	}
}
</style>
