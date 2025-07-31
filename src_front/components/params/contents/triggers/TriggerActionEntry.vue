<template>
	<div class="triggerActionWrapper" :class="{disabledAction:!action.enabled}">
		<TriggerConditionList v-if="action.conditionList"
			class="card-item conditions"
			actionContext
			:triggerData="triggerData"
			:triggerAction="action"
			:conditions="action.conditionList"
			:placeholderList="placeholderList"
			@empty="delete action.conditionList" />

		<!-- <div v-if="action.conditionList" class="conditionLink">
			<Icon name="merge" />
		</div> -->

		<TriggerActionDelayEntry v-if="action.type=='delay'"
			:action="action"
			:triggerData="triggerData"
			@delete="$emit('delete')"
			@addCondition="addCondition" />

		<TriggerActionDeleteMessageEntry v-else-if="action.type=='delete_message'"
			:action="action"
			:triggerData="triggerData"
			@delete="$emit('delete')"
			@addCondition="addCondition" />

		<TriggerActionSpoilMessageEntry v-else-if="action.type=='spoil_message'"
			:action="action"
			:triggerData="triggerData"
			@delete="$emit('delete')"
			@addCondition="addCondition" />

		<TriggerActionStopExecEntry v-else-if="action.type=='trigger_stop'"
			:action="action"
			:triggerData="triggerData"
			@delete="$emit('delete')"
			@addCondition="addCondition" />

		<ToggleBlock v-else
		noArrow
		data-noselect
		:error="isError"
		:open="opened"
		:title="title"
		:subtitle="subtitle"
		:class="classes"
		:icons="icons? icons : []">
			<template #left_actions>
				<div class="actionList">
					<TTButton small
						icon="dragZone"
						class="action orderBt"
						v-tooltip="$t('triggers.reorder_tt')"
						@click.stop
						/>
					<ToggleButton v-model="action.enabled" @click.stop small />
				</div>
			</template>
			<template #right_actions>
				<div class="actionList">
					<TTButton small
						icon="merge"
						class="action"
						@click.stop="addCondition()"
						v-if="!action.conditionList"
						v-tooltip="$t('triggers.condition.add_tt')"
						/>

					<TTButton small
						icon="copy"
						class="action"
						@click.stop="$emit('duplicate')"
						v-tooltip="$t('triggers.actions.common.duplicate_tt')"
						/>

					<TTButton small alert
						icon="trash"
						class="action delete"
						@click.stop="$emit('delete')"
						v-tooltip="$t('global.delete')"
					/>
				</div>
			</template>

			<div v-if="action.type===null" class="typeSelector">
				<div class="info">{{ $t('triggers.actions.common.select_action') }}</div>

				<input class="searchField" type="text" v-model="search" :placeholder="$t('global.search_placeholder')" @input="onSearch" v-autofocus="true" />

				<div class="list" ref="actionList">

					<TTButton class="button" @click="selectActionType('delay')"
						icon="timer">{{ $t('triggers.actions.common.action_delay') }}</TTButton>

					<TTButton class="button" @click="selectActionType('chat')"
						icon="whispers">{{ $t('triggers.actions.common.action_chat') }}</TTButton>

					<TTButton class="button" @click="selectActionType('delete_message')"
						v-if="isDeletableMessageTrigger"
						icon="trash">{{ $t('triggers.actions.common.action_delete') }}</TTButton>

					<TTButton class="button" @click="selectActionType('spoil_message')"
						v-if="isDeletableMessageTrigger"
						icon="spoiler">{{ $t('triggers.actions.common.action_spoil_message') }}</TTButton>

					<TTButton class="button" @click="selectActionType('customChat')"
						v-newflag="{date:$config.NEW_FLAGS_DATE_V11, id:'params_triggerAction_ttnotif'}"
						icon="info">{{ $t('triggers.actions.common.action_customChat') }}</TTButton>

					<TTButton class="button" @click.capture="selectActionType('reward')"
						v-if="isAffiliate"
						icon="channelPoints"
						v-newflag="{date:$config.NEW_FLAGS_DATE_V11, id:'params_triggerAction_rewards'}"
						:disabled="!canManageRewards">{{ $t('triggers.actions.common.action_reward') }}</TTButton>

					<TTButton class="button" @click.capture="selectActionType('extension')"
						icon="extension"
						v-newflag="{date:$config.NEW_FLAGS_DATE_V11, id:'params_triggerAction_extension'}"
						:disabled="!canManageExtensions">{{ $t('triggers.actions.common.action_extension') }}</TTButton>

					<TTButton class="button" @click.capture="selectActionType('poll')"
						v-if="isAffiliate"
						icon="poll"
						:disabled="!canCreatePoll">{{ $t('triggers.actions.common.action_poll') }}</TTButton>

					<TTButton class="button" @click.capture="selectActionType('prediction')"
						v-if="isAffiliate"
						icon="prediction"
						:disabled="!canCreatePrediction">{{ $t('triggers.actions.common.action_prediction') }}</TTButton>

					<TTButton class="button" @click.capture="selectActionType('chat_poll')"
						v-newflag="{date:$config.NEW_FLAGS_DATE_V16, id:'params_triggerAction_chatpoll'}"
						icon="chatPoll">{{ $t('triggers.actions.common.action_chat_poll') }}</TTButton>

					<TTButton class="button" @click="selectActionType('bingo')"
						icon="bingo">{{ $t('triggers.actions.common.action_bingo') }}</TTButton>

					<TTButton class="button" @click="selectActionType('bingoGrid')"
						icon="bingo_grid">{{ $t('triggers.actions.common.action_bingoGrid') }}</TTButton>

					<TTButton class="button" @click="selectActionType('raffle')"
						icon="ticket">{{ $t('triggers.actions.common.action_raffle') }}</TTButton>

					<TTButton class="button" @click="selectActionType('raffle_enter')"
						v-if="hasUserInfo"
						icon="user">{{ $t('triggers.actions.common.action_raffle_enter') }}</TTButton>

					<TTButton class="button" @click.capture="selectActionType('stream_infos')"
						icon="info"
						:disabled="!canEditStreamInfo"
						v-tooltip="canEditStreamInfo? '' : $t('triggers.actions.common.action_stream_infos_tt')">{{ $t('triggers.actions.common.action_stream_infos') }}</TTButton>

					<TTButton class="button" @click="selectActionType('chatSugg')"
						icon="chatSugg">{{ $t('triggers.actions.common.action_chatSugg') }}</TTButton>

					<TTButton class="button" @click="selectActionType('highlight')"
						icon="highlight" >{{ $t('triggers.actions.common.action_highlight') }}</TTButton>

					<TTButton class="button" @click="selectActionType('value')"
						v-newflag="{date:1693519200000, id:'params_triggerAction_value'}"
						icon="placeholder">{{ $t('triggers.actions.common.action_value') }}</TTButton>

					<TTButton class="button" @click="selectActionType('count')"
						icon="count">{{ $t('triggers.actions.common.action_count') }}</TTButton>

					<TTButton class="button" @click="selectActionType('random')"
						icon="dice">{{ $t('triggers.actions.common.action_random') }}</TTButton>

					<TTButton class="button" @click="selectActionType('timer')"
						v-newflag="{date:$config.NEW_FLAGS_DATE_V16, id:'params_triggerAction_timer'}"
						icon="timer">{{ $t('triggers.actions.common.action_timer') }}</TTButton>

					<TTButton class="button" @click.capture="selectActionType('obs')"
						icon="obs"
						:disabled="!obsConnected"
						v-tooltip="obsConnected? '' : $t('triggers.actions.common.action_obs_tt')">{{ $t('triggers.actions.common.action_obs') }}</TTButton>

					<TTButton class="button" @click.capture="selectActionType('tts')"
						icon="tts"
						:disabled="!$store.tts.params.enabled"
						v-tooltip="$store.tts.params.enabled? '' : $t('triggers.actions.common.action_tts_tt')">{{ $t('triggers.actions.common.action_tts') }}</TTButton>

					<TTButton class="button" @click.capture="selectActionType('music')"
						icon="spotify"
						:disabled="!spotifyConnected"
						v-tooltip="spotifyConnected? '' : $t('triggers.actions.common.action_music_tt')">{{ $t('triggers.actions.common.action_music') }}</TTButton>

					<TTButton class="button" @click.capture="selectActionType('voicemod')"
						icon="voicemod"
						:disabled="!voicemodEnabled"
						v-tooltip="voicemodEnabled? '' : $t('triggers.actions.common.action_voicemod_tt')">{{ $t('triggers.actions.common.action_voicemod') }}</TTButton>

					<TTButton class="button" @click.capture="selectActionType('discord')"
						icon="discord"
						v-newflag="{date:$config.NEW_FLAGS_DATE_V12, id:'params_triggerAction_discord'}"
						:disabled="!discordEnabled"
						v-tooltip="discordEnabled? '' : $t('triggers.actions.common.action_discord_tt')">{{ $t('triggers.actions.common.action_discord') }}</TTButton>

					<TTButton class="button" @click.capture="selectActionType('goxlr')"
						v-newflag="{date:1693519200000, id:'params_triggerAction_goxlr'}"
						icon="goxlr"
						premium
						:disabled="!goxlrEnabled"
						v-tooltip="goxlrEnabled? '' : $t('triggers.actions.common.action_goxlr_tt')">{{ $t('triggers.actions.common.action_goxlr') }}</TTButton>

					<TTButton class="button" @click.capture="selectActionType('lumia')"
						icon="lumia"
						premium
						:disabled="!lumiaConnected"
						v-tooltip="lumiaConnected? '' : $t('triggers.actions.common.action_lumia_tt')">{{ $t('triggers.actions.common.action_lumia') }}</TTButton>

					<TTButton class="button" @click.capture="selectActionType('streamerbot')"
						:disabled="!$store.streamerbot.connected"
						v-newflag="{date:$config.NEW_FLAGS_DATE_V15, id:'params_triggerAction_streamerbot'}"
						v-tooltip="$store.streamerbot.connected? '' : $t('triggers.actions.common.action_streamerbot_tt')"
						icon="streamerbot">{{ $t('triggers.actions.common.action_streamerbot') }}</TTButton>

					<TTButton class="button" @click.capture="selectActionType('sammi')"
						:disabled="!$store.sammi.connected"
						v-newflag="{date:$config.NEW_FLAGS_DATE_V15, id:'params_triggerAction_sammi'}"
						v-tooltip="$store.sammi.connected? '' : $t('triggers.actions.common.action_sammi_tt')"
						icon="sammi">{{ $t('triggers.actions.common.action_sammi') }}</TTButton>

					<TTButton class="button" @click.capture="selectActionType('mixitup')"
						:disabled="!$store.mixitup.connected"
						v-newflag="{date:$config.NEW_FLAGS_DATE_V15, id:'params_triggerAction_mixitup'}"
						v-tooltip="$store.mixitup.connected? '' : $t('triggers.actions.common.action_mixitup_tt')"
						icon="mixitup">{{ $t('triggers.actions.common.action_mixitup') }}</TTButton>

					<TTButton class="button" @click.capture="selectActionType('playability')"
						:disabled="!$store.playability.connected"
						v-newflag="{date:$config.NEW_FLAGS_DATE_V15, id:'params_triggerAction_playability'}"
						v-tooltip="$store.playability.connected? '' : $t('triggers.actions.common.action_playability_tt')"
						icon="playability">{{ $t('triggers.actions.common.action_playability') }}</TTButton>

					<TTButton class="button" @click.capture="selectActionType('groq')"
						v-if="$store.groq.enabled"
						:disabled="!$store.groq.connected"
						v-newflag="{date:$config.NEW_FLAGS_DATE_V16, id:'params_triggerAction_groq'}"
						v-tooltip="$store.groq.connected? '' : $t('triggers.actions.common.action_groq_tt')"
						icon="groq">{{ $t('triggers.actions.common.action_groq') }}</TTButton>

					<TTButton class="button" @click.capture="selectActionType('customBadges')"
						v-newflag="{date:1693519200000, id:'params_triggerAction_custombadges'}"
						icon="badge">{{ $t('triggers.actions.common.action_customBadges') }}</TTButton>

					<TTButton class="button" @click.capture="selectActionType('customUsername')"
						v-newflag="{date:1693519200000, id:'params_triggerAction_customusername'}"
						icon="user">{{ $t('triggers.actions.common.action_customUsername') }}</TTButton>

					<TTButton class="button" @click.capture="selectActionType('animated_text')"
						:disabled="!canAnimateText"
						v-newflag="{date:$config.NEW_FLAGS_DATE_V16, id:'params_triggerAction_animateText'}"
						v-tooltip="canAnimateText? '' : $t('triggers.actions.common.action_animated_text_tt')"
						icon="animate">{{ $t('triggers.actions.common.action_animated_text') }}</TTButton>

					<TTButton class="button" @click.capture="selectActionType('custom_train')"
						:disabled="!canControlCustomTrain"
						v-newflag="{date:$config.NEW_FLAGS_DATE_V16, id:'params_triggerAction_customTrain'}"
						v-tooltip="canControlCustomTrain? '' : $t('triggers.actions.common.action_custom_train_tt')"
						icon="train">{{ $t('triggers.actions.common.action_custom_train') }}</TTButton>

					<TTButton class="button" @click="selectActionType('trigger')"
						icon="broadcast" >{{ $t('triggers.actions.common.action_trigger') }}</TTButton>

					<TTButton class="button" @click="selectActionType('triggerToggle')"
						icon="broadcast" >{{ $t('triggers.actions.common.action_triggerToggle') }}</TTButton>

					<TTButton class="button" @click="selectActionType('trigger_stop')"
						v-newflag="{date:$config.NEW_FLAGS_DATE_V16, id:'params_triggerAction_trigger_stop'}"
						icon="stop" >{{ $t('triggers.actions.common.trigger_stop') }}</TTButton>

					<TTButton class="button" @click="selectActionType('vibrate')"
						icon="vibrate" >{{ $t('triggers.actions.common.action_vibrate') }}</TTButton>

					<TTButton class="button" @click="selectActionType('sfxr')"
						icon="unmute" >{{ $t('triggers.actions.common.action_sfxr') }}</TTButton>

					<TTButton class="button" @click="selectActionType('http')"
						icon="url">{{ $t('triggers.actions.common.action_http') }}</TTButton>

					<TTButton class="button" @click.capture="selectActionType('ws')"
						:disabled="!wsConnected"
						icon="url">{{ $t('triggers.actions.common.action_ws') }}</TTButton>

					<TTButton class="button" @click.capture="selectActionType('heat_click')"
						:disabled="!heatClickEnabled"
						v-newflag="{date:$config.NEW_FLAGS_DATE_V11, id:'params_triggerAction_clickHeat'}"
						v-tooltip="heatClickEnabled? '' : $t('triggers.actions.common.action_heat_click_tt')"
						icon="distort">{{ $t('triggers.actions.common.action_heat_click') }}</TTButton>
				</div>
			</div>

			<TriggerActionChatEntry v-else-if="action.type=='chat'" :action="action" :triggerData="triggerData" />
			<TriggerActionOBSEntry v-else-if="action.type=='obs'" :action="action" :triggerData="triggerData" :obsSources="obsSources" :obsInputs="obsInputs" :obsScenes="obsScenes" />
			<TriggerActionMusicEntry v-else-if="action.type=='music'" :action="action" :triggerData="triggerData" />
			<TriggerActionTTSEntry v-else-if="action.type=='tts'" :action="action" :triggerData="triggerData" />
			<TriggerActionBingoGridEntry v-else-if="action.type=='bingoGrid'" :action="action" :triggerData="triggerData" />
			<TriggerActionVoicemodEntry v-else-if="action.type=='voicemod'" :action="action" :triggerData="triggerData" />
			<TriggerActionHighlightEntry v-else-if="action.type=='highlight'" :action="action" :triggerData="triggerData" />
			<TriggerActionTriggerEntry v-else-if="action.type=='trigger'" :action="action" :triggerData="triggerData" :rewards="rewards" />
			<TriggerActionTriggerToggleEntry v-else-if="action.type=='triggerToggle'" :action="action" :triggerData="triggerData" :rewards="rewards" />
			<TriggerActionHTTPCall v-else-if="action.type=='http'" :action="action" :triggerData="triggerData" />
			<TriggerActionWSEntry v-else-if="action.type=='ws'" :action="action" :triggerData="triggerData" />
			<TriggerActionValueEntry v-else-if="action.type=='value'" :action="action" :triggerData="triggerData" />
			<TriggerActionCountEntry v-else-if="action.type=='count'" :action="action" :triggerData="triggerData" />
			<TriggerActionRandomEntry v-else-if="action.type=='random'" :action="action" :triggerData="triggerData" :rewards="rewards" />
			<TriggerActionStreamInfoEntry v-else-if="action.type=='stream_infos'" :action="action" :triggerData="triggerData" />
			<TriggerActionVibratePhoneEntry v-else-if="action.type=='vibrate'" :action="action" :triggerData="triggerData" />
			<TriggerActionGoXLREntry v-else-if="action.type=='goxlr'" :action="action" :triggerData="triggerData" />
			<TriggerActionCustomBadge v-else-if="action.type=='customBadges'" :action="action" :triggerData="triggerData" />
			<TriggerActionCustomUsername v-else-if="action.type=='customUsername'" :action="action" :triggerData="triggerData" />
			<TriggerActionCustomChatEntry v-else-if="action.type=='customChat'" :action="action" :triggerData="triggerData" />
			<TriggerActionClickHeatEntry v-else-if="action.type=='heat_click'" :action="action" :triggerData="triggerData" />
			<TriggerActionRewardEntry v-else-if="action.type=='reward'" :action="action" :triggerData="triggerData" :rewards="rewards" />
			<TriggerActionExtensionEntry v-else-if="action.type=='extension'" :action="action" :triggerData="triggerData" :extensions="extensions" />
			<TriggerActionDiscordEntry v-else-if="action.type=='discord'" :action="action" :triggerData="triggerData" />
			<TriggerActionLumiaEntry v-else-if="action.type=='lumia'" :action="action" :triggerData="triggerData" />
			<TriggerActionStreamerbotEntry v-else-if="action.type=='streamerbot'" :action="action" :triggerData="triggerData" />
			<TriggerActionSammiEntry v-else-if="action.type=='sammi'" :action="action" :triggerData="triggerData" />
			<TriggerActionMixitupEntry v-else-if="action.type=='mixitup'" :action="action" :triggerData="triggerData" />
			<TriggerActionPlayAbilityEntry v-else-if="action.type=='playability'" :action="action" :triggerData="triggerData" />
			<TriggerActionGroqEntry v-else-if="action.type=='groq'" :action="action" :triggerData="triggerData" />
			<TriggerActionTimerEntry v-else-if="action.type=='timer'" :action="action" :triggerData="triggerData" />
			<TriggerActionAnimateTextEntry v-else-if="action.type=='animated_text'" :action="action" :triggerData="triggerData" />
			<TriggerActionCustomTrainEntry v-else-if="action.type=='custom_train'" :action="action" :triggerData="triggerData" />
			<TriggerActionSFXREntry v-else-if="action.type=='sfxr'" :action="action" :triggerData="triggerData" />
			<RaffleForm v-else-if="action.type=='raffle'" :action="action" :triggerData="triggerData" triggerMode />
			<BingoForm v-else-if="action.type=='bingo'" :action="action" :triggerData="triggerData" triggerMode />
			<PollForm v-else-if="action.type=='poll'" :action="action" :triggerData="triggerData" triggerMode />
			<ChatPollForm v-else-if="action.type=='chat_poll'" :action="action" :triggerData="triggerData" triggerMode />
			<PredictionForm v-else-if="action.type=='prediction'" :action="action" :triggerData="triggerData" triggerMode />
			<ChatSuggestionForm v-else-if="action.type=='chatSugg'" :action="action" :triggerData="triggerData" triggerMode />
			<div v-else-if="action.type=='raffle_enter'" class="raffleEnter">{{ $t("triggers.actions.raffle_enter.info") }}</div>
		</ToggleBlock>
	</div>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import ToggleButton from '@/components/ToggleButton.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import ChatSuggestionForm from '@/components/chatSugg/ChatSuggestionForm.vue';
import ParamItem from '@/components/params/ParamItem.vue';
import ChatPollForm from '@/components/poll/ChatPollForm.vue';
import PollForm from '@/components/poll/PollForm.vue';
import PredictionForm from '@/components/prediction/PredictionForm.vue';
import { TriggerEventPlaceholders, TriggerTypes, type ITriggerPlaceholder, type TriggerActionAnimatedTextData, type TriggerActionBingoGridData, type TriggerActionCounterData, type TriggerActionCustomTrainData, type TriggerActionObsData, type TriggerActionObsSourceDataAction, type TriggerActionRewardData, type TriggerActionStringTypes, type TriggerActionTypes, type TriggerConditionGroup, type TriggerData } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import type { OBSInputItem, OBSSceneItem, OBSSourceItem } from '@/utils/OBSWebsocket';
import OBSWebsocket from '@/utils/OBSWebsocket';
import Utils from '@/utils/Utils';
import WebsocketTrigger from '@/utils/WebsocketTrigger';
import GoXLRSocket from '@/utils/goxlr/GoXLRSocket';
import SpotifyHelper from '@/utils/music/SpotifyHelper';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import VoicemodWebSocket from '@/utils/voice/VoicemodWebSocket';
import { reactive } from 'vue';
import { Component, Prop, toNative, Vue } from 'vue-facing-decorator';
import BingoForm from '../../../bingo/BingoForm.vue';
import RaffleForm from '../../../raffle/RaffleForm.vue';
import TriggerConditionList from './TriggerConditionList.vue';
import TriggerActionAnimateTextEntry from './entries/TriggerActionAnimateTextEntry.vue';
import TriggerActionBingoGridEntry from './entries/TriggerActionBingoGridEntry.vue';
import TriggerActionChatEntry from './entries/TriggerActionChatEntry.vue';
import TriggerActionClickHeatEntry from './entries/TriggerActionClickHeatEntry.vue';
import TriggerActionCountEntry from './entries/TriggerActionCountEntry.vue';
import TriggerActionCustomBadge from './entries/TriggerActionCustomBadge.vue';
import TriggerActionCustomChatEntry from './entries/TriggerActionCustomChatEntry.vue';
import TriggerActionCustomUsername from './entries/TriggerActionCustomUsername.vue';
import TriggerActionDelayEntry from './entries/TriggerActionDelayEntry.vue';
import TriggerActionDeleteMessageEntry from './entries/TriggerActionDeleteMessageEntry.vue';
import TriggerActionDiscordEntry from './entries/TriggerActionDiscordEntry.vue';
import TriggerActionExtensionEntry from './entries/TriggerActionExtensionEntry.vue';
import TriggerActionGoXLREntry from './entries/TriggerActionGoXLREntry.vue';
import TriggerActionGroqEntry from './entries/TriggerActionGroqEntry.vue';
import TriggerActionHTTPCall from './entries/TriggerActionHTTPCall.vue';
import TriggerActionHighlightEntry from './entries/TriggerActionHighlightEntry.vue';
import TriggerActionLumiaEntry from './entries/TriggerActionLumiaEntry.vue';
import TriggerActionMixitupEntry from './entries/TriggerActionMixitupEntry.vue';
import TriggerActionMusicEntry from './entries/TriggerActionMusicEntry.vue';
import TriggerActionOBSEntry from './entries/TriggerActionOBSEntry.vue';
import TriggerActionPlayAbilityEntry from './entries/TriggerActionPlayAbilityEntry.vue';
import TriggerActionRandomEntry from './entries/TriggerActionRandomEntry.vue';
import TriggerActionRewardEntry from './entries/TriggerActionRewardEntry.vue';
import TriggerActionSammiEntry from './entries/TriggerActionSammiEntry.vue';
import TriggerActionSpoilMessageEntry from './entries/TriggerActionSpoilMessageEntry.vue';
import TriggerActionStopExecEntry from './entries/TriggerActionStopExecEntry.vue';
import TriggerActionStreamInfoEntry from './entries/TriggerActionStreamInfoEntry.vue';
import TriggerActionStreamerbotEntry from './entries/TriggerActionStreamerbotEntry.vue';
import TriggerActionTTSEntry from './entries/TriggerActionTTSEntry.vue';
import TriggerActionTimerEntry from './entries/TriggerActionTimerEntry.vue';
import TriggerActionTriggerEntry from './entries/TriggerActionTriggerEntry.vue';
import TriggerActionTriggerToggleEntry from './entries/TriggerActionTriggerToggleEntry.vue';
import TriggerActionValueEntry from './entries/TriggerActionValueEntry.vue';
import TriggerActionVibratePhoneEntry from './entries/TriggerActionVibratePhoneEntry.vue';
import TriggerActionVoicemodEntry from './entries/TriggerActionVoicemodEntry.vue';
import TriggerActionWSEntry from './entries/TriggerActionWSEntry.vue';
import TriggerActionCustomTrainEntry from './entries/TriggerActionCustomTrainEntry.vue';
import TriggerActionSFXREntry from './TriggerActionSFXREntry.vue';

@Component({
	components:{
		TTButton,
		PollForm,
		ParamItem,
		BingoForm,
		RaffleForm,
		ToggleBlock,
		ToggleButton,
		ChatPollForm,
		PredictionForm,
		ChatSuggestionForm,
		TriggerConditionList,
		TriggerActionWSEntry,
		TriggerActionOBSEntry,
		TriggerActionTTSEntry,
		TriggerActionHTTPCall,
		TriggerActionGroqEntry,
		TriggerActionChatEntry,
		TriggerActionSFXREntry,
		TriggerActionLumiaEntry,
		TriggerActionDelayEntry,
		TriggerActionValueEntry,
		TriggerActionCountEntry,
		TriggerActionMusicEntry,
		TriggerActionSammiEntry,
		TriggerActionGoXLREntry,
		TriggerActionTimerEntry,
		TriggerActionRewardEntry,
		TriggerActionCustomBadge,
		TriggerActionRandomEntry,
		TriggerActionMixitupEntry,
		TriggerActionTriggerEntry,
		TriggerActionDiscordEntry,
		TriggerActionStopExecEntry,
		TriggerActionVoicemodEntry,
		TriggerActionBingoGridEntry,
		TriggerActionClickHeatEntry,
		TriggerActionExtensionEntry,
		TriggerActionHighlightEntry,
		TriggerActionCustomUsername,
		TriggerActionCustomChatEntry,
		TriggerActionStreamInfoEntry,
		TriggerActionCustomTrainEntry,
		TriggerActionPlayAbilityEntry,
		TriggerActionStreamerbotEntry,
		TriggerActionAnimateTextEntry,
		TriggerActionVibratePhoneEntry,
		TriggerActionSpoilMessageEntry,
		TriggerActionDeleteMessageEntry,
		TriggerActionTriggerToggleEntry,
	},
	emits:["delete", "duplicate"]
})
class TriggerActionEntry extends Vue {

	@Prop
	public action!:TriggerActionTypes;
	@Prop
	public triggerData!:TriggerData;
	@Prop({default:[]})
	public obsScenes!:OBSSceneItem[];
	@Prop({default:[]})
	public obsSources!:OBSSourceItem[];
	@Prop({default:[]})
	public obsInputs!:OBSInputItem[];
	@Prop
	public rewards!:TwitchDataTypes.Reward[];
	@Prop
	public extensions!:TwitchDataTypes.Extension[];
	@Prop
	public index!:number;

	public opened = false;
	public search = "";
	public placeholderList: ITriggerPlaceholder<unknown>[] = [];

	public get lumiaConnected():boolean { return this.$store.lumia.connected; }
	public get obsConnected():boolean { return OBSWebsocket.instance.connected; }
	public get spotifyConnected():boolean { return SpotifyHelper.instance.connected; }
	public get voicemodEnabled():boolean { return VoicemodWebSocket.instance.connected.value; }
	public get discordEnabled():boolean { return this.$store.discord.discordLinked === true; }
	public get goxlrEnabled():boolean { return GoXLRSocket.instance.connected; }
	public get wsConnected():boolean { return WebsocketTrigger.instance.connected; }
	public get canManageRewards():boolean { return TwitchUtils.hasScopes([TwitchScopes.MANAGE_REWARDS]); }
	public get canManageExtensions():boolean { return TwitchUtils.hasScopes([TwitchScopes.EXTENSIONS]); }
	public get canCreatePoll():boolean { return TwitchUtils.hasScopes([TwitchScopes.MANAGE_POLLS]); }
	public get canCreatePrediction():boolean { return TwitchUtils.hasScopes([TwitchScopes.MANAGE_PREDICTIONS]); }
	public get canEditStreamInfo():boolean { return TwitchUtils.hasScopes([TwitchScopes.SET_STREAM_INFOS]); }
	public get heatClickEnabled():boolean { return (this.$store.heat.distortionList || []).length > 0; }
	public get canAnimateText():boolean { return this.$store.animatedText.animatedTextList.length > 0; }
	public get canControlCustomTrain():boolean { return this.$store.customTrain.customTrainList.length > 0; }
	public get isAffiliate():boolean {
		return this.$store.auth.twitch.user.is_affiliate || this.$store.auth.twitch.user.is_partner;
	}
	public get isDeletableMessageTrigger():boolean {
		return this.triggerData.type == TriggerTypes.ANY_MESSAGE
			|| this.triggerData.type == TriggerTypes.CHAT_COMMAND
			|| this.triggerData.type == TriggerTypes.CHAT_ALERT
			|| this.triggerData.type == TriggerTypes.PIN_MESSAGE
			|| this.triggerData.type == TriggerTypes.UNPIN_MESSAGE;
	}

	public get classes():string[] {
		const res = ["triggeractionentry"];
		if(this.isError) res.push("error");
		return res;
	}

	/**
	 * Checks if one of the placeholders has a user info in it
	 */
	public get hasUserInfo():boolean { return TriggerEventPlaceholders(this.triggerData.type).findIndex(v=> v.isUserID) > -1; }

	/**
	 * Get block's title
	 */
	public get title():string {
		if(this.isError) {
			if(this.action.type == "obs") {
				return "MISSING OBS SOURCE";
			}
		}

		let res = 'Step '+(this.index+1);
		if(this.action.type) {
			res = this.$t("triggers.actions.common.action_"+this.action.type)
		}
		return res;
	}

	/**
	 * Get block's subtitle
	 */
	public get subtitle():string {
		let res = "";
		if(this.action.type == "obs") {
			const chunks:string[] = [];
			if(this.action.sourceName) {
				let sourceName = this.action.sourceName;
				sourceName = sourceName.replace(/</g, "&lt;").replace(/>/g, "&gt;");
				chunks.push(sourceName);
			}
			if(this.action.filterName) {
				let filterName = this.action.filterName;
				filterName = filterName.replace(/</g, "&lt;").replace(/>/g, "&gt;");
				chunks.push(filterName);
			}
			if(chunks.length > 0) {
				res += chunks.join(" -> ");
			}
		}else
		if(this.action.type == "delay" && this.action.delay > 0) {
			res += "⏳"+this.action.delay+"s";
		}
		return res;
	}

	/**
	 * Get block's icon
	 */
	public get icons():string[] {
		const icons = [];
		const sourceAction2Icon:{[key in TriggerActionObsSourceDataAction]:string} = {
			hide:"hide",
			show:"show",
			mute:"mute",
			unmute:"unmute",
			replay:"play",
			switch_to:"next",
			move:"move",
			resize:"scale",
			rotate:"rotate",
			next:"next",
			prev:"prev",
			stop:"stop",
			toggle_visibility:"show",
		};

		if(this.action.type == "obs") {
			if(this.action.obsAction == "sources") icons.push( sourceAction2Icon[this.action.action]+"" );
			else if(this.action.obsAction === "screenshot") icons.push( "screenshot" );
			else if(this.action.obsAction === "hotKey") icons.push( "press" );
			else if(this.action.obsAction === "startrecord") icons.push( "recordStart" );
			else if(this.action.obsAction === "stoprecord") icons.push( "recordStop" );
			else if(this.action.obsAction === "pauserecord") icons.push( "pause" );
		}
		else if(this.action.type == "music") icons.push( 'spotify' );
		else if(this.action.type == "chat") icons.push( 'whispers' );
		else if(this.action.type == "tts") icons.push( 'tts' );
		else if(this.action.type == "raffle") icons.push( 'ticket' );
		else if(this.action.type == "raffle_enter") icons.push( 'user' );
		else if(this.action.type == "bingo") icons.push( 'bingo' );
		else if(this.action.type == "voicemod") icons.push( 'voicemod' );
		else if(this.action.type == "trigger") icons.push( 'broadcast' );
		else if(this.action.type == "triggerToggle") icons.push( 'broadcast' );
		else if(this.action.type == "highlight") icons.push( 'highlight' );
		else if(this.action.type == "http") icons.push( 'url' );
		else if(this.action.type == "ws") icons.push( 'url' );
		else if(this.action.type == "poll") icons.push( 'poll' );
		else if(this.action.type == "prediction") icons.push( 'prediction' );
		else if(this.action.type == "chat_poll") icons.push( 'chatPoll' );
		else if(this.action.type == "count") icons.push( 'count' );
		else if(this.action.type == "value") icons.push( 'placeholder' );
		else if(this.action.type == "random") icons.push( 'dice_placeholder' );
		else if(this.action.type == "stream_infos") icons.push( 'info' );
		else if(this.action.type == "delay") icons.push( 'timer' );
		else if(this.action.type == "vibrate") icons.push( 'vibrate' );
		else if(this.action.type == "customBadges") icons.push( 'badge' );
		else if(this.action.type == "customUsername") icons.push( 'user' );
		else if(this.action.type == "heat_click") icons.push( 'distort' );
		else if(this.action.type == "reward") icons.push( 'channelPoints' );
		else if(this.action.type == "extension") icons.push( 'extension' );
		else if(this.action.type == "bingoGrid") icons.push( 'bingo_grid' );
		else if(this.action.type == "streamerbot") icons.push( 'streamerbot' );
		else if(this.action.type == "mixitup") icons.push( 'mixitup' );
		else if(this.action.type == "playability") icons.push( 'playability' );
		else if(this.action.type == "groq") icons.push( 'groq' );
		else if(this.action.type == "timer") icons.push( 'timer' );
		else if(this.action.type == "animated_text") icons.push( 'animate' );
		else if(this.action.type == "custom_train") icons.push( 'train' );
		else if(this.action.type == "sfxr") icons.push( 'unmute' );
		return icons;
	}

	public get isError():boolean {
		if(this.action.type == "obs" && this.action.sourceName) {
			const action = this.action as TriggerActionObsData;
			if(!this.obsConnected) return true;
			return this.obsSources.findIndex(v=>v.sourceName == action.sourceName) == -1
				&& this.obsScenes.findIndex(v=>v.sceneName == action.sourceName) == -1
				&& this.obsInputs.findIndex(v=>v.inputName == action.sourceName) == -1
				&& action.sourceName != this.$t("triggers.actions.obs.param_source_currentScene");
		}
		if(this.action.type === "animated_text" && this.action.animatedTextData) {
			const action = this.action as TriggerActionAnimatedTextData;
			return !this.$store.animatedText.animatedTextList.some(entry=> entry.id == action.animatedTextData.overlayId);
		}

		if(this.action.type === "custom_train" && this.action.customTrainData) {
			const action = this.action as TriggerActionCustomTrainData;
			return !this.$store.customTrain.customTrainList.some(entry=> entry.id == action.customTrainData.trainId);
		}

		if(this.action.type === "reward" && this.action.rewardAction) {
			const action = this.action as TriggerActionRewardData;
			return this.rewards.findIndex(r => r.id === action.rewardAction?.rewardId) == -1;
		}
		if(this.action.type === "bingoGrid" && this.action.bingoGrid) {
			const action = this.action as TriggerActionBingoGridData;
			return this.$store.bingoGrid.gridList.findIndex(g => g.id === action.bingoGrid.grid) == -1;
		}
		return false;
	}

	public async beforeMount():Promise<void> {
		this.opened = !this.action.type;
		if(this.action.enabled === undefined) {
			this.action.enabled = true;
		}
	}

	/**
	 * Called when choosing an action type
	 * @param type
	 */
	public selectActionType(type:TriggerActionStringTypes):void {
		switch(type) {
			case "heat_click": {
				if(!this.heatClickEnabled) {
					this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.OVERLAYS, "distort");
					return;
				}break
			}
			case "animated_text": {
				if(!this.canAnimateText) {
					this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.OVERLAYS, "animatedtext");
					return;
				}break
			}
			case "custom_train": {
				if(!this.canControlCustomTrain) {
					this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.OVERLAYS, "customtrain");
					return;
				}break
			}
			case "poll": {
				if(!this.canCreatePoll) {
					this.$store.auth.requestTwitchScopes([TwitchScopes.MANAGE_POLLS]);
					return;
				}break
			}
			case "prediction": {
				if(!this.canCreatePrediction) {
					this.$store.auth.requestTwitchScopes([TwitchScopes.MANAGE_PREDICTIONS]);
					return;
				}break
			}
			case "stream_infos": {
				if(!this.canEditStreamInfo) {
					this.$store.auth.requestTwitchScopes([TwitchScopes.SET_STREAM_INFOS]);
					return;
				}break
			}
			case "music": {
				if(!this.spotifyConnected) {
					this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.CONNECTIONS, TwitchatDataTypes.ParamDeepSections.SPOTIFY);
					return;
				}break
			}
			case "voicemod": {
				if(!this.voicemodEnabled) {
					this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.CONNECTIONS, TwitchatDataTypes.ParamDeepSections.VOICEMOD);
					return;
				}break
			}
			case "goxlr": {
				if(!this.goxlrEnabled) {
					this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.CONNECTIONS, TwitchatDataTypes.ParamDeepSections.GOXLR);
					return;
				}break
			}
			case "obs": {
				if(!this.obsConnected) {
					this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.CONNECTIONS, TwitchatDataTypes.ParamDeepSections.OBS);
					return;
				}break
			}
			case "ws": {
				if(!this.wsConnected) {
					this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.CONNECTIONS, TwitchatDataTypes.ParamDeepSections.WEBSOCKET);
					return;
				}break
			}
			case "streamerbot": {
				if(!this.$store.streamerbot.connected) {
					this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.CONNECTIONS, TwitchatDataTypes.ParamDeepSections.STREAMERBOT);
					return;
				}break
			}
			case "sammi": {
				if(!this.$store.sammi.connected) {
					this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.CONNECTIONS, TwitchatDataTypes.ParamDeepSections.SAMMI);
					return;
				}break
			}
			case "mixitup": {
				if(!this.$store.mixitup.connected) {
					this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.CONNECTIONS, TwitchatDataTypes.ParamDeepSections.MIXITUP);
					return;
				}break
			}
			case "tts": {
				if(!this.$store.tts.params.enabled) {
					this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.TTS);
					return;
				}break
			}
			case "reward": {
				if(!this.canManageRewards) {
					this.$store.auth.requestTwitchScopes([TwitchScopes.MANAGE_REWARDS]);
					return;
				}break
			}
			case "extension": {
				if(!this.canManageExtensions) {
					this.$store.auth.requestTwitchScopes([TwitchScopes.EXTENSIONS]);
					return;
				}break
			}
			case "groq": {
				if(!this.$store.groq.connected) {
					this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.CONNECTIONS, TwitchatDataTypes.ParamDeepSections.GROQ);
					return;
				}break;
			}
		}
		this.action.type = type;
	}

	/**
	 * Add condtions to current action
	 */
	public addCondition():void {
		if(!this.action.conditionList) {
			const condition:TriggerConditionGroup = {
				id: Utils.getUUID(),
				type: "group" as const,
				conditions: [],
				operator: "AND",
			}
			this.action.conditionList = reactive(condition);
		}
	}

	public onPlaceholderListUpdate(list:ITriggerPlaceholder<unknown>[]):void {
		this.placeholderList = list;
	}

	public onSearch():void {
		const holder = this.$refs.actionList as HTMLDivElement;
		([...holder.children] as HTMLElement[]).forEach(el => {
			if(el.textContent?.toLowerCase().includes(this.search.toLowerCase())) {
				el.style.display = "flex";
			}else{
				el.style.display = "none";
			}
		});
	}

}
export default toNative(TriggerActionEntry);
</script>

<style lang="less">
.triggeractionentry.closed {
    width: fit-content;
}
</style>

<style scoped lang="less">
.triggerActionWrapper {
	display: flex;
	flex-direction: column;
	justify-content: stretch;
	align-items: stretch;
	.conditionLink {
		width: 2em;
		height: 2em;
		margin: auto;
		background-color: var(--background-color-fadest);
		.icon {
			transform: rotate(90deg);
			transform-origin: center;
			margin-top: .5em;
			margin-left: .25em;
			width: 1.5em;
		}
	}

	&.disabledAction {
		opacity: .75;
		filter: grayscale();
	}
}

.triggeractionentry{
	// transition: all .15s;
	margin: auto;
	&>:deep(.header) {
		padding: 0;
		.title {
			padding: .5em 0;
		}
		&>.icon {
			height: 1.5em !important;
			max-width: 2em;
			padding: .15em 0;
			width: unset !important;
			vertical-align: middle;
		}
	}

	.button {
		flex-wrap: nowrap;
		&.beta {
			overflow: hidden;
			&::before {
				content: "beta";
				position: absolute;
				right: 0;
				color:var(--color-light);
				background-color: var(--color-alert);
				background: linear-gradient(-90deg, var(--color-alert-fadest) 0%, var(--color-alert) 0%, var(--color-alert) 100%);
				height: 100%;
				display: flex;
				align-items: center;
				padding: .35em;
				font-size: .8em;
				font-family: var(--font-nunito);
				text-transform: uppercase;
				z-index: 1;
			}
		}
	}

	.actionList {
		display: flex;
		align-self: stretch;
		align-items: center;
		.action {
			border-radius: 0;
			padding: .5em;
			align-self: stretch;
			box-shadow: unset;
			&.orderBt {
				cursor: grab;
				&:active {
					cursor: grabbing;
				}
			}
		}
	}

	.typeSelector {
		.info {
			justify-self: center;
			font-weight: bold;
			margin-bottom: .5em;
		}

		.searchField {
			width: 100%;
			margin-bottom: .5em;
			text-align: center;
		}

		.list {
			gap: 3px;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			flex-grow: 1;
			.button {
				flex-grow: 1;
				flex-basis: 250px;
				:deep(.icon) {
					max-width: 1.25em;
				}
			}
		}
	}

	.raffleEnter{
		font-size: .9em;
		line-height: 1.3em;
	}
}
</style>
