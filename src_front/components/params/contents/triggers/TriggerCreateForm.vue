<template>
	<div class="triggercreateform">
		<Icon class="loader" name="loader" v-if="showLoading" />

		<i18n-t
			scope="global"
			tag="div"
			class="card-item alert require"
			v-if="needObsConnect"
			keypath="triggers.obs.require"
		>
			<template #URL>
				<a @click="openOBS()">{{ $t("triggers.obs.require_url") }}</a>
			</template>
		</i18n-t>

		<i18n-t
			scope="global"
			tag="div"
			class="card-item alert require"
			v-if="needRewards"
			keypath="triggers.rewards.require"
		>
			<template #URL>
				<a @click="requestRewardsScope()">{{ $t("triggers.rewards.require_url") }}</a>
			</template>
		</i18n-t>

		<SearchForm
			class="searchForm"
			:debounceDelay="100"
			v-else-if="subtriggerList.length == 0"
			v-model="search"
		/>

		<div class="card-item noResult" v-if="search && eventCategories.length === 0">
			{{ $t("global.no_result") }}
		</div>

		<!-- Main menu -->
		<div :class="search ? 'list search' : 'list'" v-if="!selectedTriggerType">
			<div
				class="category"
				v-for="c in eventCategories"
				:key="c.category.labelKey"
				v-newflag="
					c.newDate
						? {
								date: c.newDate,
								id: 'triggerCategory_' + c.category.id + '_' + c.newDate,
							}
						: undefined
				"
			>
				<div class="head">
					<Icon :name="icon" v-for="icon in c.category.icons" />
					<span class="label">{{ $t(c.category.labelKey) }}</span>
				</div>

				<i18n-t
					scope="global"
					tag="div"
					class="card-item alert require"
					v-if="!musicServiceAvailable && isMusicCategory(c.category) && !search"
					keypath="triggers.music.require"
				>
					<template #URL>
						<a @click="openConnexions()">{{ $t("triggers.music.require_url") }}</a>
					</template>
				</i18n-t>

				<i18n-t
					scope="global"
					tag="div"
					class="card-item alert require"
					v-if="!obsConnected && isOBSCategory(c.category) && !search"
					keypath="triggers.obs.require"
				>
					<template #URL>
						<a @click="openOBS()">{{ $t("triggers.obs.require_url") }}</a>
					</template>
				</i18n-t>

				<i18n-t
					scope="global"
					tag="div"
					class="card-item alert require"
					v-if="!hasCounterOrValue && isCountersAndValueCategory(c.category) && !search"
					keypath="triggers.count.require"
				>
					<template #URL_COUNTERS>
						<a @click="openCounters()">{{ $t("triggers.count.require_counters") }}</a>
					</template>
					<template #URL_VALUES>
						<a @click="openValues()">{{ $t("triggers.count.require_values") }}</a>
					</template>
				</i18n-t>

				<div
					v-for="e in c.events"
					:key="e.value"
					:class="getTriggerClasses(e)"
					v-newflag="
						e.newDate
							? { date: e.newDate, id: 'triggerEvent_' + e.value + '_' + e.newDate }
							: undefined
					"
				>
					<TTButton
						class="triggerBt"
						:icon="e.icon"
						:premium="e.premium === true"
						:disabled="disabledEntry(e)"
						v-tooltip="
							disabledEntry(e)
								? $t(e.disabledReasonLabelKey ?? 'triggers.noChannelPoints_tt')
								: ''
						"
						@click.capture="disabledEntry(e) ? requestScope(e) : selectTriggerType(e)"
					>
						{{ $t(e.labelKey!) }}
					</TTButton>
				</div>
			</div>
		</div>

		<!-- Sub menu (rewards, counters, obs sources and scenes,... ) -->
		<div class="sublist">
			<template v-for="item in subtriggerList">
				<component
					:is="item.subValues ? 'div' : 'button'"
					:class="item.icon ? 'subEventBt hasIcon' : 'subEventBt'"
					@click="selectSubType(item)"
				>
					<img
						class="icon"
						v-if="item.icon"
						:src="item.icon"
						:style="
							!item.background
								? {}
								: { backgroundColor: item.background, filter: 'none' }
						"
					/>
					<span class="label">{{ item.label }}</span>
					<span class="small" v-if="item.labelSmall">{{ item.labelSmall }}</span>
				</component>
				<template v-if="item.subValues">
					<button
						v-for="subItem in item.subValues"
						:class="
							item.icon
								? 'subEventBt subSubEventBt hasIcon'
								: 'subEventBt subSubEventBt'
						"
						@click="selectSubType(subItem, item)"
					>
						<img
							class="icon"
							v-if="subItem.icon"
							:src="subItem.icon"
							:style="
								!subItem.background
									? {}
									: { backgroundColor: subItem.background, filter: 'none' }
							"
						/>
						<span class="label">{{ subItem.label }}</span>
						<span class="small" v-if="subItem.labelSmall">{{
							subItem.labelSmall
						}}</span>
					</button>
				</template>
			</template>
		</div>
	</div>
</template>

<script setup lang="ts">
import TTButton from "@/components/TTButton.vue";
import { asset } from "@/composables/useAsset";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeCounters as useStoreCounters } from "@/store/counters/storeCounters";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { storeMain as useStoreMain } from "@/store/storeMain";
import { storeTriggers as useStoreTriggers } from "@/store/triggers/storeTriggers";
import { storeValues as useStoreValues } from "@/store/values/storeValues";
import type { TriggerEventTypeCategory } from "@/types/TriggerActionDataTypes";
import {
	ANY_COUNTER,
	ANY_OBS_SCENE,
	ANY_VALUE,
	TriggerEventTypeCategories,
	TriggerTypes,
	TriggerTypesDefinitionList,
	type TriggerData,
	type TriggerTypeDefinition,
} from "@/types/TriggerActionDataTypes";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import type { OBSInputItem, OBSSceneItem, OBSSourceItem } from "@/utils/OBSWebsocket";
import OBSWebsocket from "@/utils/OBSWebsocket";
import Utils from "@/utils/Utils";
import GoXLRSocket from "@/utils/goxlr/GoXLRSocket";
import SpotifyHelper from "@/utils/music/SpotifyHelper";
import { TwitchScopes } from "@/utils/twitch/TwitchScopes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { computed, onBeforeMount, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import SearchForm from "../SearchForm.vue";

const { t, availableLocales } = useI18n();
const { getAsset } = asset();
const storeAuth = useStoreAuth();
const storeCounters = useStoreCounters();
const storeValues = useStoreValues();
const storeTriggers = useStoreTriggers();
const storeParams = useStoreParams();
const storeMain = useStoreMain();

const props = withDefaults(
	defineProps<{
		folderTarget?: string;
		obsScenes?: OBSSceneItem[];
		obsSources?: OBSSourceItem[];
		obsInputs?: OBSInputItem[];
		rewards?: TwitchDataTypes.Reward[];
	}>(),
	{
		folderTarget: "",
		obsScenes: () => [],
		obsSources: () => [],
		obsInputs: () => [],
		rewards: () => [],
	},
);

const emit = defineEmits<{
	selectTrigger: [trigger: TriggerData];
	updateHeader: [key: string];
}>();

const search = ref("");
const showLoading = ref(false);
const needRewards = ref(false);
const needObsConnect = ref(false);
const selectedTriggerType = ref<TriggerTypeDefinition | null>(null);
const subtriggerList = ref<TriggerEntry[]>([]);
const eventCategories = ref<TriggerCategory[]>([]);

let temporaryTrigger: TriggerData | null = null;

const musicServiceAvailable = computed((): boolean => {
	return SpotifyHelper.instance.connected.value;
});

const obsConnected = computed((): boolean => {
	return OBSWebsocket.instance.connected.value;
});

const hasCounterOrValue = computed((): boolean => {
	return storeCounters.counterList.length > 0 || storeValues.valueList.length > 0;
});

const isGoxlrMini = computed((): boolean => {
	return GoXLRSocket.instance.isGoXLRMini.value;
});

const hasChannelPoints = computed((): boolean => {
	return storeAuth.twitch.user.is_affiliate || storeAuth.twitch.user.is_partner;
});

function getTriggerClasses(e: TriggerTypeDefinition): string[] {
	const res: string[] = ["item"];
	if (e.beta) res.push("beta");
	return res;
}

function isMusicCategory(category: TriggerEventTypeCategory): boolean {
	return category.id == TriggerEventTypeCategories.MUSIC.id;
}

function isOBSCategory(category: TriggerEventTypeCategory): boolean {
	return category.id == TriggerEventTypeCategories.OBS.id;
}

function isCountersAndValueCategory(category: TriggerEventTypeCategory): boolean {
	return category.id == TriggerEventTypeCategories.COUNTER_VALUE.id;
}

onBeforeMount(() => {
	populate();
});

watch(
	() => props.obsSources,
	() => {
		if (selectedTriggerType.value) {
			selectTriggerType(selectedTriggerType.value);
		}
	},
);
watch(
	() => props.rewards,
	() => {
		if (selectedTriggerType.value) {
			selectTriggerType(selectedTriggerType.value);
		}
	},
);

watch(
	() => storeAuth.newScopesToRequest,
	() => {
		populate();
	},
);
watch(search, () => {
	onSearch();
});

function populate(showPrivate: boolean = false): void {
	eventCategories.value = [];
	const triggers = TriggerTypesDefinitionList().concat();
	const locales = availableLocales;
	let triggerTypeList: TriggerEntry[] = triggers
		.filter(
			(v) =>
				(!showPrivate && v.private !== true) || (showPrivate == true && v.private === true),
		)
		.map((v) => {
			return {
				label: t(v.labelKey),
				searchTerms: locales.map((l) => t(v.labelKey, { locale: l })),
				value: v.value,
				trigger: v,
				icon: getAsset("icons/" + v.icon + ".svg"),
				isCategory: false,
				newDate: v.newDate,
			};
		});

	if (search.value && !showPrivate) {
		const premiumSearch = search.value.toLowerCase() == "premium";
		const reg = new RegExp(search.value, "i");
		triggerTypeList = triggerTypeList.filter((v) => {
			if (premiumSearch && v.trigger?.premium === true) return true;
			let matches = false;
			v.searchTerms.forEach((v) => {
				matches ||= reg.test(v);
			});
			return matches;
		});
	}
	if (triggerTypeList.length === 0) return;

	if (!storeAuth.twitch.user.is_affiliate && !storeAuth.twitch.user.is_partner) {
		triggerTypeList = triggerTypeList.filter((v) => {
			return (
				v.value != TriggerTypes.REWARD_REDEEM &&
				v.value != TriggerTypes.COMMUNITY_CHALLENGE_PROGRESS &&
				v.value != TriggerTypes.COMMUNITY_CHALLENGE_COMPLETE
			);
		});
	}

	if (isGoxlrMini.value) {
		triggerTypeList = triggerTypeList.filter(
			(v) =>
				v.trigger?.goxlrMiniCompatible === true ||
				v.trigger?.goxlrMiniCompatible === undefined,
		);
	}

	let currCat = triggerTypeList[0]!.trigger!.category;
	let catEvents: TriggerTypeDefinition[] = [];
	for (let i = 0; i < triggerTypeList.length; i++) {
		const ev = triggerTypeList[i]!;
		if (!ev.trigger) continue;
		if (ev.trigger.category != currCat || i === triggerTypeList.length - 1) {
			if (i === triggerTypeList.length - 1) catEvents.push(ev.trigger);
			const cat: TriggerCategory = {
				category: catEvents[0]!.category,
				events: catEvents,
			};
			eventCategories.value.push(cat);
			catEvents = [ev.trigger];
		} else {
			catEvents.push(ev.trigger);
		}
		currCat = ev.trigger.category;
	}

	eventCategories.value.forEach((v) => {
		let newDate = 0;
		v.events.forEach((w) => {
			if (w.newDate) newDate = Math.max(newDate, w.newDate);
		});
		if (newDate > 0) v.newDate = newDate;
	});
}

function disabledEntry(e: TriggerTypeDefinition): boolean {
	if (e.disabled === true) return true;

	if (
		e.value == TriggerTypes.REWARD_REDEEM &&
		(!hasChannelPoints.value || !TwitchUtils.hasScopes([TwitchScopes.LIST_REWARDS]))
	)
		return true;
	if (
		e.value == TriggerTypes.POLL_RESULT &&
		(!hasChannelPoints.value || !TwitchUtils.hasScopes([TwitchScopes.MANAGE_POLLS]))
	)
		return true;
	if (
		e.value == TriggerTypes.PREDICTION_RESULT &&
		(!hasChannelPoints.value || !TwitchUtils.hasScopes([TwitchScopes.MANAGE_PREDICTIONS]))
	)
		return true;
	if (
		e.value == TriggerTypes.SHIELD_MODE_ON &&
		!TwitchUtils.hasScopes([TwitchScopes.SHIELD_MODE])
	)
		return true;
	if (
		e.value == TriggerTypes.SHIELD_MODE_OFF &&
		!TwitchUtils.hasScopes([TwitchScopes.SHIELD_MODE])
	)
		return true;
	if (e.value == TriggerTypes.TIMEOUT && !TwitchUtils.hasScopes([TwitchScopes.EDIT_BANNED]))
		return true;
	if (e.value == TriggerTypes.BAN && !TwitchUtils.hasScopes([TwitchScopes.EDIT_BANNED]))
		return true;
	if (e.value == TriggerTypes.UNBAN && !TwitchUtils.hasScopes([TwitchScopes.EDIT_BANNED]))
		return true;
	if (e.value == TriggerTypes.VIP && !TwitchUtils.hasScopes([TwitchScopes.EDIT_VIPS]))
		return true;
	if (e.value == TriggerTypes.UNVIP && !TwitchUtils.hasScopes([TwitchScopes.EDIT_VIPS]))
		return true;
	if (e.value == TriggerTypes.MOD && !TwitchUtils.hasScopes([TwitchScopes.EDIT_MODS]))
		return true;
	if (e.value == TriggerTypes.UNMOD && !TwitchUtils.hasScopes([TwitchScopes.EDIT_MODS]))
		return true;
	if (
		e.value == TriggerTypes.STREAM_INFO_UPDATE &&
		!TwitchUtils.hasScopes([TwitchScopes.SET_STREAM_INFOS])
	)
		return true;
	if (
		e.value == TriggerTypes.FOLLOWED_STREAM_ONLINE &&
		!TwitchUtils.hasScopes([TwitchScopes.LIST_FOLLOWINGS])
	)
		return true;
	if (
		e.value == TriggerTypes.FOLLOWED_STREAM_OFFLINE &&
		!TwitchUtils.hasScopes([TwitchScopes.LIST_FOLLOWINGS])
	)
		return true;
	if (
		(e.value == TriggerTypes.AD_APPROACHING ||
			e.value == TriggerTypes.AD_STARTED ||
			e.value == TriggerTypes.AD_COMPLETE) &&
		!TwitchUtils.hasScopes([TwitchScopes.ADS_READ])
	)
		return true;

	if (
		!TwitchUtils.hasScopes([TwitchScopes.READ_HYPE_TRAIN]) &&
		(e.value == TriggerTypes.HYPE_TRAIN_CANCELED ||
			e.value == TriggerTypes.HYPE_TRAIN_APPROACHING ||
			e.value == TriggerTypes.HYPE_TRAIN_COOLDOWN ||
			e.value == TriggerTypes.HYPE_TRAIN_END ||
			e.value == TriggerTypes.HYPE_TRAIN_PROGRESS ||
			e.value == TriggerTypes.HYPE_TRAIN_START)
	)
		return true;

	if (
		e.value == TriggerTypes.MANY_REPLIES &&
		storeParams.features.manyRepliesAlert.value !== true
	)
		return true;

	return false;
}

function requestScope(e: TriggerTypeDefinition): void {
	if (
		e.value == TriggerTypes.REWARD_REDEEM &&
		hasChannelPoints.value &&
		!TwitchUtils.requestScopes([TwitchScopes.LIST_REWARDS])
	)
		return;
	if (
		e.value == TriggerTypes.POLL_RESULT &&
		hasChannelPoints.value &&
		!TwitchUtils.requestScopes([TwitchScopes.MANAGE_POLLS])
	)
		return;
	if (
		e.value == TriggerTypes.PREDICTION_RESULT &&
		hasChannelPoints.value &&
		!TwitchUtils.requestScopes([TwitchScopes.MANAGE_PREDICTIONS])
	)
		return;
	if (
		e.value == TriggerTypes.SHIELD_MODE_ON &&
		!TwitchUtils.requestScopes([TwitchScopes.SHIELD_MODE])
	)
		return;
	if (
		e.value == TriggerTypes.SHIELD_MODE_OFF &&
		!TwitchUtils.requestScopes([TwitchScopes.SHIELD_MODE])
	)
		return;
	if (e.value == TriggerTypes.TIMEOUT && !TwitchUtils.requestScopes([TwitchScopes.EDIT_BANNED]))
		return;
	if (e.value == TriggerTypes.BAN && !TwitchUtils.requestScopes([TwitchScopes.EDIT_BANNED]))
		return;
	if (e.value == TriggerTypes.UNBAN && !TwitchUtils.requestScopes([TwitchScopes.EDIT_BANNED]))
		return;
	if (e.value == TriggerTypes.VIP && !TwitchUtils.requestScopes([TwitchScopes.EDIT_VIPS])) return;
	if (e.value == TriggerTypes.UNVIP && !TwitchUtils.requestScopes([TwitchScopes.EDIT_VIPS]))
		return;
	if (e.value == TriggerTypes.MOD && !TwitchUtils.requestScopes([TwitchScopes.EDIT_MODS])) return;
	if (e.value == TriggerTypes.UNMOD && !TwitchUtils.requestScopes([TwitchScopes.EDIT_MODS]))
		return;
	if (
		e.value == TriggerTypes.STREAM_INFO_UPDATE &&
		!TwitchUtils.requestScopes([TwitchScopes.SET_STREAM_INFOS])
	)
		return;
	if (
		e.value == TriggerTypes.FOLLOWED_STREAM_ONLINE &&
		!TwitchUtils.requestScopes([TwitchScopes.LIST_FOLLOWINGS])
	)
		return;
	if (
		e.value == TriggerTypes.FOLLOWED_STREAM_OFFLINE &&
		!TwitchUtils.requestScopes([TwitchScopes.LIST_FOLLOWINGS])
	)
		return;
	if (
		(e.value == TriggerTypes.AD_APPROACHING ||
			e.value == TriggerTypes.AD_STARTED ||
			e.value == TriggerTypes.AD_COMPLETE) &&
		!TwitchUtils.requestScopes([TwitchScopes.ADS_READ])
	)
		return;

	if (
		(e.value == TriggerTypes.HYPE_TRAIN_CANCELED ||
			e.value == TriggerTypes.HYPE_TRAIN_APPROACHING ||
			e.value == TriggerTypes.HYPE_TRAIN_COOLDOWN ||
			e.value == TriggerTypes.HYPE_TRAIN_END ||
			e.value == TriggerTypes.HYPE_TRAIN_PROGRESS ||
			e.value == TriggerTypes.HYPE_TRAIN_START) &&
		!TwitchUtils.requestScopes([TwitchScopes.READ_HYPE_TRAIN])
	)
		return;

	if (
		e.value == TriggerTypes.MANY_REPLIES &&
		storeParams.features.manyRepliesAlert.value !== true
	) {
		storeMain.tempStoreValue = storeParams.features.manyRepliesAlert.id;
		storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.FEATURES);
	}
}

async function selectTriggerType(e: TriggerTypeDefinition): Promise<void> {
	selectedTriggerType.value = e;

	subtriggerList.value = [];
	if (e.value == TriggerTypes.REWARD_REDEEM) {
		if (!TwitchUtils.hasScopes([TwitchScopes.LIST_REWARDS])) {
			needRewards.value = true;
			return;
		} else {
			needRewards.value = false;
			const list = props.rewards.map((v): TriggerEntry => {
				return {
					label: v.title,
					searchTerms: [v.title],
					isCategory: false,
					value: v.id,
					background: v.background_color,
					labelSmall: v.cost > 0 ? v.cost + "pts" : "",
					icon: v.image?.url_2x ?? getAsset("icons/channelPoints.svg"),
				};
			});
			subtriggerList.value = list;
			emit("updateHeader", "triggers.header_select_reward");
		}
	} else if (e.value == TriggerTypes.OBS_SCENE) {
		if (!OBSWebsocket.instance.connected.value) {
			needObsConnect.value = true;
			return;
		} else {
			needObsConnect.value = false;
			const list = props.obsScenes.map((v): TriggerEntry => {
				return {
					label: v.sceneName,
					searchTerms: [v.sceneName],
					value: v.sceneName,
					icon: "",
					isCategory: false,
				};
			});
			const defaultName = t("triggers.obs.anyScene");
			list.unshift({
				label: defaultName,
				searchTerms: [defaultName],
				value: ANY_OBS_SCENE,
				icon: "",
				isCategory: false,
			});
			subtriggerList.value = list;
			emit("updateHeader", "triggers.header_select_obs_scene");
		}
	} else if (e.value == TriggerTypes.OBS_SOURCE_OFF || e.value == TriggerTypes.OBS_SOURCE_ON) {
		if (!OBSWebsocket.instance.connected.value) {
			needObsConnect.value = true;
			return;
		} else {
			needObsConnect.value = false;
			const list = props.obsSources.map((v): TriggerEntry => {
				return {
					label: v.sourceName,
					searchTerms: [v.sourceName],
					value: v.sourceName,
					icon: "",
					isCategory: false,
				};
			});
			subtriggerList.value = list;
			emit("updateHeader", "triggers.header_select_obs_source");
		}
	} else if (e.value == TriggerTypes.OBS_FILTER_OFF || e.value == TriggerTypes.OBS_FILTER_ON) {
		if (!OBSWebsocket.instance.connected.value) {
			needObsConnect.value = true;
			return;
		} else {
			needObsConnect.value = false;
			showLoading.value = true;

			let list: TriggerEntry[] = props.obsSources.map((v) => {
				return {
					label: v.sourceName,
					searchTerms: [v.sourceName],
					value: v.sourceName,
					isCategory: false,
					icon: "",
				};
			});
			list = list.concat(
				props.obsInputs.map((v) => {
					return {
						label: v.inputName,
						searchTerms: [v.inputName],
						value: v.inputName,
						isCategory: false,
						icon: "",
					};
				}),
			);

			const entriesDone: { [key: string]: boolean } = {};
			list = list.filter((v) => {
				const key = v.value.toLowerCase();
				if (entriesDone[key] === true) return false;
				entriesDone[key] = true;
				return true;
			});

			for (let i = 0; i < list.length; i++) {
				const item = list[i]!;
				let filters = await OBSWebsocket.instance.getSourceFilters(item.value);
				if (filters.length === 0) {
					list.splice(i, 1);
					i--;
					continue;
				}
				item.subValues = filters.map((v) => {
					return {
						label: v.filterName,
						searchTerms: [v.filterName],
						value: v.filterName,
						icon: "",
						isCategory: false,
					};
				});
			}

			showLoading.value = false;
			subtriggerList.value = list;
			emit("updateHeader", "triggers.header_select_obs_filter");
		}
	} else if (
		e.value == TriggerTypes.OBS_INPUT_MUTE ||
		e.value == TriggerTypes.OBS_INPUT_UNMUTE ||
		e.value == TriggerTypes.OBS_PLAYBACK_PAUSED ||
		e.value == TriggerTypes.OBS_PLAYBACK_RESTARTED ||
		e.value == TriggerTypes.OBS_PLAYBACK_NEXT ||
		e.value == TriggerTypes.OBS_PLAYBACK_PREVIOUS ||
		e.value == TriggerTypes.OBS_PLAYBACK_STARTED ||
		e.value == TriggerTypes.OBS_PLAYBACK_ENDED
	) {
		if (!OBSWebsocket.instance.connected.value) {
			needObsConnect.value = true;
			return;
		} else {
			needObsConnect.value = false;
			let filteredList = props.obsInputs;

			if (
				e.value != TriggerTypes.OBS_INPUT_MUTE &&
				e.value != TriggerTypes.OBS_INPUT_UNMUTE
			) {
				filteredList = filteredList.filter((v) => {
					return (
						v.inputKind === "ffmpeg_source" ||
						v.inputKind === "image_source" ||
						v.inputKind == "vlc_source"
					);
				});
			}

			const list = filteredList.map((v): TriggerEntry => {
				return {
					label: v.inputName,
					searchTerms: [v.inputName],
					value: v.inputName,
					icon: "",
					isCategory: false,
				};
			});
			subtriggerList.value = list;
			emit("updateHeader", "triggers.header_select_obs_input");
		}
	} else if (
		e.value == TriggerTypes.COUNTER_EDIT ||
		e.value == TriggerTypes.COUNTER_ADD ||
		e.value == TriggerTypes.COUNTER_DEL ||
		e.value == TriggerTypes.COUNTER_LOOPED ||
		e.value == TriggerTypes.COUNTER_MAXED ||
		e.value == TriggerTypes.COUNTER_MINED
	) {
		listCounters();
		emit("updateHeader", "triggers.header_select_counter");
	}

	if (e.value == TriggerTypes.VALUE_UPDATE) {
		listValues();
		emit("updateHeader", "triggers.header_select_value");
	}

	if (e.value) {
		temporaryTrigger = {
			actions: temporaryTrigger ? temporaryTrigger.actions : [],
			enabled: true,
			id: Utils.getUUID(),
			type: e.value,
			created_at: Date.now(),
		};

		if (subtriggerList.value.length == 0) {
			storeTriggers.addTrigger(temporaryTrigger, props.folderTarget);
			emit("selectTrigger", temporaryTrigger);
		}
	}
}

function selectSubType(entry: TriggerEntry, parentItem?: TriggerEntry): void {
	if (!selectedTriggerType.value) return;

	temporaryTrigger = {
		actions: temporaryTrigger ? temporaryTrigger.actions : [],
		enabled: true,
		id: Utils.getUUID(),
		type: selectedTriggerType.value.value,
		created_at: Date.now(),
	};

	switch (selectedTriggerType.value.value) {
		case TriggerTypes.REWARD_REDEEM:
			temporaryTrigger.rewardId = entry.value;
			break;

		case TriggerTypes.OBS_SCENE:
			temporaryTrigger.obsScene = entry.value;
			break;

		case TriggerTypes.OBS_SOURCE_ON:
		case TriggerTypes.OBS_SOURCE_OFF:
			temporaryTrigger.obsSource = entry.value;
			break;

		case TriggerTypes.OBS_FILTER_ON:
		case TriggerTypes.OBS_FILTER_OFF:
			temporaryTrigger.obsSource = parentItem!.value;
			temporaryTrigger.obsFilter = entry.value;
			break;

		case TriggerTypes.OBS_PLAYBACK_STARTED:
		case TriggerTypes.OBS_PLAYBACK_ENDED:
		case TriggerTypes.OBS_PLAYBACK_PAUSED:
		case TriggerTypes.OBS_PLAYBACK_RESTARTED:
		case TriggerTypes.OBS_PLAYBACK_NEXT:
		case TriggerTypes.OBS_PLAYBACK_PREVIOUS:
		case TriggerTypes.OBS_INPUT_MUTE:
		case TriggerTypes.OBS_INPUT_UNMUTE:
			temporaryTrigger.obsInput = entry.value;
			break;

		case TriggerTypes.COUNTER_EDIT:
		case TriggerTypes.COUNTER_ADD:
		case TriggerTypes.COUNTER_DEL:
		case TriggerTypes.COUNTER_LOOPED:
		case TriggerTypes.COUNTER_MAXED:
		case TriggerTypes.COUNTER_MINED:
			temporaryTrigger.counterId = entry.value;
			break;

		case TriggerTypes.VALUE_UPDATE:
			temporaryTrigger.valueId = entry.value;
			break;
	}

	storeTriggers.addTrigger(temporaryTrigger, props.folderTarget);
	emit("selectTrigger", temporaryTrigger);
}

function openConnexions(): void {
	storeParams.openParamsPage(
		TwitchatDataTypes.ParameterPages.CONNECTIONS,
		TwitchatDataTypes.ParamDeepSections.SPOTIFY,
	);
}

function openOBS(): void {
	storeParams.openParamsPage(
		TwitchatDataTypes.ParameterPages.CONNECTIONS,
		TwitchatDataTypes.ParamDeepSections.OBS,
	);
}

function openCounters(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.COUNTERS);
}

function openValues(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.VALUES);
}

function requestRewardsScope(): void {
	storeAuth.requestTwitchScopes([TwitchScopes.LIST_REWARDS]);
}

function listCounters(): void {
	const list = storeCounters.counterList
		.sort((a, b) => {
			if (a.name < b.name) return -1;
			if (a.name > b.name) return 1;
			return 0;
		})
		.map((v): TriggerEntry => {
			return {
				label: v.name,
				searchTerms: [v.name],
				value: v.id,
				icon: "",
				isCategory: false,
			};
		});
	const defaultName = t("triggers.count.any_counter");
	list.unshift({
		label: defaultName,
		searchTerms: [defaultName],
		value: ANY_COUNTER,
		icon: "",
		isCategory: false,
	});
	subtriggerList.value = list;
}

function listValues(): void {
	const list = storeValues.valueList
		.sort((a, b) => {
			if (a.name < b.name) return -1;
			if (a.name > b.name) return 1;
			return 0;
		})
		.map((v): TriggerEntry => {
			return {
				label: v.name,
				searchTerms: [v.name],
				value: v.id,
				icon: "",
				isCategory: false,
			};
		});
	const defaultName = t("triggers.count.any_value");
	list.unshift({
		label: defaultName,
		searchTerms: [defaultName],
		value: ANY_VALUE,
		icon: "",
		isCategory: false,
	});
	subtriggerList.value = list;
}

function onSearch(): void {
	populate();
	Utils.sha256(search.value).then((hash) => {
		if (hash === "09f0654a10e2dc4327e5bb0a2d8c01d703af81422d69b1d1def04bd754b47739") {
			populate(true);
		}
	});
}

interface TriggerEntry {
	label: string;
	searchTerms: string[];
	labelSmall?: string;
	value: string;
	subValues?: TriggerEntry[];
	background?: string;
	trigger?: TriggerTypeDefinition;
	isCategory: boolean;
	icon: string;
	newDate?: number;
}

interface TriggerCategory {
	category: TriggerEventTypeCategory;
	events: TriggerTypeDefinition[];
	newDate?: number;
}
</script>

<style scoped lang="less">
.triggercreateform {
	.createBt {
		margin: auto;
		display: block;
	}

	.loader {
		height: 2em;
		width: 2em;
		margin: auto;
		display: block;
	}

	.searchForm {
		margin-bottom: 1em;
	}

	.noResult {
		margin: auto;
		text-align: center;
		font-style: italic;
	}

	.list {
		display: flex;
		flex-direction: column;
		gap: 1.5em;
		.category {
			position: relative;
			width: 100%;
			.require {
				font-size: 0.8em;
				text-align: center;
				margin-bottom: 1em;
			}

			.head {
				font-size: 1.2em;
				margin-bottom: 0.5em;
				.icon {
					height: 1em;
					margin-right: 0.5em;
				}
				.label {
					font-weight: bold;
				}
			}
			&.newFlag {
				border: 0;
				border-radius: var(--border-radius);
				padding: 0.25em;
				background-color: var(--color-secondary-fader);
			}
		}

		.item {
			position: relative;
			.toggle {
				position: absolute;
				right: 0.5em;
				top: 50%;
				transform: translateY(calc(-50% - 2px));
				z-index: 1;
			}
			&.beta {
				:deep(.button) {
					padding-left: 3em;
					overflow: hidden;

					&::before {
						content: "beta";
						position: absolute;
						left: 0;
						color: var(--color-light);
						background-color: var(--color-secondary);
						height: 100%;
						display: flex;
						align-items: center;
						padding: 0 0.35em;
						font-size: 0.8em;
						font-family: var(--font-nunito);
						text-transform: uppercase;
						z-index: 1;
					}
				}
			}
		}

		.triggerBt {
			width: 100%;
			margin-bottom: 2px;
			box-shadow: 0px 1px 1px rgba(0, 0, 0, 0.25);
			padding: 0.25em 0.5em;
			flex-wrap: nowrap;
			:deep(.label) {
				flex-grow: 1;
				display: flex;
				flex-direction: row;
				justify-content: space-between;
			}
			:deep(.icon) {
				z-index: 1;
				height: 1.5em;
				width: 1.5em;
				object-fit: fill;
			}
			:deep(.cost) {
				font-size: 0.8em;
				font-style: italic;
				margin-right: 3em;
			}

			&.subItem.hasIcon {
				&:before {
					content: "";
					width: 2em;
					height: 100%;
					left: 0;
					position: absolute;
					background-color: var(--color-light);
				}
				:deep(.label) {
					padding-left: 0.5em;
				}
			}
		}
	}

	.sublist {
		display: flex;
		flex-direction: column;
		gap: 4px;

		.subEventBt {
			box-shadow: 0px 1px 1px rgba(0, 0, 0, 0.25);
			color: var(--color-light);
			// background-color: var(--color-primary);
			background-color: var(--color-button);
			border-radius: var(--border-radius);
			padding: 0 0.5em;
			display: flex;
			flex-direction: row;
			align-items: center;
			overflow: hidden;
			min-height: 1.5em;
			transition:
				color 0.25s,
				background-color 0.25s;
			&.hasIcon {
				padding-left: 0;
			}
			&.subSubEventBt {
				margin: 0 1em;
				justify-content: stretch;
			}
			.icon {
				margin-right: 0.5em;
				height: 1.5em;
				width: 1.5em;
				max-width: 1.5em;
				padding: 0.25em;
				object-fit: fill;
			}
			.label {
				flex-grow: 1;
				text-align: left;
				color: var(--color-text);
			}
			.small {
				font-size: 0.7em;
				font-style: italic;
				color: var(--color-text);
			}

			&:is(div) {
				//Used for OBS filter section names
				//Filters are listed by source item, this represents a source item
				//that has all its filters listed below it
				background-color: var(--color-light-fade);
				&:not(:first-of-type) {
					margin-top: 1em;
				}
				.label {
					font-weight: bold;
				}
			}
			&:not(div):hover {
				// background-color: var(--color-primary-light);
				background-color: var(--color-button-light);
			}
		}
	}
}
</style>
