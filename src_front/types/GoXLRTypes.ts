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
		sampler: Sampler2;
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
		A: A;
		B: B;
		C: C;
		D: D;
	}

	export interface A {
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

	export interface B {
		channel: string;
		mute_type: string;
		scribble: Scribble2;
		mute_state: string;
	}

	export interface Scribble2 {
		file_name: string;
		bottom_text: string;
		left_text: string;
		inverted: boolean;
	}

	export interface C {
		channel: string;
		mute_type: string;
		scribble: Scribble3;
		mute_state: string;
	}

	export interface Scribble3 {
		file_name: string;
		bottom_text: string;
		left_text: string;
		inverted: boolean;
	}

	export interface D {
		channel: string;
		mute_type: string;
		scribble: Scribble4;
		mute_state: string;
	}

	export interface Scribble4 {
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
		gain: Gain;
		frequency: Frequency;
	}

	export interface Gain {
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

	export interface Frequency {
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
		gain: Gain2;
		frequency: Frequency2;
	}

	export interface Gain2 {
		Equalizer90Hz: number;
		Equalizer1KHz: number;
		Equalizer8KHz: number;
		Equalizer3KHz: number;
		Equalizer250Hz: number;
		Equalizer500Hz: number;
	}

	export interface Frequency2 {
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
		Microphone: Microphone;
		Chat: Chat;
		Music: Music;
		Game: Game;
		Console: Console;
		LineIn: LineIn;
		System: System;
		Samples: Samples;
	}

	export interface Microphone {
		Headphones: boolean;
		BroadcastMix: boolean;
		ChatMic: boolean;
		Sampler: boolean;
		LineOut: boolean;
	}

	export interface Chat {
		Headphones: boolean;
		BroadcastMix: boolean;
		ChatMic: boolean;
		Sampler: boolean;
		LineOut: boolean;
	}

	export interface Music {
		Headphones: boolean;
		BroadcastMix: boolean;
		ChatMic: boolean;
		Sampler: boolean;
		LineOut: boolean;
	}

	export interface Game {
		Headphones: boolean;
		BroadcastMix: boolean;
		ChatMic: boolean;
		Sampler: boolean;
		LineOut: boolean;
	}

	export interface Console {
		Headphones: boolean;
		BroadcastMix: boolean;
		ChatMic: boolean;
		Sampler: boolean;
		LineOut: boolean;
	}

	export interface LineIn {
		Headphones: boolean;
		BroadcastMix: boolean;
		ChatMic: boolean;
		Sampler: boolean;
		LineOut: boolean;
	}

	export interface System {
		Headphones: boolean;
		BroadcastMix: boolean;
		ChatMic: boolean;
		Sampler: boolean;
		LineOut: boolean;
	}

	export interface Samples {
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
		simple: Simple;
		sampler: Sampler;
		encoders: Encoders;
	}

	export interface Animation {
		supported: boolean;
		mode: string;
		mod1: number
		mod2: number
		waterfall_direction: string;
	}

	export interface Faders {
		D: D2;
		A: A2;
		B: B2;
		C: C2;
	}

	export interface D2 {
		style: string;
		colours: Colours;
	}

	export interface Colours {
		colour_one: string;
		colour_two: string;
	}

	export interface A2 {
		style: string;
		colours: Colours2;
	}

	export interface Colours2 {
		colour_one: string;
		colour_two: string;
	}

	export interface B2 {
		style: string;
		colours: Colours3;
	}

	export interface Colours3 {
		colour_one: string;
		colour_two: string;
	}

	export interface C2 {
		style: string;
		colours: Colours4;
	}

	export interface Colours4 {
		colour_one: string;
		colour_two: string;
	}

	export interface Buttons {
		EffectFx: EffectFx;
		EffectMegaphone: EffectMegaphone;
		EffectSelect4: EffectSelect4
		Bleep: Bleep;
		Fader4Mute: Fader4Mute;
		EffectSelect5: EffectSelect5
		Fader2Mute: Fader2Mute;
		EffectHardTune: EffectHardTune;
		EffectRobot: EffectRobot;
		EffectSelect2: EffectSelect2
		Cough: Cough;
		Fader3Mute: Fader3Mute;
		EffectSelect6: EffectSelect6
		Fader1Mute: Fader1Mute;
		EffectSelect3: EffectSelect3
		EffectSelect1: EffectSelect1
	}

	export interface EffectFx {
		off_style: string;
		colours: Colours5;
	}

	export interface Colours5 {
		colour_one: string;
		colour_two: string;
	}

	export interface EffectMegaphone {
		off_style: string;
		colours: Colours6;
	}

	export interface Colours6 {
		colour_one: string;
		colour_two: string;
	}

	export interface EffectSelect4 {
		off_style: string;
		colours: Colours7;
	}

	export interface Colours7 {
		colour_one: string;
		colour_two: string;
	}

	export interface Bleep {
		off_style: string;
		colours: Colours8;
	}

	export interface Colours8 {
		colour_one: string;
		colour_two: string;
	}

	export interface Fader4Mute {
		off_style: string;
		colours: Colours9;
	}

	export interface Colours9 {
		colour_one: string;
		colour_two: string;
	}

	export interface EffectSelect5 {
		off_style: string;
		colours: Colours10;
	}

	export interface Colours10 {
		colour_one: string;
		colour_two: string;
	}

	export interface Fader2Mute {
		off_style: string;
		colours: Colours11;
	}

	export interface Colours11 {
		colour_one: string;
		colour_two: string;
	}

	export interface EffectHardTune {
		off_style: string;
		colours: Colours12;
	}

	export interface Colours12 {
		colour_one: string;
		colour_two: string;
	}

	export interface EffectRobot {
		off_style: string;
		colours: Colours13;
	}

	export interface Colours13 {
		colour_one: string;
		colour_two: string;
	}

	export interface EffectSelect2 {
		off_style: string;
		colours: Colours14;
	}

	export interface Colours14 {
		colour_one: string;
		colour_two: string;
	}

	export interface Cough {
		off_style: string;
		colours: Colours15;
	}

	export interface Colours15 {
		colour_one: string;
		colour_two: string;
	}

	export interface Fader3Mute {
		off_style: string;
		colours: Colours16;
	}

	export interface Colours16 {
		colour_one: string;
		colour_two: string;
	}

	export interface EffectSelect6 {
		off_style: string;
		colours: Colours17;
	}

	export interface Colours17 {
		colour_one: string;
		colour_two: string;
	}

	export interface Fader1Mute {
		off_style: string;
		colours: Colours18;
	}

	export interface Colours18 {
		colour_one: string;
		colour_two: string;
	}

	export interface EffectSelect3 {
		off_style: string;
		colours: Colours19;
	}

	export interface Colours19 {
		colour_one: string;
		colour_two: string;
	}

	export interface EffectSelect1 {
		off_style: string;
		colours: Colours20;
	}

	export interface Colours20 {
		colour_one: string;
		colour_two: string;
	}

	export interface Simple {
		Global: Global;
		Accent: Accent;
		Scribble1: Scribble1
		Scribble2: Scribble22
		Scribble3: Scribble32
		Scribble4: Scribble42
	}

	export interface Global {
		colour_one: string;
	}

	export interface Accent {
		colour_one: string;
	}

	export interface Scribble1 {
		colour_one: string;
	}

	export interface Scribble22 {
		colour_one: string;
	}

	export interface Scribble32 {
		colour_one: string;
	}

	export interface Scribble42 {
		colour_one: string;
	}

	export interface Sampler {
		SamplerSelectC: SamplerSelectC;
		SamplerSelectB: SamplerSelectB;
		SamplerSelectA: SamplerSelectA;
	}

	export interface SamplerSelectC {
		off_style: string;
		colours: Colours21;
	}

	export interface Colours21 {
		colour_one: string;
		colour_two: string;
		colour_three: string;
	}

	export interface SamplerSelectB {
		off_style: string;
		colours: Colours22;
	}

	export interface Colours22 {
		colour_one: string;
		colour_two: string;
		colour_three: string;
	}

	export interface SamplerSelectA {
		off_style: string;
		colours: Colours23;
	}

	export interface Colours23 {
		colour_one: string;
		colour_two: string;
		colour_three: string;
	}

	export interface Encoders {
		Echo: Echo;
		Gender: Gender;
		Reverb: Reverb;
		Pitch: Pitch;
	}

	export interface Echo {
		colour_one: string;
		colour_two: string;
		colour_three: string;
	}

	export interface Gender {
		colour_one: string;
		colour_two: string;
		colour_three: string;
	}

	export interface Reverb {
		colour_one: string;
		colour_two: string;
		colour_three: string;
	}

	export interface Pitch {
		colour_one: string;
		colour_two: string;
		colour_three: string;
	}

	export interface Effects {
		is_enabled: boolean;
		active_preset: string;
		preset_names: PresetNames;
		current: Current;
	}

	export interface PresetNames {
		Preset4: string
		Preset6: string
		Preset1: string
		Preset2: string
		Preset3: string
		Preset5: string
	}

	export interface Current {
		reverb: Reverb2;
		echo: Echo2;
		pitch: Pitch2;
		gender: Gender2;
		megaphone: Megaphone;
		robot: Robot;
		hard_tune: HardTune;
	}

	export interface Reverb2 {
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

	export interface Echo2 {
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

	export interface Pitch2 {
		style: string;
		amount: number;
		character: number;
	}

	export interface Gender2 {
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

	export interface Sampler2 {
		processing_state: ProcessingState;
		active_bank: string;
		clear_active: boolean;
		record_buffer: number;
		banks: Banks;
	}

	export interface ProcessingState {
		progress: unknown;
		last_error: unknown;
	}

	export interface Banks {
		B: B3;
		A: A3;
		C: C3;
	}

	export interface B3 {
		TopLeft: TopLeft;
		TopRight: TopRight;
		BottomRight: BottomRight;
		BottomLeft: BottomLeft;
	}

	export interface TopLeft {
		function: string;
		order: string;
		samples: unknown[];
		is_playing: boolean;
		is_recording: boolean;
	}

	export interface TopRight {
		function: string;
		order: string;
		samples: unknown[];
		is_playing: boolean;
		is_recording: boolean;
	}

	export interface BottomRight {
		function: string;
		order: string;
		samples: unknown[];
		is_playing: boolean;
		is_recording: boolean;
	}

	export interface BottomLeft {
		function: string;
		order: string;
		samples: unknown[];
		is_playing: boolean;
		is_recording: boolean;
	}

	export interface A3 {
		BottomLeft: BottomLeft2;
		TopLeft: TopLeft2;
		BottomRight: BottomRight2;
		TopRight: TopRight2;
	}

	export interface BottomLeft2 {
		function: string;
		order: string;
		samples: unknown[];
		is_playing: boolean;
		is_recording: boolean;
	}

	export interface TopLeft2 {
		function: string;
		order: string;
		samples: unknown[];
		is_playing: boolean;
		is_recording: boolean;
	}

	export interface BottomRight2 {
		function: string;
		order: string;
		samples: unknown[];
		is_playing: boolean;
		is_recording: boolean;
	};

	export interface TopRight2 {
		function: string;
		order: string;
		samples: unknown[];
		is_playing: boolean;
		is_recording: boolean;
	}

	export interface C3 {
		BottomRight: BottomRight3;
		TopLeft: TopLeft3;
		BottomLeft: BottomLeft3;
		TopRight: TopRight3;
	}

	export interface BottomRight3 {
		function: string;
		order: string;
		samples: unknown[];
		is_playing: boolean;
		is_recording: boolean;
	}

	export interface TopLeft3 {
		function: string;
		order: string;
		samples: unknown[];
		is_playing: boolean;
		is_recording: boolean;
	}

	export interface BottomLeft3 {
		function: string;
		order: string;
		samples: unknown[];
		is_playing: boolean;
		is_recording: boolean;
	}

	export interface TopRight3 {
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
}