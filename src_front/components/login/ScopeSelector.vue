<template>
	<div class="scopeselector">
		<div class="forced" v-if="param_items_requested.length > 0">
			<Icon name="unlock" class="unlockIcon" />
			<p class="head">{{ t("login.specific_scope", param_items_requested.length) }}</p>
			<div class="optionList">
				<ParamItem
					class="item"
					:class="getClasses(p)"
					v-for="p in param_items_requested"
					v-model="p.value"
					:secondary="!p.value"
					:paramData="p"
					@change="onSelectionUpdate()"
					noBackground
				/>
			</div>
		</div>

		<TTButton
			v-if="!forceFullList && param_items_requested.length > 0"
			icon="lock_fit"
			small
			secondary
			@click="expandList()"
			>{{ t("login.specific_scope_moreBt") }}</TTButton
		>

		<div
			ref="permsList"
			class="permsHolder"
			v-if="forceFullList || param_items_requested.length == 0"
		>
			<div class="optionList">
				<ParamItem
					class="item"
					:class="getClasses(p)"
					v-for="p in param_items"
					v-model="p.value"
					:secondary="!p.value"
					:paramData="p"
					@change="onSelectionUpdate()"
					noBackground
				/>
			</div>
			<ParamItem
				class="item all"
				:paramData="params_all"
				v-model="params_all.value"
				@input="onSelectAllChange()"
				noBackground
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Config from "@/utils/Config";
import { TwitchScope2Icon, type TwitchScopesString } from "@/utils/twitch/TwitchScopes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { gsap } from "gsap/gsap-core";
import { ref, watch, onMounted, nextTick, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import TTButton from "../TTButton.vue";
import ParamItem from "../params/ParamItem.vue";
import { onBeforeMount } from "vue";

const { t } = useI18n();
const storeAuth = useStoreAuth();

const props = withDefaults(
	defineProps<{
		requestedScopes?: TwitchScopesString[];
	}>(),
	{
		requestedScopes: () => [],
	},
);

const emit = defineEmits<{
	update: [scopes: string[]];
}>();

const forceFullList = ref<boolean>(false);
const params_all = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "login.grant_all",
});
const param_items = ref<
	TwitchatDataTypes.ParameterData<boolean, unknown, unknown, TwitchScopesString[]>[]
>([]);
const param_items_requested = ref<
	TwitchatDataTypes.ParameterData<boolean, unknown, unknown, TwitchScopesString[]>[]
>([]);

const permsList = useTemplateRef<HTMLDivElement>("permsList");

let debounce: number = -1;

function getClasses(
	p: TwitchatDataTypes.ParameterData<boolean, unknown, unknown, TwitchScopesString[]>,
): string[] {
	let res: string[] = [];
	if (p.value === true) res.push("selected");
	return res;
}
function onSelectAllChange(): void {
	for (const p of param_items.value) {
		if (p.disabled === true) continue;
		p.value = params_all.value.value;
	}
	onSelectionUpdate();
}

function onSelectionUpdate(): void {
	clearTimeout(debounce);
	debounce = window.setTimeout(() => {
		const scopes: string[] = [];
		for (const p of param_items.value) {
			if (p.value === true) scopes.push(...(p.storage || []));
		}
		for (const p of param_items_requested.value) {
			if (p.value === true) scopes.push(...(p.storage || []));
		}
		emit("update", scopes);
	}, 50);
}

async function expandList(): Promise<void> {
	forceFullList.value = true;

	await nextTick();

	gsap.from(permsList.value!, {
		height: "1.5em",
		duration: 0.5,
		ease: "sine.inOut",
		clearProps: "all",
	});
}

function buildList(): void {
	const scopes: TwitchScopesString[] = JSON.parse(
		JSON.stringify(Config.instance.TWITCH_APP_SCOPES),
	);

	const mandatory = Config.instance.MANDATORY_TWITCH_SCOPES;
	const userScopes = storeAuth.twitch.scopes ?? [];
	for (const m of mandatory) {
		if (userScopes.indexOf(m) == -1) {
			userScopes.unshift(m);
		}
	}

	scopes.sort((a, b) => {
		if (props.requestedScopes.indexOf(a) > -1) return -1;
		return 0;
	});

	const requestedList: TwitchatDataTypes.ParameterData<
		boolean,
		unknown,
		unknown,
		TwitchScopesString[],
		unknown
	>[] = [];
	const availableList: TwitchatDataTypes.ParameterData<
		boolean,
		unknown,
		unknown,
		TwitchScopesString[],
		unknown
	>[] = [];
	const forceSelect =
		(!userScopes || userScopes.length <= mandatory.length) &&
		(!props.requestedScopes || props.requestedScopes.length == 0);
	let allSelected = true;
	for (const scope of scopes) {
		const localScopes: TwitchScopesString[] = scope.split("+") as TwitchScopesString[];
		const requested = localScopes.filter((s) => props.requestedScopes.indexOf(s) > -1);
		if (requested.length > 0) {
			requestedList.push({
				labelKey: "global.twitch_scopes." + localScopes[0],
				type: "boolean",
				value: true,
				icon: TwitchScope2Icon[localScopes[0]!],
				iconTheme: "light",
				storage: localScopes,
			});
		} else {
			const disabled = localScopes.filter((s) => mandatory.indexOf(s) > -1).length > 0;
			const selected = forceSelect || disabled ? true : TwitchUtils.hasScopes(localScopes);
			if (!selected) allSelected = false;
			availableList.push({
				labelKey: "global.twitch_scopes." + localScopes[0],
				type: "boolean",
				value: selected,
				icon: TwitchScope2Icon[localScopes[0]!],
				iconTheme: "light",
				disabled,
				storage: localScopes,
			});
		}
	}

	//Move non-granted scopes to the top
	availableList.sort((a, b) => {
		if (a.disabled) return -1;
		if (b.disabled) return 1;
		if (a.value && !b.value) return 1;
		if (!a.value && b.value) return -1;
		return 0;
	});
	params_all.value.value = allSelected;
	param_items_requested.value = requestedList;
	param_items.value = availableList;
}

onBeforeMount(() => {
	buildList();
});

onMounted(() => {
	onSelectionUpdate();
});

watch(
	() => storeAuth.twitch.scopes,
	() => {
		buildList();
	},
);
</script>

<style scoped lang="less">
.scopeselector {
	gap: 0.5em;
	display: flex;
	flex-direction: column;
	align-items: center;

	.icon {
		margin: auto;
	}

	.permsHolder {
		overflow: hidden;
	}

	.optionList {
		//Show 8 items and make sure only half of the last item is
		//visible so the user knows there are more items to scroll
		max-height: calc(2em * 8.5);
		overflow: auto;
		display: flex;
		flex-wrap: wrap;
		flex-direction: row;
		gap: 0.25em;
		padding: 0.25em;
		margin-bottom: 0.5em;
		.item {
			width: 100%;
			text-align: left;
			border-radius: 0.5em;
			color: var(--color-text-light);
			background-color: var(--color-secondary-fader);
			padding: 0.25em;
			opacity: 0.7;
			transition: all 0.2s;
			&.selected {
				opacity: 1;
				background-color: var(--color-primary);
			}
		}
	}

	.forced {
		display: flex;
		flex-direction: column;
		gap: 0.5em;
		.unlockIcon {
			height: 2em;
		}
	}

	.item.all {
		margin-right: 1.1em;
		:deep(label) {
			text-align: right;
		}
	}
}

@media only screen and (max-width: 600px) {
	.scopeselector {
		.optionList {
			max-height: 50vh;
		}
	}
}
</style>

<style lang="less">
body.light {
	.scopeselector {
		.optionList {
			.item:not(.selected) {
				color: var(--color-text) !important;
				.icon {
					filter: invert();
				}
			}
		}
	}
}
</style>
