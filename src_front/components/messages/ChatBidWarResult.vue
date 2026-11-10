<template>
	<div class="chatbidwarresult chatMessage highlight pollResult" ref="rootEl">
		<Icon name="bidwar" alt="icon" class="icon" />
		<div class="content">
			<div class="title">{{ props.messageData.title }}</div>

			<div class="choices">
				<div
					v-for="(side, index) in props.messageData.sides"
					:key="index"
					class="choice"
					:class="{ winner: side.amount === maxAmount }"
				>
					<div class="infos">
						<Icon class="check" name="checkmark" />
						<span class="label">{{ side.keyword }}</span>
						<div class="details">
							<div class="percent">{{ getPercent(side) }}%</div>
							<div class="points">{{ side.amountFormatted }}</div>
						</div>
					</div>
					<div class="bar" :style="{ backgroundSize: getPercent(side) + '% 100%' }"></div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useChatMessage } from "@/composables/useChatMessage";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { computed, useTemplateRef } from "vue";

const props = defineProps<{
	messageData: TwitchatDataTypes.MessageBidWarResultData;
	lightMode?: boolean;
	contextMenuOff?: boolean;
}>();

const emit = defineEmits<{
	onRead: [message: TwitchatDataTypes.ChatMessageTypes, e: MouseEvent];
}>();

const rootEl = useTemplateRef("rootEl");
useChatMessage(props, emit, rootEl);

const totalAmount = computed(() =>
	props.messageData.sides.reduce((total, side) => total + side.amount, 0),
);

const maxAmount = computed(() => Math.max(...props.messageData.sides.map((v) => v.amount)));

function getPercent(side: TwitchatDataTypes.MessageBidWarResultData["sides"][number]): number {
	if (totalAmount.value <= 0) return 0;
	return Math.round((side.amount / totalAmount.value) * 100);
}
</script>
