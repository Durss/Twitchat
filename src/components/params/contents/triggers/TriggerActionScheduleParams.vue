<template>
	<ToggleBlock
	medium
	class="triggeractionscheduleparams"
	:open="true"
	title="Parameters"
	:icons="['params']">

		<ParamItem class="row" :paramData="param_name" @focusout="onUpdateName()" :error="nameConflict" />
		<div v-if="nameConflict" class="cmdNameConflict">A schedule with this name already exists</div>

		<!-- <Button type="button"
			title="Delete"
			class="saveBt"
			v-if="isChange"
			@click="save()"
			:icon="$image('icons/save.svg')"
			:disabled="param_cmd.value === ''"
		/> -->
	</ToggleBlock>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import type { ParameterData, TriggerData } from '@/types/TwitchatDataTypes';
import StoreProxy from '@/utils/StoreProxy';
import { TriggerTypes } from '@/utils/TriggerActionData';
import { watch } from '@vue/runtime-core';
import { Options, Vue } from 'vue-class-component';
import ParamItem from '../../ParamItem.vue';
import PermissionsForm from '../obs/PermissionsForm.vue';

@Options({
	props:{
		actionData:Object,
	},
	components:{
		Button,
		ParamItem,
		ToggleBlock,
		PermissionsForm,
	}
})
export default class TriggerActionScheduleParams extends Vue {

	public actionData!:TriggerData;

	public nameConflict = false;
	public param_name:ParameterData = { type:"text", value:"", label:"Schedule name", icon:"commands_purple.svg", placeholder:"..." };

	private originalName!:string;

	public beforeMount():void {
		this.populate();
		watch(()=> this.actionData, ()=> { this.populate(); }, { deep:true });
	}

	public populate():void {
		this.param_name.value = 
		this.originalName = this.actionData.name as string;
	}

	public onUpdateName():void {
		this.nameConflict = false;
		//If command name has been changed
		if(this.originalName != this.param_name.value) {
			//Make sure no other schedule trigger has the same name
			const triggers = StoreProxy.store.state.triggers;
			for (const k in triggers) {
				//Is a schedule trigger?
				if(k.indexOf(TriggerTypes.SCHEDULE+"_") === 0) {
					const t = triggers[k] as TriggerData;
					if(t.name?.toLowerCase() == (this.param_name.value as string).toLowerCase()) {
						this.nameConflict = true;
						return;
					}
				}
			}
			this.actionData.prevKey = TriggerTypes.SCHEDULE+"_"+this.actionData.name;
		}
		//This triggers a save event that will clean the previous key
		//based on the "prevKey" property value
		this.actionData.name = this.param_name.value as string;
	}
}
</script>

<style scoped lang="less">
.triggeractionscheduleparams{
	
}
</style>