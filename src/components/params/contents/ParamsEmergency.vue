<template>
	<div class="paramsemergency">
		<img src="@/assets/icons/emergency_purple.svg" alt="emergency icon" class="icon">
		
		<p class="header">Perform custom actions to protect yourself in case of a hate raid, doxxing or any other toxic behavior.</p>

		<div v-for="(p,key) in channelParams" :key="key">
			<ParamItem class="item" :paramData="p" />
		</div>

		<div class="item" v-if="!obsConnected">
			<div class="info">
				<img src="@/assets/icons/infos.svg" alt="info">
				<p class="label"><a @click="$emit('setContent', 'obs')">Connect with OBS</a> to control scene and sources</p>
			</div>
		</div>
		<div v-else>
			<div class="item label">
				<img src="@/assets/icons/list_purple.svg" alt="scene icon" class="icon">
				<p>Select an OBS scene to switch to</p>
			</div>
			<vue-select class="sourceSelector" label="label"
				placeholder="Select a scene..."
				v-model="selectedOBSScene"
				:options="param_obsScene.listValues"
				:calculate-position="$placeDropdown"
				appendToBody
			></vue-select>
			
			<div class="item label">
				<img src="@/assets/icons/hide_purple.svg" alt="sources icon" class="icon">
				<p>Select OBS sources to hide <i>(ex: streamelements alerts)</i></p>
			</div>
			<vue-select class="sourceSelector" label="sourceName"
				placeholder="Select a source..."
				v-model="selectedOBSSources"
				:options="obsSources_filtered"
				:calculate-position="$placeDropdown"
				appendToBody
				multiple
			></vue-select>
		</div>
	</div>
</template>

<script lang="ts">
import store from '@/store';
import type { EmergencyParams, ParameterData, ParameterDataListValue } from '@/types/TwitchatDataTypes';
import OBSWebsocket, { type OBSSourceItem } from '@/utils/OBSWebsocket';
import { watch } from 'vue';
import { Options, Vue } from 'vue-class-component';
import ParamItem from '../ParamItem.vue';

@Options({
	props:{},
	components:{
		ParamItem,
	}
})
export default class ParamsEmergency extends Vue {

	public param_obsScene:ParameterData = {type:"list", label:"Switch to scene", value:""};
	public param_autoTo:ParameterData = {type:"text", longText:true, value:"", label:"Timeout users for 30min (ex: timeout wizebot, streamelements, etc if you don't want them to keep alerting for new followers on your chat)", placeholder:"user1, user2, user3, ...", icon:"timeout_purple.svg"};
	public param_noTrigger:ParameterData = {type:"toggle", value:true, label:"Disable Twitchat triggers (follow, subs, bits, raid)", icon:"broadcast_purple.svg"};
	public param_followersOnlyDuration:ParameterData = { type:"number", value:30, label:"Must follow your channel for (minutes)"};
	public obsSources:OBSSourceItem[] = [];
	public selectedOBSSources:OBSSourceItem[] = [];
	public selectedOBSScene:ParameterDataListValue|null = null;
	public channelParams:{
		emotesOnly:ParameterData;
		followersOnly:ParameterData;
		subsOnly:ParameterData;
		slowMode:ParameterData;
		autoTO:ParameterData;
		noTrigger:ParameterData;
	}|null = null;

	public get obsConnected():boolean { return OBSWebsocket.instance.connected; }
	
	public get obsSources_filtered():OBSSourceItem[] {
		let sources = this.obsSources.concat();
		sources = sources.filter(v=> {
			return this.selectedOBSSources.find(s => s.sourceName == v.sourceName) == undefined;
		})
		return sources;
	}
	
	public get finalData():EmergencyParams {
		return {
			noTriggers:this.channelParams?.noTrigger.value === true,
			emotesOnly:this.channelParams?.emotesOnly.value === true,
			subOnly:this.channelParams?.subsOnly.value === true,
			followOnly:this.channelParams?.followersOnly.value === true,
			followOnlyDuration:this.param_followersOnlyDuration.value as number,
			toUsers:this.param_autoTo.value as string,
			obsScene:this.selectedOBSScene? this.selectedOBSScene.value as string : "",
			obsSources:this.selectedOBSSources? this.selectedOBSSources.map(v=>v.sourceName) : [],
		};
	}

	public async beforeMount():Promise<void> {
		let params = JSON.parse(JSON.stringify(store.state.roomStatusParams));
		params.followersOnly.children = [this.param_followersOnlyDuration]
		params["noTrigger"] = this.param_noTrigger,
		params["autoTO"] = this.param_autoTo,
		delete params.slowMode;
		this.channelParams = params;
		if(this.channelParams) {
			//Prefill forms from storage
			this.channelParams.autoTO.value = store.state.emergencyParams.toUsers;
			this.channelParams.noTrigger.value = store.state.emergencyParams.noTriggers;
			this.channelParams.emotesOnly.value = store.state.emergencyParams.emotesOnly;
			this.channelParams.subsOnly.value = store.state.emergencyParams.subOnly;
			this.channelParams.followersOnly.value = store.state.emergencyParams.followOnly;
			this.param_followersOnlyDuration.value = store.state.emergencyParams.followOnlyDuration;
		}

		await this.listOBSScenes();
		await this.listOBSSources();

		watch(()=>this.finalData, ()=> {
			store.dispatch("setEmergencyParams", this.finalData);
		});
		
		watch(()=> OBSWebsocket.instance.connected, () => { 
			this.listOBSScenes();
			this.listOBSSources();
		});
	}

	/**
	 * List OBS Scenes
	 */
	private async listOBSScenes():Promise<void> {
		if(!OBSWebsocket.instance.connected) return;

		const list:ParameterDataListValue[] = [];
		const res = await OBSWebsocket.instance.getScenes();
		for (let i = 0; i < res.scenes.length; i++) {
			const scene = res.scenes[i] as {sceneIndex:number, sceneName:string};
			list.push({label:scene.sceneName, value:scene.sceneName});
		}
		list.sort((a, b) => {
			if(a.label.toLowerCase() < b.label.toLowerCase()) return -1;
			if(a.label.toLowerCase() > b.label.toLowerCase()) return 1;
			return 0;
		});

		this.param_obsScene.listValues = list;
		//Prefill form from storage
		this.selectedOBSScene = list.find(v=>v.value == store.state.emergencyParams.obsScene) ?? null;
	}

	/**
	 * Gets all the available OBS sources and sort them alphabetically
	 */
	private async listOBSSources():Promise<void> {
		try {
			this.obsSources = await OBSWebsocket.instance.getSources();
		}catch(error){
			//
		}
		this.obsSources.sort((a, b) => {
			if(a.sourceName.toLowerCase() < b.sourceName.toLowerCase()) return -1;
			if(a.sourceName.toLowerCase() > b.sourceName.toLowerCase()) return 1;
			return 0;
		});

		//Prefill form from storage
		const list = [];
		for (let i = 0; i < this.obsSources.length; i++) {
			const el = this.obsSources[i];
			if(store.state.emergencyParams.obsSources.findIndex(v => v === el.sourceName) > -1) {
				list.push(el);
			}
		}
		this.selectedOBSSources = list;
	}
}
</script>

<style scoped lang="less">
.paramsemergency{
	display: flex;
	flex-direction: column;
	justify-content: center;
	padding-top: 0;

	&>.icon {
		height: 4em;
		display: block;
		margin: auto;
		margin-bottom: 1em;
	}

	.header {
		text-align: center;
		margin-bottom: .5em;
	}
	
	.info {
		overflow: hidden;
		padding: .5em;
		padding-left: calc(1em + 10px);
		background-color: @mainColor_light;
		border-radius: .5em;
		margin-bottom: .5em;
		img {
			height: 1em;
			margin-right: .5em;
			vertical-align: middle;
		}
		.label {
			display: inline;
			color: @mainColor_warn;
		}
	}

	.item {
		margin-top: .5em;
		&.label {
			i {
				font-size: .8em;
			}
			.icon {
				width: 1.2em;
				margin-right: .5em;
				margin-bottom: 2px;
				display: inline;
				vertical-align: middle;
			}
			p {
				display: inline;
			}
		}
	}

	.sourceSelector {
		background-color: @mainColor_light;
		:deep(.vs__selected) {
			color: @mainColor_light;
			background-color: @mainColor_normal;
			border: none;
			svg {
				fill: @mainColor_light;
			}
		}
	}
	
}
</style>