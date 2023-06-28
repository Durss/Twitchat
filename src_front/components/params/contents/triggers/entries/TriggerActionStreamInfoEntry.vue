<template>
	<div class="triggeractionstreaminfoentry triggerActionForm">
		<StreamInfoSubForm v-if="!loading" v-model:title="title"
			v-model:tags="tags"
			v-model:category="category"
			:placeholderList="placeholderList"
			triggerMode />
		
		<Icon v-else name="loader" class="loader" />
	</div>
</template>

<script lang="ts">
import StreamInfoSubForm from '@/components/streaminfo/StreamInfoSubForm.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { watch } from 'vue';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import ParamItem from '../../../ParamItem.vue';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry.vue';
import type { ITriggerPlaceholder, TriggerActionStreamInfoData, TriggerData } from '@/types/TriggerActionDataTypes';

@Component({
	components:{
		ParamItem,
		ToggleBlock,
		StreamInfoSubForm,
	},
	emits:["update"]
})
export default class TriggerActionStreamInfoEntry extends AbstractTriggerActionEntry {

	@Prop
	declare action:TriggerActionStreamInfoData;
	@Prop
	declare triggerData:TriggerData;

	public loading:boolean = true;
	public title:string = "";
	public tags:string[] = [];
	public category:TwitchDataTypes.StreamCategory|null = null;
	public placeholderList:ITriggerPlaceholder[] = [];

	public async beforeMount():Promise<void> {
		if(this.action.categoryId) {
			this.category = await TwitchUtils.getCategoryByID(this.action.categoryId);
		}
		this.title = this.action.title;
		this.tags = this.action.tags;
		this.loading = false;

		watch(()=>this.title, ()=> this.onChange());
		watch(()=>this.tags, ()=> this.onChange());
		watch(()=>this.category, ()=> this.onChange());
	}

	private onChange():void {
		this.action.categoryId	= this.category?.id ?? "";
		this.action.title		= this.title;
		this.action.tags		= this.tags;
	}

	/**
	 * Called when the available placeholder list is updated
	 */
	public onPlaceholderUpdate(list:ITriggerPlaceholder[]):void {
		this.placeholderList = list;
	}

}
</script>

<style scoped lang="less">
.triggeractionstreaminfoentry{
	min-height: 2em;//Makes sure the loader is visible on trigger open
	.loader {
		height: 2em;
		width: 2em;
		margin: auto;
	}
}
</style>