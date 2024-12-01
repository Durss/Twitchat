import DataStore from '@/store/DataStore';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import type { IElevenLabsActions, IElevenLabsGetters, IElevenLabsState } from '../StoreProxy';
import TTSUtils from '@/utils/TTSUtils';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import StoreProxy from '../StoreProxy';
import Utils from '@/utils/Utils';

let emptyCreditsWarned = false;
let almostEmptyCreditsWarned = false;
let cacheHistory:{[key:string]:{id:string}} = {};

function getKey(text:string, voiceId:string, modelId:string):string {
	const splitter = "___";
	return Utils.slugify(text) + splitter + voiceId + splitter + modelId;
}

export const storeElevenLabs = defineStore('elevenlabs', {
	state: () => ({
		apiKey: "",
		connected: false,
		voiceList: [],
		modelList: [],
		creditsUsed:0,
		creditsTotal:0,
	} as IElevenLabsState),



	getters: {
	} as IElevenLabsGetters
	& ThisType<UnwrapRef<IElevenLabsState> & _StoreWithGetters<IElevenLabsGetters> & PiniaCustomProperties>
	& _GettersTree<IElevenLabsState>,



	actions: {
		async populateData():Promise<void> {
			const apiKey = DataStore.get(DataStore.ELEVENLABS_API_KEY);
			if(apiKey) {
				this.apiKey = apiKey;
			}
			if(this.apiKey) await this.connect();
		},

		async connect():Promise<boolean> {
			this.connected = false;
			return new Promise<boolean>(async (resolve)=>{
				try {
					const success = await this.loadParams();
					this.connected = success;
					TTSUtils.instance.loadVoiceList();
					resolve(this.connected);
					if(this.connected) {
						await this.loadApiCredits();
						this.saveConfigs()
						await this.buildHistoryCache();
					}
				}catch(error) {
					resolve(false);
				}
			});
		},

		disconnect():void {
			this.connected = false;
			DataStore.remove(DataStore.ELEVENLABS_API_KEY);
		},

		async read(message:string, voiceId:string, modelId:string, lang?:string, settings?:{
		similarity_boost?:number
		stability?:number
		style?:number}):Promise<string|false> {
			const key = getKey(message, voiceId, modelId);
			//Check if there's a cached history for this message, if so, load it
			if(cacheHistory[key]) {
				const historyId = cacheHistory[key].id;
				const options:RequestInit = {};
				const headers = new Headers();
				headers.append("xi-api-key", this.apiKey);
				headers.append("Accept", "audio/mpeg");
				headers.append("Content-Type", "application/json");
				const url = new URL("https://api.elevenlabs.io/v1/history/"+historyId+"/audio");
				options.headers = headers;
				const ttsQuery = await fetch(url, options);
				const audioBlob = await ttsQuery.blob();
				const audioUrl = URL.createObjectURL(audioBlob);
				return audioUrl;
			}

			if(emptyCreditsWarned) return false;
			const options:RequestInit = {};
			const headers = new Headers();
			headers.append("xi-api-key", this.apiKey);
			headers.append("Accept", "audio/mpeg");
			headers.append("Content-Type", "application/json");

			const body:Record<string, unknown> = {
				model_id: modelId,
				text: message,
				voice_settings: {
					stability: settings?.stability || .5,
					similarity_boost: settings?.similarity_boost ||.5,
				}
			};
			if(lang && modelId === "eleven_turbo_v2_5") {
				body.language_code = lang;
			}

			options.headers = headers;
			options.method = "POST";
			options.body = JSON.stringify(body);

			const url = new URL("https://api.elevenlabs.io/v1/text-to-speech/"+voiceId);
			url.searchParams.append("enable_logging", "false");
			url.searchParams.append("output_format", "mp3_22050_32");
			
			const ttsQuery = await fetch(url, options);
			const audioBlob = await ttsQuery.blob();
			const audioUrl = URL.createObjectURL(audioBlob);

			this.loadApiCredits();
			this.buildHistoryCache(true);

			return audioUrl;
		},

		async loadParams():Promise<boolean> {
			const options:RequestInit = {};
			const headers = new Headers();
			headers.append("xi-api-key", this.apiKey);
			headers.append("Accept", "application/json");
			headers.append("Content-Type", "application/json");
			options.headers = headers;
			const voiceListQuery = await fetch("https://api.elevenlabs.io/v1/voices", options);
			if(voiceListQuery.status !== 200) return false;
			this.voiceList = ((await voiceListQuery.json()).voices as typeof this.voiceList);
			
			const modelListQuery = await fetch("https://api.elevenlabs.io/v1/models", options);
			if(modelListQuery.status !== 200) return false;
			this.modelList = (await modelListQuery.json() as typeof this.modelList).filter(v=>v.can_do_text_to_speech === true);
			// this.read("Coucou ici", "eleven_turbo_v2_5");
			return true;
		},

		saveConfigs():void {
			DataStore.set(DataStore.ELEVENLABS_API_KEY, this.apiKey);
		},

		async loadApiCredits():Promise<void> {
			const options:RequestInit = {};
			const headers = new Headers();
			headers.append("xi-api-key", this.apiKey);
			headers.append("Accept", "application/json");
			headers.append("Content-Type", "application/json");
			options.headers = headers;

			const urlUser = new URL("https://api.elevenlabs.io/v1/user/subscription");
			const userQuery = await fetch(urlUser, options);
			if(userQuery.status !== 200) return;
			const user = await userQuery.json() as ElevenLabsUserSubscription;

			this.creditsUsed = user.character_count;
			this.creditsTotal = user.character_limit;

			let warnMessage = "";
			
			//Warn user if getting close to credits limit if not already warned
			if(!almostEmptyCreditsWarned && user.character_count/user.character_limit > .9) {
				warnMessage = StoreProxy.i18n.t("chat.tts.elevenlabs_credits_almost_empty", {CREDITS:user.character_limit - user.character_count}),
				almostEmptyCreditsWarned = true;
			}
			
			//Warn user when all credits are spent if not already warned
			if(!emptyCreditsWarned && user.character_limit - user.character_count < 5) {
				warnMessage = StoreProxy.i18n.t("chat.tts.elevenlabs_credits_almost_empty", {CREDITS:user.character_limit - user.character_count}),
				emptyCreditsWarned = true;
			}
			
			if(warnMessage) {
				const message:TwitchatDataTypes.MessageCustomData = {
					channel_id: StoreProxy.auth.twitch.user.id,
					date: Date.now(),
					id: Utils.getUUID(),
					platform: "twitchat",
					type:TwitchatDataTypes.TwitchatMessageType.CUSTOM,
					icon: "elevenlabs",
					style: "warn",
					user: {
						name: "ElevenLabs",
						color: "white",
					},
					message: warnMessage,
				};
	
				StoreProxy.chat.addMessage(message);
			}
		},

		async buildHistoryCache(onlyLatest:boolean = false):Promise<void> {
			const options:RequestInit = {};
			const headers = new Headers();
			headers.append("xi-api-key", this.apiKey);
			headers.append("Accept", "application/json");
			headers.append("Content-Type", "application/json");
			options.headers = headers;

			let history:ElevenLabsHistory;
			let failSafe = 0;
			do {
				const urlHistory = new URL("https://api.elevenlabs.io/v1/history");
				urlHistory.searchParams.append("page_size", onlyLatest? "10" : "1000");
				const historyQuery = await fetch(urlHistory, options);
				if(historyQuery.status !== 200) return;
				history = await historyQuery.json() as ElevenLabsHistory;
				history.history.forEach(h=>{
					const key = getKey(h.text, h.voice_id, h.model_id);
					cacheHistory[key] = {id:h.history_item_id};
				});
			}while(history && history.has_more && ++failSafe < 1000 && !onlyLatest);
		},
	} as IElevenLabsActions
	& ThisType<IElevenLabsActions
		& UnwrapRef<IElevenLabsState>
		& _StoreWithState<"elevenlabs", IElevenLabsState, IElevenLabsGetters, IElevenLabsActions>
		& _StoreWithGetters<IElevenLabsGetters>
		& PiniaCustomProperties
	>,
})

if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeElevenLabs, import.meta.hot))
}

interface IStoreData {
}

export interface ElevenLabsModel {
    model_id: string;
    name?: string;
    can_be_finetuned?: boolean;
    can_do_text_to_speech?: boolean;
    can_do_voice_conversion?: boolean;
    can_use_style?: boolean;
    can_use_speaker_boost?: boolean;
    serves_pro_voices?: boolean;
    token_cost_factor?: number;
    description?: string;
    requires_alpha_access?: boolean;
    max_characters_request_free_user?: number;
    max_characters_request_subscribed_user?: number;
    maximum_text_length_per_request?: number;
    languages?: {
		language_id: string;
		name: string;
	}[];
    model_rates?: {
		character_cost_multiplier: number;
	};
    concurrency_group?: "standard" | "turbo";
}

export interface ElevenLabsVoice {
    voice_id: string;
    name?: string;
    samples?: {
		sample_id?: string;
		file_name?: string;
		mime_type?: string;
		size_bytes?: number;
		hash?: string;
	}[];
    category?: "generated" | "cloned" | "premade" | "professional" | "famous" | "high_quality";
    fine_tuning?: {
		is_allowed_to_fine_tune?: boolean;
		state?: Record<string, "not_started" | "queued" | "fine_tuning" | "fine_tuned" | "failed" | "delayed">;
		verification_failures?: string[];
		verification_attempts_count?: number;
		manual_verification_requested?: boolean;
		language?: string;
		progress?: Record<string, number>;
		message?: Record<string, string>;
		dataset_duration_seconds?: number;
		verification_attempts?: {
			text: string;
			date_unix: number;
			accepted: boolean;
			similarity: number;
			levenshtein_distance: number;
			recording?: {
				recording_id: string;
				mime_type: string;
				size_bytes: number;
				upload_date_unix: number;
				transcription: string;
			};
		}[];
		slice_ids?: string[];
		manual_verification?: {
			extra_text: string;
			request_time_unix: number;
			files:  {
				file_id: string;
				file_name: string;
				mime_type: string;
				size_bytes: number;
				upload_date_unix: number;
			}[];
		};
		max_verification_attempts?: number;
		next_max_verification_attempts_reset_unix_ms?: number;
		finetuning_state?: unknown;
	};
    labels?: Record<string, string>;
    description?: string;
    preview_url?: string;
    available_for_tiers?: string[];
    settings?: {
		stability?: number;
		similarity_boost?: number;
		style?: number;
		use_speaker_boost?: boolean;
	}
	;
    sharing?: {
		status?: "enabled" | "disabled" | "copied" | "copied_disabled";
		history_item_sample_id?: string;
		date_unix?: number;
		whitelisted_emails?: string[];
		public_owner_id?: string;
		original_voice_id?: string;
		financial_rewards_enabled?: boolean;
		free_users_allowed?: boolean;
		live_moderation_enabled?: boolean;
		rate?: number;
		notice_period?: number;
		disable_at_unix?: number;
		voice_mixing_allowed?: boolean;
		featured?: boolean;
		category?: "generated" | "professional" | "high_quality" | "famous";
		reader_app_enabled?: boolean;
		image_url?: string;
		ban_reason?: string;
		liked_by_count?: number;
		cloned_by_count?: number;
		name?: string;
		description?: string;
		labels?: Record<string, string>;
		review_status?: "not_requested" | "pending" | "declined" | "allowed" | "allowed_with_changes";
		review_message?: string;
		enabled_in_library?: boolean;
		instagram_username?: string;
		twitter_username?: string;
		youtube_username?: string;
		tiktok_username?: string;
		moderation_check?: {
			date_checked_unix?: number;
			name_value?: string;
			name_check?: boolean;
			description_value?: string;
			description_check?: boolean;
			sample_ids?: string[];
			sample_checks?: number[];
			captcha_ids?: string[];
			captcha_checks?: number[];
		};
	};
    high_quality_base_model_ids?: string[];
    safety_control?:"NONE" | "BAN" | "CAPTCHA" | "CAPTCHA_AND_MODERATION" | "ENTERPRISE_BAN" | "ENTERPRISE_CAPTCHA";
    voice_verification?: {
		requires_verification: boolean;
		is_verified: boolean;
		verification_failures: string[];
		verification_attempts_count: number;
		language?: string;
		verification_attempts?: {
			text: string;
			date_unix: number;
			accepted: boolean;
			similarity: number;
			levenshtein_distance: number;
			recording?: {
				recording_id: string;
				mime_type: string;
				size_bytes: number;
				upload_date_unix: number;
				transcription: string;
			};
		}[];
	}
	;
    permission_on_resource?: string;
    is_owner?: boolean;
    is_legacy?: boolean;
    is_mixed?: boolean;
}

interface ElevenLabsUserSubscription {
	tier: string;
	character_count: number;
	character_limit: number;
	can_extend_character_limit: boolean;
	allowed_to_extend_character_limit: boolean;
	next_character_count_reset_unix: number;
	voice_limit: number;
	max_voice_add_edits: number;
	voice_add_edit_counter: number;
	professional_voice_limit: number;
	can_extend_voice_limit: boolean;
	can_use_instant_voice_cloning: boolean;
	can_use_professional_voice_cloning: boolean;
	currency: any;
	status: string;
	billing_period: any;
	character_refresh_period: any;
	next_invoice: any;
	has_open_invoices: boolean;
}

interface ElevenLabsHistory {
	history: {
		history_item_id: string;
		request_id: string;
		voice_id: string;
		model_id: string;
		voice_name: string;
		voice_category: string;
		text: string;
		date_unix: number;
		character_count_change_from: number;
		character_count_change_to: number;
		content_type: string;
		state: string;
		settings: unknown;
		feedback: {
			thumbs_up: boolean;
			feedback: string;
			emotions: boolean;
			inaccurate_clone: boolean;
			glitches: boolean;
			audio_quality: boolean;
			other: boolean;
			review_status: string;
		};
		share_link_id: string;
		source: string;
		alignments: {
			alignment: {
				characters: string[];
				character_start_times_seconds: number[];
				character_end_times_seconds: number[];
			};
			normalized_alignment: {
				characters: string[];
				character_start_times_seconds: number[];
				character_end_times_seconds: number[];
			};
		};
	}[];
	last_history_item_id: string;
	has_more: boolean;
}