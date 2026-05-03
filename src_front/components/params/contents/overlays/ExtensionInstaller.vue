<template>
	<div
		class="extensioninstaller card-item"
		:class="{
			primary: installed && enabled && !loading,
			secondary: installed && !enabled && !loading,
			alert: !installed && !loading,
		}"
		v-if="loading || !installed || !enabled"
	>
		<icon class="logo" name="extension" />
		<div v-if="loading" class="content loader">
			<span class="head">
				{{ $t("extensions.installer.loading") }}
				<icon class="spinner" name="loader" />
			</span>
		</div>
		<div class="content" v-else-if="!installed">
			<span class="head">{{
				$t("extensions.installer.install", { NAME: props.extensionName })
			}}</span>
			<TTButton
				alert
				light
				icon="newtab"
				type="link"
				:href="$config.TWITCHAT_EXTENSION_URL"
				target="_blank"
				>{{ $t("extensions.installer.installBt") }}</TTButton
			>
		</div>
		<div class="content" v-else-if="!enabled">
			<span class="head">{{
				$t("extensions.installer.enable", { NAME: props.extensionName })
			}}</span>
			<TTButton secondary light icon="twitch" @click="enableExtension" :loading="enabling">{{
				$t("extensions.installer.enableBt")
			}}</TTButton>
			<div class="card-item alert error" v-if="enableError">
				<icon name="alert" />{{ $t("extensions.installer.enableError") }}
			</div>
		</div>
		<!-- <div class="content complete" v-else>
			<span> <icon name="checkmark" />{{ $t("extensions.installer.ready", {NAME:props.extensionName}) }} </span>
		</div> -->
	</div>
</template>

<script setup lang="ts">
import TTButton from "@/components/TTButton.vue";
import { storeExtension as useStoreExtension } from "@/store/extension/storeExtension";
import Config from "@/utils/Config";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

const loading = ref(false);
const enabling = ref(false);
const enableError = ref(false);

const storeExtension = useStoreExtension();

const props = withDefaults(defineProps<{ extensionID?: string; extensionName?: string }>(), {
	extensionID: Config.instance.TWITCHAT_EXTENSION_ID,
	extensionName: "Twitchat Companion",
});

const model = defineModel<boolean>("extensionReady", { default: false });

let checkinterval = -1;
let loaderDelay = -1;

onMounted(() => {
	//Only show loader if it takes more than 1s to load states
	loaderDelay = window.setTimeout(() => {
		loading.value = true;
	}, 1000);

	checkExtensionStatus();

	checkinterval = window.setInterval(() => {
		if (enabled.value || loading.value) return;
		checkExtensionStatus();
	}, 3000);
});

onBeforeUnmount(() => {
	window.clearInterval(checkinterval);
});

watch(
	() => storeExtension.enabledExtensions,
	(val) => {
		model.value = val.findIndex((v) => v.id == props.extensionID) > -1;
	},
	{ immediate: true },
);

const installed = computed(() => {
	return storeExtension.availableExtensions.find((v) => v.id == props.extensionID);
});

const enabled = computed(() => {
	return storeExtension.enabledExtensions.find((v) => v.id == props.extensionID);
});

async function enableExtension(): Promise<void> {
	enabling.value = true;
	enableError.value = false;
	const extension = storeExtension.availableExtensions.find((v) => v.id == props.extensionID);
	if (!extension || !extension.type.includes("overlay")) {
		throw new Error('This component only supports "overlay" extension types.');
	}
	const success = await storeExtension.setExtensionState(true, "1", "overlay", extension);
	if (!success) {
		enableError.value = true;
	}
	enabling.value = false;
}

async function checkExtensionStatus(): Promise<void> {
	await storeExtension.updateInternalStates();
	clearTimeout(loaderDelay);
	loading.value = false;
}
</script>

<style scoped lang="less">
.extensioninstaller {
	gap: 0.5em;
	display: flex;
	flex-direction: row;
	line-height: 1.25em;
	margin: auto;
	// max-width: 400px;

	.logo {
		width: 2em;
		height: auto;
		flex-shrink: 0;
	}

	.content {
		flex: 1;
		gap: 0.5em;
		display: flex;
		flex-direction: column;

		.icon {
			height: 1em;
			margin-right: 0.5em;
			vertical-align: middle;
		}

		&.loader {
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: center;
		}

		.head {
			text-wrap: balance;
			text-align: center;
			white-space: pre-line;
		}
	}

	.error {
		align-self: center;
	}

	.button {
		align-self: center;
	}
}
</style>

