<template>
	<div class="pollstate gameStateWindow">
		<div class="head" v-stickyTopShadow>
			<h1 class="title"><Icon name="chatPoll" />{{ poll.title.substring(0, 50) }}</h1>
			<ProgressBar secondary :percent="progressPercent" :duration="poll.duration_s * 1000" />
			<slot />
		</div>

		<div class="body">
			<div class="choices">
				<div
					v-for="(c, index) in poll.choices"
					:key="index"
					:style="getAnswerStyles(c)"
					:class="getAnswerClasses(c)"
				>
					<div class="label">{{ c.label }}</div>
					<div class="percent">{{ getPercent(c) }}% ({{ c.votes }})</div>
				</div>
			</div>

			<div class="actions">
				<TTButton alert @click="endPoll()">{{ $t("poll.state.endBt") }}</TTButton>
			</div>

			<OverlayPresenceChecker
				:overlayName="$t('chatPoll.state.overlay_name')"
				:overlayType="'chatPoll'"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useConfirm } from "@/composables/useConfirm";
import { storeChatPoll as useStoreChatPoll } from "@/store/chat_poll/storeChatPoll";
import ProgressBar from "../ProgressBar.vue";
import TTButton from "../TTButton.vue";
import Icon from "../Icon.vue";
import OverlayPresenceChecker from "./OverlayPresenceChecker.vue";

const { t } = useI18n();
const { confirm } = useConfirm();
const storeChatPoll = useStoreChatPoll();

const progressPercent = ref(0);

let disposed = false;

const poll = computed<TwitchatDataTypes.ChatPollData>(() => storeChatPoll.data!);

function getPercent(c: TwitchatDataTypes.MessagePollDataChoice): number {
	let totalVotes = 0;
	if (poll.value) {
		for (let i = 0; i < poll.value.choices.length; i++) {
			totalVotes += poll.value.choices[i]!.votes;
		}
	}
	return Math.round((c.votes / Math.max(1, totalVotes)) * 100);
}

function getAnswerStyles(c: TwitchatDataTypes.MessagePollDataChoice): { [key: string]: string } {
	let res: { [key: string]: string } = {};
	res.backgroundSize = `${getPercent(c)}% 100%`;
	return res;
}

function getAnswerClasses(c: TwitchatDataTypes.MessagePollDataChoice): string[] {
	let res: string[] = ["choice"];

	let max = 0;
	poll.value.choices.forEach((v) => {
		max = Math.max(max, v.votes);
	});
	if (c.votes == max) res.push("win");
	else res.push("lose");

	return res;
}

function endPoll(): void {
	confirm(
		t("poll.state.closeConfirm.title"),
		t("poll.state.closeConfirm.message"),
	)
		.then(async () => {
			storeChatPoll.setCurrentPoll(null);
		})
		.catch(() => {});
}

function renderFrame(): void {
	if (disposed) return;
	requestAnimationFrame(() => renderFrame());
	const elapsed = Date.now() - poll.value.started_at;
	const duration = poll.value.duration_s * 1000;
	progressPercent.value = elapsed / duration;
}

onMounted(() => {
	renderFrame();
});

onBeforeUnmount(() => {
	disposed = true;
});
</script>

<style scoped lang="less">
.pollstate {
	.creator {
		font-size: 0.8em;
		text-align: center;
		width: calc(100% - 1em - 10px);
		font-style: italic;
	}

	.choices {
		align-self: stretch;
		.choice {
			.emboss();
			display: flex;
			flex-direction: row;
			border-radius: var(--border-radius);
			padding: 0.25em 0.5em;
			font-size: em;
			background-color: var(--color-secondary-fadest);
			transition: background-size 0.2s;
			justify-content: space-between;
			background-repeat: no-repeat;
			.label {
				overflow: hidden;
				text-overflow: ellipsis;
				display: inline-block;
			}

			.percent {
				flex-shrink: 0;
			}

			&:not(:last-child) {
				margin-bottom: 5px;
			}

			&.win {
				@c: var(--color-secondary);
				background-image: linear-gradient(to right, @c 100%, @c 100%);
				// border: 1px solid fade(#00cc00, 20%);
			}

			&.lose {
				@c: var(--color-secondary);
				background-image: linear-gradient(to right, @c 100%, @c 100%);
				// border: 1px solid #cc0000;
			}
		}
	}
}
</style>
