<template>
	<div class="timerform sidePanel" ref="rootEl">
		<div class="head">
			<ClearButton @click="close()" />
			<h1><Icon name="timer" class="icon" />{{ t("timers.panel.title") }}</h1>
			<div class="description">{{ t("timers.panel.description") }}</div>
		</div>

		<div class="content">
			<ParamsTimer panelContext />
		</div>
	</div>
</template>

<script setup lang="ts">
import { useSidePanel } from "@/composables/useSidePanel";
import { useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import ClearButton from "../ClearButton.vue";
import ParamsTimer from "../params/contents/ParamsTimer.vue";

const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();
const rootEl = useTemplateRef<HTMLElement>("rootEl");
const { close } = useSidePanel(rootEl, () => emit("close"));
</script>

<style scoped lang="less">
.timerform {
	.demo {
		width: auto;
		align-self: center;
		justify-self: center;
	}
}
</style>
