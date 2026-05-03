<template>
	<div class="paramsconnexions parameterContent" v-if="!subContent">
		<Icon name="offline" alt="connections icon" class="icon" />

		<p class="head">
			{{ t("connexions.header")
			}}<SearchForm v-model="search" :debounce-delay="0" @change="filterItems" />
		</p>

		<div class="content" ref="content">
			<button
				v-if="storeAuth.featureFlags.includes('youtube')"
				class="card-item premium"
				:class="{ connected: youtubeConnected }"
				@click="subContent = 'youtube'"
				key="youtube"
			>
				<Icon name="youtube" />
				<p>Youtube</p>
			</button>

			<button
				class="card-item premium"
				:class="{ connected: goxlrConnected }"
				@click="subContent = 'goxlr'"
				key="goxlr"
			>
				<Icon name="goxlr" />
				<p>GoXLR</p>
			</button>

			<button
				class="card-item premium"
				:class="{ connected: storeApi.connected }"
				@click="subContent = 'twitchat_api'"
				v-newflag="{ date: $config.NEW_FLAGS_DATE_V17, id: 'params_connect.twitchat_api' }"
				*
				key="twitchat_api"
			>
				<Icon name="twitchat_api" />
				<p>Twitchat API</p>
			</button>

			<button
				class="card-item premium"
				:class="{ connected: storeStreamelements.connected }"
				@click="subContent = 'streamelements'"
				key="streamelements"
			>
				<Icon name="streamelements" />
				<p>Streamelements</p>
			</button>

			<button
				class="card-item premium"
				:class="{ connected: storeKofi.connected }"
				@click="subContent = 'kofi'"
				key="kofi"
			>
				<Icon name="kofi" />
				<p>Ko-fi</p>
			</button>

			<button
				class="card-item premium"
				:class="{ connected: storeTipeee.connected }"
				@click="subContent = 'tipeee'"
				key="tipeee"
			>
				<Icon name="tipeee" />
				<p>Tipeee Stream</p>
			</button>

			<button
				class="card-item premium"
				:class="{ connected: storeLumia.connected }"
				@click="subContent = 'lumia'"
				key="lumia"
			>
				<Icon name="lumia" />
				<p>Lumia Stream</p>
			</button>

			<button
				class="card-item premium"
				:class="{ connected: storePatreon.connected }"
				@click="subContent = 'patreon'"
				v-newflag="{ date: $config.NEW_FLAGS_DATE_V13_7, id: 'params_connect.patreon' }"
				key="patreon"
			>
				<Icon name="patreon" />
				<p>Patreon</p>
			</button>

			<button
				class="card-item premium half"
				:class="{ connected: storeStreamlabs.connected }"
				@click="subContent = 'streamlabs'"
				key="streamlabs"
			>
				<Icon name="streamlabs" />
				<p>Streamlabs</p>
			</button>

			<button
				class="card-item"
				:class="{ connected: storeTiktok.connected }"
				@click="subContent = 'tiktok'"
				v-newflag="{ date: $config.NEW_FLAGS_DATE_V15, id: 'params_connect.tiktok' }"
				key="tiktok"
			>
				<Icon name="tiktok" />
				<p>
					<span>TikTok</span>
					<small>via TikFinity</small>
				</p>
			</button>
			<button
				class="card-item"
				:class="{ connected: storeExtension.companionEnabled }"
				@click="subContent = 'twitchat_companion'"
				v-newflag="{
					date: $config.NEW_FLAGS_DATE_V17,
					id: 'params_connect.twitchat_companion',
				}"
				key="twitchat_companion"
			>
				<Icon name="twitchat_companion" />
				<p>Twitchat Companion</p>
			</button>

			<button
				class="card-item"
				:class="{ connected: voicemodConnected }"
				@click="subContent = 'voicemod'"
				key="voicemod"
			>
				<Icon name="voicemod" />
				<p>Voicemod</p>
			</button>

			<button
				class="card-item"
				:class="{ connected: streamdeckConnected }"
				@click="subContent = 'streamdeck'"
				key="stream deck"
			>
				<Icon name="elgato" />
				<p>Stream Deck</p>
			</button>

			<button
				class="card-item"
				:class="{ connected: storeDiscord.discordLinked }"
				@click="subContent = 'discord'"
				key="discord"
			>
				<Icon name="discord" />
				<p>Discord</p>
			</button>

			<button
				class="card-item"
				:class="{ connected: spotifyConnected }"
				@click="subContent = 'spotify'"
				key="spotify"
			>
				<Icon name="spotify" />
				<p>Spotify</p>
			</button>

			<button
				class="card-item"
				:class="{ connected: storeBluesky.connected }"
				@click="subContent = 'bluesky'"
				v-newflag="{ date: $config.NEW_FLAGS_DATE_V17, id: 'params_connect.bluesky' }"
				key="bluesky"
			>
				<Icon name="bluesky" />
				<p>Bluesky</p>
			</button>

			<button
				class="card-item"
				:class="{ connected: obsConnected }"
				@click="subContent = 'obs'"
				key="obs"
			>
				<Icon name="obs" />
				<p>OBS</p>
			</button>

			<!-- <button
				class="card-item"
				:class="{ connected: $store.streamfog.connected }"
				@click="subContent = 'streamfog'"
				v-newflag="{ date: $config.NEW_FLAGS_DATE_V17, id: 'params_connect.streamfog' }"
				key="streamfog"
			>
				<Icon name="streamfog" />
				<p>Streamfog</p>
			</button> -->

			<button
				class="card-item"
				:class="{ connected: storeStreamerbot.connected }"
				@click="subContent = 'streamerbot'"
				v-newflag="{ date: $config.NEW_FLAGS_DATE_V15, id: 'params_connect.stramerbot' }"
				key="streamer_bot"
			>
				<Icon name="streamerbot" />
				<p>Streamer.bot</p>
			</button>

			<button
				class="card-item"
				:class="{ connected: storeSammi.connected }"
				@click="subContent = 'sammi'"
				v-newflag="{ date: $config.NEW_FLAGS_DATE_V15, id: 'params_connect.sammi' }"
				key="sammi"
			>
				<Icon name="sammi" />
				<p>SAMMI</p>
			</button>

			<button
				class="card-item"
				:class="{ connected: storeMixitup.connected }"
				@click="subContent = 'mixitup'"
				v-newflag="{ date: $config.NEW_FLAGS_DATE_V15, id: 'params_connect.mixitup' }"
				key="miu"
			>
				<Icon name="mixitup" />
				<p>Mix It Up</p>
			</button>

			<button
				class="card-item"
				:class="{ connected: storeElevenLabs.connected }"
				@click="subContent = 'elevenlabs'"
				v-newflag="{ date: $config.NEW_FLAGS_DATE_V15, id: 'params_connect.elevenlabs' }"
				key="elevenlabs"
			>
				<Icon name="elevenlabs" />
				<p>ElevenLabs</p>
			</button>

			<button
				class="card-item"
				:class="{ connected: storeTiltify.connected }"
				@click="subContent = 'tiltify'"
				v-newflag="{ date: $config.NEW_FLAGS_DATE_V13_7, id: 'params_connect.tiltify' }"
				key="tiltify"
			>
				<Icon name="tiltify" />
				<p>Tiltify</p>
			</button>

			<button
				class="card-item"
				:class="{ connected: heatConnected }"
				@click="subContent = 'heat'"
				key="heat"
			>
				<Icon name="heat" />
				<p>Heat</p>
			</button>

			<button
				class="card-item"
				:class="{ connected: storeStreamSocket.connected }"
				@click="subContent = 'streamsocket'"
				v-newflag="{ date: $config.NEW_FLAGS_DATE_V16, id: 'params_connect.streamsocket' }"
				key="streamsocket"
			>
				<Icon name="streamsocket" />
				<p>StreamSocket Events</p>
			</button>

			<button
				class="card-item"
				:class="{ connected: storePlayability.connected }"
				@click="subContent = 'playability'"
				v-newflag="{ date: $config.NEW_FLAGS_DATE_V15, id: 'params_connect.playability' }"
				key="playability"
			>
				<Icon name="playability" />
				<p>PlayAbility</p>
				<!-- <div class="beta"></div> -->
			</button>

			<button
				class="card-item"
				v-if="storeAuth.featureFlags.includes('groq')"
				:class="{ connected: storeGroq.connected }"
				@click="subContent = 'groq'"
				v-newflag="{ date: $config.NEW_FLAGS_DATE_V16, id: 'params_connect.groq' }"
				key="groq"
			>
				<Icon name="groq" />
				<p>Groq</p>
			</button>

			<button
				class="card-item"
				:class="{ connected: storeTwitchBot.connected }"
				@click="subContent = 'twitchbot'"
				v-newflag="{ date: $config.NEW_FLAGS_DATE_V15, id: 'params_connect.twitchbot' }"
				key="twitch_bot"
			>
				<Icon name="twitch" />
				<p>Twitch bot</p>
			</button>

			<button
				class="card-item"
				:class="{ connected: wsCustomConnected }"
				@click="subContent = 'websocket'"
				key="websocket"
			>
				<Icon name="broadcast" />
				<p>Websocket</p>
			</button>
		</div>
	</div>

	<ConnectOBS v-else-if="subContent == 'obs'" />
	<ConnectKofi v-else-if="subContent == 'kofi'" />
	<ConnectGroq v-else-if="subContent == 'groq'" />
	<ConnectSammi v-else-if="subContent == 'sammi'" />
	<ConnectLumia v-else-if="subContent == 'lumia'" />
	<ConnectGoXLR v-else-if="subContent == 'goxlr'" />
	<ConnectTipeee v-else-if="subContent == 'tipeee'" />
	<ConnectTiktok v-else-if="subContent == 'tiktok'" />
	<ConnectTiltify v-else-if="subContent == 'tiltify'" />
	<ConnectPatreon v-else-if="subContent == 'patreon'" />
	<ConnectBluesky v-else-if="subContent == 'bluesky'" />
	<ConnectMixitup v-else-if="subContent == 'mixitup'" />
	<ConnectYoutube v-else-if="subContent == 'youtube'" />
	<ConnectDiscord v-else-if="subContent == 'discord'" />
	<ConnectSpotify v-else-if="subContent == 'spotify'" />
	<ConnectVoicemod v-else-if="subContent == 'voicemod'" />
	<ConnectStreamfog v-else-if="subContent == 'streamfog'" />
	<ConnectTwitchBot v-else-if="subContent == 'twitchbot'" />
	<ConnectWebsocket v-else-if="subContent == 'websocket'" />
	<ConnectElevenLabs v-else-if="subContent == 'elevenlabs'" />
	<ConnectStreamdeck v-else-if="subContent == 'streamdeck'" />
	<ConnectStreamlabs v-else-if="subContent == 'streamlabs'" />
	<ConnectStreamerBot v-else-if="subContent == 'streamerbot'" />
	<ConnectPlayability v-else-if="subContent == 'playability'" />
	<ConnectTwitchatAPI v-else-if="subContent == 'twitchat_api'" />
	<ConnectStreamSocket v-else-if="subContent == 'streamsocket'" />
	<ConnectStreamelements v-else-if="subContent == 'streamelements'" />
	<ConnectTwitchatCompanion v-else-if="subContent == 'twitchat_companion'" />
	<ConnectHeat v-else-if="subContent == 'heat' || subContent == 'heatAreas'" />
</template>

<script setup lang="ts">
import { storeAPI as useStoreAPI } from "@/store/api/storeAPI";
import { storeDiscord as useStoreDiscord } from "@/store/discord/storeDiscord";
import { storeElevenLabs as useStoreElevenLabs } from "@/store/elevenlabs/storeElevenLabs";
import { storeGroq as useStoreGroq } from "@/store/groq/storeGroq";
import { storeKofi as useStoreKofi } from "@/store/kofi/storeKofi";
import { storeLumia as useStoreLumia } from "@/store/lumia/storeLumia";
import { storeMixitup as useStoreMixitup } from "@/store/mixitup/storeMixitup";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { storePatreon as useStorePatreon } from "@/store/patreon/storePatreon";
import { storePlayability as useStorePlayability } from "@/store/playability/storePlayability";
import { storeSammi as useStoreSammi } from "@/store/sammi/storeSammi";
import { storeStreamelements as useStoreStreamelements } from "@/store/streamelements/storeStreamelements";
import { storeStreamerbot as useStoreStreamerbot } from "@/store/streamerbot/storeStreamerbot";
import { storeStreamlabs as useStoreStreamlabs } from "@/store/streamlabs/storeStreamlabs";
import { storeStreamSocket as useStoreStreamSocket } from "@/store/streamsocket/storeStreamSocket";
import { storeTiktok as useStoreTiktok } from "@/store/tiktok/storeTiktok";
import { storeTiltify as useStoreTiltify } from "@/store/tiltify/storeTiltify";
import { storeTipeee as useStoreTipeee } from "@/store/tipeee/storeTipeee";
import { storeTwitchBot as useStoreTwitchBot } from "@/store/twitchbot/storeTwitchBot";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeExtension as useStoreExtension } from "@/store/extension/storeExtension";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import OBSWebsocket from "@/utils/OBSWebsocket";
import StreamdeckSocket from "@/utils/StreamdeckSocket";
import WebsocketTrigger from "@/utils/WebsocketTrigger";
import GoXLRSocket from "@/utils/goxlr/GoXLRSocket";
import SpotifyHelper from "@/utils/music/SpotifyHelper";
import HeatSocket from "@/utils/twitch/HeatSocket";
import VoicemodWebSocket from "@/utils/voice/VoicemodWebSocket";
import YoutubeHelper from "@/utils/youtube/YoutubeHelper";
import { computed, nextTick, onBeforeMount, ref, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import ConnectDiscord from "./connexions/ConnectDiscord.vue";
import ConnectElevenLabs from "./connexions/ConnectElevenLabs.vue";
import ConnectGoXLR from "./connexions/ConnectGoXLR.vue";
import ConnectGroq from "./connexions/ConnectGroq.vue";
import ConnectHeat from "./connexions/ConnectHeat.vue";
import ConnectKofi from "./connexions/ConnectKofi.vue";
import ConnectLumia from "./connexions/ConnectLumia.vue";
import ConnectMixitup from "./connexions/ConnectMixitup.vue";
import ConnectOBS from "./connexions/ConnectOBS.vue";
import ConnectPatreon from "./connexions/ConnectPatreon.vue";
import ConnectPlayability from "./connexions/ConnectPlayability.vue";
import ConnectSammi from "./connexions/ConnectSammi.vue";
import ConnectSpotify from "./connexions/ConnectSpotify.vue";
import ConnectStreamSocket from "./connexions/ConnectStreamSocket.vue";
import ConnectStreamdeck from "./connexions/ConnectStreamdeck.vue";
import ConnectStreamelements from "./connexions/ConnectStreamelements.vue";
import ConnectStreamerBot from "./connexions/ConnectStreamerBot.vue";
import ConnectStreamfog from "./connexions/ConnectStreamfog.vue";
import ConnectStreamlabs from "./connexions/ConnectStreamlabs.vue";
import ConnectTiktok from "./connexions/ConnectTiktok.vue";
import ConnectTiltify from "./connexions/ConnectTiltify.vue";
import ConnectTipeee from "./connexions/ConnectTipeee.vue";
import ConnectTwitchBot from "./connexions/ConnectTwitchBot.vue";
import ConnectTwitchatAPI from "./connexions/ConnectTwitchatAPI.vue";
import ConnectVoicemod from "./connexions/ConnectVoicemod.vue";
import ConnectWebsocket from "./connexions/ConnectWebsocket.vue";
import ConnectYoutube from "./connexions/ConnectYoutube.vue";
import SearchForm from "./SearchForm.vue";
import ConnectBluesky from "./connexions/ConnectBluesky.vue";
import { storeBluesky as useStoreBluesky } from "@/store/bluesky/storeBluesky";
import Config from "@/utils/Config";
import ConnectTwitchatCompanion from "./connexions/ConnectTwitchatCompanion.vue";

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
const storeBluesky = useStoreBluesky();
const storeAuth = useStoreAuth();
const storeExtension = useStoreExtension();

const contentRef = useTemplateRef("content");
const allowHighlight = ref<boolean>(true);
const subContent = ref<TwitchatDataTypes.ParamDeepSectionsStringType | "">("");
const search = ref("");

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

function filterItems(): void {
	const buttonList = [...(contentRef.value?.querySelectorAll("button") || [])];
	for (const element of buttonList) {
		const text = element.innerText || "";
		const show = text.toLowerCase().includes(search.value.toLowerCase());
		if (show) element.classList.remove("hidden");
		else element.classList.add("hidden");
	}
}

watch(
	() => storeParams.currentPageSubContent,
	(newVal) => {
		subContent.value = newVal;
	},
);

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
			overflow: visible;
			position: relative;
			transition:
				background-color 0.2s,
				opacity 0.2s;

			&.hidden {
				display: none;
			}
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
