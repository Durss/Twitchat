<template>
	<div class="triggeractiondelayentry" @click="setFocus()">
		<Icon name="dragZone"
			class="orderBt"
			v-tooltip="$t('triggers.reorder_tt')" />

		<img src="@/assets/icons/timer.svg" class="icon">

		<div>
			<contenteditable class="input" tag="span" ref="input"
				:contenteditable="true"
				v-model="delay_local"
				:no-nl="true"
				:no-html="true"
				@keydown="onKeyDown($event)"
				@keyup="validateValue()" />
	
			<span>s</span>
		</div>

		<Button class="deleteBt" alert icon="trash" @click="$emit('delete')" />
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import ParamItem from '@/components/params/ParamItem.vue';
import type { TriggerActionTypes, TriggerData } from '@/types/TriggerActionDataTypes';
import contenteditable from 'vue-contenteditable';
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		Button,
		ParamItem,
		contenteditable,
	},
	emits:["delete"],
})
export default class TriggerActionDelayEntry extends Vue {

	@Prop
	public action!:TriggerActionTypes;
	@Prop
	public triggerData!:TriggerData;

	public delay_local:string = "0";

	public beforeMount():void {
		if(!this.action.delay) this.action.delay = 0;
		this.delay_local = this.action.delay!.toString();
	}

	/**
	 * Increment/Decrement value with up and down keyboard arrows
	 * @param event 
	 */
	public onKeyDown(event:KeyboardEvent):void {
		let add = 0;
		switch(event.key) {
			case "ArrowUp": add = 1; break;
			case "ArrowDown": add = -1; break;
		}
		if(add != 0) {
			this.action.delay! += add;
			this.delay_local = this.action.delay!.toString();
		}
		this.validateValue();
	}

	/**
	 * Sets focus on content editable field when clicked
	 */
	public setFocus():void {
		const ce = this.$refs.input as Vue;
		(ce.$el as HTMLInputElement).focus()
	}

	/**
	 * Makes sure the value is a number within the min/max range
	 */
	public validateValue():void {
		let v = Math.max(0, Math.min(99999, parseInt(this.delay_local)));
		if(isNaN(v)) v = 0;
		this.action.delay = v;
		this.delay_local = v.toString();
	}
	
}
</script>

<style scoped lang="less">
.triggeractiondelayentry{
	margin: auto;
	width: fit-content;
	border-radius: .5em;
	background-color: var(--color-primary);
	display: flex;
	flex-direction: row;
	align-items: center;
	padding-left: .5em;
	color: var(--color-light);
	overflow: hidden;
	gap: .5em;
	line-height: 1.5em;
	box-shadow: 0px 1px 1px rgba(0,0,0,0.25);
	.icon {
		height: 1em;
	}

	.deleteBt {
		align-self: stretch;
		border-radius: 0;
		flex-shrink: 0;
	}

	.orderBt {
		cursor: grab;
		height: .8em;
		vertical-align: middle;
		line-height: 1em;
		user-select: none;
		&:active {
			cursor: grabbing;
		}
	}
}
</style>