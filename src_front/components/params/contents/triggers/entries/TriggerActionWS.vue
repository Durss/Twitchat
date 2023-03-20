<template>
	<div class="triggeractionws">
		<div class="row item">
			<p class="item" v-if="param_options.length > 0">{{ $t("triggers.actions.http_ws.select_param") }}</p>
			<ParamItem class="item argument" :paramData="param_topic" v-model="action.topic" />
			<ParamItem class="item argument" v-for="p in param_options" :paramData="p" :key="(p.storage as any).tag" @change="onToggleParam()" />
		</div>
	</div>
</template>

<script lang="ts">
import ParamItem from '@/components/params/ParamItem.vue';
import { TriggerEventPlaceholders, type ITriggerPlaceholder, type TriggerActionWSData, type TriggerEventTypes } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		ParamItem,
	},
	emits:["update"]
})
export default class TriggerActionWS extends Vue {

	@Prop
	public action!:TriggerActionWSData;
	@Prop
	public event!:TriggerEventTypes;
	@Prop
	public triggerKey!:string;

	public securityError:boolean = false;
	public param_options:TwitchatDataTypes.ParameterData[] = [];
	public param_topic:TwitchatDataTypes.ParameterData = { label:"<mark>topic</mark>", type:"string", value:"", placeholderKey:"triggers.actions.http_ws.topic_placeholder", maxLength:255 };

	public beforeMount():void {

		const placeholders = TriggerEventPlaceholders(this.event.value);
		for (let i = 0; i < placeholders.length; i++) {
			const p = placeholders[i];
			this.param_options.push({
				label:"<mark>"+p.tag.toLowerCase()+"</mark> - ",
				labelKey:p.descKey,
				value:!this.action.params || this.action.params.includes(p.tag),
				type:"boolean",
				storage:p
			})
		}

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
		this.action.params = params;
	}

}
</script>

<style scoped lang="less">
.triggeractionws{
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