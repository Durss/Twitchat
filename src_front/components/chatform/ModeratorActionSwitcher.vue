<template>
	<div class="moderatoractionswitcher">
		<ButtonNotification
			:icon="modeToIcon[mode]"
			class="button"
			@click.stop="open"
		></ButtonNotification>

		<div class="popin blured-background-window" ref="popin" v-if="expand">
			<template v-if="broadcastermode">
				<div v-if="showDetails == 2" class="card-item infos">
					{{ t("chat.form.mode_private_mods_only_details", { USER: broadcasterName }) }}
				</div>

				<TTButton
					class="addChanBt"
					:icon="modeToIcon.dm_mods"
					@click="setMode('dm_mods')"
					@mouseenter="showDetails = 2"
					@mouseleave="showDetails = -1"
					transparent
					medium
					>{{
						t("chat.form.mode_private_mods_only", { USER: broadcasterName })
					}}</TTButton
				>
			</template>
			<template v-else>
				<div v-if="showDetails == 1" class="card-item infos">
					{{ t("chat.form.mode_private_details", { USER: broadcasterName }) }}
				</div>
				<div v-if="showDetails == 2" class="card-item infos">
					{{ t("chat.form.mode_private_mods_details", { USER: broadcasterName }) }}
				</div>
				<div v-if="showDetails == 3" class="card-item infos">
					{{ t("chat.form.mode_question_details", { USER: broadcasterName }) }}
				</div>
				<div v-if="showDetails == 4" class="card-item infos">
					{{ t("chat.form.mode_public_details", { USER: broadcasterName }) }}
				</div>

				<TTButton
					class="addChanBt"
					:icon="modeToIcon.dm"
					@click="setMode('dm')"
					@mouseenter="showDetails = 1"
					@mouseleave="showDetails = -1"
					transparent
					medium
					>{{ t("chat.form.mode_private", { USER: broadcasterName }) }}</TTButton
				>

				<!-- <TTButton class="addChanBt" :icon="modeToIcon.dm_mods"
				@click="setMode('dm_mods')"
				@mouseenter="showDetails = 2"
				@mouseleave="showDetails=-1"
				transparent medium>{{ t("chat.form.mode_private_mods", {USER:broadcasterName}) }}</TTButton> -->

				<TTButton
					class="addChanBt"
					:icon="modeToIcon.question"
					@click="setMode('question')"
					@mouseenter="showDetails = 3"
					@mouseleave="showDetails = -1"
					transparent
					medium
					>{{ t("chat.form.mode_question", { USER: broadcasterName }) }}</TTButton
				>
			</template>

			<TTButton
				class="addChanBt"
				:icon="modeToIcon.message"
				@click="setMode('message')"
				@mouseenter="showDetails = 4"
				@mouseleave="showDetails = -1"
				transparent
				medium
				>{{ t("chat.form.mode_public", { USER: broadcasterName }) }}</TTButton
			>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { IChatState } from "@/store/StoreProxy";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeChat as useStoreChat } from "@/store/chat/storeChat";
import { storeStream as useStoreStream } from "@/store/stream/storeStream";
import { gsap } from "gsap/gsap-core";
import { computed, nextTick, onBeforeMount, onBeforeUnmount, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import ButtonNotification from "../ButtonNotification.vue";
import TTButton from "../TTButton.vue";

defineProps<{
	mode: IChatState["messageMode"];
}>();

const emit = defineEmits<{
	"update:mode": [mode: IChatState["messageMode"]];
}>();

const { t } = useI18n();
const storeAuth = useStoreAuth();
const storeChat = useStoreChat();
const storeStream = useStoreStream();
const popin = useTemplateRef<HTMLDivElement>("popin");

const expand = ref<boolean>(false);
const showDetails = ref<number>(-1);
const modeToIcon: { [key in IChatState["messageMode"]]: string } = {
	dm: "broadcaster",
	dm_mods: "mod",
	question: "question",
	message: "whispers",
};

let clickHandler!: (e: MouseEvent) => void;

const broadcastermode = computed<boolean>(() => {
	return storeStream.currentChatChannel.id == storeAuth.twitch.user.id;
});
const broadcasterName = computed<string>(() => {
	return storeStream.currentChatChannel.name;
});

onBeforeMount(() => {
	clickHandler = (e: MouseEvent) => onClickDOM(e);
	document.addEventListener("click", clickHandler, true);
});

onBeforeUnmount(() => {
	storeChat.messageMode = "message";
	document.removeEventListener("click", clickHandler, true);
});

/**
 * Opens the window
 */
async function open(event: MouseEvent): Promise<void> {
	event.stopPropagation();
	event.preventDefault();
	if (expand.value) {
		onClickDOM(event);
		return;
	}
	expand.value = true;
	await nextTick();
	const holder = popin.value!;
	gsap.killTweensOf(holder);
	gsap.fromTo(
		holder,
		{ scaleY: 0 },
		{ duration: 0.25, scaleY: 1, ease: "back.out", delay: 0.05 },
	);
}

/**
 * Closes the window
 */
function close(): void {
	const holder = popin.value;
	if (!holder) return;
	gsap.killTweensOf(holder);
	gsap.to(holder, {
		duration: 0.1,
		scaleY: 0,
		clearProps: "scaleY",
		ease: "back.in",
		onComplete: () => {
			expand.value = false;
		},
	});
	showDetails.value = -1;
}

/**
 * Called when changing mode
 */
function setMode(mode: IChatState["messageMode"]): void {
	emit("update:mode", mode);
	close();
}

/**
 * Detects click outside of the window to close it
 */
function onClickDOM(e: MouseEvent): void {
	if (!expand.value) return;
	const holder = popin.value;
	if (!holder) return;

	let target = e.target as HTMLElement;
	while (target != document.body && target != holder && target != null) {
		target = target.parentElement as HTMLElement;
	}
	if (target === document.body) {
		close();
	}
}
</script>

<style scoped lang="less">
.moderatoractionswitcher {
	.newFlag {
		&::before {
			top: 0;
			left: 0;
		}
	}

	& > .button {
		min-width: 1.5em;
		min-height: 1.5em;
		font-weight: bold;
		:deep(.icon) {
			width: auto;
			font-size: 0.8em;
		}
	}

	.popin {
		position: absolute;
		bottom: 100%;
		gap: 0.25em;
		display: flex;
		flex-direction: column;
		max-width: 500px;

		.infos {
			font-style: italic;
			font-size: 0.85em;
			color: var(--color-secondary);
			white-space: pre-line;
			font-weight: normal;
			text-align: center;
			line-height: 1.2em;
		}
	}
}
</style>
