<template>
	<div class="holder">
		<img v-if="messageData.channelSource?.pic && $store.params.appearance.multiChatAvatar.value === true"
			class="avatar"
			:style="{color:messageData.channelSource.color+'99'}"
			v-tooltip="messageData.channelSource.name"
			:src="messageData.channelSource.pic" />

		<template v-else-if="messageData.channelSource">
			<span class="border"
				:style="{color:messageData.channelSource.color+'99'}"></span>

			<span class="side"
				v-tooltip="messageData.channelSource.name"
				:style="{color:messageData.channelSource.color}"></span>
		</template>

		<ChatAd class="message"
			v-if="messageData.type == 'twitchat_ad'"
			:messageData="messageData"
			@showModal="(v: string) => $emit('showModal', v)"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatJoinLeave class="message"
			v-else-if="(messageData.type == 'join' || messageData.type == 'leave')"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatFollow class="message"
			v-else-if="messageData.type == 'following'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatRaid class="message"
			v-else-if="messageData.type == 'raid'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatConnect class="message"
			v-else-if="(messageData.type == 'connect' || messageData.type == 'disconnect')"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatMessage class="message"
			v-else-if="messageData.type == 'message' || messageData.type == 'whisper'"
			:messageData="messageData"
			@onOverMessage="$emit('onOverMessage', $event)"
			@showConversation="$emit('showConversation', $event)"
			@showUserMessages="$emit('showUserMessages', $event)"
			@unscheduleMessageOpen="$emit('unscheduleMessageOpen', $event)"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
			:disableConversation="disableConversation"
		/>

		<ChatNotice class="message"
			v-else-if="messageData.type == 'notice'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatPollResult class="message"
			v-else-if="messageData.type == 'poll'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatPredictionResult class="message"
			v-else-if="messageData.type == 'prediction'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatBingoResult class="message"
			v-else-if="messageData.type == 'bingo'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatRaffleResult class="message"
			v-else-if="messageData.type == 'raffle'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatCountdownResult class="message"
			v-else-if="messageData.type == 'countdown'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatTimerResult class="message"
			v-else-if="messageData.type == 'timer'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatHypeTrainCooldown class="message"
			v-else-if="messageData.type == 'hype_train_cooled_down'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatHypeTrainResult class="message"
			v-else-if="messageData.type == 'hype_train_summary'"
			:messageData="messageData"
			@setCustomActivities="$emit('setCustomActivities', $event)"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatFollowbotEvents class="message"
			v-else-if="messageData.type == 'followbot_list'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatRoomSettings class="message"
			v-else-if="messageData.type == 'room_settings'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatClear class="message"
			v-else-if="messageData.type == 'clear_chat'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatShoutout class="message"
			v-else-if="messageData.type == 'shoutout'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatLowTrustTreatment class="message"
			v-else-if="messageData.type == 'low_trust_treatment'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatPinNotice class="message"
			v-else-if="messageData.type == 'pinned' || messageData.type == 'unpinned'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatBan class="message"
			v-else-if="messageData.type == 'ban' || messageData.type == 'youtube_ban'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatUnban class="message"
			v-else-if="messageData.type == 'unban'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatStreamOnOff class="message"
			v-else-if="messageData.type == 'stream_online' || messageData.type == 'stream_offline'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatMessageClipPending class="message"
			v-else-if="messageData.type == 'clip_pending_publication'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatScopeRequester class="message"
			v-else-if="messageData.type == 'scope_request'"
			:messageData="messageData"
			@openFilters="(v: string) => $emit('openFilters')"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatCommunityBoost class="message"
			v-else-if="messageData.type == 'community_boost_complete'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatBits class="message"
			v-else-if="messageData.type == 'cheer'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatSubscription class="message"
			v-else-if="messageData.type == 'subscription'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatReward class="message"
			v-else-if="messageData.type == 'reward'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatCommunityChallengeContribution class="message"
			v-else-if="messageData.type == 'community_challenge_contribution'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatAutobanJoin class="message"
			v-else-if="messageData.type == 'autoban_join'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatWatchStreak class="message"
			v-else-if="messageData.type == 'user_watch_streak'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatHypeChatMessage class="message"
			v-else-if="messageData.type == 'hype_chat'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatAdBreakStarted class="message"
			v-else-if="messageData.type == 'ad_break_start_chat'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatHistorySplitter class="message"
			v-else-if="messageData.type == 'history_splitter'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatTrackAddedToQueue class="message"
			v-else-if="messageData.type == 'music_added_to_queue'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatTrackStart class="message"
			v-else-if="messageData.type == 'music_start'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatCustomMessage class="message"
			v-else-if="messageData.type == 'custom'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatStreamlabsEvent class="message"
			v-else-if="messageData.type == 'streamlabs'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatStreamelementsEvent class="message"
			v-else-if="messageData.type == 'streamelements'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatKofiEvent class="message"
			v-else-if="messageData.type == 'kofi'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatTipeeeEvent class="message"
			v-else-if="messageData.type == 'tipeee'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatTiltifyEvent class="message"
			v-else-if="messageData.type == 'tiltify'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatPatreonEvent class="message"
			v-else-if="messageData.type == 'patreon'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatUnbanRequest class="message"
			v-else-if="messageData.type == 'unban_request'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatCelebration class="message"
			v-else-if="messageData.type == 'twitch_celebration'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatGiantEmote class="message"
			v-else-if="messageData.type == 'gigantified_emote'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatAutomodTermsUpdate class="message"
			v-else-if="messageData.type == 'blocked_terms'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatHateRaid class="message"
			v-else-if="messageData.type == 'hate_raid'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatWarnUser class="message"
			v-else-if="messageData.type == 'warn_chatter'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatWarnAcknowledgment class="message"
			v-else-if="messageData.type == 'warn_acknowledge'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatYoutubeSuperChat class="message"
			v-else-if="messageData.type == 'super_chat'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatYoutubeSuperSticker class="message"
			v-else-if="messageData.type == 'super_sticker'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatYoutubeSubscription class="message"
			v-else-if="messageData.type == 'youtube_subscription'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatYoutubeSubgift class="message"
			v-else-if="messageData.type == 'youtube_subgift'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatTikTokSub class="message"
			v-else-if="messageData.type == 'tiktok_sub'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatTikTokGift class="message"
			v-else-if="messageData.type == 'tiktok_gift'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatTikTokLike class="message"
			v-else-if="messageData.type == 'tiktok_like'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatTikTokShare class="message"
			v-else-if="messageData.type == 'tiktok_share'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatSuspendedTriggerStack class="message"
			v-else-if="messageData.type == 'suspended_trigger_stack'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatTwitchCharityDonation class="message"
			v-else-if="messageData.type == 'twitch_charity_donation'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>

		<ChatPrivateModerator class="message"
			v-else-if="messageData.type == 'private_mod_message'"
			:messageData="messageData"
			@showConversation="$emit('showConversation', $event)"
			@showUserMessages="$emit('showUserMessages', $event)"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
		/>
	</div>
</template>

<script lang="ts">
import ChatMessage from '@/components/messages/ChatMessage.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';
import ChatAd from './ChatAd.vue';
import ChatAutobanJoin from './ChatAutobanJoin.vue';
import ChatBan from './ChatBan.vue';
import ChatBingoResult from './ChatBingoResult.vue';
import ChatBits from './ChatBits.vue';
import ChatClear from './ChatClear.vue';
import ChatCommunityBoost from './ChatCommunityBoost.vue';
import ChatCommunityChallengeContribution from './ChatCommunityChallengeContribution.vue';
import ChatConnect from './ChatConnect.vue';
import ChatCountdownResult from './ChatCountdownResult.vue';
import ChatFollow from './ChatFollow.vue';
import ChatFollowbotEvents from './ChatFollowbotEvents.vue';
import ChatHypeTrainCooldown from './ChatHypeTrainCooldown.vue';
import ChatHypeTrainResult from './ChatHypeTrainResult.vue';
import ChatJoinLeave from './ChatJoinLeave.vue';
import ChatLowTrustTreatment from './ChatLowTrustTreatment.vue';
import ChatMessageClipPending from './ChatMessageClipPending.vue';
import ChatNotice from './ChatNotice.vue';
import ChatPinNotice from './ChatPinNotice.vue';
import ChatPollResult from './ChatPollResult.vue';
import ChatPredictionResult from './ChatPredictionResult.vue';
import ChatRaffleResult from './ChatRaffleResult.vue';
import ChatRaid from './ChatRaid.vue';
import ChatReward from './ChatReward.vue';
import ChatRoomSettings from './ChatRoomSettings.vue';
import ChatScopeRequester from './ChatScopeRequester.vue';
import ChatShoutout from './ChatShoutout.vue';
import ChatStreamOnOff from './ChatStreamOnOff.vue';
import ChatSubscription from './ChatSubscription.vue';
import ChatTimerResult from './ChatTimerResult.vue';
import ChatUnban from './ChatUnban.vue';
import ChatWatchStreak from './ChatWatchStreak.vue';
import ChatHypeChatMessage from './ChatHypeChatMessage.vue';
import ChatHistorySplitter from './ChatHistorySplitter.vue';
import ChatTrackAddedToQueue from './ChatTrackAddedToQueue.vue';
import ChatAdBreakStarted from './ChatAdBreakStarted.vue';
import ChatCustomMessage from './ChatCustomMessage.vue';
import ChatStreamlabsEvent from './ChatStreamlabsEvent.vue';
import ChatKofiEvent from './ChatKofiEvent.vue';
import ChatStreamelementsEvent from './ChatStreamelementsEvent.vue';
import ChatUnbanRequest from './ChatUnbanRequest.vue';
import ChatTipeeeEvent from './ChatTipeeeEvent.vue';
import ChatTrackStart from './ChatTrackStart.vue';
import ChatCelebration from './ChatCelebration.vue';
import ChatGiantEmote from './ChatGiantEmote.vue';
import ChatAutomodTermsUpdate from './ChatAutomodTermsUpdate.vue';
import ChatHateRaid from './ChatHateRaid.vue';
import ChatWarnUser from './ChatWarnUser.vue';
import ChatWarnAcknowledgment from './ChatWarnAcknowledgment.vue';
import ChatYoutubeSuperChat from './ChatYoutubeSuperChat.vue';
import ChatYoutubeSuperSticker from './ChatYoutubeSuperSticker.vue';
import ChatYoutubeSubscription from './ChatYoutubeSubscription.vue';
import ChatYoutubeSubgift from './ChatYoutubeSubgift.vue';
import ChatTiltifyEvent from './ChatTiltifyEvent.vue';
import ChatPatreonEvent from './ChatPatreonEvent.vue';
import ChatTikTokSub from './ChatTikTokSub.vue';
import ChatTikTokGift from './ChatTikTokGift.vue';
import ChatTikTokLike from './ChatTikTokLike.vue';
import ChatTikTokShare from './ChatTikTokShare.vue';
import ChatSuspendedTriggerStack from './ChatSuspendedTriggerStack.vue';
import ChatTwitchCharityDonation from './ChatTwitchCharityDonation.vue';
import ChatPrivateModerator from './ChatPrivateModerator.vue';

@Component({
	name:"MessageItem",
	components:{
		ChatAd,
		ChatBan,
		ChatRaid,
		ChatBits,
		ChatUnban,
		ChatClear,
		ChatFollow,
		ChatReward,
		ChatNotice,
		ChatConnect,
		ChatMessage,
		ChatWarnUser,
		ChatShoutout,
		ChatHateRaid,
		ChatKofiEvent,
		ChatTikTokSub,
		ChatTikTokGift,
		ChatTikTokLike,
		ChatTikTokShare,
		ChatPinNotice,
		ChatJoinLeave,
		ChatTrackStart,
		ChatPollResult,
		ChatGiantEmote,
		ChatTipeeeEvent,
		ChatStreamOnOff,
		ChatBingoResult,
		ChatWatchStreak,
		ChatCelebration,
		ChatTimerResult,
		ChatAutobanJoin,
		ChatTiltifyEvent,
		ChatUnbanRequest,
		ChatRoomSettings,
		ChatPatreonEvent,
		ChatRaffleResult,
		ChatSubscription,
		ChatCustomMessage,
		ChatYoutubeSubgift,
		ChatAdBreakStarted,
		ChatCommunityBoost,
		ChatScopeRequester,
		ChatHistorySplitter,
		ChatStreamlabsEvent,
		ChatFollowbotEvents,
		ChatHypeTrainResult,
		ChatCountdownResult,
		ChatHypeChatMessage,
		ChatPrivateModerator,
		ChatPredictionResult,
		ChatYoutubeSuperChat,
		ChatTrackAddedToQueue,
		ChatHypeTrainCooldown,
		ChatLowTrustTreatment,
		ChatAutomodTermsUpdate,
		ChatMessageClipPending,
		ChatWarnAcknowledgment,
		ChatYoutubeSubscription,
		ChatStreamelementsEvent,
		ChatYoutubeSuperSticker,
		ChatSuspendedTriggerStack,
		ChatTwitchCharityDonation,
		ChatCommunityChallengeContribution,
	},
	emits:["onRead", "showConversation", "showUserMessages", "unscheduleMessageOpen", "setCustomActivities", "showModal", "openFilters", "onOverMessage"],
})
class MessageItem extends Vue {

	@Prop()
	public messageData!:TwitchatDataTypes.ChatMessageTypes;

	@Prop()
	public colIndex!:number;

	@Prop()
	public lightMode!:boolean;

	@Prop()
	public disableConversation!:boolean;

	@Prop({default:[]})
	public childrenList!:TwitchatDataTypes.ChatMessageTypes[];

}
export default toNative(MessageItem);
</script>
<style scoped lang="less">
.holder{
	position: relative;
	display: flex;
	flex-direction: row;
	justify-content: stretch;
	width: 100%;
	.border {
		position: absolute;
		width: 65%;
		height: 100%;
		flex-shrink: 0;
		flex-grow: 0;
		opacity: .35;
		background-image: linear-gradient(to right, currentColor 0%, transparent 100%);
		z-index: -1;
	}
	.side {
		width: 5px;
		opacity: .35;
		background-color: currentColor;
	}
	.avatar {
		border-radius: 50%;
		height: 1.5em;
		align-self: center;
		outline: 1px solid currentColor;
		padding: 1px;
	}
	.message {
		width: 100%;
	}
}
</style>
