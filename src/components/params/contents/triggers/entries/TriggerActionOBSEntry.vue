<template>
	<div :class="classes" v-if="!obsConnected">
		<div class="info">
			<img src="@/assets/icons/infos.svg" alt="info">
			<p class="label">This feature needs you to connect on <a @click="$emit('setContent', 'obs')">OBS tab</a></p>
		</div>
	</div>

	<div :class="classes" v-if="obsConnected">
		<ParamItem class="item source" :paramData="source_conf" v-model="action.sourceName" />
		<ParamItem class="item show" :paramData="show_conf" v-model="action.show" />
		<ParamItem class="item text" :paramData="text_conf" v-model="action.text" v-if="isTextSource" ref="textContent" />
		<ParamItem class="item url" :paramData="url_conf" v-model="action.url" v-if="isBrowserSource" ref="textContent" />
		<ParamItem class="item file" :paramData="media_conf" v-model="action.mediaPath" v-if="isMediaSource" ref="textContent" />
		<ToggleBlock small class="helper"
			v-if="(isTextSource || isBrowserSource) && helpers[event]?.length > 0"
			title="Special placeholders dynamically replaced"
			:open="false"
		>
			<ul class="list">
				<li v-for="(h,index) in helpers[event]" :key="h.tag+event+index" @click="insert(h)" data-tooltip="Insert">
					<strong>&#123;{{h.tag}}&#125;</strong>
					{{h.desc}}
				</li>
			</ul>
		</ToggleBlock>
	</div>
</template>

<script lang="ts">
import ParamItem from '@/components/params/ParamItem.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import { ParameterData, ParameterDataListValue, TriggerActionObsData } from '@/store';
import OBSWebsocket, { OBSFilter, OBSSourceItem } from '@/utils/OBSWebsocket';
import { TriggerActionHelpers } from '@/utils/TriggerActionHandler';
import { watch } from 'vue';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{
		action:Object,
		sources:Object,
		event:String,
	},
	components:{
		ParamItem,
		ToggleBlock,
	},
	emits:["setContent"]
})
export default class TriggerActionOBSEntry extends Vue {

	public action!:TriggerActionObsData;
	public sources!:OBSSourceItem[];
	public event!:string;

	private showHideValues:ParameterDataListValue[] = [
		{label:"Hide", value:false},
		{label:"Show", value:true},
	];
	
	public show_conf:ParameterData = { label:"Source visibility", type:"list", value:this.showHideValues[1].value, listValues:this.showHideValues, icon:"show_purple.svg" };
	public source_conf:ParameterData = { label:"OBS Source", type:"list", value:"", listValues:[], icon:"list_purple.svg" };
	public filter_conf:ParameterData = { label:"Source filter", type:"list", value:"", listValues:[] };
	public text_conf:ParameterData = { label:"Text to write on source", type:"text", longText:true, value:"", icon:"whispers_purple.svg" };
	public url_conf:ParameterData = { label:"Browser URL", type:"text", value:"", icon:"url_purple.svg", placeholder:"http://..." };
	public media_conf:ParameterData = { label:"Media file", type:"browse", value:"", icon:"url_purple.svg", placeholder:"C:/..." };
	public isMissingObsEntry:boolean = false;
	
	private filters:OBSFilter[] = [];
	
	public get obsConnected():boolean { return OBSWebsocket.instance.connected; }

	public get helpers():{[key:string]:{tag:string, desc:string}[]} { return TriggerActionHelpers; }

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

	public async mounted():Promise<void> {
		//Prefill forms
		this.prefillForm();

		watch(()=>this.sources, ()=> { this.prefillForm(); }, {deep:true});
		watch(()=>this.source_conf.value, ()=> this.onSourceChanged());
		watch(()=>this.filter_conf.value, ()=> this.updateFilter());
	}

	/**
	 * Add a token on the text
	 */
	public insert(h:{tag:string, desc:string}):void {
		const tag = "{"+h.tag+"}";
		const holder = this.$refs.textContent as ParamItem;
		const input = (holder.$el as HTMLDivElement).getElementsByTagName(this.isTextSource? "textarea" : "input")[0];
		let carretPos = input.selectionStart as number | 0;
		if(!carretPos) carretPos = 0;
		//Insert tag
		input.value = input.value.substring(0, carretPos) + tag + input.value.substring(carretPos);
		this.text_conf.value = input.value;
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
		if(this.action.text != undefined) this.text_conf.value = this.action.text;
		if(this.action.show != undefined) this.show_conf.value = this.action.show;
		if(this.action.url != undefined) this.url_conf.value = this.action.url;
		if(this.action.mediaPath != undefined) this.media_conf.value = this.action.mediaPath;

		//Sets current default values to the action.
		//This allows to hide the "save" button until something is changed
		if(this.action.sourceName == undefined) this.action.sourceName = this.source_conf.value as string;
		if(this.action.filterName == undefined) this.action.filterName = this.filter_conf.value as string;
		if(this.action.text == undefined) this.action.text = this.text_conf.value as string;
		if(this.action.show == undefined) this.action.show = this.show_conf.value as boolean;
		if(this.action.url == undefined) this.action.url = this.url_conf.value as string;
		if(this.action.mediaPath == undefined) this.action.mediaPath = this.media_conf.value as string;
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
	.helper {
		font-size: .8em;
		padding-left: 2em;
		.list {
			list-style-type: none;
			// padding-left: 1em;
			li {
				padding: .25em;
				cursor: pointer;
				&:hover {
					background-color: fade(@mainColor_normal, 10%);
				}
				&:not(:last-child) {
					border-bottom: 1px solid @mainColor_normal;
				}
				strong {
					display: inline-block;
					min-width: 82px;
					border-right: 1px solid @mainColor_normal;
				}
			}
		}
	}


	.info {
		overflow: hidden;
		padding: .5em;
		padding-left: calc(1em + 10px);
		background-color: @mainColor_light;
		border-radius: .5em;
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
}
</style>