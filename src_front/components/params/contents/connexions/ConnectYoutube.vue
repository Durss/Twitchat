<template>
	<ToggleBlock :open="open" class="connectyoutube" title="Youtube" :icons="['youtube']">
		<div class="holder">
			<div class="card-item primary" v-if="connected && showSuccess" @click="showSuccess = false">{{ $t("connexions.youtube.success") }}</div>
			<div>{{ $t("connexions.youtube.header") }}</div>
			<Button icon="youtube" @click="oauth()" :loading="loading" v-if="!connected">{{ $t("global.connect") }}</Button>
			<Button icon="cross" @click="disconnect()" :loading="loading" alert v-else>{{ $t("global.disconnect") }}</Button>
			
			<div class="card-item alert" v-if="error" @click="error=''">{{error}}</div>
		</div>
	</ToggleBlock>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import ApiController from '@/utils/ApiController';
import YoutubeHelper from '@/utils/youtube/YoutubeHelper';
import { Component, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		Button: TTButton,
		ToggleBlock,
	},
	emits:[],
})
export default class ConnectYoutube extends Vue {

	public open = false;
	public loading = false;
	public showSuccess = false;
	public error = "";

	public get connected():boolean { return YoutubeHelper.instance.connected; }

	public async beforeMount():Promise<void> {
		const youtubeAuthParams = this.$store.youtube.youtubeAuthParams;
		if(youtubeAuthParams) {
			this.open = true;	
			this.loading = true;

			const {json:csrf} = await ApiController.call("auth/CSRFToken", "POST", {token:youtubeAuthParams.csrf});
			if(!csrf.success) {
				this.$store.main.alert(csrf.message || "Youtube authentication failed");
			}else{
				try {
					if(!await this.$store.youtube.authenticate()) {
						throw(new Error());
					}
					this.showSuccess = true;
				}catch(e:unknown) {
					const castError = (e as {error:string, error_description:string});
					this.error = castError.error ?? castError.error_description;
					this.showSuccess = false;
					console.log(e);
					this.$store.main.alert("Oops... something went wrong");
				}
			}

			this.loading = false;
			this.$store.youtube.setYoutubeAuthResult(null);
		}
	}

	public async mounted():Promise<void> {
		
	}

	public async oauth():Promise<void> {
		this.loading = true;
		YoutubeHelper.instance.startAuthFlow();
	}

	public async disconnect():Promise<void> {
		YoutubeHelper.instance.disconnect()
	}

}
</script>

<style scoped lang="less">
.connectyoutube{
	.holder {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1em;
	}
}
</style>