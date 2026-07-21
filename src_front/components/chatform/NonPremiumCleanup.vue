<template>
	<div class="nonpremiumcleanup modal">
		<div class="dimmer" ref="dimmer" @click="close()"></div>
		<div class="holder" ref="holder">
			<div class="head">
				<h1 class="title"><Icon name="alert" /> {{ t("premium.cleanup.title") }}</h1>
				<ClearButton @click="close()" v-if="!storeMain.nonPremiumLimitExceeded" />
			</div>
			<div class="content">
				<span class="header">{{ t("premium.cleanup.description") }}</span>
				<TTButton icon="premium" class="premiumBt" big premium @click="openPremium()">{{
					t("premium.become_premiumBt")
				}}</TTButton>

				<ToggleBlock
					:icons="['broadcast']"
					:title="t('params.categories.triggers')"
					:alert="!triggersOK"
					:open="!triggersOK"
					v-if="storeTriggers.triggerList.length > 0"
				>
					<template #right_actions>
						<Icon :name="triggersOK ? 'checkmark' : 'alert'" />
						<strong>{{ triggerCount }}/{{ config.MAX_TRIGGERS }}</strong>
					</template>
					<div class="itemList">
						<TriggerListFolderItem
							v-model:items="folderTriggerList"
							:noEdit="true"
							:forceDisableOption="true"
							@change="onToggleTrigger()"
						/>
					</div>
				</ToggleBlock>

				<ToggleBlock
					:icons="['count']"
					:title="t('params.categories.counters')"
					:alert="!countersOK"
					:open="!countersOK"
					v-if="storeCounters.counterList.length > 0"
				>
					<template #right_actions>
						<Icon :name="countersOK ? 'checkmark' : 'alert'" />
						<strong
							>{{
								storeCounters.counterList.filter((v) => v.enabled !== false).length
							}}/{{ config.MAX_COUNTERS }}</strong
						>
					</template>
					<div class="itemList">
						<div
							class="rowItem"
							v-for="item in storeCounters.counterList"
							@click="toggleCounter(item)"
						>
							<span class="label"><Icon name="count" />{{ item.name }}</span>
							<div class="toggle">
								<ToggleButton v-model="item.enabled" @change="toggleCounter()" />
							</div>
						</div>
					</div>
				</ToggleBlock>

				<ToggleBlock
					:icons="['placeholder']"
					:title="t('params.categories.values')"
					:alert="!valuesOK"
					:open="!valuesOK"
					v-if="storeValues.valueList.length > 0"
				>
					<template #right_actions>
						<Icon :name="valuesOK ? 'checkmark' : 'alert'" />
						<strong
							>{{
								storeValues.valueList.filter((v) => v.enabled !== false).length
							}}/{{ config.MAX_VALUES }}</strong
						>
					</template>
					<div class="itemList">
						<div
							class="rowItem"
							v-for="item in storeValues.valueList"
							@click="toggleValue(item)"
						>
							<span class="label"><Icon name="count" />{{ item.name }}</span>
							<div class="toggle">
								<ToggleButton v-model="item.enabled" @change="toggleValue()" />
							</div>
						</div>
					</div>
				</ToggleBlock>

				<ToggleBlock
					:icons="['polygon']"
					:title="t('params.categories.clickableareas')"
					:alert="!heatOK"
					:open="!heatOK"
					v-if="storeHeat.screenList.length > 0"
				>
					<template #right_actions>
						<Icon :name="heatOK ? 'checkmark' : 'alert'" />
						<strong
							>{{ storeHeat.screenList.filter((v) => v.enabled !== false).length }}/{{
								config.MAX_CUSTOM_HEAT_SCREENS
							}}</strong
						>
					</template>
					<div class="itemList heat">
						<div
							class="rowItem"
							v-for="item in storeHeat.screenList"
							@click="toggleHeat(item)"
						>
							<HeatScreenPreview class="heatScreen" :screen="item" />
							<div class="toggle">
								<ToggleButton v-model="item.enabled" @change="toggleHeat()" />
							</div>
						</div>
					</div>
				</ToggleBlock>

				<ToggleBlock
					:icons="['badge']"
					:title="t('premium.cleanup.custom_badges')"
					:alert="!badgesOK"
					:open="!badgesOK"
					v-if="storeUsers.customBadgeList.length > 0"
				>
					<template #right_actions>
						<Icon :name="badgesOK ? 'checkmark' : 'alert'" />
						<strong
							>{{
								storeUsers.customBadgeList.filter((v) => v.enabled !== false)
									.length
							}}/{{ config.MAX_CUSTOM_BADGES }}</strong
						>
					</template>
					<div class="itemList badges">
						<div
							class="rowItem"
							v-for="item in storeUsers.customBadgeList"
							@click="toggleBadge(item)"
						>
							<img :src="item.img" alt="custom badge" />
							<div class="toggle">
								<ToggleButton v-model="item.enabled" @change="toggleBadge()" />
							</div>
						</div>
					</div>
				</ToggleBlock>

				<ToggleBlock
					:icons="['badge', 'user']"
					:title="t('premium.cleanup.custom_badges_attribution')"
					:alert="!badgesUserOK"
					:open="!badgesUserOK"
					v-if="userBadges.length > 0"
				>
					<template #right_actions>
						<Icon :name="badgesUserOK ? 'checkmark' : 'alert'" />
						<strong
							>{{ userBadges.length }}/{{
								config.MAX_CUSTOM_BADGES_ATTRIBUTION
							}}</strong
						>
					</template>
					<div class="itemList">
						<div
							class="rowItem"
							v-for="user in userBadges"
							v-tooltip="t('premium.cleanup.custom_badges_attribution_remove')"
							@click="deleteUserBadges(user)"
						>
							<div class="label">
								<span class="username">{{ user.displayName }}</span>
								<span
									class="small"
									v-if="user.displayName != user.displayNameOriginal"
									>({{ user.displayNameOriginal }})</span
								>
								<div class="badgeList">
									<img
										class="badge card-item"
										:src="
											storeUsers.customBadgeList.find((v) => v.id == badge.id)
												?.img
										"
										alt="custom badge"
										v-for="badge in storeUsers.customUserBadges[user.id]"
									/>
								</div>
							</div>
							<div class="deleteBt">
								<Icon name="trash" />
							</div>
						</div>
					</div>
				</ToggleBlock>

				<ToggleBlock
					:icons="['user']"
					:title="t('premium.cleanup.custom_usernames')"
					:alert="!usernamesOK"
					:open="!usernamesOK"
					v-if="Object.keys(storeUsers.customUsernames).length > 0"
				>
					<template #right_actions>
						<Icon :name="usernamesOK ? 'checkmark' : 'alert'" />
						<strong
							>{{ Object.keys(storeUsers.customUsernames).length }}/{{
								config.MAX_CUSTOM_USERNAMES
							}}</strong
						>
					</template>
					<div class="itemList users">
						<div
							class="rowItem"
							v-for="user in usernames"
							v-tooltip="t('premium.cleanup.custom_username_remove')"
							@click="deleteUsername(user)"
						>
							<span class="label">{{ user.displayName }}</span>
							<span
								class="label small"
								v-if="user.displayName != user.displayNameOriginal"
								>({{ user.displayNameOriginal }})</span
							>
							<Icon name="trash" theme="alert" />
						</div>
					</div>
				</ToggleBlock>

				<ToggleBlock
					:icons="['distort']"
					:title="t('premium.cleanup.distortion')"
					:alert="!distortionsOK"
					:open="!distortionsOK"
					v-if="storeHeat.distortionList.length > 0"
				>
					<template #right_actions>
						<Icon :name="distortionsOK ? 'checkmark' : 'alert'" />
						<strong
							>{{ storeHeat.distortionList.filter((v) => v.enabled).length }}/{{
								config.MAX_DISTORTION_OVERLAYS
							}}</strong
						>
					</template>
					<div class="itemList">
						<div class="rowItem" v-for="item in storeHeat.distortionList">
							<span class="label">{{
								item.name ||
								[
									item.obsItemPath.sceneName,
									item.obsItemPath.groupName,
									item.obsItemPath.source?.name,
								]
									.filter((v) => v != "")
									.join(" => ")
							}}</span>
							<div class="toggle">
								<ToggleButton v-model="item.enabled" @change="toggleDistortion()" />
							</div>
						</div>
					</div>
				</ToggleBlock>

				<ToggleBlock
					:icons="['bingo_grid']"
					:title="t('premium.cleanup.bingo_grids')"
					:alert="!bingoGridsOK"
					:open="!bingoGridsOK"
					v-if="storeBingoGrid.gridList.length > 0"
				>
					<template #right_actions>
						<Icon :name="bingoGridsOK ? 'checkmark' : 'alert'" />
						<strong
							>{{ storeBingoGrid.gridList.filter((v) => v.enabled).length }}/{{
								config.MAX_BINGO_GRIDS
							}}</strong
						>
					</template>
					<div class="itemList">
						<div class="rowItem" v-for="item in storeBingoGrid.gridList">
							<span class="label">{{ item.title }}</span>
							<div class="toggle">
								<ToggleButton
									v-model="item.enabled"
									@change="toggleBingoGrid(item)"
								/>
							</div>
						</div>
					</div>
				</ToggleBlock>

				<ToggleBlock
					:icons="['label']"
					:title="t('premium.cleanup.labels')"
					:alert="!labelsOK"
					:open="!labelsOK"
					v-if="storeLabels.labelList.length > 0"
				>
					<template #right_actions>
						<Icon :name="labelsOK ? 'checkmark' : 'alert'" />
						<strong
							>{{ storeLabels.labelList.filter((v) => v.enabled).length }}/{{
								config.MAX_LABELS
							}}</strong
						>
					</template>
					<div class="itemList">
						<div class="rowItem" v-for="item in storeLabels.labelList">
							<span class="label">{{ item.title }}</span>
							<div class="toggle">
								<ToggleButton v-model="item.enabled" @change="toggleLabel(item)" />
							</div>
						</div>
					</div>
				</ToggleBlock>

				<ToggleBlock
					:icons="['timer']"
					:title="t('premium.cleanup.timers')"
					:alert="!timersOK"
					:open="!timersOK"
					v-if="storeTimer.timerList.filter((v) => !v.isDefault).length > 0"
				>
					<template #right_actions>
						<Icon :name="timersOK ? 'checkmark' : 'alert'" />
						<strong
							>{{
								storeTimer.timerList.filter((v) => v.enabled && !v.isDefault)
									.length
							}}/{{ config.MAX_TIMERS }}</strong
						>
					</template>
					<div class="itemList">
						<div
							class="rowItem"
							v-for="item in storeTimer.timerList.filter((v) => !v.isDefault)"
						>
							<span class="label">{{ item.title }}</span>
							<div class="toggle">
								<ToggleButton v-model="item.enabled" @change="toggleTimer(item)" />
							</div>
						</div>
					</div>
				</ToggleBlock>

				<ToggleBlock
					:icons="['animate']"
					:title="t('premium.cleanup.animated_text')"
					:alert="!animatedTextsOK"
					:open="!animatedTextsOK"
					v-if="storeAnimatedText.animatedTextList.filter((v) => v.enabled).length > 0"
				>
					<template #right_actions>
						<Icon :name="animatedTextsOK ? 'checkmark' : 'alert'" />
						<strong
							>{{
								storeAnimatedText.animatedTextList.filter((v) => v.enabled).length
							}}/{{ config.MAX_ANIMATED_TEXT }}</strong
						>
					</template>
					<div class="itemList">
						<div class="rowItem" v-for="item in storeAnimatedText.animatedTextList">
							<span class="label">{{
								item.title || t("overlay.animatedText.default_title")
							}}</span>
							<div class="toggle">
								<ToggleButton
									v-model="item.enabled"
									@change="toggleAnimatedText(item)"
								/>
							</div>
						</div>
					</div>
				</ToggleBlock>

				<ToggleBlock
					:icons="['train']"
					:title="t('premium.cleanup.custom_train')"
					:alert="!customTrainOK"
					:open="!customTrainOK"
					v-if="storeCustomTrain.customTrainList.filter((v) => v.enabled).length > 0"
				>
					<template #right_actions>
						<Icon :name="customTrainOK ? 'checkmark' : 'alert'" />
						<strong
							>{{
								storeCustomTrain.customTrainList.filter((v) => v.enabled).length
							}}/{{ config.MAX_CUSTOM_TRAIN }}</strong
						>
					</template>
					<div class="itemList">
						<div class="rowItem" v-for="item in storeCustomTrain.customTrainList">
							<span class="label">{{
								item.title || t("overlay.customTrain.default_title")
							}}</span>
							<div class="toggle">
								<ToggleButton
									v-model="item.enabled"
									@change="toggleCustomTrain(item)"
								/>
							</div>
						</div>
					</div>
				</ToggleBlock>

				<ToggleBlock
					:icons="['quiz']"
					:title="t('premium.cleanup.quiz')"
					:alert="!quizOK"
					:open="!quizOK"
					v-if="storeQuiz.quizList.filter((v) => v.enabled).length > 0"
				>
					<template #right_actions>
						<Icon :name="quizOK ? 'checkmark' : 'alert'" />
						<strong
							>{{ storeQuiz.quizList.filter((v) => v.enabled).length }}/{{
								config.MAX_QUIZ
							}}</strong
						>
					</template>
					<div class="itemList">
						<div class="rowItem" v-for="item in storeQuiz.quizList">
							<span class="label">{{
								item.title || t("quiz.form.default_title")
							}}</span>
							<div class="toggle">
								<ToggleButton v-model="item.enabled" @change="toggleQuiz(item)" />
							</div>
						</div>
					</div>
				</ToggleBlock>

				<div class="card-item warning" v-if="!allOK">
					{{ t("premium.cleanup.disable_more_items") }}
				</div>
				<TTButton class="completeBt" icon="checkmark" v-else @click="close()">{{
					t("premium.cleanup.completeBt")
				}}</TTButton>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useConfirm } from "@/composables/useConfirm";
import { storeAnimatedText as useStoreAnimatedText } from "@/store/animated_text/storeAnimatedText";
import { storeBingoGrid as useStoreBingoGrid } from "@/store/bingo_grid/storeBingoGrid";
import { storeCounters as useStoreCounters } from "@/store/counters/storeCounters";
import { storeCustomTrain as useStoreCustomTrain } from "@/store/customtrain/storeCustomTrain";
import { storeHeat as useStoreHeat } from "@/store/heat/storeHeat";
import { storeLabels as useStoreLabels } from "@/store/labels/storeLabels";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { storeQuiz as useStoreQuiz } from "@/store/quiz/storeQuiz";
import { storeMain as useStoreMain } from "@/store/storeMain";
import { storeTimer as useStoreTimer } from "@/store/timer/storeTimer";
import { storeTriggers as useStoreTriggers } from "@/store/triggers/storeTriggers";
import { storeUsers as useStoreUsers } from "@/store/users/storeUsers";
import { storeValues as useStoreValues } from "@/store/values/storeValues";
import type { HeatScreen } from "@/types/HeatDataTypes";
import type { LabelItemData } from "@/types/ILabelOverlayData";
import type { TriggerData, TriggerTreeItemData } from "@/types/TriggerActionDataTypes";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Config from "@/utils/Config";
import TriggerUtils from "@/utils/TriggerUtils";
import { gsap } from "gsap/all";
import { computed, onMounted, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import ClearButton from "../ClearButton.vue";
import Icon from "../Icon.vue";
import TTButton from "../TTButton.vue";
import ToggleBlock from "../ToggleBlock.vue";
import ToggleButton from "../ToggleButton.vue";
import HeatScreenPreview from "../params/contents/heat/areas/HeatScreenPreview.vue";
import type {
	TriggerListEntry,
	TriggerListFolderEntry,
} from "../params/contents/triggers/TriggerList.vue";
import TriggerListFolderItem from "../params/contents/triggers/TriggerListFolderItem.vue";

const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();
const { confirm } = useConfirm();
const config = Config.instance;
const storeMain = useStoreMain();
const storeParams = useStoreParams();
const storeTriggers = useStoreTriggers();
const storeCounters = useStoreCounters();
const storeValues = useStoreValues();
const storeHeat = useStoreHeat();
const storeUsers = useStoreUsers();
const storeBingoGrid = useStoreBingoGrid();
const storeLabels = useStoreLabels();
const storeTimer = useStoreTimer();
const storeAnimatedText = useStoreAnimatedText();
const storeCustomTrain = useStoreCustomTrain();
const storeQuiz = useStoreQuiz();

const dimmer = useTemplateRef<HTMLElement>("dimmer");
const holder = useTemplateRef<HTMLElement>("holder");

const folderTriggerList = ref<(TriggerListEntry | TriggerListFolderEntry)[]>([]);

const triggerCount = computed<number>(() => {
	return storeTriggers.triggerList.filter(
		(v) => v.enabled !== false && storeTriggers.triggerIdToFolderEnabled[v.id] !== false,
	).length;
});

const triggersOK = computed<boolean>(() => {
	return triggerCount.value <= config.MAX_TRIGGERS;
});
const countersOK = computed<boolean>(() => {
	return (
		storeCounters.counterList.filter((v) => v.enabled !== false).length <= config.MAX_COUNTERS
	);
});
const valuesOK = computed<boolean>(() => {
	return storeValues.valueList.filter((v) => v.enabled !== false).length <= config.MAX_VALUES;
});
const heatOK = computed<boolean>(() => {
	return (
		storeHeat.screenList.filter((v) => v.enabled !== false).length <=
		config.MAX_CUSTOM_HEAT_SCREENS
	);
});
const badgesOK = computed<boolean>(() => {
	return (
		storeUsers.customBadgeList.filter((v) => v.enabled !== false).length <=
		config.MAX_CUSTOM_BADGES
	);
});
const badgesUserOK = computed<boolean>(() => {
	return Object.keys(storeUsers.customUserBadges).length <= config.MAX_CUSTOM_BADGES_ATTRIBUTION;
});
const usernamesOK = computed<boolean>(() => {
	return Object.keys(storeUsers.customUsernames).length <= config.MAX_CUSTOM_USERNAMES;
});
const distortionsOK = computed<boolean>(() => {
	return (
		storeHeat.distortionList.filter((v) => v.enabled).length <= config.MAX_DISTORTION_OVERLAYS
	);
});
const bingoGridsOK = computed<boolean>(() => {
	return storeBingoGrid.gridList.filter((v) => v.enabled).length <= config.MAX_BINGO_GRIDS;
});
const labelsOK = computed<boolean>(() => {
	return storeLabels.labelList.filter((v) => v.enabled).length <= config.MAX_LABELS;
});
const timersOK = computed<boolean>(() => {
	return (
		storeTimer.timerList.filter((v) => v.enabled && !v.isDefault).length <= config.MAX_TIMERS
	);
});
const animatedTextsOK = computed<boolean>(() => {
	return (
		storeAnimatedText.animatedTextList.filter((v) => v.enabled).length <=
		config.MAX_ANIMATED_TEXT
	);
});
const customTrainOK = computed<boolean>(() => {
	return (
		storeCustomTrain.customTrainList.filter((v) => v.enabled).length <= config.MAX_CUSTOM_TRAIN
	);
});
const quizOK = computed<boolean>(() => {
	return storeQuiz.quizList.filter((v) => v.enabled).length <= config.MAX_QUIZ;
});
const allOK = computed<boolean>(() => {
	return (
		triggersOK.value &&
		countersOK.value &&
		valuesOK.value &&
		heatOK.value &&
		badgesOK.value &&
		badgesUserOK.value &&
		usernamesOK.value &&
		distortionsOK.value &&
		bingoGridsOK.value &&
		labelsOK.value &&
		timersOK.value &&
		animatedTextsOK.value &&
		customTrainOK.value &&
		quizOK.value
	);
});

const userBadges = computed<TwitchatDataTypes.TwitchatUser[]>(() => {
	const res: TwitchatDataTypes.TwitchatUser[] = [];
	const customUserBadges = storeUsers.customUserBadges;
	for (const uid in customUserBadges) {
		const userBadges = customUserBadges[uid];
		if (userBadges && userBadges?.length > 0) {
			res.push(storeUsers.getUserFrom(userBadges[0]!.platform, userBadges[0]!.channel, uid));
		}
	}
	return res;
});

const usernames = computed<TwitchatDataTypes.TwitchatUser[]>(() => {
	const res: TwitchatDataTypes.TwitchatUser[] = [];
	const user = storeUsers.customUsernames;
	for (const uid in user) {
		res.push(storeUsers.getUserFrom(user[uid]!.platform, user[uid]!.channel, uid));
	}
	return res;
});

const triggerList = computed<TriggerListEntry[]>(() => {
	const triggers = storeTriggers.triggerList;
	const entries = triggers.map((trigger, index) => {
		const info = TriggerUtils.getTriggerDisplayInfo(trigger);
		const entry: TriggerListEntry = {
			type: "trigger",
			id: trigger.id,
			index,
			label: info.label,
			trigger,
			icon: info.icon,
			iconURL: info.iconURL,
			canTest: false,
		};
		return entry;
	});
	return entries;
});

onMounted(() => {
	gsap.set(holder.value!, { marginTop: 0, opacity: 1 });
	gsap.to(dimmer.value!, { duration: 0.25, opacity: 1 });
	gsap.from(holder.value!, {
		duration: 0.25,
		marginTop: -100,
		opacity: 0,
		ease: "back.out",
	});

	storeCounters.counterList.forEach(
		(v) => (v.enabled = v.enabled === undefined ? true : v.enabled),
	);
	storeValues.valueList.forEach((v) => (v.enabled = v.enabled === undefined ? true : v.enabled));
	storeUsers.customBadgeList.forEach(
		(v) => (v.enabled = v.enabled === undefined ? true : v.enabled),
	);

	//Build folder structure
	const triggers = storeTriggers.triggerList;
	const idToHasFolder: { [key: string]: boolean } = {};

	const flatList = triggers.map<TriggerListEntry>((v) => {
		const info = TriggerUtils.getTriggerDisplayInfo(v);
		return {
			type: "trigger",
			index: 0,
			label: info.label,
			id: v.id,
			trigger: v,
			icon: info.icon,
			iconURL: info.iconURL,
			canTest: false,
		};
	});

	function buildItem(
		items: TriggerTreeItemData[],
	): (TriggerListEntry | TriggerListFolderEntry)[] {
		const res: (TriggerListEntry | TriggerListFolderEntry)[] = [];
		for (const item of items) {
			if (item.type == "folder") {
				const children = buildItem(item.children || []);
				res.push({
					type: "folder",
					id: item.id,
					label: item.name!,
					items: children,
					color: { type: "color", value: item.color || "#60606c" },
					expand: item.expand == true,
					enabled: item.enabled !== false,
				});
			} else {
				const entry = flatList.find((v) => v.trigger.id == item.triggerId);
				if (entry && !idToHasFolder[entry.id]) {
					idToHasFolder[entry.id] = true;
					res.push(entry);
				}
			}
		}
		return res;
	}
	folderTriggerList.value = buildItem(storeTriggers.triggerTree);
	for (const entry of triggerList.value) {
		if (!idToHasFolder[entry.id]) {
			idToHasFolder[entry.id] = true;
			folderTriggerList.value.push(entry);
		}
	}
});

async function close(): Promise<void> {
	//Don't close if there still are limits exceed
	if (storeMain.nonPremiumLimitExceeded) return;

	gsap.killTweensOf([holder.value!, dimmer.value!]);
	gsap.to(dimmer.value!, { duration: 0.25, opacity: 0, ease: "sine.in" });
	gsap.to(holder.value!, {
		duration: 0.25,
		marginTop: -100,
		opacity: 0,
		ease: "back.in",
		onComplete: () => {
			emit("close");
		},
	});
}

function openPremium(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
}

function toggleTrigger(item?: TriggerData): void {
	if (item) item.enabled = !item.enabled;
	storeTriggers.saveTriggers();
}

function deleteUserBadges(user: TwitchatDataTypes.TwitchatUser): void {
	confirm(
		t("premium.cleanup.delete_badges_title"),
		t("premium.cleanup.delete_badges_description"),
	)
		.then(() => {
			delete storeUsers.customUserBadges[user.id];
			storeUsers.saveCustomBadges();
		})
		.catch(() => {});
}

function deleteUsername(user: TwitchatDataTypes.TwitchatUser): void {
	confirm(t("premium.cleanup.delete_name_title"), t("premium.cleanup.delete_name_description"))
		.then(() => {
			delete storeUsers.customUsernames[user.id];
			storeUsers.saveCustomUsername();
		})
		.catch(() => {});
}

function deleteDistortion(data: TwitchatDataTypes.HeatDistortionData): void {
	confirm(
		t("premium.cleanup.delete_distortion_title"),
		t("premium.cleanup.delete_distortion_description"),
	)
		.then(() => {
			storeHeat.deleteDistorsion(data);
		})
		.catch(() => {});
}

function toggleCounter(item?: TwitchatDataTypes.CounterData): void {
	if (item) item.enabled = !item.enabled;
	storeCounters.saveCounters();
}

function toggleValue(item?: TwitchatDataTypes.ValueData): void {
	if (item) item.enabled = !item.enabled;
	storeValues.saveValues();
}

function toggleHeat(item?: HeatScreen): void {
	if (item) item.enabled = !item.enabled;
	storeHeat.saveScreens();
}

function toggleBadge(item?: TwitchatDataTypes.TwitchatCustomUserBadge): void {
	if (item) item.enabled = !item.enabled;
	storeUsers.saveCustomBadges();
}

function toggleDistortion(item?: TwitchatDataTypes.HeatDistortionData): void {
	storeHeat.saveDistorsions();
}

function toggleBingoGrid(item: TwitchatDataTypes.BingoGridConfig): void {
	storeBingoGrid.saveData(item.id);
}

function toggleLabel(item: LabelItemData): void {
	storeLabels.saveData(item.id);
}

function toggleTimer(item: TwitchatDataTypes.TimerData): void {
	storeTimer.saveData();
}

function toggleAnimatedText(item: TwitchatDataTypes.AnimatedTextData): void {
	storeAnimatedText.saveData();
}

function toggleCustomTrain(item: TwitchatDataTypes.CustomTrainData): void {
	storeCustomTrain.saveData();
}

function toggleQuiz(item: TwitchatDataTypes.QuizParams): void {
	storeQuiz.saveData();
}

function onToggleTrigger(): void {
	function buildItem(root: TriggerListEntry | TriggerListFolderEntry): TriggerTreeItemData {
		switch (root.type) {
			case "folder": {
				return {
					type: "folder",
					id: root.id,
					name: root.label,
					expand: root.expand === true,
					color: root.color.value,
					enabled: root.enabled !== false,
					children: root.items.map((v) => buildItem(v)),
				};
			}
			default:
			case "trigger": {
				return { type: "trigger", id: root.id, triggerId: root.id };
			}
		}
	}
	const tree = folderTriggerList.value.map((v) => buildItem(v));
	storeTriggers.updateTriggerTree(tree);
}
</script>

<style scoped lang="less">
.nonpremiumcleanup {
	z-index: 3;

	.premiumBt {
		display: flex;
		margin: auto;
	}

	.content {
		gap: 1em;
		display: flex;
		flex-direction: column;

		.completeBt {
			flex-shrink: 0;
			margin: auto;
		}

		.header {
			line-height: 1.2em;
			margin: 0 auto;
			white-space: pre-line;
		}
	}

	.holder {
		margin-top: calc(0px - var(--chat-form-height) / 2) !important;
		max-height: calc(var(--vh) - var(--chat-form-height));
	}

	.warning {
		flex-shrink: 0;
		padding: 0.5em;
		margin: 0 auto;
		font-style: italic;
		background-color: var(--color-secondary-fader);
	}

	.itemList {
		gap: 1px;
		display: flex;
		flex-direction: column;
		.rowItem {
			box-shadow: 0px 1px 1px rgba(0, 0, 0, 0.25);
			background-color: var(--background-color-fadest);
			border-radius: 0.5em;
			padding: 0;
			gap: 0.5em;
			display: flex;
			flex-direction: row;
			min-height: 1.5em;
			position: relative;
			transition: background-color 0.1s;
			cursor: pointer;

			&:hover {
				background-color: var(--background-color-fader);
			}
			.label {
				flex-grow: 1;
				gap: 0.5em;
				display: flex;
				flex-direction: row;
				align-items: center;
				color: var(--color-text);
				padding: 0;
				margin-left: 0.5em;
				.icon {
					height: 1.5em;
					width: 1.5em;
					padding: 0.25em;
					object-fit: fill;
					margin-right: 0.5em;
				}

				.username {
					padding-left: 0.5em;
				}

				.small {
					font-style: italic;
					font-size: 0.9em;
					margin-left: -0.5em;
				}
				.badgeList {
					gap: 0.5em;
					display: flex;
					flex-direction: row;
					.badge {
						padding: 0.25em;
						height: 2em;
					}
				}
			}
			.icon {
				height: 1em;
			}

			.heatScreen {
				pointer-events: none;
				flex-grow: 1;
			}
			.toggle,
			.deleteBt,
			.badgeList {
				padding: 0 0.5em;
				border-left: 1px solid var(--color-dark-light);
			}
			.deleteBt {
				display: flex;
				align-items: center;
			}
		}
		&.heat,
		&.badges,
		&.users {
			gap: 1em;
			width: 100%;
			flex-direction: row;
			flex-wrap: wrap;
			align-items: center;
			justify-content: center;
			.rowItem {
				max-width: 200px;
				flex-grow: 1;
				align-items: center;
			}
		}

		&.badges {
			.rowItem {
				max-width: fit-content;
			}
		}

		&.users {
			.rowItem {
				padding: 0.5em;
				max-width: fit-content;
			}
		}
	}
}
</style>
