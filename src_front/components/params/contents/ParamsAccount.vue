<template>
	<div class="paramsaccount">
		
		<section class="profilePic">
			<img :src="userPP" alt="profile pic">
		</section>
		<section class="head">
			<div v-html="$t('account.connected_as', {USER:'<strong>'+userName+'</strong>'})"></div>
		</section>
		
		<section class="scopes">
			<div class="title"><img src="@/assets/icons/lock_fit.svg">{{$t("account.authorization")}}</div>
			
			<ScopeSelector @update="onScopesUpdate" />

			<Button class="authorizeBt"
				type="link"
				:href="oAuthURL"
				:title="$t('login.authorizeBt')"
				v-if="showAuthorizeBt"
				bounce
				:loading="generatingCSRF"
				v-tooltip="generatingCSRF? $t('login.generatingCSRF') : ''"
				icon="twitch"
			/>
		</section>

		<section class="actions">
			<Button class="button" @click="latestUpdates()" :title="$t('account.updatesBt')" icon="new" bounce />
			<Button class="button" @click="logout()" :title="$t('global.log_out')" icon="logout" highlight bounce />
			<Button class="button" @click="ahs()" :title="$t('account.installBt')" icon="twitchat" v-if="canInstall" />
		</section>

		<section class="lang">
			<div class="title">{{ $t('account.language') }}</div>
			<AppLangSelector />
		</section>

		<section v-if="isDonor" class="donorHolder">
			<DonorState class="donorBadge" />
			<div class="badgesList">
				<img src="@/assets/icons/donor_placeholder.svg" class="badge" v-for="i in 9-donorLevel" />
				<DonorState class="badge" v-for="i in donorLevel+1" :level="(donorLevel+1)-i" light />
			</div>

			<img src="@/assets/loader/loader.svg" alt="loader" v-if="!publicDonation_loaded">
			<ParamItem class="param toggle" v-if="publicDonation_loaded" :paramData="$store('account').publicDonation" v-model="publicDonation" />
			<i18n-t scope="global" class="infos" tag="div" v-if="publicDonation_loaded" keypath="account.donation_public">
				<template #LINK>
					<a @click="$store('params').openParamsPage(contentAbout)">{{ $t("account.about_link") }}.</a>
				</template>
			</i18n-t>
		</section>
		
		<section class="dataSync">
			<ParamItem class="param" :paramData="$store('account').syncDataWithServer" v-model="syncEnabled" />
			<Button class="button" v-if="!syncEnabled" @click="eraseData()" bounce :title="$t('account.erase_dataBt')" highlight icon="delete" />
		</section>
	</div>
</template>

<script lang="ts">
import ToggleBlock from '@/components/ToggleBlock.vue';
import DataStore from '@/store/DataStore';
import StoreProxy from '@/store/StoreProxy';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import OBSWebsocket from '@/utils/OBSWebsocket';
import TriggerActionHandler from '@/utils/triggers/TriggerActionHandler';
import TTSUtils from '@/utils/TTSUtils';
import VoicemodWebSocket from '@/utils/voice/VoicemodWebSocket';
import { watch } from '@vue/runtime-core';
import { Component, Vue } from 'vue-facing-decorator';
import Button from '../../Button.vue';
import DonorState from "../../user/DonorState.vue";
import ParamItem from '../ParamItem.vue';
import AppLangSelector from '@/components/AppLangSelector.vue';
import ScopeSelector from '@/components/login/ScopeSelector.vue';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import type IParameterContent from './IParameterContent';

@Component({
	components:{
		Button,
		ParamItem,
		DonorState,
		ToggleBlock,
		ScopeSelector,
		AppLangSelector,
	},
	emits:[],
})
export default class ParamsAccount extends Vue implements IParameterContent {

	public oAuthURL = "";
	public showObs = false;
	public disposed = false;
	public showCredits = true;
	public syncEnabled = false;
	public publicDonation = false;
	public showAuthorizeBt = false;
	public showSuggestions = false;
	public publicDonation_loaded = false;
	public scopes:string[] = [];
	public generatingCSRF = false;
	public authenticating = false;
	public CSRFToken:string = "";

	public get canInstall():boolean { return this.$store("main").ahsInstaller != null; }
	public get userName():string { return StoreProxy.auth.twitch.user.displayName; }
	public get isDonor():boolean { return StoreProxy.auth.twitch.user.donor.state; }
	public get donorLevel():number { return StoreProxy.auth.twitch.user.donor.level; }
	public get contentAbout():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.ABOUT; } 
	public get userPP():string {
		let pp:string|undefined = StoreProxy.auth.twitch.user.avatarPath;
		if(!pp) {
			pp = this.$image("icons/user.svg");
		}
		return pp;
	}

	public async mounted():Promise<void> {
		this.syncEnabled = DataStore.get(DataStore.SYNC_DATA_TO_SERVER) !== "false";
		this.publicDonation = DataStore.get(DataStore.SYNC_DATA_TO_SERVER) == "true";
		watch(()=> this.syncEnabled, ()=> DataStore.set(DataStore.SYNC_DATA_TO_SERVER, this.syncEnabled, false));

		if(this.isDonor) {
			//Load current anon state of the user's donation
			const options = {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					"Authorization": "Bearer "+StoreProxy.auth.twitch.access_token,
					'App-Version': import.meta.env.PACKAGE_VERSION,
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

	public onNavigateBack(): boolean { return false; }

	public logout():void {
		this.$store("auth").logout();
		this.$router.push({name:'logout'});
	}

	public latestUpdates():void {
		this.$store("params").closeParameters();
		this.$store("chat").sendTwitchatAd(TwitchatDataTypes.TwitchatAdTypes.UPDATES);
	}

	public ahs():void {
		const ahsInstaller = this.$store("main").ahsInstaller;
		if(!ahsInstaller) return;
		// Show the prompt
		ahsInstaller.prompt();
	}

	public eraseData():void {
		this.$store("main").confirm(this.$t('account.erase_confirm_title'), this.$t('account.erase_confirm_description'))
		.then(()=>{
			DataStore.clear(true);
			this.$store("params").$reset();
			this.$store("automod").$reset();
			this.$store("emergency").$reset();
			this.$store("music").$reset();
			this.$store("obs").$reset();
			this.$store("triggers").$reset();
			this.$store("tts").$reset();
			this.$store("voice").$reset();
			OBSWebsocket.instance.disconnect();
			VoicemodWebSocket.instance.disconnect();
			TTSUtils.instance.enabled = false;
			TriggerActionHandler.instance.populate([]);
			DataStore.set(DataStore.SYNC_DATA_TO_SERVER, false);
		})
	}

	public async generateCSRF():Promise<void> {
		this.generatingCSRF = true;
		this.showAuthorizeBt = true;
		try {
			const headers = {
				'App-Version': import.meta.env.PACKAGE_VERSION,
			};
			const res = await fetch(Config.instance.API_PATH+"/auth/CSRFToken", {method:"GET", headers});
			const json = await res.json();
			this.CSRFToken = json.token;
		}catch(e) {
			this.$store("main").alert(this.$t("error.csrf_failed"));
		}
		this.generatingCSRF = false;
	}

	public async onScopesUpdate(list:string[]):Promise<void> {
		await this.generateCSRF();
		this.scopes = list;
		this.oAuthURL = TwitchUtils.getOAuthURL(this.CSRFToken, this.scopes);
	}

	private async updateDonationState():Promise<void> {
		try {
			const options = {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Authorization": "Bearer "+StoreProxy.auth.twitch.access_token,
					'App-Version': import.meta.env.PACKAGE_VERSION,
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
	.parameterContent();
	align-items: center;

	.profilePic {
		img {
			height: 5em;
			width: 5em;
			display: block;
			border-radius: 50%;
		}
		margin: auto;
		padding: .5em;
		border-top-left-radius: 50%;
		border-top-right-radius: 50%;
		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;
		background-color: fade(@mainColor_normal_extralight, 30%);
	}

	.head {
		margin-top: 0;
	}
	
	.button {
		display: block;
	}
	
	.title {
		text-align: center;
		font-weight: bold;
		margin-bottom: .5em;
		img {
			height: 1em;
			margin-right: .5em;
			vertical-align: text-top;
		}
	}

	.donorHolder {
		display: flex;
		flex-direction: column;
		align-items: center;
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

	.actions {
		display: flex;
		flex-direction: column;
		align-items: center;
		&>*:not(:first-child) {
			margin-top: .5em;
		}
	}


	.scopes {
		max-width: 400px;

		.title {
			margin-bottom: 0;
		}

		.authorizeBt {
			margin-top: .5em;
		}
	}

	.dataSync {
		display: flex;
		flex-direction: column;
		align-items: center;
		&>*:not(:first-child) {
			margin-top: .5em;
		}
	}

}
</style>