<template>
	<div class="paramsobs">
		<img src="@/assets/icons/obs_purple.svg" alt="overlay icon" class="icon">

		<div class="head">
			<p>{{ $t("obs.header") }}</p>
			<p class="install">
				<i18n-t scope="global"  tag="i" keypath="obs.install">
					<template #OBS_VERSION>
						<strong>OBS v28+</strong>
					</template>
				</i18n-t>
			</p>
		</div>

		<ParamItem class="item enableBt" :paramData="param_enabled" />

		<div class="fadeHolder" :style="holderStyles">
			<ToggleBlock class="block conf"
			:open="openConnectForm"
			:icons="['info_purple']"
			:title="$t('obs.credentials_form_title')">
				<OBSConnectForm  class="connectForm" />
			</ToggleBlock>

			<ToggleBlock class="block permissions"
			v-if="connected"
			:open="false"
			:icons="['lock_purple']"
			:title="$t('obs.permissions_title')">
				<p class="info">{{ $t("obs.permissions_head") }}</p>
				<PermissionsForm class="content" v-model="permissions" />
				{{ permissions }}
			</ToggleBlock>

			<ToggleBlock class="block mic"
			v-if="connected"
			:open="false"
			:icons="['microphone_purple']"
			:title="$t('obs.microphone_title')">
				<OBSAudioSourceForm />
			</ToggleBlock>

			<ToggleBlock class="block scenes"
			v-if="connected"
			:open="false"
			:icons="['list_purple']"
			:title="$t('obs.scenes_title')">
				<OBSScenes />
			</ToggleBlock>
		</div>
	</div>
</template>

<script lang="ts">
import ToggleBlock from '@/components/ToggleBlock.vue';
import DataStore from '@/store/DataStore';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import OBSWebsocket from '@/utils/OBSWebsocket';
import { watch } from '@vue/runtime-core';
import type { StyleValue } from 'vue';
import { Component, Vue } from 'vue-facing-decorator';
import ParamItem from '../ParamItem.vue';
import OBSAudioSourceForm from './obs/OBSAudioSourceForm.vue';
import OBSConnectForm from './obs/OBSConnectForm.vue';
import OBSScenes from './obs/OBSScenes.vue';
import PermissionsForm from '../../PermissionsForm.vue';


@Component({
	components:{
		ParamItem,
		OBSScenes,
		ToggleBlock,
		OBSConnectForm,
		PermissionsForm,
		OBSAudioSourceForm,
	},
	emits:[]
})
export default class ParamsOBS extends Vue {

	public loading = false;
	public connected = false;
	public connectError = false;
	public connectSuccess = false;
	public showPermissions = false;
	public openConnectForm = false;
	public param_enabled:TwitchatDataTypes.ParameterData = {type:"boolean", label:"Enabled", value:false};
	public obsPort_conf:TwitchatDataTypes.ParameterData = { type:"number", value:4455, label:"OBS websocket server port", min:0, max:65535, step:1, fieldName:"obsport" };
	public obsPass_conf:TwitchatDataTypes.ParameterData = { type:"password", value:"", label:"OBS websocket password", fieldName:"obspass" };
	public obsIP_conf:TwitchatDataTypes.ParameterData = { type:"string", value:"127.0.0.1", label:"OBS local IP", fieldName:"obsip" };
	public permissions:TwitchatDataTypes.PermissionsData = {
		broadcaster:true,
		mods: false,
		vips: false,
		subs: false,
		all: false,
		follower:true,
		follower_duration_ms:0,
		usersAllowed:[],
		usersRefused:[],
	}

	public get obswsInstaller():string { return Config.instance.OBS_WEBSOCKET_INSTALLER; }

	public get holderStyles():StyleValue {
		return {
			opacity:this.param_enabled.value === true? 1 : .5,
			pointerEvents:this.param_enabled.value === true? "all" : "none",
		};
	}

	public mounted():void {
		const port = DataStore.get(DataStore.OBS_PORT);
		const pass = DataStore.get(DataStore.OBS_PASS);
		const ip = DataStore.get(DataStore.OBS_IP);

		if(port != undefined) this.obsPort_conf.value = port;
		if(pass != undefined) this.obsPass_conf.value = pass;
		if(ip != undefined) this.obsIP_conf.value = ip;

		if(port != undefined || pass != undefined || ip != undefined) {
			this.connected = OBSWebsocket.instance.connected;
			this.openConnectForm = !this.connected;
		}else{
			this.openConnectForm = true;
		}
		
		this.param_enabled.value = this.$store("obs").connectionEnabled ?? false;

		const storedPermissions = this.$store("obs").commandsPermissions;
		this.permissions = JSON.parse(JSON.stringify(storedPermissions));//Clone object to break ref

		watch(()=> this.param_enabled.value, () => { this.paramUpdate(); })
		watch(()=> this.obsPort_conf.value, () => { this.paramUpdate(); })
		watch(()=> this.obsPass_conf.value, () => { this.paramUpdate(); })
		watch(()=> this.obsIP_conf.value, () => { this.paramUpdate(); })
		watch(()=> this.permissions, () => { this.onPermissionChange(); }, { deep:true })
		watch(()=> OBSWebsocket.instance.connected, () => { 
			this.connected = OBSWebsocket.instance.connected;
			if(!this.connected) this.openConnectForm = true;
		});
	}

	/**
	 * Connect to OBS websocket
	 */
	public async connect():Promise<void> {
		this.loading = true;
		this.connectSuccess = false;
		this.connectError = false;
		const connected = await OBSWebsocket.instance.connect(
							(this.obsPort_conf.value as number).toString(),
							this.obsPass_conf.value as string,
							false,
							this.obsIP_conf.value as string
						);
		if(connected) {
			this.paramUpdate();
			this.connected = true;
			this.connectSuccess = true;
			setTimeout(()=> {
				this.connectSuccess = false;
				this.openConnectForm = false;
			}, 3000);
		}else{
			this.connectError = true;
		}
		this.loading = false;
	}

	public async disconnect():Promise<void> {
		OBSWebsocket.instance.disconnect();
	}

	/**
	 * Called when changing commands permisions
	 */
	public async onPermissionChange():Promise<void> {
		this.$store("obs").setObsCommandsPermissions(this.permissions);
	}

	/**
	 * Called when changing OBS credentials
	 */
	private paramUpdate():void {
		this.connected = false;
		this.$store("obs").connectionEnabled = this.param_enabled.value as boolean;
		DataStore.set(DataStore.OBS_PORT, this.obsPort_conf.value);
		DataStore.set(DataStore.OBS_PASS, this.obsPass_conf.value);
		DataStore.set(DataStore.OBS_IP, this.obsIP_conf.value);
		DataStore.set(DataStore.OBS_CONNECTION_ENABLED, this.param_enabled.value);
		if(!this.param_enabled.value) {
			OBSWebsocket.instance.disconnect();
		}
	}
}
</script>

<style scoped lang="less">
.paramsobs{
	.parameterContent();

	.loader {
		display: block;
		margin: auto;
		margin-top: 10px;
	}

	.block:not(:first-of-type) {
		margin-top: .5em;
	}
	.block:first-of-type {
		margin-top: 1em;
	}

	.fadeHolder {
		transition: opacity .2s;
	}
	
	.install {
		margin-top: 1em;
		font-size: .8em;
	}

	.block {
		.info {
			margin-bottom: 1em;
		}
		.warn {
			font-style: italic;
			color: @mainColor_alert;
		}
		&.permissions {
			.info {
				text-align: center;
				margin-bottom: .5em;
			}
			.content {
				width: 300px;
			}
		}
	}

	.conf {
		display: flex;
		flex-direction: column;
		
		.info {
			margin-bottom: 1em;
		}

		.connectBt {
			display: block;
			margin: auto;
		}

		.error, .success {
			justify-self: center;
			color: @mainColor_light;
			display: block;
			text-align: center;
			padding: 5px;
			border-radius: 5px;
			margin: auto;
			margin-top: 10px;

			&.error {
				background-color: @mainColor_alert;
			}

			&.success {
				background-color: #1c941c;
				margin-top: 0px;
				margin-bottom: 10px;
			}
			
			a {
				color: @mainColor_light;
			}

			div:not(:last-child) {
				margin-bottom: 1em;
			}
			:deep(strong) {
				background-color: @mainColor_light;
				color: @mainColor_alert;
				padding: 0 0.25em;
				border-radius: 0.25em;
			}
		}
	
		.fade-enter-active {
			transition: all 0.2s;
		}

		.fade-leave-active {
			transition: all 0.2s;
		}

		.fade-enter-from,
		.fade-leave-to {
			opacity: 0;
			transform: translateY(-10px);
		}
	}

	:deep(input) {
		min-width: 100px;
		//These lines seems stupide AF but they allow the input
		//to autosize to it's min length
		width: 0%;
		flex-grow: 1;
		max-width: 100px;

		text-align: center;
		
		//Hide +/- arrows
		&::-webkit-outer-spin-button,
		&::-webkit-inner-spin-button {
			display: none;
		}
	}
}
</style>