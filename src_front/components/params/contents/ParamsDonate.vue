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
				<input class="value" type="number" min="1" max="999999" v-model="amount" />€
				<div class="emoji">
					<svg xmlns="http://www.w3.org/2000/svg" width="75mm" height="75mm" viewBox="0 0 212.6 212.6">
						<circle cx="106.3" cy="106.3" r="106.3" style="fill:#ffdd67;" />
						<path class="eyebrow" ref="browR" d="m170.8,48.82c-11.47-9.68-26.66-13.75-41.43-11.1-2.05.4-3.86-7.16-1.36-7.64,17.04-3.06,34.57,1.63,47.81,12.81,1.92,1.66-3.44,7.3-5.01,5.93Z"
							style="fill:#917524; transform-origin:176px 40px" />
						<path class="eyebrow" ref="browL" d="m83.23,37.18c-14.77-2.65-29.96,1.42-41.43,11.1-1.57,1.38-6.92-4.27-5-5.93,13.23-11.17,30.76-15.87,47.81-12.81,2.49.48.68,8.04-1.37,7.64Z"
							style="fill:#917524; transform-origin: 36px 40px;" />
					</svg>
					<div class="eyeLBg" ref="eyeLBg"></div>
					<div class="eyeRBg" ref="eyeRBg"></div>
					<div class="eyeL" ref="eyeL"></div>
					<div class="eyeR" ref="eyeR"></div>
					<div class="mouthBg" ref="mouthBg"></div>
					<div class="mouth" ref="mouth"></div>
					<div class="tongue" ref="tongue"></div>
					<div class="teeth" ref="teeth"></div>
				</div>
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
			if(this.amount > 999999) this.amount = 999999;
			this.updateEmoji();
		});
		this.updateEmoji();
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

	public updateEmoji():void {
		const eyeL = this.$refs.eyeL as SVGPathElement;
		const eyeR = this.$refs.eyeR as SVGPathElement;
		const eyeLBg = this.$refs.eyeLBg as SVGPathElement;
		const eyeRBg = this.$refs.eyeRBg as SVGPathElement;
		const browL = this.$refs.browL as SVGPathElement;
		const browR = this.$refs.browR as SVGPathElement;
		const mouth = this.$refs.mouth as SVGPathElement;
		const mouthBg = this.$refs.mouthBg as SVGPathElement;
		const teeth = this.$refs.teeth as SVGPathElement;
		const tongue = this.$refs.tongue as SVGPathElement;
		
		const amazePercent = this.amount/50;
		mouth.style.borderTopLeftRadius = Math.min(1, amazePercent)+"em";
		mouth.style.borderTopRightRadius = Math.min(1, amazePercent)+"em";
		mouth.style.height = Math.min(3, amazePercent + .1)+"em";
		mouthBg.style.height = Math.min(3, amazePercent + .1)+"em";
		tongue.style.height = Math.min(100, Math.max(0, (amazePercent - 1) * 1.5))+"em";
		if(Math.min(3, amazePercent + .1) < 2) {
			const maskH = (amazePercent-.6)+"em";
			tongue.style.clipPath = "polygon(0% 0, 100% 0, 100% "+maskH+", 0% "+maskH+")";
		}else{
			tongue.style.clipPath = "unset";
		}
		teeth.style.height = Math.min(.6, Math.max(0, amazePercent-.25))+"em";

		eyeLBg.style.transform = "scale("+Math.min(2, amazePercent)+")";
		eyeRBg.style.transform = "scale("+Math.min(2, amazePercent)+")";
		
		const max = -10;
		const min = 18;
		const translateY = Math.min(1, amazePercent) * (max - min) + min;
		const rotate = (Math.min(1, amazePercent) * 15)+"deg";
		browL.style.transform = "translateY("+translateY+"px) rotate(-"+rotate+") scale("+Math.min(1.5, amazePercent*.15+1)+")";
		browR.style.transform = "translateY("+translateY+"px) rotate("+rotate+") scale("+Math.min(1.5, amazePercent*.15+1)+")";
		// browR.style.transform = "translate(-.5em, .75em) rotate(-10deg)";

		let eyeSize = 1;
		if(amazePercent > 1) {
			eyeSize = Math.max(.2, 1-(amazePercent-1))
		}
		eyeL.style.transform = "scale("+eyeSize+")";
		eyeR.style.transform = "scale("+eyeSize+")";

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
			overflow: visible;
			z-index: 101;//Go over paypal buttons
			position: relative;
			.label {
				margin-right: .5em;
				flex-grow: 1;
			}
			.value {
				width: 4em;
				font-weight: bold;
				text-align: right;
			}
			.emoji {
				margin-left: 1em;
				position: relative;

				svg {
					height: 3em;
					width: fit-content;
				}

				.eyeL, .eyeR {
					width: .5em;
					height: .5em;
					background: #664e27;
					border-radius: 50%;
					position: absolute;
					top: 1em;
					left: .75em;
				}
				.eyeR{
					left:auto;
					right: .75em;
				}

				.eyeLBg, .eyeRBg {
					width: 1em;
					height: 1em;
					background: white;
					border-radius: 50%;
					position: absolute;
					top: .75em;
					left: .4em;
					transition: all .2s;
					transform: scale(.8);
					transform-origin: center center;
				}
				.eyeRBg{
					left:auto;
					right: .4em;
				}

				.eyebrow {
					transition: all .2s;
				}

				.mouthBg {
					background-color: #ffdd67;
					// background-color: red;
					border-radius: .5em;
					position: absolute;
					top: 2em;
					left: .95em;
					width: 1.05em;
					height: .85em;
					transition: all .2s;
				}

				.mouth {
					background: #664e27;
					border-radius: 1em;
					position: absolute;
					top: 1.9em;
					left: 1.05em;
					width: .85em;
					height: .85em;
					transition: all .2s;
				}

				.tongue {
					background: #c00;
					border-radius: 1em;
					position: absolute;
					top: 2.5em;
					left: 1.25em;
					width: .5em;
					height: 0em;
					transition: all .2s;
					&::before {
						content: "";
						width: 1px;
						border-left: 1px solid rgba(255, 255, 255, .1);
						border-right: 1px solid rgba(0, 0, 0, .1);
						height: calc(100% - .5em);
						top: .25em;
						left: .22em;
						display: block;
						position: relative;
					}
				}

				.teeth {
					width: .65em;
					height: .6em;
					display: block;
					background-color: white;
					border-radius: 50%;
					top: 2em;
					left: 1.15em;
					position: absolute;
					clip-path: polygon(0% 0%, 100% 0%, 100% 30%, 0% 30%);
					transition: all .2s;
				}
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