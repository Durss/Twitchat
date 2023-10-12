<template>
	<ToggleBlock :open="open" class="OverlayParamsSpotify" title="Spotify" :icons="['spotify']">
		<div class="holder" v-if="spotifyConnected">
			<a class="item demoLink" href="https://www.youtube.com/playlist?list=PLJsQIzUbrDiEDuQ66YhtM6C8D3hZKL629" target="_blank"><img src="@/assets/img/param_examples/spotifyVideo.jpg" class="demo"></a>
	
			<div class="card-item playerHolder">
				<div class="label">{{ $t("global.example") }}</div>
				<OverlayMusicPlayer class="player" v-if="currentTrack" :staticTrackData="currentTrack" embed />
			</div>
	
			<OverlayParamsMusic />
	
			<i18n-t class="card-item footer" scope="global" tag="div" keypath="overlay.music_common.infos">
				<template #TRIGGERS>
					<a @click="$store('params').openParamsPage(contentTriggers)">{{ $t("overlay.music_common.triggerBt") }}</a>
				</template>
			</i18n-t>

		</div>
		<div class="holder" v-else>
			<a class="item demoLink" href="https://www.youtube.com/playlist?list=PLJsQIzUbrDiEDuQ66YhtM6C8D3hZKL629" target="_blank"><img src="@/assets/img/param_examples/spotifyVideo.jpg" class="demo"></a>
			
			<div>{{ $t("overlay.music_common.music") }}</div>
			<Button @click="$store('params').openParamsPage(contentConnexions, 'spotify')">{{ $t("overlay.spotify.connectBt") }}</Button>
		</div>

	</ToggleBlock>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import SpotifyHelper from '@/utils/music/SpotifyHelper';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import Button from '../../../Button.vue';
import ToggleBlock from '../../../ToggleBlock.vue';
import OverlayMusicPlayer from '../../../overlays/OverlayMusicPlayer.vue';
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

	public get spotifyConnected():boolean { return SpotifyHelper.instance.connected; }
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
		gap: .5em;
	
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
		.footer {
			font-size: .8em;
			font-style: italic;
		}
	}
}
</style>