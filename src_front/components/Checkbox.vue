<template>
	<div class="checkbox">
		<div class="checkmark">
			<img :src="checkMarkIcon" v-if="checked" alt="icon" class="img">
		</div>
		<span class="label" v-if="$slots.default"><slot></slot></span>
		<input type="checkbox" class="checkboxInput" ref="checkbox" v-model="checked" @change="onChange()" />
	</div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{},
	emits:["update:modelValue"],
})
export default class Checkbox extends Vue {

	public checked:boolean = false;

	@Prop({type:Boolean, default: false})
	public white!:boolean;

	@Prop({type:Boolean, default: false})
	public highlight!:boolean;

	@Prop({default: false})
	public modelValue!:unknown;

	@Prop({type:Array, default: [true, false]})
	public values!:unknown[];
	
	public get checkMarkIcon():string {
		if(this.white !== false) {
			return this.$image('icons/checkmark_white.svg');
		}else{
			return this.$image('icons/checkmark.svg');
		}
	}

	public onChange():void {
		this.$emit("update:modelValue", this.checked? this.values[0] || true : this.values[1] || false);
	}

}
</script>

<style scoped lang="less">
.checkbox{
	cursor: pointer;
	display: flex;
	flex-direction: row;
	width: 100%;
	height: 100%;
	align-items: center;
	position: relative;

	.checkmark {
		border: 1px solid var(--mainColor_normal);
		border-radius: .25em;
		padding: 0;
		width: 1em;
		height: 1em;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		justify-content: center;
		.img {
			width: 80%;
			margin: 0;
			padding: 0;
		}
	}

	.label {
		flex-grow: 1;
		margin-left: .35em;
		justify-self: flex-start;
		text-align: left;
		width: max-content;
		color: var(--mainColor_normal);
		// overflow: visible;
	}
	
	&:hover {
		background: none;
		.checkmark {
			background-color: fade(@mainColor_normal; 30%);
		}
	}

	.checkboxInput {
		pointer-events: all;
		opacity: .0001;
		position: absolute;
		padding: 0;
		margin: 0;
		@gap: 2px;
		width: calc(100% + @gap * 2);
		height: calc(100% + @gap * 2);
		left: -@gap;
		top: -@gap;
		z-index: 1000;
		cursor: pointer;
	}
}
</style>