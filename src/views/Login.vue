<template>
	<div class="login">
		<div class="head">
			<img class="icon" src="@/assets/logo.svg" alt="twitch">
		</div>

		<div class="content">
			<div class="description" v-if="!authenticating">
				<b>Twitchat</b> aims to fill gaps from the official Twitch chat.
				<br>
				<br>
				It's goal is to make it easier for a streamer to communicate with her/his audience by missing the fewer messages possible with some special features.
			</div>

			<div class="infos"
			v-if="!authenticating"
			>
				<b>Twitchat</b> needs <b>{{permissions.length}}</b> permissions to work.
				<br>
				<a v-if="!showPermissions" @click.prevent="showPermissions = !showPermissions" class="toggleBt">► more info ◄</a>
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

			<Button class="authorizeBt" type="link" :href="oAuthURL" title="Authorize" v-if="!authenticating" bounce />
			
			<div class="loader" v-if="authenticating">
				<p>Authenticating...</p>
				<img src="@/assets/loader/loader.svg" alt="loader">
			</div>
		</div>

		<div class="footer">
			<p>Made by <a href="https://twitch.tv/durss" target="_blank">Durss</a></p>
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

	public authenticating:boolean = false;
	public showPermissions:boolean = false;

	public get permissions():string[] {
		const scopeToInfos:{[key:string]:string} = {
			"chat:read": "Read chat",
			"chat:edit": "Write on chat",
			"channel_editor": "Start raid/host",
			"channel:read:redemptions": "Read redemptions",
			"channel:moderate": "Perform moderation actions",
			"channel:manage:polls": "Manage polls",
			"channel:manage:predictions": "Manage predictions",
			"channel:read:hype_train": "Read hype train state",
			"moderation:read": "Get moderation data",
			"moderator:manage:automod": "Manage automoded messages",
			"bits:read": "Read bits leaderboard",
			"channel:edit:commercial": "Start an ad",
			"channel:manage:broadcast": "Manage broadcast infos",
			"channel:manage:redemptions": "Manage rewards",
			"channel:read:goals": "Read current goals",
			"channel:read:subscriptions": "Get list of subs",
			"moderator:manage:banned_users": "Manage banned users",
			"moderator:read:blocked_terms": "Read blocked terms",
			"moderator:manage:blocked_terms": "Manage blocked terms",
			"user:read:blocked_users": "Read blocked users",
			"user:manage:blocked_users": "Manage blocked users",
			"user:read:follows": "Read follows of a user",
			"user:read:subscriptions": "Read subs of a user",
			"whispers:edit": "Receive whispers",
		}
		return Config.TWITCH_APP_SCOPES.map(v => {
			if(scopeToInfos[v]) return scopeToInfos[v];
			return v;
		});
	}

	public get oAuthURL():string {
		return TwitchUtils.oAuthURL;
	}

	public mounted():void {

		if(this.$route.name == "oauth") {
			this.authenticating = true;
			const code = Utils.getQueryParameterByName("code");
			// let state = Utils.getQueryParameterByName("state");
			// let error = Utils.getQueryParameterByName("error");
			if(code) {
				store.dispatch("authenticate", {code, cb:(success:boolean)=> {
					this.authenticating = false;
					if(success) {
						this.$router.push({name:"chat"});
					}else{
						store.state.alert = "Invalid credentials";
						this.authenticating = false;
					}
				}});
			}else{
				store.state.alert = "You refused access to the Twitch application.";
				this.authenticating = false;
			}
		}

		gsap.from(this.$el, {scaleX:0, ease:"elastic.out", duration:1});
		gsap.from(this.$el, {scaleY:0, ease:"elastic.out", duration:1, delay:.1});
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
	
	.head {
		margin-bottom:0;
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
			.toggleBt {
				color: @mainColor_warn;
				font-weight: bold;
				// text-decoration: underline;
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