import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import AbstractController from "./AbstractController";
import Logger from "../utils/Logger";
import * as fetch from "node-fetch";
import Config from "../utils/Config";

/**
* Created : 17/08/2023 
*/
export default class PaypalController extends AbstractController {

	
	constructor(public server:FastifyInstance) {
		super();
	}

	/********************
	* GETTER / SETTERS *
	********************/
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	public async initialize():Promise<void> {
		this.server.post('/api/paypal/create_order', async (request, response) => await this.postCreateOrder(request, response));
		this.server.post('/api/paypal/complete_order', async (request, response) => await this.postCompleteOrder(request, response));
	}
	
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	/**
	 * Create a paypal order
	 */
	private async postCreateOrder(request:FastifyRequest, response:FastifyReply):Promise<void> {
		const userInfo = await Config.getUserFromToken(request.headers.authorization);
		if(!userInfo) {
			response.header('Content-Type', 'application/json');
			response.status(401);
			response.send(JSON.stringify({message:"Invalid access token", success:false}));
			return;
		}

		const token = await this.getToken();
		const body:any = request.body;

		let amount = body.amount || 20;
		if(amount < 0) amount = 20;
		if(amount < 3) amount = 3;
		let amountStr = amount.toString();
		amountStr = amountStr.replace(/\D,\./gi, "");
		if(amountStr.indexOf(".") == -1) amountStr += ".00";

		let order_data_json = {
			'intent': (body.intent as string).toUpperCase(),
			'purchase_units': [{
				'amount': {
					'currency_code': body.currency,
					'value': amountStr
				}
			}]
		};
		const data = JSON.stringify(order_data_json)

		try {
			const json = await fetch(Config.PAYPAL_ENDPOINT + '/v2/checkout/orders', {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
								'Authorization': `Bearer ${token}`
							},
							body: data
						})
						.then(res => res.json())
						.then(json => {
							return json;
						});
			let errorMessage = "";
			let errorCode = "";
			let success = json.status == "CREATED";
			if(!success) {
				errorMessage = json.details[0].description || "unknown error";
				errorCode = json.details[0].issue;
			}
			response.header('Content-Type', 'application/json');
			response.status(200);
			response.send(JSON.stringify({success, data:{orderId:json.id, json}, error: errorMessage, errorCode}));
		}catch(error) {
			Logger.error("Paypal checkout failure !")
			console.log(error);
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send(JSON.stringify({message:error, success:false}));
		}
	}
	/**
	 * Complete a paypal order
	 */
	private async postCompleteOrder(request:FastifyRequest, response:FastifyReply):Promise<void> {
		const twitchUser = await Config.getUserFromToken(request.headers.authorization);
		if(!twitchUser) {
			response.header('Content-Type', 'application/json');
			response.status(401);
			response.send(JSON.stringify({message:"Invalid access token", success:false}));
			return;
		}
		
		const token = await this.getToken();
		const body:any = request.body;
		let errorMessage = "";

		try {
			const order = await this.getOrderDetails(token, body.orderID);

			let order_data_json = {
				'intent': order.intent,
				'purchase_units': [{
					'amount': {
						'currency_code': order.purchase_units[0].amount.currency_code,
						'value': order.purchase_units[0].amount.value
					}
				}]
			};

			const url = Config.PAYPAL_ENDPOINT + '/v2/checkout/orders/' + body.orderID + '/' + order.intent.toLowerCase();
			const json = await fetch(url, {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
								'Authorization': `Bearer ${token}`
							},
							body: JSON.stringify(order_data_json),
						})
						.then(res => res.json())
						.then(json => {
							return json;
						});

			if(json.status == "COMPLETED") {
				//Checkout succeed
				const payment = json.purchase_units[0].payments.captures[0].seller_receivable_breakdown;
				const params = {
					twitchUID:twitchUser.user_id,
					twitchLogin:twitchUser.login,
					amount:parseFloat(payment.gross_amount.value),
					fees:parseFloat(payment.paypal_fee.value),
					payerID:json.payer.payer_id,
					payerEmail:json.payer.email_address,
				};
				
				//Add donor to donor list via remote service
				const resRemote = await fetch(Config.DONORS_REMOTE_ENDPOINT+"api/donate", {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': Config.credentials.donors_remote_api_secret,
					},
					body: JSON.stringify(params),
				});
				const jsonRemote = await resRemote.json();
				if(!jsonRemote.success) {
					//User properly added to list
					Logger.error("Failed adding user \""+twitchUser.login+"\" to remote donor list ("+params.amount+"€)");
					console.log(params);
					errorMessage = "Your payment has been successfully processed but somehting went wrong when registering you to the donors list. It should be done soon but feel free to ping me @durss on Twitch"
				}else{
					//Failed adding user to list :(
					Logger.success("User \""+twitchUser.login+"\" added to donors ("+params.amount+"€)");
						
					response.header('Content-Type', 'application/json');
					response.status(200);
					response.send(JSON.stringify({success:true, data:{orderId:json.id, json}}));
					return;
				}
			}
		}catch(error) {
			Logger.error("Paypal checkout failure !")
			console.log(error);
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send(JSON.stringify({message:error, success:false}));
			return;
		}
		
						
		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:false, error:errorMessage || "an unknown error has occured"}));
	}

	/**
	 * Get an order details from its ID
	 * @param orderID 
	 */
	private async getOrderDetails(token:string, orderID:string):Promise<PaypalOrder> {
		const json = await fetch(Config.PAYPAL_ENDPOINT + '/v2/checkout/orders/' + orderID, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`
				},
			})
			.then(res => res.json())
			.then(json => {
				return json;
			});

		return json
	}

	/**
	 * Get a Paypal credential token
	 */
	private getToken():Promise<string> {
		const auth = `${Config.credentials.paypal_client_id}:${Config.credentials.paypal_client_secret}`
		const data = 'grant_type=client_credentials'
		return fetch(Config.PAYPAL_ENDPOINT + '/v1/oauth2/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Authorization': `Basic ${Buffer.from(auth).toString('base64')}`
			},
			body: data
		})
		.then(res => res.json())
		.then(json => {
			return json.access_token;
		})
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
			}
			email_address: string;
			account_id: string;
		}
	}
	purchase_units: {
		reference_id: string;
		amount: {
			currency_code: string;
			value: string;
		}
	}[]
	payer: {
		name: {
			given_name: string;
			surname: string;
		}
		email_address: string;
		payer_id: string;
	}
	create_time: string;
	links: {
		href: string;
		rel: string;
		method: string;
	}[]
}
