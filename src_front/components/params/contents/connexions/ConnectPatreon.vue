<template>
	<div class="connectpatreon parameterContent">
		<Icon name="patreon" alt="patreon icon" class="icon" />

		<div class="head">
			<i18n-t scope="global" tag="span" keypath="patreon.header">
				<template #LINK>
					<a href="https://patreon.com/" target="_blank"><Icon name="newtab" />Patreon</a>
				</template>
			</i18n-t>
		</div>

		<div class="card-item secondary" style="text-align: center"><Icon name="info" style="height: 1em; margin-right: .25em; vertical-align: bottom;" />This is a work in progress ! You won't get notified on chat yet !</div>

		<section v-if="!$store.auth.isPremium">
			<TTButton icon="premium" @click="openPremium()" premium big>{{ $t('premium.become_premiumBt')  }}</TTButton>
		</section>

		<section v-else-if="!connected">
			<TTButton type="link" :href="oAuthURL" target="_self" :loading="loading">{{ $t("global.connect") }}</TTButton>
			<div class="card-item alert error" v-if="error" @click="error = false">{{ $t("error.streamelements_connect_failed") }}</div>
		</section>

		<section v-else>
			<TTButton alert @click="disconnect()">{{ $t("global.disconnect") }}</TTButton>
		</section>

		<section class="examples">
			<h2><Icon name="whispers"/>{{$t("streamelements.examples")}}</h2>
			<MessageItem v-if="fakeMember" :messageData="fakeMember" />
		</section>

	</div>
</template>

<script lang="ts">
import MessageItem from '@/components/messages/MessageItem.vue';
import TTButton from '@/components/TTButton.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		TTButton,
		MessageItem,
	},
	emits:[],
})
class ConnectPatreon extends Vue {

	public error = false;
	public loading = false;
	public oAuthURL = "";
	public fakeMember:TwitchatDataTypes.PatreonNewMemberData|undefined = undefined;

	public get connected():boolean { return this.$store.patreon.connected && this.$store.patreon.webhookScopesGranted; }

	public async mounted():Promise<void> {
		if(!this.connected) {
			this.loading = true;
			this.loadAuthURL();
			await this.$store.patreon.completeOAuthFlow();
			this.loading = false;
		}
		this.$store.debug.simulateMessage<TwitchatDataTypes.PatreonNewMemberData>(TwitchatDataTypes.TwitchatMessageType.PATREON, (mess) => {
			mess.eventType = "new_member";
			this.fakeMember = mess;
		}, false);
	}

	public async createWebhook():Promise<void> {
		this.loading = true;
		await this.$store.patreon.createWebhook();
		this.loading = false;
	}

	/**
	 * Disconnects from patreon
	 */
	public disconnect():void{
		this.$store.patreon.disconnect();
	}

	/**
	 * Opens the premium param page
	 */
	public openPremium():void{
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
	}

	/**
	 * Start authentication flow
	 */
	public async loadAuthURL():Promise<void> {
		this.loading = true;
		this.oAuthURL = await this.$store.patreon.getOAuthURL();
		this.loading = false;
	}

	/**
	 * Start authentication flow
	 */
	public async authenticate():Promise<void> {
		this.loading = true;
		document.location = this.oAuthURL;
	}

}
export default toNative(ConnectPatreon);
</script>

<style scoped lang="less">
.connectpatreon{
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