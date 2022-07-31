export interface SpotifyAuthResult {
	code:string;
	csrf:string;
}

export interface SpotifyAuthToken {
	access_token:string;
	token_type:string;//Bearer
	scope:string;
	expires_at:number;//In seconds
	expires_in:number;//In seconds
	refresh_token:string;
}

export interface SpotifyTrack {
	timestamp: number;
	context?: {
		external_urls:ExternalUrls[];
	};
	progress_ms: number;
	item: Item;
	currently_playing_type: "track"|"episode";
	actions: Actions;
	is_playing: boolean;

}

interface ExternalUrls {
	spotify: string;
}

interface Artist {
	external_urls: ExternalUrls;
	href: string;
	id: string;
	name: string;
	type: string;
	uri: string;
}

interface Image {
	height: number;
	url: string;
	width: number;
}

interface Album {
	album_type: string;
	artists: Artist[];
	available_markets: string[];
	external_urls: ExternalUrls;
	href: string;
	id: string;
	images: Image[];
	name: string;
	release_date: string;
	release_date_precision: string;
	total_tracks: number;
	type: string;
	uri: string;
}

interface ExternalIds {
	isrc: string;
}

interface Item {
	album: Album;
	artists: Artist[];
	available_markets: string[];
	disc_number: number;
	duration_ms: number;
	explicit: boolean;
	external_ids: ExternalIds;
	external_urls: ExternalUrls;
	href: string;
	id: string;
	is_local: boolean;
	name: string;
	popularity: number;
	preview_url: string;
	track_number: number;
	type: string;
	uri: string;
	show: Show;
	audio_preview_url: string;
	description: string;
	html_description: string;
	images: Image[];
	is_externally_hosted: boolean;
	is_playable: boolean;
	language: string;
	languages: string[];
	release_date: string;
	release_date_precision: string;
}

interface Disallows {
	resuming: boolean;
	skipping_prev: boolean;
	toggling_repeat_context: boolean;
	toggling_repeat_track: boolean;
	toggling_shuffle: boolean;
}

interface Actions {
	disallows: Disallows;
}

interface Show {
	available_markets: string[];
	copyrights: string[];
	description: string;
	explicit: boolean;
	external_urls: ExternalUrls;
	href: string;
	html_description: string;
	id: string;
	images: Image[];
	is_externally_hosted: boolean;
	languages: string[];
	media_type: string;
	name: string;
	publisher: string;
	total_episodes: number;
	type: string;
	uri: string;
}

export interface SearchTrackResult {
	href: string;
	items: SearchTrackItem[];
	limit: number;
	next: string;
	offset: number;
	previous?: string;
	total: number;
}

export interface SearchTrackItem {
	album: Album;
	artists: Artist[];
	available_markets: string[];
	disc_number: number;
	duration_ms: number;
	explicit: boolean;
	external_ids: ExternalIds;
	external_urls: ExternalUrls;
	href: string;
	id: string;
	is_local: boolean;
	name: string;
	popularity: number;
	preview_url: string;
	track_number: number;
	type: string;
	uri: string;
}

export interface SearchPlaylistItem {
	collaborative: boolean;
	description: string;
	external_urls: ExternalUrls;
	followers: {
        href: string;
        total: number;
	};
	href: string;
	id: string;
	images: Image[];
	name: string;
	owner: {
        external_urls: ExternalUrls;
        followers: {
			href: string;
			total: number;
		};
        href: string;
        id: string;
        type: string;
        uri: string;
        display_name: string;
    };
	public: boolean;
	snapshot_id: string;
	tracks: {
        href: string;
        items: Item[];
        limit: number;
        next: string;
        offset: number;
        previous: string;
        total: number;
    };
	type: string;
	uri: string;
}