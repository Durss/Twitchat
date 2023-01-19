<template>
	<div :class="classes" v-if="!obsConnected">
		<div class="item info warn">
			<img src="@/assets/icons/infos.svg" alt="info">
			<i18n-t scope="global" class="label" tag="p" keypath="triggers.actions.obs.header">
				<template #LINK>
					<a @click="$emit('setContent', contentObs)">{{ $t("triggers.actions.obs.header_link") }}</a>
				</template>
			</i18n-t>
		</div>
	</div>

	<div :class="classes" v-else>
		<ParamItem class="row item source" :paramData="source_conf" v-model="action.sourceName" />
		<ParamItem class="row item show" :paramData="show_conf" v-model="action.show" />
		<ParamItem class="row item text" :paramData="text_conf" v-model="action.text" v-if="isTextSource" ref="textContent" />
		<ParamItem class="row item url" :paramData="url_conf" v-model="action.url" v-if="isBrowserSource" ref="textContent" />
		<ParamItem class="row item file" :paramData="media_conf" v-model="action.mediaPath" v-if="isMediaSource" ref="textContent" />
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
import OBSWebsocket from '@/utils/OBSWebsocket';
import type { OBSFilter, OBSSourceItem } from '@/utils/OBSWebsocket';
import { watch } from 'vue';
import { Options, Vue } from 'vue-class-component';
import { TriggerActionHelpers, type ITriggerActionHelper, type TriggerActionObsData, type TriggerEventTypes } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';

@Options({
	props:{
		action:Object,
		sources:Object,
		event:Object,
	},
	components:{
		ParamItem,
	},
	emits:["setContent"]
})
export default class TriggerActionOBSEntry extends Vue {

	public action!:TriggerActionObsData;
	public sources!:OBSSourceItem[];
	public event!:TriggerEventTypes;
	
	public show_conf:TwitchatDataTypes.ParameterData = { type:"list", value:"", listValues:[], icon:"show_purple.svg" };
	public source_conf:TwitchatDataTypes.ParameterData = { type:"list", value:"", listValues:[], icon:"list_purple.svg", children:[] };
	public filter_conf:TwitchatDataTypes.ParameterData = { type:"list", value:"", listValues:[] };
	public text_conf:TwitchatDataTypes.ParameterData = { type:"text", longText:true, value:"", icon:"whispers_purple.svg", maxLength:500 };
	public url_conf:TwitchatDataTypes.ParameterData = { type:"text", value:"", icon:"url_purple.svg", placeholder:"http://..." };
	public media_conf:TwitchatDataTypes.ParameterData = { type:"text", value:"", icon:"url_purple.svg", placeholder:"C:/..." };
	public isMissingObsEntry = false;
	
	private filters:OBSFilter[] = [];
	
	public get obsConnected():boolean { return OBSWebsocket.instance.connected; }
	public get contentObs():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.OBS; } 
	public get showPlaceholderWarning():boolean {
		if(!this.isMediaSource) return false;
		return /\{[^ }]+\}/gi.test((this.media_conf.value as string));
	} 

	public getHelpers(key:string):ITriggerActionHelper[] { return TriggerActionHelpers(key); }

	public get classes():string[] {
		const res = ["triggeractionobsentry"];
		if(this.isMissingObsEntry) res.push("missingSource");
		return res;
	}

	/**
	 * Get if the selected source is a text source
	 */
	public get isTextSource():boolean {
		return this.sources.find(v=> v.sourceName == this.source_conf.value as string)?.inputKind === 'text_gdiplus_v2'
				&& this.show_conf.value === true;
	}

	/**
	 * Get if the selected source is a browwer source
	 */
	public get isBrowserSource():boolean {
		return this.sources.find(v=> v.sourceName == this.source_conf.value as string)?.inputKind === 'browser_source'
				&& this.show_conf.value === true;
	}

	/**
	 * Get if the selected source is a media source
	 */
	public get isMediaSource():boolean {
		const inputKind = this.sources.find(v=> v.sourceName == this.source_conf.value as string)?.inputKind;
		this.media_conf.labelKey = "triggers.actions.obs.param_media";
		if(inputKind === "image_source") this.media_conf.labelKey = "triggers.actions.obs.param_media_img";
		return (inputKind === 'ffmpeg_source' || inputKind === "image_source")
				&& this.show_conf.value === true;
	}

	public async beforeMount():Promise<void> {
		if(this.action.show == undefined) this.action.show = true;

		this.text_conf.placeholderList = TriggerActionHelpers(this.event.value);
		this.url_conf.placeholderList = TriggerActionHelpers(this.event.value);
		this.media_conf.placeholderList = TriggerActionHelpers(this.event.value);

		this.show_conf.labelKey		= "triggers.actions.obs.param_show";
		this.source_conf.labelKey	= "triggers.actions.obs.param_source";
		this.filter_conf.labelKey	= "triggers.actions.obs.param_filter";
		this.text_conf.labelKey		= "triggers.actions.obs.param_text";
		this.url_conf.labelKey		= "triggers.actions.obs.param_url";
		this.media_conf.labelKey	= "triggers.actions.obs.param_media";

		const showHideValues:TwitchatDataTypes.ParameterDataListValue[] = [
			{labelKey:"global.enable", value:false},
			{labelKey:"global.disable", value:true},
		];
		this.show_conf.value	= showHideValues[1].value
		this.show_conf.listValues= showHideValues;

		watch(()=>this.sources, ()=> { this.prefillForm(); }, {deep:true});
		watch(()=>this.source_conf.value, ()=> this.onSourceChanged());
		watch(()=>this.filter_conf.value, ()=> this.updateFilter());
		// watch(()=>this.action, ()=> {
		// 	//TODO remove that debug
		// 	console.log("ACTION UPDATE");
		// 	console.log(this.action);
		// }, {deep:true});
	}

	public mounted():void {
		//Prefill forms
		this.prefillForm();
	}


	/**
	 * Prefills the form
	 */
	private async prefillForm():Promise<void> {
		this.source_conf.listValues = this.sources.map(v=> {return {label:v.sourceName, value:v.sourceName}});
		this.source_conf.listValues.unshift({labelKey:"global.select_placeholder", value:""});
		
		this.isMissingObsEntry = false;
		this.filter_conf.value = ""
		if(this.action.sourceName != undefined) {
			if(this.sources.findIndex(v=>v.sourceName===this.action.sourceName) > -1) {
				this.source_conf.value = this.action.sourceName;
				const forceFilter = this.action.filterName != undefined;
				await this.onSourceChanged();
				if(forceFilter && this.action.filterName) {
					this.filter_conf.value = this.action.filterName;
					this.updateFilter();
				}else{
					this.filter_conf.value = "";
				}
			}else if(this.action.sourceName != ""){
				this.isMissingObsEntry = true;
			}
		}
	}

	/**
	 * Called when selecting a new source
	 */
	private async onSourceChanged():Promise<void> {
		this.isMissingObsEntry = false;
		this.filters = [];
		if(this.source_conf.value != "") {
			try {
				this.filters = await OBSWebsocket.instance.getSourceFilters(this.source_conf.value as string);
			}catch(error) {
				this.filters = []
			}
		}
		if(this.filters.length > 0) {
			const list:TwitchatDataTypes.ParameterDataListValue[] = this.filters.map(v => {return {label:v.filterName, value:v.filterName}});
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
			this.show_conf.labelKey = "triggers.actions.obs.param_show_filter";
			this.action.filterName = this.filter_conf.value as string;
		}else{
			this.show_conf.labelKey = "triggers.actions.obs.param_show";
			delete this.action.filterName;
		}
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