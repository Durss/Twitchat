<template>
	<div class="toastbingogridshare">
		<div class="head">
			<Icon name="bingo_grid" class="icon" />
			<span class="title">{{ t("bingo_grid.share_streamer.invite.title") }}</span>
		</div>
		<div class="message">{{ message }}</div>
		<div class="ctas">
			<TTButton small primary icon="checkmark" :loading="accepting" @click="accept">{{
				t("bingo_grid.share_streamer.invite.accept")
			}}</TTButton>
			<TTButton small alert icon="cross" @click="decline">{{
				t("bingo_grid.share_streamer.invite.decline")
			}}</TTButton>
		</div>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import TTButton from "@/components/TTButton.vue";
import { storeBingoGrid as useStoreBingoGrid } from "@/store/bingo_grid/storeBingoGrid";
import StoreProxy from "@/store/StoreProxy";
import { computed, ref } from "vue";

const props = defineProps<{
	contentProps: { token: string; ownerName: string; gridTitle: string };
	closeToast?: () => void;
}>();

const storeBingoGrid = useStoreBingoGrid();
const accepting = ref(false);

const t = (key: string, values?: Record<string, unknown>): string =>
	StoreProxy.i18n.t(key, values || {});

const message = computed<string>(() =>
	t("bingo_grid.share_streamer.invite.message", {
		OWNER: props.contentProps.ownerName,
		GRID: props.contentProps.gridTitle,
	}),
);

async function accept(): Promise<void> {
	accepting.value = true;
	await storeBingoGrid.acceptSharedGrid(props.contentProps.token);
	accepting.value = false;
	props.closeToast?.();
}

function decline(): void {
	props.closeToast?.();
}
</script>

<style scoped lang="less">
.toastbingogridshare {
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

	.ctas {
		gap: 0.5em;
		display: flex;
		flex-direction: row;
		justify-content: center;
	}
}
</style>
