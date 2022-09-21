<template>
	<form @submit.prevent="connect()" class="obsconnectform">
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

		<Button title="Connect" type="submit" class="connectBt" v-if="!connected" :loading="loading" />
		<Button title="Disconnect" @click="disconnect()" class="connectBt" v-if="connected" :loading="loading" :icon="$image('icons/cross_white.svg')" />

		<transition name="fade">
			<div v-if="connectError" @click="connectError = false" class="error">
				<div>Unable to connect with OBS. Double check the port and password and make sure you installed <a :href="obswsInstaller" target="_blank">OBS-websocket plugin (v5)</a></div>
				<div v-if="obsIP_conf.value != '127.0.0.1'">You may want to set the IP to <strong>127.0.0.1</strong> instead of what OBS shows you</div>
			</div>
		</transition>
	</form>
</template>

<script lang="ts">
import DataStore from '@/store/DataStore';
import Config from '@/utils/Config';
import OBSWebsocket from '@/utils/OBSWebsocket';
import { watch } from 'vue';
import { Options, Vue } from 'vue-class-component';
import ParamItem from '../../ParamItem.vue';
import ToggleBlock from '../../../ToggleBlock.vue';
import Button from '../../../Button.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';

@Options({
	props:{},
	components:{
		Button,
		ParamItem,
		ToggleBlock,
	},
	emits:['onConnect','onDisconnect'],
})
export default class OBSConnectForm extends Vue {

	public loading:boolean = false;
	public connected:boolean = false;
	public connectError:boolean = false;
	public connectSuccess:boolean = false;
	public obsPort_conf:TwitchatDataTypes.ParameterData = { type:"number", value:4455, label:"OBS websocket server port", min:0, max:65535, step:1 };
	public obsPass_conf:TwitchatDataTypes.ParameterData = { type:"password", value:"", label:"OBS websocket password" };
	public obsIP_conf:TwitchatDataTypes.ParameterData = { type:"text", value:"127.0.0.1", label:"OBS local IP" };

	public get obswsInstaller():string { return Config.instance.OBS_WEBSOCKET_INSTALLER; }

	public mounted():void {
		const port = DataStore.get("obsPort");
		const pass = DataStore.get("obsPass");
		const ip = DataStore.get("obsIP");
		if(port) this.obsPort_conf.value = parseInt(port);
		if(pass) this.obsPass_conf.value = pass;
		if(ip) this.obsIP_conf.value = ip;

		if(port && pass) {
			this.connected = OBSWebsocket.instance.connected;
		}

		watch(()=> this.obsPort_conf.value, () => { this.paramUpdate(); })
		watch(()=> this.obsPass_conf.value, () => { this.paramUpdate(); })
		watch(()=> this.obsIP_conf.value, () => { this.paramUpdate(); })
		watch(()=> OBSWebsocket.instance.connected, () => { 
			this.connected = OBSWebsocket.instance.connected;
			if(!this.connected) this.$emit("onDisconnect");
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
				this.$emit("onConnect");
			}, 3000);
		}else{
			this.connectError = true;
		}
		this.loading = false;
	}

	public async disconnect():Promise<void> {
		OBSWebsocket.instance.disconnect();
		this.$emit("onDisconnect");
	}

	/**
	 * Called when changing OBS credentials
	 */
	private paramUpdate():void {
		this.connected = false;
		DataStore.set("obsPort", this.obsPort_conf.value);
		DataStore.set("obsPass", this.obsPass_conf.value);
		DataStore.set("obsIP", this.obsIP_conf.value);
	}

}
</script>

<style scoped lang="less">
.obsconnectform{

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