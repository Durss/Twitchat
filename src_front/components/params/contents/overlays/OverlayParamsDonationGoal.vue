<template>
	<div class="overlayparamsdonationgoal overlayParamsSection">
		<div class="header">{{ t("donation_goals.header") }}</div>

		<div class="createForm">
			<TTButton class="addBt" v-if="!maxOverlaysReached" @click="addGrid()" icon="add">{{
				t("donation_goals.create_bt")
			}}</TTButton>

			<PremiumLimitMessage
				v-else
				label="donation_goals.non_premium_limit"
				premiumLabel="donation_goals.premium_limit"
				:max="$config.MAX_DONATION_GOALS"
				:maxPremium="$config.MAX_DONATION_GOALS_PREMIUM"
			/>
		</div>

		<VueDraggable
			class="overlayList"
			v-model="storeDonationGoals.overlayList"
			:group="{ name: 'bingo_grids' }"
			handle=".header"
			:animation="250"
			@end="storeDonationGoals.saveData()"
		>
			<ToggleBlock
				v-for="overlay in storeDonationGoals.overlayList"
				editableTitle
				v-model:title="overlay.title"
				:titleDefault="t('donation_goals.default_title')"
				:titleMaxLengh="30"
				:open="false"
				:key="overlay.id"
				:disabled="!overlay.enabled"
				@update:title="save(overlay.id)"
			>
				<template #left_actions>
					<div class="leftActions">
						<ToggleButton
							v-model="overlay.enabled"
							@click.stop
							@change="save(overlay.id)"
							v-if="
								storeAuth.isPremium ||
								overlay.enabled ||
								storeDonationGoals.overlayList.filter((v) => v.enabled).length <
									$config.MAX_DONATION_GOALS
							"
						/>
					</div>
				</template>

				<template #right_actions>
					<TTButton
						@click.stop="duplicateGrid(overlay.id)"
						data-close-popout
						icon="copy"
						v-tooltip="t('global.duplicate')"
						v-if="!maxOverlaysReached"
					/>
					<TTButton
						@click.stop
						:copy="overlay.id"
						icon="id"
						v-tooltip="t('global.copy_id')"
					/>
					<TTButton
						@click.stop="storeDonationGoals.removeOverlay(overlay.id)"
						icon="trash"
						alert
					/>
				</template>

				<div class="form">
					<div class="overlayInstallCard">
						<h1><Icon name="obs" />{{ t("donation_goals.install_title") }}</h1>
						<OverlayInstaller
							type="donationgoals"
							:sourceSuffix="overlay.title"
							:id="overlay.id"
							:queryParams="{ bid: overlay.id }"
						/>
					</div>

					<form
						class="card-item dark simulate"
						@submit.prevent="simulateAmount(overlay.id)"
					>
						<input type="number" step="any" v-model="simulatedAmount" />
						<span class="currency" v-if="overlay.currency">{{ overlay.currency }}</span>
						<TTButton icon="test" type="submit">{{
							t("donation_goals.simulate_bt")
						}}</TTButton>
					</form>

					<ParamItem
						:paramData="param_dataSource[overlay.id]!"
						v-model="overlay.dataSource"
						@change="save(overlay.id)"
					>
						<div
							class="card-item alert missingCharity"
							v-if="
								overlay.dataSource == 'streamlabs_charity' &&
								storeStreamlabs.charityTeam == null
							"
						>
							<div>{{ t("donation_goals.streamlabs_charity_not_connected") }}</div>
							<TTButton icon="streamlabs" @click="openStreamlabs" light alert>{{
								t("global.connect")
							}}</TTButton>
						</div>
						<div
							class="card-item alert missingCharity"
							v-if="overlay.dataSource == 'tiltify' && !storeTiltify.connected"
						>
							<div>{{ t("donation_goals.tiltify_not_connected") }}</div>
							<TTButton icon="tiltify" @click="openTiltify" light alert>{{
								t("global.connect")
							}}</TTButton>
						</div>
						<div
							class="card-item alert missingCharity"
							v-else-if="
								overlay.dataSource == 'tiltify' &&
								storeTiltify.campaignList.length == 0
							"
						>
							<div>{{ t("donation_goals.tiltify_no_campaign") }}</div>
						</div>
						<div
							class="card-item alert missingCharity"
							v-else-if="
								overlay.dataSource == 'counter' &&
								storeCounters.counterList.length == 0
							"
						>
							<div>{{ t("donation_goals.counter_empty") }}</div>
							<TTButton icon="counter" @click="openCounters" light alert>{{
								t("donation_goals.counter_createBt")
							}}</TTButton>
						</div>
						<div
							class="card-item alert missingCharity"
							v-else-if="
								overlay.dataSource == 'twitch_charity' && !canListTwitchCharities
							"
						>
							<div>{{ t("donation_goals.twitch_charity_not_connected") }}</div>
							<TTButton
								icon="twitch_charity"
								@click="grantCharityScope"
								light
								alert
								>{{ t("global.grant_scope") }}</TTButton
							>
						</div>
						<div
							class="card-item alert missingCharity"
							v-else-if="
								overlay.dataSource == 'twitch_charity' &&
								!storeTwitchCharity.currentCharity
							"
						>
							<div>{{ t("donation_goals.twitch_charity_no_campaign") }}</div>
							<TTButton
								type="link"
								href="https://dashboard.twitch.tv/charity/"
								target="_blank"
								icon="newtab"
								alert
								light
								>{{ t("donation_goals.twitch_charity_open") }}</TTButton
							>
						</div>

						<ParamItem
							:paramData="param_campaignId[overlay.id]!"
							v-model="overlay.campaignId"
							@change="save(overlay.id)"
							v-if="
								(overlay.dataSource == 'streamlabs_charity' ||
									overlay.dataSource == 'tiltify' ||
									overlay.dataSource == 'twitch_charity') &&
								(param_campaignId[overlay.id]!.listValues || []).length > 0
							"
							:childLevel="1"
							noBackground
						/>

						<ParamItem
							:paramData="param_counterId[overlay.id]!"
							v-model="overlay.counterId"
							@change="save(overlay.id)"
							v-if="
								overlay.dataSource == 'counter' &&
								(param_counterId[overlay.id]!.listValues || []).length > 0
							"
							:childLevel="1"
							noBackground
						/>

						<div
							class="parameter-child charityDetails"
							v-if="
								overlay.dataSource == 'twitch_charity' &&
								storeTwitchCharity.currentCharity != null
							"
						>
							<div class="holder">
								<span
									><Icon name="twitch_charity" />{{
										t("donation_goals.param_campaignId")
									}}:</span
								>
								<a
									:href="storeTwitchCharity.currentCharity!.charity_website"
									target="_blank"
									><Icon name="newtab" />{{
										storeTwitchCharity.currentCharity!.charity_name
									}}</a
								>
							</div>
						</div>

						<div
							class="parameter-child charityDetails"
							v-if="
								overlay.dataSource == 'streamlabs_charity' &&
								storeStreamlabs.charityTeam != null
							"
						>
							<div class="holder">
								<span
									><Icon name="streamlabs" />{{
										t("donation_goals.param_campaignId")
									}}:</span
								>
								<a :href="storeStreamlabs.charityTeam.pageUrl" target="_blank"
									><Icon name="newtab" />{{
										storeStreamlabs.charityTeam.title
									}}</a
								>
							</div>
							<div class="amount">
								<p>{{ t("streamlabs.raised_personnal") }}</p>
								<strong>{{
									storeStreamlabs.charityTeam.amountRaisedPersonnal_cents / 100
								}}</strong
								><span class="currency">{{
									storeStreamlabs.charityTeam.currency
								}}</span>
								<template v-if="storeStreamlabs.charityTeam.amountGoal_cents > 0">
									/
									<strong>{{
										storeStreamlabs.charityTeam.amountGoal_cents / 100
									}}</strong
									><span class="currency">{{
										storeStreamlabs.charityTeam.currency
									}}</span>
								</template>
							</div>
							<div class="amount">
								<p>{{ t("streamlabs.raised_team") }}</p>
								<strong>{{
									storeStreamlabs.charityTeam.amountRaised_cents / 100
								}}</strong
								><span class="currency">{{
									storeStreamlabs.charityTeam.currency
								}}</span>
							</div>
							<TTButton
								icon="refresh"
								@click="resyncTips()"
								:loading="storeStreamlabs.isLoading"
								>{{ t("donation_goals.import_streamlabs_resync") }}</TTButton
							>
							<TTButton
								icon="download"
								v-if="!showSLCGoalImport"
								@click="showSLCGoalImport = true"
								>{{ t("donation_goals.import_streamlabs_goals") }}</TTButton
							>
							<ul v-else-if="!showSLCGoalSuccess">
								<i18n-t
									scope="global"
									keypath="donation_goals.import_streamlabs_step1"
									tag="li"
								>
									<template #LINK>
										<a
											:href="t('donation_goals.import_streamlabs_step1_url')"
											target="_blank"
											><Icon name="newtab" />{{
												t("donation_goals.import_streamlabs_step1_link")
											}}</a
										>
									</template>
								</i18n-t>
								<li>
									<label for="slc_dg_import_url">{{
										t("donation_goals.import_streamlabs_step2")
									}}</label>
									<form @submit.prevent="importDonationGoalsFromSLC(overlay)">
										<input
											type="text"
											id="slc_dg_import_url"
											v-model="slcGoalImportURL"
											placeholder="https://streamlabscharity.com/widgets/milestone/..."
										/>
										<TTButton
											type="submit"
											:loading="importingSLCGoals"
											icon="download"
											primary
											>{{ t("global.import") }}</TTButton
										>
									</form>
								</li>
							</ul>
							<div
								class="card-item primary"
								@click="showSLCGoalSuccess = showSLCGoalImport = false"
								v-if="showSLCGoalSuccess"
							>
								<Icon name="checkmark" />
								{{ t("donation_goals.import_streamlabs_complete") }}
							</div>
						</div>
					</ParamItem>
					<ParamItem
						:paramData="param_currency[overlay.id]!"
						v-model="overlay.currency"
						@change="save(overlay.id)"
						class="currencyField"
					/>
					<ParamItem
						:paramData="param_color[overlay.id]!"
						v-model="overlay.color"
						@change="save(overlay.id)"
					/>
					<ParamItem
						:paramData="param_notifyTips[overlay.id]!"
						v-model="overlay.notifyTips"
						@change="save(overlay.id)"
						v-if="overlay.dataSource != 'counter'"
					/>
					<ParamItem
						:paramData="param_autoDisplay[overlay.id]!"
						v-model="overlay.autoDisplay"
						@change="save(overlay.id)"
					/>
					<ParamItem
						:paramData="param_hideDone[overlay.id]!"
						v-model="overlay.hideDone"
						@change="save(overlay.id)"
					>
						<ParamItem
							:paramData="param_hideDelay[overlay.id]!"
							v-model="overlay.hideDelay"
							@change="save(overlay.id)"
							:childLevel="1"
							noBackground
						/>
					</ParamItem>
					<ParamItem
						:paramData="param_limitEntryCount[overlay.id]!"
						v-model="overlay.limitEntryCount"
						@change="save(overlay.id)"
					>
						<ParamItem
							:paramData="param_maxDisplayedEntries[overlay.id]!"
							v-model="overlay.maxDisplayedEntries"
							@change="save(overlay.id)"
							:childLevel="1"
							noBackground
						/>
					</ParamItem>

					<Splitter>{{ t("donation_goals.goal_list") }}</Splitter>

					<div class="goalItemList" v-if="overlay.goalList.length > 0">
						<div
							class="card-item goalItem"
							v-for="goal in overlay.goalList || []"
							:key="goal.id"
						>
							<input
								class="amount"
								type="number"
								v-model="goal.amount"
								min="0"
								max="1000000000"
								@change="save(overlay.id)"
								step="any"
							/>
							<TTButton
								@click.stop
								:copy="goal.id"
								icon="id"
								v-tooltip="t('global.copy_id')"
								class="copyIdBt"
								small
							/>
							<span class="currency" v-if="overlay.currency">{{
								overlay.currency
							}}</span>
							<textarea
								class="title"
								rows="1"
								maxlength="150"
								v-model="goal.title"
								:placeholder="t('donation_goals.param_goal_title_placeholder')"
								@change="save(overlay.id)"
								@blur="goal.title = goal.title.substring(0, 150)"
							></textarea>
							<TTButton @click="removeGoal(overlay, goal.id)" icon="trash" alert />
							<ParamItem
								class="secret"
								:paramData="param_goal_secret[goal.id]!"
								v-model="goal.secret"
								@change="
									onSecretChange(goal);
									save(overlay.id);
								"
								noBackground
							>
								<div class="parameter-child secretOptions">
									<div class="holder option">
										<label :for="'secret_blur_' + goal.id">{{
											t("donation_goals.param_goal_secret_blur")
										}}</label>
										<input
											type="radio"
											v-model="goal.secret_type"
											:name="'secret_type-' + goal.id"
											value="blur"
											:id="'secret_blur_' + goal.id"
											@change="save(overlay.id)"
										/>
									</div>
								</div>
								<div class="parameter-child secretOptions">
									<div class="holder option">
										<label :for="'secret_preogressive_' + goal.id">{{
											t("donation_goals.param_goal_secret_progressive")
										}}</label>
										<input
											type="radio"
											v-model="goal.secret_type"
											:name="'secret_type-' + goal.id"
											value="progressive"
											:id="'secret_preogressive_' + goal.id"
											@change="save(overlay.id)"
										/>
									</div>
								</div>
							</ParamItem>
						</div>
					</div>

					<TTButton @click="addGoal(overlay)" icon="add" class="addGoalBt">{{
						t("donation_goals.add_goal_bt")
					}}</TTButton>
				</div>
			</ToggleBlock>
		</VueDraggable>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import Splitter from "@/components/Splitter.vue";
import ToggleBlock from "@/components/ToggleBlock.vue";
import ToggleButton from "@/components/ToggleButton.vue";
import TTButton from "@/components/TTButton.vue";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeCounters as useStoreCounters } from "@/store/counters/storeCounters";
import { storeDonationGoals as useStoreDonationGoals } from "@/store/donation_goals/storeDonationGoals";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { storeStreamlabs as useStoreStreamlabs } from "@/store/streamlabs/storeStreamlabs";
import { storeTiltify as useStoreTiltify } from "@/store/tiltify/storeTiltify";
import { storeTwitchCharity as useStoreTwitchCharity } from "@/store/twitch_charity/storeTwitchCharity";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Config from "@/utils/Config";
import { TwitchScopes } from "@/utils/twitch/TwitchScopes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import Utils from "@/utils/Utils";
import { computed, onBeforeMount, ref } from "vue";
import { VueDraggable } from "vue-draggable-plus";
import { useI18n } from "vue-i18n";
import ParamItem from "../../ParamItem.vue";
import PremiumLimitMessage from "../../PremiumLimitMessage.vue";
import OverlayInstaller from "./OverlayInstaller.vue";

const { t } = useI18n();
const storeAuth = useStoreAuth();
const storeParams = useStoreParams();
const storeTiltify = useStoreTiltify();
const storeCounters = useStoreCounters();
const storeStreamlabs = useStoreStreamlabs();
const storeDonationGoals = useStoreDonationGoals();
const storeTwitchCharity = useStoreTwitchCharity();

const simulatedAmount = ref(10);
const slcGoalImportURL = ref("");
const importingSLCGoals = ref(false);
const showSLCGoalImport = ref(false);
const showSLCGoalSuccess = ref(false);

const param_color = ref<{ [overlayId: string]: TwitchatDataTypes.ParameterData<string> }>({});
const param_showCurrency = ref<{ [overlayId: string]: TwitchatDataTypes.ParameterData<string> }>(
	{},
);
const param_currency = ref<{ [overlayId: string]: TwitchatDataTypes.ParameterData<string> }>({});
const param_notifyTips = ref<{ [overlayId: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_autoDisplay = ref<{ [overlayId: string]: TwitchatDataTypes.ParameterData<boolean> }>(
	{},
);
const param_hideDone = ref<{ [overlayId: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_hideDelay = ref<{ [overlayId: string]: TwitchatDataTypes.ParameterData<number> }>({});
const param_limitEntryCount = ref<{
	[overlayId: string]: TwitchatDataTypes.ParameterData<boolean>;
}>({});
const param_maxDisplayedEntries = ref<{
	[overlayId: string]: TwitchatDataTypes.ParameterData<number>;
}>({});
const param_goal_secret = ref<{ [overlayId: string]: TwitchatDataTypes.ParameterData<boolean> }>(
	{},
);
const param_goal_secret_type = ref<{
	[overlayId: string]: TwitchatDataTypes.ParameterData<
		TwitchatDataTypes.DonationGoalOverlayConfig["goalList"][number]["secret_type"]
	>;
}>({});
const param_dataSource = ref<{
	[overlayId: string]: TwitchatDataTypes.ParameterData<
		TwitchatDataTypes.DonationGoalOverlayConfig["dataSource"],
		TwitchatDataTypes.DonationGoalOverlayConfig["dataSource"]
	>;
}>({});
const param_campaignId = ref<{
	[overlayId: string]: TwitchatDataTypes.ParameterData<string, string>;
}>({});
const param_counterId = ref<{
	[overlayId: string]: TwitchatDataTypes.ParameterData<string, string>;
}>({});

let prevSimulatedAmount = 0;

const maxOverlaysReached = computed(() => {
	const max = storeAuth.isPremium
		? Config.instance.MAX_DONATION_GOALS_PREMIUM
		: Config.instance.MAX_DONATION_GOALS;
	return storeDonationGoals.overlayList.length >= max;
});

/**
 * Get if charity read scope has been granted
 */
const canListTwitchCharities = computed(() => {
	return TwitchUtils.hasScopes([TwitchScopes.CHARITY_READ]);
});

/**
 * Save data to storage
 */
onBeforeMount(() => {
	initParams();
});

/**
 * Opens Tiltify parameters
 */
function openTiltify(): void {
	storeParams.openParamsPage(
		TwitchatDataTypes.ParameterPages.CONNECTIONS,
		TwitchatDataTypes.ParamDeepSections.TILTIFY,
	);
}

/**
 * Opens Streamlabs parameters
 */
function openStreamlabs(): void {
	storeParams.openParamsPage(
		TwitchatDataTypes.ParameterPages.CONNECTIONS,
		TwitchatDataTypes.ParamDeepSections.STREAMLABS,
	);
}

/**
 * Opens Counters parameters
 */
function openCounters(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.COUNTERS);
}

/**
 * Request for charity scope
 */
function grantCharityScope(): void {
	TwitchUtils.requestScopes([TwitchScopes.CHARITY_READ]);
}

/**
 * Save data to storage
 */
function save(overlayId: string): void {
	storeDonationGoals.saveData(overlayId);
}

/**
 * Create a new grid
 */
function addGrid(): void {
	storeDonationGoals.addOverlay();
	initParams();
}

/**
 * Duplicate given grid ID
 */
function duplicateGrid(id: string): void {
	storeDonationGoals.duplicateOverlay(id);
	initParams();
}

/**
 * Add a goal entry
 */
function addGoal(
	overlay: TwitchatDataTypes.DonationGoalOverlayConfig,
	title: string = "",
	amount: number = 0,
): void {
	const goal: TwitchatDataTypes.DonationGoalOverlayConfig["goalList"][number] = {
		id: Utils.getUUID(),
		amount,
		title,
		secret: false,
		secret_type: "blur",
	};

	param_goal_secret.value[goal.id] = {
		type: "boolean",
		value: false,
		labelKey: "donation_goals.param_goal_secret",
		icon: "anon",
	};

	param_maxDisplayedEntries.value[overlay.id]!.max = overlay.goalList.length;

	overlay.goalList.push(goal);

	save(overlay.id);
}

/**
 * Removes a goal
 */
function removeGoal(overlay: TwitchatDataTypes.DonationGoalOverlayConfig, goalId: string): void {
	for (let i = 0; i < overlay.goalList.length; i++) {
		const goal = overlay.goalList[i]!;
		if (goal.id != goalId) continue;
		overlay.goalList.splice(i, 1);
		i--;
	}
	save(overlay.id);
}

/**
 * Import donation goals from streamlabs charity
 * @param id
 */
async function importDonationGoalsFromSLC(
	overlay: TwitchatDataTypes.DonationGoalOverlayConfig,
): Promise<void> {
	importingSLCGoals.value = true;
	const token = slcGoalImportURL.value.split("/").pop();
	const goalRes = await fetch("https://streamlabscharity.com/api/v1/widgets/milestones/" + token);
	if (goalRes) {
		const goalJSON = (await goalRes.json()) as {
			campaign: { milestones: { display_name: string; amount: number }[] };
		};
		goalJSON.campaign.milestones.forEach((v) => {
			addGoal(overlay, v.display_name, v.amount / 100);
		});
		showSLCGoalSuccess.value = true;
	}
	importingSLCGoals.value = false;
}

/**
 * Simulates a new amount
 */
function simulateAmount(overlayId: string, forcedAmount?: number): void {
	if (forcedAmount != undefined) simulatedAmount.value = forcedAmount;
	storeDonationGoals.simulateDonation(
		overlayId,
		simulatedAmount.value,
		simulatedAmount.value - prevSimulatedAmount,
	);
	prevSimulatedAmount = simulatedAmount.value;
}

/**
 * Called when secret state of a goal is changed.
 * Initialize the default secret style
 */
function onSecretChange(goal: TwitchatDataTypes.DonationGoalOverlayConfig["goalList"][0]): void {
	if (goal.secret && !goal.secret_type) {
		goal.secret_type = "blur";
	}
}

function resyncTips(): void {
	storeStreamlabs.resyncCharityTips();
}

/**
 * Create parameters for a bingo entry
 * @param id
 */
function initParams(): void {
	storeDonationGoals.overlayList.forEach((overlay) => {
		const id = overlay.id;

		//Ignore if already initialized
		if (param_notifyTips.value[id]) return;
		if (overlay.hideDelay === undefined) overlay.hideDelay = 10;

		param_color.value[id] = {
			type: "color",
			value: "",
			labelKey: "donation_goals.param_color",
			icon: "color",
		};
		param_showCurrency.value[id] = {
			type: "boolean",
			value: "",
			labelKey: "donation_goals.param_showCurrency",
			icon: "coin",
		};
		param_currency.value[id] = {
			type: "string",
			value: "",
			maxLength: 5,
			labelKey: "donation_goals.param_currency",
			icon: "font",
		};
		param_notifyTips.value[id] = {
			type: "boolean",
			value: overlay.notifyTips,
			labelKey: "donation_goals.param_notifyTips",
			icon: "notification",
		};
		param_autoDisplay.value[id] = {
			type: "boolean",
			value: overlay.autoDisplay,
			labelKey: "donation_goals.param_autoDisplay",
			icon: "hide",
		};
		param_hideDone.value[id] = {
			type: "boolean",
			value: overlay.hideDone,
			labelKey: "donation_goals.param_hideDone",
			icon: "timer",
		};
		param_hideDelay.value[id] = {
			type: "duration",
			value: overlay.hideDelay || 10,
			max: 600,
			labelKey: "donation_goals.param_hideDelay",
			icon: "timer",
		};
		param_limitEntryCount.value[id] = {
			type: "boolean",
			value: overlay.limitEntryCount,
			labelKey: "donation_goals.param_limitEntryCount",
			icon: "number",
		};
		param_maxDisplayedEntries.value[id] = {
			type: "number",
			value: overlay.maxDisplayedEntries,
			min: 0,
			max: overlay.goalList.length,
			labelKey: "donation_goals.param_maxDisplayedEntries",
			icon: "number",
		};
		param_campaignId.value[id] = {
			type: "list",
			value: "",
			labelKey: "donation_goals.param_campaignId",
			icon: "charity",
		};
		param_counterId.value[id] = {
			type: "list",
			value: "",
			labelKey: "donation_goals.param_counterId",
			icon: "count",
		};
		param_dataSource.value[id] = {
			type: "list",
			value: overlay.dataSource,
			labelKey: "donation_goals.param_dataSource",
			icon: "charity",
			editCallback: (data) => {
				switch (data.value) {
					case "streamlabs_charity": {
						param_campaignId.value[id]!.listValues = [];
						param_campaignId.value[id]!.icon = "streamlabs";
						break;
					}

					case "tiltify": {
						const list: TwitchatDataTypes.ParameterDataListValue<string>[] = [];
						storeTiltify.campaignList.forEach((c) => {
							list.push({
								value: c.id,
								label: c.name,
							});
						});
						param_campaignId.value[id]!.listValues = list;
						param_campaignId.value[id]!.icon = "tiltify";
						break;
					}

					case "counter": {
						const list: TwitchatDataTypes.ParameterDataListValue<string>[] = [];
						storeCounters.counterList
							.filter((c) => c.perUser !== true)
							.forEach((c) => {
								list.push({
									value: c.id,
									label: c.name,
								});
							});
						param_counterId.value[id]!.listValues = list;
					}
				}
			},
		};
		//Make sure the campaign list is up to date on init
		param_dataSource.value[id].editCallback!(param_dataSource.value[id]);

		param_dataSource.value[id].listValues = [
			{ value: "tiltify", label: "Tiltify" },
			{ value: "streamlabs_charity", label: "Streamlabs Charity" },
			{ value: "twitch_charity", labelKey: "donation_goals.twitch_charity" },
			{ value: "counter", labelKey: "donation_goals.counter_entry" },
			{ value: "twitch_subs", labelKey: "donation_goals.twitch_subs_entry" },
			{ value: "twitch_followers", labelKey: "donation_goals.twitch_followers_entry" },
		];

		overlay.goalList
			.sort((a, b) => a.amount - b.amount)
			.forEach((goal) => {
				param_goal_secret.value[goal.id] = {
					type: "boolean",
					value: goal.secret,
					labelKey: "donation_goals.param_goal_secret",
					icon: "anon",
				};
				param_goal_secret_type.value[goal.id] = {
					type: "string",
					value: "blur",
					labelKey: "donation_goals.param_goal_secret",
					icon: "anon",
				};
			});
	});
}
</script>

<style scoped lang="less">
.overlayparamsdonationgoal {
	width: 100%;
	max-width: 600px;
	min-width: 330px !important;
	display: flex;
	flex-direction: column;
	justify-content: stretch;

	.missingCharity {
		gap: 1em;
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-top: 0.5em;
	}
	.charityDetails {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		.icon {
			height: 1em;
			margin-right: 0.25em;
			vertical-align: middle;
		}
		.amount {
			gap: 0.5em;
			display: flex;
			flex-direction: row;
			.currency {
				margin-left: -0.25em;
			}
		}
		.holder {
			display: flex;
			flex-direction: row;
			justify-content: space-between;
			a {
				flex-basis: 300px;
			}
		}

		ul {
			list-style-position: inside;
			li:not(last-child) {
				margin-bottom: 0.5em;
			}
			form {
				display: flex;
				flex-direction: row;
				flex-grow: 1;
				margin-top: 0.25em;

				input {
					width: 0;
					flex-grow: 1;
				}
				& > * {
					border-radius: 0;
				}
				& > :first-child {
					border-top-left-radius: var(--border-radius);
					border-bottom-left-radius: var(--border-radius);
				}
				& > :last-child {
					border-top-right-radius: var(--border-radius);
					border-bottom-right-radius: var(--border-radius);
				}
			}
		}
	}

	.createForm {
		text-align: center;
	}

	.form,
	.goalItemList {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
	}

	.simulate {
		gap: 1px;
		display: flex;
		flex-direction: row;
		justify-content: center;
		& > * {
			border-radius: 0;
		}
		& > :first-child {
			border-top-left-radius: var(--border-radius);
			border-bottom-left-radius: var(--border-radius);
		}
		& > :last-child {
			border-top-right-radius: var(--border-radius);
			border-bottom-right-radius: var(--border-radius);
		}
		input {
			text-align: right;
			width: 0;
			flex-basis: 100px;
		}
	}

	.missingCharity {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.overlayList {
		display: flex;
		flex-direction: column;
		justify-content: stretch;
		gap: 0.5em;

		.currencyField {
			:deep(.inputHolder) {
				max-width: 135px;
			}
		}

		.splitter {
			margin: 1em 0 0.5em 0;
		}

		.goalItem {
			gap: 1px;
			row-gap: 0.5em;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			position: relative;
			overflow: visible;
			& > * {
				border-radius: 0;
			}
			& > :first-child {
				border-top-left-radius: var(--border-radius);
				border-bottom-left-radius: var(--border-radius);
			}
			.button {
				border-top-right-radius: var(--border-radius);
				border-bottom-right-radius: var(--border-radius);
			}
			.amount {
				min-width: 3em;
				flex-shrink: 0;
				text-align: right;
				field-sizing: content;
			}
			.title {
				flex-grow: 1;
				width: 0;
				resize: vertical;
				min-height: 1.75em;
				field-sizing: content;
			}
			.secret {
				flex-basis: 100%;
				.secretOptions {
					gap: 0.5em;
					display: flex;
					flex-direction: column;
					.option {
						display: flex;
						flex-direction: row;
						justify-content: space-between;
						label {
							flex-grow: 1;
							cursor: pointer;
						}
					}
				}
			}

			.copyIdBt {
				position: absolute;
				top: -0.5em;
				left: -0.5em;
				z-index: 1;
				border-radius: var(--border-radius);
				opacity: 0;
			}

			&:hover {
				background-color: var(--background-color-secondary);
				.copyIdBt {
					opacity: 1;
				}
			}
		}

		.addGoalBt {
			align-self: center;
		}
		.simulate .currency,
		.goalItem .currency {
			background-color: var(--background-color-fader);
			margin-left: -1px;
			display: flex;
			align-items: center;
			padding-right: 0.5em;
			font-size: 0.7em;
		}
	}
}
</style>

