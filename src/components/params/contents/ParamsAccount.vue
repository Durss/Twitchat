<template>
	<div class="paramsaccount">
		<img :src="userPP" alt="profile pic" class="profilePic">

		<div class="title">Connected as <strong>{{userName}}</strong></div>

		<ParamItem class="param" :paramData="$store.state.accountParams.syncDataWithServer" v-model="syncEnabled" />

		<DonorState v-if="isDonor" />

		<Button class="button" v-if="canInstall" @click="ahs()" title="Add Twitchat to home screen" :icon="$image('icons/twitchat.svg')" />
		<Button class="button logoutBt" @click="logout()" bounce title="Logout" highlight :icon="$image('icons/logout.svg')" />
	</div>
</template>

<script lang="ts">
import ToggleBlock from '@/components/ToggleBlock.vue';
import Store from '@/store/Store';
import StoreProxy from '@/utils/StoreProxy';
import UserSession from '@/utils/UserSession';
import { watch } from '@vue/runtime-core';
import { Options, Vue } from 'vue-class-component';
import Button from '../../Button.vue';
import DonorState from "../../user/DonorState.vue";
import ParamItem from '../ParamItem.vue';

@Options({
	props:{},
	components:{
		Button,
		ParamItem,
		DonorState,
		ToggleBlock,
	}
})
export default class ParamsAccount extends Vue {

	public showSuggestions = false;
	public showObs = false;
	public disposed = false;
	public showCredits = true;
	public syncEnabled = false;

	public get canInstall():boolean { return StoreProxy.store.state.ahsInstaller != null || true; }
	public get userName():string { return UserSession.instance.authToken.login; }
	public get isDonor():boolean { return UserSession.instance.isDonor; }
	public get userPP():string {
		let pp:string|undefined = UserSession.instance.user?.profile_image_url;
		if(!pp) {
			pp = this.$image("icons/user_purple.svg");
		}
		return pp;
	}

	public logout():void {
		StoreProxy.store.dispatch('logout');
		this.$router.push({name:'logout'});
	}

	public mounted():void {
		this.syncEnabled = Store.get(Store.SYNC_DATA_TO_SERVER) == "true";
		watch(()=> this.syncEnabled, ()=> Store.set(Store.SYNC_DATA_TO_SERVER, this.syncEnabled, false));
	}

	public beforeUnmount():void {
		this.disposed = true;
	}

	public ahs():void {
		if(!StoreProxy.store.state.ahsInstaller) return;
		// Show the prompt
		StoreProxy.store.state.ahsInstaller.prompt();
		// // Wait for the user to respond to the prompt
		// StoreProxy.store.state.ahsInstaller.userChoice.then((choiceResult) => {
		// 	this.canInstall = false;
		// })
	}
}
</script>

<style scoped lang="less">
.paramsaccount{
	display: flex;
	flex-direction: column;
	align-items: center;
	&>* {
		margin-bottom: 1em;
	}

	.profilePic {
		height: 4em;
		width: 4em;
		display: block;
		border-radius: 50%;
	}
	
	.button {
		display: block;
	}
	
	.title {
		text-align: center;
	}

	.param {
		width: 300px;
	}
}
</style>