<template>
	<div
		class="communityboostinfo"
		v-tooltip="t('global.tooltips.boost')"
		@click="smallMode = !smallMode"
	>
		<div class="col"><Icon name="boost" alt="boost" />{{ roundProgressPercent }}%</div>
		<div class="col count" v-if="!smallMode">
			<p>{{ roundProgressValue }}</p>
			<p>{{ target }}</p>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { gsap } from "gsap/gsap-core";
import { useI18n } from "vue-i18n";
import { storeStream as useStoreStream } from "@/store/stream/storeStream";
import Icon from "../Icon.vue";

const { t } = useI18n();
const storeStream = useStoreStream();

const interpolatedPercent = ref(0);
const interpolatedProgress = ref(0);
const smallMode = ref(false);

const roundProgressPercent = computed(() => Math.floor(interpolatedPercent.value));
const roundProgressValue = computed(() => Math.floor(interpolatedProgress.value));

const progress = computed(() => {
	const communityBoostState = storeStream.communityBoostState;
	if (!communityBoostState) return 0;
	return communityBoostState.progress;
});

const target = computed(() => {
	const communityBoostState = storeStream.communityBoostState;
	if (!communityBoostState) return 0;
	return communityBoostState.goal;
});

const percent = computed(() => {
	if (!storeStream.communityBoostState) return 0;
	return Math.round((progress.value / target.value) * 100);
});

watch(
	() => percent.value,
	() => {
		interpolate();
	},
);

onMounted(() => {
	interpolate();
});

function interpolate(): void {
	gsap.killTweensOf(interpolatedPercent);
	gsap.killTweensOf(interpolatedProgress);
	gsap.to(interpolatedPercent, { duration: 1, value: percent.value, ease: "sine.inOut" });
	gsap.to(interpolatedProgress, { duration: 1, value: progress.value, ease: "sine.inOut" });
}
</script>

<style scoped lang="less">
.communityboostinfo {
	display: flex;
	flex-direction: row;
	align-items: center;
	white-space: nowrap;
	color: var(--color-light);
	margin-left: 5px;
	font-size: 14px;
	padding: 5px;
	border-radius: 5px;
	background-color: darken(#00f0f0, 20%);
	font-family: var(--font-azeret);
	cursor: pointer;

	.icon {
		height: 0.9em;
		margin-right: 2px;
	}

	.count {
		display: flex;
		flex-direction: column;
		font-size: 10px;
		margin-left: 5px;
		align-items: center;
		p:nth-child(2) {
			border-top: 1px solid var(--color-light);
		}
	}
}
</style>
