<template>
	<div class="paramsobssourceform">
		<ParamItem :paramData="event_conf" />
		<OBSSourceActionEntry class="action" v-for="(a,index) in actionList" :key="a.id"
			:action="a"
			:index="index"
			:sources="sources"
			:event="event_conf.value"
			@delete="deleteAction(a, index)"
		/>
		<Button title="+add action" class="addBt" @click="addAction()" v-if="event_conf.value != ''" />
	</div>
</template>

<script lang="ts">
import store, { OBSSourceAction, ParameterData, ParameterDataListValue } from '@/store';
import OBSWebsocket, { OBSSceneTriggers, OBSSourceItem } from '@/utils/OBSWebsocket';
import Utils from '@/utils/Utils';
import { watch } from '@vue/runtime-core';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import OBSSourceActionEntry from './contents/obs/sources/OBSSourceActionEntry.vue';
import ParamItem from './ParamItem.vue';

@Options({
	props:{},
	components:{
		Button,
		ParamItem,
		OBSSourceActionEntry,
	},
	emits:["setContent"]
})
export default class ParamsOBSSourceForm extends Vue {

	public actionList:OBSSourceAction[] = [];

	public events:ParameterDataListValue[] = [
		{label:"Select...", value:0},
	];

	public event_conf:ParameterData = { label:"Trigger event", type:"list", value:"", listValues:[] };
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
				if(store.state.obsSourceCommands) {
					this.actionList = store.state.obsSourceCommands[this.event_conf.value as number];
				}
				if(this.actionList.length == 0) {
					this.addAction();
				}
			}
		});

		this.events = this.events.concat(OBSSceneTriggers);
		this.event_conf.value = this.events[0].value;
		this.event_conf.listValues = this.events;
	}

	private async listSources():Promise<void> {
		this.sources = await OBSWebsocket.instance.getSources();
		this.sources = this.sources.sort((a, b) => {
			if(a.sourceName.toLowerCase() < b.sourceName.toLowerCase()) return -1;
			if(a.sourceName.toLowerCase() > b.sourceName.toLowerCase()) return 1;
			return 0;
		});
	}

	public addAction():void {
		this.actionList.push({
			id:Math.random().toString(),
			sourceName:"",
			show:true,
			delay:0,
		});
	}

	public deleteAction(action:OBSSourceAction, index:number):void {
		Utils.confirm("Delete action ?").then(()=> {
			console.log("DELETE index", index);
			this.actionList.splice(index, 1);
		}).catch(()=> {});
	}
}
</script>

<style scoped lang="less">
.paramsobssourceform{

	.action {
		&:not(:first-of-type) {
			margin-top: .5em;
		}
	}

	.addBt {
		display: block;
		margin: auto;
		margin-top: .5em;
	}
}
</style>