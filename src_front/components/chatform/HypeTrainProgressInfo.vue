<template>
	<span class="hypetrainprogressinfo" v-if="train">
		<span class="percent">{{
			t("train.short_progress", {
				LEVEL: train.level,
				PERCENT: percent,
			})
		}}</span>
		<span class="time" v-if="remaining_ms > 0">{{
			Utils.formatDuration(remaining_ms, true)
		}}</span>
	</span>
</template>

<script setup lang="ts">
import { storeStream as useStoreStream } from "@/store/stream/storeStream";
import Utils from "@/utils/Utils";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const storeStream = useStoreStream();

const now = ref(Date.now());

let interval: number = -1;

const train = computed(() => storeStream.hypeTrain);

const percent = computed((): number => {
	if (!train.value?.goal) return 0;
	return Math.max(
		0,
		Math.min(100, Math.floor((train.value.currentValue / train.value.goal) * 100)),
	);
});

const remaining_ms = computed((): number => {
	if (!train.value) return 0;
	return Math.max(0, train.value.ends_at - now.value);
});

onMounted(() => {
	interval = window.setInterval(() => (now.value = Date.now()), 1000);
});

onBeforeUnmount(() => {
	clearInterval(interval);
});
</script>

<style scoped lang="less">
.hypetrainprogressinfo {
	display: flex;
	flex-direction: column;
	align-items: center;
	line-height: 1;
	white-space: nowrap;
	font-family: var(--font-roboto);
	font-variant-numeric: tabular-nums;
	opacity: 0.8;
	font-size: 0.85em;
	margin-left: 2px;

	.percent {
		padding-bottom: 2px;
	}

	.time {
		padding-top: 2px;
		border-top: 1px solid currentColor;
	}
}
</style>
