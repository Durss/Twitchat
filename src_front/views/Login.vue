<template>
	<div class="login">
		<div class="head">
			<img class="icon" src="@/assets/logo.svg" alt="twitch">
			<div class="beta" v-if="isBeta === true">{{ $t("global.beta") }}</div>
		</div>

		<div class="content betaWarn" v-if="closedBeta === true">
			<img src="@/assets/icons/lock.svg">
			{{ $t("login.closedBeta") }}
		</div>
		
		<div class="content" v-if="!closedBeta">
			<div class="row description" v-if="!authenticating && !requestedScopes">{{ $t('login.head') }}</div>

			<ScopeSelector v-if="!authenticating" class="row" @update="onScopesUpdate" :requestedScopes="requestedScopes" />

			<Button class="row authorizeBt"
				type="link"
				:href="oAuthURL"
				:title="$t('login.authorizeBt')"
				v-if="!authenticating && oAuthURL"
				bounce
				:loading="generatingCSRF"
				:data-tooltip="generatingCSRF? $t('login.generatingCSRF') : ''"
				:icon="$image('icons/twitch_white.svg')"
			/>

			<Button :title="$t('login.retryBt')"
				highlight
				v-if="!authenticating && !oAuthURL"
				@click="generateCSRF()"
				:loading="generatingCSRF"
				:icon="$image('icons/refresh.svg')"
			/>
			
			<div class="loader" v-if="authenticating">
				<p>{{ $t("login.authenticating") }}</p>
				<img src="@/assets/loader/loader.svg" alt="loader">
			</div>
		</div>

		<div class="footer">
			<p><span>{{ $t("home.info") }}</span> <a href="https://www.durss.ninja" target="_blank">Durss</a></p>
			<p><span>{{ $t("home.footer.title") }}</span> <a href="https://github.com/Durss/Twitchat" target="_blank">Github</a></p>
			<p class="note" v-html="$t('home.footer.disclaimer')"></p>
		</div>
		
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import ScopeSelector from '@/components/login/ScopeSelector.vue';
import DataStore from '@/store/DataStore';
import Config from '@/utils/Config';
import type { TwitchScopesString } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{},
	components:{
		Button,
		ScopeSelector
	}
})
export default class Login extends Vue {

	public isBeta = false;
	public closedBeta = false;
	public generatingCSRF = false;
	public authenticating = false;
	public showPermissions = false;
	public oAuthURL = "";
	public scopes:string[] = [];
	public CSRFToken:string = "";
	public requestedScopes:TwitchScopesString[] = [];

	public beforeMount():void {
		if(this.$router.currentRoute.value.params.betaReason) {
			this.closedBeta = true;
		}

		if(this.$router.currentRoute.value.params.scope) {
			if(Array.isArray(this.$router.currentRoute.value.params.scope)) {
				this.requestedScopes = this.$router.currentRoute.value.params.scope as TwitchScopesString[];
			}else{
				this.requestedScopes = [this.$router.currentRoute.value.params.scope as TwitchScopesString];
			}
		}
	}

	public async mounted():Promise<void> {
		this.isBeta = Config.instance.BETA_MODE;
		let redirect = this.$router.currentRoute.value.params?.redirect;

		if(redirect && redirect != "logout") {
			DataStore.set("redirect", redirect, false);
		}

		if(this.$route.name == "oauth") {
			this.authenticating = true;
			const code = Utils.getQueryParameterByName("code");
			const csrfToken = Utils.getQueryParameterByName("state");
			if(code) {
				const csrfRes = await fetch(Config.instance.API_PATH+"/auth/CSRFToken?token="+csrfToken, {method:"POST"});
				const csrf = await csrfRes.json();
				if(!csrf.success) {
					this.$store("main").alertData = csrf.message;
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
							}else{
								this.$store("main").alertData = this.$t("error.invalid_credentials");
							}
							this.authenticating = false;
						}
					});
				}
			}else{
				this.$store("main").alertData = this.$t("error.authorization_refused");
				this.authenticating = false;
			}
		}
		
		if(!this.authenticating){
			this.generateCSRF();
		}

		await this.$nextTick();

		gsap.from(this.$el, {scaleX:0, ease:"elastic.out", duration:1});
		gsap.from(this.$el, {scaleY:0, ease:"elastic.out", duration:1, delay:.1, clearProps:"all"});
	}

	public async generateCSRF():Promise<void> {
		this.generatingCSRF = true;
		try {
			const res = await fetch(Config.instance.API_PATH+"/auth/CSRFToken", {method:"GET"});
			const json = await res.json();
			this.CSRFToken = json.token;
		}catch(e) {
			this.$store("main").alertData = this.$t("error.csrf_failed");
		}
		this.generatingCSRF = false;
	}

	public async onScopesUpdate(list:string[]):Promise<void> {
		if(!this.CSRFToken) {
			await this.generateCSRF();
		}
		this.scopes = list;
		this.oAuthURL = TwitchUtils.getOAuthURL(this.CSRFToken, this.scopes);
	}

}
</script>

<style scoped lang="less">
.login{
	.center();
	.block();
	position: absolute;
	width: 380px;
	z-index: 1;

	.beta {
		position: absolute;
		top: 10px;
		right: -50px;
		background-color: @mainColor_normal;
		color: @mainColor_light;
		padding: 5px 50px;
		border-radius: 10px;
		text-transform: uppercase;
		font-size: 18px;
		transform: rotate(45deg);
	}
	
	.head {
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

		&.betaWarn {
			background: @mainColor_normal;
			color: @mainColor_light;
			margin: 1em 0;
			img {
				height: 2em;
			}
		}

		.description {
			min-width: 250px;
		}

	}

	.loginBt {
		font-size: 35px;
		border-radius: 10px;
		padding: 10px 20px;
		display: flex;
		flex-direction: column;
		align-items: center;
		.icon {
			height: 50px;
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

	ul {
		// width: 300px;
		margin: auto;
		margin-top: .5em;
		list-style: inside;
		li {
			margin-top: .25em;
			text-align: left;
			padding-left: 0;
			font-size: .9em;
		}
	}
}
</style>