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
		<ParamItem :paramData="source_conf" v-model="selectedSourceName" />
		<ParamItem :paramData="action_conf" v-model="action.action" v-if="selectedSourceName" />
		<ParamItem :paramData="text_conf" v-model="action.text" v-if="isTextSource" />
		<ParamItem :paramData="url_conf" v-model="action.url" v-if="isBrowserSource" />
		<ParamItem :paramData="x_conf" v-model="action.pos_x" v-if="action.action == 'move'" />
		<ParamItem :paramData="y_conf" v-model="action.pos_y" v-if="action.action == 'move'" />
		<ParamItem :paramData="width_conf" v-model="action.width" v-if="action.action == 'resize'" />
		<ParamItem :paramData="height_conf" v-model="action.height" v-if="action.action == 'resize'" />
		<ParamItem :paramData="angle_conf" v-model="action.angle" v-if="action.action == 'rotate'" />
		<ParamItem :paramData="transformRelative_conf" v-model="action.relativeTransform" v-if="action.action == 'rotate' || action.action == 'resize' || action.action == 'move'" />
		<ParamItem :paramData="transformAnimate_conf" v-model="action.animate" v-if="action.action == 'rotate' || action.action == 'resize' || action.action == 'move'">
			<ParamItem :paramData="transformEasing_conf" v-model="action.animateEasing" noBackground class="child" />
			<ParamItem :paramData="transformDuration_conf" v-model="action.animateDuration" noBackground class="child" />
		</ParamItem>

		<ParamItem class="file"
			v-if="canSetMediaPath"
			:paramData="media_conf"
			v-model="action.mediaPath" />
			
		<ParamItem class="url" :paramData="mediaEndEvent_conf" v-model="action.waitMediaEnd" v-if="canWaitForMediaEnd" />

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
	</div>
</template>

<script lang="ts">
import ParamItem from '@/components/params/ParamItem.vue';
import { TriggerEventPlaceholders, type ITriggerPlaceholder, type TriggerActionObsData, type TriggerActionObsDataAction, type TriggerData, type TriggerTypesValue } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { OBSFilter, OBSSceneItem, OBSSourceItem } from '@/utils/OBSWebsocket';
import OBSWebsocket, { type OBSInputItem } from '@/utils/OBSWebsocket';
import { watch } from 'vue';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry';

@Component({
	components:{
		ParamItem,
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
	
	public action_conf:TwitchatDataTypes.ParameterData<TriggerActionObsDataAction, TriggerActionObsDataAction> = { type:"list", value:"show", listValues:[], icon:"show", labelKey:"triggers.actions.obs.param_action" };
	public source_conf:TwitchatDataTypes.ParameterData<string, string, string> = { type:"list", value:"", listValues:[], icon:"list", children:[], labelKey:"triggers.actions.obs.param_source" };
	public filter_conf:TwitchatDataTypes.ParameterData<string> = { type:"list", value:"", listValues:[], labelKey:"triggers.actions.obs.param_filter" };
	public text_conf:TwitchatDataTypes.ParameterData<string> = { type:"string", longText:true, value:"", icon:"whispers", maxLength:500, labelKey:"triggers.actions.obs.param_text" };
	public url_conf:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"", icon:"url", placeholder:"http://...", labelKey:"triggers.actions.obs.param_url" };
	public media_conf:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"", icon:"url", placeholder:"C:/...", labelKey:"triggers.actions.obs.param_media" };
	public mediaEndEvent_conf:TwitchatDataTypes.ParameterData<boolean> = { type:"boolean", value:false, icon:"countdown", labelKey:"triggers.actions.obs.param_mediaEvent" };
	public x_conf:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"", icon:"coord_x", maxLength:500, labelKey:"triggers.actions.obs.param_x" };
	public y_conf:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"", icon:"coord_y", maxLength:500, labelKey:"triggers.actions.obs.param_y" };
	public angle_conf:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"", icon:"number", maxLength:500, labelKey:"triggers.actions.obs.param_angle" };
	public width_conf:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"", icon:"number", maxLength:500, labelKey:"triggers.actions.obs.param_width" };
	public height_conf:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"", icon:"number", maxLength:500, labelKey:"triggers.actions.obs.param_height" };
	public transformRelative_conf:TwitchatDataTypes.ParameterData<boolean> = { type:"boolean", value:false, icon:"number" };
	public transformAnimate_conf:TwitchatDataTypes.ParameterData<boolean, unknown, any> = { type:"boolean", value:false, icon:"animate", labelKey:"triggers.actions.obs.param_transform_animate" };
	public transformEasing_conf:TwitchatDataTypes.ParameterData<TriggerActionObsData["animateEasing"]> = { type:"list", value:"linear.none", icon:"easing", labelKey:"triggers.actions.obs.param_transform_animate_easing" };
	public transformDuration_conf:TwitchatDataTypes.ParameterData<number> = { type:"number", value:500, min:0, max:60000, icon:"timer", labelKey:"triggers.actions.obs.param_transform_animate_duration" };
	
	public selectedSourceName:string = "";
	
	private filters:OBSFilter[] = [];
	
	public get obsConnected():boolean { return OBSWebsocket.instance.connected; }
	public get subcontentObs():TwitchatDataTypes.ParamDeepSectionsStringType { return TwitchatDataTypes.ParamDeepSections.OBS; }
	public get contentConnexions():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.CONNEXIONS; }
	public get showPlaceholderWarning():boolean {
		if(!this.isMediaSource || this.action_conf.value != "show") return false;
		return /\{[^ }]+\}/gi.test(this.media_conf.value);
	} 

	public getHelpers(key:TriggerTypesValue):ITriggerPlaceholder<any>[] { return TriggerEventPlaceholders(key); }

	/**
	 * Get if the selected source is a text source
	 */
	public get isTextSource():boolean {
		const input = this.obsSources.find(v=>"source_"+v.sourceName == this.source_conf.value);
		if(!input || !input.inputKind) return false;

		return (input.inputKind.indexOf("text_") > -1)
				&& this.filter_conf.value == ""
				&& this.action_conf.value == "show";
	}

	/**
	 * Get if the selected source is a browwer source
	 */
	public get isBrowserSource():boolean {
		return this.obsSources.find(v=> "source_"+v.sourceName == this.source_conf.value)?.inputKind == 'browser_source'
				&& this.filter_conf.value == ""
				&& this.action_conf.value == "show";
	}

	/**
	 * Get if the "wait for media to end playing" option can be used
	 */
	public get canWaitForMediaEnd():boolean { return this.isMediaSource && (this.action.action == "show" || this.action.action == "replay"); }

	/**
	 * Get if we can modify the media path
	 */
	public get canSetMediaPath():boolean { return this.isMediaSource && this.filter_conf.value == "" && this.action_conf.value == "show"; }

	/**
	 * Get if the selected source is a media source
	 */
	public get isMediaSource():boolean {
		let sourceName = this.source_conf.selectedListValue? (this.source_conf.selectedListValue as SourceItem).name : "";
		const inputKind = this.obsSources.find(v=> v.sourceName == sourceName)?.inputKind;
		this.media_conf.labelKey = "triggers.actions.obs.param_media";
		if(inputKind === "image_source") this.media_conf.labelKey = "triggers.actions.obs.param_media_img";
		return (inputKind === 'ffmpeg_source' || inputKind === "image_source" || inputKind === "vlc_source");
	}

	/**
	 * Get if source is a slideshow
	 */
	public get isSlideshowSource():boolean {
		let sourceName = this.source_conf.selectedListValue? (this.source_conf.selectedListValue as SourceItem).name : "";
		const inputKind = this.obsSources.find(v=> v.sourceName == sourceName)?.inputKind;
		return inputKind == "slideshow";
	}

	public async beforeMount():Promise<void> {
		if(this.action.action == undefined) this.action.action = "show";
	}

	public async mounted():Promise<void> {
		const sourceNameBackup = this.action.sourceName;
		const actionBackup = this.action.action;

		// this.transformAnimate_conf.children = [this.transformEasing_conf, this.transformDuration_conf];

		const easing = this.$tm("triggers.actions.obs.param_transform_animate_easing_list") as {[key:string]:string};
		const easingList:TwitchatDataTypes.ParameterDataListValue<string>[] = [];
		for (const ease in easing) {
			easingList.push({value:ease, label: easing[ease]});
		}
		this.transformEasing_conf.listValues = easingList;

		// this.transformEasing_conf.editCallback = (param) => this.action.animateEasing = param.value;
		// this.transformDuration_conf.editCallback = (param) => this.action.animateDuration = param.value;
		// this.transformEasing_conf.value = this.action.animateEasing ?? "sine.out";
		// this.transformDuration_conf.value = this.action.animateDuration ?? 0;

		//Prefill forms
		await this.prefillForm(false);

		const list = this.source_conf.listValues as SourceItem[];
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
		})
		

		watch(()=>this.obsScenes, ()=> { this.prefillForm(); }, {deep:true});
		watch(()=>this.obsInputs, ()=> { this.prefillForm(); }, {deep:true});
		watch(()=>this.obsSources, ()=> { this.prefillForm(); }, {deep:true});
		watch(()=>this.action_conf.value, ()=> this.cleanupData());
		watch(()=>this.source_conf.value, ()=> this.onSourceChanged());
		watch(()=>this.filter_conf.value, ()=> this.updateFilter());
		watch(()=>this.selectedSourceName, ()=> {
			if(this.source_conf.selectedListValue) {
				this.action.sourceName = (this.source_conf.selectedListValue as SourceItem).name;
			}else{
				this.action.sourceName = "";
			}
		});
	}

	/**
	 * Called when the available placeholder list is updated
	 */
	public onPlaceholderUpdate(list:ITriggerPlaceholder<any>[]):void {
		this.text_conf.placeholderList	= list;
		this.url_conf.placeholderList	= list;
		this.media_conf.placeholderList	= list;
		this.x_conf.placeholderList		= 
		this.y_conf.placeholderList		= 
		this.angle_conf.placeholderList	= 
		this.width_conf.placeholderList	= 
		this.height_conf.placeholderList= list.filter(v=> v.numberParsable === true);
	}

	/**
	 * Prefills the form
	 */
	private async prefillForm(cleanData:boolean = true):Promise<void> {
		let list:SourceItem[] = [];
		//Get all OBS scenes
		list.push({labelKey:"triggers.actions.obs.param_source_splitter_scenes", value:"__scenes__", disabled:true, name:"__scene__", type:"scene"});
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
		this.source_conf.listValues = list;
		
		await this.onSourceChanged(true, cleanData)
	}

	/**
	 * Called when selecting a new source
	 * Loads filters associated to the given source to define
	 * if the filters list should be displayed or not
	 */
	private async onSourceChanged(forceFilterEntry:boolean = false, cleanData:boolean = true):Promise<void> {
		this.filters = [];
		if(this.source_conf.value != "") {
			try {
				//the replace() is rather dirty... i made it so all items starts with their type, "source_xxx", "input_xxx", "scene_xxx"...
				this.filters = await OBSWebsocket.instance.getSourceFilters(this.source_conf.value.replace(/^[a-z]+_/gi, ""));
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
			this.filter_conf.value = this.action.filterName || list[0].value;
			if(list.length > 1) {
				this.filter_conf.listValues = list;
				this.source_conf.children = [this.filter_conf];
			}else{
				this.filter_conf.listValues = [];
				this.source_conf.children = [];
			}
		}else{
			this.source_conf.children = [];
		}
		this.updateFilter(cleanData);
	}

	/**
	 * Called when selecting a filter
	 * Updates the input's label or cleanup filter's name if any
	 */
	private updateFilter(cleanData:boolean = true):void {
		if(this.source_conf.children && this.source_conf.children?.length > 0
		&& this.filter_conf.value != "") {
			this.action_conf.labelKey = "triggers.actions.obs.param_show_filter";
			this.action.filterName = this.filter_conf.value;
		}else{
			this.action_conf.labelKey = "triggers.actions.obs.param_action";
			delete this.action.filterName;
		}
		if(cleanData) this.updateActionsList();
	}

	/**
	 * Updates available actions (show, hide, mute, unmute, replay, ...)
	 */
	private updateActionsList():void {
		const values:TwitchatDataTypes.ParameterDataListValue<TriggerActionObsDataAction>[] = [];
		const selectedItem = this.source_conf.selectedListValue as SourceItem|undefined;

		if(this.filter_conf.value == "") {
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

		this.action_conf.listValues	= values;
		this.action_conf.value		= this.action.action;
		this.cleanupData();
	}

	/**
	 * Cleanup useless data to avoid unexpected trigger execution behavior
	 */
	private async cleanupData():Promise<void> {
		await this.$nextTick();//Leave it time to form field to be unmounted

		if(!this.canSetMediaPath) {
			this.media_conf.value = "";
			delete this.action.mediaPath;
		}

		if(!this.canWaitForMediaEnd) {
			this.mediaEndEvent_conf.value = false;
			delete this.action.waitMediaEnd;
		}
		if(!this.isTextSource) {
			this.text_conf.value = "";
			delete this.action.text;
		}
		if(!this.isBrowserSource) {
			this.url_conf.value = "";
			delete this.action.url;
		}

		if(this.action.action == "move" || this.action.action == "resize" || this.action.action == "rotate") {
			if(!this.action.animateEasing) this.action.animateEasing = "linear.none";
			if(!this.action.animateDuration) this.action.animateDuration = 500;
			if(!this.action.relativeTransform) this.action.relativeTransform = false;

			if(this.action.action == "move") {
				this.transformRelative_conf.labelKey = "triggers.actions.obs.param_relative_transform_move";
			}else if(this.action.action == "resize") {
				this.transformRelative_conf.labelKey = "triggers.actions.obs.param_relative_transform_resize";
			}else if(this.action.action == "rotate") {
				this.transformRelative_conf.labelKey = "triggers.actions.obs.param_relative_transform_rotate";
			}
		}else{
			delete this.action.animateEasing;
			delete this.action.animateDuration;
			delete this.action.relativeTransform;
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
}
</style>