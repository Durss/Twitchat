<template>
	<div class="connectplayability parameterContent">
		<Icon name="playability" alt="playability icon" class="icon" />

		<div class="head">
			<i18n-t scope="global" tag="span" keypath="playability.header">
				<template #LINK>
					<a href="https://playability.gg" target="_blank"><Icon name="newtab" />PlayAbility</a>
				</template>
			</i18n-t>
			<div class="small">{{$t("playability.info")}}</div>
			<div class="card-item secondary infos" v-if="!$store.playability.connected">
				<span>
					<Icon name="info" />
					<i18n-t scope="global" tag="span" keypath="playability.instructions">
						<template #SETTINGS><strong>Settings</strong></template>
						<template #ADVANCED><strong>Advanced</strong></template>
						<template #OPTION_1><strong>Enable Websocket Server</strong></template>
						<template #OPTION_2><strong>Allow Websocket Inputs</strong></template>
						<template #OPTION_3><strong>Allow Websocket Outputs</strong></template>
					</i18n-t>
				</span>
				<TTButton class="installBt"
					href="https://playability.gg"
					type="link"
					icon="newtab"
					target="_blank"
					light secondary>{{ $t("playability.install") }}</TTButton>
			</div>
		</div>

		<div class="content">
			<TTButton type="submit"
				v-if="!$store.playability.connected"
				@click="connect()"
				:loading="connecting"
				:disabled="!canConnect">{{ $t('global.connect') }}</TTButton>

			<ToggleBlock v-if="!$store.playability.connected" :title="$t('global.advanced_params')" small :open="false">
				<form class="card-item" v-if="!$store.playability.connected" @submit.prevent="connect()">
					<ParamItem noBackground :paramData="param_ip" v-model="$store.playability.ip" autofocus/>
					<ParamItem noBackground :paramData="param_port" v-model="$store.playability.port"/>

					<div class="ctas">
						<TTButton type="reset" alert
							@click="disconnect()"
							:loading="connecting"
							:disabled="!canConnect">{{ $t('global.clear') }}</TTButton>
						<TTButton type="submit"
							:loading="connecting"
							:disabled="!canConnect">{{ $t('global.connect') }}</TTButton>
					</div>
				</form>
			</ToggleBlock>

			<div class="card-item alert error" v-if="error" @click="error=false">{{$t("playability.connect_error")}}</div>

			<template v-if="$store.playability.connected">
				<div class="card-item primary" v-if="showSuccess">{{ $t("connexions.triggerSocket.success") }}</div>

				<div class="card-item infos">
					<div><strong>{{ $t(param_ip.labelKey!) }}</strong>: {{$store.playability.ip}}</div>
					<div><strong>{{ $t(param_port.labelKey!) }}</strong>: {{$store.playability.port}}</div>
				</div>

				<TTButton class="connectBt" alert @click="disconnect()">{{ $t('global.disconnect') }}</TTButton>
			</template>
		</div>

	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import ParamItem from '../../ParamItem.vue';
import TTButton from '@/components/TTButton.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';

@Component({
	components:{
		TTButton,
		ParamItem,
		ToggleBlock,
	},
	emits:[],
})
class ConnectPlayability extends Vue {

	public error = false;
	public showSuccess = false;
	public connecting = false;

	public param_ip:TwitchatDataTypes.ParameterData<string> = {value:"", type:"string", labelKey:"playability.ip", maxLength:100};
	public param_port:TwitchatDataTypes.ParameterData<number> = {value:0, type:"number", labelKey:"playability.port", min:0, max:65535};

	public get canConnect():boolean {
		return this.param_ip.value.length >= 7;// && this.param_port.value > 0;
	}

	public beforeMount():void {
		this.param_ip.value = this.$store.playability.ip;
	}

	public async connect():Promise<void> {
		this.error = false;
		this.connecting = true;
		const res = await this.$store.playability.connect();
		this.error = !res;
		this.connecting = false;
	}

	public disconnect():void {
		this.$store.playability.disconnect();
	}
}
export default toNative(ConnectPlayability);
</script>

<style scoped lang="less">
.connectplayability{
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

		.error {
			cursor: pointer;
			white-space: pre-line;
			text-align: center;
		}
	}

	.infos {
		gap: .5em;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

}
</style>
