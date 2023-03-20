<template>
	<div class="triggeractionhttpcall">
		<div class="row item">
			<ParamItem class="item" :paramData="param_url" v-model="action.url" :error="securityError" />
			<p class="item securityError" v-if="securityError">{{ $t("triggers.actions.http_ws.protocol_error") }}</p>
		</div>
		<ParamItem class="row item" :paramData="param_method" v-model="action.method" />
		<div class="row">
			<p class="item" v-if="param_options.length > 0">{{ $t("triggers.actions.http_ws.select_param") }}</p>
			<ParamItem class="item argument" v-for="p in param_options" :paramData="p" :key="(p.storage as any).tag" @change="onToggleParam()" />
		</div>
		<div class="row item">
			<ParamItem class="item" :paramData="param_outputPlaceholder" v-model="action.outputPlaceholder" />
		</div>

		<i18n-t scope="global" class="example item" tag="div"
		keypath="triggers.actions.common.custom_placeholder_example"
		v-if="(param_outputPlaceholder.value as string).length > 0">
			<template #PLACEHOLDER>
				<mark v-click2Select>{{"{"}}{{(param_outputPlaceholder.value as string).toUpperCase()}}{{"}"}}</mark>
			</template>
		</i18n-t>
	</div>
</template>

<script lang="ts">
import ParamItem from '@/components/params/ParamItem.vue';
import { TriggerEventPlaceholders, type ITriggerPlaceholder, type TriggerActionHTTPCallData, type TriggerEventTypes } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { watch } from 'vue';
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		ParamItem,
	},
	emits:["update"]
})
export default class TriggerActionHTTPCall extends Vue {

	@Prop
	public action!:TriggerActionHTTPCallData;
	@Prop
	public event!:TriggerEventTypes;
	@Prop
	public triggerKey!:string;

	public securityError:boolean = false;
	public param_url:TwitchatDataTypes.ParameterData = {type:"string", value:"", placeholder:"https://...", labelKey:"triggers.actions.http_ws.url"};
	public param_method:TwitchatDataTypes.ParameterData = {type:"list", value:"GET", listValues:[], labelKey:"triggers.actions.http_ws.method"};
	public param_outputPlaceholder:TwitchatDataTypes.ParameterData = {type:"string", value:"", labelKey:"triggers.actions.http_ws.output_placeholder", maxLength:20};
	public param_options:TwitchatDataTypes.ParameterData[] = [];

	public beforeMount():void {
		this.param_method.listValues	= ["GET","PUT","POST","PATCH","DELETE"]
		.map(v=>{return {label:v, value:v}})

		const placeholders = TriggerEventPlaceholders(this.event.value);
		for (let i = 0; i < placeholders.length; i++) {
			const p = placeholders[i];
			this.param_options.push({
				label:"<mark>"+p.tag.toLowerCase()+"</mark> - ",
				labelKey:p.descKey,
				value:!this.action.queryParams || this.action.queryParams.includes(p.tag),
				type:"boolean",
				storage:p
			})
		}

		watch(()=>this.action.url, ()=> {
			const url = this.action.url;
			this.securityError = url.indexOf("https://") == -1
							  && url.indexOf("http://localhost") == -1
							  && url.indexOf("http://127.0.0.1") == -1;
		});

		this.onToggleParam();
	}

	public onToggleParam():void {
		const params:string[] = [];
		for (let i = 0; i < this.param_options.length; i++) {
			const opt = this.param_options[i];
			if(opt.value === true) {
				const data = opt.storage as ITriggerPlaceholder
				params.push(data.tag);
			}
		}
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
		color: @mainColor_light;
		background-color: @mainColor_alert;
		margin-top: -.25em;
		padding: .5em;
		border-bottom-left-radius: @border_radius;
		border-bottom-right-radius: @border_radius;
	}
}
</style>