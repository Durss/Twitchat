<template>
	<ChatAd class="message"
		v-if="messageData.type == 'twitchat_ad'"
		@showModal="(v: string) => $emit('showModal', v)"
		:messageData="messageData" />

	<ChatJoinLeave class="message"
		v-else-if="(messageData.type == 'join' || messageData.type == 'leave')"
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

	<ChatHighlight v-else class="message"
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
import ChatFollowbotEvents from './ChatFollowbotEvents.vue';
import ChatHighlight from './ChatHighlight.vue';
import ChatHypeTrainResult from './ChatHypeTrainResult.vue';
import ChatJoinLeave from './ChatJoinLeave.vue';
import ChatLowTrustTreatment from './ChatLowTrustTreatment.vue';
import ChatMessageClipPending from './ChatMessageClipPending.vue';
import ChatNotice from './ChatNotice.vue';
import ChatPinNotice from './ChatPinNotice.vue';
import ChatPollResult from './ChatPollResult.vue';
import ChatPredictionResult from './ChatPredictionResult.vue';
import ChatRaffleResult from './ChatRaffleResult.vue';
import ChatRoomSettings from './ChatRoomSettings.vue';
import ChatScopeRequester from './ChatScopeRequester.vue';
import ChatShoutout from './ChatShoutout.vue';
import ChatStreamOnOff from './ChatStreamOnOff.vue';
import ChatTimerResult from './ChatTimerResult.vue';
import ChatUnban from './ChatUnban.vue';
import ChatMessageHoverActions from './components/ChatMessageHoverActions.vue';

@Component({
	components:{
		Button,
		ChatAd,
		ChatBan,
		ChatUnban,
		ChatClear,
		ChatNotice,
		ChatConnect,
		ChatMessage,
		ChatShoutout,
		ChatPinNotice,
		ChatHighlight,
		ChatJoinLeave,
		ChatPollResult,
		ChatStreamOnOff,
		ChatBingoResult,
		ChatTimerResult,
		ChatRoomSettings,
		ChatRaffleResult,
		ChatScopeRequester,
		ChatFollowbotEvents,
		ChatHypeTrainResult,
		ChatCountdownResult,
		ChatPredictionResult,
		ChatLowTrustTreatment,
		ChatMessageClipPending,
		ChatMessageHoverActions,
	},
	emits:["showModal","markRead"],
})
export default class MessageItem extends Vue {

	@Prop
	public messageData!:TwitchatDataTypes.ChatMessageTypes;

}
</script>

<style scoped lang="less">
.messageitem{
	
}
</style>