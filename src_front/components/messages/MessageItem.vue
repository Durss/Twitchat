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

		<component v-if="componentRef" class="message"
			:is="componentRef"
			:messageData="messageData"
			@showConversation="$emit('showConversation', $event)"
			@showUserMessages="$emit('showUserMessages', $event)"
			@onRead="(m:TwitchatDataTypes.ChatMessageTypes, e:MouseEvent) => $emit('onRead', m, e)"
			@onOverMessage="$emit('onOverMessage', $event)"
			@unscheduleMessageOpen="$emit('unscheduleMessageOpen', $event)"
			:colIndex="colIndex"
			:lightMode="lightMode"
			:childrenList="childrenList"
			:disableConversation="disableConversation"
		/>
		<div v-else class="message card-item secondary">No compontent found for type: <strong>{{ messageData.type }}</strong></div>
	</div>
</template>

<script lang="ts">
import ChatMessage from '@/components/messages/ChatMessage.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
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
import ChatChatPollResult from './ChatChatPollResult.vue';
import ChatCustomTrainSummary from './ChatCustomTrainSummary.vue';
import ChatStreamSocketAction from './ChatStreamSocketAction.vue';
import ChatTwitchCombo from './ChatTwitchCombo.vue';

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
		ChatCustomTrainSummary,
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
	emits:["onRead", "showConversation", "showUserMessages", "unscheduleMessageOpen", "setCustomActivities", "openFilters", "onOverMessage"],
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

	public get componentRef():typeof Vue|null {
		// Utility type to extract keys where value is literally true
		type KeysWithTrueValue<T> = keyof {
			[K in keyof T as T[K] extends true ? K : never]: T[K]
		};

		type ExpectedTypes = KeysWithTrueValue<typeof TwitchatDataTypes.DisplayableMessageTypes>;

		const map:{[key in ExpectedTypes]:typeof Vue} = {
			twitchat_ad:					ChatAd,
			join:							ChatJoinLeave,
			leave:							ChatJoinLeave,
			following:						ChatFollow,
			raid:							ChatRaid,
			message:						ChatMessage,
			whisper:						ChatMessage,
			notice:							ChatNotice,
			poll:							ChatPollResult,
			chat_poll:						ChatChatPollResult,
			prediction:						ChatPredictionResult,
			bingo:							ChatBingoResult,
			raffle:							ChatRaffleResult,
			countdown:						ChatCountdownResult,
			timer:							ChatTimerResult,
			hype_train_cooled_down:			ChatHypeTrainCooldown,
			hype_train_summary:				ChatHypeTrainResult,
			followbot_list:					ChatFollowbotEvents,
			room_settings:					ChatRoomSettings,
			clear_chat:						ChatClear,
			shoutout:						ChatShoutout,
			low_trust_treatment:			ChatLowTrustTreatment,
			pinned:							ChatPinNotice,
			unpinned:						ChatPinNotice,
			ban:							ChatBan,
			youtube_ban:					ChatBan,
			unban:							ChatUnban,
			stream_online:					ChatStreamOnOff,
			stream_offline:					ChatStreamOnOff,
			clip_pending_publication:		ChatMessageClipPending,
			scope_request:					ChatScopeRequester,
			community_boost_complete:		ChatCommunityBoost,
			cheer:							ChatBits,
			subscription:					ChatSubscription,
			reward:							ChatReward,
			community_challenge_contribution: ChatCommunityChallengeContribution,
			autoban_join:					ChatAutobanJoin,
			user_watch_streak:				ChatWatchStreak,
			hype_chat:						ChatHypeChatMessage,
			ad_break_start_chat:			ChatAdBreakStarted,
			history_splitter:				ChatHistorySplitter,
			music_added_to_queue:			ChatTrackAddedToQueue,
			music_start:					ChatTrackStart,
			custom:							ChatCustomMessage,
			streamlabs:						ChatStreamlabsEvent,
			streamelements:					ChatStreamelementsEvent,
			kofi:							ChatKofiEvent,
			tipeee:							ChatTipeeeEvent,
			tiltify:						ChatTiltifyEvent,
			patreon:						ChatPatreonEvent,
			unban_request:					ChatUnbanRequest,
			twitch_celebration:				ChatCelebration,
			blocked_terms:					ChatAutomodTermsUpdate,
			hate_raid:						ChatHateRaid,
			warn_chatter:					ChatWarnUser,
			warn_acknowledge:				ChatWarnAcknowledgment,
			super_chat:						ChatYoutubeSuperChat,
			super_sticker:					ChatYoutubeSuperSticker,
			youtube_subscription:			ChatYoutubeSubscription,
			youtube_subgift:				ChatYoutubeSubgift,
			tiktok_sub:						ChatTikTokSub,
			tiktok_gift:					ChatTikTokGift,
			tiktok_like:					ChatTikTokLike,
			tiktok_share:					ChatTikTokShare,
			suspended_trigger_stack:		ChatSuspendedTriggerStack,
			twitch_charity_donation:		ChatTwitchCharityDonation,
			private_mod_message:			ChatPrivateModerator,
			connect:						ChatConnect,
			disconnect:						ChatConnect,
			gigantified_emote:				ChatGiantEmote,
			twitch_combo:					ChatTwitchCombo,
			custom_train_summary:			ChatCustomTrainSummary,
			streamsocket_action:			ChatStreamSocketAction,
		};
		if(!Object.hasOwn(map, this.messageData.type)) {
			console.warn("MISSING MESSAGE COMPONENT FOR TYPE:", this.messageData.type);
			return null;
		}
		return map[this.messageData.type as ExpectedTypes];
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
