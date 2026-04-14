<template>
	<div class="toastremoteapiinfo">
		<div class="head">
			<span class="title">{{ t("global.toasters.remote_api_action.title") }}</span>
		</div>
		<div class="body">
			<ToggleBlock
				@click.stop
				:title="t('global.toasters.remote_api_action.details')"
				:open="false"
				small
				noTitleColor
			>
				<div class="details">
					<div>
						<strong>Action:</strong>
						<pre>{{ props.action }}</pre>
					</div>
					<div v-if="props.data">
						<strong>Body:</strong>
						<pre>{{ props.data }}</pre>
					</div>
				</div>
			</ToggleBlock>
			<TTButton ref="revokeBtn" icon="key" alert @click="revokeApiKey" :loading="deleting" />
		</div>
	</div>
</template>

<script setup lang="ts">
import ToggleBlock from "@/components/ToggleBlock.vue";
import TTButton from "@/components/TTButton.vue";
import type { TwitchatEventMap } from "@/events/TwitchatEvent";
import { storeAPI as useStoreApi } from "@/store/api/storeAPI";
import StoreProxy from "@/store/StoreProxy";
import { ref } from "vue";
import { useTippy } from "vue-tippy";
import { toast } from "./toast";

const storeAPI = useStoreApi();
const deleting = ref(false);
const revokeBtn = ref<InstanceType<typeof TTButton>>();
const t = (key: string) => StoreProxy.i18n.t(key);

useTippy(revokeBtn, { content: t("global.toasters.remote_api_action.revoke_key") });
const { contentProps: props } = defineProps<{
	contentProps: { action: keyof TwitchatEventMap; data: unknown };
}>();

async function revokeApiKey() {
	deleting.value = true;
	const success = await storeAPI.deleteKey();
	deleting.value = false;
	if (success) {
		toast(t("api.revoke_success"), { type: "success" });
	} else {
		toast(t("api.revoke_error"), { type: "error" });
	}
}
</script>

<style scoped lang="less">
.toastremoteapiinfo {
	.head,
	.body {
		display: flex;
		align-items: center;
		gap: 0.5em;
		.title,
		.toggleblock {
			flex: 1;
		}
	}
	.toggleblock.small {
		font-style: italic;
		transition: border-left-width 0.1s ease;
		&.closed {
			border-left-width: 0px;
		}
		:deep(.titleText) {
			font-weight: normal;
		}
		:deep(.content) {
			font-size: 0.8em;
			padding-top: 0;
		}

		.details {
			gap: 1em;
			display: flex;
			flex-direction: column;
		}
	}
}
</style>
