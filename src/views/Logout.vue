<template>
	<div class="logout">
		<div class="head">
			<img class="icon" src="@/assets/logo.svg" alt="twitch">
		</div>

		<div class="content">
			<div>You are now logged out.</div>
			<div class="link">
				<a @click="showDetails = !showDetails" v-if="!showDetails">Or, are you...?</a>
			</div>
			<div class="details" v-if="showDetails">
				<b>Other apps won't tell you but logging out is not enough.</b>
				Twitchat app still, theoretically, has access to your account.
				<br>
				<br>
				You may want to also revoke access to the app from your Twitch account.
				<br>
				<br>
				<Button type="link" href="https://www.twitch.tv/settings/connections" target=_blank title="Open settings" />
				<br>
				<br>
				Scroll down to the <b>Other Connections</b> section, find <b>DTwitchat</b> entry and click <b>Disconnect</b> button.
				<br>
				<br>
				<img src="@/assets/img/logout.png" alt="logout">
			</div>
			<Button :to="{name:'login'}" title="Log-in" class="login" />
		</div>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{},
	components:{
		Button,
	}
})
export default class Logout extends Vue {
	public showDetails:boolean = false;
}
</script>

<style scoped lang="less">
.logout{
	.center();
	.block();
	position: absolute;
	width: 430px;
	z-index: 1;
	
	.head {
		margin-bottom:0;
		.icon {
			height: 50px;
		}
	}

	.content {
		text-align: center;
		.link, .details, .login {
			margin-top: 20px;
		}
	}

}
</style>