<template>
	<ToggleBlock
		class="heatdebug"
		:title="t('heat.debug_interaction')"
		:open="false"
		:primary="props.primary"
		:secondary="props.secondary"
		:light="props.light"
		:icons="['debug']"
	>
		<div class="content">
			<div class="description" v-if="storeExtension.companionEnabled">
				{{ t("heat.debug.description_companion") }}
			</div>
			<div class="description" v-else>{{ t("heat.debug.description") }}</div>

			<div ref="areaHolder" class="areaHolder">
				<HeatDebugPopout />
			</div>
		</div>
	</ToggleBlock>
</template>

<script setup lang="ts">
import ToggleBlock from "@/components/ToggleBlock.vue";
import { storeExtension as useStoreExtension } from "@/store/extension/storeExtension";
import HeatDebugPopout from "@/views/HeatDebugPopout.vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const props = defineProps<{ primary?: boolean; secondary?: boolean; light?: boolean }>();
const storeExtension = useStoreExtension();
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

		.description {
			line-height: 1.1em;
			font-size: 0.9em;
			text-align: center;
			font-style: italic;
			opacity: 0.7;
		}
	}
}
</style>
