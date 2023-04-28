<template>
	<div :class="classes">

		<div class="dimmer" ref="dimmer" @click="close()"></div>

		<div class="holder blured-background" ref="holder">
			<div class="head" v-if="!scopeOnly">
				<img class="icon" src="@/assets/logo.svg" alt="twitch">
				<div class="beta" v-if="isBeta === true">{{ $t("global.beta") }}</div>
			</div>

			<CloseButton @click="close()" />
	
			<div class="content betaWarn" v-if="closedBeta === true && !scopeOnly">
				<div class="head">
					<img src="@/assets/icons/lock.svg">
					<p>{{ $t("login.closed_beta") }}</p>
				</div>
				<Button type="link" href="https://twitchat.fr" class="link" target="_self" icon="twitchat">{{ $t("login.prodBt") }}</Button>

				<div class="migrate" v-if="migrateInfo.betaDate && !transferComplete">
					<div>{{ $t("login.transfer_details") }}</div>
					<div class="envs">
						<div class="env">
							<div class="noBorder"></div>
							<div>{{ $t("login.transfer_details_date") }}</div>
							<div>{{ $t("login.transfer_details_version") }}</div>
						</div>
						<div class="env">
							<div>{{ $t("login.transfer_details_beta") }}</div>
							<div>{{migrateInfo.betaDate}}</div>
							<div>{{migrateInfo.betaVersion}}</div>
						</div>
						<div class="env">
							<div>{{ $t("login.transfer_details_production") }}</div>
							<div v-if="migrateInfo.prodDate">{{migrateInfo.prodDate}}</div>
							<div v-else>{{ $t("login.transfer_no_data") }}</div>
							<div v-if="migrateInfo.prodVersion">{{migrateInfo.prodVersion}}</div>
							<div v-else>{{ $t("login.transfer_no_data") }}</div>
						</div>
					</div>
					
					<Button class="tranferBt" icon="download"
					@click="transferData"
					:loading="transferingData"
					alert>{{ $t("login.transfer_datatBt") }}</Button>
				</div>

				<div class="migrate" v-if="transferComplete">
					<img src="@/assets/icons/checkmark.svg" class="icon">
					<div>{{ $t("login.transfer_complete") }}</div>
				</div>
			</div>
			
			<div class="content" v-if="!closedBeta || scopeOnly">
				<div class="description" v-if="!authenticating && requestedScopes.length == 0">{{ $t('login.head') }}</div>
	
				<ScopeSelector v-if="!authenticating" @update="onScopesUpdate" :requestedScopes="requestedScopes" />
	
				<Button @click.capture.prevent="generateCSRF(true)"
					type="link"
					:href="oAuthURL"
					v-if="!authenticating && oAuthURL"
					bounce
					:loading="generatingCSRF"
					v-tooltip="generatingCSRF? $t('login.generatingCSRF') : ''"
					icon="twitch"
				>{{ $t('login.authorizeBt') }}</Button>
	
				<Button v-if="!authenticating && !oAuthURL"
					@click="generateCSRF()"
					:loading="generatingCSRF"
					alert
					icon="refresh">{{ $t('login.retryBt') }}</Button>
				
				<div class="loader" v-if="authenticating">
					<p>{{ $t("login.authenticating") }}</p>
					<img src="@/assets/loader/loader.svg" alt="loader">
				</div>
			</div>
	
			<div class="footer" v-if="!scopeOnly">
				<p><span>{{ $t("home.info") }}</span> <a href="https://www.durss.ninja" target="_blank">Durss</a></p>
				<p><span>{{ $t("home.footer.title") }}</span> <a href="https://github.com/Durss/Twitchat" target="_blank">Github</a></p>
				<p class="note" v-html="$t('home.footer.disclaimer')"></p>
			</div>
		</div>
		
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import CloseButton from '@/components/CloseButton.vue';
import ScopeSelector from '@/components/login/ScopeSelector.vue';
import DataStore from '@/store/DataStore';
import Config from '@/utils/Config';
import type { TwitchScopesString } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import { gsap } from 'gsap';
import { watch } from 'vue';
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		Button,
		CloseButton,
		ScopeSelector,
	},
	emits:["close"]
})
export default class Login extends Vue {

	@Prop({
			type:Boolean,
			default:false,
		})
	public show!:boolean;

	@Prop({
			type:Boolean,
			default:false,
		})
	public scopeOnly!:boolean;

	public isBeta = false;
	public closedBeta = false;
	public generatingCSRF = false;
	public authenticating = false;
	public showPermissions = false;
	public transferingData = false;
	public transferComplete = false;
	public oAuthURL = "";
	public scopes:string[] = [];
	public CSRFToken:string = "";
	public requestedScopes:TwitchScopesString[] = [];
	public migrateInfo:{betaDate?:string, prodDate?:string, betaVersion?:number, prodVersion?:number} = {};

	public get classes():string[] {
		const res = ["login"];
		if(this.scopeOnly !== false) res.push("no-bg");
		return res;
	}

	public beforeMount():void {
		if(this.$router.currentRoute.value.params.betaReason) {
			this.closedBeta = true;
			this.checkIfCanMigrate();
		}

		if(this.$router.currentRoute.value.params.scope) {
			if(Array.isArray(this.$router.currentRoute.value.params.scope)) {
				this.requestedScopes = this.$router.currentRoute.value.params.scope as TwitchScopesString[];
			}else{
				this.requestedScopes = [this.$router.currentRoute.value.params.scope as TwitchScopesString];
			}
		}else{
			const scopes = this.$store('auth').newScopesToRequest;
			this.requestedScopes = scopes;
		}
	}

	public async mounted():Promise<void> {
		this.isBeta = Config.instance.BETA_MODE;
		let redirect = this.$router.currentRoute.value.params?.redirect;

		if(!this.scopeOnly) {
			if(redirect && redirect != "logout") {
				DataStore.set("redirect", redirect, false);
			}
		}

		if(this.$route.name == "oauth") {
			this.authenticating = true;
			const code = Utils.getQueryParameterByName("code");
			const csrfToken = Utils.getQueryParameterByName("state");
			if(code) {
				const options = {
					method: "POST",
					headers: {
						'App-Version': import.meta.env.PACKAGE_VERSION,
					},
				};
				const csrfRes = await fetch(Config.instance.API_PATH+"/auth/CSRFToken?token="+csrfToken, options);
				const csrf = await csrfRes.json();
				if(!csrf.success) {
					this.$store("main").alert(csrf.message);
					this.authenticating = false;
				}else{
					this.$store("auth").twitch_autenticate(code, (success:boolean, betaRefused?:boolean)=> {
						this.authenticating = false;
						if(success) {
							redirect = DataStore.get("redirect");
							DataStore.remove("redirect");
							if(redirect) {
								this.$router.push({name: redirect});
							}else{
								this.$router.push({name:"chat"});
							}
						}else{
							if(betaRefused === true) {
								this.closedBeta = true;
								this.checkIfCanMigrate();
							}else{
								this.$store("main").alert(this.$t("error.invalid_credentials"));
							}
							this.authenticating = false;
						}
					});
				}
			}else{
				this.$store("main").alert(this.$t("error.authorization_refused"));
				this.authenticating = false;
			}
		}
		
		// if(!this.authenticating){
		// 	this.generateCSRF();
		// }

		this.open();
		watch(()=>this.show, ()=>{
			if(this.show) this.open();
		})
	}

	/**
	 * Open window
	 */
	public async open():Promise<void> {
		//Uncomment to debug forced scopes state
		// this.$store('auth').newScopesToRequest = ['moderator:read:chatters', 'channel:read:redemptions', 'channel:manage:polls'];
		
		await this.$nextTick();
		if(this.$refs.dimmer) {
			gsap.killTweensOf(this.$refs.dimmer as HTMLDivElement);
			gsap.fromTo(this.$refs.dimmer as HTMLDivElement, {opacity:0}, {opacity:1, ease:"sine.out", duration:.2, clearProps:"all"});
		}
		const holder = this.$refs.holder as HTMLDivElement;
		holder.removeAttribute("style");
		await this.$nextTick();
		gsap.killTweensOf(holder);
		gsap.fromTo(holder, {scaleX:.1}, {scaleX:1, ease:"elastic.out", duration:1});
		gsap.fromTo(holder, {scaleY:.1}, {scaleY:1, ease:"elastic.out", duration:1, delay:.1, clearProps:"all"});
	}

	/**
	 * Generates a CSRF token
	 * @param redirect 
	 */
	public async generateCSRF(redirect:boolean = false):Promise<void> {
		this.generatingCSRF = true;
		try {
			const headers = {
				'App-Version': import.meta.env.PACKAGE_VERSION,
			};
			const res = await fetch(Config.instance.API_PATH+"/auth/CSRFToken", {method:"GET", headers});
			const json = await res.json();
			this.CSRFToken = json.token;
			this.onScopesUpdate
		}catch(e) {
			this.$store("main").alert(this.$t("error.csrf_failed"));
		}
		this.oAuthURL = TwitchUtils.getOAuthURL(this.CSRFToken, this.scopes);
		if(redirect) {
			document.location.href = this.oAuthURL;
		}
	}

	/**
	 * Called when scope selection changes
	 * Updates the oAuthURL
	 */
	public async onScopesUpdate(list:string[]):Promise<void> {
		this.scopes = list;
		this.oAuthURL = TwitchUtils.getOAuthURL(this.CSRFToken, this.scopes);
	}

	/**
	 * Close the window
	 */
	public async close():Promise<void> {
		if(this.$refs.dimmer) {
			gsap.killTweensOf(this.$refs.dimmer as HTMLDivElement);
			gsap.to(this.$refs.dimmer as HTMLDivElement, {opacity:0, ease:"sine.in", duration:.2});
		}
		gsap.killTweensOf(this.$refs.holder as HTMLDivElement);
		gsap.to(this.$refs.holder as HTMLDivElement, {scaleX:.1, scaleY:.1, ease:"back.in", duration:.35, clearProps:"all", onComplete:()=>{
			this.$store('auth').newScopesToRequest = [];
			this.$emit('close');
		}});
	}

	/**
	 * Called when requesting to transfer our data from beta to production
	 */
	public transferData():void {
		this.$confirm(this.$t("login.transfer_confirm_title"), this.$t("login.transfer_confirm_description")).then(async ()=>{
			this.transferingData = true;
			const options = {
				method: "POST",
				headers: {
					"Authorization": "Bearer "+this.$store("auth").twitch.access_token,
					'App-Version': import.meta.env.PACKAGE_VERSION,
				},
			}
			const res = await fetch(Config.instance.API_PATH+"/beta/user/migrateToProduction", options);
			if(res.status == 200) {
				this.transferComplete = true;
			}else{
				this.$store("main").alert(this.$t("error.beta_transfer"))
			}
			this.transferingData = false;
		}).catch(()=>{/*ignore*/})
	}

	/**
	 * Check if the user has data on beta server that can be migrated to production
	 */
	public async checkIfCanMigrate():Promise<void> {
		const options = {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				"Authorization": "Bearer "+this.$store("auth").twitch.access_token,
				'App-Version': import.meta.env.PACKAGE_VERSION,
			},
		}
		const res = await fetch(Config.instance.API_PATH+"/beta/user/hasData", options);
		if(res.status === 200) {
			const json:{success:boolean, data:{betaDate?:number, prodDate?:number, betaVersion?:number, prodVersion?:number}} = await res.json();
			if(json.success) {
				this.migrateInfo = {};
				if(json.data.betaDate) this.migrateInfo.betaDate = Utils.formatDate(new Date(json.data.betaDate));
				if(json.data.prodDate) this.migrateInfo.prodDate = Utils.formatDate(new Date(json.data.prodDate));
				if(json.data.betaVersion) this.migrateInfo.betaVersion = json.data.betaVersion;
				if(json.data.prodVersion) this.migrateInfo.prodVersion = json.data.prodVersion;
			}
		}
	}

}
</script>

<style scoped lang="less">
.login{
	position: fixed;
	top: 0;
	left: 0;
	z-index: 99;
	width: 100vw;
	height: 100vh;

	.dimmer {
		backdrop-filter: blur(10px);
		background: rgba(0, 0, 0, .75);
		position: absolute;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
	}

	.holder {
		.center();
		pointer-events: all;
		transform-origin: center center;
		position: absolute;
		display: flex;
		flex-direction: column;
		gap: 1em;
		width: 380px;
		z-index: 1;
		color: var(--color-light);

		.beta {
			position: absolute;
			top: 10px;
			left: -50px;
			font-weight: bold;
			background-color: var(--color-secondary);
			color: var(--mainColor_light);
			padding: 5px 50px;
			border-radius: 10px;
			text-transform: uppercase;
			font-size: 18px;
			transform: rotate(-45deg);
		}
		
		&>.head {
			margin-bottom:0;
			padding: 0;
			padding-top: 20px;
			width: 200px;
			margin: auto;
			.icon {
				height: 50px;
			}
		}
	
		.content {
			text-align: center;
			display: flex;
			flex-direction: column;
			gap: 1em;
			align-items: center;
			flex-grow: 1;
			justify-content: center;
	
			&.betaWarn {
				.head {
					border-radius: var(--border-radius);
					color: var(--mainColor_light);
					img {
						height: 2em;
						margin-bottom: .5em;
					}
				}
				.migrate {
					display: flex;
					flex-direction: column;
					gap: .5em;
					padding: 1em;
					background-color: var(--color-secondary);
					border-radius: var(--border-radius);
					.icon {
						height: 2em;
					}
					.envs {
						display: table;
						border-spacing: 2px;
						.env {
							display: table-row;
							div {
								display: table-cell;
								&:not(.noBorder) {
									padding: 5px;
									// border: 1px solid var(--color-light);
									.bevel();
									background-color: rgba(0, 0, 0, .25);
									border-radius: 4px;
								}
								&:first-child {
									font-weight: bold;
									text-align: right;
								}
							}
						}
					}
				}
			}
	
			.description {
				min-width: 250px;
			}
	
		}
	
		.footer {
			text-align: center;
			font-size: .8em;
			margin-bottom: 10px;
	
			.note {
				font-style: italic;
				margin-top: .5em;
				font-size: .9em;
				opacity: .8;
			}
		}
	}
}

@media only screen and (max-width: 600px) {
	.login{
		.holder {
			top: 0;
			left: 0;
			transform: unset;
			width: 100vw;
			height: 100vh;
			min-height: 100vh;
		}
	}
}
</style>