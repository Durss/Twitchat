<template>
	<div :class="classes" v-if="!obsConnected">
		<div class="item info warn">
			<img src="@/assets/icons/infos.svg" alt="info">
			<i18n-t scope="global" class="label" tag="p" keypath="triggers.actions.obs.header">
				<template #LINK>
					<a @click="$store('params').openParamsPage(contentObs)">{{ $t("triggers.actions.obs.header_link") }}</a>
				</template>
			</i18n-t>
		</div>
	</div>

	<div :class="classes" v-else>
		<ParamItem class="row item source" :paramData="source_conf" v-model="action.sourceName" />
		<ParamItem class="row item show" :paramData="action_conf" v-model="action.action" />
		<ParamItem class="row item text" :paramData="text_conf" v-model="action.text" v-if="isTextSource" ref="textContent" />
		<ParamItem class="row item url" :paramData="url_conf" v-model="action.url" v-if="isBrowserSource" ref="textContent" />
		<ParamItem class="row item file" :paramData="media_conf" v-model="action.mediaPath" v-if="isMediaSource && action_conf.value == 'show'" ref="textContent" />
		<div v-if="showPlaceholderWarning" class="row info security">
			<img src="@/assets/icons/alert_purple.svg" alt="info" class="">
			<i18n-t scope="global" class="label" tag="div" keypath="triggers.actions.obs.media_source">
				<template #CMD1><mark>..</mark></template>
				<template #CMD2><mark>/</mark></template>
			</i18n-t>
			<br>
			<strong>{{ $t("global.example") }}</strong>
			<i18n-t scope="global" class="label" tag="span" keypath="triggers.actions.obs.media_source_example">
				<template #PATH1><mark>C:/sounds/{MESSAGE}.mp3</mark></template>
				<template #PATH2><mark>../secretfolder/somesecretfile</mark></template>
			</i18n-t>
		</div>
	</div>
</template>

<script lang="ts">
import ParamItem from '@/components/params/ParamItem.vue';
import OBSWebsocket, { type OBSInputItem } from '@/utils/OBSWebsocket';
import type { OBSFilter, OBSSourceItem } from '@/utils/OBSWebsocket';
import { watch } from 'vue';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import { TriggerEventPlaceholders, type ITriggerPlaceholder, type TriggerActionObsData, type TriggerActionObsDataAction, type TriggerData, type TriggerCategory, type TriggerTypesValue } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';

@Component({
	components:{
		ParamItem,
	},
	emits:[]
})
export default class TriggerActionOBSEntry extends Vue {

	@Prop
	public action!:TriggerActionObsData;
	@Prop
	public obsSources!:OBSSourceItem[];
	@Prop
	public obsInputs!:OBSInputItem[];
	@Prop
	public triggerData!:TriggerData;
	
	public action_conf:TwitchatDataTypes.ParameterData<string, TriggerActionObsDataAction> = { type:"list", value:"show", listValues:[], icon:"show_purple.svg" };
	public source_conf:TwitchatDataTypes.ParameterData<string> = { type:"list", value:"", listValues:[], icon:"list_purple.svg", children:[] };
	public filter_conf:TwitchatDataTypes.ParameterData<string> = { type:"list", value:"", listValues:[] };
	public text_conf:TwitchatDataTypes.ParameterData<string> = { type:"string", longText:true, value:"", icon:"whispers_purple.svg", maxLength:500 };
	public url_conf:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"", icon:"url_purple.svg", placeholder:"http://..." };
	public media_conf:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"", icon:"url_purple.svg", placeholder:"C:/..." };
	public isMissingObsEntry = false;
	
	private filters:OBSFilter[] = [];
	
	public get obsConnected():boolean { return OBSWebsocket.instance.connected; }
	public get contentObs():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.OBS; } 
	public get showPlaceholderWarning():boolean {
		if(!this.isMediaSource || this.action_conf.value == "show") return false;
		return /\{[^ }]+\}/gi.test(this.media_conf.value);
	} 

	public getHelpers(key:TriggerTypesValue):ITriggerPlaceholder[] { return TriggerEventPlaceholders(key); }

	public get classes():string[] {
		const res = ["triggeractionobsentry"];
		if(this.isMissingObsEntry) res.push("missingSource");
		return res;
	}

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
				&& this.action_conf.value == "show";
	}

	/**
	 * Get if the selected source is a browwer source
	 */
	public get isBrowserSource():boolean {
		return this.obsSources.find(v=> v.sourceName == this.source_conf.value)?.inputKind === 'browser_source'
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

		this.text_conf.placeholderList	= TriggerEventPlaceholders(this.triggerData.type);
		this.url_conf.placeholderList	= TriggerEventPlaceholders(this.triggerData.type);
		this.media_conf.placeholderList	= TriggerEventPlaceholders(this.triggerData.type);

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

		watch(()=>this.obsSources, ()=> { this.prefillForm(); }, {deep:true});
		watch(()=>this.source_conf.value, ()=> this.onSourceChanged());
		watch(()=>this.filter_conf.value, ()=> this.updateFilter());
	}

	private updateActionsList():void {
		const values:TwitchatDataTypes.ParameterDataListValue<TriggerActionObsDataAction>[] = [];

		if(this.filter_conf.value == "") {
			values.push({labelKey:"triggers.actions.obs.param_action_show", value:"show"});
			values.push({labelKey:"triggers.actions.obs.param_action_hide", value:"hide"});
		}else{
			values.push({labelKey:"triggers.actions.obs.param_action_show_filter", value:"show"});
			values.push({labelKey:"triggers.actions.obs.param_action_hide_filter", value:"hide"});
		}

		if(this.filter_conf.value == "") {
			values.push({labelKey:"triggers.actions.obs.param_action_mute", value:"mute"});
			values.push({labelKey:"triggers.actions.obs.param_action_unmute", value:"unmute"});
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
		//Get all OBS sources
		let list = this.obsSources.map(v=> {return {label:v.sourceName, value:v.sourceName, type:"source"}}) as TwitchatDataTypes.ParameterDataListValue<string>[];
		//Get all OBS inputs
		list = list.concat( this.obsInputs.map(v=> {return {label:v.inputName, value:v.inputName, type:"input"}}) as TwitchatDataTypes.ParameterDataListValue<string>[] );

		//Dedupe entries
		const entriesDone:{[key:string]:boolean} = {};
		list = list.filter(v=> {
			const key = v.value.toLowerCase();
			if(entriesDone[key] === true) return false;
			entriesDone[key] = true;
			return true;
		})

		//Sort entries by name
		list.sort((a,b)=> {
			if(a.label!.toLowerCase() > b.label!.toLowerCase()) return 1;
			if(a.label!.toLowerCase() < b.label!.toLowerCase()) return -1;
			return 0
		});

		this.source_conf.listValues = list;
		this.source_conf.listValues.unshift({labelKey:"global.select_placeholder", value:""});
		
		this.isMissingObsEntry = false;
		this.filter_conf.value = ""
		if(this.action.sourceName != undefined) {
			//Check if an input is selected and exists on the list
			if(this.obsSources.findIndex(v=>v.sourceName===this.action.sourceName) > -1) {
				this.source_conf.value = this.action.sourceName;
				const cachedFiltername = this.action.filterName;
				const forceFilter = this.action.filterName != undefined;
				//Trigger a source change to query optionnal filters existing
				//on the selected entry
				await this.onSourceChanged();
				if(forceFilter && cachedFiltername) {
					this.filter_conf.value = cachedFiltername;
					this.updateFilter();
				}else{
					this.filter_conf.value = "";
				}
			}else if(this.action.sourceName != ""){
				this.isMissingObsEntry = true;
			}
		}

		this.updateActionsList();
	}

	/**
	 * Called when selecting a new source
	 */
	private async onSourceChanged():Promise<void> {
		this.isMissingObsEntry = false;
		this.filters = [];
		if(this.source_conf.value != "") {
			try {
				this.filters = await OBSWebsocket.instance.getSourceFilters(this.source_conf.value);
			}catch(error) {
				this.filters = []
			}
		}
		if(this.filters.length > 0) {
			const list:TwitchatDataTypes.ParameterDataListValue<string>[] = this.filters.map(v => {return {label:v.filterName, value:v.filterName}});
			list.unshift({labelKey:"triggers.actions.obs.param_filter_none", value:""});
			this.filter_conf.value = list[0].value;
			this.filter_conf.listValues = list;
			this.source_conf.children = [this.filter_conf];
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

}
</script>

<style scoped lang="less">
.triggeractionobsentry{
	.triggerActionForm();

	.paramitem  {
		:deep(select), :deep(input) {
			flex-basis: 250px;
		}
	}

	.security {
		font-size: .8em;
		mark {
			font-weight: bold;
			padding: .25em .5em;
			border-radius: .5em;
			line-height: 1.75em;
			font-size: .9em;
			background: fade(@mainColor_normal, 15%);
		}
	}
}
</style>