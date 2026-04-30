<template>
	<div ref="rootEl" :class="classes">
		<div class="holder">
			<div class="leftForm">
				<ButtonNotification
					:aria-label="t('chat.form.paramsBt_aria')"
					v-tooltip="t('chat.form.paramsBt_aria')"
					draggable="false"
					icon="params"
					@click="toggleParams()"
					:newflag="{ date: $config.NEW_FLAGS_DATE_V16_12, id: 'chatform_params_8' }"
				/>

				<ButtonNotification
					:aria-label="t('chat.form.cmdsBt_aria')"
					v-tooltip="t('chat.form.cmdsBt_aria')"
					draggable="false"
					icon="commands"
					@click="emit('update:showCommands', true)"
					:newflag="{ date: $config.NEW_FLAGS_DATE_V16, id: 'chatform_cmds_3' }"
				/>

				<VueDraggable
					class="sortableItems"
					v-if="pinnedMenuItems.length > 0"
					v-model="storeParams.pinnedMenuItems"
					:group="{ name: 'items' }"
					:animation="250"
					@end="storeParams.saveChatMenuPins()"
				>
					<ButtonNotification
						class="pinnedItem"
						v-for="element in pinnedMenuItems"
						:key="element.item.id"
						@mouseenter="
							element.item.id == 'chatters'
								? updateOnlineUsersTooltip($event)
								: () => {}
						"
						v-tooltip="{
							touch: 'hold',
							content:
								element.item.id == 'chatters' &&
								storeParams.appearance.showViewersCount.value === true
									? onlineUsersTooltip
									: element.tooltip,
						}"
						:disabled="pinDisableState(element).disabled"
						:aria-label="element.tooltip"
						:icon="
							element.trigger?.icon?.startsWith('http')
								? element.trigger?.icon
								: element.icon
						"
						:iconEmoji="
							element.trigger?.icon && element.trigger?.icon.startsWith('http')
								? undefined
								: element.trigger?.icon
						"
						@click="onClickMenuItem(element)"
					/>
				</VueDraggable>

				<ButtonNotification
					:aria-label="t('chat.form.addPinBt_aria')"
					class="addPinBt"
					icon="add"
					v-tooltip="{ touch: 'hold', content: t('chat.form.addPinBt_aria') }"
					@click="emit('update:showPins', true)"
				/>
			</div>

			<form @submit.prevent="" class="inputForm" name="messageform">
				<Icon class="loader" name="loader" v-if="loading" />

				<div class="inputHolder" v-if="!error && !storeChat.spamingFakeMessages">
					<div class="replyTo" v-if="storeChat.replyTo">
						<button class="closeBt" type="button" @click="storeChat.replyTo = null">
							<Icon name="cross" />
						</button>
						<div class="content">
							<i18n-t
								scope="global"
								:keypath="
									storeChat.messageMode == 'message'
										? 'chat.form.reply_to'
										: 'chat.form.quoting'
								"
								tag="span"
								class="head"
							>
								<template #USER>
									<a
										class="userlink"
										@click.stop="
											openUserCard(
												storeChat.replyTo!.user,
												storeChat.replyTo!.channel_id,
											)
										"
										>{{ storeChat.replyTo!.user.displayName }}</a
									>
								</template>
							</i18n-t>
							<span class="message">{{ storeChat.replyTo!.message }}</span>
						</div>
					</div>

					<div class="announcement" v-if="announcement">
						<button class="closeBt" type="button" @click="closeAnnouncement()">
							<Icon name="cross" />
						</button>
						<div class="content">
							<span class="title">
								<Icon name="alert" />
								<ChatMessageChunksParser
									:chunks="announcementTitle"
									:channel="storeAuth.twitch.user.id"
									platform="twitch"
								/>
							</span>
							<span class="message">
								<ChatMessageChunksParser
									:chunks="announcementMessage"
									:channel="storeAuth.twitch.user.id"
									platform="twitch"
								/>
							</span>
						</div>
					</div>

					<div
						class="inputField"
						:class="{ modAction: storeChat.messageMode != 'message' }"
						:style="inputStyles"
					>
						<div class="actions">
							<ChannelSwitcher
								class="chanSwitcher"
								v-model="storeStream.currentChatChannel.id"
								v-model:name="storeStream.currentChatChannel.name"
								v-model:platform="storeStream.currentChatChannel.platform"
							/>

							<ModeratorActionSwitcher
								v-if="isModeratedChannel"
								v-model:mode="storeChat.messageMode"
							/>

							<GroqChannelAction v-if="storeGroq.connected && storeGroq.enabled" />
						</div>

						<button
							class="chatInputError"
							v-if="mustConnectYoutubeChan"
							@click="storeParams.openParamsPage('connexions', 'youtube')"
						>
							{{ t("chat.form.youtube_not_connected") }}
						</button>

						<button
							class="chatInputError"
							v-else-if="
								storeStream.currentChatChannel.platform == 'youtube' &&
								mustGrantYoutubeScope
							"
							@click="storeParams.openParamsPage('connexions', 'youtube')"
						>
							<Icon name="lock_fit" />{{ t("chat.form.youtube_missing_scope") }}
						</button>

						<button
							class="chatInputError"
							v-else-if="
								storeStream.currentChatChannel.platform == 'twitch' &&
								mustGrantTwitchScope
							"
							@click="grantTwitchScopes()"
						>
							<Icon name="lock_fit" />{{ t("chat.form.twitch_missing_scope") }}
						</button>

						<!-- using @input instead of v-model so it works properly on mobile -->
						<input
							v-else
							type="text"
							ref="input"
							:value="message"
							:placeholder="
								t('chat.form.input_placeholder', {
									CHANNEL: storeStream.currentChatChannel.name,
								})
							"
							:maxlength="maxLength"
							@input="
								($event) => (message = ($event.target as HTMLInputElement).value)
							"
							@keyup.capture.tab="(e) => onTab(e)"
							@keyup.enter="(e: KeyboardEvent) => sendMessage(e)"
							@keydown="onKeyDown"
						/>

						<ButtonNotification
							icon="send"
							v-if="message.length > 0"
							@click="sendMessage()"
						/>
					</div>
				</div>

				<TTButton
					class="spam"
					alert
					v-if="storeChat.spamingFakeMessages"
					icon="cross"
					@click="stopSpam()"
					>{{ t("chat.form.stop_spamBt") }}</TTButton
				>

				<span @click="error = false" v-if="error" class="error">{{
					t("error.message_send")
				}}</span>
			</form>

			<div class="rightForm">
				<ButtonNotification
					:aria-label="t('chat.form.emoteBt_aria')"
					icon="emote"
					@click="emit('update:showEmotes', true)"
				/>

				<transition name="blink">
					<ButtonNotification
						:aria-label="t('chat.form.shoutoutBt_aria')"
						icon="shoutout"
						:count="pendingShoutoutCount"
						v-tooltip="{
							touch: 'hold',
							content: t('chat.form.shoutoutBt_aria'),
							showOnCreate: true,
							onHidden: () => onHideTooltip('shoutout'),
						}"
						v-if="pendingShoutoutCount > 0"
						@click="emit('update:showShoutout', true)"
					/>
				</transition>

				<transition name="blink">
					<ButtonNotification
						:aria-label="t('chat.form.pollBt_aria')"
						icon="poll"
						v-tooltip="{
							touch: 'hold',
							content: t('chat.form.pollBt_aria'),
							showOnCreate: shouldShowTooltip('poll'),
							onHidden: () => onHideTooltip('poll'),
						}"
						@click="openNotifications('poll')"
						v-if="storePoll.data?.id && storePoll.data?.isFake != true"
					/>
				</transition>

				<transition name="blink">
					<ButtonNotification
						:aria-label="t('chat.form.chatPollBt_aria')"
						icon="chatPoll"
						v-tooltip="{
							touch: 'hold',
							content: t('chat.form.chatPollBt_aria'),
							showOnCreate: shouldShowTooltip('chatPoll'),
							onHidden: () => onHideTooltip('chatPoll'),
						}"
						@click="openNotifications('chatPoll')"
						v-if="storeChatPoll.data"
					/>
				</transition>

				<transition name="blink">
					<ButtonNotification
						:aria-label="t('chat.form.predictionBt_aria')"
						icon="prediction"
						v-tooltip="{
							touch: 'hold',
							content: t('chat.form.predictionBt_aria'),
							showOnCreate: shouldShowTooltip('prediction'),
							onHidden: () => onHideTooltip('prediction'),
						}"
						@click="openNotifications('prediction')"
						v-if="storePrediction.data?.id && storePrediction.data?.isFake != true"
					/>
				</transition>

				<transition name="blink">
					<ButtonNotification
						:aria-label="t('chat.form.trainBt_aria')"
						icon="train"
						v-tooltip="{
							touch: 'hold',
							content: t('chat.form.trainBt_aria'),
							showOnCreate: shouldShowTooltip('train'),
							onHidden: () => onHideTooltip('train'),
						}"
						@click="openNotifications('train')"
						v-if="storeStream.hypeTrain"
					/>
				</transition>

				<transition name="blink">
					<ButtonNotification
						:aria-label="t('chat.form.trackedBt_aria')"
						icon="magnet"
						v-if="trackedUserCount > 0"
						v-tooltip="{
							touch: 'hold',
							content: t('chat.form.trackedBt_aria'),
							showOnCreate: shouldShowTooltip('tracked'),
							onHidden: () => onHideTooltip('tracked'),
						}"
						@click="openModal('tracked')"
					/>
				</transition>

				<transition name="blink">
					<ButtonNotification
						:aria-label="t('chat.form.raffleBt_aria')"
						v-if="storeRaffle.raffleList && raffleListActive.length > 0"
						icon="ticket"
						:count="raffleEntryCount"
						v-tooltip="{
							touch: 'hold',
							content: t('chat.form.raffleBt_aria'),
							showOnCreate: shouldShowTooltip('raffle'),
							onHidden: () => onHideTooltip('raffle'),
						}"
						@click="openNotifications('raffle')"
						><template v-if="raffleListActive.length > 1"
							>x{{ raffleListActive.length }}</template
						></ButtonNotification
					>
				</transition>

				<transition name="blink">
					<ButtonNotification
						:aria-label="t('chat.form.bingoBt_aria')"
						icon="bingo"
						v-if="storeBingo.data"
						v-tooltip="{
							touch: 'hold',
							content: t('chat.form.bingoBt_aria'),
							showOnCreate: shouldShowTooltip('bingo'),
							onHidden: () => onHideTooltip('bingo'),
						}"
						@click="openNotifications('bingo')"
					/>
				</transition>

				<transition name="blink">
					<ButtonNotification
						:aria-label="t('chat.form.suggBt_aria')"
						icon="chatSugg"
						:count="storeChatSuggestion.data?.choices.length"
						v-tooltip="{
							touch: 'hold',
							content: t('chat.form.suggBt_aria'),
							showOnCreate: shouldShowTooltip('chatsuggState'),
							onHidden: () => onHideTooltip('chatsuggState'),
						}"
						@click="openModal('chatsuggState')"
						v-if="storeChatSuggestion.data != null"
					/>
				</transition>

				<transition name="blink">
					<ButtonNotification
						:aria-label="t('chat.form.whispersBt_aria')"
						icon="whispers"
						:count="storeChat.whispersUnreadCount"
						v-if="whispersAvailable"
						v-tooltip="{ touch: 'hold', content: t('chat.form.whispersBt_aria') }"
						@click="openModal('whispers')"
					/>
				</transition>

				<transition name="blink">
					<ButtonNotification
						:aria-label="t('chat.form.raidBt_aria')"
						icon="raid"
						v-if="storeStream.currentRaid != null"
						v-tooltip="{ touch: 'hold', content: t('chat.form.raidBt_aria') }"
						@click="openNotifications('raid')"
					>
						<span class="time">{{ remainingRaidTime }}</span>
					</ButtonNotification>
				</transition>

				<transition name="blink">
					<ButtonNotification
						:aria-label="t('chat.form.pinsBt_aria')"
						icon="save"
						v-if="storeChat.pinedMessages.length > 0"
						:count="storeChat.pinedMessages.length"
						v-tooltip="{
							touch: 'hold',
							content: t('chat.form.saveBt_aria'),
							showOnCreate: shouldShowTooltip('save'),
							onHidden: () => onHideTooltip('save'),
						}"
						@click="openModal('pins')"
					/>
				</transition>

				<transition name="blink">
					<ButtonNotification
						aria-label="Toggle messages encryption"
						:icon="storeMain.cypherEnabled ? 'lock' : 'unlock'"
						@click="toggleCypher()"
						v-if="cypherConfigured"
						v-tooltip="'Send encrypted<br>messages'"
					/>
				</transition>

				<transition name="blink">
					<ButtonNotification
						:aria-label="t('chat.form.highlightBt_aria')"
						v-if="chatHighlightEnabled"
						class="chatHighlight"
						icon="highlight"
						v-tooltip="{
							touch: 'hold',
							content: t('chat.form.highlightBt_aria'),
							showOnCreate: shouldShowTooltip('highlight'),
							onHidden: () => onHideTooltip('highlight'),
						}"
						@click="removeChatHighlight()"
					/>
				</transition>

				<CommunityBoostInfo v-if="storeStream.communityBoostState" />

				<TimerCountDownInfo v-if="isActiveTimer" />

				<CommercialTimer />

				<tooltip
					v-if="
						storeParams.appearance.showViewersCount.value === true &&
						(twitchViewerCount > 0 || tiktokViewerCount > 0 || youtubeViewerCount > 0)
					"
					class="viewCount"
					@click="censoredViewCount = !censoredViewCount"
				>
					<template #default="{ state }">
						<Icon class="icon" name="show" />
						<p v-if="censoredViewCount" class="censor">xx</p>
						<p v-if="!censoredViewCount">
							{{ twitchViewerCount + tiktokViewerCount + youtubeViewerCount }}
						</p>
					</template>
					<template #content="{ hide }">
						<div class="viewersCountList_tooltip">
							<div v-if="twitchViewerCount > 0" class="platform">
								<Icon name="twitch" />
								<p v-if="censoredViewCount" class="censor">xx</p>
								<p v-if="!censoredViewCount">{{ twitchViewerCount }}</p>
							</div>

							<div v-if="tiktokViewerCount > 0" class="platform">
								<Icon name="tiktok" />
								<p v-if="censoredViewCount" class="censor">xx</p>
								<p v-if="!censoredViewCount">{{ tiktokViewerCount }}</p>
							</div>

							<div v-if="youtubeViewerCount > 0" class="platform">
								<Icon name="youtube" />
								<p v-if="censoredViewCount" class="censor">xx</p>
								<p v-if="!censoredViewCount">{{ youtubeViewerCount }}</p>
							</div>
						</div>
					</template>
				</tooltip>

				<transition name="blink">
					<ButtonNotification
						class="qna"
						icon="qna"
						v-if="qnaSessionActive"
						v-newflag="{ date: $config.NEW_FLAGS_DATE_V11, id: 'chatform_qna' }"
						:aria-label="t('chat.form.qnaBt_aria')"
						v-tooltip="{ touch: 'hold', content: t('chat.form.qnaBt_aria') }"
						@click="openModal('qna')"
					/>
				</transition>

				<transition name="blink">
					<ButtonNotification
						class="credits"
						icon="credits"
						v-if="creditsOverlayRunning"
						v-newflag="{ date: $config.NEW_FLAGS_DATE_V11, id: 'chatform_credits' }"
						:aria-label="t('chat.form.creditsBt_aria')"
						v-tooltip="{ touch: 'hold', content: t('chat.form.creditsBt_aria') }"
						@click="emit('update:showCredits', true)"
						@click.ctrl="creditsOverlayRunning = false"
					/>
				</transition>

				<transition name="blink">
					<ButtonNotification
						class="bingoGrid"
						icon="bingo_grid"
						v-if="storeBingoGrid.gridList.filter((v) => v.enabled).length > 0"
						:aria-label="t('chat.form.bingoGridBt_aria')"
						v-tooltip="{ touch: 'hold', content: t('chat.form.bingoGridBt_aria') }"
						@click="emit('update:showBingoGrid', true)"
					/>
				</transition>

				<transition name="blink">
					<ButtonNotification
						class="quiz"
						icon="quiz"
						v-if="
							storeQuiz.quizList.filter((v) => v.enabled && v.questionList.length > 0)
								.length > 0
						"
						:aria-label="t('chat.form.quizBt_aria')"
						v-tooltip="{ touch: 'hold', content: t('chat.form.quizBt_aria') }"
						@click="openNotifications('quiz')"
					/>
				</transition>

				<transition name="blink">
					<ButtonNotification
						class="groq"
						icon="groq"
						v-if="
							storeGroq.enabled &&
							storeGroq.connected &&
							storeGroq.answerHistory.length > 0
						"
						:aria-label="t('chat.form.groqBt_aria')"
						v-tooltip="{ touch: 'hold', content: t('chat.form.groqBt_aria') }"
						@click="openModal('groqHistory')"
					/>
				</transition>

				<transition name="blink">
					<ButtonNotification
						class="voice"
						:icon="voiceBotStarted ? 'microphone_recording' : 'microphone_mute'"
						v-if="storeVoice.voiceBotConfigured"
						:aria-label="
							voiceBotStarted
								? t('chat.form.voicebot_stopBt_aria')
								: t('chat.form.voicebot_startBt_aria')
						"
						v-tooltip="{
							touch: 'hold',
							content: voiceBotStarted
								? t('chat.form.voicebot_stopBt_aria')
								: t('chat.form.voicebot_startBt_aria'),
						}"
						@click="toggleVoiceBot()"
					/>
				</transition>

				<transition name="blink">
					<Icon
						class="error"
						name="spotify"
						v-if="storeMusic.spotifyConsecutiveErrors > 5"
						v-tooltip="{
							touch: 'hold',
							content: t('chat.form.spotify_down'),
							showOnCreate: true,
							hideOnClick: 'toggle',
						}"
					/>
				</transition>

				<transition name="blink">
					<Icon
						class="error"
						name="spotify"
						v-if="spotifyRateLimited"
						v-tooltip="{
							touch: 'hold',
							content: t('chat.form.spotify_rate_limited', {
								DURATION: spotifyRateLimitedDurationFormated,
							}),
							showOnCreate: true,
							hideOnClick: 'toggle',
						}"
					/>
				</transition>

				<transition name="blink">
					<ButtonNotification
						:aria-label="t('chat.form.devmodeBt_aria')"
						icon="debug"
						@click="emit('update:showDevMenu', true)"
						v-if="storeMain.devmode"
					/>
				</transition>

				<ButtonNotification
					v-if="showObsBtn"
					icon="obs"
					class="error"
					v-tooltip="{
						touch: 'hold',
						content: t('chat.form.obs_disconnected_tt'),
						showOnCreate: true,
					}"
					@click="openOBSParams()"
				></ButtonNotification>

				<ButtonNotification
					v-if="showGazaBtn"
					v-newflag="{ date: 1759253466000, id: 'gaza' }"
					v-tooltip="{
						touch: 'hold',
						content: t('gaza.tooltip'),
						showOnCreate: shouldShowTooltip('gaza'),
						onHidden: () => onHideTooltip('gaza'),
					}"
					@click="emit('update:showGazaFunds', true)"
					>🍉</ButtonNotification
				>

				<transition name="blink">
					<TTButton
						class="emergency"
						v-if="emergencyButtonEnabled"
						icon="emergency"
						alert
						:light="storeEmergency.emergencyStarted"
						:aria-label="
							storeEmergency.emergencyStarted
								? t('chat.form.emergency_stopBt_aria')
								: t('chat.form.emergency_startBt_aria')
						"
						v-tooltip="{
							touch: 'hold',
							content: storeEmergency.emergencyStarted
								? t('chat.form.emergency_stopBt_aria')
								: t('chat.form.emergency_startBt_aria'),
						}"
						@click="toggleEmergencyMode()"
					/>
				</transition>
			</div>
		</div>

		<div class="floatingButtons">
			<transition name="slide">
				<TTButton
					class="muteBt"
					:aria-label="t('chat.form.muteTTSBt_aria')"
					icon="mute"
					secondary
					v-if="storeTTS.speaking"
					v-tooltip="{
						touch: 'hold',
						content: t('chat.form.muteTTSBt_aria'),
						placement: 'left',
					}"
					@click="stopTTS(false)"
				/>
			</transition>

			<transition name="slide">
				<TTButton
					class="muteBt"
					:aria-label="t('chat.form.clearTTSBt_aria')"
					icon="muteAll"
					secondary
					v-if="storeTTS.speaking"
					v-tooltip="{
						touch: 'hold',
						content: t('chat.form.clearTTSBt_aria'),
						placement: 'left',
					}"
					@click="stopTTS(true)"
				/>
			</transition>

			<transition name="slide">
				<TTButton
					class="voicemodBt"
					:aria-label="t('chat.form.resetVoiceBt_aria')"
					secondary
					v-if="
						storeVoice.voicemodParams.voiceIndicator && storeVoice.voicemodCurrentVoice
					"
					v-tooltip="{
						touch: 'hold',
						content: t('chat.form.resetVoiceBt_aria'),
						placement: 'left',
					}"
					@click="resetVoiceEffect()"
				>
					<template #icon>
						<img
							:src="'data:image/png;base64,' + storeVoice.voicemodCurrentVoice.image"
							alt=""
						/>
					</template>
				</TTButton>
			</transition>
		</div>

		<transition name="slide">
			<MessageExportIndicator
				class="contentWindows exportIndicator"
				v-if="storeMain.messageExportState"
			/>
		</transition>

		<AutocompleteChatForm
			class="contentWindows"
			v-if="openAutoComplete"
			:search="autoCompleteSearch"
			:emotes="autoCompleteEmotes"
			:users="autoCompleteUsers"
			:commands="autoCompleteCommands"
			@close="autoCompleteSearch = ''"
			@selectItem="onSelectItem"
		/>
	</div>
</template>

<script setup lang="ts">
import EventBus from "@/events/EventBus";
import GlobalEvent from "@/events/GlobalEvent";
import MessengerProxy from "@/messaging/MessengerProxy";
import DataStore from "@/store/DataStore";
import Database from "@/store/Database";
import StoreProxy from "@/store/StoreProxy";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import ApiHelper from "@/utils/ApiHelper";
import TwitchCypherPlugin from "@/utils/ChatCypherPlugin";
import Config from "@/utils/Config";
import Logger from "@/utils/Logger";
import PublicAPI from "@/utils/PublicAPI";
import TTSUtils from "@/utils/TTSUtils";
import Utils from "@/utils/Utils";
import HeatSocket from "@/utils/twitch/HeatSocket";
import { TwitchScopes, type TwitchScopesString } from "@/utils/twitch/TwitchScopes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import BTTVUtils from "@/utils/emotes/BTTVUtils";
import FFZUtils from "@/utils/emotes/FFZUtils";
import SevenTVUtils from "@/utils/emotes/SevenTVUtils";
import VoiceController from "@/utils/voice/VoiceController";
import VoicemodWebSocket from "@/utils/voice/VoicemodWebSocket";
import {
	ref,
	computed,
	watch,
	onBeforeMount,
	onMounted,
	onBeforeUnmount,
	nextTick,
	useTemplateRef,
} from "vue";
import { gsap } from "gsap/gsap-core";
import ButtonNotification from "../ButtonNotification.vue";
import TTButton from "../TTButton.vue";
import ChatMessageChunksParser from "../messages/components/ChatMessageChunksParser.vue";
import AutocompleteChatForm from "./AutocompleteChatForm.vue";
import CommercialTimer from "./CommercialTimer.vue";
import CommunityBoostInfo from "./CommunityBoostInfo.vue";
import MessageExportIndicator from "./MessageExportIndicator.vue";
import TimerCountDownInfo from "./TimerCountDownInfo.vue";
import ChannelSwitcher from "./ChannelSwitcher.vue";
import OBSWebsocket from "@/utils/OBSWebsocket";
import YoutubeHelper from "@/utils/youtube/YoutubeHelper";
import { YoutubeScopes } from "@/utils/youtube/YoutubeScopes";
import ModeratorActionSwitcher from "./ModeratorActionSwitcher.vue";
import { VueDraggable } from "vue-draggable-plus";
import GroqChannelAction from "./GroqChannelAction.vue";
import TriggerUtils from "@/utils/TriggerUtils";
import TriggerActionHandler from "@/utils/triggers/TriggerActionHandler";
import type {
	TriggerActionData,
	TriggerData,
	TriggerImportData,
} from "@/types/TriggerActionDataTypes";
import SpotifyHelper from "@/utils/music/SpotifyHelper";
import { useI18n } from "vue-i18n";
import { useConfirm } from "@/composables/useConfirm";
import { asset } from "@/composables/useAsset";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { storeChat as useStoreChat } from "@/store/chat/storeChat";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeStream as useStoreStream } from "@/store/stream/storeStream";
import { storeEmergency as useStoreEmergency } from "@/store/emergency/storeEmergency";
import { storePoll as useStorePoll } from "@/store/poll/storePoll";
import { storePrediction as useStorePrediction } from "@/store/prediction/storePrediction";
import { storeRaffle as useStoreRaffle } from "@/store/raffle/storeRaffle";
import { storeQna as useStoreQna } from "@/store/qna/storeQna";
import { storeUsers as useStoreUsers } from "@/store/users/storeUsers";
import { storeMain as useStoreMain } from "@/store/storeMain";
import { storeTriggers as useStoreTriggers } from "@/store/triggers/storeTriggers";
import { storeOBS as useStoreOBS } from "@/store/obs/storeOBS";
import { storeTimer as useStoreTimer } from "@/store/timer/storeTimer";
import { storePatreon as useStorePatreon } from "@/store/patreon/storePatreon";
import { storeCommon as useStoreCommon } from "@/store/common/storeCommon";
import { storeChatPoll as useStoreChatPoll } from "@/store/chat_poll/storeChatPoll";
import { storeChatSuggestion as useStoreChatSuggestion } from "@/store/chat_sugg/storeChatSuggestion";
import { storeGroq as useStoreGroq } from "@/store/groq/storeGroq";
import { storeBingoGrid as useStoreBingoGrid } from "@/store/bingo_grid/storeBingoGrid";
import { storeQuiz as useStoreQuiz } from "@/store/quiz/storeQuiz";
import { storeVoice as useStoreVoice } from "@/store/voice/storeVoice";
import { storeTTS as useStoreTTS } from "@/store/tts/storeTTS";
import { storeMusic as useStoreMusic } from "@/store/music/storeMusic";
import { storeBingo as useStoreBingo } from "@/store/bingo/storeBingo";

const emit = defineEmits<{
	"update:showEmotes": [value: boolean];
	"update:showCommands": [value: boolean];
	"update:showRewards": [value: boolean];
	"update:showDevMenu": [value: boolean];
	"update:showShoutout": [value: boolean];
	"update:showCredits": [value: boolean];
	"update:showBingoGrid": [value: boolean];
	"update:showQuiz": [value: boolean];
	"update:showGroqHistory": [value: boolean];
	"update:showGazaFunds": [value: boolean];
	"update:showChatUsers": [value: boolean];
	"update:showPins": [value: boolean];
	"update:showSettingsImport": [data: TriggerImportData];
	setCurrentNotification: [type: TwitchatDataTypes.NotificationTypes];
}>();

const { t, locale } = useI18n();
const { confirm } = useConfirm();
const { getAsset } = asset();

const storeParams = useStoreParams();
const storeChat = useStoreChat();
const storeAuth = useStoreAuth();
const storeStream = useStoreStream();
const storeEmergency = useStoreEmergency();
const storePoll = useStorePoll();
const storePrediction = useStorePrediction();
const storeRaffle = useStoreRaffle();
const storeQna = useStoreQna();
const storeUsers = useStoreUsers();
const storeMain = useStoreMain();
const storeTriggers = useStoreTriggers();
const storeOBS = useStoreOBS();
const storeTimer = useStoreTimer();
const storePatreon = useStorePatreon();
const storeCommon = useStoreCommon();
const storeChatPoll = useStoreChatPoll();
const storeChatSuggestion = useStoreChatSuggestion();
const storeGroq = useStoreGroq();
const storeBingoGrid = useStoreBingoGrid();
const storeQuiz = useStoreQuiz();
const storeVoice = useStoreVoice();
const storeMusic = useStoreMusic();
const storeTTS = useStoreTTS();
const storeBingo = useStoreBingo();

const rootEl = useTemplateRef<HTMLDivElement>("rootEl");
const inputRef = useTemplateRef<HTMLInputElement>("input");

const message = ref("");
const error = ref(false);
const loading = ref(false);
const showGazaBtn = ref(false);
const censoredViewCount = ref(false);
const autoCompleteSearch = ref("");
const autoCompleteEmotes = ref(false);
const autoCompleteUsers = ref(false);
const autoCompleteCommands = ref(false);
const creditsOverlayRunning = ref(false);
const trackedUserCount = ref(0);
const sendHistoryIndex = ref(0);
const sendHistory = ref<string[]>([]);
const remainingRaidTime = ref("");
const onlineUsersTooltip = ref("");
const announcement = ref<TwitchatDataTypes.TwitchatAnnouncementData | null>(null);

let announcementInterval: number = -1;
let raidIntervalUpdate: number = -1;
let creditsOverlayPresenceHandlerTimeout: number = -1;
let updateTrackedUserListHandler!: (e: GlobalEvent) => void;
let creditsOverlayPresenceHandler!: () => void;

const maxLength = computed((): number => {
	if (message.value.indexOf("/raw") === 0) {
		return 500000;
	} else {
		return 500;
	}
});

function getMenuItemEnabled(item: (typeof TwitchatDataTypes.PinnableMenuItems)[number]) {
	if (item.id == "rewards" || item.id == "poll" || item.id == "prediction") {
		return hasChannelPoints.value;
	}
	return true;
}

const emergencyButtonEnabled = computed((): boolean => {
	return storeEmergency.params.enabled === true;
});

const twitchViewerCount = computed((): number => {
	const infos = storeStream.currentStreamInfo[storeAuth.twitch.user.id];
	if (infos) return infos.viewers;
	return 0;
});

const tiktokViewerCount = computed((): number => {
	const infos = storeStream.currentStreamInfo["tiktok"];
	if (infos) return infos.viewers;
	return 0;
});

const youtubeViewerCount = computed((): number => {
	const infos = storeStream.currentStreamInfo["youtube"];
	if (infos) return infos.viewers;
	return 0;
});

const hasChannelPoints = computed((): boolean => {
	return storeAuth.twitch.user.is_affiliate || storeAuth.twitch.user.is_partner;
});

const announcementTitle = computed((): TwitchatDataTypes.ParseMessageChunk[] => {
	const title = announcement.value!.title[locale.value] || announcement.value!.title["en"]!;
	return TwitchUtils.parseMessageToChunks(title, undefined, true);
});

const announcementMessage = computed((): TwitchatDataTypes.ParseMessageChunk[] => {
	const text = announcement.value!.text[locale.value] || announcement.value!.text["en"]!;
	return TwitchUtils.parseMessageToChunks(text, undefined, true);
});

const showObsBtn = computed((): boolean => {
	return storeOBS.connectionEnabled === true && !OBSWebsocket.instance.connected.value;
});

const qnaSessionActive = computed((): boolean => {
	return storeQna.activeSessions.length > 0;
});

const raffleListActive = computed((): TwitchatDataTypes.RaffleData[] => {
	return storeRaffle.raffleList.filter(
		(v) => v.mode != "manual" && v.mode != "values" && v.mode != "sub" && v.ghost !== true,
	);
});

const isActiveTimer = computed((): boolean => {
	const defaults = storeTimer.timerList;
	for (const entry of defaults) {
		if (entry.startAt_ms) return true;
	}

	return false;
});

const voiceBotStarted = computed((): boolean => {
	return VoiceController.instance.started.value;
});

const chatHighlightEnabled = computed((): boolean => {
	return storeChat.highlightedMessageId != null;
});

const openAutoComplete = computed((): boolean => {
	return (
		autoCompleteSearch.value.length >= 1 ||
		(autoCompleteCommands.value && autoCompleteSearch.value.length > 0)
	);
});

const whispersAvailable = computed((): boolean => {
	const whispers = storeChat.whispers;
	for (const key in whispers) {
		if (whispers[key]!.messages.length > 0) return true;
	}
	return false;
});

const classes = computed((): string[] => {
	let res = ["chatform"];
	if (loading.value) res.push("loading");
	if (storeMain.cypherEnabled) res.push("cypherMode");
	if (storeMain.offlineMode) res.push("offlineMode");
	if (storeEmergency.emergencyStarted) res.push("emergencyMode");
	return res;
});

const inputStyles = computed((): { [key: string]: string } => {
	const currentChaninfo = storeStream.connectedTwitchChans.find(
		(v) => v.user.id == storeStream.currentChatChannel.id,
	);
	if (!currentChaninfo) return {};
	return { backgroundColor: currentChaninfo.color + "30" }; //30 is alpha channel of the color
});

const cypherConfigured = computed((): boolean => {
	return storeMain.cypherKey?.length > 0;
});

const pendingShoutoutCount = computed((): number => {
	const list = storeUsers.pendingShoutouts[storeStream.currentChatChannel.id];
	if (!list) return 0;

	return list.length;
});

const mustConnectYoutubeChan = computed((): boolean => {
	return (
		storeStream.currentChatChannel.platform == "youtube" &&
		YoutubeHelper.instance.currentLiveChatIds.value.length === 0
	);
});

const mustGrantYoutubeScope = computed((): boolean => {
	return !YoutubeHelper.instance.hasScopes([YoutubeScopes.CHAT_MODERATE]);
});

const mustGrantTwitchScope = computed((): boolean => {
	return !TwitchUtils.hasScopes(Config.instance.MANDATORY_TWITCH_SCOPES);
});

const raffleEntryCount = computed((): number => {
	let total = 0;
	raffleListActive.value.forEach((v) => (total += v.entries.length));
	return total;
});

const isModeratedChannel = computed((): boolean => {
	const chanId = storeStream.currentChatChannel.id;
	if (chanId == storeAuth.twitch.user.id) return true;
	return (
		chanId != storeAuth.twitch.user.id &&
		storeAuth.twitchModeratedChannels.findIndex((v) => v.broadcaster_id == chanId) > -1
	);
});

const pinnedMenuItems = computed(() => {
	const items = storeParams.pinnedMenuItems.filter((id) => {
		switch (id) {
			case "bingo_grid": {
				return storeAuth.featureFlags.includes("bingo_grid");
			}
			case "quiz": {
				return storeAuth.featureFlags.includes("quiz");
			}
			default: {
				return true;
			}
		}
	});
	const result: {
		item: (typeof TwitchatDataTypes.PinnableMenuItems)[number];
		icon: string;
		tooltip: string;
		trigger?: TriggerData | null;
	}[] = [];
	for (const item of items) {
		const menuItem = getPinnedMenuItemFromId(item);
		if (!menuItem) continue;
		if (!getMenuItemEnabled(menuItem)) continue;
		const resultItem: (typeof result)[0] = { item: menuItem, tooltip: "", icon: menuItem.icon };
		if (menuItem.id.indexOf("trigger:") === 0) {
			const triggerId = menuItem.id.replace("trigger:", "");
			const trigger = storeTriggers.triggerList.find((trigger) => trigger.id == triggerId);
			if (trigger) {
				resultItem.trigger = trigger;
			}
		}
		const tooltip = pinDisableState(resultItem).disabled
			? t("global.grant_scope")
			: menuItem.label || t(menuItem.labelKey);
		resultItem.tooltip = tooltip;
		result.push(resultItem);
	}
	return result;
});

const spotifyRateLimited = computed((): boolean => {
	return SpotifyHelper.instance.rateLimitedUntil.value > Date.now();
});

const spotifyRateLimitedDurationFormated = computed((): string => {
	return Utils.formatDuration(SpotifyHelper.instance.rateLimitedUntil.value - Date.now());
});

function pinDisableState(item: (typeof pinnedMenuItems.value)[number]): {
	disabled: boolean;
	scopes: TwitchScopesString[];
} {
	let disabled = false;
	let scopes: TwitchScopesString[] = [];
	switch (item.item.id) {
		case "prediction": {
			scopes = [TwitchScopes.MANAGE_PREDICTIONS];
			disabled = !!storePrediction.data;
			break;
		}
		case "poll": {
			scopes = [TwitchScopes.MANAGE_POLLS];
			disabled = !!storePoll.data;
			break;
		}
		case "streamInfo": {
			scopes = [TwitchScopes.SET_STREAM_INFOS];
			break;
		}
	}
	return { disabled: disabled || !TwitchUtils.hasScopes(scopes), scopes };
}

onBeforeMount(() => {
	const history = DataStore.get(DataStore.SENT_MESSAGE_HISTORY);
	if (history) {
		sendHistory.value = JSON.parse(history) as string[];
		sendHistoryIndex.value = sendHistory.value.length;
	}
	updateTrackedUserListHandler = (_e: GlobalEvent) => onUpdateTrackedUserList();
	creditsOverlayPresenceHandler = () => onCreditsOverlayPresence();
	EventBus.instance.addEventListener(GlobalEvent.TRACK_USER, updateTrackedUserListHandler);
	EventBus.instance.addEventListener(GlobalEvent.UNTRACK_USER, updateTrackedUserListHandler);
	PublicAPI.instance.addEventListener(
		"SET_ENDING_CREDITS_PRESENCE",
		creditsOverlayPresenceHandler,
	);
	onUpdateTrackedUserList();
	//Leave some time to open transition to complete before showing announcements
	window.setTimeout(() => {
		loadAnnouncements();
		showGazaBtn.value = true;
	}, 2000);
	//Check for new announcements every 30min
	announcementInterval = window.setInterval(
		() => {
			loadAnnouncements(true);
		},
		10 * 60 * 1000,
	);
});

onMounted(async () => {
	censoredViewCount.value = DataStore.get(DataStore.CENSOR_VIEWER_COUNT) !== "false";
	gsap.from(rootEl.value!, { y: 50, delay: 0.2, duration: 1, ease: "sine.out" });
	const btns = rootEl.value!.querySelectorAll(".leftForm>*,.inputForm>*");
	gsap.from(btns, { y: 50, duration: 0.7, delay: 0.5, ease: "back.out(2)", stagger: 0.075 });
});

onBeforeUnmount(() => {
	window.clearInterval(raidIntervalUpdate);
	window.clearTimeout(announcementInterval);
	EventBus.instance.removeEventListener(GlobalEvent.TRACK_USER, updateTrackedUserListHandler);
	EventBus.instance.removeEventListener(GlobalEvent.UNTRACK_USER, updateTrackedUserListHandler);
	PublicAPI.instance.removeEventListener(
		"SET_ENDING_CREDITS_PRESENCE",
		creditsOverlayPresenceHandler,
	);
});

function openNotifications(type: TwitchatDataTypes.NotificationTypes): void {
	emit("setCurrentNotification", type);
}

function openModal(modal: TwitchatDataTypes.ModalTypes): void {
	storeParams.openModal(modal);
}

function openOBSParams(): void {
	storeParams.openParamsPage(
		TwitchatDataTypes.ParameterPages.CONNECTIONS,
		TwitchatDataTypes.ParamDeepSections.OBS,
	);
}

function grantTwitchScopes(): void {
	TwitchUtils.requestScopes(Config.instance.MANDATORY_TWITCH_SCOPES);
}

async function closeAnnouncement(): Promise<void> {
	let hist: { [key: string]: boolean } = JSON.parse(
		DataStore.get(DataStore.ANNOUNCEMENTS_READ) || "{}",
	);
	hist[announcement.value!.id] = true;
	DataStore.set(DataStore.ANNOUNCEMENTS_READ, hist);
	announcement.value = null;
}

/**
 * Loads potential twitchat announcements from server
 */
async function loadAnnouncements(onlyImportant: boolean = false): Promise<void> {
	//Wait for emotes to be loaded
	if (!TwitchUtils.emotesLoaded) {
		window.setTimeout(() => {
			loadAnnouncements(onlyImportant);
		}, 2000);
		return;
	}

	const options = {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
			Authorization: "Bearer " + storeAuth.twitch.access_token,
			"App-Version": import.meta.env.PACKAGE_VERSION,
		},
	};
	let hist: { [key: string]: boolean } = JSON.parse(
		DataStore.get(DataStore.ANNOUNCEMENTS_READ) || "{}",
	);
	try {
		const res = await fetch(Config.instance.API_PATH + "/announcements", options);
		if (res.status == 200) {
			const json: TwitchatDataTypes.TwitchatAnnouncementData[] = (await res.json()) || [];
			for (const a of json) {
				//Check if announcement already read
				if (hist[a.id] === true) continue;
				//Check if version is valid
				if (a.versionMax) {
					const currentVersion = import.meta.env.PACKAGE_VERSION;
					if (Utils.compareSementicVersion(currentVersion, a.versionMax)) continue;
				}
				//Check donor only condition
				if (a.donorsOnly === true && storeAuth.donorLevel == -1) continue;
				//Check premium only condition
				if (a.premiumOnly === true && !storeAuth.isPremium) continue;
				//Check patreon only condition
				if (a.patreonOnly === true && !storePatreon.isMember) continue;
				//Check patreon only condition
				if (a.heatOnly === true && !HeatSocket.instance.connected.value) continue;
				//Check if within date frame
				if (Date.now() < new Date(a.dateStart).getTime()) continue;
				if (a.dateEnd && Date.now() > new Date(a.dateEnd).getTime()) continue;
				//Allow only important alerts if requested
				if (onlyImportant && a.important !== true) continue;
				announcement.value = a;
			}
			let historyUpdated = false;
			//Remove ids from old deleted messages to avoid keeping useless data on localstorage
			Object.keys(hist).forEach((id) => {
				if (json.findIndex((v) => v.id == id) == -1) {
					delete hist[id];
					historyUpdated = true;
				}
			});
			if (historyUpdated) {
				DataStore.set(DataStore.ANNOUNCEMENTS_READ, hist);
			}
		}
	} catch (err) {
		/*ignore*/
	}
}

/**
 * Gets if a button tooltip should be displayed by default
 */
function shouldShowTooltip(
	key: TwitchatDataTypes.NotificationTypes | TwitchatDataTypes.ModalTypes | "gaza",
): boolean {
	const json = DataStore.get(DataStore.TOOLTIP_AUTO_OPEN);
	let values!: { [key: string]: number };
	if (!json) values = {};
	else values = JSON.parse(json);
	return values[key] == undefined || values[key] < 2;
}

/**
 * Called when a tooltip is closed
 */
function onHideTooltip(
	key: TwitchatDataTypes.NotificationTypes | TwitchatDataTypes.ModalTypes | "gaza",
): void {
	const json = DataStore.get(DataStore.TOOLTIP_AUTO_OPEN);
	let values!: { [key: string]: number };
	if (!json) values = {};
	else values = JSON.parse(json);
	if (values[key] === undefined) {
		values[key] = -1;
	}
	if (values[key] < 2) {
		values[key]++;
		DataStore.set(DataStore.TOOLTIP_AUTO_OPEN, values);
	}
}

/**
 * Toggle parameters display
 */
function toggleParams(): void {
	if (storeParams.currentPage == TwitchatDataTypes.ParameterPages.CLOSE) {
		storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.MAIN_MENU);
	} else {
		storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.CLOSE);
	}
}

/**
 * Updates the tooltip displayed on user icon hover.
 * This could be replaced by a computed to avoid having to update
 * this manually at hover.
 * BUT, the "users" value of the "users" store is a getter refering
 * to a non-reactive array for performance reason. Because of this
 * if the method was a computed, its value wouldn't automatically be
 * updated when user list changes.
 */
function updateOnlineUsersTooltip(e: MouseEvent): void {
	if (storeParams.appearance.showViewersCount.value !== true) return;

	let followCount = 0;
	let onlineCount = 0;
	const chanId = storeStream.currentChatChannel.id;
	const users = storeUsers.users;
	for (const u of users) {
		if (!u.channelInfo[chanId]) continue;
		if (u.channelInfo[chanId].online === true) {
			onlineCount++;
			if (u.channelInfo[chanId].is_following === true) followCount++;
		}
	}

	let res = `<img src="${getAsset("icons/user.svg").replace(/"/g, "\\'")}" height='15px' style='vertical-align:middle'> ${onlineCount}`;

	if (storeParams.appearance.highlightNonFollowers.value === true) {
		res += ` / <img src="${getAsset("icons/follow.svg").replace(/"/g, "\\'")}" height='15px' style='vertical-align:middle'> ${followCount}`;
		res += ` / <img src="${getAsset("icons/unfollow.svg").replace(/"/g, "\\'")}" height='15px' style='vertical-align:middle'> ${onlineCount - followCount}`;
	}
	onlineUsersTooltip.value = res;
}

async function sendMessage(event?: KeyboardEvent): Promise<void> {
	if (message.value.length == 0) return;
	// if (openAutoComplete.value) return;

	//Push message to history
	if (message.value != sendHistory.value[sendHistory.value.length - 1]) {
		sendHistory.value.push(message.value);
	}
	//Limit history size
	const maxHistorySize = 100;
	if (sendHistory.value.length > maxHistorySize)
		sendHistory.value = sendHistory.value.splice(-maxHistorySize);
	//set history cursor to latest message
	sendHistoryIndex.value = sendHistory.value.length;

	DataStore.set(DataStore.SENT_MESSAGE_HISTORY, sendHistory.value);

	const params = message.value.split(/\s/gi).filter((v) => v != "");
	const cmd = params.shift()?.toLowerCase();
	const isAdmin = storeAuth.twitch.user.is_admin === true;
	let noticeId: TwitchatDataTypes.TwitchatNoticeStringType | undefined;
	let noticeMessage: string | undefined;
	params.forEach((v, i) => {
		params[i] = v.trim();
	});

	if (cmd == "/cypherkey") {
		//Secret feature hehehe ( ͡~ ͜ʖ ͡°)
		storeMain.setCypherKey(params[0]!);
		noticeId = TwitchatDataTypes.TwitchatNoticeType.CYPHER_KEY;
		noticeMessage = "Cypher key successfully configured !";
		message.value = "";
	} else if (cmd == "/cypherreset") {
		//Secret feature hehehe ( ͡~ ͜ʖ ͡°)
		storeMain.setCypherKey("");
		TwitchCypherPlugin.instance.cypherKey = "";
		noticeId = TwitchatDataTypes.TwitchatNoticeType.CYPHER_KEY;
		noticeMessage = "Cypher key removed successfully.";
		message.value = "";
	} else if (cmd == "/dataversion") {
		//App version
		noticeId = TwitchatDataTypes.TwitchatNoticeType.APP_VERSION;
		noticeMessage = "Twitchat data version " + DataStore.get(DataStore.DATA_VERSION);
		message.value = "";
	} else if (cmd == "/adslogs") {
		Logger.instance.download("ads");
		message.value = "";
	} else if (cmd == "/heatlogs") {
		StoreProxy.params.openModal("heatLogs");
		message.value = "";
	} else if (cmd == "/irclogs") {
		Logger.instance.download("irc");
		message.value = "";
	} else if (cmd == "/obslogs") {
		Logger.instance.download("obs");
		message.value = "";
	} else if (cmd == "/youtubelogs") {
		Logger.instance.download("youtube");
		ApiHelper.call("log", "POST", {
			cat: "youtube",
			log: {
				user: {
					id: storeAuth.twitch.user.id,
					login: storeAuth.twitch.user.login,
				},
				logs: Logger.instance.getLogs("youtube"),
			},
		});
		message.value = "";
	} else if (cmd == "/triggerlogs") {
		StoreProxy.params.openModal("triggersLogs");
		message.value = "";
	} else if (cmd == "/giftlogs") {
		Logger.instance.download("subgifts");
		message.value = "";
	} else if (cmd == "/__demo_mode__") {
		Config.instance.DEMO_MODE = !Config.instance.DEMO_MODE;
		message.value = "";
	} else if (cmd == "/__reset_custom_usernames__") {
		storeUsers.customUsernames = {};
		storeUsers.saveCustomUsername();
		message.value = "";
	} else if (cmd == "/__sentry_on__" || cmd == "/__sentry_off__") {
		let sentryParamSrc = DataStore.get(DataStore.AB_SENTRY);
		let sentryParam = sentryParamSrc
			? JSON.parse(sentryParamSrc)
			: { v: 1, date: Date.now(), enabled: true };
		sentryParam.enabled = cmd == "/__sentry_on__";
		DataStore.set(DataStore.AB_SENTRY, sentryParam);
		const msg: TwitchatDataTypes.MessageCustomData = {
			id: Utils.getUUID(),
			platform: "twitchat",
			type: TwitchatDataTypes.TwitchatMessageType.CUSTOM,
			channel_id: storeAuth.twitch.user.id,
			date: Date.now(),
			message: "You must restart twitchat for this change to take effect !",
			actions: [
				{
					label: "Restart",
					actionType: "url",
					urlTarget: "_self",
					url: document.location.href,
					icon: "refresh",
					id: Utils.getUUID(),
					theme: "primary",
				},
			],
		};
		storeChat.addMessage(msg);
	} else if (cmd == "/__import__") {
		loading.value = true;
		try {
			const result = await ApiHelper.call(
				"user/settingsPreset",
				"GET",
				{ name: params[0]! },
				false,
			);
			if (result.json.success) {
				emit("update:showSettingsImport", result.json.data);
			} else {
				error.value = true;
			}
		} catch (err) {
			error.value = true;
		}
		loading.value = false;
		message.value = "";
	} else if (isAdmin && cmd == "/raw") {
		//Allows to display a message on chat from its raw JSON
		try {
			const json = JSON.parse(params.join(""));
			storeChat.addMessage(json);
			message.value = "";
			return;
		} catch (err) {
			storeCommon.alert("Invalid or missing JSON");
		}
	} else {
		if (storeChat.messageMode != "message") {
			const parentMessage = storeChat.replyTo;
			const chunks = TwitchUtils.parseMessageToChunks(message.value, undefined, true);
			const msg = StoreProxy.chat.addPrivateModMessage(
				storeAuth.twitch.user,
				chunks,
				storeChat.messageMode,
				Utils.getUUID(),
				parentMessage?.id,
				storeChat.replyTo || undefined,
			);

			//Allows to display a message on chat from its raw JSON
			const res = await ApiHelper.call("mod/privateMessage", "POST", {
				message: chunks,
				action: storeChat.messageMode,
				to_uid: storeStream.currentChatChannel.id,
				messageId: msg.id,
				messageParentId: parentMessage?.id,
				messageParentFallback: parentMessage
					? {
							uid: parentMessage.user.id,
							login: parentMessage.user.login,
							platform: parentMessage.platform,
							message: parentMessage.message_chunks,
						}
					: undefined,
			});

			if (res.status == 200) {
				message.value = "";
				storeChat.replyTo = null;
			} else {
				error.value = true;
			}
			return;
		}

		//Send message
		try {
			if (storeMain.cypherEnabled) {
				message.value = await TwitchCypherPlugin.instance.encrypt(message.value);
			}
			// this.loading = true;

			const replyTo = storeChat.replyTo ?? undefined;
			const messageLocal = message.value;
			message.value = "";
			storeChat.replyTo = null;
			if (
				await MessengerProxy.instance.sendMessage(
					messageLocal,
					[storeStream.currentChatChannel.platform],
					storeStream.currentChatChannel.id,
					replyTo,
					false,
					false,
				)
			) {
				// this.message = "";
				// this.storeChat.replyTo = null;
			}
			// this.loading = false;
		} catch (err) {
			console.log(err);
			error.value = true;
		}
	}

	if (noticeId && noticeMessage) {
		const notice: TwitchatDataTypes.MessageNoticeData = {
			id: Utils.getUUID(),
			date: Date.now(),
			type: TwitchatDataTypes.TwitchatMessageType.NOTICE,
			platform: "twitchat",
			noticeId: noticeId,
			message: noticeMessage,
			channel_id: storeStream.currentChatChannel.id,
		};
		storeChat.addMessage(notice);
	}
}

/**
 * Stop spamming fake messages
 */
function stopSpam(): void {
	MessengerProxy.instance.stopSpam();
}

/**
 * Toggle secret cypher keyboard
 */
function toggleCypher(): void {
	storeMain.setCypherEnabled(!storeMain.cypherEnabled);
}

/**
 * Start the mergency mode
 */
function toggleEmergencyMode(): void {
	if (!storeEmergency.emergencyStarted) {
		confirm(t("emergency.enable_confirm"))
			.then(() => {
				storeEmergency.setEmergencyMode(true);
			})
			.catch(() => {});
	} else {
		storeEmergency.setEmergencyMode(false);
	}
}

/**
 * Start the voice bot
 */
function toggleVoiceBot(): void {
	if (VoiceController.instance.started.value) {
		VoiceController.instance.stop();
	} else {
		VoiceController.instance.start(false);
	}
}

/**
 * Remove the currently highlighted message
 */
function removeChatHighlight(): void {
	storeChat.highlightChatMessageOverlay();
}

/**
 * Called when selecting an emote/user/cmd from the emote selector
 * or the auto complete selector
 */
async function onSelectItem(item: string): Promise<void> {
	const input = inputRef.value!;
	let caretPos = input.selectionStart;
	let localMessage = message.value;
	if (!caretPos) caretPos = 1;
	caretPos--;

	//If it's a command and it has no parameter, submit it right away
	if (item.indexOf("/") === 0 && item.indexOf("{") == -1) {
		message.value = item;
		autoCompleteSearch.value = "";
		sendMessage();
		return;
	}

	if (autoCompleteSearch.value) {
		for (let i = caretPos; i >= 0; i--) {
			const currentChar = localMessage.charAt(i);
			if (currentChar == ":" || currentChar == "@" || /\s/gi.test(currentChar) || i == 0) {
				const offset = currentChar == ":" || currentChar == "@" ? 1 : 0;
				let prefix = localMessage.substring(0, i - offset);
				const suffix =
					localMessage.substring(i + 1 + autoCompleteSearch.value.length) + " ";
				if (prefix) prefix += " ";
				localMessage = prefix + item + suffix;
				caretPos = prefix.length + item.length + 1;
				break;
			}
		}
		autoCompleteSearch.value = "";
	} else {
		const prefix = caretPos == 0 || /\s/gi.test(localMessage.charAt(caretPos)) ? "" : " ";
		const suffix =
			caretPos == localMessage.length || /\s/gi.test(localMessage.charAt(caretPos + 1))
				? ""
				: " ";
		const code = prefix + item + suffix;
		localMessage =
			localMessage.substring(0, caretPos + 1) + code + localMessage.substring(caretPos + 1);
		caretPos += code.length + 1;
	}

	if (/\{.*?\}/gi.test(item)) {
		localMessage = localMessage.replace(/{(.*?)\}/gi, "[$1]");
	}
	message.value = localMessage;

	await nextTick();

	//Pre select commands placeholder
	if (/\{.*?\}/gi.test(item)) {
		input.setSelectionRange(item.indexOf("{"), item.indexOf("}") + 1, "forward");
	} else {
		input.setSelectionRange(caretPos, caretPos, "forward");
		input.focus();
	}

	//Force autocomplete close.
	//Due to async rendering the watcher might detect search update before
	//the selectionRange is effective which may cause the autocomplete open
	//Here we ensure it stays closed
	autoCompleteSearch.value = "";
}

/**
 * Called when pressing any key
 */
function onKeyDown(e: KeyboardEvent): void {
	if (e.shiftKey) return; //Avoid blocking browser tab navigation
	if (e.ctrlKey || e.metaKey) return; //Avoid blocking browser tab navigation
	//Avoid leaving the input form
	if (e.key == "Tab") e.preventDefault();

	if (!openAutoComplete.value) {
		//Navigate through sent message history
		if (e.key == "ArrowUp" || e.key == "ArrowDown") {
			sendHistoryIndex.value += e.key == "ArrowUp" ? -1 : 1;
			sendHistoryIndex.value = Math.min(
				sendHistory.value.length,
				Math.max(0, sendHistoryIndex.value),
			);
			if (sendHistoryIndex.value >= sendHistory.value.length) message.value = "";
			else message.value = sendHistory.value[sendHistoryIndex.value]!;
		}
	}
	if (e.key == "ArrowUp" || e.key == "ArrowDown") e.preventDefault();
}

/**
 * Called when pressing tab key on input field
 */
function onTab(e: KeyboardEvent): void {
	const input = inputRef.value!;
	let carretPos = input.selectionStart as number;
	let i = carretPos - 1;
	for (; i > -1; i--) {
		const c = message.value.charAt(i);
		if (/\s/gi.test(c)) break;
	}
	const len = carretPos - i;
	if (len > 2) {
		if (!openAutoComplete.value) {
			//Avoid closing the auto complete list right away now that
			//we can submit it with the tab key
			e.stopPropagation();
		}
		autoCompleteUsers.value = true;
		autoCompleteEmotes.value = true;
		autoCompleteCommands.value = true;
		autoCompleteSearch.value = message.value.substring(i + 1, carretPos);
	}
	// e.preventDefault();
}

/**
 * Interrupts the TTS
 */
function stopTTS(all: boolean): void {
	TTSUtils.instance.stop(all);
}

/**
 * Reset current voice effect
 */
function resetVoiceEffect(): void {
	VoicemodWebSocket.instance.disableVoiceEffect();
}

/**
 * Open a user's card
 */
function openUserCard(user: TwitchatDataTypes.TwitchatUser, channel_id: string): void {
	storeUsers.openUserCard(user, channel_id);
}

/**
 * Called when clicking a pinnable menu item
 */
function onClickMenuItem(entry: (typeof pinnedMenuItems.value)[number]): void {
	const disabledState = pinDisableState(entry);
	if (disabledState.disabled) {
		if (disabledState.scopes.length == 0) return;
		TwitchUtils.requestScopes(disabledState.scopes);
		return;
	}
	const item = entry.item;
	if (item.isModal) {
		storeParams.openModal(item.modalId);
	} else if (item.id == "clearChat") {
		if (!TwitchUtils.hasScopes([TwitchScopes.DELETE_MESSAGES])) {
			storeAuth.requestTwitchScopes([TwitchScopes.DELETE_MESSAGES]);
		} else {
			confirm(t("params.clearChat_confirm_title"), t("params.clearChat_confirm_desc"))
				.then(() => {
					TwitchUtils.deleteMessages(storeAuth.twitch.user.id, undefined, true);
				})
				.catch(() => {});
		}
	} else if (item.id.indexOf("trigger:") === 0) {
		const trigger = storeTriggers.triggerList.find(
			(trigger) => trigger.id == item.id.replace("trigger:", ""),
		);
		if (trigger) {
			const me = StoreProxy.auth.twitch.user;
			const messageData: TwitchatDataTypes.MessageChatData = {
				platform: "twitch",
				type: TwitchatDataTypes.TwitchatMessageType.MESSAGE,
				channel_id: me.id,
				date: Date.now(),
				id: Utils.getUUID(),
				message: "",
				message_chunks: [],
				message_html: "",
				user: me,
				is_short: false,
				answers: [],
				message_size: 0,
			};
			void TriggerActionHandler.instance.executeTrigger(trigger, messageData, false);
		}
	} else if (item.modelValueName) {
		// @ts-expect-error cannot dynamicaly type emit calls
		emit(`update:${item.modelValueName}`, true);
	}
}

/**
 * Called when ending credits overlay is detected
 */
function onCreditsOverlayPresence(): void {
	creditsOverlayRunning.value = true;
	clearTimeout(creditsOverlayPresenceHandlerTimeout);
	creditsOverlayPresenceHandlerTimeout = window.setTimeout(() => {
		creditsOverlayRunning.value = false;
	}, 25000);
}

/**
 * Called when updating the tracking state of a user
 */
function onUpdateTrackedUserList(): void {
	const res = [];
	for (const u of storeUsers.users) {
		if (u.is_tracked) res.push(u);
	}
	trackedUserCount.value = res.length;
}

function getPinnedMenuItemFromId(
	id: (typeof TwitchatDataTypes.PinnableMenuItems)[number]["id"],
): (typeof TwitchatDataTypes.PinnableMenuItems)[number] | null {
	if (id.indexOf("trigger:") === 0) {
		const trigger = storeTriggers.triggerList.find(
			(trigger) => trigger.id == id.replace("trigger:", ""),
		);
		if (!trigger) {
			// Trigger not found, remove from pinned items
			storeParams.toggleChatMenuPin(id);
			return null;
		}
		const triggerInfo = TriggerUtils.getTriggerDisplayInfo(trigger);
		return {
			id,
			icon: "broadcast",
			labelKey: triggerInfo.labelKey || "",
			label: triggerInfo.label,
			isModal: false,
			modalId: "",
			modelValueName: "",
		};
	}
	return TwitchatDataTypes.PinnableMenuItems.find((v) => v.id == id)!;
}
watch(
	() => censoredViewCount.value,
	() => {
		DataStore.set(DataStore.CENSOR_VIEWER_COUNT, censoredViewCount.value);
	},
);
watch(
	() => storeChat.replyTo,
	() => {
		if (storeChat.replyTo) {
			inputRef.value!.focus();
		}
	},
);
watch(
	(): string => message.value,
	(newVal: string): void => {
		const input = inputRef.value;

		//When using /spam command input is removed from DOM
		if (!input) return;

		const carretPos = input.selectionStart as number | 0;

		//If emote autocomplete was active and user just typed a closing ":",
		//check if the search text exactly matches an emote or emoji shortcode
		if (
			autoCompleteEmotes.value &&
			autoCompleteSearch.value.length > 0 &&
			carretPos > 0 &&
			newVal.charAt(carretPos - 1) === ":"
		) {
			const search = autoCompleteSearch.value.toLowerCase();
			//Check twitch/BTTV/7TV/FFZ emotes for exact code match
			let emotes = TwitchUtils.emotesCache ?? [];
			if (storeParams.appearance.bttvEmotes.value === true) {
				emotes = emotes.concat(BTTVUtils.instance.emotes);
			}
			if (storeParams.appearance.sevenTVEmotes.value === true) {
				emotes = emotes.concat(SevenTVUtils.instance.emotes);
			}
			if (storeParams.appearance.ffzEmotes.value === true) {
				emotes = emotes.concat(FFZUtils.instance.emotes);
			}
			const exactEmote = emotes.find((e) => e.code.toLowerCase() === search);
			if (exactEmote) {
				message.value = newVal.substring(0, carretPos - 1) + newVal.substring(carretPos);
				onSelectItem(exactEmote.code);
				return;
			}
			//Check emoji shortcodes for exact match
			Database.instance.searchEmojiShortcodes(search, 1).then((emojiResults) => {
				if (emojiResults.length > 0 && emojiResults[0]!.shortcode === search) {
					message.value =
						message.value.substring(0, carretPos - 1) +
						message.value.substring(carretPos);
					onSelectItem(emojiResults[0]!.emoji);
				}
			});
			return;
		}

		for (let i = carretPos; i >= 0; i--) {
			const currentChar = newVal.charAt(i);
			const nextChar = newVal.charAt(i + 1);
			const offset = currentChar == ":" || currentChar == "@" ? 1 : 0;
			if (/\s/gi.test(currentChar)) {
				autoCompleteSearch.value = "";
				break;
			}

			if (
				currentChar == ":" ||
				currentChar == "@" ||
				((currentChar == "/" || currentChar == "!") && carretPos == 1) ||
				(i == 0 && autoCompleteSearch.value)
			) {
				autoCompleteUsers.value = currentChar == "@";
				autoCompleteEmotes.value = currentChar == ":" && /[a-z0-9+-]/i.test(nextChar);
				autoCompleteCommands.value = currentChar == "/" || currentChar == "!";
				autoCompleteSearch.value = newVal.substring(i + offset, carretPos);
				break;
			}
		}
	},
);

watch(
	() => storeStream.currentRaid,
	(newVal) => {
		if (newVal) {
			raidIntervalUpdate = window.setInterval(() => {
				remainingRaidTime.value = Utils.formatDuration(
					newVal!.timerDuration_s * 1000 - (newVal!.startedAt - Date.now()),
					true,
				);
			}, 1000);
		}
	},
	{ immediate: true },
);
defineExpose({
	onSelectItem,
});
</script>

<style scoped lang="less">
.chatform {
	display: flex;
	flex-direction: row;
	margin: auto;
	position: relative;
	opacity: 1;
	z-index: 5;
	transition: opacity 0.25s;
	color: var(--color-text);

	&.loading {
		opacity: 0.5;
		pointer-events: none;
	}

	&.cypherMode {
		.holder {
			background-image: repeating-linear-gradient(
				-45deg,
				#00000020,
				#00000020 20px,
				#ffffff10 20px,
				#ffffff10 40px
			);
		}
	}

	&.offlineMode {
		.holder {
			background-color: var(--background-color-secondary);
			background-image: repeating-linear-gradient(
				-45deg,
				var(--color-secondary-fader),
				var(--color-secondary-fader) 20px,
				var(--color-secondary-fadest) 20px,
				var(--color-secondary-fadest) 40px
			);
		}
	}

	&.emergencyMode {
		.holder {
			background-color: var(--color-alert);
			.inputForm {
				.inputHolder {
					.replyTo,
					.announcement {
						background-color: var(--color-alert);
					}
				}
			}
		}
	}

	.leftForm {
		display: flex;
		flex-direction: row;

		&:hover,
		&:focus-within {
			.addPinBt {
				width: 2em;
				max-width: 2em;
				min-width: 2em;
			}
		}
	}

	.leftForm:hover ~ .inputForm {
		margin-right: -2em;
	}

	.holder {
		position: absolute;
		width: 100%;
		display: flex;
		flex-direction: row;
		position: relative;
		justify-content: center;
		z-index: 2;
		box-shadow: 0px -2px 2px 0px rgba(0, 0, 0, 0.5);
		background-color: var(--background-color-secondary);
		padding: 0.25em;
		flex-wrap: wrap;

		.sortableItems {
			display: flex;
			flex-direction: row;
			align-self: center;
			position: relative;

			&::before {
				content: "";
				width: 1px;
				height: 1em;
				display: block;
				position: relative;
				top: 0.5em;
				background: var(--color-text-fader);
			}

			& > :first-child {
				margin-left: 1px;
			}
		}

		.addPinBt {
			width: 0px;
			padding: 0;
			max-width: 0px;
			min-width: 0px;
			z-index: 1;
			transition:
				width 0.2s,
				max-width 0.2s,
				min-width 0.2s,
				margin-right 0.2s;
		}

		.inputForm {
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: center;
			flex-wrap: wrap;
			flex-grow: 1;
			transition: all 0.2s;

			.loader {
				height: 1em;
			}

			.inputHolder {
				position: relative;
				flex-grow: 1;
				flex-basis: 150px;

				.inputField {
					gap: 0;
					display: flex;
					flex-direction: row;
					background-color: var(--background-color-fader);
					border-radius: var(--border-radius);
					input {
						flex-grow: 1;
						color: var(--color-text);
						background: transparent;
					}
					.actions {
						display: flex;
						flex-direction: row;
						align-items: center;
						z-index: 1;
						.chanSwitcher {
							margin: 0.15em;
						}
						// *:last-child {
						// 	margin-right: -.5em;
						// }
					}

					.chatInputError {
						position: absolute;
						text-align: center;
						width: 100%;
						z-index: 0;
						line-height: 1.75em;
						color: var(--color-text);
						background-color: var(--color-alert-fader);
						border-radius: var(--border-radius);
						transition: background-color 0.1s;
						&:hover {
							background-color: var(--color-alert-fade);
						}
						.icon {
							height: 1em;
							vertical-align: middle;
							margin-right: 0.5em;
						}
					}

					&.modAction {
						background-color: var(--color-text-inverse) !important;
						@c1: #00a86520;
						@c2: #00a86530;
						background-image: repeating-linear-gradient(
							-45deg,
							@c1,
							@c1 20px,
							@c2 20px,
							@c2 40px
						);
					}
				}

				.replyTo,
				.announcement {
					top: -0.25em;
					width: 100%;
					position: absolute;
					transform: translateY(-100%);
					background-color: var(--background-color-secondary);
					color: var(--color-text);
					border-top-left-radius: 0.5em;
					border-top-right-radius: 0.5em;
					box-shadow: 0 -5px 5px rgba(0, 0, 0, 0.5);
					display: flex;
					flex-direction: row;
					align-items: center;
					.closeBt {
						padding: 0.35em;
						width: 1.5em;
						height: 1.5em;
						min-width: 1.5em;
						min-height: 1.5em;
						color: var(--color-text);
						.icon {
							display: block;
							width: 100%;
							height: 100%;
						}
					}
					.content {
						padding: 0.5em;
						padding-left: 0;
						font-size: 0.7em;
						white-space: nowrap;
						overflow: hidden;
						text-overflow: ellipsis;
						.head {
							font-weight: bold;
						}
						.message {
							opacity: 0.8;
							margin-left: 0.25em;
							line-height: 1.25em;
						}
					}
					&.announcement {
						border: 1px dashed var(--color-secondary);
						border-bottom: none;
						padding: 1em;
						.closeBt {
							position: absolute;
							top: 0;
							right: 0;
							width: 1.75em;
							height: 1.75em;
						}
						.content {
							padding: 0;
							font-size: 1rem;
							display: flex;
							flex-direction: column;
							overflow: auto;
							white-space: normal;
							text-overflow: unset;
							.title {
								font-weight: bold;
								font-size: 1.5em;
								margin-bottom: 0.5em;
								padding-bottom: 0.5em;
								border-bottom: 5px solid var(--color-secondary);
								width: fit-content;
								.icon {
									height: 1em;
									margin-right: 0.5em;
								}
							}
							.message {
								white-space: pre-line;
							}
						}
					}
				}
			}
			.error {
				cursor: pointer;
				text-align: center;
				flex-grow: 1;
				font-size: 1em;
				color: #ff0000;
				display: flex;
			}

			.spam {
				flex-grow: 1;
			}
		}

		.rightForm {
			display: flex;
			flex-direction: row;
			align-items: center;

			.button.emergency {
				padding: 0.35em;
				margin-left: 0.5em;
			}

			.blink-enter-active {
				transition: background-color 0.7s linear;
				animation: fadeInOut 4s ease-in-out;
			}

			.blink-leave-active {
				transition: all 0.25s;
			}

			.blink-enter-from {
				opacity: 1;
				background: #ffffff !important;
				transform: scale(2);
			}
			.blink-leave-to {
				opacity: 0;
			}

			@keyframes fadeInOut {
				0%,
				10%,
				20%,
				30%,
				40%,
				50%,
				60%,
				70%,
				80%,
				90%,
				100% {
					transform: scale(1);
				}
				5%,
				15%,
				25%,
				35%,
				45%,
				55%,
				65%,
				75%,
				85%,
				95% {
					transform: scale(2);
				}
			}

			.viewCount {
				cursor: pointer;
				gap: 0.25em;
				display: flex;
				flex-direction: row;
				align-items: center;
				white-space: nowrap;
				color: var(--color-text);
				background-color: var(--background-color-fader);

				border-radius: 0.5em;
				font-size: 0.9em;
				font-family: var(--font-roboto);
				padding: 0.35em;
				.icon {
					height: 1em;
					margin-right: 0.25em;
				}
				.censor {
					filter: blur(3px);
				}
			}

			.error {
				background: var(--color-alert);
				height: 2em;
				width: 2em;
				align-items: stretch;
				padding: 0.25em;
				border-radius: 0.5em;
				display: flex;
				align-items: center;
				justify-content: center;
				:deep(.icon) {
					vertical-align: middle;
					width: unset;
					color: #fff;
				}
			}
		}
	}

	.floatingButtons {
		position: absolute;
		top: 0;
		right: 0;
		z-index: 1;
		transform: translate(0, calc(-100% - 5px));
		display: flex;
		flex-direction: column;

		.button {
			height: auto;
			padding: 0.25em;
			width: 2em;
			height: 2em;
			transform: translate(0, 0);
			transition: transform 0.25s;
			margin-top: 0.25em;
			border-radius: var(--border-radius);
		}

		.voicemodBt {
			padding: 0;
			&::before {
				background-color: #00fff6;
			}
			&:hover::before {
				background-color: darken(#00fff6, 10%) !important;
			}
			:deep(.icon) {
				width: 100%;
				height: 100%;
				max-height: 100%;
				max-width: 100%;
			}
		}

		.slide-enter-from,
		.slide-leave-to {
			transform: translate(100%, 0);
		}
	}

	.contentWindows {
		position: absolute;
		top: 0;
		left: 0;
		transform: translateY(-100%);
		z-index: 5;
	}
	.exportIndicator {
		left: 50%;
		z-index: 0;
		transform: translate(-50%, -100%);
		transition: all 0.35s;

		&.slide-enter-from,
		&.slide-leave-to {
			transform: translate(-50%, 0);
		}
	}

	.time {
		font-family: var(--font-roboto);
	}
}

// Keep it outside chatform scope
.viewersCountList_tooltip {
	display: flex;
	flex-direction: column;
	.platform {
		display: flex;
		flex-direction: row;
		align-items: center;
		.icon {
			height: 1em;
			max-width: 1em;
			margin-right: 0.25em;
		}
		.censor {
			filter: blur(3px);
		}
	}
}

@media only screen and (max-width: 600px) {
	.chatform {
		.holder {
			flex-wrap: wrap;
			justify-content: center;
			.leftForm {
				order: 2;
			}
			.inputForm {
				order: 1;
				flex-grow: 1;
				width: 100%;
			}
			.rightForm {
				order: 3;
			}
		}

		.leftForm:hover ~ .inputForm {
			margin-right: unset;
		}

		.leftForm {
			.addPinBt {
				background-color: var(--background-color-secondary);
				filter: drop-shadow(5px 0 2px rgba(0, 0, 0, 0.25));
			}
			&:hover,
			&:focus-within {
				.addPinBt {
					margin-right: -2em;
				}
			}
		}
		.rightForm::before {
			content: "";
			width: 1px;
			height: 1em;
			display: block;
			position: relative;
			background: var(--color-text-fader);
		}
	}
}
</style>
