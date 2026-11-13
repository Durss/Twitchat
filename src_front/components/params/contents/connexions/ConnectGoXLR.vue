<template>
	<div class="paramsgoxlr parameterContent">
		<Icon name="goxlr" class="icon" />

		<div class="head">
			<i18n-t scope="global" tag="span" keypath="goxlr.header">
				<template #LINK>
					<a
						href="https://github.com/GoXLR-on-Linux/goxlr-utility/releases/latest"
						target="_blank"
						><Icon name="newtab" />{{ t("goxlr.header_link") }}</a
					>
				</template>
			</i18n-t>
		</div>

		<template v-if="storeAuth.isPremium">
			<ParamItem
				class="item enableBt"
				:paramData="param_enabled"
				v-model="param_enabled.value"
				@change="toggleState()"
			/>

			<section v-if="connecting" class="card-item">
				<Icon class="item center" name="loader" />
				<div class="item center">{{ t("goxlr.connecting") }}</div>
			</section>

			<div class="fadeHolder" :style="holderStyles">
				<GoXLRConnectForm />
			</div>
		</template>
		<template v-else>
			<TTButton class="premiumBt" icon="premium" @click="openPremium()" premium big>{{
				t("premium.become_premiumBt")
			}}</TTButton>
			<img src="@/assets/img/goxlr_features.png" alt="goxlr" class="interfaceExample" />
		</template>

		<section class="card-item alert error" v-if="connected && noDevice">
			<div class="item">{{ t("goxlr.no_device") }}</div>
		</section>

		<div class="fadeHolder" :style="subholderStyles" v-if="connected">
			<ToggleBlock :icons="['scroll']" :title="t('goxlr.scroll_info')">
				<ParamItem
					class="item"
					:paramData="param_chatColIndexScroll"
					noBackground
					@change="onSelectChatColumnIndex()"
				/>

				<template v-if="param_chatColIndexScroll.value >= 0">
					<div class="item center">{{ t("goxlr.scroll_select_encoder") }}</div>
					<div class="item card-item secondary" v-if="showEncoderWarning">
						{{ t("goxlr.pitch_warning") }}
					</div>
					<GoXLRUI
						class="item"
						childMode
						knobMode
						v-model="knobSelectionScroll"
						@change="onGoXLRSelectionChange()"
					/>
				</template>
			</ToggleBlock>
		</div>

		<div class="fadeHolder" :style="subholderStyles" v-if="connected">
			<ToggleBlock :icons="['read']" :title="t('goxlr.readMark_info')">
				<ParamItem
					class="item"
					:paramData="param_chatColIndexMarkRead"
					noBackground
					@change="onSelectChatColumnIndex()"
				/>

				<template v-if="param_chatColIndexMarkRead.value >= 0">
					<div class="item center">{{ t("goxlr.readMark_select_encoder") }}</div>
					<div class="item card-item secondary" v-if="showEncoderWarning">
						{{ t("goxlr.pitch_warning") }}
					</div>
					<GoXLRUI
						class="item"
						childMode
						knobMode
						v-model="knobSelectionReadMark"
						@change="onGoXLRSelectionChange(true)"
					/>
				</template>
			</ToggleBlock>
		</div>

		<div class="card-item secondary goxlrmini" v-if="connected && isGoXLRMini">
			<Icon name="alert" />{{ t("goxlr.goxlrmini_alert") }}
		</div>

		<section class="card-item info">
			<p v-for="(info, index) in tm('goxlr.infos') as string[]">
				<Icon name="info" v-if="index === 0" />{{ info }}
			</p>
			<TTButton class="triggersBt" @click="openTriggers()">{{
				t("goxlr.triggersBt")
			}}</TTButton>
		</section>

		<div class="youtubeLinks">
			<a href="https://www.youtube.com/watch?v=4EqwWVK7BAA" target="_blank">
				<img
					src="@/assets/img/youtube_goxlr1.jpg"
					alt="youtube example"
					class="youtubeBt"
				/>
			</a>
			<a href="https://www.youtube.com/watch?v=epfuG9K1vtc" target="_blank">
				<img
					src="@/assets/img/youtube_goxlr2.jpg"
					alt="youtube example"
					class="youtubeBt"
				/>
			</a>
		</div>

		<i18n-t scope="global" class="donate" tag="div" keypath="goxlr.donate">
			<template #LINK>
				<a href="https://ko-fi.com/frostycoolslug" target="_blank">{{
					t("goxlr.donate_link")
				}}</a>
			</template>
		</i18n-t>
	</div>
</template>

<script setup lang="ts">
import TTButton from "@/components/TTButton.vue";
import Icon from "@/components/Icon.vue";
import ToggleBlock from "@/components/ToggleBlock.vue";
import GoXLRUI from "@/components/goxlr/GoXLRUI.vue";
import type { GoXLRTypes } from "@/types/GoXLRTypes";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import GoXLRSocket from "@/utils/goxlr/GoXLRSocket";
import type { CSSProperties } from "vue";
import { ref, computed, onBeforeMount } from "vue";
import { useI18n } from "vue-i18n";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import ParamItem from "../../ParamItem.vue";
import GoXLRConnectForm from "../goxlr/GoXLRConnectForm.vue";

const { t, tm } = useI18n();
const storeAuth = useStoreAuth();
const storeParams = useStoreParams();

const connecting = ref<boolean>(false);
const showEncoderWarning = ref<boolean>(false);
const knobSelectionScroll = ref<GoXLRTypes.ButtonTypesData[]>([]);
const knobSelectionReadMark = ref<GoXLRTypes.ButtonTypesData[]>([]);

const param_enabled = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "global.enable",
});
const param_chatColIndexScroll = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "list",
	value: -1,
	labelKey: "goxlr.param_chat_col",
});
const param_chatColIndexMarkRead = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "list",
	value: -1,
	labelKey: "goxlr.param_chat_col",
});

const connected = computed((): boolean => {
	return GoXLRSocket.instance.connected.value === true;
});
const noDevice = computed((): boolean => {
	return GoXLRSocket.instance.status.value == null;
});
const isGoXLRMini = computed((): boolean => {
	return GoXLRSocket.instance.isGoXLRMini.value;
});

const holderStyles = computed((): CSSProperties => {
	return {
		opacity: param_enabled.value.value === true && !connecting.value ? 1 : 0.5,
		pointerEvents: param_enabled.value.value === true && !connecting.value ? "all" : "none",
	};
});

const subholderStyles = computed((): CSSProperties => {
	return {
		opacity: connected.value === true && !connecting.value && !isGoXLRMini.value ? 1 : 0.35,
		pointerEvents: connected.value === true && !connecting.value ? "all" : "none",
	};
});

onBeforeMount(() => {
	param_enabled.value.value = storeParams.goxlrConfig.enabled;
	const cols: TwitchatDataTypes.ParameterDataListValue<number>[] = [
		{ value: -1, labelKey: "global.select_placeholder" },
	];
	for (let i = 0; i < storeParams.chatColumnsConfig.length; i++) {
		cols.push({ value: i, label: (i + 1).toString() });
	}
	param_chatColIndexScroll.value.listValues = cols;
	param_chatColIndexMarkRead.value.listValues = cols;
});

/**
 * Called when clicking triggers button
 */
function openTriggers(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.TRIGGERS);
}

/**
 * Called when toggling the "enabled" state
 */
function toggleState(): void {
	storeParams.setGoXLREnabled(param_enabled.value.value);
}

/**
 * Opens the premium param page
 */
function openPremium(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
}

/**
 * Called when selecting a new chat column index
 */
function onSelectChatColumnIndex(): void {
	const configs = storeParams.goxlrConfig;
	if (param_chatColIndexScroll.value.value > -1) {
		knobSelectionScroll.value =
			configs.chatScrollSources[param_chatColIndexScroll.value.value] || [];
	}
	if (param_chatColIndexMarkRead.value.value > -1 && configs.chatReadMarkSources) {
		knobSelectionReadMark.value =
			configs.chatReadMarkSources[param_chatColIndexMarkRead.value.value] || [];
	}
}

/**
 * Called when selection changes on GoXLR UI
 */
function onGoXLRSelectionChange(readMarkMode: boolean = false): void {
	if (readMarkMode) {
		//Extract last knob ID
		const knobs = knobSelectionReadMark.value.filter(
			(v) => v == "reverb" || v == "echo" || v == "pitch" || v == "gender",
		);
		const knob = knobs.pop();
		//Remove all knob IDs and push the previously extracted one
		const list: GoXLRTypes.ButtonTypesData[] = knobSelectionReadMark.value.filter(
			(v) => v != "reverb" && v != "echo" && v != "pitch" && v != "gender",
		);
		if (knob) list.push(knob);
		knobSelectionReadMark.value = list;
		showEncoderWarning.value = list[list.length - 1] == "pitch";
		const index = param_chatColIndexMarkRead.value.value;
		storeParams.setGoXLRChatColReadMarkParams(index, list);
	} else {
		//Extract last knob ID
		const knobs = knobSelectionScroll.value.filter(
			(v) => v == "reverb" || v == "echo" || v == "pitch" || v == "gender",
		);
		const knob = knobs.pop();
		//Remove all knob IDs and push the previously extracted one
		const list: GoXLRTypes.ButtonTypesData[] = knobSelectionScroll.value.filter(
			(v) => v != "reverb" && v != "echo" && v != "pitch" && v != "gender",
		);
		if (knob) list.push(knob);
		knobSelectionScroll.value = list;
		showEncoderWarning.value = list[list.length - 1] == "pitch";
		const index = param_chatColIndexScroll.value.value;
		storeParams.setGoXLRChatColScrollParams(index, list);
	}
}
</script>

<style scoped lang="less">
.paramsgoxlr {
	.head {
		white-space: pre-line;
	}
	.premium {
		align-self: center;
	}
	.fadeHolder {
		transition: opacity 0.2s;
		width: 100%;
		gap: 1em;
		display: flex;
		flex-direction: column;
	}

	.interfaceExample {
		max-width: 400px;
		margin: auto;
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

	.goxlrmini {
		.icon {
			height: 1em;
			margin-right: 0.5em;
		}
	}

	section,
	.toggleblock {
		.item {
			&:not(:first-child) {
				margin-top: 0.5em;
			}
			&.splitter {
				margin: 0.5em 0 1em 0;
			}
			&.label {
				i {
					font-size: 0.8em;
				}
				.icon {
					width: 1.2em;
					max-height: 1.2em;
					margin-right: 0.5em;
					margin-bottom: 2px;
					display: inline;
					vertical-align: middle;
				}
				p {
					display: inline;
				}
			}
			&.small {
				font-size: 0.8em;
			}
			&.center {
				display: block;
				margin-left: auto;
				margin-right: auto;
				text-align: center;
			}
			&.shrinkInput {
				:deep(.inputHolder) {
					max-width: 150px;
				}
				:deep(input) {
					max-width: 150px;
				}
			}
			&.param {
				margin-top: 0;
				:deep(.icon) {
					width: 2em;
					height: 2em;
				}
				:deep(.content) {
					align-items: center;
				}
			}
			&.users {
				padding-left: 1em;
			}
		}

		&.error {
			text-align: center;
		}

		&.info {
			p:first-of-type {
				display: inline;
			}
			.triggersBt {
				margin: auto;
			}
			.icon {
				height: 1em;
				margin-right: 0.25em;
				vertical-align: middle;
			}
		}
		&.scroll {
			margin: 0;
		}
	}

	.donate {
		text-align: center;
		font-style: italic;
		text-decoration: none;
		line-height: 1.25em;
	}
}
</style>
