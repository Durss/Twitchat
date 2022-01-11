<template>
	<div class="login">
		<div class="head">
			<img class="icon" src="@/assets/icons/twitch.svg" alt="twitch">
			<h1>Twitchat connexion</h1>
		</div>

		<div class="content">
			<div>
				<div class="infos">Twitchat needs read authorizations of your chat. Click <b>Authorize</b> button bellow</div>
				<Button class="authorizeBt" type="link" :href="oAuthURL" title="Authorize" v-if="!authorized" />
			</div>

			<form class="form" @submit.prevent="onLogin()" v-if="authorized">
				<Button title="Get a token" :icon="require('@/assets/icons/newtab.svg')"
					class="tokenBt"
					type="link"
					bounce
					target="_blank"
					href="https://twitchapps.com/tmi/" />
				<label for="token">Paste your token here</label>
				<input type="text" id="token" v-model="token" placeholder="oauth: ...">
				<Button title="Connect"
					type="submit"
					bounce
					:disabled="!token"
					:loading="loading"
					/>
			</form>
		</div>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import store from '@/store';
import Config from '@/utils/Config';
import TwitchUtils from '@/utils/TwitchUtils';
import Utils from '@/utils/Utils';
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
	public authorized:boolean = false;

	public get oAuthURL():string {
		return TwitchUtils.oAuthURL;
	}

	public mounted():void {
		if(this.$route.name == "oauth") {
			const token = Utils.getQueryParameterByName("access_token");
			// let state = Utils.getQueryParameterByName("state");
			// let error = Utils.getQueryParameterByName("error");
			if(token) {
				store.dispatch("authenticate", token);
			}else{
				store.state.alert = "Vous avez refusé l'accès à l'application Twitch.";
			}
		}

		this.authorized = store.state.authToken != "" || !Config.REQUIRE_APP_AUTHORIZATION;

		gsap.from(this.$el, {scaleX:0, ease:"elastic.out", duration:1});
		gsap.from(this.$el, {scaleY:0, ease:"elastic.out", duration:1, delay:.1});
	}

	public async onLogin():Promise<void> {
		this.loading = true;
		try {
			let t = this.token.replace("oauth:","");
			const user = await TwitchUtils.validateToken(t);
			store.commit("setUser", user);
			store.commit("setTmiToken", t);
			
			gsap.to(this.$el, {scaleX:0, ease:"back.in", duration:.5});
			gsap.to(this.$el, {scaleY:0, ease:"back.in", duration:.5, delay:.1});

			setTimeout(() => {
				this.$router.push({name:"chat"});
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
	.block();
	position: absolute;
	width: min-content;
	
	.head {
		margin-bottom:0;
		.icon {
			height: 50px;
		}
	}

	.content {
		text-align: center;

		.infos {
			margin-bottom: 20px;
			min-width: 250px;
		}

		.form {
			border-radius: 10px;
			display: flex;
			flex-direction: column;
			align-items: center;
			label {
				align-self: flex-start;
				margin-top: 15px;
			}
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
}
</style>