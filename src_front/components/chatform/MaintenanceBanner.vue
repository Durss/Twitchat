<template>
	<div class="maintenancebanner">
		<Icon name="alert" />
		<div class="content">
			<p
				v-if="remaining > 0"
				v-html="t('maintenance.banner', { TIME: lockTime, DURATION: remainingFormatted })"
			/>
			<p v-else-if="storeAuth.isAdmin">{{ t("maintenance.banner_admin") }}</p>
			<p v-else>{{ t("maintenance.banner_now") }}</p>
			<p class="message" v-if="message">{{ message }}</p>
		</div>
	</div>
</template>

<script setup lang="ts">
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeMain as useStoreMain } from "@/store/storeMain";
import Utils from "@/utils/Utils";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import Icon from "../Icon.vue";

const { t, locale } = useI18n();
const storeMain = useStoreMain();
const storeAuth = useStoreAuth();

const now = ref(Date.now());
let refreshInterval = -1;

const remaining = computed((): number => {
	if (!storeMain.maintenance) return 0;
	return Math.max(0, storeMain.maintenance.lockAt - now.value);
});

const remainingFormatted = computed((): string => {
	return Utils.formatDuration(remaining.value, true);
});

/**
 * maintenance message
 */
const message = computed((): string => {
	const texts = storeMain.maintenance?.message;
	if (!texts) return "";
	return texts[locale.value] || texts["en"] || "";
});

const lockTime = computed((): string => {
	if (!storeMain.maintenance) return "";
	return Utils.formatDate(new Date(storeMain.maintenance.lockAt), true, true);
});

onMounted(() => {
	refreshInterval = window.setInterval(() => {
		now.value = Date.now();
	}, 1000);
});

onBeforeUnmount(() => {
	window.clearInterval(refreshInterval);
});
</script>

<style scoped lang="less">
.maintenancebanner {
	gap: 0.5em;
	top: 0.5em;
	left: 50%;
	z-index: 100;
	display: flex;
	position: fixed;
	align-items: center;
	flex-direction: row;
	max-width: calc(100% - 1em);
	width: max-content;
	padding: 0.5em 1em;
	border-radius: var(--border-radius);
	transform: translateX(-50%);
	color: var(--color-light);
	background-color: var(--color-alert);
	box-shadow: 0 0 0.5em rgba(0, 0, 0, 0.5);
	pointer-events: none;

	.icon {
		height: 1.5em;
		flex-shrink: 0;
	}

	.content {
		gap: 0.25em;
		display: flex;
		flex-direction: column;
		line-height: 1.25em;
		white-space: pre-line;
		.message {
			font-style: italic;
			white-space: pre-line;
		}
	}
}
</style>
