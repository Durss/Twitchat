<template>
	<div class="connectionForm parameterContent">
		<Icon :name="icon" class="icon" />

		<div class="head">
			<slot name="header" />
			<slot v-if="!connected" name="info" />
		</div>

		<ParamItem
			v-if="enableToggle"
			class="enableBt"
			:paramData="enableParam"
			v-model="enableParam.value"
		/>

		<div class="fadeHolder" :style="holderStyles">
			<template v-if="!connected">
				<div class="card-item form" v-if="$slots.mandatoryFields">
					<slot name="mandatoryFields" />
				</div>

				<TTButton @click="$emit('connect')" :loading="connecting" :disabled="!canConnect">{{
					t("global.connect")
				}}</TTButton>

				<ToggleBlock
					v-if="$slots.fields"
					:title="t('global.advanced_params')"
					small
					:open="advancedOpen"
				>
					<form class="card-item form" @submit.prevent="$emit('connect')">
						<slot name="fields" />
					</form>
				</ToggleBlock>
			</template>

			<BrowserPermissionChecker
				v-if="error && localNetwork"
				@click="$emit('update:error', false)"
				class="card-item alert error"
				:errorMessage="t('error.local_network_access_denied')"
				:permissionName="'local-network-access'"
			>
				<slot name="error">{{ t(errorMessage) }}</slot>
			</BrowserPermissionChecker>
			<div
				v-else-if="error"
				class="card-item alert error"
				@click="$emit('update:error', false)"
			>
				<slot name="error">{{ t(errorMessage) }}</slot>
			</div>

			<template v-if="connected">
				<div v-if="showSuccess" class="card-item primary success">
					{{ t("connexions.success") }}
				</div>

				<div
					v-if="connectedInfo && connectedInfo.length > 0"
					class="card-item connectedInfos"
				>
					<div v-for="info in connectedInfo" :key="info.label">
						<strong>{{ info.label }}</strong
						>: {{ info.value }}
					</div>
				</div>

				<TTButton class="connectBt" alert @click="$emit('disconnect')">{{
					t("global.disconnect")
				}}</TTButton>

				<slot name="connected" />
			</template>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { computed, ref, watch, type CSSProperties } from "vue";
import { useI18n } from "vue-i18n";
import ParamItem from "../../ParamItem.vue";
import TTButton from "@/components/TTButton.vue";
import ToggleBlock from "@/components/ToggleBlock.vue";
import BrowserPermissionChecker from "@/components/BrowserPermissionChecker.vue";

const props = withDefaults(
	defineProps<{
		icon: string;
		connected: boolean;
		connecting?: boolean;
		error?: boolean;
		showSuccess?: boolean;
		errorMessage?: string;
		localNetwork?: boolean;
		canConnect?: boolean;
		connectedInfo?: { label: string; value: string | number }[];
		enableToggle?: boolean;
		enabled?: boolean;
		advancedOpen?: boolean;
	}>(),
	{
		connecting: false,
		error: false,
		showSuccess: false,
		errorMessage: "error.unknown",
		localNetwork: true,
		canConnect: true,
		enableToggle: true,
		enabled: false,
		advancedOpen: false,
	},
);

const emit = defineEmits<{
	(e: "connect"): void;
	(e: "disconnect"): void;
	(e: "update:enabled", value: boolean): void;
	(e: "update:error", value: boolean): void;
}>();

const { t } = useI18n();

const enableParam = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	labelKey: "global.enabled",
	value: props.enabled,
});

watch(
	() => props.enabled,
	(v) => {
		enableParam.value.value = v;
	},
);

watch(
	() => enableParam.value.value,
	(v) => {
		if (v !== props.enabled) {
			emit("update:enabled", v);
		}
	},
);

const holderStyles = computed<CSSProperties>(() => {
	if (!props.enableToggle) return {};
	return {
		opacity: enableParam.value.value ? 1 : 0.5,
		pointerEvents: enableParam.value.value ? "all" : "none",
	};
});
</script>

<style scoped lang="less">
.connectionForm {
	.fadeHolder {
		transition: opacity 0.2s;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1em;
	}

	.form {
		display: flex;
		flex-direction: column;
		gap: 0.5em;
	}

	.error {
		cursor: pointer;
		white-space: pre-line;
		text-align: center;
	}

	.connectedInfos {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
}
</style>
