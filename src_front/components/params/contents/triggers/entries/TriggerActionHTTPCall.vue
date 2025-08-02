<template>
	<div class="triggeractionhttpcall triggerActionForm">
		<ParamItem :paramData="param_url" v-model="action.url"
			:error="securityError"
			:errorMessage="$t('triggers.actions.http_ws.protocol_error')" />

		<ParamItem class="row item" :paramData="param_method" v-model="action.method">
			<ParamItem class="row child item" :paramData="param_sendAsBody" v-model="action.sendAsBody" v-if="action.method == 'POST' || action.method == 'PATCH'" noBackground />
			<ParamItem class="row child item" :paramData="param_custom_body" v-model="action.customBody" v-if="action.method == 'POST' || action.method == 'PATCH'" noBackground />
		</ParamItem>

		<ParamItem class="row item" :paramData="param_customHeaders" v-model="action.customHeaders">
			<div class="headerList">
				<div class="header head" v-if="action.headers && action.headers.length > 0">
					<div>Key</div>
					<div>Value</div>
				</div>
				<div v-for="(a, index) in action.headers" class="header">
					<input type="text" v-model="action.headers![index].key">
					<ParamItem :paramData="getParamHeaderValue(index)" placeholdersAsPopout v-model="action.headers![index].value" noBackground />
					<TTButton class="deleteBt" icon="trash" @click="delHeader(index)" alert />
				</div>
				<TTButton class="addBt" icon="add" v-if="(action.headers || []).length < 20" @click="addHeader()">{{ $t("triggers.actions.http_ws.add_headerBt") }}</TTButton>
			</div>
		</ParamItem>

		<div class="card-item tags">
			<p class="title" v-if="parameters.length > 0">{{ $t("triggers.actions.http_ws.select_param") }}</p>

			<div class="searchContainer" v-if="parameters.length > 8">
				<input class="searchField" type="text" v-model="searchText" autocomplete="off" :placeholder="$t('global.search_placeholder')" @keydown.capture="onSearchKeydown" />
				<TTButton class="clearButton" transparent icon="cross" @click="searchText = ''" v-if="searchText.length > 0"></TTButton>
			</div>
			
			<div class="params">
				<ParamItem class="toggleAll" noBackground :paramData="param_toggleAll" v-model="param_toggleAll.value" @click.native="toggleAll()" v-if="parameters.length > 3" />

				<div class="card-item" v-for="p in filteredParameters" :key="p.placeholder.tag" @click="p.enabled = !p.enabled; onToggleParam()">
					<div class="taginfo">
						<div class="tag"><mark>{{ p.placeholder.tag }}</mark></div>
						<span>{{ $t(p.placeholder.descKey, p.placeholder.descReplacedValues || {}) }}</span>
					</div>
					<ToggleButton v-model="p.enabled" @change="onToggleParam()" />
				</div>
			</div>
		</div>

		<ParamItem :paramData="param_outputPlaceholder" v-model="action.outputPlaceholder" />
		
		<i18n-t scope="global" class="card-item info" tag="div"
		keypath="triggers.actions.common.custom_placeholder_example"
		v-if="action.outputPlaceholder && action.outputPlaceholder.length > 0">
			<template #PLACEHOLDER>
				<mark v-click2Select>{{"{" + action.outputPlaceholder + "}"}}</mark>
			</template>
		</i18n-t>
	</div>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import Icon from '@/components/Icon.vue';
import ToggleButton from '@/components/ToggleButton.vue';
import ParamItem from '@/components/params/ParamItem.vue';
import type { ITriggerPlaceholder, TriggerActionHTTPCallData, TriggerActionHTTPCallDataAction, TriggerData } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { watch } from 'vue';
import { Component, Prop, toNative } from 'vue-facing-decorator';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry';
import ClearButton from '@/components/ClearButton.vue';

@Component({
	components:{
		TTButton,
		Icon,
		ParamItem,
		ToggleButton,
	},
	emits:["update"]
})
class TriggerActionHTTPCall extends AbstractTriggerActionEntry {

	@Prop
	declare action:TriggerActionHTTPCallData;

	@Prop
	declare triggerData:TriggerData;

	public securityError:boolean = false;
	public searchText:string = "";
	public placeholderList:ITriggerPlaceholder<any>[] = [];
	public parameters:{placeholder:ITriggerPlaceholder<any>, enabled:boolean}[] = [];
	public param_url:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", placeholder:"https://...", labelKey:"triggers.actions.http_ws.url"};
	public param_method:TwitchatDataTypes.ParameterData<TriggerActionHTTPCallDataAction, TriggerActionHTTPCallDataAction> = {type:"list", value:"GET", listValues:[], labelKey:"triggers.actions.http_ws.method"};
	public param_outputPlaceholder:TwitchatDataTypes.ParameterData<string> = {type:"placeholder", value:"", labelKey:"triggers.actions.http_ws.output_placeholder", maxLength:30};
	public param_custom_body:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", longText:true, labelKey:"triggers.actions.http_ws.custom_body", placeholderKey:"triggers.actions.http_ws.custom_body_placeholder", maxLength:5000};
	public param_toggleAll:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"chat.filters.select_all" };
	public param_sendAsBody:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:true, labelKey:"triggers.actions.http_ws.send_as_body" };
	public param_customHeaders:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"triggers.actions.http_ws.custom_headers" };
	public param_headerValues:TwitchatDataTypes.ParameterData<string>[] = [];

	public get filteredParameters():{placeholder:ITriggerPlaceholder<any>, enabled:boolean}[] {
		if(!this.searchText.trim()) return this.parameters;
		
		const searchTerm = this.searchText.toLowerCase().trim();
		return this.parameters.filter(p => {
			const tag = p.placeholder.tag.toLowerCase();
			const description = this.$t(p.placeholder.descKey, p.placeholder.descReplacedValues || {}).toLowerCase();
			return tag.includes(searchTerm) || description.includes(searchTerm);
		});
	}

	public getParamHeaderValue(index:number):TwitchatDataTypes.ParameterData<string> {
		if(this.param_headerValues.length>index) return this.param_headerValues[index];
		const param:TwitchatDataTypes.ParameterData<string> = {type:'string', value:"", placeholderList:this.placeholderList};
		this.param_headerValues[index] = param;
		return param;
	}

	public beforeMount():void {
		if(!this.action.outputPlaceholder) this.action.outputPlaceholder = "";
		this.param_method.listValues	= (["GET","PUT","POST","PATCH","DELETE"] as TriggerActionHTTPCallDataAction[]).map(v=> {return {value:v, label:v}});

		watch(()=>this.action.url, ()=> {
			const url = this.action.url;
			this.securityError = url.indexOf("https://") == -1
							  && url.indexOf("http://localhost") == -1
							  && url.indexOf("http://127.0.0.1") == -1;
		});

		this.onToggleParam();
	}

	public onToggleParam():void {
		const params:string[] = this.parameters.filter(v=>v.enabled).map(v=> v.placeholder.tag);
		this.action.queryParams = params;

		let allSelected = true;
		// Check if all visible (filtered) parameters are selected
		const visibleParams = this.filteredParameters;
		visibleParams.forEach(v=> allSelected &&= v.enabled);
		this.param_toggleAll.value = allSelected && visibleParams.length > 0;
	}

	/**
	 * Called when clicking "all" toggle
	 */
	public toggleAll():void {
		//Leave it time for the model value to update.
		//Not usign @change because the value is changed on onToggleParam() based
		//on currently enabled parameters which would conflict with this handler
		//if it was using @change.
		window.setTimeout(() => {
			// Only toggle visible (filtered) parameters
			const visibleParams = this.filteredParameters;
			visibleParams.forEach(v=> v.enabled = this.param_toggleAll.value);
			this.onToggleParam();
		}, 0);
	}

	/**
	 * Called when a key is pressed in the search field
	 */
	public onSearchKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			this.searchText = '';
			event.preventDefault();
			event.stopPropagation();
		}
	}

	/**
	 * Called when the available placeholder list is updated
	 */
	public onPlaceholderUpdate(list:ITriggerPlaceholder<any>[]):void {
		this.placeholderList = list;
		this.parameters = list.map(v=> {
			return  {
				placeholder:v,
				enabled:!this.action.queryParams || this.action.queryParams.includes(v.tag),
			}
		});

		this.param_url.placeholderList = list;
		this.param_custom_body.placeholderList = list;
	}

	/**
	 * Called when "add header" button is clicked
	 */
	public addHeader():void {
		if(!this.action.headers) this.action.headers = [];
		this.action.headers.push({
			key:"",
			value:"",
		});
	}

	/**
	 * Called when "delete header" button is clicked
	 */
	public delHeader(index:number):void {
		this.action.headers?.splice(index, 1);
	}

}
export default toNative(TriggerActionHTTPCall);
</script>

<style scoped lang="less">
.triggeractionhttpcall{

	.tags {
		.title {
			margin-bottom: .5em;
		}
		
		.searchContainer {
			position: relative;
			margin-bottom: .5em;
			
			.searchField {
				width: 100%;
				padding: .5em;
			}
			
			.clearButton {
				position: absolute;
				right: .5em;
				top: 50%;
				transform: translateY(-50%);
			}
		}
	}

	.params {
		gap: 2px;
		display: flex;
		flex-direction: column;
		font-size: .8em;
		max-height: 375px;
		overflow-y: auto;
		.card-item {
			display: flex;
			flex-direction: row;
			align-items: center;
			cursor: pointer;
			flex-shrink: 0;
			&:hover {
				background-color: var(--color-light-fade);
			}
			.taginfo {
				gap: .5em;
				flex-grow: 1;
				display: flex;
				flex-direction: column;

				.tag {
					word-break: break-all;
				}
			}
		}
		.toggleAll {
			justify-self: flex-end;
			align-self: flex-end;
			margin-bottom: 2px;
			width: fit-content;
			margin-right: .5em;
			margin-bottom: .5em;
		}
	}
	.headerList {
		gap: .5em;
		display: flex;
		flex-direction: column;
		margin-top: .5em;
		.header {
			gap: .5em;
			display: flex;
			flex-direction: row;
			flex: 1;
			&.head {
				gap: 0;
				width: calc(100% - 1.6em);
				justify-content: space-around;
				div {
					background-color: var(--grayout);
					padding: .25em;
					text-align: center;
					&:first-child{
						margin-right: 1px;
						border-top-left-radius: var(--border-radius);
						border-bottom-left-radius: var(--border-radius);
					}
					&:last-child{
						border-top-right-radius: var(--border-radius);
						border-bottom-right-radius: var(--border-radius);
					}
				}
			}
			*:not(.button) {
				flex-grow: 1;
			}
			.deleteBt {
				flex-shrink: 0;
			}
		}
		.addBt {
			align-self: center;
		}
	}
}
</style>
