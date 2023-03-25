<template>
	<div class="paramstriggers">
		<img src="@/assets/icons/broadcast_purple.svg" alt="overlay icon" class="icon">

		<i18n-t scope="global" tag="p" class="head" keypath="triggers.header">
			<template #COUNT><strong>{{ eventsCount }}</strong></template>
		</i18n-t>

		<div class="holder">
			<TriggerCreateForm
				v-if="showForm"
				@setContent="$emit('setContent', $event)"
				@openForm="showList=false"
				@closeForm="showList=true"
				@createTrigger="currentTriggerData=$event"
				:obsScenes="obsScenes"
				:obsSources="obsSources" />

			<img src="@/assets/loader/loader.svg" v-if="showLoading" class="loader">

			<TriggerActionList
				v-if="currentTriggerData"
				:triggerData="currentTriggerData"
				:obsSources="obsSources" />

			<TriggerList v-if="showList"
				@select="onSelectTrigger($event)"
				@setContent="$emit('setContent', $event)" />
		</div>
	</div>
</template>

<script lang="ts">
import { TriggerEvents, type TriggerActionData, type TriggerData, type TriggerEventTypes } from '@/types/TriggerActionDataTypes';
import type { OBSSceneItem, OBSSourceItem } from '@/utils/OBSWebsocket';
import { Component, Vue } from 'vue-facing-decorator';
import TriggerCreateForm from './triggers/TriggerCreateForm.vue';
import TriggerActionList from './triggers/TriggerActionList.vue';
import TriggerList from './triggers/TriggerList.vue';
import OBSWebsocket from '@/utils/OBSWebsocket';

@Component({
	components:{
		TriggerList,
		TriggerActionList,
		TriggerCreateForm,
	},
	emits:["setContent"],
})
export default class ParamsTriggers extends Vue {

	public eventsCount:number = 0;
	public showList:boolean = true;
	public showForm:boolean = true;
	public showLoading:boolean = false;
	public currentTriggerData:TriggerData|null = null;
	public obsScenes:OBSSceneItem[] = [];
	public obsSources:OBSSourceItem[] = [];

	public beforeMount():void {
		//List all available trigger types
		let events:TriggerEventTypes[] = TriggerEvents().concat();
		this.eventsCount = events.length;
		if(OBSWebsocket.instance.connected) {
			this.listOBSScenes();
			this.listOBSSources();
		}
	}

	/**
	 * Called when an existing trigger is selected for edition
	 * @param triggerData
	 */
	public onSelectTrigger(triggerData:TriggerData):void {
		this.currentTriggerData = triggerData;
		this.showList = false;
		this.showForm = false;
	}

	/**
	 * Lists OBS Scenes
	 */
	private async listOBSScenes():Promise<void> {
		try {
			this.obsScenes = ((await OBSWebsocket.instance.getScenes()).scenes as unknown) as OBSSceneItem[];
		}catch(error) {
			this.obsScenes = [];
			this.$store("main").alert(this.$t('error.obs_scenes_loading'));
			return;
		}

		this.obsScenes.sort((a,b)=> {
			if(a.sceneName.toLowerCase() < b.sceneName.toLowerCase()) return -1;
			if(a.sceneName.toLowerCase() > b.sceneName.toLowerCase()) return 1;
			return 0;
		});
	}

	/**
	 * Lists OBS Sources
	 */
	private async listOBSSources():Promise<void> {
		try {
			this.obsSources = await OBSWebsocket.instance.getSources();
		}catch(error) {
			this.obsSources = [];
			this.$store("main").alert(this.$t('error.obs_sources_loading'));
			return;
		}

		this.obsSources.sort((a,b)=> {
			if(a.sourceName.toLowerCase() < b.sourceName.toLowerCase()) return -1;
			if(a.sourceName.toLowerCase() > b.sourceName.toLowerCase()) return 1;
			return 0;
		});

	}
}
</script>

<style scoped lang="less">
.paramstriggers{
	.parameterContent();
	
	.holder {
		display: flex;
		flex-direction: column;
		gap: 1em;
		margin-top: 1em;
	}
}
</style>