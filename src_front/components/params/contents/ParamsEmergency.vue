<template>
	<div class="paramsemergency parameterContent">
		<img src="@/assets/icons/emergency.svg" alt="emergency icon" class="icon">
		
		<p class="head">{{ $t("emergency.header") }}</p>
		<ParamItem class="enableBt" :paramData="param_enable" />

		<div class="fadeHolder" :style="holderStyles">

			<section>
				<Splitter class="splitter">{{ $t("emergency.start.title") }}</Splitter>
				<div class="card-item">
					<ParamItem :paramData="param_autoEnableOnShieldmode" />
				</div>
				<div class="card-item">
					<ParamItem :paramData="param_autoEnableOnFollowbot" />
				</div>
				<div class="card-item">
					<ParamItem class="chatCommand" :paramData="param_chatCommand" />
					<ToggleBlock :title="$t('emergency.start.chatCommand_users')" :open="false" small>
						<PermissionsForm v-model="chatCommandPerms" />
					</ToggleBlock>
				</div>
				<div class="card-item labeled">
					<img src="@/assets/icons/mod.svg" alt="scene icon" class="icon">
					<i18n-t scope="global" tag="p" keypath="emergency.start.also">
						<template #LINK>
							<a @click="$store('params').openParamsPage(contentAutomod)">{{ $t("emergency.start.also_link") }}</a>
						</template>
					</i18n-t>
				</div>
				<div class="card-item">{{ $t("emergency.start.followbot_info") }}</div>
			</section>

			<section>
				<Splitter class="splitter">{{ $t("emergency.actions.title") }}</Splitter>
				<div class="card-item">
					<ParamItem :paramData="param_enableShieldMode" />
				</div>
				<div class="card-item twitchParams" v-if="param_enableShieldMode.value == false">
					<ParamItem class="hasDurationChild" :paramData="param_followersOnly" />
					<ParamItem :paramData="param_subsOnly" />
					<ParamItem :paramData="param_emotesOnly" />
					<ParamItem class="hasDurationChild" :paramData="param_slowMode" />
				</div>
				<div class="card-item">
					<ParamItem :paramData="param_noTrigger" />
				</div>
				<div class="card-item">
					<ParamItem :paramData="param_autoTO" />
				</div>

				<div class="card-item" v-if="!obsConnected">
					<div class="warn">
						<img src="@/assets/icons/info.svg" alt="info">
						<i18n-t scope="global" class="label" tag="p" keypath="emergency.actions.obs_connect">
							<template #LINK>
								<a @click="$store('params').openParamsPage(contentObs)">{{ $t("emergency.actions.obs_connect_link") }}</a>
							</template>
						</i18n-t>
					</div>
				</div>
				
				<div v-else>
					<div class="card-item labeled">
						<img src="@/assets/icons/list.svg" alt="scene icon" class="icon">
						<p>{{ $t("emergency.actions.obs_scene") }}</p>
						<vue-select class="sourceSelector" label="label"
							:placeholder="$t('emergency.actions.obs_scene_select')"
							v-model="selectedOBSScene"
							:options="param_obsScene.listValues"
							:calculate-position="$placeDropdown"
							appendToBody
						></vue-select>
					</div>
					
					<div class="card-item labeled">
						<img src="@/assets/icons/show.svg" alt="sources icon" class="icon">
						<p>{{ $t("emergency.actions.obs_sources") }} <br><i>{{ $t("emergency.actions.obs_sources_example") }}</i></p>
						<vue-select class="sourceSelector" label="sourceName"
							:placeholder="$t('emergency.actions.obs_sources_select')"
							v-model="selectedOBSSources"
							:options="obsSources_filtered"
							:calculate-position="$placeDropdown"
							appendToBody
							multiple
						></vue-select>
					</div>
				</div>
			</section>
		</div>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import OBSWebsocket, { type OBSSourceItem } from '@/utils/OBSWebsocket';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import gsap from 'gsap';
import { watch, type StyleValue } from 'vue';
import { Component, Vue } from 'vue-facing-decorator';
import Splitter from '../../Splitter.vue';
import ToggleBlock from '../../ToggleBlock.vue';
import ParamItem from '../ParamItem.vue';
import PermissionsForm from '../../PermissionsForm.vue';
import type IParameterContent from './IParameterContent';

@Component({
	components:{
		Splitter,
		ParamItem,
		ToggleBlock,
		PermissionsForm,
	}
})
export default class ParamsEmergency extends Vue implements IParameterContent {

	public param_enable:TwitchatDataTypes.ParameterData<boolean>						= {type:"boolean", value:false};
	public param_enableShieldMode:TwitchatDataTypes.ParameterData<boolean>				= {type:"boolean", value:false, icon:"shieldMode.svg", twitch_scopes:[TwitchScopes.SHIELD_MODE]};
	public param_chatCommand:TwitchatDataTypes.ParameterData<string>					= {type:"string", value:"!emergency", icon:"commands.svg"};
	public param_obsScene:TwitchatDataTypes.ParameterData<string, string>				= {type:"list", value:""};
	public param_autoEnableOnFollowbot:TwitchatDataTypes.ParameterData<boolean>			= {type:"boolean", value:false, icon:"follow.svg", tooltip:""};
	public param_autoEnableOnShieldmode:TwitchatDataTypes.ParameterData<boolean>		= {type:"boolean", value:true, icon:"shieldMode.svg", tooltip:"", twitch_scopes:[TwitchScopes.SHIELD_MODE]};
	public param_slowMode:TwitchatDataTypes.ParameterData<boolean, string, number>		= {type:"boolean", value:false,	icon:"timer.svg", twitch_scopes:[TwitchScopes.SET_ROOM_SETTINGS]};
	public param_slowModeDuration:TwitchatDataTypes.ParameterData<number>				= {type:"number", value:10, max:1800, min:1};
	public param_followersOnly:TwitchatDataTypes.ParameterData<boolean, string, number>	= {type:"boolean", value:false,	icon:"follow.svg", twitch_scopes:[TwitchScopes.SET_ROOM_SETTINGS]};
	public param_followersOnlyDuration:TwitchatDataTypes.ParameterData<number>			= {type:"number", value:30, max:129600, min:1};
	public param_subsOnly:TwitchatDataTypes.ParameterData<boolean>						= {type:"boolean", value:false,	icon:"sub.svg", twitch_scopes:[TwitchScopes.SET_ROOM_SETTINGS]};
	public param_emotesOnly:TwitchatDataTypes.ParameterData<boolean>					= {type:"boolean", value:false,	icon:"emote.svg", twitch_scopes:[TwitchScopes.SET_ROOM_SETTINGS]};
	public param_autoTO:TwitchatDataTypes.ParameterData<string[], string>				= {type:"editablelist", value:[], longText:true, icon:"timeout.svg", twitch_scopes:[TwitchScopes.SET_ROOM_SETTINGS]};
	public param_noTrigger:TwitchatDataTypes.ParameterData<boolean>						= {type:"boolean", value:true, icon:"broadcast.svg"};
	public obsSources:OBSSourceItem[] = [];	
	public selectedOBSSources:OBSSourceItem[] = [];
	public selectedOBSScene:TwitchatDataTypes.ParameterDataListValue<string>|null = null;
	public chatCommandPerms:TwitchatDataTypes.PermissionsData = {
		broadcaster:true,
		mods:true,
		vips:false,
		subs:false,
		all:false,
		follower:true,
		follower_duration_ms:0,
		usersAllowed:[],
		usersRefused:[],
	};

	public get holderStyles():StyleValue {
		return {
			opacity:this.param_enable.value === true? 1 : .5,
			pointerEvents:this.param_enable.value === true? "all" : "none",
		};
	}
	
	public get obsConnected():boolean { return OBSWebsocket.instance.connected; }
	public get contentObs():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.OBS; } 
	public get contentAutomod():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.AUTOMOD; } 
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
			enabled:this.param_enable.value,
			chatCmd:this.param_chatCommand.value,
			chatCmdPerms:this.chatCommandPerms,
			noTriggers:this.param_noTrigger.value === true,
			emotesOnly:this.param_emotesOnly.value === true,
			subOnly:this.param_subsOnly.value === true,
			slowMode:this.param_slowMode.value === true,
			followOnly:this.param_followersOnly.value === true,
			followOnlyDuration:this.param_followersOnlyDuration.value,
			slowModeDuration:this.param_slowModeDuration.value,
			toUsers:this.param_autoTO.value ?? [],
			obsScene:this.selectedOBSScene? this.selectedOBSScene.value : "",
			obsSources:this.selectedOBSSources? this.selectedOBSSources.map(v=>v.sourceName) : [],
			autoEnableOnFollowbot:this.param_autoEnableOnFollowbot.value === true,
			autoEnableOnShieldmode:this.param_autoEnableOnShieldmode.value === true,
			enableShieldMode:this.param_enableShieldMode.value === true,
		};
	}

	public async beforeMount():Promise<void> {
		this.param_enable.labelKey					= "global.enabled";
		this.param_enableShieldMode.labelKey		= "emergency.params.shieldmode";
		this.param_chatCommand.labelKey				= "emergency.params.chatCommand";
		this.param_autoEnableOnFollowbot.labelKey	= "emergency.params.autoEnableOnFollowbot";
		this.param_autoEnableOnFollowbot.tooltipKey	= "emergency.params.autoEnableOnFollowbot_tt";
		this.param_autoEnableOnShieldmode.labelKey	= "emergency.params.autoEnableOnShieldmode";
		this.param_autoEnableOnShieldmode.tooltipKey= "emergency.params.autoEnableOnShieldmode_tt";
		this.param_slowMode.labelKey				= "emergency.params.slowMode";
		this.param_slowModeDuration.labelKey		= "emergency.params.slowModeDuration";
		this.param_followersOnly.labelKey			= "emergency.params.followersOnly";
		this.param_followersOnlyDuration.labelKey	= "emergency.params.followersOnlyDuration";
		this.param_subsOnly.labelKey				= "emergency.params.subsOnly";
		this.param_emotesOnly.labelKey				= "emergency.params.emotesOnly";
		this.param_autoTO.labelKey					= "emergency.params.autoTO";
		this.param_autoTO.placeholderKey			= "emergency.params.autoTO_placeholder";
		this.param_noTrigger.labelKey				= "emergency.params.noTrigger";

		const storeParams						= this.$store("emergency").params;
		this.param_enable.value					= storeParams.enabled;
		this.param_noTrigger.value				= storeParams.noTriggers;
		this.param_autoTO.value					= storeParams.toUsers;
		this.param_subsOnly.value				= storeParams.subOnly && TwitchUtils.hasScopes([TwitchScopes.SET_ROOM_SETTINGS]);
		this.param_emotesOnly.value				= storeParams.emotesOnly && TwitchUtils.hasScopes([TwitchScopes.SET_ROOM_SETTINGS]);
		this.param_followersOnly.value			= storeParams.followOnly && TwitchUtils.hasScopes([TwitchScopes.SET_ROOM_SETTINGS]);
		this.param_followersOnlyDuration.value	= storeParams.followOnlyDuration;
		this.param_slowMode.value				= storeParams.slowMode && TwitchUtils.hasScopes([TwitchScopes.SET_ROOM_SETTINGS]);
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

		this.param_autoEnableOnShieldmode.value = TwitchUtils.hasScopes([TwitchScopes.SHIELD_MODE]);
		if(storeParams.autoEnableOnShieldmode != undefined && TwitchUtils.hasScopes([TwitchScopes.SHIELD_MODE])) {
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

	public onNavigateBack(): boolean { return false; }

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

		const list:TwitchatDataTypes.ParameterDataListValue<string>[] = [];
		const res = await OBSWebsocket.instance.getScenes();
		for (let i = 0; i < res.scenes.length; i++) {
			const scene = res.scenes[i] as {sceneIndex:number, sceneName:string};
			list.push({label:scene.sceneName, value:scene.sceneName});
		}
		list.sort((a, b) => {
			if(a.label!.toLowerCase() < b.label!.toLowerCase()) return -1;
			if(a.label!.toLowerCase() > b.label!.toLowerCase()) return 1;
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
	.fadeHolder {
		transition: opacity .2s;

		section {

			.card-item {
				&.labeled {
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

				.hasDurationChild {
					:deep(.child) {
						input {
							flex-basis: 90px !important;
						}
					}
				}

				.chatCommand {
					:deep(input) {
						flex-basis:150px;
					}
				}
				
				&.twitchParams {
					display: flex;
					flex-direction: column;
					gap: .5em
				}
			}
		}
	}

	.sourceSelector {
		padding-left: 1.5em;
	}

}
</style>