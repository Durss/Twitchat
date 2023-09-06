<template>
	<div class="triggeractionobsentry triggerActionForm" v-if="!obsConnected">
		<div class="info warn">
			<img src="@/assets/icons/info.svg" alt="info">
			<i18n-t scope="global" class="label" tag="p" keypath="triggers.actions.obs.header">
				<template #LINK>
					<a @click="$store('params').openParamsPage(contentObs)">{{ $t("triggers.actions.obs.header_link") }}</a>
				</template>
			</i18n-t>
		</div>
	</div>

	<div class="triggeractionobsentry triggerActionForm" v-else>
		<ParamItem class="source" :paramData="source_conf" v-model="action.sourceName" />
		<ParamItem class="show" :paramData="action_conf" v-model="action.action" />
		<ParamItem class="text" :paramData="text_conf" v-model="action.text" v-if="isTextSource" ref="textContent" />
		<ParamItem class="url" :paramData="url_conf" v-model="action.url" v-if="isBrowserSource" ref="textContent" />
		
		<ParamItem class="file"
			v-if="isMediaSource && filter_conf.value == '' && action_conf.value == 'show'"
			:paramData="media_conf"
			v-model="action.mediaPath" ref="textContent" />

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
import { Component, Prop } from 'vue-facing-decorator';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry.vue';

@Component({
	components:{
		ParamItem,
	},
	emits:[]
})
export default class TriggerActionOBSEntry extends AbstractTriggerActionEntry {

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
	
	public action_conf:TwitchatDataTypes.ParameterData<string, TriggerActionObsDataAction> = { type:"list", value:"show", listValues:[], icon:"show" };
	public source_conf:TwitchatDataTypes.ParameterData<string> = { type:"list", value:"", listValues:[], icon:"list", children:[] };
	public filter_conf:TwitchatDataTypes.ParameterData<string> = { type:"list", value:"", listValues:[] };
	public text_conf:TwitchatDataTypes.ParameterData<string> = { type:"string", longText:true, value:"", icon:"whispers", maxLength:500 };
	public url_conf:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"", icon:"url", placeholder:"http://..." };
	public media_conf:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"", icon:"url", placeholder:"C:/..." };
	
	private filters:OBSFilter[] = [];
	
	public get obsConnected():boolean { return OBSWebsocket.instance.connected; }
	public get contentObs():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.OBS; } 
	public get showPlaceholderWarning():boolean {
		if(!this.isMediaSource || this.action_conf.value == "show") return false;
		return /\{[^ }]+\}/gi.test(this.media_conf.value);
	} 

	public getHelpers(key:TriggerTypesValue):ITriggerPlaceholder<any>[] { return TriggerEventPlaceholders(key); }


	/**
	 * Get if the selected source is an audio source
	 */
	public get isAudioSource():boolean {
		return this.obsInputs.findIndex(v=> v.inputName == this.source_conf.value) > -1;
	}

	/**
	 * Get if the selected source is a text source
	 */
	public get isTextSource():boolean {
		return this.obsSources.find(v=> v.sourceName == this.source_conf.value)?.inputKind === 'text_gdiplus_v2'
				&& this.filter_conf.value == ""
				&& this.action_conf.value == "show";
	}

	/**
	 * Get if the selected source is a browwer source
	 */
	public get isBrowserSource():boolean {
		return this.obsSources.find(v=> v.sourceName == this.source_conf.value)?.inputKind === 'browser_source'
				&& this.filter_conf.value == ""
				&& this.action_conf.value == "show";
	}

	/**
	 * Get if the selected source is a media source
	 */
	public get isMediaSource():boolean {
		const inputKind = this.obsSources.find(v=> v.sourceName == this.source_conf.value)?.inputKind;
		this.media_conf.labelKey = "triggers.actions.obs.param_media";
		if(inputKind === "image_source") this.media_conf.labelKey = "triggers.actions.obs.param_media_img";
		return (inputKind === 'ffmpeg_source' || inputKind === "image_source" || inputKind === "vlc_source");
	}

	public async beforeMount():Promise<void> {
		if(this.action.action == undefined) this.action.action = "show";

		this.action_conf.labelKey	= "triggers.actions.obs.param_action";
		this.source_conf.labelKey	= "triggers.actions.obs.param_source";
		this.filter_conf.labelKey	= "triggers.actions.obs.param_filter";
		this.text_conf.labelKey		= "triggers.actions.obs.param_text";
		this.url_conf.labelKey		= "triggers.actions.obs.param_url";
		this.media_conf.labelKey	= "triggers.actions.obs.param_media";
	}

	public async mounted():Promise<void> {
		//Prefill forms
		await this.prefillForm();

		watch(()=>this.obsScenes, ()=> { this.prefillForm(); }, {deep:true});
		watch(()=>this.obsInputs, ()=> { this.prefillForm(); }, {deep:true});
		watch(()=>this.obsSources, ()=> { this.prefillForm(); }, {deep:true});
		watch(()=>this.source_conf.value, ()=> this.onSourceChanged());
		watch(()=>this.filter_conf.value, ()=> this.updateFilter());
	}

	private updateActionsList():void {
		const values:TwitchatDataTypes.ParameterDataListValue<TriggerActionObsDataAction>[] = [];
		const selectedItem = this.source_conf.selectedListValue as {label:string, value:string, type:"scene"|"source"|"input"}|null;

		if(this.filter_conf.value == "") {
			values.push({labelKey:"triggers.actions.obs.param_action_show", value:"show"});
			values.push({labelKey:"triggers.actions.obs.param_action_hide", value:"hide"});
			values.push({labelKey:"triggers.actions.obs.param_action_mute", value:"mute"});
			values.push({labelKey:"triggers.actions.obs.param_action_unmute", value:"unmute"});

			if(selectedItem?.type == "scene"){
				values.push({labelKey:"triggers.actions.obs.param_action_scene_switch", value:"switch_to"});
			}
		}else{
			values.push({labelKey:"triggers.actions.obs.param_action_show_filter", value:"show"});
			values.push({labelKey:"triggers.actions.obs.param_action_hide_filter", value:"hide"});
		}


		if(this.isMediaSource && this.filter_conf.value == "") {
			values.push({labelKey:"triggers.actions.obs.param_action_replay", value:"replay"});
		}
		this.action_conf.listValues	= values;
		this.action_conf.value		= this.action.action;
	}

	/**
	 * Prefills the form
	 */
	private async prefillForm():Promise<void> {
		let list:TwitchatDataTypes.ParameterDataListValue<string>[] = [];
		//Get all OBS sources
		list.push({labelKey:"triggers.actions.obs.param_source_splitter_scenes", value:"__scenes__", disabled:true});
		list = list.concat( this.obsScenes.map<TwitchatDataTypes.ParameterDataListValue<string>>(v=> {return {label:v.sceneName, value:v.sceneName, type:"scene"}}) );
		//Get all OBS inputs
		if(this.obsSources.length > 0) {
			list.push({labelKey:"triggers.actions.obs.param_source_splitter_sources", value:"__sources__", disabled:true});
			list = list.concat( this.obsSources.map<TwitchatDataTypes.ParameterDataListValue<string>>(v=> {return {label:v.sourceName, value:v.sourceName, type:"source"}}));
		}

		//Get all OBS inputs.
		//Input are only really useful for a very specific case.
		//All inputs are also sources except for flobal audio devices defined on
		//File => Settings => Audio => Global Audio Devices
		//If any is defined there they'll be listed in the inputs
		let inputs = JSON.parse(JSON.stringify(this.obsInputs)) as OBSInputItem[];
		//Dedupe entries as inputs are mostly sources
		inputs = inputs.filter(v=> {
			if(list.find(w => w.value.toLowerCase() == v.inputName.toLowerCase())) return false;
			return true;
		})
		if(inputs.length > 0) {
			list.push({labelKey:"triggers.actions.obs.param_source_splitter_inputs", value:"__inputs__", disabled:true});
			list = list.concat( inputs.map<TwitchatDataTypes.ParameterDataListValue<string>>(v=> {return {label:v.inputName, value:v.inputName, type:"input"}}));
		}
		
		if(this.action.sourceName && !list.find(v=>v.value == this.action.sourceName)) {
			list.push({label:this.action.sourceName, value:this.action.sourceName})
		}

		this.source_conf.listValues = list;
		this.source_conf.listValues.unshift({labelKey:"global.select_placeholder", value:""});
		
		this.updateActionsList();
		this.onSourceChanged(true);
	}

	/**
	 * Called when selecting a new source
	 */
	private async onSourceChanged(forceFilterEntry:boolean = false):Promise<void> {
		this.filters = [];
		if(this.source_conf.value != "") {
			try {
				this.filters = await OBSWebsocket.instance.getSourceFilters(this.source_conf.value);
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
		this.updateFilter();
	}

	/**
	 * Called when selecting a filter to update a title
	 */
	private updateFilter():void {
		if(this.source_conf.children && this.source_conf.children?.length > 0
		&& this.filter_conf.value != "") {
			this.action_conf.labelKey = "triggers.actions.obs.param_show_filter";
			this.action.filterName = this.filter_conf.value;
		}else{
			this.action_conf.labelKey = "triggers.actions.obs.param_action";
			delete this.action.filterName;
		}
		this.updateActionsList();
	}

	/**
	 * Called when the available placeholder list is updated
	 */
	public onPlaceholderUpdate(list:ITriggerPlaceholder<any>[]):void {
		this.text_conf.placeholderList	= list;
		this.url_conf.placeholderList	= list;
		this.media_conf.placeholderList	= list;
	}

}
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