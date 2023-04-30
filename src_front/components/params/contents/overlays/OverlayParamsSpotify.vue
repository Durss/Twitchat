<template>
	<ToggleBlock :open="open" class="OverlayParamsSpotify" title="Spotify" :icons="['spotify']">
		<div class="holder">
	
			<div v-if="!spotifyConnected">{{ $t("overlay.music_common.music") }}</div>
	
			<div class="card-item playerHolder">
				<div class="label">{{ $t("global.example") }}</div>
				<OverlayMusicPlayer class="player" v-if="currentTrack" :staticTrackData="currentTrack" embed />
			</div>
	
			<OverlayParamsMusic v-if="spotifyConnected" />
	
			<i18n-t v-if="spotifyConnected" scope="global" tag="div" keypath="overlay.music_common.infos">
				<template #TRIGGERS>
					<a @click="$store('params').openParamsPage(contentTriggers)">{{ $t("overlay.music_common.triggerBt") }}</a>
				</template>
			</i18n-t>

			<Button @click="$store('params').openParamsPage(contentConnexions, 'spotify')">{{ $t("overlay.spotify.connectBt") }}</Button>
		</div>

	</ToggleBlock>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import Button from '../../../Button.vue';
import OverlayMusicPlayer from '../../../overlays/OverlayMusicPlayer.vue';
import ToggleBlock from '../../../ToggleBlock.vue';
import ParamItem from '../../ParamItem.vue';
import OverlayParamsMusic from './OverlayParamsMusic.vue';

@Component({
	components:{
		Button,
		ParamItem,
		ToggleBlock,
		OverlayParamsMusic,
		OverlayMusicPlayer,
	},
	emits:[]
})
export default class OverlayParamsSpotify extends Vue {
	
	@Prop({default:false})
	public open!:boolean;
	public currentTrack:TwitchatDataTypes.MusicTrackData = {title:"Mitchiri Neko march",artist:"Mitchiri MitchiriNeko",album:"MitchiriNeko",cover:"https://i.scdn.co/image/ab67616d0000b2735b2419cbca2c5f1935743722",duration:1812,url:"https://open.spotify.com/track/1qZMyyaTyyJUjnfqtnmDdR?si=2b3eff5aba224d87"};

	public get spotifyConnected():boolean { return Config.instance.SPOTIFY_CONNECTED; }
	public get contentTriggers():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.TRIGGERS; }
	public get contentConnexions():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.CONNEXIONS; } 

	public async mounted():Promise<void> {
		this.currentTrack.cover = this.$image("img/musicExampleCover.jpg");
	}

}
</script>

<style scoped lang="less">
.OverlayParamsSpotify{

	.holder {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1em;
	
		.playerHolder {
			width: 100%;
			max-width: 300px;
			
			.label {
				text-align: center;
				margin: 0;
				margin-bottom: .5em;
			}
			
			.player {
				margin: 0;
			}
		}
	}
}
</style>