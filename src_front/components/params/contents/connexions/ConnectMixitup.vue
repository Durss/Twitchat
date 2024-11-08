<template>
	<div class="connectmixitup parameterContent">
		<Icon name="mixitup" alt="mixitup icon" class="icon" />

		<div class="head">
			<i18n-t scope="global" tag="span" keypath="mixitup.header">
				<template #LINK>
					<a href="https://mixitupapp.com" target="_blank"><Icon name="newtab" />Mix It Up</a>
				</template>
			</i18n-t>
			<div class="card-item secondary infos" v-if="!$store.mixitup.connected">
				<span>
					<Icon name="info" />
					<span>{{$t("mixitup.instructions")}}</span>
				</span>
				<TTButton class="installBt"
					href="https://mixitupapp.com"
					type="link"
					icon="newtab"
					target="_blank"
					light secondary>{{ $t("mixitup.install") }}</TTButton>
			</div>
		</div>

		<div class="content">
			<form class="card-item" v-if="!$store.mixitup.connected" @submit.prevent="connect()">
				<ParamItem noBackground :paramData="param_ip" v-model="$store.mixitup.ip" autofocus/>
				<ParamItem noBackground :paramData="param_port" v-model="$store.mixitup.port"/>

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
			<div class="card-item alert error" v-if="error" @click="error=false">{{$t("mixitup.connect_error")}}</div>
	
			<template v-if="$store.mixitup.connected">
				<div class="card-item primary" v-if="showSuccess">{{ $t("connexions.triggerSocket.success") }}</div>

				<div class="card-item infos">
					<div><strong>{{ $t(param_ip.labelKey!) }}</strong>: {{$store.mixitup.ip}}</div>
					<div><strong>{{ $t(param_port.labelKey!) }}</strong>: {{$store.mixitup.port}}</div>
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

@Component({
	components:{
		TTButton,
		ParamItem,
	},
	emits:[],
})
class ConnectMixitup extends Vue {

	public error = false;
	public showSuccess = false;
	public connecting = false;

	public param_ip:TwitchatDataTypes.ParameterData<string> = {value:"", type:"string", labelKey:"mixitup.ip", maxLength:100};
	public param_port:TwitchatDataTypes.ParameterData<number> = {value:0, type:"number", labelKey:"mixitup.port", min:0, max:65535};
		
	public get canConnect():boolean {
		return this.param_ip.value.length >= 7;// && this.param_port.value > 0;
	}

	public beforeMount():void {
		
	}

	public async connect():Promise<void> {
		this.error = false;
		this.connecting = true;
		const res = await this.$store.mixitup.connect();
		this.error = !res;
		this.connecting = false;
	}

	public disconnect():void {
		this.$store.mixitup.disconnect();
	}
}
export default toNative(ConnectMixitup);
</script>

<style scoped lang="less">
.connectmixitup{
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