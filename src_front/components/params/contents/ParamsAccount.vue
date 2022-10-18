<template>
	<div class="paramsaccount">
		<img :src="userPP" alt="profile pic" class="profilePic">

		<div class="title">Connected as <strong>{{userName}}</strong></div>

		<ParamItem class="param" :paramData="$store('account').syncDataWithServer" v-model="syncEnabled" />

		<div v-if="isDonor" class="donorHolder">
			<DonorState class="donorBadge" />
			<div class="badgesList">
				<img src="@/assets/icons/donor_placeholder.svg" class="badge" v-for="i in 9-donorLevel" />
				<DonorState class="badge" v-for="i in donorLevel+1" :level="(donorLevel+1)-i" light />
			</div>

			<img src="@/assets/loader/loader.svg" alt="loader" v-if="!publicDonation_loaded">
			<ParamItem class="param toggle" v-if="publicDonation_loaded" :paramData="$store('account').publicDonation" v-model="publicDonation" />
			<div class="infos" v-if="publicDonation_loaded">Makes your login visible by everyone on the donor list under <a @click="$emit('setContent', contentAbout)">About section</a>.</div>
		</div>

		<Button class="button" v-if="canInstall" @click="ahs()" title="Add Twitchat to home screen" :icon="$image('icons/twitchat.svg')" />
		<Button class="button logoutBt" @click="logout()" bounce title="Logout" highlight :icon="$image('icons/logout.svg')" />
	</div>
</template>

<script lang="ts">
import ToggleBlock from '@/components/ToggleBlock.vue';
import DataStore from '@/store/DataStore';
import StoreProxy from '@/store/StoreProxy';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
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
	},
	emits:["setContent"],
})
export default class ParamsAccount extends Vue {

	public showSuggestions = false;
	public showObs = false;
	public disposed = false;
	public showCredits = true;
	public syncEnabled = false;
	public publicDonation = false;
	public publicDonation_loaded = false;

	public get canInstall():boolean { return this.$store("main").ahsInstaller != null || true; }
	public get userName():string { return StoreProxy.auth.twitch.user.displayName; }
	public get isDonor():boolean { return StoreProxy.auth.twitch.user.donor.state; }
	public get donorLevel():number { return StoreProxy.auth.twitch.user.donor.level; }
	public get contentAbout():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsContentType.ABOUT; } 
	public get userPP():string {
		let pp:string|undefined = StoreProxy.auth.twitch.user.avatarPath;
		if(!pp) {
			pp = this.$image("icons/user_purple.svg");
		}
		return pp;
	}

	public logout():void {
		this.$store("auth").logout();
		this.$router.push({name:'logout'});
	}

	public async mounted():Promise<void> {
		this.syncEnabled = DataStore.get(DataStore.SYNC_DATA_TO_SERVER) == "true";
		this.publicDonation = DataStore.get(DataStore.SYNC_DATA_TO_SERVER) == "true";
		watch(()=> this.syncEnabled, ()=> DataStore.set(DataStore.SYNC_DATA_TO_SERVER, this.syncEnabled, false));

		if(this.isDonor) {
			//Load current anon state of the user's donation
			const options = {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					"Authorization": "Bearer "+StoreProxy.auth.twitch.access_token,
				},
			}
			try {
				const anonState = await fetch(Config.instance.API_PATH+"/user/donor/anon", options);
				const json = await anonState.json();
				if(json.success === true) {
					this.publicDonation = json.data.public === true;
				}
			}catch(error) {
			}
			this.publicDonation_loaded = true;
	
			watch(()=> this.publicDonation, async ()=> this.updateDonationState());
		}
	}

	public beforeUnmount():void {
		this.disposed = true;
	}

	public ahs():void {
		const ahsInstaller = this.$store("main").ahsInstaller;
		if(!ahsInstaller) return;
		// Show the prompt
		ahsInstaller.prompt();
	}

	private async updateDonationState():Promise<void> {
		try {
			const options = {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Authorization": "Bearer "+StoreProxy.auth.twitch.access_token,
				},
				body: JSON.stringify({
					public:this.publicDonation,
				})
			}
			const anonState = await fetch(Config.instance.API_PATH+"/user/donor/anon", options);
			const json = await anonState.json();
			this.publicDonation = json.data.public !== true;
		}catch(error) {
		}
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

	.donorHolder {
		display: flex;
		flex-direction: column;
		align-items: center;
		border: 1px solid @mainColor_normal;
		background-color: fade(@mainColor_normal, 10%);
		border-radius: 1em;
		// max-width: 420px;
		padding: 1em 0;
		.donorBadge {
			margin-top: 1em;
		}
	
		.badgesList {
			margin-top: .5em;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			justify-content: center;
			width: 80%;
			.badge {
				margin: .25em;
				height: 3em;
			}
		}
		
		.toggle {
			margin-top: 1em;
		}

		.infos {
			margin-top: .25em;
			max-width: 300px;
			font-size: .8em;
		}
	}

}
</style>