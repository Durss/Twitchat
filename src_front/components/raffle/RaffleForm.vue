<template>
	<div :class="classes" ref="rootEl">
		<div class="head" v-if="triggerMode === false">
			<ClearButton :aria-label="t('global.close')" @click="close()" />

			<h1 class="title"><Icon name="ticket" class="icon" />{{ t("raffle.form_title") }}</h1>

			<div class="description">{{ t("raffle.description") }}</div>
		</div>

		<TabMenu
			class="menu"
			v-model="localData.mode"
			:values="['chat', 'sub', 'tips', 'manual', 'values']"
			:labels="[
				t('raffle.chat.title'),
				t('raffle.subs.title'),
				t('raffle.tips.title'),
				t('raffle.list.title'),
				t('raffle.values.title'),
			]"
			:icons="['whispers', 'sub', 'coin', 'list', 'placeholder']"
		/>

		<div class="content">
			<ToggleBlock
				class="legal tips"
				v-if="
					triggerMode === false &&
					localData.mode != 'manual' &&
					localData.mode != 'values'
				"
				:icons="['info']"
				small
				:title="t('raffle.legal.title')"
				:open="false"
			>
				<p v-for="l in <string[]>tm('raffle.legal.contents')">{{ l }}</p>
			</ToggleBlock>

			<VoiceGlobalCommandsHelper v-if="voiceController" class="voiceHelper" />

			<form class="form" v-if="localData.mode == 'chat'" @submit.prevent="submitForm()">
				<div class="card-item info">{{ t("raffle.chat.description") }}</div>

				<ParamItem
					:paramData="param_command"
					v-model="param_command.value"
					:autofocus="true"
					@change="onValueChange()"
				>
					<ParamItem
						class="child"
						noBackground
						:paramData="param_commandValue"
						v-model="localData.command"
						:autofocus="true"
					/>
				</ParamItem>

				<ParamItem
					:paramData="param_reward"
					v-model="param_reward.value"
					@change="onValueChange()"
					v-if="param_rewardvalue.listValues!.length > 1"
				>
					<ParamItem
						class="child"
						noBackground
						:paramData="param_rewardvalue"
						v-model="localData.reward_id"
					/>
				</ParamItem>

				<ParamItem :paramData="param_enterDuration" v-model="localData.duration_s" />

				<ToggleBlock
					class="configs"
					:icons="['params']"
					:title="t('global.advanced_params')"
					:open="false"
					small
				>
					<ParamItem :paramData="param_autoClose" v-model="localData.autoClose" />
					<ParamItem :paramData="param_multipleJoin" v-model="localData.multipleJoin" />
					<ParamItem
						:paramData="param_maxUsersToggle"
						v-model="param_maxUsersToggle.value"
						@change="onValueChange()"
					>
						<ParamItem
							class="child"
							noBackground
							:paramData="param_maxEntries"
							v-model="localData.maxEntries"
						/>
					</ParamItem>
					<ParamItem
						:paramData="param_ponderateVotes"
						v-model="param_ponderateVotes.value"
						@change="onValueChange()"
					>
						<ParamItem
							class="child"
							noBackground
							:paramData="param_ponderateVotes_vip"
							v-model="localData.vipRatio"
						/>
						<ParamItem
							class="child"
							noBackground
							:paramData="param_ponderateVotes_follower"
							v-model="localData.followRatio"
						/>
						<ParamItem
							class="child"
							noBackground
							:paramData="param_ponderateVotes_sub"
							v-model="localData.subRatio"
						/>
						<ParamItem
							class="child"
							noBackground
							:paramData="param_ponderateVotes_subT2"
							v-model="localData.subT2Ratio"
						/>
						<ParamItem
							class="child"
							noBackground
							:paramData="param_ponderateVotes_subT3"
							v-model="localData.subT3Ratio"
						/>
						<ParamItem
							class="child"
							noBackground
							:paramData="param_ponderateVotes_subgift"
							v-model="localData.subgiftRatio"
						/>
					</ParamItem>

					<ParamItem
						:paramData="param_showCountdownOverlay"
						v-model="localData.showCountdownOverlay"
					>
						<i18n-t
							scope="global"
							tag="div"
							class="details"
							v-if="
								localData.showCountdownOverlay === true && localData.mode == 'chat'
							"
							keypath="raffle.configs.timer_overlay_add"
						>
							<template #LINK>
								<a @click="openParam('overlays')">{{
									t("raffle.configs.timer_overlay_add_link")
								}}</a>
							</template>
						</i18n-t>
					</ParamItem>

					<PostOnChatParam
						:botMessageKey="triggerMode ? undefined : 'raffleStart'"
						:placeholders="startPlaceholders"
						v-model:text="localData.messages!.raffleStart!.message"
						v-model:enabled="localData.messages!.raffleStart!.enabled"
						icon="announcement"
						titleKey="raffle.configs.postOnChat_start"
					/>
					<PostOnChatParam
						:botMessageKey="triggerMode ? undefined : 'raffleJoin'"
						:placeholders="joinPlaceholders"
						v-model:text="localData.messages!.raffleJoin!.message"
						v-model:enabled="localData.messages!.raffleJoin!.enabled"
						icon="announcement"
						titleKey="raffle.configs.postOnChat_join"
					/>
					<PostOnChatParam
						:botMessageKey="triggerMode ? undefined : 'raffle'"
						:placeholders="winnerPlaceholders"
						v-model:text="localData.messages!.raffleWinner!.message"
						v-model:enabled="localData.messages!.raffleWinner!.enabled"
						icon="announcement"
						titleKey="raffle.configs.postOnChat_winner"
					/>
				</ToggleBlock>

				<TTButton
					type="submit"
					v-if="triggerMode === false"
					:aria-label="t('raffle.chat.startBt_aria')"
					icon="ticket"
					>{{ t("global.start") }}</TTButton
				>

				<div class="card-item triggerInfo" v-if="triggerMode === false">
					<Icon name="info" />

					<i18n-t scope="global" tag="span" keypath="raffle.chat.triggers">
						<template #LINK>
							<a @click="openParam('triggers')">{{
								t("raffle.chat.triggers_link")
							}}</a>
						</template>
						<template #ACTION>
							<strong>{{ t("triggers.actions.common.action_raffle_enter") }}</strong>
						</template>
					</i18n-t>
				</div>
			</form>

			<form
				class="form"
				v-else-if="localData.mode == 'tips' && canListSubs"
				@submit.prevent="submitForm()"
			>
				<div class="card-item info">{{ t("raffle.tips.description") }}</div>
				<ParamItem :paramData="param_tip_kofi" v-model="localData.tip_kofi">
					<ParamItem
						class="child"
						noBackground
						:paramData="param_tip_kofi_minAmount"
						v-model="localData.tip_kofi_minAmount"
					/>
					<ParamItem
						class="child"
						noBackground
						:paramData="param_tip_kofi_ponderate"
						v-model="localData.tip_kofi_ponderate"
					/>
				</ParamItem>
				<ParamItem :paramData="param_tip_streamlabs" v-model="localData.tip_streamlabs">
					<ParamItem
						class="child"
						noBackground
						:paramData="param_tip_streamlabs_minAmount"
						v-model="localData.tip_streamlabs_minAmount"
					/>
					<ParamItem
						class="child"
						noBackground
						:paramData="param_tip_streamlabs_ponderate"
						v-model="localData.tip_streamlabs_ponderate"
					/>
				</ParamItem>
				<ParamItem
					:paramData="param_tip_streamlabsCharity"
					v-model="localData.tip_streamlabsCharity"
				>
					<ParamItem
						class="child"
						noBackground
						:paramData="param_tip_streamlabsCharity_minAmount"
						v-model="localData.tip_streamlabsCharity_minAmount"
					/>
					<ParamItem
						class="child"
						noBackground
						:paramData="param_tip_streamlabsCharity_ponderate"
						v-model="localData.tip_streamlabsCharity_ponderate"
					/>
				</ParamItem>
				<ParamItem
					:paramData="param_tip_streamlements"
					v-model="localData.tip_streamelements"
				>
					<ParamItem
						class="child"
						noBackground
						:paramData="param_tip_streamelements_minAmount"
						v-model="localData.tip_streamelements_minAmount"
					/>
					<ParamItem
						class="child"
						noBackground
						:paramData="param_tip_streamlements_ponderate"
						v-model="localData.tip_streamelements_ponderate"
					/>
				</ParamItem>
				<ParamItem :paramData="param_tip_tipeee" v-model="localData.tip_tipeee">
					<ParamItem
						class="child"
						noBackground
						:paramData="param_tip_tipeee_minAmount"
						v-model="localData.tip_tipeee_minAmount"
					/>
					<ParamItem
						class="child"
						noBackground
						:paramData="param_tip_tipeee_ponderate"
						v-model="localData.tip_tipeee_ponderate"
					/>
				</ParamItem>
				<ParamItem :paramData="param_tip_tiltify" v-model="localData.tip_tiltify">
					<ParamItem
						class="child"
						noBackground
						:paramData="param_tip_tiltify_minAmount"
						v-model="localData.tip_tiltify_minAmount"
					/>
					<ParamItem
						class="child"
						noBackground
						:paramData="param_tip_tiltify_ponderate"
						v-model="localData.tip_tiltify_ponderate"
					/>
				</ParamItem>
				<ParamItem
					:paramData="param_tip_twitchCharity"
					v-model="localData.tip_twitchCharity"
				>
					<ParamItem
						class="child"
						noBackground
						:paramData="param_tip_twitchCharity_minAmount"
						v-model="localData.tip_twitchCharity_minAmount"
					/>
					<ParamItem
						class="child"
						noBackground
						:paramData="param_tip_twitchCharity_ponderate"
						v-model="localData.tip_twitchCharity_ponderate"
					/>
				</ParamItem>

				<ParamItem :paramData="param_enterDuration" v-model="localData.duration_s" />

				<ToggleBlock
					class="configs"
					:icons="['params']"
					:title="t('global.advanced_params')"
					:open="false"
					small
				>
					<ParamItem :paramData="param_multipleJoin" v-model="localData.multipleJoin" />
					<ParamItem
						:paramData="param_maxUsersToggle"
						v-model="param_maxUsersToggle.value"
						@change="onValueChange()"
					>
						<ParamItem
							class="child"
							noBackground
							:paramData="param_maxEntries"
							v-model="localData.maxEntries"
						/>
					</ParamItem>

					<ParamItem
						:paramData="param_showCountdownOverlay"
						v-model="localData.showCountdownOverlay"
					>
						<i18n-t
							scope="global"
							tag="div"
							class="details"
							v-if="localData.showCountdownOverlay === true"
							keypath="raffle.configs.timer_overlay_add"
						>
							<template #LINK>
								<a @click="openParam('overlays')">{{
									t("raffle.configs.timer_overlay_add_link")
								}}</a>
							</template>
						</i18n-t>
					</ParamItem>

					<PostOnChatParam
						:botMessageKey="triggerMode ? undefined : 'raffleTipsStart'"
						:placeholders="startTipsPlaceholders"
						v-model:text="localData.messages!.raffleStart!.message"
						v-model:enabled="localData.messages!.raffleStart!.enabled"
						icon="announcement"
						titleKey="raffle.configs.postOnChat_start"
					/>
					<PostOnChatParam
						:botMessageKey="triggerMode ? undefined : 'raffleTipsJoin'"
						:placeholders="joinTipsPlaceholders"
						v-model:text="localData.messages!.raffleJoin!.message"
						v-model:enabled="localData.messages!.raffleJoin!.enabled"
						icon="announcement"
						titleKey="raffle.configs.postOnChat_join"
					/>
					<PostOnChatParam
						:botMessageKey="triggerMode ? undefined : 'raffleTipsWinner'"
						:placeholders="winnerTipsPlaceholders"
						v-model:text="localData.messages!.raffleWinner!.message"
						v-model:enabled="localData.messages!.raffleWinner!.enabled"
						icon="announcement"
						titleKey="raffle.configs.postOnChat_winner"
					/>
				</ToggleBlock>

				<TTButton
					type="submit"
					icon="ticket"
					v-if="triggerMode === false"
					:aria-label="t('raffle.chat.startBt_aria')"
					:disabled="
						localData.tip_kofi !== true &&
						localData.tip_streamlabs !== true &&
						localData.tip_streamlabsCharity !== true &&
						localData.tip_streamelements !== true &&
						localData.tip_tipeee !== true &&
						localData.tip_tiltify !== true &&
						localData.tip_twitchCharity !== true
					"
					>{{ t("global.start") }}</TTButton
				>
			</form>

			<form
				class="form"
				v-else-if="localData.mode == 'sub' && canListSubs"
				@submit.prevent="submitForm()"
			>
				<div class="card-item info">{{ t("raffle.subs.description") }}</div>

				<ParamItem
					:paramData="param_subs_includeGifters"
					v-model="localData.subMode_includeGifters"
				/>
				<ParamItem
					:paramData="param_subs_excludeGifted"
					v-model="localData.subMode_excludeGifted"
				/>
				<div class="card-item winner" v-if="winner" ref="winnerHolder">
					<div class="head">Winner</div>
					<div class="user">🎉 {{ winner }} 🎉</div>
				</div>
				<div class="card-item winner" v-if="winnerTmp">
					<div class="user">{{ winnerTmp }}</div>
				</div>

				<PostOnChatParam
					:botMessageKey="triggerMode ? undefined : 'raffleSubsWinner'"
					:placeholders="winnerSubsPlaceholders"
					v-model:text="localData.messages!.raffleWinner!.message"
					v-model:enabled="localData.messages!.raffleWinner!.enabled"
					icon="announcement"
					titleKey="raffle.configs.postOnChat_winner"
				/>

				<TTButton
					type="submit"
					:aria-label="t('raffle.subs.startBt_aria')"
					icon="sub"
					v-if="triggerMode === false"
					:loading="pickingEntry"
					:disabled="subsFiltered.length == 0"
				>
					<i18n-t scope="global" keypath="raffle.subs.startBt">
						<template #COUNT>
							<i class="small">({{ subsFiltered.length }} subs)</i>
						</template>
					</i18n-t>
				</TTButton>
			</form>

			<form
				class="card-item secondary form scope"
				v-else-if="localData.mode == 'sub' && !canListSubs"
				@submit.prevent="submitForm()"
			>
				<Icon nam="lock_fit" />
				<p class="label">{{ t("params.scope_missing") }}</p>
				<TTButton
					alert
					small
					class="grantBt"
					icon="unlock"
					@click="requestSubPermission()"
					>{{ t("global.grant_scope") }}</TTButton
				>
			</form>

			<form
				class="form"
				v-else-if="localData.mode == 'manual'"
				@submit.prevent="submitForm()"
			>
				<div class="card-item info">{{ t("raffle.list.description") }}</div>

				<div class="card-item">
					<ParamItem
						noBackground
						:paramData="param_customEntries"
						v-model="localData.customEntries"
					/>
					<span class="instructions">{{ t("raffle.list.instructions") }}</span>
				</div>

				<ParamItem
					:paramData="param_list_remove"
					v-model="localData.removeWinningEntry"
					v-if="!triggerMode"
				/>

				<PostOnChatParam
					:botMessageKey="triggerMode ? undefined : 'raffleListWinner'"
					:placeholders="winnerListPlaceholders"
					v-model:text="localData.messages!.raffleWinner!.message"
					v-model:enabled="localData.messages!.raffleWinner!.enabled"
					icon="announcement"
					titleKey="raffle.configs.postOnChat_winner"
				/>

				<TTButton
					type="submit"
					v-if="triggerMode === false"
					:loading="pickingEntry"
					:aria-label="t('raffle.list.startBt_aria')"
					:disabled="customEntriesCount == 0"
					icon="list"
				>
					<i18n-t scope="global" keypath="raffle.list.startBt">
						<template #COUNT>
							<i class="small">({{ customEntriesCount }})</i>
						</template>
					</i18n-t>
				</TTButton>
			</form>

			<form
				class="form"
				v-else-if="localData.mode == 'values'"
				@submit.prevent="submitForm()"
			>
				<i18n-t
					scope="global"
					tag="div"
					class="card-item info"
					keypath="raffle.values.description"
				>
					<template #VALUE>
						<a @click="openValues()">{{ t("raffle.values.description_value") }}</a>
					</template>
				</i18n-t>

				<ParamItem
					:paramData="param_values"
					v-model="param_values.value"
					@change="onValueChange()"
				/>

				<ParamItem
					:paramData="param_values_remove"
					v-model="localData.removeWinningEntry"
				/>

				<ParamItem
					class="splitterField"
					v-if="param_values.selectedListValue?.value.perUser !== true"
					:paramData="param_values_splitter"
					v-model="localData.value_splitter"
				/>

				<PostOnChatParam
					:botMessageKey="triggerMode ? undefined : 'raffleValuesWinner'"
					:placeholders="winnerValuesPlaceholders"
					v-model:text="localData.messages!.raffleWinner!.message"
					v-model:enabled="localData.messages!.raffleWinner!.enabled"
					icon="announcement"
					titleKey="raffle.configs.postOnChat_winner"
				/>

				<TTButton
					type="submit"
					v-if="triggerMode === false"
					:loading="pickingEntry"
					:aria-label="t('raffle.list.startBt_aria')"
					:disabled="valueCount == 0"
					icon="list"
				>
					<i18n-t scope="global" keypath="raffle.values.startBt">
						<template #COUNT>
							<i class="small">({{ valueCount }})</i>
						</template>
					</i18n-t>
				</TTButton>
			</form>

			<ParamItem
				v-if="triggerMode"
				:paramData="param_trigger_waitForWinner"
				v-model="localData.triggerWaitForWinner"
			>
				<div class="parameter-child card-item placeholderInfo primary">
					<Icon name="info" />
					<i18n-t
						scope="global"
						tag="span"
						keypath="raffle.params.trigger_waitForWinner_placeholder"
					>
						<template #PLACEHOLDER>
							<mark v-click2Select>{RAFFLE_WINNER_ENTRY}</mark>
						</template>
					</i18n-t>
				</div>
			</ParamItem>
		</div>
	</div>
</template>

<script setup lang="ts">
import DataStore from "@/store/DataStore";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { storeRaffle as useStoreRaffle } from "@/store/raffle/storeRaffle";
import { storeRewards as useStoreRewards } from "@/store/rewards/storeRewards";
import { storeValues as useStoreValues } from "@/store/values/storeValues";
import {
	TriggerEventPlaceholders,
	type TriggerActionRaffleData,
	type TriggerData,
} from "@/types/TriggerActionDataTypes";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import Utils from "@/utils/Utils";
import { TwitchScopes } from "@/utils/twitch/TwitchScopes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { gsap } from "gsap";
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import ClearButton from "../ClearButton.vue";
import TTButton from "../TTButton.vue";
import TabMenu from "../TabMenu.vue";
import ToggleBlock from "../ToggleBlock.vue";
import ParamItem from "../params/ParamItem.vue";
import PostOnChatParam from "../params/PostOnChatParam.vue";
import FormVoiceControllHelper from "../voice/FormVoiceControllHelper";
import VoiceGlobalCommandsHelper from "../voice/VoiceGlobalCommandsHelper.vue";
import VoiceController from "@/utils/voice/VoiceController";
import { useSidePanel } from "@/composables/useSidePanel";

const props = withDefaults(
	defineProps<{
		triggerMode?: boolean;
		action?: TriggerActionRaffleData;
		triggerData?: TriggerData;
	}>(),
	{
		triggerMode: false,
	},
);

const emit = defineEmits<{ close: [] }>();

const { t, tm } = useI18n();
const storeAuth = useStoreAuth();
const storeRewards = useStoreRewards();
const storeValues = useStoreValues();
const storeRaffle = useStoreRaffle();
const storeParams = useStoreParams();
const rootEl = useTemplateRef<HTMLElement>("rootEl");
const { close } = useSidePanel(rootEl, () => emit("close"));

const pickingEntry = ref(false);
const winner = ref<string | null>(null);
const winnerTmp = ref<string | null>(null);
const voiceController = ref<FormVoiceControllHelper | undefined>(undefined);
const subs = ref<TwitchDataTypes.Subscriber[]>([]);

const winnerPlaceholders = ref<TwitchatDataTypes.PlaceholderEntry[]>([]);
const winnerTipsPlaceholders = ref<TwitchatDataTypes.PlaceholderEntry[]>([]);
const joinPlaceholders = ref<TwitchatDataTypes.PlaceholderEntry[]>([]);
const joinTipsPlaceholders = ref<TwitchatDataTypes.PlaceholderEntry[]>([]);
const winnerSubsPlaceholders = ref<TwitchatDataTypes.PlaceholderEntry[]>([]);
const winnerListPlaceholders = ref<TwitchatDataTypes.PlaceholderEntry[]>([]);
const winnerValuesPlaceholders = ref<TwitchatDataTypes.PlaceholderEntry[]>([]);

const param_command = ref<TwitchatDataTypes.ParameterData<boolean, any, any>>({
	value: true,
	type: "boolean",
	labelKey: "raffle.params.command_join",
	icon: "commands",
});
const param_commandValue = ref<TwitchatDataTypes.ParameterData<string>>({
	value: "",
	type: "string",
	labelKey: "raffle.params.command",
	placeholderKey: "raffle.params.command_placeholder",
});
const param_reward = ref<TwitchatDataTypes.ParameterData<boolean, any, any>>({
	value: false,
	type: "boolean",
	labelKey: "raffle.params.reward_join",
	icon: "channelPoints",
});
const param_rewardvalue = ref<TwitchatDataTypes.ParameterData<string>>({
	value: "",
	type: "list",
	listValues: [],
	labelKey: "raffle.params.reward",
	placeholderKey: "raffle.params.command_placeholder",
});
const param_tip_kofi = ref<TwitchatDataTypes.ParameterData<boolean>>({
	value: false,
	type: "boolean",
	labelKey: "raffle.params.tip_kofi",
	icon: "kofi",
});
const param_tip_streamlabs = ref<TwitchatDataTypes.ParameterData<boolean>>({
	value: false,
	type: "boolean",
	labelKey: "raffle.params.tip_streamlabs",
	icon: "streamlabs",
});
const param_tip_streamlabsCharity = ref<TwitchatDataTypes.ParameterData<boolean>>({
	value: false,
	type: "boolean",
	labelKey: "raffle.params.tip_streamlabsCharity",
	icon: "charity",
});
const param_tip_streamlements = ref<TwitchatDataTypes.ParameterData<boolean>>({
	value: false,
	type: "boolean",
	labelKey: "raffle.params.tip_streamelements",
	icon: "streamelements",
});
const param_tip_tipeee = ref<TwitchatDataTypes.ParameterData<boolean>>({
	value: false,
	type: "boolean",
	labelKey: "raffle.params.tip_tipeee",
	icon: "tipeee",
});
const param_tip_tiltify = ref<TwitchatDataTypes.ParameterData<boolean>>({
	value: false,
	type: "boolean",
	labelKey: "raffle.params.tip_tiltify",
	icon: "tiltify",
});
const param_tip_twitchCharity = ref<TwitchatDataTypes.ParameterData<boolean>>({
	value: false,
	type: "boolean",
	labelKey: "raffle.params.tip_twitchCharity",
	icon: "twitch_charity",
});
const param_tip_kofi_minAmount = ref<TwitchatDataTypes.ParameterData<number>>({
	value: 1,
	type: "number",
	min: 0,
	max: 999999,
	labelKey: "raffle.params.tip_minAmount",
});
const param_tip_streamlabs_minAmount = ref<TwitchatDataTypes.ParameterData<number>>({
	value: 1,
	type: "number",
	min: 0,
	max: 999999,
	labelKey: "raffle.params.tip_minAmount",
});
const param_tip_streamlabsCharity_minAmount = ref<TwitchatDataTypes.ParameterData<number>>({
	value: 1,
	type: "number",
	min: 0,
	max: 999999,
	labelKey: "raffle.params.tip_minAmount",
});
const param_tip_streamelements_minAmount = ref<TwitchatDataTypes.ParameterData<number>>({
	value: 1,
	type: "number",
	min: 0,
	max: 999999,
	labelKey: "raffle.params.tip_minAmount",
});
const param_tip_tipeee_minAmount = ref<TwitchatDataTypes.ParameterData<number>>({
	value: 1,
	type: "number",
	min: 0,
	max: 999999,
	labelKey: "raffle.params.tip_minAmount",
});
const param_tip_tiltify_minAmount = ref<TwitchatDataTypes.ParameterData<number>>({
	value: 1,
	type: "number",
	min: 0,
	max: 999999,
	labelKey: "raffle.params.tip_minAmount",
});
const param_tip_twitchCharity_minAmount = ref<TwitchatDataTypes.ParameterData<number>>({
	value: 1,
	type: "number",
	min: 0,
	max: 999999,
	labelKey: "raffle.params.tip_minAmount",
});
const param_tip_kofi_ponderate = ref<TwitchatDataTypes.ParameterData<number>>({
	value: 1,
	type: "number",
	min: 0,
	max: 999999,
	labelKey: "raffle.params.tip_ponderate",
});
const param_tip_streamlabs_ponderate = ref<TwitchatDataTypes.ParameterData<number>>({
	value: 1,
	type: "number",
	min: 0,
	max: 999999,
	labelKey: "raffle.params.tip_ponderate",
});
const param_tip_streamlabsCharity_ponderate = ref<TwitchatDataTypes.ParameterData<number>>({
	value: 1,
	type: "number",
	min: 0,
	max: 999999,
	labelKey: "raffle.params.tip_ponderate",
});
const param_tip_streamlements_ponderate = ref<TwitchatDataTypes.ParameterData<number>>({
	value: 1,
	type: "number",
	min: 0,
	max: 999999,
	labelKey: "raffle.params.tip_ponderate",
});
const param_tip_tipeee_ponderate = ref<TwitchatDataTypes.ParameterData<number>>({
	value: 1,
	type: "number",
	min: 0,
	max: 999999,
	labelKey: "raffle.params.tip_ponderate",
});
const param_tip_tiltify_ponderate = ref<TwitchatDataTypes.ParameterData<number>>({
	value: 1,
	type: "number",
	min: 0,
	max: 999999,
	labelKey: "raffle.params.tip_ponderate",
});
const param_tip_twitchCharity_ponderate = ref<TwitchatDataTypes.ParameterData<number>>({
	value: 1,
	type: "number",
	min: 0,
	max: 999999,
	labelKey: "raffle.params.tip_ponderate",
});
const param_enterDuration = ref<TwitchatDataTypes.ParameterData<number>>({
	value: 600,
	type: "duration",
	min: 1,
	max: 365 * 24 * 60 * 60,
	labelKey: "raffle.params.duration",
	icon: "timer",
});
const param_maxUsersToggle = ref<TwitchatDataTypes.ParameterData<boolean, any, any>>({
	value: false,
	type: "boolean",
	labelKey: "raffle.params.limit_users",
	icon: "user",
});
const param_maxEntries = ref<TwitchatDataTypes.ParameterData<number>>({
	value: 10,
	type: "number",
	min: 0,
	max: 1000000,
	labelKey: "raffle.params.max_users",
	icon: "user",
});
const param_multipleJoin = ref<TwitchatDataTypes.ParameterData<boolean>>({
	value: false,
	type: "boolean",
	labelKey: "raffle.params.multiple_join",
	icon: "user",
});
const param_autoClose = ref<TwitchatDataTypes.ParameterData<boolean>>({
	value: true,
	type: "boolean",
	labelKey: "raffle.params.param_autoClose",
	icon: "trash",
});
const param_ponderateVotes = ref<TwitchatDataTypes.ParameterData<boolean, any, any>>({
	value: false,
	type: "boolean",
	labelKey: "raffle.params.ponderate",
	icon: "balance",
});
const param_ponderateVotes_vip = ref<TwitchatDataTypes.ParameterData<number>>({
	value: 0,
	type: "number",
	min: 0,
	max: 100,
	icon: "vip",
	labelKey: "raffle.params.ponderate_VIP",
});
const param_ponderateVotes_sub = ref<TwitchatDataTypes.ParameterData<number>>({
	value: 0,
	type: "number",
	min: 0,
	max: 100,
	icon: "sub",
	labelKey: "raffle.params.ponderate_sub",
});
const param_ponderateVotes_subT2 = ref<TwitchatDataTypes.ParameterData<number>>({
	value: 0,
	type: "number",
	min: 0,
	max: 100,
	icon: "sub",
	labelKey: "raffle.params.ponderate_subT2",
	twitch_scopes: [TwitchScopes.LIST_SUBSCRIBERS],
});
const param_ponderateVotes_subT3 = ref<TwitchatDataTypes.ParameterData<number>>({
	value: 0,
	type: "number",
	min: 0,
	max: 100,
	icon: "sub",
	labelKey: "raffle.params.ponderate_subT3",
	twitch_scopes: [TwitchScopes.LIST_SUBSCRIBERS],
});
const param_ponderateVotes_subgift = ref<TwitchatDataTypes.ParameterData<number>>({
	value: 0,
	type: "number",
	min: 0,
	max: 100,
	icon: "gift",
	labelKey: "raffle.params.ponderate_subgifter",
});
const param_ponderateVotes_follower = ref<TwitchatDataTypes.ParameterData<number>>({
	value: 0,
	type: "number",
	min: 0,
	max: 100,
	icon: "follow",
	labelKey: "raffle.params.ponderate_follower",
	twitch_scopes: [TwitchScopes.LIST_FOLLOWERS],
});
const param_subs_includeGifters = ref<TwitchatDataTypes.ParameterData<boolean>>({
	value: true,
	type: "boolean",
	icon: "gift",
	labelKey: "raffle.params.ponderate_include_gifter",
});
const param_subs_excludeGifted = ref<TwitchatDataTypes.ParameterData<boolean>>({
	value: true,
	type: "boolean",
	icon: "sub",
	labelKey: "raffle.params.ponderate_exclude_gifted",
});
const param_showCountdownOverlay = ref<TwitchatDataTypes.ParameterData<boolean>>({
	value: false,
	type: "boolean",
	icon: "countdown",
	labelKey: "raffle.configs.countdown",
});
const param_customEntries = ref<TwitchatDataTypes.ParameterData<string>>({
	value: "",
	type: "string",
	longText: true,
	maxLength: 10000,
	placeholderKey: "raffle.params.list_placeholder",
});
const param_values = ref<
	TwitchatDataTypes.ParameterData<
		TwitchatDataTypes.ValueData | null,
		TwitchatDataTypes.ValueData,
		undefined,
		TwitchatDataTypes.ValueData
	>
>({
	value: null,
	type: "list",
	labelKey: "raffle.params.value_placeholder",
	icon: "placeholder",
});
const param_values_splitter = ref<TwitchatDataTypes.ParameterData<string>>({
	value: ",",
	type: "string",
	maxLength: 5,
	labelKey: "raffle.params.value_splitter",
	icon: "splitter",
});
const param_values_remove = ref<TwitchatDataTypes.ParameterData<boolean>>({
	value: false,
	type: "boolean",
	labelKey: "raffle.params.value_remove",
	icon: "trash",
});
const param_list_remove = ref<TwitchatDataTypes.ParameterData<boolean>>({
	value: false,
	type: "boolean",
	labelKey: "raffle.params.list_remove",
	icon: "trash",
});
const param_trigger_waitForWinner = ref<TwitchatDataTypes.ParameterData<boolean>>({
	value: false,
	type: "boolean",
	labelKey: "raffle.params.trigger_waitForWinner",
	icon: "countdown",
});

const localData = ref<TwitchatDataTypes.RaffleData>({
	mode: "chat",
	command: "!raffle",
	reward_id: undefined,
	duration_s: 600,
	maxEntries: 0,
	autoClose: true,
	multipleJoin: false,
	created_at: Date.now(),
	entries: [],
	followRatio: 1,
	vipRatio: 1,
	subRatio: 1,
	subT2Ratio: 1,
	subT3Ratio: 1,
	subgiftRatio: 1,
	subMode_includeGifters: false,
	subMode_excludeGifted: false,
	showCountdownOverlay: false,
	customEntries: "",
	value_id: undefined,
	value_splitter: undefined,
	removeWinningEntry: false,
	tip_kofi: false,
	tip_streamlabs: false,
	tip_streamlabsCharity: false,
	tip_streamelements: false,
	tip_tipeee: false,
	tip_tiltify: false,
	tip_twitchCharity: false,
	tip_kofi_minAmount: 1,
	tip_streamlabs_minAmount: 1,
	tip_streamlabsCharity_minAmount: 1,
	tip_streamelements_minAmount: 1,
	tip_tipeee_minAmount: 1,
	tip_tiltify_minAmount: 1,
	tip_twitchCharity_minAmount: 1,
	tip_kofi_ponderate: 0,
	tip_streamlabs_ponderate: 0,
	tip_streamlabsCharity_ponderate: 0,
	tip_streamelements_ponderate: 0,
	tip_tipeee_ponderate: 0,
	tip_tiltify_ponderate: 0,
	tip_twitchCharity_ponderate: 0,
	messages: {
		raffleStart: {
			enabled: false,
			message: tm("params.botMessages.raffleStart") as string,
		},
		raffleJoin: {
			enabled: false,
			message: tm("params.botMessages.raffleJoin") as string,
		},
		raffleWinner: {
			enabled: false,
			message: tm("params.botMessages.raffle") as string,
		},
	},
});

const isAffiliate = computed(
	() => storeAuth.twitch.user.is_affiliate || storeAuth.twitch.user.is_partner,
);

/**
 * Gets subs filtered by the current filters
 */
const subsFiltered = computed(() =>
	subs.value.filter((v) => {
		if (
			param_subs_includeGifters.value.value == true &&
			subs.value.find((v2) => v2.gifter_id == v.user_id)
		)
			return true;
		if (param_subs_excludeGifted.value.value == true && v.is_gift) return false;
		if (v.user_id == storeAuth.twitch.user.id) return false;
		return true;
	}),
);

const classes = computed(() => {
	const res = ["raffleform", "sidePanel"];
	if (props.triggerMode !== false) res.push("embedMode");
	return res;
});

const customEntriesCount = computed(() => {
	const splitter = param_customEntries.value.value.split(/\r|\n/).length > 1 ? "\r|\n" : ",";
	const list = param_customEntries.value.value
		.split(new RegExp(splitter, ""))
		.filter((v) => v.length > 0);
	return list.length;
});

const valueCount = computed(() => {
	if (param_values.value.value) {
		const val = param_values.value.selectedListValue?.value;
		if (!val) return 0;
		if (val.perUser) return Object.keys(val.users || {}).length;
		const splitter =
			localData.value.value_splitter ||
			new RegExp(val.value.split(/\r|\n/).length > 1 ? "\r|\n" : ",");
		return val.value.split(splitter).filter((v) => v.length > 0).length;
	} else {
		return 0;
	}
});

const startPlaceholders = computed((): TwitchatDataTypes.PlaceholderEntry[] => {
	const reward = storeRewards.rewardList.find((v) => v.id == localData.value.reward_id);
	const rewardName = reward?.title || "My awesome reward";
	return [
		{
			tag: "CMD",
			descKey: "raffle.configs.message_cmd_placeholder",
			example: localData.value.command,
		},
		{
			tag: "REWARD",
			descKey: "raffle.configs.message_reward_placeholder",
			example: rewardName,
		},
	];
});

const startTipsPlaceholders = computed((): TwitchatDataTypes.PlaceholderEntry[] => {
	const platforms: string[] = [];
	const minSuffix = t("raffle.tips.minAmount_suffix");
	if (localData.value.tip_kofi) {
		let label = "Ko-Fi";
		if ((localData.value.tip_kofi_minAmount || 0) > 0) {
			label += " (" + localData.value.tip_kofi_minAmount + "🪙" + minSuffix + ")";
		}
		platforms.push(label);
	}
	if (localData.value.tip_streamlabs) {
		let label = "Streamlabs";
		if ((localData.value.tip_streamlabs_minAmount || 0) > 0) {
			label += " (" + localData.value.tip_streamlabs_minAmount + "🪙" + minSuffix + ")";
		}
		platforms.push(label);
	}
	if (localData.value.tip_streamlabsCharity) {
		let label = "Streamlabs Charity";
		if ((localData.value.tip_streamlabsCharity_minAmount || 0) > 0) {
			label +=
				" (" + localData.value.tip_streamlabsCharity_minAmount + "🪙" + minSuffix + ")";
		}
		platforms.push(label);
	}
	if (localData.value.tip_streamelements) {
		let label = "Streamelements";
		if ((localData.value.tip_streamelements_minAmount || 0) > 0) {
			label += " (" + localData.value.tip_streamelements_minAmount + "🪙" + minSuffix + ")";
		}
		platforms.push(label);
	}
	if (localData.value.tip_tipeee) {
		let label = "Tipeee";
		if ((localData.value.tip_tipeee_minAmount || 0) > 0) {
			label += " (" + localData.value.tip_tipeee_minAmount + "🪙" + minSuffix + ")";
		}
		platforms.push(label);
	}
	if (localData.value.tip_tiltify) {
		let label = "Tiltify";
		if ((localData.value.tip_tiltify_minAmount || 0) > 0) {
			label += " (" + localData.value.tip_tiltify_minAmount + "🪙" + minSuffix + ")";
		}
		platforms.push(label);
	}
	if (localData.value.tip_twitchCharity) {
		let label = "Twitch charity";
		if ((localData.value.tip_twitchCharity_minAmount || 0) > 0) {
			label += " (" + localData.value.tip_twitchCharity_minAmount + "🪙" + minSuffix + ")";
		}
		platforms.push(label);
	}
	return [
		{
			tag: "PLATFORMS",
			descKey: "raffle.configs.message_cmd_placeholder",
			example: platforms.join(", "),
		},
	];
});

const canListSubs = computed(() => TwitchUtils.hasScopes([TwitchScopes.LIST_SUBSCRIBERS]));

onMounted(async () => {
	if (!props.triggerMode) {
		gsap.set(rootEl.value!, { translateY: 0 });
		gsap.from(rootEl.value!, {
			duration: 0.4,
			translateY: "100%",
			clearProps: "transform",
			ease: "back.out",
		});
	}

	onValueChange();

	pickingEntry.value = true;
	subs.value = await TwitchUtils.getSubsList(false);
	pickingEntry.value = false;
});

onMounted(() => {
	winnerPlaceholders.value = [
		{
			tag: "USER",
			descKey: "raffle.params.username_placeholder",
			example: storeAuth.twitch.user.displayNameOriginal,
		},
	];
	joinPlaceholders.value = [
		{
			tag: "USER",
			descKey: "raffle.params.username_placeholder",
			example: storeAuth.twitch.user.displayNameOriginal + ", @Twitch, @Durss",
		},
	];
	winnerTipsPlaceholders.value = [
		{
			tag: "USER",
			descKey: "raffle.params.username_placeholder",
			example: storeAuth.twitch.user.displayNameOriginal,
		},
		{ tag: "AMOUNT", descKey: "raffle.params.amount_placeholder", example: "$25" },
		{ tag: "PLATFORM", descKey: "raffle.params.amount_placeholder", example: "Streamlabs" },
	];
	joinTipsPlaceholders.value = [
		{
			tag: "USER",
			descKey: "raffle.params.username_placeholder",
			example: storeAuth.twitch.user.displayNameOriginal + ", Twitch, Durss",
		},
		{ tag: "AMOUNT", descKey: "raffle.params.amount_placeholder", example: "$25" },
		{ tag: "PLATFORM", descKey: "raffle.params.amount_placeholder", example: "Streamlabs" },
	];
	winnerSubsPlaceholders.value = [
		{
			tag: "USER",
			descKey: "raffle.params.username_placeholder",
			example: storeAuth.twitch.user.displayNameOriginal,
		},
	];
	const entryPlaceholder: TwitchatDataTypes.PlaceholderEntry[] = [
		{
			tag: "ENTRY",
			descKey: "raffle.params.entry_placeholder",
			example: "My Awesome Entry",
		},
	];
	winnerListPlaceholders.value = entryPlaceholder;
	winnerValuesPlaceholders.value = entryPlaceholder;

	param_rewardvalue.value.listValues = [
		{ value: undefined, labelKey: "global.select_placeholder" },
	];

	if (isAffiliate.value) {
		TwitchUtils.getRewards().then((list) => {
			list.sort((a, b) => {
				if (a.title > b.title) return 1;
				if (a.title < b.title) return -1;
				return 0;
			}).forEach((v) => {
				param_rewardvalue.value.listValues!.push({ value: v.id, label: v.title });
			});
		});
	}

	param_values.value.listValues = storeValues.valueList.map((v) => {
		return <TwitchatDataTypes.ParameterDataListValue<TwitchatDataTypes.ValueData>>{
			value: v,
			label: v.name,
		};
	});

	if (props.triggerMode !== false && props.triggerData && props.action) {
		if (props.action.raffleData) {
			localData.value = props.action.raffleData;
			param_command.value.value = props.action.raffleData.command != undefined;
			param_maxUsersToggle.value.value = props.action.raffleData.maxEntries > 0;
			param_reward.value.value = props.action.raffleData.reward_id != undefined;
			const preselectedValue = param_values.value.listValues!.find(
				(v) => v.value.id === props.action!.raffleData.value_id,
			)?.value;
			if (preselectedValue) {
				param_values.value.value = preselectedValue;
			}

			if (props.triggerMode && props.action) {
				if (!props.action.raffleData.messages) {
					props.action.raffleData.messages = {
						raffleStart: {
							enabled: false,
							message: t("params.botMessages.raffleStart"),
						},
						raffleJoin: {
							enabled: false,
							message: t("params.botMessages.raffleJoin"),
						},
						raffleWinner: {
							enabled: false,
							message: t("params.botMessages.raffle"),
						},
					};
				}
			}
		}

		param_customEntries.value.placeholderList = TriggerEventPlaceholders(
			props.triggerData.type,
		);
	} else {
		param_showCountdownOverlay.value.value =
			DataStore.get(DataStore.RAFFLE_OVERLAY_COUNTDOWN) === "true";
	}

	watch(
		() => localData.value,
		() => onValueChange(),
		{ deep: true },
	);
});

onBeforeUnmount(() => {
	if (voiceController.value) voiceController.value.dispose();
});

watch(
	() => VoiceController.instance.started.value,
	() => {
		if (VoiceController.instance.started.value && !voiceController.value) {
			voiceController.value = new FormVoiceControllHelper(
				rootEl.value as HTMLDivElement,
				close,
				submitForm,
			);
		}
	},
);

watch(
	() => param_showCountdownOverlay.value.value,
	() => {
		if (props.triggerMode) return;
		DataStore.set(DataStore.RAFFLE_OVERLAY_COUNTDOWN, param_showCountdownOverlay.value.value);
	},
);

watch(
	() => localData.value.mode,
	() => onValueChange(),
);

/**
 * Create a raffle
 */
async function submitForm(): Promise<void> {
	if (props.triggerMode) return;

	const payload: TwitchatDataTypes.RaffleData = JSON.parse(
		JSON.stringify(localData.value),
	) as typeof localData.value;
	payload.messages = undefined;

	//Force autoclose for those raffle types as they don't need to persist
	if (payload.mode == "manual" || payload.mode == "values") payload.autoClose = true;

	//Sub mode specifics
	if (localData.value.mode == "sub") {
		subs.value = Utils.shuffle(await TwitchUtils.getSubsList(false));
		if (subsFiltered.value.length == 0) return;
		let interval = window.setInterval(() => {
			winnerTmp.value = Utils.pickRand(subsFiltered.value).user_name;
		}, 70);
		winner.value = null;
		pickingEntry.value = true;
		await Utils.promisedTimeout(2000);
		payload.resultCallback = (w: TwitchatDataTypes.RaffleEntry) => {
			clearInterval(interval);
			winnerTmp.value = null;
			winner.value = w.label;
		};
	}

	pickingEntry.value = true;
	await storeRaffle.startRaffle(payload);
	if (localData.value.mode == "chat" || localData.value.mode == "tips") {
		void close();
	} else {
		await Utils.promisedTimeout(500);
	}
	pickingEntry.value = false;

	if (!props.triggerMode && localData.value.mode == "manual") {
		param_customEntries.value.value = payload.customEntries;
	}
}

function openParam(page: TwitchatDataTypes.ParameterPagesStringType): void {
	if (props.triggerMode) {
		storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.OVERLAYS);
	} else {
		storeParams.openParamsPage(page);
	}
}

function onValueChange(): void {
	if (param_command.value.value === true) {
		localData.value.command =
			param_commandValue.value.value || t("raffle.params.command_placeholder");
	} else {
		localData.value.command = undefined;
	}

	if (param_ponderateVotes.value.value == false) {
		localData.value.vipRatio = 0;
		localData.value.followRatio = 0;
		localData.value.subRatio = 0;
		localData.value.subT2Ratio = 0;
		localData.value.subT3Ratio = 0;
		localData.value.subgiftRatio = 0;
	} else {
		localData.value.vipRatio = localData.value.vipRatio || 1;
		localData.value.followRatio = localData.value.followRatio || 1;
		localData.value.subRatio = localData.value.subRatio || 1;
		localData.value.subT2Ratio = localData.value.subT2Ratio || 1;
		localData.value.subT3Ratio = localData.value.subT3Ratio || 1;
		localData.value.subgiftRatio = localData.value.subgiftRatio || 1;
	}

	if (param_maxUsersToggle.value.value == false) {
		localData.value.maxEntries = 0;
	} else {
		localData.value.maxEntries = localData.value.maxEntries || 100;
	}

	if (param_reward.value.value == false) {
		localData.value.reward_id = undefined;
	}

	if (props.action) {
		props.action.raffleData = localData.value;
	}

	localData.value.value_id = param_values.value.selectedListValue?.value.id;
}

function requestSubPermission(): void {
	storeAuth.requestTwitchScopes([TwitchScopes.LIST_SUBSCRIBERS]);
}

function openValues(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.VALUES);
}
</script>

<style scoped lang="less">
.raffleform {
	.legal {
		margin: 0 auto;
		width: 100%;
		max-width: 600px;
	}

	.triggerInfo {
		font-size: 0.8em;
		line-height: 1.4em;
		.icon {
			height: 1em;
			margin-right: 0.25em;
		}
	}

	.content {
		.voiceHelper {
			margin: auto;
		}

		.info {
			font-size: 0.9em;
			background-color: var(--color-primary-fader);
		}

		.form {
			.small {
				font-size: 0.8em;
			}

			.winner {
				font-weight: bold;
				gap: 0;
				color: var(--color-light);
				background-color: var(--color-secondary);
				.head {
					font-size: 1.25em;
					padding: 0.25em;
					text-align: center;
				}
				.user {
					padding: 0.5em;
					text-align: center;
				}
			}

			&.scope {
				text-align: center;
				p {
					font-size: 0.8em;
				}
				img {
					height: 0.8em;
					margin-right: 0.25em;
					vertical-align: middle;
				}
				a {
					color: var(--color-alert);
				}
				.grantBt {
					margin: auto;
				}
			}

			.instructions {
				display: block;
				font-size: 0.9em;
				font-style: italic;
				text-align: center;
			}

			.splitterField {
				:deep(.inputHolder) {
					align-self: flex-end;
					flex-grow: 0;
					flex-basis: 100px;
					input {
						padding-right: 1.5em;
					}
				}
			}
		}
	}

	.placeholderInfo {
		.icon {
			height: 1em;
			margin-right: 0.25em;
			vertical-align: baseline;
		}
	}
}
</style>
