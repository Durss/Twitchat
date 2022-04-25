<template>
	<ToggleBlock
	orderable
	deletable
	medium
	:error="isMissingObsEntry"
	:open="opened"
	:title="title" :class="classes"
	@delete="$emit('delete')">
		<form @submit.prevent="onSubmit()">
			<ParamItem class="item source" :paramData="source_conf" />
			<ParamItem class="item show" :paramData="show_conf" />
			<ParamItem class="item text" :paramData="text_conf" v-if="isTextSource" ref="textContent" />
			<ParamItem class="item url" :paramData="url_conf" v-if="isBrowserSource" ref="textContent" />
			<ToggleBlock small class="helper"
			v-if="(isTextSource || isBrowserSource) && helpers[event]?.length > 0"
			title="Special placeholders dynamically replaced"
			:open="false">
				<ul class="list">
					<li v-for="(h,index) in helpers[event]" :key="h.tag+event+index" @click="insert(h)" data-tooltip="Insert">
						<strong>&#123;{{h.tag}}&#125;</strong>
						{{h.desc}}
					</li>
				</ul>
			</ToggleBlock>
			<ParamItem class="item delay" :paramData="delay_conf" />
			
			<Button type="submit"
				title="Save"
				v-if="isChange"
				class="saveBt"
				:icon="require('@/assets/icons/save.svg')"
				:disabled="!canSubmit"
			/>
		</form>
	</ToggleBlock>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import { OBSSourceAction, ParameterData, ParameterDataListValue } from '@/store';
import { OBSEventActionHelpers } from '@/utils/OBSEventActionHandler';
import OBSWebsocket, { OBSFilter, OBSSourceItem } from '@/utils/OBSWebsocket';
import { watch } from '@vue/runtime-core';
import { Options, Vue } from 'vue-class-component';
import ParamItem from '../../ParamItem.vue';

@Options({
	props:{
		action:Object,
		sources:Object,
		index:Number,
		event:Number,
	},
	components:{
		Button,
		ParamItem,
		ToggleBlock,
	},
	emits:["delete", "update"]
})
export default class OBSEventsActionEntry extends Vue {

	public action!:OBSSourceAction;
	public sources!:OBSSourceItem[];
	public index!:number;
	public event!:number;

	public opened:boolean = false;
	public isMissingObsEntry:boolean = false;

	private filters:OBSFilter[] = [];
	private showHideValues:ParameterDataListValue[] = [
		{label:"Hide", value:false},
		{label:"Show", value:true},
	];
	
	public source_conf:ParameterData = { label:"OBS Source", type:"list", value:"", listValues:[], icon:"list_purple.svg" };
	public filter_conf:ParameterData = { label:"Source filter", type:"list", value:"", listValues:[] };
	public show_conf:ParameterData = { label:"Source visibility", type:"list", value:this.showHideValues[1].value, listValues:this.showHideValues, icon:"show_purple.svg" };
	public delay_conf:ParameterData = { label:"Delay before next step (seconds)", type:"number", value:0, min:0, max:60*10, icon:"timeout_purple.svg" };
	public text_conf:ParameterData = { label:"Text to write on source", type:"text", longText:true, value:"", icon:"timeout_purple.svg" };
	public url_conf:ParameterData = { label:"Browser URL", type:"text", value:"", icon:"url_purple.svg", placeholder:"http://..." };

	public get helpers():{[key:string]:{tag:string, desc:string}[]} { return OBSEventActionHelpers; }

	public get classes():string[] {
		const res = ["OBSEventsActionEntry"];
		if(this.isMissingObsEntry) res.push("missingSource");
		return res;
	}

	/**
	 * Get block's title
	 */
	public get title():string {
		let res = 'Step '+(this.index+1);
		return res+this.subtitle;
	}

	/**
	 * Get block's subtitle
	 */
	public get subtitle():string {
		let res = "";
		const chunks:string[] = [(this.show_conf.value? "show" : "hide")];
		if(this.source_conf.value) {
			let sourceName = this.source_conf.value as string;
			sourceName = sourceName.replace(/</g, "&lt;").replace(/>/g, "&gt;");
			chunks.push(sourceName);
		}
		if(this.filter_conf.value) {
			let filterName = this.filter_conf.value as string;
			filterName = filterName.replace(/</g, "&lt;").replace(/>/g, "&gt;");
			chunks.push(filterName);
		}
		if(chunks.length > 0) {
			res += "<br><span class='subtitle'>";
			res += chunks.join(" -> ");
			res += "</span>";
		}
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
	 * Can submit form ?
	 */
	public get canSubmit():boolean { return this.source_conf.value != ""; }
	
	public get isChange():boolean {
		return this.action.sourceName != this.source_conf.value
		|| this.action.filterName != this.filter_conf.value
		|| this.action.delay != this.delay_conf.value
		|| this.action.text != this.text_conf.value
		|| this.action.url != this.url_conf.value
		|| this.action.show != this.show_conf.value;
	}

	public async mounted():Promise<void> {
		this.opened = this.action.sourceName == "";
		this.source_conf.listValues = this.sources.map(v=> {return {label:v.sourceName, value:v.sourceName}});
		this.source_conf.listValues.unshift({label:"Select...", value:""});
		//TODO remove
		// this.source_conf.value = this.sources.find(v => v.inputKind === 'text_gdiplus_v2')?.sourceName as string;
		

		//Prefill forms
		this.prefillForm();

		watch(()=>this.sources, ()=> { this.prefillForm(); });
		watch(()=>this.source_conf.value, ()=> this.onSourceChanged());
		watch(()=>this.filter_conf.value, ()=> this.updateFilter());
	}

	/**
	 * Called when submitting the form
	 */
	public onSubmit():void {
		this.action.sourceName = this.source_conf.value as string;
		this.action.filterName = this.filter_conf.value as string;
		this.action.delay = this.delay_conf.value as number;
		this.action.text = this.text_conf.value as string;
		this.action.show = this.show_conf.value as boolean;
		this.action.url = this.url_conf.value as string;
		this.$emit("update");
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
		this.isMissingObsEntry = false;
		if(this.action.sourceName != undefined) {
			if(this.sources.findIndex(v=>v.sourceName===this.action.sourceName) > -1) {
				this.source_conf.value = this.action.sourceName;
				const forceFilter = this.action.filterName != undefined;
				await this.onSourceChanged();
				if(forceFilter && this.action.filterName) {
					console.log(this.index, this.action.filterName);
					this.filter_conf.value = this.action.filterName;
					this.updateFilter();
				}else{
					this.filter_conf.value = "";
				}
			}else if(this.action.sourceName != ""){
				this.isMissingObsEntry = true;
			}
		}
		if(this.action.delay != undefined) this.delay_conf.value = this.action.delay;
		if(this.action.text != undefined) this.text_conf.value = this.action.text;
		if(this.action.show != undefined) this.show_conf.value = this.action.show;
		if(this.action.url != undefined) this.url_conf.value = this.action.url;

		//Sets current default values to the action.
		//This allows to hide the "save" button until something is changed
		if(this.action.sourceName == undefined) this.action.sourceName = this.source_conf.value as string;
		if(this.action.filterName == undefined) this.action.filterName = this.filter_conf.value as string;
		if(this.action.delay == undefined) this.action.delay = this.delay_conf.value as number;
		if(this.action.text == undefined) this.action.text = this.text_conf.value as string;
		if(this.action.show == undefined) this.action.show = this.show_conf.value as boolean;
		if(this.action.url == undefined) this.action.url = this.url_conf.value as string;
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
		}else{
			this.show_conf.label = "Source visibility";
		}
	}

}
</script>

<style scoped lang="less">
.OBSEventsActionEntry{
	:deep(.subtitle) {
		font-size: .7em;
		font-weight: normal;
		vertical-align: middle;
		font-style: italic;
	}

	&.missingSource {
		.source {
			padding: .25em;
			border-radius: .5em;
			border: 2px dashed @mainColor_alert;
			background-color: fade(@mainColor_alert, 35%);
		}
	}

	.item:not(:first-of-type) {
		margin-top: .25em;
	}

	.delay, .show {
		:deep(input){
			width: 90px;
			flex-grow: unset;
			min-width: unset;
		}
	}

	.url {
		:deep(input){
			text-align: left;
			width: auto;
			max-width: unset;
		}
	}

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

	.saveBt {
		display: block;
		margin: auto;
		margin-top: .5em;
	}
}
</style>