import StoreProxy from "@/store/StoreProxy";
import { closeToast, toast } from "@/utils/toast/toast";
import ToastPerfReport from "@/utils/toast/ToastPerfReport.vue";
import * as Sentry from "@sentry/vue";
import Utils from "./Utils";

/**
 * Detects if main thread lags.
 * When it detects a lag it prompts the user to send a diagnosis report via a toaster
 */
export default class PerfWatchdog {
	private static _instance: PerfWatchdog;

	private static readonly PROBE_INTERVAL: number = 250;
	// Beyond this lag duration, a lag is detected
	private static readonly LAG_FLOOR: number = 100;
	// Window during which the lag is accumulated
	private static readonly LAG_WINDOW: number = 30_000;
	// Unresponsive duration during the LAG_WINDOW
	private static readonly LAG_BUDGET: number = 3_000;
	// Above this duration it's probably because tab/computer has been
	// sleeping or got paused.
	private static readonly DRIFT_CEILING: number = 30_000;
	// only start detecting lags after this duration (init can be slow)
	private static readonly BOOT_GRACE_PERIOD: number = 30_000;
	private static readonly RECORDING_WINDOW: number = 55_000;

	private _expectedProbe: number = 0;
	private _probeTimeout: number = -1;
	private _windowStart: number = 0;
	private _blockedTime: number = 0;
	private _samples: { date: number; drift: number }[] = [];
	private _peakDrift: number = 0;
	private _bootDate: number = 0;
	private _prompted: boolean = false;
	private _freezeTimeout: number = -1;
	private _recordingEnd: number = 0;
	private _sending: boolean = false;

	constructor() {}

	/********************
	 * GETTER / SETTERS *
	 ********************/
	public static get instance(): PerfWatchdog {
		if (!PerfWatchdog._instance) {
			PerfWatchdog._instance = new PerfWatchdog();
		}
		return PerfWatchdog._instance;
	}

	/******************
	 * PUBLIC METHODS *
	 ******************/
	public start(): void {
		this._bootDate = Date.now();

		// detect if tab is put in the background to ignore lag detection
		document.addEventListener("visibilitychange", () => {
			this.resetWindow();
			this.scheduleProbe();
		});

		this.resetWindow();
		this.scheduleProbe();
	}

	/**
	 * Called when the user accepts to send a report.
	 */
	public async report(): Promise<void> {
		this._sending = true;

		const pendingToastId = toast(StoreProxy.i18n.t("perf_report.sending"), {
			autoClose: false,
			type: "info",
		});

		let sent = false;
		try {
			sent = await this.captureAndSend();
		} catch (_error) {
		} finally {
			this._sending = false;
			closeToast(pendingToastId);
		}

		toast(StoreProxy.i18n.t(sent ? "perf_report.sent" : "perf_report.failed"), {
			type: sent ? "success" : "error",
		});
	}

	/*******************
	 * PRIVATE METHODS *
	 *******************/
	/**
	 * Waits for the recording window to complete, then sends the replay and the
	 * diagnostics to Sentry
	 */
	private async captureAndSend(): Promise<boolean> {
		if (!Sentry.getClient()) return false;

		const replay = Sentry.getReplay();
		if (!replay?.getReplayId()) return false;

		// let the replay capture until it's as long as expected
		const remaining = this._recordingEnd - Date.now();
		if (remaining > 0) await Utils.promisedTimeout(remaining);

		// stop in case the recording got dropped in between
		if (!replay.getReplayId()) return false;

		this.freezeRecording();

		try {
			await replay.flush({ continueRecording: false });
		} catch (_error) {}

		Sentry.captureMessage("Performance report", {
			level: "warning",
			tags: { perf_report: "watchdog" },
			extra: this.buildDiagnostics(),
		});

		return true;
	}

	private scheduleProbe(): void {
		window.clearTimeout(this._probeTimeout);
		this._expectedProbe = performance.now() + PerfWatchdog.PROBE_INTERVAL;
		this._probeTimeout = window.setTimeout(() => this.probe(), PerfWatchdog.PROBE_INTERVAL);
	}

	/**
	 * Drops everything measured so far and starts a fresh window
	 */
	private resetWindow(): void {
		this._samples = [];
		this._blockedTime = 0;
		this._windowStart = performance.now();
	}

	/**
	 * Detect lags and trigger a toaster if it lagged for long enough
	 */
	private probe(): void {
		const now = performance.now();
		const drift = now - this._expectedProbe;
		this.scheduleProbe();

		// ignore if tab is in the background
		if (document.hidden || drift > PerfWatchdog.DRIFT_CEILING) {
			this.resetWindow();
			return;
		}

		if (drift > this._peakDrift) this._peakDrift = drift;
		if (drift > PerfWatchdog.LAG_FLOOR) {
			this._samples.push({ date: now, drift });
			this._blockedTime += drift;
		}

		//Forget what got out of the rolling window
		const oldest = now - PerfWatchdog.LAG_WINDOW;
		while (this._samples.length > 0 && this._samples[0]!.date < oldest) {
			this._blockedTime -= this._samples.shift()!.drift;
		}

		// Only prompt the user once per session
		if (this._prompted) return;
		if (Date.now() - this._bootDate < PerfWatchdog.BOOT_GRACE_PERIOD) return;
		//Don't judge on a partial window
		if (now - this._windowStart < PerfWatchdog.LAG_WINDOW) return;
		if (this._blockedTime > PerfWatchdog.LAG_BUDGET) {
			this._prompted = true;
			this.promptReport();
		}
	}

	/**
	 * Asks the user whether they want to send a report. Nothing is captured nor
	 * sent unless they accept.
	 */
	private promptReport(): void {
		try {
			Sentry.getReplay()?.startBuffering();
		} catch (_error) {}

		this._recordingEnd = Date.now() + PerfWatchdog.RECORDING_WINDOW;
		this._freezeTimeout = window.setTimeout(
			() => this.freezeRecording(),
			PerfWatchdog.RECORDING_WINDOW,
		);

		toast(ToastPerfReport, {
			autoClose: false,
			closeOnClick: false,
			type: "warning",
			onClose: () => this.stopRecording(),
			contentProps: {
				onSend: () => void this.report(),
			},
		});
	}

	/**
	 * Stops recording and keep current record until user either refuses or
	 * accepts to send
	 */
	private freezeRecording(): void {
		this.cancelFreeze();

		const replay = Sentry.getReplay() as unknown as {
			_replay?: { pause?: () => void };
		};
		try {
			replay?._replay?.pause?.();
		} catch (_error) {}
	}

	private cancelFreeze(): void {
		if (this._freezeTimeout > -1) window.clearTimeout(this._freezeTimeout);
		this._freezeTimeout = -1;
	}

	/**
	 * Cancel recording and drop it
	 */
	private stopRecording(): void {
		if (this._sending) return;
		this.cancelFreeze();
		void Sentry.getReplay()?.stop({ flush: false });
	}

	/**
	 * Gather some contextual data
	 */
	private buildDiagnostics(): { [key: string]: unknown } {
		const result: { [key: string]: unknown } = {
			uptime_s: Math.round((Date.now() - this._bootDate) / 1000),
			peak_drift_ms: Math.round(this._peakDrift),
			blocked_ms: Math.round(this._blockedTime),
			blocked_ratio: +(this._blockedTime / PerfWatchdog.LAG_WINDOW).toFixed(2),
			visibility: document.visibilityState,
		};

		try {
			const memory = (
				performance as Performance & {
					memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
				}
			).memory;
			if (memory) {
				result.heap_used_mb = Math.round(memory.usedJSHeapSize / 1048576);
				result.heap_limit_mb = Math.round(memory.jsHeapSizeLimit / 1048576);
			}
			result.chat_messages = StoreProxy.chat.messages.length;
			result.dom_nodes = document.getElementsByTagName("*").length;
			result.cpu_cores = navigator.hardwareConcurrency;
		} catch (error) {
			result.diagnostics_error = (error as Error).message;
		}

		return result;
	}
}
