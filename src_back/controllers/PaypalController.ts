import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fetch from "node-fetch";
import jwt, { JwtPayload } from "jsonwebtoken";
import Config from "../utils/Config.js";
import InvoiceUtils from "../utils/InvoiceUtils.js";
import Logger from "../utils/Logger.js";
import AbstractController from "./AbstractController.js";
import TwitchUtils, { TwitchUserInfos } from "../utils/TwitchUtils.js";

interface InvoiceDownloadToken extends JwtPayload {
	uid: string;
	orderId: string;
	date: number;
}

const INVOICE_TOKEN_TTL_MS = 60 * 1000;

/**
 * Created : 17/08/2023
 */
export default class PaypalController extends AbstractController {
	constructor(public server: FastifyInstance) {
		super();
	}

	/********************
	 * GETTER / SETTERS *
	 ********************/

	/******************
	 * PUBLIC METHODS *
	 ******************/
	public async initialize(): Promise<void> {
		this.server.post(
			"/api/paypal/create_order",
			async (request, response) => await this.postCreateOrder(request, response),
		);
		this.server.post(
			"/api/paypal/complete_order",
			async (request, response) => await this.postCompleteOrder(request, response),
		);
		this.server.get(
			"/api/paypal/invoice/list",
			async (request, response) => await this.getInvoiceList(request, response),
		);
		this.server.get(
			"/api/paypal/invoice/downloadToken",
			async (request, response) => await this.getInvoiceDownloadToken(request, response),
		);
		this.server.get(
			"/api/paypal/invoice",
			async (request, response) => await this.getInvoice(request, response),
		);
	}

	/*******************
	 * PRIVATE METHODS *
	 *******************/
	/**
	 * Create a paypal order
	 */
	private async postCreateOrder(request: FastifyRequest, response: FastifyReply): Promise<void> {
		const userInfo = await super.twitchUserGuard(request, response);
		if (userInfo == false) return;

		const token = await this.getToken();
		const body: any = request.body;

		let amount = body.amount || 20;
		if (amount < 0) amount = 20;
		if (amount < 3) amount = 3;
		let amountStr = amount.toString();
		amountStr = amountStr.replace(/\D,\./gi, "");
		if (amountStr.indexOf(".") == -1) amountStr += ".00";

		const order_data_json = {
			intent: (body.intent as string).toUpperCase(),
			purchase_units: [
				{
					amount: {
						currency_code: body.currency,
						value: amountStr,
					},
				},
			],
		};
		const data = JSON.stringify(order_data_json);

		try {
			const json = await fetch(Config.PAYPAL_ENDPOINT + "/v2/checkout/orders", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: data,
			})
				.then(
					(res) =>
						res.json() as unknown as {
							id: string;
							status: string;
							details: {
								description: string;
								issue: string;
							}[];
						},
				)
				.then((json) => {
					return json;
				});
			let errorMessage = "";
			let errorCode = "";
			const success = json.status == "CREATED";
			if (!success) {
				errorMessage = json.details[0]!.description || "unknown error";
				errorCode = json.details[0]!.issue;
			}
			response.header("Content-Type", "application/json");
			response.status(200);
			response.send(
				JSON.stringify({
					success,
					data: { orderId: json.id, json },
					error: errorMessage,
					errorCode,
				}),
			);
		} catch (error) {
			Logger.error("Paypal checkout failure !");
			console.log(error);
			response.header("Content-Type", "application/json");
			response.status(500);
			response.send(JSON.stringify({ message: error, success: false }));
		}
	}
	/**
	 * Complete a paypal order
	 */
	private async postCompleteOrder(
		request: FastifyRequest,
		response: FastifyReply,
	): Promise<void> {
		const twitchUser = await super.twitchUserGuard(request, response);
		if (twitchUser == false) return;

		const token = await this.getToken();
		const body: any = request.body;
		const giftedUserId = body.giftUserId;
		let giftedUser: TwitchUserInfos | null = null;
		let errorMessage = "";

		try {
			const order = await this.getOrderDetails(token, body.orderID);

			const order_data_json = {
				intent: order.intent,
				purchase_units: [
					{
						amount: {
							currency_code: order.purchase_units[0]!.amount.currency_code,
							value: order.purchase_units[0]!.amount.value,
						},
					},
				],
			};

			const url =
				Config.PAYPAL_ENDPOINT +
				"/v2/checkout/orders/" +
				body.orderID +
				"/" +
				order.intent.toLowerCase();
			const orderResult = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(order_data_json),
			})
				.then((res) => res.json() as unknown as PaypalOrderComplete)
				.then((json) => {
					return json;
				});

			if (orderResult.status == "COMPLETED") {
				//Checkout succeed
				const payment =
					orderResult.purchase_units[0]!.payments.captures[0]!
						.seller_receivable_breakdown;
				const params: {
					twitchUID: string;
					twitchLogin: string;
					gifterUID?: string;
					gifterLogin?: string;
					amount: number;
					fees: number;
					payerID: string;
					transactionID: string;
					payerEmail: string;
				} = {
					twitchUID: twitchUser.user_id,
					twitchLogin: twitchUser.login,
					amount: parseFloat(payment.gross_amount.value),
					fees: parseFloat(payment.paypal_fee.value),
					payerID: orderResult.payer.payer_id,
					transactionID: orderResult.purchase_units[0]!.payments.captures[0]!.id,
					payerEmail: orderResult.payer.email_address,
				};

				if (giftedUserId) {
					const result = await TwitchUtils.getUsers(undefined, [giftedUserId]);
					if (result && result.length > 0) {
						giftedUser = result[0]!;
						params.gifterUID = params.twitchUID;
						params.gifterLogin = params.twitchLogin;
						params.twitchUID = giftedUser.id;
						params.twitchLogin = giftedUser.login;
					} else {
						Logger.error("Gifted user not found !");
						response.header("Content-Type", "application/json");
						response.status(404);
						response.send(
							JSON.stringify({
								success: false,
								error: "Gifted user ID #" + giftedUserId + " not found on Twitch",
								errorCode: "GIFTED_USER_NOT_FOUND",
							}),
						);
						return;
					}
				}

				if (Config.credentials.invoice_api_url) {
					//Generate PDF invoice. Failure is non-fatal: the payment already went through.
					try {
						const amount = parseFloat(
							orderResult.purchase_units[0]!.payments.captures[0]!.amount.value,
						);
						const description =
							amount >= Config.lifetimeDonorThreshold
								? "Access to premium features on Twitchat"
								: "Donation to Twitchat";
						await InvoiceUtils.generatePaypalInvoice({
							orderId: orderResult.id,
							date: new Date(),
							twitchLogin: twitchUser.login,
							twitchUID: twitchUser.user_id,
							payerName:
								[
									orderResult.payer?.name?.given_name,
									orderResult.payer?.name?.surname,
								]
									.filter((v) => !!v)
									.join(" ") || twitchUser.login,
							payerEmail: orderResult.payer.email_address,
							payerId: orderResult.payer.payer_id,
							giftedTwitchLogin: giftedUser?.login,
							amount,
							currency:
								orderResult.purchase_units[0]!.payments.captures[0]!.amount
									.currency_code,
							fees: 0,
							quantity: 1,
							unitPrice: amount,
							paymentMethod: "PayPal",
							description: giftedUser?.login
								? description + " (gifted to " + giftedUser?.login + ")"
								: description,
							payerAddressLine1:
								orderResult.purchase_units[0]!.shipping.address.address_line_1,
							payerAddressLine2:
								orderResult.purchase_units[0]!.shipping.address.address_line_2,
							payerPostCode:
								orderResult.purchase_units[0]!.shipping.address.postal_code,
							payerCountryCode:
								orderResult.purchase_units[0]!.shipping.address.country_code,
							payerCity: orderResult.purchase_units[0]!.shipping.address.admin_area_2,
							payerState:
								orderResult.purchase_units[0]!.shipping.address.admin_area_1,
						});
					} catch (error) {
						Logger.error("Failed generating PDF invoice for order " + orderResult.id);
						console.log(error);
					}
				}

				//Add donor to donor list via remote service
				const resRemote = await fetch(Config.DONORS_REMOTE_ENDPOINT + "api/donate", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: Config.credentials.donors_remote_api_secret,
					},
					body: JSON.stringify(params),
				});
				const jsonRemote = (await resRemote.json()) as {
					success: boolean;
					id?: string;
				};
				if (!jsonRemote.success) {
					//Failed adding user to list :(
					Logger.error(
						'Failed adding user "' +
							twitchUser.login +
							'" to remote donor list (' +
							params.amount +
							"€)",
					);
					console.log(params);
					errorMessage =
						"Your payment has been successfully processed but something went wrong when registering you to the donors list. It should be done soon but feel free to ping me at durss@twitchat.fr";
				} else {
					//User properly added to list
					if (params.gifterLogin) {
						Logger.success(
							'User "' +
								params.gifterLogin +
								'" gifted ' +
								params.amount +
								"€ to " +
								params.twitchLogin,
						);
					} else {
						Logger.success(
							'User "' +
								twitchUser.login +
								'" added to donors (' +
								params.amount +
								"€)",
						);
					}
					const donorLevel = Config.donorsLevels.findIndex((v) => v > params.amount) - 1;

					response.header("Content-Type", "application/json");
					response.status(200);
					response.send(
						JSON.stringify({
							success: true,
							data: { orderId: orderResult.id, donorLevel },
						}),
					);
					return;
				}
			}
		} catch (error) {
			Logger.error("Paypal checkout failure !");
			console.log(error);
			response.header("Content-Type", "application/json");
			response.status(500);
			response.send(JSON.stringify({ success: false, error }));
			return;
		}

		response.header("Content-Type", "application/json");
		response.status(200);
		response.send(
			JSON.stringify({
				success: false,
				error: errorMessage || "an unknown error has occured",
			}),
		);
	}

	/**
	 * Get an order details from its ID
	 * @param orderID
	 */
	private async getOrderDetails(token: string, orderID: string): Promise<PaypalOrder> {
		const json = await fetch(Config.PAYPAL_ENDPOINT + "/v2/checkout/orders/" + orderID, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
		})
			.then((res) => res.json() as unknown as PaypalOrder)
			.then((json) => {
				return json;
			});

		return json;
	}

	/**
	 * Get a Paypal credential token
	 */
	private getToken(): Promise<string> {
		const auth = `${Config.credentials.paypal_client_id}:${Config.credentials.paypal_client_secret}`;
		const data = "grant_type=client_credentials";
		return fetch(Config.PAYPAL_ENDPOINT + "/v1/oauth2/token", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Authorization: `Basic ${Buffer.from(auth).toString("base64")}`,
			},
			body: data,
		})
			.then((res) => res.json() as unknown as { access_token: string })
			.then((json) => {
				return json.access_token;
			});
	}

	/**
	 * List the caller's invoices. Returns the minimum needed to render
	 * the profile list (date + amount); the full record is stored in the
	 * sidecar JSON next to each PDF.
	 */
	private async getInvoiceList(request: FastifyRequest, response: FastifyReply): Promise<void> {
		const twitchUser = await super.twitchUserGuard(request, response);
		if (twitchUser == false) return;

		let invoices: { orderId: string; date: string; amount: number; currency: string }[] = [];
		try {
			const remote = await InvoiceUtils.listInvoices(twitchUser.user_id);
			invoices = remote.map((m) => ({
				orderId: m.orderId,
				date: m.date,
				amount: m.amount,
				currency: m.currency,
			}));
		} catch (error) {
			Logger.error("Failed listing invoices for " + twitchUser.user_id);
			console.log(error);
			response
				.header("Content-Type", "application/json")
				.status(502)
				.send(JSON.stringify({ success: false, error: "Invoice service unavailable" }));
			return;
		}

		response.header("Content-Type", "application/json");
		response.status(200);
		response.send(JSON.stringify({ success: true, data: { invoices } }));
	}

	/**
	 * Generate a short-lived JWT authorizing the bearer to download a single
	 * invoice PDF in a new tab (where the Authorization header can't be set).
	 * Token is bound to {uid, orderId} and expires after INVOICE_TOKEN_TTL_MS.
	 */
	private async getInvoiceDownloadToken(
		request: FastifyRequest,
		response: FastifyReply,
	): Promise<void> {
		const twitchUser = await super.twitchUserGuard(request, response);
		if (twitchUser == false) return;

		const orderId = (request.query as { orderId?: string }).orderId;
		if (!orderId || !/^[A-Z0-9]{6,32}$/i.test(orderId)) {
			response
				.header("Content-Type", "application/json")
				.status(400)
				.send(JSON.stringify({ success: false, error: "Invalid order ID" }));
			return;
		}

		const payload: InvoiceDownloadToken = {
			uid: twitchUser.user_id,
			orderId,
			date: Date.now(),
		};
		const token = jwt.sign(payload, Config.credentials.csrf_key);

		response
			.header("Content-Type", "application/json")
			.status(200)
			.send(JSON.stringify({ success: true, token }));
	}

	/**
	 * Stream a previously generated PDF invoice to its owner.
	 * Authentication is done via a short-lived `token` query param (issued by
	 * getInvoiceDownloadToken) so this can be opened in a new tab without an
	 * Authorization header.
	 */
	private async getInvoice(request: FastifyRequest, response: FastifyReply): Promise<void> {
		const query = request.query as { orderId?: string; token?: string };
		const orderId = query.orderId;
		const token = query.token;

		//Reject anything that isn't a plain PayPal order ID to prevent path traversal
		if (!orderId || !/^[A-Z0-9]{6,32}$/i.test(orderId)) {
			response.status(400).send({ success: false, error: "Invalid order ID" });
			return;
		}

		if (!token) {
			response.status(401).send({ success: false, error: "Missing token" });
			return;
		}

		let payload: InvoiceDownloadToken;
		try {
			payload = jwt.verify(token, Config.credentials.csrf_key) as InvoiceDownloadToken;
		} catch {
			response.status(401).send({ success: false, error: "Invalid token" });
			return;
		}

		if (!payload || !payload.uid || !payload.orderId || !payload.date) {
			response.status(401).send({ success: false, error: "Invalid token payload" });
			return;
		}
		if (payload.orderId !== orderId) {
			response.status(403).send({ success: false, error: "Token / order mismatch" });
			return;
		}
		if (Date.now() - payload.date > INVOICE_TOKEN_TTL_MS) {
			response.status(401).send({ success: false, error: "Token expired" });
			return;
		}

		let stream: NodeJS.ReadableStream | null;
		try {
			stream = await InvoiceUtils.fetchInvoicePdf(payload.uid, orderId);
		} catch (error) {
			Logger.error("Failed fetching invoice PDF for " + payload.uid + "/" + orderId);
			console.log(error);
			response.status(502).send({ success: false, error: "Invoice service unavailable" });
			return;
		}
		if (!stream) {
			response.status(404).send({ success: false, error: "Invoice not found" });
			return;
		}

		response.header("Content-Type", "application/pdf");
		response.header(
			"Content-Disposition",
			'attachment; filename="twitchat-invoice-' + orderId + '.pdf"',
		);
		return response.send(stream);
	}

	/**
	 * List the caller's invoices. Returns the minimum needed to render
	 * the profile list (date + amount); the full record is stored in the
	 * sidecar JSON next to each PDF.
	 */
	private async getInvoiceList(request: FastifyRequest, response: FastifyReply): Promise<void> {
		const twitchUser = await super.twitchUserGuard(request, response);
		if (twitchUser == false) return;

		let invoices: {
			orderId: string;
			date: string;
			amount: number;
			currency: string;
		}[] = [];
		try {
			const remote = await InvoiceUtils.listInvoices(twitchUser.user_id);
			invoices = remote.map((m) => ({
				orderId: m.orderId,
				date: m.date,
				amount: m.amount,
				currency: m.currency,
			}));
		} catch (error) {
			Logger.error("Failed listing invoices for " + twitchUser.user_id);
			console.log(error);
			response
				.header("Content-Type", "application/json")
				.status(502)
				.send(
					JSON.stringify({
						success: false,
						error: "Invoice service unavailable",
					}),
				);
			return;
		}

		response.header("Content-Type", "application/json");
		response.status(200);
		response.send(JSON.stringify({ success: true, data: { invoices } }));
	}

	/**
	 * Generate a short-lived JWT authorizing the bearer to download a single
	 * invoice PDF in a new tab (where the Authorization header can't be set).
	 * Token is bound to {uid, orderId} and expires after INVOICE_TOKEN_TTL_MS.
	 */
	private async getInvoiceDownloadToken(
		request: FastifyRequest,
		response: FastifyReply,
	): Promise<void> {
		const twitchUser = await super.twitchUserGuard(request, response);
		if (twitchUser == false) return;

		const orderId = (request.query as { orderId?: string }).orderId;
		if (!orderId || !/^[A-Z0-9]{6,32}$/i.test(orderId)) {
			response
				.header("Content-Type", "application/json")
				.status(400)
				.send(
					JSON.stringify({
						success: false,
						error: "Invalid order ID",
					}),
				);
			return;
		}

		const payload: InvoiceDownloadToken = {
			uid: twitchUser.user_id,
			orderId,
			date: Date.now(),
		};
		const token = jwt.sign(payload, Config.credentials.csrf_key);

		response
			.header("Content-Type", "application/json")
			.status(200)
			.send(JSON.stringify({ success: true, token }));
	}

	/**
	 * Stream a previously generated PDF invoice to its owner.
	 * Authentication is done via a short-lived `token` query param (issued by
	 * getInvoiceDownloadToken) so this can be opened in a new tab without an
	 * Authorization header.
	 */
	private async getInvoice(request: FastifyRequest, response: FastifyReply): Promise<void> {
		const query = request.query as { orderId?: string; token?: string };
		const orderId = query.orderId;
		const token = query.token;

		//Reject anything that isn't a plain PayPal order ID to prevent path traversal
		if (!orderId || !/^[A-Z0-9]{6,32}$/i.test(orderId)) {
			response.status(400).send({ success: false, error: "Invalid order ID" });
			return;
		}

		if (!token) {
			response.status(401).send({ success: false, error: "Missing token" });
			return;
		}

		let payload: InvoiceDownloadToken;
		try {
			payload = jwt.verify(token, Config.credentials.csrf_key) as InvoiceDownloadToken;
		} catch {
			response.status(401).send({ success: false, error: "Invalid token" });
			return;
		}

		if (!payload || !payload.uid || !payload.orderId || !payload.date) {
			response.status(401).send({ success: false, error: "Invalid token payload" });
			return;
		}
		if (payload.orderId !== orderId) {
			response.status(403).send({ success: false, error: "Token / order mismatch" });
			return;
		}
		if (Date.now() - payload.date > INVOICE_TOKEN_TTL_MS) {
			response.status(401).send({ success: false, error: "Token expired" });
			return;
		}

		let stream: NodeJS.ReadableStream | null;
		try {
			stream = await InvoiceUtils.fetchInvoicePdf(payload.uid, orderId);
		} catch (error) {
			Logger.error("Failed fetching invoice PDF for " + payload.uid + "/" + orderId);
			console.log(error);
			response.status(502).send({ success: false, error: "Invoice service unavailable" });
			return;
		}
		if (!stream) {
			response.status(404).send({ success: false, error: "Invoice not found" });
			return;
		}

		response.header("Content-Type", "application/pdf");
		response.header(
			"Content-Disposition",
			'attachment; filename="twitchat-invoice-' + orderId + '.pdf"',
		);
		return response.send(stream);
	}
}

interface PaypalOrder {
	id: string;
	status: string;
	intent: string;
	payment_source: {
		paypal: {
			name: {
				given_name: string;
				surname: string;
			};
			email_address: string;
			account_id: string;
		};
	};
	purchase_units: {
		reference_id: string;
		amount: {
			currency_code: string;
			value: string;
		};
	}[];
	payer: {
		name: {
			given_name: string;
			surname: string;
		};
		email_address: string;
		payer_id: string;
	};
	create_time: string;
	links: {
		href: string;
		rel: string;
		method: string;
	}[];
}

interface PaypalOrderComplete {
	id: string;
	status: string;
	payment_source: {
		paypal: {
			email_address: string;
			account_id: string;
			account_status: string;
			name: {
				given_name: string;
				surname: string;
			};
			address: {
				country_code: string;
			};
		};
	};
	purchase_units: Array<{
		reference_id: string;
		shipping: {
			name: {
				full_name: string;
			};
			address: {
				address_line_1: string;
				address_line_2: string;
				admin_area_2: string;
				admin_area_1: string;
				postal_code: string;
				country_code: string;
			};
		};
		payments: {
			captures: Array<{
				id: string;
				status: string;
				amount: {
					currency_code: string;
					value: string;
				};
				final_capture: boolean;
				seller_protection: {
					status: string;
					dispute_categories: Array<string>;
				};
				seller_receivable_breakdown: {
					gross_amount: {
						currency_code: string;
						value: string;
					};
					paypal_fee: {
						currency_code: string;
						value: string;
					};
					net_amount: {
						currency_code: string;
						value: string;
					};
				};
				links: Array<{
					href: string;
					rel: string;
					method: string;
				}>;
				create_time: string;
				update_time: string;
			}>;
		};
	}>;
	payer: {
		name: {
			given_name: string;
			surname: string;
		};
		email_address: string;
		payer_id: string;
		address: {
			country_code: string;
		};
	};
	links: Array<{
		href: string;
		rel: string;
		method: string;
	}>;
}
