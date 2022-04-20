<template>
	<div class="paramsobssourceform">
		<ParamItem :paramData="event_conf" />
		<OBSSourceActionEntry class="action" v-for="(a,index) in actionList" :key="index"
			:action="a"
			:index="index"
			:sources="sources"
			:event="event_conf.value"
		/>
		<Button title="+add action" class="addBt" @click="addAction()" />
	</div>
</template>

<script lang="ts">
import { OBSSourceAction, ParameterData, ParameterDataListValue } from '@/store';
import OBSWebsocket, { OBSSceneTriggers, OBSSourceItem } from '@/utils/OBSWebsocket';
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
			sourceName:"string",
			show:true,
			delay:0,
		});
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