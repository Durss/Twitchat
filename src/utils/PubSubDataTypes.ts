import type {ChatUserstate} from "tmi.js";

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
		user_id:string;
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
						topics: {[key:string]: string},
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
		poll:{
			poll_id: string;
			owned_by: string;
			created_by: string;
			title: string;
			started_at: string;
			ended_at?: string;
			ended_by?: string;
			duration_seconds: number;
			settings: {
				multi_choice: {is_enabled: boolean;};
				subscriber_only: {is_enabled: boolean;};
				subscriber_multiplier: {is_enabled: boolean;};
				bits_votes: {
					is_enabled: boolean;
					cost: number;
				};
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
						type: "WIN"|"LOSE",
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
			status: "RESOLVE_PENDING" | "RESOLVED" | "LOCKED" | "ACTIVE";
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
        events_remaining_durations:{[key:string]:number};
        level_one_rewards: {
			type: string;
			id: string;
			group_id: string;
			reward_level: number;
			set_id: string;
			token: string;
		}[];
        creator_color: string;
        participants: string[];
        approaching_hype_train_id: string;
        is_boost_train: boolean;
	}

	export interface HypeTrainStart {
		channel_id: string;
		id: string;
		started_at: number;
		expires_at: number;
		updated_at: number;
		ended_at?: number;
		ending_reason?: string;
		config: {
			channel_id: string;
			is_enabled: boolean;
			is_whitelisted: boolean;
			kickoff: {
				num_of_events: number;
				min_points: number;
				duration: number;
			};
			cooldown_duration: number;
			level_duration: number;
			difficulty: string;
			reward_end_date?: number;
			participation_conversion_rates: {
				"BITS.CHEER": number;
				"BITS.EXTENSION": number;
				"BITS.POLL": number;
				"SUBS.TIER_1_GIFTED_SUB": number;
				"SUBS.TIER_1_SUB": number;
				"SUBS.TIER_2_GIFTED_SUB": number;
				"SUBS.TIER_2_SUB": number;
				"SUBS.TIER_3_GIFTED_SUB": number;
				"SUBS.TIER_3_SUB": number;
			};
			notification_thresholds: {
				"BITS.CHEER": number;
				"BITS.EXTENSION": number;
				"BITS.POLL": number;
				"SUBS.TIER_1_GIFTED_SUB": number;
				"SUBS.TIER_1_SUB": number;
				"SUBS.TIER_2_GIFTED_SUB": number;
				"SUBS.TIER_2_SUB": number;
				"SUBS.TIER_3_GIFTED_SUB": number;
				"SUBS.TIER_3_SUB": number;
			};
			difficulty_settings: {
				MEDIUM: {
					value: number;
					goal: number;
					rewards: {
						type: string;
						id: string;
						group_id: string;
						reward_level: number;
						set_id: string;
						token: string;
					}[];
				}[];
			};
			conductor_rewards: {
				BITS: {
					
					CURRENT: {
						type: string;
						id: string;
						group_id: string;
						reward_level: number;
						badge_id: string;
						image_url: string;
					}[];
					FORMER: {
						type: string;
						id: string;
						group_id: string;
						reward_level: number;
						badge_id: string;
						image_url: string;
					}[];
				};
				SUBS: {
					CURRENT: {
						type: string;
						id: string;
						group_id: string;
						reward_level: number;
						badge_id: string;
						image_url: string;
					}[];
					FORMER: {
						type: string;
						id: string;
						group_id: string;
						reward_level: number;
						badge_id: string;
						image_url: string;
					}[];
				};
			};
			callout_emote_id: string;
			callout_emote_token: string;
			theme_color: string;
			has_conductor_badges: boolean;
		};
		participations: {
			"SUBS.TIER_1_GIFTED_SUB": number;
			"SUBS.TIER_1_SUB": number;
			"SUBS.TIER_3_SUB": number;
		};
		conductors: unknown;
		progress: HypeProgressInfo;
		is_boost_train:boolean;
	}

	export interface HypeTrainProgress {
		user_id: string;
		user_login: string;
		user_display_name: string;
		sequence_id: number;
		action: string;
		source: string;
		quantity: number;
		progress: HypeProgressInfo;
		is_boost_train:boolean;
	}

	export interface HypeTrainConductorUpdate {
		source: string;
		user: {
			id: string;
			login: string;
			display_name: string;
			profile_image_url: string;
		};
		participations: {
			"BITS.CHEER": number;
			"SUBS.TIER_1_SUB": number;
		};
	}

	export interface HypeTrainLevelUp {
		time_to_expire: number;
		progress: HypeProgressInfo;
		is_boost_train:boolean;
	}
	
	export interface HypeTrainEnd {
		ended_at: number;
		ending_reason: "COMPLETED" | "EXPIRE";
		is_boost_train:boolean;
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
			}[]
		};
		value: number;
		goal: number;
		total: number;
		remaining_seconds: number;
		is_boost_train:boolean;
	}

	export interface LowTrustMessage {
		low_trust_user: LowTrustUser;
		message_content: {
			text: string;
			fragments: {
				text: string;
			}[];
		};
		message_id: string;
		sent_at: Date;
	}

	interface LowTrustUser {
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
		total_goal_target:number;
		total_goal_progress?:number;
		ending_reason:"ORDER_STATE_FULFILLED";
        boost_orders: {
			ID: string;
			State: "ORDER_STATE_DELIVERING" | "DELIVERING_ORDER" | "ORDER_STATE_FULFILLED";
			GoalProgress: number;
			GoalTarget: number;
		}[];
	}

	export interface DeletedMessage {
		type: string;
		moderation_action: string;
		args: string[];
		created_by: string;
		created_by_user_id: string;
		created_at: string;
		msg_id: string;
		target_user_id: string;
		target_user_login: string;
		from_automod: boolean;
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
			display_name:  string;
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

	//adding props missing from typings
	export interface IRCTagsExtended extends ChatUserstate {
		"first-msg"?:boolean;
		"reply-parent-display-name"?:string;
		"reply-parent-msg-body"?:string;
		"reply-parent-msg-id"?:string;
		"reply-parent-user-id"?:string;
		"reply-parent-user-login"?:string;
	}
}