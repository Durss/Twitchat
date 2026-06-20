<template>
	<div
		class="groqhistoryitem card-item"
		:key="entry.id"
		:class="{ isNew: entry.date > Date.now() - 10000 }"
	>
		<div class="wrapper">
			<ToggleBlock v-if="entry.preprompt" :open="false" title="Preprompt" small>
				<div class="preprompt">{{ deanonymizeUsers(entry.preprompt.trim()) }}</div>
			</ToggleBlock>
			<ToggleBlock v-if="entry.prompt" :open="false" title="Prompt" small>
				<div class="prompt">{{ deanonymizeUsers(entry.prompt.trim()) }}</div>
			</ToggleBlock>
			<img
				v-if="entry.answer.length < 2 || reprompting"
				class="loader"
				src="@/assets/icons/loader.svg"
			/>
			<div class="answer" v-else>{{ deanonymizeUsers(entry.answer) }}</div>
			<div class="date">{{ date }}</div>

			<form class="form" @submit.prevent="onSubmit">
				<ContentEditable
					class="input input-field"
					tag="p"
					v-model="newPrompt"
					:no-nl="false"
					:no-html="true"
					:placeholder="t('groq.reprompt_placeholder')"
					@keydown.enter="onEnter"
				/>
				<div class="placeholder" v-if="newPrompt.trim().length === 0">
					{{ t("groq.reprompt_placeholder") }}
				</div>
				<TTButton icon="checkmark"></TTButton>
			</form>
		</div>
		<TTButton icon="trash" alert @click="deleteEntry(entry.id)" />
	</div>
</template>

<script setup lang="ts">
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Utils from "@/utils/Utils";
import ContentEditable from "@/components/ContentEditable.vue";
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { storeGroq as useStoreGroq } from "@/store/groq/storeGroq";
import ToggleBlock from "../ToggleBlock.vue";
import TTButton from "../TTButton.vue";

const props = defineProps<{
	entry: TwitchatDataTypes.GroqHistoryItem;
}>();

const emit = defineEmits<{
	close: [];
}>();

const { t } = useI18n();
const storeGroq = useStoreGroq();

const date = ref<string>("");
const newPrompt = ref<string>("");
const reprompting = ref<boolean>(false);

let refreshTimeout = -1;

onMounted(() => {
	refreshDate();
});

onBeforeUnmount(() => {
	clearTimeout(refreshTimeout);
});

async function deleteEntry(id: string): Promise<void> {
	await storeGroq.removeAnswer(id);
	if (storeGroq.answerHistory.length === 0) emit("close");
}

/**
 * Submit new prompt on Enter but not Shift+Enter
 * @param e
 */
function onEnter(e: KeyboardEvent): void {
	if (e.shiftKey) return;
	e.preventDefault();
	onSubmit();
}

/**
 * Submits form for new prompt
 */
async function onSubmit(): Promise<void> {
	reprompting.value = true;
	await storeGroq.repromptHistoryEntry(props.entry.id, newPrompt.value);
	reprompting.value = false;
	newPrompt.value = "";
}

/**
 * Refreshes the date at a regular interval
 */
function refreshDate() {
	date.value = formatDate(props.entry.date);
	// entry.elapsed = Date.now() - entry.ts;
	clearTimeout(refreshTimeout);
	refreshTimeout = window.setTimeout(() => {
		refreshDate();
	}, 1000);
}

/**
 * Deanonimize username
 * @param text
 */
function deanonymizeUsers(text: string): string {
	for (const login in props.entry.userMap) {
		const anon = props.entry.userMap[login]!;
		const reg = new RegExp(anon.replace(/([.*+?^=!:${}()|[\]/\\])/g, "\\$1"), "gi");
		text = text.replace(reg, login);
	}
	return text;
}

/**
 * Formats a date
 */
function formatDate(ts: number): string {
	const elapsed = Date.now() - ts;
	if (elapsed > 2 * 24 * 60 * 60 * 1000) {
		return Utils.formatDate(new Date(ts));
	}
	if (elapsed < 5000) return t("global.elapsed_duration_now");
	if (elapsed < 10 * 60 * 1000) {
		return t("global.elapsed_duration", { DURATION: Utils.formatDuration(elapsed) });
	} else {
		return Utils.formatDate(new Date(ts), true);
	}
}
</script>

<style scoped lang="less">
.groqhistoryitem {
	line-height: 1.2em;
	flex-shrink: 0;
	gap: 0.5em;
	display: flex;
	flex-direction: row;
	transition:
		background 2s,
		outline 2s;
	outline: 1px solid transparent;
	.wrapper {
		gap: 0.25em;
		display: flex;
		flex-direction: column;
		flex: 1;

		form {
			display: flex;
			flex-direction: row;
			gap: 1px;
			position: relative;
			align-items: stretch;
			.input {
				flex: 1;
				word-break: break-word;
			}
			* {
				border-radius: 0;
				&:first-child {
					border-top-left-radius: var(--border-radius);
					border-bottom-left-radius: var(--border-radius);
				}
				&:last-child {
					border-top-right-radius: var(--border-radius);
					border-bottom-right-radius: var(--border-radius);
				}
			}

			.placeholder {
				font-style: italic;
				opacity: 0.7;
				position: absolute;
				margin-left: 1em;
				pointer-events: none;
				align-self: center;
			}
		}

		.preprompt,
		.prompt {
			font-size: 0.8em;
			white-space: pre-line;
		}

		.loader {
			width: 1.5em;
			margin: 0 auto;
		}

		.answer {
			white-space: pre-line;
		}

		.date {
			font-style: italic;
			opacity: 0.7;
			font-size: 0.8em;
			text-align: right;
			font-variant-numeric: tabular-nums;
		}
	}
	&.isNew {
		outline-color: var(--color-secondary);
		background: var(--color-secondary-fadest);
	}
	.button {
		flex-shrink: 0;
	}
}
</style>
