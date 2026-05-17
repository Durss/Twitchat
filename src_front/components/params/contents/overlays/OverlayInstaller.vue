<template>
	<div class="overlayinstaller">
		<template v-if="obsConnected && !showInput && !showSuccess">
			<TTButton
				class="createBt"
				icon="obs"
				primary
				@click="createBrowserSource()"
				v-tooltip="t('overlay.1click_install_tt')"
				:light="props.light != false"
				:disabled="props.disabled"
				>{{ t("overlay.1click_install") }}</TTButton
			>

			<span>{{ t("global.or") }}</span>

			<TTButton
				class="createBt"
				icon="edit"
				@click="showInput = true"
				small
				:light="props.light != false"
				:disabled="props.disabled"
				>{{ t("overlay.manual_installBt") }}</TTButton
			>
		</template>

		<template v-else-if="showSuccess">
			<p
				class="card-item primary existing"
				v-if="isExistingSource"
				@click="isExistingSource = showSuccess = false"
			>
				{{ t("overlay.install_success_exists") }}
			</p>
			<p class="card-item primary success" v-else @click="showSuccess = false">
				<Icon name="checkmark" /> {{ t("overlay.install_success") }}
			</p>
		</template>

		<div v-else class="field">
			<button class="backBt" v-if="obsConnected" @click="showInput = false">
				<Icon name="back" />
			</button>
			<TTButton
				class="draggable"
				draggable="true"
				type="link"
				:href="localURLOBS"
				:light="props.light != false"
				@click.prevent
				@dragstart="onDragButtonStart($event)"
				>{{ t("overlay.drag_installBt") }}</TTButton
			>
			<span>{{ t("global.or") }}</span>
			<input
				:class="{ primary: true, light: props.light }"
				type="text"
				name="url"
				v-model="localURL"
				v-click2Select
				readonly
				:disabled="props.disabled"
			/>
			<TTButton class="copyBt" :copy="localURL" icon="copy" transparent light />
		</div>

		<div v-if="error" class="card-item alert error" @click="error = ''">
			{{ t("overlay.install_error", { ERROR: error }) }}
		</div>

		<div
			class="card-item instructions"
			v-if="(!obsConnected || showInput) && !!isEmptySlot(slots.default)"
		>
			<slot />
		</div>
	</div>
</template>

<script setup lang="ts">
import TTButton from "@/components/TTButton.vue";
import { useEmptySlot } from "@/composables/useEmptySlot";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import OBSWebsocket, { type SourceTransform } from "@/utils/OBSWebsocket";
import Utils from "@/utils/Utils";
import { computed, ref, useSlots } from "vue";
import { useI18n } from "vue-i18n";

const props = withDefaults(
	defineProps<{
		id?: string;
		css?: string;
		type: TwitchatDataTypes.OverlayTypes;
		url?: string;
		sourceTransform?: Partial<SourceTransform>;
		disabled?: boolean;
		sourceSuffix?: string;
		customSourceName?: string;
		sceneName?: string;
		queryParams?: any;
		orderToBottom?: boolean;
		light?: boolean;
	}>(),
	{
		id: "",
		css: "",
		url: "",
		sourceTransform: () => ({}),
		disabled: false,
		sourceSuffix: "",
		customSourceName: "",
		sceneName: "",
		queryParams: () => ({}),
		orderToBottom: false,
		light: false,
	},
);

const emit = defineEmits<{
	obsSourceCreated: [payload: { sourceName: string }];
}>();

const error = ref<string>("");
const showInput = ref<boolean>(false);
const showSuccess = ref<boolean>(false);
const isExistingSource = ref<boolean>(false);

const { t } = useI18n();
const slots = useSlots();
const { isEmptySlot } = useEmptySlot();

let successTO: number = -1;

const obsConnected = computed<boolean>(() => {
	return OBSWebsocket.instance.connected.value;
});

const obsSourceName = computed<string>(() => {
	if (props.customSourceName) return props.customSourceName;
	let name = "Twitchat_" + props.type;
	if (props.sourceSuffix) name += props.sourceSuffix;
	return name;
});

const localURL = computed<string>(() => {
	const url = new URL(props.url != "" ? props.url : Utils.overlayURL(props.type));
	if (props.id != "") url.searchParams.set("twitchat_overlay_id", props.id);
	if (props.queryParams) {
		for (const key in props.queryParams) {
			url.searchParams.set(key, props.queryParams[key]);
		}
	}
	return url.href;
});

const localURLOBS = computed<string>(() => {
	let url = new URL(localURL.value);
	url.searchParams.set("layer-name", obsSourceName.value);
	if (props.sourceTransform?.width) {
		url.searchParams.set("layer-width", props.sourceTransform.width.toString());
	}
	if (props.sourceTransform?.height) {
		url.searchParams.set("layer-height", props.sourceTransform.height.toString());
	}
	return url.href;
});

/**
 * Creates an OBS browser source
 */
async function createBrowserSource(): Promise<void> {
	showSuccess.value = false;
	error.value = "";
	clearTimeout(successTO);
	try {
		isExistingSource.value = await OBSWebsocket.instance.createBrowserSource(
			localURL.value,
			obsSourceName.value,
			props.sourceTransform,
			props.sceneName,
			props.orderToBottom !== false,
			props.css,
		);
		showSuccess.value = true;
	} catch (e: any) {
		console.log(e);
		error.value = e.message;
		return;
	}

	if (!isExistingSource.value) {
		successTO = window.setTimeout(() => {
			showSuccess.value = false;
		}, 5000);
	}
	emit("obsSourceCreated", { sourceName: obsSourceName.value });
}

function onDragButtonStart(event: DragEvent): void {
	if (!event.dataTransfer) return;
	event.dataTransfer.setDragImage(
		document.querySelector("#logoForDraggableItems") as HTMLImageElement,
		50,
		50,
	);
	event.dataTransfer.setData("text/uri-list", (event.target as HTMLAnchorElement).href);
}
</script>

<style scoped lang="less">
.overlayinstaller {
	gap: 1em;
	row-gap: 0.5em;
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	flex-wrap: wrap;
	width: 100%;

	.createBt {
		display: flex;
	}

	.instructions {
		.bevel();
		background-color: var(--color-dark-fader);
		flex-basis: 100%;
		white-space: pre-line;
		line-height: 1.25em;
		font-size: 0.85em;
		&:empty {
			display: none;
		}
	}

	.field {
		gap: 0.5em;
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		flex-wrap: wrap;
		width: 100%;
		.copyBt {
			margin-left: -1.85em;
			padding: 0;
		}
		.icon {
			display: block;
			height: 1em;
			color: var(--color-text);
		}
		input {
			padding-right: 1.75em;
		}
	}

	.existing {
		cursor: pointer;
		text-align: center;
		white-space: pre-line;
		line-height: 1.25em;
	}

	.success {
		cursor: pointer;
		.icon {
			height: 1em;
			vertical-align: middle;
		}
	}

	.error {
		flex: 1 1 100%;
		text-align: center;
		white-space: pre-line;
		line-height: 1.25em;
	}

	.draggable {
		user-select: none;
		cursor: move;
	}
}
</style>

