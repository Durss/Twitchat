<template>
	<div class="login">
		<div class="head">
			<img class="icon" src="@/assets/logo.svg" alt="twitch">
			<div class="beta">beta</div>
		</div>

		<div class="content betaWarn" v-if="closedBeta === true">
			Beta is closed to a few people sorry :)
		</div>
		
		<div class="content">
			<div class="description" v-if="!authenticating">
				<b>Twitchat</b> aims to fill gaps from the official Twitch chat for the streamers
			</div>

			<div v-if="!authenticating && newScopes.length > 0" class="newScopes">
				<img src="@/assets/icons/update.svg" alt="update" class="icon">
				<div class="title" v-if="newScopes.length > 1">An update needs these new permissions</div>
				<div class="title" v-else>An update needs this new permission</div>
				<ul>
					<li v-for="p in newScopes" :key="p">{{p}}</li>
				</ul>
			</div>

			<div class="infos" v-if="!authenticating">
				<b>Twitchat</b> needs <b>{{permissions.length}}</b> permissions
				<br>
				<Button small title="More info"
					class="moreInfoBt"
					v-if="!showPermissions"
					@click.prevent="showPermissions = !showPermissions"
					:icon="$image('icons/help.svg')"
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
				:icon="$image('icons/twitch_white.svg')"
			/>

			<Button title="Try again"
				highlight
				v-if="!authenticating && !oAuthURL"
				@click="generateCSRF()"
				:loading="generatingCSRF"
				:icon="$image('icons/refresh.svg')"
			/>
			
			<div class="loader" v-if="authenticating">
				<p>Authenticating...</p>
				<img src="@/assets/loader/loader.svg" alt="loader">
			</div>
		</div>

		<div class="footer">
			<p>Made with 💘 by <a href="https://twitch.tv/durss" target="_blank">Durss</a></p>
			<p>Sources on <a href="https://github.com/Durss/Twitchat" target="_blank">Github</a></p>
			<p class="note">Twitchat is NOT affiliated with <a href="https://twitch.tv" target="_blank">Twitch</a> by any means</p>
		</div>
		
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import DataStore from '@/store/DataStore';
import Config from '@/utils/Config';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{},
	components:{
		Button
	}
})
export default class Login extends Vue {

	public closedBeta = false;
	public generatingCSRF = false;
	public authenticating = false;
	public showPermissions = false;
	public oAuthURL = "";

	private scopeToInfos:{[key:string]:string} = {
		"bits:read": "Read bits leaderboard",
		
		"chat:read": "Read your chat",
		"chat:edit": "Write on your chat",

		"whispers:edit": "Send whispers",
		"whispers:read": "Receive whispers",

		"user:read:blocked_users": "List blocked users",
		"user:read:follows": "List your followings",
		"user:read:subscriptions": "List your subscribers",
		"user:manage:whispers": "Receive and send whispers",
		"user:manage:blocked_users": "Block or unblock users",

		"channel_editor": "Start a raid/host",
		"channel:read:redemptions": "Read redemptions",
		"channel:moderate": "Perform moderation actions",
		"channel:manage:polls": "Manage polls",
		"channel:manage:predictions": "Manage predictions",
		"channel:manage:broadcast": "Update your stream info",
		"channel:manage:redemptions": "Manage rewards",
		"channel:manage:moderators": "Use /mod and /unmod commands",
		"channel:manage:vips": "Use /vip and /unvip commands",
		"channel:manage:raids": "Use /raid command",
		"channel:read:hype_train": "Read hype train state",
		"channel:edit:commercial": "Start an ad",
		"channel:read:goals": "Read current goals (sub/follow)",
		"channel:read:subscriptions": "Get list of your subs",

		"moderation:read": "List your moderators",
		"moderator:read:blocked_terms": "Read blocked terms",
		"moderator:read:chat_settings": "Read room settings  (follow only, sub only, etc...)",
		"moderator:manage:automod": "Manage automoded messages",
		"moderator:manage:blocked_terms": "Manage blocked terms",
		"moderator:manage:banned_users": "Manage banned users",
		"moderator:manage:announcements": "Use /announce chat command",
		"moderator:manage:chat_messages": "Delete chat messages",
		"moderator:manage:chat_settings": "Updating room settings (follow only, sub only, etc...)",
		"moderator:read:chatters": "Read users on your chatroom",
		"moderator:manage:shield_mode": "Enable/disable shield mode",
	}

	public get permissions():string[] {
		return Config.instance.TWITCH_APP_SCOPES.map(v => {
			if(this.scopeToInfos[v]) return this.scopeToInfos[v];
			return v;
		});
	}

	public get newScopes():string[] {
		return this.$store("auth").newScopesToRequest.map((v:string) => {
			if(this.scopeToInfos[v]) return this.scopeToInfos[v];
			return v;
		});
	}

	public async mounted():Promise<void> {
		if(this.$router.currentRoute.value.params.betaReason) {
			this.closedBeta = true;
		}
		gsap.from(this.$el, {scaleX:0, ease:"elastic.out", duration:1});
		gsap.from(this.$el, {scaleY:0, ease:"elastic.out", duration:1, delay:.1});
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
								this.$store("main").alertData = "Invalid credentials";
							}
							this.authenticating = false;
						}
					});
				}
			}else{
				this.$store("main").alertData = "You refused access to the Twitch application.";
				this.authenticating = false;
			}
		}
		
		if(!this.authenticating){
			this.generateCSRF();
		}
	}

	public async generateCSRF():Promise<void> {
		this.generatingCSRF = true;
		try {
			const res = await fetch(Config.instance.API_PATH+"/auth/CSRFToken", {method:"GET"});
			const json = await res.json();
			this.oAuthURL = TwitchUtils.getOAuthURL(json.token);
		}catch(e) {
			this.$store("main").alertData = "An error occured while generating a CSRF token";
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

		&.betaWarn {
			background: @mainColor_normal;
			color: @mainColor_light;
			margin: 1em 0;
		}

		.description {
			margin-bottom: 20px;
			min-width: 250px;
		}

		.newScopes {
			margin-bottom: 1em;
			background-color: @mainColor_normal;
			color: @mainColor_light;
			border-radius: .5em;
			padding: 1em;
			padding-top: .5em;
			.title {
				font-weight: bold;
			}
			.icon {
				height: 2em;
				margin-bottom: .25em;
			}
			ul {
				width: fit-content;
				max-width: 90%;
				li {
					font-size: .8em;
				}
			}
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

		.note {
			font-style: italic;
			margin-top: .5em;
			font-size: .9em;
			opacity: .8;
		}
	}

	ul {
		width: 200px;
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
</style>