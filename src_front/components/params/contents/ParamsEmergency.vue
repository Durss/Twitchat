<template>
	<div class="paramsemergency">
		<img src="@/assets/icons/emergency_purple.svg" alt="emergency icon" class="icon">
		
		<p class="head">{{ $t("emergency.header") }}</p>
		<ParamItem class="enableBt" :paramData="param_enable" />

		<div class="fadeHolder" :style="holderStyles">

			<section>
				<Splitter class="item splitter">{{ $t("emergency.start.title") }}</Splitter>
				<ParamItem class="item" :paramData="param_autoEnableOnShieldmode" />
				<ParamItem class="item" :paramData="param_autoEnableOnFollowbot" />
				<div class="item">
					<ParamItem class="chatCommand" :paramData="param_chatCommand" />
					<ToggleBlock :title="$t('emergency.start.chatCommand_users')" :open="false" small class="item">
						<PermissionsForm v-model="chatCommandPerms" />
					</ToggleBlock>
				</div>
				<div class="item label">
					<img src="@/assets/icons/mod_purple.svg" alt="scene icon" class="icon">
					<i18n-t scope="global" class="label" tag="p" keypath="emergency.start.also">
						<template #LINK>
							<a @click="$emit('setContent', contentAutomod)">{{ $t("emergency.start.also_link") }}</a>
						</template>
					</i18n-t>
				</div>
				<div class="item infos">{{ $t("emergency.start.followbot_info") }}</div>
			</section>

			<section>
				<Splitter class="item splitter">{{ $t("emergency.actions.title") }}</Splitter>
				<ParamItem class="item" :paramData="param_enableShieldMode" />
				<div class="twitchParams item" v-if="param_enableShieldMode.value == false">
					<ParamItem class="item hasDurationChild" :paramData="param_followersOnly" />
					<ParamItem class="item" :paramData="param_subsOnly" />
					<ParamItem class="item" :paramData="param_emotesOnly" />
					<ParamItem class="item hasDurationChild" :paramData="param_slowMode" />
				</div>
				<ParamItem class="item" :paramData="param_noTrigger" />
				<ParamItem class="item" :paramData="param_autoTO" />

				<div class="item" v-if="!obsConnected">
					<div class="warn">
						<img src="@/assets/icons/infos.svg" alt="info">
						<i18n-t scope="global" class="label" tag="p" keypath="emergency.actions.obs_connect">
							<template #LINK>
								<a @click="$emit('setContent', contentObs)">{{ $t("emergency.actions.obs_connect_link") }}</a>
							</template>
						</i18n-t>
					</div>
				</div>
				
				<div v-else class="item">
					<div class="item label">
						<img src="@/assets/icons/list_purple.svg" alt="scene icon" class="icon">
						<p>{{ $t("emergency.actions.obs_scene") }}</p>
					</div>
					<vue-select class="sourceSelector" label="label"
						:placeholder="$t('emergency.actions.obs_scene_select')"
						v-model="selectedOBSScene"
						:options="param_obsScene.listValues"
						:calculate-position="$placeDropdown"
						appendToBody
					></vue-select>
					
					<div class="item label">
						<img src="@/assets/icons/show_purple.svg" alt="sources icon" class="icon">
						<p>{{ $t("emergency.actions.obs_sources") }} <br><i>{{ $t("emergency.actions.obs_sources_example") }}</i></p>
					</div>
					<vue-select class="sourceSelector" label="sourceName"
						:placeholder="$t('emergency.actions.obs_sources_select')"
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
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
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

	public param_enable:TwitchatDataTypes.ParameterData						= {type:"toggle", value:false};
	public param_enableShieldMode:TwitchatDataTypes.ParameterData			= {type:"toggle", value:false, icon:"shieldMode_purple.svg", twitch_scope:TwitchScopes.SHIELD_MODE};
	public param_chatCommand:TwitchatDataTypes.ParameterData				= {type:"text", value:"!emergency", icon:"commands_purple.svg"};
	public param_obsScene:TwitchatDataTypes.ParameterData					= {type:"list", value:""};
	public param_autoEnableOnFollowbot:TwitchatDataTypes.ParameterData		= {type:"toggle", value:false, icon:"follow_purple.svg", tooltip:""};
	public param_autoEnableOnShieldmode:TwitchatDataTypes.ParameterData		= {type:"toggle", value:true, icon:"shieldMode_purple.svg", tooltip:"", twitch_scope:TwitchScopes.SHIELD_MODE};
	public param_slowMode:TwitchatDataTypes.ParameterData					= {type:"toggle", value:false,	icon:"timer_purple.svg", twitch_scope:TwitchScopes.SET_ROOM_SETTINGS};
	public param_slowModeDuration:TwitchatDataTypes.ParameterData			= {type:"number", value:10, max:1800, min:1};
	public param_followersOnly:TwitchatDataTypes.ParameterData				= {type:"toggle", value:false,	icon:"follow_purple.svg", twitch_scope:TwitchScopes.SET_ROOM_SETTINGS};
	public param_followersOnlyDuration:TwitchatDataTypes.ParameterData		= {type:"number", value:30, max:129600, min:1};
	public param_subsOnly:TwitchatDataTypes.ParameterData					= {type:"toggle", value:false,	icon:"sub_purple.svg", twitch_scope:TwitchScopes.SET_ROOM_SETTINGS};
	public param_emotesOnly:TwitchatDataTypes.ParameterData					= {type:"toggle", value:false,	icon:"emote_purple.svg", twitch_scope:TwitchScopes.SET_ROOM_SETTINGS};
	public param_autoTO:TwitchatDataTypes.ParameterData						= {type:"text", value:"", longText:true, placeholder:"", icon:"timeout_purple.svg", twitch_scope:TwitchScopes.SET_ROOM_SETTINGS};
	public param_noTrigger:TwitchatDataTypes.ParameterData					= {type:"toggle", value:true, icon:"broadcast_purple.svg"};
	public obsSources:OBSSourceItem[] = [];	
	public selectedOBSSources:OBSSourceItem[] = [];
	public selectedOBSScene:TwitchatDataTypes.ParameterDataListValue|null = null;
	public chatCommandPerms:TwitchatDataTypes.PermissionsData = {
		broadcaster:true,
		mods:true,
		vips:false,
		subs:false,
		all:false,
		follower:true,
		follower_duration_ms:0,
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
		this.param_autoTO.placeholder				= this.$t("emergency.params.autoTO_placeholder");
		this.param_noTrigger.labelKey				= "emergency.params.noTrigger";

		const storeParams						= this.$store("emergency").params;
		this.param_enable.value					= storeParams.enabled;
		this.param_noTrigger.value				= storeParams.noTriggers;
		this.param_autoTO.value					= storeParams.toUsers;
		this.param_subsOnly.value				= storeParams.subOnly && TwitchUtils.hasScope(TwitchScopes.SET_ROOM_SETTINGS);
		this.param_emotesOnly.value				= storeParams.emotesOnly && TwitchUtils.hasScope(TwitchScopes.SET_ROOM_SETTINGS);
		this.param_followersOnly.value			= storeParams.followOnly && TwitchUtils.hasScope(TwitchScopes.SET_ROOM_SETTINGS);
		this.param_followersOnlyDuration.value	= storeParams.followOnlyDuration;
		this.param_slowMode.value				= storeParams.slowMode && TwitchUtils.hasScope(TwitchScopes.SET_ROOM_SETTINGS);
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

		this.param_autoEnableOnShieldmode.value = TwitchUtils.hasScope(TwitchScopes.SHIELD_MODE);
		if(storeParams.autoEnableOnShieldmode != undefined && TwitchUtils.hasScope(TwitchScopes.SHIELD_MODE)) {
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
	.parameterContent();

	.fadeHolder {
		transition: opacity .2s;

		section {

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

				&.hasDurationChild {
					:deep(.child) {
						input {
							flex-basis: 90px;
						}
					}
				}

				.chatCommand {
					:deep(input) {
						flex-basis:150px;
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