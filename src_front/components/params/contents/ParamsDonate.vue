<template>
	<div class="paramssubscribe parameterContent">
		<Icon name="coin" alt="donate icon" class="icon" />

		<p class="head">{{ $t("donate.header") }}</p>
		
		<header class="card-item" ref="head">
			<Icon name="info" class="icon" />
			<p v-for="i in $tm('donate.infos')" v-html="i"></p>
		</header>

		<div class="paypalFormHolder" v-if="!success">
			<div class="card-item amount primary">
				<span class="label">{{ $t("donate.amount") }}</span>
				<input class="value" type="number" min="1" max="100000" v-model="amount" />€
				<!-- <select class="currency" v-model="currency">
					<option v-for="curr in currencies" :key="curr">{{ curr }}</option>
				</select> -->
			</div>
			<div id="paypal-form-container"></div>
		</div>

		<div class="card-item success" v-else>
			<div class="card-item primary">{{ $t("donate.success", {AMOUNT:amount}) }}</div>
			<DonorBadge class="badge" :level="$store('auth').twitch.user.donor.level" />
			<div>{{ $t("donate.success_details") }}</div>
			<ParamItem  :paramData="param_automaticMessage" v-model="$store('chat').botMessages.twitchatAd.enabled" />
		</div>

		<div class="card-item alert error critical" v-if="criticalError">
			<Icon name="alert" />
			<i18n-t scope="global" keypath="error.paypal_order_failure">
				<template #EMAIL>
					<a :href="'mailto:'+$config.CONTACT_MAIL">{{ $config.CONTACT_MAIL }}</a>
				</template>
			</i18n-t>
		</div>
		<div class="card-item alert error" @click="error = ''" v-if="error && !success"><Icon name="alert" />{{ error }}</div>
		
		<Icon name="loader" class="loader" v-if="loading" />
	</div>
</template>

<script lang="ts">
import DonorBadge from '@/components/user/DonorBadge.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import ApiController from '@/utils/ApiController';
import Config from '@/utils/Config';
import { watch } from 'vue';
import { Component, Vue } from 'vue-facing-decorator';
import ParamItem from '../ParamItem.vue';

@Component({
	components:{
		ParamItem,
		DonorBadge,
	},
	emits:[],
})
export default class ParamsDonate extends Vue {

	public loading:boolean = true;
	public success:boolean = false;
	public criticalError:boolean = false;
	public error:string = "";
	public amount:number = 20;
	public currency:string = "EUR";
	public param_automaticMessage:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:true, labelKey:"donate.automatic_message"};

	private buttons:PAYPAL_BUTTON[] = [];

	public async mounted():Promise<void> {
		this.loadPaypalLibrary();

		watch(()=>this.currency, ()=> {
			this.loadPaypalLibrary();
		});

		watch(()=>this.amount, ()=> {
			if(this.amount < 1) this.amount = 1;
		});
	}

	private async loadPaypalLibrary():Promise<void> {
		this.loading = true;

		if(this.buttons) {
			this.buttons.forEach(v=>v.close());
		}

		//Embed paypal SDK
		const url = "https://www.paypal.com/sdk/js?client-id="+Config.instance.PAYPAL_CLIENT_ID+"&components=buttons&enable-funding=venmo&currency="+this.currency;

		//Unload previous scripts
		const scripts = document.getElementsByTagName("script");
		let existingScript = false;
		for (let i = 0; i < scripts.length; i++) {
			const node = scripts[i];
			if(node.src.indexOf("paypal.com/sdk") > -1) {
				existingScript = true;
			}
		}

		if(!existingScript) {
			const res = await new Promise<boolean>((resolve, reject) => {
				const script = document.createElement('script');
				script.src = url;
				script.onload = () => {
					resolve(true);
				};
				script.onerror = () => {
					resolve(false);
				};
				document.head.appendChild(script);
			});
	
			if(res) {
				this.buildPaypalForm();
			}else{
				this.$store("main").alert(this.$t("error.paypal_sdk_init_failed"))
			}
		}else{
			this.buildPaypalForm();
		}
		this.loading = false;
	}

	private buildPaypalForm():void {
		const FUNDING_SOURCES = [
			paypal.FUNDING.PAYPAL,
			paypal.FUNDING.VENMO,
			paypal.FUNDING.CARD,
		];
		FUNDING_SOURCES.forEach((fundingSource:PAYPAL_FUNDING_VALUES) => {
			const button = paypal.Buttons({
				fundingSource,

				style: {
					layout: 'horizontal',
					shape: 'pill',
					color: (fundingSource == paypal.FUNDING.CARD) ? 'white' : 'white',
					label: "pay"
				},

				/**
				 * Called when user starts a payment session
				 */
				createOrder: async () => {
					this.error = "";
					this.loading = true;
					this.criticalError = false;
					try {
						const res = await ApiController.call("paypal/create_order", "POST", { intent: "capture", amount:this.amount, currency:this.currency });
						this.loading = false;
						if(res.json.success) {
							return res.json.data.orderId;
						}else{
							this.error = res.json.error! || this.$t("error.paypal_create_order_failure");
						}
					} catch (error) {
						console.error(error);
						this.error = this.$t("error.paypal_create_order_failure");
					}
					this.loading = false;
					return "";
				},

				/**
				 * Called when payment has been completed by the user
				 * @param data 
				 * @param actions 
				 */
				onApprove: async (data, actions) => {
					// action.restart()
					this.loading = true;
					const obj:{[key:string]:string} = {};
					type orderKeys = keyof typeof PAYPAL_ORDER;
					for (const key in data) {
						obj[key] = data[key as orderKeys] as string;
					}
					try {
						const orderRes = await ApiController.call("paypal/complete_order", "POST", obj);
						if(orderRes.json.success === true) {
							await this.$store("auth").loadUserState();
							this.$store("auth").twitch.user.donor.state = true;
							//Hide all buttons
							this.buttons.forEach(v=> v.close());
							this.success = true;
						}else{
							if(orderRes.json.errorCode == "INSTRUMENT_DECLINED") {
								//Try again as explained by paypal for such case.
								return actions.restart();
							}else{
								this.error = orderRes.json.error || "";
								this.criticalError = true;
							}
						}
					} catch (error) {
						console.error(error);
						this.criticalError = true;
					}
					this.loading = false;
				},
			});
			button.render("#paypal-form-container");
			this.buttons.push(button);
		})
	}
}
</script>

<style scoped lang="less">
.paramssubscribe{
	header {
		line-height: 1.25em;
		p:first-of-type {
			display: inline;
		}
		.icon {
			height: 1.3em;
			margin-right: .25em;
			vertical-align: middle;
		}
	}

	.paypalFormHolder {
		margin: auto;
		gap: 1em;
		display: flex;
		flex-direction: column;;
		width: 100%;

		.amount {
			font-size: 1.5em;
			display: flex;
			width: fit-content;
			flex-direction: row;
			align-items: center;
			margin: auto;
			.label {
				margin-right: 1em;
				flex-grow: 1;
			}
			.value {
				width: 4em;
				font-weight: bold;
				text-align: right;
			}
		}
	}

	.error {
		&:not(.critical) {
			cursor: pointer;
		}
		.icon {
			height: 1em;
			margin-right: .5em;
			vertical-align: middle;
		}
	}

	.success {
		gap: .5em;
		display: flex;
		align-items: center;
		text-align: center;
		flex-direction: column;
		.primary {
			font-weight: bold;
		}

		.badge {
			margin: 1em 0;
		}
	}

	.loader {
		height: 2em;
	}

	#paypal-form-container {
		width: 100%;
		max-width: 450px;
		margin: auto;
		:deep(div:last-child) {
			background-color: var(--color-light) !important;
			border-radius: 23px;
		}
	}
}
</style>