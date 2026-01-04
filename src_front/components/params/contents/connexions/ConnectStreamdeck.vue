<template>
	<div class="paramsstreamdeck parameterContent">
		<Icon name="elgato" alt="stream deck logo" class="icon" />

		<p class="head">{{ $t("streamdeck.header") }}</p>

		<section>
			<TTButton icon="elgato"
				href="https://apps.elgato.com/plugins/fr.twitchat"
				target="_blank"
				type="link"
				class="button elgatoBt">{{ $t('streamdeck.download_bt') }}</TTButton>
		</section>

		<section v-if="connected">
			<div class="connected card-item primary"><icon name="checkmark" />{{ $t("streamdeck.connected") }}</div>
			<TTButton icon="offline" alert @click="disconnect()">{{ $t("global.disconnect") }}</TTButton>
		</section>

		<section v-else>
			<form @submit.prevent="connect()">
				<div class="card-item secretKeyHolder">
					<ParamItem :paramData="param_secretKey" v-model="param_secretKey.value" noBackground />
					<ToggleBlock class="secretKeyDetails" :title="$t('streamdeck.connect_form.findSecretKey')" small noTitleColor :open="false">
						<span class="info">{{ $t('streamdeck.connect_form.findSecretKey_details') }}</span>
						<img src="@/assets/img/streamdeck_credentials.png" />
					</ToggleBlock>
				</div>
				
				<!-- <icon v-if="connecting" name="loader" class="loader" /> -->
				<div class="card-item alert message error" v-if="error" @click="error = ''">{{ $t(`streamdeck.error_messages.${error}`) }}</div>
				
				<TTButton type="submit" icon="online" :loading="connecting" :disabled="!param_secretKey.value">{{ $t("global.connect") }}</TTButton>
				
				<ToggleBlock :title="$t('global.advanced_params')" small :open="false">
						<ParamItem :paramData="param_ip" v-model="param_ip.value" @change="onIpChange()" noBackground />
		
						<div v-if="securityWarning" class="card-item secondary security">
							<h2>
								<icon name="info" />
								<i18n-t scope="global" keypath="streamdeck.connect_form.info">
									<template #URL><a :href="`https://${param_ip.value}:30386`" target="_blank">https://{{ param_ip.value }}:30386</a></template>
								</i18n-t>
							</h2>
							<ul>
								<li><img class="logo" src="@/assets/icons/logo-chrome.svg"><img class="logo" src="@/assets/icons/logo-vivaldi.svg"><img class="logo" src="@/assets/icons/logo-edge.svg"><img class="logo" src="@/assets/icons/logo-brave.svg"> — <span v-html="$t('streamdeck.connect_form.chromium', { IP: param_ip.value })"></span></li>
								<li><img class="logo" src="@/assets/icons/logo-firefox.svg"> — <span v-html="$t('streamdeck.connect_form.firefox', { IP: param_ip.value })"></span></li>
								<li><img class="logo" src="@/assets/icons/logo-opera.svg"> — <span v-html="$t('streamdeck.connect_form.opera', { IP: param_ip.value })"></span></li>
								<li><img class="logo" src="@/assets/icons/logo-safari.svg"> — <span v-html="$t('streamdeck.connect_form.safari', { IP: param_ip.value })"></span></li>
							</ul>
						</div>
				</ToggleBlock>
			</form>
		</section>
	</div>
</template>

<script lang="ts">
import Splitter from '@/components/Splitter.vue';
import { ToggleBlock } from '@/components/ToggleBlock.vue';
import TTButton from '@/components/TTButton.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import StreamdeckSocket from '@/utils/StreamdeckSocket';
import { Component, toNative, Vue } from 'vue-facing-decorator';
import type IParameterContent from '../IParameterContent';
import { ParamItem } from '../../ParamItem.vue';
import Utils from '@/utils/Utils';

@Component({
	components:{
		TTButton,
		Splitter,
		ToggleBlock,
		ParamItem,
	},
	emits:[]
})
class ConnectStreamdeck extends Vue implements IParameterContent {
	
	public error:string = "";
	public connecting:boolean = false;
	public securityWarning:boolean = false;
	public param_ip:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"127.0.0.1", label:"IP"};
	public param_secretKey:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", labelKey:"global.key", icon:"key", longText:false };

	public get contentConnexions():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.CONNECTIONS; }
	public get subcontentOBS():TwitchatDataTypes.ParamDeepSectionsStringType { return TwitchatDataTypes.ParamDeepSections.OBS; }
	public get connected():boolean { return StreamdeckSocket.instance.connected.value }

	public onNavigateBack(): boolean { return false; }

	public mounted():void {
		this.param_ip.value = StreamdeckSocket.instance.ip;
		this.param_secretKey.value = StreamdeckSocket.instance.secretKey;
		this.onIpChange();
	}

	public async connect():Promise<void> {
		this.error = '';
		this.connecting = true;
		await Utils.promisedTimeout(250);
		StreamdeckSocket.instance.connect(this.param_secretKey.value, this.param_ip.value).then((res) => {
			if(!res) this.error = "UNKNOWN_ERROR";
			else this.error = '';
		}).catch((reason) => {
			this.error = reason;
		}).finally(() => {
			this.connecting = false;
		});
	}

	public disconnect():void {
		console.log("Disconnecting from Streamdeck");
		StreamdeckSocket.instance.disconnect();
	}

	public onIpChange():void {
		this.securityWarning = (this.param_ip.value.trim() != "127.0.0.1" && this.param_ip.value.trim() != "localhost")
	}

}
export default toNative(ConnectStreamdeck);
</script>

<style scoped lang="less">
.paramsstreamdeck{
	.connected {
		display: inline-flex;
		align-items: center;
		gap: .5em;
		margin: auto;
		.icon {
			height: 1em;
		}
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

		.security {
			white-space: pre-line;
			line-height: 1.25em;

			.head {
				margin-bottom: 1em;
			}

			.logo {
				height: 1.5em;
				margin-right: .25em;
				vertical-align: middle;
				filter:drop-shadow(0 0 4px rgba(0,0,0,.7));
			}

			.icon {
				height: 1em;
				margin-right: .5em;
			}
		}
	}

	.loader {
		margin: auto;
		height: 1.75em;
	}

	.error {
		cursor: pointer;
		margin: auto;
	}

	ul {
		list-style: disc;
		list-style-position: inside;
		padding-left: 1em;
		margin-top: 1em;;
		li:not(:last-child) {
			margin-bottom: .5em;
		}
		::v-deep(mark) {
			padding: 0;
			font-weight: normal;
		}
	}

	.secretKeyHolder {
		gap: .5em;
		display: flex;
		flex-direction: column;
		.secretKeyDetails {
			width: fit-content;
			max-width: 400px;
			align-self: center;

			.info {
				font-size: .8em;
			}
		}
	}
}
</style>
