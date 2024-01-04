<template>
	<div class="paramsaccount parameterContent">
		
		<section class="profilePic">
			<img :src="userPP" alt="profile pic">
		</section>

		<section class="card-itemhead">
			<div v-html="$t('account.connected_as', {USER:'<strong>'+userName+'</strong>'})"></div>
		</section>

		<section class="card-item actions">
			<TTButton class="button" @click="logout()" icon="logout" alert>{{ $t('global.log_out') }}</TTButton>
			<TTButton class="button" @click="latestUpdates()" icon="update">{{ $t('account.updatesBt') }}</TTButton>
			<TTButton class="button" @click="ahs()" icon="twitchat" v-if="canInstall">{{ $t('account.installBt') }}</TTButton>
		</section>
		
		<section class="card-item actions">
			<ParamsAccountPatreon />
		</section>
		
		<section class="card-item scopes">
			<div class="title"><Icon name="lock_fit" class="icon" />{{$t("account.authorization")}}</div>
			
			<ScopeSelector @update="onScopesUpdate" />

			<TTButton class="authorizeBt"
				type="link" primary
				:href="oAuthURL"
				v-if="showAuthorizeBt"
				:loading="generatingCSRF"
				v-tooltip="generatingCSRF? $t('login.generatingCSRF') : ''"
				icon="twitch">{{ $t('login.authorizeBt') }}</TTButton>
		</section>

		<section class="card-item">
			<div class="title">{{ $t('account.language') }}</div>
			<AppLangSelector />
		</section>

		<section v-if="isDonor" class="card-item donorState">
			<DonorState />
		</section>
		
		<section class="card-item dataSync">
			<ParamItem class="param" :paramData="$store.account.syncDataWithServer" v-model="syncEnabled" noBackground />
			<TTButton class="button" v-if="!syncEnabled" @click="eraseData()" alert icon="delete">{{ $t('account.erase_dataBt') }}</TTButton>
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
import TTButton from '../../TTButton.vue';
import ParamItem from '../ParamItem.vue';
import AppLangSelector from '@/components/AppLangSelector.vue';
import ScopeSelector from '@/components/login/ScopeSelector.vue';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import type IParameterContent from './IParameterContent';
import DonorState from '@/components/user/DonorState.vue';
import ParamsAccountPatreon from './account/ParamsAccountPatreon.vue';
import ApiController from '@/utils/ApiController';

@Component({
	components:{
		TTButton,
		ParamItem,
		DonorState,
		ToggleBlock,
		ScopeSelector,
		AppLangSelector,
		ParamsAccountPatreon,
	},
	emits:[],
})
export default class ParamsAccount extends Vue implements IParameterContent {

	public oAuthURL = "";
	public showObs = false;
	public disposed = false;
	public showCredits = true;
	public syncEnabled = false;
	public showAuthorizeBt = false;
	public showSuggestions = false;
	public publicDonation_loaded = false;
	public scopes:string[] = [];
	public generatingCSRF = false;
	public authenticating = false;
	public CSRFToken:string = "";

	public get canInstall():boolean { return this.$store.main.ahsInstaller != null; }
	public get userName():string { return StoreProxy.auth.twitch.user.displayName; }
	public get isDonor():boolean { return StoreProxy.auth.twitch.user.donor.state || this.$store.auth.isPremium; }
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
		watch(()=> this.syncEnabled, ()=> DataStore.set(DataStore.SYNC_DATA_TO_SERVER, this.syncEnabled, false));
	}

	public beforeUnmount():void {
		this.disposed = true;
	}

	public onNavigateBack(): boolean { return false; }

	public logout():void {
		this.$store.auth.logout();
		this.$router.push({name:'logout'});
	}

	public latestUpdates():void {
		this.$store.params.closeParameters();
		this.$store.params.openModal("updates");
		// this.$store.chat.sendTwitchatAd(TwitchatDataTypes.TwitchatAdTypes.UPDATES);
	}

	public ahs():void {
		const ahsInstaller = this.$store.main.ahsInstaller;
		if(!ahsInstaller) return;
		// Show the prompt
		ahsInstaller.prompt();
	}

	public eraseData():void {
		this.$store.main.confirm(this.$t('account.erase_confirm_title'), this.$t('account.erase_confirm_description'))
		.then(()=>{
			DataStore.clear(true);
			this.$store.params.$reset();
			this.$store.automod.$reset();
			this.$store.emergency.$reset();
			this.$store.music.$reset();
			this.$store.obs.$reset();
			this.$store.triggers.$reset();
			this.$store.tts.$reset();
			this.$store.voice.$reset();
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
			const {json} = await ApiController.call("auth/CSRFToken", "GET");
			this.CSRFToken = json.token;
		}catch(e) {
			this.$store.main.alert(this.$t("error.csrf_failed"));
		}
		this.generatingCSRF = false;
	}

	public async onScopesUpdate(list:string[]):Promise<void> {
		await this.generateCSRF();
		this.scopes = list;
		this.oAuthURL = TwitchUtils.getOAuthURL(this.CSRFToken, this.scopes);
	}

}
</script>

<style scoped lang="less">
.paramsaccount{
	.profilePic {
		.emboss();
		overflow: hidden;
		border-radius: 50%;
		img {
			height: 5em;
			width: 5em;
			transition: all .25s;
		}
		&:hover {
			img {
				height: 10em;
				width: 10em;
			}
		}
	}

	.head {
		margin-top: 0;
	}
	
	.title {
		text-align: center;
		font-weight: bold;
		.icon {
			height: 1em;
			margin-right: .5em;
			vertical-align: text-top;
		}
	}

	.actions {
		align-items: center;
	}

	.donorState {
		overflow: visible;
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
		align-items: center;
	}

}
</style>