<template>
	<div class="triggeractionvibratephoneentry triggerActionForm">
		<div>{{ $t("triggers.actions.vibrate.info") }}</div>
		<ParamItem :paramData="param_url" v-model="action.pattern" @change="onChange()" />
	</div>
</template>

<script lang="ts">
import ParamItem from '@/components/params/ParamItem.vue';
import type { TriggerActionVibrateData, TriggerData } from '@/types/TriggerActionDataTypes';
import { VIBRATION_PATTERNS } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		ParamItem,
	},
	emits:[],
})
export default class TriggerActionVibratePhoneEntry extends Vue {

	@Prop
	public action!:TriggerActionVibrateData;
	@Prop
	public triggerData!:TriggerData;

	public param_url:TwitchatDataTypes.ParameterData<string> =
			{
				type:"list",
				icon:"vibrate",
				value:"6",
				placeholderKey:"global.select_placeholder",
				labelKey:"triggers.actions.vibrate.pattern",
				listValues:[]
			};

	public beforeMount():void {
		this.param_url.listValues = VIBRATION_PATTERNS.map(v => {
			return {value:v.id, label:v.label}
		})
		if(!this.action.pattern) this.action.pattern = this.param_url.value;
		else this.param_url.value = this.action.pattern;
	}

	/**
	 * Execute pattern on change
	 */
	public onChange():void {
		window.navigator.vibrate(VIBRATION_PATTERNS.find(v=>v.id == this.action.pattern)?.pattern || []);
	}
		
}
</script>

<style scoped lang="less">
.triggeractionvibratephoneentryentry{
	
}
</style>