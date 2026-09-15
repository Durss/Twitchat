<template>
	<div class="chatpollresult chatMessage highlight pollResult" ref="rootEl">
		<Icon name="chatPoll" alt="icon" class="icon" />
		<div class="content">
			<div class="title">{{ props.messageData.poll.title }}</div>

			<div class="choices">
				<div
					v-for="o in props.messageData.poll.choices"
					:key="o.id"
					class="choice"
					:class="getChoiceClasses(o)"
				>
					<div class="infos">
						<Icon class="check" name="checkmark" />
						<span class="label">{{ o.label }}</span>
						<div class="details">
							<div class="percent">{{ getChoicePercent(o) }}%</div>
							<div class="users">
								<Icon class="icon" name="user" />
								{{ o.votes }}
							</div>
						</div>
					</div>
					<div class="bar" :style="getChoiceStyles(o)"></div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
/**
 * Yeah stupid naming... but "ChatPollResult" is used for twitch polls because
 * all chat message items start with "Chat".
 */
import { useChatMessage } from "@/composables/useChatMessage";
import { storeCommon as useStoreCommon } from "@/store/common/storeCommon";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { computed, onBeforeMount, ref, useTemplateRef } from "vue";

const props = defineProps<{
	messageData: TwitchatDataTypes.MessageChatPollData;
	lightMode?: boolean;
	contextMenuOff?: boolean;
}>();

const emit = defineEmits<{
	onRead: [message: TwitchatDataTypes.ChatMessageTypes, e: MouseEvent];
}>();

const rootEl = useTemplateRef<HTMLElement>("rootEl");
useChatMessage(props, emit, rootEl);
const storeCommon = useStoreCommon();

const maxVotesValue = ref(0);

const iconColor = computed<string>(() => (storeCommon.theme == "dark" ? "#9147ff" : "#772ce8"));

function getChoiceClasses(o: TwitchatDataTypes.MessagePollDataChoice): string[] {
	const res = ["outcome"];
	if (o.votes == maxVotesValue.value) res.push("winner");
	return res;
}

function getChoicePercent(o: TwitchatDataTypes.MessagePollDataChoice): number {
	let totalVotes = 0;
	if (props.messageData.poll.choices) {
		for (let i = 0; i < props.messageData.poll.choices.length; i++) {
			totalVotes += props.messageData.poll.choices[i]!.votes;
		}
	}
	return Math.round((o.votes / Math.max(1, totalVotes)) * 100);
}

function getChoiceStyles(o: TwitchatDataTypes.MessagePollDataChoice): { [key: string]: string } {
	return {
		backgroundSize: `${getChoicePercent(o)}% 100%`,
	};
}

onBeforeMount(() => {
	let max = 0;
	for (const e of props.messageData.poll.choices) {
		if (e.votes >= max) max = e.votes;
	}
	maxVotesValue.value = max;
});
</script>

<style scoped lang="less">
.chatpollresult {
	& > .icon {
		color: v-bind(iconColor);
	}
}
</style>
