<template>
	<form @submit.prevent="connect()" class="obsconnectform" :class="connected? '' : 'card-item'">
		<transition name="fade">
			<div v-if="connectSuccess && connected" @click="connectSuccess = false" class="card-item primary success">{{ $t("obs.connection_success") }}</div>
		</transition>

		<template v-if="!connected">
			<ParamItem :paramData="obsPort_conf" class="param" @change="paramUpdate()" noBackground />
			<ParamItem :paramData="obsPass_conf" class="param" @change="paramUpdate()" noBackground />
			<ParamItem :paramData="obsIP_conf" class="param" @change="paramUpdate()" noBackground />
			
			<ToggleBlock class="info" small :open="false" :title="$t('obs.how_to_title')">
				<p>{{ $t("obs.how_to1") }}</p>
				<i18n-t scope="global" tag="p" class="warn" keypath="obs.how_to2">
					<template #IP><strong>127.0.0.1</strong></template>
				</i18n-t>
				<img src="@/assets/img/obs-ws_credentials.png" alt="credentials">
			</ToggleBlock>
	
			<Button type="submit" class="connectBt" :loading="loading">{{$t('global.connect')}}</Button>
		</template>
		
		<Button v-else @click="disconnect()" class="connectBt" alert :loading="loading" icon="cross">{{$t('global.disconnect')}}</Button>

		<transition name="fade">
			<div v-if="connectError" @click="connectError = false" class="card-item alert error">
				<div>{{ $t("error.obs_ws_connect") }}</div>
				<div v-if="obsIP_conf.value != '127.0.0.1'">{{ $t("obs.ip_advice") }}</div>
			</div>
		</transition>

		<transition name="fade">
			<div class="card-item alert error" v-if="connectError && isBraveBrowser" @click="connectError = false"><Icon name="brave" /> {{$t("obs.disable_brave")}}</div>
		</transition>
	</form>
</template>

<script lang="ts">
import DataStore from '@/store/DataStore';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import OBSWebSocket from '@/utils/OBSWebSocket';
import { Component, toNative, Vue } from 'vue-facing-decorator';
import TTButton from '../../../TTButton.vue';
import ToggleBlock from '../../../ToggleBlock.vue';
import ParamItem from '../../ParamItem.vue';

@Component({
	components:{
		Button: TTButton,
		ParamItem,
		ToggleBlock,
	},
	emits:[],
})
class OBSConnectForm extends Vue {

	public loading:boolean = false;
	public connectError:boolean = false;
	public connectSuccess:boolean = false;
	public isBraveBrowser:boolean = false;
	public obsPort_conf:TwitchatDataTypes.ParameterData<number>	= { type:"number", value:4455, min:0, max:65535, step:1, labelKey:"obs.form_port" };
	public obsPass_conf:TwitchatDataTypes.ParameterData<string>	= { type:"password", value:"", labelKey:"obs.form_pass", isPrivate:true };
	public obsIP_conf:TwitchatDataTypes.ParameterData<string>	= { type:"string", value:"127.0.0.1", maxLength:100, labelKey:"obs.form_ip" };

	public get connected():boolean {
		return OBSWebSocket.instance.connected.value;
	}

		
	public async beforeMount():Promise<void> {
		const port = DataStore.get(DataStore.OBS_PORT);
		const pass = DataStore.get(DataStore.OBS_PASS);
		const ip = DataStore.get(DataStore.OBS_IP);
		if(port) this.obsPort_conf.value = parseInt(port);
		if(pass) this.obsPass_conf.value = pass;
		if(ip) this.obsIP_conf.value = ip;
		
		//@ts-ignore
		this.isBraveBrowser = (navigator.brave && await navigator.brave.isBrave() || false);
	}

	/**
	 * Connect to OBS websocket
	 */
	public async connect():Promise<void> {
		this.loading = true;
		this.connectSuccess = false;
		this.connectError = false;
		const connected = await OBSWebSocket.instance.connect(
							this.obsPort_conf.value.toString(),
							this.obsPass_conf.value,
							false,
							this.obsIP_conf.value,
							true
						);
		if(connected) {
			this.paramUpdate();
			this.connectSuccess = true;
			window.setTimeout(()=> {
				this.connectSuccess = false;
			}, 3000);
		}else{
			this.connectError = true;
		}
		this.loading = false;
	}

	public async disconnect():Promise<void> {
		OBSWebSocket.instance.disconnect();
	}

	/**
	 * Called when changing OBS credentials
	 */
	public paramUpdate():void {
		DataStore.set(DataStore.OBS_PORT, this.obsPort_conf.value);
		DataStore.set(DataStore.OBS_PASS, this.obsPass_conf.value);
		DataStore.set(DataStore.OBS_IP, this.obsIP_conf.value);
	}

}
export default toNative(OBSConnectForm);
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
		cursor: pointer;
		white-space: pre-line;
		&.success {
			align-self: center;
		}
		.icon {
			height: 2em;
			vertical-align: middle;
			margin-right: .5em;
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
			flex-basis: 200px;
			flex-grow: 0 !important;
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