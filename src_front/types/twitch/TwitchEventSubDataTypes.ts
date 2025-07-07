export namespace TwitchEventSubDataTypes {

	export const SubscriptionTypes = {
		CHAT_MESSAGES: "channel.chat.message",
		CHANNEL_UPDATE: "channel.update",
		FOLLOW: "channel.follow",
		SUB: "channel.subscribe",
		SUB_END: "channel.subscription.end",
		SUBGIFT: "channel.subscription.gift",
		RESUB: "channel.subscription.message",
		BITS: "channel.cheer",
		RAID: "channel.raid",
		BAN: "channel.ban",
		CHANNEL_MODERATE: "channel.moderate",
		UNBAN: "channel.unban",
		MODERATOR_ADD: "channel.moderator.add",
		MODERATOR_REMOVE: "channel.moderator.remove",
		REWARD_CREATE: "channel.channel_points_custom_reward.add",
		REWARD_UPDATE: "channel.channel_points_custom_reward.update",
		REWARD_DELETE: "channel.channel_points_custom_reward.remove",
		REWARD_REDEEM: "channel.channel_points_custom_reward_redemption.add",
		REWARD_REDEEM_UPDATE: "channel.channel_points_custom_reward_redemption.update",
		AUTOMATIC_REWARD_REDEEM: "channel.channel_points_automatic_reward_redemption.add",
		POLL_START: "channel.poll.begin",
		POLL_PROGRESS: "channel.poll.progress",
		POLL_END: "channel.poll.end",
		PREDICTION_START: "channel.prediction.begin",
		PREDICTION_PROGRESS: "channel.prediction.progress",
		PREDICTION_LOCK: "channel.prediction.lock",
		PREDICTION_END: "channel.prediction.end",
		CHARITY_DONATE: "channel.charity_campaign.donate",
		CHARITY_START: "channel.charity_campaign.start",
		CHARITY_PROGRESS: "channel.charity_campaign.progress",
		CHARITY_STOP: "channel.charity_campaign.stop",
		DROP: "drop.entitlement.grant",
		BITS_EXTENSION: "extension.bits_transaction.create",
		GOAL_START: "channel.goal.begin",
		GOAL_PROGRESS: "channel.goal.progress",
		GOAL_END: "channel.goal.end",
		HYPE_TRAIN_START: "channel.hype_train.begin",
		HYPE_TRAIN_PROGRESS: "channel.hype_train.progress",
		HYPE_TRAIN_END: "channel.hype_train.end",
		SHIELD_MODE_START: "channel.shield_mode.begin",
		SHIELD_MODE_STOP: "channel.shield_mode.end",
		STREAM_ON: "stream.online",
		STREAM_OFF: "stream.offline",
		SHOUTOUT_OUT: "channel.shoutout.create",
		SHOUTOUT_IN: "channel.shoutout.receive",
		AD_BREAK_BEGIN: "channel.ad_break.begin",
		UNBAN_REQUEST_NEW: "channel.unban_request.create",
		UNBAN_REQUEST_RESOLVED: "channel.unban_request.resolve",
		CHAT_WARN_ACKNOWLEDGE: "channel.warning.acknowledge",
		CHAT_WARN_SENT: "channel.warning.send",
		AUTOMOD_TERMS_UPDATE: "automod.terms.update",
		AUTOMOD_MESSAGE_UPDATE: "automod.message.update",
		AUTOMOD_MESSAGE_HELD: "automod.message.hold",
		SUSPICIOUS_USER_MESSAGE: "channel.suspicious_user.message",
		SUSPICIOUS_USER_UPDATE: "channel.suspicious_user.update",
		CHAT_CLEAR: "channel.chat.clear",
		DELETE_MESSAGE: "channel.chat.message_delete",
		WHISPERS: "user.whisper.message",
		BITS_USE: "channel.bits.use",
	} as const;
	export type SubscriptionStringTypes = typeof SubscriptionTypes[keyof typeof SubscriptionTypes];

	export interface EventSubMessage {
		metadata: {
			message_id: string;
			message_type: "session_welcome" | "session_keepalive" | "session_reconnect" | "notification" | "revocation";
			message_timestamp: string;
			subscription_type: SubscriptionStringTypes;
			subscription_version: string;
		};
		payload: Payload | WelcomePayload | ReconnectPayload | RevocationPayload;
	}

	export interface WelcomePayload {
		session: {
			id: string;
			status: string;
			connected_at: string;
			keepalive_timeout_seconds: number;
			reconnect_url: string | null;
			recovery_url: string | null;
		}
	}

	export interface ReconnectPayload {
		session: {
			reconnect_url: string;
		}
	}

	export interface RevocationPayload {
		subscription: {
			id: string;
			status: string;
			type: SubscriptionStringTypes;
			version: string;
			condition: {
				broadcaster_user_id: string;
				moderator_user_id: string;
			};
			transport: {
				method: string;
				session_id: string;
			};
			created_at: string;
			cost: number;
		};
	}

	export interface Payload {
		subscription: {
			id: string;
			type: string;
			version: string;
			status: "enabled";
			cost: number;
			condition: {
				user_id: string;
				broadcaster_user_id: string;
			};
			transport: {
				method: "webhook" | "websocket";
				callback?: string;
			};
			created_at: string;
		},
		event: ChannelUpdateEvent
		| FollowEvent
		| SubEvent
		| SubgiftEvent
		| SubRenewEvent
		| BitsEvent
		| RaidEvent
		| BanEvent
		| UnbanEvent
		| ModeratorAddEvent
		| ModeratorRemoveEvent
		| RewardCreateEvent
		| RewardUpdateEvent
		| RewardRemoveEvent
		| RewardRedeemEvent
		| RewardRedeemUpdateEvent
		| PollStartEvent
		| PollProgressEvent
		| PollEndEvent
		| PredictionStartEvent
		| PredictionProgressEvent
		| PredictionLockEvent
		| PredictionEndEvent
		| HypeTrainStartEvent
		| HypeTrainProgressEvent
		| HypeTrainEndEvent
		| ShieldModeStartEvent
		| ShieldModeStopEvent
		| BitsExtensionEvent
		| GoalStartEvent
		| GoalProgressEvent
		| GoalEndEvent
		| StreamOnlineEvent
		| StreamOfflineEvent
		| WhisperEvent
		;
	}


	export interface ChannelUpdateEvent {
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		title: string;
		language: string;
		category_id: string;
		category_name: string;
		is_mature: boolean;
		content_classification_labels: string[];
	}


	export interface FollowEvent {
		user_id: string;
		user_login: string;
		user_name: string;
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		followed_at: string;
	}


	export interface SubEvent {
		user_id: string;
		user_login: string;
		user_name: string;
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		tier: string;
		is_gift: boolean;
	}

	//Says "user gifted X sub tier Y to the community for a total of Z gifts"
	//TO get the actual subgifts info, listen for the SubEvent
	export interface SubgiftEvent extends SubEvent {
		total: number;
		cumulative_total: number;//null if anonymous or not shared by the user
		is_anonymous: boolean;
	}


	export interface SubRenewEvent extends SubEvent {
		message: {
			text: string;
			emotes: {
				begin: number;
				end: number;
				id: string;
			}[];
		};
		cumulative_months: number;
		streak_months: number;
		duration_months: number;
	}

	export interface BitsEvent {
		is_anonymous: boolean;
		user_id: string;// null if is_anonymous=true
		user_login: string;// null if is_anonymous=true
		user_name: string;// null if is_anonymous=true
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		message: string;
		bits: number;
	}

	export interface RaidEvent {
		from_broadcaster_user_id: string;
		from_broadcaster_user_login: string;
		from_broadcaster_user_name: string;
		to_broadcaster_user_id: string;
		to_broadcaster_user_login: string;
		to_broadcaster_user_name: string;
		viewers: number;
	}

	export interface BanEvent extends UnbanEvent {
		reason: string;
		banned_at: string;
		ends_at: string;
		is_permanent: boolean;
	}

	export interface UnbanEvent {
		user_id: string;
		user_login: string;
		user_name: string;
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		moderator_user_id: string;
		moderator_user_login: string;
		moderator_user_name: string;
	}

	export interface ModeratorAddEvent {
		user_id: string;
		user_login: string;
		user_name: string;
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
	}

	export type ModeratorRemoveEvent = ModeratorAddEvent

	export interface RewardCreateEvent {
		id: string;
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		is_enabled: boolean;
		is_paused: boolean;
		is_in_stock: boolean;
		title: string;
		cost: number;
		prompt: string;
		is_user_input_required: boolean;
		should_redemptions_skip_request_queue: boolean;
		cooldown_expires_at?: string;
		redemptions_redeemed_current_stream?: number;
		max_per_stream: {
			is_enabled: boolean;
			value: number;
		};
		max_per_user_per_stream: {
			is_enabled: boolean;
			value: number;
		};
		global_cooldown: {
			is_enabled: boolean;
			seconds: number;
		};
		background_color: string;
		image: {
			url_1x: string;
			url_2x: string;
			url_4x: string;
		};
		default_image: {
			url_1x: string;
			url_2x: string;
			url_4x: string;
		};
	}

	export type RewardUpdateEvent = RewardRedeemEvent

	export type RewardRemoveEvent = RewardRedeemEvent

	export interface RewardRedeemEvent {
		id: string;
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		user_id: string;
		user_login: string;
		user_name: string;
		user_input: string;
		status: string;
		reward: {
			id: string;
			title: string;
			cost: number;
			prompt: string;
		};
		redeemed_at: string;
	}

	export interface RewardRedeemUpdateEvent {
		id: string;
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		user_id: string;
		user_login: string;
		user_name: string;
		user_input?: string;
		status: "fulfilled" | "cancelled";
		reward: {
			id: string;
			title: string;
			cost: number;
			prompt: string;
		};
		redeemed_at: string;
	}

	export interface AutomaticRewardRedeemEvent {
		id: string;
		broadcaster_user_id: string;
		broadcaster_user_name: string;
		broadcaster_user_login: string;
		user_id: string;
		user_name: string;
		user_login: string;
		user_input?: string;
		reward: {
			type: "single_message_bypass_sub_mode" |
			"send_highlighted_message" |
			"random_sub_emote_unlock" |
			"chosen_sub_emote_unlock" |
			"chosen_modified_sub_emote_unlock" |
			"message_effect" |
			"gigantify_an_emote" |
			"celebration";
			cost: number;
			unlocked_emote: {id:string};//TODO confirm data format
		}
		message: {
			text: string;
			emotes: {
				id: string;
				begin: number;
				end: number;
			}[]
		}
		redeemed_at: string;
	}

	export interface PollStartEvent {
		id: string;
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		title: string;
		choices: {
			id: string;
			title: string;
		}[];
		channel_points_voting: {
			is_enabled: boolean;
			amount_per_vote: number;
		};
		started_at: string;
		ends_at: string;
	}

	export interface PollProgressEvent extends PollStartEvent {
		choices: {
			id: string;
			title: string;
			channel_points_votes: number;
			votes: number;
		}[];
	}

	export interface PollEndEvent extends PollStartEvent {
		choices: {
			id: string;
			title: string;
			channel_points_votes: number;
			votes: number;
		}[];
		status: "completed"|"archived",
		ended_at: string,
	}

	export interface PredictionStartEvent {
		id: string;
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		title: string;
		outcomes: {
			id: string;
			title: string;
			color: string;
		}[];
		started_at: string;
		locks_at: string;
	}

	export interface PredictionProgressEvent extends PredictionStartEvent {
		outcomes: {
			id: string;
			title: string;
			color: string;
			users: number;
			channel_points: number;
			top_predictors: {
				user_name: string;
				user_login: string;
				user_id: string;
				channel_points_won?: number;
				channel_points_used: number;
			}[];
		}[];
	}

	export interface PredictionLockEvent extends PredictionProgressEvent {
		locked_at: string;
	}

	export interface PredictionEndEvent extends PredictionProgressEvent {
		status: "resolved" | "canceled";
		ended_at: string;
		winning_outcome_id: string;
	}

	interface AbstractHypeTrainEvent {
		id: string
		broadcaster_user_id: string
		broadcaster_user_login: string
		broadcaster_user_name: string
		top_contributions: {
			user_id: string
			user_login: string
			user_name: string
			type: string
			total: number
		}[]
		is_shared_train: boolean
		type: "regular"|"treasure"|"golden_kappa"
		started_at: string
		total: number
		level: number
		shared_train_participants: {
			broadcaster_user_id: string
			broadcaster_user_login: string
			broadcaster_user_name: string
		}[] | null
	}

	export interface HypeTrainStartEvent extends AbstractHypeTrainEvent{
		progress: number
		goal: number
		all_time_high_level: number
		all_time_high_total: number
		expires_at: string
	}

	export interface HypeTrainProgressEvent extends AbstractHypeTrainEvent{
		progress: number
		goal: number
		level: number
		expires_at: string
	}

	export interface HypeTrainEndEvent extends AbstractHypeTrainEvent{
		ended_at: string
		cooldown_ends_at: string
	}

	export interface ShieldModeEvent {
		broadcaster_user_id: string;
		broadcaster_user_name: string;
		broadcaster_user_login: string;
		moderator_user_id: string;
		moderator_user_name: string;
		moderator_user_login: string;
	}

	export interface ShieldModeStartEvent extends ShieldModeEvent {
		started_at: string;
	}

	export interface ShieldModeStopEvent extends ShieldModeEvent {
		ended_at: string;
	}

	export interface BitsExtensionEvent {
		id: string;
		extension_client_id: string;
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		user_name: string;
		user_login: string;
		user_id: string;
		product: {
			name: string;
			sku: string;
			bits: number;
			in_development: boolean;
		};
	}

	export interface GoalStartEvent {
		id: string;
		broadcaster_user_id: string;
		broadcaster_user_name: string;
		broadcaster_user_login: string;
		type: string;
		description: string;
		current_amount: number;
		target_amount: number;
		started_at: string;
	}

	export interface GoalProgressEvent { }

	export interface GoalEndEvent {
		is_achieved: boolean;
		ended_at: string;
	}

	export interface StreamOnlineEvent {
		id: string;
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		type: string;
		started_at: Date;
	}

	export interface StreamOfflineEvent {
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
	}

	export interface ShoutoutOutEvent {
		broadcaster_user_id: string;
		broadcaster_user_name: string;
		broadcaster_user_login: string;
		moderator_user_id: string;
		moderator_user_name: string;
		moderator_user_login: string;
		to_broadcaster_user_id: string;
		to_broadcaster_user_name: string;
		to_broadcaster_user_login: string;
		started_at: string;
		viewer_count: number;
		cooldown_ends_at: string;
		target_cooldown_ends_at: string;
	}

	export interface ShoutoutInEvent {
		broadcaster_user_id: string;
		broadcaster_user_name: string;
		broadcaster_user_login: string;
		from_broadcaster_user_id: string;
		from_broadcaster_user_name: string;
		from_broadcaster_user_login: string;
		viewer_count: number;
		started_at: string;
	}

	export interface AdBreakEvent {
		broadcaster_user_id:string;
		broadcaster_user_login:string;
		broadcaster_user_name:string;
		requester_user_id:string;
		requester_user_login:string;
		requester_user_name:string;
		duration_seconds:number;
		is_automatic:boolean;
		started_at:string
	}

	export interface UnbanRequestResolveEvent {
		id: string;
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		moderator_user_id: string;
		moderator_user_login: string;
		moderator_user_name: string;
		user_id: string;
		user_login: string;
		user_name: string;
		resolution_text: string;
		status: string;
	}

	export interface UnbanRequestEvent {
		id: string;
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		user_id: string;
		user_login: string;
		user_name: string;
		text: string;
		created_at: string;
	}

	export interface AutomodTermsUpdateEvent {
		broadcaster_user_id: string;
		broadcaster_user_name: string;
		broadcaster_user_login: string;
		moderator_user_id: string;
		moderator_user_login: string;
		moderator_user_name: string;
		action:"add_permitted"|"remove_permitted"|"add_blocked"|"remove_blocked";
		from_automod: boolean;
		terms: string[];
	}

	export interface AutomodMessageHeldEvent {
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		user_id: string;
		user_login: string;
		user_name: string;
		message_id: string;
		message: {
			text:string;
			fragments:MessageFragments;
		};
		reason: "automod" | "blocked_term";
		automod?: {
			category: string;
			level: number;
			boundaries: {
				start_pos: number;
				end_pos: number;
			}[];
		};
		blocked_term?: {
			terms_found: {
				term_id: string;
				owner_broadcaster_user_id: string;
				owner_broadcaster_user_login: string;
				owner_broadcaster_user_name: string;
				boundary: {
					start_pos: number;
					end_pos: number;
				};
			}[];
		};
		held_at: string;
	}

	export interface AutomodMessageUpdateEvent extends AutomodMessageHeldEvent {
		moderator_user_id: string;
		moderator_user_login: string;
		moderator_user_name: string;
		status: "approved"|"denied";
	}

	export type ModerationEvent  = ModerationEvent_raid
								| ModerationEvent_unraid
								| ModerationEvent_mod
								| ModerationEvent_unmod
								| ModerationEvent_vip
								| ModerationEvent_unvip
								| ModerationEvent_ban
								| ModerationEvent_unban
								| ModerationEvent_timeout
								| ModerationEvent_untimeout
								| ModerationEvent_deletemessage
								| ModerationEvent_followon
								| ModerationEvent_followoff
								| ModerationEvent_subson
								| ModerationEvent_subsoff
								| ModerationEvent_emoteson
								| ModerationEvent_emotesoff
								| ModerationEvent_slowon
								| ModerationEvent_slowoff
								| ModerationEvent_warn
								| ModerationEvent_clear
	;

	export interface ModerationEvent_base {
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		moderator_user_id: string;
		moderator_user_login: string;
		moderator_user_name: string;
	}

	export interface ModerationEvent_raid extends ModerationEvent_base {
		action: "raid";
		raid: { user_id: string; user_login: string; user_name: string; viewer_count: number; };
	}

	export interface ModerationEvent_unraid extends ModerationEvent_base {
		action: "unraid";
		unraid: { user_id: string; user_login: string; user_name: string; }
	}

	export interface ModerationEvent_mod extends ModerationEvent_base {
		action: "mod";
		mod: {user_id: string, user_login: string, user_name: string};
	}

	export interface ModerationEvent_unmod extends ModerationEvent_base {
		action: "unmod";
		unmod: {user_id: string, user_login: string, user_name: string};
	}

	export interface ModerationEvent_vip extends ModerationEvent_base {
		action: "vip";
		vip: {user_id: string, user_login: string, user_name: string};
	}

	export interface ModerationEvent_unvip extends ModerationEvent_base {
		action: "unvip";
		unvip: {user_id: string, user_login: string, user_name: string};
	}

	export interface ModerationEvent_ban extends ModerationEvent_base {
		action: "ban";
		ban: {user_id: string, user_login: string, user_name: string; reason:string};
	}

	export interface ModerationEvent_unban extends ModerationEvent_base {
		action: "unban";
		unban: {user_id: string, user_login: string, user_name: string};
	}

	export interface ModerationEvent_timeout extends ModerationEvent_base {
		action: "timeout";
		timeout: {
			user_id: string;
			user_login: string;
			user_name: string;
			reason: string;
			expires_at: string;
		};
	}

	export interface ModerationEvent_untimeout extends ModerationEvent_base {
		action: "untimeout";
		untimeout: {user_id: string, user_login: string, user_name: string};
	}

	export interface ModerationEvent_deletemessage extends ModerationEvent_base {
		action: "delete";
		delete:{
			user_id: string;
			user_login: string;
			user_name: string;
			message_id: string;
			message_body: string;
		}
	}

	export interface ModerationEvent_followon extends ModerationEvent_base {
		action: "followers";
		followers:{follow_duration_minutes: 50}
	}

	export interface ModerationEvent_followoff extends ModerationEvent_base {
		action: "followersoff";
	}

	export interface ModerationEvent_subson extends ModerationEvent_base {
		action: "subscribers";
	}

	export interface ModerationEvent_subsoff extends ModerationEvent_base {
		action: "subscribersoff";
	}

	export interface ModerationEvent_emoteson extends ModerationEvent_base {
		action: "emoteonly";
	}

	export interface ModerationEvent_emotesoff extends ModerationEvent_base {
		action: "emoteonlyoff";
	}

	export interface ModerationEvent_slowon extends ModerationEvent_base {
		action: "slow";
		slow:{wait_time_seconds:number}
	}

	export interface ModerationEvent_slowoff extends ModerationEvent_base {
		action: "slowoff";
	}

	export interface ModerationEvent_clear extends ModerationEvent_base {
		action: "clear";
	}

	export interface ModerationEvent_warn extends ModerationEvent_base {
		action: "warn";
		warn: {
			user_id: string;
			user_login: string;
			user_name: string;
			reason: string|null;
			chat_rules_cited: string[];
		}
	}

	export interface WarningSentEvent {
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		user_id: string;
		user_login: string;
		user_name: string;
		moderator_user_id:string;
		moderator_user_login:string;
		moderator_user_name:string;
		reason:string|null;
		chat_rules_cited:string[];
	}

	export interface WarningAcknowledgeEvent {
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		user_id: string;
		user_login: string;
		user_name: string;
	}

	export interface SuspiciousUserStateUpdate {
		broadcaster_user_id: string;
		broadcaster_user_name: string;
		broadcaster_user_login: string;
		moderator_user_id: string;
		moderator_user_name: string;
		moderator_user_login: string;
		user_id: string;
		user_name: string;
		user_login: string;
		low_trust_status: "active_monitoring"|"restricted";
	}

	export interface SuspiciousUserMessage {
		broadcaster_user_id: string;
		broadcaster_user_name: string;
		broadcaster_user_login: string;
		user_id: string;
		user_name: string;
		user_login: string;
		low_trust_status: "none"|"active_monitoring"|"restricted";
		shared_ban_channel_ids?: string[];
		types: ("manually_added"|"ban_evader_detector"|"shared_channel_ban"|string)[];
		ban_evasion_evaluation: "unknown”"|"possible"|"likely";
		message:  {
			message_id: string;
			text: string;
			fragments: MessageFragments;
		};
	}

	export interface WhisperEvent {
		from_user_id: string
		from_user_login: string
		from_user_name: string
		to_user_id: string
		to_user_login: string
		to_user_name: string
		whisper_id: string
		whisper: {
			text: string
		}
	}

	export interface ChatMessageEvent {
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		chatter_user_id: string;
		chatter_user_login: string;
		chatter_user_name: string;
		message_id: string;
		message: {
			text:string;
			fragments:MessageFragments;
		};
		color: string;
		badges: {
			set_id: string;
			id: string;
			info: string;
		}[];
		message_type: "text" | "channel_points_highlighted";
		cheer?: {
			bits:number;
		};
		reply?: {
			parent_message_id: string;
			parent_message_body: string;
			parent_user_id: string;
			parent_user_name: string;
			parent_user_login: string;
			thread_message_id: string;
			thread_user_id: string;
			thread_user_name: string;
			thread_user_login: string;
		};
		channel_points_custom_reward_id?: string;
		channel_points_animation_id?: string;
		source_broadcaster_user_id?: string;
		source_broadcaster_user_login?: string;
		source_broadcaster_user_name?: string;
		source_message_id?: string;
		source_badges?:  {
			set_id: string;
			id: string;
			info: string;
		}[];
	}

	export type MessageFragments = (MessageFragmentText|MessageFragmentEmote|MessageFragmentMention|MessageFragmentCheermote)[];

	interface MessageFragmentText {
		type: "text";
		text: string;
	}

	interface MessageFragmentEmote {
		type: "emote";
		text: string;
		emote: {
			id: string;
			format: Array<"static" | "animated">;
			emote_set_id: string;
			owner_id: string;
		}
	}

	interface MessageFragmentCheermote {
		type: "cheermote";
		text: string;
		/**
		 * Cheermote info
		 * Actual cheermote text code is a concatenation of prefix and bits values
		 */
		cheermote:{
			prefix: string;
			bits: number;
			tier: number;
		}
	}

	interface MessageFragmentMention {
		type: "mention";
		text: string;
		mention:{
			user_id: string;
			user_login: string;
			user_name: string;
		}
	}

	export interface ChatClearEvent {
        broadcaster_user_id: string;
        broadcaster_user_name: string;
        broadcaster_user_login: string;
	}

	export interface ChatDeleteMessageEvent {
        broadcaster_user_id: string;
        broadcaster_user_name: string;
        broadcaster_user_login: string;
        target_user_id: string;
        target_user_name: string;
        target_user_login: string;
        message_id: string;
	}

	export interface CharityStartEvent extends CharityProgressEvent{
		started_at: string;
	}

	export interface CharityStopEvent extends CharityProgressEvent{
		stopped_at: string;
	}

	export interface CharityDonationEvent {
		id: string;
		campaign_id: string;
		broadcaster_user_id: string;
		broadcaster_user_name: string;
		broadcaster_user_login: string;
		user_id: string;
		user_login: string;
		user_name: string;
		charity_name: string;
		charity_description: string;
		charity_logo: string;
		charity_website: string;
		amount: {
			value: number;
			decimal_places: number;
			currency: string;
		};
	}

	export interface CharityProgressEvent {
		id: string;
		broadcaster_id: string;
		broadcaster_name: string;
		broadcaster_login: string;
		charity_name: string;
		charity_description: string;
		charity_logo: string;
		charity_website: string;
		current_amount: {
			value: number;
			decimal_places: number;
			currency: string;
		};
		target_amount: {
			value: number;
			decimal_places: number;
			currency: string;
		};
	}

	export interface SharedChatStartEvent {
		session_id: string;
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		host_broadcaster_user_id: string;
		host_broadcaster_user_login: string;
		host_broadcaster_user_name: string;
		participants: {
			broadcaster_user_id: string;
			broadcaster_user_name: string;
			broadcaster_user_login: string;
		}[];
	}

	export interface SharedChatUpdateEvent extends SharedChatStartEvent {
	}

	export interface SharedChatEndEvent {
	}

	export interface BitsUseEvent {
		user_id: string;
		user_login: string;
		user_name: string;
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		bits: number;
		type: "cheer"|"power_up"|"combo";
		power_up: null | {
			type: "gigantify_an_emote" | "celebration";
			emote: {
				id: string;
				name: string;
			};
			message_effect_id: null;
		} | {
			type: "message_effect";
			emote: null
			message_effect_id: "simmer"|"rainbow-eclipse"|"cosmic-abyss";
		};
		message: {
			text:string;
			fragments:MessageFragments;
		} | null;
	}
}



