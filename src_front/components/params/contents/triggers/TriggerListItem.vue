<template>
	<div class="triggerlistitem">
		<button class="button"
		@click="$emit('select', entryData.trigger)"
		:data-tooltip="getCategoryLabel(entryData)">
			<img v-if="entryData.icon" :src="entryData.icon" :style="{backgroundColor:entryData.iconBgColor}">
			<span>{{entryData.label}}</span>
		</button>

		<div class="toggle"
		v-if="noEdit === false"
		@click="entryData.trigger.enabled = !entryData.trigger.enabled; $emit('changeState')">
			<ToggleButton v-model="entryData.trigger.enabled"
			@change="$emit('changeState')"
			:aria-label="entryData.trigger.enabled? 'trigger enabled' : 'trigger disabled'"/>
		</div>

		<button class="testBt" @click="$emit('test',entryData.trigger)"
		v-if="noEdit === false"
		:disabled="!entryData.canTest"
		:data-tooltip="$t('triggers.testBt')">
			<img src="@/assets/icons/test_purple.svg" :alt="$t('triggers.testBt')" :aria-label="$t('triggers.testBt')">
		</button>

		<button class="deleteBt" @click="$emit('delete',entryData)"
		v-if="noEdit === false"
		:data-tooltip="$t('triggers.deleteBt')">
			<img src="@/assets/icons/trash_purple.svg" :alt="$t('triggers.deleteBt')" :aria-label="$t('triggers.deleteBt')">
		</button>
	</div>
</template>

<script lang="ts">
import ToggleButton from '@/components/ToggleButton.vue';
import { TriggerTypesDefinitionList } from '@/types/TriggerActionDataTypes';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import type { TriggerListEntry } from "./TriggerList.vue";

@Component({
	components:{
		ToggleButton,
	},
	emits:["changeState", "delete", "test", "select"],
})
export default class TriggerListItem extends Vue {

	@Prop
	public entryData!:TriggerListEntry;

	@Prop({default:false})
	public noEdit!:boolean;

	public getCategoryLabel(entry:TriggerListEntry):string {
		const event = TriggerTypesDefinitionList().find(v=> v.value === entry.trigger.type);
		if(!event) return "unknown category"
		return this.$t(event?.labelKey);
	}

}
</script>

<style scoped lang="less">
.triggerlistitem{
	
	box-shadow: 0px 1px 1px rgba(0,0,0,0.25);
	color: @mainColor_normal;
	background-color: @mainColor_light;
	border-radius: .5em;
	padding: 0;
	display: flex;
	flex-direction: row;
	min-height: 1.5em;
	overflow: hidden;
	&>* {
		transition: color .25s, background-color .25s;
		&:hover {
			background-color: fade(@mainColor_normal_extralight, 20%);
		}
	}
	.button {
		display: flex;
		flex-direction: row;
		gap: .25em;
		color: @mainColor_normal;
		padding: 0 .5em 0 0;
		align-items: center;
		text-align: left;
		transition: background-color .25s;
		flex-grow: 1;
		overflow: hidden;
		word-wrap: break-word;
		img {
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
		cursor: pointer;
		border-left: 1px solid @mainColor_normal;
	}
	.deleteBt, .testBt {
		img {
			height: .9em;
			padding: 0 .5em;
		}
		
		&:disabled,
		&[disabled] {
			pointer-events: none;
			img {
				opacity: .35;
			}
		}
	}
}
</style>