<template>
	<div class="holder">
		<img v-if="messageData.channel_pic && $store.params.appearance.multiChatAvatar.value === true" class="avatar" :src="messageData.channel_pic" />
		<span v-else-if="messageData.channel_color" class="border" :style="{color:messageData.channel_color}"></span>
		<ChatAd :class="classes"
			v-if="messageData.type == 'twitchat_ad'"
			:messageData="messageData"
			@showModal="(v: string) => $emit('showModal', v)"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatJoinLeave :class="classes"
			v-else-if="(messageData.type == 'join' || messageData.type == 'leave')"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatFollow :class="classes"
			v-else-if="messageData.type == 'following'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatRaid :class="classes"
			v-else-if="messageData.type == 'raid'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatConnect :class="classes"
			v-else-if="(messageData.type == 'connect' || messageData.type == 'disconnect')"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatMessage :class="classes"
			v-else-if="messageData.type == 'message' || messageData.type == 'whisper'"
			:messageData="messageData"
			@onOverMessage="$emit('onOverMessage', $event)"
			@showConversation="$emit('showConversation', $event)"
			@showUserMessages="$emit('showUserMessages', $event)"
			@unscheduleMessageOpen="$emit('unscheduleMessageOpen', $event)"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatNotice :class="classes"
			v-else-if="messageData.type == 'notice'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatPollResult :class="classes"
			v-else-if="messageData.type == 'poll'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatPredictionResult :class="classes"
			v-else-if="messageData.type == 'prediction'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatBingoResult :class="classes"
			v-else-if="messageData.type == 'bingo'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatRaffleResult :class="classes"
			v-else-if="messageData.type == 'raffle'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatCountdownResult :class="classes"
			v-else-if="messageData.type == 'countdown'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatTimerResult :class="classes"
			v-else-if="messageData.type == 'timer'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatHypeTrainCooldown :class="classes"
			v-else-if="messageData.type == 'hype_train_cooled_down'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatHypeTrainResult :class="classes"
			v-else-if="messageData.type == 'hype_train_summary'"
			:messageData="messageData"
			@setCustomActivities="$emit('setCustomActivities', $event)"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatFollowbotEvents :class="classes"
			v-else-if="messageData.type == 'followbot_list'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatRoomSettings :class="classes"
			v-else-if="messageData.type == 'room_settings'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatClear :class="classes"
			v-else-if="messageData.type == 'clear_chat'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatShoutout :class="classes"
			v-else-if="messageData.type == 'shoutout'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatLowTrustTreatment :class="classes"
			v-else-if="messageData.type == 'low_trust_treatment'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatPinNotice :class="classes"
			v-else-if="messageData.type == 'pinned' || messageData.type == 'unpinned'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatBan :class="classes"
			v-else-if="messageData.type == 'ban'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatUnban :class="classes"
			v-else-if="messageData.type == 'unban'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatStreamOnOff :class="classes"
			v-else-if="messageData.type == 'stream_online' || messageData.type == 'stream_offline'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatMessageClipPending :class="classes"
			v-else-if="messageData.type == 'clip_pending_publication'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatScopeRequester :class="classes"
			v-else-if="messageData.type == 'scope_request'"
			:messageData="messageData"
			@openFilters="(v: string) => $emit('openFilters')"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatCommunityBoost :class="classes"
			v-else-if="messageData.type == 'community_boost_complete'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatBits :class="classes"
			v-else-if="messageData.type == 'cheer'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatSubscription :class="classes"
			v-else-if="messageData.type == 'subscription'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatReward :class="classes"
			v-else-if="messageData.type == 'reward'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatCommunityChallengeContribution :class="classes"
			v-else-if="messageData.type == 'community_challenge_contribution'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatAutobanJoin :class="classes"
			v-else-if="messageData.type == 'autoban_join'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatWatchStreak :class="classes"
			v-else-if="messageData.type == 'user_watch_streak'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatHypeChatMessage :class="classes"
			v-else-if="messageData.type == 'hype_chat'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatAdBreakStarted :class="classes"
			v-else-if="messageData.type == 'ad_break_start_chat'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatHistorySplitter :class="classes"
			v-else-if="messageData.type == 'history_splitter'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatTrackAddedToQueue :class="classes"
			v-else-if="messageData.type == 'music_added_to_queue'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatTrackStart :class="classes"
			v-else-if="messageData.type == 'music_start'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatCustomMessage :class="classes"
			v-else-if="messageData.type == 'custom'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatStreamlabsEvent :class="classes"
			v-else-if="messageData.type == 'streamlabs'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatStreamelementsEvent :class="classes"
			v-else-if="messageData.type == 'streamelements'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatKofiEvent :class="classes"
			v-else-if="messageData.type == 'kofi'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatTipeeeEvent :class="classes"
			v-else-if="messageData.type == 'tipeee'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatUnbanRequest :class="classes"
			v-else-if="messageData.type == 'unban_request'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatCelebration :class="classes"
			v-else-if="messageData.type == 'twitch_celebration'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatAutomodTermsUpdate :class="classes"
			v-else-if="messageData.type == 'blocked_terms'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatHateRaid :class="classes"
			v-else-if="messageData.type == 'hate_raid'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatWarnUser :class="classes"
			v-else-if="messageData.type == 'warn_chatter'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatWarnAcknowledgment :class="classes"
			v-else-if="messageData.type == 'warn_acknowledge'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatYoutubeSuperChat :class="classes"
			v-else-if="messageData.type == 'super_chat'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatYoutubeSuperSticker :class="classes"
			v-else-if="messageData.type == 'super_sticker'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatYoutubeSubscription :class="classes"
			v-else-if="messageData.type == 'youtube_subscription'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
		/>
	
		<ChatYoutubeSubgift :class="classes"
			v-else-if="messageData.type == 'youtube_subgift'"
			:messageData="messageData"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
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
import ChatAutomodTermsUpdate from './ChatAutomodTermsUpdate.vue';
import ChatHateRaid from './ChatHateRaid.vue';
import ChatWarnUser from './ChatWarnUser.vue';
import ChatWarnAcknowledgment from './ChatWarnAcknowledgment.vue';
import ChatYoutubeSuperChat from './ChatYoutubeSuperChat.vue';
import ChatYoutubeSuperSticker from './ChatYoutubeSuperSticker.vue';
import ChatYoutubeSubscription from './ChatYoutubeSubscription.vue';
import ChatYoutubeSubgift from './ChatYoutubeSubgift.vue';

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
		ChatWarnUser,
		ChatShoutout,
		ChatHateRaid,
		ChatKofiEvent,
		ChatPinNotice,
		ChatJoinLeave,
		ChatTrackStart,
		ChatPollResult,
		ChatTipeeeEvent,
		ChatStreamOnOff,
		ChatBingoResult,
		ChatWatchStreak,
		ChatCelebration,
		ChatTimerResult,
		ChatAutobanJoin,
		ChatUnbanRequest,
		ChatRoomSettings,
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
		ChatCommunityChallengeContribution,
	},
	emits:["onRead", "showConversation", "showUserMessages", "unscheduleMessageOpen", "setCustomActivities", "showModal", "openFilters", "onOverMessage"],
})
class MessageItem extends Vue {

	@Prop()
	public messageData!:TwitchatDataTypes.ChatMessageTypes;

	@Prop()
	declare children:TwitchatDataTypes.ChatMessageTypes[];

	public get classes():string[] {
		const res:string[] = ["message"];
		if(this.messageData.channel_color) {
			res.push("external");
		}
		return res;
	}

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
		width: 5px;
		flex-shrink: 0;
		flex-grow: 0;
		background-color: currentColor;
	}
	.avatar {
		border-radius: 50%;
		height: 1.5em;
		align-self: center;
	}
	.message {
		width: 100%;
	}
}
</style>
