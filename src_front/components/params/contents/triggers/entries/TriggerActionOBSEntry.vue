<template>
	<div class="triggeractionobsentry triggerActionForm" v-if="!obsConnected">
		<div class="info warn">
			<img src="@/assets/icons/info.svg" alt="info">
			<i18n-t scope="global" class="label" tag="p" keypath="triggers.actions.obs.header">
				<template #LINK>
					<a @click="$store.params.openParamsPage(contentConnexions, subcontentObs)">{{ $t("triggers.actions.obs.header_link") }}</a>
				</template>
			</i18n-t>
		</div>
	</div>

	<div class="triggeractionobsentry triggerActionForm" v-else>
		<ParamItem :paramData="param_obsAction_conf" v-model="action.obsAction" />

		<div class="info secondary" v-if="action.obsAction === 'pauserecord' || action.obsAction === 'resumerecord'">{{$t("triggers.actions.obs.param_obs_action_pauserecord_alert")}}</div>

		<ParamItem  v-else-if="action.obsAction === 'createchapter'" :paramData="param_record_chapter_name" v-model="action.recordChapterName" />

		<template v-else-if="action.obsAction === 'emitevent'">
			<div class="info">{{ $t("triggers.actions.obs.param_browser_info") }}</div>
			<ParamItem :paramData="param_browserEvent_name" v-model="action.browserEventName" />
			<ParamItem :paramData="param_browserEvent_param" v-model="action.browserEventParams" />
			<div class="info">
				<span>{{ $t("triggers.actions.obs.param_browser_usage") }}</span>
				<div class="typescript"><pre><span class="keyword">window</span>.<span class="function">addEventListener</span>(<span class="string">"{{ action.browserEventName }}"</span>, (<span class="param">param</span>) => {
	<span class="keyword">console</span>.<span class="function">log</span>(<span class="param">param.detail.data</span>);
});</pre>
					<TTButton class="copyBt" icon="copy" :copy="getBrowserEventCode()" transparent />
				</div>
			</div>
		</template>

		<template v-else-if="action.obsAction === 'sources'">
			<ParamItem :paramData="param_source_conf" v-model="selectedSourceName" />
			<ParamItem :paramData="param_sourceAction_conf" v-model="action.action" v-if="selectedSourceName" />
			<ParamItem :paramData="param_text_conf" v-model="action.text" v-if="isTextSource" />
			<ParamItem :paramData="param_url_conf" v-model="action.url" v-if="isBrowserSource" />
			<ParamItem :paramData="param_css_conf" v-model="action.browserSourceCss" v-if="isBrowserSource" />
			<ParamItem :paramData="param_x_conf" v-model="action.pos_x" v-if="action.action == 'move'" />
			<ParamItem :paramData="param_y_conf" v-model="action.pos_y" v-if="action.action == 'move'" />
			<ParamItem :paramData="param_width_conf" v-model="action.width" v-if="action.action == 'resize'" />
			<ParamItem :paramData="param_height_conf" v-model="action.height" v-if="action.action == 'resize'" />
			<ParamItem :paramData="param_angle_conf" v-model="action.angle" v-if="action.action == 'rotate'" />
			<ParamItem :paramData="param_transformRelative_conf" v-model="action.relativeTransform" v-if="action.action == 'rotate' || action.action == 'resize' || action.action == 'move'" />
			<ParamItem :paramData="param_transformAnimate_conf" v-model="action.animate" v-if="action.action == 'rotate' || action.action == 'resize' || action.action == 'move'">
				<ParamItem :paramData="param_transformEasing_conf" v-model="action.animateEasing" noBackground class="child" />
				<ParamItem :paramData="param_transformDuration_conf" v-model="action.animateDuration" noBackground class="child" />
			</ParamItem>
			<ParamItem class="file"
				v-if="canSetMediaPath"
				:paramData="param_media_conf"
				v-model="action.mediaPath" />

			<ParamItem class="url" :paramData="param_mediaEndEvent_conf" v-model="action.waitMediaEnd" v-if="canWaitForMediaEnd" />

			<div v-if="showPlaceholderWarning" class="info">
				<img src="@/assets/icons/alert.svg" alt="info" class="">
				<i18n-t scope="global" class="label" tag="p" keypath="triggers.actions.obs.media_source">
					<template #CMD1><mark>..</mark></template>
					<template #CMD2><mark>/</mark></template>
				</i18n-t>
				<div>
					<strong>{{ $t("global.example") }}</strong>
					<i18n-t scope="global" class="label" tag="span" keypath="triggers.actions.obs.media_source_example">
						<template #PATH1><mark>C:/sounds/{MESSAGE}.mp3</mark></template>
						<template #PATH2><mark>../secretfolder/somesecretfile</mark></template>
					</i18n-t>
				</div>
			</div>
		</template>

		<template v-else-if="action.obsAction === 'hotKey'">
			<img src="@/assets/icons/loader.svg" alt="loader" class="card-item loading" v-if="(param_hotkeyAction_conf.listValues || []).length == 0" />
			<ParamItem class="url" :paramData="param_hotkeyAction_conf" v-model="action.hotKeyAction" v-else />
		</template>

		<template v-else-if="action.obsAction === 'screenshot'">
			<ParamItem :paramData="param_source_conf" v-model="selectedSourceName" />
			<ParamItem :paramData="param_screenImgFormat_conf" v-model="action.screenshotImgFormat" />
			<ParamItem :paramData="param_screenImgSize_toggle_conf" v-model="action.screenshotImgCustomSize">
				<ParamItem :paramData="param_screenImgSize_width_conf" v-model="action.screenshotImgWidth" noBackground :childLevel="1" />
				<ParamItem :paramData="param_screenImgSize_height_conf" v-model="action.screenshotImgHeight" noBackground :childLevel="1" />
			</ParamItem>

			<SwitchButton :labels="[$t('triggers.actions.obs.param_screenImgSize_modeSave_conf'), $t('triggers.actions.obs.param_screenImgSize_modeGet_conf')]"
			:values="['save', 'get']"
			v-model="action.screenshotImgMode" />

			<ParamItem v-if="action.screenshotImgMode == 'save'"
				:paramData="param_screenImgSavePath_conf"
				:error="isInvalidScreenFilePath"
				v-model="action.screenshotImgSavePath" />

			<template  v-if="action.screenshotImgMode == 'get'">
				<ParamItem :paramData="param_screenImgSavePH_conf" v-model="action.screenshotImgSavePlaceholder" />

				<i18n-t scope="global" class="card-item primary" tag="div"
				keypath="triggers.actions.common.custom_placeholder_example"
				v-if="(action.screenshotImgSavePlaceholder || '').length > 0">
					<template #PLACEHOLDER>
						<mark v-click2Select>{{"{"}}{{action.screenshotImgSavePlaceholder!.toUpperCase()}}{{"}"}}</mark>
					</template>
				</i18n-t>
			</template>
		</template>

	</div>
</template>

<script lang="ts">
import ParamItem from '@/components/params/ParamItem.vue';
import SwitchButton from '@/components/SwitchButton.vue';
import TTButton from '@/components/TTButton.vue';
import { type ITriggerPlaceholder, type TriggerActionObsData, type TriggerActionObsDataAction, type TriggerActionObsSourceDataAction, type TriggerData } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { OBSFilter, OBSSceneItem, OBSSourceItem } from '@/utils/OBSWebsocket';
import { default as OBSWebsocket, default as OBSWebSocket, type OBSInputItem } from '@/utils/OBSWebsocket';
import Utils from '@/utils/Utils';
import { watch } from 'vue';
import { Component, Prop, toNative } from 'vue-facing-decorator';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry';

@Component({
	components:{
		TTButton,
		ParamItem,
		SwitchButton,
	},
	emits:[]
})
class TriggerActionOBSEntry extends AbstractTriggerActionEntry {

	@Prop
	declare action:TriggerActionObsData;
	@Prop({default:[]})
	declare triggerData:TriggerData;
	@Prop({default:[]})
	public obsScenes!:OBSSceneItem[];
	@Prop({default:[]})
	public obsSources!:OBSSourceItem[];
	@Prop({default:[]})
	public obsInputs!:OBSInputItem[];

	public param_obsAction_conf:TwitchatDataTypes.ParameterData<TriggerActionObsDataAction, TriggerActionObsDataAction> = { type:"list", value:"sources", listValues:[], icon:"show", labelKey:"triggers.actions.obs.param_obsAction" };
	public param_sourceAction_conf:TwitchatDataTypes.ParameterData<TriggerActionObsSourceDataAction, TriggerActionObsSourceDataAction> = { type:"list", value:"show", listValues:[], icon:"show", labelKey:"triggers.actions.obs.param_sourceAction" };
	public param_source_conf:TwitchatDataTypes.ParameterData<string, string, string> = { type:"list", value:"", listValues:[], icon:"list", children:[], labelKey:"triggers.actions.obs.param_source" };
	public param_filter_conf:TwitchatDataTypes.ParameterData<string> = { type:"list", value:"", listValues:[], labelKey:"triggers.actions.obs.param_filter" };
	public param_text_conf:TwitchatDataTypes.ParameterData<string> = { type:"string", longText:true, value:"", icon:"whispers", maxLength:500, labelKey:"triggers.actions.obs.param_text" };
	public param_url_conf:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"", icon:"url", placeholder:"http://...", labelKey:"triggers.actions.obs.param_url" };
	public param_css_conf:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"", longText:true, maxLength:10000, icon:"color", placeholder:"", labelKey:"triggers.actions.obs.param_css" };
	public param_media_conf:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"", icon:"url", placeholder:"C:/...", labelKey:"triggers.actions.obs.param_media" };
	public param_mediaEndEvent_conf:TwitchatDataTypes.ParameterData<boolean> = { type:"boolean", value:false, icon:"countdown", labelKey:"triggers.actions.obs.param_mediaEvent" };
	public param_x_conf:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"", icon:"coord_x", maxLength:500, labelKey:"triggers.actions.obs.param_x" };
	public param_y_conf:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"", icon:"coord_y", maxLength:500, labelKey:"triggers.actions.obs.param_y" };
	public param_angle_conf:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"", icon:"number", maxLength:500, labelKey:"triggers.actions.obs.param_angle" };
	public param_width_conf:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"", icon:"number", maxLength:500, labelKey:"triggers.actions.obs.param_width" };
	public param_height_conf:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"", icon:"number", maxLength:500, labelKey:"triggers.actions.obs.param_height" };
	public param_transformRelative_conf:TwitchatDataTypes.ParameterData<boolean> = { type:"boolean", value:false, icon:"number" };
	public param_transformAnimate_conf:TwitchatDataTypes.ParameterData<boolean, unknown, any> = { type:"boolean", value:false, icon:"animate", labelKey:"triggers.actions.obs.param_transform_animate" };
	public param_transformEasing_conf:TwitchatDataTypes.ParameterData<TriggerActionObsData["animateEasing"]> = { type:"list", value:"linear.none", icon:"easing", labelKey:"triggers.actions.obs.param_transform_animate_easing" };
	public param_transformDuration_conf:TwitchatDataTypes.ParameterData<number> = { type:"number", value:500, min:0, max:60000, icon:"timer", labelKey:"triggers.actions.obs.param_transform_animate_duration" };
	public param_browserEvent_name:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"", maxLength:100, icon:"label", labelKey:"triggers.actions.obs.param_browserEvent_name" };
	public param_browserEvent_param:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"", maxLength:10000, longText:true, icon:"placeholder", labelKey:"triggers.actions.obs.param_browserEvent_param" };
	public param_record_chapter_name:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"", maxLength:100, icon:"label", labelKey:"triggers.actions.obs.param_record_chapter_name" };
	public param_hotkeyAction_conf:TwitchatDataTypes.ParameterData<string, string> = { type:"list", value:"", icon:"press", labelKey:"triggers.actions.obs.param_record_hotkey_name" };
	public param_screenImgFormat_conf:TwitchatDataTypes.ParameterData<string, string> = { type:"list", value:"jpeg", icon:"screenshot", labelKey:"triggers.actions.obs.param_screenImgFormat_conf" };
	public param_screenImgSize_toggle_conf:TwitchatDataTypes.ParameterData<boolean> = { type:"boolean", value:false, icon:"scale", labelKey:"triggers.actions.obs.param_screenImgSize_toggle_conf" };
	public param_screenImgSize_width_conf:TwitchatDataTypes.ParameterData<number> = { type:"number", value:1920, min:8, max:4096, icon:"coord_x", labelKey:"triggers.actions.obs.param_screenImgSize_width_conf" };
	public param_screenImgSize_height_conf:TwitchatDataTypes.ParameterData<number> = { type:"number", value:1080, min:8, max:4096, icon:"coord_y", labelKey:"triggers.actions.obs.param_screenImgSize_height_conf" };
	public param_screenImgSavePath_conf:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"", placeholder:"D:/image.jpeg", maxLength:500, icon:"save", labelKey:"triggers.actions.obs.param_screenImgSavePath_conf" };
	public param_screenImgSavePH_conf:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"", maxLength:30, allowedCharsRegex:"a-z0-9_", icon:"placeholder", labelKey:"triggers.actions.obs.param_screenImgSavePH_conf" };

	public selectedSourceName:string = "";

	private filters:OBSFilter[] = [];

	public get obsConnected():boolean { return OBSWebsocket.instance.connected; }
	public get subcontentObs():TwitchatDataTypes.ParamDeepSectionsStringType { return TwitchatDataTypes.ParamDeepSections.OBS; }
	public get contentConnexions():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.CONNECTIONS; }
	public get showPlaceholderWarning():boolean {
		if(!this.isMediaSource || this.param_sourceAction_conf.value != "show") return false;
		return /\{[^ }]+\}/gi.test(this.param_media_conf.value);
	}

	/**
	 * Get if the selected source is a text source
	 */
	public get isTextSource():boolean {
		const input = this.obsSources.find(v=>"source_"+v.sourceName == this.param_source_conf.value);
		if(!input || !input.inputKind) return false;

		return (input.inputKind.indexOf("text_") > -1)
				&& this.param_filter_conf.value == ""
				&& this.param_sourceAction_conf.value == "show";
	}

	/**
	 * Get if the selected source is a browwer source
	 */
	public get isBrowserSource():boolean {
		return this.obsSources.find(v=> "source_"+v.sourceName == this.param_source_conf.value)?.inputKind == 'browser_source'
				&& this.param_filter_conf.value == ""
				&& this.param_sourceAction_conf.value == "show";
	}

	/**
	 * Get if the "wait for media to end playing" option can be used
	 */
	public get canWaitForMediaEnd():boolean { return this.isMediaSource && (this.action.action == "show" || this.action.action == "replay"); }

	/**
	 * Get if we can modify the media path
	 */
	public get canSetMediaPath():boolean { return this.isMediaSource && this.param_filter_conf.value == "" && this.param_sourceAction_conf.value == "show"; }

	/**
	 * Get if custom file path for source screen shot contains a file name or not
	 */
	public get isInvalidScreenFilePath():boolean { return !/[^\\/]+\.[^\\/]+$/.test(this.action.screenshotImgSavePath || ""); }

	/**
	 * Get if the selected source is a media source
	 */
	public get isMediaSource():boolean {
		let sourceName = this.param_source_conf.selectedListValue? (this.param_source_conf.selectedListValue as SourceItem).name : "";
		const inputKind = this.obsSources.find(v=> v.sourceName == sourceName)?.inputKind;
		this.param_media_conf.labelKey = "triggers.actions.obs.param_media";
		if(inputKind === "image_source") this.param_media_conf.labelKey = "triggers.actions.obs.param_media_img";
		return (inputKind === 'ffmpeg_source' || inputKind === "image_source" || inputKind === "vlc_source");
	}

	/**
	 * Get if source is a slideshow
	 */
	public get isSlideshowSource():boolean {
		let sourceName = this.param_source_conf.selectedListValue? (this.param_source_conf.selectedListValue as SourceItem).name : "";
		const inputKind = this.obsSources.find(v=> v.sourceName == sourceName)?.inputKind;
		return inputKind == "slideshow";
	}

	public async beforeMount():Promise<void> {
		if(this.action.obsAction == undefined) this.action.obsAction = "sources";
		if(this.action.action == undefined) this.action.action = "show";
		const defaultFormats = ["jpeg", "jpg", "png", "bmp"];
		this.param_screenImgFormat_conf.listValues = (OBSWebSocket.instance.versionInfo?.supportedImageFormats ?? defaultFormats).map(v=> {return {label:v, value:v}});
	}

	public async mounted():Promise<void> {
		const sourceNameBackup = this.action.sourceName;
		const actionBackup = this.action.action;
		this.param_screenImgSavePath_conf.errorMessage = this.$t("triggers.actions.obs.param_screenImgSavePath_conf_error");

		// this.transformAnimate_conf.children = [this.transformEasing_conf, this.transformDuration_conf];

		const easing = this.$tm("triggers.actions.obs.param_transform_animate_easing_list") as {[key:string]:string};
		const easingList:TwitchatDataTypes.ParameterDataListValue<string>[] = [];
		for (const ease in easing) {
			easingList.push({value:ease, label: easing[ease]});
		}
		this.param_transformEasing_conf.listValues = easingList;

		// this.transformEasing_conf.editCallback = (param) => this.action.animateEasing = param.value;
		// this.transformDuration_conf.editCallback = (param) => this.action.animateDuration = param.value;
		// this.transformEasing_conf.value = this.action.animateEasing ?? "sine.out";
		// this.transformDuration_conf.value = this.action.animateDuration ?? 0;

		//Prefill forms
		await this.prefillForm(false);

		const list = this.param_source_conf.listValues as SourceItem[];
		//If entry does not exist on the available items, push a fake
		//item to avoid losing it
		if(sourceNameBackup && !list.find(v=>v.name == sourceNameBackup)) {
			this.selectedSourceName = "source_"+sourceNameBackup;
			list.push({label:sourceNameBackup, value:this.selectedSourceName, name:sourceNameBackup, type:"source"});
		}else{
			const source = list.find((v:SourceItem)=>v.value == "source_"+sourceNameBackup);
			const scene = list.find((v:SourceItem)=>v.value == "scene_"+sourceNameBackup);
			const input = list.find((v:SourceItem)=>v.value == "input_"+sourceNameBackup);
			this.selectedSourceName = (actionBackup == "switch_to"? scene?.value : source?.value || scene?.value || input?.value)!;
		}

		//Prefill may change the action during its build.
		//Force it to the actual requested value.
		//There must be a better way to handle this async issue but it's 5am
		//my brain is half-working I want to sleep T_T
		this.$nextTick().then(()=>{
			this.action.action = actionBackup;
		});

		const actionList:TwitchatDataTypes.ParameterDataListValue<TriggerActionObsDataAction>[] = [];
		actionList.push({labelKey:"triggers.actions.obs.param_obs_action_sources", value:"sources"});
		actionList.push({labelKey:"triggers.actions.obs.param_obs_action_startstream", value:"startstream"});
		actionList.push({labelKey:"triggers.actions.obs.param_obs_action_stopstream", value:"stopstream"});
		actionList.push({labelKey:"triggers.actions.obs.param_obs_action_startrecord", value:"startrecord"});
		actionList.push({labelKey:"triggers.actions.obs.param_obs_action_pauserecord", value:"pauserecord"});
		actionList.push({labelKey:"triggers.actions.obs.param_obs_action_resumerecord", value:"resumerecord"});
		actionList.push({labelKey:"triggers.actions.obs.param_obs_action_stoprecord", value:"stoprecord"});
		actionList.push({labelKey:"triggers.actions.obs.param_obs_action_createchapter", value:"createchapter"});
		actionList.push({labelKey:"triggers.actions.obs.param_obs_action_startvirtualcam", value:"startvirtualcam"});
		actionList.push({labelKey:"triggers.actions.obs.param_obs_action_stopvirtualcam", value:"stopvirtualcam"});
		actionList.push({labelKey:"triggers.actions.obs.param_obs_action_emitevent", value:"emitevent"});
		actionList.push({labelKey:"triggers.actions.obs.param_obs_action_hotkey", value:"hotKey"});
		actionList.push({labelKey:"triggers.actions.obs.param_obs_action_screenshot", value:"screenshot"});
		this.param_obsAction_conf.listValues	= actionList;

		watch(()=>this.action.obsAction, ()=> { this.onActionChange(); });
		watch(()=>this.obsScenes, ()=> { this.prefillForm(); }, {deep:true});
		watch(()=>this.obsInputs, ()=> { this.prefillForm(); }, {deep:true});
		watch(()=>this.obsSources, ()=> { this.prefillForm(); }, {deep:true});
		watch(()=>this.param_sourceAction_conf.value, ()=> this.cleanupData());
		watch(()=>this.param_source_conf.value, ()=> this.onSourceChanged());
		watch(()=>this.param_filter_conf.value, ()=> this.updateFilter());
		watch(()=>this.selectedSourceName, ()=> {
			if(this.param_source_conf.selectedListValue) {
				this.action.sourceName = (this.param_source_conf.selectedListValue as SourceItem).name;
			}else{
				this.action.sourceName = "";
			}
		});
		this.onActionChange()
	}

	/**
	 * Called when the available placeholder list is updated
	 */
	public onPlaceholderUpdate(list:ITriggerPlaceholder<any>[]):void {
		this.param_text_conf.placeholderList	=
		this.param_url_conf.placeholderList		=
		this.param_media_conf.placeholderList	=
		this.param_css_conf.placeholderList		=
		this.param_record_chapter_name.placeholderList	=
		this.param_screenImgSavePath_conf.placeholderList	=
		this.param_browserEvent_param.placeholderList	= list;

		this.param_x_conf.placeholderList		=
		this.param_y_conf.placeholderList		=
		this.param_angle_conf.placeholderList	=
		this.param_width_conf.placeholderList	=
		this.param_height_conf.placeholderList= list.filter(v=> v.numberParsable === true);
	}

	/**
	 * Called when copy button is clicked on browser event example
	 */
	public getBrowserEventCode():string {
		return `window.addEventListener("${this.action.browserEventName}", (param) => {
	console.log(param.detail.data);
});`;
	}

	/**
	 * Called when selecting a new action and on init
	 */
	private onActionChange():void {
		if(this.action.obsAction == "hotKey") {
			OBSWebsocket.instance.getHotkeys().then((list) => {
				const disallowList = [
					"libobs",
					"ObsBrowser",
					"MediaSource",
				]
				const hotkeys = list
				.filter(key=> disallowList.find(v => key.includes(v)) == undefined)
				.map(v=> {return {label:v.replace(".", " "), value:v}});
				this.param_hotkeyAction_conf.listValues = hotkeys;
			});
		}
	}

	/**
	 * Prefills the form
	 */
	private async prefillForm(cleanData:boolean = true):Promise<void> {
		let list:SourceItem[] = [];
		//Add "--- Scenes ---" splitter
		list.push({labelKey:"triggers.actions.obs.param_source_splitter_scenes", value:"__scenes__", disabled:true, type:"scene", name:"__scene__"});
		//Add "current scene "item"
		list.push({labelKey:"triggers.actions.obs.param_source_currentScene", value:"scene_"+this.$t("triggers.actions.obs.param_source_currentScene"), type:"scene", name:this.$t("triggers.actions.obs.param_source_currentScene")});
		//Add existing OBS scenes
		list = list.concat( this.obsScenes.map<SourceItem>(v=> {return {label:v.sceneName, value:"scene_"+v.sceneName, type:"scene", name:v.sceneName}}) );
		//Get all OBS sources
		if(this.obsSources.length > 0) {
			list.push({labelKey:"triggers.actions.obs.param_source_splitter_sources", value:"__sources__", disabled:true, name:"__scene__", type:"source"});
			list = list.concat( this.obsSources.map<SourceItem>(v=> {return {label:v.sourceName, value:"source_"+v.sourceName, type:"source", name:v.sourceName}}));
		}

		//Get all OBS inputs.
		//Inputs are only really useful for a very specific case.
		//All inputs are also sources except for global audio devices defined on:
		//File => Settings => Audio => Global Audio Devices
		//If any is defined there they'll be listed in the inputs
		let inputs = JSON.parse(JSON.stringify(this.obsInputs)) as OBSInputItem[];
		//Dedupe entries as inputs are mostly sources
		inputs = inputs.filter(v=> {
			if(list.find(w => w.name.toLowerCase() == v.inputName.toLowerCase())) return false;
			return true;
		})
		if(inputs.length > 0) {
			list.push({labelKey:"triggers.actions.obs.param_source_splitter_inputs", value:"__inputs__", disabled:true, name:"__input__", type:"input"});
			list = list.concat( inputs.map<SourceItem>(v=> {return {label:v.inputName, value:"input_"+v.inputName, type:"input", name:v.inputName}}));
		}

		//Add "select..." placeholder entry
		list.unshift({labelKey:"global.select_placeholder", value:"", name:"", type:"source"});
		this.param_source_conf.listValues = list;

		await this.onSourceChanged(true, cleanData)
	}

	/**
	 * Called when selecting a new source
	 * Loads filters associated to the given source to define
	 * if the filters list should be displayed or not
	 */
	private async onSourceChanged(forceFilterEntry:boolean = false, cleanData:boolean = true):Promise<void> {
		this.filters = [];
		if(this.param_source_conf.value != "") {
			try {
				//the replace() is rather dirty... i made it so all items starts with their type, "source_xxx", "input_xxx", "scene_xxx"...
				this.filters = await OBSWebsocket.instance.getSourceFilters(this.param_source_conf.value.replace(/^[a-z]+_/gi, ""));
			}catch(error) {
				this.filters = []
			}
		}

		if(this.filters.length > 0 || this.action.filterName) {
			const list:TwitchatDataTypes.ParameterDataListValue<string>[] = (this.filters || []).map(v => {return {label:v.filterName, value:v.filterName}});
			list.unshift({labelKey:"triggers.actions.obs.param_filter_none", value:""});
			//Add defined filter if missing from the list
			if(forceFilterEntry && this.action.filterName && !list.find(v=>v.value == this.action.filterName)) {
				list.push({label:this.action.filterName, value:this.action.filterName})
			}
			this.param_filter_conf.value = this.action.filterName || list[0].value;
			if(list.length > 1 && this.action.obsAction != "screenshot") {
				this.param_filter_conf.listValues = list;
				this.param_source_conf.children = [this.param_filter_conf];
			}else{
				this.param_filter_conf.listValues = [];
				this.param_source_conf.children = [];
			}
		}else{
			this.param_source_conf.children = [];
		}
		this.updateFilter(cleanData);
	}

	/**
	 * Called when selecting a filter
	 * Updates the input's label or cleanup filter's name if any
	 */
	private updateFilter(cleanData:boolean = true):void {
		if(this.param_source_conf.children && this.param_source_conf.children?.length > 0
		&& this.param_filter_conf.value != "") {
			this.param_sourceAction_conf.labelKey = "triggers.actions.obs.param_show_filter";
			this.action.filterName = this.param_filter_conf.value;
		}else{
			this.param_sourceAction_conf.labelKey = "triggers.actions.obs.param_sourceAction";
			delete this.action.filterName;
		}
		if(cleanData) this.updateActionsList();
	}

	/**
	 * Updates available actions (show, hide, mute, unmute, replay, ...)
	 */
	private updateActionsList():void {
		const values:TwitchatDataTypes.ParameterDataListValue<TriggerActionObsSourceDataAction>[] = [];
		const selectedItem = this.param_source_conf.selectedListValue as SourceItem|undefined;

		if(this.param_filter_conf.value == "") {
			if(selectedItem && selectedItem.type != "scene"){
				values.push({labelKey:"triggers.actions.obs.param_action_show", value:"show"});
				values.push({labelKey:"triggers.actions.obs.param_action_hide", value:"hide"});
				values.push({labelKey:"triggers.actions.obs.param_action_toggle_visibility", value:"toggle_visibility"});
				values.push({labelKey:"triggers.actions.obs.param_action_mute", value:"mute"});
				values.push({labelKey:"triggers.actions.obs.param_action_unmute", value:"unmute"});
			}

			if(this.isMediaSource) {
				values.push({labelKey:"triggers.actions.obs.param_action_replay", value:"replay"});
				values.push({labelKey:"triggers.actions.obs.param_action_stop", value:"stop"});
			}

			if(this.isMediaSource || this.isSlideshowSource) {
				values.push({labelKey:"triggers.actions.obs.param_action_prev", value:"prev"});
				values.push({labelKey:"triggers.actions.obs.param_action_next", value:"next"});
			}

			if(selectedItem && selectedItem.type == "scene"){
				values.push({labelKey:"triggers.actions.obs.param_action_scene_switch", value:"switch_to"});
			}else{
				values.push({labelKey:"triggers.actions.obs.param_action_move", value:"move"});
				values.push({labelKey:"triggers.actions.obs.param_action_rotate", value:"rotate"});
				values.push({labelKey:"triggers.actions.obs.param_action_resize", value:"resize"});
			}
		}else{
			values.push({labelKey:"triggers.actions.obs.param_action_show_filter", value:"show"});
			values.push({labelKey:"triggers.actions.obs.param_action_hide_filter", value:"hide"});
			values.push({labelKey:"triggers.actions.obs.param_action_toggle_filter", value:"toggle_visibility"});
		}

		this.param_sourceAction_conf.listValues	= values;
		this.param_sourceAction_conf.value		= this.action.action;
		this.cleanupData();
	}

	/**
	 * Cleanup useless data to avoid unexpected trigger execution behavior
	 */
	private async cleanupData():Promise<void> {
		await this.$nextTick();//Leave it time to form field to be unmounted

		if(!this.canSetMediaPath) {
			this.param_media_conf.value = "";
			delete this.action.mediaPath;
		}

		if(!this.canWaitForMediaEnd) {
			this.param_mediaEndEvent_conf.value = false;
			delete this.action.waitMediaEnd;
		}
		if(!this.isTextSource) {
			this.param_text_conf.value = "";
			delete this.action.text;
		}
		if(!this.isBrowserSource) {
			this.param_url_conf.value = "";
			this.param_css_conf.value = "";
			delete this.action.url;
			delete this.action.browserSourceCss;
		}

		if(this.action.action == "move" || this.action.action == "resize" || this.action.action == "rotate") {
			if(!this.action.animateEasing) this.action.animateEasing = "linear.none";
			if(!this.action.animateDuration) this.action.animateDuration = 500;
			if(!this.action.relativeTransform) this.action.relativeTransform = false;

			if(this.action.action == "move") {
				this.param_transformRelative_conf.labelKey = "triggers.actions.obs.param_relative_transform_move";
			}else if(this.action.action == "resize") {
				this.param_transformRelative_conf.labelKey = "triggers.actions.obs.param_relative_transform_resize";
			}else if(this.action.action == "rotate") {
				this.param_transformRelative_conf.labelKey = "triggers.actions.obs.param_relative_transform_rotate";
			}
		}else{
			delete this.action.animateEasing;
			delete this.action.animateDuration;
			delete this.action.relativeTransform;
		}

		if(this.action.obsAction != "createchapter") {
			delete this.action.recordChapterName;
		}

		if(this.action.obsAction == "screenshot") {
			if(!this.action.screenshotImgMode) this.action.screenshotImgMode = "save";
			if(!this.action.screenshotImgCustomSize) this.action.screenshotImgCustomSize = false;
		}else{
			delete this.action.screenshotImgFormat;
			delete this.action.screenshotImgWidth;
			delete this.action.screenshotImgHeight;
			delete this.action.screenshotImgCustomSize;
			delete this.action.screenshotImgMode;
			delete this.action.screenshotImgSavePath;
		}

		if(this.action.obsAction != "hotKey") {
			delete this.action.hotKeyAction;
		}
	}
}


interface SourceItem extends TwitchatDataTypes.ParameterDataListValue<string> {
	type:"scene"|"source"|"input";
	name:string;
}
export default toNative(TriggerActionOBSEntry);
</script>

<style scoped lang="less">
.triggeractionobsentry{
	.paramitem  {
		:deep(select), :deep(input) {
			flex-basis: 250px;
		}
	}

	.copyBt {
		position: absolute;
		top: .25em;
		right: .25em;
		font-weight: .7em;
	}

	.typescript {
		position: relative;
		background-color: var(--grayout-fader);
		padding: .5em;
		border-radius: var(--border-radius);
		margin-top: .25em;
		pre {
			font-family: 'Courier New', Courier, monospace;
		}
	}

	/* Keywords */
	.typescript .keyword {
		color: #cc99cd;
	}

	/* Strings */
	.typescript .string {
		color: #f08d49;
	}

	/* Functions */
	.typescript .function {
		color: #ffd700;
	}

	.loading {
		height: 2em;
	}
}
</style>
