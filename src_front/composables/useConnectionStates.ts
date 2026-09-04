import DataStore from "@/store/DataStore";
import { storeBluesky as useStoreBluesky } from "@/store/bluesky/storeBluesky";
import { storeElevenLabs as useStoreElevenLabs } from "@/store/elevenlabs/storeElevenLabs";
import { storeGroq as useStoreGroq } from "@/store/groq/storeGroq";
import { storeHeat as useStoreHeat } from "@/store/heat/storeHeat";
import { storeLumia as useStoreLumia } from "@/store/lumia/storeLumia";
import { storeMeldStudio as useStoreMeldStudio } from "@/store/meldstudio/storeMeldStudio";
import { storeMixitup as useStoreMixitup } from "@/store/mixitup/storeMixitup";
import { storeOBS as useStoreOBS } from "@/store/obs/storeOBS";
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
import { storeVoice as useStoreVoice } from "@/store/voice/storeVoice";
import OBSWebsocket from "@/utils/OBSWebsocket";
import StreamdeckSocket from "@/utils/StreamdeckSocket";
import WebsocketTrigger from "@/utils/WebsocketTrigger";
import GoXLRSocket from "@/utils/goxlr/GoXLRSocket";
import SpotifyHelper from "@/utils/music/SpotifyHelper";
import HeatSocket from "@/utils/twitch/HeatSocket";
import VoicemodWebSocket from "@/utils/voice/VoicemodWebSocket";
import YoutubeHelper from "@/utils/youtube/YoutubeHelper";
import { computed, ref } from "vue";

/**
 * Aggregates per-platform "connected" and "disabled" reactive flags.
 *
 * `disabled` means the user either toggled the connection off or never configured it
 * (no token/key/secret). When true the platform button should render gray;
 * when false and `connected` is also false, it renders red (configured but failing).
 *
 * OAuth tokens persisted only in DataStore (Spotify, Patreon, YouTube) are not
 * reactive, call `refreshOAuthConfigured()` after a connect/disconnect flow
 * completes to refresh those flags.
 */
export function useConnectionStates() {
	const storeParams = useStoreParams();
	const storeStreamelements = useStoreStreamelements();
	const storeTipeee = useStoreTipeee();
	const storeLumia = useStoreLumia();
	const storeStreamlabs = useStoreStreamlabs();
	const storeTiktok = useStoreTiktok();
	const storeTiltify = useStoreTiltify();
	const storeStreamerbot = useStoreStreamerbot();
	const storeSammi = useStoreSammi();
	const storeMixitup = useStoreMixitup();
	const storePlayability = useStorePlayability();
	const storeElevenLabs = useStoreElevenLabs();
	const storeGroq = useStoreGroq();
	const storeTwitchBot = useStoreTwitchBot();
	const storeStreamSocket = useStoreStreamSocket();
	const storeBluesky = useStoreBluesky();
	const storeHeat = useStoreHeat();
	const storeMeldStudio = useStoreMeldStudio();
	const storeOBS = useStoreOBS();
	const storeVoice = useStoreVoice();
	const storePatreon = useStorePatreon();

	const youtubeConnected = computed(() => YoutubeHelper.instance.connected.value);
	const goxlrConnected = computed(() => GoXLRSocket.instance.connected.value);
	const voicemodConnected = computed(() => VoicemodWebSocket.instance.connected.value);
	const spotifyConnected = computed(() => SpotifyHelper.instance.connected.value);
	const heatConnected = computed(() => HeatSocket.instance.connected.value && storeHeat.enabled);
	const obsConnected = computed(() => OBSWebsocket.instance.connected.value);
	const wsCustomConnected = computed(() => WebsocketTrigger.instance.connected.value);
	const streamdeckConnected = computed(() => StreamdeckSocket.instance.connected.value);

	const obsDisabled = computed(() => storeOBS.connectionEnabled === false);
	const goxlrDisabled = computed(() => storeParams.goxlrConfig.enabled === false);
	const heatDisabled = computed(() => storeHeat.enabled === false);
	const tiktokDisabled = computed(() => storeTiktok.connectionEnabled === false);
	const meldStudioDisabled = computed(() => storeMeldStudio.connectionEnabled === false);
	const sammiDisabled = computed(() => storeSammi.connectionEnabled === false);
	const mixitupDisabled = computed(() => storeMixitup.connectionEnabled === false);
	const playabilityDisabled = computed(() => storePlayability.connectionEnabled === false);
	const streamerbotDisabled = computed(() => storeStreamerbot.connectionEnabled === false);
	const voicemodDisabled = computed(() => storeVoice.voicemodParams.enabled === false);
	const streamdeckDisabled = computed(() => StreamdeckSocket.instance.enabledRef.value === false);
	const wsCustomDisabled = computed(() => WebsocketTrigger.instance.enabled.value === false);

	const blueskyDisabled = computed(() => !storeBluesky.sub);
	const tiltifyDisabled = computed(() => storeTiltify.token == null);
	const groqDisabled = computed(() => !storeGroq.apiKey);
	const elevenlabsDisabled = computed(() => !storeElevenLabs.apiKey);
	const streamelementsDisabled = computed(() => !storeStreamelements.accessToken);
	const streamlabsDisabled = computed(() => !storeStreamlabs.accessToken);
	const tipeeeDisabled = computed(() => !storeTipeee.accessToken);
	const streamsocketDisabled = computed(() => !storeStreamSocket.socketSecret);
	const twitchbotDisabled = computed(() => storeTwitchBot.authToken == null);
	const lumiaDisabled = computed(() => !storeLumia.socketToken);

	const spotifyConfiguredRef = ref(!!DataStore.get(DataStore.SPOTIFY_AUTH_TOKEN));
	const youtubeConfiguredRef = ref(!!DataStore.get(DataStore.YOUTUBE_AUTH_TOKEN));
	const spotifyDisabled = computed(() => !spotifyConfiguredRef.value);
	const patreonDisabled = computed(() => !storePatreon.isMember);
	const youtubeDisabled = computed(() => !youtubeConfiguredRef.value);

	function refreshOAuthConfigured(): void {
		spotifyConfiguredRef.value = !!DataStore.get(DataStore.SPOTIFY_AUTH_TOKEN);
		youtubeConfiguredRef.value = !!DataStore.get(DataStore.YOUTUBE_AUTH_TOKEN);
	}

	return {
		youtubeConnected,
		goxlrConnected,
		voicemodConnected,
		spotifyConnected,
		heatConnected,
		obsConnected,
		wsCustomConnected,
		streamdeckConnected,

		obsDisabled,
		goxlrDisabled,
		heatDisabled,
		tiktokDisabled,
		meldStudioDisabled,
		sammiDisabled,
		mixitupDisabled,
		playabilityDisabled,
		streamerbotDisabled,
		voicemodDisabled,
		streamdeckDisabled,
		wsCustomDisabled,
		blueskyDisabled,
		tiltifyDisabled,
		groqDisabled,
		elevenlabsDisabled,
		streamelementsDisabled,
		streamlabsDisabled,
		tipeeeDisabled,
		streamsocketDisabled,
		twitchbotDisabled,
		lumiaDisabled,
		spotifyDisabled,
		patreonDisabled,
		youtubeDisabled,

		refreshOAuthConfigured,
	};
}
