<template>
	<div class="paramsemergency parameterContent">
		<Icon name="emergency" />

		<p class="head">{{ $t("emergency.header") }}</p>
		<ParamItem class="enableBt" :paramData="param_enable" v-model="param_enable.value" />

		<div class="fadeHolder" :style="holderStyles">

			<section>
				<Splitter class="splitter">{{ $t("emergency.start.title") }}</Splitter>
				<ParamItem :paramData="param_autoEnableOnShieldmode" v-model="param_autoEnableOnShieldmode.value" />
				<ParamItem :paramData="param_autoEnableOnFollowbot" v-model="param_autoEnableOnFollowbot.value" />
				<div class="card-item">
					<ParamItem class="chatCommand" noBackground :paramData="param_chatCommand" />
					<ToggleBlock :title="$t('emergency.start.chatCommand_users')" :open="false" small>
						<PermissionsForm v-model="chatCommandPerms" />
					</ToggleBlock>
				</div>
				<div class="card-item labeled">
					<Icon name="mod" class="paramIcon" />
					<i18n-t scope="global" tag="p" keypath="emergency.start.also">
						<template #LINK>
							<a @click="$store.params.openParamsPage(contentAutomod)">{{ $t("emergency.start.also_link") }}</a>
						</template>
					</i18n-t>
				</div>
				<div class="card-item">{{ $t("emergency.start.followbot_info") }}</div>
			</section>

			<section>
				<Splitter class="splitter">{{ $t("emergency.actions.title") }}</Splitter>
				<ParamItem :paramData="param_enableShieldMode" v-model="param_enableShieldMode.value" inverseChildrenCondition>
					<ParamItem noBackground :paramData="param_followersOnly"	v-model="param_followersOnly.value"		class="childItem"/>
					<ParamItem noBackground :paramData="param_subsOnly"			v-model="param_subsOnly.value"			class="childItem"/>
					<ParamItem noBackground :paramData="param_emotesOnly"		v-model="param_emotesOnly.value"		class="childItem"/>
					<ParamItem noBackground :paramData="param_slowMode"			v-model="param_slowMode.value"			class="childItem"/>
				</ParamItem>
				<ParamItem :paramData="param_noTrigger" v-model="param_noTrigger.value" />
				<ParamItem :paramData="param_autoTO" />

				<div v-if="!obsConnected">
					<div class="card-item alert">
						<Icon name="info" class="paramIcon" />
						<i18n-t scope="global" class="label" tag="span" keypath="emergency.actions.obs_connect">
							<template #LINK>
								<a @click="$store.params.openParamsPage(contentConnexions, subcontentObs)">{{ $t("emergency.actions.obs_connect_link") }}</a>
							</template>
						</i18n-t>
					</div>
				</div>

				<template v-else>
					<div class="card-item labeled">
						<Icon name="list" class="paramIcon" />
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
						<Icon name="show" class="paramIcon" />
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
				</template>
			</section>
		</div>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import OBSWebsocket, { type OBSSourceItem } from '@/utils/OBSWebsocket';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { gsap } from 'gsap/gsap-core';
import { watch, type CSSProperties } from 'vue';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
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
class ParamsEmergency extends Vue implements IParameterContent {

	public param_obsScene:TwitchatDataTypes.ParameterData<string, string>				= {type:"list", value:""};
	public param_enable:TwitchatDataTypes.ParameterData<boolean>						= {type:"boolean", value:false, labelKey:"global.enable"};
	public param_enableShieldMode:TwitchatDataTypes.ParameterData<boolean>				= {type:"boolean", value:false, icon:"shieldMode", twitch_scopes:[TwitchScopes.SHIELD_MODE], labelKey:"emergency.params.shieldmode"};
	public param_chatCommand:TwitchatDataTypes.ParameterData<string>					= {type:"string", value:"!emergency", icon:"commands", labelKey:"emergency.params.chatCommand"};
	public param_autoEnableOnFollowbot:TwitchatDataTypes.ParameterData<boolean>			= {type:"boolean", value:false, icon:"follow", tooltip:"", labelKey:"emergency.params.autoEnableOnFollowbot", tooltipKey:"emergency.params.autoEnableOnFollowbot_tt"};
	public param_autoEnableOnShieldmode:TwitchatDataTypes.ParameterData<boolean>		= {type:"boolean", value:true, icon:"shieldMode", tooltip:"", twitch_scopes:[TwitchScopes.SHIELD_MODE], labelKey:"emergency.params.autoEnableOnShieldmode", tooltipKey:"emergency.params.autoEnableOnShieldmode_tt"};
	public param_slowMode:TwitchatDataTypes.ParameterData<boolean, string, number>		= {type:"boolean", value:false,	icon:"timer", twitch_scopes:[TwitchScopes.SET_ROOM_SETTINGS], labelKey:"emergency.params.slowMode"};
	public param_slowModeDuration:TwitchatDataTypes.ParameterData<number>				= {type:"number", value:10, max:1800, min:1, labelKey:"emergency.params.slowModeDuration"};
	public param_followersOnly:TwitchatDataTypes.ParameterData<boolean, string, number>	= {type:"boolean", value:false,	icon:"follow", twitch_scopes:[TwitchScopes.SET_ROOM_SETTINGS], labelKey:"emergency.params.followersOnly"};
	public param_followersOnlyDuration:TwitchatDataTypes.ParameterData<number>			= {type:"number", value:30, max:129600, min:1, labelKey:"emergency.params.followersOnlyDuration"};
	public param_subsOnly:TwitchatDataTypes.ParameterData<boolean>						= {type:"boolean", value:false,	icon:"sub", twitch_scopes:[TwitchScopes.SET_ROOM_SETTINGS], labelKey:"emergency.params.subsOnly"};
	public param_emotesOnly:TwitchatDataTypes.ParameterData<boolean>					= {type:"boolean", value:false,	icon:"emote", twitch_scopes:[TwitchScopes.SET_ROOM_SETTINGS], labelKey:"emergency.params.emotesOnly"};
	public param_autoTO:TwitchatDataTypes.ParameterData<string[], string>				= {type:"editablelist", value:[], longText:true, icon:"timeout", twitch_scopes:[TwitchScopes.SET_ROOM_SETTINGS], labelKey:"emergency.params.autoTO", placeholderKey:"emergency.params.autoTO_placeholder", max:100, maxLength:25};
	public param_noTrigger:TwitchatDataTypes.ParameterData<boolean>						= {type:"boolean", value:true, icon:"broadcast", labelKey:"emergency.params.noTrigger"};
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

	public get holderStyles():CSSProperties {
		return {
			opacity:this.param_enable.value === true? 1 : .5,
			pointerEvents:this.param_enable.value === true? "all" : "none",
		};
	}

	public get obsConnected():boolean { return OBSWebsocket.instance.connected; }
	public get subcontentObs():TwitchatDataTypes.ParamDeepSectionsStringType { return TwitchatDataTypes.ParamDeepSections.OBS; }
	public get contentConnexions():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.CONNECTIONS; }
	public get contentAutomod():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.AUTOMOD; }
	public get userName():string { return this.$store.auth.twitch.user.login; }

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

		const storeParams						= this.$store.emergency.params;
		this.param_enable.value					= storeParams.enabled;
		this.param_noTrigger.value				= storeParams.noTriggers;
		this.param_autoTO.value					= storeParams.toUsers ||[];
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
			this.$store.emergency.setEmergencyParams(this.finalData);
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
		this.selectedOBSScene = list.find(v=>v.value == this.$store.emergency.params.obsScene) ?? null;
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
			if((this.$store.emergency.params.obsSources as string[]).findIndex(v => v === el.sourceName) > -1) {
				list.push(el);
			}
		}
		this.selectedOBSSources = list;
	}
}
export default toNative(ParamsEmergency);
</script>

<style scoped lang="less">
.paramsemergency{
	.fadeHolder {
		transition: opacity .2s;

		section {

			.card-item {
				&.labeled {
					i {
						font-size: .8em;
					}
					p {
						display: inline;
					}
				}

			}
			.twitchParams {
				gap: .5em;
				display: flex;
				flex-direction: column;
			}

			.childItem {
				margin-top: .25em;
			}
		}
	}

	.paramIcon {
		height: 1em;
		margin-right: .5em;
		vertical-align: middle;
	}

}
</style>
