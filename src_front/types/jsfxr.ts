/**
 * Type definitions for jsfxr 1.2.2
 * Project: https://github.com/chr15m/jsfxr
 * Definitions by: GitHub Copilot
 * 
 * jsfxr is a JavaScript port of sfxr, a quick 'n' easy game sound effects generator.
 * When included as a script tag, it creates a global 'sfxr' object.
 */

/**
 * Preset algorithms available for sound generation
 */
export const JSFXRSoundPreset = [
  'pickupCoin',
  'laserShoot',
  'explosion',
  'powerUp',
  'hitHurt',
  'jump',
  'blipSelect',
  'synth',
  'tone',
  'click',
  'random',
] as const;

/**
 * Wave types for sound generation
 */
type WaveType = 0 | 1 | 2 | 3; // 0: square, 1: sawtooth, 2: sine, 3: noise

/**
 * Sound parameters object structure
 */
export interface SFXRSoundParams {
  oldParams?: boolean;
  wave_type?: WaveType;
  
  // Envelope parameters
  p_env_attack?: number;
  p_env_sustain?: number;
  p_env_punch?: number;
  p_env_decay?: number;
  
  // Frequency parameters
  p_base_freq?: number;
  p_freq_limit?: number;
  p_freq_ramp?: number;
  p_freq_dramp?: number;
  
  // Vibrato parameters
  p_vib_strength?: number;
  p_vib_speed?: number;
  
  // Arpeggio parameters
  p_arp_mod?: number;
  p_arp_speed?: number;
  
  // Duty cycle parameters
  p_duty?: number;
  p_duty_ramp?: number;
  
  // Repeat parameters
  p_repeat_speed?: number;
  
  // Phaser parameters
  p_pha_offset?: number;
  p_pha_ramp?: number;
  
  // Low-pass filter parameters
  p_lpf_freq?: number;
  p_lpf_ramp?: number;
  p_lpf_resonance?: number;
  
  // High-pass filter parameters
  p_hpf_freq?: number;
  p_hpf_ramp?: number;
  
  // Volume and sample parameters
  sound_vol?: number;
  sample_rate?: number;
  sample_size?: number;
}

/**
 * Wave data structure returned by toWave method
 */
interface WaveData {
  dataURI: string;
  [key: string]: any;
}

/**
 * Main SFXR interface - available globally as 'sfxr' when script is loaded
 */
export interface SFXR {
  /**
   * Generate a sound using a preset algorithm
   * @param preset - The preset algorithm name
   * @returns Sound parameters object
   */
  generate(preset: typeof JSFXRSoundPreset[number]): SFXRSoundParams;

  /**
   * Play a sound using the Web Audio API
   * @param sound - Sound parameters or base58 encoded string
   */
  play(sound: SFXRSoundParams | string): void;

  /**
   * Convert sound parameters to an HTML5 Audio element
   * @param sound - Sound parameters or base58 encoded string
   * @returns HTML5 Audio element ready to play
   */
  toAudio(sound: SFXRSoundParams | string): {channels:AudioBufferSourceNode[], play:()=>AudioBufferSourceNode, setVolume:(volume:number)=>void};

  /**
   * Convert sound parameters to a raw audio buffer (Float32Array)
   * @param sound - Sound parameters or base58 encoded string
   * @returns Array of audio samples at 44100 Hz sample rate
   */
  toBuffer(sound: SFXRSoundParams | string): Float32Array;

  /**
   * Convert sound parameters to a WAV file data URI
   * @param sound - Sound parameters or base58 encoded string
   * @returns Wave data object with dataURI property
   */
  toWave(sound: SFXRSoundParams | string): WaveData;

  /**
   * Encode sound parameters to base58 string format
   * @param sound - Sound parameters object
   * @returns Base58 encoded string representation
   */
  b58encode(sound: SFXRSoundParams): string;

  /**
   * Decode base58 string to sound parameters object
   * @param encoded - Base58 encoded string
   * @returns Sound parameters object
   */
  b58decode(encoded: string): SFXRSoundParams;
}