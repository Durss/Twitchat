<template>
	<div class="paramsaccountpatreon">
		<Icon name="loader" v-if="authenticating" />

		<template v-else-if="!connected">
			<i18n-t scope="global" tag="div" keypath="patreon.info">
				<template #LINK>
					<a href="https://www.patreon.com/durss" target="_blank">{{ $t("patreon.info_link") }}</a>
				</template>
			</i18n-t>
			
			<Button icon="patreon" @click="authenticate()" :loading="redirecting">{{ $t("patreon.linkBt") }}</Button>
		</template>
	
		<div class="card-item primary" v-if="connected && showSuccess">{{ $t("patreon.success") }}</div>

		<template v-if="connected">
			<span>{{ $t("patreon.connected") }}</span>

			<Button @click="disconnect()" icon="cross">{{ $t("global.disconnect") }}</Button>
			<Button @click="copyData()" icon="copy" secondary>Copy data</Button>
		</template>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import ApiController from '@/utils/ApiController';
import Config from '@/utils/Config';
import Utils from '@/utils/Utils';
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
	public showSuccess:boolean = false;
	public authenticating:boolean = false;

	private csrfToken:string = "";

	public get connected():boolean { return PatreonHelper.instance.connected; }

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
					this.showSuccess = true;
				}catch(e:unknown) {
					this.showSuccess = false;
					console.log(e);
					this.$store("main").alert("Oops... something went wrong");
				}
			}

			this.authenticating = false;
			this.$store("patreon").setPatreonAuthResult(null);
		}

		if(this.connected) {
			const res = await PatreonHelper.instance.getUser();
			if(res && res.success) {
				// this.isDonor = res.data.data.relationships.campaign.data.id
			}
		}

	}

	public async copyData():Promise<void> {
		const res = await PatreonHelper.instance.getUser();
		Utils.copyToClipboard(JSON.stringify(res));
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
}
</style>