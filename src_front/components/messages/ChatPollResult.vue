<template>
	<div class="chatpollresult chatMessage highlight pollResult" ref="rootEl">
		<Icon name="poll" alt="icon" class="icon" />
		<div class="content">
			<div class="title">{{ props.messageData.title }}</div>

			<i18n-t
				class="creator"
				scope="global"
				tag="div"
				keypath="poll.form.created_by"
				v-if="props.messageData.creator && props.messageData.creator.id != me.id"
			>
				<template #USER>
					<a
						class="userlink"
						@click.stop="
							openUserCard(props.messageData.creator!, props.messageData.channel_id)
						"
						>{{ props.messageData.creator!.displayName }}</a
					>
				</template>
			</i18n-t>

			<div class="choices">
				<div
					v-for="o in props.messageData.choices"
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
import { useChatMessage } from "@/composables/useChatMessage";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeCommon as useStoreCommon } from "@/store/common/storeCommon";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { computed, onBeforeMount, ref, useTemplateRef } from "vue";

const props = defineProps<{
	messageData: TwitchatDataTypes.MessagePollData;
	lightMode?: boolean;
	contextMenuOff?: boolean;
}>();

const emit = defineEmits<{
	onRead: [message: TwitchatDataTypes.ChatMessageTypes, e: MouseEvent];
}>();

const rootEl = useTemplateRef<HTMLElement>("rootEl");
const { openUserCard } = useChatMessage(props, emit, rootEl);
const storeAuth = useStoreAuth();
const storeCommon = useStoreCommon();

const maxVotesValue = ref(0);

const me = computed<TwitchatDataTypes.TwitchatUser>(() => storeAuth.twitch.user);

const iconColor = computed<string>(() => (storeCommon.theme == "dark" ? "#9147ff" : "#772ce8"));

function getChoiceClasses(o: TwitchatDataTypes.MessagePollDataChoice): string[] {
	const res = ["outcome"];
	if (o.votes == maxVotesValue.value) res.push("winner");
	return res;
}

function getChoicePercent(o: TwitchatDataTypes.MessagePollDataChoice): number {
	let totalVotes = 0;
	if (props.messageData.choices) {
		for (let i = 0; i < props.messageData.choices.length; i++) {
			totalVotes += props.messageData.choices[i]!.votes;
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
	for (const e of props.messageData.choices) {
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
