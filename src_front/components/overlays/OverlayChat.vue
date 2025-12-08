<template>
	<div class="overlaychat" :class="classes">
		<TransitionGroup :name="animationName" tag="div" class="messageList" ref="messageList">
			<div v-for="m in displayedMessages" :key="m.id" class="messageItem" :class="'type-' + m.type" :style="{'--user-color': getUser(m)?.color || m.channelUser?.color || '#0ff'}">
				<div v-if="m.showChannelSource && m.channelUser" class="channelSource" :title="m.channelUser.displayNameOriginal || m.channelUser.login">
					<img v-if="m.channelUser.avatarPath" class="channelAvatar" :src="m.channelUser.avatarPath" :alt="m.channelUser.login" />
					<span v-else class="channelInitial">{{ (m.channelUser.login || '?')[0].toUpperCase() }}</span>
				</div>
				<img v-if="params?.showPlatformLogo" class="platformLogo" :src="getPlatformLogo(m.platform)" :alt="m.platform" />
				<img v-if="params?.showAvatars && getUser(m)?.avatarPath" class="avatar" :src="getUser(m)?.avatarPath" />
				<div class="content">
					<span class="badges" v-if="params?.showBadges && getUser(m)">
						<img v-for="badge in getUserBadges(m)" :key="badge.id" class="badge" :src="badge.icon.sd" :alt="badge.title" />
					</span>
					<span class="login" v-if="getUser(m)" :style="{color: getUser(m)?.color || '#ffffff'}">{{ getUser(m)?.displayName }}</span>
					<span class="eventText" v-html="getEventText(m)"></span>
				</div>
			</div>
		</TransitionGroup>
	</div>
</template>

<script lang="ts">
import { toNative, Component } from 'vue-facing-decorator';
import AbstractOverlay from './AbstractOverlay';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchatEvent from '@/events/TwitchatEvent';
import PublicAPI from '@/utils/PublicAPI';
import type { JsonObject } from 'type-fest';

import twitchLogo from '@/assets/icons/twitch.svg';
import youtubeLogo from '@/assets/icons/youtube.svg';
import tiktokLogo from '@/assets/icons/tiktok.svg';

interface DisplayedMessage {
	id: string;
	type: TwitchatDataTypes.TwitchatMessageStringType;
	platform: TwitchatDataTypes.ChatPlatform;
	channel_id: string;
	data: TwitchatDataTypes.ChatMessageTypes;
	channelUser?: TwitchatDataTypes.TwitchatUser;
	showChannelSource: boolean;
	timeout?: number;
}

@Component({
	components: {},
	emits: [],
})
class OverlayChat extends AbstractOverlay {

	public displayedMessages: DisplayedMessage[] = [];
	public params: TwitchatDataTypes.ChatOverlayParams | null = null;
	public connectedChannels: Map<string, TwitchatDataTypes.TwitchatUser> = new Map();
	// Track our own user ID per channel to filter out self JOIN/LEAVE events
	private selfUserIds: Map<string, string> = new Map();

	private overlayId: string = '';
	private parametersReceived: boolean = false;
	private pendingMessages: (TwitchatDataTypes.ChatMessageTypes & { channelUser?: TwitchatDataTypes.TwitchatUser })[] = [];
	private messageQueue: (TwitchatDataTypes.ChatMessageTypes & { channelUser?: TwitchatDataTypes.TwitchatUser })[] = [];
	private isProcessingQueue: boolean = false;
	private messageHandler!: (e: TwitchatEvent) => void;
	private deleteMessageHandler!: (e: TwitchatEvent) => void;
	private updateParametersHandler!: (e: TwitchatEvent) => void;
	private requestPresenceHandler!: (e: TwitchatEvent) => void;

	public get classes(): Record<string, boolean> {
		return {
			'direction-ttb': this.params?.direction === 'top_to_bottom',
			[`style-${this.params?.style || 'default'}`]: true,
			'size-xs': this.params?.size === 'xs',
			'size-s': this.params?.size === 's',
			'size-m': this.params?.size === 'm',
			'size-l': this.params?.size === 'l',
			'size-xl': this.params?.size === 'xl',
			'size-xxl': this.params?.size === 'xxl',
		};
	}

	public get animationName(): string {
		const anim = this.params?.entranceAnimation || 'fade';
		return anim === 'none' ? '' : `message-${anim}`;
	}

	public get hasMultipleChannels(): boolean {
		return this.connectedChannels.size > 1;
	}

	public async mounted(): Promise<void> {
		// Get the overlay ID from the URL (OverlayInstaller uses twitchat_overlay_id)
		this.overlayId = this.$route.query.twitchat_overlay_id as string || '';

		if (!this.overlayId) {
			console.warn('[OverlayChat] No overlay ID provided in URL. Add ?twitchat_overlay_id=YOUR_ID to the URL.');
			return;
		}

		PublicAPI.instance.broadcast(TwitchatEvent.CHAT_OVERLAY_PRESENCE, { overlayId: this.overlayId } as unknown as JsonObject);

		this.messageHandler = (e: TwitchatEvent) => this.onMessage(e);
		this.deleteMessageHandler = (e: TwitchatEvent) => this.onDeleteMessage(e);
		this.updateParametersHandler = (e: TwitchatEvent) => this.onUpdateParams(e);
		this.requestPresenceHandler = (e: TwitchatEvent) => {
			const data = e.data as { overlayId?: string } | undefined;
			// Only respond if no specific overlay requested or if it's for us
			if (!data?.overlayId || data.overlayId === this.overlayId) {
				PublicAPI.instance.broadcast(TwitchatEvent.CHAT_OVERLAY_PRESENCE, { overlayId: this.overlayId } as unknown as JsonObject);
			}
		};

		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_OVERLAY_MESSAGE, this.messageHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_OVERLAY_DELETE_MESSAGE, this.deleteMessageHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_OVERLAY_PARAMETERS, this.updateParametersHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.GET_CHAT_OVERLAY_PRESENCE, this.requestPresenceHandler);
	}

	public beforeUnmount(): void {
		super.beforeUnmount();
		PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_OVERLAY_MESSAGE, this.messageHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_OVERLAY_DELETE_MESSAGE, this.deleteMessageHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_OVERLAY_PARAMETERS, this.updateParametersHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.GET_CHAT_OVERLAY_PRESENCE, this.requestPresenceHandler);

		// Clear all timeouts
		this.displayedMessages.forEach(m => {
			if (m.timeout) clearTimeout(m.timeout);
		});
	}

	public requestInfo(): void {
		PublicAPI.instance.broadcast(TwitchatEvent.GET_CHAT_OVERLAY_PARAMETERS, { overlayId: this.overlayId } as unknown as JsonObject);
	}

	public getUser(m: DisplayedMessage): TwitchatDataTypes.TwitchatUser | undefined {
		// Handle JOIN/LEAVE events which have users array
		if (m.type === TwitchatDataTypes.TwitchatMessageType.JOIN ||
			m.type === TwitchatDataTypes.TwitchatMessageType.LEAVE) {
			const joinLeaveData = m.data as TwitchatDataTypes.MessageJoinData;
			return joinLeaveData.users?.[0];
		}
		// CONNECT/DISCONNECT are system messages, no user to display
		if (m.type === TwitchatDataTypes.TwitchatMessageType.CONNECT ||
			m.type === TwitchatDataTypes.TwitchatMessageType.DISCONNECT) {
			return undefined;
		}
		const data = m.data as { user?: TwitchatDataTypes.TwitchatUser };
		return data.user;
	}

	public getUserBadges(m: DisplayedMessage): TwitchatDataTypes.TwitchatUserBadge[] {
		const user = this.getUser(m);
		if (!user) return [];
		return user.channelInfo?.[m.channel_id]?.badges || [];
	}

	public getPlatformLogo(platform: TwitchatDataTypes.ChatPlatform): string {
		switch (platform) {
			case 'twitch': return twitchLogo;
			case 'youtube': return youtubeLogo;
			case 'tiktok': return tiktokLogo;
			default: return twitchLogo;
		}
	}

	public getEventText(m: DisplayedMessage): string {
		const data = m.data;
		const type = m.type;
		const labels = this.params?.labels;

		switch (type) {
			case TwitchatDataTypes.TwitchatMessageType.MESSAGE:
			case TwitchatDataTypes.TwitchatMessageType.WHISPER: {
				const msg = data as TwitchatDataTypes.MessageChatData;
				return `<span class="separator">:</span> <span class="text">${msg.message_html || ''}</span>`;
			}

			case TwitchatDataTypes.TwitchatMessageType.FOLLOWING: {
				const text = labels?.event_follow || 'just followed!';
				return `<span class="eventLabel">${text}</span>`;
			}

			case TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION: {
				const sub = data as TwitchatDataTypes.MessageSubscriptionData;
				if (sub.is_gift) {
					const count = sub.gift_count || 1;
					const text = (labels?.event_sub_gift || 'gifted {COUNT} sub{PLURAL}!')
						.replace('{COUNT}', count.toString())
						.replace('{PLURAL}', count > 1 ? 's' : '');
					return `<span class="eventLabel">${text}</span>`;
				} else if (sub.is_resub) {
					const text = (labels?.event_sub_resub || 'resubscribed ({MONTHS} months)!')
						.replace('{MONTHS}', (sub.months || 0).toString());
					return `<span class="eventLabel">${text}</span>`;
				} else {
					const text = labels?.event_sub_new || 'just subscribed!';
					return `<span class="eventLabel">${text}</span>`;
				}
			}

			case TwitchatDataTypes.TwitchatMessageType.CHEER: {
				const cheer = data as TwitchatDataTypes.MessageCheerData;
				const text = (labels?.event_cheer || 'sent {BITS} bits!')
					.replace('{BITS}', cheer.bits.toString());
				return `<span class="eventLabel">${text}</span>${cheer.message_html ? ` <span class="text">${cheer.message_html}</span>` : ''}`;
			}

			case TwitchatDataTypes.TwitchatMessageType.RAID: {
				const raid = data as TwitchatDataTypes.MessageRaidData;
				const text = (labels?.event_raid || 'raided with {VIEWERS} viewers!')
					.replace('{VIEWERS}', raid.viewers.toString());
				return `<span class="eventLabel">${text}</span>`;
			}

			case TwitchatDataTypes.TwitchatMessageType.REWARD: {
				const reward = data as TwitchatDataTypes.MessageRewardRedeemData;
				const text = (labels?.event_reward || 'redeemed "{TITLE}"')
					.replace('{TITLE}', reward.reward.title);
				return `<span class="eventLabel">${text}</span>${reward.message_html ? ` <span class="text">${reward.message_html}</span>` : ''}`;
			}

			case TwitchatDataTypes.TwitchatMessageType.BAN: {
				const ban = data as TwitchatDataTypes.MessageBanData;
				if (ban.duration_s) {
					const text = (labels?.event_ban_duration || 'has been banned ({DURATION} min)')
						.replace('{DURATION}', Math.round(ban.duration_s / 60).toString());
					return `<span class="eventLabel">${text}</span>`;
				}
				const text = labels?.event_ban || 'has been banned';
				return `<span class="eventLabel">${text}</span>`;
			}

			case TwitchatDataTypes.TwitchatMessageType.UNBAN: {
				const text = labels?.event_unban || 'has been unbanned';
				return `<span class="eventLabel">${text}</span>`;
			}

			case TwitchatDataTypes.TwitchatMessageType.SHOUTOUT: {
				const text = labels?.event_shoutout || 'received a shoutout!';
				return `<span class="eventLabel">${text}</span>`;
			}

			case TwitchatDataTypes.TwitchatMessageType.JOIN: {
				const joinData = data as TwitchatDataTypes.MessageJoinData;
				const count = joinData.users?.length || 0;
				if (count > 1) {
					const text = (labels?.event_join_multiple || 'and {COUNT} other{PLURAL} joined the chat')
						.replace('{COUNT}', (count - 1).toString())
						.replace('{PLURAL}', count > 2 ? 's' : '');
					return `<span class="eventLabel">${text}</span>`;
				}
				const text = labels?.event_join || 'joined the chat';
				return `<span class="eventLabel">${text}</span>`;
			}

			case TwitchatDataTypes.TwitchatMessageType.LEAVE: {
				const leaveData = data as TwitchatDataTypes.MessageJoinData;
				const leaveCount = leaveData.users?.length || 0;
				if (leaveCount > 1) {
					const text = (labels?.event_leave_multiple || 'and {COUNT} other{PLURAL} left the chat')
						.replace('{COUNT}', (leaveCount - 1).toString())
						.replace('{PLURAL}', leaveCount > 2 ? 's' : '');
					return `<span class="eventLabel">${text}</span>`;
				}
				const text = labels?.event_leave || 'left the chat';
				return `<span class="eventLabel">${text}</span>`;
			}

			case TwitchatDataTypes.TwitchatMessageType.KOFI: {
				const kofi = data as TwitchatDataTypes.MessageKofiData;
				const text = (labels?.event_kofi || 'Ko-fi: {AMOUNT} {CURRENCY}')
					.replace('{AMOUNT}', kofi.amount.toString())
					.replace('{CURRENCY}', kofi.currency);
				return `<span class="eventLabel">${text}</span>${kofi.message ? ` <span class="text">${kofi.message}</span>` : ''}`;
			}

			case TwitchatDataTypes.TwitchatMessageType.STREAMLABS: {
				const sl = data as TwitchatDataTypes.MessageStreamlabsData;
				if (sl.eventType === 'donation' || sl.eventType === 'charity') {
					const text = (labels?.event_streamlabs || 'Streamlabs: {AMOUNT} {CURRENCY}')
						.replace('{AMOUNT}', sl.amount.toString())
						.replace('{CURRENCY}', sl.currency);
					return `<span class="eventLabel">${text}</span>${sl.message ? ` <span class="text">${sl.message}</span>` : ''}`;
				} else if (sl.eventType === 'merch') {
					return `<span class="eventLabel">Streamlabs Merch: ${sl.product}</span>${sl.message ? ` <span class="text">${sl.message}</span>` : ''}`;
				} else if (sl.eventType === 'patreon_pledge') {
					const text = (labels?.event_streamlabs || 'Streamlabs: {AMOUNT} {CURRENCY}')
						.replace('{AMOUNT}', sl.amount.toString())
						.replace('{CURRENCY}', sl.currency);
					return `<span class="eventLabel">${text}</span>`;
				}
				return `<span class="eventLabel">Streamlabs</span>`;
			}

			case TwitchatDataTypes.TwitchatMessageType.STREAMELEMENTS: {
				const se = data as TwitchatDataTypes.MessageStreamelementsData;
				const text = (labels?.event_streamelements || 'StreamElements: {AMOUNT} {CURRENCY}')
					.replace('{AMOUNT}', se.amount.toString())
					.replace('{CURRENCY}', se.currency);
				return `<span class="eventLabel">${text}</span>${se.message ? ` <span class="text">${se.message}</span>` : ''}`;
			}

			case TwitchatDataTypes.TwitchatMessageType.TIPEEE: {
				const tip = data as TwitchatDataTypes.MessageTipeeeDonationData;
				const text = (labels?.event_tipeee || 'Tipeee: {AMOUNT} {CURRENCY}')
					.replace('{AMOUNT}', tip.amount.toString())
					.replace('{CURRENCY}', tip.currency);
				return `<span class="eventLabel">${text}</span>${tip.message ? ` <span class="text">${tip.message}</span>` : ''}`;
			}

			case TwitchatDataTypes.TwitchatMessageType.TILTIFY: {
				const tiltify = data as TwitchatDataTypes.MessageTiltifyData;
				const text = (labels?.event_tiltify || 'Tiltify: {AMOUNT} {CURRENCY}')
					.replace('{AMOUNT}', tiltify.amount.toString())
					.replace('{CURRENCY}', tiltify.currency);
				return `<span class="eventLabel">${text}</span>${tiltify.message ? ` <span class="text">${tiltify.message}</span>` : ''}`;
			}

			case TwitchatDataTypes.TwitchatMessageType.PATREON: {
				const text = labels?.event_patreon || 'Patreon: new member!';
				return `<span class="eventLabel">${text}</span>`;
			}

			case TwitchatDataTypes.TwitchatMessageType.CONNECT: {
				const connectData = data as TwitchatDataTypes.MessageConnectData & { channelUser?: TwitchatDataTypes.TwitchatUser };
				const channelUser = connectData.channelUser;
				const avatarHtml = channelUser?.avatarPath ? `<img class="inlineAvatar" src="${channelUser.avatarPath}" alt="" />` : '';
				const channelName = channelUser?.displayNameOriginal || channelUser?.login || connectData.channel_id;
				const text = labels?.event_connect || 'Connected to chat of';
				return `<span class="eventLabel">${text} ${avatarHtml}<strong>${channelName}</strong></span>`;
			}

			case TwitchatDataTypes.TwitchatMessageType.DISCONNECT: {
				const disconnectData = data as TwitchatDataTypes.MessageDisconnectData & { channelUser?: TwitchatDataTypes.TwitchatUser };
				const channelUser = disconnectData.channelUser;
				const avatarHtml = channelUser?.avatarPath ? `<img class="inlineAvatar" src="${channelUser.avatarPath}" alt="" />` : '';
				const channelName = channelUser?.displayNameOriginal || channelUser?.login || disconnectData.channel_id;
				const text = labels?.event_disconnect || 'Disconnected from chat of';
				return `<span class="eventLabel">${text} ${avatarHtml}<strong>${channelName}</strong></span>`;
			}

			default:
				return `<span class="eventLabel">[${type}]</span>`;
		}
	}

	private onMessage(e: TwitchatEvent): void {
		const message = (e.data as unknown) as TwitchatDataTypes.ChatMessageTypes & { channelUser?: TwitchatDataTypes.TwitchatUser };

		if (!this.parametersReceived) {
			this.pendingMessages.push(message);
			this.requestInfo();
			return;
		}

		// If there's a message delay, queue the message
		if (this.params && this.params.messageDelay > 0) {
			this.messageQueue.push(message);
			this.processMessageQueue();
		} else {
			this.addMessage(message);
		}
	}

	private async processMessageQueue(): Promise<void> {
		if (this.isProcessingQueue || this.messageQueue.length === 0) return;

		this.isProcessingQueue = true;

		while (this.messageQueue.length > 0) {
			const message = this.messageQueue.shift();
			if (message) {
				this.addMessage(message);
				if (this.params && this.params.messageDelay > 0 && this.messageQueue.length > 0) {
					await new Promise(resolve => setTimeout(resolve, this.params!.messageDelay));
				}
			}
		}

		this.isProcessingQueue = false;
	}

	private addMessage(message: TwitchatDataTypes.ChatMessageTypes & { channelUser?: TwitchatDataTypes.TwitchatUser }): void {
		if (!this.params) return;

		// Apply filters
		if (!this.shouldShowMessage(message)) return;

		// Track connected channels and self user IDs
		if (message.type === TwitchatDataTypes.TwitchatMessageType.CONNECT) {
			const connectMsg = message as TwitchatDataTypes.MessageConnectData;
			if (message.channelUser) {
				this.connectedChannels.set(message.channel_id, message.channelUser);
			}
			// Track our own user ID for this channel
			if (connectMsg.user?.id) {
				this.selfUserIds.set(message.channel_id, connectMsg.user.id);
			}
		} else if (message.type === TwitchatDataTypes.TwitchatMessageType.DISCONNECT) {
			this.connectedChannels.delete(message.channel_id);
			// Keep selfUserIds to filter out LEAVE events that come after DISCONNECT
		} else if (message.channelUser && !this.connectedChannels.has(message.channel_id)) {
			// For other messages, add channel if not already tracked
			this.connectedChannels.set(message.channel_id, message.channelUser);
		}

		const displayedMsg: DisplayedMessage = {
			id: message.id,
			type: message.type,
			platform: message.platform,
			channel_id: message.channel_id,
			data: message,
			channelUser: message.channelUser,
			showChannelSource: this.hasMultipleChannels,
		};

		// Add message
		if (this.params.direction === 'top_to_bottom') {
			this.displayedMessages.unshift(displayedMsg);
		} else {
			this.displayedMessages.push(displayedMsg);
		}

		// Limit message count
		while (this.displayedMessages.length > this.params.maxMessages) {
			const removed = this.params.direction === 'top_to_bottom'
				? this.displayedMessages.pop()
				: this.displayedMessages.shift();
			if (removed?.timeout) clearTimeout(removed.timeout);
		}

		// Set auto-remove timeout if configured (messageDuration is in seconds)
		if (this.params.messageDuration > 0) {
			displayedMsg.timeout = window.setTimeout(() => {
				this.removeMessage(displayedMsg.id);
			}, this.params.messageDuration * 1000);
		}
	}

	private shouldShowMessage(message: TwitchatDataTypes.ChatMessageTypes): boolean {
		if (!this.params) return false;

		// Check if this message type is enabled in filters
		const messageType = message.type as keyof typeof this.params.filters;
		if (this.params.filters[messageType] === false) {
			return false;
		}

		// Check platform filter
		if (this.params.platformsFilter && this.params.platformsFilter[message.platform] === false) {
			return false;
		}

		// Filter out system JOIN/LEAVE events (connection messages without users)
		// Also filter out JOIN/LEAVE for our own user (redundant with CONNECT/DISCONNECT)
		if (message.type === TwitchatDataTypes.TwitchatMessageType.JOIN ||
			message.type === TwitchatDataTypes.TwitchatMessageType.LEAVE) {
			const joinLeaveMsg = message as TwitchatDataTypes.MessageJoinData;
			// Only show if there are actual users in the list
			if (!joinLeaveMsg.users || joinLeaveMsg.users.length === 0) {
				return false;
			}
			// Filter out if we are the one joining/leaving (redundant with CONNECT/DISCONNECT)
			const selfId = this.selfUserIds.get(message.channel_id);
			if (selfId && joinLeaveMsg.users.some(u => u.id === selfId)) {
				return false;
			}
		}

		// For MESSAGE type, apply additional filters
		if (message.type === TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
			const chatMessage = message as TwitchatDataTypes.MessageChatData;

			// Check user blocklist
			if (this.params.userBlockList.length > 0 && chatMessage.user) {
				const username = chatMessage.user.login.toLowerCase();
				if (this.params.userBlockList.some(u => u.toLowerCase() === username)) {
					return false;
				}
			}

			// Check command blocklist
			if (this.params.commandsBlockList.length > 0 && chatMessage.message) {
				const firstWord = chatMessage.message.split(' ')[0].toLowerCase();
				if (this.params.commandsBlockList.some(c => c.toLowerCase() === firstWord)) {
					return false;
				}
			}

			// Check message sub-filters based on user role
			if (chatMessage.user) {
				const channelInfo = chatMessage.user.channelInfo?.[message.channel_id];
				const isMod = channelInfo?.is_moderator === true;
				const isVip = channelInfo?.is_vip === true;
				const isSub = channelInfo?.is_subscriber === true;
				const isPartner = chatMessage.user.is_partner === true;
				const isBot = chatMessage.user.is_bot === true;
				const isTracked = chatMessage.user.is_tracked === true;
				const isViewer = !isMod && !isVip && !isSub && !isPartner;

				if (isViewer && !this.params.messageFilters.viewers) return false;
				if (isVip && !this.params.messageFilters.vips) return false;
				if (isSub && !this.params.messageFilters.subs) return false;
				if (isMod && !this.params.messageFilters.moderators) return false;
				if (isPartner && !this.params.messageFilters.partners) return false;
				if (isBot && !this.params.messageFilters.bots) return false;
				if (isTracked && !this.params.messageFilters.tracked) return false;
			}

			// Check other message properties
			if (chatMessage.is_short && !this.params.messageFilters.short) return false;
			if (chatMessage.twitch_automod && !this.params.messageFilters.automod) return false;
			if (chatMessage.twitch_isSuspicious && !this.params.messageFilters.suspiciousUsers) return false;
			if (chatMessage.deleted && !this.params.messageFilters.deleted) return false;
		}

		return true;
	}

	private removeMessage(id: string): void {
		const index = this.displayedMessages.findIndex(m => m.id === id);
		if (index !== -1) {
			const [removed] = this.displayedMessages.splice(index, 1);
			if (removed.timeout) clearTimeout(removed.timeout);
		}
	}

	private onDeleteMessage(e: TwitchatEvent): void {
		const data = (e.data as unknown) as { id: string };
		this.removeMessage(data.id);
	}

	private onUpdateParams(e: TwitchatEvent): void {
		const data = (e.data as unknown) as { parameters: TwitchatDataTypes.ChatOverlayParams, overlayId?: string };

		// Only accept params for our overlay ID
		if (data.overlayId && data.overlayId !== this.overlayId) return;

		const oldDuration = this.params?.messageDuration;
		this.params = data.parameters;
		this.parametersReceived = true;

		// If messageDuration changed, update timers on existing messages
		if (oldDuration !== this.params.messageDuration) {
			this.updateMessageTimers();
		}

		// Process pending messages
		if (this.pendingMessages.length > 0) {
			this.pendingMessages.forEach(m => this.addMessage(m));
			this.pendingMessages = [];
		}
	}

	private updateMessageTimers(): void {
		if (!this.params) return;

		// Clear all existing timers
		this.displayedMessages.forEach(m => {
			if (m.timeout) {
				clearTimeout(m.timeout);
				m.timeout = undefined;
			}
		});

		// If new duration is > 0, set new timers for all messages
		if (this.params.messageDuration > 0) {
			this.displayedMessages.forEach(m => {
				m.timeout = window.setTimeout(() => {
					this.removeMessage(m.id);
				}, this.params!.messageDuration * 1000);
			});
		}
	}
}
export default toNative(OverlayChat);
</script>

<style scoped lang="less">
.overlaychat {
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
	justify-content: flex-end;
	overflow: hidden;
	font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;

	// Size variants
	&.size-xs { font-size: 12px; }
	&.size-s { font-size: 14px; }
	&.size-m { font-size: 16px; }
	&.size-l { font-size: 20px; }
	&.size-xl { font-size: 24px; }
	&.size-xxl { font-size: 32px; }

	&.direction-ttb {
		justify-content: flex-start;
	}

	.messageList {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 8px;
	}

	.messageItem {
		display: flex;
		align-items: flex-start;
		gap: 0.5em;
		padding: 0.4em 0.6em;
		background: rgba(0, 0, 0, 0.6);
		border-radius: 4px;
		word-wrap: break-word;
		overflow-wrap: break-word;

		.platformLogo {
			width: 1.2em;
			height: 1.2em;
			flex-shrink: 0;
		}

		.avatar {
			width: 1.5em;
			height: 1.5em;
			border-radius: 50%;
			flex-shrink: 0;
		}

		.channelSource {
			flex-shrink: 0;
			width: 1.4em;
			height: 1.4em;
			border-radius: 4px;
			overflow: hidden;
			background: rgba(255, 255, 255, 0.15);
			display: flex;
			align-items: center;
			justify-content: center;

			.channelAvatar {
				width: 100%;
				height: 100%;
				object-fit: cover;
			}

			.channelInitial {
				font-size: 0.8em;
				font-weight: bold;
				color: #ffffff;
			}
		}

		.content {
			flex: 1;
			min-width: 0;

			.badges {
				display: inline;
				margin-right: 0.25em;

				.badge {
					width: 1.1em;
					height: 1.1em;
					vertical-align: middle;
					margin-right: 0.1em;
				}
			}

			.login {
				font-weight: 700;
			}

			:deep(.separator) {
				margin: 0 0.25em;
				color: #ffffff;
			}

			:deep(.eventLabel) {
				color: #aaaaaa;
				font-style: italic;
				margin-left: 0.25em;
			}

			:deep(.text) {
				color: #ffffff;
				word-break: break-word;

				img {
					height: 1.5em;
					vertical-align: middle;
				}
			}

			:deep(.inlineAvatar) {
				width: 1.2em;
				height: 1.2em;
				border-radius: 50%;
				vertical-align: middle;
				margin: 0 0.25em;
			}
		}

		// Event type styles
		&.type-following {
			border-left: 3px solid #ff4444;
			.eventLabel { color: #ff4444; }
		}

		&.type-subscription {
			border-left: 3px solid #9146ff;
			.eventLabel { color: #9146ff; }
		}

		&.type-cheer {
			border-left: 3px solid #ffaa00;
			.eventLabel { color: #ffaa00; }
		}

		&.type-raid {
			border-left: 3px solid #ff6b6b;
			.eventLabel { color: #ff6b6b; }
		}

		&.type-reward {
			border-left: 3px solid #00d4aa;
			.eventLabel { color: #00d4aa; }
		}

		&.type-ban, &.type-unban {
			border-left: 3px solid #ff0000;
			.eventLabel { color: #ff0000; }
		}

		&.type-shoutout {
			border-left: 3px solid #00ccff;
			.eventLabel { color: #00ccff; }
		}

		&.type-kofi, &.type-streamlabs, &.type-streamelements, &.type-tipeee, &.type-tiltify, &.type-patreon {
			border-left: 3px solid #29abe0;
			.eventLabel { color: #29abe0; }
		}

		&.type-connect, &.type-disconnect {
			border-left: 3px solid #888888;
			:deep(.eventLabel) { color: #888888; }
		}
	}

	// Style: Default - Dark semi-transparent
	&.style-default {
		.messageItem {
			background: rgba(0, 0, 0, 0.7);
			:deep(.text), :deep(.separator), :deep(.eventLabel) { color: #ffffff; }
		}
	}

	// Style: Twitch - Purple theme
	&.style-twitch {
		.messageItem {
			background: linear-gradient(135deg, rgba(145, 70, 255, 0.8) 0%, rgba(100, 65, 165, 0.8) 100%);
			border-left: 3px solid #9146FF;
			.login { color: #ffffff !important; }
			:deep(.text), :deep(.separator) { color: #ffffff; }
			:deep(.eventLabel) { color: #ffcc00; font-style: normal; }
		}
	}

	// Style: Bubbles - Chat bubble style
	&.style-bubbles {
		.messageList {
			align-items: flex-start;
		}
		.messageItem {
			background: color-mix(in srgb, var(--user-color, #2D2D2D) 30%, #1a1a1a);
			border-radius: 1em;
			position: relative;
			width: fit-content;
			max-width: 85%;
			:deep(.text), :deep(.separator) { color: #ffffff; }
			:deep(.eventLabel) { color: #cccccc; }

			// Events: left side bubble
			border-bottom-left-radius: 0.25em;
			margin-left: 0.5em;
			&::before {
				content: '';
				position: absolute;
				left: -0.5em;
				bottom: 0;
				border: 0.5em solid transparent;
				border-right-color: color-mix(in srgb, var(--user-color, #2D2D2D) 30%, #1a1a1a);
				border-bottom-color: color-mix(in srgb, var(--user-color, #2D2D2D) 30%, #1a1a1a);
			}

			// Messages: right side bubble
			&.type-message, &.type-whisper {
				align-self: flex-end;
				border-bottom-left-radius: 1em;
				border-bottom-right-radius: 0.25em;
				margin-left: 0;
				margin-right: 0.5em;
				&::before {
					left: auto;
					right: -0.5em;
					border-right-color: transparent;
					border-left-color: color-mix(in srgb, var(--user-color, #2D2D2D) 30%, #1a1a1a);
				}
			}
		}
	}

	// Style: Gradient - Colorful gradient
	&.style-gradient {
		.messageItem {
			background: linear-gradient(135deg, rgba(102, 51, 153, 0.85) 0%, rgba(51, 102, 153, 0.85) 25%, rgba(153, 51, 102, 0.85) 50%, rgba(51, 153, 102, 0.85) 75%, rgba(102, 51, 153, 0.85) 100%);
			background-size: 300% 300%;
			animation: gradientShift 8s ease infinite;
			.login { text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8); }
			:deep(.text), :deep(.separator) { color: #ffffff; }
			:deep(.eventLabel) { color: #ffcc66; font-style: normal; }
		}
	}
	@keyframes gradientShift {
		0%, 100% { background-position: 0% 50%; }
		25% { background-position: 100% 0%; }
		50% { background-position: 100% 100%; }
		75% { background-position: 0% 100%; }
	}

	// Style: Neon - Glowing neon effect
	&.style-neon {
		.messageItem {
			background: rgba(0, 0, 0, 0.9);
			border: 1px solid var(--user-color, #0ff);
			box-shadow: 0 0 10px var(--user-color, #0ff), inset 0 0 10px rgba(0, 255, 255, 0.1);
			.login {
				color: #ffffff !important;
				text-shadow: 0 0 8px var(--user-color, #0ff), 0 0 15px var(--user-color, #0ff);
			}
			:deep(.text), :deep(.separator) { color: #ffffff; }
			:deep(.eventLabel) {
				color: var(--user-color, #0ff);
				text-shadow: 0 0 3px var(--user-color, #0ff);
				font-style: normal;
				strong {
					color: #ffffff;
					text-shadow: 0 0 8px var(--user-color, #0ff), 0 0 15px var(--user-color, #0ff);
				}
			}
		}
	}

	// Style: Minimal - Clean, no background
	&.style-minimal {
		.messageItem {
			background: transparent;
			padding: 0.2em 0;
			border-radius: 0;
			:deep(.text), :deep(.separator), .login, :deep(.eventLabel) {
				text-shadow: 2px 2px 4px rgba(0, 0, 0, 1), -1px -1px 2px rgba(0, 0, 0, 1), 1px -1px 2px rgba(0, 0, 0, 1), -1px 1px 2px rgba(0, 0, 0, 1);
			}
			:deep(.text), :deep(.separator) { color: #ffffff; }
			:deep(.eventLabel) { color: #ffcc00; }
		}
	}

	// Style: Glass - Liquid Glass effect (Apple-inspired)
	&.style-glass {
		.messageItem {
			background: linear-gradient(
				135deg,
				rgba(255, 255, 255, 0.15) 0%,
				rgba(255, 255, 255, 0.05) 50%,
				rgba(255, 255, 255, 0.1) 100%
			);
			backdrop-filter: blur(20px) saturate(180%);
			-webkit-backdrop-filter: blur(20px) saturate(180%);
			border: 1px solid rgba(255, 255, 255, 0.3);
			border-top-color: rgba(255, 255, 255, 0.5);
			border-left-color: rgba(255, 255, 255, 0.4);
			border-radius: 1em;
			box-shadow:
				0 8px 32px rgba(0, 0, 0, 0.3),
				inset 0 1px 1px rgba(255, 255, 255, 0.4),
				inset 0 -1px 1px rgba(0, 0, 0, 0.1);
			position: relative;
			overflow: hidden;
			:deep(.text), :deep(.separator) { color: #ffffff; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3); }
			:deep(.eventLabel) { color: rgba(255, 255, 255, 0.9); text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3); }
			.login { text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3); }

			// Subtle highlight reflection
			&::before {
				content: '';
				position: absolute;
				top: 0;
				left: 0;
				right: 0;
				height: 50%;
				background: linear-gradient(
					180deg,
					rgba(255, 255, 255, 0.15) 0%,
					rgba(255, 255, 255, 0) 100%
				);
				border-radius: 1em 1em 0 0;
				pointer-events: none;
			}
		}
	}

	// Fade animation
	.message-fade-enter-active {
		transition: all 0.3s ease-out;
	}
	.message-fade-leave-active {
		transition: all 0.3s ease-in;
	}
	.message-fade-enter-from,
	.message-fade-leave-to {
		opacity: 0;
	}
	.message-fade-move {
		transition: transform 0.3s ease;
	}

	// Slide animation
	.message-slide-enter-active {
		transition: all 0.3s ease-out;
	}
	.message-slide-leave-active {
		transition: all 0.3s ease-in;
	}
	.message-slide-enter-from {
		opacity: 0;
		transform: translateX(-100%);
	}
	.message-slide-leave-to {
		opacity: 0;
		transform: translateX(100%);
	}
	.message-slide-move {
		transition: transform 0.3s ease;
	}

	// Wipe animation
	.message-wipe-enter-active {
		transition: all 0.4s ease-out;
	}
	.message-wipe-leave-active {
		transition: all 0.4s ease-in;
	}
	.message-wipe-enter-from {
		clip-path: inset(0 100% 0 0);
		opacity: 0;
	}
	.message-wipe-enter-to {
		clip-path: inset(0 0 0 0);
		opacity: 1;
	}
	.message-wipe-leave-to {
		clip-path: inset(0 0 0 100%);
		opacity: 0;
	}
	.message-wipe-move {
		transition: transform 0.3s ease;
	}

	// Elastic animation
	.message-elastic-enter-active {
		transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
	}
	.message-elastic-leave-active {
		transition: all 0.3s ease-in;
	}
	.message-elastic-enter-from {
		opacity: 0;
		transform: scale(0.3) translateY(50px);
	}
	.message-elastic-leave-to {
		opacity: 0;
		transform: scale(0.8);
	}
	.message-elastic-move {
		transition: transform 0.3s ease;
	}

	// Flip animation
	.message-flip-enter-active {
		transition: all 0.4s ease-out;
	}
	.message-flip-leave-active {
		transition: all 0.3s ease-in;
	}
	.message-flip-enter-from {
		opacity: 0;
		transform: rotateX(-90deg);
		transform-origin: top center;
	}
	.message-flip-leave-to {
		opacity: 0;
		transform: rotateX(90deg);
		transform-origin: bottom center;
	}
	.message-flip-move {
		transition: transform 0.3s ease;
	}

	// Glitch animation
	@keyframes glitchIn {
		0% {
			opacity: 0;
			transform: translateX(-5px);
			filter: hue-rotate(90deg);
		}
		20% {
			transform: translateX(5px);
			filter: hue-rotate(180deg);
		}
		40% {
			transform: translateX(-3px);
			filter: hue-rotate(270deg);
		}
		60% {
			transform: translateX(3px);
			filter: hue-rotate(360deg);
		}
		80% {
			transform: translateX(-1px);
			filter: hue-rotate(0deg);
		}
		100% {
			opacity: 1;
			transform: translateX(0);
			filter: hue-rotate(0deg);
		}
	}
	.message-glitch-enter-active {
		animation: glitchIn 0.4s ease-out;
	}
	.message-glitch-leave-active {
		transition: all 0.2s ease-in;
	}
	.message-glitch-leave-to {
		opacity: 0;
		transform: translateX(10px);
	}
	.message-glitch-move {
		transition: transform 0.3s ease;
	}
}
</style>
