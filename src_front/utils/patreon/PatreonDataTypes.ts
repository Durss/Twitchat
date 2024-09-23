export namespace PatreonDataTypes {
	export interface UserData {
		data: ProfileData
		included: Included[]
		links: {
			self: string
		}
	}
	
	export interface ProfileData {
		attributes: ProfileAttribute
		id: string
		relationships: Relationships
		type: string
	}
	
	export interface ProfileAttribute {
		about: any
		age_verification_status: any
		apple_id: any
		can_see_nsfw: boolean
		created: string
		default_country_code: any
		discord_id: any
		email: string
		facebook: any
		facebook_id: any
		first_name: string
		full_name: string
		gender: number
		google_id: string
		has_password: boolean
		image_url: string
		is_deleted: boolean
		is_eligible_for_idv: boolean
		is_email_verified: boolean
		is_nuked: boolean
		is_suspended: boolean
		last_name: string
		patron_currency: string
		social_connections: SocialConnections
		thumb_url: string
		twitch: any
		twitter: any
		url: string
		vanity: string
		youtube: any
	}
	
	export interface SocialConnections {
		deviantart: any
		discord: any
		facebook: any
		google: any
		instagram: Instagram
		reddit: any
		spotify: any
		spotify_open_access: any
		twitch: any
		twitter: Twitter
		vimeo: any
		youtube: Youtube
	}
	
	export interface Instagram {
		scopes: string[]
		url: string
		user_id: string
	}
	
	export interface Twitter {
		url: string
		user_id: string
	}
	
	export interface Youtube {
		scopes: string[]
		url: string
		user_id: string
	}
	
	export interface Relationships {
		campaign: Campaign
		pledges: Pledges
	}
	
	export interface Campaign {
		data: CampaignData
		links: Links
	}
	
	export interface CampaignData {
		id: string
		type: string
	}
	
	export interface Links {
		related: string
	}
	
	export interface Pledges {
		data: any[]
	}
	
	export interface Included {
		attributes: IncludedAttributes
		id: string
		relationships?: IncludedRelationships
		type: string
	}
	
	export interface IncludedAttributes {
		avatar_photo_image_urls?: AvatarPhotoImageUrls
		avatar_photo_url?: string
		campaign_pledge_sum?: number
		cover_photo_url?: string
		cover_photo_url_sizes?: CoverPhotoUrlSizes
		created_at?: string
		creation_count?: number
		creation_name?: string
		currency?: string
		discord_server_id?: string
		display_patron_goals?: boolean
		earnings_visibility?: string
		image_small_url?: string
		image_url?: string
		is_charge_upfront?: boolean
		is_charged_immediately?: boolean
		is_monthly?: boolean
		is_nsfw?: boolean
		is_plural?: boolean
		main_video_embed: any
		main_video_url: any
		name?: string
		one_liner: any
		outstanding_payment_amount_cents?: number
		paid_member_count?: number
		patron_count?: number
		pay_per_name?: string
		pledge_sum?: number
		pledge_sum_currency?: string
		pledge_url?: string
		published_at?: string
		summary?: string
		thanks_embed?: string
		thanks_msg?: string
		thanks_video_url: any
		url?: string
		amount?: number
		amount_cents?: number
		description?: string
		patron_currency?: string
		remaining?: number
		requires_shipping?: boolean
		user_limit: any
		declined_patron_count?: number
		discord_role_ids?: string[]
		edited_at?: string
		is_free_tier?: boolean
		patron_amount_cents?: number
		post_count?: number
		published?: boolean
		title?: string
		unpublished_at: any
		welcome_message: any
		welcome_message_unsafe: any
		welcome_video_embed: any
		welcome_video_url: any
	}
	
	export interface AvatarPhotoImageUrls {
		default: string
		default_small: string
		original: string
		thumbnail: string
		thumbnail_large: string
		thumbnail_small: string
	}
	
	export interface CoverPhotoUrlSizes {
		large: string
		medium: string
		small: string
		xlarge: string
		xsmall: string
	}
	
	export interface IncludedRelationships {
		campaign?: Campaign2
		creator?: Creator
		goals?: Goals
		rewards?: Rewards
	}
	
	export interface Campaign2 {
		data: {
			id: string
			type: string
		},
		links: {
			related: string
		}
	}
	
	
	export interface Creator {
		data: {
			id: string
			type: string
		},
		links: {
			related: string
		}
	}
	
	export interface Goals {
		data: any
	}
	
	export interface Rewards {
		data: {
			id: string
			type: string
		}[]
	}

	export interface AuthTokenInfo {
		access_token:string;
		refresh_token:string;
		expires_at:number;
		scopes:("identity"|"identity[email]"|"identity.memberships"|"campaign"|"w:campaigns.webhook"|"campaigns.members"|"campaigns.members[email]"|"campaigns.members.address"|"campaigns.posts")[];
	}
}	
