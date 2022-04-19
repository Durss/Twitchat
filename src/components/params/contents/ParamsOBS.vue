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
			<Button title="Connect" @click="connect()" class="connectBt" v-if="!connected" :loading="loading" />
			<Button title="Disconnect" @click="disconnect()" class="connectBt" v-if="connected" :loading="loading" :icon="require('@/assets/icons/cross_white.svg')" />
			<transition name="fade">
				<div v-if="connectError" @click="connectError = false" class="error">Unable to connect with OBS. Double check the port and password and make sure you installed <a href="https://github.com/obsproject/obs-websocket/releases" target="_blank">OBS-websocket plugin (v5)</a></div>
			</transition>
		</ToggleBlock>

		<ToggleBlock class="block allowed"
		v-if="connected"
		:open="false"
		icon="lock_purple"
		title="Permissions">
			<OBSPermissions />
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

		<!-- <ToggleBlock class="block overlay"
		v-if="connected"
		:open="false"
		icon="show_purple"
		title="Control sources">
			<OBSSources />
		</ToggleBlock> -->
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import { ParameterData } from '@/store';
import Store from '@/store/Store';
import Config from '@/utils/Config';
import OBSWebsocket from '@/utils/OBSWebsocket';
import { watch } from '@vue/runtime-core';
import { Options, Vue } from 'vue-class-component';
import ParamItem from '../ParamItem.vue';
import OBSAudioSourceForm from './obs/OBSAudioSourceForm.vue';
import OBSPermissions from './obs/OBSPermissions.vue';
import OBSScenes from './obs/OBSScenes.vue';
import OBSSources from './obs/OBSSources.vue';


@Options({
	props:{},
	components:{
		Button,
		ParamItem,
		OBSScenes,
		ToggleBlock,
		OBSSources,
		OBSPermissions,
		OBSAudioSourceForm,
	}
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

		watch(()=> this.obsPort_conf.value, () => { this.paramUpdate(); })
		watch(()=> this.obsPass_conf.value, () => { this.paramUpdate(); })
		watch(()=> OBSWebsocket.instance.connected, () => { 
			this.connected = OBSWebsocket.instance.connected;
			if(!this.connected) this.openConnectForm = true;
		});
	}

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
		margin-top: 20px;
	}

	.block {
		.info {
			margin-bottom: 1em;
		}
	}

	.conf {
		display: flex;
		flex-direction: column;

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