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

			<button class="card-item premium" @click="subContent='streamelements'">
				<Icon name="streamelements" />
				<p>Streamelements</p>
			</button>

			<button class="card-item premium" @click="subContent='kofi'">
				<Icon name="kofi" />
				<p>Ko-fi</p>
			</button>

			<button class="card-item premium" @click="subContent='tipeee'">
				<Icon name="tipeee" />
				<p>Tipeee Stream</p>
			</button>

			<button class="card-item premium" @click="subContent='lumia'">
				<Icon name="lumia" />
				<p>Lumia Stream</p>
			</button>

			<button class="card-item premium beta" @click="subContent='patreon'" v-newflag="{date:$config.NEW_FLAGS_DATE_V13_7, id:'params_connect.patreon'}">
				<Icon name="patreon" />
				<p>Patreon</p>
			</button>

			<button class="card-item premium half" @click="subContent='streamlabs'">
				<Icon name="streamlabs" />
				<p>Streamlabs</p>
			</button>

			<button class="card-item" @click="subContent='tiktok'" v-newflag="{date:$config.NEW_FLAGS_DATE_V15, id:'params_connect.patreon'}">
				<Icon name="tiktok" />
				<p>
					<span>TikTok</span>
					<small>via TikFinity</small>
				</p>
			</button>

			<button class="card-item" @click="subContent='tiltify'" v-newflag="{date:$config.NEW_FLAGS_DATE_V13_7, id:'params_connect.tiltify'}">
				<Icon name="tiltify" />
				<p>Tiltify</p>
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
	<ConnectTiltify v-else-if="subContent == 'tiltify'" />
	<ConnectTipeee v-else-if="subContent == 'tipeee'" />
	<ConnectPatreon v-else-if="subContent == 'patreon'" />
	<ConnectTiktok v-else-if="subContent == 'tiktok'" />
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
import ConnectTipeee from './connexions/ConnectTipeee.vue';
import ConnectTiltify from './connexions/ConnectTiltify.vue';
import ConnectPatreon from './connexions/ConnectPatreon.vue';
import ConnectTiktok from './connexions/ConnectTiktok.vue';

@Component({
	components:{
		ConnectOBS,
		ConnectKofi,
		ConnectHeat,
		ConnectGoXLR,
		ConnectLumia,
		ConnectTiktok,
		ConnectTipeee,
		ConnectPatreon,
		ConnectDiscord,
		ConnectTiltify,
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
			gap:.5em;
			display: flex;
			flex-direction: row;
			align-items: center;
			color: var(--color-text);
			width: 250px;
			text-align: center;
			margin: unset;
			transition: background-color .2s;
			overflow: visible;
			&.premium {
				background-color: var(--color-premium-fadest);
				
				&.half {
					background-color: transparent;
					background-image: linear-gradient(162deg, var(--color-premium-fadest) 30%, var(--background-color-fadest) 60%);
					&:hover {
						background-color: #ffffff20;
					}
				}
			}
			&>.icon {
				height: 2em;
				max-width: 2em;
				margin-right: 0;
			}
			&:hover {
				background-color: var(--color-text-fadest);
				&.premium {
					background-color: var(--color-premium-fader);
				}
			}

			&.beta{
				position: relative;
				overflow: hidden;
				&::after {
					content: "BETA";
					position: absolute;
					top: 10px;
					right: -25px;
					transform: rotate(45deg);
					color: var(--color-light);
					background-color: var(--color-secondary);
					width: 85px;
					padding: .25em;
					font-weight: bold;
					font-size: .85em;
				}
			}
			p {
				flex-grow: 1;
				display: flex;
				flex-direction: column;
				small {
					font-size: .8em;
					font-style: italic;
					opacity: .75;
				}
			}
		}
		:deep(.newFlag) {
			border: 1px solid var(--color-secondary);
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
