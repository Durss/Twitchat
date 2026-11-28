/**
 * Type definitions for QWebChannel (Qt WebChannel)
 * Source: static/qwebchannel.js (Qt official lib)
 *
 * The script exposes the `QWebChannel` constructor globally when loaded via a
 * <script> tag. It bridges a Qt host application with the page via a transport
 * object (typically `qt.webChannelTransport`).
 */

import type { MeldStudio } from "./MeldStudioTypes";

/**
 * Message type constants used by the QWebChannel protocol.
 */
export const QWebChannelMessageTypes = {
	signal: 1,
	propertyUpdate: 2,
	init: 3,
	idle: 4,
	debug: 5,
	invokeMethod: 6,
	connectToSignal: 7,
	disconnectFromSignal: 8,
	setProperty: 9,
	response: 10,
} as const;

export type QWebChannelMessageType =
	(typeof QWebChannelMessageTypes)[keyof typeof QWebChannelMessageTypes];

/**
 * A converter receives a raw response value from the host and either returns
 * a transformed value or `undefined` if it does not apply.
 */
export type QWebChannelConverter = (response: unknown) => unknown;

/**
 * Built-in converters available by name.
 */
export type QWebChannelBuiltInConverter = "Date";

/**
 * Signal exposed on a QObject. Connect/disconnect JS callbacks to a Qt signal.
 */
export interface QSignal<TArgs extends unknown[] = unknown[]> {
	connect(callback: (...args: TArgs) => void): void;
	disconnect(callback: (...args: TArgs) => void): void;
}

/**
 * A QObject proxy as exposed by QWebChannel. Properties, methods and signals
 * declared on the Qt-side object are dynamically attached at runtime.
 */
export interface QObject {
	readonly __id__: string;
	readonly __objectSignals__: Record<string, Array<(...args: unknown[]) => void>>;
	readonly __propertyCache__: Record<string, unknown>;
	/** Always present: emitted when the Qt object is destroyed */
	destroyed: QSignal<[]>;
	/** Dynamic methods, properties and signals declared by the host */
	[key: string]: unknown;
}

/**
 * QWebChannel instance, returned by `new QWebChannel(...)`.
 */
export interface QWebChannelInstance {
	transport: WebSocket;
	objects: { meld: MeldStudio };
	usedConverters: QWebChannelConverter[];
	execCallbacks: Record<number, (data: unknown) => void>;
	execId: number;
	addConverter(converter: QWebChannelConverter | QWebChannelBuiltInConverter): void;
	send(data: string | object): void;
	exec(data: object, callback?: (data: unknown) => void): void;
	debug(message: unknown): void;
	handleSignal(message: { object: string; signal: string; args: unknown[] }): void;
	handleResponse(message: { id: number; data: unknown }): void;
	handlePropertyUpdate(message: {
		data: Array<{
			object: string;
			signals: Record<string, unknown[]>;
			properties: Record<string, unknown>;
		}>;
	}): void;
}

/**
 * QWebChannel constructor signature, as exposed on `window` by qwebchannel.js.
 *
 * @param transport Transport object provided by the Qt host
 * @param initCallback Called once the channel is initialized and objects are
 *  ready. Receives the channel instance.
 * @param converters Optional converter(s) used to transform raw values
 *  returned by the host into JS values.
 */
export type QWebChannelConstructor = new (
	transport: WebSocket,
	initCallback?: (channel: QWebChannelInstance) => void,
	converters?:
		| QWebChannelConverter
		| QWebChannelBuiltInConverter
		| Array<QWebChannelConverter | QWebChannelBuiltInConverter>,
) => QWebChannelInstance;
