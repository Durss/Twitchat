<template>
	<div class="paramsobs">
		<div class="head">
			<p>Allow your mods basic control over your OBS</p>
			<p class="install">In order to work, this needs <a :href="obswsInstaller" target="_blank">OBS-websocket plugin V5</a> to be installed.</p>
		</div>

		<ToggleBlock class="block conf"
		:open="openConnectForm"
		icon="info_purple"
		title="OBS credentials">
			<transition name="fade">
				<div v-if="connectSuccess && connected" @click="connectSuccess = false" class="success">Connected with OBS</div>
			</transition>
			<ParamItem :paramData="obsPort_conf" class="row" v-if="!connected" />
			<ParamItem :paramData="obsPass_conf" class="row" v-if="!connected" />
			
			<ToggleBlock class="info" small :open="false" title="Where can i find these values?" v-if="!connected">
				After you installed OBS-Websocket, open OBS, go on "Tools => obs-websocket Settings".
				<br>
				<br>This window will open with the credentials:
				<img src="@/assets/img/obs-ws_credentials.png" alt="credentials">
			</ToggleBlock>

			<Button title="Connect" @click="connect()" class="connectBt" v-if="!connected" :loading="loading" />
			<Button title="Disconnect" @click="disconnect()" class="connectBt" v-if="connected" :loading="loading" :icon="require('@/assets/icons/cross_white.svg')" />

			<transition name="fade">
				<div v-if="connectError" @click="connectError = false" class="error">Unable to connect with OBS. Double check the port and password and make sure you installed <a href="https://github.com/obsproject/obs-websocket/releases" target="_blank">OBS-websocket plugin (v5)</a></div>
			</transition>

		</ToggleBlock>

		<ToggleBlock class="block permissions"
		v-if="connected"
		:open="false"
		icon="lock_purple"
		title="Permissions">
			<p class="info">Users allowed to use the chat commands</p>
			<OBSPermissions class="content" @update="onPermissionChange"
				v-model:mods="perms_mods"
				v-model:vips="perms_vips"
				v-model:subs="perms_subs"
				v-model:all="perms_all"
				v-model:users="perms_users"
			/>
		</ToggleBlock>

		<ToggleBlock class="block mic"
		v-if="connected"
		:open="false"
		icon="microphone_purple"
		title="Control microphone">
			<OBSAudioSourceForm />
		</ToggleBlock>

		<ToggleBlock class="block scenes"
		v-if="connected"
		:open="false"
		icon="list_purple"
		title="Control scenes">
			<OBSScenes />
		</ToggleBlock>

		<!-- <ToggleBlock class="block filters"
		v-if="connected"
		:open="false"
		icon="graphicFilters_purple"
		title="Control filters">
			<OBSFilters />
		</ToggleBlock> -->

		<ToggleBlock class="block overlay"
		v-if="connected"
		:open="true"
		icon="broadcast_purple"
		title="Twitchat triggers">
			<OBSEventsAction />
		</ToggleBlock>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import store, { ParameterData } from '@/store';
import Store from '@/store/Store';
import Config from '@/utils/Config';
import OBSWebsocket from '@/utils/OBSWebsocket';
import { watch } from '@vue/runtime-core';
import { Options, Vue } from 'vue-class-component';
import ParamItem from '../ParamItem.vue';
import OBSAudioSourceForm from './obs/OBSAudioSourceForm.vue';
import OBSPermissions from './obs/OBSPermissions.vue';
import OBSScenes from './obs/OBSScenes.vue';
import OBSEventsAction from './obs/OBSEventsAction.vue';
import OBSFilters from './obs/OBSFilters.vue';


@Options({
	props:{},
	components:{
		Button,
		ParamItem,
		OBSScenes,
		OBSFilters,
		ToggleBlock,
		OBSEventsAction,
		OBSPermissions,
		OBSAudioSourceForm,
	},
	emits:['setContent']
})
export default class ParamsOBS extends Vue {

	public loading:boolean = false;
	public connected:boolean = false;
	public connectError:boolean = false;
	public connectSuccess:boolean = false;
	public showPermissions:boolean = false;
	public openConnectForm:boolean = false;
	public obsPort_conf:ParameterData = { type:"number", value:4455, label:"OBS websocket server port", min:0, max:65535, step:1 };
	public obsPass_conf:ParameterData = { type:"password", value:"", label:"OBS websocket password" };
	public perms_mods:boolean = false;
	public perms_vips:boolean = false;
	public perms_subs:boolean = false;
	public perms_all:boolean = false;
	public perms_users:string = "";

	public get obswsInstaller():string { return Config.OBS_WEBSOCKET_INSTALLER; } 

	public mounted():void {
		const port = Store.get("obsPort");
		const pass = Store.get("obsPass");
		if(port) this.obsPort_conf.value = port;
		if(pass) this.obsPass_conf.value = pass;

		if(port && pass) {
			this.connected = OBSWebsocket.instance.connected;
			this.openConnectForm = !this.connected;
		}else{
			this.openConnectForm = true;
		}
		

		const storedPermissions = store.state.obsPermissions;
		if(storedPermissions) {
			this.perms_mods = storedPermissions.mods;
			this.perms_vips = storedPermissions.vips;
			this.perms_subs = storedPermissions.subs;
			this.perms_all = storedPermissions.all;
			this.perms_users = storedPermissions.users;
		}

		watch(()=> this.obsPort_conf.value, () => { this.paramUpdate(); })
		watch(()=> this.obsPass_conf.value, () => { this.paramUpdate(); })
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
		const connected = await OBSWebsocket.instance.connect(this.obsPort_conf.value as string, this.obsPass_conf.value as string, false);
		if(connected) {
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
		const data = {
			mods: this.perms_mods,
			vips: this.perms_vips,
			subs: this.perms_subs,
			all: this.perms_all,
			users: this.perms_users,
		}
		store.dispatch("setOBSPermissions", data);
	}

	/**
	 * Called when changing OBS credentials
	 */
	private paramUpdate():void {
		this.connected = false;
		Store.set("obsPort", this.obsPort_conf.value.toString());
		Store.set("obsPass", this.obsPass_conf.value as string);
	}
}
</script>

<style scoped lang="less">
.paramsobs{

	.head {
		text-align: center;
		margin-bottom: 20px;
		
		.install {
			font-size: .8em;
		}
	}

	.loader {
		display: block;
		margin: auto;
		margin-top: 10px;
	}

	.block:not(:first-of-type) {
		margin-top: .5em;
	}

	.block {
		.info {
			margin-bottom: 1em;
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
		}
	
		/* Enter and leave animations can use different */
		/* durations and timing functions.              */
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