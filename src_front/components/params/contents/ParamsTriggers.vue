<template>
	<div class="paramstriggers">
		<img src="@/assets/icons/broadcast_purple.svg" alt="overlay icon" class="icon">

		<i18n-t scope="global" tag="p" class="head" :keypath="headerKey" v-if="!currentTriggerData">
			<template #COUNT><strong>{{ eventsCount }}</strong></template>
		</i18n-t>

		<div class="holder">

			<div class="ctas" v-if="showOBSResync">
				<Button :icon="$image('icons/refresh.svg')"
					:title="$t('triggers.resyncBt')"
					class="cta resyncBt"
					small
					@click="listOBSSources()"
					:data-tooltip="$t('triggers.resyncBt_tt')"
					:loading="showLoading"
				/>
			<!-- <div class="ctas">
				<Button class="cta"
					v-if="canTestAction"
					:title="$t('triggers.testBt')"
					:icon="$image('icons/test.svg')"
					@click="testTrigger()" />

				<Button class="cta"
					highlight
					:title="$t('triggers.deleteBt')"
					:icon="$image('icons/delete.svg')"
					@click="deleteTrigger()" />
			</div> -->
			</div>

			<Button class="createBt"
				v-if="showList && !showForm"
				:title="$t('triggers.add_triggerBt')"
				:icon="$image('icons/add.svg')"
				@click="openForm();" />
			
			<TriggerCreateForm
				v-if="showForm"
				@selectTrigger="onSelectTrigger($event)"
				@updateHeader="headerKey = $event"
				:obsScenes="obsScenes"
				:obsSources="obsSources"
				:rewards="rewards" />
				
			<img src="@/assets/loader/loader.svg" v-if="showLoading" class="loader">
				
			<TriggerActionList
				v-if="currentTriggerData"
				:triggerData="currentTriggerData"
				:obsSources="obsSources"
				:rewards="rewards" />
				
			<TriggerList v-if="showList"
				@select="onSelectTrigger($event)"
				:rewards="rewards" />
		</div>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import { TriggerEvents, type TriggerData, type TriggerEventTypes } from '@/types/TriggerActionDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import Config from '@/utils/Config';
import type { OBSSceneItem, OBSSourceItem } from '@/utils/OBSWebsocket';
import OBSWebsocket from '@/utils/OBSWebsocket';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { watch } from 'vue';
import { Component, Vue } from 'vue-facing-decorator';
import type IParameterContent from './IParameterContent';
import TriggerActionList from './triggers/TriggerActionList.vue';
import TriggerCreateForm from './triggers/TriggerCreateForm.vue';
import TriggerList from './triggers/TriggerList.vue';

@Component({
	components:{
		Button,
		TriggerList,
		TriggerActionList,
		TriggerCreateForm,
	},
	emits:[],
})
export default class ParamsTriggers extends Vue implements IParameterContent {

	public eventsCount:number = 0;
	public showList:boolean = true;
	public showForm:boolean = false;
	public showLoading:boolean = false;
	public headerKey:string = "triggers.header";
	public currentTriggerData:TriggerData|null = null;
	public obsScenes:OBSSceneItem[] = [];
	public obsSources:OBSSourceItem[] = [];
	public rewards:TwitchDataTypes.Reward[] = [];

	public get showOBSResync():boolean {
		if(!this.currentTriggerData) return false;
		if(this.currentTriggerData.actions.length === 0) return false;
		return this.currentTriggerData.actions.findIndex(v=>v.type == "obs") > -1;
	}

	public beforeMount():void {
		//List all available trigger types
		let events:TriggerEventTypes[] = TriggerEvents().concat();
		this.eventsCount = events.length;
		if(OBSWebsocket.instance.connected) {
			this.listOBSScenes();
			this.listOBSSources();
		}
		if(TwitchUtils.hasScopes([TwitchScopes.LIST_REWARDS])) {
			this.listRewards();
		}
		const list = this.$store("triggers").triggerList;
		//No trigger yet, just show form
		if(list.length == 0) {
			this.showList = false;
			this.showForm = true;
			this.headerKey = "triggers.header_select_trigger";
		}
	}

	/**
	 * Called when back button is clicked on params header
	 */
	public onNavigateBack(): boolean {
		if(!this.showList) {
			this.showList = true;
			this.showForm = false;
			this.currentTriggerData = null;
			this.headerKey = "triggers.header";
			return true;
		}
		return false;
	}

	/**
	 * Opens the form
	 */
	public openForm():void {
		this.headerKey = "triggers.header_select_trigger";
		this.showForm = true;
		this.showList = false;
	}

	/**
	 * Called when an existing trigger is selected for edition
	 * @param triggerData
	 */
	public onSelectTrigger(triggerData:TriggerData):void {
		this.currentTriggerData = triggerData;
		this.showList = false;
		this.showForm = false;

		//Watch for any change on the 
		watch(()=>this.currentTriggerData, ()=> {
			this.$store("triggers").saveTriggers();
		}, {deep:true});
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
	public async listOBSSources():Promise<void> {
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

	/**
	 * Lists the rewards
	 */
	private async listRewards():Promise<void> {
		try {
			this.rewards = await TwitchUtils.getRewards(true);
		}catch(error) {
			this.rewards = [];
			this.$store("main").alert(this.$t("error.rewards_loading"));
			return;
		}

		//Push "Highlight my message" reward as it's not given by the API...
		this.rewards.push(Config.instance.highlightMyMessageReward)

		//Sort by cost and name
		this.rewards = this.rewards.sort((a,b)=> {
			if(a.cost < b.cost) return -1;
			if(a.cost > b.cost) return 1;
			if(a.title.toLowerCase() < b.title.toLowerCase()) return -1;
			if(a.title.toLowerCase() > b.title.toLowerCase()) return 1;
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

		.createBt {
			margin: auto;
		}
	}
}
</style>