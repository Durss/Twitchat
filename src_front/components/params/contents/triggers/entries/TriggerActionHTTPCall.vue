<template>
	<div class="triggeractionhttpcall triggerActionForm">
		<ParamItem :paramData="param_url" v-model="action.url"
			:error="securityError"
			:errorMessage="$t('triggers.actions.http_ws.protocol_error')" />
		
		<ParamItem class="row item" :paramData="param_method" v-model="action.method" />

		<div class="card-item tags">
			<p class="title" v-if="parameters.length > 0">{{ $t("triggers.actions.http_ws.select_param") }}</p>
			
			<div class="params">
				<div class="card-item" v-for="p in parameters" :key="p.placeholder.tag" @click="p.enabled = !p.enabled; onToggleParam()">
					<div class="taginfo">
						<div class="tag"><mark>{{ p.placeholder.tag }}</mark></div>
						<span>{{ $t(p.placeholder.descKey) }}</span>
					</div>
					<ToggleButton v-model="p.enabled" @change="onToggleParam()" />
				</div>
			</div>
		</div>

		<ParamItem :paramData="param_outputPlaceholder" v-model="action.outputPlaceholder" />

		<i18n-t scope="global" class="card-item info" tag="div"
		keypath="triggers.actions.common.custom_placeholder_example"
		v-if="param_outputPlaceholder.value.length > 0">
			<template #PLACEHOLDER>
				<mark v-click2Select>{{"{"}}{{param_outputPlaceholder.value.toUpperCase()}}{{"}"}}</mark>
			</template>
		</i18n-t>
	</div>
</template>

<script lang="ts">
import ParamItem from '@/components/params/ParamItem.vue';
import ToggleButton from '@/components/ToggleButton.vue';
import { TriggerEventPlaceholders, type ITriggerPlaceholder, type TriggerActionHTTPCallData, type TriggerData, type TriggerActionHTTPCallDataAction } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { watch } from 'vue';
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		ParamItem,
		ToggleButton,
	},
	emits:["update"]
})
export default class TriggerActionHTTPCall extends Vue {

	@Prop
	public action!:TriggerActionHTTPCallData;
	@Prop
	public triggerData!:TriggerData;

	public securityError:boolean = false;
	public parameters:{placeholder:ITriggerPlaceholder, enabled:boolean}[] = [];
	public param_url:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", placeholder:"https://...", labelKey:"triggers.actions.http_ws.url"};
	public param_method:TwitchatDataTypes.ParameterData<TriggerActionHTTPCallDataAction, TriggerActionHTTPCallDataAction> = {type:"list", value:"GET", listValues:[], labelKey:"triggers.actions.http_ws.method"};
	public param_outputPlaceholder:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", labelKey:"triggers.actions.http_ws.output_placeholder", maxLength:30, allowedCharsRegex:"A-z0-9_"};

	public beforeMount():void {
		this.param_method.listValues	= (["GET","PUT","POST","PATCH","DELETE"] as TriggerActionHTTPCallDataAction[]).map(v=> {return {value:v, label:v}});

		this.parameters = TriggerEventPlaceholders(this.triggerData.type).map(v=> {
			return  {
				placeholder:v,
				enabled:!this.action.queryParams || this.action.queryParams.includes(v.tag),
			}
		});

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
	}

}
</script>

<style scoped lang="less">
.triggeractionhttpcall{

	.tags {
		.title {
			margin-bottom: .5em;
		}
	}

	.params {
		gap: 2px;
		display: flex;
		flex-direction: column;
		font-size: .8em;
		.card-item {
			display: flex;
			flex-direction: row;
			align-items: center;
			cursor: pointer;
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
	}
}
</style>