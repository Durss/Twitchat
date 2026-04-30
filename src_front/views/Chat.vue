<template>
	<div :class="classes" ref="rootEl">
		<div
			class="offlineTitle"
			v-if="storeMain.offlineMode"
			v-tooltip="{ content: $t('global.offlineMode'), placement: 'bottom' }"
		>
			<Icon name="alert" />
		</div>
		<div class="top" ref="top">
			<div class="scrollable" ref="scrollable" @scroll="onScrollColumns()">
				<div
					class="column"
					v-for="(c, index) in storeParams.chatColumnsConfig"
					:ref="(el: any) => setColumnRef(el, c.id)"
					:key="c.id"
					:style="getColStyles(c)"
				>
					<div class="subHolder" v-if="buildIndex >= index">
						<GreetThem
							class="greetThem"
							v-if="
								greetColIndexTarget == c.order &&
								storeParams.features.firstMessage.value === true
							"
						/>

						<MessageList
							ref="messages"
							class="messages"
							@addColumn="addColumn"
							:config="c"
							filterId="chat"
						/>
					</div>

					<div
						class="dragBt"
						v-if="
							storeParams.chatColumnsConfig.length > 1 &&
							(c.order == 0 || storeParams.chatColumnsConfig.length > 2)
						"
						@dblclick="expandCol(c)"
						@pointerdown="startDrag($event, c)"
					/>
				</div>
			</div>
		</div>

		<Teleport
			v-if="panelsColumnTarget && buildIndex >= 1 + storeParams.chatColumnsConfig.length"
			:to="panelsColumnTarget"
		>
			<VoiceTranscript class="tts" />

			<PollForm
				class="popin"
				v-if="storeParams.currentModal == 'poll'"
				@close="storeParams.closeModal()"
			/>
			<ChatPollForm
				class="popin"
				v-if="storeParams.currentModal == 'chatPoll'"
				@close="storeParams.closeModal()"
			/>
			<ChatSuggestionForm
				class="popin"
				v-if="storeParams.currentModal == 'chatsuggForm'"
				@close="storeParams.closeModal()"
			/>
			<RaffleForm
				class="popin"
				v-if="storeParams.currentModal == 'raffle'"
				@close="storeParams.closeModal()"
			/>
			<PredictionForm
				class="popin"
				v-if="storeParams.currentModal == 'pred'"
				@close="storeParams.closeModal()"
			/>
			<BingoForm
				class="popin"
				v-if="storeParams.currentModal == 'bingo'"
				@close="storeParams.closeModal()"
			/>
			<BingoGridForm
				class="popin"
				v-if="storeParams.currentModal == 'bingo_grid'"
				@close="storeParams.closeModal()"
			/>
			<LiveFollowings
				class="popin"
				v-if="storeParams.currentModal == 'liveStreams'"
				@close="storeParams.closeModal()"
			/>
			<StreamInfoForm
				class="popin"
				v-if="storeParams.currentModal == 'streamInfo'"
				@close="storeParams.closeModal()"
			/>
			<TTUserList
				class="popin"
				v-if="storeParams.currentModal == 'TTuserList'"
				@close="storeParams.closeModal()"
			/>
			<PinedMessages
				class="popin"
				v-if="storeParams.currentModal == 'pins'"
				@close="storeParams.closeModal()"
			/>
			<TimerForm
				class="popin"
				v-if="storeParams.currentModal == 'timer'"
				@close="storeParams.closeModal()"
			/>
			<TriggersLogs
				class="popin"
				v-if="storeParams.currentModal == 'triggersLogs'"
				@close="storeParams.closeModal()"
			/>
			<HeatLogs
				class="popin"
				v-if="storeParams.currentModal == 'heatLogs'"
				@close="storeParams.closeModal()"
			/>
			<ObsHeatLogs
				class="popin"
				v-if="storeParams.currentModal == 'obsHeatLogs'"
				@close="storeParams.closeModal()"
			/>
			<TrackedUsers
				class="popin"
				v-if="storeParams.currentModal == 'tracked'"
				@close="storeParams.closeModal()"
			/>
			<WhispersState
				class="popin"
				v-if="storeParams.currentModal == 'whispers'"
				@close="storeParams.closeModal()"
			/>
			<ChatSuggestionState
				class="popin"
				v-if="storeParams.currentModal == 'chatsuggState'"
				@close="storeParams.closeModal()"
			/>
			<MessageSearch
				class="popin"
				v-if="storeParams.currentModal == 'search'"
				@close="storeParams.closeModal()"
			/>
			<TwitchatAnnouncement
				class="popin"
				v-if="storeParams.currentModal == 'twitchatAnnouncement'"
				@close="storeParams.closeModal()"
			/>
			<FeatureFlagsAdmin
				class="popin"
				v-if="storeParams.currentModal == 'featureFlags'"
				@close="storeParams.closeModal()"
			/>
			<StreamSummary
				class="popin"
				v-if="storeParams.currentModal == 'streamSummary'"
				@close="storeParams.closeModal()"
			/>
			<Extensions
				class="popin"
				v-if="storeParams.currentModal == 'extensions'"
				@close="storeParams.closeModal()"
			/>
			<QnaForm
				class="popin"
				v-if="storeParams.currentModal == 'qnaForm'"
				@close="storeParams.closeModal()"
			/>
			<QnaList
				class="popin"
				v-if="storeParams.currentModal == 'qna'"
				@close="storeParams.closeModal()"
			/>
			<GroqHistory
				class="popin"
				v-if="storeParams.currentModal == 'groqHistory'"
				@close="storeParams.closeModal()"
			/>
			<QuizForm
				class="popin"
				v-if="storeParams.currentModal == 'quizForm'"
				@close="storeParams.closeModal()"
			/>
			<UserCard class="popin" />
		</Teleport>

		<Teleport
			v-if="panelsColumnTarget && buildIndex >= 2 + storeParams.chatColumnsConfig.length"
			:to="panelsColumnTarget"
		>
			<ChannelNotifications
				:currentContent="currentNotificationContent"
				@close="currentNotificationContent = ''"
			/>
		</Teleport>

		<NonPremiumCleanup v-if="mustDisableItems" @close="mustDisableItems_precalc = false" />

		<OutdatedDataVersionAlert v-if="storeMain.outdatedDataVersion" />

		<div class="bottom">
			<ChatForm
				class="chatForm"
				ref="chatForm"
				v-if="buildIndex >= 3 + storeParams.chatColumnsConfig.length"
				@search="searchMessage"
				@setCurrentNotification="setCurrentNotification"
				v-model:showEmotes="showEmotes"
				@update:showEmotes="(v: boolean) => (showEmotes = v)"
				v-model:showRewards="showRewards"
				@update:showRewards="(v: boolean) => (showRewards = v)"
				v-model:showCommands="showCommands"
				@update:showCommands="(v: boolean) => (showCommands = v)"
				v-model:showChatUsers="showChatUsers"
				@update:showChatUsers="(v: boolean) => (showChatUsers = v)"
				v-model:showShoutout="showShoutout"
				@update:showShoutout="(v: boolean) => (showShoutout = v)"
				v-model:showDevMenu="showDevMenu"
				@update:showDevMenu="(v: boolean) => (showDevMenu = v)"
				v-model:showCredits="showCredits"
				@update:showCredits="(v: boolean) => (showCredits = v)"
				v-model:showBingoGrid="showBingoGrid"
				@update:showBingoGrid="(v: boolean) => (showBingoGrid = v)"
				v-model:showGazaFunds="showGazaFunds"
				@update:showGazaFunds="(v: boolean) => (showGazaFunds = v)"
				v-model:showPins="showPins"
				@update:showPins="(v: boolean) => (showPins = v)"
				v-model:showSettingsImport="importedSettings"
				@update:showSettingsImport="(v: TriggerImportData | null) => (importedSettings = v)"
			/>
		</div>

		<RewardsList
			class="contentWindows rewards"
			v-if="showRewards"
			@close="showRewards = false"
		/>

		<DevmodeMenu
			class="contentWindows devmode"
			v-if="showDevMenu"
			@triggersLogs="storeParams.openModal('triggersLogs')"
			@obsHeatLogs="storeParams.openModal('obsHeatLogs')"
			@close="showDevMenu = false"
		/>

		<CommandHelper
			class="contentWindows actions"
			v-if="showCommands"
			v-model:showChatUsers="showChatUsers"
			@update:showChatUsers="(v: boolean) => (showChatUsers = v)"
			v-model:showRewards="showRewards"
			@update:showRewards="(v: boolean) => (showRewards = v)"
			@close="showCommands = false"
		/>

		<EmoteSelector
			class="contentWindows emotes"
			v-if="showEmotes"
			@select="onSelectEmote"
			@close="showEmotes = false"
		/>

		<UserList
			class="contentWindows users"
			v-if="showChatUsers"
			@close="showChatUsers = false"
		/>

		<ShoutoutList
			class="contentWindows shoutout"
			v-if="showShoutout"
			@close="showShoutout = false"
		/>

		<EndingCreditsControls
			class="contentWindows credits"
			v-if="showCredits"
			@close="showCredits = false"
		/>

		<BingoGridControls
			class="contentWindows bingoGrid"
			v-if="showBingoGrid"
			@close="showBingoGrid = false"
		/>

		<PinsList class="contentWindows pins" v-if="showPins" @close="showPins = false" />

		<SettingsImportForm
			v-if="importedSettings"
			:importedSettings="importedSettings"
			@close="importedSettings = null"
		/>

		<Parameters v-if="buildIndex >= 5 + storeParams.chatColumnsConfig.length" />

		<EmergencyFollowsListModal
			v-if="showEmergencyFollows && !forceEmergencyFollowClose"
			@close="forceEmergencyFollowClose = true"
		/>

		<MigrationFixerModal
			v-if="storeMain.httpMigrationFixData.length > 0 && !forceHttpFixerClose"
			@close="forceHttpFixerClose = true"
		/>

		<DonorBadge
			ref="donor"
			class="donorState"
			v-if="showDonorBadge"
			@click="closeDonorCard()"
		/>

		<Changelog v-if="storeParams.currentModal == 'updates'" @close="storeParams.closeModal()" />

		<Gngngn v-if="storeParams.currentModal == 'gngngn'" @close="storeParams.closeModal()" />

		<Login v-if="storeAuth.newScopesToRequest.length > 0" scopeOnly />

		<ShareParams
			v-if="storeParams.currentModal == 'shareParams'"
			@close="storeParams.closeModal()"
		/>

		<ChatAlertMessage v-if="buildIndex >= 4 + storeParams.chatColumnsConfig.length" />

		<HelpGenocideVictims v-if="showGazaFunds" @close="showGazaFunds = false" />

		<Accessibility />

		<div
			class="blinkLayer"
			ref="blinkLayer"
			v-if="showBlinkLayer"
			@click="showBlinkLayer = false"
		></div>
	</div>
</template>

<script setup lang="ts">
import BingoForm from "@/components/bingo/BingoForm.vue";
import BingoGridForm from "@/components/bingo_grid/BingoGridForm.vue";
import Changelog from "@/components/changelog/Changelog.vue";
import ChannelNotifications from "@/components/channelnotifications/ChannelNotifications.vue";
import ChatSuggestionForm from "@/components/chatSugg/ChatSuggestionForm.vue";
import ChatSuggestionState from "@/components/chatSugg/ChatSuggestionState.vue";
import BingoGridControls from "@/components/chatform/BingoGridControls.vue";
import ChatForm from "@/components/chatform/ChatForm.vue";
import CommandHelper from "@/components/chatform/CommandHelper.vue";
import DevmodeMenu from "@/components/chatform/DevmodeMenu.vue";
import EmoteSelector from "@/components/chatform/EmoteSelector.vue";
import EndingCreditsControls from "@/components/chatform/EndingCreditsControls.vue";
import Extensions from "@/components/chatform/Extensions.vue";
import GroqHistory from "@/components/chatform/GroqHistory.vue";
import HelpGenocideVictims from "@/components/chatform/HelpGenocideVictims.vue";
import LiveFollowings from "@/components/chatform/LiveFollowings.vue";
import MessageSearch from "@/components/chatform/MessageSearch.vue";
import NonPremiumCleanup from "@/components/chatform/NonPremiumCleanup.vue";
import OutdatedDataVersionAlert from "@/components/chatform/OutdatedDataVersionAlert.vue";
import PinsList from "@/components/chatform/PinsList.vue";
import QnaForm from "@/components/chatform/QnaForm.vue";
import QnaList from "@/components/chatform/QnaList.vue";
import RewardsList from "@/components/chatform/RewardsList.vue";
import ShoutoutList from "@/components/chatform/ShoutoutList.vue";
import StreamSummary from "@/components/chatform/StreamSummary.vue";
import TTUserList from "@/components/chatform/TTUserList.vue";
import TwitchatAnnouncement from "@/components/chatform/TwitchatAnnouncement.vue";
import FeatureFlagsAdmin from "@/components/chatform/FeatureFlagsAdmin.vue";
import UserList from "@/components/chatform/UserList.vue";
import HeatLogs from "@/components/heatlogs/HeatLogs.vue";
import MessageList from "@/components/messages/MessageList.vue";
import MigrationFixerModal from "@/components/modals/MigrationFixerModal.vue";
import GreetThem from "@/components/newusers/GreetThem.vue";
import ObsHeatLogs from "@/components/obs/ObsHeatLogs.vue";
import Parameters from "@/components/params/Parameters.vue";
import SettingsImportForm from "@/components/params/contents/exporter/SettingsImportForm.vue";
import ChatPollForm from "@/components/poll/ChatPollForm.vue";
import PollForm from "@/components/poll/PollForm.vue";
import PredictionForm from "@/components/prediction/PredictionForm.vue";
import RaffleForm from "@/components/raffle/RaffleForm.vue";
import StreamInfoForm from "@/components/streaminfo/StreamInfoForm.vue";
import TrackedUsers from "@/components/tracked/TrackedUsers.vue";
import TriggersLogs from "@/components/triggerslogs/TriggersLogs.vue";
import DonorBadge from "@/components/user/DonorBadge.vue";
import WhispersState from "@/components/whispers/WhispersState.vue";
import MessengerProxy from "@/messaging/MessengerProxy";
import type { TriggerImportData } from "@/types/TriggerActionDataTypes";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Config from "@/utils/Config";
import Utils from "@/utils/Utils";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { gsap } from "gsap/gsap-core";
import {
	computed,
	nextTick,
	onBeforeMount,
	onBeforeUnmount,
	onMounted,
	ref,
	useTemplateRef,
	watch,
} from "vue";
import { useI18n } from "vue-i18n";
import type { ComponentPublicInstance } from "vue";
import ChatAlertMessage from "../components/chatAlert/ChatAlertMessage.vue";
import Gngngn from "../components/chatform/Gngngn.vue";
import PinedMessages from "../components/chatform/PinedMessages.vue";
import EmergencyFollowsListModal from "../components/modals/EmergencyFollowsListModal.vue";
import TimerForm from "../components/timer/TimerForm.vue";
import UserCard from "../components/user/UserCard.vue";
import VoiceTranscript from "../components/voice/VoiceTranscript.vue";
import Accessibility from "./Accessibility.vue";
import Login from "./Login.vue";
import ShareParams from "./ShareParams.vue";
import PublicAPI from "@/utils/PublicAPI";
import type { TwitchatEventMap } from "@/events/TwitchatEvent";
import QuizForm from "@/components/quiz/QuizForm.vue";
import { storeMain as useStoreMain } from "@/store/storeMain";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storePrediction as useStorePrediction } from "@/store/prediction/storePrediction";
import { storeStream as useStoreStream } from "@/store/stream/storeStream";
import { storePoll as useStorePoll } from "@/store/poll/storePoll";
import { storeChatPoll as useStoreChatPoll } from "@/store/chat_poll/storeChatPoll";
import { storeBingo as useStoreBingo } from "@/store/bingo/storeBingo";
import { storeRaffle as useStoreRaffle } from "@/store/raffle/storeRaffle";
import { storeEmergency as useStoreEmergency } from "@/store/emergency/storeEmergency";
import { storeChat as useStoreChat } from "@/store/chat/storeChat";
import { storeCommon as useStoreCommon } from "@/store/common/storeCommon";
import { asset } from "@/composables/useAsset";

const { t } = useI18n();
const { getAsset } = asset();

const storeMain = useStoreMain();
const storeParams = useStoreParams();
const storeAuth = useStoreAuth();
const storePrediction = useStorePrediction();
const storeStream = useStoreStream();
const storePoll = useStorePoll();
const storeChatPoll = useStoreChatPoll();
const storeBingo = useStoreBingo();
const storeRaffle = useStoreRaffle();
const storeEmergency = useStoreEmergency();
const storeChat = useStoreChat();
const storeCommon = useStoreCommon();

// Template refs
const rootEl = useTemplateRef<HTMLDivElement>("rootEl");
const scrollable = useTemplateRef<HTMLDivElement>("scrollable");
const donor = useTemplateRef<InstanceType<typeof DonorBadge>>("donor");
const chatForm = useTemplateRef<InstanceType<typeof ChatForm>>("chatForm");
const blinkLayer = useTemplateRef<HTMLDivElement>("blinkLayer");

const columnRefs: Record<string, HTMLDivElement> = {};
function setColumnRef(el: HTMLDivElement | ComponentPublicInstance | null, id: string): void {
	if (el) columnRefs[id] = el as HTMLDivElement;
	else delete columnRefs[id];
}

// Reactive state
const buildIndex = ref(0);
const showPins = ref(false);
const showEmotes = ref(false);
const showRewards = ref(false);
const showDevMenu = ref(false);
const showCredits = ref(false);
const showCommands = ref(false);
const showShoutout = ref(false);
const showBingoGrid = ref(false);
const showGazaFunds = ref(false);
const showChatUsers = ref(false);
const showDonorBadge = ref(true);
const showBlinkLayer = ref(false);
const importedSettings = ref<TriggerImportData | null>(null);
const greetColIndexTarget = ref(0);
const panelsColIndexTarget = ref(0);
const forceHttpFixerClose = ref(false);
const forceEmergencyFollowClose = ref(false);
const panelsColumnTarget = ref<HTMLDivElement | null>(null);
const currentNotificationContent = ref<TwitchatDataTypes.NotificationTypes>("");
const mustDisableItems_precalc = ref(false);

let disposed = false;
let mouseX = 0;
let mouseY = 0;
let prevFormHeight = 0;
let resizeDebounce = -1;
let resizing = false;
let closingDonorState = false;
let draggedCol: TwitchatDataTypes.ChatColumnsConfig | null = null;
let mouseUpHandler: (e: MouseEvent | TouchEvent) => void;
let mouseMoveHandler: (e: MouseEvent | TouchEvent) => void;
let windowResizeHandler: (e: Event) => void;
let publicApiEventHandler: (e: unknown) => void;

const splitViewVertical = computed(() => storeParams.appearance.splitViewVertical.value as boolean);
const showEmergencyFollows = computed(
	() => storeEmergency.follows.length > 0 && !storeEmergency.emergencyStarted,
);
const mustDisableItems = computed(() => mustDisableItems_precalc.value && !storeAuth.isPremium);
const classes = computed(() => {
	const res = ["chat"];
	if (splitViewVertical.value) res.push("splitVertical");
	if (Config.instance.DEMO_MODE) res.push("demo");
	if (storeMain.offlineMode) res.push("offlineMode");
	return res;
});

//Auto opens the prediction status if pending for completion
watch(
	() => storePrediction.data,
	(newValue, prevValue) => {
		let prediction = storePrediction.data;
		const isNew = !prevValue || (newValue && prevValue.id != newValue.id);
		if ((prediction && prediction.pendingAnswer) || isNew)
			setCurrentNotification("prediction", false);
	},
);

//Auto opens the raid status
watch(
	() => storeStream.currentRaid,
	(newValue, prevValue) => {
		if (newValue && !prevValue) setCurrentNotification("raid", false);
	},
);

//Auto opens the poll status if terminated
watch(
	() => storePoll.data,
	(newValue, prevValue) => {
		let poll = storePoll.data;
		const isNew = !prevValue || (newValue && prevValue.id != newValue.id);
		if (poll && isNew) setCurrentNotification("poll", false);
	},
);

//Auto opens the poll status if terminated
watch(
	() => storeChatPoll.data,
	(newValue, prevValue) => {
		let poll = storeChatPoll.data;
		const isNew = !prevValue || (newValue && prevValue);
		if (poll && isNew) setCurrentNotification("chatPoll", false);
	},
);

//Auto opens the bingo status when created
watch(
	() => storeBingo.data,
	() => {
		let bingo = storeBingo.data;
		if (bingo) setCurrentNotification("bingo", false);
	},
);

//Auto opens the raffle status when created
watch(
	() => storeRaffle.raffleList,
	(newValue, oldValue) => {
		if (newValue.length <= oldValue.length) return;

		let raffleliost = storeRaffle.raffleList;
		for (let i = 0; i < raffleliost.length; i++) {
			const raffle = raffleliost[i];
			if (raffle && (raffle.command || raffle.reward_id)) {
				setCurrentNotification("raffle");
				break;
			}
		}
	},
	{ deep: true },
);

//Auto opens the train status when created
watch(
	() => storeStream.hypeTrain,
	(newValue, oldValue) => {
		if (newValue && !oldValue) setCurrentNotification("train", false);
	},
);

//Watch for columns changes
watch(
	() => storeParams.chatColumnsConfig,
	() => {
		computeWindowsSizes();
	},
	{ deep: true },
);

//Watch for current modal to be displayed
watch(
	() => storeParams.currentModal,
	(value) => {
		//Make sure the column holding modals is visible
		if (panelsColumnTarget.value && value) {
			const col = panelsColumnTarget.value.parentElement as HTMLDivElement;
			const scrollableEl = scrollable.value!;
			const scrollTo = {
				x: col.offsetLeft - (scrollableEl.offsetWidth - col.offsetWidth),
				y: col.offsetTop - (scrollableEl.offsetHeight - col.offsetHeight) / 2,
			};
			gsap.to(scrollableEl, { duration: 0.75, ease: "sine.inOut", scrollTo });
		}
	},
);

//Handle chat alert feature
watch(
	() => storeMain.chatAlert,
	async () => {
		if (storeMain.chatAlert != null) {
			if (storeParams.features.alertMode.value !== true) return;

			const params = storeMain.chatAlertParams;
			gsap.killTweensOf(rootEl.value);
			if (params.shake) {
				gsap.fromTo(
					rootEl.value,
					{ x: -10 },
					{ duration: 0.01, x: 10, clearProps: "x", repeat: 60 },
				);
				gsap.fromTo(
					rootEl.value,
					{ y: -10 },
					{ duration: 0.02, y: 10, clearProps: "y", repeat: 30 },
				);
			}
			if (params.blink) {
				showBlinkLayer.value = true;
				await nextTick();
				const layer = blinkLayer.value!;
				gsap.killTweensOf(layer);
				gsap.fromTo(
					layer,
					{ opacity: 0 },
					{
						duration: 0.17,
						opacity: 1,
						clearProps: "opacity",
						repeat: 3,
						onComplete: () => {
							showBlinkLayer.value = false;
						},
					},
				);
			}
			if (params.sound) {
				new Audio(getAsset("sounds/wizz.mp3")).play();
			}
			if (params.vibrate) {
				window.navigator.vibrate([200, 100, 200, 100, 200, 100, 200, 100, 1000]);
			}
		}
	},
);

//Reset emotes cache if changing BTTV/FFZ/7TV states
watch(
	() => storeParams.appearance.bttvEmotes.value,
	() => {
		storeChat.emoteSelectorCache = [];
	},
);
watch(
	() => storeParams.appearance.ffzEmotes.value,
	() => {
		storeChat.emoteSelectorCache = [];
	},
);
watch(
	() => storeParams.appearance.sevenTVEmotes.value,
	() => {
		storeChat.emoteSelectorCache = [];
	},
);

watch(
	() => storeAuth.isPremium,
	(newValue) => {
		if (!newValue) {
			mustDisableItems_precalc.value = (storeMain as any).nonPremiumLimitExceeded;
		}
	},
);

onBeforeMount(() => {
	//Check user reached a new donor level
	showDonorBadge.value = storeAuth.donorLevel > -1 && storeAuth.donorLevelUpgrade === true;

	mustDisableItems_precalc.value = (storeMain as any).nonPremiumLimitExceeded;

	publicApiEventHandler = (e) => onPublicApiEvent(e as any);
	mouseUpHandler = () => (resizing = false);
	mouseMoveHandler = (e: MouseEvent | TouchEvent) => onMouseMove(e);
	windowResizeHandler = (e: Event) => computeChatFormHeight();

	document.addEventListener("mouseup", mouseUpHandler);
	document.addEventListener("touchend", mouseUpHandler);
	document.addEventListener("mousemove", mouseMoveHandler);
	document.addEventListener("touchmove", mouseMoveHandler);
	window.addEventListener("resize", windowResizeHandler);
	PublicAPI.instance.addEventListener("SET_POLL_TOGGLE", publicApiEventHandler);
	PublicAPI.instance.addEventListener("SET_PREDICTION_TOGGLE", publicApiEventHandler);
	PublicAPI.instance.addEventListener("SET_BINGO_TOGGLE", publicApiEventHandler);
	PublicAPI.instance.addEventListener("SET_RAFFLE_TOGGLE", publicApiEventHandler);
	PublicAPI.instance.addEventListener("SET_VIEWERS_COUNT_TOGGLE", publicApiEventHandler);
	PublicAPI.instance.addEventListener("SET_MOD_TOOLS_TOGGLE", publicApiEventHandler);
	PublicAPI.instance.addEventListener(
		"SET_CENSOR_DELETED_MESSAGES_TOGGLE",
		publicApiEventHandler,
	);
	PublicAPI.instance.addEventListener("ON_OPEN_POLL_CREATION_FORM", publicApiEventHandler);
	PublicAPI.instance.addEventListener("SET_OPEN_PREDICTION_CREATION_FORM", publicApiEventHandler);
	PublicAPI.instance.addEventListener("ON_OPEN_RAFFLE_CREATION_FORM", publicApiEventHandler);
	PublicAPI.instance.addEventListener("SET_SHOUTOUT_LAST_RAIDER", publicApiEventHandler);
	PublicAPI.instance.addEventListener("GET_CHAT_COLUMNS_COUNT", publicApiEventHandler);
	PublicAPI.instance.addEventListener("SET_CLEAR_CHAT_HIGHLIGHT", publicApiEventHandler);
	PublicAPI.instance.addEventListener("SET_STOP_POLL", publicApiEventHandler);
	PublicAPI.instance.addEventListener("SET_STOP_PREDICTION", publicApiEventHandler);
	PublicAPI.instance.addEventListener("SET_SEND_MESSAGE", publicApiEventHandler);
	// Attempts to request a screen wake lock.
	navigator.wakeLock.request("screen").catch((error) => {
		// const error = err as {name:string, message:string}
		// console.error(`${error.name}, ${error.message}`);
	});

	for (let i = 0; i < storeParams.chatColumnsConfig.length + 10; i++) {
		Utils.promisedTimeout(500).then(() => {
			buildIndex.value++;
			//Necessary so side panels know where to open
			computeWindowsSizes();
		});
	}
});

onMounted(() => {
	if (showDonorBadge.value) {
		//Show donor badge
		const el = (donor.value as unknown as ComponentPublicInstance).$el as HTMLDivElement;
		gsap.from(el, { bottom: "-350px", duration: 2, ease: "back.out", delay: 1 });
	}
	computeWindowsSizes();

	// window.setTimeout(() => {
	// 	this.$store.params.openModal("shareParams");
	// }, 1000);
});

onBeforeUnmount(() => {
	disposed = true;
	document.removeEventListener("mouseup", mouseUpHandler);
	document.removeEventListener("touchend", mouseUpHandler);
	document.removeEventListener("mousemove", mouseMoveHandler);
	document.removeEventListener("touchmove", mouseMoveHandler);
	window.removeEventListener("resize", windowResizeHandler);
	PublicAPI.instance.removeEventListener("SET_POLL_TOGGLE", publicApiEventHandler);
	PublicAPI.instance.removeEventListener("SET_PREDICTION_TOGGLE", publicApiEventHandler);
	PublicAPI.instance.removeEventListener("SET_BINGO_TOGGLE", publicApiEventHandler);
	PublicAPI.instance.removeEventListener("SET_RAFFLE_TOGGLE", publicApiEventHandler);
	PublicAPI.instance.removeEventListener("SET_VIEWERS_COUNT_TOGGLE", publicApiEventHandler);
	PublicAPI.instance.removeEventListener("SET_MOD_TOOLS_TOGGLE", publicApiEventHandler);
	PublicAPI.instance.removeEventListener(
		"SET_CENSOR_DELETED_MESSAGES_TOGGLE",
		publicApiEventHandler,
	);
	PublicAPI.instance.removeEventListener("ON_OPEN_POLL_CREATION_FORM", publicApiEventHandler);
	PublicAPI.instance.removeEventListener(
		"SET_OPEN_PREDICTION_CREATION_FORM",
		publicApiEventHandler,
	);
	PublicAPI.instance.removeEventListener("ON_OPEN_RAFFLE_CREATION_FORM", publicApiEventHandler);
	PublicAPI.instance.removeEventListener("SET_SHOUTOUT_LAST_RAIDER", publicApiEventHandler);
	PublicAPI.instance.removeEventListener("GET_CHAT_COLUMNS_COUNT", publicApiEventHandler);
	PublicAPI.instance.removeEventListener("SET_CLEAR_CHAT_HIGHLIGHT", publicApiEventHandler);
	PublicAPI.instance.removeEventListener("SET_STOP_POLL", publicApiEventHandler);
	PublicAPI.instance.removeEventListener("SET_STOP_PREDICTION", publicApiEventHandler);
	PublicAPI.instance.removeEventListener("SET_SEND_MESSAGE", publicApiEventHandler);
});

function closeDonorCard(): void {
	if (closingDonorState) return;
	closingDonorState = true;
	//Show donor badge
	const el = (donor.value as unknown as ComponentPublicInstance).$el as HTMLDivElement;
	gsap.to(el, {
		bottom: "-350px",
		duration: 1,
		ease: "back.in",
		onComplete: () => {
			showDonorBadge.value = false;
		},
	});
}

/**
 * Called when requesting an action from the public API
 * //TODO move this to store, this has nothing to do here for the most part
 */
async function onPublicApiEvent(
	e:
		| { type: "SET_POLL_TOGGLE"; data: TwitchatEventMap["SET_POLL_TOGGLE"] }
		| { type: "SET_PREDICTION_TOGGLE"; data: TwitchatEventMap["SET_PREDICTION_TOGGLE"] }
		| { type: "SET_BINGO_TOGGLE"; data: TwitchatEventMap["SET_BINGO_TOGGLE"] }
		| { type: "SET_RAFFLE_TOGGLE"; data: TwitchatEventMap["SET_RAFFLE_TOGGLE"] }
		| {
				type: "SET_VIEWERS_COUNT_TOGGLE";
				data: TwitchatEventMap["SET_VIEWERS_COUNT_TOGGLE"];
		  }
		| { type: "SET_MOD_TOOLS_TOGGLE"; data: TwitchatEventMap["SET_MOD_TOOLS_TOGGLE"] }
		| {
				type: "SET_CENSOR_DELETED_MESSAGES_TOGGLE";
				data: TwitchatEventMap["SET_CENSOR_DELETED_MESSAGES_TOGGLE"];
		  }
		| {
				type: "ON_OPEN_POLL_CREATION_FORM";
				data: TwitchatEventMap["ON_OPEN_POLL_CREATION_FORM"];
		  }
		| {
				type: "SET_OPEN_PREDICTION_CREATION_FORM";
				data: TwitchatEventMap["SET_OPEN_PREDICTION_CREATION_FORM"];
		  }
		| {
				type: "ON_OPEN_RAFFLE_CREATION_FORM";
				data: TwitchatEventMap["ON_OPEN_RAFFLE_CREATION_FORM"];
		  }
		| {
				type: "SET_SHOUTOUT_LAST_RAIDER";
				data: TwitchatEventMap["SET_SHOUTOUT_LAST_RAIDER"];
		  }
		| { type: "GET_CHAT_COLUMNS_COUNT"; data: TwitchatEventMap["GET_CHAT_COLUMNS_COUNT"] }
		| {
				type: "SET_CLEAR_CHAT_HIGHLIGHT";
				data: TwitchatEventMap["SET_CLEAR_CHAT_HIGHLIGHT"];
		  }
		| { type: "SET_STOP_POLL"; data: TwitchatEventMap["SET_STOP_POLL"] }
		| { type: "SET_STOP_PREDICTION"; data: TwitchatEventMap["SET_STOP_PREDICTION"] }
		| { type: "SET_SEND_MESSAGE"; data: TwitchatEventMap["SET_SEND_MESSAGE"] },
): Promise<void> {
	let notif: TwitchatDataTypes.NotificationTypes = "";
	let modal: TwitchatDataTypes.ModalTypes = "";

	switch (e.type) {
		case "SET_POLL_TOGGLE":
			notif = "poll";
			break;
		case "SET_PREDICTION_TOGGLE":
			notif = "prediction";
			break;
		case "SET_BINGO_TOGGLE":
			notif = "bingo";
			break;
		case "SET_RAFFLE_TOGGLE":
			notif = "raffle";
			break;
		case "SET_VIEWERS_COUNT_TOGGLE":
			storeParams.appearance.showViewersCount.value =
				!storeParams.appearance.showViewersCount.value;
			storeParams.updateParams();
			break;

		case "SET_MOD_TOOLS_TOGGLE":
			storeParams.features.showModTools.value = !storeParams.features.showModTools.value;
			storeParams.updateParams();
			break;

		case "GET_CHAT_COLUMNS_COUNT":
			PublicAPI.instance.broadcast("ON_CHAT_COLUMNS_COUNT", {
				count: storeParams.chatColumnsConfig.length,
			});
			break;

		case "SET_CENSOR_DELETED_MESSAGES_TOGGLE":
			storeParams.appearance.censorDeletedMessages.value =
				!storeParams.appearance.censorDeletedMessages.value;
			storeParams.updateParams();
			break;

		case "ON_OPEN_POLL_CREATION_FORM":
			storeParams.openModal("poll");
			await nextTick();
			break;
		case "SET_STOP_POLL": {
			const poll = storePoll.data;
			if (!poll) return;
			try {
				await TwitchUtils.endPoll(poll.id, poll.channel_id);
			} catch (error) {
				storeCommon.alert(t("error.twitch_poll_delete"));
			}
			break;
		}

		case "SET_OPEN_PREDICTION_CREATION_FORM":
			storeParams.openModal("pred");
			await nextTick();
			break;
		case "SET_STOP_PREDICTION": {
			const prediction = storePrediction.data;
			if (!prediction) return;
			try {
				await TwitchUtils.endPrediction(
					prediction.channel_id,
					prediction.id,
					prediction.outcomes[0]!.id,
					true,
				);
			} catch (error) {
				storeCommon.alert(t("error.twitch_prediction_delete"));
			}
			break;
		}

		case "ON_OPEN_RAFFLE_CREATION_FORM": {
			storeParams.openModal("raffle");
			await nextTick();
			break;
		}

		case "SET_CLEAR_CHAT_HIGHLIGHT": {
			storeChat.highlightChatMessageOverlay();
			break;
		}

		case "SET_SEND_MESSAGE": {
			if (e.data.message && e.data.message.trim().length > 0) {
				MessengerProxy.instance.sendMessage(e.data.message);
			}
			break;
		}
	}

	if (notif) {
		setCurrentNotification(notif);
	}

	if (modal) {
		if (storeParams.currentModal == modal) {
			storeParams.openModal("");
		} else {
			storeParams.openModal(modal);
		}
	}
}

async function setCurrentNotification(
	value: TwitchatDataTypes.NotificationTypes,
	toggle: boolean = true,
): Promise<void> {
	if (currentNotificationContent.value == value && toggle) {
		currentNotificationContent.value = "";
	} else {
		currentNotificationContent.value = value;
	}
}

/**
 * Called when selecting an emote from the emote selectors
 */
function onSelectEmote(item: TwitchatDataTypes.Emote | TwitchatDataTypes.Emoji): void {
	//TODO drop "any" once this file is migrated to composition API and we can use proper typing for refs
	(chatForm.value as any).onSelectItem("code" in item ? item.code : item.emoji);
}

/**
 * Called when searching for a message
 */
function searchMessage(str: string): void {
	storeParams.openModal("search");
}

/**
 * Called when starting window resize
 */
function startDrag(event: PointerEvent, col: TwitchatDataTypes.ChatColumnsConfig): void {
	resizing = true;
	draggedCol = col;
	onMouseMove(event);
	renderFrame();
	(event.target as HTMLDivElement).setPointerCapture(event.pointerId);
}

/**
 * Expand the selected col
 * @param col
 */
function expandCol(col: TwitchatDataTypes.ChatColumnsConfig): void {
	const colList = storeParams.chatColumnsConfig;
	let totalSize = 0;
	for (const c of colList) {
		totalSize += c.size;
	}
	//If there's available space on the screen
	//expand the col to fill it
	if (totalSize < 1) {
		col.size += 1 - totalSize;
	}
}

/**
 * Add a chat column
 */
function addColumn(ref: TwitchatDataTypes.ChatColumnsConfig): void {
	let col = storeParams.addChatColumn(ref);
	const colList = storeParams.chatColumnsConfig;
	let totalSize = 0;
	for (const c of colList) {
		totalSize += c.size;
	}

	//If after adding a new column if there's still some remaining space
	//expand the new col to fill that space
	if (totalSize < 1) {
		col.size += 1 - totalSize;
	}

	const holder = scrollable.value!;
	nextTick().then(() => {
		let colHolder = columnRefs[col.id];
		let bounds = colHolder!.getBoundingClientRect();

		let scrollTo = splitViewVertical.value
			? { y: bounds.top + bounds.height - holder.offsetHeight }
			: { x: bounds.left + bounds.width - holder.offsetWidth };
		gsap.to(holder, { duration: 0.75, ease: "sine.inOut", scrollTo });
		computeWindowsSizes();
	});
}

/**
 * Called when user drags the columns left/right (up/down on vertical layout)
 */
function onScrollColumns(): void {}

function getColStyles(col: TwitchatDataTypes.ChatColumnsConfig): { [key: string]: string } {
	let size = col.size * 100;
	const cols = storeParams.chatColumnsConfig;
	if (cols.length == 1) {
		return {
			width: "100%",
			height: "100%",
		};
	}
	const value = `${size}%`;
	if (splitViewVertical.value) {
		return {
			height: value,
			"min-height": "max(200px, " + value + ")",
			"max-height": value,
		};
	} else {
		return {
			width: value,
			"min-width": "max(200px, " + value + ")",
			"max-width": value,
		};
	}
}

/**
 * Called when the mouse moves
 */
async function onMouseMove(e: MouseEvent | TouchEvent | PointerEvent): Promise<void> {
	if ("clientX" in e) {
		mouseX = e.clientX;
		mouseY = e.clientY;
	} else if ("touches" in e) {
		mouseX = e.touches[0]!.clientX;
		mouseY = e.touches[0]!.clientY;
	}
}

/**
 * Manage colmumns resize
 */
async function renderFrame(): Promise<void> {
	if (disposed || !resizing) return;
	requestAnimationFrame(() => renderFrame());

	const cols = storeParams.chatColumnsConfig;
	const holder = scrollable.value!;
	const holderBounds = holder.getBoundingClientRect();
	for (let i = 0; i < cols.length; i++) {
		const c = cols[i];
		if (c == draggedCol) {
			const el = columnRefs[c.id];
			if (!el) continue;
			const bounds = el.getBoundingClientRect();
			if (splitViewVertical.value) {
				c.size = Math.max(215, mouseY - bounds.top + 7) / holderBounds.height;
			} else {
				c.size = Math.max(215, mouseX - bounds.left + 7) / holderBounds.width;
			}
		}
	}
	if (cols.length == 2) {
		//Special case if there are only 2 cols, autoresize the second one
		//and prevent from being able to resize it independently from the
		//first one as it's confusing people.
		//But for more than 2 cols I'd like to keep the resize capabilities
		//on all cols including the last.
		cols[1]!.size = 1 - cols[0]!.size;
	}

	//For some reason few people achieve to make negative width col.
	//It shouldn't be possible and this shouldn't change anything to
	//that but it's here for extra security
	cols.forEach((v) => {
		v.size = Math.max(0, Math.min(10, v.size));
	});

	storeParams.saveChatColumnConfs();
	computeWindowsSizes();
}

/**
 * Computes the form windows styles depending on the existing columns.
 * Search for a column that filters out messages and match the form to
 * its size if any so the messages stay visible.
 * If none found, the windows will just be displayed full screen.
 */
async function computeWindowsSizes(): Promise<void> {
	await nextTick();
	const cols = storeParams.chatColumnsConfig;
	cols.sort((a, b) => a.order - b.order);
	let colId = "";
	let indexPanels = 0;
	let indexGreet = 0;
	for (let i = 0; i < cols.length; i++) {
		const c = cols[i]!;
		if (c.showPanelsHere == true) {
			colId = c.id;
			indexPanels = i;
		}
		if (c.showGreetHere == true) {
			indexGreet = i;
		}
	}

	let selectedCol = columnRefs[colId] ?? null;

	if (!selectedCol) {
		//Fallback to last col if none is selected
		indexPanels = cols.length - 1;
		indexGreet = cols.length - 1;
		selectedCol = columnRefs[cols[indexPanels]!.id] ?? null;
	}
	greetColIndexTarget.value = indexGreet;
	panelsColIndexTarget.value = indexPanels;
	panelsColumnTarget.value = selectedCol
		? (selectedCol.getElementsByClassName("subHolder")[0] as HTMLDivElement)
		: null;
}

function computeChatFormHeight(): void {
	clearTimeout(resizeDebounce);
	resizeDebounce = window.setTimeout(() => {
		if (chatForm.value) {
			//Compute chat form height every 60 frames
			const chatFormEl = (chatForm.value as unknown as ComponentPublicInstance)
				.$el as HTMLDivElement;
			const bounds = chatFormEl.getBoundingClientRect();
			if (bounds.height != prevFormHeight) {
				prevFormHeight = bounds.height;
				(document.querySelector(":root") as HTMLHtmlElement).style.setProperty(
					"--chat-form-height",
					bounds.height + "px",
				);
			}
		}
	}, 200);
}
</script>

<style scoped lang="less">
.chat {
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;

	.donorState {
		.center();
		position: absolute;
		top: auto;
		bottom: 0;
		z-index: 10;
	}

	&.offlineMode {
		border: 3px solid var(--color-secondary);
		border-radius: 0.5em;

		.offlineTitle {
			background-color: var(--color-secondary);
			position: fixed;
			top: 0;
			left: 50%;
			transform: translateX(-50%);
			color: var(--color-light);
			z-index: 1000;
			padding: 0.25em;
			border-bottom-right-radius: var(--border-radius);
			border-bottom-left-radius: var(--border-radius);
			.icon {
				height: 1em;
			}
		}
	}

	&.splitVertical {
		.top {
			height: 100%;
			flex-direction: column;
			.scrollable {
				height: 100%;
				flex-direction: column;
				overflow: hidden;
				overflow-y: auto;
				.column {
					flex-direction: column;

					.subHolder {
						height: calc(100% - 14px); //14px => dragbar height
						overflow: hidden;
						min-width: auto;
						min-height: 0;
					}
					.dragBt {
						padding: 6px 0;
						cursor: ns-resize;
						width: 100%;
						&::before {
							width: 100%;
							height: 1px;
						}
						&:hover {
							&::before {
								transform: scaleY(5);
							}
						}
					}
				}
			}
		}
	}

	.tts {
		position: absolute;
		bottom: 0;
	}

	.top {
		flex-grow: 1;
		margin: auto;
		display: flex;
		flex-direction: row;
		overflow: hidden;
		width: 100%;

		.scrollable {
			display: flex;
			flex-grow: 1;
			flex-direction: row;
			overflow: hidden;
			overflow-x: auto;
			width: 100%;

			.column {
				position: relative;
				display: flex;
				flex-direction: row;

				.subHolder {
					display: flex;
					flex-direction: column;
					width: 100%;
					min-width: 0;
					position: relative;
					.messages {
						flex-grow: 1;
						overflow: hidden;
					}
				}

				.dragBt {
					cursor: ew-resize;
					user-select: none;
					z-index: 2;
					height: 100%;
					flex-basis: 10px;
					flex-shrink: 0;
					padding: 0 6px;
					position: relative;
					&::before {
						display: block;
						position: absolute;
						width: 1px;
						height: 100%;
						content: "";
						background: var(--color-dark-light);
						transition: all 0.25s ease;
					}
					&:hover {
						&::before {
							background: var(--color-dark-extralight);
							transform: scaleX(5);
						}
					}
				}
			}
		}
	}

	.popin {
		position: absolute;
		z-index: 3;
		top: 0;
		left: 0;
		height: 100%;
		width: 100%;
	}

	.contentWindows {
		position: absolute;
		bottom: var(--chat-form-height);
		left: 0;
		z-index: 4;

		&.emotes {
			max-width: 100%;
		}
	}

	.blinkLayer {
		width: var(--vw);
		height: 100vh;
		background-color: fade(#c00, 70%);
		position: absolute;
		top: 0;
		left: 0;
		z-index: 100;
	}
}

@media only screen and (max-width: 450px) {
	.chat:not(.splitVertical) {
		.scrollable {
			// overflow-x: hidden !important;
			scroll-snap-type: x mandatory;
			overflow-x: auto;
			.column {
				scroll-snap-align: center;
				min-width: var(
					--vw
				) !important; //"!important" here to prioritize it before inlined styles
				width: var(
					--vw
				) !important; //"!important" here to prioritize it before inlined styles
				padding: 0 1px;
				.dragBt {
					display: none;
				}
			}
		}

		&:not(.demo) > .contentWindows:not(.credits) {
			left: 0;
			top: 0;
			width: 100%;
		}
	}
}
</style>
