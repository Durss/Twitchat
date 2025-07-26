<template>
	<div class="connecttiltify parameterContent">
		<Icon name="tiltify" class="icon" />

		<div class="head">
			<i18n-t scope="global" tag="span" keypath="tiltify.header">
				<template #LINK>
					<a href="https://tiltify.com/" target="_blank"><Icon name="newtab" />Tiltify</a>
				</template>
			</i18n-t>
		</div>

		<section v-if="!$store.tiltify.connected">
			<TTButton type="link" :href="oAuthURL" target="_self" :loading="loading">{{ $t("global.connect") }}</TTButton>
			<div class="card-item alert error" v-if="error" @click="error = false">{{ $t("error.tiltify_connect_failed") }}</div>
		</section>

		<template v-else>
			<section>
				<TTButton alert @click="disconnect()">
					<div class="userInfo" v-if="$store.tiltify.user">
						<span>{{ $t("global.disconnect") }} </span>
						<img :src="$store.tiltify.user.avatar.src" alt="avatar">
						<h2>{{ $store.tiltify.user.username }}</h2>
					</div>
				</TTButton>
			</section>

			<section class="card-item secondary noCampaign" v-if="$store.tiltify.campaignList.length == 0">
				<Icon name="alert" />
				<span>{{ $t("tiltify.no_campaign") }}</span>
				<TTButton type="link" href="https://tiltify.com/start" target="_blank" icon="newtab" light secondary>{{ $t("global.start") }}</TTButton>
			</section>
			<template v-else>
				<section class="card-item infos">
					<strong>{{ $t("tiltify.campaign_list", $store.tiltify.campaignList.length) }}</strong>
					<div class="campaignList">
						<div v-for="campaign in $store.tiltify.campaignList" class="campaign">
							<a :href="campaign.donate_url" target="_blank"><Icon name="newtab" />{{campaign.name}}</a>
							<TTButton clear icon="copy" v-tooltip="$t('tiltify.copy_id_tt')" @click="copyId(campaign.id)">#ID</TTButton>
						</div>
					</div>
					<span class="spaceAbove">{{ $t("tiltify.create_donation_goals") }}</span>
					<TTButton @click="openOverlay()" icon="add">{{ $t("global.create") }}</TTButton>
				</section>
			</template>
		</template>

		<section class="examples">
			<h2><Icon name="whispers"/>{{$t("tiltify.examples")}}</h2>
			<Icon name="loader" v-if="!fakeDonation" />
			<template v-else>
				<MessageItem :messageData="fakeDonation" />
			</template>
		</section>
	</div>
</template>

<script lang="ts">
import MessageItem from '@/components/messages/MessageItem.vue';
import TTButton from '@/components/TTButton.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import {toNative,  Component, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		TTButton,
		MessageItem,
	},
	emits:[],
})
class ConnectTiltify extends Vue {

	public error = false;
	public loading = false;
	public oAuthURL = "";
	public fakeDonation:TwitchatDataTypes.TiltifyDonationData|undefined = undefined;

	public beforeMount():void {
		if(!this.$store.tiltify.connected) {
			if(this.$store.tiltify.authResult.code) {
				//Complete oauth process
				this.loading = true
				this.$store.tiltify.getAccessToken()
				.then(success => {
					this.error = !success;
					this.loading = false;
					if(this.error) {
						this.loadAuthURL();
					}
				})
			}else{
				//Preload oAuth URL
				this.loadAuthURL();
			}
		}
		this.$store.debug.simulateMessage<TwitchatDataTypes.TiltifyDonationData>(TwitchatDataTypes.TwitchatMessageType.TILTIFY, (mess) => {
			mess.eventType = "donation";
			this.fakeDonation = mess;
		}, false);
				// this.$store.tiltify.connect()
				// .then(res => {
				// 	console.log(res)
				// });
	}

	/**
	 * Disconnects from streamlabs
	 */
	public disconnect():void{
		this.$store.tiltify.disconnect();
		this.loadAuthURL();
	}

	/**
	 * Open donation goal overlay section
	 */
	public openOverlay():void{
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.OVERLAYS, "donationgoals")
	}

	/**
	 * Copies ID to clipboard
	 */
	public copyId(id:string):void{
		Utils.copyToClipboard(id);
	}

	/**
	 * initiliaze the auth url
	 */
	private loadAuthURL():void{
		this.loading = true;
		this.$store.tiltify.getOAuthURL().then(res => {
			this.oAuthURL = res;
			this.loading = false;
		});
	}

}
export default toNative(ConnectTiltify);
</script>

<style scoped lang="less">
.connecttiltify{
	.userInfo {
		gap: .5em;
		display: flex;
		flex-direction: row;
		align-items: center;
		align-self: center;
		img {
			border-radius: 50%;
			height: 2em;
		}
	}

	.infos{
		gap:.5em;
		display: flex;
		flex-direction: column;
		align-items: center;
		.icon {
			height: 1em;
			vertical-align: middle;
			margin-right: .25em;
		}
		.campaignList{
			align-self: stretch;
			gap: .25em;
			display: flex;
			flex-direction: column;
			.campaign {
				display: flex;
				flex-direction: row;
				justify-content: space-between;
				align-items: center;
				padding-left: .5em;
				border-radius: var(--border-radius);
				&:hover {
					background-color: var(--background-color-fadest)
				}
			}
		}
		.spaceAbove {
			margin-top: .5em
		}
	}

	.error {
		cursor: pointer;
		line-height: 1.2em;
		text-align: center;
		white-space: pre-line;
	}

	.noCampaign {
		line-height: 1.2em;
		flex-direction: row;
		align-items: center;
		.icon {
			height: 1.5em;
		}
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

	.create {
		align-items: center;
	}
}
</style>
