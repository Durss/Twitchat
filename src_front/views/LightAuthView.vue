<template>
	<div class="lightauthview modal">
		<div class="dimmer"></div>
		<div class="holder">
			<div class="head">
				<span class="title">Authenticating</span>
			</div>
			<div class="content">
				<Icon name="loader" class="spinner" v-if="authenticating" />
				<template v-else-if="error">
					<div class="card-item alert" v-if="error">{{ $t("error.twitch_auth_fail") }}</div>
					<TTButton icon="back" v-if="redirect" @click="$router.push({name:redirect})">{{ $t("global.back") }}</TTButton>
				</template>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import ApiHelper from '@/utils/ApiHelper';
import Utils from '@/utils/Utils';
import DataStoreCommon from '@/store/DataStoreCommon';
import { Component, Vue, toNative } from 'vue-facing-decorator';
import Icon from '@/components/Icon.vue';
import { TTButton } from '@/components/TTButton.vue';

@Component({
	components:{
		Icon,
		TTButton,
	},
	emits:[],
})
class LightAuthView extends Vue {

	public error:boolean = false;
	public redirect:string = "";
	public authenticating:boolean = true;
	
	async beforeMount():Promise<void> {
		this.authenticating = true;
		this.redirect	= DataStoreCommon.get(DataStoreCommon.REDIRECT);
		const code		= Utils.getQueryParameterByName("code");
		const csrfToken	= Utils.getQueryParameterByName("state");
		if(code) {
			const res = await ApiHelper.call("auth/CSRFToken", "POST", {token:csrfToken!});
			if(!res.json.success) {
				if(res.json.message) this.$store.common.alert(res.json.message);
				this.authenticating = false;
				this.error = true;
			}else{
				this.error = !await this.$store.public.twitchAuth(code);
				this.authenticating = false;
				if(!this.error) {
					DataStoreCommon.remove(DataStoreCommon.REDIRECT);
					this.$router.push(this.redirect);
				}else{
					this.$store.common.alert(this.$t("error.invalid_credentials"));
				}
			}
		}else{
			this.$store.common.alert(this.$t("error.authorization_refused"));
			this.authenticating = false;
		}
	}

}
export default toNative(LightAuthView);
</script>

<style scoped lang="less">
.lightauthview{
	.spinner {
		height: 3em;
	}
	.content {
		gap:1em;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
}
</style>