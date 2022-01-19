<template>
	<div class="login">
		<div class="head">
			<img class="icon" src="@/assets/logo.svg" alt="twitch">
		</div>

		<div class="content">
			<div>
				<div class="infos" v-if="!authenticating"><b>Twitchat</b> needs <b>{{permissions.length}}</b> permissions to work.<br>Click <b>Authorize</b> button bellow</div>
				
				<div class="permissions">
					<a @click="showPermissions = !showPermissions" class="toggleBt">Permissions details<img src="@/assets/icons/infos.svg"></a>
					<div class="details" v-if="showPermissions">
						<div>
							Twitchat needs these permissions to offer you as much features as possible.<br>
							<br>
							Your authentication token will never be stored on our server.
						</div>
						<ul>
							<li v-for="p in permissions" :key="p">{{p}}</li>
						</ul>
					</div>
				</div>

				<Button class="authorizeBt" type="link" :href="oAuthURL" title="Authorize" v-if="!authenticating" />
				
				<div class="loader" v-if="authenticating">
					<p>Authenticating...</p>
					<img src="@/assets/loader/loader.svg" alt="loader">
				</div>
			</div>

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
						console.log("SUCCESS");
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
	width: min-content;
	z-index: 1;
	
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

		.permissions {
			margin-bottom: 20px;
			.toggleBt {
				color: @mainColor_warn;
				font-weight: bold;
				cursor: pointer;
				img {
					height: 20px;
					margin-left: 5px;
					vertical-align: middle;
				}
			}
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
}
</style>