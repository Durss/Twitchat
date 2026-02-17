<template>
	<div class="lightauthview modal">
		<div class="dimmer"></div>
		<div class="holder">
			<div class="head">
				<img class="icon" src="@/assets/logo.svg" alt="twitch">
			</div>
			<div class="content">
				<span class="title">{{ $t("login.authenticating") }}</span>
				<Icon name="loader" class="spinner" v-if="authenticating" />
				<template v-else-if="error">
					<div class="card-item alert" v-if="error">{{ $t("error.twitch_auth_fail") }}</div>
					<TTButton icon="back" v-if="redirect" @click="$router.push({name:redirect})">{{ $t("global.back") }}</TTButton>
				</template>
	
				<div class="footer">
					<p><span>{{ $t("home.info") }}</span> <a href="https://www.durss.ninja" target="_blank">Durss</a></p>
					<p><span>{{ $t("home.footer.title") }}</span> <a href="https://github.com/Durss/Twitchat" target="_blank">Github</a></p>
					<p class="note" v-html="$t('home.footer.disclaimer')"></p>
				</div>
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
import TTButton from '@/components/TTButton.vue';

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
				this.error = true;
			}else{
				this.error = !await this.$store.public.twitchAuth(code);
				if(this.error) {
					this.$store.common.alert(this.$t("error.invalid_credentials"));
				}
			}
		}else{
			this.$store.common.alert(this.$t("error.authorization_refused"));
		}
		DataStoreCommon.remove(DataStoreCommon.REDIRECT);
		this.$router.push(this.redirect);
	}

}
export default toNative(LightAuthView);
</script>

<style scoped lang="less">
.lightauthview{
	.spinner {
		height: 2em;
	}
	.content {
		gap:1em;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	
	.holder {
		width: fit-content;
		.head {
			margin-bottom:0;
			padding: 0;
			padding-top: 20px;
			width: 200px;
			margin: auto;
			.icon {
				height: 50px;
				width: unset;
				max-width: unset;
				max-height: unset;
			}
		}
	}
	.content {
		text-transform: capitalize;
	}
	
	.footer {
		text-align: center;
		font-size: .8em;
		margin-bottom: 10px;

		.note {
			font-style: italic;
			margin-top: .5em;
			font-size: .9em;
			opacity: .8;
		}
	}
}
</style>