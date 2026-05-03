<template>
	<ToggleBlock
		class="heatdebug"
		:title="t('heat.debug_interaction')"
		:open="false"
		:icons="['debug']"
		secondary
	>
		<div class="content">
			<div>{{ t("heat.debug.description") }}</div>

			<div ref="areaHolder" class="areaHolder">
				<HeatDebugPopout />
			</div>
		</div>
	</ToggleBlock>
</template>

<script setup lang="ts">
import ToggleBlock from "@/components/ToggleBlock.vue";
import HeatDebugPopout from "@/views/HeatDebugPopout.vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>

<style scoped lang="less">
.heatdebug {
	width: 100%;

	.content {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		white-space: pre-line;

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
