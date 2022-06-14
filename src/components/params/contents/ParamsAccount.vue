<template>
	<div class="paramsaccount">
		<img src="@/assets/icons/user_purple.svg" alt="overlay icon" class="icon">

		<div class="title">Connected as <strong>{{$store.state.user.login}}</strong></div>

		<Button class="button" v-if="canInstall" @click="ahs()" title="Add Twitchat to home screen" :icon="getImage('assets/icons/twitchat.svg')" />
		<Button class="button logoutBt" @click="logout()" bounce title="Logout" highlight :icon="getImage('assets/icons/logout.svg')" />
		
	</div>
</template>

<script lang="ts">
import ToggleBlock from '@/components/ToggleBlock.vue';
import router from '@/router';
import store  from '@/store';
import type { ParameterCategory, ParameterData } from '@/store';
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

	public obsOverlayURL:string = "";
	public showSuggestions:boolean = false;
	public showObs:boolean = false;
	public showCredits:boolean = true;
	public getImage(path:string):string { return new URL(`/src/${path}`, import.meta.url).href; }

	public get canInstall():boolean { return store.state.ahsInstaller != null || true; }

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
		let path = router.resolve({name:'chatLight', params:{login:store.state.user.login}}).href;
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
		params.access_token = store.state.oAuthToken;
		this.obsOverlayURL = document.location.origin+path+"?params="+btoa(JSON.stringify(params));
	}

}
</script>

<style scoped lang="less">
.paramsaccount{
	.icon {
		height: 4em;
		display: block;
		margin: auto;
		margin-bottom: 1em;
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