<template>
	<div class="toastperfreport">
		<div class="head">
			<Icon name="timer" class="icon" />
			<span class="title">{{ t("perf_report.title") }}</span>
		</div>
		<div class="message">{{ t("perf_report.message") }}</div>
		<div class="details">{{ t("perf_report.details") }}</div>
		<div class="ctas">
			<TTButton small primary icon="checkmark" @click="send">{{
				t("perf_report.sendBt")
			}}</TTButton>
			<TTButton small alert icon="cross" @click="ignore">{{
				t("perf_report.ignoreBt")
			}}</TTButton>
		</div>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import TTButton from "@/components/TTButton.vue";
import StoreProxy from "@/store/StoreProxy";
import type { ToastContentProps } from "vue3-toastify";

const props = defineProps<
	ToastContentProps & {
		contentProps: { onSend: () => void };
	}
>();

const t = (key: string, values?: Record<string, unknown>): string =>
	StoreProxy.i18n.t(key, values || {});

function send(): void {
	props.contentProps.onSend();
	props.closeToast?.();
}

function ignore(): void {
	props.closeToast?.();
}
</script>

<style scoped lang="less">
.toastperfreport {
	gap: 0.5em;
	display: flex;
	flex-direction: column;

	.head {
		gap: 0.5em;
		display: flex;
		flex-direction: row;
		align-items: center;
		.icon {
			height: 1.25em;
		}
		.title {
			font-weight: bold;
		}
	}

	.message {
		font-size: 0.9em;
	}

	.details {
		font-size: 0.8em;
		font-style: italic;
	}

	.ctas {
		gap: 0.5em;
		display: flex;
		flex-direction: row;
		justify-content: center;
	}
}
</style>
