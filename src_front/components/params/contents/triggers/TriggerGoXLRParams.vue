<template>
	<div class="triggergoxlrparams">
		<GoXLRUI />
	</div>
</template>

<script lang="ts">
import GoXLRUI from '@/components/goxlr/GoXLRUI.vue';
import type { TriggerData } from '@/types/TriggerActionDataTypes';
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		GoXLRUI,
	},
	emits:[],
})
export default class TriggerGoXLRParams extends Vue {

	@Prop
	public triggerData!:TriggerData;

}
</script>

<style scoped lang="less">
.triggergoxlrparams{
	
}
</style>