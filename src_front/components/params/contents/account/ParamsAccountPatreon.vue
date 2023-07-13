<template>
	<div class="paramsaccountpatreon">
		<Button icon="patreon" :href="authURL" type="link">{{ $t("account.patreon.linkBt") }}</Button>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import ApiController from '@/utils/ApiController';
import Config from '@/utils/Config';
import { Component, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		Button,
	},
	emits:[],
})
export default class ParamsAccountPatreon extends Vue {

	private csrfToken:string = "";

	public get authURL():string {
		const redirectURI = document.location.origin + this.$router.resolve({name:"patreon/auth"}).href;
		const url = new URL("https://www.patreon.com/oauth2/authorize");
		url.searchParams.append("response_type", "code");
		url.searchParams.append("client_id", Config.instance.PATREON_CLIENT_ID);
		url.searchParams.append("redirect_uri", redirectURI);
		url.searchParams.append("state", this.csrfToken);
		return url.href;
	}

	public async mounted():Promise<void> {
		const {json} = await ApiController.call("auth/CSRFToken");
		this.csrfToken = json.token;
	}
}
</script>

<style scoped lang="less">
.paramsaccountpatreon{
	
}
</style>