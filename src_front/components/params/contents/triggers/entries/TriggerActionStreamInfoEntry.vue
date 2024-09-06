<template>
	<div class="triggeractionstreaminfoentry triggerActionForm">
		<StreamInfoSubForm v-if="!loading" v-model:title="title"
			v-model:tags="tags"
			v-model:category="category"
			v-model:branded="branded"
			v-model:labels="labels"
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
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';
import ParamItem from '../../../ParamItem.vue';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry';
import type { ITriggerPlaceholder, TriggerActionStreamInfoData, TriggerData } from '@/types/TriggerActionDataTypes';

@Component({
	components:{
		ParamItem,
		ToggleBlock,
		StreamInfoSubForm,
	},
	emits:["update"]
})
class TriggerActionStreamInfoEntry extends AbstractTriggerActionEntry {

	@Prop
	declare action:TriggerActionStreamInfoData;
	@Prop
	declare triggerData:TriggerData;

	public loading:boolean = true;
	public title:string = "";
	public tags:string[] = [];
	public branded:boolean = false;
	public labels:{id:string, enabled:boolean}[] = [];
	public category:TwitchDataTypes.StreamCategory|null = null;
	public placeholderList:ITriggerPlaceholder<any>[] = [];

	public async beforeMount():Promise<void> {
		if(this.action.categoryId) {
			this.category = await TwitchUtils.getCategoryByID(this.action.categoryId);
		}
		this.title = this.action.title;
		this.tags = this.action.tags;
		this.branded = this.action.branded === true;
		this.labels = this.action.labels || []
		this.loading = false;

		watch(()=>this.title, ()=> this.onChange());
		watch(()=>this.tags, ()=> this.onChange());
		watch(()=>this.category, ()=> this.onChange());
		watch(()=>this.labels, ()=> this.onChange());
		watch(()=>this.branded, ()=> this.onChange());
	}

	private onChange():void {
		this.action.categoryId	= this.category?.id ?? "";
		this.action.title		= this.title;
		this.action.tags		= this.tags;
		this.action.branded		= this.branded;
		this.action.labels		= this.labels;
	}

	/**
	 * Called when the available placeholder list is updated
	 */
	public onPlaceholderUpdate(list:ITriggerPlaceholder<any>[]):void {
		this.placeholderList = list;
	}

}
export default toNative(TriggerActionStreamInfoEntry);
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