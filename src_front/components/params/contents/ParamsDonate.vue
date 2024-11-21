<template>
	<div class="paramsdonate parameterContent">
		<Icon name="coin" alt="donate icon" class="icon" />

		<p class="head">{{ $t("donate.header") }}</p>
		
		<div class="card-item info">
			<Icon name="info" class="icon" />
			<p v-for="i in $tm('donate.infos')" v-html="i"></p>
		</div>

		<div class="paypalFormHolder" v-if="!success">
			<div class="amount">
				<div :class="formClasses">
					<div class="form">
						<span class="label">{{ $t("donate.amount") }}</span>
						<input class="value" type="number" min="3" max="999999" v-model="amount" /><span class="currency">€</span>
					</div>
					<i18n-t scope="global" tag="div" class="taxes" keypath="donate.ttc">
						<template #AMOUNT>
							<strong>{{ taxedAmount }}</strong>
						</template>
					</i18n-t>
					
					<div class="giftHolder">
						<TTButton v-if="!giftForm" @click="giftForm = true" light :premium="premium" :secondary="!premium">{{ $t("donate.gift_bt") }}</TTButton>
						<template v-else>
							<div class="gifed" v-if="giftedUser">
								<a :href="'https://twitch.tv/'+giftedUser.login" class="user" target="_blank">
									<span class="giftIcon">🎁</span>
									<img :src="giftedUser.profile_image_url" alt="avatar">
									<div class="login">{{ giftedUser.display_name }}</div>
									<Icon name="newtab" />
									<TTButton icon="cross" alert noBounce @click.capture.prevent="giftedUser = null"></TTButton>
								</a>
							</div>
							<SearchUserForm v-else v-model="giftedUser" @close="giftForm = false; giftedUser = null;"></SearchUserForm>
						</template>
					</div>
				</div>

				<div :class="premium? 'premiumLabel premium' : 'premiumLabel'" ref="premiumLabel"><Icon name="premium" theme="light" />{{ $t("donate.lifetime_premium") }}</div>
				
				<div :class="premium? 'emoji premium' : 'emoji'">
					<div class="subHolder">
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
							<svg class="flare big" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 842.71 842.71">
								<polygon style="fill:#f15a24;" points="421.36 18.94 506.86 184.3 678.65 112.58 637.87 294.23 815.55 349.71 667.56 462.64 768.01 619.36 582.05 610.73 558.26 795.36 421.36 669.22 284.45 795.36 260.66 610.73 74.71 619.36 175.16 462.64 27.16 349.71 204.86 294.23 164.06 112.58 335.85 184.3 421.36 18.94"/>
								<path class="evil" d="m815.15,556.35l-239.39-178.88c36.59-112.96,93.36-288.63,93.36-288.63l-245.37,178.29c-97.8-71.01-244.43-177.53-244.43-177.53,0,0,65.52,205.34,91.74,286.03l.63,1.94L27.16,555.25l302.59.95,92.11,283.51s68.95-200.69,95.25-281.63l.55-1.7c82.92-.02,297.49-.02,297.49-.02h.01Zm-254.21-318.26l-33.81,104.1c-15.62-11.34-34.33-24.91-54.75-39.73l88.55-64.36h.01Zm-189.58,261.03l-32.42-99.74,84.75-61.59,84.85,61.63-32.38,99.69h-104.8Zm-84.87-260.98l88.56,64.33-54.71,39.75c-9.15-28.02-23.38-71.82-33.85-104.08Zm-84.9,261.06l88.69-64.45,20.91,64.36c-29.23.07-74.86.09-109.6.09h0Zm222.18,161.17l-33.79-103.94c19.96-.01,42.94-.03,67.5-.04-7.95,24.68-22.83,70.5-33.72,103.97h.01Zm112.43-161.24c2.19-6.47,4.31-12.98,6.36-19.31l1.35-4.17c4.02-12.37,8.5-26.18,13.3-40.97l88.69,64.44h-109.7,0Z"/>
							</svg>
							<svg class="flare" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 842.71 842.71">
								<polygon style="fill:#efac26;" points="421.35 18.94 506.86 184.3 678.65 112.59 637.86 294.22 815.56 349.72 667.56 462.64 768.01 619.36 582.05 610.73 558.26 795.36 421.35 669.21 284.45 795.36 260.66 610.73 74.71 619.36 175.16 462.64 27.16 349.72 204.85 294.22 164.07 112.59 335.85 184.3 421.35 18.94"/>
								<path class="evil" d="m421.36,0C188.65,0,0,188.65,0,421.36s188.65,421.36,421.36,421.36,421.36-188.65,421.36-421.36S654.07,0,421.36,0Zm0,792.01c-204.7,0-370.65-165.95-370.65-370.65S216.65,50.71,421.36,50.71s370.65,165.95,370.65,370.65-165.95,370.65-370.65,370.65Z"/>
							</svg>
						</div>
						
						<svg class="cloud" ref="cloud" xmlns="http://www.w3.org/2000/svg" width="288.7649px" height="283.098px"
							xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 288.76 283.1">
							<defs>
								<linearGradient id="cloud_1" x1="-1139.07" y1="259.81" x2="-1136.43" y2="259.81"
									gradientTransform="translate(4626.03 19904.87) rotate(90) scale(17.26)" gradientUnits="userSpaceOnUse">
									<stop offset="0" stop-color="#78c0e8" />
									<stop offset="1" stop-color="#31a0d6" />
								</linearGradient>
								<radialGradient id="cloud_2" cx="141.54" cy="203.77" fx="141.54" fy="203.77" r="93.07"
									gradientTransform="translate(0 148.58) scale(1 .27)" gradientUnits="userSpaceOnUse">
									<stop offset=".78" stop-color="#78c0e8" />
									<stop offset="1" stop-color="#31a0d6" />
								</radialGradient>
							</defs>
							<path d="m84.49,151.8h115.51c-16.46,48.97-24.29,95.6,0,131.3h-115.51c23.32-33.53,15.46-80.75,0-131.3Z"
								style="fill:url(#cloud_1);" />
							<path
								d="m272.6,100.76c31.35,19.04,10.04,65.77-24.33,57.59-7.32-.78-5.49-1.62-8.95,4.67-8.78,19.81-45.57,27.05-62.27,14.79-7.52-5.06-6.49-7.57-15.37-2.72-31.12,19.82-85.19,12.66-103.92-17.52C12.74,182.71-24.98,114.92,20.79,92.2.68,51.36,42.53,15.76,81.89,29.93c14.88-38.7,76.35-40,94.18-3.11,60.88-30.38,104.75,15.04,96.52,73.94h.01Z"
								style="fill:#d2edf7;" />
							<path
								d="m15.44,73.23c-.91-18.08,10.05-34.02,24.43-40.96-24.37,15.15-5.32,43.52-.77,61.29-11.11,12.67-22.75-2.26-23.66-20.34h0Z"
								style="fill:#92cbeb;" />
							<path
								d="m286.6,138.12c-9.3,29.45-41.94,20.1-47.48,24.9-14.93,36.84-72.92,16.13-77.83,12.26-31.15,20.43-84.49,11.54-103.92-17.32-16.14,11.6-52,3.83-55.7-23.49,12.5,12.89,30.17,20.16,50.64,14.54-3.04-7.59-6.01-21.52-1.95-30.36,6.72,41.5,60.66,70.27,94.19,37.36,14.54-20.57,37.31-72.59,67.13-40.66,6.04,11.39-9.48,18.97-19.66,16.93-90.03,15.68,56.14,93.75,51.37-13.62,8.83,10.19,2.22,24.32,10.51,30.75,19.11,4.67,36.39-23.8,28.88-39.23,6.61,6.73,7.52,19.69,3.82,27.95h0Z"
								style="fill:#78c0e8;" />
							<path d="m155.14,5.91c41.46,19.32,20.46,75.06-1.77,46.17,7.16-11.32,13.53-33.74,1.77-46.17Z"
								style="fill:#92cbeb;" />
							<path
								d="m264.89,87.9c-2.27,6.64-15.71,13.74-22.97,6.42,3.92-15.18,31.51-34.82,16.35-55.46,10.97,14.03,13.09,32.66,6.62,49.03h0Z"
								style="fill:#92cbeb;" />
							<path d="m165.57,282h-17.9c-5.81-44.95,23.74-44.8,17.9,0Z" style="fill:#039be5;" />
							<path d="m129.76,282h-10.9c-4.44-58.16,15.37-57.84,10.9,0Z" style="fill:#039be5;" />
							<path
								d="m190.28,185.23c-.43,1.81-.83,3.61-1.22,5.4,21.17,2.97,35.52,7.86,35.52,13.39,0,9.06-38.43,13.57-82.33,13.57s-82.33-4.51-82.33-13.57c0-5.47,14-10.3,34.74-13.29-.37-1.8-.75-3.6-1.15-5.41-28.74,4.16-48.04,11.89-48.04,20.74,0,13.25,43.33,26.83,96.79,26.83s96.79-13.58,96.79-26.83c0-8.92-19.63-16.7-48.76-20.84Z"
								style="fill:url(#cloud_2);" />
						</svg>

						<div class="question" ref="question">
							<span>?</span>
							<span>?</span>
							<span>?</span>
						</div>

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

						<div class="dirtyEyes" ref="dirtyEyes">
							<span>🍑</span>
							<span>🍑</span>
						</div>

						<div class="easterEgg" ref="easterEgg">{{ $t("donate.dare") }}</div>
					</div>
				</div>
			</div>

			<div id="paypal-form-container"></div>
		</div>

		<div class="card-item success" v-else>
			<div class="card-item primary">{{ $t("donate.success", {AMOUNT:amount}) }}</div>
			<DonorBadge class="badge" :level="$store.auth.donorLevel > -1" />
			<div>{{ $t("donate.success_details") }}</div>
			<ParamItem  :paramData="param_automaticMessage" v-model="$store.chat.botMessages.twitchatAd.enabled" />
		</div>

		<div class="card-item alert error critical" v-if="paypalError"><Icon name=alert />{{ $t("donate.paypal_error") }}</div>

		<div class="card-item alert error critical" v-if="criticalError">
			<Icon name="alert" />
			<i18n-t scope="global" keypath="error.paypal.paypal_order_failure">
				<template #EMAIL>
					<a :href="'mailto:'+$config.CONTACT_MAIL">{{ $config.CONTACT_MAIL }}</a>
				</template>
			</i18n-t>
		</div>
		<div class="card-item alert error" @click="error = ''" v-if="error && !success"><Icon name="alert" />{{ error }}</div>
		
		<Icon name="loader" class="loader" v-if="loading" />
		
		<SponsorTable />

		<div class="card-item">
			<div class="donorsTitle">{{ $t('donate.donors') }}</div>
			<ParamsDonorList />
		</div>

		<div class="footer">
			<a :href="$router.resolve({name:'privacypolicy'}).href" target="_blank">{{ $t("global.privacy") }}</a>
			<a :href="$router.resolve({name:'termsofuse'}).href" target="_blank">{{ $t("global.terms") }}</a>
			<a :href="'mailto:'+$config.CONTACT_MAIL">{{ $t("global.contact", {MAIL:$config.CONTACT_MAIL}) }}</a>
		</div>
	</div>
</template>

<script lang="ts">
import ToggleBlock from '@/components/ToggleBlock.vue';
import SponsorTable from '@/components/premium/SponsorTable.vue';
import DonorBadge from '@/components/user/DonorBadge.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import ApiHelper from '@/utils/ApiHelper';
import Config from '@/utils/Config';
import { watch } from 'vue';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import ParamItem from '../ParamItem.vue';
import ParamsDonorList from './ParamsDonorList.vue';
import SearchUserForm from '@/components/params/contents/donate/SearchUserForm.vue'
import { TTButton } from '@/components/TTButton.vue';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';

@Component({
	components:{
		TTButton,
		ParamItem,
		DonorBadge,
		ToggleBlock,
		SponsorTable,
		SearchUserForm,
		ParamsDonorList,
	},
	emits:[],
})
class ParamsDonate extends Vue {

	public loading:boolean = true;
	public premium:boolean = false;
	public giftedUser:TwitchDataTypes.UserInfo|null = null;
	public giftForm:boolean = false;
	public paypalError:boolean = false;
	public success:boolean = false;
	public criticalError:boolean = false;
	public error:string = "";
	public amount:number = 20;
	public currency:string = "EUR";
	public param_automaticMessage:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:true, labelKey:"donate.automatic_message"};

	private buttons:PAYPAL_BUTTON[] = [];

	public get formClasses():string[] {
		const res = ["card-item", "amountHolder", "secondary"];
		if(this.premium) res.push("premium")
		return res;
	}

	public get taxedAmount():string {
		let taxes = .98;
		//Paypal taxes
		if(this.amount < 90) taxes = .967;
		if(this.amount <= 20) taxes = .954;
		if(this.amount <= 10) taxes = .936;
		if(this.amount <= 5) taxes = .85;
		if(this.amount <= 2) taxes = .6;
		//France taxes
		taxes *= .77;
		return (this.amount * taxes).toFixed(1);
	}

	public async mounted():Promise<void> {
		this.loadPaypalLibrary();

		if(this.$store.params.currentPageSubContent == TwitchatDataTypes.ParamDeepSections.PREMIUM) {
			this.amount = this.$config.LIFETIME_DONOR_VALUE;
		}

		watch(()=>this.currency, ()=> {
			this.loadPaypalLibrary();
		});

		watch(()=>this.amount, ()=> this.updateEmoji() );
		this.updateEmoji();
	}

	private async loadPaypalLibrary():Promise<void> {
		this.loading = true;

		if(this.buttons) {
			this.buttons.forEach(v=>v.close());
		}

		//Embed paypal SDK
		const url = "https://www.paypal.com/sdk/js?client-id="+Config.instance.PAYPAL_CLIENT_ID+"&commit=true&components=buttons&enable-funding=venmo&currency="+this.currency;
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
				this.paypalError = true;
				this.$store.common.alert(this.$t("error.paypal.paypal_sdk_init_failed"))
			}
		}else{
			this.buildPaypalForm();
		}
		this.loading = false;

		//Debug to automatically increment amount
		/*
		this.amount = 1
		window.setTimeout(async() => {
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
						const res = await ApiHelper.call("paypal/create_order", "POST", { intent: "capture", amount:this.amount, currency:this.currency });
						this.loading = false;
						if(res.json.success) {
							return res.json.data.orderId;
						}else{
							this.error = res.json.error! || this.$t("error.paypal.paypal_create_order_failure");
						}
					} catch (error) {
						console.error(error);
						this.error = this.$t("error.paypal.paypal_create_order_failure");
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
					//Dafuq is that?
					//Seems pretty useless but being tired right now, and this being
					//quite a sensitive stuff, I prefer not to remove it yet.
					//But it seems like i could drop this and simply send "data" on
					//the endpoint.
					const body:Partial<typeof PAYPAL_ORDER> = {};
					type orderKeys = keyof typeof PAYPAL_ORDER;
					for (const key in data) {
						body[key as keyof typeof PAYPAL_ORDER] = data[key as orderKeys] as string;
					}
					try {
						if(this.giftedUser) body.giftUserId = this.giftedUser.id;
						const orderRes = await ApiHelper.call("paypal/complete_order", "POST", body);
						if(orderRes.json.success === true) {
							await this.$store.auth.loadUserState(this.$store.auth.twitch.user.id);
							this.$store.auth.donorLevel = orderRes.json.data.donorLevel || 0;
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
		if(this.amount < 3) this.amount = 3;
		if(this.amount > 999999) this.amount = 999999;
		this.premium = this.amount >= this.$config.LIFETIME_DONOR_VALUE;

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
		const question = this.$refs.question as SVGPathElement;
		const dirtyEyes = this.$refs.dirtyEyes as SVGPathElement;
		const easterEgg = this.$refs.easterEgg as SVGPathElement;
		
		const amazePercent = this.amount/50;
		mouth.style.borderTopLeftRadius = Math.min(1, amazePercent)+"em";
		mouth.style.borderTopRightRadius = Math.min(1, amazePercent)+"em";
		mouth.style.height = Math.min(3, amazePercent + .1)+"em";
		mouthBg.style.height = Math.min(3, amazePercent + .1)+"em";
		tongue.style.height = Math.min(100, Math.max(0, (amazePercent - 1) * 1.5))+"em";
		easterEgg.style.top = Math.min(100, Math.max(0, (amazePercent - 1) * 1.5))+"em";
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

		if(this.amount == 42) {
			question.style.transform = "scale(1)";
		}else{
			question.style.transform = "scale(0)";
		}

		if(this.amount == 69) {
			dirtyEyes.style.transform = "scale(1)";
		}else{
			dirtyEyes.style.transform = "scale(0)";
		}

		if(this.amount == 420) {
			eyeLBg.classList.add("red");
			eyeRBg.classList.add("red");
		}else{
			eyeLBg.classList.remove("red");
			eyeRBg.classList.remove("red");
		}

		if(this.amount == 666) {
			eyeL.classList.add("evil");
			eyeR.classList.add("evil");
			eyeLBg.classList.add("evil");
			eyeRBg.classList.add("evil");
			flares.classList.add("evil");
			cloud.classList.add("evil");
			eyeL.style.transform = "scale(.75)";
			eyeR.style.transform = "scale(.75)";
			eyeLBg.style.transform = "scale(1.25)";
			eyeRBg.style.transform = "scale(1.25)";
			browL.style.transform = "translateY(-25px) rotate(45deg) scale(1.5)";
			browR.style.transform = "translateY(-25px) rotate(-45deg) scale(1.5)";
			mouth.style.borderTopLeftRadius = "1em";
			mouth.style.borderTopRightRadius = "1em";
			mouth.style.height = "1em";
			teeth.style.height = "0";
			tongue.style.height = "0";
			mouthBg.style.height = "1em";
		}else if(eyeL.classList.contains("evil")){
			eyeL.classList.remove("evil");
			eyeR.classList.remove("evil");
			eyeL.classList.remove("evil");
			eyeR.classList.remove("evil");
			eyeLBg.classList.remove("evil");
			eyeRBg.classList.remove("evil");
			flares.classList.remove("evil");
			cloud.classList.remove("evil");
		}
		if(this.amount >= 1000) {
			easterEgg.style.display = "block";
		}else{
			easterEgg.style.display = "none";
		}

		const premiumLabel = this.$refs.premiumLabel as HTMLDivElement;
		premiumLabel.style.transform = "translate(.0, .75em) scaleY("+(this.premium? 1 : 0)+")"
	}
}
export default toNative(ParamsDonate);
</script>

<style scoped lang="less">
.paramsdonate{
	.info {
		margin: auto;
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
		flex-direction: column;
		width: 100%;

		.amount {
			font-size: 1.5em;
			display: flex;
			width: fit-content;
			flex-direction: row;
			align-items: center;
			margin: .5em auto;
			overflow: visible;
			z-index: 103;//Go over paypal buttons
			position: relative;
			.amountHolder {
				gap: .25em;
				display: flex;
				flex-direction: column;
				padding-right: 3em;
				margin-right: -3em;
				transition: background-color .5s;
				overflow: visible;
				// align-items: flex-end;
				.form {
					display: flex;
					flex-direction: row;
					align-items: center;
					.currency {
						font-weight: bold;
					}
					.label {
						margin-right: .5em;
						flex-grow: 1;
					}
				}
				.value {
					width: 4em;
					font-weight: bold;
					text-align: right;
				}
	
				.taxes {
					padding: .25em .5em;
					font-size: .6em;
					text-align: center;
					font-style: italic;
					z-index: 1;
					// transform: translateX(-50%);
					border-radius: var(--border-radius);
					background-color: var(--color-dark-fadest);
				}
				.giftHolder {
					display: flex;
					flex-direction: column;
					z-index: 2;
					font-size: 1rem;

					.gifed {
						background-color: var(--color-light);
						padding: .25em;
						border-radius: var(--border-radius);
						overflow: hidden;
						.user {
							color: var(--color-text-inverse);
							font-weight: normal;
							text-decoration: none;
							.icon {
								height: 1em;
							}
						}
						&:hover {
							.login {
								text-decoration: underline;
							}
						}
						.giftIcon {
							font-size: 1.5em;
						}
						.button {
							position: relative;
							margin: -.25em;
							border-radius: 0;
							align-self: stretch;
						}
						.user {
							gap: .5em;
							display: flex;
							flex-direction: row;
							align-items: center;
							.login {
								text-overflow: ellipsis;
								overflow: hidden;
								flex-grow: 1;
								color: #000;
							}
							img {
								height: 2em;
								border-radius: 50%;
							}
						}
					}
				}
			}
			.premiumLabel {
				position: absolute;
				bottom: 0;
				transform-origin: center .5em;
				left: 0;
				text-align: center;
				border-radius: 1em;
				border-top-left-radius: 0;
				padding: .5em;
				font-size: .65em;
				white-space: nowrap;
				width: fit-content;
				transform: scale(0);
				transition: transform .25s, background-color .5s;
				background-color: var(--color-secondary);
				&.premium {
					background-color: var(--color-premium);
				}
				.icon {
					height: 1em;
					margin-right: .5em;
					vertical-align: middle;
				}
			}
		}
		.emoji {
			font-size: 1.5em;
			// right: -2em;
			background-color: var(--color-secondary);
			border-radius: 50%;
			// position: absolute;
			width: 4em;
			height: 4em;
			padding: .5em;
			z-index: 102;
			pointer-events: none;
			transition: background-color .5s;
			&.premium {
				background-color: var(--color-premium);
			}
			.subHolder {
				z-index: 1;
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
					&.evil {
						background-color: #ff0000;
					}
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
					background-size: 150% 100%;
					&.eyeRBg {
						background-position: 100%;
					}
					&.red {
						background: radial-gradient(circle, rgb(255, 216, 216) 30%, rgba(252,70,107,1) 100%);
						background-size: 150% 100%;
						background-position: 100%;
					}
					&.eyeLBg.red {
						background-position: 0;
					}
					&.evil {
						background-color: #000;
					}
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
					transform: scale(0);
					&:nth-of-type(1), &:nth-of-type(2) {
						filter: brightness(.75);
					}
				}

				.cloud {
					position: absolute;
					left: 0em;
					bottom: 90%;
					z-index: -1;
					transition: all .2s;
					transform: scale(0);
					transform-origin: bottom center;
					&.evil {
						filter: brightness(0.6) contrast(400%) hue-rotate(151deg);
					}
				}

				.flares {
					position: absolute;
					z-index: -2;
					transition: all .2s;
					width: 100%;
					height: 100%;
					transform: scale(0);
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
						* {
							transition: all .2s;
						}
						&.big {
							animation-duration: 3s;
							width: 120%;
							height: 120%;
							left: -10%;
							top: -10%;
						}
						.evil {
							opacity:0;
						}
					}
					&.evil {
						animation: none;
						.flare {
							*:not(.evil) {
								opacity:0;
							}
							.evil {
								opacity:1;
							}
						}
					}
				}

				.question {
					position: absolute;
					bottom: 90%;
					left: .2em;
					font-weight: bold;
					font-family: "Roboto";
					font-size: 2em;
					display: flex;
					align-items: flex-end;
					transition: all .2s;
					transform-origin: bottom center;
					transform: scale(0);
					span {
						display: inline-block;
					}
					span:nth-child(1) {
						font-size: .7em;
						transform: rotate(-25deg);
					}
					span:nth-child(3) {
						font-size: .7em;
						transform: rotate(25deg);
					}
				}

				.dirtyEyes {
					position: absolute;
					bottom: 90%;
					left: .4em;
					top: 1.7em;
					font-weight: bold;
					font-size: .8em;
					display: flex;
					align-items: center;
					transition: all .2s;
					transform-origin: center top;
					letter-spacing: .2em;
					transform: scale(0);
				}
				.easterEgg {
					font-size: 1em;
					right: 55px;
					white-space: nowrap;
					position: absolute;
					padding: .5em 1em;
					transform: translateY(10px) scale(.5);
					transform-origin: right bottom;
					background: var(--color-alert);
					border-radius: var(--border-radius);
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
	.footer {
		gap: .5em;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.donorsTitle {
		text-align: center;
		font-size: 1.5em;
		font-weight: bold;
		margin-bottom: .5em;
	}
}

@media only screen and (max-width: 420px) {
.paramsdonate{
	.paypalFormHolder {

		.amount {
			font-size: 1.25em;
		}
	}
}
}
</style>