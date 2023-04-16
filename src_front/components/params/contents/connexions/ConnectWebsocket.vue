<template>
	<ToggleBlock :open="open" class="connectwebsocket" title="Trigger websocket" :icons="['broadcast_purple']">
		<div class="holder">

			<div class="row">{{ $t("connexions.triggerSocket.usage") }}</div>

			<form class="row" v-if="!connected" @submit.prevent="connect()">
				<ParamItem class="item" :paramData="param_ip" autofocus />
				<ParamItem class="item" :paramData="param_port" />
				<ParamItem class="item" :paramData="param_secured" />
		
				<Button type="submit" v-if="!connected"
					:title="$t('connexions.triggerSocket.connectBt')"
					:loading="connecting"
					:disabled="!canConnect" />
			</form>
	
			<div class="row success" v-if="connected && showSuccess">
				{{ $t("connexions.triggerSocket.success") }}
			</div>
			
			<div class="error" v-if="error" @click="error=false">{{$t("error.trigger_socket")}}</div>

			<Button class="connectBt" v-if="connected" :title="$t('connexions.triggerSocket.disconnectBt')" @click="disconnect()" highlight />
		</div>

	</ToggleBlock>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import DataStore from '@/store/DataStore';
import type { SocketParams } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import WebsocketTrigger from '@/utils/WebsocketTrigger';
import { Component, Vue } from 'vue-facing-decorator';
import ParamItem from '../../ParamItem.vue';

@Component({
	components:{
		Button,
		ToggleBlock,
		ParamItem,
	},
	emits:[],
})
export default class ConnectWebsocket extends Vue {

	public error = false;
	public open = false;
	public showSuccess = false;
	public connecting = false;
	
	public param_ip:TwitchatDataTypes.ParameterData<string> = {value:"", type:"string", labelKey:"connexions.triggerSocket.ip"};
	public param_port:TwitchatDataTypes.ParameterData<string> = {value:"", type:"string", labelKey:"connexions.triggerSocket.port"};
	public param_secured:TwitchatDataTypes.ParameterData<boolean> = {value:false, type:"boolean", labelKey:"connexions.triggerSocket.secured"};

	public get connected() { return WebsocketTrigger.instance.connected; }
	public get canConnect():boolean {
		return this.param_ip.value.length >= 7;// && this.param_port.value.length > 0;
	}

	public mounted():void {
		
		const paramsStr = DataStore.get(DataStore.WEBSOCKET_TRIGGER);
		if(paramsStr) {
			let params = JSON.parse(paramsStr) as SocketParams;
			this.param_ip.value = params.ip;
			this.param_port.value = params.port;
			this.param_secured.value = params.secured;
		}
	}

	public connect():void {
		let url = this.param_secured.value === true? "wss://" : "ws://";
		url += this.param_ip.value;
		const port = this.param_port.value;
		if(port.length > 0) url += ":"+port;
		this.connecting = true;

		DataStore.set(DataStore.WEBSOCKET_TRIGGER, {
			ip:this.param_ip.value,
			port:this.param_port.value,
			secured:this.param_secured.value,
		});

		WebsocketTrigger.instance.connect(url, false).then(()=> {
			this.connecting = false;
			this.showSuccess = true;
		}).catch(()=> {
			this.connecting = false;
			this.error = true;
		});
	}

	public disconnect():void {
		DataStore.remove(DataStore.WEBSOCKET_TRIGGER);
		WebsocketTrigger.instance.disconnect();
	}
}
</script>

<style scoped lang="less">
.connectwebsocket{
	.holder {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1em;
	
		.error {
			justify-self: center;
			color: var(--mainColor_light);
			display: block;
			text-align: center;
			padding: 5px;
			border-radius: 5px;
			margin: auto;
			background-color: var(--mainColor_alert);
			cursor: pointer;
		}
	
		.row {
			display: flex;
			flex-direction: column;
			gap:.5em;

			.item {
				:deep(input) {
					flex-basis: 200px;
				}
			}

			&.success {
				color: var(--mainColor_light);
				background-color: var(--mainColor_normal);
				padding: .25em .5em;
				border-radius: .5em;
			}
		}
	}
	
}
</style>