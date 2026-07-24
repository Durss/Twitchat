<template>
	<ToggleBlock
		class="voiceglobalcommands"
		:title="t('voice.global_commands_title')"
		icon="api"
		medium
		:open="openLocal"
	>
		<div class="content">
			<div class="head">{{ t("voice.global_commands") }}</div>

			<ParamItem
				class="item"
				v-for="(i, index) in items"
				:key="itemIDs[index]"
				:paramData="i"
				noBackground
				@change="updateCommands()"
			/>
		</div>
	</ToggleBlock>
</template>

<script setup lang="ts">
import type { TwitchatEventMap } from "@/events/TwitchatEvent";
import { storeVoice as useStoreVoice } from "@/store/voice/storeVoice";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import VoiceAction from "@/utils/voice/VoiceAction";
import { onMounted, ref } from "vue";
import ToggleBlock from "../ToggleBlock.vue";
import ParamItem from "../params/ParamItem.vue";
import { useI18n } from "vue-i18n";

defineProps<{ modelValue?: VoiceAction[] }>();

const { t } = useI18n();
const emit = defineEmits<{
	"update:modelValue": [data: VoiceAction[]];
	"update:complete": [allDone: boolean];
}>();

const storeVoice = useStoreVoice();

const items = ref<TwitchatDataTypes.ParameterData<string>[]>([]);
const itemIDs = ref<string[]>([]);
const openLocal = ref(false);

onMounted(() => {
	type VAKeys = keyof typeof VoiceAction;
	const actions = Object.keys(VoiceAction);

	//Search for global labels
	for (let i = 0; i < actions.length; i++) {
		const a = actions[i];
		const isGlobal = VoiceAction[(a + "_IS_GLOBAL") as VAKeys] === true;
		if (!isGlobal) continue;

		const id: string = a as string;
		let text = "";
		const action = (storeVoice.voiceActions as VoiceAction[]).find((v) => v.id == id);
		if (action?.sentences) text = action.sentences;

		items.value.push({
			type: "string",
			value: text,
			labelKey: "voice.commands." + id,
		});
		itemIDs.value.push(id);
	}

	updateCommands(true);
});

function updateCommands(isInit: boolean = false): void {
	const data: VoiceAction[] = [];
	let allDone = true;
	for (let i = 0; i < items.value.length; i++) {
		const item = items.value[i]!;
		data.push({
			id: itemIDs.value[i] as keyof TwitchatEventMap,
			sentences: item.value,
		});

		allDone &&= item.value != "";
	}

	//Do not change open state when editing field otherwise the form
	//would close after writing the first letter of the last field
	if (isInit || !allDone) {
		openLocal.value = !allDone;
	}

	emit("update:modelValue", data);
	emit("update:complete", allDone);
}
</script>

<style scoped lang="less">
.voiceglobalcommands {
	.content {
		gap: 0.25em;
		display: flex;
		flex-direction: column;
		align-items: center;
		.head {
			margin: 0.5em 0;
		}
		:deep(label) {
			min-width: 100px;
			text-align: right;
		}
	}
}
</style>
