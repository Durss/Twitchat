<template>
	<div class="overlayparamshighlight overlayParamsSection">
		<a
			href="https://www.youtube.com/watch?v=Yv3ACHtNj3Q"
			target="_blank"
			class="youtubeTutorialBt"
		>
			<Icon name="youtube" theme="light" />
			<span>{{ t("overlay.youtube_demo_tt") }}</span>
			<Icon name="newtab" theme="light" />
		</a>

		<div class="header">{{ t("overlay.highlight.instruction") }}</div>

		<section class="overlayInstallCard">
			<h1><Icon name="obs" />{{ t("bingo_grid.form.install_title") }}</h1>
			<OverlayInstaller type="chathighlight" @obsSourceCreated="getOverlayPresence(true)" />

			<ToggleBlock class="shrink" small :title="t('overlay.css_customization')" :open="false">
				<div class="cssHead">{{ t("overlay.highlight.css") }}</div>
				<ul class="cssStructure">
					<li>#highlight_holder { ... }</li>
					<li class="sublist">
						<ul>
							<li>#highlight_avatar { ... }</li>
							<li>#highlight_infos { ... }</li>
							<li class="sublist">
								<ul>
									<li>#highlight_login { ... }</li>
									<li>#highlight_message { ... }</li>
								</ul>
							</li>
						</ul>
					</li>
				</ul>
				<ToggleBlock
					class="cssPositionning"
					small
					title="Holder's positionning"
					:open="false"
				>
					<ul class="cssStructure">
						<li>#highlight_holder.position-tl { ... }</li>
						<li>#highlight_holder.position-t { ... }</li>
						<li>#highlight_holder.position-tr { ... }</li>
						<li>#highlight_holder.position-l { ... }</li>
						<li>#highlight_holder.position-m { ... }</li>
						<li>#highlight_holder.position-r { ... }</li>
						<li>#highlight_holder.position-bl { ... }</li>
						<li>#highlight_holder.position-b { ... }</li>
						<li>#highlight_holder.position-br { ... }</li>
					</ul>
				</ToggleBlock>
				<ul class="cssStructure">
					<li>#clip_holder { ... }</li>
					<li class="sublist">
						<ul>
							<li>#clip_player { ... }</li>
							<li>#clip_progressbar { ... }</li>
						</ul>
					</li>
				</ul>
				<ToggleBlock
					class="cssPositionning"
					small
					title="Holder's positionning"
					:open="false"
				>
					<ul class="cssStructure">
						<li>#clip_holder.position-tl { ... }</li>
						<li>#clip_holder.position-t { ... }</li>
						<li>#clip_holder.position-tr { ... }</li>
						<li>#clip_holder.position-l { ... }</li>
						<li>#clip_holder.position-m { ... }</li>
						<li>#clip_holder.position-r { ... }</li>
						<li>#clip_holder.position-bl { ... }</li>
						<li>#clip_holder.position-b { ... }</li>
						<li>#clip_holder.position-br { ... }</li>
					</ul>
				</ToggleBlock>
			</ToggleBlock>
		</section>

		<section class="card-item">
			<div class="placement">
				<p>{{ t("overlay.highlight.message_pos") }}</p>
				<PlacementSelector v-model="placement" />
			</div>

			<div class="center" v-if="overlayExists">
				<TTButton @click="testOverlay()" icon="test">{{
					t("overlay.highlight.testBt")
				}}</TTButton>
			</div>

			<Icon
				class="center loader card-item"
				name="loader"
				v-else-if="checkingOverlayPresence"
			/>

			<div class="center card-item alert" v-else-if="!overlayExists">
				{{ t("overlay.overlay_not_configured") }}
			</div>
		</section>

		<!-- <div class="card-item footer">
			<i18n-t scope="global" tag="div" keypath="overlay.highlight.alternative_tool">
				<template #URL>
					<a href="https://featured.chat" target="_blank">featured.chat</a>
				</template>
			</i18n-t>
		</div> -->
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import PlacementSelector from "@/components/PlacementSelector.vue";
import ToggleBlock from "@/components/ToggleBlock.vue";
import TTButton from "@/components/TTButton.vue";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeChat as useStoreChat } from "@/store/chat/storeChat";
import { storeUsers as useStoreUsers } from "@/store/users/storeUsers";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import PublicAPI from "@/utils/PublicAPI";
import Utils from "@/utils/Utils";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { LoremIpsum } from "lorem-ipsum";
import { onBeforeMount, onBeforeUnmount, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import OverlayInstaller from "./OverlayInstaller.vue";

const { t } = useI18n();
const storeAuth = useStoreAuth();
const storeChat = useStoreChat();
const storeUsers = useStoreUsers();

const overlayExists = ref(false);
const checkingOverlayPresence = ref(false);
const placement = ref<TwitchatDataTypes.ScreenPosition>("bl");

let checkInterval: number = -1;
let subcheckTimeout: number = -1;
let overlayPresenceHandler!: () => void;

watch(placement, () => {
	const data: TwitchatDataTypes.ChatHighlightParams = {
		position: placement.value,
	};
	storeChat.setChatHighlightOverlayParams(data);
});

onBeforeMount(() => {
	placement.value = storeChat.chatHighlightOverlayParams.position;

	overlayPresenceHandler = () => {
		overlayExists.value = true;
		clearTimeout(subcheckTimeout);
	};
	PublicAPI.instance.addEventListener(
		"SET_CHAT_HIGHLIGHT_OVERLAY_PRESENCE",
		overlayPresenceHandler,
	);

	//Regularly check if the overlay exists
	getOverlayPresence(true);
	checkInterval = window.setInterval(() => getOverlayPresence(), 2000);
});

onBeforeUnmount(() => {
	clearInterval(checkInterval);
	clearTimeout(subcheckTimeout);
	PublicAPI.instance.removeEventListener(
		"SET_CHAT_HIGHLIGHT_OVERLAY_PRESENCE",
		overlayPresenceHandler,
	);
});

/**
 * Checks if overlay exists
 */
function getOverlayPresence(showLoader: boolean = false): void {
	if (showLoader) checkingOverlayPresence.value = true;
	PublicAPI.instance.broadcast("GET_CHAT_HIGHLIGHT_OVERLAY_PRESENCE");
	clearTimeout(subcheckTimeout);
	//If after 1,5s the overlay didn't answer, assume it doesn't exist
	subcheckTimeout = window.setTimeout(() => {
		overlayExists.value = false;
		checkingOverlayPresence.value = false;
	}, 1500);
}

async function testOverlay(): Promise<void> {
	const lorem = new LoremIpsum({
		sentencesPerParagraph: { max: 3, min: 1 },
		wordsPerSentence: { max: 16, min: 4 },
	});

	const uid = storeAuth.twitch.user.id;
	const text = lorem.generateParagraphs(1) + " TakeNRG";
	const chunks = TwitchUtils.parseMessageToChunks(text, undefined, true);
	const message: TwitchatDataTypes.MessageChatData = {
		id: Utils.getUUID(),
		platform: "twitch",
		date: Date.now(),
		type: TwitchatDataTypes.TwitchatMessageType.MESSAGE,
		user: storeUsers.getUserFrom("twitch", uid, uid),
		answers: [],
		channel_id: uid,
		message: text,
		message_chunks: chunks,
		message_html: TwitchUtils.messageChunksToHTML(chunks),
		message_size: TwitchUtils.computeMessageSize(chunks),
		is_short: false,
	};
	storeChat.highlightChatMessageOverlay(message);
}
</script>

<style scoped lang="less">
.overlayparamshighlight {
	.placement {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.cssPositionning {
		margin-left: 1em;
		width: fit-content;
	}
}
</style>
