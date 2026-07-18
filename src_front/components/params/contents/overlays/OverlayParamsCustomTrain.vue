<template>
	<div class="overlayparamscustomtrain overlayParamsSection">
		<div class="header">{{ t("overlay.customTrain.header") }}</div>

		<section>
			<TTButton class="addBt" v-if="!maxTrainsReached" @click="addEntry()" icon="add">{{
				t("overlay.customTrain.add_bt")
			}}</TTButton>

			<PremiumLimitMessage
				v-else
				label="overlay.customTrain.non_premium_limit"
				premiumLabel="overlay.customTrain.premium_limit"
				:max="Config.instance.MAX_CUSTOM_TRAIN"
				:maxPremium="Config.instance.MAX_CUSTOM_TRAIN_PREMIUM"
			/>
		</section>

		<VueDraggable
			class="entryList"
			v-model="storeCustomTrain.customTrainList"
			:group="{ name: 'labels' }"
			handle=".header"
			:animation="250"
			@end="storeCustomTrain.saveData()"
		>
			<ToggleBlock
				v-for="entry in storeCustomTrain.customTrainList"
				editableTitle
				v-model:title="entry.title"
				:titleDefault="t('overlay.customTrain.default_title')"
				:titleMaxLengh="30"
				:open="false"
				:key="entry.id"
				:disabled="!entry.enabled"
				@update:title="onChange(entry)"
			>
				<template #left_actions>
					<ToggleButton
						v-model="entry.enabled"
						@change="onChange(entry)"
						@click.stop
						v-if="
							storeAuth.isPremium ||
							entry.enabled ||
							storeCustomTrain.customTrainList.filter((v) => v.enabled).length <
								Config.instance.MAX_CUSTOM_TRAIN
						"
					/>

					<template v-if="train2Timer[entry.id]">
						<div
							v-tooltip="train2Timer[entry.id]!.tooltip"
							class="timer"
							:class="{ cooldown: train2Timer[entry.id]!.cooldown }"
							@click.stop="
								train2Timer[entry.id]!.cooldown
									? storeCustomTrain.resetCooldown(entry.id)
									: null
							"
						>
							<Icon name="timer" class="icon" />
							<div class="value">{{ train2Timer[entry.id]!.timer }}</div>
						</div>
					</template>
				</template>

				<template #right_actions>
					<TTButton
						class="actionBt"
						@click.stop
						:copy="entry.id"
						icon="id"
						v-tooltip="t('global.copy_id')"
						small
					/>
					<TTButton
						@click.stop="storeCustomTrain.deleteCustomTrain(entry.id)"
						icon="trash"
						alert
					/>
				</template>

				<div class="content">
					<div v-if="train2Record[entry.id]" class="card-item primary center record">
						<Icon name="leaderboard" />
						<i18n-t scope="global" keypath="overlay.customTrain.allTimeRecord_title">
							<template #LEVEL
								><strong>{{ train2Record[entry.id]!.level }}</strong></template
							>
							<template #DATE
								><i>{{ train2Record[entry.id]!.dateFormatted }}</i></template
							>
							<template #PERCENT
								><strong
									>{{
										Math.floor(train2Record[entry.id]!.percent * 100)
									}}%</strong
								></template
							>
							<template #AMOUNT
								><strong>{{
									train2Record[entry.id]!.amountFormatted
								}}</strong></template
							>
						</i18n-t>
					</div>
					<div class="overlayInstallCard">
						<h1><Icon name="obs" />{{ t("bingo_grid.form.install_title") }}</h1>
						<OverlayInstaller
							type="customtrain"
							:sourceSuffix="entry.title"
							:id="entry.id"
							:sourceTransform="{ width: 1200, height: 100 }"
						/>
					</div>

					<div class="card-item dark ctas">
						<TTButton
							icon="test"
							@click="simulateTrain(entry.id)"
							:disabled="entry.levelAmounts.length <= 1"
							>{{ t("overlay.customTrain.simulate_bt") }}</TTButton
						>
					</div>

					<div class="card-item platforms">
						<strong>{{ t("overlay.customTrain.param_platforms") }}</strong>
						<div class="platformsList">
							<TTButton
								class="platform"
								small
								v-tooltip="
									!storeStreamlabs.connected
										? t('overlay.customTrain.connectPlatform_tt')
										: ''
								"
								:disabled="!storeStreamlabs.connected"
								:primary="storeStreamlabs.connected && entry.platforms.streamlabs"
								@click.capture="
									!storeStreamlabs.connected
										? openConnections('streamlabs')
										: (entry.platforms.streamlabs = !entry.platforms.streamlabs)
								"
								icon="streamlabs"
								>Streamlabs</TTButton
							>

							<TTButton
								class="platform"
								small
								v-tooltip="
									!storeStreamelements.connected
										? t('overlay.customTrain.connectPlatform_tt')
										: ''
								"
								:disabled="!storeStreamelements.connected"
								:primary="
									storeStreamelements.connected && entry.platforms.streamelements
								"
								@click.capture="
									!storeStreamelements.connected
										? openConnections('streamelements')
										: (entry.platforms.streamelements =
												!entry.platforms.streamelements)
								"
								icon="streamelements"
								>Stream<br />Elements</TTButton
							>

							<TTButton
								class="platform"
								small
								v-tooltip="
									!storeTipeee.connected
										? t('overlay.customTrain.connectPlatform_tt')
										: ''
								"
								:disabled="!storeTipeee.connected"
								:primary="storeTipeee.connected && entry.platforms.tipeee"
								@click.capture="
									!storeTipeee.connected
										? openConnections('tipeee')
										: (entry.platforms.tipeee = !entry.platforms.tipeee)
								"
								icon="tipeee"
								>Tipeee</TTButton
							>

							<TTButton
								class="platform"
								small
								v-tooltip="
									!storeKofi.connected
										? t('overlay.customTrain.connectPlatform_tt')
										: ''
								"
								:disabled="!storeKofi.connected"
								:primary="storeKofi.connected && entry.platforms.kofi"
								@click.capture="
									!storeKofi.connected
										? openConnections('kofi')
										: (entry.platforms.kofi = !entry.platforms.kofi)
								"
								icon="kofi"
								>Ko-Fi</TTButton
							>

							<TTButton
								class="platform"
								small
								v-tooltip="
									!storePatreon.connected
										? t('overlay.customTrain.connectPlatform_tt')
										: ''
								"
								:disabled="!storePatreon.connected"
								:primary="storePatreon.connected && entry.platforms.patreon"
								@click.capture="
									!storePatreon.connected
										? openConnections('patreon')
										: (entry.platforms.patreon = !entry.platforms.patreon)
								"
								icon="patreon"
								>Patreon</TTButton
							>

							<TTButton
								class="platform"
								small
								v-tooltip="
									!storeTiltify.connected
										? t('overlay.customTrain.connectPlatform_tt')
										: ''
								"
								:disabled="!storeTiltify.connected"
								:primary="storeTiltify.connected && entry.platforms.tiltify"
								@click.capture="
									!storeTiltify.connected
										? openConnections('tiltify')
										: (entry.platforms.tiltify = !entry.platforms.tiltify)
								"
								icon="tiltify"
								>Tiltify</TTButton
							>

							<TTButton
								class="platform"
								small
								v-tooltip="
									!storeStreamlabs.charityTeam
										? t('overlay.customTrain.connectPlatform_tt')
										: ''
								"
								:disabled="!storeStreamlabs.charityTeam"
								:primary="
									storeStreamlabs.charityTeam != null &&
									entry.platforms.streamlabs_charity
								"
								@click.capture="
									!storeStreamlabs.charityTeam
										? openConnections('streamlabs')
										: (entry.platforms.streamlabs_charity =
												!entry.platforms.streamlabs_charity)
								"
								icon="streamlabs"
								>Streamlabs<br />charity</TTButton
							>

							<TTButton
								class="platform"
								small
								target="_blank"
								v-tooltip="
									!storeTwitchCharity.currentCharity
										? t('overlay.customTrain.connectPlatform_twitchCharity_tt')
										: ''
								"
								:class="{ disabled: !storeTwitchCharity.currentCharity }"
								:primary="
									storeTwitchCharity.currentCharity != null &&
									entry.platforms.twitch_charity
								"
								:type="!storeTwitchCharity.currentCharity ? 'link' : 'button'"
								:href="
									!storeTwitchCharity.currentCharity
										? 'https://dashboard.twitch.tv/charity/'
										: null
								"
								@click.capture="
									!storeTwitchCharity.currentCharity
										? null
										: (entry.platforms.twitch_charity =
												!entry.platforms.twitch_charity)
								"
								icon="twitch_charity"
								>Twitch Charity</TTButton
							>
						</div>
					</div>

					<div class="themeBlock">
						<div class="font">
							<ParamItem
								:paramData="param_textFont[entry.id]!"
								v-model="entry.textFont"
								@change="onChange(entry)"
							/>
							<ParamItem
								:paramData="param_textSize[entry.id]!"
								v-model="entry.textSize"
								@change="onChange(entry)"
							/>
						</div>
						<div class="colors">
							<ParamItem
								:paramData="param_colorFill[entry.id]!"
								v-model="entry.colorFill"
								@change="onChange(entry)"
							/>
							<ParamItem
								:paramData="param_colorBg[entry.id]!"
								v-model="entry.colorBg"
								@change="onChange(entry)"
							/>
							<CurrencyPatternInput
								v-model="entry.currency"
								@change="onChange(entry)"
							/>
						</div>
					</div>

					<div class="card-item trainRender">
						<strong
							><Icon name="timer" />{{
								t("overlay.customTrain.param_approaching")
							}}</strong
						>
						<OverlayCustomTrainRenderer
							class="train"
							id="approaching"
							:showApproaching="true"
							:size="entry.textSize"
							:fontFamily="entry.textFont"
							:colorText="entry.colorFill"
							:colorBg="entry.colorBg"
							:eventCount="entry.triggerEventCount"
							:eventDone="entry.approachEventCount"
							:approachingEmote="entry.approachingEmote"
							:expiresAt="Date.now() + entry.levelsDuration_s * 1000"
							v-model:titleApproaching="entry.approachingLabel"
							v-model:title="entry.title"
							v-model:levelName="entry.levelName"
							@edit="onChange(entry)"
							@selectEmote="
								($event: MouseEvent) =>
									openEmoteSelector(entry, 'approaching', $event)
							"
							editable
						/>
						<ParamItem
							:paramData="param_approachEventCount[entry.id]!"
							v-model="entry.approachEventCount"
							@change="onChange(entry)"
							:childLevel="1"
							noBackground
						/>
						<ParamItem
							:paramData="param_triggerEventCount[entry.id]!"
							v-model="entry.triggerEventCount"
							@change="onChange(entry)"
							:childLevel="1"
							noBackground
						/>
					</div>

					<div class="card-item trainRender">
						<strong
							><Icon name="train" />{{
								t("overlay.customTrain.param_progress")
							}}</strong
						>
						<OverlayCustomTrainRenderer
							class="train"
							id="progress"
							:showProgress="true"
							:size="entry.textSize"
							:fontFamily="entry.textFont"
							:colorText="entry.colorFill"
							:colorBg="entry.colorBg"
							:percent="0.35"
							:expiresAt="Date.now() + entry.levelsDuration_s * 1000"
							:amountLeft="42"
							:amountLeftFormat="entry.currency"
							v-model:title="entry.title"
							v-model:levelName="entry.levelName"
							@edit="onChange(entry)"
							editable
						/>
						<ParamItem
							:paramData="param_levelsDuration_ms[entry.id]!"
							v-model="entry.levelsDuration_s"
							@change="onChange(entry)"
							:childLevel="1"
							noBackground
						/>
						<ParamItem
							:paramData="param_levelAmounts[entry.id]!"
							v-model="param_levelAmounts[entry.id]!.value"
							@change="onChange(entry, true)"
							:childLevel="1"
							noBackground
						/>
						<div class="offset info">
							{{
								t("overlay.customTrain.param_levelAmounts_count", {
									COUNT: entry.levelAmounts.length,
								})
							}}
						</div>
						<i18n-t
							scope="global"
							class="card-item premium plz"
							tag="div"
							keypath="overlay.customTrain.param_levelAmounts_plz"
							v-if="(entry.levelAmounts.concat().pop() || 0) > 1000"
						>
							<template #LINK>
								<a @click.prevent="openDonationForm()">{{
									t("overlay.customTrain.param_levelAmounts_plz_link")
								}}</a>
							</template>
							<template #EMOJI>
								<br /><span class="head">🥺</span><br />👉👈
							</template>
						</i18n-t>
					</div>

					<div class="card-item trainRender">
						<strong
							><Icon name="train_boost" />{{
								t("overlay.customTrain.param_levelUp")
							}}</strong
						>
						<OverlayCustomTrainRenderer
							class="train"
							id="levelUp"
							:showLevelUp="true"
							:size="entry.textSize"
							:fontFamily="entry.textFont"
							:colorText="entry.colorFill"
							:colorBg="entry.colorBg"
							:titleLevelUp="entry.levelUpLabel"
							:levelUpEmote="entry.levelUpEmote"
							v-model:title="entry.title"
							v-model:levelName="entry.levelName"
							@edit="onChange(entry)"
							@selectEmote="
								($event: MouseEvent) => openEmoteSelector(entry, 'levelUp', $event)
							"
							editable
						/>

						<i18n-t
							scope="global"
							tag="div"
							class="info"
							keypath="overlay.customTrain.param_levelUp_placeholder"
						>
							<template #PLACEHOLDER><strong v-click2Select>{X}</strong></template>
						</i18n-t>
						<ParamItem
							:paramData="param_postLevelUpOnChat[entry.id]!"
							v-model="entry.postLevelUpOnChat"
							@change="onChange(entry)"
							:childLevel="1"
							noBackground
						>
							<ParamItem
								:paramData="param_postLevelUpMessage[entry.id]!"
								v-model="entry.postLevelUpChatMessage"
								@change="onChange(entry)"
								:childLevel="1"
								noBackground
							/>
						</ParamItem>
					</div>

					<div class="card-item trainRender">
						<strong
							><Icon name="sub" />{{ t("overlay.customTrain.param_record") }}</strong
						>
						<OverlayCustomTrainRenderer
							class="train"
							id="record"
							:showRecord="true"
							:size="entry.textSize"
							:fontFamily="entry.textFont"
							:colorText="entry.colorFill"
							:colorBg="entry.colorBg"
							:recordColorText="entry.recordColorFill"
							:recordColorBg="entry.recordColorBg"
							:titleRecord="entry.recordLabel"
							:recordEmote="entry.recordEmote"
							:isRecord="true"
							v-model:title="entry.recordLabel"
							v-model:levelName="entry.levelName"
							@edit="onChange(entry)"
							@selectEmote="
								($event: MouseEvent) => openEmoteSelector(entry, 'record', $event)
							"
							editable
						/>
						<div class="colors">
							<ParamItem
								class="child"
								:paramData="param_recordColorFill[entry.id]!"
								v-model="entry.recordColorFill"
								@change="onChange(entry)"
								noBackground
							/>
							<ParamItem
								:paramData="param_recordColorBg[entry.id]!"
								v-model="entry.recordColorBg"
								@change="onChange(entry)"
								noBackground
							/>
						</div>
					</div>

					<div class="card-item trainRender">
						<strong
							><Icon name="leaderboard" />{{
								t("overlay.customTrain.param_success")
							}}</strong
						>
						<OverlayCustomTrainRenderer
							class="train"
							id="success"
							:showSuccess="true"
							:size="entry.textSize"
							:fontFamily="entry.textFont"
							:colorText="entry.colorFill"
							:colorBg="entry.colorBg"
							:successEmote="entry.successEmote"
							v-model:titleSuccess="entry.successLabel"
							v-model:title="entry.title"
							v-model:levelName="entry.levelName"
							@edit="onChange(entry)"
							@selectEmote="
								($event: MouseEvent) => openEmoteSelector(entry, 'success', $event)
							"
							editable
						/>
						<ParamItem
							:paramData="param_cooldownDuration_ms[entry.id]!"
							v-model="entry.cooldownDuration_s"
							@change="onChange(entry)"
							:childLevel="1"
							noBackground
						/>

						<ParamItem
							:paramData="param_postSuccessOnChat[entry.id]!"
							v-model="entry.postSuccessOnChat"
							@change="onChange(entry)"
							:childLevel="1"
							noBackground
						>
							<ParamItem
								:paramData="param_postSuccessMessage[entry.id]!"
								v-model="entry.postSuccessChatMessage"
								@change="onChange(entry)"
								:childLevel="1"
								noBackground
							/>
						</ParamItem>
					</div>

					<div class="card-item trainRender">
						<strong
							><Icon name="sad" />{{ t("overlay.customTrain.param_failed") }}</strong
						>
						<OverlayCustomTrainRenderer
							class="train"
							id="failed"
							:showFail="true"
							:size="entry.textSize"
							:fontFamily="entry.textFont"
							:colorText="entry.colorFill"
							:colorBg="entry.colorBg"
							:failedEmote="entry.failedEmote"
							v-model:titleFail="entry.failedLabel"
							v-model:title="entry.title"
							v-model:levelName="entry.levelName"
							@edit="onChange(entry)"
							@selectEmote="
								($event: MouseEvent) => openEmoteSelector(entry, 'failed', $event)
							"
							editable
						/>
					</div>
				</div>
			</ToggleBlock>
		</VueDraggable>
		<EmoteSelector
			class="emoteSelector"
			popoutMode
			v-if="showEmoteSelector"
			@select="onSelectEmote"
			ref="emoteSelector"
			@onLoad="replaceEmoteSelector()"
		/>
	</div>
</template>

<script setup lang="ts">
import CurrencyPatternInput from "@/components/CurrencyPatternInput.vue";
import Icon from "@/components/Icon.vue";
import ToggleButton from "@/components/ToggleButton.vue";
import EmoteSelector from "@/components/chatform/EmoteSelector.vue";
import OverlayCustomTrainRenderer from "@/components/overlays/custom_train/OverlayCustomTrainRenderer.vue";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeCustomTrain as useStoreCustomTrain } from "@/store/customtrain/storeCustomTrain";
import { storeKofi as useStoreKofi } from "@/store/kofi/storeKofi";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { storePatreon as useStorePatreon } from "@/store/patreon/storePatreon";
import { storeStreamelements as useStoreStreamelements } from "@/store/streamelements/storeStreamelements";
import { storeStreamlabs as useStoreStreamlabs } from "@/store/streamlabs/storeStreamlabs";
import { storeTiltify as useStoreTiltify } from "@/store/tiltify/storeTiltify";
import { storeTipeee as useStoreTipeee } from "@/store/tipeee/storeTipeee";
import { storeTwitchCharity as useStoreTwitchCharity } from "@/store/twitch_charity/storeTwitchCharity";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Config from "@/utils/Config";
import Utils from "@/utils/Utils";
import {
	computed,
	nextTick,
	onBeforeMount,
	onBeforeUnmount,
	ref,
	useTemplateRef,
	watch,
	type ComponentPublicInstance,
} from "vue";
import { VueDraggable } from "vue-draggable-plus";
import { useI18n } from "vue-i18n";
import TTButton from "../../../TTButton.vue";
import ToggleBlock from "../../../ToggleBlock.vue";
import ParamItem from "../../ParamItem.vue";
import PremiumLimitMessage from "../../PremiumLimitMessage.vue";
import OverlayInstaller from "./OverlayInstaller.vue";

const { t } = useI18n();
const storeAuth = useStoreAuth();
const storeParams = useStoreParams();
const storeCustomTrain = useStoreCustomTrain();
const storeStreamlabs = useStoreStreamlabs();
const storeStreamelements = useStoreStreamelements();
const storeTipeee = useStoreTipeee();
const storeKofi = useStoreKofi();
const storePatreon = useStorePatreon();
const storeTiltify = useStoreTiltify();
const storeTwitchCharity = useStoreTwitchCharity();

const emoteSelector = useTemplateRef<ComponentPublicInstance>("emoteSelector");

const showEmoteSelector = ref(false);
const emoteSelector_y = ref("0");
const emoteSelector_x = ref("0");
const emoteSelectorOrigin = ref<{ x: number; y: number }>({ x: 0, y: 0 });
const train2Timer = ref<Record<string, { timer: string; tooltip: string; cooldown: boolean }>>({});
const train2Record = ref<Record<string, ReturnType<typeof Utils.getAllTimeRecord>>>({});

const param_colorFill = ref<{ [key: string]: TwitchatDataTypes.ParameterData<string> }>({});
const param_colorBg = ref<{ [key: string]: TwitchatDataTypes.ParameterData<string> }>({});
const param_recordColorFill = ref<{ [key: string]: TwitchatDataTypes.ParameterData<string> }>({});
const param_recordColorBg = ref<{ [key: string]: TwitchatDataTypes.ParameterData<string> }>({});
const param_textFont = ref<{ [key: string]: TwitchatDataTypes.ParameterData<string> }>({});
const param_textSize = ref<{ [key: string]: TwitchatDataTypes.ParameterData<number> }>({});
const param_currency = ref<{ [key: string]: TwitchatDataTypes.ParameterData<string> }>({});
const param_approachEventCount = ref<{ [key: string]: TwitchatDataTypes.ParameterData<number> }>(
	{},
);
const param_triggerEventCount = ref<{ [key: string]: TwitchatDataTypes.ParameterData<number> }>({});
const param_cooldownDuration_ms = ref<{ [key: string]: TwitchatDataTypes.ParameterData<number> }>(
	{},
);
const param_levelsDuration_ms = ref<{ [key: string]: TwitchatDataTypes.ParameterData<number> }>({});
const param_postLevelUpOnChat = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>(
	{},
);
const param_postLevelUpMessage = ref<{ [key: string]: TwitchatDataTypes.ParameterData<string> }>(
	{},
);
const param_postSuccessOnChat = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>(
	{},
);
const param_postSuccessMessage = ref<{ [key: string]: TwitchatDataTypes.ParameterData<string> }>(
	{},
);
const param_levelAmounts = ref<{ [key: string]: TwitchatDataTypes.ParameterData<string> }>({});

let emoteSelectorTarget: {
	entry: TwitchatDataTypes.CustomTrainData;
	step: "approaching" | "success" | "failed" | "levelUp" | "record";
} | null = null;
let clickHandler!: (e: MouseEvent) => void;
let keyHandler!: (e: KeyboardEvent) => void;
let refreshInterval: number = -1;

const maxTrainsReached = computed(() => {
	const max = storeAuth.isPremium
		? Config.instance.MAX_CUSTOM_TRAIN_PREMIUM
		: Config.instance.MAX_CUSTOM_TRAIN;
	return storeCustomTrain.customTrainList.length >= max;
});

onBeforeMount(() => {
	initParams();

	refreshInterval = window.setInterval(() => refreshTimers(), 100);
	clickHandler = (e: MouseEvent) => onClick(e);
	keyHandler = (e: KeyboardEvent) => onKeyboardEvent(e);
	document.addEventListener("click", clickHandler, true);
	document.addEventListener("keydown", keyHandler, true);
	rebuildRecordsMap();
});

onBeforeUnmount(() => {
	clearInterval(refreshInterval);
	document.removeEventListener("click", clickHandler, true);
	document.removeEventListener("keydown", keyHandler, true);
});

/**
 * Create parameters for a bingo entry
 * @param id
 */
function initParams(): void {
	storeCustomTrain.customTrainList.forEach((entry) => {
		const id = entry.id;
		if (param_colorFill.value[id]) return;
		param_colorFill.value[id] = {
			type: "color",
			value: "",
			labelKey: "overlay.customTrain.param_colorFill",
			icon: "color",
		};
		param_colorBg.value[id] = {
			type: "color",
			value: "",
			labelKey: "overlay.customTrain.param_colorBg",
			icon: "color",
		};
		param_recordColorFill.value[id] = {
			type: "color",
			value: "",
			labelKey: "overlay.customTrain.param_recordColorFill",
			icon: "color",
		};
		param_recordColorBg.value[id] = {
			type: "color",
			value: "",
			labelKey: "overlay.customTrain.param_recordColorBg",
			icon: "color",
		};
		param_textFont.value[id] = {
			type: "font",
			value: "",
			labelKey: "overlay.customTrain.param_textFont",
			icon: "font",
		};
		param_textSize.value[id] = {
			type: "slider",
			value: 40,
			min: 20,
			max: 80,
			labelKey: "overlay.customTrain.param_textSize",
			icon: "fontSize",
		};
		param_currency.value[id] = {
			type: "string",
			value: "",
			labelKey: "overlay.customTrain.param_currency",
			icon: "coin",
		};
		param_approachEventCount.value[id] = {
			type: "number",
			value: 2,
			min: 2,
			max: 25,
			labelKey: "overlay.customTrain.param_approachEventCount",
			icon: "notification",
		};
		param_triggerEventCount.value[id] = {
			type: "number",
			value: 2,
			min: 2,
			max: 11,
			labelKey: "overlay.customTrain.param_triggerEventCount",
			icon: "notification",
		};
		param_cooldownDuration_ms.value[id] = {
			type: "duration",
			value: 0,
			min: 30 * 60,
			max: 24 * 3600,
			labelKey: "overlay.customTrain.param_cooldownDuration_ms",
			icon: "timer",
		};
		param_levelsDuration_ms.value[id] = {
			type: "duration",
			value: 5 * 6,
			min: 30,
			max: 30 * 60,
			labelKey: "overlay.customTrain.param_levelsDuration_ms",
			icon: "countdown",
		};
		param_postLevelUpOnChat.value[id] = {
			type: "boolean",
			value: false,
			labelKey: "overlay.customTrain.param_postLevelUpOnChat",
			icon: "whispers",
		};
		param_postLevelUpMessage.value[id] = {
			type: "string",
			value: "",
			longText: true,
			maxLength: 400,
		};
		param_postSuccessOnChat.value[id] = {
			type: "boolean",
			value: false,
			labelKey: "overlay.customTrain.param_postSuccessOnChat",
			icon: "whispers",
		};
		param_postSuccessMessage.value[id] = {
			type: "string",
			value: "",
			longText: true,
			maxLength: 400,
		};
		param_levelAmounts.value[id] = {
			type: "string",
			value: "",
			longText: true,
			maxLength: 1000,
			labelKey: "overlay.customTrain.param_levelAmounts",
		};

		param_postLevelUpMessage.value[id].placeholderList = [
			{ tag: "LEVEL", descKey: "triggers.placeholders.custom_train_level" },
			{ tag: "AMOUNT", descKey: "triggers.placeholders.custom_train_amountLeft" },
		];
		param_postSuccessMessage.value[id].placeholderList =
			param_postLevelUpMessage.value[id].placeholderList.concat();
		param_levelAmounts.value[id].value = entry.levelAmounts.join(", ");
	});
}

/**
 * Saves data on change
 * @param entry
 */
function onChange(entry: TwitchatDataTypes.CustomTrainData, rebuildRecord: boolean = false): void {
	//Make sure user doesn't hack this value
	entry.triggerEventCount = Math.max(
		Math.min(entry.triggerEventCount, param_triggerEventCount.value[entry.id]!.max!),
		0,
	);

	const levels = (param_levelAmounts.value[entry.id]!.value.match(/(\d|\.)+/g) || [])
		.filter((v) => !isNaN(parseFloat(v)))
		.map((v) => parseFloat(v))
		.sort((a, b) => a - b);
	entry.levelAmounts = levels;

	storeCustomTrain.saveData();
	storeCustomTrain.broadcastStates(entry.id);
	if (rebuildRecord) {
		rebuildRecordsMap();
	}
}

/**
 * Opens the premium section
 */
function openPremium(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
}

/**
 * Saves given label
 */
function addEntry(): void {
	storeCustomTrain.createCustomTrain();
	initParams();
}

/**
 * Tests the text
 */
function simulateTrain(overlayId: string): void {
	storeCustomTrain.simulateTrain(overlayId);
}

/**
 * Opens connections params
 */
function openConnections(subSection: TwitchatDataTypes.ParamDeepSectionsStringType): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.CONNECTIONS, subSection);
}

/**
 * Opens donation form
 */
function openDonationForm(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.DONATE);
}

/**
 * Detect click outside emote selector
 */
function onClick(e: MouseEvent): void {
	if (showEmoteSelector.value) {
		const emoteSelectorEl = emoteSelector.value!.$el;
		if (!emoteSelectorEl.contains(e.target as Node)) {
			showEmoteSelector.value = false;
		}
	}
}

/**
 * Close emote picker on escape
 */
function onKeyboardEvent(e: KeyboardEvent): void {
	if (e.key === "Escape" && showEmoteSelector.value) {
		showEmoteSelector.value = false;
		e.stopPropagation();
		e.preventDefault();
	}
}

/**
 * Open emote selector
 */
async function openEmoteSelector(
	entry: TwitchatDataTypes.CustomTrainData,
	step: NonNullable<typeof emoteSelectorTarget>["step"],
	event: MouseEvent,
): Promise<void> {
	emoteSelectorTarget = { entry, step };
	showEmoteSelector.value = true;
	await nextTick();
	emoteSelectorOrigin.value = { x: event.clientX, y: event.clientY };
	replaceEmoteSelector();
}

/**
 * Replaces emote selector position
 */
function replaceEmoteSelector(): void {
	const bounds = emoteSelector.value!.$el.getBoundingClientRect();
	let x =
		emoteSelectorOrigin.value.x < window.innerWidth / 2
			? emoteSelectorOrigin.value.x
			: emoteSelectorOrigin.value.x - bounds.width;
	let y =
		emoteSelectorOrigin.value.y < window.innerHeight / 2
			? emoteSelectorOrigin.value.y
			: emoteSelectorOrigin.value.y - bounds.height;
	const marginBottom = 70;
	if (x + bounds.width > window.innerWidth) x = window.innerWidth - bounds.width;
	if (y + bounds.height > window.innerHeight - marginBottom)
		y = window.innerHeight - marginBottom - bounds.height;
	emoteSelector_x.value = x + "px";
	emoteSelector_y.value = y + "px";
}

/**
 * Called after selecting an emote
 */
async function onSelectEmote(
	emote: TwitchatDataTypes.Emote | TwitchatDataTypes.Emoji,
): Promise<void> {
	const urlOrEmoji =
		"images" in emote
			? emote.images.url_2x || emote.images.url_4x || emote.images.url_1x
			: emote.emoji;
	switch (emoteSelectorTarget?.step) {
		case "approaching":
			emoteSelectorTarget.entry.approachingEmote = urlOrEmoji;
			break;
		case "levelUp":
			emoteSelectorTarget.entry.levelUpEmote = urlOrEmoji;
			break;
		case "failed":
			emoteSelectorTarget.entry.failedEmote = urlOrEmoji;
			break;
		case "success":
			emoteSelectorTarget.entry.successEmote = urlOrEmoji;
			break;
		case "record":
			emoteSelectorTarget.entry.recordEmote = urlOrEmoji;
			break;
	}
}

/**
 * Refreshes the running timers values
 */
function refreshTimers(): void {
	for (const train of storeCustomTrain.customTrainList) {
		const date = train.coolDownEnd_at > Date.now() ? train.coolDownEnd_at : train.expires_at;
		if (date > Date.now()) {
			const isCooldown = date == train.coolDownEnd_at;
			train2Timer.value[train.id] = {
				timer: Utils.formatDuration(date - Date.now(), true),
				tooltip: isCooldown
					? t("overlay.customTrain.state_cooldown_tt")
					: t("overlay.customTrain.state_expire_tt"),
				cooldown: isCooldown,
			};
		} else {
			delete train2Timer.value[train.id];
		}
	}
}

/**
 * Builds up an hashmap of all time records for each custom train
 */
function rebuildRecordsMap(): void {
	for (const id in storeCustomTrain.customTrainList) {
		const entry = storeCustomTrain.customTrainList[id]!;
		const record = Utils.getAllTimeRecord(entry);
		if (record) train2Record.value[entry.id] = record;
	}
}

watch(
	() => storeCustomTrain.customTrainList.length,
	(newLength, oldLength) => {
		if (newLength != oldLength) {
			rebuildRecordsMap();
		}
	},
);
</script>

<style scoped lang="less">
.overlayparamscustomtrain {
	.emoteSelector {
		position: absolute;
		z-index: 100;
		top: v-bind(emoteSelector_y);
		left: v-bind(emoteSelector_x);
	}

	.entryList,
	.content {
		gap: 0.5em;
		display: flex;
		flex-direction: column;

		form {
			gap: 1px;
			display: flex;
			flex-direction: row;
			justify-content: center;
			* {
				border-radius: 0;
			}
			*:first-child {
				border-top-left-radius: var(--border-radius);
				border-bottom-left-radius: var(--border-radius);
			}
			*:last-child {
				border-top-right-radius: var(--border-radius);
				border-bottom-right-radius: var(--border-radius);
			}
			input {
				text-align: right;
				width: 0;
				flex-basis: 100px;
			}
		}
	}

	.themeBlock {
		margin: 1em 0;
		gap: 0.25em;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		& > .font,
		& > .colors {
			flex-grow: 10;
			gap: 0.25em;
			display: flex;
			flex-direction: column;
			flex-basis: 200px;
			& > * {
				flex-grow: 1;
			}
		}
		& > .colors {
			flex-grow: 1;
		}
	}

	.maximumReached {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		white-space: pre-line;
	}

	.trainRender {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		& > .paramitem {
			margin-top: -0.25em;
			font-size: 0.9em;
		}
		.info {
			margin-top: -0.25em;
			font-size: 0.9em;
			font-style: italic;
			text-align: center;
			&.offset {
				margin-left: 1.5em;
			}
		}
		.plz {
			text-align: center;
			white-space: pre-line;
			background-color: var(--color-premium-fader);
			.head {
				display: block;
				margin-top: 0.25em;
				margin-bottom: -0.9em;
				font-size: 1.5em;
			}
		}

		strong {
			.icon {
				height: 1em;
				width: 1em;
				margin-right: 0.5em;
			}
		}
		.colors {
			column-gap: 2em;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			justify-content: center;
			align-items: center;
			margin-left: 1.5em;
			* {
				margin: 0;
				width: fit-content;
				:deep(.holder) {
					flex-wrap: nowrap;
				}
				:deep(label) {
					flex: 0;
				}
				:deep(.inputHolder) {
					width: 50px;
				}
			}
		}
	}

	.platforms {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		.platformsList {
			gap: 0.5em;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			justify-content: center;

			.platform {
				min-width: 7em;
				flex-direction: column;
				gap: 0.5em;
				:deep(.icon) {
					font-size: 4em;
				}
			}
		}
	}

	.ctas {
		text-align: center;
	}

	.timer {
		gap: 0.5em;
		display: flex;
		text-align: center;
		font-variant-numeric: tabular-nums;
		align-self: stretch;
		align-items: center;
		margin: -0.5em 0;
		padding: 0 0.5em;
		font-size: 0.75em;
		background-color: var(--color-primary-fade);

		.icon {
			width: 1em;
		}

		&.cooldown {
			background-color: var(--color-secondary-fader);
		}
	}

	.record {
		text-align: center;
		.icon {
			height: 1em;
			margin-right: 0.5em;
			vertical-align: middle;
		}
	}
}
</style>

