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
		</section>

		<section v-if="error">
			<div class="card-item alert message error" @click="error = false">{{ $t("streamdeck.connect_failed") }}</div>
		</section>

		<section v-if="connecting">
			<icon name="loader" class="loader" />
		</section>

		<section>
			<ToggleBlock :title="$t('global.advanced_params')" small :open="false">
				<form @submit.prevent="connect()">
					<ParamItem :paramData="param_ip" v-model="param_ip.value" @change="onIpChange()" noBackground />
					<TTButton type="submit" :disabled="connecting" icon="online">{{ $t("global.connect") }}</TTButton>
	
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
				</form>
			</ToggleBlock>
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
	
	public error:boolean = false;
	public connecting:boolean = false;
	public securityWarning:boolean = false;
	public param_ip:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"127.0.0.1", label:"IP"};

	public get contentConnexions():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.CONNECTIONS; }
	public get subcontentOBS():TwitchatDataTypes.ParamDeepSectionsStringType { return TwitchatDataTypes.ParamDeepSections.OBS; }
	public get connected():boolean { return StreamdeckSocket.instance.connected.value }

	public onNavigateBack(): boolean { return false; }

	public mounted():void {
		this.param_ip.value = StreamdeckSocket.instance.ip;
		this.onIpChange();
	}

	public async connect():Promise<void> {
		this.error = false;
		this.connecting = true;
		await Utils.promisedTimeout(100);
		StreamdeckSocket.instance.connect(this.param_ip.value).then((res) => {
			if(!res) this.error = true;
			else this.error = false;
		}).catch(() => {
			this.error = true;
		}).finally(() => {
			this.connecting = false;
		});
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
}
</style>
