<template>
	<div class="triggeractionstreaminfoentry">
		<StreamInfoSubForm v-model:title="title" v-model:tags="tags" v-model:category="category" v-if="!loading" :placeholderList="placeholderList" triggerMode />
		<img class="loader" src="@/assets/loader/loader.svg" v-else>
	</div>
</template>

<script lang="ts">
import StreamInfoSubForm from '@/components/streaminfo/StreamInfoSubForm.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import { TriggerEventPlaceholders, type ITriggerPlaceholder, type TriggerActionStreamInfoData, type TriggerData, type TriggerTypeDefinition } from '@/types/TriggerActionDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { watch } from 'vue';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import ParamItem from '../../../ParamItem.vue';

@Component({
	components:{
		ParamItem,
		ToggleBlock,
		StreamInfoSubForm,
	},
	emits:["update"]
})
export default class TriggerActionStreamInfoEntry extends Vue {

	@Prop
	public action!:TriggerActionStreamInfoData;
	@Prop
	public triggerData!:TriggerData;

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
		// this.message_conf.labelKey = "triggers.actions.chat.param_message";
		// this.message_conf.placeholderList = TriggerActionHelpers(this.event.value);

		watch(()=>this.title, ()=> this.onChange());
		watch(()=>this.tags, ()=> this.onChange());
		watch(()=>this.category, ()=> this.onChange());
		this.placeholderList	= TriggerEventPlaceholders(this.triggerData.type);
	}

	private onChange():void {
		this.action.categoryId	= this.category?.id ?? "";
		this.action.title		= this.title;
		this.action.tags		= this.tags;
	}

}
</script>

<style scoped lang="less">
.triggeractionstreaminfoentry{
	.triggerActionForm();

	.loader {
		margin: auto;
		display: block;
	}
}
</style>