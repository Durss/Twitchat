<template>
	<div :class="classes">
		<div class="checkmark">
			<Icon v-if="checked" class="icon" name="checkmark"/>
		</div>
		<span class="label" v-if="$slots.default"><slot></slot></span>
		<input type="checkbox" class="checkboxInput" ref="checkbox" v-model="checked" @change="onChange()" />
	</div>
</template>

<script lang="ts">
import { watch } from 'vue';
import { Component, Prop, Vue, toNative } from 'vue-facing-decorator';

@Component({
	components:{},
	emits:["update:modelValue"],
})
class Checkbox extends Vue {

	@Prop({default: false})
	public modelValue!:unknown;

	@Prop({type:Array, default: [true, false]})
	public values!:unknown[];

	@Prop({type:Boolean, default: false})
	public secondary!:boolean;

	public checked = false;

	public mounted():void {
		this.checked = this.modelValue === this.values[0];
		watch(()=>this.modelValue, ()=>{
			this.checked = this.modelValue === this.values[0];
		});
	}

	public get classes():string[] {
		const res:string[] = ["checkbox"];
		if(this.secondary !== false) res.push("secondary")
		return res;
	}

	public onChange():void {
		this.$emit("update:modelValue", this.checked? this.values[0] : this.values[1]);
	}

}
export default toNative(Checkbox);
</script>

<style scoped lang="less">
.checkbox{
	cursor: pointer;
	display: flex;
	flex-direction: row;
	align-items: center;
	position: relative;
	height: 1em;

	.checkmark {
		color:var(--color-text);
		border: 1px solid var(--color-text);
		border-radius: .25em;
		padding: 0;
		aspect-ratio: 1;
		height: 100%;
		min-height: 1em;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		justify-content: center;
		.icon {
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
		color:var(--color-text);
	}

	&:hover {
		.checkmark {
			background-color: var(--background-color-fader)
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

	&.secondary{
		.checkmark {
			border-color: var(--color-secondary);
			.icon {
				color: var(--color-secondary);
			}
		}

		&:hover {
			.checkmark {
				background-color: var(--color-secondary-fader);
			}
		}
	}
}
</style>
