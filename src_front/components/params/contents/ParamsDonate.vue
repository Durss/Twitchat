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
					<svg class="heart" ref="heart" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
					x="0px" y="0px" viewBox="0 0 208.6 202.5" v-for="index in 3">
						<defs>
							<linearGradient id="heart-shape-gradient" x2="0.35" y2=".8">
								<stop offset="0%" stop-color="var(--heart-color-stop)" />
								<stop offset="30%" stop-color="var(--heart-color-stop)" />
								<stop offset="100%" stop-color="var(--heart-color-bot)" />
							</linearGradient>
						</defs>
						<path d="M151.6,0c-19.6,0-37,9.9-47.2,25C94,9.9,76.7,0,57.1,0C25.6,0,0,25.6,0,57.1c0,44.2,96.1,145.4,104.3,145.4S208.6,101.2,208.6,57.1C208.6,25.6,183.1,0,151.6,0z"/>
					</svg>

					<div class="flares" ref="flares">
						<svg class="flare big" xmlns="http://www.w3.org/2000/svg" width="581.3px" height="572.5px" viewBox="0 0 581.34 572.51">
							<polygon style="fill:#f15a24;" points="290.67 0 353.72 121.93 480.39 69.05 450.32 202.99 581.34 243.9 472.21 327.17 546.28 442.73 409.16 436.37 391.62 572.51 290.67 479.5 189.72 572.51 172.18 436.37 35.06 442.73 109.13 327.17 0 243.9 131.03 202.99 100.95 69.05 227.62 121.93 290.67 0" />
						</svg>
						<svg class="flare" xmlns="http://www.w3.org/2000/svg" width="788.4px" height="776.4px" viewBox="0 0 788.41 776.43">
							<polygon style="fill:#efac26;" points="394.2 0 479.71 165.36 651.5 93.65 610.71 275.28 788.41 330.78 640.41 443.7 740.86 600.43 554.9 591.8 531.11 776.43 394.2 650.28 257.3 776.43 233.51 591.8 47.55 600.43 148 443.7 0 330.78 177.7 275.28 136.91 93.65 308.7 165.36 394.2 0" />
						</svg>
					</div>

					<svg class="cloud" ref="cloud" xmlns="http://www.w3.org/2000/svg" width="288.8px" height="225.3px" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 288.8 225.33">
					<defs>
						<linearGradient id="b" x1="-471.42" y1="738.94" x2="-469.92" y2="738.94"
							gradientTransform="translate(-12608.79 8341.51) rotate(90) scale(17.26 -17.26)"
							gradientUnits="userSpaceOnUse">
							<stop offset="0" stop-color="#78c0e8" />
							<stop offset="1" stop-color="#31a0d6" />
						</linearGradient>
					</defs>
					<rect x="84.5" y="150.66" width="115.53" height="74.62" style="fill:url(#b);" />
					<path
						d="m272.63,100.77c31.35,19.04,10.04,65.78-24.33,57.6-7.32-.78-5.49-1.62-8.95,4.67-8.78,19.81-45.58,27.05-62.28,14.79-7.52-5.06-6.49-7.57-15.37-2.72-31.12,19.82-85.2,12.66-103.93-17.52C12.74,182.73-24.99,114.93,20.79,92.21.68,51.36,42.53,15.76,81.9,29.93c14.88-38.71,76.36-40.01,94.19-3.11,60.89-30.38,104.76,15.04,96.53,73.95Z"
						style="fill:#d2edf7;" />
					<path
						d="m15.44,73.24c-.91-18.08,10.05-34.02,24.43-40.97-24.37,15.15-5.32,43.53-.77,61.3-11.11,12.67-22.75-2.26-23.66-20.34Z"
						style="fill:#92cbeb;" />
					<path
						d="m286.64,138.14c-9.3,29.45-41.95,20.1-47.49,24.9-14.93,36.84-72.93,16.13-77.84,12.26-31.15,20.43-84.5,11.54-103.93-17.32-16.14,11.6-52.01,3.83-55.71-23.49,12.5,12.89,30.17,20.16,50.65,14.54-3.04-7.59-6.01-21.52-1.95-30.36,6.72,41.51,60.67,70.28,94.2,37.36,14.54-20.57,37.31-72.6,67.14-40.67,6.04,11.39-9.48,18.97-19.66,16.93-90.04,15.68,56.15,93.76,51.38-13.62,8.83,10.19,2.22,24.32,10.51,30.75,19.11,4.67,36.39-23.8,28.88-39.24,6.61,6.73,7.52,19.69,3.82,27.95Z"
						style="fill:#78c0e8;" />
					<path d="m155.16,5.91c41.47,19.32,20.46,75.07-1.77,46.18,7.16-11.32,13.53-33.74,1.77-46.18Z"
						style="fill:#92cbeb;" />
					<path
						d="m264.92,87.91c-2.27,6.64-15.71,13.74-22.97,6.42,3.92-15.18,31.51-34.82,16.35-55.47,10.97,14.03,13.09,32.66,6.62,49.04Z"
						style="fill:#92cbeb;" />
					<path d="m165.59,225.33h-17.9c-5.81-44.96,23.74-44.81,17.9,0Z" style="fill:#039be5;" />
					<path d="m129.78,225.33h-10.9c-4.44-58.17,15.37-57.85,10.9,0Z" style="fill:#039be5;" />
				</svg>

					<svg xmlns="http://www.w3.org/2000/svg" width="212px" height="212px" viewBox="0 0 212.6 212.6">
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
import Utils from '@/utils/Utils';

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

		//Debug to automatically increment amount
		/*
		this.amount = 1
		setTimeout(async() => {
			let i = 2;
			for (; i <= 20; i++) {
				this.amount = i;
				await Utils.promisedTimeout(70);
			}
			i--;
			for (; i <= 300; i+=10) {
				this.amount = i;
				await Utils.promisedTimeout(70);
			}
			for (; i <= 1000; i+=100) {
				this.amount = i;
				await Utils.promisedTimeout(70);
			}
			this.amount = 1000;
		}, 2000);
		//*/
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
		const heart = this.$refs.heart as SVGPathElement[];
		const cloud = this.$refs.cloud as SVGPathElement;
		const flares = this.$refs.flares as SVGPathElement;
		
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

		let eyeSize = 1;
		if(amazePercent > 1) {
			eyeSize = Math.max(.2, 1-(amazePercent-1))
		}
		eyeL.style.transform = "scale("+eyeSize+")";
		eyeR.style.transform = "scale("+eyeSize+")";
		
		if(this.amount >= 50) {
			let heartScale = Math.min(.9, (this.amount - 50) / 100) + .25;
			let heartScale2 = this.amount >= 100? Math.min(.4, (this.amount - 100) / 100) + .4 : 0;
			if(this.amount >= 200) {
				heartScale = 0;
				heartScale2 = 0;
			}
			heart[0].style.transform = "translate(0.5em, .2em) scale("+heartScale2+") rotate(40deg)";
			heart[1].style.transform = "translate(-0.5em, .2em) scale("+heartScale2+") rotate(-40deg)";
			heart[2].style.transform = "scale("+heartScale+")";
		}else{
			heart.forEach(v => v.style.transform = "scale(0)");
		}

		if(this.amount >= 200) {
			const cloudScale = Math.min(1, (this.amount - 200) / 100) + .5;
			cloud.style.transform = "scale("+cloudScale+")";
			const flaresScale = Math.min(1, (this.amount - 200) / 200) + .5;
			flares.style.transform = "scale("+flaresScale+")";
		}else{
			flares.style.transform = "scale(0)";
			cloud.style.transform = "scale(0)";
		}
	}
}
</script>

<style scoped lang="less">
.paramssubscribe{
	header {
		line-height: 1.25em;
		margin-bottom: 10em;
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
					overflow: visible;
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

				#heart-shape-gradient {
					--heart-color-bot: var(--color-alert-dark);
					--heart-color-stop: var(--color-alert-light);
				}

				.heart {
					position: absolute;
					fill: url(#heart-shape-gradient);
					z-index: -1;
					right: .5em;
					bottom: 95%;
					width: 2em;
					height: 2em;
					transition: all .2s;
					transform-origin: bottom center;
					&:nth-of-type(1), &:nth-of-type(2) {
						filter: brightness(.75);
					}
				}

				.cloud {
					position: absolute;
					left: -.4em;
					bottom: 90%;
					z-index: -1;
					transition: all .2s;
					transform-origin: bottom center;
				}

				.flares {
					position: absolute;
					z-index: -2;
					transition: all .2s;
					width: 100%;
					height: 100%;
					.flare {
						position: absolute;
						transition: all .2s;
						animation: rotate 2s infinite linear;
						transform-origin: center;
						// transform-origin: 1.5em 1.5em;
						// transform-origin: 394px 388px;
						// left: 1em;
						@keyframes rotate {
							0% {
								transform: rotate(0deg) scale(1);
							}
							50% {
								transform: rotate(180deg) scale(1.5);
							}
							100% {
								transform: rotate(360deg) scale(1);
							}
						}
						&.big {
							animation-duration: 3s;
							width: 120%;
							height: 120%;
							left: -10%;
							top: -10%;
						}
					}
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