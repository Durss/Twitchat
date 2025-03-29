<template>
	<div class="overlayparamsspotify overlayParamsSection">
		<template v-if="spotifyConnected">
			<div class="card-item playerHolder center">
				<div class="label">{{ $t("global.example") }}</div>
				<OverlayMusicPlayer class="player" v-if="currentTrack" :staticTrackData="currentTrack" embed />
			</div>

			<OverlayParamsMusic />

			<i18n-t class="card-item footer" scope="global" tag="div" keypath="overlay.music_common.infos">
				<template #TRIGGERS>
					<a @click="$store.params.openParamsPage(contentTriggers)">{{ $t("overlay.music_common.triggerBt") }}</a>
				</template>
			</i18n-t>
		</template>

		<template v-else>
			<div class="header">{{ $t("overlay.music_common.music") }}</div>
			<TTButton class="center" @click="$store.params.openParamsPage(contentConnexions, 'spotify')">{{ $t("overlay.spotify.connectBt") }}</TTButton>
		</template>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import SpotifyHelper from '@/utils/music/SpotifyHelper';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import TTButton from '../../../TTButton.vue';
import OverlayMusicPlayer from '../../../overlays/OverlayMusicPlayer.vue';
import ParamItem from '../../ParamItem.vue';
import OverlayParamsMusic from './OverlayParamsMusic.vue';

@Component({
	components:{
		TTButton,
		ParamItem,
		OverlayParamsMusic,
		OverlayMusicPlayer,
	},
	emits:[]
})
class OverlayParamsSpotify extends Vue {

	public currentTrack:TwitchatDataTypes.MusicTrackData = {id:"xxx",title:"Mitchiri Neko march",artist:"Mitchiri MitchiriNeko",album:"MitchiriNeko",cover:"https://i.scdn.co/image/ab67616d0000b2735b2419cbca2c5f1935743722",duration:1812,url:"https://open.spotify.com/track/1qZMyyaTyyJUjnfqtnmDdR?si=2b3eff5aba224d87"};

	public get spotifyConnected():boolean { return SpotifyHelper.instance.connected; }
	public get contentTriggers():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.TRIGGERS; }
	public get contentConnexions():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.CONNEXIONS; }

	public async mounted():Promise<void> {
		this.currentTrack.cover = this.$asset("img/musicExampleCover.jpg");
	}

}
export default toNative(OverlayParamsSpotify);
</script>

<style scoped lang="less">
.overlayparamsspotify{
	.playerHolder {
		width: 100%;
		max-width: 300px;
		.label {
			text-align: center;
			margin: 0;
			margin-bottom: .5em;
		}
		.player {
			margin: auto;
			max-width: 60vw;
		}
	}
}
</style>
