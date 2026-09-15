<template>
	<div class="voiceglobalcommandshelper">
		<Icon name="voice" alt="voice control enabled" class="icon" />

		<div class="list">
			<template v-for="a in actions" :key="a.action.id">
				<span class="label">{{ a.label }}:</span>
				<span>{{ a.action.sentences }}</span>
			</template>
		</div>
	</div>
</template>

<script setup lang="ts">
import VoiceAction from "@/utils/voice/VoiceAction";
import { storeVoice as useStoreVoice } from "@/store/voice/storeVoice";
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

const props = withDefaults(defineProps<{ confirmMode?: boolean }>(), {
	confirmMode: false,
});

const { t } = useI18n();
const storeVoice = useStoreVoice();

const actions = ref<{ label: string; action: VoiceAction }[]>([]);

onMounted(() => {
	type VAKeys = keyof typeof VoiceAction;
	const keys = Object.keys(VoiceAction);

	//Search for global labels
	for (let i = 0; i < keys.length; i++) {
		const a = keys[i];
		const isGlobal = VoiceAction[(a + "_IS_GLOBAL") as VAKeys] === true;
		if (!isGlobal) continue; //Ignore non global commands

		//Actions are stored by their VoiceAction key, not by the event they're bound to
		const id: string = a as string;
		const event = VoiceAction.keyToEvent(id);
		const action = (storeVoice.voiceActions as VoiceAction[]).find((v) => v.id == id);
		if (action) {
			if (
				props.confirmMode === false ||
				(props.confirmMode && (event == VoiceAction.SUBMIT || event == VoiceAction.CANCEL))
			) {
				actions.value.push({
					action,
					label: t("voice.commands." + id),
				});
			}
		}
	}
});
</script>

<style scoped lang="less">
.voiceglobalcommandshelper {
	display: flex;
	flex-direction: column;
	align-items: center;
	.icon {
		height: 2em;
		margin: 0 0 0.5em 0;
	}
	.list {
		display: grid;
		grid-template-columns: 1fr 1fr;
		font-size: 0.8em;
		column-gap: 0.5em;
		.label {
			text-align: right;
			font-weight: bold;
		}
	}
}
</style>
