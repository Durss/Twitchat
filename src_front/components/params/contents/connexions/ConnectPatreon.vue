<template>
	<div class="connectpatreon parameterContent beta">
		<Icon name="patreon" alt="patreon icon" class="icon" />

		<div class="head">
			<i18n-t scope="global" tag="span" keypath="patreon.header">
				<template #LINK>
					<a href="https://patreon.com/" target="_blank"><Icon name="newtab" />Patreon</a>
				</template>
			</i18n-t>
			<div class="card-item secondary beta" v-if="$store.auth.isPremium">
				<Icon name="alert" />
				{{ $t("patreon.beta") }}<br>
				<TTButton :href="$config.DISCORD_URL" type="link" target="_blank" class="discordBt" secondary light icon="discord">Discord</TTButton>
			</div>
		</div>

		<section v-if="!$store.auth.isPremium">
			<TTButton icon="premium" @click="openPremium()" premium big>{{ $t('premium.become_premiumBt')  }}</TTButton>
		</section>

		<section v-else-if="$store.auth.isPremium && !$store.patreon.connected">
			<TTButton type="link" :href="oAuthURL" target="_self" :loading="loading">{{ $t("global.connect") }}</TTButton>
			<div class="card-item alert error" v-if="error" @click="error = false">{{ $t("error.patreon_connect_failed") }}</div>
		</section>

		<section v-else-if="$store.patreon.connected">
			<TTButton alert @click="disconnect()">{{ $t("global.disconnect") }}</TTButton>
		</section>

		<section class="examples">
			<h2><Icon name="whispers"/>{{$t("streamelements.examples")}}</h2>
			<Icon name="loader" v-if="!fakeMember" />
			<MessageItem v-else="fakeMember" :messageData="fakeMember" />
		</section>

	</div>
</template>

<script lang="ts">
import MessageItem from '@/components/messages/MessageItem.vue';
import TTButton from '@/components/TTButton.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, toNative, Vue } from 'vue-facing-decorator';

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

	public async mounted():Promise<void> {
		if(this.$store.patreon.oauthFlowParams) {
			this.loading = true;
			if(!await this.$store.patreon.completeOAuthFlow()) {
				await this.loadAuthURL();
			}else{
				this.loading = false;
			}
		}else{
			await this.loadAuthURL();
		}
		this.$store.debug.simulateMessage<TwitchatDataTypes.PatreonNewMemberData>(TwitchatDataTypes.TwitchatMessageType.PATREON, (mess) => {
			mess.eventType = "new_member";
			this.fakeMember = mess;
		}, false);
	}

	/**
	 * Disconnects from patreon
	 */
	public disconnect():void{
		this.$store.patreon.disconnect();
		this.loadAuthURL();
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

	.beta {
		white-space: pre-line;
		.button {
			margin-top: .5em;
		}
	}

	.info {
		.icon {
			height: 1em;
			margin-right: .25em;
		}
		i {
			font-size: .8em;
			text-align: center
		}
	}
}
</style>