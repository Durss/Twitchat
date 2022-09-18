<template>
	<div :class="classes" v-if="!obsConnected">
		<div class="info">
			<img src="@/assets/icons/infos.svg" alt="info">
			<p class="label">This feature needs you to <a @click="$emit('setContent', contentObs)">connect with OBS</a></p>
		</div>
	</div>

	<div :class="classes" v-else>
		<ParamItem class="item source" :paramData="source_conf" v-model="action.sourceName" />
		<ParamItem class="item show" :paramData="show_conf" v-model="action.show" />
		<ParamItem class="item text" :paramData="text_conf" v-model="action.text" v-if="isTextSource" ref="textContent" />
		<ParamItem class="item url" :paramData="url_conf" v-model="action.url" v-if="isBrowserSource" ref="textContent" />
		<ParamItem class="item file" :paramData="media_conf" v-model="action.mediaPath" v-if="isMediaSource" ref="textContent" />
		<div v-if="isMediaSource" class="security">
			If using a placeholder on the Media file path, folder navigation chars like <mark>..</mark> and <mark>/</mark> will be removed for security reasons.
			<br><u>Example</u>: if setting this as the path <mark>C:/sounds/{MESSAGE}.mp3</mark>, users won't be able to send <mark>../secretfolder/somesecretfile</mark>
		</div>
	</div>
</template>

<script lang="ts">
import ParamItem from '@/components/params/ParamItem.vue';
import OBSWebsocket from '@/utils/OBSWebsocket';
import type { OBSFilter, OBSSourceItem } from '@/utils/OBSWebsocket';
import { watch } from 'vue';
import { Options, Vue } from 'vue-class-component';
import { TriggerActionHelpers, type ITriggerActionHelper } from '@/utils/TriggerActionData';
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

	public action!:TwitchatDataTypes.TriggerActionObsData;
	public sources!:OBSSourceItem[];
	public event!:TwitchatDataTypes.TriggerEventTypes;

	private showHideValues:TwitchatDataTypes.ParameterDataListValue[] = [
		{label:"Hide", value:false},
		{label:"Show", value:true},
	];
	
	public show_conf:TwitchatDataTypes.ParameterData = { label:"Source visibility", type:"list", value:this.showHideValues[1].value, listValues:this.showHideValues, icon:"show_purple.svg" };
	public source_conf:TwitchatDataTypes.ParameterData = { label:"OBS Source", type:"list", value:"", listValues:[], icon:"list_purple.svg" };
	public filter_conf:TwitchatDataTypes.ParameterData = { label:"Source filter", type:"list", value:"", listValues:[] };
	public text_conf:TwitchatDataTypes.ParameterData = { label:"Text to write on source", type:"text", longText:true, value:"", icon:"whispers_purple.svg", maxLength:500 };
	public url_conf:TwitchatDataTypes.ParameterData = { label:"Browser URL", type:"text", value:"", icon:"url_purple.svg", placeholder:"http://..." };
	public media_conf:TwitchatDataTypes.ParameterData = { label:"Media file", type:"text", value:"", icon:"url_purple.svg", placeholder:"C:/..." };
	public isMissingObsEntry = false;
	
	private filters:OBSFilter[] = [];
	
	public get obsConnected():boolean { return OBSWebsocket.instance.connected; }
	public get contentObs():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsContentType.OBS; } 

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
		this.media_conf.label = "Media file";
		if(inputKind === "image_source") this.media_conf.label = "Image file";
		return (inputKind === 'ffmpeg_source' || inputKind === "image_source")
				&& this.show_conf.value === true;
	}

	public async beforeMount():Promise<void> {
		if(this.action.show == undefined) this.action.show = true;

		this.text_conf.placeholderList = TriggerActionHelpers(this.event.value);
		this.url_conf.placeholderList = TriggerActionHelpers(this.event.value);
		this.media_conf.placeholderList = TriggerActionHelpers(this.event.value);

		watch(()=>this.sources, ()=> { this.prefillForm(); }, {deep:true});
		watch(()=>this.source_conf.value, ()=> this.onSourceChanged());
		watch(()=>this.filter_conf.value, ()=> this.updateFilter());
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
		this.source_conf.listValues.unshift({label:"Select...", value:""});
		
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
			const list = this.filters.map(v => {return {label:v.filterName, value:v.filterName}});
			list.unshift({label:"- none -", value:""})
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
			this.show_conf.label = "Filter visibility";
			this.action.filterName = this.filter_conf.value as string;
		}else{
			this.show_conf.label = "Source visibility";
			delete this.action.filterName;
		}
	}

}
</script>

<style scoped lang="less">
.triggeractionobsentry{
	.info {
		overflow: hidden;
		padding: .5em;
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

	.paramitem  {
		:deep(select), :deep(input) {
			width: 250px;
		}
	}

	.item {
		margin-bottom: .25em;
	}

	.security {
		padding: 0 2em;
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