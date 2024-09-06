<template>
	<ToggleBlock class="heatdebug" :title="$t('heat.debug_interaction')" :open="false" :icons="['debug']" secondary>
		<div class="content">
			<div>{{ $t("heat.debug.description") }}</div>
			
			<div ref="areaHolder" class="areaHolder">
				<HeatDebugPopout />
			</div>
		</div>
	</ToggleBlock>
</template>

<script lang="ts">
import ToggleBlock from '@/components/ToggleBlock.vue';
import HeatDebugPopout from '@/views/HeatDebugPopout.vue';
import {toNative,  Component, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		ToggleBlock,
		HeatDebugPopout,
	},
	emits:[],
})
class HeatDebug extends Vue {

}
export default toNative(HeatDebug);
</script>

<style scoped lang="less">
.heatdebug{
	width: 100%;

	.content {
		gap: .5em;
		display: flex;
		flex-direction: column;

		.areaHolder {
			overflow: hidden;
			position: relative;
			user-select: none;
			border-radius: var(--border-radius);
			background-repeat: no-repeat;
			width: 100%;
			aspect-ratio: 16/9;
		}
	}
}
</style>