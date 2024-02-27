<template>
	<div class="triggeradapproachparams">
		<ParamItem :paramData="param_delay" noBackground class="delay" v-model="triggerData.adBreakDelay" />
	</div>
</template>

<script lang="ts">
import { AD_APPROACHING_INTERVALS, type TriggerData } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';
import ParamItem from '../../ParamItem.vue';
import Utils from '@/utils/Utils';

@Component({
	components:{
		ParamItem,
	},
	emits:[],
})
 class TriggerAdApproachParams extends Vue {

	@Prop
	public triggerData!:TriggerData;

	public param_delay:TwitchatDataTypes.ParameterData<number> = {type:"list", value:30000, icon:"timer", labelKey: "triggers.actions.adBreak.param_delay"}

	public beforeMount():void {
		this.param_delay.listValues = AD_APPROACHING_INTERVALS.sort((a,b) => a-b).map(v=> {
			return {value:v, label:Utils.formatDuration(v)+"s"}
		})
		if(!this.triggerData.adBreakDelay) {
			this.triggerData.adBreakDelay = this.param_delay.value;
		}
	}

}
export default toNative(TriggerAdApproachParams);
</script>

<style scoped lang="less">
.triggeradapproachparams{
	.delay {
		:deep(select) {
			flex-basis: 100px;
		}
	}
}
</style>