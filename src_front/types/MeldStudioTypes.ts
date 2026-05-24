/**
 * Type definitions for the Meld Studio WebChannel API.
 * Reference: https://github.com/MeldStudio/streamdeck/blob/main/WebChannelAPI.md
 *
 * The `meld` QObject is exposed by Meld Studio over its QWebChannel transport.
 * Use it as `channel.objects.meld as MeldStudio` after the QWebChannel is ready.
 */

import type { QObject, QSignal } from "./qwebchannel";

/**
 * 32-character hex identifier used for scenes, layers, effects, and audio tracks.
 */
export type MeldStudioId = string;

/**
 * Audio track item in the session.
 */
export interface MeldStudioAudioTrack {
	type: "track";
	/**
	 * Scene Identifier; if not present, the track is a global track
	 */
	parent?: MeldStudioId;
	/**
	 * Mirrors the parent Layer name when nested, otherwise the track's own name
	 */
	name: string;
	/**
	 * Whether the track is currently cued (monitoring)
	 */
	monitoring: boolean;
	/**
	 * Whether the track is currently muted
	 */
	muted: boolean;
}

/**
 * Scene item in the session.
 */
export interface MeldStudioScene {
	type: "scene";
	/**
	 * Position of the scene in the scene list
	 */
	index: number;
	/**
	 * User-specified name of the scene
	 */
	name: string;
	/**
	 * Whether the scene is currently being displayed
	 */
	current: boolean;
	/**
	 * Whether the scene is staged to be presented next
	 */
	staged: boolean;
	/**
	 * Whether the scene is in vertical orientation
	 */
	vertical: boolean;
}

/**
 * Layer item in the session.
 */
export interface MeldStudioLayer {
	type: "layer";
	/**
	 * Parent scene identifier
	 */
	parent: MeldStudioId;
	/**
	 * Position of the layer in the layer list
	 */
	index: number;
	/**
	 * User-specified name of the layer
	 */
	name: string;
	/**
	 * Whether the layer is currently being rendered
	 */
	visible: boolean;
	/**
	 * Whether the layer is effectively visible after taking parent visibility into account
	 */
	isEffectivelyVisible: boolean;
	/**
	 * Height of the layer in the scene
	 */
	height: number;
	/**
	 * Width of the layer in the scene
	 */
	width: number;
	/**
	 * Horizontal position of the layer in the scene
	 */
	x: number;
	/**
	 * Vertical position of the layer in the scene
	 */
	y: number;
	/**
	 * Rotation angle of the layer (degrees)
	 */
	rotation: number;
	/**
	 * Path for image source (when applicable)
	 */
	source?: string;
	/**
	 * URL for browser source (when applicable)
	 */
	url?: string;
	/**
	 * Path for media source (when applicable)
	 */
	mediaSource?: string;
}

/**
 * Effect item in the session.
 */
export interface MeldStudioEffect {
	type: "effect";
	/**
	 * Parent layer identifier
	 */
	parent: MeldStudioId;
	/**
	 * Effect name
	 */
	name: string;
	/**
	 * Whether the effect is currently applied
	 */
	enabled: boolean;
}

/**
 * Discriminated union of all item types found in `meld.session.items`.
 */
export type MeldStudioSessionItem =
	| MeldStudioScene
	| MeldStudioLayer
	| MeldStudioEffect
	| MeldStudioAudioTrack;

/**
 * Map of session items keyed by their 32-character hex identifier.
 */
export type MeldStudioSessionItems = Record<MeldStudioId, MeldStudioSessionItem>;

/**
 * Current session state.
 */
export interface MeldStudioSession {
	/**
	 * All scenes, layers, effects, and audio tracks in the current session
	 */
	items: MeldStudioSessionItems;
}

/**
 * Commands accepted by `meld.sendCommand`.
 */
export type MeldStudioCommand =
	| "meld.screenshot"
	| "meld.screenshot.vertical"
	| "meld.startStreamingAction"
	| "meld.stopStreamingAction"
	| "meld.toggleStreamingAction"
	| "meld.startRecordingAction"
	| "meld.stopRecordingAction"
	| "meld.toggleRecordingAction"
	| "meld.toggleVirtualCameraAction"
	| "meld.recordClip"
	| "meld.replay.show"
	| "meld.replay.dismiss";

/**
 * Stream event types accepted by `meld.sendStreamEvent`.
 */
export type MeldStudioStreamEventType =
	| "STOPWATCH_RESET"
	| "STOPWATCH_PAUSE"
	| "STOPWATCH_RESUME"
	| "COUNTDOWN_RESET"
	| "COUNTDOWN_PAUSE"
	| "COUNTDOWN_RESUME"
	| "CONFETTIFALL_TRIGGER"
	| "CONFETTIPOP_TRIGGER"
	| "SUBATHONTIMER_RESET"
	| "SUBATHONTIMER_PAUSE"
	| "SUBATHONTIMER_RESUME"
	/**
	 * Requires data `{ amount: number }` in seconds
	 */
	| "SUBATHONTIMER_ADDTIME"
	| "WHEELSPIN_SPIN"
	| "COUNTER_INCREMENT"
	| "COUNTER_DECREMENT";

/**
 * Media-player commands accepted by `meld.callFunction` / `meld.callFunctionWithArgs`.
 */
export type MeldStudioMediaCommand = "play" | "pause";
export type MeldStudioMediaCommandWithArgs = "seekTo";

/**
 * The `meld` QObject exposed by Meld Studio over QWebChannel.
 *
 * Cast `channel.objects.meld` to this type after the channel is ready.
 */
export interface MeldStudio extends QObject {
	// ---------------------------------------------------------------------------
	// PROPERTIES
	// ---------------------------------------------------------------------------

	/**
	 * API version. `undefined` means version 1.
	 */
	readonly version: number | undefined;

	/**
	 * Whether Meld is currently streaming
	 */
	readonly isStreaming: boolean;

	/**
	 * Whether Meld is currently recording
	 */
	readonly isRecording: boolean;

	/**
	 * Current session state (scenes, layers, effects, audio tracks)
	 */
	readonly session: MeldStudioSession;

	// ---------------------------------------------------------------------------
	// SIGNALS
	// ---------------------------------------------------------------------------

	/**
	 * Emitted when gain or mute status of a track changes.
	 * Faster than waiting for a session update; ideal for real-time volume UIs.
	 * Only fires for tracks registered via `registerTrackObserver`.
	 */
	gainUpdated: QSignal<[trackId: MeldStudioId, gain: number, muted: boolean]>;

	/**
	 * Emitted any time the contents of `session` change
	 */
	sessionChanged: QSignal<[]>;

	/**
	 * Emitted any time `isStreaming` changes
	 */
	isStreamingChanged: QSignal<[]>;

	/**
	 * Emitted any time `isRecording` changes
	 */
	isRecordingChanged: QSignal<[]>;

	// ---------------------------------------------------------------------------
	// CLIENT
	// ---------------------------------------------------------------------------

	/**
	 * Identifies the connected client to Meld Studio.
	 */
	setClientName(name: string): void;

	// ---------------------------------------------------------------------------
	// SCENE MANAGEMENT
	// ---------------------------------------------------------------------------

	/**
	 * Switches to the specified scene
	 */
	showScene(sceneId: MeldStudioId): void;

	/**
	 * Stages a scene without making it live
	 */
	setStagedScene(sceneId: MeldStudioId): void;

	/**
	 * Makes the currently staged scene live
	 */
	showStagedScene(): void;

	// ---------------------------------------------------------------------------
	// AUDIO TRACK MANAGEMENT
	// ---------------------------------------------------------------------------

	/**
	 * Toggles mute status of an audio track.
	 * Triggers a session update and (if registered) `gainUpdated`.
	 */
	toggleMute(trackId: MeldStudioId): void;

	/**
	 * Sets the mute status of an audio track to an explicit value.
	 * Triggers a session update and (if registered) `gainUpdated`.
	 */
	setMuted(trackId: MeldStudioId, muted: boolean): void;

	/**
	 * Toggles monitoring status of an audio track
	 */
	toggleMonitor(trackId: MeldStudioId): void;

	/**
	 * Sets gain on an audio track.
	 * @param gain Range 0.0 - 1.0
	 */
	setGain(trackId: MeldStudioId, gain: number): void;

	/**
	 * Registers an observer to receive faster `gainUpdated` callbacks for the
	 * specified track.
	 */
	registerTrackObserver(context: string, trackId: MeldStudioId): void;

	/**
	 * Unregisters a previously registered track observer
	 */
	unregisterTrackObserver(context: string, trackId: MeldStudioId): void;

	// ---------------------------------------------------------------------------
	// LAYER MANAGEMENT
	// ---------------------------------------------------------------------------

	/**
	 * Toggles visibility of a layer within a scene
	 */
	toggleLayer(sceneId: MeldStudioId, layerId: MeldStudioId): void;

	// ---------------------------------------------------------------------------
	// EFFECT MANAGEMENT
	// ---------------------------------------------------------------------------

	/**
	 * Toggles the enabled status of an effect within a layer
	 */
	toggleEffect(sceneId: MeldStudioId, layerId: MeldStudioId, effectId: MeldStudioId): void;

	// ---------------------------------------------------------------------------
	// RECORDING & STREAMING
	// ---------------------------------------------------------------------------

	/**
	 * Toggles recording. Updates `isRecording` and emits `isRecordingChanged`.
	 */
	toggleRecord(): void;

	/**
	 * Toggles streaming. Updates `isStreaming` and emits `isStreamingChanged`.
	 */
	toggleStream(): void;

	// ---------------------------------------------------------------------------
	// MEDIA CONTROL
	// ---------------------------------------------------------------------------

	/**
	 * Sends a no-arg media command (play/pause) to a media-player layer
	 */
	callFunction(layerId: MeldStudioId, command: MeldStudioMediaCommand): void;

	/**
	 * Sends a media command with arguments to a media-player layer.
	 * `seekTo` expects `[seconds]`.
	 */
	callFunctionWithArgs(
		layerId: MeldStudioId,
		command: MeldStudioMediaCommandWithArgs,
		args: [seconds: number],
	): void;

	// ---------------------------------------------------------------------------
	// PROPERTY MANAGEMENT (Version 2+)
	// ---------------------------------------------------------------------------

	/**
	 * Sets the value of a property on a session object.
	 * Note: setting `parent`, `type`, and `index` has no effect.
	 * Introduced in API version 2.
	 */
	setProperty(objectId: MeldStudioId, propertyName: string, value: unknown): void;

	// ---------------------------------------------------------------------------
	// COMMANDS & EVENTS
	// ---------------------------------------------------------------------------

	/**
	 * Sends a top-level Meld command
	 */
	sendCommand(command: MeldStudioCommand): void;

	/**
	 * Dispatches a widget event.
	 * `data` is required for events that accept a payload
	 * (e.g. `SUBATHONTIMER_ADDTIME` expects `{ amount: number }`).
	 */
	sendStreamEvent(type: MeldStudioStreamEventType, data?: Record<string, unknown>): void;

	/**
	 * @deprecated Use {@link sendCommand} instead.
	 */
	sendEvent(event: string): void;
}

/**
 * Narrow helpers for working with `meld.session.items`.
 */
export function isMeldStudioScene(item: MeldStudioSessionItem): item is MeldStudioScene {
	return item.type === "scene";
}
export function isMeldStudioLayer(item: MeldStudioSessionItem): item is MeldStudioLayer {
	return item.type === "layer";
}
export function isMeldStudioEffect(item: MeldStudioSessionItem): item is MeldStudioEffect {
	return item.type === "effect";
}
export function isMeldStudioAudioTrack(item: MeldStudioSessionItem): item is MeldStudioAudioTrack {
	return item.type === "track";
}

