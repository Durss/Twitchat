<template>
	<div class="login">
		<!-- <Button class="loginBt"
			type="button"
			:icon="require('@/assets/icons/twitch.svg')"
			title="Twitch connect"
			white
			/> -->
		<!-- <a :href="oAuthURL" class="button loginBt white" v-if="showButton">
			<img class="icon" src="@/assets/icons/twitch.svg" alt="twitch">
			<span>Connect</span>
		</a> -->

		<form class="form" @submit.prevent="onLogin()">
			<img class="icon" src="@/assets/icons/twitch.svg" alt="twitch">
			<h1>Connexion</h1>
			<Button title="Get a token" :icon="require('@/assets/icons/newtab.svg')"
				class="tokenBt"
				type="link"
				target="_blank"
				href="https://twitchapps.com/tmi/" />
			<label for="token">Paste your token</label>
			<input type="text" id="token" v-model="token" placeholder="oauth: ...">
			<Button title="Connect"
				type="submit"
				:disabled="!token"
				:loading="loading"
				/>
		</form>

		<img class="loader" src="@/assets/loader/loader.svg" alt="loader" v-if="!showButton">
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import store from '@/store';
import Config from '@/utils/Config';
import TwitchUtils from '@/utils/TwitchUtils';
import gsap from 'gsap/all';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{},
	components:{
		Button
	}
})
export default class Login extends Vue {

	public token:string = "";
	public loading:boolean = false;
	public showButton:boolean = false;

	public get oAuthURL():string {
		let path = this.$router.resolve({name:"oauth"}).href;
		let redirect = encodeURIComponent( document.location.origin+path );
		let scopes = encodeURIComponent( Config.TWITCH_SCOPES.join(" ") );
		let clientID = Config.TWITCH_CLIENT_ID;

		let url = "https://id.twitch.tv/oauth2/authorize?";
		url += "client_id="+clientID
		url += "&redirect_uri="+redirect;
		url += "&response_type=token";
		url += "&scope="+scopes;
		url += "&state=";
		return url;
	}

	public mounted():void {
		if(this.$route.name == "login") {
			this.showButton = true;
			gsap.from(this.$el, {scaleX:0, ease:"elastic.out", duration:1});
			gsap.from(this.$el, {scaleY:0, ease:"elastic.out", duration:1, delay:.1});
		}
	}

	public async onLogin():Promise<void> {
		this.loading = true;
		try {
			let t = this.token.replace("oauth:","");
			const user = await TwitchUtils.validateToken(t);
			store.commit("authenticate", t);
			store.commit("setUser", user);
			
			gsap.to(this.$el, {scaleX:0, ease:"back.in", duration:.5});
			gsap.to(this.$el, {scaleY:0, ease:"back.in", duration:.5, delay:.1});

			setTimeout(() => {
				this.$router.push({name:"home"});
			}, 500);
		}catch(error) {
			store.state.alert = "Invalid token";
		}
		this.loading = false;
	}

}
</script>

<style scoped lang="less">
.login{
	.center();
	position: absolute;

	.form {
		background-color: white;
		border-radius: 10px;
		padding: 20px;
		display: flex;
		flex-direction: column;
		align-items: center;
		
		h1 {
			font-size: 35px;
		}
		.icon {
			height: 50px;
		}

		label {
			align-self: flex-start;
			margin-top: 15px;
		}

		.tokenBt {
			margin-top: 15px;
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

	.loader {
		width: 80px;
		height: 80px;
	}
}
</style>