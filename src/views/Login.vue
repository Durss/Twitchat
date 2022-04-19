<template>
	<div class="login">
		<div class="head">
			<img class="icon" src="@/assets/logo.svg" alt="twitch">
			<div class="beta">beta</div>
		</div>

		<div class="content">
			<div class="description" v-if="!authenticating">
				<b>Twitchat</b> aims to fill gaps from the official Twitch chat for the streamers
			</div>

			<div class="infos"
			v-if="!authenticating"
			>
				<b>Twitchat</b> needs <b>{{permissions.length}}</b> permissions
				<br>
				<Button small title="More info"
					class="moreInfoBt"
					v-if="!showPermissions"
					@click.prevent="showPermissions = !showPermissions"
					:icon="require('@/assets/icons/help.svg')"
				/>
			</div>
			
			<div class="permissions" v-if="!authenticating">
				<div class="details" v-if="showPermissions">
					<div>
						Twitchat needs these permissions to offer you as much Twitch features as possible.<br>
						Your authentication token will never be stored on our server.<br>
						<br>
						Here are the permissions needed:
					</div>
					<ul>
						<li v-for="p in permissions" :key="p">{{p}}</li>
					</ul>
				</div>
			</div>

			<Button class="authorizeBt"
				type="link"
				:href="oAuthURL"
				title="Authorize"
				v-if="!authenticating && oAuthURL"
				bounce
				:loading="generatingCSRF"
				:data-tooltip="generatingCSRF? 'Generating CSRF token...' : ''"
				:icon="require('@/assets/icons/twitch_white.svg')"
			/>

			<Button title="Try again"
				highlight
				v-if="!authenticating && !oAuthURL"
				@click="generateCSRF()"
				:loading="generatingCSRF"
				:icon="require('@/assets/icons/refresh.svg')"
			/>
			
			<div class="loader" v-if="authenticating">
				<p>Authenticating...</p>
				<img src="@/assets/loader/loader.svg" alt="loader">
			</div>
		</div>

		<div class="footer">
			<p>Made with 💘 by <a href="https://twitch.tv/durss" target="_blank">Durss</a></p>
			<p>Sources on <a href="https://github.com/Durss/Twitchat" target="_blank">Github</a></p>
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

	public generatingCSRF:boolean = false;
	public authenticating:boolean = false;
	public showPermissions:boolean = false;
	public oAuthURL:string = "";

	public get permissions():string[] {
		const scopeToInfos:{[key:string]:string} = {
			"chat:read": "Read your chat",
			"chat:edit": "Write on your chat",
			"channel_editor": "Start a raid/host",
			"channel:read:redemptions": "Read redemptions",
			"channel:moderate": "Perform moderation actions",
			"channel:manage:polls": "Manage polls",
			"channel:manage:predictions": "Manage predictions",
			"channel:read:hype_train": "Read hype train state",
			"moderation:read": "List your moderators",
			"moderator:manage:automod": "Manage automoded messages",
			"bits:read": "Read bits leaderboard",
			"channel:edit:commercial": "Start an ad",
			"channel:manage:broadcast": "Update your stream info",
			"channel:manage:redemptions": "Manage rewards",
			"channel:read:goals": "Read current goals (sub/follow)",
			"channel:read:subscriptions": "Get list of your subs",
			"moderator:manage:banned_users": "Manage banned users",
			"moderator:read:blocked_terms": "Read blocked terms",
			"moderator:manage:blocked_terms": "Manage blocked terms",
			"user:read:blocked_users": "Read blocked users",
			"user:manage:blocked_users": "Manage blocked users",
			"user:read:follows": "List your followings",
			"user:read:subscriptions": "List your subscribers",
			"whispers:edit": "Send whispers",
		}
		return Config.TWITCH_APP_SCOPES.map(v => {
			if(scopeToInfos[v]) return scopeToInfos[v];
			return v;
		});
	}

	public async mounted():Promise<void> {
		gsap.from(this.$el, {scaleX:0, ease:"elastic.out", duration:1});
		gsap.from(this.$el, {scaleY:0, ease:"elastic.out", duration:1, delay:.1});

		if(this.$route.name == "oauth") {
			this.authenticating = true;
			const code = Utils.getQueryParameterByName("code");
			const csrfToken = Utils.getQueryParameterByName("state");
			if(code) {
				const csrfRes = await fetch(Config.API_PATH+"/CSRFToken?token="+csrfToken, {method:"POST"});
				const csrf = await csrfRes.json();
				if(!csrf.success) {
					store.state.alert = csrf.message;
					this.authenticating = false;
				}else{
					store.dispatch("authenticate", {code, csrf, cb:(success:boolean)=> {
						this.authenticating = false;
						if(success) {
							this.$router.push({name:"chat"});
						}else{
							store.state.alert = "Invalid credentials";
							this.authenticating = false;
						}
					}});
				}
			}else{
				store.state.alert = "You refused access to the Twitch application.";
				this.authenticating = false;
			}
		}
		
		if(!this.authenticating){
			this.generateCSRF();
		}
	}

	private async generateCSRF():Promise<void> {
		this.generatingCSRF = true;
		try {
			const res = await fetch(Config.API_PATH+"/CSRFToken", {method:"GET"});
			const json = await res.json();
			this.oAuthURL = TwitchUtils.getOAuthURL(json.token);
		}catch(e) {
			store.state.alert = "An error occured while generating a CSRF token";
		}
		this.generatingCSRF = false;
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

		.description {
			margin-bottom: 20px;
			min-width: 250px;
		}

		.infos {
			margin-bottom: 20px;
			min-width: 250px;
			color: @mainColor_warn;
			.moreInfoBt {
				margin-top: 5px;
				background-color: @mainColor_warn;
				&:hover {
					background-color: @mainColor_warn_light;
				}
			}
		}

		.permissions {
			margin-bottom: 20px;
			.details {
				text-align: left;
				color: @mainColor_warn;
				font-size: .9em;
				max-height: 150px;
				overflow-y: auto;
				ul {
					width: 190px;
					margin: auto;
					margin-top: 10px;
					list-style: inside;
					li {
						text-align: left;
						padding-left: 0;
						font-size: .9em;
					}
				}
			}
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

	.footer {
		text-align: center;
		font-size: .8em;
		margin-bottom: 10px;
	}
}
</style>