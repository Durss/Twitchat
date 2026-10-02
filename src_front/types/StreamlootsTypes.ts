import type { AutocompletableString } from "@/typeUtils";

export type StreamlootsRarity = "common" | "rare" | "epic" | "legendary";

export type StreamlootsAlertModifierType =
	| AutocompletableString
	| "Anonymous"
	| "NoPowers"
	| "RandomUsernameStyle"
	| "PrideGlow"
	| "PrideUnicorn"
	| "PrideFlagUsername";

/**
 * Raw message received on the alerts stream
 */
export interface StreamlootsAlertPayload {
	type: "alert";
	/**
	 * Rendered alert text.
	 * HTML-encoded.
	 */
	message?: string;
	imageUrl?: string;
	videoUrl?: string;
	soundUrl?: string;
	ttsBase64Audio?: string;
	cardEffect?: string;
	settings?: {
		duration: number;
		sound: { volume: number };
		text: { color: string; fontFamily: string; fontSize: string; fontWeight: number };
		textToSpeech: { voice?: string; volume: number };
		alertEffectConfiguration?: { soundBehaviour: "DEFAULT" | "MUTED" };
		/**
		 * Animation played before the alert (card "power")
		 */
		effects?: {
			type: "preliminaryAnimation";
			name: string;
			effectUrl: string;
			muted: boolean;
			alertTransitionDelay: number;
			alertTransitionDuration: number;
		};
	};
	/**
	 * Overlays acknowledge display with this ID. Don't do it ourself!
	 * Missing on purchase alerts
	 */
	ack?: { correlationId: string };
	data?: {
		/**
		 * Event type.
		 * Reactions have no type. Check for "reaction" property instead.
		 */
		type?: "redemption" | "purchase" | "legendary-card-obtained";
		fields?: {
			name:
				| AutocompletableString
				| "username"
				| "rarity"
				| "quantity"
				| "giftee"
				| "publicPageLink";
			value: string | number;
		}[];
		/**
		 * Set when a card is redeemed
		 */
		cardId?: string;
		/**
		 * ID of the collection
		 * Set when a card is redeemed.
		 */
		cardSetId?: string;
		/**
		 * Set when a card is redeemed
		 */
		cardName?: string;
		/**
		 * Set when a card is redeemed.
		 * Also given lowercased by the "rarity" field
		 */
		cardRarity?: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
		/**
		 * Set when a card is redeemed
		 */
		description?: string;
		/**
		 * Inputs filled by the user when redeeming the card + special card options
		 */
		redeemFields?: (
			| {
					type: "INPUT#TEXT" | "TEXTAREA" | "INPUT#HIDDEN";
					name: string;
					label: string;
					required: boolean;
					value: string;
			  }
			| {
					/**
					 * Card can be trolled. Streamloots' overlay replaces the alert
					 * with a troll message if value is true
					 */
					type: "TROLL";
					name: "troll";
					value: boolean;
			  }
			| {
					/**
					 * Card alters the next alerts (anonymous mode, random username style, ...)
					 */
					type: "ALERT_MODIFIER";
					name: "alertModifier";
					modifierType: StreamlootsAlertModifierType;
					/**
					 * Streamloots' overlay defaults to 60s when missing
					 */
					configuration?: { durationSeconds: number };
			  }
		)[];
		/**
		 * Streamer's page
		 */
		page?: {
			_id: string;
			slug: string;
			alertProviders?: {
				streamloots?: {
					settings?: {
						/**
						 * Timer widget settings, used by timer cards.
						 */
						timer?: {
							pageId?: string;
							soundUrl?: string;
							delay?: number;
							verticalDirection?: AutocompletableString | "topToBottom";
							textToShow?: AutocompletableString | "cardName" | "cardDescription";
							showCardImage?: boolean;
							showStreamlootsPage?: boolean;
							timerSoundConfiguration?: AutocompletableString | "default";
							volume?: number;
						};
					};
				};
			};
		};
		/**
		 * Streamer's Twitch login.
		 */
		twitchChannelId?: string;
		/**
		 * Set for reaction events
		 */
		reaction?: {
			_id: string;
			name: string;
			isSubscriptionAlert: boolean;
		};
		/**
		 * Animates the username on the overlay
		 */
		highlight?: boolean;
		/**
		 * Duration of timer cards
		 */
		duration?: number;
		badges?: { kingMidas?: boolean };
	};
}

/**
 * Raw message received on the emotes stream
 */
export interface StreamlootsEmotePayload {
	username: string;
	/**
	 * Emotes URLs
	 */
	chat: string[];
	emoteStyle: "balloons" | "rain" | "astronaut" | "emoticorn";
	emoteSize: number;
	emoteWallEnabled: boolean;
	emoteRankingEnabled: boolean;
}

/**
 * Normalized Streamloots events.
 * Narrow on "type" to access event specific props.
 */
export type StreamlootsEvent =
	| StreamlootsCardRedeemedEvent
	| StreamlootsPackPurchasedEvent
	| StreamlootsPackGiftedEvent
	| StreamlootsReactionEvent
	| StreamlootsEmoteEvent
	| StreamlootsPromotionEvent
	| StreamlootsLegendaryObtainedEvent
	| StreamlootsUnknownEvent;

export interface StreamlootsCardRedeemedEvent {
	type: "card_redeemed";
	username: string;
	cardId: string;
	cardName: string;
	rarity: StreamlootsRarity;
	/**
	 * Text inputs filled by the user when redeeming the card.
	 * A card can have any number of inputs, named and labelled by the streamer.
	 * Hidden inputs ("INPUT#HIDDEN") aren't listed, they're still in raw data
	 */
	inputs: {
		/**
		 * Input name set by the streamer (ex: "message", "message1")
		 */
		name: string;
		/**
		 * Input label displayed to the user (ex: "Message")
		 */
		label: string;
		/**
		 * Value entered by the user
		 */
		value: string;
		/**
		 * true for long messages (textarea), false for short ones
		 */
		multiline: boolean;
	}[];
	/**
	 * Alert text configured on the card, with placeholders replaced
	 * (ex: "durss wants you to purposely step away from your group!")
	 */
	alertMessage: string;
	/**
	 * Card has been trolled, Streamloots' overlay replaces the alert with a
	 * troll message
	 */
	trolled: boolean;
	/**
	 * Set if the card alters the next alerts (anonymous mode, random username
	 * style, ...) for the given duration.
	 * Not set when trolled as Streamloots' overlay ignores it in that case
	 */
	alertModifier?: {
		type: StreamlootsAlertModifierType;
		durationSeconds: number;
	};
	raw: StreamlootsAlertPayload;
}

export interface StreamlootsPackPurchasedEvent {
	type: "pack_purchased";
	username: string;
	quantity: number;
	raw: StreamlootsAlertPayload;
}

export interface StreamlootsPackGiftedEvent {
	type: "pack_gifted";
	/**
	 * User who gifted the packs
	 */
	username: string;
	giftee: string;
	quantity: number;
	raw: StreamlootsAlertPayload;
}

export interface StreamlootsReactionEvent {
	type: "reaction";
	username: string;
	reactionId: string;
	reactionName: string;
	raw: StreamlootsAlertPayload;
}

export interface StreamlootsEmoteEvent {
	type: "emote";
	username: string;
	/**
	 * Emotes image URLs
	 */
	emotes: string[];
	raw: StreamlootsEmotePayload;
}

/**
 * "Automatic promotion" alert, sent regularly to invite viewers to buy packs
 */
export interface StreamlootsPromotionEvent {
	type: "promotion";
	/**
	 * Streamer's Streamloots page, without protocol (ex: "streamloots.com/durss")
	 */
	pageLink: string;
	raw: StreamlootsAlertPayload;
}

/**
 * "Legendary card obtained" automatic alert, sent when someone gets a
 * legendary card from a pack.
 */
export interface StreamlootsLegendaryObtainedEvent {
	type: "legendary_obtained";
	/**
	 * User who obtained the card.
	 * Streamer's name on dashboard tests
	 */
	username: string;
	/**
	 * Alert text configured by the streamer, with placeholders replaced
	 * (ex: "A new legendary has been obtained. Who and when will play it?")
	 */
	alertMessage: string;
	raw: StreamlootsAlertPayload;
}

/**
 * Alerts we don't know how to categorize yet (dashboard image/video test
 * alerts, ...)
 */
export interface StreamlootsUnknownEvent {
	type: "unknown";
	raw: StreamlootsAlertPayload;
}

