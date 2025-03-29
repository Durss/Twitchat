<template>
	<div class="goxlrconnectform">
		<form class="card-item" @submit.prevent="connect()" v-if="!connected">
			<ParamItem :paramData="param_ip" v-model="param_ip.value" @change="onIpChange()" />
			
			<i18n-t scope="global" class="card-item secondary" tag="div" v-if="securityWarning" keypath="goxlr.connect_form.ip_security">
				<template #LINK>
					<a :href="discordURL" target="_blank">{{ $t("goxlr.connect_form.ip_security_link") }}</a>
				</template>
			</i18n-t>

			<ParamItem :paramData="param_port" v-model="param_port.value" />

			<Button type="submit" :loading="connecting"
			:disabled="!isPremium"
			v-tooltip="!isPremium? $t('premium.restricted_access') : ''">{{ $t("global.connect") }}</Button>
			<div class="card-item alert message error" v-if="error" @click="error = false">{{ $t("goxlr.connect_failed") }}</div>
		</form>
		<template v-else>
			<Button class="disconnectBt" type="button"
			@click="disconnect()" alert>{{ $t("global.disconnect") }}</Button>
		</template>
	</div>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import GoXLRSocket from '@/utils/goxlr/GoXLRSocket';
import { Component, Vue, toNative } from 'vue-facing-decorator';
import ParamItem from '../../ParamItem.vue';

@Component({
	components:{
		Button: TTButton,
		ParamItem,
		ToggleBlock,
	},
	emits:[],
})
class GoXLRConnectForm extends Vue {

	public error:boolean = false;
	public opened:boolean = true;
	public fxEnabled:boolean = false;
	public connecting:boolean = false;
	public securityWarning:boolean = false;
	public selectedPresetIndex:number = 0;
	public param_ip:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"127.0.0.1", label:"IP"};
	public param_port:TwitchatDataTypes.ParameterData<number> = {type:"number", value:14564, label:"Port"};

	public get connected():boolean { return GoXLRSocket.instance.connected; }
	public get discordURL():string { return Config.instance.DISCORD_URL; }
	public get isPremium():boolean { return this.$store.auth.isPremium; }

	public async connect():Promise<void> {
		this.error = false;
		this.connecting = true;
		try {
			let res = await GoXLRSocket.instance.connect(this.param_ip.value, this.param_port.value).catch(()=> {
				if(!this.$store.auth.isPremium) {
					this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
				}
			});
			if(!res) this.error = true;
		}catch(error) {
			console.log(error);
			this.error = true;
		}
		const state = GoXLRSocket.instance.status;
		if(state) {
			this.fxEnabled = state.effects.is_enabled;
			this.selectedPresetIndex = parseInt(state.effects.active_preset.replace(/\D/gi, ""));
		}
		this.connecting = false;
	}

	public beforeMount():void {
		this.opened = !this.connected;
	}

	public disconnect():void {
		GoXLRSocket.instance.disconnect();
	}

	public onIpChange():void {
		this.securityWarning = (this.param_ip.value.trim() != "127.0.0.1" && this.param_ip.value.trim() != "localhost")
	}

}
export default toNative(GoXLRConnectForm);
</script>

<style scoped lang="less">
.goxlrconnectform{
	width: 100%;
	max-width: 500px;
	align-self: center;
	
	.disconnectBt {
		margin: auto;
		display: flex;
	}

	form {
		margin: auto;
		width: fit-content;
		gap: .5em;
		display: flex;
		flex-direction: column;
		:deep(.inputHolder), :deep(input) {
			flex-basis: 150px !important;
			flex-grow: unset;
		}
	}
	.message {
		text-align: center;
	}
	.error {
		cursor: pointer;
	}
}
</style>