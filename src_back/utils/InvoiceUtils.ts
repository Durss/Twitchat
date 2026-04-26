import fetch from "node-fetch";
import Config from "./Config.js";

export interface InvoiceData {
	orderId: string;
	date: Date;
	twitchLogin: string;
	twitchUID: string;
	payerName: string;
	payerEmail?: string;
	payerPhone?: string;
	payerId: string;
	payerAddressLine1?: string;
	payerAddressLine2?: string;
	payerCity?: string;
	payerState?: string;
	payerPostCode?: string;
	payerCountryName?: string;
	payerCountryCode?: string;
	giftedTwitchLogin?: string;
	paymentMethod?: string;
	description: string;
	quantity: number;
	unitPrice: number;
	amount: number;
	fees: number;
	currency: string;
}

export interface InvoiceMetadata {
	orderId: string;
	invoiceNumber: string;
	date: string;
	twitchLogin: string;
	twitchUID: string;
	payerName: string;
	payerEmail: string;
	payerId: string;
	giftedTwitchLogin?: string;
	amount: number;
	fees: number;
	currency: string;
}

/**
 * Created : 25/04/2026
 *
 * Thin client for the standalone invoice_api service. PDF generation,
 * Factur-X embedding and storage all live on the remote side; this class only
 * forwards calls and exposes the resulting metadata / streams.
 */
export default class InvoiceUtils {
	/**
	 * Asks the invoice service to generate (or re-generate, idempotent on
	 * orderId) a Factur-X invoice for the given payment.
	 */
	public static async generatePaypalInvoice(
		data: InvoiceData,
	): Promise<{ invoiceNumber: string }> {
		const res = await this.callApi("/invoices", {
			method: "POST",
			body: JSON.stringify({
				...data,
				date: data.date.toISOString(),
			}),
			headers: { "Content-Type": "application/json" },
		});
		if (!res.ok) {
			throw new Error(
				"Invoice API responded " +
					res.status +
					": " +
					(await res.text()),
			);
		}
		return (await res.json()) as { invoiceNumber: string };
	}

	/**
	 * Lists invoices for a single Twitch user, newest first.
	 */
	public static async listInvoices(
		twitchUID: string,
	): Promise<InvoiceMetadata[]> {
		const res = await this.callApi(
			"/invoices?twitchUID=" + encodeURIComponent(twitchUID),
		);
		if (!res.ok) {
			throw new Error("Invoice API responded " + res.status);
		}
		const json = (await res.json()) as { invoices?: InvoiceMetadata[] };
		return json.invoices ?? [];
	}

	/**
	 * Fetches the PDF for a single invoice. Returns the response body stream
	 * so the caller can pipe it directly to the client; null when the remote
	 * service reports 404.
	 */
	public static async fetchInvoicePdf(
		twitchUID: string,
		orderId: string,
	): Promise<NodeJS.ReadableStream | null> {
		const res = await this.callApi(
			"/invoices/" +
				encodeURIComponent(twitchUID) +
				"/" +
				encodeURIComponent(orderId),
		);
		if (res.status === 404) return null;
		if (!res.ok) {
			throw new Error("Invoice API responded " + res.status);
		}
		return res.body as unknown as NodeJS.ReadableStream;
	}

	private static callApi(
		path: string,
		init?: {
			method?: string;
			body?: string;
			headers?: Record<string, string>;
		},
	): ReturnType<typeof fetch> {
		const base = Config.credentials.invoice_api_url.replace(/\/$/, "");
		return fetch(base + path, {
			method: init?.method,
			body: init?.body,
			headers: {
				...init?.headers,
				"X-API-Key": Config.credentials.invoice_api_key,
			},
		});
	}
}

