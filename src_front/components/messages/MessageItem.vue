<template>
	<ChatAd class="message"
		v-if="messageData.type == 'twitchat_ad'"
		:messageData="messageData" />

	<ChatJoinLeave class="message"
		v-else-if="(messageData.type == 'join' || messageData.type == 'leave')"
		:messageData="messageData" />

	<ChatFollow class="message"
		v-else-if="messageData.type == 'following'"
		:messageData="messageData" />

	<ChatRaid class="message"
		v-else-if="messageData.type == 'raid'"
		:messageData="messageData" />

	<ChatConnect class="message"
		v-else-if="(messageData.type == 'connect' || messageData.type == 'disconnect')"
		:messageData="messageData" />

	<ChatMessage class="message"
		v-else-if="messageData.type == 'message' || messageData.type == 'whisper'"
		:messageData="messageData" />

	<ChatNotice class="message"
		v-else-if="messageData.type == 'notice'" 
		:messageData="messageData" />

	<ChatPollResult class="message"
		v-else-if="messageData.type == 'poll'"
		:messageData="messageData" />

	<ChatPredictionResult class="message"
		v-else-if="messageData.type == 'prediction'"
		:messageData="messageData" />

	<ChatBingoResult class="message"
		v-else-if="messageData.type == 'bingo'"
		:messageData="messageData" />

	<ChatRaffleResult class="message"
		v-else-if="messageData.type == 'raffle'"
		:messageData="messageData" />

	<ChatCountdownResult class="message"
		v-else-if="messageData.type == 'countdown'"
		:messageData="messageData" />

	<ChatTimerResult class="message"
		v-else-if="messageData.type == 'timer'"
		:messageData="messageData" />

	<ChatHypeTrainCooldown class="message"
		v-else-if="messageData.type == 'hype_train_cooled_down'"
		:messageData="messageData" />

	<ChatHypeTrainResult class="message"
		v-else-if="messageData.type == 'hype_train_summary'"
		:messageData="messageData" />

	<ChatFollowbotEvents class="message"
		v-else-if="messageData.type == 'followbot_list'"
		:messageData="messageData" />

	<ChatRoomSettings class="message"
		v-else-if="messageData.type == 'room_settings'"
		:messageData="messageData" />

	<ChatClear class="message"
		v-else-if="messageData.type == 'clear_chat'"
		:messageData="messageData" />

	<ChatShoutout class="message"
		v-else-if="messageData.type == 'shoutout'"
		:messageData="messageData" />

	<ChatLowTrustTreatment class="message"
		v-else-if="messageData.type == 'low_trust_treatment'"
		:messageData="messageData" />

	<ChatPinNotice class="message"
		v-else-if="messageData.type == 'pinned' || messageData.type == 'unpinned'"
		:messageData="messageData" />

	<ChatBan class="message"
		v-else-if="messageData.type == 'ban'"
		:messageData="messageData" />

	<ChatUnban class="message"
		v-else-if="messageData.type == 'unban'"
		:messageData="messageData" />

	<ChatStreamOnOff class="message"
		v-else-if="messageData.type == 'stream_online' || messageData.type == 'stream_offline'"
		:messageData="messageData" />

	<ChatMessageClipPending class="message"
		v-else-if="messageData.type == 'clip_pending_publication'"
		:messageData="messageData" />

	<ChatScopeRequester class="message"
		v-else-if="messageData.type == 'scope_request'"
		:messageData="messageData" />

	<ChatCommunityBoost class="message"
		v-else-if="messageData.type == 'community_boost_complete'"
		:messageData="messageData" />

	<ChatBits class="message"
		v-else-if="messageData.type == 'cheer'"
		:messageData="messageData" />

	<ChatSubscription class="message"
		v-else-if="messageData.type == 'subscription'"
		:messageData="messageData" />

	<ChatReward class="message"
		v-else-if="messageData.type == 'reward'"
		:messageData="messageData" />

	<ChatCommunityChallengeContribution class="message"
		v-else-if="messageData.type == 'community_challenge_contribution'"
		:messageData="messageData" />

	<ChatAutobanJoin class="message"
		v-else-if="messageData.type == 'autoban_join'"
		:messageData="messageData" />

	<ChatWatchStreak class="message"
		v-else-if="messageData.type == 'user_watch_streak'"
		:messageData="messageData" />

	<ChatHypeChatMessage class="message"
		v-else-if="messageData.type == 'hype_chat'"
		:messageData="messageData" />

	<ChatAdBreakStarted class="message"
		v-else-if="messageData.type == 'ad_break_start'"
		:messageData="messageData" />

	<ChatHistorySplitter class="message"
		v-else-if="messageData.type == 'history_splitter'"
		:messageData="messageData" />

	<ChatTrackAddedToQueue class="message"
		v-else-if="messageData.type == 'music_added_to_queue'"
		:messageData="messageData" />

	<ChatCustomMessage class="message"
		v-else-if="messageData.type == 'custom'"
		:messageData="messageData" />
</template>

<script lang="ts">
import ChatMessage from '@/components/messages/ChatMessage.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, Vue } from 'vue-facing-decorator';
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

@Component({
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
		ChatShoutout,
		ChatPinNotice,
		ChatJoinLeave,
		ChatPollResult,
		ChatStreamOnOff,
		ChatBingoResult,
		ChatWatchStreak,
		ChatTimerResult,
		ChatAutobanJoin,
		ChatRoomSettings,
		ChatRaffleResult,
		ChatSubscription,
		ChatCustomMessage,
		ChatAdBreakStarted,
		ChatCommunityBoost,
		ChatScopeRequester,
		ChatHistorySplitter,
		ChatFollowbotEvents,
		ChatHypeTrainResult,
		ChatCountdownResult,
		ChatHypeChatMessage,
		ChatPredictionResult,
		ChatTrackAddedToQueue,
		ChatHypeTrainCooldown,
		ChatLowTrustTreatment,
		ChatMessageClipPending,
		ChatCommunityChallengeContribution,
	},
	emits:[],
})
export default class MessageItem extends Vue {

	@Prop
	public messageData!:TwitchatDataTypes.ChatMessageTypes;

	@Prop
	declare children:TwitchatDataTypes.ChatMessageTypes[];

}
</script>
<style scoped lang="less">
.message{
	position: relative;
}
</style>