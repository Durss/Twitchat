<template>
	<div class="triggeractiondelay">
		<ParamItem class="item delay" :paramData="delay_conf" v-if="action.type!==null" v-model="action.delay" />
	</div>
</template>

<script lang="ts">
import ParamItem from '@/components/params/ParamItem.vue';
import type { TriggerActionTypes, TriggerData } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		ParamItem,
	},
	emits:[],
})
export default class TriggerActionDelay extends Vue {

	@Prop
	public action!:TriggerActionTypes;
	@Prop
	public triggerData!:TriggerData;
	
	public delay_conf:TwitchatDataTypes.ParameterData = { type:"number", value:0, min:0, max:60*60*24*30, icon:"timeout_purple.svg", labelKey:"triggers.actions.common.next_delay" };

}
</script>

<style scoped lang="less">
.triggeractiondelay{
	.triggerActionForm();
	:deep(input) {
		flex-grow: unset;
		min-width: unset;
		width: 90px;
		max-width: 90px;
	}
}
</style>