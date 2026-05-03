<template>
	<div class="heatdistortparams card-item selectMode" v-if="!overlayInstalled">
		<p>{{ t("overlay.heatDistort.select_target") }}</p>

		<OBSSceneItemSelector
			class="sceneSelector"
			v-model="props.modelValue.obsItemPath"
			@change="refreshState()"
		/>

		<OverlayInstaller
			type="distort"
			orderToBottom
			:css="'html, body{ background-color:transparent;}'"
			:id="props.modelValue.id"
			:sourceSuffix="sourceSuffix"
			:disabled="props.modelValue.obsItemPath.sceneName == ''"
			:sourceTransform="{ positionX: -3840, width: 3840 }"
			:sceneName="props.modelValue.obsItemPath.sceneName"
			@obsSourceCreated="onObsSourceCreated"
		>
			<h2><Icon name="info" />{{ t("overlay.install_instructions_title") }}</h2>
			<p v-html="t('overlay.heatDistort.install_instructions')"></p>
		</OverlayInstaller>

		<TTButton class="center" icon="cross" secondary @click="deleteEntry(false)">{{
			t("global.cancel")
		}}</TTButton>
	</div>

	<ToggleBlock
		medium
		v-else
		editableTitle
		v-model:title="props.modelValue.name"
		:titleDefault="sourcePathLabel"
		class="distortionEntry"
		:style="{ opacity: props.modelValue.enabled ? 1 : 0.5 }"
	>
		<template #left_actions>
			<ToggleButton
				v-model="props.modelValue.enabled"
				big
				@change="onToggleState()"
				v-if="canEnable"
			/>
			<Icon name="premium" v-else v-tooltip="t('overlay.heatDistort.premium_locked')" />
		</template>

		<template #right_actions>
			<TTButton icon="trash" alert @click.stop="deleteEntry()" />
		</template>

		<div class="heatdistortparams">
			<ParamItem :paramData="param_shape" v-model="props.modelValue.effect" noBackground />
			<ParamItem
				:paramData="param_triggerOnly"
				v-model="props.modelValue.triggerOnly"
				noBackground
				inverseChildrenCondition
			>
				<ParamItem
					class="offset"
					:paramData="param_anon"
					v-model="props.modelValue.refuseAnon"
					noBackground
				>
					<PermissionsForm class="permissions" v-model="props.modelValue.permissions" />
				</ParamItem>
			</ParamItem>

			<TTButton
				class="center"
				v-if="props.modelValue.enabled"
				@click="simulateClicks()"
				icon="test"
				>{{ t("overlay.heatDistort.testBt") }}</TTButton
			>

			<div v-if="!heatEnabled" class="card-item alert">
				<Icon name="alert" />
				<i18n-t scope="global" keypath="overlay.heatDistort.heat_disabled">
					<template #LINK>
						<a @click.stop="openTwitchatCompanion()">{{
							t("overlay.heatDistort.heat_disabled_link")
						}}</a>
					</template>
				</i18n-t>
			</div>
		</div>
	</ToggleBlock>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import PermissionsForm from "@/components/PermissionsForm.vue";
import TTButton from "@/components/TTButton.vue";
import ToggleBlock from "@/components/ToggleBlock.vue";
import ToggleButton from "@/components/ToggleButton.vue";
import ParamItem from "@/components/params/ParamItem.vue";
import { useConfirm } from "@/composables/useConfirm";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeExtension as useStoreExtension } from "@/store/extension/storeExtension";
import { storeHeat as useStoreHeat } from "@/store/heat/storeHeat";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Config from "@/utils/Config";
import OBSWebsocket from "@/utils/OBSWebsocket";
import HeatSocket from "@/utils/twitch/HeatSocket";
import { computed, nextTick, onBeforeMount, onBeforeUnmount, ref } from "vue";
import { useI18n } from "vue-i18n";
import OBSSceneItemSelector from "../../obs/OBSSceneItemSelector.vue";
import OverlayInstaller from "../OverlayInstaller.vue";

const props = defineProps<{
	modelValue: TwitchatDataTypes.HeatDistortionData;
}>();

const emit = defineEmits<{
	delete: [value: TwitchatDataTypes.HeatDistortionData];
	created: [
		sourceName: string,
		modelValue: TwitchatDataTypes.HeatDistortionData,
		sourceSuffix: string,
	];
}>();

const { t } = useI18n();
const { confirm } = useConfirm();
const storeAuth = useStoreAuth();
const storeHeat = useStoreHeat();
const storeParams = useStoreParams();
const storeExtension = useStoreExtension();

const overlayInstalled = ref(false);

const param_shape = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "list",
	value: "",
	icon: "distort",
	labelKey: "overlay.heatDistort.param_shape",
});
const param_triggerOnly = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "broadcast",
	labelKey: "overlay.heatDistort.param_triggerOnly",
	tooltipKey: "overlay.heatDistort.param_triggerOnly_tt",
});
const param_anon = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "anon",
	labelKey: "overlay.heatDistort.param_anon",
	tooltipKey: "heat.anonymous",
});

let updateDebounce: number = -1;
let obsEventHandler!: () => void;

const heatEnabled = computed((): boolean => {
	return HeatSocket.instance.connected.value || storeExtension.companionEnabled;
});

const canEnable = computed((): boolean => {
	return (
		props.modelValue.enabled ||
		storeAuth.isPremium ||
		storeHeat.distortionList.filter((v) => v.enabled).length <
			Config.instance.MAX_DISTORTION_OVERLAYS
	);
});

const sourcePathLabel = computed((): string => {
	const chunks: string[] = [];
	if (props.modelValue.obsItemPath.sceneName) chunks.push(props.modelValue.obsItemPath.sceneName);
	if (props.modelValue.obsItemPath.groupName) chunks.push(props.modelValue.obsItemPath.groupName);
	if (props.modelValue.obsItemPath.source.name)
		chunks.push(props.modelValue.obsItemPath.source.name);
	return chunks.join(" => ");
});

const sourceSuffix = computed((): string => {
	let suffix = "";
	if (props.modelValue.obsItemPath.source.name) suffix = props.modelValue.obsItemPath.source.name;
	else if (props.modelValue.obsItemPath.groupName)
		suffix = props.modelValue.obsItemPath.groupName;
	else if (props.modelValue.obsItemPath.sceneName)
		suffix = props.modelValue.obsItemPath.sceneName;
	return " (" + suffix + ")";
});

function openTwitchatCompanion(): void {
	storeParams.openParamsPage(
		TwitchatDataTypes.ParameterPages.CONNECTIONS,
		TwitchatDataTypes.ParamDeepSections.TWITCHAT_COMPANION,
	);
}

async function onObsSourceCreated(data: { sourceName: string }): Promise<void> {
	emit("created", data.sourceName, props.modelValue, sourceSuffix.value);
}

function deleteEntry(askConfirm: boolean = true): void {
	if (!askConfirm) {
		emit("delete", props.modelValue);
		return;
	}

	confirm(t("overlay.heatDistort.delete_confirm"), t("overlay.heatDistort.delete_confirm_desc"))
		.then(() => {
			emit("delete", props.modelValue);
		})
		.catch(() => {
			/* ignore */
		});
}

async function refreshState(): Promise<void> {
	clearTimeout(updateDebounce);

	const sceneName =
		props.modelValue.obsItemPath.groupName || props.modelValue.obsItemPath.sceneName;
	if (!sceneName) return;

	updateDebounce = window.setTimeout(async () => {
		let filterTarget = "";
		if (props.modelValue.obsItemPath.source.name)
			filterTarget = props.modelValue.obsItemPath.source.name;
		else if (props.modelValue.obsItemPath.groupName)
			filterTarget = props.modelValue.obsItemPath.groupName;
		else if (props.modelValue.obsItemPath.sceneName)
			filterTarget = props.modelValue.obsItemPath.sceneName;
		const filters = await OBSWebsocket.instance.getSourceFilters(filterTarget);
		const filter = filters.find((v) => v.filterKind == "shadertastic_filter");
		overlayInstalled.value = filter != undefined;
	}, 100);
}

function simulateClicks(): void {
	if (heatEnabled.value) {
		const uid = storeAuth.twitch.user.id;
		for (let i = 0; i < 5; i++) {
			const px = Math.random();
			const py = Math.random();
			window.setTimeout(() => {
				HeatSocket.instance.fireEvent(uid, px, py, false, false, false);
			}, 250 * i);
		}
	}
}

function onToggleState(): void {
	if (storeAuth.isPremium) return;
	if (
		storeHeat.distortionList.filter((v) => v.enabled).length >
		Config.instance.MAX_DISTORTION_OVERLAYS
	) {
		nextTick().then(() => {
			props.modelValue.enabled = false;
		});
	}
}

onBeforeMount(async () => {
	if (!props.modelValue.name) props.modelValue.name = "";

	const values: TwitchatDataTypes.ParameterDataListValue<
		TwitchatDataTypes.HeatDistortionData["effect"]
	>[] = [
		{ value: "liquid", labelKey: "overlay.heatDistort.distorsions.ripples" },
		{ value: "expand", labelKey: "overlay.heatDistort.distorsions.expand" },
		// {value:"shrink", labelKey:"overlay.heatDistort.distorsions.shrink"},
		{ value: "heart", labelKey: "overlay.heatDistort.distorsions.heart" },
	];
	param_shape.value.listValues = values;

	refreshState();

	obsEventHandler = () => refreshState();
	OBSWebsocket.instance.socket.on("SceneItemCreated", obsEventHandler);
	OBSWebsocket.instance.socket.on("SceneItemRemoved", obsEventHandler);
	OBSWebsocket.instance.socket.on("InputNameChanged", obsEventHandler);
	OBSWebsocket.instance.socket.on("SourceFilterRemoved", obsEventHandler);
	OBSWebsocket.instance.socket.on("SourceFilterCreated", obsEventHandler);
});

onBeforeUnmount(() => {
	OBSWebsocket.instance.socket.off("SceneItemCreated", obsEventHandler);
	OBSWebsocket.instance.socket.off("SceneItemRemoved", obsEventHandler);
	OBSWebsocket.instance.socket.off("InputNameChanged", obsEventHandler);
	OBSWebsocket.instance.socket.off("SourceFilterRemoved", obsEventHandler);
	OBSWebsocket.instance.socket.off("SourceFilterCreated", obsEventHandler);
});
</script>

<style scoped lang="less">
.heatdistortparams {
	gap: 0.5em;
	display: flex;
	overflow: hidden;
	flex-direction: column;

	h2 {
		text-align: center;
		font-size: 2em;
		line-height: 1.25em;
		margin-bottom: 0.25em;
		.icon {
			height: 1em;
			vertical-align: middle;
			margin-right: 0.25em;
		}
	}

	.offset {
		margin-top: 0.5em;
	}

	.permissions {
		align-self: center;
		margin-top: 0.5em;
		padding-left: 1.5em;
	}

	.sceneSelector {
		.bevel();
		padding: 0.5em;
		border-radius: var(--border-radius);
		background-color: var(--color-dark-fadest);
		height: 250px;
	}

	&.selectMode {
		.emboss();
	}

	.permissions {
		max-width: unset;
	}
	.alert {
		text-align: center;
		.icon {
			height: 1em;
			margin-right: 0.5em;
		}
	}
	:deep(ul) {
		list-style: decimal;
		list-style-position: inside;
		margin-left: 1em;
	}
}
.distortionEntry {
	transition: opacity 0.25s;
}
</style>

