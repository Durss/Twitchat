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
	// const actions = storeVoice.voiceActions;
	type VAKeys = keyof typeof VoiceAction;
	const keys = Object.keys(VoiceAction);

	//Search for global labels
	for (let i = 0; i < keys.length; i++) {
		const a = keys[i];
		const isGlobal =
			Object.prototype.hasOwnProperty.call(VoiceAction, a + "_IS_GLOBAL") === true;
		if (!isGlobal) continue; //Ignore non global commands

		const id: string = VoiceAction[a as VAKeys] as string;
		const action = (storeVoice.voiceActions as VoiceAction[]).find((v) => v.id == id);
		if (action) {
			if (
				props.confirmMode === false ||
				(props.confirmMode && (id == VoiceAction.SUBMIT || id == VoiceAction.CANCEL))
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
