<template>
	<div class="paramsaccountpatreon">
		
		<Icon name="loader" v-if="authenticating" />

		<div class="earlyDonor" v-else-if="$store('auth').twitch.user.donor.earlyDonor === true">
			<div class="card-item premium head">
				<Icon name="gift" />
				<div>{{ $t("premium.early_donor1") }}</div>
			</div>
			<i18n-t class="info" scope="global" tag="div" keypath="premium.early_donor2">
				<template #LINK>
					<a href="https://www.patreon.com/bePatron?c=9093199" target="_blank">{{ $t("premium.early_donor2_link") }}</a>
				</template>
			</i18n-t>
		</div>

		<template v-else-if="!connected">
			<i18n-t scope="global" tag="div" keypath="patreon.info">
				<template #LINK>
					<a href="https://www.patreon.com/bePatron?c=9093199" target="_blank">{{ $t("patreon.info_link") }}</a>
				</template>
			</i18n-t>
			
			<Button icon="patreon" @click="authenticate()" :loading="redirecting" premium>{{ $t("patreon.linkBt") }}</Button>
		</template>
	
		<template v-else-if="connected">
			<span>{{ $t("patreon.connected") }}</span>
			<template v-if="isMember==true">
				<span class="card-item premium">{{ $t("patreon.is_member") }}</span>
				<span class="details on">{{ $t("patreon.is_member_details") }}</span>
			</template>
			<template v-else-if="isMember==false && !authenticating">
				<span class="card-item secondary">{{ $t("patreon.is_not_member") }}</span>
				<span class="details off">{{ $t("patreon.is_not_member_details") }}</span>
			</template>

			<Button @click="disconnect()" alert icon="cross">{{ $t("global.disconnect") }}</Button>
		</template>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import ApiController from '@/utils/ApiController';
import Config from '@/utils/Config';
import PatreonHelper from '@/utils/patreon/PatreonHelper';
import { Component, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		Button,
	},
	emits:[],
})
export default class ParamsAccountPatreon extends Vue {

	public redirecting:boolean = false;
	public authenticating:boolean = false;

	private csrfToken:string = "";

	public get connected():boolean { return PatreonHelper.instance.connected; }
	public get isMember():boolean { return PatreonHelper.instance.isMember; }

	public async mounted():Promise<void> {
		
		// PatreonHelper.instance.connect();
		const authParams = this.$store("patreon").patreonAuthParams;
		if(authParams) {
			this.authenticating = true;

			const {json:csrf} = await ApiController.call("auth/CSRFToken", "POST", {token:authParams.csrf});
			if(!csrf.success) {
				this.$store("main").alert(csrf.message || "Patreon authentication failed");
			}else{
				try {
					await PatreonHelper.instance.authenticate(authParams.code);
				}catch(e:unknown) {
					console.log(e);
					this.$store("main").alert("Oops... something went wrong");
				}
			}

			this.authenticating = false;
			this.$store("patreon").setPatreonAuthResult(null);
		}

	}

	public async disconnect():Promise<void> {
		PatreonHelper.instance.disconnect();
	}

	public async authenticate():Promise<void> {
		this.redirecting = true;
		
		const {json} = await ApiController.call("auth/CSRFToken");
		this.csrfToken = json.token;
		const url = new URL("https://www.patreon.com/oauth2/authorize");
		url.searchParams.append("response_type", "code");
		url.searchParams.append("client_id", Config.instance.PATREON_CLIENT_ID);
		url.searchParams.append("redirect_uri", PatreonHelper.instance.redirectURI);
		url.searchParams.append("scope", Config.instance.PATREON_SCOPES);
		url.searchParams.append("state", this.csrfToken);
		document.location = url.href;
	}
}
</script>

<style scoped lang="less">
.paramsaccountpatreon{
	width: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: .5em;

	.details{
		&.off {
			color: var(--color-secondary);
		}
	}

	.earlyDonor {
		.head {
			gap: 1em;
			display: flex;
			flex-direction: row;
			align-items: center;
			font-size: 1.25em;
			flex-shrink: 1;
			.icon {
				flex-basis: 7em;
			}
		}
		.info {
			margin-top: .5em;
		}
	}
}
</style>