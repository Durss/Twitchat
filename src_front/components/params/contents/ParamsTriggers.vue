<template>
	<div class="paramstriggers parameterContent">
		<Icon name="broadcast" class="icon" />

		<div class="head">
			<i18n-t scope="global" tag="p" :keypath="headerLabelKey" v-if="!currentTriggerData">
				<template #COUNT
					><strong>{{ eventsCount }}</strong></template
				>
			</i18n-t>
			<i18n-t
				scope="global"
				tag="p"
				class="small"
				keypath="triggers.logs.cmd_info"
				v-if="!currentTriggerData"
			>
				<template #CMD
					><mark v-click2Select>{{
						storeChat.commands.find((v) => v.id == "triggerlogs")?.cmd
					}}</mark></template
				>
			</i18n-t>
		</div>

		<div class="card-item" v-if="noTrigger">{{ $t("triggers.usage") }}</div>

		<div class="ctas" v-if="showForm || currentTriggerData">
			<TTButton
				class="cta resyncBt"
				small
				v-if="showOBSResync || showForm"
				icon="obs"
				@click="
					listOBSSources();
					listOBSScenes();
				"
				v-tooltip="$t('triggers.resyncOBSBt_tt')"
				:loading="loadingOBSElements"
				>{{ $t("triggers.resyncOBSBt") }}</TTButton
			>

			<TTButton
				class="cta resyncBt"
				small
				icon="channelPoints"
				v-if="canManageRewards && isAffiliate"
				@click="listRewards()"
				v-tooltip="$t('triggers.resyncRewardsBt_tt')"
				:loading="loadingRewards"
				>{{ $t("triggers.resyncRewardsBt") }}</TTButton
			>

			<TTButton
				class="cta resyncBt"
				small
				icon="extension"
				v-if="canManageExtensions"
				@click="listExtensions()"
				v-tooltip="$t('triggers.resyncExtensionBt_tt')"
				:loading="loadingExtension"
				>{{ $t("triggers.resyncExtensionBt") }}</TTButton
			>

			<TTButton
				class="cta resyncBt"
				small
				icon="mixitup"
				v-if="storeMixitup.connected"
				@click="listMixItUp()"
				v-tooltip="$t('triggers.resyncmixitupBt_tt')"
				:loading="loadingMixItUp"
				>{{ $t("triggers.resyncmixitupBt") }}</TTButton
			>

			<TTButton
				class="cta"
				small
				v-if="canTestTrigger"
				icon="test"
				@click="testTrigger(currentTriggerData!)"
				>{{ $t("triggers.testBt") }}</TTButton
			>

			<TTButton
				class="cta"
				v-if="currentTriggerData"
				alert
				small
				icon="delete"
				@click="deleteTrigger(currentTriggerData!.id)"
				>{{ $t("triggers.deleteBt") }}</TTButton
			>
		</div>

		<template v-if="showList && !showForm">
			<TTButton
				class="createBt"
				v-if="
					activeTriggerCount < $config.MAX_TRIGGERS ||
					(storeAuth.isPremium && activeTriggerCount < $config.MAX_TRIGGERS_PREMIUM)
				"
				icon="add"
				primary
				v-newflag="{ date: $config.NEW_FLAGS_DATE_V16_12, id: 'paramsparams_triggers_3' }"
				@click="openForm()"
				>{{ $t("triggers.add_triggerBt") }}</TTButton
			>

			<div class="card-item premium premiumLimit" v-else-if="!storeAuth.isPremium">
				<span>{{
					$t("triggers.nonpremium_limit", {
						MAX: $config.MAX_TRIGGERS,
						MAX_PREMIUM: $config.MAX_TRIGGERS_PREMIUM,
					})
				}}</span>
				<TTButton icon="premium" premium light @click="openPremium()">{{
					$t("premium.become_premiumBt")
				}}</TTButton>
			</div>
			<div class="card-item premium premiumLimit" v-else>
				<span>{{
					$t("triggers.premium_limit", { MAX: $config.MAX_TRIGGERS_PREMIUM })
				}}</span>
			</div>
		</template>

		<TriggerCreateForm
			v-if="showForm"
			@selectTrigger="onSelectTrigger($event)"
			@updateHeader="headerLabelKey = $event"
			:obsScenes="obsScenes"
			:obsSources="obsSources"
			:obsInputs="obsInputs"
			:rewards="rewards"
			:folderTarget="createFolderTarget"
		/>

		<TriggerActionList
			v-if="currentTriggerData"
			:triggerData="currentTriggerData"
			:obsScenes="obsScenes"
			:obsSources="obsSources"
			:obsInputs="obsInputs"
			:rewards="rewards"
			:extensions="extensions"
		/>

		<TriggerList
			v-if="showList && !showForm"
			@select="onSelectTrigger($event)"
			@testTrigger="testTrigger($event)"
			@createTrigger="createTriggerWithinFolder($event)"
			:rewards="rewards"
		/>
	</div>
</template>

<script setup lang="ts">
import TTButton from "@/components/TTButton.vue";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeChat as useStoreChat } from "@/store/chat/storeChat";
import { storeCommon as useStoreCommon } from "@/store/common/storeCommon";
import { storeCounters as useStoreCounters } from "@/store/counters/storeCounters";
import { storeDebug as useStoreDebug } from "@/store/debug/storeDebug";
import { storeExtension as useStoreExtension } from "@/store/extension/storeExtension";
import { storeMixitup as useStoreMixitup } from "@/store/mixitup/storeMixitup";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { storeRewards as useStoreRewards } from "@/store/rewards/storeRewards";
import { storeMain as useStoreMain } from "@/store/storeMain";
import { storeTriggers as useStoreTriggers } from "@/store/triggers/storeTriggers";
import { storeUsers as useStoreUsers } from "@/store/users/storeUsers";
import { storeValues as useStoreValues } from "@/store/values/storeValues";
import {
	TriggerTypes,
	TriggerTypesDefinitionList,
	type TriggerData,
	type TriggerTypeDefinition,
	type TriggerTypesValue,
} from "@/types/TriggerActionDataTypes";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import type { OBSInputItem, OBSSceneItem, OBSSourceItem } from "@/utils/OBSWebsocket";
import OBSWebsocket from "@/utils/OBSWebsocket";
import SchedulerHelper from "@/utils/SchedulerHelper";
import Utils from "@/utils/Utils";
import TriggerActionHandler from "@/utils/triggers/TriggerActionHandler";
import { TwitchScopes } from "@/utils/twitch/TwitchScopes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { computed, onBeforeMount, onBeforeUnmount, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import TriggerActionList from "./triggers/TriggerActionList.vue";
import TriggerCreateForm from "./triggers/TriggerCreateForm.vue";
import TriggerList from "./triggers/TriggerList.vue";

const { t } = useI18n();
const storeAuth = useStoreAuth();
const storeChat = useStoreChat();
const storeCommon = useStoreCommon();
const storeCounters = useStoreCounters();
const storeDebug = useStoreDebug();
const storeMain = useStoreMain();
const storeMixitup = useStoreMixitup();
const storeParams = useStoreParams();
const storeRewards = useStoreRewards();
const storeTriggers = useStoreTriggers();
const storeUsers = useStoreUsers();
const storeValues = useStoreValues();
const storeExtension = useStoreExtension();

const eventsCount = ref<number>(0);
const showForm = ref<boolean>(false);
const loadingRewards = ref<boolean>(false);
const loadingMixItUp = ref<boolean>(false);
const loadingExtension = ref<boolean>(false);
const loadingOBSElements = ref<boolean>(false);
const headerLabelKey = ref<string>("triggers.header");
const createFolderTarget = ref<string>("");
const obsScenes = ref<OBSSceneItem[]>([]);
const obsSources = ref<OBSSourceItem[]>([]);
const obsInputs = ref<OBSInputItem[]>([]);
const rewards = ref<TwitchDataTypes.Reward[]>([]);

let renameOBSElementHandler: () => void;

const currentTriggerData = computed<TriggerData | null>(() => {
	return storeTriggers.currentEditTriggerData;
});
const showList = computed<boolean>(() => {
	return currentTriggerData.value == null;
});
const isAffiliate = computed<boolean>(() => {
	return storeAuth.twitch.user.is_affiliate || storeAuth.twitch.user.is_partner;
});
const canManageRewards = computed<boolean>(() => {
	return TwitchUtils.hasScopes([TwitchScopes.MANAGE_REWARDS]);
});
const canManageExtensions = computed<boolean>(() => {
	return TwitchUtils.hasScopes([TwitchScopes.EXTENSIONS]);
});
const extensions = computed(() => {
	return storeExtension.availableExtensions;
});

const showOBSResync = computed<boolean>(() => {
	if (!currentTriggerData.value) return false;
	if (currentTriggerData.value.type == TriggerTypes.HEAT_CLICK) return true;
	if (currentTriggerData.value.actions.length === 0) return false;
	return currentTriggerData.value.actions.findIndex((v) => v.type == "obs") > -1;
});

const canTestTrigger = computed<boolean>(() => {
	if (!currentTriggerData.value) return false;
	let events: TriggerTypeDefinition[] = TriggerTypesDefinitionList().concat();
	const e = events.find((v) => v.value == currentTriggerData.value?.type);
	return e?.testMessageType != undefined;
});

const activeTriggerCount = computed<number>(() => {
	return storeTriggers.triggerList.filter((v) => v.enabled !== false).length;
});

const noTrigger = computed<boolean>(() => {
	return storeTriggers.triggerList?.length === 0;
});

onBeforeMount(() => {
	//List all available trigger types
	let events: TriggerTypeDefinition[] = TriggerTypesDefinitionList().concat();
	eventsCount.value = events.length;
	if (OBSWebsocket.instance.connected) {
		listOBSScenes();
		listOBSSources();
	}
	if (TwitchUtils.hasScopes([TwitchScopes.LIST_REWARDS])) {
		listRewards();
	}
	if (TwitchUtils.hasScopes([TwitchScopes.EXTENSIONS])) {
		listExtensions();
	}
	if (storeMixitup.connected) {
		listMixItUp();
	}
	//No trigger yet, just show form
	if (noTrigger.value) {
		// showForm.value = true;
		headerLabelKey.value = "triggers.header_select_trigger";
	}

	renameOBSElementHandler = async () => {
		//For some reason we need to call OBS twice to get latest changes
		await listOBSScenes();
		await listOBSScenes();

		await listOBSSources();
		await listOBSSources();
	};
	OBSWebsocket.instance.addEventListener("ON_OBS_INPUT_NAME_CHANGED", renameOBSElementHandler);
	OBSWebsocket.instance.addEventListener("ON_OBS_SCENE_NAME_CHANGED", renameOBSElementHandler);
	OBSWebsocket.instance.addEventListener("ON_OBS_FILTER_NAME_CHANGED", renameOBSElementHandler);

	let debounceTimeout = -1;
	//Watch for any change on the selected trigger
	watch(
		() => currentTriggerData.value,
		() => {
			clearTimeout(debounceTimeout);
			debounceTimeout = window.setTimeout(() => {
				if (currentTriggerData.value) {
					if (currentTriggerData.value.type == TriggerTypes.SCHEDULE) {
						//Force reschedule after an update
						SchedulerHelper.instance.scheduleTrigger(currentTriggerData.value);
					}
					storeTriggers.saveTriggers();
				}
			}, 1000);
		},
		{ deep: true },
	);

	//Check for OBS connection change event.
	//if connection has been established, load scenes and sources
	watch(
		() => OBSWebsocket.instance.connected.value,
		async () => {
			if (OBSWebsocket.instance.connected.value) {
				await listOBSScenes();
				await listOBSSources();
			}
		},
	);

	watch(
		() => storeAuth.newScopesToRequest,
		() => {
			if (TwitchUtils.hasScopes([TwitchScopes.LIST_REWARDS])) {
				listRewards();
			}
		},
	);
});

onBeforeUnmount(() => {
	OBSWebsocket.instance.removeEventListener("ON_OBS_INPUT_NAME_CHANGED", renameOBSElementHandler);
	OBSWebsocket.instance.removeEventListener("ON_OBS_SCENE_NAME_CHANGED", renameOBSElementHandler);
	OBSWebsocket.instance.removeEventListener(
		"ON_OBS_FILTER_NAME_CHANGED",
		renameOBSElementHandler,
	);
});

/**
 * Called when back button is clicked on params header
 */
function onNavigateBack(): boolean {
	createFolderTarget.value = "";
	return reload();
}

/**
 * Called when back button is clicked on params header
 */
function reload(): boolean {
	if (!showList.value || showForm.value) {
		showForm.value = false;
		createFolderTarget.value = "";
		storeTriggers.openTriggerList();
		headerLabelKey.value = "triggers.header";
		return true;
	}
	return false;
}

/**
 * Opens the premium page
 */
function openPremium(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
}

/**
 * Opens the form
 */
function openForm(): void {
	headerLabelKey.value = "triggers.header_select_trigger";
	showForm.value = true;
}

/**
 * Called when an existing trigger is selected for edition
 * @param triggerData
 */
function onSelectTrigger(triggerData: TriggerData): void {
	storeTriggers.openTriggerEdition(triggerData);
	showForm.value = false;
	createFolderTarget.value = "";
}

/**
 * Lists OBS sources, scenes and filters
 */
async function listOBSSources(): Promise<void> {
	loadingOBSElements.value = true;
	await Utils.promisedTimeout(250);
	let sources: OBSSourceItem[] = [];
	let inputs: OBSInputItem[] = [];
	try {
		sources = await OBSWebsocket.instance.getSources();
		inputs = await OBSWebsocket.instance.getInputs();
	} catch (error) {
		obsSources.value = [];
		storeCommon.alert(t("error.obs_sources_loading"));
		loadingOBSElements.value = false;
		return;
	}

	sources.sort((a, b) => {
		if (a.sourceName.toLowerCase() < b.sourceName.toLowerCase()) return -1;
		if (a.sourceName.toLowerCase() > b.sourceName.toLowerCase()) return 1;
		return 0;
	});

	inputs.sort((a, b) => {
		if (a.inputName.toLowerCase() < b.inputName.toLowerCase()) return -1;
		if (a.inputName.toLowerCase() > b.inputName.toLowerCase()) return 1;
		return 0;
	});

	obsSources.value = sources;
	obsInputs.value = inputs;
	loadingOBSElements.value = false;
}

/**
 * Lists OBS Scenes
 */
async function listOBSScenes(): Promise<void> {
	let scenes: OBSSceneItem[] = [];
	try {
		scenes = (await OBSWebsocket.instance.getScenes()).scenes;
	} catch (error) {
		obsScenes.value = [];
		storeCommon.alert(t("error.obs_scenes_loading"));
		return;
	}

	scenes.sort((a, b) => {
		if (a.sceneName.toLowerCase() < b.sceneName.toLowerCase()) return -1;
		if (a.sceneName.toLowerCase() > b.sceneName.toLowerCase()) return 1;
		return 0;
	});
	obsScenes.value = scenes;
}

/**
 * Lists the rewards
 */
async function listRewards(): Promise<void> {
	loadingRewards.value = true;
	rewards.value = await storeRewards.loadRewards();
	await Utils.promisedTimeout(200); //Just make sure the loading is visible in case query runs crazy fast
	loadingRewards.value = false;
}

/**
 * Lists twitch extensions
 */
async function listExtensions(): Promise<void> {
	loadingExtension.value = true;
	await storeExtension.updateInternalStates();
	await Utils.promisedTimeout(200); //Just make sure the loading is visible in case query runs crazy fast
	loadingExtension.value = false;
}

/**
 * Lists Mix It Up commands
 */
async function listMixItUp(): Promise<void> {
	loadingMixItUp.value = true;
	storeMixitup.listCommands();
	await Utils.promisedTimeout(200); //Just make sure the loading is visible in case query runs crazy fast
	loadingMixItUp.value = false;
}

/**
 * Simulates a trigger's execution
 */
function createTriggerWithinFolder(folderId: string): void {
	createFolderTarget.value = folderId;
	openForm();
}

/**
 * Simulates a trigger's execution
 */
function testTrigger(trigger: TriggerData): void {
	const triggerEvent = TriggerTypesDefinitionList().find((v) => v.value == trigger.type);

	if (triggerEvent?.testMessageType) {
		//Special case for schedules
		if (trigger.type === TriggerTypes.SCHEDULE) {
			TriggerActionHandler.instance.parseScheduleTrigger(trigger, true);
		} else //If it's s slash command
		 // if(trigger.type === TriggerTypes.SLASH_COMMAND) {
		// storeDebug.simulateMessage<TwitchatDataTypes.ChatMessageTypes>(triggerEvent.testMessageType, (data)=> {
		// 	let m = data
		// 	void TriggerActionHandler.instance.execute(m, true, trigger.id);
		// }, false);
		// }else

		//If it's a notice type
		if (triggerEvent.testMessageType == TwitchatDataTypes.TwitchatMessageType.NOTICE) {
			storeDebug.simulateNotice<TwitchatDataTypes.MessageNoticeData>(
				triggerEvent.testNoticeType,
				(data) => {
					const m = data as TwitchatDataTypes.MessageNoticeData;
					switch (m.noticeId) {
						case TwitchatDataTypes.TwitchatNoticeType.EMERGENCY_MODE: {
							(m as TwitchatDataTypes.MessageEmergencyModeInfo).enabled =
								triggerEvent.value == TriggerTypes.EMERGENCY_MODE_START;
							break;
						}
						case TwitchatDataTypes.TwitchatNoticeType.SHIELD_MODE: {
							(m as TwitchatDataTypes.MessageShieldMode).enabled =
								triggerEvent.value == TriggerTypes.SHIELD_MODE_ON;
							break;
						}
					}
					void TriggerActionHandler.instance.execute(data, true);
				},
				false,
			);

			//If it's any other message type
		} else {
			storeDebug.simulateMessage<TwitchatDataTypes.ChatMessageTypes>(
				triggerEvent.testMessageType,
				async (data) => {
					let m = data;
					let amount = Math.round(Math.random() * 100 + 1);
					let amountFormatted = "$" + amount;

					//Slash commands simulation
					if (trigger.type == TriggerTypes.SLASH_COMMAND) {
						const typedMessage = m as TwitchatDataTypes.MessageChatData;
						void TriggerActionHandler.instance.executeTrigger(
							trigger,
							typedMessage,
							true,
							trigger.chatCommand,
						);
					} else //Chat message simulation
					 if (m.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
						switch (triggerEvent.value) {
							case TriggerTypes.CHAT_COMMAND: {
								//Add the command to the fake text message
								m.message = trigger.chatCommand + " " + m.message;
								m.message_html = trigger.chatCommand + " " + m.message_html;
								break;
							}
							case TriggerTypes.FIRST_ALL_TIME: {
								m.twitch_isFirstMessage = true;
								break;
							}
							case TriggerTypes.FIRST_TODAY: {
								m.todayFirst = true;
								break;
							}
							case TriggerTypes.RETURNING_USER: {
								m.twitch_isReturning = true;
								break;
							}
						}
					} else //Reward redeem simulation
					 if (m.type == TwitchatDataTypes.TwitchatMessageType.REWARD) {
						//Inject actual reward data
						let twitchReward = storeRewards.rewardList.find(
							(v) => v.id == trigger.rewardId,
						);
						if (twitchReward) {
							(m as TwitchatDataTypes.MessageRewardRedeemData).reward = {
								id: twitchReward.id,
								cost: twitchReward.cost,
								description: twitchReward.prompt,
								title: twitchReward.title,
								color: twitchReward.background_color,
								icon: {
									sd: twitchReward.image?.url_1x ?? "",
									hd: twitchReward.image?.url_4x,
								},
							};
						}
					} else //OBS scene change simulation
					 if (m.type == TwitchatDataTypes.TwitchatMessageType.OBS_SCENE_CHANGE) {
						m.sceneName = trigger.obsScene!;
					} else //OBS source toggle simulation
					 if (m.type == TwitchatDataTypes.TwitchatMessageType.OBS_SOURCE_TOGGLE) {
						m.sourceName = trigger.obsSource!;
						m.visible = trigger.type == TriggerTypes.OBS_SOURCE_ON;
					} else //OBS source toggle simulation
					 if (
						m.type == TwitchatDataTypes.TwitchatMessageType.OBS_PLAYBACK_STATE_UPDATE
					) {
						m.inputName = trigger.obsInput!;
						const typeToState: Partial<{
							[key in TriggerTypesValue]: TwitchatDataTypes.MessageOBSPlaybackStateValue;
						}> = {};
						typeToState[TriggerTypes.OBS_PLAYBACK_ENDED] = "complete";
						typeToState[TriggerTypes.OBS_PLAYBACK_STARTED] = "start";
						typeToState[TriggerTypes.OBS_PLAYBACK_PAUSED] = "pause";
						typeToState[TriggerTypes.OBS_PLAYBACK_NEXT] = "next";
						typeToState[TriggerTypes.OBS_PLAYBACK_PREVIOUS] = "prev";
						typeToState[TriggerTypes.OBS_PLAYBACK_RESTARTED] = "restart";
						if (typeToState[trigger.type]) {
							m.state = typeToState[trigger.type]!;
						} else {
							storeCommon.alert(
								'Trigger type "' +
									trigger.type +
									'" is missing associated state on ParamsTriggers.vue',
							);
						}
					} else //Counter update simulation
					 if (m.type == TwitchatDataTypes.TwitchatMessageType.COUNTER_UPDATE) {
						const counter = storeCounters.counterList.find(
							(v) => v.id == trigger.counterId,
						);
						if (counter) {
							m.counter = counter;
							switch (trigger.type) {
								case TriggerTypes.COUNTER_EDIT:
								case TriggerTypes.COUNTER_ADD:
									m.added = m.added_abs = 10;
									break;
								case TriggerTypes.COUNTER_DEL:
									m.added = -10;
									m.added_abs = 10;
									break;
								case TriggerTypes.COUNTER_LOOPED:
									m.looped = true;
									break;
								case TriggerTypes.COUNTER_MAXED:
									m.maxed = true;
									break;
								case TriggerTypes.COUNTER_MINED:
									m.mined = true;
									break;
							}
						}
					}

					//Value update simulation
					if (m.type == TwitchatDataTypes.TwitchatMessageType.VALUE_UPDATE) {
						const value = storeValues.valueList.find((v) => v.id == trigger.valueId);
						if (value) {
							m.value = value;
							m.oldValue = value.value;
						}
					}

					//Timer start simulation
					if (triggerEvent.value == TriggerTypes.TIMER_START) {
						//Set the timer as not stopped
						(m as TwitchatDataTypes.MessageTimerData).stopped = false;
					} /**
					 * Countdown start simulation
					 */ else if (triggerEvent.value == TriggerTypes.COUNTDOWN_START) {
						//Remove end date so it counts as a countdown start not an end
						const cd = m as TwitchatDataTypes.MessageCountdownData;
						cd.complete = false;
						delete cd.endedAt_ms;
						delete cd.endedAt_str;
						delete cd.finalDuration_ms;
						delete cd.finalDuration_str;
					} else //Subgift simulation
					 if (triggerEvent.value == TriggerTypes.SUBGIFT) {
						const sub = m as TwitchatDataTypes.MessageSubscriptionData;
						sub.is_gift = true;
						const recipients = [];
						do {
							recipients.push(Utils.pickRand(storeUsers.users));
						} while (Math.random() > 0.25);
						sub.gift_recipients = recipients;
						sub.gift_count = recipients.length;
					} else if (triggerEvent.value == TriggerTypes.TIMEOUT) {
						//set timeout duration
						(m as TwitchatDataTypes.MessageBanData).duration_s = Math.round(
							Math.random() * 666,
						);
					} else if (triggerEvent.value == TriggerTypes.BAN) {
						//Remove ban duration so it counts as a ban, not a timeout
						delete (m as TwitchatDataTypes.MessageBanData).duration_s;
					} else if (
						triggerEvent.value == TriggerTypes.SHOUTOUT_IN ||
						triggerEvent.value == TriggerTypes.SHOUTOUT_OUT
					) {
						//Force proper "received" state
						(m as TwitchatDataTypes.MessageShoutoutData).received =
							triggerEvent.value == TriggerTypes.SHOUTOUT_IN;
					} else if (triggerEvent.value == TriggerTypes.HEAT_CLICK) {
						//Force proper heat click target
						if (trigger.heatClickSource == "area" && trigger.heatAreaIds) {
							(m as TwitchatDataTypes.MessageHeatClickData).areaId = Utils.pickRand(
								trigger.heatAreaIds,
							);
						}
						if (trigger.heatClickSource == "obs" && trigger.heatObsSource) {
							(m as TwitchatDataTypes.MessageHeatClickData).obsSource =
								trigger.obsSource;
						}
					} else if (
						triggerEvent.value == TriggerTypes.GOXLR_BUTTON_PRESSED ||
						triggerEvent.value == TriggerTypes.GOXLR_BUTTON_RELEASED
					) {
						//Force a button
						(m as TwitchatDataTypes.MessageGoXLRButtonData).button = Utils.pickRand(
							trigger.goxlrButtons!,
						);
						(m as TwitchatDataTypes.MessageGoXLRButtonData).pressed =
							triggerEvent.value == TriggerTypes.GOXLR_BUTTON_PRESSED;
					} else if (
						triggerEvent.value == TriggerTypes.GOXLR_FX_ENABLED ||
						triggerEvent.value == TriggerTypes.GOXLR_FX_DISABLED
					) {
						(m as TwitchatDataTypes.MessageGoXLRFXEnableChangeData).enabled =
							triggerEvent.value == TriggerTypes.GOXLR_FX_ENABLED;
						(m as TwitchatDataTypes.MessageGoXLRFXEnableChangeData).fxIndex =
							Utils.pickRand([0, 1, 2, 3, 4, 5]);
					} else if (triggerEvent.value == TriggerTypes.COMMUNITY_CHALLENGE_COMPLETE) {
						//Remove ban duration so it counts as a ban, not a timeout
						(
							m as TwitchatDataTypes.MessageCommunityChallengeContributionData
						).challenge.progress = (
							m as TwitchatDataTypes.MessageCommunityChallengeContributionData
						).challenge.goal;
					} else if (triggerEvent.value == TriggerTypes.TRACK_ADD_TO_QUEUE_FAILED) {
						const code = Utils.pickRand<
							TwitchatDataTypes.MessageMusicAddedToQueueData["failCode"]
						>([
							"spotify_not_connected",
							"wrong_url",
							"no_result",
							"api_queue",
							"api_playlist",
							"max_duration",
						]);
						(m as TwitchatDataTypes.MessageMusicAddedToQueueData).failCode = code;
						(m as TwitchatDataTypes.MessageMusicAddedToQueueData).failReason = t(
							"triggers.actions.music.fail_reasons." + code,
							{
								DURATION: "03:33",
								SEARCH: "Mitchiri Neko March",
							},
						);
					} else if (triggerEvent.value == TriggerTypes.AD_APPROACHING) {
						(m as TwitchatDataTypes.MessageAdBreakApproachingData).delay_ms =
							trigger.adBreakDelay || 0;
					} else if (triggerEvent.value == TriggerTypes.STREAMLABS_DONATION) {
						(m as TwitchatDataTypes.StreamlabsDonationData).eventType = "donation";
						(m as TwitchatDataTypes.StreamlabsDonationData).amount = amount;
						(m as TwitchatDataTypes.StreamlabsDonationData).amountFormatted =
							amountFormatted;
					} else if (triggerEvent.value == TriggerTypes.STREAMLABS_MERCH) {
						(m as TwitchatDataTypes.StreamlabsMerchData).eventType = "merch";
						(m as TwitchatDataTypes.StreamlabsMerchData).product = "T-shirt";
					} else if (triggerEvent.value == TriggerTypes.STREAMLABS_PATREON_PLEDGE) {
						(m as TwitchatDataTypes.StreamlabsPatreonPledgeData).eventType =
							"patreon_pledge";
						(m as TwitchatDataTypes.StreamlabsPatreonPledgeData).amount = amount;
						(m as TwitchatDataTypes.StreamlabsPatreonPledgeData).amountFormatted =
							amountFormatted;
					} else if (triggerEvent.value == TriggerTypes.STREAMLABS_CHARITY_TIP) {
						(m as TwitchatDataTypes.StreamlabsCharityData).eventType = "charity";
						(m as TwitchatDataTypes.StreamlabsCharityData).amount = amount;
						(m as TwitchatDataTypes.StreamlabsCharityData).amountFormatted =
							amountFormatted;
					} else if (triggerEvent.value == TriggerTypes.KOFI_DONATION) {
						(m as TwitchatDataTypes.KofiDonationData).eventType = "donation";
						(m as TwitchatDataTypes.KofiDonationData).amount = amount;
						(m as TwitchatDataTypes.KofiDonationData).amountFormatted = amountFormatted;
					} else if (triggerEvent.value == TriggerTypes.KOFI_MERCH) {
						(m as TwitchatDataTypes.KofiMerchData).eventType = "merch";
						(m as TwitchatDataTypes.KofiMerchData).products = [
							{ id: "123456", name: "T-shirt", quantity: 1 },
							{ id: "234561", name: "Hoodie", quantity: 1 },
						];
					} else if (triggerEvent.value == TriggerTypes.KOFI_SUBSCRIPTION) {
						(m as TwitchatDataTypes.KofiSubscriptionData).eventType = "subscription";
						(m as TwitchatDataTypes.KofiSubscriptionData).amount = amount;
						(m as TwitchatDataTypes.KofiSubscriptionData).amountFormatted =
							amountFormatted;
						(m as TwitchatDataTypes.KofiSubscriptionData).tier = Utils.pickRand([
							"Gold",
							"Bronze",
							"Silver",
							"Poop",
						]);
					} else if (triggerEvent.value == TriggerTypes.KOFI_COMMISSION) {
						(m as TwitchatDataTypes.KofiCommissionData).eventType = "commission";
						(m as TwitchatDataTypes.KofiCommissionData).amount = amount;
						(m as TwitchatDataTypes.KofiCommissionData).amountFormatted =
							amountFormatted;
						(m as TwitchatDataTypes.KofiCommissionData).currency = "EUR";
					} else if (triggerEvent.value == TriggerTypes.TIPEEE_SUB) {
						(m as TwitchatDataTypes.MessageTipeeeDonationData).recurring = true;
					} else if (triggerEvent.value == TriggerTypes.TIPEEE_RESUB) {
						(m as TwitchatDataTypes.MessageTipeeeDonationData).recurring = true;
						(m as TwitchatDataTypes.MessageTipeeeDonationData).recurringCount =
							Math.round(Math.random() * 10);
					} else if (triggerEvent.value == TriggerTypes.POWER_UP_MESSAGE) {
						(m as TwitchatDataTypes.MessageChatData).twitch_animationId =
							Utils.pickRand(["rainbow-eclipse", "simmer"]);
					} else if (triggerEvent.value == TriggerTypes.VOICEMOD) {
						delete (m as TwitchatDataTypes.MessageVoicemodData).soundID;
						delete (m as TwitchatDataTypes.MessageVoicemodData).soundName;
					} else if (triggerEvent.value == TriggerTypes.VOICEMOD_SOUND_EFFECT) {
						delete (m as TwitchatDataTypes.MessageVoicemodData).voiceID;
						delete (m as TwitchatDataTypes.MessageVoicemodData).voiceName;
					} else if (triggerEvent.value == TriggerTypes.MONITOR_RESTRICT_OFF) {
						(m as TwitchatDataTypes.MessageLowtrustTreatmentData).restricted = (
							m as TwitchatDataTypes.MessageLowtrustTreatmentData
						).monitored = false;
					} else if (triggerEvent.value == TriggerTypes.MONITOR_ON) {
						(m as TwitchatDataTypes.MessageLowtrustTreatmentData).monitored = true;
					} else if (triggerEvent.value == TriggerTypes.RESTRICT_ON) {
						(m as TwitchatDataTypes.MessageLowtrustTreatmentData).restricted = false;
					} else if (triggerEvent.value == TriggerTypes.MESSAGE_ANSWER) {
						const fakeMessage =
							await storeDebug.simulateMessage<TwitchatDataTypes.MessageChatData>(
								TwitchatDataTypes.TwitchatMessageType.MESSAGE,
							);
						(m as TwitchatDataTypes.MessageChatData).answersTo = fakeMessage;
					} else if (triggerEvent.value == TriggerTypes.POLL_START) {
						(m as TwitchatDataTypes.MessagePollData).isStart = true;
					} else if (triggerEvent.value == TriggerTypes.PREDICTION_START) {
						(m as TwitchatDataTypes.MessagePredictionData).isStart = true;
					} else if (triggerEvent.value == TriggerTypes.CHAT_POLL_START) {
						(m as TwitchatDataTypes.MessageChatPollData).isStart = true;
					}

					void TriggerActionHandler.instance.execute(m, true, trigger.id);
				},
				false,
			);
		}
	}
}

/**
 * Delete a trigger
 * @param id
 */
function deleteTrigger(id: string): void {
	storeMain
		.confirm(t("triggers.delete_confirm"))
		.then(() => {
			showForm.value = false;
			createFolderTarget.value = "";
			storeTriggers.deleteTrigger(id);
			storeTriggers.openTriggerList();
		})
		.catch((error) => {});
}

defineExpose({
	onNavigateBack,
	reload,
});
</script>

<style scoped lang="less">
.paramstriggers {
	.createBt {
		margin: auto;
	}

	.premiumLimit {
		text-align: center;
		.button {
			display: flex;
			margin: auto;
			margin-top: 0.5em;
		}
	}

	.ctas {
		column-gap: 1em;
		row-gap: 0.25em;
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		margin-top: 0.5em;
		flex-wrap: wrap;
	}

	.exportForm {
		margin: auto;
	}
}
</style>
