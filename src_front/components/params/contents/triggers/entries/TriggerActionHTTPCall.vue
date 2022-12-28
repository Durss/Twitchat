<template>
	<div class="triggeractionhttpcall">
		<ParamItem class="item" :paramData="param_url" v-model="action.url" :error="securityError" />
		<p class="item securityError" v-if="securityError" v-t="'triggers.actions.http.protocol_error'"></p>
		<ParamItem class="item" :paramData="param_method" v-model="action.method" />
		<p class="item" v-t="'triggers.actions.http.select_param'"></p>
		<ParamItem class="item argument" v-for="p in param_options" :paramData="p" :key="(p.storage as any).tag" @change="onToggleParam()" />
	</div>
</template>

<script lang="ts">
import ParamItem from '@/components/params/ParamItem.vue';
import { TriggerActionHelpers, type ITriggerActionHelper, type TriggerActionHTTPCallData, type TriggerEventTypes } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { watch } from 'vue';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{
		action:Object,
		event:Object,
		triggerKey:String,
	},
	components:{
		ParamItem,
	},
	emits:["update"]
})
export default class TriggerActionHTTPCall extends Vue {

	public action!:TriggerActionHTTPCallData;
	public event!:TriggerEventTypes;
	public triggerKey!:string;

	public securityError:boolean = false;
	public param_url:TwitchatDataTypes.ParameterData = {type:"text", label:"", value:"", placeholder:"https://..."};
	public param_method:TwitchatDataTypes.ParameterData = {type:"list", label:"", value:"GET", listValues:[]};
	public param_options:TwitchatDataTypes.ParameterData[] = [];

	public beforeMount():void {
		this.param_url.label = this.$t("triggers.actions.http.url");
		this.param_method.label = this.$t("triggers.actions.http.method");
		this.param_method.listValues = ["GET","PUT","POST","PATCH","DELETE"]
		.map(v=>{return {label:v, value:v}})

		const placeholders = TriggerActionHelpers(this.event.value);
		for (let i = 0; i < placeholders.length; i++) {
			const p = placeholders[i];
			this.param_options.push({
				label:"<mark>"+p.tag.toLowerCase()+"</mark> - "+p.desc,
				value:!this.action.queryParams || this.action.queryParams.includes(p.tag),
				type:"toggle",
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
				const data = opt.storage as ITriggerActionHelper
				params.push(data.tag);
			}
		}
		this.action.queryParams = params;
	}

}
</script>

<style scoped lang="less">
.triggeractionhttpcall{

	.argument {
		font-size: .9em;
		padding-left: 1em;
	}

	.item {
		margin-bottom: .25em;
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