<template>
	<div class="paramsaccountpatreon">

		<Icon name="loader" v-if="authenticating" />

		<!-- Premium: early supporter (lifetime granted as thank you) -->
		<div class="statusBlock" v-else-if="$store.auth.premiumType == 'earlyDonor'">
			<div class="card-item premium statusCard">
				<Icon name="gift" theme="light" />
				<div class="statusContent">
					<div class="statusTitle">{{ $t("premium.early_donor1") }}</div>
					<i18n-t class="supportCta" scope="global" tag="p" keypath="premium.early_donor2">
						<template #LINK>
							<a href="https://www.patreon.com/join/durss" target="_blank">{{ $t("premium.early_donor2_link") }}</a>
						</template>
						<template #DONATE>
							<a href="#" @click.prevent="openDonate(false)">{{ $t("premium.early_donor2_donate") }}</a>
						</template>
					</i18n-t>
				</div>
			</div>
		</div>

		<!-- Premium: gifted by someone -->
		<div class="statusBlock" v-else-if="$store.auth.premiumType == 'gifted'">
			<div class="card-item premium statusCard">
				<Icon name="gift" theme="light" />
				<div class="statusContent">
					<div class="statusTitle">{{ $t("premium.gifted") }}</div>
					<i18n-t class="supportCta" scope="global" tag="p" keypath="premium.early_donor2">
						<template #LINK>
							<a href="https://www.patreon.com/join/durss" target="_blank">{{ $t("premium.early_donor2_link") }}</a>
						</template>
						<template #DONATE>
							<a href="#" @click.prevent="openDonate(false)">{{ $t("premium.early_donor2_donate") }}</a>
						</template>
					</i18n-t>
				</div>
			</div>
		</div>

		<!-- Premium: lifetime (donated enough) -->
		<div class="statusBlock" v-else-if="$store.auth.premiumType == 'lifetime'">
			<div class="card-item premium statusCard">
				<Icon name="premium" theme="light" />
				<div class="statusContent">
					<div class="statusTitle">{{ $t("premium.premium_donor1") }}</div>
				</div>
			</div>
			<i18n-t class="supportCta" scope="global" tag="p" keypath="premium.early_donor2">
				<template #LINK>
					<a href="https://www.patreon.com/join/durss" target="_blank">{{ $t("premium.early_donor2_link") }}</a>
				</template>
				<template #DONATE>
					<a href="#" @click.prevent="openDonate(false)">{{ $t("premium.early_donor2_donate") }}</a>
				</template>
			</i18n-t>
		</div>

		<!-- Connected to Patreon -->
		<template v-else-if="(connected || $store.auth.premiumType == 'patreon') && false">

			<!-- Active Patreon member = Premium -->
			<template v-if="$store.auth.premiumType == 'patreon'">
				<div class="card-item premium statusCard">
					<Icon name="premium" theme="light" />
					<div class="statusContent">
						<div class="statusTitle">{{ $t("patreon.is_member") }}</div>
						<div class="statusDetails">{{ $t("patreon.is_member_details") }}</div>
					</div>
				</div>
			</template>

			<!-- Linked but not a paying member -->
			<template v-else-if="!authenticating">
				<div class="card-item secondary statusCard left">
					<Icon name="premium" theme="light" />
					<div class="statusContent">
						<div class="statusTitle">{{ $t("patreon.is_not_member") }}</div>
						<div class="statusDetails">{{ $t("patreon.is_not_member_details") }}</div>
						<i18n-t scope="global" tag="p" class="supportCta" keypath="patreon.info">
							<template #LINK>
								<a href="https://www.patreon.com/join/durss" target="_blank">{{ $t("patreon.info_link") }}</a>
							</template>
						</i18n-t>
					</div>
				</div>
			</template>
		</template>

		<!-- Not connected: prompt to link account -->
		<div class="card-item notPremium" v-else>
			<i18n-t scope="global" tag="p" class="description" keypath="patreon.info">
				<template #LINK>
					<a href="https://www.patreon.com/join/durss" target="_blank">{{ $t("patreon.info_link") }}<icon name="newtab" /></a>
				</template>
			</i18n-t>

			<i18n-t scope="global" tag="p" class="description" keypath="patreon.alternative">
				<template #LINK>
					<a @click="openDonate()">{{ $t("patreon.alternative_link", {AMOUNT:$config.LIFETIME_DONOR_VALUE}) }}</a>
				</template>
			</i18n-t>

			<div class="actions">
				<TTButton icon="patreon" @click="authenticate()" :loading="redirecting" premium>{{ $t("patreon.linkBt") }}</TTButton>
				<TTButton icon="coin" @click="openDonate()" secondary>{{ $t("patreon.donateBt") }}</TTButton>
			</div>

			<div v-if="patreonDown" class="card-item alert apiDown">
				<Icon name="alert" theme="light"/>
				{{ $t("patreon.api_down") }}
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import ApiHelper from '@/utils/ApiHelper';
import { Component, Vue, toNative } from 'vue-facing-decorator';

@Component({
	components:{
		TTButton,
	},
	emits:[],
})
class ParamsAccountPatreon extends Vue {

	public patreonDown:boolean = false;
	public redirecting:boolean = false;
	public authenticating:boolean = false;

	public get connected():boolean { return this.$store.patreon.connected; }

	public async mounted():Promise<void> {
		const {json} = await ApiHelper.call("patreon/isApiDown", "GET");
		this.patreonDown = json.data.isDown === true;

		this.authenticating = true;
		await this.$store.patreon.completeOAuthFlow(true);
		this.authenticating = false;
	}

	public async authenticate():Promise<void> {
		this.redirecting = true;
		document.location = await this.$store.patreon.getOAuthURL(true);
	}

	public openDonate(premiumMode:boolean = true):void {
		if(premiumMode) {
			this.$store.params.openParamsPage("donate", TwitchatDataTypes.ParamDeepSections.PREMIUM);
		}else{
			this.$store.params.openParamsPage("donate");
		}
	}
}
export default toNative(ParamsAccountPatreon);
</script>

<style scoped lang="less">
.paramsaccountpatreon{
	width: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: .75em;

	.statusBlock {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: .75em;
		width: 100%;
	}

	.statusCard {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: .75em;
		width: 100%;
		padding: .75em 1em;
		&.left {
			.statusContent {
				text-align: left;
			}
		}
		.icon {
			width: 2.5em;
			height: 2.5em;
			min-width: 2.5em;
		}
		.statusContent {
			flex-grow: 1;
			text-align: center;
			.statusTitle {
				font-weight: bold;
				line-height: 1.3em;
			}
			.statusDetails {
				font-size: .85em;
				margin-top: .25em;
				opacity: .9;
				line-height: 1.3em;
				white-space: pre-line;
			}
		}
	}

	.supportCta {
		text-align: center;
		font-style: italic;
		font-size: .9em;
		opacity: .8;
		white-space: pre-line;
		margin-top: .25em;
		a {
			font-style: normal;
			font-weight: bold;
		}
	}

	.description {
		text-align: center;
		line-height: 1.4em;
		a {
			font-weight: bold;
			cursor: pointer;
			text-decoration: underline;
			.icon {
				height: 1em;
				vertical-align: middle;
				margin-left: .25em;
			}
		}
	}
	
	.actions {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: .5em;
		justify-content: center;
		margin-top: .5em;
	}

	.apiDown {
		white-space: pre-line;
		line-height: 1.25em;
		text-align: center;
		.icon {
			height: 1em;
			margin-right: .5em;
		}
	}
}
</style>
