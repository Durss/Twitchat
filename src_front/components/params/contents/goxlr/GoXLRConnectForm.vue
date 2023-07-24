<template>
	<ToggleBlock class="goxlrconnectform" :title="$t('goxlr.connect_form.title')">
		<form @submit.prevent="connect()" v-if="!connected">
			<ParamItem :paramData="param_ip" @change="onIpChange()" />
			<i18n-t scope="global" class="card-item secondary" tag="div" v-if="securityWarning" keypath="goxlr.connect_form.ip_security">
				<template #LINK>
					<a :href="discordURL" target="_blank">{{ $t("goxlr.connect_form.ip_security_link") }}</a>
				</template>
			</i18n-t>
			<ParamItem :paramData="param_port" />
			<Button type="submit" :loading="connecting"
			@click.capture="clickConnect()"
			:disabled="!isPremium"
			v-tooltip="!isPremium? $t('premium.restricted_access') : ''">{{ $t("global.connect") }}</Button>
			<div class="card-item alert error" v-if="error" @click="error = false">{{ $t("goxlr.connect_failed") }}</div>
		</form>
		<Button class="disconnectBt" type="button" v-else
		@click="disconnect()" alert>{{ $t("global.disconnect") }}</Button>
	</ToggleBlock>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import GoXLRSocket from '@/utils/goxlr/GoXLRSocket';
import { Component, Vue } from 'vue-facing-decorator';
import ParamItem from '../../ParamItem.vue';
import Button from '@/components/Button.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import Config from '@/utils/Config';
import PatreonHelper from '@/utils/patreon/PatreonHelper';

@Component({
	components:{
		Button,
		ParamItem,
		ToggleBlock,
	},
	emits:[],
})
export default class GoXLRConnectForm extends Vue {

	public error:boolean = false;
	public fxEnabled:boolean = false;
	public connecting:boolean = false;
	public securityWarning:boolean = false;
	public selectedPresetIndex:number = 0;
	public param_ip:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"127.0.0.1", label:"IP"};
	public param_port:TwitchatDataTypes.ParameterData<number> = {type:"number", value:14564, label:"Port"};

	public get connected():boolean { return GoXLRSocket.instance.connected; }
	public get discordURL():string { return Config.instance.DISCORD_URL; }
	public get isPremium():boolean { return PatreonHelper.instance.isMember; }

	public async connect():Promise<void> {
		if(!this.isPremium) return;
		this.error = false;
		this.connecting = true;
		try {
			await GoXLRSocket.instance.connect(this.param_ip.value, this.param_port.value);
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

	public disconnect():void {
		GoXLRSocket.instance.disconnect();
	}

	public onIpChange():void {
		this.securityWarning = (this.param_ip.value.trim() != "127.0.0.1" && this.param_ip.value.trim() != "localhost")
	}

	public clickConnect():void {
		if(this.isPremium) return;
		this.$store("params").openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
	}

}
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
		gap: .5em;
		display: flex;
		flex-direction: column;
	}
	.error {
		text-align: center;
	}
}
</style>