<template>
	<div class="paramsemergency">
		<img src="@/assets/icons/emergency_purple.svg" alt="emergency icon" class="icon">
		
		<p class="head">Perform custom actions to protect yourself in case of a hate raid, doxxing or any other toxic behavior.</p>
		<p class="head small" v-if="param_enable.value === true">Start an emergency with the <img src="@/assets/icons/emergency.svg" class="btExample"> button on the chat bar <i>(see bottom right of screen)</i> or with a chat command</p>
		<ParamItem class="enableBt" :paramData="param_enable" />

		<div class="fadeHolder" :style="holderStyles">

			<section>
				<Splitter class="item splitter">Start condition</Splitter>
				<ParamItem class="item" :paramData="param_autoEnableOnShieldmode" />
				<ParamItem class="item" :paramData="param_autoEnableOnFollowbot" />
				<div class="item">
					<ParamItem :paramData="param_chatCommand" />
					<ToggleBlock title="Allowed users" :open="false" small class="item">
						<PermissionsForm v-model="chatCommandPerms" />
					</ToggleBlock>
				</div>
				<div class="item label">
					<img src="@/assets/icons/mod_purple.svg" alt="scene icon" class="icon">
					<p>You can also start it from <a @click="$emit('setContent', contentAutomod)">automod rules</a></p>
				</div>
				<div class="item infos">
					<p>After the emergency is stopped you'll get a list of all the users who followed you during the emergency.</p>
				</div>
			</section>

			<section>
				<Splitter class="item splitter">Actions</Splitter>
				<ParamItem class="item" :paramData="param_enableShieldMode" />
				<div class="twitchParams item" v-if="param_enableShieldMode.value == false">
					<div :class="param_enableShieldMode.value? 'disabled' : ''">
						<ParamItem class="item" :paramData="param_followersOnly" />
						<ParamItem class="item" :paramData="param_subsOnly" />
						<ParamItem class="item" :paramData="param_emotesOnly" />
						<ParamItem class="item" :paramData="param_slowMode" />
					</div>
					<div v-if="param_enableShieldMode.value" class="disabledLabel">Configure these options <a :href="'https://www.twitch.tv/popout/moderator/'+userName+'/shield-mode'" target="_blank">on Twitch</a></div>
				</div>
				<ParamItem class="item" :paramData="param_noTrigger" />
				<ParamItem class="item" :paramData="param_autoTO" />

				<div class="item" v-if="!obsConnected">
					<div class="warn">
						<img src="@/assets/icons/infos.svg" alt="info">
						<p class="label"><a @click="$emit('setContent', contentObs)">Connect with OBS</a> to switch to a specific scene and hide sources <i>(ex: alerts)</i></p>
					</div>
				</div>
				
				<div v-else class="item">
					<div class="item label">
						<img src="@/assets/icons/list_purple.svg" alt="scene icon" class="icon">
						<p>Switch OBS to the following scene</p>
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
						<p>Hide following OBS sources <br><i>(ex: streamelements alerts)</i></p>
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
			</section>
		</div>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import OBSWebsocket, { type OBSSourceItem } from '@/utils/OBSWebsocket';
import gsap from 'gsap';
import { watch, type StyleValue } from 'vue';
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

	public param_enable:TwitchatDataTypes.ParameterData						= {type:"toggle", label:"Enabled", value:false};
	public param_enableShieldMode:TwitchatDataTypes.ParameterData			= {type:"toggle", label:"Enable Twitch shield mode", value:false, icon:"shieldMode_purple.svg"};
	public param_chatCommand:TwitchatDataTypes.ParameterData				= {type:"text", label:"Chat command", value:"!emergency", icon:"commands_purple.svg"};
	public param_obsScene:TwitchatDataTypes.ParameterData					= {type:"list", label:"Switch to scene", value:""};
	public param_autoEnableOnFollowbot:TwitchatDataTypes.ParameterData		= {type:"toggle", value:false, label:"Automatically start on followbot raid", icon:"follow_purple.svg", tooltip:"A raid is detected when receiving<br>30 follow events with less than<br>0,5s between each follow"};
	public param_autoEnableOnShieldmode:TwitchatDataTypes.ParameterData		= {type:"toggle", value:true, label:"Sync with Twitch's shield mode", icon:"shield_purple.svg", tooltip:"Start/stop emergency mode<br>from Twitch's shield mode"};
	public param_slowMode:TwitchatDataTypes.ParameterData					= {type:"toggle", value:false,	label:"Slow mode", icon:"timer_purple.svg"};
	public param_slowModeDuration:TwitchatDataTypes.ParameterData			= {type:"number", value:10, label:"Cooldown (seconds)", max:1800, min:1};
	public param_followersOnly:TwitchatDataTypes.ParameterData				= {type:"toggle", value:false,	label:"Followers only", icon:"follow_purple.svg"};
	public param_followersOnlyDuration:TwitchatDataTypes.ParameterData		= {type:"number", value:30, label:"Must follow your channel for (minutes)", max:129600, min:1};
	public param_subsOnly:TwitchatDataTypes.ParameterData					= {type:"toggle", value:false,	label:"Subs only", icon:"sub_purple.svg"};
	public param_emotesOnly:TwitchatDataTypes.ParameterData					= {type:"toggle", value:false,	label:"Emotes only", icon:"emote_purple.svg"};
	public param_autoTO:TwitchatDataTypes.ParameterData						= {type:"text", longText:true, value:"", label:"Timeout users for 30min (ex: timeout wizebot, streamelements, etc if you don't want them to keep alerting for new followers on your chat)", placeholder:"user1, user2, user3, ...", icon:"timeout_purple.svg"};
	public param_noTrigger:TwitchatDataTypes.ParameterData					= {type:"toggle", value:true, label:"Disable Twitchat triggers (follow, subs, bits, raid)", icon:"broadcast_purple.svg"};
	public obsSources:OBSSourceItem[] = [];	
	public selectedOBSSources:OBSSourceItem[] = [];
	public selectedOBSScene:TwitchatDataTypes.ParameterDataListValue|null = null;
	public chatCommandPerms:TwitchatDataTypes.PermissionsData = {
		broadcaster:true,
		mods:true,
		vips:false,
		subs:false,
		all:false,
		users:"",
	};

	public get holderStyles():StyleValue {
		return {
			opacity:this.param_enable.value === true? 1 : .5,
			pointerEvents:this.param_enable.value === true? "all" : "none",
		};
	}
	
	public get obsConnected():boolean { return OBSWebsocket.instance.connected; }
	public get contentObs():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.OBS; } 
	public get contentAutomod():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.AUTOMOD; } 
	public get userName():string { return this.$store('auth').twitch.user.login; } 
	
	public get obsSources_filtered():OBSSourceItem[] {
		let sources = this.obsSources.concat();
		sources = sources.filter(v=> {
			return this.selectedOBSSources.find(s => s.sourceName == v.sourceName) == undefined;
		})
		return sources;
	}
	
	public get finalData():TwitchatDataTypes.EmergencyParamsData {
		return {
			enabled:this.param_enable.value as boolean,
			chatCmd:this.param_chatCommand.value as string,
			chatCmdPerms:this.chatCommandPerms,
			noTriggers:this.param_noTrigger.value === true,
			emotesOnly:this.param_emotesOnly.value === true,
			subOnly:this.param_subsOnly.value === true,
			slowMode:this.param_slowMode.value === true,
			followOnly:this.param_followersOnly.value === true,
			followOnlyDuration:this.param_followersOnlyDuration.value as number,
			slowModeDuration:this.param_slowModeDuration.value as number,
			toUsers:this.param_autoTO.value as string,
			obsScene:this.selectedOBSScene? this.selectedOBSScene.value as string : "",
			obsSources:this.selectedOBSSources? this.selectedOBSSources.map(v=>v.sourceName) : [],
			autoEnableOnFollowbot:this.param_autoEnableOnFollowbot.value === true,
			autoEnableOnShieldmode:this.param_autoEnableOnShieldmode.value === true,
			enableShieldMode:this.param_enableShieldMode.value === true,
		};
	}

	public async beforeMount():Promise<void> {
		const storeParams						= this.$store("emergency").params;
		this.param_enable.value					= storeParams.enabled;
		this.param_noTrigger.value				= storeParams.noTriggers;
		this.param_autoTO.value					= storeParams.toUsers;
		this.param_subsOnly.value				= storeParams.subOnly;
		this.param_emotesOnly.value				= storeParams.emotesOnly;
		this.param_followersOnly.value			= storeParams.followOnly;
		this.param_followersOnlyDuration.value	= storeParams.followOnlyDuration;
		this.param_slowMode.value				= storeParams.slowMode;
		this.param_slowModeDuration.value		= storeParams.slowModeDuration;
		this.param_enableShieldMode.value		= storeParams.enableShieldMode;

		this.param_slowMode.children			= [this.param_slowModeDuration];
		this.param_followersOnly.children		= [this.param_followersOnlyDuration];

		if(storeParams.chatCmd) {
			this.param_chatCommand.value = storeParams.chatCmd;
		}
		if(storeParams.chatCmdPerms) {
			this.chatCommandPerms = storeParams.chatCmdPerms;
		}
		if(storeParams.autoEnableOnFollowbot != undefined) {
			this.param_autoEnableOnFollowbot.value = storeParams.autoEnableOnFollowbot;
		}
		if(storeParams.autoEnableOnShieldmode != undefined) {
			this.param_autoEnableOnShieldmode.value = storeParams.autoEnableOnShieldmode;
		}

		await this.listOBSScenes();
		await this.listOBSSources();

		watch(()=>this.finalData, ()=> {
			this.$store("emergency").setEmergencyParams(this.finalData);
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

		const list:TwitchatDataTypes.ParameterDataListValue[] = [];
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
		this.selectedOBSScene = list.find(v=>v.value == this.$store("emergency").params.obsScene) ?? null;
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
			if((this.$store("emergency").params.obsSources as string[]).findIndex(v => v === el.sourceName) > -1) {
				list.push(el);
			}
		}
		this.selectedOBSSources = list;
	}
}
</script>

<style scoped lang="less">
.paramsemergency{
	.parameterContent();

	.fadeHolder {
		transition: opacity .2s;

		section {

			.twitchParams {
				position: relative;
				.disabled {
					opacity: .35;
					pointer-events: none;
					// border: 1px solid @mainColor_normal;
					background-color: #fff;
					padding: .5em;
				}
	
				.disabledLabel {
					position: absolute;
					top: 50%;
					text-align: center;
					width: 100%;
					padding: 3em 0;
					transform: translateY(-50%);
					background: radial-gradient(rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.9) 30%, rgba(255,255,255,0) 80%);
					background-size: 120% 100%;
					background-position-x: 50%;
				}
			}

			.item {
				&:not(:first-child) {
					margin-top: .5em;
				}
				&.label {
					margin-bottom: .5em;
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

				&.intro {
					margin-top: 1em;
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
				:deep(input[type="number"]) {
					width: 90px;
				}
			}
		}
	}

	.sourceSelector {
		padding-left: 1.5em;
		:deep(.vs__selected) {
			color: @mainColor_light !important;
			background-color: @mainColor_normal;
			border: none;
			svg {
				fill: @mainColor_light;
			}
		}
	}

}
</style>