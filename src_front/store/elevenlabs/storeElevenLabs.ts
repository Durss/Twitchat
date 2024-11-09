import DataStore from '@/store/DataStore';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import type { IElevenLabsActions, IElevenLabsGetters, IElevenLabsState } from '../StoreProxy';
import TTSUtils from '@/utils/TTSUtils';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import StoreProxy from '../StoreProxy';
import Utils from '@/utils/Utils';

let emptyCreditsWarned = false
let almostEmptyCreditsWarned = false

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
			if(this.apiKey) this.connect();
			this.loadApiCredits();
		},

		async connect():Promise<boolean> {
			this.connected = false;
			return new Promise<boolean>(async (resolve)=>{
				try {
					const success = await this.loadParams();
					await this.loadApiCredits();
					this.connected = success;
					TTSUtils.instance.loadVoiceList();
					resolve(this.connected);
					if(this.connected) {
						this.saveConfigs()
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

		async read(message:string, voiceId:string, modelId:string, lang?:string, settings?:unknown):Promise<string> {
			const options:RequestInit = {};
			const headers = new Headers();
			headers.append("xi-api-key", this.apiKey);
			headers.append("Accept", "audio/mpeg");
			headers.append("Content-Type", "application/json");

			options.headers = headers;
			options.method = "POST";
			options.body = JSON.stringify({
				model_id: modelId,
				text: message,
				language_code: lang,
				voice_settings: {
					stability: .5,
					similarity_boost: .5
				}
			});

			const url = new URL("https://api.elevenlabs.io/v1/text-to-speech/"+voiceId);
			url.searchParams.append("enable_logging", "false");
			url.searchParams.append("output_format", "mp3_22050_32");
			
			const ttsQuery = await fetch(url, options);
			const audioBlob = await ttsQuery.blob();
			const audioUrl = URL.createObjectURL(audioBlob);

			this.loadApiCredits();

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
	tier: string
	character_count: number
	character_limit: number
	can_extend_character_limit: boolean
	allowed_to_extend_character_limit: boolean
	next_character_count_reset_unix: number
	voice_limit: number
	max_voice_add_edits: number
	voice_add_edit_counter: number
	professional_voice_limit: number
	can_extend_voice_limit: boolean
	can_use_instant_voice_cloning: boolean
	can_use_professional_voice_cloning: boolean
	currency: any
	status: string
	billing_period: any
	character_refresh_period: any
	next_invoice: any
	has_open_invoices: boolean
}