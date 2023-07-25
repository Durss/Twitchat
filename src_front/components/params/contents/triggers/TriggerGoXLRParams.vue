<template>
	<div class="triggergoxlrparams">
		<div class="title"><Icon name="click" />{{ $t("goxlr.trigger.select_button") }}</div>
		<GoXLRUI v-model="triggerData.goxlrButtons" />
	</div>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import GoXLRUI from '@/components/goxlr/GoXLRUI.vue';
import type { TriggerData } from '@/types/TriggerActionDataTypes';
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		Icon,
		GoXLRUI,
	},
	emits:[],
})
export default class TriggerGoXLRParams extends Vue {

	@Prop
	public triggerData!:TriggerData;

	public mounted():void {
		if(!this.triggerData.goxlrButtons) {
			this.triggerData.goxlrButtons = [];
		}
	}

}
</script>

<style scoped lang="less">
.triggergoxlrparams{
	.title {
		margin-bottom: .5em;
		.icon {
			width: 1em;
			height: 1em;
			margin-right: 0.5em;
		}
	}
}
</style>