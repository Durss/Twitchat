<template>
	<div class="connectstreamelements parameterContent">
		<Icon name="streamelements" class="icon" />
		
		<div class="head">
			<i18n-t scope="global" tag="span" keypath="streamelements.header">
				<template #LINK>
					<a href="https://streamelements.com/" target="_blank">Streamelements</a>
				</template>
			</i18n-t>
		</div>

		<section v-if="!$store.auth.isPremium">
			<TTButton icon="premium" @click="openPremium()" premium big>{{ $t('premium.become_premiumBt')  }}</TTButton>
		</section>

		<section v-else-if="!$store.streamelements.connected">
			<TTButton type="link" :href="oAuthURL" target="_self" :loading="loading">{{ $t("global.connect") }}</TTButton>
			<div class="card-item alert error" v-if="error" @click="error = false">{{ $t("error.streamelements_connect_failed") }}</div>
		</section>

		<section v-else>
			<TTButton alert @click="disconnect()">{{ $t("global.disconnect") }}</TTButton>
		</section>

		<section class="examples">
			<h2><Icon name="whispers"/>{{$t("streamelements.examples")}}</h2>
			<MessageItem v-if="fakeDonation" :messageData="fakeDonation" />
		</section>
	</div>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import TTButton from '@/components/TTButton.vue';
import MessageItem from '@/components/messages/MessageItem.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Vue, toNative } from 'vue-facing-decorator';

@Component({
	components:{
		Icon,
		TTButton,
		MessageItem,
	},
	emits:[],
})
class ConnectStreamelements extends Vue {

	public error = false;
	public loading = false;
	public oAuthURL = "";
	public fakeDonation:TwitchatDataTypes.StreamelementsDonationData|undefined = undefined;

	public beforeMount():void {
		if(!this.$store.streamelements.connected) {
			if(this.$store.streamelements.authResult.code) {
				//Complete oauth process
				this.loading = true
				this.$store.streamelements.getAccessToken()
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
		this.$store.debug.simulateMessage<TwitchatDataTypes.StreamelementsDonationData>(TwitchatDataTypes.TwitchatMessageType.STREAMELEMENTS, (mess) => {
			mess.eventType = "donation";
			this.fakeDonation = mess;
		}, false);
	}

	/**
	 * Disconnects from streamlabs
	 */
	public disconnect():void{
		this.$store.streamelements.disconnect();
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
		this.$store.streamelements.getOAuthURL().then(res => {
			this.oAuthURL = res;
			this.loading = false;
		});
	}

}
export default toNative(ConnectStreamelements);
</script>

<style scoped lang="less">
.connectstreamelements{
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