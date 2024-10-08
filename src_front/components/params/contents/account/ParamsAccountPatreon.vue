<template>
	<div class="paramsaccountpatreon">

		<Icon name="loader" v-if="authenticating" />

		<div class="earlyDonor" v-else-if="$store.auth.premiumType == 'earlyDonor'">
			<div class="card-item premium large">
				<Icon name="gift" theme="light" />
				<div>{{ $t("premium.early_donor1") }}</div>
			</div>
			<i18n-t class="info" scope="global" tag="div" keypath="premium.early_donor2">
				<template #LINK>
					<a href="https://www.patreon.com/join/durss" target="_blank">{{ $t("premium.early_donor2_link") }}</a>
				</template>
				<template #DONATE>
					<a href="#" @click.prevent="openDonate(false)">{{ $t("premium.early_donor2_donate") }}</a>
				</template>
			</i18n-t>
		</div>

		<div class="earlyDonor" v-else-if="$store.auth.premiumType == 'gifted'">
			<div class="card-item premium large">
				<Icon name="gift" theme="light" />
				<div>{{ $t("premium.gifted") }}</div>
			</div>
			<i18n-t class="info" scope="global" tag="div" keypath="premium.early_donor2">
				<template #LINK>
					<a href="https://www.patreon.com/join/durss" target="_blank">{{ $t("premium.early_donor2_link") }}</a>
				</template>
				<template #DONATE>
					<a href="#" @click.prevent="openDonate(false)">{{ $t("premium.early_donor2_donate") }}</a>
				</template>
			</i18n-t>
		</div>

		<div class="premiumDonor" v-else-if="$store.auth.premiumType == 'lifetime'">
			<div class="card-item premium large">
				<Icon name="premium" theme="light" />
				<div>{{ $t("premium.premium_donor1") }}</div>
			</div>
			<i18n-t class="info" scope="global" tag="div" keypath="premium.early_donor2">
				<template #LINK>
					<a href="https://www.patreon.com/join/durss" target="_blank">{{ $t("premium.early_donor2_link") }}</a>
				</template>
				<template #DONATE>
					<a href="#" @click.prevent="openDonate(false)">{{ $t("premium.early_donor2_donate") }}</a>
				</template>
			</i18n-t>
		</div>

		<template v-else-if="connected || $store.auth.premiumType == 'patreon'">
			<span>{{ $t("patreon.connected") }}</span>
			<template v-if="$store.auth.premiumType == 'patreon'">
				<span class="card-item premium large">{{ $t("patreon.is_member") }}</span>
				<span class="details on">{{ $t("patreon.is_member_details") }}</span>
			</template>
			<template v-else-if="!authenticating">
				<span class="card-item secondary">{{ $t("patreon.is_not_member") }}</span>
				<span class="details off">{{ $t("patreon.is_not_member_details") }}</span>
				<i18n-t scope="global" tag="div" keypath="patreon.info">
					<template #LINK>
						<a href="https://www.patreon.com/join/durss" target="_blank">{{ $t("patreon.info_link") }}</a>
					</template>
				</i18n-t>
			</template>

			<Button @click="disconnect()" alert icon="cross">{{ $t("global.disconnect") }}</Button>
		</template>

		<template v-else>
			<i18n-t scope="global" tag="div" keypath="patreon.info">
				<template #LINK>
					<a href="https://www.patreon.com/join/durss" target="_blank">{{ $t("patreon.info_link") }}</a>
				</template>
			</i18n-t>

			<i18n-t scope="global" tag="div" keypath="patreon.alternative">
				<template #LINK>
					<a @click="openDonate()">{{ $t("patreon.alternative_link", {AMOUNT:$config.LIFETIME_DONOR_VALUE}) }}</a>
				</template>
			</i18n-t>

			<Button v-if="!connected" icon="patreon" @click="authenticate()" :loading="redirecting" premium>{{ $t("patreon.linkBt") }}</Button>

			<div v-if="patreonDown" class="card-item alert apiDown"><Icon name="alert" theme="light"/>{{ $t("patreon.api_down") }}</div>
		</template>
	</div>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import ApiHelper from '@/utils/ApiHelper';
import { Component, Vue, toNative } from 'vue-facing-decorator';

@Component({
	components:{
		Button: TTButton,
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

	public async disconnect():Promise<void> {
		this.$store.patreon.disconnect();
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
	gap: .5em;

	.details{
		white-space: pre-line;
		text-align: center;
		&.off {
			color: var(--color-secondary);
		}
	}
	.large {
		gap: .5em;
		display: flex;
		flex-direction: row;
		align-items: center;
		font-size: 1.25em;
		flex-shrink: 1;
		text-align: center;
		.icon {
			width: 3em;
			height: 3em;
			min-width: 3em;
			max-width: 3em;
		}
		div {
			flex-grow: 1;
		}
	}

	.earlyDonor, .premiumDonor {
		.info {
			margin-top: .5em;
			text-align: center;
			font-size: 1.25em;
		}
	}

	.apiDown {
		white-space: pre-line;
		line-height: 1.25em;
		.icon {
			height: 1em;
			margin-right: .5em;
		}
	}
}
</style>
