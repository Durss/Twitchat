<template>
	<div class="connectwebsocket parameterContent">
		<Icon name="broadcast" alt="socket icon" class="icon" />

		<div class="head">{{ $t("connexions.triggerSocket.usage") }}</div>

		<div class="content">
			<form class="card-item" v-if="!connected" @submit.prevent="connect()">
				<ParamItem noBackground :paramData="param_ip" autofocus @change="onChangeValue"/>
				<ParamItem noBackground :paramData="param_port" @change="onChangeValue"/>
				<ParamItem noBackground :paramData="param_secured" v-model="param_secured.value" @change="onChangeValue"/>
		
				<div class="ctas">
					<TTButton type="reset" v-if="!connected" alert
						@click="clearForm()"
						:loading="connecting"
						:disabled="!canConnect">{{ $t('global.clear') }}</TTButton>
					<TTButton type="submit" v-if="!connected"
						:loading="connecting"
						:disabled="!canConnect">{{ $t('global.connect') }}</TTButton>
				</div>
			</form>
			
			<div class="card-item alert" v-if="error" @click="error=false">{{$t("error.trigger_socket")}}</div>
	
			<template v-if="connected">
				<div class="card-item primary" v-if="showSuccess">{{ $t("connexions.triggerSocket.success") }}</div>

				<div class="card-item infos">
					<div><strong>{{ $t(param_ip.labelKey!) }}</strong>: {{param_ip.value}}</div>
					<div><strong>{{ $t(param_port.labelKey!) }}</strong>: {{param_port.value}}</div>
				</div>
	
				<TTButton class="connectBt" alert @click="disconnect()">{{ $t('global.disconnect') }}</TTButton>
			</template>
		</div>

	</div>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import DataStore from '@/store/DataStore';
import type { SocketParams } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import WebsocketTrigger from '@/utils/WebsocketTrigger';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import ParamItem from '../../ParamItem.vue';

@Component({
	components:{
		TTButton,
		ParamItem,
	},
	emits:[],
})
class ConnectWebsocket extends Vue {

	public error = false;
	public showSuccess = false;
	public connecting = false;
	
	public param_ip:TwitchatDataTypes.ParameterData<string> = {value:"", type:"string", labelKey:"connexions.triggerSocket.ip", maxLength:100};
	public param_port:TwitchatDataTypes.ParameterData<number> = {value:3000, type:"number", labelKey:"connexions.triggerSocket.port", min:0, max:65535};
	public param_secured:TwitchatDataTypes.ParameterData<boolean> = {value:false, type:"boolean", labelKey:"connexions.triggerSocket.secured"};

	public get connected() { return WebsocketTrigger.instance.connected.value; }
	public get canConnect():boolean {
		return this.param_ip.value.length >= 7;// && this.param_port.value > 0;
	}

	public mounted():void {
		const paramsStr = DataStore.get(DataStore.WEBSOCKET_TRIGGER);
		if(paramsStr) {
			let params = JSON.parse(paramsStr) as SocketParams;
			this.param_ip.value = params.ip;
			this.param_port.value = params.port || 3000;
			this.param_secured.value = params.secured;
		}
	}

	public connect():void {
		this.connecting = true;
		WebsocketTrigger.instance.connect(this.param_ip.value, this.param_port.value, this.param_secured.value).then(()=> {
			this.connecting = false;
			this.showSuccess = true;
		}).catch(()=> {
			this.connecting = false;
			this.error = true;
		});
	}

	public clearForm():void {
		DataStore.remove(DataStore.WEBSOCKET_TRIGGER);
		WebsocketTrigger.instance.disconnect();
	}

	public disconnect():void {
		DataStore.remove(DataStore.WEBSOCKET_TRIGGER);
		WebsocketTrigger.instance.disconnect();
	}

	public onChangeValue():void {
		DataStore.set(DataStore.WEBSOCKET_TRIGGER, {
			ip:this.param_ip.value,
			port:this.param_port.value,
			secured:this.param_secured.value,
		});
	}
}
export default toNative(ConnectWebsocket);
</script>

<style scoped lang="less">
.connectwebsocket{
	.content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1em;
	
		form {
			display: flex;
			flex-direction: column;
			gap:.5em;
		}
		.ctas {
			gap: 1em;
			display: flex;
			flex-direction: row;
			justify-content: center;
		}

		.infos {
			gap: .5em;
			display: flex;
			flex-direction: column;
		}
	}
	
}
</style>