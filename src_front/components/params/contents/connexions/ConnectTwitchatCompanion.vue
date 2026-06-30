<template>
	<div class="connecttwitchatcompanion parameterContent">
		<Icon name="twitchat_companion" alt="twitchat extension icon" class="icon" />

		<div class="head">
			<p>{{ $t("twitchat_companion.header") }}</p>
		</div>

		<ExtensionInstaller no-error-state />

		<template v-if="storeExtension.companionEnabled">
			<TTButton class="center" primary icon="quiz" @click="openQuiz()">{{
				t("twitchat_companion.start_quiz")
			}}</TTButton>
			<TTButton class="center" primary icon="bingo_grid" @click="openBingo()">{{
				t("twitchat_companion.start_bingo")
			}}</TTButton>

			<ParamItem
				class="enableBt"
				:class="{ expand: param_captureClicks.value }"
				:paramData="param_captureClicks"
				:loading="storeExtension.ebsConfigUpdating"
				v-model="storeExtension.ebsConfigs.captureClicks"
				@change="onChangeEBSSetting('clicks')"
			>
				<div
					class="content"
					v-if="
						storeExtension.ebsConfigs.captureClicks &&
						(!storeExtension.ebsConfigUpdating || lastChangedState != 'clicks')
					"
				>
					<HeatOverlayClick light />

					<HeatScreenList
						light
						:open="subContent == 'heatAreas'"
						:class="subContent == 'heatAreas' ? 'selected' : ''"
					/>

					<HeatDebug /></div
			></ParamItem>

			<ParamItem
				class="enableBt"
				:paramData="param_captureKeys"
				:loading="storeExtension.ebsConfigUpdating"
				v-model="storeExtension.ebsConfigs.captureKeys"
				@change="onChangeEBSSetting('keys')"
			>
				<img
					class="demo"
					src="@/assets/img/companion/keycapture.gif"
					alt="key capture demo"
					width="400"
				/>
			</ParamItem>
		</template>
	</div>
</template>

<script setup lang="ts">
import TTButton from "@/components/TTButton.vue";
import { storeExtension as useStoreExtension } from "@/store/extension/storeExtension";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import ParamItem from "../../ParamItem.vue";
import HeatDebug from "../heat/HeatDebug.vue";
import HeatOverlayClick from "../heat/HeatOverlayClick.vue";
import HeatScreenList from "../heat/HeatScreenList.vue";
import ExtensionInstaller from "../overlays/ExtensionInstaller.vue";

const { t } = useI18n();
const storeExtension = useStoreExtension();
const storeParams = useStoreParams();

const lastChangedState = ref<"clicks" | "keys" | null>(null);
const param_captureClicks = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "click",
	labelKey: "twitchat_companion.enable_click",
});
const param_captureKeys = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "font",
	labelKey: "twitchat_companion.enable_keys",
});

const subContent = computed(() => {
	return storeParams.currentPageSubContent;
});

function openQuiz() {
	storeParams.openParamsPage(
		TwitchatDataTypes.ParameterPages.OVERLAYS,
		TwitchatDataTypes.ParamDeepSections.QUIZ,
	);
}

function openBingo() {
	storeParams.openParamsPage(
		TwitchatDataTypes.ParameterPages.OVERLAYS,
		TwitchatDataTypes.ParamDeepSections.BINGO_GRID,
	);
}

async function onChangeEBSSetting(section: typeof lastChangedState.value) {
	storeExtension.updateEBSConfigs();
}
</script>

<style scoped lang="less">
.connecttwitchatcompanion {
	.center {
		align-self: center;
	}

	.content {
		margin-top: 0.5em;
		gap: 0.5em;
		display: flex;
		flex-direction: column;
	}

	.selected {
		border: 5px solid transparent;
		border-radius: 1em;
		animation: blink 0.5s 3 forwards;
		animation-delay: 1s;
		@keyframes blink {
			0% {
				border-color: var(--color-secondary);
			}
			50% {
				border-color: transparent;
			}
			100% {
				border-color: var(--color-secondary);
			}
		}
	}
	.expand {
		width: 100%;
	}

	.demo {
		display: block;
		margin: auto;
		margin-top: 0.5em;
	}
}
</style>
