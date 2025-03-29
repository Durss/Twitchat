<template>
	<div class="connectsammi parameterContent">
		<Icon name="sammi" alt="sammi icon" class="icon" />

		<div class="head">
			<i18n-t scope="global" tag="span" keypath="sammi.header">
				<template #LINK>
					<a href="https://sammi.solutions" target="_blank"><Icon name="newtab" />SAMMI</a>
				</template>
			</i18n-t>
			<div class="card-item secondary infos" v-if="!$store.sammi.connected">
				<span>
					<Icon name="info" />
					<span>{{$t("sammi.instructions")}}</span>
				</span>
				<TTButton class="installBt"
					href="https://sammi.solutions"
					type="link"
					icon="newtab"
					target="_blank"
					light secondary>{{ $t("sammi.install") }}</TTButton>
			</div>
		</div>

		<div class="content">
			<TTButton type="submit"
				v-if="!$store.sammi.connected"
				@click="connect()"
				:loading="connecting"
				:disabled="!canConnect">{{ $t('global.connect') }}</TTButton>

			<ToggleBlock v-if="!$store.sammi.connected" :title="$t('global.advanced_params')" small :open="false">
				<form class="card-item" @submit.prevent="connect()">
					<ParamItem noBackground :paramData="param_ip" v-model="$store.sammi.ip" autofocus/>
					<ParamItem noBackground :paramData="param_port" v-model="$store.sammi.port"/>
					<ParamItem noBackground :paramData="param_pass" v-model="$store.sammi.password"/>

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
			<div class="card-item alert error" v-if="error" @click="error=false">{{$t("sammi.connect_error")}}</div>

			<template v-if="$store.sammi.connected">
				<div class="card-item primary" v-if="showSuccess">{{ $t("connexions.triggerSocket.success") }}</div>

				<div class="card-item infos">
					<div><strong>{{ $t(param_ip.labelKey!) }}</strong>: {{$store.sammi.ip}}</div>
					<div><strong>{{ $t(param_port.labelKey!) }}</strong>: {{$store.sammi.port}}</div>
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
class ConnectSammi extends Vue {

	public error = false;
	public showSuccess = false;
	public connecting = false;

	public param_ip:TwitchatDataTypes.ParameterData<string> = {value:"", type:"string", labelKey:"sammi.ip", maxLength:100};
	public param_port:TwitchatDataTypes.ParameterData<number> = {value:0, type:"number", labelKey:"sammi.port", min:0, max:65535};
	public param_pass:TwitchatDataTypes.ParameterData<string> = {value:"", type:"string", labelKey:"sammi.pass", maxLength:100, isPrivate:true};

	public get canConnect():boolean {
		return this.param_ip.value.length >= 7;// && this.param_port.value > 0;
	}

	public beforeMount():void {
		this.param_ip.value = this.$store.sammi.ip;
	}

	public async connect():Promise<void> {
		this.error = false;
		this.connecting = true;
		const res = await this.$store.sammi.connect();
		this.error = !res;
		this.connecting = false;
	}

	public disconnect():void {
		this.$store.sammi.disconnect();
	}
}
export default toNative(ConnectSammi);
</script>

<style scoped lang="less">
.connectsammi{
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
