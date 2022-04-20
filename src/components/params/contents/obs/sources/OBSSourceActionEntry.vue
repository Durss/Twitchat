<template>
	<ToggleBlock :title="title" class="obssourceactionentry">
		<ParamItem class="item" :paramData="source_conf" />
		<ParamItem class="item show" :paramData="show_conf" />
		<ParamItem class="item text" :paramData="text_conf" v-if="isTextSource" ref="textContent" />
		<ToggleBlock small class="helper"
		v-if="helpers[event]?.length > 0"
		title="Special placeholders dynamically replaced"
		:open="false">
			<!-- <div class="head">Special placeholders dynamically replaced</div> -->
			<ul class="list" v-if="isTextSource">
				<li v-for="(h,index) in helpers[event]" :key="h.tag+event+index" @click="insert(h)">
					<strong data-tooltip="Insert">&#123;{{h.tag}}&#125;</strong>
					{{h.desc}}
				</li>
			</ul>
		</ToggleBlock>
		<ParamItem class="item delay" :paramData="delay_conf" />
	</ToggleBlock>
</template>

<script lang="ts">
import ToggleBlock from '@/components/ToggleBlock.vue';
import { OBSSourceAction, ParameterData, ParameterDataListValue } from '@/store';
import OBSWebsocket, { OBSFilter, OBSSceneTriggerTypes, OBSSourceItem } from '@/utils/OBSWebsocket';
import { watch } from '@vue/runtime-core';
import { Options, Vue } from 'vue-class-component';
import ParamItem from '../../../ParamItem.vue';

@Options({
	props:{
		action:Object,
		sources:Object,
		index:Number,
		event:Number,
	},
	components:{
		ParamItem,
		ToggleBlock,
	}
})
export default class OBSSourceActionEntry extends Vue {

	public action!:OBSSourceAction;
	public sources!:OBSSourceItem[];
	public index!:number;
	public event!:number;
	
	private filters:OBSFilter[] = [];
	private showHideValues:ParameterDataListValue[] = [
		{label:"Show", value:1},
		{label:"Hide", value:0},
	];
	
	public source_conf:ParameterData = { label:"OBS Source", type:"list", value:"", listValues:[], icon:"list_purple.svg" };
	public filters_conf:ParameterData = { label:"Source filter", type:"list", value:"", listValues:[] };
	public show_conf:ParameterData = { label:"Source visibility", type:"list", value:this.showHideValues[0].value, listValues:this.showHideValues, icon:"show_purple.svg" };
	public delay_conf:ParameterData = { label:"Delay before next step (seconds)", type:"number", value:0, min:0, max:60*10, icon:"timeout_purple.svg" };
	public text_conf:ParameterData = { label:"Text to write on source", type:"text", longText:true, value:"", icon:"timeout_purple.svg" };

	public helpers:{[key:string]:{tag:string, desc:string}[]} = {};

	public get isTextSource():boolean {
		return this.sources.find(v=> v.sourceName == this.source_conf.value as string)?.inputKind === 'text_gdiplus_v2'
				&& this.show_conf.value === 1;
	}

	public get title():string {
		let res = 'Step '+(this.index+1);
		let sourceName = this.source_conf.value as string;
		sourceName = sourceName.replace(/</g, "&lt;").replace(/>/g, "&gt;");
		if(this.source_conf.value) res += "<br><span class='sourceName'>"+sourceName+"</span>"
		return res;
	}

	public mounted():void {
		this.source_conf.listValues = this.sources.map(v=> {return {label:v.sourceName, value:v.sourceName}});

		//TODO remove
		this.source_conf.value = this.sources.find(v => v.inputKind === 'text_gdiplus_v2')?.sourceName as string;

		this.helpers[OBSSceneTriggerTypes.FIRST_ALL_TIME] = [
			{tag:"USER", desc:"User name"},
			{tag:"MESSAGE", desc:"Message content"},
		];

		this.helpers[OBSSceneTriggerTypes.FIRST_TODAY] = [
			{tag:"USER", desc:"User name"},
			{tag:"MESSAGE", desc:"Message content"},
		];

		this.helpers[OBSSceneTriggerTypes.POLL_RESULT] = [
			{tag:"TITLE", desc:"Poll title"},
			{tag:"WIN", desc:"Winning choice title"},
			{tag:"PERCENT", desc:"Votes percent of the winning choice"},
		];

		this.helpers[OBSSceneTriggerTypes.PREDICTION_RESULT] = [
			{tag:"TITLE", desc:"Prediction title"},
			{tag:"WIN", desc:"Winning choice title"},
		];

		this.helpers[OBSSceneTriggerTypes.BINGO_RESULT] = [
			{tag:"WINNER", desc:"Winner name"},
		];

		this.helpers[OBSSceneTriggerTypes.RAFFLE_RESULT] = [
			{tag:"WINNER", desc:"Winner name"},
		];

		this.helpers[OBSSceneTriggerTypes.CHAT_COMMAND] = [
			{tag:"USER", desc:"User name"},
		];

		watch(()=>this.source_conf.value, ()=>{
			this.onSourceChanged();
		})
		watch(()=>this.filters_conf.value, ()=>{
			this.updateFilter();
		});
	}

	public insert(h:{tag:string, desc:string}):void {
		const tag = "{"+h.tag+"}";
		const holder = this.$refs.textContent as ParamItem;
		const input = (holder.$el as HTMLDivElement).getElementsByTagName("textarea")[0];
		let carretPos = input.selectionStart as number | 0;
		if(!carretPos) carretPos = 0;
		//Insert tag
		input.value = input.value.substring(0, carretPos) + tag + input.value.substring(carretPos);
	}

	private async onSourceChanged():Promise<void> {
		this.filters = await OBSWebsocket.instance.getSourceFilters(this.source_conf.value as string);
		if(this.filters.length > 0) {
			const list = this.filters.map(v => {return {label:v.filterName, value:v.filterIndex}});
			list.unshift({label:"- none -", value:-1})
			this.filters_conf.value = list[0].value;
			this.filters_conf.listValues = list;
			this.source_conf.children = [this.filters_conf];
		}else{
			this.source_conf.children = [];
		}
		this.updateFilter();
	}

	private updateFilter():void {
		if(this.source_conf.children && this.source_conf.children?.length > 0
		&& this.filters_conf.value > -1) {
			this.show_conf.label = "Filter visibility";
		}else{
			this.show_conf.label = "Source visibility";
		}
	}

}
</script>

<style scoped lang="less">
.obssourceactionentry{
	:deep(.sourceName) {
		font-size: .7em;
		font-weight: normal;
		vertical-align: middle;
		font-style: italic;
	}

	.item:not(:first-of-type) {
		margin-top: .25em;
	}
	.delay, .show {
		:deep(input){
			width: 70px;
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
}
</style>