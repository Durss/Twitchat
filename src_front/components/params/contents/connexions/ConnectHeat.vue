<template>
	<div class="paramsheat parameterContent">
		<Icon name="heat" alt="heat icon" class="icon" />

		<div class="head">
			<p>{{ t("heat.header") }}</p>
		</div>

		<div class="card-item secondary alternative">
			<Icon name="info" />
			<div class="content">
				<span>{{ t("heat.alertnative") }}</span>
				<TTButton
					class="installBt"
					secondary
					light
					icon="newtab"
					@click="openCompanion()"
					>{{ t("heat.alertnative_bt") }}</TTButton
				>
			</div>
		</div>

		<ExtensionInstaller
			no-error-state
			:extensionID="Config.instance.HEAT_EXTENSION_ID"
			:extensionName="'Heat'"
			v-model:extensionReady="extensionReady"
		/>

		<template v-if="extensionReady">
			<ParamItem
				class="item enableBt"
				:paramData="param_enabled"
				v-model="param_enabled.value"
				@change="toggleState()"
			/>

			<Icon name="loader" v-if="connecting" />
			<ParamItem
				:paramData="param_debugChan"
				v-model="param_debugChan.value"
				v-if="debugMode"
				@change="changeChannel"
			/>

			<div class="fadeHolder" :style="holderStyles">
				<HeatOverlayClick />
				<HeatScreenList
					:open="subContent == 'heatAreas'"
					:class="subContent == 'heatAreas' ? 'selected' : ''"
				/>
				<HeatDebug />
			</div>

			<div class="card-item infos">
				<Icon name="info" />
				<span>{{ t("heat.anonymous_info") }}</span>
				<img
					v-if="$i18n.locale == 'fr'"
					src="@/assets/img/heat_anonymous_fr.gif"
					alt="anonymous heat tutorial"
				/>
				<img
					v-else
					src="@/assets/img/heat_anonymous_en.gif"
					alt="anonymous heat tutorial"
				/>
			</div>
		</template>

		<div class="youtubeLinks">
			<a href="https://www.youtube.com/watch?v=TR_uUFjXrvc" target="_blank">
				<img src="@/assets/img/youtube_heat1.jpg" alt="youtube example" class="youtubeBt" />
			</a>
			<a href="https://www.youtube.com/watch?v=ukhBTmS2pWM" target="_blank">
				<img src="@/assets/img/youtube_heat2.jpg" alt="youtube example" class="youtubeBt" />
			</a>
		</div>

		<a href="https://ko-fi.com/scottmadethis" target="_blank" class="donate">{{
			t("heat.donate")
		}}</a>
	</div>
</template>

<script setup lang="ts">
import TTButton from "@/components/TTButton.vue";
import DataStore from "@/store/DataStore";
import { storeAuth } from "@/store/auth/storeAuth";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import HeatSocket from "@/utils/twitch/HeatSocket";
import { computed, onBeforeMount, onBeforeUnmount, ref, type CSSProperties } from "vue";
import ParamItem from "../../ParamItem.vue";
import HeatDebug from "./../heat/HeatDebug.vue";
import HeatOverlayClick from "./../heat/HeatOverlayClick.vue";
import HeatScreenList from "./../heat/HeatScreenList.vue";
import Icon from "@/components/Icon.vue";
import ExtensionInstaller from "../overlays/ExtensionInstaller.vue";
import { useI18n } from "vue-i18n";
import type IParameterContent from "../IParameterContent";
import Config from "@/utils/Config";

const { t } = useI18n();
const storeAuthInstance = storeAuth();
const storeParams = useStoreParams();

const extensionReady = ref(false);
const param_debugChan = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	label: "Channel ID",
	icon: "debug",
});
const param_enabled = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "global.enable",
});
const debugMode = ref<boolean>(false);
const connecting = ref<boolean>(false);

let debouncer: number = -1;
let keyupHandler!: (e: KeyboardEvent) => void;

const subContent = computed(() => storeParams.currentPageSubContent);

const holderStyles = computed<CSSProperties>(() => {
	return {
		opacity: param_enabled.value.value === true ? 1 : 0.5,
		pointerEvents: param_enabled.value.value === true ? "all" : "none",
	};
});

/**
 * Called when debug channel ID is updated
 */
function changeChannel(): void {
	clearTimeout(debouncer);
	debouncer = window.setTimeout(async () => {
		connecting.value = true;
		await HeatSocket.instance.connect(param_debugChan.value.value);
		connecting.value = false;
	}, 500);
}

/**
 * Called when toggling the "enabled" state
 */
function toggleState(): void {
	if (param_enabled.value.value) {
		HeatSocket.instance.connect(storeAuthInstance.twitch.user.id);
	} else {
		HeatSocket.instance.disconnect();
	}
	DataStore.set(DataStore.HEAT_ENABLED, param_enabled.value.value);
}

/**
 * Show a debug field on CTRL+ALT+D
 * @param e
 */
function onKeyUp(e: KeyboardEvent): void {
	if (e.key.toUpperCase() == "D" && e.ctrlKey && e.altKey) {
		debugMode.value = !debugMode.value;
		e.preventDefault();
	}
}

function openCompanion() {
	storeParams.openParamsPage(
		TwitchatDataTypes.ParameterPages.CONNECTIONS,
		TwitchatDataTypes.ParamDeepSections.TWITCHAT_COMPANION,
	);
}

onBeforeMount(() => {
	if (DataStore.get(DataStore.HEAT_ENABLED) === "true") {
		param_enabled.value.value = true;
	}
	param_debugChan.value.value = storeAuthInstance.twitch.user.id;

	keyupHandler = (e: KeyboardEvent) => onKeyUp(e);
	document.addEventListener("keyup", keyupHandler);
});

onBeforeUnmount(() => {
	document.removeEventListener("keyup", keyupHandler);
});

defineExpose<IParameterContent>({
	onNavigateBack: () => {
		return false;
	},
});
</script>

<style scoped lang="less">
.paramsheat {
	.alternative {
		gap: 0.5em;
		display: flex;
		flex-direction: row;

		& > .icon {
			width: 2em;
			height: auto;
			flex-shrink: 0;
		}
		.content {
			gap: 0.5em;
			display: flex;
			flex-direction: column;
			text-wrap: balance;
			align-items: center;
			text-align: center;
		}
	}

	.youtubeLinks {
		gap: 1em;
		display: flex;
		flex-wrap: wrap;
		flex-direction: row;
		justify-content: center;
		.youtubeBt {
			.emboss();
			width: 200px;
			border-radius: var(--border-radius);
		}
	}

	.fadeHolder {
		gap: 1em;
		display: flex;
		flex-direction: column;
		transition: opacity 0.25s;

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
	}

	.donate {
		text-align: center;
		font-style: italic;
		text-decoration: none;
	}

	.infos {
		background-color: var(--color-secondary-fader);
		.icon {
			height: 1em;
			margin-right: 0.5em;
		}
		img {
			display: block;
			margin: auto;
			margin-top: 1em;
		}
	}
}
</style>
