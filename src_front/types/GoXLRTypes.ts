export namespace GoXLRTypes {

	export interface Status {
		config: Config;
		mixers: {[key:string]:Mixer};
		paths: Paths;
		files: Files;
	}

	export interface Config {
		http_settings: HttpSettings;
		daemon_version: string;
		autostart_enabled: boolean;
		show_tray_icon: boolean;
		tts_enabled: boolean;
		allow_network_access: boolean;
		log_level: string;
	}

	export interface HttpSettings {
		enabled: boolean;
		bind_address: string;
		cors_enabled: boolean;
		port: number;
	}

	export interface Mixer {
		hardware: Hardware;
		shutdown_commands: unknown[];
		fader_status: FaderStatus;
		mic_status: MicStatus;
		levels: Levels;
		router: Router;
		cough_button: CoughButton;
		lighting: Lighting;
		effects: Effects;
		sampler: MixerSampler;
		settings: Settings;
		button_down: ButtonDown;
		profile_name: string;
		mic_profile_name: string;
	}

	export interface Hardware {
		versions: Versions;
		serial_number: string;
		manufactured_date: string;
		device_type: string;
		usb_device: UsbDevice;
	}

	export interface Versions {
		firmware: number[];
		fpga_count: number;
		dice: number[];
	}

	export interface UsbDevice {
		manufacturer_name: string;
		product_name: string;
		version: number[];
		bus_number: number;
		address: number;
		identifier: string;
	}

	export interface FaderStatus {
		A: FaderStatusEntry;
		B: FaderStatusEntry;
		C: FaderStatusEntry;
		D: FaderStatusEntry;
	}

	export interface FaderStatusEntry {
		channel: string;
		mute_type: string;
		scribble: Scribble;
		mute_state: string;
	}

	export interface Scribble {
		file_name: string;
		bottom_text: string;
		left_text: string;
		inverted: boolean;
	}

	export interface MicStatus {
		mic_type: string;
		mic_gains: MicGains;
		equaliser: Equaliser;
		equaliser_mini: EqualiserMini;
		noise_gate: NoiseGate;
		compressor: Compressor;
	}

	export interface MicGains {
		Dynamic: number;
		Condenser: number;
		Jack: number;
	}

	export interface Equaliser {
		gain: EqualiserGain;
		frequency: EqualiserFrequency;
	}

	export interface EqualiserGain {
		Equalizer125Hz: number;
		Equalizer63Hz: number;
		Equalizer2KHz: number;
		Equalizer250Hz: number;
		Equalizer500Hz: number;
		Equalizer4KHz: number;
		Equalizer8KHz: number;
		Equalizer1KHz: number;
		Equalizer31Hz: number;
		Equalizer16KHz: number;
	}

	export interface EqualiserFrequency {
		Equalizer8KHz: number;
		Equalizer16KHz: number;
		Equalizer4KHz: number;
		Equalizer125Hz: number;
		Equalizer500Hz: number;
		Equalizer250Hz: number;
		Equalizer1KHz: number;
		Equalizer31Hz: number;
		Equalizer2KHz: number;
		Equalizer63Hz: number;
	}

	export interface EqualiserMini {
		gain: EqualiserMiniGain;
		frequency: EqualiserMiniFrequency;
	}

	export interface EqualiserMiniGain {
		Equalizer90Hz: number;
		Equalizer1KHz: number;
		Equalizer8KHz: number;
		Equalizer3KHz: number;
		Equalizer250Hz: number;
		Equalizer500Hz: number;
	}

	export interface EqualiserMiniFrequency {
		Equalizer1KHz: number;
		Equalizer90Hz: number;
		Equalizer250Hz: number;
		Equalizer500Hz: number;
		Equalizer8KHz: number;
		Equalizer3KHz: number;
	}

	export interface NoiseGate {
		threshold: number;
		attack: number;
		release: number;
		enabled: boolean;
		attenuation: number;
	}

	export interface Compressor {
		threshold: number;
		ratio: number;
		attack: number;
		release: number;
		makeup_gain: number;
	}

	export interface Levels {
		submix_supported: boolean;
		output_monitor: string;
		volumes: Volumes;
		submix: unknown;
		bleep: number;
		deess: number;
	}

	export interface Volumes {
		Mic: number;
		LineIn: number;
		Console: number;
		System: number;
		Game: number;
		Chat: number;
		Sample: number;
		Music: number;
		Headphones: number;
		MicMonitor: number;
		LineOut: number;
	}

	export interface Router {
		Microphone: RouterEntry;
		Chat: RouterEntry;
		Music: RouterEntry;
		Game: RouterEntry;
		Console: RouterEntry;
		LineIn: RouterEntry;
		System: RouterEntry;
		Samples: RouterEntry;
	}

	export interface RouterEntry {
		Headphones: boolean;
		BroadcastMix: boolean;
		ChatMic: boolean;
		Sampler: boolean;
		LineOut: boolean;
	}


	export interface CoughButton {
		is_toggle: boolean;
		mute_type: string;
		state: string;
	}

	export interface Lighting {
		animation: Animation;
		faders: Faders;
		buttons: Buttons;
		simple: LightingSimple;
		sampler: LightingSampler;
		encoders: Encoders;
	}

	export interface Animation {
		supported: boolean;
		mode: string;
		mod1: number
		mod2: number
		waterfall_direction: string;
	}

	export interface Buttons {
		EffectFx: Button;
		EffectMegaphone: Button;
		EffectSelect4: Button
		Bleep: Button;
		Fader4Mute: Button;
		EffectSelect5: Button
		Fader2Mute: Button;
		EffectHardTune: Button;
		EffectRobot: Button;
		EffectSelect2: Button
		Cough: Button;
		Fader3Mute: Button;
		EffectSelect6: Button
		Fader1Mute: Button;
		EffectSelect3: Button
		EffectSelect1: Button
	}

	export interface Button {
		off_style: string;
		colours: ButtonColour;
	}

	export interface ButtonColour {
		colour_one: string;
		colour_two: string;
	}

	export interface Faders {
		D: Button;
		A: Button;
		B: Button;
		C: Button;
	}

	export interface LightingSimple {
		Global: LightingSimpleEntry;
		Accent: LightingSimpleEntry;
		Scribble1: LightingSimpleEntry;
		Scribble2: LightingSimpleEntry;
		Scribble3: LightingSimpleEntry;
		Scribble4: LightingSimpleEntry;
	}

	export interface LightingSimpleEntry {
		colour_one: string;
	}

	export interface LightingSampler {
		SamplerSelectC: LightingSamplerEntry;
		SamplerSelectB: LightingSamplerEntry;
		SamplerSelectA: LightingSamplerEntry;
	}

	export interface LightingSamplerEntry {
		off_style: string;
		colours: ColourConfig;
	}

	export interface ColourConfig {
		colour_one: string;
		colour_two: string;
		colour_three: string;
	}

	export interface Encoders {
		Echo: ColourConfig;
		Gender: ColourConfig;
		Reverb: ColourConfig;
		Pitch: ColourConfig;
	}

	export interface Effects {
		is_enabled: boolean;
		active_preset: string;
		preset_names: PresetNames;
		current: CurrentEffect;
	}

	export interface PresetNames {
		Preset1: string
		Preset2: string
		Preset3: string
		Preset4: string
		Preset5: string
		Preset6: string
	}

	export interface CurrentEffect {
		reverb: Reverb;
		echo: Echo;
		pitch: Pitch;
		gender: Gender;
		megaphone: Megaphone;
		robot: Robot;
		hard_tune: HardTune;
	}

	export interface Reverb {
		style: string;
		amount: number;
		decay: number;
		early_level: number;
		tail_level: number;
		pre_delay: number;
		lo_colour: number;
		hi_colour: number;
		hi_factor: number;
		diffuse: number;
		mod_speed: number;
		mod_depth: number;
	}

	export interface Echo {
		style: string;
		amount: number;
		feedback: number;
		tempo: number;
		delay_left: number;
		delay_right: number;
		feedback_left: number;
		feedback_right: number;
		feedback_xfb_l_to_r: number;
		feedback_xfb_r_to_l: number;
	}

	export interface Pitch {
		style: string;
		amount: number;
		character: number;
	}

	export interface Gender {
		style: string;
		amount: number;
	}

	export interface Megaphone {
		is_enabled: boolean;
		style: string;
		amount: number;
		post_gain: number;
	}

	export interface Robot {
		is_enabled: boolean;
		style: string;
		low_gain: number;
		low_freq: number;
		low_width: number;
		mid_gain: number;
		mid_freq: number;
		mid_width: number;
		high_gain: number;
		high_freq: number;
		high_width: number;
		waveform: number;
		pulse_width: number;
		threshold: number;
		dry_mix: number;
	}

	export interface HardTune {
		is_enabled: boolean;
		style: string;
		amount: number;
		rate: number;
		window: number;
		source: string;
	}

	export interface MixerSampler {
		processing_state: MixerSamplerProcessingState;
		active_bank: string;
		clear_active: boolean;
		record_buffer: number;
		banks: MixerSamplerBanks;
	}

	export interface MixerSamplerProcessingState {
		progress: unknown;
		last_error: unknown;
	}

	export interface MixerSamplerBanks {
		B: Bank;
		A: Bank;
		C: Bank;
	}

	export interface Bank {
		BottomRight: BankButton;
		TopLeft: BankButton;
		BottomLeft: BankButton;
		TopRight: BankButton;
	}

	export interface BankButton {
		function: string;
		order: string;
		samples: unknown[];
		is_playing: boolean;
		is_recording: boolean;
	}

	export interface Settings {
		display: Display;
		mute_hold_duration: number;
		vc_mute_also_mute_cm: boolean;
	}

	export interface Display {
		gate: string;
		compressor: string;
		equaliser: string;
		equaliser_fine: string;
	}

	export interface ButtonDown {
		Fader1Mute: boolean;
		Fader2Mute: boolean;
		Fader3Mute: boolean;
		Fader4Mute: boolean;
		Bleep: boolean;
		Cough: boolean;
		EffectSelect1: boolean;
		EffectSelect2: boolean;
		EffectSelect3: boolean;
		EffectSelect4: boolean;
		EffectSelect5: boolean;
		EffectSelect6: boolean;
		EffectFx: boolean;
		EffectMegaphone: boolean;
		EffectRobot: boolean;
		EffectHardTune: boolean;
		SamplerSelectA: boolean;
		SamplerSelectB: boolean;
		SamplerSelectC: boolean;
		SamplerTopLeft: boolean;
		SamplerTopRight: boolean;
		SamplerBottomLeft: boolean;
		SamplerBottomRight: boolean;
		SamplerClear: boolean;
	}

	export interface Paths {
		profile_directory: string;
		mic_profile_directory: string;
		samples_directory: string;
		presets_directory: string;
		icons_directory: string;
		logs_directory: string;
	}

	export interface Files {
		profiles: string[];
		mic_profiles: string[];
		presets: string[];
		samples: unknown;
		icons: string[];
	}

	export const ButtonTypes = ["Fader1Mute", "Fader2Mute", "Fader3Mute", "Fader4Mute",
								"EffectSelect1", "EffectSelect2", "EffectSelect3", "EffectSelect4", "EffectSelect5", "EffectSelect6",
								"SamplerSelectA", "SamplerSelectB", "SamplerSelectC",
								"EffectMegaphone", "EffectRobot", "EffectHardTune", "EffectFx", 
								"Bleep", "Cough",
								"gender", "echo", "reverb", "pitch",
								"SamplerTopLeft", "SamplerBottomLeft", "SamplerBottomRight", "SamplerTopRight", "SamplerClear"] as const;
	export type ButtonTypesData = typeof ButtonTypes[number];
}