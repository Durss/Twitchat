<template>
	<div class="paramstts parameterContent">
		<Icon name="tts" class="icon" />

		<p class="head">{{ t("tts.header") }}</p>
		<ParamItem
			class="card-item enableBt"
			:paramData="param_enabled"
			v-model="param_enabled.value"
		/>

		<div class="fadeHolder" :style="holderStyles">
			<transition @enter="onShowItem" @leave="onHideItem">
				<div
					class="permissions"
					v-if="param_readMessages.value === true || param_readWhispers.value === true"
				>
					<Splitter class="splitter">{{ t("tts.chat_perms.title") }}</Splitter>
					<section class="card-item">
						<p>
							<Icon name="user" /> <Icon name="whispers" />{{
								t("tts.chat_perms.head")
							}}
						</p>
						<p class="small">{{ t("tts.chat_perms.infos") }}</p>
						<PermissionsForm class="form" v-model="param_ttsPerms" />
					</section>
				</div>
			</transition>

			<Splitter class="splitter">{{ t("tts.messages.title") }}</Splitter>

			<section>
				<ParamItem :paramData="param_readMessages" v-model="param_readMessages.value" />
				<ParamItem :paramData="param_readWhispers" v-model="param_readWhispers.value" />
				<ParamItem :paramData="param_readFollow" v-model="param_readFollow.value" />
				<ParamItem :paramData="param_readSubs" v-model="param_readSubs.value" />
				<ParamItem :paramData="param_readSubgifts" v-model="param_readSubgifts.value" />
				<ParamItem :paramData="param_readBits" v-model="param_readBits.value" />
				<ParamItem :paramData="param_readRaids" v-model="param_readRaids.value" />
				<ParamItem :paramData="param_readRewards" v-model="param_readRewards.value" />
				<ParamItem :paramData="param_readPolls" v-model="param_readPolls.value" />
				<ParamItem
					:paramData="param_readChatPolls"
					v-model="param_readChatPolls.value"
					v-newflag="{ date: Config.instance.NEW_FLAGS_DATE_V16, id: 'tts_chatpolls' }"
				/>
				<ParamItem
					:paramData="param_readPredictions"
					v-model="param_readPredictions.value"
				/>
				<ParamItem :paramData="param_readBingos" v-model="param_readBingos.value" />
				<ParamItem :paramData="param_readRaffle" v-model="param_readRaffle.value" />
				<ParamItem :paramData="param_readKofiTip" v-model="param_readKofiTip.value" />
				<ParamItem :paramData="param_readKofiMerch" v-model="param_readKofiMerch.value" />
				<ParamItem :paramData="param_readKofiSub" v-model="param_readKofiSub.value" />
				<ParamItem
					:paramData="param_readStreamlabsTip"
					v-model="param_readStreamlabsTip.value"
				/>
				<ParamItem
					:paramData="param_readStreamlabsMerch"
					v-model="param_readStreamlabsMerch.value"
				/>
				<ParamItem
					:paramData="param_readStreamlabsPatreon"
					v-model="param_readStreamlabsPatreon.value"
				/>
				<ParamItem
					:paramData="param_readStreamelementsTip"
					v-model="param_readStreamelementsTip.value"
				/>
				<ParamItem :paramData="param_readTimeouts" v-model="param_readTimeouts.value" />
				<ParamItem :paramData="param_readBans" v-model="param_readBans.value" />
				<ParamItem :paramData="param_readUnbans" v-model="param_readUnbans.value" />
				<ParamItem :paramData="param_readNotices" v-model="param_readNotices.value" />
				<ParamItem
					:paramData="param_read1stMessageToday"
					v-model="param_read1stMessageToday.value"
				/>
				<ParamItem
					:paramData="param_read1stTimeChatters"
					v-model="param_read1stTimeChatters.value"
				/>
				<ParamItem :paramData="param_readMonitored" v-model="param_readMonitored.value" />
				<ParamItem :paramData="param_readRestricted" v-model="param_readRestricted.value" />
				<ParamItem :paramData="param_readAutomod" v-model="param_readAutomod.value" />
			</section>

			<Splitter class="splitter">{{ t("tts.params.title") }}</Splitter>

			<section class="card-item">
				<TTSVoiceParams v-model="voiceParams" />
			</section>

			<Splitter class="splitter">{{ t("tts.filters.title") }}</Splitter>

			<section>
				<ParamItem :paramData="param_allRemoteChans" v-model="param_allRemoteChans.value" />
				<ParamItem :paramData="param_removeEmotes" v-model="param_removeEmotes.value" />
				<ParamItem
					class="shrinkInput"
					:paramData="param_removeURL"
					v-model="param_removeURL.value"
				/>
				<ParamItem
					:paramData="param_maxDurationToggle"
					v-model="param_maxDurationToggle.value"
				/>
				<ParamItem
					:paramData="param_maxLengthToggle"
					v-model="param_maxLengthToggle.value"
				/>
				<ParamItem :paramData="param_timeoutToggle" v-model="param_timeoutToggle.value" />
				<ParamItem
					:paramData="param_inactivityPeriodToggle"
					v-model="param_inactivityPeriodToggle.value"
				/>
			</section>
		</div>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import TTSVoiceParams from "@/components/voice/TTSVoiceParams.vue";
import { storeElevenLabs as useStoreElevenLabs } from "@/store/elevenlabs/storeElevenLabs";
import { storeTTS as useStoreTTS } from "@/store/tts/storeTTS";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import TTSUtils from "@/utils/TTSUtils";
import Utils from "@/utils/Utils";
import { gsap } from "gsap/gsap-core";
import { computed, nextTick, onBeforeMount, ref, watch, type CSSProperties } from "vue";
import { useI18n } from "vue-i18n";
import PermissionsForm from "../../PermissionsForm.vue";
import Splitter from "../../Splitter.vue";
import ParamItem from "../ParamItem.vue";
import type IParameterContent from "./IParameterContent";
import Config from "@/utils/Config";

const { t } = useI18n();
const storeTTS = useStoreTTS();
const storeElevenLabs = useStoreElevenLabs();

//TODO replace all the hardcoded message types and build them dynamically

const voiceParams = ref<TwitchatDataTypes.TTSVoiceParamsData>({
	voice: "",
	volume: 1,
	rate: 1,
	pitch: 1,
	elevenlabs_lang: "",
	elevenlabs_model: "",
	elevenlabs_stability: 0.5,
	elevenlabs_similarity: 0.5,
	elevenlabs_style: 0,
});

const param_enabled = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
});
const param_allRemoteChans = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: true,
	icon: "user",
});
const param_removeEmotes = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: true,
	icon: "emote",
});
const param_maxLengthToggle = ref<TwitchatDataTypes.ParameterData<boolean, unknown, any>>({
	type: "boolean",
	value: false,
});
const param_maxLength = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "slider",
	value: 200,
	min: 10,
	max: 500,
	step: 10,
});
const param_maxDurationToggle = ref<TwitchatDataTypes.ParameterData<boolean, unknown, any>>({
	type: "boolean",
	value: false,
	icon: "timer",
});
const param_maxDuration = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "slider",
	value: 30,
	min: 0,
	max: 60,
	step: 1,
});
const param_timeoutToggle = ref<TwitchatDataTypes.ParameterData<boolean, unknown, any>>({
	type: "boolean",
	value: false,
});
const param_timeout = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "slider",
	value: 60,
	min: 0,
	max: 30,
	step: 1,
});
const param_inactivityPeriodToggle = ref<TwitchatDataTypes.ParameterData<boolean, unknown, any>>({
	type: "boolean",
	value: false,
});
const param_inactivityPeriod = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "slider",
	value: 0,
	min: 0,
	max: 60,
	step: 1,
});
const param_removeURL = ref<TwitchatDataTypes.ParameterData<boolean, unknown, any>>({
	type: "boolean",
	value: true,
	icon: "url",
});
const param_replaceURL = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "link",
});

const param_readMessages = ref<TwitchatDataTypes.ParameterData<boolean, unknown, string>>({
	type: "boolean",
	value: false,
	icon: "user",
});
const param_readMessagesPattern = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	longText: true,
	placeholderList: TTSUtils.placeholderMessages,
	maxLength: 300,
});
const param_readWhispers = ref<TwitchatDataTypes.ParameterData<boolean, unknown, string>>({
	type: "boolean",
	value: false,
	icon: "whispers",
});
const param_readWhispersPattern = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	longText: true,
	placeholderList: TTSUtils.placeholderMessages,
	maxLength: 300,
});
const param_readNotices = ref<TwitchatDataTypes.ParameterData<boolean, unknown, string>>({
	type: "boolean",
	value: false,
	icon: "info",
});
const param_readNoticesPattern = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	longText: true,
	placeholderList: TTSUtils.placeholderNotices,
	maxLength: 300,
});
const param_readTimeouts = ref<TwitchatDataTypes.ParameterData<boolean, unknown, string>>({
	type: "boolean",
	value: false,
	icon: "timeout",
});
const param_readTimeoutsPattern = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	longText: true,
	placeholderList: TTSUtils.placeholderTimeouts,
	maxLength: 300,
});
const param_readBans = ref<TwitchatDataTypes.ParameterData<boolean, unknown, string>>({
	type: "boolean",
	value: false,
	icon: "ban",
});
const param_readBansPattern = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	longText: true,
	placeholderList: TTSUtils.placeholderBans,
	maxLength: 300,
});
const param_readUnbans = ref<TwitchatDataTypes.ParameterData<boolean, unknown, string>>({
	type: "boolean",
	value: false,
	icon: "unban",
});
const param_readUnbansPattern = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	longText: true,
	placeholderList: TTSUtils.placeholderUnbans,
	maxLength: 300,
});
const param_readRewards = ref<TwitchatDataTypes.ParameterData<boolean, unknown, string>>({
	type: "boolean",
	value: true,
	icon: "channelPoints",
});
const param_readRewardsPattern = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	longText: true,
	placeholderList: TTSUtils.placeholderRewards,
	maxLength: 300,
});
const param_readSubs = ref<TwitchatDataTypes.ParameterData<boolean, unknown, string>>({
	type: "boolean",
	value: false,
	icon: "sub",
});
const param_readSubsPattern = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	longText: true,
	placeholderList: TTSUtils.placeholderSubs,
	maxLength: 300,
});
const param_readSubgifts = ref<TwitchatDataTypes.ParameterData<boolean, unknown, string>>({
	type: "boolean",
	value: false,
	icon: "gift",
});
const param_readSubgiftsPattern = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	longText: true,
	placeholderList: TTSUtils.placeholderSubgifts,
	maxLength: 300,
});
const param_readBits = ref<TwitchatDataTypes.ParameterData<boolean, unknown, any>>({
	type: "boolean",
	value: false,
	icon: "bits",
});
const param_readBitsMinAmount = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "number",
	value: 0,
	label: "Minimum bits amount",
	min: 0,
	max: 1000000,
});
const param_readBitsPattern = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	longText: true,
	placeholderList: TTSUtils.placeholderBits,
	maxLength: 300,
});
const param_readRaids = ref<TwitchatDataTypes.ParameterData<boolean, unknown, string>>({
	type: "boolean",
	value: false,
	icon: "raid",
});
const param_readRaidsPattern = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	longText: true,
	placeholderList: TTSUtils.placeholderRaids,
	maxLength: 300,
});
const param_readFollow = ref<TwitchatDataTypes.ParameterData<boolean, unknown, string>>({
	type: "boolean",
	value: false,
	icon: "follow",
});
const param_readFollowPattern = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	longText: true,
	placeholderList: TTSUtils.placeholderFollows,
	maxLength: 300,
});
const param_readPolls = ref<TwitchatDataTypes.ParameterData<boolean, unknown, string>>({
	type: "boolean",
	value: false,
	icon: "poll",
});
const param_readPollsPattern = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	longText: true,
	placeholderList: TTSUtils.placeholderPolls,
	maxLength: 300,
});
const param_readChatPolls = ref<TwitchatDataTypes.ParameterData<boolean, unknown, string>>({
	type: "boolean",
	value: false,
	icon: "chatPoll",
});
const param_readChatPollsPattern = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	longText: true,
	placeholderList: TTSUtils.placeholderChatPolls,
	maxLength: 300,
});
const param_readPredictions = ref<TwitchatDataTypes.ParameterData<boolean, unknown, string>>({
	type: "boolean",
	value: false,
	icon: "prediction",
});
const param_readPredictionsPattern = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	longText: true,
	placeholderList: TTSUtils.placeholderPredictions,
	maxLength: 300,
});
const param_readBingos = ref<TwitchatDataTypes.ParameterData<boolean, unknown, string>>({
	type: "boolean",
	value: false,
	icon: "bingo",
});
const param_readBingosPattern = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	longText: true,
	placeholderList: TTSUtils.placeholderBingo,
	maxLength: 300,
});
const param_readRaffle = ref<TwitchatDataTypes.ParameterData<boolean, unknown, string>>({
	type: "boolean",
	value: false,
	icon: "ticket",
});
const param_readRafflePattern = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	longText: true,
	placeholderList: TTSUtils.placeholderRaffles,
	maxLength: 300,
});
const param_read1stMessageToday = ref<TwitchatDataTypes.ParameterData<boolean, unknown, string>>({
	type: "boolean",
	value: false,
	icon: "firstTime",
});
const param_read1stMessageTodayPattern = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	longText: true,
	placeholderList: TTSUtils.placeholder1stMessageToday,
	maxLength: 300,
});
const param_read1stTimeChatters = ref<TwitchatDataTypes.ParameterData<boolean, unknown, string>>({
	type: "boolean",
	value: false,
	icon: "firstTime",
});
const param_read1stTimeChattersPattern = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	longText: true,
	placeholderList: TTSUtils.placeholder1stTimeChatters,
	maxLength: 300,
});
const param_readAutomod = ref<TwitchatDataTypes.ParameterData<boolean, unknown, string>>({
	type: "boolean",
	value: false,
	icon: "automod",
});
const param_readAutomodPattern = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	longText: true,
	placeholderList: TTSUtils.placeholderAutomod,
	maxLength: 300,
});
const param_readMonitored = ref<TwitchatDataTypes.ParameterData<boolean, unknown, string>>({
	type: "boolean",
	value: false,
	icon: "shield",
});
const param_readMonitoredPattern = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	longText: true,
	placeholderList: TTSUtils.placeholderAutomod,
	maxLength: 300,
});
const param_readRestricted = ref<TwitchatDataTypes.ParameterData<boolean, unknown, string>>({
	type: "boolean",
	value: false,
	icon: "shield",
});
const param_readRestrictedPattern = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	longText: true,
	placeholderList: TTSUtils.placeholderAutomod,
	maxLength: 300,
});

const param_readKofiTip = ref<TwitchatDataTypes.ParameterData<boolean, unknown, string>>({
	type: "boolean",
	value: false,
	icon: "kofi",
});
const param_readKofiTipPattern = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	longText: true,
	placeholderList: TTSUtils.placeholderKofiTip,
	maxLength: 300,
});
const param_readKofiMerch = ref<TwitchatDataTypes.ParameterData<boolean, unknown, string>>({
	type: "boolean",
	value: false,
	icon: "kofi",
});
const param_readKofiMerchPattern = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	longText: true,
	placeholderList: TTSUtils.placeholderKofiMerch,
	maxLength: 300,
});
const param_readKofiSub = ref<TwitchatDataTypes.ParameterData<boolean, unknown, string>>({
	type: "boolean",
	value: false,
	icon: "kofi",
});
const param_readKofiSubPattern = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	longText: true,
	placeholderList: TTSUtils.placeholderKofiSub,
	maxLength: 300,
});
const param_readStreamlabsTip = ref<TwitchatDataTypes.ParameterData<boolean, unknown, string>>({
	type: "boolean",
	value: false,
	icon: "streamlabs",
});
const param_readStreamlabsTipPattern = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	longText: true,
	placeholderList: TTSUtils.placeholderStreamlabsTip,
	maxLength: 300,
});
const param_readStreamlabsMerch = ref<TwitchatDataTypes.ParameterData<boolean, unknown, string>>({
	type: "boolean",
	value: false,
	icon: "streamlabs",
});
const param_readStreamlabsMerchPattern = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	longText: true,
	placeholderList: TTSUtils.placeholderStreamlabsMerch,
	maxLength: 300,
});
const param_readStreamlabsPatreon = ref<TwitchatDataTypes.ParameterData<boolean, unknown, string>>({
	type: "boolean",
	value: false,
	icon: "streamlabs",
});
const param_readStreamlabsPatreonPattern = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	longText: true,
	placeholderList: TTSUtils.placeholderStreamlabsPatreon,
	maxLength: 300,
});
const param_readStreamelementsTip = ref<TwitchatDataTypes.ParameterData<boolean, unknown, string>>({
	type: "boolean",
	value: false,
	icon: "streamelements",
});
const param_readStreamelementsTipPattern = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	longText: true,
	placeholderList: TTSUtils.placeholderStreamelementsTip,
	maxLength: 300,
});

const param_ttsPerms = ref<TwitchatDataTypes.PermissionsData>(
	Utils.getDefaultPermissions(true, true, false, true, false, false),
);

const holderStyles = computed<CSSProperties>(() => {
	return {
		opacity: param_enabled.value.value === true ? 1 : 0.5,
		pointerEvents: param_enabled.value.value === true ? "all" : "none",
	};
});

const finalData = computed<TwitchatDataTypes.TTSParamsData>(() => {
	return {
		enabled: param_enabled.value.value,
		volume: voiceParams.value.volume,
		rate: voiceParams.value.rate,
		pitch: voiceParams.value.pitch,
		elevenlabs_model: voiceParams.value.elevenlabs_model,
		elevenlabs_lang: voiceParams.value.elevenlabs_lang,
		elevenlabs_stability: voiceParams.value.elevenlabs_stability,
		elevenlabs_similarity: voiceParams.value.elevenlabs_similarity,
		elevenlabs_style: voiceParams.value.elevenlabs_style,
		voice: {
			id: voiceParams.value.voice,
			platform:
				storeElevenLabs.voiceList?.findIndex(
					(x) => x.voice_id === voiceParams.value.voice,
				) > -1
					? "elevenlabs"
					: "system",
		},
		ttsPerms: param_ttsPerms.value,
		allRemoteChans: param_allRemoteChans.value.value,
		removeEmotes: param_removeEmotes.value.value,
		maxLength: param_maxLengthToggle.value.value === true ? param_maxLength.value.value : 0,
		maxDuration:
			param_maxDurationToggle.value.value === true ? param_maxDuration.value.value : 0,
		timeout: param_timeoutToggle.value.value === true ? param_timeout.value.value : 0,
		inactivityPeriod:
			param_inactivityPeriodToggle.value.value === true
				? param_inactivityPeriod.value.value
				: 0,
		removeURL: param_removeURL.value.value,
		replaceURL: param_replaceURL.value.value,
		readMessages: param_readMessages.value.value,
		readMessagePatern: param_readMessagesPattern.value.value,
		readWhispers: param_readWhispers.value.value,
		readWhispersPattern: param_readWhispersPattern.value.value,
		readNotices: param_readNotices.value.value,
		readNoticesPattern: param_readNoticesPattern.value.value,
		readRewards: param_readRewards.value.value,
		readRewardsPattern: param_readRewardsPattern.value.value,
		readSubs: param_readSubs.value.value,
		readSubsPattern: param_readSubsPattern.value.value,
		readSubgifts: param_readSubgifts.value.value,
		readSubgiftsPattern: param_readSubgiftsPattern.value.value,
		readBits: param_readBits.value.value,
		readBitsMinAmount: param_readBitsMinAmount.value.value,
		readBitsPattern: param_readBitsPattern.value.value,
		readRaids: param_readRaids.value.value,
		readRaidsPattern: param_readRaidsPattern.value.value,
		readFollow: param_readFollow.value.value,
		readFollowPattern: param_readFollowPattern.value.value,
		readPolls: param_readPolls.value.value,
		readPollsPattern: param_readPollsPattern.value.value,
		readChatPolls: param_readChatPolls.value.value,
		readChatPollsPattern: param_readChatPollsPattern.value.value,
		readBingos: param_readBingos.value.value,
		readBingosPattern: param_readBingosPattern.value.value,
		readRaffle: param_readRaffle.value.value,
		readRafflePattern: param_readRafflePattern.value.value,
		readPredictions: param_readPredictions.value.value,
		readPredictionsPattern: param_readPredictionsPattern.value.value,
		read1stMessageToday: param_read1stMessageToday.value.value,
		read1stMessageTodayPattern: param_read1stMessageTodayPattern.value.value,
		read1stTimeChatters: param_read1stTimeChatters.value.value,
		read1stTimeChattersPattern: param_read1stTimeChattersPattern.value.value,
		readMonitored: param_readMonitored.value.value,
		readMonitoredPattern: param_readMonitoredPattern.value.value,
		readAutomod: param_readAutomod.value.value,
		readAutomodPattern: param_readAutomodPattern.value.value,
		readRestricted: param_readRestricted.value.value,
		readRestrictedPattern: param_readRestrictedPattern.value.value,
		readTimeouts: param_readTimeouts.value.value,
		readTimeoutsPattern: param_readTimeoutsPattern.value.value,
		readBans: param_readBans.value.value,
		readBansPattern: param_readBansPattern.value.value,
		readUnbans: param_readUnbans.value.value,
		readUnbansPattern: param_readUnbansPattern.value.value,
		readKofiTip: param_readKofiTip.value.value,
		readKofiTipPattern: param_readKofiTipPattern.value.value,
		readKofiMerch: param_readKofiMerch.value.value,
		readKofiMerchPattern: param_readKofiMerchPattern.value.value,
		readKofiSub: param_readKofiSub.value.value,
		readKofiSubPattern: param_readKofiSubPattern.value.value,
		readStreamlabsTip: param_readStreamlabsTip.value.value,
		readStreamlabsTipPattern: param_readStreamlabsTipPattern.value.value,
		readStreamlabsMerch: param_readStreamlabsMerch.value.value,
		readStreamlabsMerchPattern: param_readStreamlabsMerchPattern.value.value,
		readStreamlabsPatreon: param_readStreamlabsPatreon.value.value,
		readStreamlabsPatreonPattern: param_readStreamlabsPatreonPattern.value.value,
		readStreamelementsTip: param_readStreamelementsTip.value.value,
		readStreamelementsTipPattern: param_readStreamelementsTipPattern.value.value,
	};
});

onBeforeMount(async () => {
	let params: TwitchatDataTypes.TTSParamsData = storeTTS.params;

	param_enabled.value.labelKey = "global.enable";
	param_removeEmotes.value.labelKey = "tts.params.param_removeEmotes";
	param_allRemoteChans.value.labelKey = "tts.params.param_allRemoteChans";

	param_readMessages.value.labelKey = "tts.messages.param_readMessages";
	param_readWhispers.value.labelKey = "tts.messages.param_readWhispers";
	param_readNotices.value.labelKey = "tts.messages.param_readNotices";
	param_readRewards.value.labelKey = "tts.messages.param_readRewards";
	param_readSubs.value.labelKey = "tts.messages.param_readSubs";
	param_readSubgifts.value.labelKey = "tts.messages.param_readSubgifts";
	param_readBits.value.labelKey = "tts.messages.param_readBits";
	param_readRaids.value.labelKey = "tts.messages.param_readRaids";
	param_readFollow.value.labelKey = "tts.messages.param_readFollow";
	param_readPolls.value.labelKey = "tts.messages.param_readPolls";
	param_readChatPolls.value.labelKey = "tts.messages.param_readChatPolls";
	param_readPredictions.value.labelKey = "tts.messages.param_readPredictions";
	param_readBingos.value.labelKey = "tts.messages.param_readBingos";
	param_readRaffle.value.labelKey = "tts.messages.param_readRaffle";
	param_read1stMessageToday.value.labelKey = "tts.messages.param_read1stMessageToday";
	param_read1stTimeChatters.value.labelKey = "tts.messages.param_read1stTimeChatters";
	param_readAutomod.value.labelKey = "tts.messages.param_readAutomod";
	param_readMonitored.value.labelKey = "tts.messages.param_readMonitored";
	param_readRestricted.value.labelKey = "tts.messages.param_readRestricted";
	param_readTimeouts.value.labelKey = "tts.messages.param_readTimeouts";
	param_readBans.value.labelKey = "tts.messages.param_readBans";
	param_readUnbans.value.labelKey = "tts.messages.param_readUnbans";
	param_readKofiTip.value.labelKey = "tts.messages.param_readKofiTip";
	param_readKofiTipPattern.value.labelKey = "tts.messages.param_readKofiTipPattern";
	param_readKofiMerch.value.labelKey = "tts.messages.param_readKofiMerch";
	param_readKofiMerchPattern.value.labelKey = "tts.messages.param_readKofiMerchPattern";
	param_readKofiSub.value.labelKey = "tts.messages.param_readKofiSub";
	param_readKofiSubPattern.value.labelKey = "tts.messages.param_readKofiSubPattern";
	param_readStreamlabsTip.value.labelKey = "tts.messages.param_readStreamlabsTip";
	param_readStreamlabsTipPattern.value.labelKey = "tts.messages.param_readStreamlabsTipPattern";
	param_readStreamlabsMerch.value.labelKey = "tts.messages.param_readStreamlabsMerch";
	param_readStreamlabsMerchPattern.value.labelKey =
		"tts.messages.param_readStreamlabsMerchPattern";
	param_readStreamlabsPatreon.value.labelKey = "tts.messages.param_readStreamlabsPatreon";
	param_readStreamlabsPatreonPattern.value.labelKey =
		"tts.messages.param_readStreamlabsPatreonPattern";
	param_readStreamelementsTip.value.labelKey = "tts.messages.param_readStreamelementsTip";
	param_readStreamelementsTipPattern.value.labelKey =
		"tts.messages.param_readStreamelementsTipPattern";

	param_maxLengthToggle.value.labelKey = "tts.filters.param_maxLengthToggle";
	param_maxLength.value.labelKey = "tts.filters.param_maxLength";
	param_maxDurationToggle.value.labelKey = "tts.filters.param_maxDurationToggle";
	param_maxDuration.value.labelKey = "tts.filters.param_maxDuration";
	param_timeoutToggle.value.labelKey = "tts.filters.param_timeoutToggle";
	param_timeout.value.labelKey = "tts.filters.param_timeout";
	param_inactivityPeriodToggle.value.labelKey = "tts.filters.param_inactivityPeriodToggle";
	param_inactivityPeriod.value.labelKey = "tts.filters.param_inactivityPeriod";
	param_removeURL.value.labelKey = "tts.filters.param_removeURL";
	param_replaceURL.value.labelKey = "tts.filters.param_replaceURL";

	param_readMessagesPattern.value.labelKey =
		param_readWhispersPattern.value.labelKey =
		param_readNoticesPattern.value.labelKey =
		param_readRewardsPattern.value.labelKey =
		param_readSubsPattern.value.labelKey =
		param_readSubgiftsPattern.value.labelKey =
		param_readBitsPattern.value.labelKey =
		param_readRaidsPattern.value.labelKey =
		param_readFollowPattern.value.labelKey =
		param_readPollsPattern.value.labelKey =
		param_readChatPollsPattern.value.labelKey =
		param_readPredictionsPattern.value.labelKey =
		param_readBingosPattern.value.labelKey =
		param_readRafflePattern.value.labelKey =
		param_readAutomodPattern.value.labelKey =
		param_readMonitoredPattern.value.labelKey =
		param_readRestrictedPattern.value.labelKey =
		param_readTimeoutsPattern.value.labelKey =
		param_readBansPattern.value.labelKey =
		param_readUnbansPattern.value.labelKey =
		param_read1stMessageTodayPattern.value.labelKey =
		param_read1stTimeChattersPattern.value.labelKey =
		param_readKofiTipPattern.value.labelKey =
		param_readKofiMerchPattern.value.labelKey =
		param_readKofiSubPattern.value.labelKey =
		param_readStreamlabsTipPattern.value.labelKey =
		param_readStreamlabsMerchPattern.value.labelKey =
		param_readStreamlabsPatreonPattern.value.labelKey =
		param_readStreamelementsTipPattern.value.labelKey =
			"tts.messages.param_format";

	param_enabled.value.value = params.enabled;
	param_removeEmotes.value.value = params.removeEmotes;
	param_allRemoteChans.value.value = params.allRemoteChans;
	param_maxLength.value.value = params.maxLength;
	param_maxDuration.value.value = params.maxDuration;
	param_timeout.value.value = params.timeout;
	param_inactivityPeriod.value.value = params.inactivityPeriod;
	param_removeURL.value.value = params.removeURL;
	param_replaceURL.value.value = params.replaceURL;
	param_ttsPerms.value = params.ttsPerms;

	voiceParams.value.volume = params.volume;
	voiceParams.value.rate = params.rate;
	voiceParams.value.pitch = params.pitch;
	voiceParams.value.voice = params.voice.id;
	voiceParams.value.elevenlabs_model = params.elevenlabs_model;
	voiceParams.value.elevenlabs_similarity = params.elevenlabs_similarity;
	voiceParams.value.elevenlabs_stability = params.elevenlabs_stability;
	voiceParams.value.elevenlabs_style = params.elevenlabs_style;
	voiceParams.value.elevenlabs_lang = params.elevenlabs_lang;

	function label(label1: string, label2: string): string {
		if (label1?.length > 0) return label1;
		if (label2?.length > 0) return label2;
		return "";
	}

	param_readMessages.value.value = params.readMessages === true;
	param_readMessagesPattern.value.value = label(
		params.readMessagePatern,
		t("tts.patterns.readMessagePatern"),
	);
	param_readWhispers.value.value = params.readWhispers === true;
	param_readWhispersPattern.value.value = label(
		params.readWhispersPattern,
		t("tts.patterns.readWhispersPattern"),
	);
	param_readNotices.value.value = params.readNotices === true;
	param_readNoticesPattern.value.value = label(
		params.readNoticesPattern,
		t("tts.patterns.readNoticesPattern"),
	);
	param_readRewards.value.value = params.readRewards === true;
	param_readRewardsPattern.value.value = label(
		params.readRewardsPattern,
		t("tts.patterns.readRewardsPattern"),
	);
	param_readSubs.value.value = params.readSubs === true;
	param_readSubsPattern.value.value = label(
		params.readSubsPattern,
		t("tts.patterns.readSubsPattern"),
	);
	param_readSubgifts.value.value = params.readSubgifts === true;
	param_readSubgiftsPattern.value.value = label(
		params.readSubgiftsPattern,
		t("tts.patterns.readSubgiftsPattern"),
	);
	param_readBits.value.value = params.readBits === true;
	param_readBitsMinAmount.value.value = params.readBitsMinAmount;
	param_readBitsPattern.value.value = label(
		params.readBitsPattern,
		t("tts.patterns.readBitsPattern"),
	);
	param_readRaids.value.value = params.readRaids === true;
	param_readRaidsPattern.value.value = label(
		params.readRaidsPattern,
		t("tts.patterns.readRaidsPattern"),
	);
	param_readFollow.value.value = params.readFollow === true;
	param_readFollowPattern.value.value = label(
		params.readFollowPattern,
		t("tts.patterns.readFollowPattern"),
	);
	param_readPolls.value.value = params.readPolls === true;
	param_readPollsPattern.value.value = label(
		params.readPollsPattern,
		t("tts.patterns.readPollsPattern"),
	);
	param_readChatPolls.value.value = params.readChatPolls === true;
	param_readChatPollsPattern.value.value = label(
		params.readChatPollsPattern,
		t("tts.patterns.readChatPollsPattern"),
	);
	param_readBingos.value.value = params.readBingos === true;
	param_readBingosPattern.value.value = label(
		params.readBingosPattern,
		t("tts.patterns.readBingosPattern"),
	);
	param_readRaffle.value.value = params.readRaffle === true;
	param_readRafflePattern.value.value = label(
		params.readRafflePattern,
		t("tts.patterns.readRafflePattern"),
	);
	param_readPredictions.value.value = params.readPredictions === true;
	param_readPredictionsPattern.value.value = label(
		params.readPredictionsPattern,
		t("tts.patterns.readPredictionsPattern"),
	);
	param_read1stMessageToday.value.value = params.read1stMessageToday === true;
	param_read1stMessageTodayPattern.value.value = label(
		params.read1stMessageTodayPattern,
		t("tts.patterns.read1stMessageTodayPattern"),
	);
	param_read1stTimeChatters.value.value = params.read1stTimeChatters === true;
	param_read1stTimeChattersPattern.value.value = label(
		params.read1stTimeChattersPattern,
		t("tts.patterns.read1stTimeChattersPattern"),
	);
	param_readMonitored.value.value = params.readMonitored === true;
	param_readMonitoredPattern.value.value = label(
		params.readMonitoredPattern,
		t("tts.patterns.readMonitoredPattern"),
	);
	param_readRestricted.value.value = params.readRestricted === true;
	param_readRestrictedPattern.value.value = label(
		params.readRestrictedPattern,
		t("tts.patterns.readRestrictedPattern"),
	);
	param_readAutomod.value.value = params.readAutomod === true;
	param_readAutomodPattern.value.value = label(
		params.readAutomodPattern,
		t("tts.patterns.readAutomodPattern"),
	);
	param_readTimeouts.value.value = params.readTimeouts === true;
	param_readTimeoutsPattern.value.value = label(
		params.readTimeoutsPattern,
		t("tts.patterns.readTimeoutsPattern"),
	);
	param_readBans.value.value = params.readBans === true;
	param_readBansPattern.value.value = label(
		params.readBansPattern,
		t("tts.patterns.readBansPattern"),
	);
	param_readUnbans.value.value = params.readUnbans === true;
	param_readUnbansPattern.value.value = label(
		params.readUnbansPattern,
		t("tts.patterns.readUnbansPattern"),
	);

	param_readKofiTip.value.value = params.readKofiTip === true;
	param_readKofiTipPattern.value.value = label(
		params.readKofiTipPattern,
		t("tts.patterns.readKofiTipPattern"),
	);
	param_readKofiMerch.value.value = params.readKofiMerch === true;
	param_readKofiMerchPattern.value.value = label(
		params.readKofiMerchPattern,
		t("tts.patterns.readKofiMerchPattern"),
	);
	param_readKofiSub.value.value = params.readKofiSub === true;
	param_readKofiSubPattern.value.value = label(
		params.readKofiSubPattern,
		t("tts.patterns.readKofiSubPattern"),
	);
	param_readStreamlabsTip.value.value = params.readStreamlabsTip === true;
	param_readStreamlabsTipPattern.value.value = label(
		params.readStreamlabsTipPattern,
		t("tts.patterns.readStreamlabsTipPattern"),
	);
	param_readStreamlabsMerch.value.value = params.readStreamlabsMerch === true;
	param_readStreamlabsMerchPattern.value.value = label(
		params.readStreamlabsMerchPattern,
		t("tts.patterns.readStreamlabsMerchPattern"),
	);
	param_readStreamlabsPatreon.value.value = params.readStreamlabsPatreon === true;
	param_readStreamlabsPatreonPattern.value.value = label(
		params.readStreamlabsPatreonPattern,
		t("tts.patterns.readStreamlabsPatreonPattern"),
	);
	param_readStreamelementsTip.value.value = params.readStreamelementsTip === true;
	param_readStreamelementsTipPattern.value.value = label(
		params.readStreamelementsTipPattern,
		t("tts.patterns.readStreamelementsTipPattern"),
	);

	param_readMessages.value.children = [param_readMessagesPattern.value];
	param_readWhispers.value.children = [param_readWhispersPattern.value];
	param_readNotices.value.children = [param_readNoticesPattern.value];
	param_readRewards.value.children = [param_readRewardsPattern.value];
	param_readSubs.value.children = [param_readSubsPattern.value];
	param_readSubgifts.value.children = [param_readSubgiftsPattern.value];
	param_readBits.value.children = [param_readBitsMinAmount.value, param_readBitsPattern.value];
	param_readRaids.value.children = [param_readRaidsPattern.value];
	param_readFollow.value.children = [param_readFollowPattern.value];
	param_readPolls.value.children = [param_readPollsPattern.value];
	param_readChatPolls.value.children = [param_readChatPollsPattern.value];
	param_readBingos.value.children = [param_readBingosPattern.value];
	param_readRaffle.value.children = [param_readRafflePattern.value];
	param_readPredictions.value.children = [param_readPredictionsPattern.value];
	param_read1stMessageToday.value.children = [param_read1stMessageTodayPattern.value];
	param_read1stTimeChatters.value.children = [param_read1stTimeChattersPattern.value];
	param_readMonitored.value.children = [param_readMonitoredPattern.value];
	param_readRestricted.value.children = [param_readRestrictedPattern.value];
	param_readAutomod.value.children = [param_readAutomodPattern.value];
	param_readTimeouts.value.children = [param_readTimeoutsPattern.value];
	param_readBans.value.children = [param_readBansPattern.value];
	param_readUnbans.value.children = [param_readUnbansPattern.value];
	param_readKofiTip.value.children = [param_readKofiTipPattern.value];
	param_readKofiMerch.value.children = [param_readKofiMerchPattern.value];
	param_readKofiSub.value.children = [param_readKofiSubPattern.value];
	param_readStreamlabsTip.value.children = [param_readStreamlabsTipPattern.value];
	param_readStreamlabsMerch.value.children = [param_readStreamlabsMerchPattern.value];
	param_readStreamlabsPatreon.value.children = [param_readStreamlabsPatreonPattern.value];
	param_readStreamelementsTip.value.children = [param_readStreamelementsTipPattern.value];

	param_removeURL.value.children = [param_replaceURL.value];
	param_maxLengthToggle.value.children = [param_maxLength.value];
	param_maxDurationToggle.value.children = [param_maxDuration.value];
	param_timeoutToggle.value.children = [param_timeout.value];
	param_inactivityPeriodToggle.value.children = [param_inactivityPeriod.value];

	param_maxLengthToggle.value.value = param_maxLength.value.value > 0;
	param_maxDurationToggle.value.value = param_maxDuration.value.value > 0;
	param_timeoutToggle.value.value = param_timeout.value.value > 0;
	param_inactivityPeriodToggle.value.value = param_inactivityPeriod.value.value > 0;

	watch(
		() => finalData.value,
		() => {
			storeTTS.setTTSParams(finalData.value);
		},
		{ deep: true },
	);
});

async function onShowItem(el: Element, done: () => void): Promise<void> {
	await nextTick();
	gsap.killTweensOf(el);
	gsap.from(el, {
		height: 0,
		margin: 0,
		paddingTop: 0,
		paddingBottom: 0,
		duration: 0.5,
		ease: "sine.inOut",
		clearProps: "all",
		onComplete: () => {
			done();
		},
	});
}

function onHideItem(el: Element, done: () => void): void {
	gsap.killTweensOf(el);
	gsap.to(el, {
		height: 0,
		margin: 0,
		paddingTop: 0,
		paddingBottom: 0,
		duration: 0.5,
		ease: "sine.inOut",
		onComplete: () => {
			done();
		},
	});
}

defineExpose<IParameterContent>({
	onNavigateBack: () => {
		return false;
	},
});
</script>

<style scoped lang="less">
.paramstts {
	.fadeHolder {
		transition: opacity 0.2s;

		.permissions {
			overflow: hidden;
			.form {
				width: 100%;
			}
		}

		section,
		form {
			display: flex;
			flex-direction: column;
			gap: 0.5em;

			.card-item,
			&.card-item {
				&.label {
					i {
						font-size: 0.8em;
					}
					.icon {
						width: 1.2em;
						max-height: 1.2em;
						margin-right: 0.5em;
						margin-bottom: 2px;
						display: inline;
						vertical-align: middle;
					}
					p {
						display: inline;
					}
				}
				.center {
					margin-left: auto;
					margin-right: auto;
				}
				&.shrinkInput {
					:deep(.inputHolder) {
						flex-basis: 10px;
					}
				}

				:deep(input[type="range"]) {
					width: 100%;
				}

				.icon {
					width: 1em;
					height: 1em;
					object-fit: fill;
					margin-right: 0.5em;
				}
			}
			.small {
				font-size: 0.8em;
			}
		}
	}
}
</style>
