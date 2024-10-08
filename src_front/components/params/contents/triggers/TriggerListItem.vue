<template>
	<div class="triggerlistitem"
	@mouseenter="over=true" @mouseleave="over=false"
	v-newflag="{date:(entryData.trigger.created_at || 0), duration:2 * 60000, id:'trigger_'+entryData.trigger.id}">
		<button class="button"
		@click="$emit('select', entryData.trigger)"
		v-tooltip="{content:getCategoryLabel(entryData),placement:'left'}">
			<img v-if="entryData.iconURL" :src="entryData.iconURL" class="icon" :style="{backgroundColor:entryData.iconBgColor}">
			<Icon v-else-if="entryData.icon" :name="entryData.icon" class="icon" :style="{backgroundColor:entryData.iconBgColor}" />
			<div class="label">
				<span>{{entryData.label}}</span>
				<slot></slot>
				<span class="triggerId"
					v-click2Select
					v-if="$store.main.devmode && over"
					@click.stop="">{{ entryData.trigger.id }}</span>
			</div>
		</button>

		<div class="toggle"
		v-if="noEdit === false || forceDisableOption !== false">
			<ToggleButton v-model="entryData.trigger.enabled"
			@change="$emit('changeState', $el)"
			:aria-label="entryData.trigger.enabled? 'trigger enabled' : 'trigger disabled'"/>
		</div>

		<button class="testBt" @click="$emit('testTrigger',entryData.trigger)"
		v-if="noEdit === false && toggleMode === false"
		:disabled="!entryData.canTest"
		v-tooltip="$t('triggers.testBt')">
			<Icon name="test" class="icon" />
		</button>

		<button class="duplicateBt" @click="$emit('duplicate',entryData)"
		v-if="noEdit === false && toggleMode === false"
		v-tooltip="$t('global.duplicate')">
			<Icon name="copy" class="icon" />
		</button>

		<button class="deleteBt" @click="$emit('delete',entryData)"
		v-if="noEdit === false && toggleMode === false"
		v-tooltip="$t('triggers.deleteBt')">
			<Icon name="trash" class="icon" />
		</button>
		
	</div>
</template>

<script lang="ts">
import ToggleButton from '@/components/ToggleButton.vue';
import { TriggerSubTypeLabel, TriggerTypesDefinitionList } from '@/types/TriggerActionDataTypes';
import { Component, Prop, Vue, toNative } from 'vue-facing-decorator';
import type { TriggerListEntry } from "./TriggerList.vue";

@Component({
	components:{
		ToggleButton,
	},
	emits:["changeState", "delete", "testTrigger", "select", "duplicate"],
})
class TriggerListItem extends Vue {

	@Prop
	public entryData!:TriggerListEntry;

	@Prop({default:false})
	public noEdit!:boolean;

	@Prop({default:false})
	public forceDisableOption!:boolean;

	@Prop({default:false})
	public toggleMode!:boolean;

	public over:boolean = false;

	public getCategoryLabel(entry:TriggerListEntry):string {
		const event = TriggerTypesDefinitionList().find(v=> v.value === entry.trigger.type);
		if(!event) return "unknown category"
		return this.$t(event?.descriptionKey || event?.labelKey, {SUB_ITEM_NAME: TriggerSubTypeLabel(entry.trigger)});
	}

}
export default toNative(TriggerListItem);
</script>

<style scoped lang="less">
.triggerlistitem{
	box-shadow: 0px 1px 1px rgba(0,0,0,0.25);
	background-color: var(--background-color-fadest);
	border-radius: .5em;
	padding: 0;
	display: flex;
	flex-direction: row;
	min-height: 1.5em;
	position: relative;
	transition: background-color .1s;
	// overflow: hidden;

	&:hover {
		background-color: var(--background-color-fader);
	}
	.label {
		display: flex;
		align-items: flex-start;
		flex-direction: column;
	}

	.button {
		display: flex;
		flex-direction: row;
		gap: .25em;
		padding: 0 .5em 0 0;
		align-items: center;
		flex-grow: 1;
		overflow: hidden;
		word-wrap: break-word;
		color: var(--color-text);
		.icon {
			height: 1.5em;
			width: 1.5em;
			padding: .25em;
			object-fit: fill;
		}
	}
	.toggle {
		display: flex;
		align-items: center;
		padding: 0 .5em;
		border-left: 1px solid var(--color-dark-light);
	}
	.deleteBt, .testBt, .duplicateBt {
		color: var(--color-text);
		flex-shrink: 0;
		.icon {
			height: .9em;
			padding: 0 .5em;
		}

		&:disabled,
		&[disabled] {
			pointer-events: none;
			.icon {
				opacity: .35;
			}
		}
	}
	

	.triggerId {
		.bevel();
		cursor: help !important;
		font-size: .8em;
		font-family: 'Courier New', Courier, monospace;
		opacity: .75;
		padding: 2px 5px;
		&::before {
			content: "ID: ";
			font-family: Inter;
			font-weight: bold;
		}
	}
}
</style>
