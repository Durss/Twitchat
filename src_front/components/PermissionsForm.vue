<template>
	<div class="permissionsform">
		<ParamItem
			v-if="props.hasBroadcasterFilter"
			noBackground
			:paramData="param_broadcaster"
			class="row"
			v-model="props.modelValue.broadcaster"
			@change="emitChange()"
		/>
		<ParamItem
			v-if="props.hasModFilter"
			noBackground
			:paramData="param_mods"
			class="row"
			v-model="props.modelValue.mods"
			@change="emitChange()"
		/>
		<ParamItem
			v-if="props.hasVipFilter"
			noBackground
			:paramData="param_vips"
			class="row"
			v-model="props.modelValue.vips"
			@change="emitChange()"
		/>
		<ParamItem
			v-if="props.hasSubFilter"
			noBackground
			:paramData="param_subs"
			class="row"
			v-model="props.modelValue.subs"
			@change="emitChange()"
		/>
		<ParamItem
			v-if="props.hasFollowerFilter"
			noBackground
			:paramData="param_followers"
			class="row"
			v-model="props.modelValue.follower"
			@change="emitChange()"
		>
			<ParamItem
				v-if="props.hasFollowerDurationFilter"
				noBackground
				:paramData="param_followers_ms"
				class="row"
				:childLevel="1"
				v-model="props.modelValue.follower_duration_ms"
				@change="emitChange()"
			>
			</ParamItem>
		</ParamItem>
		<ParamItem
			v-if="props.hasAllFilter"
			noBackground
			:paramData="param_all"
			class="row"
			v-model="props.modelValue.all"
			@change="emitChange()"
		/>
		<ParamItem
			v-if="props.hasUserNameFilter"
			noBackground
			:paramData="param_allowed"
			class="row allow"
			v-model="props.modelValue.usersAllowed"
			@change="emitChange()"
		/>
		<ParamItem
			v-if="props.hasUserNameFilter"
			noBackground
			:paramData="param_refused"
			class="row refuse"
			v-model="props.modelValue.usersRefused"
			@change="emitChange()"
		/>

		<div v-if="noSelection" class="card-item alert">{{ $t("global.permissions.nobody") }}</div>
	</div>
</template>

<script setup lang="ts">
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { TwitchScopes } from "@/utils/twitch/TwitchScopes";
import { watch, reactive, computed, onBeforeMount, onMounted } from "vue";
import ParamItem from "./params/ParamItem.vue";

const props = withDefaults(
	defineProps<{
		modelValue: TwitchatDataTypes.PermissionsData;
		hasAllFilter?: boolean;
		hasModFilter?: boolean;
		hasVipFilter?: boolean;
		hasSubFilter?: boolean;
		hasUserNameFilter?: boolean;
		hasFollowerFilter?: boolean;
		hasBroadcasterFilter?: boolean;
		hasFollowerDurationFilter?: boolean;
	}>(),
	{
		hasAllFilter: true,
		hasModFilter: true,
		hasVipFilter: true,
		hasSubFilter: true,
		hasUserNameFilter: true,
		hasFollowerFilter: true,
		hasBroadcasterFilter: true,
		hasFollowerDurationFilter: true,
	},
);

const emit = defineEmits<{
	change: [value: TwitchatDataTypes.PermissionsData];
	"update:modelValue": [value: TwitchatDataTypes.PermissionsData];
}>();

const param_broadcaster = reactive<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	labelKey: "global.permissions.broadcaster",
	value: true,
	icon: "broadcaster",
});
const param_mods = reactive<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	labelKey: "global.permissions.mods",
	value: true,
	icon: "mod",
});
const param_vips = reactive<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	labelKey: "global.permissions.vips",
	value: false,
	icon: "vip",
});
const param_subs = reactive<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	labelKey: "global.permissions.subs",
	value: false,
	icon: "sub",
});
const param_followers_ms = reactive<TwitchatDataTypes.ParameterData<number>>({
	type: "integer",
	labelKey: "global.permissions.follow_duration",
	value: 0,
	min: 0,
	max: 50000,
	icon: "timer",
});
const param_all = reactive<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	labelKey: "global.permissions.all",
	value: false,
	icon: "user",
});
const param_allowed = reactive<TwitchatDataTypes.ParameterData<string, string>>({
	type: "editablelist",
	labelKey: "global.permissions.users_allowed",
	placeholderKey: "global.permissions.users_placeholder",
	value: "",
	icon: "checkmark",
	maxLength: 40,
});
const param_refused = reactive<TwitchatDataTypes.ParameterData<string, string>>({
	type: "editablelist",
	labelKey: "global.permissions.users_refused",
	placeholderKey: "global.permissions.users_placeholder",
	value: "",
	icon: "cross",
	maxLength: 40,
});
const param_followers = reactive<TwitchatDataTypes.ParameterData<boolean, unknown, number>>({
	type: "boolean",
	labelKey: "global.permissions.follow",
	value: false,
	icon: "follow",
	twitch_scopes: [TwitchScopes.LIST_FOLLOWERS],
});

const noSelection = computed(() => {
	return (
		props.modelValue.mods === false &&
		props.modelValue.vips === false &&
		props.modelValue.subs === false &&
		props.modelValue.all === false &&
		props.modelValue.follower === false &&
		props.modelValue.broadcaster === false &&
		props.modelValue.usersAllowed.length === 0
	);
});

onBeforeMount(() => {
	if (props.modelValue.follower === undefined) props.modelValue.follower = false;
	param_followers_ms.value = (props.modelValue.follower_duration_ms ?? 0) / (24 * 60 * 60 * 1000);
});

onMounted(() => {
	let hasChanged = false;
	if (props.modelValue.usersAllowed) {
		props.modelValue.usersAllowed.forEach((v, i) => {
			const trimmed = v.slice(0, param_allowed.maxLength!);
			props.modelValue.usersAllowed[i] = trimmed;
			hasChanged ||= trimmed !== v;
		});
	}
	if (props.modelValue.usersRefused) {
		props.modelValue.usersRefused.forEach((v, i) => {
			const trimmed = v.slice(0, param_refused.maxLength!);
			props.modelValue.usersRefused[i] = trimmed;
			hasChanged ||= trimmed !== v;
		});
	}
	if (hasChanged) {
		emitChange();
	}
});

watch(
	() => param_followers_ms.value,
	() => {
		props.modelValue.follower_duration_ms = param_followers_ms.value * 24 * 60 * 60 * 1000;
		emitChange();
	},
);

function emitChange() {
	emit("update:modelValue", props.modelValue);
	emit("change", props.modelValue);
}

//As this data has been added afterwards, it's missing from the existing data.
//I force it to "true" if not defined as I think it makes the more sense.
param_followers.value = props.modelValue.follower !== false;
</script>

<style scoped lang="less">
.permissionsform {
	margin: auto;
	max-width: 450px;
	display: flex;
	flex-direction: column;
	gap: 0.25em;

	& > :not(:first-child) {
		margin-top: 0.25em;
	}

	.row {
		:deep(input[type="number"]) {
			flex-basis: 80px;
		}
	}

	.allow,
	.refuse {
		:deep(.icon) {
			width: 1.25em;
			height: 1.25em;
			padding: 0 3px;
			border-radius: 50%;
			position: relative;
			border: 2px solid var(--color-primary);
		}
	}
	.refuse {
		:deep(.icon) {
			border-color: var(--color-alert);
		}
	}

	select {
		width: 100%;
		text-align: center;
	}
}
</style>
