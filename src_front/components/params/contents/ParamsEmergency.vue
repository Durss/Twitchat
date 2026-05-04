<template>
	<div class="paramsemergency parameterContent">
		<Icon name="emergency" />

		<p class="head">{{ $t("emergency.header") }}</p>
		<ParamItem class="enableBt" :paramData="param_enable" v-model="param_enable.value" />

		<div class="fadeHolder" :style="holderStyles">
			<section>
				<Splitter class="splitter">{{ $t("emergency.start.title") }}</Splitter>
				<ParamItem
					:paramData="param_autoEnableOnShieldmode"
					v-model="param_autoEnableOnShieldmode.value"
				/>
				<ParamItem
					:paramData="param_autoEnableOnFollowbot"
					v-model="param_autoEnableOnFollowbot.value"
				/>
				<div class="card-item">
					<ParamItem class="chatCommand" noBackground :paramData="param_chatCommand" />
					<ToggleBlock
						:title="$t('emergency.start.chatCommand_users')"
						:open="false"
						small
					>
						<PermissionsForm v-model="chatCommandPerms" />
					</ToggleBlock>
				</div>
				<div class="card-item labeled">
					<Icon name="mod" class="paramIcon" />
					<i18n-t scope="global" tag="p" keypath="emergency.start.also">
						<template #LINK>
							<a @click="$store.params.openParamsPage(contentAutomod)">{{
								$t("emergency.start.also_link")
							}}</a>
						</template>
					</i18n-t>
				</div>
				<div class="card-item">{{ $t("emergency.start.followbot_info") }}</div>
			</section>

			<section>
				<Splitter class="splitter">{{ $t("emergency.actions.title") }}</Splitter>
				<ParamItem
					:paramData="param_enableShieldMode"
					v-model="param_enableShieldMode.value"
					inverseChildrenCondition
				>
					<ParamItem
						noBackground
						:paramData="param_followersOnly"
						v-model="param_followersOnly.value"
						class="childItem"
					/>
					<ParamItem
						noBackground
						:paramData="param_subsOnly"
						v-model="param_subsOnly.value"
						class="childItem"
					/>
					<ParamItem
						noBackground
						:paramData="param_emotesOnly"
						v-model="param_emotesOnly.value"
						class="childItem"
					/>
					<ParamItem
						noBackground
						:paramData="param_slowMode"
						v-model="param_slowMode.value"
						class="childItem"
					/>
				</ParamItem>
				<ParamItem :paramData="param_noTrigger" v-model="param_noTrigger.value" />
				<ParamItem :paramData="param_autoTO" />

				<div v-if="!obsConnected">
					<div class="card-item alert">
						<Icon name="info" class="paramIcon" />
						<i18n-t
							scope="global"
							class="label"
							tag="span"
							keypath="emergency.actions.obs_connect"
						>
							<template #LINK>
								<a
									@click="
										$store.params.openParamsPage(
											contentConnexions,
											subcontentObs,
										)
									"
									>{{ $t("emergency.actions.obs_connect_link") }}</a
								>
							</template>
						</i18n-t>
					</div>
				</div>

				<template v-else>
					<div class="card-item labeled">
						<Icon name="list" class="paramIcon" />
						<p>{{ $t("emergency.actions.obs_scene") }}</p>
						<vue-select
							class="sourceSelector"
							label="label"
							:placeholder="$t('emergency.actions.obs_scene_select')"
							v-model="selectedOBSScene"
							:options="param_obsScene.listValues"
							:calculate-position="$placeDropdown"
							appendToBody
						></vue-select>
					</div>

					<div class="card-item labeled">
						<Icon name="show" class="paramIcon" />
						<p>
							{{ $t("emergency.actions.obs_sources") }} <br /><i>{{
								$t("emergency.actions.obs_sources_example")
							}}</i>
						</p>
						<vue-select
							class="sourceSelector"
							label="sourceName"
							:placeholder="$t('emergency.actions.obs_sources_select')"
							v-model="selectedOBSSources"
							:options="obsSources_filtered"
							:calculate-position="$placeDropdown"
							appendToBody
							multiple
						></vue-select>
					</div>
				</template>
			</section>
		</div>
	</div>
</template>

<script setup lang="ts">
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import OBSWebsocket, { type OBSSourceItem } from "@/utils/OBSWebsocket";
import { TwitchScopes } from "@/utils/twitch/TwitchScopes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { gsap } from "gsap/gsap-core";
import { computed, onBeforeMount, ref, watch, type CSSProperties } from "vue";
import Splitter from "../../Splitter.vue";
import ToggleBlock from "../../ToggleBlock.vue";
import ParamItem from "../ParamItem.vue";
import PermissionsForm from "../../PermissionsForm.vue";
import type IParameterContent from "./IParameterContent";
import Utils from "@/utils/Utils";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeEmergency as useStoreEmergency } from "@/store/emergency/storeEmergency";

const storeAuth = useStoreAuth();
const storeEmergency = useStoreEmergency();

const param_obsScene = ref<TwitchatDataTypes.ParameterData<string, string>>({
	type: "list",
	value: "",
});
const param_enable = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "global.enable",
});
const param_enableShieldMode = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "shieldMode",
	twitch_scopes: [TwitchScopes.SHIELD_MODE],
	labelKey: "emergency.params.shieldmode",
});
const param_chatCommand = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "!emergency",
	icon: "commands",
	labelKey: "emergency.params.chatCommand",
});
const param_autoEnableOnFollowbot = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "follow",
	tooltip: "",
	labelKey: "emergency.params.autoEnableOnFollowbot",
	tooltipKey: "emergency.params.autoEnableOnFollowbot_tt",
});
const param_autoEnableOnShieldmode = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: true,
	icon: "shieldMode",
	tooltip: "",
	twitch_scopes: [TwitchScopes.SHIELD_MODE],
	labelKey: "emergency.params.autoEnableOnShieldmode",
	tooltipKey: "emergency.params.autoEnableOnShieldmode_tt",
});
const param_slowMode = ref<TwitchatDataTypes.ParameterData<boolean, string, number>>({
	type: "boolean",
	value: false,
	icon: "timer",
	twitch_scopes: [TwitchScopes.SET_ROOM_SETTINGS],
	labelKey: "emergency.params.slowMode",
});
const param_slowModeDuration = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "number",
	value: 10,
	max: 1800,
	min: 1,
	labelKey: "emergency.params.slowModeDuration",
});
const param_followersOnly = ref<TwitchatDataTypes.ParameterData<boolean, string, number>>({
	type: "boolean",
	value: false,
	icon: "follow",
	twitch_scopes: [TwitchScopes.SET_ROOM_SETTINGS],
	labelKey: "emergency.params.followersOnly",
});
const param_followersOnlyDuration = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "number",
	value: 30,
	max: 129600,
	min: 1,
	labelKey: "emergency.params.followersOnlyDuration",
});
const param_subsOnly = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "sub",
	twitch_scopes: [TwitchScopes.SET_ROOM_SETTINGS],
	labelKey: "emergency.params.subsOnly",
});
const param_emotesOnly = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "emote",
	twitch_scopes: [TwitchScopes.SET_ROOM_SETTINGS],
	labelKey: "emergency.params.emotesOnly",
});
const param_autoTO = ref<TwitchatDataTypes.ParameterData<string[], string>>({
	type: "editablelist",
	value: [],
	longText: true,
	icon: "timeout",
	twitch_scopes: [TwitchScopes.SET_ROOM_SETTINGS],
	labelKey: "emergency.params.autoTO",
	placeholderKey: "emergency.params.autoTO_placeholder",
	max: 100,
	maxLength: 25,
});
const param_noTrigger = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: true,
	icon: "broadcast",
	labelKey: "emergency.params.noTrigger",
});
const obsSources = ref<OBSSourceItem[]>([]);
const selectedOBSSources = ref<OBSSourceItem[]>([]);
const selectedOBSScene = ref<TwitchatDataTypes.ParameterDataListValue<string> | null>(null);
const chatCommandPerms = ref<TwitchatDataTypes.PermissionsData>(
	Utils.getDefaultPermissions(true, true, false, false, false, false),
);

const holderStyles = computed<CSSProperties>(() => {
	return {
		opacity: param_enable.value.value === true ? 1 : 0.5,
		pointerEvents: param_enable.value.value === true ? "all" : "none",
	};
});

const obsConnected = computed<boolean>(() => {
	return OBSWebsocket.instance.connected.value;
});
const subcontentObs = computed<TwitchatDataTypes.ParamDeepSectionsStringType>(() => {
	return TwitchatDataTypes.ParamDeepSections.OBS;
});
const contentConnexions = computed<TwitchatDataTypes.ParameterPagesStringType>(() => {
	return TwitchatDataTypes.ParameterPages.CONNECTIONS;
});
const contentAutomod = computed<TwitchatDataTypes.ParameterPagesStringType>(() => {
	return TwitchatDataTypes.ParameterPages.AUTOMOD;
});
const userName = computed<string>(() => {
	return storeAuth.twitch.user.login;
});

const obsSources_filtered = computed<OBSSourceItem[]>(() => {
	let sources = obsSources.value.concat();
	sources = sources.filter((v) => {
		return selectedOBSSources.value.find((s) => s.sourceName == v.sourceName) == undefined;
	});
	return sources;
});

const finalData = computed<TwitchatDataTypes.EmergencyParamsData>(() => {
	return {
		enabled: param_enable.value.value,
		chatCmd: param_chatCommand.value.value,
		chatCmdPerms: chatCommandPerms.value,
		noTriggers: param_noTrigger.value.value === true,
		emotesOnly: param_emotesOnly.value.value === true,
		subOnly: param_subsOnly.value.value === true,
		slowMode: param_slowMode.value.value === true,
		followOnly: param_followersOnly.value.value === true,
		followOnlyDuration: param_followersOnlyDuration.value.value,
		slowModeDuration: param_slowModeDuration.value.value,
		toUsers: param_autoTO.value.value ?? [],
		obsScene: selectedOBSScene.value ? selectedOBSScene.value.value : "",
		obsSources: selectedOBSSources.value
			? selectedOBSSources.value.map((v) => v.sourceName)
			: [],
		autoEnableOnFollowbot: param_autoEnableOnFollowbot.value.value === true,
		autoEnableOnShieldmode: param_autoEnableOnShieldmode.value.value === true,
		enableShieldMode: param_enableShieldMode.value.value === true,
	};
});

function onNavigateBack(): boolean {
	return false;
}

function onShowItem(el: HTMLDivElement, done: () => void): void {
	gsap.killTweensOf(el);
	//Delay the opening so the animation occurs after the child's animation.
	//this way the user has more chances to see it appear than if all the
	//animations occured at the same time
	gsap.from(el, {
		height: 0,
		duration: 0.2,
		ease: "sine.out",
		delay: 0.5,
		onComplete: () => {
			done();
		},
	});
}

function onHideItem(el: HTMLDivElement, done: () => void): void {
	gsap.killTweensOf(el);
	gsap.to(el, {
		height: 0,
		duration: 0.2,
		ease: "sine.out",
		onComplete: () => {
			done();
		},
	});
}

/**
 * List OBS Scenes
 */
async function listOBSScenes(): Promise<void> {
	if (!OBSWebsocket.instance.connected.value) return;

	const list: TwitchatDataTypes.ParameterDataListValue<string>[] = [];
	const res = await OBSWebsocket.instance.getScenes();
	for (let i = 0; i < res.scenes.length; i++) {
		const scene = res.scenes[i] as { sceneIndex: number; sceneName: string };
		list.push({ label: scene.sceneName, value: scene.sceneName });
	}
	list.sort((a, b) => {
		if (a.label!.toLowerCase() < b.label!.toLowerCase()) return -1;
		if (a.label!.toLowerCase() > b.label!.toLowerCase()) return 1;
		return 0;
	});

	param_obsScene.value.listValues = list;
	//Prefill form from storage
	selectedOBSScene.value = list.find((v) => v.value == storeEmergency.params.obsScene) ?? null;
}

/**
 * Gets all the available OBS sources and sort them alphabetically
 */
async function listOBSSources(): Promise<void> {
	try {
		obsSources.value = await OBSWebsocket.instance.getSources();
	} catch (error) {
		//
	}
	obsSources.value.sort((a, b) => {
		if (a.sourceName.toLowerCase() < b.sourceName.toLowerCase()) return -1;
		if (a.sourceName.toLowerCase() > b.sourceName.toLowerCase()) return 1;
		return 0;
	});

	//Prefill form from storage
	const list = [];
	for (const el of obsSources.value) {
		if (
			(storeEmergency.params.obsSources as string[]).findIndex((v) => v === el.sourceName) >
			-1
		) {
			list.push(el);
		}
	}
	selectedOBSSources.value = list;
}

onBeforeMount(async () => {
	const storeParams = storeEmergency.params;
	param_enable.value.value = storeParams.enabled;
	param_noTrigger.value.value = storeParams.noTriggers;
	param_autoTO.value.value = storeParams.toUsers || [];
	param_subsOnly.value.value =
		storeParams.subOnly && TwitchUtils.hasScopes([TwitchScopes.SET_ROOM_SETTINGS]);
	param_emotesOnly.value.value =
		storeParams.emotesOnly && TwitchUtils.hasScopes([TwitchScopes.SET_ROOM_SETTINGS]);
	param_followersOnly.value.value =
		storeParams.followOnly && TwitchUtils.hasScopes([TwitchScopes.SET_ROOM_SETTINGS]);
	param_followersOnlyDuration.value.value = storeParams.followOnlyDuration;
	param_slowMode.value.value =
		storeParams.slowMode && TwitchUtils.hasScopes([TwitchScopes.SET_ROOM_SETTINGS]);
	param_slowModeDuration.value.value = storeParams.slowModeDuration;
	param_enableShieldMode.value.value = storeParams.enableShieldMode;

	param_slowMode.value.children = [param_slowModeDuration.value];
	param_followersOnly.value.children = [param_followersOnlyDuration.value];

	if (storeParams.chatCmd) {
		param_chatCommand.value.value = storeParams.chatCmd;
	}
	if (storeParams.chatCmdPerms) {
		chatCommandPerms.value = storeParams.chatCmdPerms;
	}
	if (storeParams.autoEnableOnFollowbot != undefined) {
		param_autoEnableOnFollowbot.value.value = storeParams.autoEnableOnFollowbot;
	}

	param_autoEnableOnShieldmode.value.value = TwitchUtils.hasScopes([TwitchScopes.SHIELD_MODE]);
	if (
		storeParams.autoEnableOnShieldmode != undefined &&
		TwitchUtils.hasScopes([TwitchScopes.SHIELD_MODE])
	) {
		param_autoEnableOnShieldmode.value.value = storeParams.autoEnableOnShieldmode;
	}

	await listOBSScenes();
	await listOBSSources();

	watch(
		() => finalData.value,
		() => {
			storeEmergency.setEmergencyParams(finalData.value);
		},
		{ deep: true },
	);

	watch(
		() => OBSWebsocket.instance.connected.value,
		() => {
			listOBSScenes();
			listOBSSources();
		},
	);
});

defineExpose<IParameterContent>({ onNavigateBack });
</script>

<style scoped lang="less">
.paramsemergency {
	.fadeHolder {
		transition: opacity 0.2s;

		section {
			.card-item {
				&.labeled {
					i {
						font-size: 0.8em;
					}
					p {
						display: inline;
					}
				}
			}
			.twitchParams {
				gap: 0.5em;
				display: flex;
				flex-direction: column;
			}

			.childItem {
				margin-top: 0.25em;
			}
		}
	}

	.paramIcon {
		height: 1em;
		margin-right: 0.5em;
		vertical-align: middle;
	}
}
</style>
