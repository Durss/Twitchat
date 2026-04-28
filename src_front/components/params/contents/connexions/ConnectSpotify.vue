<template>
	<div class="paramsspotify parameterContent">
		<Icon name="spotify" alt="spotify icon" class="icon" />

		<div class="head">
			<div>{{ t("connexions.spotify.usage") }}</div>
		</div>

		<div class="content">
			<a
				href="https://www.youtube.com/playlist?list=PLJsQIzUbrDiEDuQ66YhtM6C8D3hZKL629"
				target="_blank"
				class="youtubeTutorialBt"
			>
				<Icon name="youtube" theme="light" />
				<span>{{ t("overlay.youtube_demo_tt") }}</span>
				<Icon name="newtab" theme="light" />
			</a>

			<form class="card-item" v-if="!connected" @submit.prevent="authenticate()">
				<div class="info" v-if="!authenticating">
					<i18n-t scope="global" tag="div" keypath="connexions.spotify.how_to">
						<template #URL>
							<strong>
								<a :href="t('music.spotify_instructions')" target="_blank">{{
									t("connexions.spotify.how_to_read")
								}}</a>
							</strong>
						</template>
					</i18n-t>
				</div>

				<ParamItem
					class="item"
					:paramData="paramClient"
					autofocus
					@change="authenticate(false)"
					noba
				/>
				<ParamItem
					class="item"
					:paramData="paramSecret"
					@change="authenticate(false)"
					noba
				/>
				<TTButton
					v-if="!authenticating"
					type="submit"
					:loading="loading"
					:disabled="!canConnect"
					icon="newtab"
					>{{ t("global.connect") }}</TTButton
				>
			</form>

			<div class="card-item" v-else>
				<div class="card-item primary" v-if="showSuccess">
					{{ t("connexions.spotify.success") }}
				</div>

				<i18n-t scope="global" tag="div" keypath="connexions.spotify.usage_connected">
					<template #OVERLAY>
						<a @click="openOverlays()">{{
							t("connexions.spotify.usage_connected_overlay")
						}}</a>
					</template>
					<template #TRIGGERS>
						<a @click="openTriggers()">{{
							t("connexions.spotify.usage_connected_triggers")
						}}</a>
					</template>
				</i18n-t>

				<TTButton @click="disconnect()" icon="offline" alert>{{
					t("global.disconnect")
				}}</TTButton>
			</div>

			<div class="card-item alert" v-if="error" @click="error = ''">{{ error }}</div>

			<Icon v-if="authenticating" name="loader" class="loader" />

			<div class="card-item needsPremium">{{ t("connexions.spotify.usage_premium") }}</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import TTButton from "@/components/TTButton.vue";
import { storeCommon as useStoreCommon } from "@/store/common/storeCommon";
import { storeMusic as useStoreMusic } from "@/store/music/storeMusic";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import ApiHelper from "@/utils/ApiHelper";
import SpotifyHelper from "@/utils/music/SpotifyHelper";
import { computed, onBeforeMount, ref } from "vue";
import { useI18n } from "vue-i18n";
import ParamItem from "../../ParamItem.vue";

const { t } = useI18n();
const storeCommon = useStoreCommon();
const storeMusic = useStoreMusic();
const storeParams = useStoreParams();

const error = ref("");
const loading = ref(false);
const showSuccess = ref(false);
const authenticating = ref(false);
const paramClient = ref<TwitchatDataTypes.ParameterData<string>>({
	label: "Client ID",
	value: "",
	type: "string",
	fieldName: "spotifyClient",
	maxLength: 32,
	isPrivate: true,
});
const paramSecret = ref<TwitchatDataTypes.ParameterData<string>>({
	label: "Client secret",
	value: "",
	type: "password",
	fieldName: "spotifySecret",
	maxLength: 32,
	isPrivate: true,
});

const connected = computed(() => SpotifyHelper.instance.connected.value);
const canConnect = computed(
	() => paramClient.value.value.length >= 30 && paramSecret.value.value.length >= 30,
);

onBeforeMount(async () => {
	paramClient.value.value = SpotifyHelper.instance.clientID;
	paramSecret.value.value = SpotifyHelper.instance.clientSecret;

	const spotifyAuthParams = storeMusic.spotifyAuthParams;
	if (spotifyAuthParams) {
		authenticating.value = true;

		const { json: csrf } = await ApiHelper.call("auth/CSRFToken", "POST", {
			token: spotifyAuthParams.csrf,
		});
		if (!csrf.success) {
			storeCommon.alert(csrf.message || "Spotify authentication failed");
		} else {
			try {
				await SpotifyHelper.instance.authenticate(spotifyAuthParams.code);
				showSuccess.value = true;
			} catch (e: unknown) {
				const castError = e as { error: string; error_description: string };
				error.value = castError.error ?? castError.error_description;
				showSuccess.value = false;
				console.log(e);
				storeCommon.alert("Oops... something went wrong");
			}
		}

		authenticating.value = false;
		loading.value = false;
		storeMusic.setSpotifyAuthResult(null);
	}
});

function authenticate(startAuthFlow: boolean = true): void {
	loading.value = startAuthFlow;
	SpotifyHelper.instance.setCredentials(
		paramClient.value.value.trim(),
		paramSecret.value.value.trim(),
	);
	if (startAuthFlow) {
		SpotifyHelper.instance.startAuthFlow();
	}
}

function disconnect(): void {
	SpotifyHelper.instance.disconnect();
}

function openOverlays(): void {
	storeParams.openParamsPage(
		TwitchatDataTypes.ParameterPages.OVERLAYS,
		TwitchatDataTypes.ParamDeepSections.SPOTIFY,
	);
}

function openTriggers(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.TRIGGERS);
}
</script>

<style scoped lang="less">
.paramsspotify {
	.content {
		gap: 1em;
		display: flex;
		flex-direction: column;

		.card-item {
			margin: auto;
			max-width: 400px;
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 0.5em;
			:deep(.inputHolder) {
				flex-basis: 100%;
			}
			.item {
				align-self: stretch;
			}
		}
	}

	.needsPremium {
		background: var(--color-secondary-fader);
		text-align: center;
	}

	.loader {
		height: 3em;
	}
}
</style>
