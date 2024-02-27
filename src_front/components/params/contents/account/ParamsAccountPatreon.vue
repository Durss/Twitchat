<template>
	<div class="paramsaccountpatreon">
		
		<Icon name="loader" v-if="authenticating" />

		<div class="earlyDonor" v-else-if="isEarlyDonor">
			<div class="card-item premium large">
				<Icon name="gift" theme="light" />
				<div>{{ $t("premium.early_donor1") }}</div>
			</div>
			<i18n-t class="info" scope="global" tag="div" keypath="premium.early_donor2">
				<template #LINK>
					<a href="https://www.patreon.com/join/durss" target="_blank">{{ $t("premium.early_donor2_link") }}</a>
				</template>
			</i18n-t>
		</div>

		<div class="premiumDonor" v-else-if="$store.auth.twitch.user.donor.isPremiumDonor === true">
			<div class="card-item premium large">
				<Icon name="premium" theme="light" />
				<div>{{ $t("premium.premium_donor1") }}</div>
			</div>
			<i18n-t class="info" scope="global" tag="div" keypath="premium.early_donor2">
				<template #LINK>
					<a href="https://www.patreon.com/join/durss" target="_blank">{{ $t("premium.early_donor2_link") }}</a>
				</template>
			</i18n-t>
		</div>
	
		<template v-else-if="connected">
			<span>{{ $t("patreon.connected") }}</span>
			<template v-if="isMember==true">
				<span class="card-item premium large">{{ $t("patreon.is_member") }}</span>
				<span class="details on">{{ $t("patreon.is_member_details") }}</span>
			</template>
			<template v-else-if="isMember==false && !authenticating">
				<span class="card-item secondary">{{ $t("patreon.is_not_member") }}</span>
				<span class="details off">{{ $t("patreon.is_not_member_details") }}</span>
			</template>

			<Button @click="disconnect()" alert icon="cross">{{ $t("global.disconnect") }}</Button>
		</template>

		<template v-if="(!connected || (connected && !isMember)) && !isEarlyDonor">
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
import Config from '@/utils/Config';
import PatreonHelper from '@/utils/patreon/PatreonHelper';
import {toNative,  Component, Vue } from 'vue-facing-decorator';

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

	private csrfToken:string = "";

	public get connected():boolean { return PatreonHelper.instance.connected; }
	public get isMember():boolean { return PatreonHelper.instance.isMember; }
	public get isEarlyDonor():boolean { return this.$store.auth.twitch.user.donor.earlyDonor; }

	public async mounted():Promise<void> {
		const {json} = await ApiHelper.call("patreon/isApiDown");
		this.patreonDown = json.data.isDown === true;
		
		
		// PatreonHelper.instance.connect();
		const authParams = this.$store.patreon.patreonAuthParams;
		if(authParams) {
			this.authenticating = true;

			const {json:csrf} = await ApiHelper.call("auth/CSRFToken", "POST", {token:authParams.csrf});
			if(!csrf.success) {
				this.$store.main.alert(csrf.message || "Patreon authentication failed");
			}else{
				try {
					await PatreonHelper.instance.authenticate(authParams.code);
				}catch(e:unknown) {
					console.log(e);
					this.$store.main.alert("Oops... something went wrong");
				}
			}

			this.authenticating = false;
			this.$store.patreon.setPatreonAuthResult(null);
		}

	}

	public async disconnect():Promise<void> {
		PatreonHelper.instance.disconnect();
	}

	public async authenticate():Promise<void> {
		this.redirecting = true;
		
		const {json} = await ApiHelper.call("auth/CSRFToken");
		this.csrfToken = json.token;
		const url = new URL("https://www.patreon.com/oauth2/authorize");
		url.searchParams.append("response_type", "code");
		url.searchParams.append("client_id", Config.instance.PATREON_CLIENT_ID);
		url.searchParams.append("redirect_uri", PatreonHelper.instance.redirectURI);
		url.searchParams.append("scope", Config.instance.PATREON_SCOPES);
		url.searchParams.append("state", this.csrfToken);
		document.location = url.href;
	}

	public openDonate():void {
		this.$store.params.openParamsPage("donate", TwitchatDataTypes.ParamDeepSections.PREMIUM)
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
	}

	.earlyDonor {
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