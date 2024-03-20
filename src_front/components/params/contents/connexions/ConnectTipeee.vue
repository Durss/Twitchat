<template>
	<div class="connecttipeee parameterContent">
		<Icon name="tipeee" class="icon" />
		
		<div class="head">
			<i18n-t scope="global" tag="span" keypath="tipeee.header">
				<template #LINK>
					<a href="https://www.tipeeestream.com/" target="_blank">Tipeee Stream</a>
				</template>
			</i18n-t>
		</div>

		<section v-if="!$store.auth.isPremium">
			<TTButton icon="premium" @click="openPremium()" premium big>{{ $t('premium.become_premiumBt')  }}</TTButton>
		</section>

		<section v-else-if="!$store.tipeee.connected">
			<TTButton type="link" :href="oAuthURL" target="_self" :loading="loading">{{ $t("global.connect") }}</TTButton>
			<div class="card-item alert error" v-if="error" @click="error = false">{{ $t("error.tipeee_connect_failed") }}</div>
		</section>

		<section v-else>
			<TTButton alert @click="disconnect()">{{ $t("global.disconnect") }}</TTButton>
		</section>
	</div>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Vue, toNative } from 'vue-facing-decorator';

@Component({
	components:{
		TTButton,
	},
	emits:[],
})
class ConnectTipeee extends Vue {

	public error = false;
	public loading = false;
	public oAuthURL = "";

	public beforeMount():void {
		if(!this.$store.tipeee.connected) {
			if(this.$store.tipeee.authResult.code) {
				//Complete oauth process
				this.loading = true
				this.$store.tipeee.completeOAuthProcess()
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
	}

	/**
	 * Opens the premium param page
	 */
	public openPremium():void{
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
	}

	/**
	 * Disconnects from tipeee
	 */
	public disconnect():void{
		this.$store.tipeee.disconnect();
		this.loadAuthURL();
	}

	/**
	 * initiliaze the auth url
	 */
	private loadAuthURL():void{
		this.loading = true;
		this.$store.tipeee.getOAuthURL().then(res => {
			this.oAuthURL = res;
			this.loading = false;
		});
	}

}
export default toNative(ConnectTipeee);
</script>

<style scoped lang="less">
.connecttipeee{
	.error {
		cursor: pointer;
		line-height: 1.2em;
		text-align: center;
		white-space: pre-line;
	}
	
}
</style>