<template>
	<div class="toastmessagecopy">
		<div class="head" v-if="contentProps.title">
			<Icon v-if="contentProps.icon" :name="contentProps.icon" class="icon" />
			<span class="title">{{ contentProps.title }}</span>
		</div>
		<div class="message">{{ contentProps.message }}</div>
		<div class="ctas">
			<TTButton small primary icon="copy" :copy="copyValue" @click.stop>{{
				contentProps.copyLabel || t("global.toasters.message_copy.copy")
			}}</TTButton>
		</div>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import TTButton from "@/components/TTButton.vue";
import StoreProxy from "@/store/StoreProxy";
import { computed } from "vue";
import type { ToastContentProps } from "vue3-toastify";

const { contentProps } = defineProps<
	ToastContentProps & {
		contentProps: {
			/**
			 * Message displayed on the toaster
			 */
			message: string;
			/**
			 * Value pushed to the clipboard. Defaults to "message"
			 */
			copy?: string;
			/**
			 * Optional title displayed above the message
			 */
			title?: string;
			/**
			 * Optional icon displayed before the title
			 */
			icon?: string;
			/**
			 * Optional label of the copy button
			 */
			copyLabel?: string;
		};
	}
>();

const t = (key: string): string => StoreProxy.i18n.t(key);

const copyValue = computed<string>(() => contentProps.copy || contentProps.message);
</script>

<style scoped lang="less">
.toastmessagecopy {
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
		max-height: 8em;
		overflow: auto;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	.ctas {
		gap: 0.5em;
		display: flex;
		flex-direction: row;
		justify-content: center;
	}
}
</style>
