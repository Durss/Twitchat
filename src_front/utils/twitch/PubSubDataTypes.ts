import type { ChatUserstate } from "tmi.js";

export namespace PubSubDataTypes {

	export interface SocketMessage {
		type: string;
		data: {
			message: string;
			topic: string;
		}
	}

	export interface Following {
		display_name: string;
		username: string;
		user_id: string;
	}

	export interface Shoutout {
		type: "create";
		data: {
			broadcasterUserID:string;
			targetUserID:string;//user a shoutout has been given to
			targetLogin:string;
			targetUserProfileImageURL:string;
			sourceUserID:string;//user that made the shoutout
			sourceLogin:string;
			shoutoutID:string;
			targetUserDisplayName:string;
			targetUserCTAInfo:string;
			targetUserPrimaryColorHex:string;
		}
	}

	export interface PinMessage {
        id: string;
        pinned_by: {
			id: string;
			display_name: string;
		};
        message: {
			id: string;
			sender: {
				id: string;
				display_name: string;
				badges: {
					id: string;
					version: string;
				}[];
				chat_color: string;
			};
			content: {
				text: string;
				fragments: {
					text: string;
				}[];
			};
			type: "CHEER"|"MOD",
			starts_at: number,
			updated_at: number,
			ends_at: number,
			sent_at: number,
			metadata: {
				bitsAmount: number,
				level: "ONE"|"TWO"|"THREE"|"FOUR"|"FIVE"|"SIX"|"SEVEN"|"EIGHT"
			}
		}
	}

	export interface PinUpdateMessage {
		id: string;
		ends_at: number;
		updated_at: number;
	}

	export interface UnpinMessage {
        id: string;
        unpinned_by: {
			id: string;
			display_name: string;
		};
        reason: string;
	}

	export interface PlaybackInfo {
		type: string;
		server_time: number;
		viewers: number;
	}

	export interface AutomodData {
		content_classification: {
			category: string;
			level: number;
		};
		message: {
			content: {
				text: string;
				fragments: {
					text: string;
					emoticon: {
						emoticonID: string,
						emoticonSetID: string
					},
					automod: {
						topics: { [key: string]: string },
					};
				}[];
			};
			id: string;
			sender: {
				user_id: string;
				login: string;
				display_name: string;
				chat_color: string;
			};
			sent_at: string;
		};
		reason_code: string;
		resolver_id: string;
		resolver_login: string;
		status: string;
	}

	export interface ModerationData {
		type: string;
		moderation_action: string;
		args?: string[];
		created_by: string;
		created_by_user_id: string;
		created_at: string;
		msg_id: string;
		target_user_id: string;
		target_user_login: string;
		from_automod: boolean;
	}

	export interface PollData {
		poll: {
			poll_id: string;
			owned_by: string;
			created_by: string;
			title: string;
			started_at: string;
			ended_at?: string;
			ended_by?: string;
			duration_seconds: number;
			settings: {
				multi_choice: { is_enabled: boolean; };
				subscriber_only: { is_enabled: boolean; };
				subscriber_multiplier: { is_enabled: boolean; };
				channel_points_votes: {
					is_enabled: boolean;
					cost: number;
				};
			};
			status: string;
			choices: {
				choice_id: string;
				title: string;
				votes: {
					total: number;
					bits: number;
					channel_points: number;
					base: number;
				};
				tokens: {
					bits: number;
					channel_points: number;
				};
				total_voters: number;
			}[];
			votes: {
				total: number;
				bits: number;
				channel_points: number;
				base: number;
			};
			tokens: {
				bits: number;
				channel_points: number;
			};
			total_voters: number;
			remaining_duration_milliseconds: number;
			top_contributor?: {
				user_id: string,
				display_name: string,
			};
			top_bits_contributor?: {
				user_id: string,
				display_name: string,
				bits_contributed: number
			};
			top_channel_points_contributor?: {
				user_id: string,
				display_name: string,
				channel_points_contributed: number
			};
		}
	}

	export interface RewardData {
		timestamp: string;
		redemption: {
			id: string;
			user: {
				id: string;
				login: string;
				display_name: string;
			};
			channel_id: string;
			redeemed_at: string;
			user_input?: string;
			reward: {
				id: string;
				channel_id: string;
				title: string;
				prompt: string;
				cost: number;
				is_user_input_required: boolean;
				is_sub_only: boolean;
				image: Image;
				default_image: DefaultImage;
				background_color: string;
				is_enabled: boolean;
				is_paused: boolean;
				is_in_stock: boolean;
				max_per_stream: MaxPerStream;
				should_redemptions_skip_request_queue: boolean;
				template_id?: unknown;
				updated_for_indicator_at: string;
				max_per_user_per_stream: MaxPerUserPerStream;
				global_cooldown: GlobalCooldown;
				redemptions_redeemed_current_stream?: unknown;
				cooldown_expires_at?: unknown;
			};
			status: string;
		};
	}

	export interface PredictionData {
		timestamp: string;
		event: {
			id: string;
			channel_id: string;
			created_at: string;
			created_by: {
				type: string;
				user_id: string;
				user_display_name: string;
				extension_client_id?: string;
			};
			ended_at?: string;
			ended_by?: string;
			locked_at?: string;
			locked_by?: string;
			outcomes: {
				id: string;
				color: string;
				title: string;
				total_points: number;
				total_users: number;
				top_predictors: {
					id: string,
					event_id: string,
					outcome_id: string,
					channel_id: string,
					points: number,
					predicted_at: string,
					updated_at: string,
					user_id: string,
					result: {
						type: "WIN" | "LOSE",
						points_won: number,
						is_acknowledged: boolean,
					},
					user_display_name: string
				}[];
				badge: {
					version: string;
					set_id: string;
				};
			}[];
			prediction_window_seconds: number;
			status: "RESOLVE_PENDING" | "RESOLVED" | "LOCKED" | "ACTIVE" | "CANCEL_PENDING" | "CANCELED";
			title: string;
			winning_outcome_id?: string;
		};
	}

	interface Image {
		url_1x: string;
		url_2x: string;
		url_4x: string;
	}

	interface DefaultImage {
		url_1x: string;
		url_2x: string;
		url_4x: string;
	}

	interface MaxPerStream {
		is_enabled: boolean;
		max_per_stream: number;
	}

	interface MaxPerUserPerStream {
		is_enabled: boolean;
		max_per_user_per_stream: number;
	}

	interface GlobalCooldown {
		is_enabled: boolean;
		global_cooldown_seconds: number;
	}

	export interface HypeTrainApproaching {
		channel_id: string;
		goal: number;
		events_remaining_durations: { [key: string]: number };
		level_one_rewards: {
			type: string;
			id: string;
			group_id: string;
			reward_level: number;
			set_id: string;
			token: string;
			reward_end_date: string;
		}[];
		creator_color: string;
		participants: string[];
		approaching_hype_train_id: string;
		is_boost_train: boolean;
		is_golden_kappa_train: boolean;
		expires_at: string;
	}

	export interface HypeTrainStart {
		__typename: string;
		id: string;
		startedAt: string;
		expiresAt: string;
		updatedAt: string;
		endedAt?: any;
		endReason: string;
		isGoldenKappaTrain: boolean;
		/**
		 * @deprecated doesn't exist anymore, replaced by isGoldenKappaTrain
		 */
		is_golden_kappa_train: boolean;
		progress: {
			__typename: string;
			id: string;
			goal: number;
			value: number;
			progression: number;
			total: number;
			level: {
				__typename: string;
				id: string;
				value: number;
				goal: number;
				rewards: {
					__typename: string;
					id: string;
					type: string;
					emote: {
						__typename: string;
						id: string;
						token: string;
					};
				}[];
			};
			allTimeHighState: string;
		};
		conductors: any[];
		config:  {
			__typename: string;
			id: string;
			willUseCreatorColor: boolean;
			primaryHexColor?: any;
			conductorRewards: {
				__typename: string;
				source: string;
				type: string;
				rewards: {
					__typename: string;
					id: string;
					type: string;
					badge: {
						__typename: string;
						id: string;
						setID: string;
						imageURL: string;
					};
				}[];
			}[];
			participationConversionRates: {
				__typename: string;
				action: string;
				source: string;
				value: number;
			}[];
			calloutEmote: {
				__typename: string;
				id: string;
				token: string;
			};
			difficulty: string;
			difficultySettings: {
				__typename: string;
				difficulty: string;
				maxLevel: number;
			}[];
			potentialRewards: {
				__typename: string;
				id: string;
				level: number;
				value: {
					__typename: string;
					id: string;
					type: string;
					badge: {
						__typename: string;
						id: string;
						setID: string;
						imageURL: string;
					};
				};
			}[];
			kickoff: {
				__typename: string;
				minPoints: number;
			};
		};
		allTimeHigh: {
			__typename: string;
			goal: number;
			progression: number;
			total: number;
			level: {
				__typename: string;
				id: string;
				value: number;
			};
		};
		isFastMode: boolean;
		participations: {
			__typename: string;
			source: string;
			action: string;
			quantity: number;
		}[];
	}

	export interface HypeTrainProgress {
		id: string;
		user_profile_image_url: string;
		action: string;
		initiator_currency?: any;
		is_fast_mode: boolean;
		expires_at: string;

		user_id: string;
		user_login: string;
		user_display_name: string;
		/**
		 * Contains the total points of the train
		 * Same value as progress.total
		 */
		sequence_id: number;
		source: "SUBS" | "BITS" | "EXPLICIT_PURCHASE";
		/**
		 * Number of subgifts or bits that triggered this event
		 */
		quantity: number;
		/**
		 * Progress info of the trian
		 */
		progress: HypeProgressInfo;
		/**
		 * true if it's a boost train
		 */
		is_boost_train: boolean;
		/**
		 * Event triggered by a large amount of subgifts or bits
		 */
		is_large_event: boolean;
	}

	export interface HypeTrainActionContribution {
		"CHEER": number;
		"EXTENSION": number;
		"TIER_1_GIFTED_SUB": number;
		"TIER_1_SUB": number;
		"TIER_2_GIFTED_SUB": number;
		"TIER_2_SUB": number;
		"TIER_3_GIFTED_SUB": number;
		"TIER_3_SUB": number;
		"PAID_PINNED_CHAT": number;
	}


	export interface HypeTrainConductorUpdate {
		source: "SUBS" | "BITS";
		user: {
			id: string;
			login: string;
			display_name: string;
			profile_image_url: string;
		};
		participations: HypeTrainConductorContribution;
	}

	export interface HypeTrainConductorContribution {
		"BITS.CHEER": number;
		"BITS.EXTENSION": number;
		"SUBS.TIER_1_GIFTED_SUB": number;
		"SUBS.TIER_1_SUB": number;
		"SUBS.TIER_2_GIFTED_SUB": number;
		"SUBS.TIER_2_SUB": number;
		"SUBS.TIER_3_GIFTED_SUB": number;
		"SUBS.TIER_3_SUB": number;
	}

	export interface HypeTrainLevelUp {
		time_to_expire: number;
		progress: HypeProgressInfo;
		is_boost_train: boolean;
		hype_train:{
			isGoldenKappaTrain: boolean,
		}
	}

	export interface HypeTrainEnd {
		ended_at: number;
		ending_reason: "COMPLETED" | "EXPIRE";
		is_boost_train: boolean;
		participation_totals:HypeTrainParticipation[]
	}

	export interface HypeTrainParticipation {
		source: "SUBS" | "BITS" | "EXPLICIT_PURCHASE",
		action: keyof HypeTrainActionContribution,
		quantity: number
	}

	interface HypeProgressInfo {
		level: {
			value: number;
			goal: number;
			rewards: {
				type: string;
				id: string;
				group_id: string;
				reward_level: number;
				set_id: string;
				token: string;
				/**
				 * @deprecated
				 * don't use it, always contains "0001-01-01T00:00:00Z"
				 */
				reward_end_date: string;
			}[]
		};
		/**
		 * @deprecated twitch MAY have changed this for "progression".
		 */
		value: number;
		progression: number;
		goal: number;
		total: number;
		remaining_seconds: number;
		all_time_high_state: string;
		/**
		 * not sure it still exists
		 */
		is_boost_train: boolean;
	}

	export interface LowTrustMessage {
		low_trust_user: LowTrustUser;
		message_content: {
			text: string;
			fragments: {
				text: string;
				emoticon: {
					emoticonID: string,
					emoticonSetID: string
				},
			}[];
		};
		message_id: string;
		sent_at: Date;
	}

	export interface LowTrustUser {
		id: string;
		low_trust_id: string;
		channel_id: string;
		sender: {
			user_id: string;
			login: string;
			display_name: string;
			chat_color: string;
			badges: {
				id: string;
				version: string;
			}[];
		};
		evaluated_at: Date;
		updated_at: Date;
		ban_evasion_evaluation: "UNLIKELY_EVADER" | string;
		treatment: "RESTRICTED" | "ACTIVE_MONITORING";
		updated_by: {
			id: string;
			login: string;
			display_name: string;
		};
		shared_ban_channel_ids: string[];
		types: "BANNED_IN_SHARED_CHANNEL"[];
	}


    export interface LowTrustTreatmentUpdate {
        low_trust_id: string;
        channel_id: string;
        updated_by: {
			id: string;
			login: string;
			display_name: string;
		};
        updated_at: Date;
        target_user_id: string;
        target_user: string;
		treatment: "RESTRICTED" | "ACTIVE_MONITORING" | "NO_TREATMENT";
        types: string[];
        ban_evasion_evaluation: string;
        evaluated_at: Date;
    }

	export interface RaidInfos {
		id: string;
		creator_id: string;
		source_id: string;
		target_id: string;
		target_login: string;
		target_display_name: string;
		target_profile_image: string;
		transition_jitter_seconds: number;
		force_raid_now_seconds: number;
		viewer_count: number;
	}

	export interface CommunityBoost {
		channel_id: string;
		total_goal_target: number;
		total_goal_progress?: number;
		ending_reason: "ORDER_STATE_FULFILLED";
		boost_orders: {
			ID: string;
			State: "ORDER_STATE_DELIVERING" | "DELIVERING_ORDER" | "ORDER_STATE_FULFILLED";
			GoalProgress: number;
			GoalTarget: number;
		}[];
	}

	export interface WhisperRead {
		id: string,//receiverID_senderID
		last_read: number,//index of the last message read
		archived: boolean,
		muted: boolean,
		spam_info: {
			likelihood: string,
			last_marked_not_spam: number
		},
		whitelisted_until: string
	}

	export interface WhisperSent {
		message_id: string;
		id: number;
		thread_id: string;
		body: string;
		sent_ts: number;
		from_id: number;
		tags: IRCTagsExtended;
		recipient: {
			id: number;
			username: string;
			display_name: string;
			color: string;
		};
	}

	export interface ExtensionMessage {
		id: string;
		sent_at: string;
		content: {
			text: string
			fragments: string[]
		},
		sender: {
			extension_client_id: string;
			extension_version: string;
			display_name: string;
			chat_color: string;
			badges: {
				id: string;
				version: string;
			}[]
		}
	}

	export interface StreamInfo {
		channel_id: string;
		type: string;
		channel: string;
		old_status: string;
		status: string;
		old_game: string;
		game: string;
		old_game_id: string;
		game_id: string;
	}

	export interface ModeratorAdded {
		channel_id: string;
		target_user_id: string;
		moderation_action: string;
		target_user_login: string;
		created_by_user_id: string;
		created_by: string;
	}

	export interface VIPAdded {
		channel_id: string;
		target_user_id: string;
		target_user_login: string;
		created_by_user_id: string;
		created_by: string;
	}


	//adding props missing from typings
	export interface IRCTagsExtended extends ChatUserstate {
		"first-msg"?: boolean;
		"reply-parent-display-name"?: string;
		"reply-parent-msg-body"?: string;
		"reply-parent-msg-id"?: string;
		"reply-parent-user-id"?: string;
		"reply-parent-user-login"?: string;
	}

	export interface ChannelPointChallengeContribution {
		channel_id: string;
		goal: {
			id: string;
			channel_id: string;
			title: string;
			description: string;
			goal_type: string;
			is_in_stock: boolean;
			goal_amount: number;//Goal
			points_contributed: number;//Progress
			small_contribution: number;
			per_stream_maximum_user_contribution: number;
			status: string;
			duration_days: number;
			started_at: string;
			ended_at: string;
			background_color: string;
			default_image: DefaultImage;
			image: Image;
		};
		user: {
			id: string;
			login: string;
			display_name: string;
		};
		amount: number;//This user event's contrib
		stream_contribution: number;//This user's stream contrib
		total_contribution: number;//this user's total contrib
	}

	export interface RoomSettingsUpdate {
		room: {
			channel_id: string;
			modes: {
				followers_only_duration_minutes: number;
				emote_only_mode_enabled: boolean;
				r9k_mode_enabled: boolean;
				subscribers_only_mode_enabled: boolean;
				verified_only_mode_enabled: boolean;
				slow_mode_duration_seconds: number;
				slow_mode_set_at: string;
				account_verification_options: {
					subscribers_exempt: boolean;
					moderators_exempt: boolean;
					vips_exempt: boolean;
					phone_verification_mode: number;
					email_verification_mode: number;
					partial_phone_verification_config: PartialVerificationConfig;
					partial_email_verification_config: PartialVerificationConfig;
				};
			};
			rules: string[];
		}
	}

	export interface PartialVerificationConfig {
		restrict_first_time_chatters: boolean;
		restrict_based_on_follower_age: boolean;
		restrict_based_on_account_age: boolean;
		minimum_follower_age_in_minutes: number;
		minimum_account_age_in_minutes: number;
	}
}
