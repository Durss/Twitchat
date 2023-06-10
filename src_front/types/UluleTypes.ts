export namespace UluleTypes {

	export interface Project {
		absolute_url: string
		address_required: boolean
		amount_raised: number
		analytics_count: number
		background: Background
		city: string
		comments_count: number
		comments_enabled: string
		committed: number
		country: string
		currency: string
		currency_display: string
		date_creation: string
		date_end: string
		date_goal_raised: string
		date_online: string
		date_start: string
		delivery: Delivery
		description_ca: string
		description_de: string
		description_en: string
		description_es: string
		description_fr: string
		description_funding_ca: string
		description_funding_de: string
		description_funding_en: string
		description_funding_es: string
		description_funding_fr: string
		description_funding_it: string
		description_funding_nl: string
		description_funding_pt: string
		description_it: string
		description_nl: string
		description_pt: string
		description_yourself_ca: string
		description_yourself_de: string
		description_yourself_en: string
		description_yourself_es: string
		description_yourself_fr: string
		description_yourself_it: string
		description_yourself_nl: string
		description_yourself_pt: string
		discussions_thread_id: number
		fans_count: number
		finished: boolean
		goal: number
		goal_raised: boolean
		goal_status: string
		has_extra_time: boolean
		id: number
		image: string
		is_cancelled: boolean
		is_in_extra_time: boolean
		is_online: boolean
		lang: string
		location: Location
		lowest_contribution_amount: number
		main_image: MainImage
		main_tag: MainTag
		name_ca: string
		name_de: string
		name_en: string
		name_es: string
		name_fr: string
		name_it: string
		name_nl: string
		name_pt: string
		nb_products_sold: number
		news_count: number
		orders_count: number
		orders_enabled: boolean
		owner: Owner
		payment_methods: string[]
		percent: number
		permissions: Permissions
		phone_number_required: boolean
		required_personal_id_number: boolean
		resource_uri: string
		rewards: Reward[]
		sharing_urls: SharingUrls
		slug: string
		sponsorships_count: number
		status: string
		subscriptions_count: number
		subtitle_ca: string
		subtitle_de: string
		subtitle_en: string
		subtitle_es: string
		subtitle_fr: string
		subtitle_it: string
		subtitle_nl: string
		subtitle_pt: string
		supporters_count: number
		tax_deductible: boolean
		tax_receipt_enabled: boolean
		time_left: string
		time_left_short: string
		timezone: string
		training_types: string[]
		type: number
		urls: Urls
		user_role: any
		video: Video
		visible: boolean
	}

	export interface Background {
		color: string
		id: number
		url: string
	}

	export interface Delivery {
		address_required: boolean
		date_delivery: string
		has_shippings: boolean
		phone_number_required: boolean
		shipping_int: any
		shipping_nat: any
		shipping_type: string
		shippings: any
	}

	export interface Location {
		city: string
		country: string
		full_name: string
		name: string
		region: string
	}

	export interface MainImage {
		"230x126": string
		"258x145": string
		"640x360": string
		extracted_colors: ExtractedColors
		full: string
		id: number
		name: string
		value: string
		versions: Versions
	}

	export interface ExtractedColors {
		DarkMuted: string
		DarkVibrant: string
		LightMuted: string
		LightVibrant: string
		Muted: string
		Vibrant: string
	}

	export interface Versions {
		"2x": N2x
		full: Full
		large: Large
		medium: Medium
		small: Small
	}

	export interface N2x {
		height: number
		url: string
		width: number
	}

	export interface Full {
		height: any
		url: string
		width: any
	}

	export interface Large {
		height: number
		url: string
		width: number
	}

	export interface Medium {
		height: number
		url: string
		width: number
	}

	export interface Small {
		height: number
		url: string
		width: number
	}

	export interface MainTag {
		absolute_url: string
		id: number
		name_ca: string
		name_de: string
		name_en: string
		name_es: string
		name_fr: string
		name_it: string
		name_nl: string
		name_pt: string
		position: number
		slug: string
	}

	export interface Owner {
		absolute_url: string
		avatar: Avatar
		country: string
		date_joined: string
		description: any
		email: string
		eula_accepted_at: string
		first_name: string
		has_avatar: boolean
		has_usable_password: boolean
		id: number
		is_active: boolean
		is_anonymous: boolean
		is_completed: boolean
		is_guest: boolean
		is_staff: boolean
		lang: string
		last_login: string
		last_name: string
		name: string
		presentation: any
		resource_uri: string
		screenname: string
		stats: Stats
		timezone: string
		username: string
	}

	export interface Avatar {
		"20": string
		"30": string
		"40": string
		"55": string
		"75": string
		"90": string
		"128": string
		"180": string
		"230": string
		"290": string
		full: string
		name: string
		value: string
		versions: Versions2
	}

	export interface Versions2 {
		"128x128": N128x128
		"180x180": N180x180
		"20x20": N20x20
		"230x230": N230x230
		"290x290": N290x290
		"30x30": N30x30
		"40x40": N40x40
		"55x55": N55x55
		"75x75": N75x75
		"90x90": N90x90
		full: Full2
	}

	export interface N128x128 {
		height: number
		url: string
		width: number
	}

	export interface N180x180 {
		height: number
		url: string
		width: number
	}

	export interface N20x20 {
		height: number
		url: string
		width: number
	}

	export interface N230x230 {
		height: number
		url: string
		width: number
	}

	export interface N290x290 {
		height: number
		url: string
		width: number
	}

	export interface N30x30 {
		height: number
		url: string
		width: number
	}

	export interface N40x40 {
		height: number
		url: string
		width: number
	}

	export interface N55x55 {
		height: number
		url: string
		width: number
	}

	export interface N75x75 {
		height: number
		url: string
		width: number
	}

	export interface N90x90 {
		height: number
		url: string
		width: number
	}

	export interface Full2 {
		height: any
		url: string
		width: any
	}

	export interface Stats {
		created_projects_online_count: number
		followed_projects_count: number
		supported_projects_count: number
	}

	export interface Permissions {
		news: any
		self: any
	}

	export interface Reward {
		address_required: boolean
		available: boolean
		date_delivery: string
		delivery: Delivery2
		description_ca: string
		description_de: string
		description_en: string
		description_es: string
		description_fr: string
		description_it: string
		description_nl: string
		description_pt: string
		has_custom_delivery: boolean
		has_shippings: boolean
		id: number
		image: Image
		is_featured: boolean
		is_hidden: boolean
		phone_number_required: boolean
		price: number
		resource_uri: string
		shipping_int?: number
		shipping_nat?: number
		shippings: any
		stock: any
		stock_available: any
		stock_taken: number
		tax_deductible: boolean
		title: Title
		variants?: Variant[]
	}

	export interface Delivery2 {
		address_required: boolean
		date_delivery: string
		has_shippings: boolean
		phone_number_required: boolean
		shipping_int?: number
		shipping_nat?: number
		shipping_type: string
		shippings: any
	}

	export interface Image {
		fr: Fr
	}

	export interface Fr {
		"130x0": string
		"270x0": string
		"500x0": string
		full: string
		id: number
		name: string
		value: string
		versions: Versions3
	}

	export interface Versions3 {
		full: Full3
		large: Large2
		medium: Medium2
		small: Small2
	}

	export interface Full3 {
		height: any
		url: string
		width: any
	}

	export interface Large2 {
		height: number
		url: string
		width: number
	}

	export interface Medium2 {
		height: number
		url: string
		width: number
	}

	export interface Small2 {
		height: number
		url: string
		width: number
	}

	export interface Title {
		fr: string
	}

	export interface Variant {
		address_required: boolean
		available: boolean
		date_delivery: string
		description_ca: string
		description_de: string
		description_en: string
		description_es: string
		description_fr: string
		description_it: string
		description_nl: string
		description_pt: string
		id: number
		num_products: any
		phone_number_required: boolean
		price: number
		resource_uri: string
		stock: any
		stock_available: any
		stock_taken: number
		tax_deductible: boolean
	}

	export interface SharingUrls {
		ca: string
		de: string
		en: string
		es: string
		fr: string
		it: string
		nl: string
		pt: string
	}

	export interface Urls {
		web: Web
	}

	export interface Web {
		checkout: string
		detail: string
		edit: Edit
	}

	export interface Edit {
		address: string
		main: string
		media: string
		news: News
		orders: string
		products: string
		publish: string
		rib: string
		ticket: string
	}

	export interface News {
		add: string
		index: string
	}

	export interface Video {
		author_name: string
		author_url: string
		height: number
		html: string
		id: number
		language: string
		provider_name: string
		provider_url: string
		thumbnail_height: number
		thumbnail_url: string
		thumbnail_width: number
		title: string
		type: string
		url: string
		version: string
		width: number
}
}