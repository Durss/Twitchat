<template>
	<div class="overlayparamsspotify overlayParamsSection">
		<div class="header">{{ t("overlay.music_common.music") }}</div>
		<template v-if="spotifyConnected">
			<div class="card-item playerHolder center">
				<div class="label">{{ t("global.example") }}</div>
				<OverlayMusicPlayer
					class="player"
					v-if="currentTrack"
					:staticTrackData="currentTrack"
					embed
				/>
			</div>

			<OverlayParamsMusic />

			<i18n-t
				class="card-item footer"
				scope="global"
				tag="div"
				keypath="overlay.music_common.infos"
			>
				<template #TRIGGERS>
					<a @click="storeParams.openParamsPage(contentTriggers)">{{
						t("overlay.music_common.triggerBt")
					}}</a>
				</template>
			</i18n-t>
		</template>

		<TTButton
			v-else
			class="center"
			@click="storeParams.openParamsPage(contentConnexions, 'spotify')"
			>{{ t("overlay.spotify.connectBt") }}</TTButton
		>
	</div>
</template>

<script setup lang="ts">
import { asset } from "@/composables/useAsset";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import SpotifyHelper from "@/utils/music/SpotifyHelper";
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import TTButton from "../../../TTButton.vue";
import OverlayMusicPlayer from "../../../overlays/OverlayMusicPlayer.vue";
import OverlayParamsMusic from "./OverlayParamsMusic.vue";

const { t } = useI18n();
const { getAsset } = asset();
const storeParams = useStoreParams();

const currentTrack = ref<TwitchatDataTypes.MusicTrackData>({
	id: "xxx",
	title: "Mitchiri Neko march",
	artist: "Mitchiri MitchiriNeko",
	album: "MitchiriNeko",
	cover: "https://i.scdn.co/image/ab67616d0000b2735b2419cbca2c5f1935743722",
	duration: 18120,
	url: "https://open.spotify.com/track/1qZMyyaTyyJUjnfqtnmDdR?si=2b3eff5aba224d87",
});

const spotifyConnected = computed((): boolean => {
	return SpotifyHelper.instance.connected.value;
});
const contentTriggers = computed((): TwitchatDataTypes.ParameterPagesStringType => {
	return TwitchatDataTypes.ParameterPages.TRIGGERS;
});
const contentConnexions = computed((): TwitchatDataTypes.ParameterPagesStringType => {
	return TwitchatDataTypes.ParameterPages.CONNECTIONS;
});

onMounted(() => {
	currentTrack.value.cover = getAsset("img/musicExampleCover.jpg");
});
</script>

<style scoped lang="less">
.overlayparamsspotify {
	.playerHolder {
		width: 100%;
		max-width: 300px;
		.label {
			text-align: center;
			margin: 0;
			margin-bottom: 0.5em;
		}
		.player {
			margin: auto;
			max-width: 60vw;
		}
	}
}
</style>
