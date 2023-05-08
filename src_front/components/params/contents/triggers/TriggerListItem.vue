<template>
	<div class="triggerlistitem">
		<button class="button"
		@click="$emit('select', entryData.trigger)"
		v-tooltip="{content:getCategoryLabel(entryData),placement:'left'}">
			<img v-if="entryData.iconURL" :src="entryData.iconURL" :style="{backgroundColor:entryData.iconBgColor}">
			<picture v-else-if="entryData.icon">
				<source :srcset="$image('icons/dark/'+entryData.icon+'.svg')" media="(prefers-color-scheme: light)">
				<img :src="$image('icons/'+entryData.icon+'.svg')" :style="{backgroundColor:entryData.iconBgColor}">
			</picture>
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
		v-tooltip="$t('triggers.testBt')">
			<picture>
				<source srcset="@/assets/icons/dark/test.svg" media="(prefers-color-scheme: light)">
				<img src="@/assets/icons/test.svg" :alt="$t('triggers.testBt')" :aria-label="$t('triggers.testBt')">
			</picture>
		</button>

		<button class="deleteBt" @click="$emit('delete',entryData)"
		v-if="noEdit === false"
		v-tooltip="$t('triggers.deleteBt')">
			<picture>
				<source srcset="@/assets/icons/dark/trash.svg" media="(prefers-color-scheme: light)">
				<img src="@/assets/icons/trash.svg" :alt="$t('triggers.deleteBt')" :aria-label="$t('triggers.deleteBt')">
			</picture>
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
	background-color: var(--color-light-fadest);
	border-radius: .5em;
	padding: 0;
	display: flex;
	flex-direction: row;
	min-height: 1.5em;
	overflow: hidden;
	.button {
		display: flex;
		flex-direction: row;
		gap: .25em;
		color: var(--color-light);
		padding: 0 .5em 0 0;
		align-items: center;
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
		border-left: 1px solid var(--color-dark-light);
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
	&>* {
		transition: background-color .1s;
		&:hover {
			background-color: var(--color-light-fader);
		}
	}
}
</style>