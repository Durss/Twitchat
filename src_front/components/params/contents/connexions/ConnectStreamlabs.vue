C<template>
	<div class="connectstreamlabs parameterContent">
		<Icon name="streamlabs" class="icon" />
		
		<div class="head">
			<i18n-t scope="global" tag="span" keypath="streamlabs.header">
				<template #LINK>
					<a href="https://streamlabs.com/" target="_blank"><Icon name="newtab" />Streamlabs</a>
				</template>
				<template #CHARITY_LINK>
					<a href="https://streamlabscharity.com" target="_blank"><Icon name="newtab" />Streamlabs Charity</a>
				</template>
			</i18n-t>
		</div>

		<section v-if="!$store.streamlabs.connected">
			<TTButton type="link" :href="oAuthURL" target="_self" :loading="loading">{{ $t("global.connect") }}</TTButton>
			<div class="card-item alert error" v-if="error" @click="error = false">{{ $t("error.streamlabs_connect_failed") }}</div>
		</section>

		<template v-else>
			<section>
				<TTButton alert @click="disconnect()">{{ $t("global.disconnect") }}</TTButton>
			</section>
	
			<section class="card-item charity">
				<div class="header">
					<span class="title"><Icon name="notification" />{{ $t("streamlabs.charity_title") }}</span>
				</div>
				<template v-if="$store.streamlabs.charityTeam">
					<i18n-t scope="global" keypath="streamlabs.charity_connected" class="info" tag="div">
						<template #NAME>
							<a :href="$store.streamlabs.charityTeam.pageUrl" target="_blank"><Icon name="newtab"/>{{ $store.streamlabs.charityTeam.title }}</a>
						</template>
					</i18n-t>
					<TTButton alert @click="disconnectCharityCampaign()">{{ $t("global.disconnect") }}</TTButton>
				</template>
				<template v-else>
					<div class="info">
						<Icon name="info" />
						<i18n-t scope="global" keypath="streamlabs.charity_header">
							<template #OVERLAY>
								<a @click.stop="openGoalsOverlay()">{{ $t("streamlabs.charity_header_overlayBt") }}</a>
							</template>
						</i18n-t>
					</div>
					<form @submit.prevent="submitCharity()">
						<ul>
							<li><a href="https://streamlabscharity.com/profile/user/teams" target="_blank"><Icon name="newtab" />{{ $t("streamlabs.step1") }}</a></li>
							<li>{{ $t("streamlabs.step2") }}</li>
							<li>{{ $t("streamlabs.step3") }}</li>
							<li>{{ $t("streamlabs.step4") }}</li>
							<li class="input">
								<label for="charityTeamURL">{{ $t("streamlabs.step5") }}</label>
								<input id="charityTeamURL" type="text" v-model="charityURL" pattern="https://streamlabscharity.com/teams.*" placeholder="https://streamlabscharity.com/teams/@...">
							</li>
							<li>
								<Icon name="alert" theme="secondary"/>
								<Icon name="alert" theme="secondary"/>
								<Icon name="alert" theme="secondary"/>
								<i18n-t scope="global" keypath="streamlabs.step6">
									<template #LINK>
										<a :href="$t('streamlabs.step6_url')" target="_blank"><Icon name="newtab"/>{{ $t("streamlabs.step6_link") }}</a>
									</template>
								</i18n-t>
							</li>
						</ul>
						<TTButton type="submit" icon="checkmark" :loading="connectingCharity" :disabled="charityURL.trim().length == 0" primary>{{ $t("global.submit") }}</TTButton>
						<div class="card-item alert error" @click="charityError=false" v-if="charityError">{{ $t("streamlabs.charity_error") }}</div>
					</form>
				</template>
			</section>
	
			<section v-if="!$store.auth.isPremium" class="card-item premium">
				<div class="header">
					<span class="title"><Icon name="notification" />{{ $t("streamlabs.personnal_title") }}</span>
				</div>
				<div class="info">{{ $t("streamlabs.personnal_header") }}</div>
				<TTButton icon="premium" @click="openPremium()" premium light>{{ $t('premium.become_premiumBt')  }}</TTButton>
			</section>
		</template>

		<section class="examples">
			<h2><Icon name="whispers"/>{{$t("streamlabs.examples")}}</h2>
			<MessageItem v-if="fakeDonation" :messageData="fakeDonation" />
			<MessageItem v-if="fakeMerch" :messageData="fakeMerch" />
			<MessageItem v-if="fakePatreon" :messageData="fakePatreon" />
			<MessageItem v-if="fakeCharity" :messageData="fakeCharity" />
		</section>
	</div>
</template>

<script lang="ts">
import MessageItem from '@/components/messages/MessageItem.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Vue, toNative } from 'vue-facing-decorator';
import TTButton from '@/components/TTButton.vue';
import Utils from '@/utils/Utils';

@Component({
	components:{
		TTButton,
		MessageItem,
	},
	emits:[],
})
class ConnectStreamlabs extends Vue {

	public error = false;
	public charityError = false;
	public loading = false;
	public connectingCharity = false;
	public oAuthURL = "";
	public charityURL = "";
	public fakeDonation:TwitchatDataTypes.StreamlabsDonationData|undefined = undefined;
	public fakeMerch:TwitchatDataTypes.StreamlabsMerchData|undefined = undefined;
	public fakePatreon:TwitchatDataTypes.StreamlabsPatreonPledgeData|undefined = undefined;
	public fakeCharity:TwitchatDataTypes.StreamlabsCharityData|undefined = undefined;

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
		this.$store.debug.simulateMessage<TwitchatDataTypes.StreamlabsCharityData>(TwitchatDataTypes.TwitchatMessageType.STREAMLABS, (mess) => {
			mess.eventType = "charity";
			mess.campaign = {
				id:Utils.getUUID(),
				title:"Awesome charity campaign",
				url:"https://streamlabscharity.com"
			}
			this.fakeCharity = mess;
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
	 * Disconnects from streamlabs charity campaign only
	 */
	public disconnectCharityCampaign():void{
		this.$store.streamlabs.disconnectCharityCampaign();
	}

	/**
	 * Opens the premium param page
	 */
	public openPremium():void{
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
	}

	/**
	 * Opens the Goals overlay
	 */
	public openGoalsOverlay():void{
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.OVERLAYS, "donationgoals");
	}

	/**
	 * Submit streamlabs charity campaign url
	 */
	public async submitCharity():Promise<void>{
		this.connectingCharity = true;
		const result = await this.$store.streamlabs.loadCharityCampaignInfo(this.charityURL);
		this.charityError = !result;
		this.connectingCharity = false;
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

	.info {
		.icon {
			height: 1em;
			margin-right: .25em;
			vertical-align: middle;
		}
	}

	.charity {
		gap: .5em;
		display: flex;
		flex-direction: column;
		form {
			gap: .5em;
			display: flex;
			flex-direction: column;
			.button {
				align-self: center;
			}
		}
		ul {
			list-style: decimal;
			margin-left: 3em;
			margin-top: .5em;
			li {
				margin-bottom: 1em;
				line-height: 1.25em;
				.icon {
					height: 1em;
					margin-right: .25em;
				}
			}
		}
		a {
			.icon {
				height: 1em;
				vertical-align: middle;
				margin-right: .25em;
			}
		}

		.input input {
			width: 100%;
		}
	}
}
</style>