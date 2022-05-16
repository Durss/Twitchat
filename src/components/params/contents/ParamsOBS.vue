<template>
	<div class="paramsobs">
		<div class="head">
			<p>Create your own twitch alerts and allow your mods basic control over your OBS</p>
			<p class="install">In order to work, this needs <strong>OBS v27.2+</strong> and <a :href="obswsInstaller" target="_blank">OBS-websocket&nbsp;plugin&nbsp;V5</a><i>(scroll to bottom)</i> to be installed.</p>
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
			<ParamItem :paramData="obsIP_conf" class="row" v-if="!connected" />
			
			<ToggleBlock class="info" small :open="false" title="Where can i find these values?" v-if="!connected">
				After you installed OBS-Websocket, open OBS, go on "Tools => obs-websocket Settings".
				<br>
				<br>This window will open with the credentials:
				<br><span class="warn">You'll probably want to leave the IP to <strong>127.0.0.1</strong>!</span>
				<img src="@/assets/img/obs-ws_credentials.png" alt="credentials">
			</ToggleBlock>

			<Button title="Connect" @click="connect()" class="connectBt" v-if="!connected" :loading="loading" />
			<Button title="Disconnect" @click="disconnect()" class="connectBt" v-if="connected" :loading="loading" :icon="require('@/assets/icons/cross_white.svg')" />

			<transition name="fade">
				<div v-if="connectError" @click="connectError = false" class="error">
					<div>Unable to connect with OBS. Double check the port and password and make sure you installed <a :href="obswsInstaller" target="_blank">OBS-websocket plugin (v5)</a></div>
					<div v-if="obsIP_conf.value != '127.0.0.1'">You may want to set the IP to <strong>127.0.0.1</strong> instead of what OBS shows you</div>
				</div>
			</transition>

		</ToggleBlock>

		<ToggleBlock class="block permissions"
		v-if="connected"
		:open="false"
		icon="lock_purple"
		title="Permissions">
			<p class="info">Users allowed to use the chat commands</p>
			<OBSPermissions class="content" @update="onPermissionChange"
				v-model:mods="permissions.mods"
				v-model:vips="permissions.vips"
				v-model:subs="permissions.subs"
				v-model:all="permissions.all"
				v-model:users="permissions.users"
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
import store, { ParameterData, PermissionsData } from '@/store';
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
	public obsIP_conf:ParameterData = { type:"text", value:"127.0.0.1", label:"OBS local IP" };
	public permissions:PermissionsData = {
		mods: false,
		vips: false,
		subs: false,
		all: false,
		users: ""
	}

	public get obswsInstaller():string { return Config.OBS_WEBSOCKET_INSTALLER; } 

	public mounted():void {
		const port = Store.get("obsPort");
		const pass = Store.get("obsPass");
		const ip = Store.get("obsIP");
		if(port != undefined) this.obsPort_conf.value = port;
		if(pass != undefined) this.obsPass_conf.value = pass;
		if(ip != undefined) this.obsIP_conf.value = ip;

		if(port != undefined || pass != undefined || ip != undefined) {
			this.connected = OBSWebsocket.instance.connected;
			this.openConnectForm = !this.connected;
		}else{
			this.openConnectForm = true;
		}
		

		const storedPermissions = store.state.obsPermissions;
		this.permissions.mods = storedPermissions.mods;
		this.permissions.vips = storedPermissions.vips;
		this.permissions.subs = storedPermissions.subs;
		this.permissions.all = storedPermissions.all;
		this.permissions.users = storedPermissions.users;

		watch(()=> this.obsPort_conf.value, () => { this.paramUpdate(); })
		watch(()=> this.obsPass_conf.value, () => { this.paramUpdate(); })
		watch(()=> this.obsIP_conf.value, () => { this.paramUpdate(); })
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
		store.dispatch("setOBSPermissions", this.permissions);
	}

	/**
	 * Called when changing OBS credentials
	 */
	private paramUpdate():void {
		this.connected = false;
		Store.set("obsPort", this.obsPort_conf.value);
		Store.set("obsPass", this.obsPass_conf.value);
		Store.set("obsIP", this.obsIP_conf.value);
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