<template>
	<div class="placeholderfield" @click.stop="focusInput">
		<span>{</span>
			<span class="prefix" v-if="prefix">{{ prefix }}</span>
			<p :class="{inputHolder:true, empty:modelValue.length === 0}">
				<span class="placeholder" v-if="modelValue.length === 0">{{ placeholder }}</span>
				<contenteditable tag="span" ref="input"
					:class="{input:true}"
					:contenteditable="true"
					:no-nl="true"
					:no-html="true"
					v-model="localValue"
					@input="limitPlaceholderSize()"
					@blur="$emit('blur')" />
			</p>
		<span>}</span>
	</div>
</template>

<script lang="ts">
import { watch } from 'vue';
import {toNative,  Component, Vue, Prop } from 'vue-facing-decorator';
import contenteditable from 'vue-contenteditable';

@Component({
	components:{
		contenteditable,
	},
	emits:["update:modelValue", "change", "blur"],
})
class PlaceholderField extends Vue {

	@Prop({required:true, type:String, default:""})
	public modelValue!:string;

	@Prop({required:false, type:String, default:""})
	public prefix!:string;

	@Prop({required:false, type:Number, default:30})
	public maxLength!:number;

	@Prop({required:false, type:String, default:"..."})
	public placeholder!:string;

	public localValue:string = "";

	public mounted():void {
		this.localValue = this.modelValue;

		watch(()=> this.modelValue, ()=> {
			this.localValue = this.modelValue;
		});
	}

	/**
	 * Limit the size of the label.
	 * Can't use maxLength because it's a content-editable tag.
	 * @param item
	 */
	public async limitPlaceholderSize():Promise<void> {
		const sel = window.getSelection();
		if(sel && sel.rangeCount > 0) {
			//Save caret index
			var range = sel.getRangeAt(0);
			let caretIndex = range.startOffset;
			await this.$nextTick();
			//Normalize label and limit its size
			this.localValue = this.localValue.toUpperCase().trim().replace(/\W/gi, "").substring(0, this.maxLength);
			await this.$nextTick();
			//Reset caret to previous position
			if(range.startContainer.firstChild) range.setStart(range.startContainer.firstChild, Math.min(this.localValue.length, caretIndex));
		}else{
			this.localValue = this.localValue.toUpperCase().trim().replace(/\W/gi, "").substring(0, this.maxLength);
		}

		this.$emit("update:modelValue", this.localValue);
		this.$emit("change", this.localValue);
	}

	public focusInput():void {
		(this.$refs["input"] as typeof contenteditable).$el.focus();
	}

}
export default toNative(PlaceholderField);
</script>

<style scoped lang="less">
.placeholderfield{
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	text-transform: uppercase;
	.inputHolder {
		margin: 0 .25em;
		.input {
			margin: 0;
		}
		&.empty {
			position: relative;
			display: block;
			.input {
				position: absolute;
				left: 50%;
				transform: translate(-50%);
			}
		}
		.placeholder {
			font-style: italic;
			opacity: .5;
			text-transform: initial;
		}
	}
	.input {
		margin: 0 .25em;
		min-width: 1em;
		text-align: center;
		cursor: text;
	}
	.prefix {
		opacity: .7;
	}
	&>*:first-child,
	&>*:last-child {
		font-size: 1.5em;
	}
	&.error {
		background-color: var(--color-alert-fader);
	}
}
</style>
