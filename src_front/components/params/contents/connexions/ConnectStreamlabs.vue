<template>
	<div class="connectstreamlabs parameterContent">
		<Icon name="streamlabs" class="icon" />
		
		
		<div class="head">
			<i18n-t scope="global" tag="span" keypath="streamlabs.header">
				<template #LINK>
					<a href="https://streamlabs.com/" target="_blank">Streamlabs</a>
				</template>
			</i18n-t>
		</div>

		<section v-if="!$store.auth.isPremium">
			<TTButton icon="premium" @click="openPremium()" premium big>{{ $t('premium.become_premiumBt')  }}</TTButton>
		</section>

		<section v-else-if="!$store.streamlabs.connected">
			<TTButton type="link" :href="oAuthURL" target="_self" :loading="loading">{{ $t("global.connect") }}</TTButton>
			<div class="card-item alert error" v-if="error" @click="error = false">{{ $t("error.streamlabs_connect_failed") }}</div>
		</section>

		<section v-else>
			<TTButton alert @click="disconnect()">{{ $t("global.disconnect") }}</TTButton>
		</section>

		<section class="examples">
			<h2><Icon name="whispers"/>{{$t("streamlabs.examples")}}</h2>
			<MessageItem v-if="fakeDonation" :messageData="fakeDonation" />
			<MessageItem v-if="fakeMerch" :messageData="fakeMerch" />
			<MessageItem v-if="fakePatreon" :messageData="fakePatreon" />
		</section>
	</div>
</template>

<script lang="ts">
import { TTButton } from '@/components/TTButton.vue';
import MessageItem from '@/components/messages/MessageItem.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Vue, toNative } from 'vue-facing-decorator';

@Component({
	components:{
		TTButton,
		MessageItem,
	},
	emits:[],
})
class ConnectStreamlabs extends Vue {

	public error = false;
	public loading = false;
	public oAuthURL = "";
	public fakeDonation:TwitchatDataTypes.StreamlabsDonationData|undefined = undefined;
	public fakeMerch:TwitchatDataTypes.StreamlabsMerchData|undefined = undefined;
	public fakePatreon:TwitchatDataTypes.StreamlabsPatreonPledgeData|undefined = undefined;

	public beforeMount():void {
		if(!this.$store.streamlabs.connected) {
			if(this.$store.streamlabs.authResult.code) {
				//Complete oauth process
				this.loading = true
				this.$store.streamlabs.getAccessToken()
				.then(success => {
					this.error = !success;
					this.loading = false;
					this.loadAuthURL();
				})
			}else{
				//Preload oAuth URL
				this.loadAuthURL();
			}
		}
		this.$store.debug.simulateMessage<TwitchatDataTypes.StreamlabsDonationData>(TwitchatDataTypes.TwitchatMessageType.STREAMLABS, (mess) => {
			mess.eventType = "donation";
			this.fakeDonation = mess;
		}, false);
		this.$store.debug.simulateMessage<TwitchatDataTypes.StreamlabsMerchData>(TwitchatDataTypes.TwitchatMessageType.STREAMLABS, (mess) => {
			mess.eventType = "merch";
			mess.product = "T-shirt";
			this.fakeMerch = mess;
		}, false);
		this.$store.debug.simulateMessage<TwitchatDataTypes.StreamlabsPatreonPledgeData>(TwitchatDataTypes.TwitchatMessageType.STREAMLABS, (mess) => {
			mess.eventType = "patreon_pledge";
			this.fakePatreon = mess;
		}, false);
	}

	/**
	 * Disconnects from streamlabs
	 */
	public disconnect():void{
		this.$store.streamlabs.disconnect();
		this.loadAuthURL();
	}

	/**
	 * Opens the premium param page
	 */
	public openPremium():void{
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
	}

	/**
	 * initiliaze the auth url
	 */
	private loadAuthURL():void{
		this.loading = true;
		this.$store.streamlabs.getOAuthURL().then(res => {
			this.oAuthURL = res;
			this.loading = false;
		});
	}

}
export default toNative(ConnectStreamlabs);
</script>

<style scoped lang="less">
.connectstreamlabs{
	.error {
		cursor: pointer;
		line-height: 1.2em;
		text-align: center;
		white-space: pre-line;
	}

	.examples {
		.icon {
			height: 1em;
			margin-right: .5em;
			vertical-align: middle;
		}
		.chatMessage  {
			font-size: 1em;
		}
	}
}
</style>