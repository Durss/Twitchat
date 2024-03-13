<template>
	<div class="paramsconnexions parameterContent" v-if="!subContent">
		<Icon name="offline" alt="connections icon" class="icon" />

		<p class="head">{{ $t("connexions.header") }}</p>

		<div class="content">
			<button class="card-item premium" @click="subContent='youtube'">
				<Icon name="youtube" />
				<p>Youtube</p>
			</button>
	
			<button class="card-item premium" @click="subContent='goxlr'">
				<Icon name="goxlr" />
				<p>GoXLR</p>
			</button>
	
			<button class="card-item premium soon" @click="subContent='streamlabs'">
				<Icon name="streamlabs" />
				<p>Streamlabs</p>
				<div class="soon">coming soon</div>
			</button>
	
			<button class="card-item premium" @click="subContent='streamelements'">
				<Icon name="streamelements" />
				<p>Streamelements</p>
			</button>
	
			<button class="card-item premium" @click="subContent='lumia'">
				<Icon name="lumia" />
				<p>Lumia Stream</p>
			</button>
	
			<button class="card-item premium" @click="subContent='kofi'">
				<Icon name="kofi" />
				<p>Ko-fi</p>
			</button>
	
			<button class="card-item" @click="subContent='voicemod'">
				<Icon name="voicemod" />
				<p>Voicemod</p>
			</button>
	
			<button class="card-item" @click="subContent='streamdeck'">
				<Icon name="elgato" />
				<p>Stream Deck</p>
			</button>
	
			<button class="card-item" @click="subContent='discord'">
				<Icon name="discord" />
				<p>Discord</p>
			</button>
	
			<button class="card-item" @click="subContent='spotify'">
				<Icon name="spotify" />
				<p>Spotify</p>
			</button>
	
			<button class="card-item" @click="subContent='obs'">
				<Icon name="obs" />
				<p>OBS</p>
			</button>
	
			<button class="card-item" @click="subContent='heat'">
				<Icon name="heat" />
				<p>Heat</p>
			</button>
	
			<button class="card-item" @click="subContent='websocket'">
				<Icon name="broadcast" />
				<p>Websocket</p>
			</button>
		</div>
	</div>
	<ConnectVoicemod v-else-if="subContent == 'voicemod'" />
	<ConnectYoutube v-else-if="subContent == 'youtube'" />
	<ConnectGoXLR v-else-if="subContent == 'goxlr'" />
	<ConnectStreamdeck v-else-if="subContent == 'streamdeck'" />
	<ConnectDiscord v-else-if="subContent == 'discord'" />
	<ConnectSpotify v-else-if="subContent == 'spotify'" />
	<ConnectOBS v-else-if="subContent == 'obs'" />
	<ConnectHeat v-else-if="subContent == 'heat' || subContent == 'heatAreas'" />
	<ConnectWebsocket v-else-if="subContent == 'websocket'" />
	<ConnectStreamlabs v-else-if="subContent == 'streamlabs'" />
	<ConnectKofi v-else-if="subContent == 'kofi'" />
	<ConnectLumia v-else-if="subContent == 'lumia'" />
	<ConnectStreamelements v-else-if="subContent == 'streamelements'" />
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import { Component, Vue, toNative } from 'vue-facing-decorator';
import type IParameterContent from './IParameterContent';
import ConnectYoutube from './connexions/ConnectYoutube.vue';
import ConnectVoicemod from './connexions/ConnectVoicemod.vue';
import ConnectGoXLR from './connexions/ConnectGoXLR.vue';
import ConnectStreamdeck from './connexions/ConnectStreamdeck.vue';
import ConnectDiscord from './connexions/ConnectDiscord.vue';
import ConnectSpotify from './connexions/ConnectSpotify.vue';
import ConnectOBS from './connexions/ConnectOBS.vue';
import ConnectHeat from './connexions/ConnectHeat.vue';
import ConnectWebsocket from './connexions/ConnectWebsocket.vue';
import ConnectStreamlabs from './connexions/ConnectStreamlabs.vue';
import ConnectKofi from './connexions/ConnectKofi.vue';
import ConnectLumia from './connexions/ConnectLumia.vue';
import ConnectStreamelements from './connexions/ConnectStreamelements.vue';

@Component({
	components:{
		ConnectOBS,
		ConnectKofi,
		ConnectHeat,
		ConnectGoXLR,
		ConnectLumia,
		ConnectDiscord,
		ConnectSpotify,
		ConnectYoutube,
		ConnectVoicemod,
		ConnectWebsocket,
		ConnectStreamdeck,
		ConnectStreamlabs,
		ConnectStreamelements,
	},
	emits:[],
})
 class ParamsConnections extends Vue implements IParameterContent {

	public allowHighlight:boolean = true;
	public subContent:TwitchatDataTypes.ParamDeepSectionsStringType|"" = "";

	public get youtubeEnabled() { return Config.instance.YOUTUBE_CLIENT_ID; }

	public async beforeMount():Promise<void> {
		await this.$nextTick();
		this.subContent = this.$store.params.currentPageSubContent;
		// if(this.subContent) {
		// 	const holder = (this.$refs[this.subContent] as Vue)?.$el;
		// 	if(holder) holder.scrollIntoView();
		// }
	}

	public onNavigateBack(): boolean {
		if(this.subContent == "") return false;
		this.subContent = "";
		return true;
	}

	public reload(): boolean {
		return this.onNavigateBack();
	}
}
export default toNative(ParamsConnections);
</script>

<style scoped lang="less">
.paramsconnexions{
	max-width: calc(100vw - 350px) !important;

	.content {
		align-self: center;
		max-width: 1000px;
		gap: 1em;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: center;
		align-items: center;
		// align-items: flex-start;
		button {
			padding: 1em;
			gap:.5em;
			display: flex;
			flex-direction: column;
			align-items: center;
			color: var(--color-text);
			width: 250px;
			text-align: center;
			margin: unset;
			transition: background-color .25s;
			&.premium {
				background-color: var(--color-premium-fadest);
			}
			&>.icon {
				height: 2em;
				margin-right: 0;
			}
			&:hover {
				background-color: var(--color-text-fadest);
				&.premium {
					background-color: var(--color-premium-fader);
				}
			}

			&.soon{
				position: relative;
				overflow: hidden;
				pointer-events: none;
				filter: contrast(.5);
				.soon {
					position: absolute;
					top: 19px;
					right: -35px;
					transform: rotate(40deg);
					color: var(--color-dark);
					background-color: var(--color-light);
					width: 150px;
					padding: .25em;
				}
			}
		}
	}
}

@media only screen and (max-width: 800px) {
	.paramsconnexions{
		max-width: unset !important;
		.content {
			button {
				width: 40%;
			}
		}
	}
}
</style>