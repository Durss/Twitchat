export namespace TwitchEventSubDataTypes {

	export const SubscriptionTypes = {
		CHANNEL_UPDATE: "channel.update",
		FOLLOW: "channel.follow",
		SUB: "channel.subscribe",
		SUB_END: "channel.subscription.end",
		SUBGIFT: "channel.subscription.gift",
		RESUB: "channel.subscription.message",
		BITS: "channel.cheer",
		RAID: "channel.raid",
		BAN: "channel.ban",
		UNBAN: "channel.unban",
		MODERATOR_ADD: "channel.moderator.add",
		MODERATOR_REMOVE: "channel.moderator.remove",
		REWARD_CREATE: "channel.channel_points_custom_reward.add",
		REWARD_UPDATE: "channel.channel_points_custom_reward.update",
		REWARD_DELETE: "channel.channel_points_custom_reward.remove",
		REWARD_REDEEM: "channel.channel_points_custom_reward_redemption.add",
		REWARD_REDEEM_UPDATE: "channel.channel_points_custom_reward_redemption.update",
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
	} as const;
	export type SubscriptionStringTypes = typeof SubscriptionTypes[keyof typeof SubscriptionTypes];

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
		event: ChannelUpdateEvent |
		FollowEvent |
		SubEvent |
		SubgiftEvent |
		SubRenewEvent |
		BitsEvent |
		RaidEvent |
		BanEvent |
		UnbanEvent |
		ModeratorAddEvent |
		ModeratorRemoveEvent |
		RewardCreateEvent |
		RewardUpdateEvent |
		RewardRemoveEvent |
		RewardRedeemEvent |
		RewardRedeemUpdateEvent |
		PollStartEvent |
		PollProgressEvent |
		PollEndEvent |
		PredictionStartEvent |
		PredictionProgressEvent |
		PredictionLockEvent |
		PredictionEndEvent |
		HypeTrainStartEvent |
		HypeTrainProgressEvent |
		ShieldModeStartEvent |
		ShieldModeStopEvent |
		BitsExtensionEvent |
		GoalStartEvent |
		GoalProgressEvent |
		GoalEndEvent |
		StreamOnlineEvent |
		StreamOfflineEvent;

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

	export interface ModeratorRemoveEvent extends ModeratorAddEvent { }

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

	export interface RewardUpdateEvent extends RewardRedeemEvent {
	}

	export interface RewardRemoveEvent extends RewardRedeemEvent {
	}

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
		user_input: string;
		status: "fulfilled" | "cancelled";
		reward: {
			id: string;
			title: string;
			cost: number;
			prompt: string;
		};
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
		status: "completed",
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
				user_id: any;
				channel_points_won?: any;
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
	}

	export interface HypeTrainStartEvent {
		id: string;
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		total: number;
		progress: number;
		goal: number;
		top_contributions: {
			user_id: string;
			user_login: string;
			user_name: string;
			type: string;
			total: number;
		}[];
		last_contribution: {
			user_id: string;
			user_login: string;
			user_name: string;
			type: string;
			total: number;
		};
		level: number;
		started_at: string;
		expires_at: string;
	}

	export interface HypeTrainProgressEvent {
		id: string;
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		level: number;
		total: number;
		top_contributions: {
			user_id: string;
			user_login: string;
			user_name: string;
			type: string;
			total: number;
		}[];
		started_at: string;
		ended_at: string;
		cooldown_ends_at: string;
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
}