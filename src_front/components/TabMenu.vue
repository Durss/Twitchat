<template>
	<div class="tabmenu">
		<div v-for="item in items"
		:class="value == item.value? 'tabItem tabSelected' : 'tabItem'">
			<Button class="tabButton" @click="setValue(item.value)"
				autoHideLabel
				v-tooltip="item.tooltip"
				:icon="item.icon"
				:big="big"
				:small="small"
				:secondary="secondary"
				:alert="alert"
				:selected="value == item.value">{{ item.label }}</Button>
			
			<Transition name="slide">
				<div class="selectionChip" v-if="value == item.value"></div>
			</Transition>
		</div>
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
	padding: 4px;

	.tabItem {
		flex-grow: 1;
		position: relative;
		display: flex;
		flex-direction: column;
		.tabButton {
			width: 100%;
			z-index: 1;
		}
		&:first-child {
			.tabButton {
				border-top-right-radius: 0;
				border-bottom-right-radius: 0;
			}
		}

		&:not(:last-child) {
			.tabButton {
				border-right: 1px solid var(--color-light);
			}
		}

		&:not(:first-child):not(:last-child) {
			.tabButton {
				border-radius: 0;
			}
		}

		&:last-child {
			.tabButton {
				border-top-left-radius: 0;
				border-bottom-left-radius: 0;
			}
		}
		.selectionChip {
			position: absolute;
			background-color: var(--color-secondary-light);
			display: block;
			height: 10px;
			width: calc(100% - 1.5em);
			align-self: center;
			z-index: 0;
			transition: transform .25s;
			border-bottom-right-radius: 20px;
			border-bottom-left-radius: 20px;
			max-width: calc(100% - .5em);
			transform: translateY(3px);
			bottom: 0;
		}


		.slide-enter-from,
		.slide-leave-to {
			transform: translateY(-100%);
		}
	}
}

</style>