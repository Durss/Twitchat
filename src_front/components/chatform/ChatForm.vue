<template>
	<div :class="classes">
		<div class="holder">

			<ButtonNotification :aria-label="$t('chat.form.paramsBt_aria')" draggable="false" icon="params" @click="toggleParams()" :newflag="{date:$config.NEW_FLAGS_DATE_V16, id:'chatform_params_6'}" />
			<ButtonNotification :aria-label="$t('chat.form.cmdsBt_aria')" draggable="false" icon="commands" @click="$emit('update:showCommands', true)" :newflag="{date:$config.NEW_FLAGS_DATE_V13, id:'chatform_cmds_2'}" />
			<VueDraggable class="sortableItems"
			v-model="$store.params.pinnedMenuItems"
			:group="{name:'items'}"
			animation="250"
			@end="$store.params.saveChatMenuPins()">
				<ButtonNotification v-for="element in $store.params.pinnedMenuItems" :key="element"
					@mouseenter="element == 'chatters'? updateOnlineUsersTooltip($event) : ()=>{}"
					v-tooltip="{
						touch:'hold',
						content: element == 'chatters' && $store.params.appearance.showViewersCount.value === true? onlineUsersTooltip : $t(getPinnedMenuItemFromid(element).labelKey)
					}"
					:aria-label="$t(getPinnedMenuItemFromid(element).labelKey)"
					:icon="getPinnedMenuItemFromid(element).icon"
					@click="onClickMenuItem(getPinnedMenuItemFromid(element))" />
			</VueDraggable>

			<form @submit.prevent="" class="inputForm" name="messageform">
				<Icon class="loader" name="loader" v-if="loading" />

				<div class="inputHolder" v-if="!error && !$store.chat.spamingFakeMessages">

					<div class="replyTo" v-if="$store.chat.replyTo">
						<button class="closeBt" type="button" @click="$store.chat.replyTo = null"><Icon name="cross"/></button>
						<div class="content">
							<i18n-t scope="global" :keypath="$store.chat.messageMode == 'message'? 'chat.form.reply_to' : 'chat.form.quoting'" tag="span" class="head">
								<template #USER>
									<a class="userlink" @click.stop="openUserCard($store.chat.replyTo!.user, $store.chat.replyTo!.channel_id)">{{$store.chat.replyTo!.user.displayName}}</a>
								</template>
							</i18n-t>
							<span class="message">{{ $store.chat.replyTo!.message }}</span>
						</div>
					</div>

					<div class="announcement" v-if="announcement">
						<button class="closeBt" type="button" @click="closeAnnouncement()"><Icon name="cross"/></button>
						<div class="content">
							<span class="title">
								<Icon name="alert" />
								<ChatMessageChunksParser :chunks="announcementTitle" :channel="$store.auth.twitch.user.id" platform="twitch" />
							</span>
							<span class="message">
								<ChatMessageChunksParser :chunks="announcementMessage" :channel="$store.auth.twitch.user.id" platform="twitch" />
							</span>
						</div>
					</div>

					<div class="inputField" :class="{modAction:$store.chat.messageMode!='message'}" :style="inputStyles">
						<div class="actions">
							<ChannelSwitcher class="chanSwitcher"
								v-model="$store.stream.currentChatChannel.id"
								v-model:name="$store.stream.currentChatChannel.name"
								v-model:platform="$store.stream.currentChatChannel.platform" />

							<ModeratorActionSwitcher v-if="isModeratedChannel" v-model:mode="$store.chat.messageMode" />

							<GroqChannelAction v-if="$store.groq.connected && $store.groq.enabled" />

						</div>

						<button class="chatInputError"
							v-if="mustConnectYoutubeChan"
							@click="$store.params.openParamsPage('connexions', 'youtube')">{{ $t('chat.form.youtube_not_connected') }}</button>

						<button class="chatInputError"
							v-else-if="$store.stream.currentChatChannel.platform == 'youtube' && mustGrantYoutubeScope"
							@click="$store.params.openParamsPage('connexions', 'youtube')"><Icon name="lock_fit" />{{ $t('chat.form.youtube_missing_scope') }}</button>

						<button class="chatInputError"
							v-else-if="$store.stream.currentChatChannel.platform == 'twitch' && mustGrantTwitchScope"
							@click="grantTwitchScopes()"><Icon name="lock_fit" />{{ $t('chat.form.twitch_missing_scope') }}</button>

						<!-- using @input instead of v-model so it works properly on mobile -->
						<input v-else
							type="text"
							ref="input"
							:value="message"
							:placeholder="$t('chat.form.input_placeholder', {CHANNEL:$store.stream.currentChatChannel.name})"
							:maxlength="maxLength"
							@input="$event => message = ($event.target as HTMLInputElement).value"
							@keyup.capture.tab="(e)=>onTab(e)"
							@keyup.enter="(e:Event)=>sendMessage(e)"
							@keydown="onKeyDown">
					</div>
				</div>

				<TTButton class="spam" alert
					v-if="$store.chat.spamingFakeMessages"
					icon="cross"
					@click="stopSpam()">{{ $t('chat.form.stop_spamBt') }}</TTButton>

				<span @click="error=false" v-if="error" class="error">{{ $t('error.message_send') }}</span>
			</form>

			<div class="rightForm">
				<ButtonNotification :aria-label="$t('chat.form.emoteBt_aria')"
					icon="emote"
					@click="$emit('update:showEmotes',true);" />

				<transition name="blink">
					<ButtonNotification :aria-label="$t('chat.form.shoutoutBt_aria')"
						icon="shoutout"
						:count="pendingShoutoutCount"
						v-tooltip="{touch:'hold', content:$t('chat.form.shoutoutBt_aria'), showOnCreate:true, onHidden:()=>onHideTooltip('shoutout')}"
						v-if="pendingShoutoutCount > 0"
						@click="$emit('update:showShoutout',true);" />
				</transition>

				<transition name="blink">
					<ButtonNotification :aria-label="$t('chat.form.pollBt_aria')"
						icon="poll"
						v-tooltip="{touch:'hold', content:$t('chat.form.pollBt_aria'), showOnCreate:shouldShowTooltip('poll'), onHidden:()=>onHideTooltip('poll')}"
						@click="openNotifications('poll')"
						v-if="$store.poll.data?.id && $store.poll.data?.isFake != true" />
				</transition>

				<transition name="blink">
					<ButtonNotification :aria-label="$t('chat.form.chatPollBt_aria')"
						icon="chatPoll"
						v-tooltip="{touch:'hold', content:$t('chat.form.chatPollBt_aria'), showOnCreate:shouldShowTooltip('chatPoll'), onHidden:()=>onHideTooltip('chatPoll')}"
						@click="openNotifications('chatPoll')"
						v-if="$store.chatPoll.data" />
				</transition>

				<transition name="blink">
					<ButtonNotification :aria-label="$t('chat.form.predictionBt_aria')"
						icon="prediction"
						v-tooltip="{touch:'hold', content:$t('chat.form.predictionBt_aria'), showOnCreate:shouldShowTooltip('prediction'), onHidden:()=>onHideTooltip('prediction')}"
						@click="openNotifications('prediction')"
						v-if="$store.prediction.data?.id && $store.prediction.data?.isFake != true" />
				</transition>

				<transition name="blink">
					<ButtonNotification :aria-label="$t('chat.form.trainBt_aria')"
						icon="train"
						v-tooltip="{touch:'hold', content:$t('chat.form.trainBt_aria'), showOnCreate:shouldShowTooltip('train'), onHidden:()=>onHideTooltip('train')}"
						@click="openNotifications('train')"
						v-if="$store.stream.hypeTrain" />
				</transition>

				<transition name="blink">
					<ButtonNotification :aria-label="$t('chat.form.trackedBt_aria')"
						icon="magnet"
						v-if="trackedUserCount > 0"
						v-tooltip="{touch:'hold', content:$t('chat.form.trackedBt_aria'), showOnCreate:shouldShowTooltip('tracked'), onHidden:()=>onHideTooltip('tracked')}"
						@click="openModal('tracked')" />
				</transition>

				<transition name="blink">
					<ButtonNotification :aria-label="$t('chat.form.raffleBt_aria')"
						v-if="$store.raffle.raffleList && raffleListActive.length > 0"
						icon="ticket"
						:count="raffleEntryCount"
						v-tooltip="{touch:'hold', content:$t('chat.form.raffleBt_aria'), showOnCreate:shouldShowTooltip('raffle'), onHidden:()=>onHideTooltip('raffle')}"
						@click="openNotifications('raffle')"><template v-if="raffleListActive.length > 1">x{{ raffleListActive.length }}</template></ButtonNotification>
				</transition>

				<transition name="blink">
					<ButtonNotification :aria-label="$t('chat.form.bingoBt_aria')"
						icon="bingo"
						v-if="$store.bingo.data"
						v-tooltip="{touch:'hold', content:$t('chat.form.bingoBt_aria'), showOnCreate:shouldShowTooltip('bingo'), onHidden:()=>onHideTooltip('bingo')}"
						@click="openNotifications('bingo')" />
				</transition>

				<transition name="blink">
					<ButtonNotification :aria-label="$t('chat.form.suggBt_aria')"
						icon="chatSugg"
						:count="$store.chatSuggestion.data?.choices.length"
						v-tooltip="{touch:'hold', content:$t('chat.form.suggBt_aria'), showOnCreate:shouldShowTooltip('chatsuggState'), onHidden:()=>onHideTooltip('chatsuggState')}"
						@click="openModal('chatsuggState')"
						v-if="$store.chatSuggestion.data != null" />
				</transition>

				<transition name="blink">
					<ButtonNotification :aria-label="$t('chat.form.whispersBt_aria')"
						icon="whispers"
						:count="$store.chat.whispersUnreadCount"
						v-if="whispersAvailable"
						v-tooltip="{touch:'hold', content:$t('chat.form.whispersBt_aria')}"
						@click="openModal('whispers')" />
				</transition>

				<transition name="blink">
					<ButtonNotification :aria-label="$t('chat.form.raidBt_aria')"
						icon="raid"
						v-if="$store.stream.currentRaid != null"
						v-tooltip="{touch:'hold', content:$t('chat.form.raidBt_aria')}"
						@click="openNotifications('raid')" />
				</transition>

				<transition name="blink">
					<ButtonNotification :aria-label="$t('chat.form.pinsBt_aria')"
						icon="save"
						v-if="$store.chat.pinedMessages.length > 0"
						:count="$store.chat.pinedMessages.length"
						v-tooltip="{touch:'hold', content:$t('chat.form.saveBt_aria'), showOnCreate:shouldShowTooltip('save'), onHidden:()=>onHideTooltip('save')}"
						@click="openModal('pins')" />
				</transition>

				<transition name="blink">
					<ButtonNotification aria-label="Toggle messages encryption"
						:icon="$store.main.cypherEnabled? 'lock' : 'unlock'"
						@click="toggleCypher()"
						v-if="cypherConfigured"
						v-tooltip="'Send encrypted<br>messages'" />
				</transition>

				<transition name="blink">
					<ButtonNotification :aria-label="$t('chat.form.highlightBt_aria')"
						v-if="chatHighlightEnabled"
						class="chatHighlight"
						icon="highlight"
						v-tooltip="{touch:'hold', content:$t('chat.form.highlightBt_aria'), showOnCreate:shouldShowTooltip('highlight'), onHidden:()=>onHideTooltip('highlight')}"
						@click="removeChatHighlight()" />
				</transition>

				<CommunityBoostInfo v-if="$store.stream.communityBoostState" />

				<TimerCountDownInfo v-if="isActiveTimer" />

				<CommercialTimer />

				<tooltip v-if="$store.params.appearance.showViewersCount.value === true
					&& (twitchViewerCount > 0 || tiktokViewerCount > 0 || youtubeViewerCount > 0)"
					class="viewCount"
					@click="censoredViewCount = !censoredViewCount">
					<template #default="{ state }">
						<Icon class="icon" name="show"/>
						<p v-if="censoredViewCount" class="censor">xx</p>
						<p v-if="!censoredViewCount">{{ twitchViewerCount + tiktokViewerCount + youtubeViewerCount }}</p>
					</template>
					<template #content="{ hide }">
						<div class="viewersCountList_tooltip">
							<div v-if="twitchViewerCount > 0" class="platform">
								<Icon name="twitch" />
								<p v-if="censoredViewCount" class="censor">xx</p>
								<p v-if="!censoredViewCount">{{twitchViewerCount}}</p>
							</div>

							<div v-if="tiktokViewerCount > 0" class="platform">
								<Icon name="tiktok" />
								<p v-if="censoredViewCount" class="censor">xx</p>
								<p v-if="!censoredViewCount">{{tiktokViewerCount}}</p>
							</div>

							<div v-if="youtubeViewerCount > 0" class="platform">
								<Icon name="youtube" />
								<p v-if="censoredViewCount" class="censor">xx</p>
								<p v-if="!censoredViewCount">{{youtubeViewerCount}}</p>
							</div>
						</div>
					</template>
				</tooltip>

				<transition name="blink">
					<ButtonNotification class="qna"
						icon="qna"
						v-if="qnaSessionActive"
						v-newflag="{date:$config.NEW_FLAGS_DATE_V11, id:'chatform_qna'}"
						:aria-label="$t('chat.form.qnaBt_aria')"
						v-tooltip="{touch:'hold', content:$t('chat.form.qnaBt_aria')}"
						@click="openModal('qna')" />
				</transition>

				<transition name="blink">
					<ButtonNotification class="credits"
						icon="credits"
						v-if="creditsOverlayRunning"
						v-newflag="{date:$config.NEW_FLAGS_DATE_V11, id:'chatform_credits'}"
						:aria-label="$t('chat.form.creditsBt_aria')"
						v-tooltip="{touch:'hold', content:$t('chat.form.creditsBt_aria')}"
						@click="$emit('update:showCredits', true)"
						@click.ctrl="creditsOverlayRunning = false" />
				</transition>

				<transition name="blink">
					<ButtonNotification class="bingoGrid"
						icon="bingo_grid"
						v-if="$store.bingoGrid.availableOverlayList.length > 0"
						:aria-label="$t('chat.form.bingoGridBt_aria')"
						v-tooltip="{touch:'hold', content:$t('chat.form.bingoGridBt_aria')}"
						@click="$emit('update:showBingoGrid', true)" />
				</transition>

				<transition name="blink">
					<ButtonNotification class="groq"
						icon="groq"
						v-if="$store.groq.enabled && $store.groq.connected && $store.groq.answerHistory.length > 0"
						:aria-label="$t('chat.form.groqBt_aria')"
						v-tooltip="{touch:'hold', content:$t('chat.form.groqBt_aria')}"
						@click="openModal('groqHistory')" />
				</transition>

				<transition name="blink">
					<ButtonNotification class="voice"
						:icon="voiceBotStarted? 'microphone_recording' : 'microphone_mute'"
						v-if="voiceBotConfigured"
						:aria-label="voiceBotStarted? $t('chat.form.voicebot_stopBt_aria') : $t('chat.form.voicebot_startBt_aria')"
						v-tooltip="{touch:'hold', content:voiceBotStarted? $t('chat.form.voicebot_stopBt_aria') : $t('chat.form.voicebot_startBt_aria')}"
						@click="toggleVoiceBot()" />
				</transition>

				<transition name="blink">
					<Icon class="error" name="spotify" v-if="$store.music.spotifyConsecutiveErrors > 5"
					v-tooltip="{touch:'hold', content:$t('chat.form.spotify_down'), showOnCreate:true, hideOnClick: 'toggle'}" />
				</transition>

				<transition name="blink">
					<ButtonNotification :aria-label="$t('chat.form.devmodeBt_aria')"
						icon="debug"
						@click="$emit('update:showDevMenu',true);"
						v-if="$store.main.devmode" />
				</transition>

				<ButtonNotification
				v-if="showObsBtn" icon="obs"
				class="error"
				v-tooltip="{touch:'hold', content:$t('chat.form.obs_disconnected_tt'), showOnCreate:true}"
				@click="openOBSParams()"></ButtonNotification>

				<ButtonNotification
				v-if="showGazaBtn"
				v-tooltip="{touch:'hold', content:$t('gaza.tooltip'), showOnCreate:shouldShowTooltip('gaza'), onHidden:()=>onHideTooltip('gaza')}"
				@click="$emit('update:showGazaFunds', true)">🍉</ButtonNotification>

				<transition name="blink">
					<TTButton class="emergency"
						v-if="emergencyButtonEnabled"
						icon="emergency"
						alert
						:light="$store.emergency.emergencyStarted"
						:aria-label="$store.emergency.emergencyStarted? $t('chat.form.emergency_stopBt_aria') : $t('chat.form.emergency_startBt_aria')"
						v-tooltip="{touch:'hold', content:$store.emergency.emergencyStarted? $t('chat.form.emergency_stopBt_aria') : $t('chat.form.emergency_startBt_aria')}"
						@click="toggleEmergencyMode()" />
				</transition>
			</div>
		</div>

		<div class="floatingButtons">
			<transition name="slide">
				<TTButton class="muteBt" :aria-label="$t('chat.form.muteTTSBt_aria')"
					icon="mute"
					secondary
					v-if="$store.tts.speaking"
					v-tooltip="{touch:'hold', content:$t('chat.form.muteTTSBt_aria'), placement:'left'}"
					@click="stopTTS(false)" />
			</transition>

			<transition name="slide">
				<TTButton class="muteBt" :aria-label="$t('chat.form.clearTTSBt_aria')"
					icon="muteAll"
					secondary
					v-if="$store.tts.speaking"
					v-tooltip="{touch:'hold', content:$t('chat.form.clearTTSBt_aria'), placement:'left'}"
					@click="stopTTS(true)" />
			</transition>

			<transition name="slide">
				<TTButton class="voicemodBt" :aria-label="$t('chat.form.resetVoiceBt_aria')"
				secondary
				v-if="$store.voice.voicemodParams.voiceIndicator && $store.voice.voicemodCurrentVoice"
				v-tooltip="{touch:'hold', content:$t('chat.form.resetVoiceBt_aria'), placement:'left'}"
				@click="resetVoiceEffect()">
				<template #icon>
					<img :src="'data:image/png;base64,' + $store.voice.voicemodCurrentVoice.image" alt="">
					</template>
				</TTButton>
			</transition>
		</div>

		<transition name="slide">
			<MessageExportIndicator class="contentWindows exportIndicator" v-if="$store.main.messageExportState" />
		</transition>

		<AutocompleteChatForm class="contentWindows"
			v-if="openAutoComplete"
			:search="autoCompleteSearch"
			:emotes="autoCompleteEmotes"
			:users="autoCompleteUsers"
			:commands="autoCompleteCommands"
			@close="autoCompleteSearch = ''"
			@selectItem="onSelectItem" />

	</div>
</template>

<script lang="ts">
import EventBus from '@/events/EventBus';
import GlobalEvent from '@/events/GlobalEvent';
import TwitchatEvent from '@/events/TwitchatEvent';
import MessengerProxy from '@/messaging/MessengerProxy';
import DataStore from '@/store/DataStore';
import StoreProxy from '@/store/StoreProxy';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import ApiHelper from '@/utils/ApiHelper';
import TwitchCypherPlugin from '@/utils/ChatCypherPlugin';
import Config from '@/utils/Config';
import Logger from '@/utils/Logger';
import PublicAPI from '@/utils/PublicAPI';
import TTSUtils from '@/utils/TTSUtils';
import Utils from '@/utils/Utils';
import HeatSocket from '@/utils/twitch/HeatSocket';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import VoiceAction from '@/utils/voice/VoiceAction';
import VoiceController from '@/utils/voice/VoiceController';
import VoicemodWebSocket from '@/utils/voice/VoicemodWebSocket';
import { watch } from '@vue/runtime-core';
import { gsap } from 'gsap/gsap-core';
import { Component, Prop, Vue, toNative } from 'vue-facing-decorator';
import ButtonNotification from '../ButtonNotification.vue';
import TTButton from '../TTButton.vue';
import ChatMessageChunksParser from '../messages/components/ChatMessageChunksParser.vue';
import ParamItem from '../params/ParamItem.vue';
import AutocompleteChatForm from './AutocompleteChatForm.vue';
import CommercialTimer from './CommercialTimer.vue';
import CommunityBoostInfo from './CommunityBoostInfo.vue';
import MessageExportIndicator from './MessageExportIndicator.vue';
import TimerCountDownInfo from './TimerCountDownInfo.vue';
import ChannelSwitcher from './ChannelSwitcher.vue';
import OBSWebsocket from '@/utils/OBSWebsocket';
import YoutubeHelper from '@/utils/youtube/YoutubeHelper';
import {YoutubeScopes} from "@/utils/youtube/YoutubeScopes";
import ModeratorActionSwitcher from './ModeratorActionSwitcher.vue';
import { VueDraggable } from 'vue-draggable-plus';
import GroqChannelAction from './GroqChannelAction.vue';

@Component({
	components:{
		TTButton,
		ParamItem,
		VueDraggable,
		GroqChannelAction,
		ChannelSwitcher,
		CommercialTimer,
		ButtonNotification,
		TimerCountDownInfo,
		CommunityBoostInfo,
		AutocompleteChatForm,
		MessageExportIndicator,
		ChatMessageChunksParser,
		ModeratorActionSwitcher,
	},
	emits: [
		"update:showEmotes",
		"update:showCommands",
		"update:showRewards",
		"update:showDevMenu",
		"update:showShoutout",
		"update:showCredits",
		"update:showBingoGrid",
		"update:showGroqHistory",
		"setCurrentNotification",
		"update:showGazaFunds",
		"update:showChatUsers",
	],
})
export class ChatForm extends Vue {

	@Prop
	public showFeed!:boolean;
	@Prop
	public showEmotes!:boolean;
	@Prop
	public showCommands!:boolean;
	@Prop
	public showRewards!:boolean;
	@Prop
	public showGazaFunds!:boolean;

	public message = "";
	public error = false;
	public loading = false;
	public showGazaBtn = false;
	public censoredViewCount = false;
	public autoCompleteSearch = "";
	public autoCompleteEmotes = false;
	public autoCompleteUsers = false;
	public autoCompleteCommands = false;
	public creditsOverlayRunning = false;
	public trackedUserCount = 0;
	public sendHistoryIndex = 0;
	public sendHistory:string[] = [];
	public onlineUsersTooltip:string = "";
	public announcement:TwitchatDataTypes.TwitchatAnnouncementData | null = null;

	private announcementInterval:number = -1;
	private creditsOverlayPresenceHandlerTimeout:number = -1;
	private updateTrackedUserListHandler!:(e:GlobalEvent)=>void;
	private creditsOverlayPresenceHandler!:(e:TwitchatEvent)=>void;

	public get maxLength():number {
		if(this.message.indexOf("/raw") === 0) {
			return 500000;
		}else{
			return 500;
		}
	}

	public getPinnedMenuItemFromid(id:string):typeof TwitchatDataTypes.PinnableMenuItems[number] {
		return TwitchatDataTypes.PinnableMenuItems.find(v=>v.id == id)!;
	}

	public get emergencyButtonEnabled():boolean {
		return this.$store.emergency.params.enabled === true;
	}

	public get twitchViewerCount():number {
		const infos = this.$store.stream.currentStreamInfo[this.$store.auth.twitch.user.id];
		if(infos) return infos.viewers;
		return 0;
	}

	public get tiktokViewerCount():number {
		const infos = this.$store.stream.currentStreamInfo["tiktok"];
		if(infos) return infos.viewers;
		return 0;
	}

	public get youtubeViewerCount():number {
		const infos = this.$store.stream.currentStreamInfo["youtube"];
		if(infos) return infos.viewers;
		return 0;
	}

	public get hasChannelPoints():boolean {
		return this.$store.auth.twitch.user.is_affiliate || this.$store.auth.twitch.user.is_partner;
	}

	public get announcementTitle():TwitchatDataTypes.ParseMessageChunk[] {
		const title = this.announcement!.title[this.$i18n.locale] || this.announcement!.title["en"];
		return TwitchUtils.parseMessageToChunks(title, undefined, true);
	}

	public get announcementMessage():TwitchatDataTypes.ParseMessageChunk[] {
		const text = this.announcement!.text[this.$i18n.locale] || this.announcement!.text["en"];
		return TwitchUtils.parseMessageToChunks(text, undefined, true);
	}

	public get showObsBtn():boolean { return this.$store.obs.connectionEnabled === true && !OBSWebsocket.instance.connected; }

	public get qnaSessionActive():boolean { return this.$store.qna.activeSessions.length > 0; }

	public get raffleListActive():TwitchatDataTypes.RaffleData[] { return this.$store.raffle.raffleList.filter(v=>v.mode != 'manual' && v.mode != 'values' && v.mode != 'sub' && v.ghost !== true); }

	public get isActiveTimer():boolean {
		const defaults = this.$store.timers.timerList
		for (let i = 0; i < defaults.length; i++) {
			const entry = defaults[i];
			if(entry.startAt_ms) return true;
		}

		return false;
	}

	public get voiceBotStarted():boolean { return VoiceController.instance.started; }
	public get voiceBotConfigured():boolean {
		if(Config.instance.OBS_DOCK_CONTEXT) return false;
		const actions = Object.keys(VoiceAction);
		type VAKeys = keyof typeof VoiceAction;
		//Search for global labels
		for (let i = 0; i < actions.length; i++) {
			const a = actions[i];
			if(VoiceAction[a+"_IS_GLOBAL" as VAKeys] !== true) continue;
			const id:string = VoiceAction[a as VAKeys] as string;
			const action = (this.$store.voice.voiceActions as VoiceAction[]).find(v=> v.id == id);
			if(!action?.sentences) return false;
		}
		return true;
	}

	public get chatHighlightEnabled():boolean {
		return this.$store.chat.highlightedMessageId != null;
	}

	public get openAutoComplete():boolean {
		return this.autoCompleteSearch.length > 1 || (this.autoCompleteCommands && this.autoCompleteSearch.length > 0);
	}

	public get whispersAvailable():boolean {
		const whispers = this.$store.chat.whispers;
		for (const key in whispers) {
			if (whispers[key].messages.length > 0) return true;
		}
		return false;
	}

	public get classes():string[] {
		let res = ["chatform"];
		if(this.loading) res.push("loading");
		if(this.$store.main.cypherEnabled) res.push("cypherMode");
		if(this.$store.emergency.emergencyStarted) res.push("emergencyMode");
		return res;
	}

	public get inputStyles():{[key:string]:string} {
		const currentChaninfo = this.$store.stream.connectedTwitchChans.find(v=>v.user.id == this.$store.stream.currentChatChannel.id);
		if(!currentChaninfo) return {};
		return {backgroundColor:currentChaninfo.color+"30"};//30 is alpha channel of the color
	}

	public get cypherConfigured():boolean { return this.$store.main.cypherKey?.length > 0; }

	public get pendingShoutoutCount():number {
		const list = this.$store.users.pendingShoutouts[this.$store.stream.currentChatChannel.id];
		if(!list) return 0;

		return list.length;
	}

	public get mustConnectYoutubeChan():boolean {
		return this.$store.stream.currentChatChannel.platform == "youtube" && YoutubeHelper.instance.currentLiveChatIds.length === 0;
	}

	public get mustGrantYoutubeScope():boolean {
		return !YoutubeHelper.instance.hasScopes([YoutubeScopes.CHAT_MODERATE]);
	}

	public get mustGrantTwitchScope():boolean {
		return !TwitchUtils.hasScopes(Config.instance.MANDATORY_TWITCH_SCOPES);
	}

	public get raffleEntryCount():number {
		let total = 0;
		this.raffleListActive.forEach(v=> total += v.entries.length);
		return total;
	}

	public get isModeratedChannel():boolean {
		const chanId = this.$store.stream.currentChatChannel.id;
		if(chanId == this.$store.auth.twitch.user.id) return true;
		return chanId != this.$store.auth.twitch.user.id
			&& this.$store.auth.twitchModeratedChannels.findIndex(v=>v.broadcaster_id == chanId) > -1;
	}

	public beforeMount(): void {
		const history = DataStore.get(DataStore.SENT_MESSAGE_HISTORY);
		if(history) {
			this.sendHistory = JSON.parse(history) as string[];
			this.sendHistoryIndex = this.sendHistory.length;
		}
		this.updateTrackedUserListHandler = (e:GlobalEvent) => this.onUpdateTrackedUserList();
		this.creditsOverlayPresenceHandler = (e:TwitchatEvent) => this.onCreditsOverlayPresence();
		EventBus.instance.addEventListener(GlobalEvent.TRACK_USER, this.updateTrackedUserListHandler);
		EventBus.instance.addEventListener(GlobalEvent.UNTRACK_USER, this.updateTrackedUserListHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CREDITS_OVERLAY_PRESENCE, this.creditsOverlayPresenceHandler);
		this.onUpdateTrackedUserList();
		//Leave some time to open transition to complete before showing announcements
		window.setTimeout(()=> {
			this.loadAnnouncements();
			this.showGazaBtn = true;
		}, 2000);
		//Check for new announcements every 30min
		this.announcementInterval = window.setInterval(()=> {
			this.loadAnnouncements(true);
		}, 10 * 60 * 1000);
	}

	public async mounted():Promise<void> {
		this.censoredViewCount = DataStore.get(DataStore.CENSOR_VIEWER_COUNT) !== "false";
		watch(()=>this.censoredViewCount, ()=> {
			DataStore.set(DataStore.CENSOR_VIEWER_COUNT, this.censoredViewCount);
		})
		watch(()=>this.$store.chat.replyTo, ()=>{
			if(this.$store.chat.replyTo) {
				(this.$refs.input as HTMLInputElement).focus();
			}
		})
		watch(():string => this.message, (newVal:string):void => {
			const input = this.$refs.input as HTMLInputElement;

			//When using /spam command input is removed from DOM
			if(!input) return;

			const carretPos = input.selectionStart as number | 0;
			const isCmd = /^\s*(\/|!)/.test(newVal);

			for (let i = carretPos; i >= 0; i--) {
				const currentChar = newVal.charAt(i);
				const offset = currentChar == ":" || currentChar == "@"? 1 : 0;
				if(/\s/gi.test(currentChar)) {
					this.autoCompleteSearch = "";
					break;
				}

				if(currentChar == ":" ||
				currentChar == "@" ||
				((currentChar == "/" || currentChar == "!") && carretPos == 1) ||
				(i == 0 && this.autoCompleteSearch)) {
					this.autoCompleteUsers = currentChar == "@";
					this.autoCompleteEmotes = currentChar == ":" && !isCmd;//Avoid autocompleting emotes in /countdown cmd
					this.autoCompleteCommands = currentChar == "/" || currentChar == "!";
					this.autoCompleteSearch = newVal.substring(i+offset, carretPos);
					break;
				}
			}
		});

		gsap.from(this.$el, {y:50, delay:.2, duration:1, ease:"sine.out"});
		const btns = (this.$el as HTMLDivElement).querySelectorAll(".leftForm>*,.inputForm>*");
		gsap.from(btns, {y:50, duration:.7, delay:.5, ease:"back.out(2)", stagger:.075});
	}

	public beforeUnmount():void {
		clearTimeout(this.announcementInterval);
		EventBus.instance.removeEventListener(GlobalEvent.TRACK_USER, this.updateTrackedUserListHandler);
		EventBus.instance.removeEventListener(GlobalEvent.UNTRACK_USER, this.updateTrackedUserListHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CREDITS_OVERLAY_PRESENCE, this.creditsOverlayPresenceHandler);
	}

	public openNotifications(type:TwitchatDataTypes.NotificationTypes):void { this.$emit('setCurrentNotification', type); }

	public openModal(modal:TwitchatDataTypes.ModalTypes):void { this.$store.params.openModal(modal); }

	public openOBSParams():void { this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.CONNECTIONS, TwitchatDataTypes.ParamDeepSections.OBS); }

	public grantTwitchScopes():void { TwitchUtils.requestScopes(Config.instance.MANDATORY_TWITCH_SCOPES); }

	public async closeAnnouncement():Promise<void> {
		let history:{[key:string]:boolean} = JSON.parse(DataStore.get(DataStore.ANNOUNCEMENTS_READ) || "{}");
		history[this.announcement!.id] = true;
		DataStore.set(DataStore.ANNOUNCEMENTS_READ, history);
		this.announcement = null
	}

	/**
	 * Loads potential twitchat announcements from server
	 */
	public async loadAnnouncements(onlyImportant:boolean = false):Promise<void> {
		//Wait for emotes to be loaded
		if(!TwitchUtils.emotesLoaded) {
			window.setTimeout(()=> {
				this.loadAnnouncements(onlyImportant);
			}, 2000);
			return;
		}

		const options = {
			method:"GET",
			headers: {
				"Content-Type": "application/json",
				"Authorization": "Bearer "+this.$store.auth.twitch.access_token,
				'App-Version': import.meta.env.PACKAGE_VERSION,
			}
		}
		let history:{[key:string]:boolean} = JSON.parse(DataStore.get(DataStore.ANNOUNCEMENTS_READ) || "{}");
		try {
			const res = await fetch(Config.instance.API_PATH+"/announcements", options);
			if(res.status == 200) {
				const json:TwitchatDataTypes.TwitchatAnnouncementData[] = await res.json() || [];
				for (let i = 0; i < json.length; i++) {
					const a = json[i];
					//Check if announcement already read
					if(history[a.id] === true) continue;
					//Check if version is valid
					if(a.versionMax) {
						const currentVersion = import.meta.env.PACKAGE_VERSION;
						if(Utils.compareSementicVersion(currentVersion, a.versionMax)) continue;
					}
					//Check donor only condition
					if(a.donorsOnly === true && this.$store.auth.donorLevel == -1) continue;
					//Check premium only condition
					if(a.premiumOnly === true && !this.$store.auth.isPremium) continue;
					//Check patreon only condition
					if(a.patreonOnly === true && !this.$store.patreon.isMember) continue;
					//Check patreon only condition
					if(a.heatOnly === true && !HeatSocket.instance.connected) continue;
					//Check if within date frame
					if(Date.now() < new Date(a.dateStart).getTime()) continue;
					if(a.dateEnd && Date.now() > new Date(a.dateEnd).getTime()) continue;
					//Allow only important alerts if requested
					if(onlyImportant && a.important !== true) continue;
					this.announcement = json[i];
				}
				let historyUpdated = false;
				//Remove ids from old deleted messages to avoid keeping useless data on localstorage
				Object.keys(history).forEach(id => {
					if(json.findIndex(v=>v.id == id) == -1) {
						delete history[id];
						historyUpdated = true;
					}
				});
				if(historyUpdated) {
					DataStore.set(DataStore.ANNOUNCEMENTS_READ, history);
				}
			}
		}catch(error) {/*ignore*/}
	}

	/**
	 * Gets if a button tooltip should be displayed by default
	 */
	public shouldShowTooltip(key:TwitchatDataTypes.NotificationTypes|TwitchatDataTypes.ModalTypes|"gaza"):boolean {
		const json = DataStore.get(DataStore.TOOLTIP_AUTO_OPEN);
		let values!:{[key:string]:number};
		if(!json) values = {};
		else values = JSON.parse(json);
		return values[key] == undefined || values[key] < 2;
	}

	/**
	 * Called when a tooltip is closed
	 */
	public onHideTooltip(key:TwitchatDataTypes.NotificationTypes|TwitchatDataTypes.ModalTypes|"gaza"):void {
		const json = DataStore.get(DataStore.TOOLTIP_AUTO_OPEN);
		let values!:{[key:string]:number};
		if(!json) values = {};
		else values = JSON.parse(json);
		if(values[key] === undefined) {
			values[key] = -1;
		}
		if(values[key] < 2) {
			values[key] ++;
			DataStore.set(DataStore.TOOLTIP_AUTO_OPEN, values);
		}
	}

	/**
	 * Toggle parameters display
	 */
	public toggleParams():void {
		if(this.$store.params.currentPage == TwitchatDataTypes.ParameterPages.CLOSE) {
			this.$store.params.openParamsPage( TwitchatDataTypes.ParameterPages.MAIN_MENU );
		}else{
			this.$store.params.openParamsPage( TwitchatDataTypes.ParameterPages.CLOSE );
		}
	}

	/**
	 * Updates the tooltip displayed on user icon hover.
	 * This could be replaced by a getter to avoid having to update
	 * this manually at hover.
	 * BUT, the "users" value of the "users" store is a getter refering
	 * to a non-reactive array for performance reason. Because of this
	 * if the method was a getter, its value wouldn't automatically be
	 * updated when user list changes.
	 */
	public updateOnlineUsersTooltip(e:MouseEvent):void {
		if(this.$store.params.appearance.showViewersCount.value !== true) return;

		let followCount = 0;
		let onlineCount = 0;
		const chanId = this.$store.stream.currentChatChannel.id;
		const users = this.$store.users.users;
		for (let i = 0; i < users.length; i++) {
			const u = users[i];

			if(!u.channelInfo[chanId]) continue;
			if(u.channelInfo[chanId].online === true) {
				onlineCount ++;
				if(u.channelInfo[chanId].is_following === true) followCount ++;
			}
		}

		let res = "<img src='"+this.$asset('icons/user.svg').replace(/"/g, '\\\'')+"' height='15px' style='vertical-align:middle'> "+onlineCount;

		if(this.$store.params.appearance.highlightNonFollowers.value === true) {
			res += " / <img src='"+this.$asset('icons/follow.svg').replace(/"/g, '\\\'')+"' height='15px' style='vertical-align:middle'> "+followCount;
			res += " / <img src='"+this.$asset('icons/unfollow.svg').replace(/"/g, '\\\'')+"' height='15px' style='vertical-align:middle'> "+(onlineCount - followCount);
		}
		this.onlineUsersTooltip = res;
	}

	public async sendMessage(event?:Event):Promise<void> {
		if(this.message.length == 0) return;
		if(this.openAutoComplete) return;

		//Push message to history
		if(this.message != this.sendHistory[this.sendHistory.length-1]) {
			this.sendHistory.push(this.message);
		}
		//Limit history size
		const maxHistorySize = 100;
		if(this.sendHistory.length > maxHistorySize) this.sendHistory = this.sendHistory.splice(-maxHistorySize);
		//set history cursor to latest message
		this.sendHistoryIndex = this.sendHistory.length;

		DataStore.set(DataStore.SENT_MESSAGE_HISTORY, this.sendHistory);

		const params = this.message.split(/\s/gi).filter(v => v != "");
		const cmd = params.shift()?.toLowerCase();
		const sChat = this.$store.chat;
		const isAdmin = this.$store.auth.twitch.user.is_admin === true;
		let noticeId:TwitchatDataTypes.TwitchatNoticeStringType|undefined;
		let noticeMessage:string|undefined;
		params.forEach((v, i) => { params[i] = v.trim() });

		if(cmd == "/cypherkey") {
			//Secret feature hehehe ( ͡~ ͜ʖ ͡°)
			this.$store.main.setCypherKey(params[0]);
			noticeId = TwitchatDataTypes.TwitchatNoticeType.CYPHER_KEY;
			noticeMessage = "Cypher key successfully configured !";
			this.message = "";
		}else

		if(cmd == "/cypherreset") {
			//Secret feature hehehe ( ͡~ ͜ʖ ͡°)
			this.$store.main.setCypherKey("");
			TwitchCypherPlugin.instance.cypherKey = "";
			noticeId = TwitchatDataTypes.TwitchatNoticeType.CYPHER_KEY;
			noticeMessage = "Cypher key removed successfully.";
			this.message = "";
		}else

		if(cmd == "/dataversion") {
			//App version
			noticeId = TwitchatDataTypes.TwitchatNoticeType.APP_VERSION;
			noticeMessage = "Twitchat data version "+DataStore.get(DataStore.DATA_VERSION);
			this.message = "";
		}else

		if(isAdmin && cmd == "/tenorgifload") {
			console.log(this.$store.chat.messages);
			console.log(await ApiHelper.call("tenor/search", "GET", {search:"test"+Math.round(Math.random()*5412)}));
			this.message = "";
		}else

		if(cmd == "/adslogs") {
			Logger.instance.download("ads");
			this.message = "";
		}else

		if(cmd == "/heatlogs") {
			StoreProxy.params.openModal("heatLogs");
			this.message = "";
		}else

		if(cmd == "/irclogs") {
			Logger.instance.download("irc");
			this.message = "";
		}else

		if(cmd == "/youtubelogs") {
			Logger.instance.download("youtube");
			this.message = "";
		}else

		if(cmd == "/triggerlogs") {
			StoreProxy.params.openModal("triggersLogs");
			this.message = "";
		}else

		if(cmd == "/giftlogs") {
			Logger.instance.download("subgifts");
			this.message = "";
		}else

		if(cmd == "/__demo_mode__") {
			Config.instance.DEMO_MODE = !Config.instance.DEMO_MODE;
			this.message = "";
		}else

		if(cmd == "/__reset_custom_usernames__") {
			this.$store.users.customUsernames = {};
			this.$store.users.saveCustomUsername();
			this.message = "";
		}else

		if(cmd == "/__sentry_on__" || cmd == "/__sentry_off__") {
			let sentryParamSrc = DataStore.get(DataStore.AB_SENTRY);
			let sentryParam = sentryParamSrc? JSON.parse(sentryParamSrc) : {v:1, date:Date.now(), enabled:true};
			sentryParam.enabled = cmd == "/__sentry_on__";
			DataStore.set(DataStore.AB_SENTRY, sentryParam);
			const message:TwitchatDataTypes.MessageCustomData = {
				id:Utils.getUUID(),
				platform:"twitchat",
				type:TwitchatDataTypes.TwitchatMessageType.CUSTOM,
				channel_id:this.$store.auth.twitch.user.id,
				date:Date.now(),
				message:"You must restart twitchat for this change to take effect !",
				actions:[
					{
						label:"Restart",
						actionType:"url",
						urlTarget:"_self",
						url:document.location.href,
						icon:"refresh",
						id:Utils.getUUID(),
						theme:"primary",
					}
				]
			}
			sChat.addMessage(message);
		}else

		if(isAdmin && cmd == "/raw") {
			//Allows to display a message on chat from its raw JSON
			try {
				const json = JSON.parse(params.join(""));
				this.$store.chat.addMessage(json);
				this.message = "";
				return;
			}catch(error) {
				this.$store.common.alert("Invalid or missing JSON");
			}
		}else{

			if(this.$store.chat.messageMode != "message") {
				const parentMessage = this.$store.chat.replyTo;
				const chunks = TwitchUtils.parseMessageToChunks(this.message, undefined, true);
				const message =  StoreProxy.chat.addPrivateModMessage(
									this.$store.auth.twitch.user,
									chunks,
									this.$store.chat.messageMode,
									Utils.getUUID(),
									parentMessage?.id,
									this.$store.chat.replyTo || undefined,
								);

				//Allows to display a message on chat from its raw JSON
				const res = await ApiHelper.call("mod/privateMessage", "POST", {
					message: chunks,
					action: this.$store.chat.messageMode,
					to_uid: this.$store.stream.currentChatChannel.id,
					messageId: message.id,
					messageParentId: parentMessage?.id,
					messageParentFallback: parentMessage? {
						uid:parentMessage.user.id,
						login:parentMessage.user.login,
						platform:parentMessage.platform,
						message:parentMessage.message_chunks,
					} : undefined,
				});

				if(res.status == 200) {
					this.message = "";
					this.$store.chat.replyTo = null;
				}else{
					this.error = true;
				}
				return;
			}

			//Send message
			try {
				if(this.$store.main.cypherEnabled) {
					this.message = await TwitchCypherPlugin.instance.encrypt(this.message);
				}
				// this.loading = true;

				const replyTo = this.$store.chat.replyTo ?? undefined;
				const messageLocal = this.message;
				this.message = "";
				this.$store.chat.replyTo = null;
				if(await MessengerProxy.instance.sendMessage(messageLocal,
															[this.$store.stream.currentChatChannel.platform],
															this.$store.stream.currentChatChannel.id, replyTo, false, false)) {
					// this.message = "";
					// this.$store.chat.replyTo = null;
				}
				// this.loading = false;
			}catch(error) {
				console.log(error);
				this.error = true;
			}
		}

		if(noticeId && noticeMessage) {
			const notice:TwitchatDataTypes.MessageNoticeData = {
				id:Utils.getUUID(),
				date:Date.now(),
				type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
				platform:"twitchat",
				noticeId:noticeId,
				message:noticeMessage,
				channel_id:this.$store.stream.currentChatChannel.id,
			}
			sChat.addMessage(notice);
		}
	}

	/**
	 * Stop spamming fake messages
	 */
	public stopSpam():void {
		MessengerProxy.instance.stopSpam();
	}

	/**
	 * Toggle secret cypher keyboard
	 */
	public toggleCypher():void {
		this.$store.main.setCypherEnabled(!this.$store.main.cypherEnabled);
	}

	/**
	 * Start the mergency mode
	 */
	public toggleEmergencyMode():void {
		if(!this.$store.emergency.emergencyStarted) {
			this.$confirm(this.$t("emergency.enable_confirm")).then(()=>{
				this.$store.emergency.setEmergencyMode(true);
			}).catch(()=>{});
		}else{
			this.$store.emergency.setEmergencyMode(false);
		}
	}

	/**
	 * Start the voice bot
	 */
	public toggleVoiceBot():void {
		if(VoiceController.instance.started) {
			VoiceController.instance.stop();
		}else{
			VoiceController.instance.start(false);
		}
	}

	/**
	 * Remove the currently highlighted message
	 */
	public removeChatHighlight():void {
		this.$store.chat.highlightChatMessageOverlay();
	}

	/**
	 * Called when selecting an emote/user/cmd from the emote selector
	 * or the auto complete selector
	 */
	public async onSelectItem(item:string):Promise<void> {
		const input = this.$refs.input as HTMLInputElement;
		let caretPos = input.selectionStart;
		let localMessage = this.message;
		if(!caretPos) caretPos = 1;
		caretPos --;

		//If it's a command and it has no parameter, submit it right away
		if(item.indexOf("/") === 0 && item.indexOf("{") == -1) {
			this.message = item;
			this.autoCompleteSearch = "";
			this.sendMessage();
			return;
		}

		if(this.autoCompleteSearch) {
			for (let i = caretPos; i >= 0; i--) {
				const currentChar = localMessage.charAt(i);
				if(currentChar == ":" ||
				currentChar == "@" ||
				/\s/gi.test(currentChar) || i == 0) {
					const offset = currentChar == ":" || currentChar == "@"? 1 : 0;
					let prefix = localMessage.substring(0, i-offset);
					const suffix = localMessage.substring(i+1+this.autoCompleteSearch.length)+" ";
					if(prefix) prefix += " ";
					localMessage = prefix + item + suffix;
					caretPos = prefix.length + item.length + 1;
					break;
				}
			}
			this.autoCompleteSearch = "";
		}else{
			const prefix = caretPos == 0 || /\s/gi.test(localMessage.charAt(caretPos))? "" : " ";
			const suffix = caretPos == localMessage.length || /\s/gi.test(localMessage.charAt(caretPos+1))? "" : " ";
			const code = prefix + item + suffix;
			localMessage = localMessage.substring(0, caretPos+1) + code + localMessage.substring(caretPos+1);
			caretPos += code.length+1;
		}

		if(/\{.*?\}/gi.test(item)) {
			localMessage = localMessage.replace(/{(.*?)\}/gi, "$1");
		}
		this.message = localMessage;

		await this.$nextTick();

		//Pre select commands placeholder
		if(/\{.*?\}/gi.test(item)) {
			input.setSelectionRange(item.indexOf("{"), item.indexOf("}"), "forward");
		}else{
			input.setSelectionRange(caretPos, caretPos, "forward");
			input.focus();
		}

		//Force autocomplete close.
		//Due to async rendering the watcher might detect search update before
		//the selectionRange is effective wich may cause the autocomplete open
		//Here we ensure it stays closed
		this.autoCompleteSearch = "";
	}

	/**
	 * Called when pressing any key
	 */
	public onKeyDown(e:KeyboardEvent):void {
		if(e.shiftKey) return;//Avoid blocking browser tab navigation
		if(e.ctrlKey) return;//Avoid blocking browser tab navigation
		//Avoid leaving the input form
		if(e.key == "Tab") e.preventDefault();

		if(!this.openAutoComplete) {
			//Navigate through sent message history
			if(e.key == "ArrowUp" || e.key == "ArrowDown") {
				this.sendHistoryIndex += e.key == "ArrowUp"? -1 : 1;
				this.sendHistoryIndex = Math.min(this.sendHistory.length, Math.max(0, this.sendHistoryIndex));
				if(this.sendHistoryIndex >= this.sendHistory.length) this.message = "";
				else this.message = this.sendHistory[this.sendHistoryIndex];
			}
		}
		if(e.key == "ArrowUp" || e.key == "ArrowDown") e.preventDefault();
	}

	/**
	 * Called when pressing tab key on input field
	 */
	public onTab(e:KeyboardEvent):void {
		const input = this.$refs.input as HTMLInputElement;
		let carretPos = input.selectionStart as number;
		let i = carretPos - 1;
		for (; i > -1; i--) {
			const c = this.message.charAt(i);
			if(/\s/gi.test(c)) break;
		}
		const len = carretPos - i;
		if(len > 2) {
			if(!this.openAutoComplete) {
				//Avoid closing the auto complete list right away now that
				//we can submit it with the tab key
				e.stopPropagation();
			}
			this.autoCompleteUsers = true;
			this.autoCompleteEmotes = true;
			this.autoCompleteCommands = true;
			this.autoCompleteSearch = this.message.substring(i+1, carretPos);
		}
		// e.preventDefault();
	}

	/**
	 * Interrupts the TTS
	 */
	public stopTTS(all:boolean):void {
		TTSUtils.instance.stop(all);
	}

	/**
	 * Reset current voice effect
	 */
	public resetVoiceEffect():void {
		VoicemodWebSocket.instance.disableVoiceEffect();
	}

	/**
	 * Open a user's card
	 */
	public openUserCard(user:TwitchatDataTypes.TwitchatUser, channel_id:string):void {
		this.$store.users.openUserCard(user, channel_id);
	}

	/**
	 * Called when clicking a pinnable menu item
	 */
	public onClickMenuItem(item:typeof TwitchatDataTypes.PinnableMenuItems[number]):void {
		if(item.isModal) {
			this.$store.params.openModal(item.modalId);
		}else if(item.id=="clearChat"){
			if(!TwitchUtils.hasScopes([TwitchScopes.DELETE_MESSAGES])) {
				this.$store.auth.requestTwitchScopes([TwitchScopes.DELETE_MESSAGES]);
			}else{
				this.$confirm(this.$t("params.clearChat_confirm_title"), this.$t("params.clearChat_confirm_desc"))
				.then(()=>{
					TwitchUtils.deleteMessages(this.$store.auth.twitch.user.id);
				}).catch(()=>{});
			}
		}else if(item.modelValueName) {
			this.$emit("update:"+item.modelValueName, true)
		}
	}

	/**
	 * Called when ending credits overlay is detected
	 */
	private onCreditsOverlayPresence():void {
		this.creditsOverlayRunning = true;
		clearTimeout(this.creditsOverlayPresenceHandlerTimeout);
		this.creditsOverlayPresenceHandlerTimeout = window.setTimeout(()=>{
			this.creditsOverlayRunning = false;
		}, 25000);
	}

	/**
	 * Called when updating the tracking state of a user
	 */
	private onUpdateTrackedUserList():void {
		const res = [];
		for (let i = 0; i < this.$store.users.users.length; i++) {
			const u = this.$store.users.users[i];
			if(u.is_tracked) res.push(u);
		}
		this.trackedUserCount = res.length;
	}

}
export default toNative(ChatForm);
</script>

<style scoped lang="less">
.chatform{
	display: flex;
	flex-direction: row;
	margin: auto;
	position: relative;
	opacity: 1;
	z-index: 2;
	transition: opacity .25s;
	color: var(--color-text);

	&.loading {
		opacity: .5;
		pointer-events: none;
	}

	&.cypherMode {
		.holder {
			background-image: repeating-linear-gradient(-45deg, #00000020, #00000020 20px, #ffffff10 20px, #ffffff10 40px);
		}
	}
	&.emergencyMode {
		.holder {
			background-color: var(--color-alert);
			.inputForm {
				.inputHolder {
					.replyTo, .announcement {
						background-color: var(--color-alert);
					}
				}
			}
		}
	}

	.holder {
		position: absolute;
		width: 100%;
		display: flex;
		flex-direction: row;
		position: relative;
		z-index: 2;
		box-shadow: 0px -2px 2px 0px rgba(0,0,0,.5);
		background-color: var(--background-color-secondary);
		padding: .25em;

		.sortableItems {
			display: flex;
			flex-direction: row;
			align-self: center;
		}

		.inputForm {
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: center;
			flex-wrap: wrap;
			flex-grow: 1;

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
						background:transparent;
					}
					.actions {
						display: flex;
						flex-direction: row;
						align-items: center;
						z-index: 1;
						.chanSwitcher {
							margin: .15em;
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
						transition: background-color .1s;
						&:hover {
							background-color: var(--color-alert-fade);
						}
						.icon {
							height: 1em;
							vertical-align: middle;
							margin-right: .5em;
						}
					}

					&.modAction {
						background-color: var(--color-text-inverse) !important;
						@c1: #00a86520;
						@c2: #00a86530;
						background-image: repeating-linear-gradient(-45deg, @c1, @c1 20px, @c2 20px, @c2 40px);
					}
				}

				.replyTo, .announcement {
					top: -.25em;
					width:100%;
					position: absolute;
					transform: translateY(-100%);
					background-color: var(--background-color-secondary);
					color: var(--color-text);
					border-top-left-radius: .5em;
					border-top-right-radius: .5em;
					box-shadow: 0 -5px 5px rgba(0,0,0,.5);
					display: flex;
					flex-direction: row;
					align-items: center;
					.closeBt{
						padding: .35em;
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
						padding: .5em;
						padding-left: 0;
						font-size: .7em;
						white-space: nowrap;
						overflow: hidden;
						text-overflow: ellipsis;
						.head {
							font-weight: bold;
						}
						.message {
							opacity: .8;
							margin-left: .25em;
							line-height: 1.25em;
						}
					}
					&.announcement {
						border: 1px dashed var(--color-secondary);
						border-bottom: none;
						padding: 1em;
						.closeBt{
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
								margin-bottom: .5em;
								padding-bottom: .5em;
								border-bottom: 5px solid var(--color-secondary);
								width: fit-content;
								.icon {
									height: 1em;
									margin-right: .5em;
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
				padding: .35em;
				margin-left: .5em;
			}

			.blink-enter-active {
				transition: background-color .7s linear;
				animation: fadeInOut 4s ease-in-out;
			}

			.blink-leave-active {
				transition: all .25s;
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
				0%, 10%, 20%, 30%, 40%, 50%, 60%, 70%, 80%, 90%, 100% {
					transform: scale(1);
				}
				5%, 15%, 25%, 35%, 45%, 55%, 65%, 75%, 85%, 95% {
					transform: scale(2);
				}
			}

			.viewCount {
				cursor: pointer;
				gap: .25em;
				display: flex;
				flex-direction: row;
				align-items: center;
				white-space: nowrap;
				color: var(--color-text);
				background-color: var(--background-color-fader);

				border-radius: .5em;
				font-size: .9em;
				font-family: var(--font-roboto);
				padding: .35em;
				.icon {
					height: 1em;
					margin-right: .25em;
				}
				.censor {
					filter: blur(3px)
				}
			}

			.error {
				background: var(--color-alert);
				height: 2em;
				width: 2em;
				align-items: stretch;
				padding: .25em;
				border-radius: .5em;
				display: flex;
				align-items: center;
				justify-content: center;
				:deep(.icon) {
					vertical-align: middle;
					width: unset;
					color:#fff;
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
			padding: .25em;
			width: 2em;
			height: 2em;
			transform: translate(0, 0);
			transition: transform .25s;
			margin-top: .25em;
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
			:deep(.icon){
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
		transition: all .35s;

		&.slide-enter-from,
		&.slide-leave-to {
			transform: translate(-50%, 0);
		}
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
			margin-right: .25em;
		}
		.censor {
			filter: blur(3px)
		}
	}
}

@media only screen and (max-width: 600px) {
	.chatform{
		.holder {
			flex-wrap: wrap;
			justify-content: center;
			.leftForm {
				order:2;
			}
			.inputForm {
				order:1;
				flex-grow: 1;
				width: 100%;
			}
			.rightForm {
				order:3;
			}
		}
	}
}
</style>
