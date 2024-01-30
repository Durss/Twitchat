<template>
	<div class="triggeractiondelayentry" @click="setFocus()">
		<Icon name="dragZone"
			class="orderBt"
			v-tooltip="$t('triggers.reorder_tt')" />

		<img src="@/assets/icons/timer.svg" class="icon">

		<div v-if="!isNaN(parseFloat(delay_local))">
			<contenteditable class="input" tag="span" ref="input"
				:contenteditable="true"
				v-model="delay_local"
				:no-nl="true"
				:no-html="true"
				@blur="validateValue(true)"
				@keydown="onKeyDown($event)" />
	
			<span>s</span>
		</div>

		<TTButton v-else icon="trash" small secondary @click="delay_local = '0'">{{ delay_local }}</TTButton>
		
		<PlaceholderSelector class="placeholders" v-if="placeholderList?.length > 0"
			:placeholders="placeholderList"
			:secondary="true"
			:popoutMode="true"
			@insert="insertTag"
		/>

		<TTButton class="deleteBt" alert icon="trash" @click="$emit('delete')" />
	</div>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import ParamItem from '@/components/params/ParamItem.vue';
import PlaceholderSelector from '@/components/params/PlaceholderSelector.vue';
import type { ITriggerPlaceholder, TriggerActionTypes, TriggerData } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import contenteditable from 'vue-contenteditable';
import { Component, Prop } from 'vue-facing-decorator';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry';

@Component({
	components:{
		TTButton,
		ParamItem,
		contenteditable,
		PlaceholderSelector,
	},
	emits:["delete"],
})
export default class TriggerActionDelayEntry extends AbstractTriggerActionEntry {

	@Prop
	declare action:TriggerActionTypes;
	
	@Prop
	declare triggerData:TriggerData;

	
	public delay_local:string = "0";
	public placeholderList:TwitchatDataTypes.PlaceholderEntry[] = [];

	public beforeMount():void {
		super.beforeMount();
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
		if(add != 0 && typeof this.action.delay === "number") {
			this.action.delay! += add;
			this.delay_local = this.action.delay!.toString();
			this.validateValue();
		}
	}

	/**
	 * Sets focus on content editable field when clicked
	 */
	public setFocus():void {
		const ce = this.$refs.input as Vue;
		if(!ce) return;
		(ce.$el as HTMLInputElement).focus()
	}

	/**
	 * Makes sure the value is a number within the min/max range
	 */
	public validateValue(restrictChars:boolean = false):void {
		let txt = this.delay_local;
		if(restrictChars === true) {
			txt = txt.replace(",", ".").replace(/[^\d.]/g, "");
		}
		let v = Math.max(0, Math.min(99999, parseFloat(txt)));
		if(isNaN(v)) v = 0;
		this.action.delay = v;
		this.delay_local = v.toString();
	}

	/**
	 * Called when inserting a placeholder's tag
	 */
	public insertTag(tag:string):void {
		this.delay_local = tag;
		this.action.delay = tag;
	}

	/**
	 * Called when the available placeholder list is updated
	 */
	public onPlaceholderUpdate(list:ITriggerPlaceholder<any>[]):void {
		this.placeholderList = list.filter(v=>v.numberParsable == true);
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
	position: relative;

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
	.placeholders {
		align-self: stretch;
		border-radius: 0;
		flex-shrink: 0;
		margin-right: -.5em;
	}
}
</style>