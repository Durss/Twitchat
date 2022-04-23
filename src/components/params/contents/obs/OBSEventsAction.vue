<template>
	<div class="OBSEventsAction">
		<p class="header">Automatically show/hide OBS sources and filters when a specific Twitchat events occurs<br></p>
		<p class="useCase"><strong>Use case examples :</strong> display an overlay when someone writes on your chat for the first time, when someone subs, when a poll completes, ...</p>

		<ParamItem :paramData="event_conf" />

		<draggable 
		v-model="actionList" 
		group="actions" 
		item-key="id"
		ghost-class="ghost"
		@change="saveData()"
		direction="vertical"
		handle=".action>.header>.orderBt"
		:animation="250"
		:dragoverBubble="true">
			<template #item="{element, index}">
				<OBSEventsActionEntry class="action"
					:action="element"
					:index="index"
					:sources="sources"
					:event="event_conf.value"
					@delete="deleteAction(element, index)"
					@update="saveData()"
				/>
			</template>
		</draggable>

		<Button title="+ Add step" class="addBt" @click="addAction()" v-if="event_conf.value != ''" />
	</div>
</template>

<script lang="ts">
import store, { OBSSourceAction, ParameterData, ParameterDataListValue } from '@/store';
import OBSWebsocket, { OBSTriggerEvents, OBSSourceItem } from '@/utils/OBSWebsocket';
import Utils from '@/utils/Utils';
import { watch } from '@vue/runtime-core';
import { Options, Vue } from 'vue-class-component';
import Button from '../../../Button.vue';
import ParamItem from '../../ParamItem.vue';
import OBSEventsActionEntry from './OBSEventsActionEntry.vue';
import draggable from 'vuedraggable'

@Options({
	props:{},
	components:{
		draggable,
		Button,
		ParamItem,
		OBSEventsActionEntry,
	},
	emits:[]
})
export default class OBSEventsAction extends Vue {

	public actionList:OBSSourceAction[] = [];
	public event_conf:ParameterData = { label:"", type:"list", value:"", listValues:[] };
	public sources:OBSSourceItem[] = [];
	
	public async mounted():Promise<void> {draggable
		watch(()=> OBSWebsocket.instance.connected, () => {
			this.listSources();
		});
		await this.listSources();

		watch(()=> this.event_conf.value, () => {
			if(this.event_conf.value == '') {
				this.actionList = [];
			}else {
				this.actionList = store.state.obsEventActions[this.event_conf.value as number];
				if(!this.actionList) this.actionList = [];
				if(this.actionList.length == 0) {
					this.addAction();
				}
			}
		});

		let events = [
			{label:"Select a trigger...", value:0},
		];
		events = events.concat(OBSTriggerEvents);
		this.event_conf.value = events[0].value;
		this.event_conf.listValues = events;
	}

	/**
	 * Gets all the available OBS sources and sort them alphabetically
	 */
	private async listSources():Promise<void> {
		this.sources = await OBSWebsocket.instance.getSources();
		this.sources = this.sources.sort((a, b) => {
			if(a.sourceName.toLowerCase() < b.sourceName.toLowerCase()) return -1;
			if(a.sourceName.toLowerCase() > b.sourceName.toLowerCase()) return 1;
			return 0;
		});
	}

	/**
	 * Adds an action to the lsit
	 */
	public addAction():void {
		this.actionList.push({
			id:Math.random().toString(),
			sourceName:"",
			show:true,
			delay:0,
		});
	}

	/**
	 * Called when deleting an action item
	 */
	public deleteAction(action:OBSSourceAction, index:number):void {
		Utils.confirm("Delete action ?").then(()=> {
			this.actionList.splice(index, 1);
		}).catch(()=> {});
	}

	/**
	 * Saves the data to storage
	 */
	public saveData():void {
		store.dispatch("setObsEventActions", {
			key:this.event_conf.value as number,
			data:this.actionList,
		})
	}
}
</script>

<style scoped lang="less">
.OBSEventsAction{
	// font-size: .9em;
	display: flex;
	flex-direction: column;
	justify-content: center;

	.header {
		text-align: center;
		margin-bottom: .5em;
	}

	.useCase {
		font-size: .8em;
		margin-bottom: 1em;
	}

	.sortable-chosen {
		filter: grayscale() brightness(1.5);
	}

	.action ~ .action {
		padding-top: .5em;
		margin-top: 0;
		&::before{
			content: "";
			display: block;
			width: 1em;
			height: .5em;
			background-color: @mainColor_normal;
			border-top-left-radius: 100% 200%;
			border-top-right-radius: 100% 200%;
			margin: auto;
		}
	}
	.action {
		background: linear-gradient(90deg, @mainColor_normal 2px, transparent 1px);
		background-position: 100% 0;
		background-repeat: repeat-y;
		background-size: calc(50% + 1px);
		margin-top: 1em;

		&:not(:last-of-type) {
			padding-bottom: .5em;
			&::after{
				content: "";
				display: block;
				width: 1em;
				height: .5em;
				background-color: @mainColor_normal;
				border-bottom-left-radius: 100% 200%;
				border-bottom-right-radius: 100% 200%;
				margin: auto;
			}
		}
	}

	.addBt {
		display: block;
		margin: auto;
		margin-top: 1em;
	}
}
</style>