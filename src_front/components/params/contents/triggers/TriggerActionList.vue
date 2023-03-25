<template>
	<div class="triggeractionlist">
		<draggable 
		v-model="triggerData.actions" 
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
					:totalItems="triggerData.actions.length"
					:obsSources="obsSources"
					:triggerData="triggerData"
					@delete="deleteAction(index)"
					@duplicate="duplicateAction(element, index)"
					@setContent="(v:string)=>$emit('setContent', v)"
				/>
			</template>
		</draggable>

		<div class="bottomCTAS">
			<Button class="addBt"
				:icon="$image('icons/add.svg')"
				:title="$t('triggers.add_actionBt')"
				@click="addAction()"
			/>
		</div>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import type { TriggerActionTypes, TriggerData, TriggerActionEmptyData } from '@/types/TriggerActionDataTypes';
import type { OBSSourceItem } from '@/utils/OBSWebsocket';
import Utils from '@/utils/Utils';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import draggable from 'vuedraggable';
import TriggerActionEntry from './TriggerActionEntry.vue';

@Component({
	components:{
		Button,
		draggable,
		TriggerActionEntry,
	},
	emits:[],
})
export default class TriggerActionList extends Vue {

	@Prop
	public triggerData!:TriggerData;
	@Prop
	public obsSources!:OBSSourceItem[];

	public beforeMount():void {
		if(this.triggerData.actions.length === 0) {
			this.addAction();
		}
	}

	/**
	 * Called when deleting an action item
	 */
	public deleteAction(index:number):void {
		this.$confirm(this.$t("triggers.delete_action_confirm")).then(async ()=> {
			// if(this.actionList.length == 1) this.canSave = false;
			this.triggerData.actions.splice(index, 1);
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
		this.triggerData.actions.splice(index, 0, clone);
	}

	public saveData():void {

	}

	public addAction():void {
		const action:TriggerActionEmptyData = {
			delay:0,
			id:Utils.getUUID(),
			type:null,
		}
		this.triggerData.actions.push(action)
	}

}
</script>

<style scoped lang="less">
.triggeractionlist{
	
	.action ~ .action {
		padding-top: .5em;
		margin-top: 0;
		&::before{
			content: "";
			display: block;
			width: .5em;
			height: .25em;
			background-color: @mainColor_normal;
			border-top-left-radius: 100% 200%;
			border-top-right-radius: 100% 200%;
			margin: auto;
		}
	}
	.action {
		background: linear-gradient(90deg, @mainColor_normal 2px, transparent 1px);
		background-position: 100% 0;
		background-repeat: no-repeat;
		background-size: calc(50% + 1px) 1em;
		padding-top: 1em;
		&:first-of-type {
			background: none;
		}

		&::after{
			content: "";
			display: block;
			width: .5em;
			height: .25em;
			background-color: @mainColor_normal;
			border-bottom-left-radius: 100% 200%;
			border-bottom-right-radius: 100% 200%;
			margin: auto;
		}
	}

	.bottomCTAS {
		// display: flex;
		// flex-direction: row;
		background: linear-gradient(90deg, @mainColor_normal 2px, transparent 1px);
		background-position: 100% 0;
		background-repeat: no-repeat;
		background-size: calc(50% + 1px) 1em;
		padding-top: .5em;
		.addBt {
			display: block;
			margin: auto;
		}
		&::before{
			content: "";
			display: block;
			width: .5em;
			height: .25em;
			background-color: @mainColor_normal;
			border-top-left-radius: 100% 200%;
			border-top-right-radius: 100% 200%;
			margin: auto;
		}
	}
}
</style>