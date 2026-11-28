// Alias set per build to one of ELD's models, see "pack" in vite.config.ts
import { eld } from "eld-model";

// Listen for messages from the main thread
self.onmessage = function (event) {
	const detection = eld.detect(event.data.text ?? "");
	// "detection" holds functions and can't be cloned through postMessage
	const result = Object.entries(detection.getScores());
	postMessage({ id: event.data.id, result, reliable: detection.isReliable() });
};
