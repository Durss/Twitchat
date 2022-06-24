<template>
	<div class="paramsaccount">
		<img :src="userPP" alt="profile pic" class="profilePic">

		<div class="title">Connected as <strong>{{userName}}</strong></div>

		<Button class="button" v-if="canInstall" @click="ahs()" title="Add Twitchat to home screen" :icon="$image('icons/twitchat.svg')" />
		<Button class="button logoutBt" @click="logout()" bounce title="Logout" highlight :icon="$image('icons/logout.svg')" />
		
	</div>
</template>

<script lang="ts">
import ToggleBlock from '@/components/ToggleBlock.vue';
import router from '@/router';
import store from '@/store';
import type { ParameterCategory, ParameterData } from '@/types/TwitchatDataTypes';
import UserSession from '@/utils/UserSession';
import { watch } from '@vue/runtime-core';
import { Options, Vue } from 'vue-class-component';
import Button from '../../Button.vue';

@Options({
	props:{},
	components:{
		Button,
		ToggleBlock,
	}
})
export default class ParamsAccount extends Vue {

	public obsOverlayURL = "";
	public showSuggestions = false;
	public showObs = false;
	public showCredits = true;

	public get canInstall():boolean { return store.state.ahsInstaller != null || true; }
	public get userName():string { return UserSession.instance.authToken.login; }
	public get userPP():string {
		let pp:string|undefined = UserSession.instance.user?.profile_image_url;
		if(!pp) {
			pp = this.$image("icons/user_purple.svg");
		}
		return pp;
	}

	public logout():void {
		store.dispatch('logout');
		this.$router.push({name:'logout'});
	}

	public mounted():void {
		watch(()=> store.state.params, ()=> this.onParamChanged());
		this.onParamChanged();
	}

	public ahs():void {
		if(!store.state.ahsInstaller) return;
		// Show the prompt
		store.state.ahsInstaller.prompt();
		// // Wait for the user to respond to the prompt
		// store.state.ahsInstaller.userChoice.then((choiceResult) => {
		// 	this.canInstall = false;
		// })
	}

	private onParamChanged():void {
		let path = router.resolve({name:'chatLight', params:{login:UserSession.instance.authToken.login}}).href;
		//eslint-disable-next-line
		const params:any = {};
		for (const cat in store.state.params) {
			//eslint-disable-next-line
			const values = store.state.params[cat as ParameterCategory];
			for (const key in values) {
				const p = values[key] as ParameterData;
				if(p.id) {
					params[p.id] = p.value;
				}
			}
		}
		params.access_token = UserSession.instance.authResult;
		this.obsOverlayURL = document.location.origin+path+"?params="+btoa(JSON.stringify(params));
	}

}
</script>

<style scoped lang="less">
.paramsaccount{
	.profilePic {
		height: 4em;
		width: 4em;
		display: block;
		margin: auto;
		margin-bottom: 1em;
		border-radius: 50%;
	}
	
	.button {
		margin: auto;
		display: block;
		margin-bottom: 5px;
	}
	
	.title {
		text-align: center;
		margin-bottom: 1em;
	}

	.splitter {
		text-align: center;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;

		&:not(:first-child) {
			margin-top: 20px;
		}

		p {
			font-size: .85em;
			margin-bottom: 5px;

			.link {
				&:not(:last-child) {
					margin-right: 10px;
				}
				img {
					height: 40px;
				}
			}

			&.socials {
				margin-top: 1em;
			}
		}

		.discordBt {
			margin: .5em 0;
		}
	}
}
</style>