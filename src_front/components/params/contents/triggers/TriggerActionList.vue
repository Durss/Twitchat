<template>
	<div class="triggeractionlist">

		<draggable 
		v-model="actions" 
		group="actions" 
		item-key="id"
		ghost-class="ghost"
		@change="saveData()"
		direction="vertical"
		handle=".action>.header>.orderBt"
		:animation="250"
		:dragoverBubble="true">
			<template #item="{element, index}">
				<TriggerActionEntry class="action"
					:action="element"
					:index="index"
					:totalItems="actions.length"
					:obsSources="obsSources"
					:event="event"
					:triggerData="triggerData"
					@delete="deleteAction(index)"
					@duplicate="duplicateAction(element, index)"
					@setContent="(v:string)=>$emit('setContent', v)"
				/>
			</template>
		</draggable>
	</div>
</template>

<script lang="ts">
import type { TriggerActionTypes, TriggerData, TriggerEventTypes } from '@/types/TriggerActionDataTypes';
import type { OBSSourceItem } from '@/utils/OBSWebsocket';
import Utils from '@/utils/Utils';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import draggable from 'vuedraggable';
import TriggerActionEntry from './TriggerActionEntry.vue';

@Component({
	components:{
		draggable,
		TriggerActionEntry,
	},
	emits:[],
})
export default class TriggerActionList extends Vue {

	@Prop
	public actions!:TriggerActionTypes[];
	@Prop
	public triggerData!:TriggerData;
	@Prop
	public event!:TriggerEventTypes;
	@Prop
	public obsSources!:OBSSourceItem[];

	/**
	 * Called when deleting an action item
	 */
	public deleteAction(index:number):void {
		this.$confirm(this.$t("triggers.delete_action_confirm")).then(async ()=> {
			// if(this.actionList.length == 1) this.canSave = false;
			this.actions.splice(index, 1);
			// await this.$nextTick();
			// this.canSave = true;
		}).catch(()=> {});
	}

	/**
	 * Called when duplicating an action item
	 */
	public duplicateAction(action:TriggerActionTypes, index:number):void {
		const clone:TriggerActionTypes = JSON.parse(JSON.stringify(action));
		clone.id = Utils.getUUID(),
		this.actions.splice(index, 0, clone);
	}

	public saveData():void {

	}

}
</script>

<style scoped lang="less">
.triggeractionlist{
	
}
</style>