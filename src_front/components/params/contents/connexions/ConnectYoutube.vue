<template>
	<div class="connectyoutube parameterContent">
		<Icon name="youtube" alt="youtube icon" class="icon" />

		<div class="head">{{ t("connexions.youtube.header") }}</div>

		<TTButton
			class="premiumBt"
			icon="premium"
			@click="storeParams.openParamsPage('premium')"
			big
			v-if="!storeAuth.isPremium"
			premium
			>{{ t("premium.become_premiumBt") }}</TTButton
		>

		<div class="content">
			<div
				class="card-item primary"
				v-if="connected && showSuccess"
				@click="showSuccess = false"
			>
				{{ t("connexions.youtube.success") }}
			</div>

			<div class="card-item liveHolder" v-if="connected && broadcastList">
				<template v-if="broadcastList.length > 0">
					<div v-if="broadcastList.length > 1">
						{{ t("connexions.youtube.current_live_title") }}
					</div>
					<div class="liveList">
						<div
							:class="getLiveClasses(live)"
							v-for="live in broadcastList"
							:key="live.snippet.liveChatId"
							@click="toggleLiveId(live.snippet.liveChatId)"
						>
							<Icon
								name="checkmark"
								v-if="selectedLiveIds.includes(live.snippet.liveChatId)"
							/>
							<Icon
								:name="
									live.status.recordingStatus == 'recording'
										? 'online'
										: 'offline'
								"
								:theme="
									live.status.recordingStatus == 'recording' ? 'primary' : 'alert'
								"
								v-tooltip="
									live.status.recordingStatus == 'recording'
										? 'stream online'
										: 'stream offline'
								"
							/>
							<div class="title">{{ live.snippet.title }}</div>
							<TTButton
								@click.stop=""
								class="broadcastLink"
								type="link"
								target="_blank"
								:href="'https://www.youtube.com/watch?v=' + live.id"
								icon="newtab"
								transparent
							></TTButton>
						</div>
					</div>
				</template>
				<template v-else-if="!refreshing">
					<div class="card-item secondary noLive">
						{{ t("connexions.youtube.no_live") }}
					</div>
				</template>

				<TTButton icon="refresh" :loading="refreshing" @click="refreshLiveInfo()">{{
					t("global.refresh")
				}}</TTButton>
			</div>

			<template v-if="!connected">
				<div class="card-item scopes" :class="storeAuth.isPremium ? '' : 'disabled'">
					<div class="title">
						<Icon name="lock_fit" />{{ t("connexions.youtube.scopes_title") }}
					</div>
					<ParamItem
						:paramData="param_scope_read"
						v-model="param_scope_read.value"
						noBackground
					/>
					<ParamItem
						:paramData="param_scope_moderate"
						v-model="param_scope_moderate.value"
						noBackground
						ref="moderateScope"
					/>
				</div>
				<TTButton
					class="connectBt"
					icon="newtab"
					@click="oauth()"
					:loading="loading"
					:disabled="!storeAuth.isPremium"
					>{{ t("global.connect") }}</TTButton
				>
			</template>
			<TTButton @click="disconnect()" :loading="loading" icon="offline" alert v-else>{{
				t("global.disconnect")
			}}</TTButton>

			<div class="card-item alert" v-if="error" @click="error = ''">{{ error }}</div>

			<div class="legal">
				<a href="https://www.youtube.com/t/terms" target="_blank">{{
					t("connexions.youtube.terms")
				}}</a>
				<a href="http://www.google.com/policies/privacy" target="_blank">{{
					t("connexions.youtube.policy")
				}}</a>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import TTButton from "@/components/TTButton.vue";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { YoutubeLiveBroadcast } from "@/types/youtube/YoutubeDataTypes";
import ApiHelper from "@/utils/ApiHelper";
import Utils from "@/utils/Utils";
import YoutubeHelper from "@/utils/youtube/YoutubeHelper";
import { YoutubeScopes } from "@/utils/youtube/YoutubeScopes";
import { Sine } from "gsap";
import { gsap } from "gsap/gsap-core";
import {
	computed,
	onBeforeMount,
	onMounted,
	ref,
	useTemplateRef,
	type ComponentPublicInstance,
} from "vue";
import { useI18n } from "vue-i18n";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeCommon as useStoreCommon } from "@/store/common/storeCommon";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { storeYoutube as useStoreYoutube } from "@/store/youtube/storeYoutube";
import ParamItem from "../../ParamItem.vue";

const { t } = useI18n();
const storeAuth = useStoreAuth();
const storeCommon = useStoreCommon();
const storeParams = useStoreParams();
const storeYoutube = useStoreYoutube();

const open = ref(false);
const loading = ref(false);
const showSuccess = ref(false);
const refreshing = ref(false);
const requestNewScopes = ref(false);
const error = ref("");

const param_scope_read = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	icon: "whispers",
	value: true,
	labelKey: "connexions.youtube.scope_read",
	disabled: true,
});
const param_scope_moderate = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	icon: "mod",
	value: false,
	labelKey: "connexions.youtube.scope_moderate",
});

const moderateScopeRef = useTemplateRef<ComponentPublicInstance>("moderateScope");

const connected = computed(() => YoutubeHelper.instance.connected.value && !requestNewScopes.value);
const selectedLiveIds = computed(() => YoutubeHelper.instance.currentLiveChatIds.value);
const broadcastList = computed(() => YoutubeHelper.instance.availableLiveBroadcasts.value);

function getLiveClasses(live: YoutubeLiveBroadcast["items"][0]): string[] {
	const classes: string[] = ["card-item", "live"];
	if (selectedLiveIds.value.includes(live.snippet.liveChatId)) classes.push("selected");
	// if(live.status.recordingStatus == "recording") classes.push("primary");
	// else classes.push("secondary");
	return classes;
}

onBeforeMount(async () => {
	const youtubeAuthParams = storeYoutube.youtubeAuthParams;
	if (youtubeAuthParams) {
		open.value = true;
		loading.value = true;

		const { json: csrf } = await ApiHelper.call("auth/CSRFToken", "POST", {
			token: youtubeAuthParams.csrf,
		});
		if (!csrf.success) {
			storeCommon.alert(csrf.message || "Youtube authentication failed");
		} else {
			try {
				if (!(await storeYoutube.authenticate())) {
					throw new Error("unable to connect");
				}
				showSuccess.value = true;
			} catch (e: unknown) {
				const castError = e as { error: string; error_description: string };
				error.value = castError.error ?? castError.error_description;
				showSuccess.value = false;
				console.log(e);
				storeCommon.alert("Oops... something went wrong");
			}
		}

		loading.value = false;
		storeYoutube.setYoutubeAuthResult(null);
	} else if (storeYoutube.newScopesToRequest) {
		const scopes = storeYoutube.newScopesToRequest;
		param_scope_moderate.value.value = scopes.includes(YoutubeScopes.CHAT_MODERATE);
		requestNewScopes.value = true;
		storeYoutube.newScopesToRequest = null;
	}
});

onMounted(() => {
	if (requestNewScopes.value) {
		const el = moderateScopeRef.value!.$el as HTMLElement;
		gsap.fromTo(
			el,
			{ backgroundColor: "#ffffff00" },
			{
				backgroundColor: "#ffffff50",
				repeat: 6,
				yoyo: true,
				ease: Sine.easeInOut,
				duration: 0.2,
				immediateRender: false,
				delay: 2,
				clearProps: "all",
			},
		);
	}
});

async function oauth(): Promise<void> {
	loading.value = true;
	await Utils.promisedTimeout(350); //Makes sure loader is visible at least a little
	const success = await YoutubeHelper.instance.startAuthFlow(param_scope_moderate.value.value);
	if (!success) {
		loading.value = false;
		error.value = t("error.youtube_connect");
	}
}

async function disconnect(): Promise<void> {
	YoutubeHelper.instance.disconnect();
}

function toggleLiveId(id: string): void {
	if (YoutubeHelper.instance.currentLiveChatIds.value.includes(id)) {
		YoutubeHelper.instance.currentLiveChatIds.value =
			YoutubeHelper.instance.currentLiveChatIds.value.filter((v) => v !== id);
	} else {
		YoutubeHelper.instance.currentLiveChatIds.value.push(id);
		if (YoutubeHelper.instance.currentLiveChatIds.value.length > 3) {
			YoutubeHelper.instance.currentLiveChatIds.value.shift();
		}
	}
}

async function refreshLiveInfo(): Promise<void> {
	refreshing.value = true;
	await YoutubeHelper.instance.getCurrentLiveBroadcast();
	refreshing.value = false;
}
</script>

<style scoped lang="less">
.connectyoutube {
	.premium {
		align-self: center;
	}
	.content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1em;

		.scopes {
			gap: 0.25em;
			display: flex;
			flex-direction: column;
			.title {
				text-align: center;
				font-weight: bold;
				margin-bottom: 0.25em;
				.icon {
					height: 1em;
					margin-right: 0.5em;
				}
			}

			&.disabled {
				opacity: 0.5;
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
			gap: 0.5em;
			display: flex;
			flex-direction: column;
			align-items: center;
		}

		.noLive {
			text-align: center;
			white-space: pre-line;
		}

		.liveList {
			gap: 0.5em;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			.live {
				gap: 0.5em;
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
			& > * {
				display: block;
				&:not(:first-child) {
					margin-top: 0.25em;
				}
			}
		}
	}
}
</style>
