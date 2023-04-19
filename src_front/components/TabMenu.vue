<template>
	<div class="tabmenu">
		<Button v-for="item in items"
			@click="setValue(item.value)"
			autoHideLabel
			v-tooltip="item.tooltip"
			:icon="item.icon"
			:big="big"
			:small="small"
			:secondary="secondary"
			:alert="alert"
			:selected="value == item.value">{{ item.label }}</Button>
	</div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-facing-decorator';
import Button from './Button.vue';

@Component({
	components:{
		Button,
	},
	emits:["update:modelValue"],
})
export default class TabMenu extends Vue {

	@Prop({type:Boolean, default: false})
	public big!:boolean;

	@Prop({type:Boolean, default: false})
	public small!:boolean;

	@Prop({type:Boolean, default: false})
	public secondary!:boolean;

	@Prop({type:Boolean, default: false})
	public alert!:boolean;

	@Prop({type:Array, default:[]})
	public values!:unknown[];

	@Prop({type:Array<String>, default:[]})
	public labels!:string[];

	@Prop({type:Array<String>, default:[]})
	public icons!:string[];

	@Prop({type:Array<String>, default:[]})
	public tooltips!:string[];

	@Prop()
	public modelValue!:unknown;

	public value:unknown = null;

	public get items():{value:unknown, label?:string, icon?:string, tooltip?:string}[] {
		let res:{value:unknown, label?:string, icon?:string, tooltip?:string}[] = [];
		let maxLength = Math.max(this.labels.length, this.icons.length, this.values.length);
		for (let i = 0; i < maxLength; i++) {
			let label:string|undefined = undefined;
			let icon:string|undefined = undefined;
			let tooltip:string|undefined = undefined;
			let value:unknown = null;
			if(i < this.labels.length) label = this.labels[i];
			if(i < this.icons.length) icon = this.icons[i];
			if(i < this.values.length) value = this.values[i];
			if(i < this.tooltips.length) tooltip = this.tooltips[i];
			res.push({value, label, icon, tooltip})
		}
		return res;
	}

	public mounted():void {
		this.value = this.modelValue;
		if(this.value === undefined) this.value = this.values[0];
		if(this.modelValue != this.value) {
			this.$emit("update:modelValue", this.value);
		}
	}

	public setValue(value:unknown):void{
		this.value = value;
		this.$emit("update:modelValue", value);
	}

}
</script>

<style scoped lang="less">
.tabmenu{
	display: flex;
	flex-direction: row;
	// flex-wrap: wrap;
	row-gap: 5px;
	overflow-x: auto;
	overflow-y: hidden;
	max-width: 100%;
	padding: 4px;

	.button {
		flex-grow: 1;
		&:first-child {
			border-top-right-radius: 0;
			border-bottom-right-radius: 0;
		}

		&:not(:last-child) {
			border-right: 1px solid var(--color-light);
		}

		&:not(:first-child):not(:last-child) {
			border-radius: 0;
		}

		&:last-child {
			border-top-left-radius: 0;
			border-bottom-left-radius: 0;
		}
	}
}

</style>