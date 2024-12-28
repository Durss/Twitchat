<template>
	<div class="connectkofi parameterContent">
		<Icon name="kofi" class="icon" />
		
		<div class="head">
			<i18n-t scope="global" tag="span" keypath="kofi.header">
				<template #LINK>
					<a href="https://ko-fi.com/" target="_blank"><Icon name="newtab" />Ko-fi</a>
				</template>
			</i18n-t>
		</div>

		<section v-if="!$store.auth.isPremium">
			<TTButton icon="premium" @click="openPremium()" premium big>{{ $t('premium.become_premiumBt')  }}</TTButton>
		</section>

		<template v-else-if="!$store.kofi.connected">
			<ol>
				<li class="card-item">
					<span class="index">1.</span>
					<a href="https://ko-fi.com/manage/webhooks" target="_blank">{{ $t("kofi.open_dashboard") }}</a>
				</li>

				<li class="card-item">
					<span class="index">2.</span>
					<span>{{ $t("kofi.set_url") }}</span>
					<input type="text" :value="webhookURL" v-click2Select readonly>
				</li>
				
				<li class="card-item">
					<span class="index">3.</span>
					<span>{{ $t("kofi.find_key") }}</span>
				</li>

				<li class="card-item">
					<span class="index">4.</span>
					<span>{{ $t("kofi.set_token") }}</span>
					<input type="text" v-model="token">
				</li>

				<li class="card-item">
					<span class="index">5.</span>
					<TTButton icon="kofi" @click="connect()" :disabled="token.length < 36" :loading="loading">{{ $t('global.connect')  }}</TTButton>
				</li>
			</ol>

			<div class="card-item alert error" v-if="error" @click="error = ''">{{ error }}</div>
		</template>
		

		<section class="connected" v-else>
			<TTButton alert @click="disconnect()" :loading="loading">{{ $t("global.disconnect") }}</TTButton>
			
			<ToggleBlock :title="$t('global.advanced_params')" class="advancedParams" small :open="false">
				<form @submit.prevent="" class="additionalWebhooks">
					<div>{{ $t('kofi.advanced_params_header') }}</div>
					<div class="entry" v-for="(url, index) in $store.kofi.webhooks">
						<input type="text"
							@blur="$store.kofi.saveConfigs()"
							pattern="https?:\/\/.*"
							v-model="$store.kofi.webhooks[index]"
							:placeholder="$t('kofi.webhook_placeholder')">
						
						<TTButton icon="trash" alert @click="$store.kofi.webhooks.splice(index,1); $store.kofi.saveConfigs()" />
					</div>
					<TTButton @click="addWebhook()" v-if="$store.kofi.webhooks.length < 5" icon="add">{{ $t("kofi.add_webhookBt") }}</TTButton>
				</form>
			</ToggleBlock>
		</section>

		<section class="examples">
			<h2><Icon name="whispers"/>{{$t("kofi.examples")}}</h2>
			<Icon name="loader" v-if="!fakeDonation || !fakeMerch || !fakeSubscription" />
			<template v-else>
				<MessageItem :messageData="fakeDonation" />
				<MessageItem :messageData="fakeMerch" />
				<MessageItem :messageData="fakeSubscription" />
			</template>
		</section>
	</div>
</template>

<script lang="ts">
import { TTButton } from '@/components/TTButton.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import MessageItem from '@/components/messages/MessageItem.vue';
import DataStore from '@/store/DataStore';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import { Component, Vue, toNative } from 'vue-facing-decorator';

@Component({
	components:{
		TTButton,
		MessageItem,
		ToggleBlock,
	},
	emits:[],
})
class ConnectKofi extends Vue {

	public token = "";
	public error = "";
	public loading = false;
	public fakeDonation:TwitchatDataTypes.KofiDonationData|undefined = undefined;
	public fakeMerch:TwitchatDataTypes.KofiMerchData|undefined = undefined;
	public fakeSubscription:TwitchatDataTypes.KofiSubscriptionData|undefined = undefined;

	public get webhookURL():string {
		return this.$config.API_PATH+"/kofi/webhook";
	}

	public beforeMount():void {
		this.$store.debug.simulateMessage<TwitchatDataTypes.KofiDonationData>(TwitchatDataTypes.TwitchatMessageType.KOFI, (mess) => {
			mess.eventType = "donation";
			this.fakeDonation = mess;
		}, false);
		this.$store.debug.simulateMessage<TwitchatDataTypes.KofiMerchData>(TwitchatDataTypes.TwitchatMessageType.KOFI, (mess) => {
			mess.eventType = "merch";
			mess.products = [{id:"123456", name:"T-shirt", quantity:1}, {id:"234561", name:"Hoodie", quantity:1}];
			this.fakeMerch = mess;
		}, false);
		this.$store.debug.simulateMessage<TwitchatDataTypes.KofiSubscriptionData>(TwitchatDataTypes.TwitchatMessageType.KOFI, (mess) => {
			mess.eventType = "subscription";
			mess.tier = Utils.pickRand(["Gold", "Bronze", "Silver", "Poop"]);
			this.fakeSubscription = mess;
		}, false);
	}

	/**
	 * Connects to kofi
	 */
	public async connect():Promise<void>{
		this.loading = true;
		const success = await this.$store.kofi.connect(this.token);
		this.error = !success? this.$t("error.kofi_connect_failed") : "";
		this.loading = false;
	}

	/**
	 * Disconnects from kofi
	 */
	public async disconnect():Promise<void>{
		this.loading = true;
		const success = await this.$store.kofi.disconnect();
		this.error = !success? this.$t("error.kofi_disconnect_failed") : "";
		this.loading = false;
	}

	/**
	 * Opens the premium param page
	 */
	public openPremium():void{
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
	}

	/**
	 * Opens the premium param page
	 */
	public addWebhook():void{
		this.$store.kofi.webhooks.push("");
	}

}
export default toNative(ConnectKofi);
</script>

<style scoped lang="less">
.connectkofi{
	.error {
		cursor: pointer;
		line-height: 1.2em;
		text-align: center;
		white-space: pre-line;
	}
	
	ol {
		gap: 1em;
		display: flex;
		flex-direction: column;
		list-style-position: inside;
		list-style-type: none;
		li {
			width: 100%;
			line-height: 1.2em;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			.index {
				display: block;
				font-weight: bold;
				font-size: 1.2em;
				margin-right: .5em;
			}

			input {
				flex-basis: 100%;
				margin-top: .5em;
			}
	
			.button {
				display: flex;
				margin: 0 auto;
				align-self: center;
				justify-self: center;
			}
		}
	}

	.connected {
		align-items: center
	}

	.examples {
		margin-top: 2em;
		.icon {
			height: 1em;
			margin-right: .5em;
			vertical-align: middle;
		}
		.chatMessage  {
			font-size: 1em;
		}
	}

	.advancedParams {
		margin-top: 1em;
	}

	.additionalWebhooks {
		display: flex;
		flex-direction: column;
		gap: .25em;

		.entry {
			gap: 1px;
			display: flex;
			flex-direction: row;
			input {
				width: 0;
				flex-grow: 1;
				border-top-right-radius: 0;
				border-bottom-right-radius: 0;
				border: 1px solid transparent;
			}
			input:invalid {
				border-color: var(--color-alert);
				background-color: var(--color-alert-fadest);
			}
			.button {
				border-top-left-radius: 0;
				border-bottom-left-radius: 0;
			}
		}
	}
}
</style>