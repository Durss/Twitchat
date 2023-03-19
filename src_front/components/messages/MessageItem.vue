<template>
	<ChatAd class="message"
		v-if="messageData.type == 'twitchat_ad'"
		@showModal="(v: string) => $emit('showModal', v)"
		:messageData="messageData" />

	<ChatJoinLeave class="message"
		v-else-if="(messageData.type == 'join' || messageData.type == 'leave')"
		:messageData="messageData" />

	<ChatFollow class="message"
		v-else-if="messageData.type == 'following'"
		@onRead="$emit('markRead')"
		:messageData="messageData" />

	<ChatRaid class="message"
		v-else-if="messageData.type == 'raid'"
		@onRead="$emit('markRead')"
		:messageData="messageData" />

	<ChatConnect class="message"
		v-else-if="(messageData.type == 'connect' || messageData.type == 'disconnect')"
		@onRead="$emit('markRead')"
		:messageData="messageData" />

	<ChatMessage class="message"
		v-else-if="messageData.type == 'message' || messageData.type == 'whisper'"
		@onRead="$emit('markRead')"
		:messageData="messageData" />

	<ChatNotice class="message"
		v-else-if="messageData.type == 'notice'" 
		@onRead="$emit('markRead')"
		:messageData="messageData" />

	<ChatPollResult class="message"
		v-else-if="messageData.type == 'poll'"
		@onRead="$emit('markRead')"
		:messageData="messageData" />

	<ChatPredictionResult class="message"
		v-else-if="messageData.type == 'prediction'"
		@onRead="$emit('markRead')"
		:messageData="messageData" />

	<ChatBingoResult class="message"
		v-else-if="messageData.type == 'bingo'"
		@onRead="$emit('markRead')"
		:messageData="messageData" />

	<ChatRaffleResult class="message"
		v-else-if="messageData.type == 'raffle'"
		@onRead="$emit('markRead')"
		:messageData="messageData" />

	<ChatCountdownResult class="message"
		v-else-if="messageData.type == 'countdown'"
		@onRead="$emit('markRead')"
		:messageData="messageData" />

	<ChatTimerResult class="message"
		v-else-if="messageData.type == 'timer'"
		@onRead="$emit('markRead')"
		:messageData="messageData" />

	<ChatHypeTrainCooldown class="message"
		v-else-if="messageData.type == 'hype_train_cooled_down'"
		@onRead="$emit('markRead')"
		:messageData="messageData" />

	<ChatHypeTrainResult class="message"
		v-else-if="messageData.type == 'hype_train_summary'"
		@onRead="$emit('markRead')"
		:messageData="messageData" />

	<ChatFollowbotEvents class="message"
		v-else-if="messageData.type == 'followbot_list'"
		@onRead="$emit('markRead')"
		:messageData="messageData" />

	<ChatRoomSettings class="message"
		v-else-if="messageData.type == 'room_settings'"
		@onRead="$emit('markRead')"
		:messageData="messageData" />

	<ChatClear class="message"
		v-else-if="messageData.type == 'clear_chat'"
		@onRead="$emit('markRead')"
		:messageData="messageData" />

	<ChatShoutout class="message"
		v-else-if="messageData.type == 'shoutout'"
		@onRead="$emit('markRead')"
		:messageData="messageData" />

	<ChatLowTrustTreatment class="message"
		v-else-if="messageData.type == 'low_trust_treatment'"
		@onRead="$emit('markRead')"
		:messageData="messageData" />

	<ChatPinNotice class="message"
		v-else-if="messageData.type == 'pinned' || messageData.type == 'unpinned'"
		@onRead="$emit('markRead')"
		:messageData="messageData" />

	<ChatBan class="message"
		v-else-if="messageData.type == 'ban'"
		@onRead="$emit('markRead')"
		:messageData="messageData" />

	<ChatUnban class="message"
		v-else-if="messageData.type == 'unban'"
		@onRead="$emit('markRead')"
		:messageData="messageData" />

	<ChatStreamOnOff class="message"
		v-else-if="messageData.type == 'stream_online' || messageData.type == 'stream_offline'"
		@onRead="$emit('markRead')"
		:messageData="messageData" />

	<ChatMessageClipPending class="message"
		v-else-if="messageData.type == 'clip_pending_publication'"
		@onRead="$emit('markRead')"
		:messageData="messageData" />

	<ChatScopeRequester class="message"
		v-else-if="messageData.type == 'scope_request'"
		@onRead="$emit('markRead')"
		:messageData="messageData" />

	<ChatCommunityBoost class="message"
		v-else-if="messageData.type == 'community_boost_complete'"
		@onRead="$emit('markRead')"
		:messageData="messageData" />

	<ChatBits class="message"
		v-else-if="messageData.type == 'cheer'"
		@onRead="$emit('markRead')"
		:messageData="messageData" />

	<ChatSubscription class="message"
		v-else-if="messageData.type == 'subscription'"
		@onRead="$emit('markRead')"
		:messageData="messageData" />

	<ChatReward class="message"
		v-else-if="messageData.type == 'reward'"
		@onRead="$emit('markRead')"
		:messageData="messageData" />

	<ChatCommunityChallengeContribution class="message"
		v-else-if="messageData.type == 'community_challenge_contribution'"
		@onRead="$emit('markRead')"
		:messageData="messageData" />

	<ChatAutobanJoin class="message"
		v-else-if="messageData.type == 'autoban_join'"
		@onRead="$emit('markRead')"
		:messageData="messageData" />
</template>

<script lang="ts">
import ChatMessage from '@/components/messages/ChatMessage.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import Button from '../Button.vue';
import ChatAd from './ChatAd.vue';
import ChatBan from './ChatBan.vue';
import ChatBingoResult from './ChatBingoResult.vue';
import ChatClear from './ChatClear.vue';
import ChatConnect from './ChatConnect.vue';
import ChatCountdownResult from './ChatCountdownResult.vue';
import ChatFollow from './ChatFollow.vue';
import ChatFollowbotEvents from './ChatFollowbotEvents.vue';
import ChatHypeTrainResult from './ChatHypeTrainResult.vue';
import ChatHypeTrainCooldown from './ChatHypeTrainCooldown.vue';
import ChatJoinLeave from './ChatJoinLeave.vue';
import ChatLowTrustTreatment from './ChatLowTrustTreatment.vue';
import ChatMessageClipPending from './ChatMessageClipPending.vue';
import ChatNotice from './ChatNotice.vue';
import ChatPinNotice from './ChatPinNotice.vue';
import ChatPollResult from './ChatPollResult.vue';
import ChatPredictionResult from './ChatPredictionResult.vue';
import ChatRaffleResult from './ChatRaffleResult.vue';
import ChatRaid from './ChatRaid.vue';
import ChatRoomSettings from './ChatRoomSettings.vue';
import ChatScopeRequester from './ChatScopeRequester.vue';
import ChatShoutout from './ChatShoutout.vue';
import ChatStreamOnOff from './ChatStreamOnOff.vue';
import ChatTimerResult from './ChatTimerResult.vue';
import ChatUnban from './ChatUnban.vue';
import ChatCommunityBoost from './ChatCommunityBoost.vue';
import ChatBits from './ChatBits.vue';
import ChatSubscription from './ChatSubscription.vue';
import ChatReward from './ChatReward.vue';
import ChatCommunityChallengeContribution from './ChatCommunityChallengeContribution.vue';
import ChatAutobanJoin from './ChatAutobanJoin.vue';

@Component({
	components:{
		Button,
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
		ChatTimerResult,
		ChatAutobanJoin,
		ChatRoomSettings,
		ChatRaffleResult,
		ChatSubscription,
		ChatCommunityBoost,
		ChatScopeRequester,
		ChatFollowbotEvents,
		ChatHypeTrainResult,
		ChatCountdownResult,
		ChatPredictionResult,
		ChatHypeTrainCooldown,
		ChatLowTrustTreatment,
		ChatMessageClipPending,
		ChatCommunityChallengeContribution,
	},
	emits:["showModal","markRead"],
})
export default class MessageItem extends Vue {

	@Prop
	public messageData!:TwitchatDataTypes.ChatMessageTypes;

}
</script>