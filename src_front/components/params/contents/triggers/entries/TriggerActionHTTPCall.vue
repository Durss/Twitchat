<template>
	<div class="triggeractionhttpcall">
		<div class="row item">
			<ParamItem noBackground class="item" :paramData="param_url" v-model="action.url" :error="securityError" />
			<p class="item securityError" v-if="securityError">{{ $t("triggers.actions.http_ws.protocol_error") }}</p>
		</div>
		
		<ParamItem class="row item" :paramData="param_method" v-model="action.method" />

		<div class="row item">
			<p class="item" v-if="parameters.length > 0">{{ $t("triggers.actions.http_ws.select_param") }}</p>
			
			<div class="params">
				<template v-for="p in parameters" :key="p.tag" >
					<div class="tag"><mark>{{ p.placeholder.tag }}</mark></div>
					<span>{{ $t(p.placeholder.descKey) }}</span>
					<ToggleButton v-model="p.enabled" @change="onToggleParam()" />
				</template>
			</div>
		</div>

		<ParamItem class="item" :paramData="param_outputPlaceholder" v-model="action.outputPlaceholder" />

		<i18n-t scope="global" class="example item" tag="div"
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
	public param_outputPlaceholder:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", labelKey:"triggers.actions.http_ws.output_placeholder", maxLength:20};

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
	.triggerActionForm();

	.argument {
		padding-left: 1em;
	}

	.securityError {
		color: var(--mainColor_light);
		background-color: var(--mainColor_alert);
		margin-top: -.25em;
		padding: .5em;
		border-bottom-left-radius: var(--border-radius);
		border-bottom-right-radius: var(--border-radius);
	}

	.params {
		display: grid;
		grid-template-columns: 1fr auto 40px;
		align-items: center;
		gap: .5em;
		.tag {
			text-align: right;
		}
		&>* {
			cursor: pointer;
		}
	}
}
</style>