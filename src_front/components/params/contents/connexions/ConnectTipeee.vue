<template>
	<div class="connecttipeee parameterContent">
		<Icon name="tipeee" class="icon" />
		
		<div class="head">
			<i18n-t scope="global" tag="span" keypath="tipeee.header">
				<template #LINK>
					<a href="https://www.tipeeestream.com/" target="_blank">Tipeee Stream</a>
				</template>
			</i18n-t>
		</div>

		<section v-if="!$store.auth.isPremium">
			<TTButton icon="premium" @click="openPremium()" premium big>{{ $t('premium.become_premiumBt')  }}</TTButton>
		</section>

		<section v-else-if="!$store.tipeee.connected">
			<TTButton type="link" :href="oAuthURL" target="_self" :loading="loading">{{ $t("global.connect") }}</TTButton>
			<div class="card-item alert error" v-if="error" @click="error = false">{{ $t("error.tipeee_connect_failed") }}</div>
		</section>

		<section v-else>
			<TTButton alert @click="disconnect()">{{ $t("global.disconnect") }}</TTButton>
		</section>

		<section class="examples">
			<h2><Icon name="whispers"/>{{$t("tipeee.examples")}}</h2>
			<MessageItem v-if="fakeDonation" :messageData="fakeDonation" />
			<MessageItem v-if="fakeSub" :messageData="fakeSub" />
			<MessageItem v-if="fakeResub" :messageData="fakeResub" />
		</section>
	</div>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
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
class ConnectTipeee extends Vue {

	public error = false;
	public loading = false;
	public oAuthURL = "";
	public fakeDonation:TwitchatDataTypes.MessageTipeeeDonationData|undefined = undefined;
	public fakeSub:TwitchatDataTypes.MessageTipeeeDonationData|undefined = undefined;
	public fakeResub:TwitchatDataTypes.MessageTipeeeDonationData|undefined = undefined;

	public beforeMount():void {
		if(!this.$store.tipeee.connected) {
			if(this.$store.tipeee.authResult.code) {
				//Complete oauth process
				this.loading = true
				this.$store.tipeee.completeOAuthProcess()
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

		this.$store.debug.simulateMessage<TwitchatDataTypes.MessageTipeeeDonationData>(TwitchatDataTypes.TwitchatMessageType.TIPEEE, (mess) => {
			this.fakeDonation = mess;
		}, false);
		this.$store.debug.simulateMessage<TwitchatDataTypes.MessageTipeeeDonationData>(TwitchatDataTypes.TwitchatMessageType.TIPEEE, (mess) => {
			mess.recurring = true;
			this.fakeSub = mess;
		}, false);
		this.$store.debug.simulateMessage<TwitchatDataTypes.MessageTipeeeDonationData>(TwitchatDataTypes.TwitchatMessageType.TIPEEE, (mess) => {
			mess.recurring = true;
			mess.recurringCount = Math.round(Math.random() *10)
			this.fakeResub = mess;
		}, false);
	}

	/**
	 * Opens the premium param page
	 */
	public openPremium():void{
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
	}

	/**
	 * Disconnects from tipeee
	 */
	public disconnect():void{
		this.$store.tipeee.disconnect();
		this.loadAuthURL();
	}

	/**
	 * initiliaze the auth url
	 */
	private loadAuthURL():void{
		this.loading = true;
		this.$store.tipeee.getOAuthURL().then(res => {
			this.oAuthURL = res;
			this.loading = false;
		});
	}

}
export default toNative(ConnectTipeee);
</script>

<style scoped lang="less">
.connecttipeee{
	.error {
		cursor: pointer;
		line-height: 1.2em;
		text-align: center;
		white-space: pre-line;
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
}
</style>