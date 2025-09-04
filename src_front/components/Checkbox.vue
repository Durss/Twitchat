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
import Icon from './Icon.vue';

@Component({
	components:{
		Icon,
	},
	emits:["update:modelValue", "change"],
})
class Checkbox extends Vue {

	@Prop({default: false})
	public modelValue!:unknown;

	@Prop({type:Array, default: [true, false]})
	public values!:unknown[];

	@Prop({type:Boolean, default: false})
	public secondary!:boolean;

	@Prop({type:Boolean, default: false})
	public primary!:boolean;

	@Prop({type:Boolean, default: false})
	public alert!:boolean;

	public checked = false;

	public mounted():void {
		this.checked = this.modelValue === this.values[0];
		watch(()=>this.modelValue, ()=>{
			this.checked = this.modelValue === this.values[0];
		});
	}

	public get classes():string[] {
		const res:string[] = ["checkbox"];
		if(this.primary !== false) res.push("primary")
		if(this.secondary !== false) res.push("secondary")
		if(this.alert !== false) res.push("alert")
		if(!this.$slots.default) res.push("noLabel")
		return res;
	}

	public onChange():void {
		this.$emit("update:modelValue", this.checked? this.values[0] : this.values[1]);
		this.$emit("change", this.checked? this.values[0] : this.values[1]);
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
	color:var(--color-text);

	&.noLabel {
		height: 1em;
		.checkmark {
			height: 100%;
		}
	}

	.checkmark {
		border: 1px solid currentColor;
		border-radius: .25em;
		padding: 0;
		aspect-ratio: 1;
		height: 1em;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		justify-content: center;
		.icon {
			width: 80%;
			margin: 0;
			padding: 0;
			color: currentColor;
		}
	}

	.label {
		flex-grow: 1;
		margin-left: .35em;
		justify-self: flex-start;
		text-align: left;
		// width: max-content;
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
	&.primary{
		color:var(--color-primary);

		&:hover {
			color:var(--color-primary-light);
			.checkmark {
				background-color: var(--color-primary-fadest)
			}
		}
	}

	&.secondary{
		color:var(--color-secondary);

		&:hover {
			color:var(--color-secondary-light);
			.checkmark {
				background-color: var(--color-secondary-fadest)
			}
		}
	}
	&.alert{
		color:var(--color-alert);

		&:hover {
			color:var(--color-alert-light);
			.checkmark {
				background-color: var(--color-alert-fadest)
			}
		}
	}
}
</style>
