<template>
	<ToggleBlock
		class="heatoverlayclick"
		:title="t('heat.overlay_interaction')"
		:open="false"
		:icons="['overlay']"
	>
		<div class="content">
			<PostOnChatParam
				class="card-item"
				v-for="(code, index) in overlayTypes"
				:key="code"
				:icon="code"
				:botMessageKey="botMessageKeys[index]"
				noBackground
				:titleKey="'heat.overlay_' + code + '.description'"
				:placeholders="placeholders[code]"
			>
				<ParamItem :paramData="param_cooldown[code]!" @change="onUpdateValue" />
				<ParamItem
					:paramData="param_allowAnon[code]!"
					v-model="param_allowAnon[code]!.value"
					@change="onUpdateValue"
					class="marginTop"
				/>
			</PostOnChatParam>
		</div>
	</ToggleBlock>
</template>

<script setup lang="ts">
import ToggleBlock from "@/components/ToggleBlock.vue";
import { storeChat as useStoreChat } from "@/store/chat/storeChat";
import DataStore from "@/store/DataStore";
import { TriggerEventPlaceholders, TriggerTypes } from "@/types/TriggerActionDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import ParamItem from "../../ParamItem.vue";
import PostOnChatParam from "../../PostOnChatParam.vue";

const { t } = useI18n();
const storeChat = useStoreChat();
const overlayTypes = ref<OverlayKey[]>(["spotify", "ulule"]);
const botMessageKeys = ref<TwitchatDataTypes.BotMessageField[]>(["heatSpotify", "heatUlule"]);
const placeholders = ref<Partial<{ [key in OverlayKey]: TwitchatDataTypes.PlaceholderEntry[] }>>(
	{},
);
const param_cooldown = ref<
	Partial<{
		[key in OverlayKey]: TwitchatDataTypes.ParameterData<number>;
	}>
>({});
const param_allowAnon = ref<
	Partial<{
		[key in OverlayKey]: TwitchatDataTypes.ParameterData<boolean>;
	}>
>({});

onMounted(() => {
	placeholders.value["spotify"] = TriggerEventPlaceholders(TriggerTypes.MUSIC_START);

	placeholders.value["ulule"] = [
		{
			tag: "ULULE_CAMPAIGN_NAME",
			descKey: "triggers.placeholders.ulule_campaign_name",
			example: t("triggers.placeholders.ulule_campaign_name_example"),
		},
		{
			tag: "ULULE_CAMPAIGN_URL",
			descKey: "triggers.placeholders.ulule_campaign_url",
			example: "https://www.ulule.com",
		},
	];

	for (let i = 0; i < overlayTypes.value.length; i++) {
		const code = overlayTypes.value[i]!;
		const botMessageKey = botMessageKeys.value[i]!;
		param_cooldown.value[code] = {
			type: "number",
			value: storeChat.botMessages[botMessageKey].cooldown || 10,
			min: 0,
			max: 3600,
			labelKey: "heat.param_cooldown",
			icon: "timer",
		};
		param_allowAnon.value[code] = {
			type: "boolean",
			value: storeChat.botMessages[botMessageKey].allowAnon === true,
			labelKey: "heat.param_anon",
			icon: "anon",
			tooltipKey: "heat.anonymous",
		};
	}
});

function onUpdateValue(): void {
	storeChat.botMessages.heatUlule.cooldown = param_cooldown.value.ulule?.value;
	storeChat.botMessages.heatUlule.allowAnon = param_allowAnon.value.ulule?.value;
	storeChat.botMessages.heatSpotify.cooldown = param_cooldown.value.spotify?.value;
	storeChat.botMessages.heatSpotify.allowAnon = param_allowAnon.value.spotify?.value;
	DataStore.set(DataStore.BOT_MESSAGES, storeChat.botMessages);
}

type OverlayKey = "spotify" | "ulule";
</script>

<style scoped lang="less">
.heatoverlayclick {
	width: 100%;

	.content {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
	}

	.marginTop {
		margin-top: 0.25em;
	}
}
</style>
