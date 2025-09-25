<template>
	<div :class="classes">
		<div class="dimmer" ref="dimmer" @click="close()"></div>

		<div class="holder" ref="holder">
			<div class="head" v-if="!scopeOnly">
				<img class="icon" src="@/assets/logo.svg" alt="twitch">
				<div class="beta" v-if="isBeta === true">{{ $t("global.beta") }}</div>
			</div>

			<ClearButton @click="close()" />
	
			<div class="content betaWarn" v-if="closedBeta === true && !scopeOnly">
				<div class="head">
					<Icon name="lock" />
					<p>{{ $t("login.closed_beta") }}</p>
				</div>
				<TTButton type="link" href="https://twitchat.fr" class="link" target="_self" icon="twitchat">{{ $t("login.prodBt") }}</TTButton>

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
					
					<TTButton class="tranferBt" icon="download"
					@click="transferData"
					:loading="transferingData"
					light secondary>{{ $t("login.transfer_datatBt") }}</TTButton>
				</div>

				<div class="migrate" v-if="transferComplete">
					<Icon name="checkmark" class="icon" />
					<div>{{ $t("login.transfer_complete") }}</div>
				</div>
			</div>
			
			<div class="content" v-if="!closedBeta || scopeOnly">
				<div class="description" v-if="!authenticating && requestedScopes.length == 0">{{ $t('login.head') }}</div>
	
				<ScopeSelector v-if="!authenticating" @update="onScopesUpdate" :requestedScopes="requestedScopes" />
	
				<TTButton @click.capture.prevent="generateCSRF(true)"
					type="link"
					:href="oAuthURL"
					v-if="!authenticating && oAuthURL"
					bounce primary
					:loading="generatingCSRF"
					v-tooltip="generatingCSRF? $t('login.generatingCSRF') : ''"
					icon="twitch"
				>{{ $t('login.authorizeBt') }}</TTButton>
	
				<TTButton v-if="!authenticating && !oAuthURL"
					@click="generateCSRF()"
					:loading="generatingCSRF"
					alert
					icon="refresh">{{ $t('login.retryBt') }}</TTButton>
				
				<div class="loader" v-if="authenticating">
					<p>{{ $t("login.authenticating") }}</p>
					<Icon class="loader" name="loader" />
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
import Icon from '@/components/Icon.vue';
import TTButton from '@/components/TTButton.vue';
import ClearButton from '@/components/ClearButton.vue';
import ScopeSelector from '@/components/login/ScopeSelector.vue';
import DataStore from '@/store/DataStore';
import ApiHelper from '@/utils/ApiHelper';
import Config from '@/utils/Config';
import type { TwitchScopesString } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import { gsap } from 'gsap';
import { watch } from 'vue';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		Icon,
		TTButton,
		ClearButton,
		ScopeSelector,
	},
	emits:["close"]
})
class Login extends Vue {

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
		//If auth got refused, check if it's because we're missing beta access rights
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
			const scopes = this.$store.auth.newScopesToRequest;
			this.requestedScopes = scopes;
		}
	}

	public async mounted():Promise<void> {
		this.isBeta = Config.instance.BETA_MODE;

		if(this.$route.name == "oauth") {
			this.authenticating = true;
			const code = Utils.getQueryParameterByName("code");
			const csrfToken = Utils.getQueryParameterByName("state");
			if(code) {
				const res = await ApiHelper.call("auth/CSRFToken", "POST", {token:csrfToken!});
				if(!res.json.success) {
					if(res.json.message) this.$store.common.alert(res.json.message);
					this.authenticating = false;
				}else{
					this.$store.auth.twitch_autenticate(code, (success:boolean, betaRefused?:boolean)=> {
						this.authenticating = false;
						if(success) {
							if(res.json.uidShare) {
								this.$store.main.tempStoreValue = {uid:res.json.uidShare, csrf:csrfToken};
								this.$store.params.openModal("shareParams");
							}
							this.redirect();
						}else{
							if(betaRefused === true) {
								this.closedBeta = true;
								this.checkIfCanMigrate();
							}else{
								this.$store.common.alert(this.$t("error.invalid_credentials"));
							}
						}
					});
				}
			}else{
				this.$store.common.alert(this.$t("error.authorization_refused"));
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
		// this.$store.auth.newScopesToRequest = ['moderator:read:chatters', 'channel:read:redemptions', 'channel:manage:polls'];
		
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
			const {json} = await ApiHelper.call("auth/CSRFToken", "GET");
			this.CSRFToken = json.token;
			this.onScopesUpdate(this.scopes);
		}catch(e) {
			this.$store.common.alert(this.$t("error.csrf_failed"));
		}
		if(redirect) {
			if(this.$store.auth.authenticated) {
				this.oAuthURL = TwitchUtils.getOAuthURL(this.CSRFToken, this.scopes, "/popup");
				const win = window.open(this.oAuthURL, "twitchAuth", "width=600,height=800");
				if(win) {
					const interval = setInterval(() => {
						if (win.closed) {
							clearInterval(interval);
							this.generatingCSRF = false;
						}
					}, 500);
					window.authCallback = async (code:string, csrfToken:string)=> {
						clearInterval(interval);
						win?.close();
						const {json:csrf} = await ApiHelper.call("auth/CSRFToken", "POST", {token:csrfToken});
						if(!csrf.success) {
							this.$store.common.alert(this.$t("error.csrf_invalid"));
							this.generatingCSRF = false;
							return;
						}
						this.$store.auth.twitch_updateAuthScopes(code).then(success=>{
							if(success) {
								this.close();
							}
						}).finally(() => {
							this.generatingCSRF = false;
						});
					}
					win.focus();
					return;
				}
			}
			window.location.href = this.oAuthURL;
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
			this.$store.auth.newScopesToRequest = [];
			this.$emit('close');
		}});
	}

	/**
	 * Called when requesting to transfer our data from beta to production
	 */
	public transferData():void {
		this.$confirm(this.$t("login.transfer_confirm_title"), this.$t("login.transfer_confirm_description")).then(async ()=>{
			this.transferingData = true;
			const res = await ApiHelper.call("beta/user/migrateToProduction", "POST");
			if(res.status == 200) {
				this.transferComplete = true;
			}else{
				this.$store.common.alert(this.$t("error.beta_transfer"))
			}
			this.transferingData = false;
		}).catch(()=>{/*ignore*/})
	}

	/**
	 * Check if the user has data on beta server that can be migrated to production
	 */
	public async checkIfCanMigrate():Promise<void> {
		const res = await ApiHelper.call("beta/user/hasData", "GET");
		if(res.status === 200) {
			const json = res.json;
			if(json.success) {
				this.migrateInfo = {};
				if(json.data!.betaDate) this.migrateInfo.betaDate = Utils.formatDate(new Date(json.data!.betaDate));
				if(json.data!.prodDate) this.migrateInfo.prodDate = Utils.formatDate(new Date(json.data!.prodDate));
				if(json.data!.betaVersion) this.migrateInfo.betaVersion = json.data!.betaVersion;
				if(json.data!.prodVersion) this.migrateInfo.prodVersion = json.data!.prodVersion;
			}
		}
	}

	/**
	 * Redirect user after auth complete
	 */
	private redirect():void {
		let redirect:string = "";
		const routeRedirect = this.$router.currentRoute.value.params?.redirect;
		if(Array.isArray(routeRedirect)) redirect = routeRedirect[0];
		else redirect = routeRedirect;

		if(!this.scopeOnly) {
			if(redirect && redirect != "logout") {
				DataStore.set(DataStore.REDIRECT, redirect, false);
			}
		}
		redirect = DataStore.get(DataStore.REDIRECT);
		DataStore.remove(DataStore.REDIRECT);
		if(redirect) {
			this.$router.push(redirect);
		}else{
			this.$router.push({name:"chat"});
		}
	}

}
export default toNative(Login);
</script>

<style scoped lang="less">
.login{
	position: fixed;
	top: 0;
	left: 0;
	z-index: 99;
	width: var(--vw);
	height: var(--vh);

	.dimmer {
		backdrop-filter: blur(10px);
		background: rgba(0, 0, 0, .75);
		position: absolute;
		top: 0;
		left: 0;
		width: var(--vw);
		height: var(--vh);
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
		color: var(--color-text);
		background-color: var(--background-color-secondary);
		padding: .5em;
		box-shadow: 0px 0px 10px 2px rgba(0,0,0,.5);
		border-radius: .5em;
		overflow-y: auto;
		max-width: var(--vw);

		.beta {
			position: absolute;
			top: 10px;
			left: -50px;
			font-weight: bold;
			background-color: var(--color-secondary);
			color: var(--color-light);
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
					color: var(--color-text);
					.icon {
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
					color: var(--color-light);
					.icon {
						height: 2em;
						margin: auto;
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
			width: var(--vw);
			height: var(--vh);
			min-height: var(--vh);
		}
	}
}
</style>