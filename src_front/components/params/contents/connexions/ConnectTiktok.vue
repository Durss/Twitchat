<template>
	<div class="connecttiktok parameterContent">
		<Icon name="tiktok" class="icon" />

		<div class="head">
			<i18n-t scope="global" tag="span" keypath="tiktok.header">
				<template #LINK>
					<a href="https://tiktok.com/" target="_blank"><Icon name="newtab" />TikTok</a>
				</template>
			</i18n-t>
			<div class="card-item secondary infos" v-if="!$store.tiktok.connected">
				<span>
					<Icon name="info" />
					<i18n-t scope="global" keypath="tiktok.requirement">
						<template #LINK>
							<a href="https://tikfinity.zerody.one/app/" target="_blank"><Icon name="newtab" />TikFinity</a>
						</template>
					</i18n-t>
				</span>
				<TTButton class="installBt"
					href="https://tikfinity.zerody.one/app"
					type="link"
					icon="newtab"
					target="_blank"
					light secondary>{{ $t("tiktok.install") }}</TTButton>
			</div>
		</div>

		<div class="content">
			<TTButton type="submit"
				v-if="!$store.tiktok.connected"
				@click="connect()"
				:loading="connecting"
				:disabled="!canConnect">{{ $t('global.connect') }}</TTButton>

			<ToggleBlock v-if="!$store.tiktok.connected" :title="$t('global.advanced_params')" small :open="false">
				<form class="card-item" @submit.prevent="connect()">
					<ParamItem noBackground :paramData="param_ip" v-model="$store.tiktok.ip" autofocus/>
					<ParamItem noBackground :paramData="param_port" v-model="$store.tiktok.port"/>

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

			<div class="card-item alert error" v-if="error" @click="error=false">{{$t("tiktok.connect_error")}}</div>

			<template v-if="$store.tiktok.connected">
				<div class="card-item primary" v-if="showSuccess">{{ $t("connexions.triggerSocket.success") }}</div>

				<div class="card-item infos">
					<div><strong>{{ $t(param_ip.labelKey!) }}</strong>: {{$store.tiktok.ip}}</div>
					<div><strong>{{ $t(param_port.labelKey!) }}</strong>: {{$store.tiktok.port}}</div>
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
import Icon from '@/components/Icon.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';

@Component({
	components:{
		Icon,
		TTButton,
		ParamItem,
		ToggleBlock,
	},
	emits:[],
})
class ConnectTiktok extends Vue {

	public error = false;
	public showSuccess = false;
	public connecting = false;

	public param_ip:TwitchatDataTypes.ParameterData<string> = {value:"", type:"string", labelKey:"connexions.triggerSocket.ip", maxLength:100};
	public param_port:TwitchatDataTypes.ParameterData<number> = {value:0, type:"number", labelKey:"connexions.triggerSocket.port", min:0, max:65535};

	public get canConnect():boolean {
		return this.param_ip.value.length >= 7;// && this.param_port.value > 0;
	}

	public beforeMount():void {

	}

	public async connect():Promise<void> {
		this.connecting = true;
		this.error = !await this.$store.tiktok.connect();
		this.connecting = false;
	}

	public disconnect():void {
		this.$store.tiktok.disconnect();
	}

}
export default toNative(ConnectTiktok);
</script>

<style scoped lang="less">
.connecttiktok{
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
