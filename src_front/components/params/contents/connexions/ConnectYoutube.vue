<template>
	<div class="connectyoutube parameterContent">
		<Icon name="youtube" alt="youtube icon" class="icon" />

		<div class="head">{{ $t("connexions.youtube.header") }}</div>

		<TTButton class="premiumBt" icon="premium" @click="$store.params.openParamsPage('premium')" big v-if="!$store.auth.isPremium" premium>{{ $t("premium.become_premiumBt") }}</TTButton>

		<div class="content">
			<div class="card-item primary" v-if="connected && showSuccess" @click="showSuccess = false">{{ $t("connexions.youtube.success") }}</div>

			<div class="card-item liveHolder" v-if="connected && broadcastList">
				<template v-if="broadcastList.length > 0">
					<div v-if="broadcastList.length > 1">{{ $t("connexions.youtube.current_live_title") }}</div>
					<div class="liveList">
						<div :class="getLiveClasses(live)"
						v-for="live in broadcastList" :key="live.snippet.liveChatId"
						@click="toggleLiveId(live.snippet.liveChatId)">
							<Icon name="checkmark" v-if="selectedLiveIds.includes(live.snippet.liveChatId)" />
							<Icon :name="live.status.recordingStatus == 'recording'? 'online' : 'offline'"
								:theme="live.status.recordingStatus == 'recording'? 'primary' : 'alert'"
								v-tooltip="live.status.recordingStatus == 'recording'? 'stream online' : 'stream offline'" />
							<div class="title">{{ live.snippet.title }}</div>
							<TTButton class="broadcastLink" type="link" target="_blank" :href="'https://www.youtube.com/watch?v='+live.id" icon="newtab" transparent></TTButton>
						</div>
					</div>
				</template>
				<template v-else>
					<div class="card-item secondary noLive">{{ $t("connexions.youtube.no_live") }}</div>
				</template>

				<TTButton icon="refresh" :loading="refreshing" @click="refreshLiveInfo()">{{ $t("global.refresh") }}</TTButton>
			</div>

			<template v-if="!connected">
				<div class="card-item scopes" :class="$store.auth.isPremium? '' : 'disabled'">
					<div class=" title"><Icon name="lock_fit" />{{ $t("connexions.youtube.scopes_title") }}</div>
					<ParamItem :paramData="param_scope_read" v-model="param_scope_read.value" noBackground />
					<ParamItem :paramData="param_scope_moderate" v-model="param_scope_moderate.value" noBackground ref="moderateScope" />
				</div>
				<TTButton class="connectBt" icon="youtube" @click="oauth()" :loading="loading" :disabled="!$store.auth.isPremium">{{ $t("global.connect") }}</TTButton>
			</template>
			<TTButton icon="cross" @click="disconnect()" :loading="loading" alert v-else>{{ $t("global.disconnect") }}</TTButton>

			<div class="card-item alert" v-if="error" @click="error=''">{{error}}</div>

			<div class="legal">
				<a href="https://www.youtube.com/t/terms" target="_blank">{{ $t("connexions.youtube.terms") }}</a>
				<a href="http://www.google.com/policies/privacy" target="_blank">{{ $t("connexions.youtube.policy") }}</a>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { YoutubeLiveBroadcast } from '@/types/youtube/YoutubeDataTypes';
import ApiHelper from '@/utils/ApiHelper';
import Utils from '@/utils/Utils';
import YoutubeHelper from '@/utils/youtube/YoutubeHelper';
import { YoutubeScopes } from '@/utils/youtube/YoutubeScopes';
import { Sine } from 'gsap';
import { gsap } from 'gsap/gsap-core';
import { Component, Prop, Vue, toNative } from 'vue-facing-decorator';
import ParamItem from '../../ParamItem.vue';

@Component({
	components:{
		TTButton,
		ParamItem,
		ToggleBlock,
	},
	emits:[],
})
class ConnectYoutube extends Vue {

	/**
	 * Used as a temporary solution.
	 * I originally set this section in the "connections" section.
	 * I then moved it to the main params menu.
	 * But in the meantime I requested Google to validate my app
	 * which requires them to follow a step by step guide I made
	 * that asks them to check the "connections" section. So I
	 * can't remove it from that "connections" section until they
	 * check for it.
	 * Because of this, this component lives both in the connections
	 * section and the main Youtube section but one needs to be a
	 * simple <div> when the other needs a simple div.
	 * This flag is here to switch between the two modes depending
	 * on its context
	 */
	@Prop({default:false})
	public listMode!:boolean;

	public open = false;
	public loading = false;
	public showSuccess = false;
	public refreshing = false;
	public requestNewScopes = false;
	public error = "";

	public param_scope_read:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", icon:"whispers", value:true, labelKey:"connexions.youtube.scope_read", disabled:true};
	public param_scope_moderate:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", icon:"mod", value:false, labelKey:"connexions.youtube.scope_moderate"};

	public get connected():boolean { return YoutubeHelper.instance.connected && !this.requestNewScopes; }
	public get selectedLiveIds() { return YoutubeHelper.instance.currentLiveIds; }
	public get broadcastList() { return YoutubeHelper.instance.availableLiveBroadcasts; }

	public getFormatedDate(date:string):string {
		return Utils.formatDate(new Date(date));
	}

	public getLiveClasses(live:YoutubeLiveBroadcast["items"][0]):string[] {
		const classes:string[] = ["card-item", "live"];
		if(this.selectedLiveIds.includes(live.snippet.liveChatId)) classes.push("selected");
		// if(live.status.recordingStatus == "recording") classes.push("primary");
		// else classes.push("secondary");
		return classes;
	}

	public async beforeMount():Promise<void> {
		const youtubeAuthParams = this.$store.youtube.youtubeAuthParams;
		if(youtubeAuthParams) {
			this.open = true;
			this.loading = true;

			const {json:csrf} = await ApiHelper.call("auth/CSRFToken", "POST", {token:youtubeAuthParams.csrf});
			if(!csrf.success) {
				this.$store.common.alert(csrf.message || "Youtube authentication failed");
			}else{
				try {
					if(!await this.$store.youtube.authenticate()) {
						throw(new Error("unable to connect"));
					}
					this.showSuccess = true;
				}catch(e:unknown) {
					const castError = (e as {error:string, error_description:string});
					this.error = castError.error ?? castError.error_description;
					this.showSuccess = false;
					console.log(e);
					this.$store.common.alert("Oops... something went wrong");
				}
			}

			this.loading = false;
			this.$store.youtube.setYoutubeAuthResult(null);
		}else if(this.$store.youtube.newScopesToRequest){
			const scopes = this.$store.youtube.newScopesToRequest;
			this.param_scope_moderate.value = scopes.includes(YoutubeScopes.CHAT_MODERATE);
			this.requestNewScopes = true;
			this.$store.youtube.newScopesToRequest = null;
		}
	}

	public mounted():void {
		if(this.requestNewScopes) {
			const el = (this.$refs["moderateScope"] as Vue).$el as HTMLElement;
			gsap.fromTo(el, {backgroundColor:"#ffffff00"}, {backgroundColor:"#ffffff50", repeat:6, yoyo:true, ease:Sine.easeInOut, duration:.2, immediateRender:false, delay:2, clearProps:"all"});
		}
	}

	public async oauth():Promise<void> {
		this.loading = true;
		await Utils.promisedTimeout(350);//Makes sure loader is visible at least a little
		const success = await YoutubeHelper.instance.startAuthFlow(this.param_scope_moderate.value);
		if(!success) {
			this.loading = false;
			this.error = this.$t("error.youtube_connect");
		}
	}

	public async disconnect():Promise<void> {
		YoutubeHelper.instance.disconnect()
	}

	public toggleLiveId(id:string):void {
		if(YoutubeHelper.instance.currentLiveIds.includes(id)) {
			YoutubeHelper.instance.currentLiveIds = YoutubeHelper.instance.currentLiveIds.filter(v => v !== id);
		}else{
			YoutubeHelper.instance.currentLiveIds.push(id);
			if(YoutubeHelper.instance.currentLiveIds.length > 3) {
				YoutubeHelper.instance.currentLiveIds.shift();
			}
		}
	}

	public async refreshLiveInfo():Promise<void> {
		this.refreshing = true;
		await YoutubeHelper.instance.getCurrentLiveBroadcast();
		this.refreshing = false;
	}

}
export default toNative(ConnectYoutube);
</script>

<style scoped lang="less">
.connectyoutube{
	.premium {
		align-self: center;
	}
	.content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1em;

		.scopes {
			gap:.25em;
			display: flex;
			flex-direction: column;
			.title {
				text-align: center;
				font-weight: bold;
				margin-bottom: .25em;
				.icon {
					height: 1em;
					margin-right: .5em;
				}
			}

			&.disabled {
				opacity: .5;
				pointer-events: none;
				cursor: not-allowed;

			}
		}

		.connectBt {
			:deep(.icon) {
				width: 2em;
				height: 1.5em;
				max-width: 2em;
			}
		}

		.liveHolder {
			gap: .5em;
			display: flex;
			flex-direction: column;
			align-items: center;
		}

		.noLive {
			text-align: center;
			white-space: pre-line;
		}

		.liveList {
			gap: .5em;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			.live {
				gap: .5em;
				display: flex;
				flex-direction: row;
				align-items: flex-end;
				justify-content: center;
				cursor: pointer;
				&:hover {
					background-color: var(--color-light-fader);
				}
				&.selected {
					border: 1px solid var(--color-text);
				}

				.icon {
					height: 1em;
				}

				.broadcastLink {
					padding: 0;
				}
			}
		}
		.legal {
			text-align: center;
			&>* {
				display: block;
				&:not(:first-child) {
					margin-top: .25em;
				}
			}
		}
	}

}
</style>
