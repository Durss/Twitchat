<template>
	<ToggleBlock :open="open" class="connectyoutube" title="Youtube" :icons="['youtube']">
		<div class="holder">
			<div class="card-item primary" v-if="connected && showSuccess" @click="showSuccess = false">{{ $t("connexions.youtube.success") }}</div>
			<div>{{ $t("connexions.youtube.header") }}</div>
			<TTButton icon="youtube" @click="oauth()" :loading="loading" v-if="!connected">{{ $t("global.connect") }}</TTButton>
			<TTButton icon="cross" @click="disconnect()" :loading="loading" alert v-else>{{ $t("global.disconnect") }}</TTButton>

			<div class="card-item liveHolder" v-if="broadcastList && broadcastList.length > 0">
				<div>{{ $t("connexions.youtube.current_live_title") }}</div>
				<div class="liveList">
					<div :class="getLiveClasses(live)"
					v-for="live in broadcastList" :key="live.snippet.liveChatId"
					@click="selectLiveId(live.snippet.liveChatId)">
						<div class="header">
							<Icon :name="live.status.recordingStatus == 'recording'? 'online' : 'offline'"
							:theme="live.status.recordingStatus == 'recording'? 'primary' : 'alert'"
							v-tooltip="live.status.recordingStatus == 'recording'? 'stream online' : 'stream offline'" />
							<span>{{live.snippet.title}}</span>
						</div>
						<div class="description">{{ live.snippet.description }}</div>
						<div class="date">{{ getFormatedDate(live.snippet.publishedAt) }}</div>
					</div>
				</div>
				
				<TTButton icon="refresh" :loading="refreshing" @click="refreshLiveInfo()">{{ $t("global.refresh") }}</TTButton>
			</div>
			
			<div class="card-item alert" v-if="error" @click="error=''">{{error}}</div>
		</div>
	</ToggleBlock>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import ApiController from '@/utils/ApiController';
import Utils from '@/utils/Utils';
import YoutubeHelper from '@/utils/youtube/YoutubeHelper';
import type { YoutubeLiveBroadcast } from '@/types/youtube/YoutubeDataTypes';
import { Component, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		TTButton,
		ToggleBlock,
	},
	emits:[],
})
export default class ConnectYoutube extends Vue {

	public open = false;
	public loading = false;
	public showSuccess = false;
	public refreshing = false;
	public error = "";

	public get connected():boolean { return YoutubeHelper.instance.connected; }
	public get selectedLiveId() { return YoutubeHelper.instance.currentLiveId; }
	public get broadcastList() { return YoutubeHelper.instance.availableLiveBroadcasts; }

	public getFormatedDate(date:string):string {
		return Utils.formatDate(new Date(date));
	}

	public getLiveClasses(live:YoutubeLiveBroadcast["items"][0]):string[] {
		const classes:string[] = ["card-item", "live"];
		if(live.snippet.liveChatId == this.selectedLiveId) classes.push("primary", "selected");
		// if(live.status.recordingStatus == "recording") classes.push("primary");
		// else classes.push("secondary");
		return classes;
	}

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

	public selectLiveId(id:string):void {
		YoutubeHelper.instance.currentLiveId = id;
	}

	public async refreshLiveInfo():Promise<void> {
		this.refreshing = true;
		await YoutubeHelper.instance.getCurrentLiveBroadcast();
		this.refreshing = false;
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

		.liveHolder {
			gap: .5em;
			display: flex;
			flex-direction: column;
			align-items: center;
		}

		.liveList {
			gap: .5em;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			.live {
				cursor: pointer;
				.header {
					.icon {
						margin: 0;
					}
				}
				.date {
					justify-self: flex-end;
					width: auto;
					display: inline-block;
					padding: .25em .5em;
					font-size: .8em;
					margin-top: .5em;
					border-radius: var(--border-radius);
					background-color: var(--background-color-fader);
				}
				&:hover {
					background-color: var(--color-light-fader);
				}
				&.selected {
					&:hover {
						filter: brightness(110%);
						background-color: var(--color-primary);
					}
				}
			}
		}
	}
}
</style>