<template>
	<div class="paramsemergency">
		<img src="@/assets/icons/emergency_purple.svg" alt="emergency icon" class="icon">
		
		<p class="header">Perform custom actions to protect yourself in case of a hate raid, doxxing or any other toxic behavior.</p>
		<p class="header small" v-if="param_enable.value === true">Start an emergency with the <img src="@/assets/icons/emergency.svg" class="btExample"> button on the chat bar <i>(see bottom right of screen)</i> or with a chat command</p>
		<ParamItem class="item enableBt" :paramData="param_enable" />

		<Splitter class="item splitter" title="Chat command" />
		<div class="item label">Allow your mods to trigger the emergency mode from a chat command</div>
		<div>
			<ParamItem class="item" :paramData="param_chatCommand" />
			<ToggleBlock title="Allowed users" :open="false" small class="item">
				<PermissionsForm v-model="chatCommandPerms" />
			</ToggleBlock>
		</div>

		<Splitter class="item splitter" title="Chat params" />
		<div v-for="(p,key) in channelParams" :key="key">
			<ParamItem class="item" :paramData="p" />
		</div>

		<Splitter class="item splitter" title="Followbots" />
		<div class="item label">If you enable this, any new follower occuring during an emergency will be removed right away from your followers<i>(with a <mark>/block</mark> command)</i></div>
		<ParamItem class="item" :paramData="param_autoBlockFollowing" />
		<div class="item infos">
			<p>You will get a list of all the users that followed you during an emergency whether this feature is enabled or not.</p>
			<p>You can also find a <a href="https://www.twitch.tv/settings/security" target="_blank">list of all your blocked users</a> on Twitch.</p>
			<transition
				@enter="onShowItem"
				@leave="onHideItem"
			>
				<div v-if="param_autoBlockFollowing.value === true" class="togglable"><strong>You'll want to tell you viewers not to follow your channel during an emergency.</strong></div>
			</transition>
		</div>

		<Splitter class="item splitter" title="OBS params" />
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
				<img src="@/assets/icons/show_purple.svg" alt="sources icon" class="icon">
				<p>Select OBS sources to hide<br><i>(ex: streamelements alerts)</i></p>
			</div>
			<vue-select class="sourceSelector" label="sourceName"
				placeholder="Select one or more sources..."
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
import type { EmergencyParamsData, ParameterData, ParameterDataListValue, PermissionsData } from '@/types/TwitchatDataTypes';
import OBSWebsocket, { type OBSSourceItem } from '@/utils/OBSWebsocket';
import StoreProxy from '@/utils/StoreProxy';
import gsap from 'gsap';
import { watch } from 'vue';
import { Options, Vue } from 'vue-class-component';
import Splitter from '../../Splitter.vue';
import ToggleBlock from '../../ToggleBlock.vue';
import ParamItem from '../ParamItem.vue';
import PermissionsForm from './obs/PermissionsForm.vue';

@Options({
	props:{},
	components:{
		Splitter,
		ParamItem,
		ToggleBlock,
		PermissionsForm,
	}
})
export default class ParamsEmergency extends Vue {

	public param_enable:ParameterData = {type:"toggle", label:"Enabled", value:false};
	public param_chatCommand:ParameterData = {type:"text", label:"Chat command", value:"!emergency"};
	public param_obsScene:ParameterData = {type:"list", label:"Switch to scene", value:""};
	public param_autoTo:ParameterData = {type:"text", longText:true, value:"", label:"Timeout users for 30min (ex: timeout wizebot, streamelements, etc if you don't want them to keep alerting for new followers on your chat)", placeholder:"user1, user2, user3, ...", icon:"timeout_purple.svg"};
	public param_noTrigger:ParameterData = {type:"toggle", value:true, label:"Disable Twitchat triggers (follow, subs, bits, raid)", icon:"broadcast_purple.svg"};
	public param_followersOnlyDuration:ParameterData = { type:"number", value:30, label:"Must follow your channel for (minutes)"};
	public param_slowModeDuration:ParameterData = { type:"number", value:10, label:"Cooldown (seconds)"};
	public param_autoBlockFollowing:ParameterData = { type:"toggle", value:false, label:"Block follows", icon:"unfollow_purple.svg"};
	public param_autoUnblockFollowing:ParameterData = { type:"toggle", value:false, label:"Auto /unblock user right after", icon:"follow_purple.svg", tooltip:"Check this if you just want<br>to remove users's follow<br>without restricting her/him<br>access to your channel"};
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
	public chatCommandPerms:PermissionsData = {
		mods:true,
		vips:false,
		subs:false,
		all:false,
		users:"",
	};

	public get obsConnected():boolean { return OBSWebsocket.instance.connected; }
	
	public get obsSources_filtered():OBSSourceItem[] {
		let sources = this.obsSources.concat();
		sources = sources.filter(v=> {
			return this.selectedOBSSources.find(s => s.sourceName == v.sourceName) == undefined;
		})
		return sources;
	}
	
	public get finalData():EmergencyParamsData {
		return {
			enabled:this.param_enable.value as boolean,
			chatCmd:this.param_chatCommand.value as string,
			chatCmdPerms:this.chatCommandPerms,
			noTriggers:this.channelParams?.noTrigger.value === true,
			emotesOnly:this.channelParams?.emotesOnly.value === true,
			subOnly:this.channelParams?.subsOnly.value === true,
			slowMode:this.channelParams?.slowMode.value === true,
			followOnly:this.channelParams?.followersOnly.value === true,
			followOnlyDuration:this.param_followersOnlyDuration.value as number,
			slowModeDuration:this.param_slowModeDuration.value as number,
			toUsers:this.param_autoTo.value as string,
			obsScene:this.selectedOBSScene? this.selectedOBSScene.value as string : "",
			obsSources:this.selectedOBSSources? this.selectedOBSSources.map(v=>v.sourceName) : [],
			autoBlockFollows:this.param_autoBlockFollowing.value === true,
			autoUnblockFollows:this.param_autoUnblockFollowing.value === true,
		};
	}

	public async beforeMount():Promise<void> {
		let params = JSON.parse(JSON.stringify(StoreProxy.store.state.roomStatusParams));
		params.followersOnly.children = [this.param_followersOnlyDuration]
		params.slowMode.children = [this.param_slowModeDuration]
		params["noTrigger"] = this.param_noTrigger,
		params["autoTO"] = this.param_autoTo,
		this.channelParams = params;
		this.param_enable.value = StoreProxy.store.state.emergencyParams.enabled;
		this.param_autoBlockFollowing.children = [this.param_autoUnblockFollowing];
		if(this.channelParams) {
			//Prefill forms from storage
			this.channelParams.autoTO.value = StoreProxy.store.state.emergencyParams.toUsers;
			this.channelParams.noTrigger.value = StoreProxy.store.state.emergencyParams.noTriggers;
			this.channelParams.emotesOnly.value = StoreProxy.store.state.emergencyParams.emotesOnly;
			this.channelParams.subsOnly.value = StoreProxy.store.state.emergencyParams.subOnly;
			this.channelParams.slowMode.value = StoreProxy.store.state.emergencyParams.slowMode;
			this.channelParams.followersOnly.value = StoreProxy.store.state.emergencyParams.followOnly;
			this.param_followersOnlyDuration.value = StoreProxy.store.state.emergencyParams.followOnlyDuration;
			this.param_slowModeDuration.value = StoreProxy.store.state.emergencyParams.slowModeDuration;
		}
		if(StoreProxy.store.state.emergencyParams.chatCmd) {
			this.param_chatCommand.value = StoreProxy.store.state.emergencyParams.chatCmd;
		}
		if(StoreProxy.store.state.emergencyParams.chatCmdPerms) {
			this.chatCommandPerms = StoreProxy.store.state.emergencyParams.chatCmdPerms;
		}
		
		if(StoreProxy.store.state.emergencyParams.autoBlockFollows != undefined) {
			this.param_autoBlockFollowing.value = StoreProxy.store.state.emergencyParams.autoBlockFollows;
		}
		if(StoreProxy.store.state.emergencyParams.autoUnblockFollows != undefined) {
			this.param_autoUnblockFollowing.value = StoreProxy.store.state.emergencyParams.autoUnblockFollows;
		}

		await this.listOBSScenes();
		await this.listOBSSources();

		watch(()=>this.finalData, ()=> {
			StoreProxy.store.dispatch("setEmergencyParams", this.finalData);
		}, {deep:true});
		
		watch(()=> OBSWebsocket.instance.connected, () => { 
			this.listOBSScenes();
			this.listOBSSources();
		});
	}

	public onShowItem(el:HTMLDivElement, done:()=>void):void {
		gsap.killTweensOf(el);
		//Delay the opening so the animation occurs after the child's animation.
		//this way the user has more chances to see it appear than if all the
		//animations occured at the same time
		gsap.from(el, {height:0, duration:.2, ease:"sine.out", delay:.5, onComplete:()=>{
			done();
		}});
	}

	public onHideItem(el:HTMLDivElement, done:()=>void):void {
		gsap.killTweensOf(el);
		gsap.to(el, {height:0, duration:.2, ease:"sine.out", onComplete:()=>{
			done();
		}});
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
		this.selectedOBSScene = list.find(v=>v.value == StoreProxy.store.state.emergencyParams.obsScene) ?? null;
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
			if((StoreProxy.store.state.emergencyParams.obsSources as string[]).findIndex(v => v === el.sourceName) > -1) {
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
		&.small {
			font-size: .8em;
			.btExample {
				height: 1.25em;
				padding: .25em;
				border-radius: .25em;
				background-color: @mainColor_alert;
				vertical-align: middle;
			}
		}
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
				max-height: 1.2em;
				margin-right: .5em;
				margin-bottom: 2px;
				display: inline;
				vertical-align: middle;
			}
			p {
				display: inline;
			}
		}

		&.splitter {
			margin-top: 2em;
		}

		&.enableBt {
			max-width: 200px;
			margin: auto;
			border: 1px solid @mainColor_normal;
			border-radius: 1em;
			padding: .5em 1em !important;
		}
		
		&.infos {
			font-size: .8em;
			background-color:  @mainColor_light;
			padding: .5em;
			border-radius: .5em;
			// margin-top: 0;
			// overflow: hidden;
			// padding-left: calc(1em + 10px);

			.togglable {
				overflow: hidden;
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

	mark {
		font-weight: bold;
		padding: .25em .5em;
		border-radius: .5em;
		font-size: .8em;
		background: fade(@mainColor_normal, 15%);
	}
	
}
</style>