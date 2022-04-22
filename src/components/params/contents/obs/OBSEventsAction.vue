<template>
	<div class="OBSEventsAction">
		<ParamItem :paramData="event_conf" />
		<OBSEventsActionEntry class="action" v-for="(a,index) in actionList" :key="a.id"
			:action="a"
			:index="index"
			:sources="sources"
			:event="event_conf.value"
			@delete="deleteAction(a, index)"
			@update="saveData();"
		/>
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

@Options({
	props:{},
	components:{
		Button,
		ParamItem,
		OBSEventsActionEntry,
	},
	emits:["setContent"]
})
export default class OBSEventsAction extends Vue {

	public actionList:OBSSourceAction[] = [];

	public events:ParameterDataListValue[] = [
		{label:"Select a trigger...", value:0},
	];

	public event_conf:ParameterData = { label:"", type:"list", value:"", listValues:[] };
	public sources:OBSSourceItem[] = [];

	public async mounted():Promise<void> {
		watch(()=> OBSWebsocket.instance.connected, () => {
			this.listSources();
		});
		this.listSources();

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

		this.events = this.events.concat(OBSTriggerEvents);
		this.event_conf.value = this.events[0].value;
		this.event_conf.listValues = this.events;
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
	 * Called whenb deleting an action item
	 */
	public deleteAction(action:OBSSourceAction, index:number):void {
		Utils.confirm("Delete action ?").then(()=> {
			this.actionList.splice(index, 1);
		}).catch(()=> {});
	}

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

	& > .action ~ .action {
		padding-top: .5em;
		margin-top: 0;
		&::before{
			content: "";
			display: block;
			width: 1em;
			//Looks visually bigger than the top joint because of the next item's
			//header background. Make it slightly smaller to compensate
			height: .45em;
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