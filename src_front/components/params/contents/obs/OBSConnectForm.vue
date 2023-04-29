<template>
	<form @submit.prevent="connect()" class="obsconnectform">
		<transition name="fade">
			<div v-if="connectSuccess && connected" @click="connectSuccess = false" class="card-item primary success">{{ $t("obs.connection_success") }}</div>
		</transition>

		<template v-if="!connected">
			<ParamItem :paramData="obsPort_conf" class="param" />
			<ParamItem :paramData="obsPass_conf" class="param" />
			<ParamItem :paramData="obsIP_conf" class="param" />
			
			<ToggleBlock class="info" small :open="false" :title="$t('obs.how_to_title')">
				<p>{{ $t("obs.how_to1") }}</p>
				<i18n-t scope="global" tag="p" class="warn" keypath="obs.how_to2">
					<template #IP><strong>127.0.0.1</strong></template>
				</i18n-t>
				<img src="@/assets/img/obs-ws_credentials.png" alt="credentials">
			</ToggleBlock>
	
			<Button type="submit" class="connectBt" :loading="loading">{{$t('global.connect')}}</Button>
		</template>
		
		<Button @click="disconnect()" class="connectBt" v-else :loading="loading" icon="cross">{{$t('global.disconnect')}}</Button>

		<transition name="fade">
			<div v-if="connectError" @click="connectError = false" class="card-item alert error">
				<div>{{ $t("error.obs_ws_connect") }}</div>
				<div v-if="obsIP_conf.value != '127.0.0.1'">{{ $t("obs.ip_advice") }}</div>
			</div>
		</transition>
	</form>
</template>

<script lang="ts">
import DataStore from '@/store/DataStore';
import Config from '@/utils/Config';
import OBSWebsocket from '@/utils/OBSWebsocket';
import { watch } from 'vue';
import { Component, Vue } from 'vue-facing-decorator';
import ParamItem from '../../ParamItem.vue';
import ToggleBlock from '../../../ToggleBlock.vue';
import Button from '../../../Button.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';

@Component({
	components:{
		Button,
		ParamItem,
		ToggleBlock,
	},
	emits:[],
})
export default class OBSConnectForm extends Vue {

	public loading:boolean = false;
	public connected:boolean = false;
	public connectError:boolean = false;
	public connectSuccess:boolean = false;
	public obsPort_conf:TwitchatDataTypes.ParameterData<number>	= { type:"number", value:4455, min:0, max:65535, step:1 };
	public obsPass_conf:TwitchatDataTypes.ParameterData<string>	= { type:"password", value:"", };
	public obsIP_conf:TwitchatDataTypes.ParameterData<string>	= { type:"string", value:"127.0.0.1", };

	public get obswsInstaller():string { return Config.instance.OBS_WEBSOCKET_INSTALLER; }

	beforeMount(): void {
		this.obsPort_conf.labelKey	= "obs.form_port";
		this.obsPass_conf.labelKey	= "obs.form_pass";
		this.obsIP_conf.labelKey	= "obs.form_ip";
	}

	public mounted():void {
		const port = DataStore.get("obsPort");
		const pass = DataStore.get("obsPass");
		const ip = DataStore.get("obsIP");
		if(port) this.obsPort_conf.value = parseInt(port);
		if(pass) this.obsPass_conf.value = pass;
		if(ip) this.obsIP_conf.value = ip;

		if(port && ip) {
			this.connected = OBSWebsocket.instance.connected;
		}

		watch(()=> this.obsPort_conf.value, () => { this.paramUpdate(); })
		watch(()=> this.obsPass_conf.value, () => { this.paramUpdate(); })
		watch(()=> this.obsIP_conf.value, () => { this.paramUpdate(); })
		watch(()=> OBSWebsocket.instance.connected, () => { 
			this.connected = OBSWebsocket.instance.connected;
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
							this.obsPort_conf.value.toString(),
							this.obsPass_conf.value,
							false,
							this.obsIP_conf.value,
							true
						);
		if(connected) {
			this.paramUpdate();
			this.connected = true;
			this.connectSuccess = true;
			setTimeout(()=> {
				this.connectSuccess = false;
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
	gap: .5em;
	display: flex;
	flex-direction: column;
	
	.connectBt {
		margin: auto;
	}

	.error, .success {
		text-align: center;
		line-height: 1.3em;
		&.success {
			align-self: center;
		}
	}
	.info {
		width: 100%;
		:deep(.content) {
			gap: .5em;
			display: flex;
			flex-direction: column;
			align-items: center;
		}
	}
	.param {
		:deep(.inputHolder) {
			max-width: 150px !important;
		}
		:deep(input) {
			width: 150px !important;
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
</style>