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

		<section class="card-item">
			<div class="title">{{ $t('account.language') }}</div>
			<AppLangSelector />
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

		<section v-if="$store.auth.donorLevel > -1" class="card-item donorState">
			<DonorState />
		</section>
		
		<section class="card-item dataSync">
			<ParamItem class="param" :paramData="$store.account.syncDataWithServer" v-model="syncEnabled" noBackground />
			<TTButton class="button" v-if="!syncEnabled" @click="eraseData()" alert icon="delete">{{ $t('account.erase_dataBt') }}</TTButton>
		</section>
		
		<section class="card-item dataShare">
			<i18n-t tag="p" scope="global" keypath="account.share.info">
				<template #USER>
					<strong>{{ $store.auth.twitch.user.displayNameOriginal }}</strong>
				</template>
			</i18n-t>
			<TTButton icon="twitch" class="button" @click="startParamsShareFlow()" :loading="connecting">{{ $t('account.share.connectBt') }}</TTButton>

			<template v-if="sharedUsers.length > 0">
				<Splitter>{{ $t("account.share.sharingList") }}</Splitter>
				<div class="card-item alert" v-if="unlinkError" @click="unlinkError = false">{{ $t("account.share.unlink_fail") }}</div>
				<div class="card-item sharedUser" v-for="user in sharedUsers" :key="user.id">
					<Icon name="loader" v-if="user.temporary" />
					<template v-else>
						<img :src="user.avatarPath" alt="avatar" class="avatar">
						<span>{{ user.displayNameOriginal }}</span>
						<TTButton @click="unlink(user)" icon="cross" small alert>{{ $t("account.share.unlinkBt") }}</TTButton>
					</template>
				</div>
			</template>
		</section>
	</div>
</template>

<script lang="ts">
import ToggleBlock from '@/components/ToggleBlock.vue';
import DataStore from '@/store/DataStore';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import OBSWebsocket from '@/utils/OBSWebsocket';
import TriggerActionHandler from '@/utils/triggers/TriggerActionHandler';
import TTSUtils from '@/utils/TTSUtils';
import VoicemodWebSocket from '@/utils/voice/VoicemodWebSocket';
import { watch } from '@vue/runtime-core';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import TTButton from '../../TTButton.vue';
import ParamItem from '../ParamItem.vue';
import AppLangSelector from '@/components/AppLangSelector.vue';
import ScopeSelector from '@/components/login/ScopeSelector.vue';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import type IParameterContent from './IParameterContent';
import DonorState from '@/components/user/DonorState.vue';
import ParamsAccountPatreon from './account/ParamsAccountPatreon.vue';
import ApiHelper from '@/utils/ApiHelper';
import Splitter from '@/components/Splitter.vue';

@Component({
	components:{
		Splitter,
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
class ParamsAccount extends Vue implements IParameterContent {

	public oAuthURL = "";
	public showObs = false;
	public disposed = false;
	public showCredits = true;
	public connecting = false;
	public syncEnabled = false;
	public unlinkError = false;
	public showAuthorizeBt = false;
	public showSuggestions = false;
	public publicDonation_loaded = false;
	public scopes:string[] = [];
	public generatingCSRF = false;
	public authenticating = false;
	public CSRFToken:string = "";
	public sharedUsers:TwitchatDataTypes.TwitchatUser[] = [];

	public get canInstall():boolean { return this.$store.main.ahsInstaller != null; }
	public get userName():string { return this.$store.auth.twitch.user.displayName; }
	public get contentAbout():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.ABOUT; } 
	public get userPP():string {
		let pp:string|undefined = this.$store.auth.twitch.user.avatarPath;
		if(!pp) {
			pp = this.$asset("icons/user.svg");
		}
		return pp;
	}

	public async mounted():Promise<void> {
		this.syncEnabled = DataStore.get(DataStore.SYNC_DATA_TO_SERVER) !== "false";
		watch(()=> this.syncEnabled, ()=> DataStore.set(DataStore.SYNC_DATA_TO_SERVER, this.syncEnabled, false));
		this.updateSharedUserList();
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
			this.$store.obs.$reset();
			this.$store.qna.$reset();
			this.$store.tts.$reset();
			this.$store.poll.$reset();
			this.$store.chat.$reset();
			this.$store.heat.$reset();
			this.$store.kofi.$reset();
			this.$store.voice.$reset();
			this.$store.music.$reset();
			this.$store.lumia.$reset();
			this.$store.users.$reset();
			this.$store.raffle.$reset();
			this.$store.labels.$reset();
			this.$store.stream.$reset();
			this.$store.params.$reset();
			this.$store.values.$reset();
			this.$store.tipeee.$reset();
			this.$store.discord.$reset();
			this.$store.automod.$reset();
			this.$store.triggers.$reset();
			this.$store.counters.$reset();
			this.$store.bingoGrid.$reset();
			this.$store.emergency.$reset();
			this.$store.streamlabs.$reset();
			this.$store.prediction.$reset();
			this.$store.donationGoals.$reset();
			this.$store.streamelements.$reset();
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
			const {json} = await ApiHelper.call("auth/CSRFToken", "GET");
			this.CSRFToken = json.token;
		}catch(e) {
			this.$store.common.alert(this.$t("error.csrf_failed"));
		}
		this.generatingCSRF = false;
	}

	public async onScopesUpdate(list:string[]):Promise<void> {
		await this.generateCSRF();
		this.scopes = list;
		this.oAuthURL = TwitchUtils.getOAuthURL(this.CSRFToken, this.scopes);
	}

	public async startParamsShareFlow():Promise<void> {
		this.connecting = true;
		const {json} = await ApiHelper.call("auth/CSRFToken", "GET", {withRef:true});
		this.CSRFToken = json.token;
		document.location.href = TwitchUtils.getOAuthURL(this.CSRFToken, this.scopes);
		window.setTimeout(()=>{
			this.connecting = false;
		}, 10000);
	}

	public unlink(user:TwitchatDataTypes.TwitchatUser):void {
		this.unlinkError = false;
		this.$confirm(this.$t("account.share.unlink_confirm.title"),
		this.$t("account.share.unlink_confirm.description"))
		.then(async ()=>{
			const res = await ApiHelper.call("auth/dataShare", "DELETE", {uid:user.id});
			if(res.status == 200) {
				this.$store.auth.dataSharingUserList = res.json.users || [];
				this.updateSharedUserList();
			}else{
				this.unlinkError = true;
			}
			//DO unlink
		}).catch(()=>{});
	}

	private updateSharedUserList():void {
		this.sharedUsers = [];
		this.$store.auth.dataSharingUserList.forEach(uid => {
			this.sharedUsers.push( this.$store.users.getUserFrom("twitch", this.$store.auth.twitch.user.id, uid) );
		});
	}

}
export default toNative(ParamsAccount);
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

	.dataSync, .dataShare {
		line-height: 1.25em;
		align-items: center;
		text-align: center;
		white-space: pre-line;
	}

	.splitter {
		width: 100%;
		margin-top: 1em;
		margin-bottom: .5em;
	}

	.sharedUser {
		gap: .5em;
		display: flex;
		flex-direction: row;
		align-items: center;
		.avatar {
			height: 2em;
			border-radius: 50%;
		}
	}

}
</style>