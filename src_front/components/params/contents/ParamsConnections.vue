<template>
	<div class="paramsconnexions parameterContent" v-if="!subContent">
		<Icon name="offline" alt="connections icon" class="icon" />

		<p class="head">{{ t("connexions.header") }}</p>

		<div class="content">
			<button
				class="card-item premium"
				:class="{ connected: youtubeConnected }"
				@click="subContent = 'youtube'"
			>
				<Icon name="youtube" />
				<p>Youtube</p>
			</button>

			<button
				class="card-item premium"
				:class="{ connected: goxlrConnected }"
				@click="subContent = 'goxlr'"
			>
				<Icon name="goxlr" />
				<p>GoXLR</p>
			</button>

			<button
				class="card-item premium"
				:class="{ connected: storeApi.connected }"
				@click="subContent = 'twitchat_api'"
				v-newflag="{ date: $config.NEW_FLAGS_DATE_V17, id: 'params_connect.twitchat_api' }"
			>
				<Icon name="twitchat" />
				<p>Twitchat API</p>
			</button>

			<button
				class="card-item premium"
				:class="{ connected: storeStreamelements.connected }"
				@click="subContent = 'streamelements'"
			>
				<Icon name="streamelements" />
				<p>Streamelements</p>
			</button>

			<button
				class="card-item premium"
				:class="{ connected: storeKofi.connected }"
				@click="subContent = 'kofi'"
			>
				<Icon name="kofi" />
				<p>Ko-fi</p>
			</button>

			<button
				class="card-item premium"
				:class="{ connected: storeTipeee.connected }"
				@click="subContent = 'tipeee'"
			>
				<Icon name="tipeee" />
				<p>Tipeee Stream</p>
			</button>

			<button
				class="card-item premium"
				:class="{ connected: storeLumia.connected }"
				@click="subContent = 'lumia'"
			>
				<Icon name="lumia" />
				<p>Lumia Stream</p>
			</button>

			<button
				class="card-item premium"
				:class="{ connected: storePatreon.connected }"
				@click="subContent = 'patreon'"
				v-newflag="{ date: $config.NEW_FLAGS_DATE_V13_7, id: 'params_connect.patreon' }"
			>
				<Icon name="patreon" />
				<p>Patreon</p>
			</button>

			<button
				class="card-item premium half"
				:class="{ connected: storeStreamlabs.connected }"
				@click="subContent = 'streamlabs'"
			>
				<Icon name="streamlabs" />
				<p>Streamlabs</p>
			</button>

			<button
				class="card-item"
				:class="{ connected: storeTiktok.connected }"
				@click="subContent = 'tiktok'"
				v-newflag="{ date: $config.NEW_FLAGS_DATE_V15, id: 'params_connect.tiktok' }"
			>
				<Icon name="tiktok" />
				<p>
					<span>TikTok</span>
					<small>via TikFinity</small>
				</p>
			</button>

			<button
				class="card-item"
				:class="{ connected: storeTiltify.connected }"
				@click="subContent = 'tiltify'"
				v-newflag="{ date: $config.NEW_FLAGS_DATE_V13_7, id: 'params_connect.tiltify' }"
			>
				<Icon name="tiltify" />
				<p>Tiltify</p>
			</button>

			<button
				class="card-item"
				:class="{ connected: voicemodConnected }"
				@click="subContent = 'voicemod'"
			>
				<Icon name="voicemod" />
				<p>Voicemod</p>
			</button>

			<button
				class="card-item"
				:class="{ connected: streamdeckConnected }"
				@click="subContent = 'streamdeck'"
			>
				<Icon name="elgato" />
				<p>Stream Deck</p>
			</button>

			<button
				class="card-item"
				:class="{ connected: storeDiscord.discordLinked }"
				@click="subContent = 'discord'"
			>
				<Icon name="discord" />
				<p>Discord</p>
			</button>

			<button
				class="card-item"
				:class="{ connected: spotifyConnected }"
				@click="subContent = 'spotify'"
			>
				<Icon name="spotify" />
				<p>Spotify</p>
			</button>

			<!-- <button
				class="card-item"
				:class="{ connected: $store.streamfog.connected }"
				@click="subContent = 'streamfog'"
				v-newflag="{ date: $config.NEW_FLAGS_DATE_V17, id: 'params_connect.streamfog' }"
			>
				<Icon name="streamfog" />
				<p>Streamfog</p>
			</button> -->

			<button
				class="card-item"
				:class="{ connected: heatConnected }"
				@click="subContent = 'heat'"
			>
				<Icon name="heat" />
				<p>Heat</p>
			</button>

			<button
				class="card-item"
				:class="{ connected: storeStreamSocket.connected }"
				@click="subContent = 'streamsocket'"
				v-newflag="{ date: $config.NEW_FLAGS_DATE_V16, id: 'params_connect.streamsocket' }"
			>
				<Icon name="streamsocket" />
				<p>StreamSocket Events</p>
			</button>

			<button
				class="card-item"
				:class="{ connected: storeStreamerbot.connected }"
				@click="subContent = 'streamerbot'"
				v-newflag="{ date: $config.NEW_FLAGS_DATE_V15, id: 'params_connect.stramerbot' }"
			>
				<Icon name="streamerbot" />
				<p>Streamer.bot</p>
			</button>

			<button
				class="card-item"
				:class="{ connected: storeSammi.connected }"
				@click="subContent = 'sammi'"
				v-newflag="{ date: $config.NEW_FLAGS_DATE_V15, id: 'params_connect.sammi' }"
			>
				<Icon name="sammi" />
				<p>SAMMI</p>
			</button>

			<button
				class="card-item"
				:class="{ connected: storeMixitup.connected }"
				@click="subContent = 'mixitup'"
				v-newflag="{ date: $config.NEW_FLAGS_DATE_V15, id: 'params_connect.mixitup' }"
			>
				<Icon name="mixitup" />
				<p>Mix It Up</p>
			</button>

			<button
				class="card-item"
				:class="{ connected: storePlayability.connected }"
				@click="subContent = 'playability'"
				v-newflag="{ date: $config.NEW_FLAGS_DATE_V15, id: 'params_connect.playability' }"
			>
				<Icon name="playability" />
				<p>PlayAbility</p>
				<!-- <div class="beta"></div> -->
			</button>

			<button
				class="card-item"
				:class="{ connected: storeElevenLabs.connected }"
				@click="subContent = 'elevenlabs'"
				v-newflag="{ date: $config.NEW_FLAGS_DATE_V15, id: 'params_connect.elevenlabs' }"
			>
				<Icon name="elevenlabs" />
				<p>ElevenLabs</p>
			</button>

			<button
				class="card-item"
				v-if="storeGroq.enabled"
				:class="{ connected: storeGroq.connected }"
				@click="subContent = 'groq'"
				v-newflag="{ date: $config.NEW_FLAGS_DATE_V16, id: 'params_connect.groq' }"
			>
				<Icon name="groq" />
				<p>Groq</p>
			</button>

			<button
				class="card-item"
				:class="{ connected: storeTwitchBot.connected }"
				@click="subContent = 'twitchbot'"
				v-newflag="{ date: $config.NEW_FLAGS_DATE_V15, id: 'params_connect.twitchbot' }"
			>
				<Icon name="twitch" />
				<p>Twitch bot</p>
			</button>

			<button
				class="card-item"
				:class="{ connected: obsConnected }"
				@click="subContent = 'obs'"
			>
				<Icon name="obs" />
				<p>OBS</p>
			</button>

			<button
				class="card-item"
				:class="{ connected: wsCustomConnected }"
				@click="subContent = 'websocket'"
			>
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
	<ConnectStreamerBot v-else-if="subContent == 'streamerbot'" />
	<ConnectSammi v-else-if="subContent == 'sammi'" />
	<ConnectMixitup v-else-if="subContent == 'mixitup'" />
	<ConnectElevenLabs v-else-if="subContent == 'elevenlabs'" />
	<ConnectPlayability v-else-if="subContent == 'playability'" />
	<ConnectTwitchBot v-else-if="subContent == 'twitchbot'" />
	<ConnectGroq v-else-if="subContent == 'groq'" />
	<ConnectStreamSocket v-else-if="subContent == 'streamsocket'" />
	<ConnectStreamfog v-else-if="subContent == 'streamfog'" />
	<ConnectTwitchatAPI v-else-if="subContent == 'twitchat_api'" />
</template>

<script setup lang="ts">
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import OBSWebsocket from "@/utils/OBSWebsocket";
import WebsocketTrigger from "@/utils/WebsocketTrigger";
import GoXLRSocket from "@/utils/goxlr/GoXLRSocket";
import SpotifyHelper from "@/utils/music/SpotifyHelper";
import HeatSocket from "@/utils/twitch/HeatSocket";
import VoicemodWebSocket from "@/utils/voice/VoicemodWebSocket";
import YoutubeHelper from "@/utils/youtube/YoutubeHelper";
import StreamdeckSocket from "@/utils/StreamdeckSocket";
import { ref, computed, onBeforeMount, nextTick } from "vue";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { storeStreamelements as useStoreStreamelements } from "@/store/streamelements/storeStreamelements";
import { storeKofi as useStoreKofi } from "@/store/kofi/storeKofi";
import { storeTipeee as useStoreTipeee } from "@/store/tipeee/storeTipeee";
import { storeLumia as useStoreLumia } from "@/store/lumia/storeLumia";
import { storePatreon as useStorePatreon } from "@/store/patreon/storePatreon";
import { storeStreamlabs as useStoreStreamlabs } from "@/store/streamlabs/storeStreamlabs";
import { storeTiktok as useStoreTiktok } from "@/store/tiktok/storeTiktok";
import { storeTiltify as useStoreTiltify } from "@/store/tiltify/storeTiltify";
import { storeDiscord as useStoreDiscord } from "@/store/discord/storeDiscord";
import { storeStreamerbot as useStoreStreamerbot } from "@/store/streamerbot/storeStreamerbot";
import { storeSammi as useStoreSammi } from "@/store/sammi/storeSammi";
import { storeMixitup as useStoreMixitup } from "@/store/mixitup/storeMixitup";
import { storePlayability as useStorePlayability } from "@/store/playability/storePlayability";
import { storeElevenLabs as useStoreElevenLabs } from "@/store/elevenlabs/storeElevenLabs";
import { storeGroq as useStoreGroq } from "@/store/groq/storeGroq";
import { storeTwitchBot as useStoreTwitchBot } from "@/store/twitchbot/storeTwitchBot";
import { storeStreamSocket as useStoreStreamSocket } from "@/store/streamsocket/storeStreamSocket";
import ConnectDiscord from "./connexions/ConnectDiscord.vue";
import ConnectElevenLabs from "./connexions/ConnectElevenLabs.vue";
import ConnectGoXLR from "./connexions/ConnectGoXLR.vue";
import ConnectHeat from "./connexions/ConnectHeat.vue";
import ConnectKofi from "./connexions/ConnectKofi.vue";
import ConnectLumia from "./connexions/ConnectLumia.vue";
import ConnectMixitup from "./connexions/ConnectMixitup.vue";
import ConnectOBS from "./connexions/ConnectOBS.vue";
import ConnectPatreon from "./connexions/ConnectPatreon.vue";
import ConnectPlayability from "./connexions/ConnectPlayability.vue";
import ConnectSammi from "./connexions/ConnectSammi.vue";
import ConnectSpotify from "./connexions/ConnectSpotify.vue";
import ConnectStreamdeck from "./connexions/ConnectStreamdeck.vue";
import ConnectStreamelements from "./connexions/ConnectStreamelements.vue";
import ConnectStreamerBot from "./connexions/ConnectStreamerBot.vue";
import ConnectStreamlabs from "./connexions/ConnectStreamlabs.vue";
import ConnectTiktok from "./connexions/ConnectTiktok.vue";
import ConnectTiltify from "./connexions/ConnectTiltify.vue";
import ConnectTipeee from "./connexions/ConnectTipeee.vue";
import ConnectVoicemod from "./connexions/ConnectVoicemod.vue";
import ConnectWebsocket from "./connexions/ConnectWebsocket.vue";
import ConnectYoutube from "./connexions/ConnectYoutube.vue";
import ConnectTwitchBot from "./connexions/ConnectTwitchBot.vue";
import ConnectGroq from "./connexions/ConnectGroq.vue";
import ConnectStreamSocket from "./connexions/ConnectStreamSocket.vue";
import ConnectStreamfog from "./connexions/ConnectStreamfog.vue";
import { useI18n } from "vue-i18n";
import ConnectTwitchatAPI from "./connexions/ConnectTwitchatAPI.vue";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeAPI as useStoreAPI } from "@/store/api/storeAPI";

const { t } = useI18n();
const storeParams = useStoreParams();
const storeApi = useStoreAPI();
const storeStreamelements = useStoreStreamelements();
const storeKofi = useStoreKofi();
const storeTipeee = useStoreTipeee();
const storeLumia = useStoreLumia();
const storePatreon = useStorePatreon();
const storeStreamlabs = useStoreStreamlabs();
const storeTiktok = useStoreTiktok();
const storeTiltify = useStoreTiltify();
const storeDiscord = useStoreDiscord();
const storeStreamerbot = useStoreStreamerbot();
const storeSammi = useStoreSammi();
const storeMixitup = useStoreMixitup();
const storePlayability = useStorePlayability();
const storeElevenLabs = useStoreElevenLabs();
const storeGroq = useStoreGroq();
const storeTwitchBot = useStoreTwitchBot();
const storeStreamSocket = useStoreStreamSocket();
const storeAuth = useStoreAuth();

const allowHighlight = ref<boolean>(true);
const subContent = ref<TwitchatDataTypes.ParamDeepSectionsStringType | "">("");

const youtubeConnected = computed(() => YoutubeHelper.instance.connected.value);
const goxlrConnected = computed(() => GoXLRSocket.instance.connected.value);
const voicemodConnected = computed(() => VoicemodWebSocket.instance.connected.value);
const spotifyConnected = computed(() => SpotifyHelper.instance.connected.value);
const heatConnected = computed(() => HeatSocket.instance.connected.value);
const obsConnected = computed(() => OBSWebsocket.instance.connected.value);
const wsCustomConnected = computed(() => WebsocketTrigger.instance.connected.value);
const streamdeckConnected = computed(() => StreamdeckSocket.instance.connected.value);

onBeforeMount(async () => {
	await nextTick();
	subContent.value = storeParams.currentPageSubContent;
	// if(subContent.value) {
	// 	const holder = (this.$refs[subContent.value] as ComponentPublicInstance)?.$el;
	// 	if(holder) holder.scrollIntoView();
	// }
});

function onNavigateBack(): boolean {
	if (subContent.value == "") return false;
	subContent.value = "";
	return true;
}

function reload(): boolean {
	return onNavigateBack();
}

defineExpose({ allowHighlight, onNavigateBack, reload });
</script>

<style scoped lang="less">
.paramsconnexions {
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
			gap: 0.5em;
			display: flex;
			flex-direction: row;
			align-items: center;
			color: var(--color-text);
			width: 250px;
			text-align: center;
			margin: unset;
			transition: background-color 0.2s;
			overflow: visible;
			position: relative;
			&:not(.noConnectInfo) {
				border-right: 2px solid var(--color-alert);
			}
			&.premium {
				background-color: var(--color-premium-fadest);

				&.half {
					background-color: transparent;
					background-image: linear-gradient(
						162deg,
						var(--color-premium-fadest) 30%,
						var(--background-color-fadest) 60%
					);
					&:hover {
						background-color: #ffffff20;
					}
				}
			}
			& > .icon {
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

			.beta {
				position: absolute;
				overflow: hidden;
				width: 100%;
				height: 100%;
				top: 0;
				left: 0;
				border-radius: var(--border-radius);
				&::after {
					content: "BETA";
					position: absolute;
					top: 10px;
					right: -25px;
					transform: rotate(45deg);
					color: var(--color-light);
					background-color: var(--color-secondary);
					width: 85px;
					padding: 0.25em;
					font-weight: bold;
					font-size: 0.85em;
				}
			}

			p {
				flex-grow: 1;
				display: flex;
				flex-direction: column;
				small {
					font-size: 0.8em;
					font-style: italic;
					opacity: 0.75;
				}
			}
			&:not(.noConnectInfo)::after {
				content: "";
				position: absolute;
				top: 50%;
				right: 0;
				width: 0.5em;
				height: 0.5em;
				border-radius: 50%;
				transform: translate(50%, -50%);
				background-color: var(--color-alert);
			}
			&.connected {
				border-right-color: var(--color-primary);
				&::after {
					background-color: var(--color-primary);
				}
			}
		}
	}
}

@media only screen and (max-width: 800px) {
	.paramsconnexions {
		max-width: unset !important;
		.content {
			button {
				width: 40%;
			}
		}
	}
}
</style>
