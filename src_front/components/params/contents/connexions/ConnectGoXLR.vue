<template>
	<ConnectionForm
		class="paramsgoxlr"
		icon="goxlr"
		:connected="connected"
		:connecting="connecting"
		:error="error"
		:showSuccess="showSuccess"
		errorMessage="goxlr.connect_failed"
		:enabled="storeParams.goxlrConfig.enabled"
		:locked="!storeAuth.isPremium"
		@connect="doConnect"
		@disconnect="doDisconnect"
		@update:enabled="onToggleEnabled"
		@update:error="error = $event"
	>
		<template #header>
			<i18n-t scope="global" tag="span" keypath="goxlr.header">
				<template #LINK>
					<a :href="DOWNLOAD_URL" target="_blank"
						><Icon name="newtab" />{{ t("goxlr.header_link") }}</a
					>
				</template>
			</i18n-t>
		</template>

		<template #locked>
			<TTButton class="premiumBt" icon="premium" @click="openPremium()" premium big>{{
				t("premium.become_premiumBt")
			}}</TTButton>
			<img src="@/assets/img/goxlr_features.png" alt="goxlr" class="interfaceExample" />
		</template>

		<template #fields>
			<ParamItem
				:paramData="param_ip"
				v-model="param_ip.value"
				@change="onIpChange()"
				noBackground
			/>

			<i18n-t
				scope="global"
				class="card-item secondary security"
				tag="div"
				v-if="securityWarning"
				keypath="goxlr.connect_form.ip_security"
			>
				<template #LINK>
					<a :href="Config.instance.DISCORD_URL" target="_blank">{{
						t("goxlr.connect_form.ip_security_link")
					}}</a>
				</template>
			</i18n-t>

			<ParamItem :paramData="param_port" v-model="param_port.value" noBackground />
		</template>

		<template #error>
			<div class="connectError">
				<div>{{ t("goxlr.connect_failed") }}</div>
				<div>{{ t("goxlr.connect_failed_hint") }}</div>
				<TTButton
					type="link"
					:href="DOWNLOAD_URL"
					target="_blank"
					icon="newtab"
					alert
					light
					>{{ t("goxlr.download_bt") }}</TTButton
				>
			</div>
		</template>

		<template #connected>
			<div class="card-item alert error noDevice" v-if="noDevice">
				{{ t("goxlr.no_device") }}
			</div>

			<div class="card-item secondary goxlrmini" v-if="isGoXLRMini">
				<Icon name="alert" />{{ t("goxlr.goxlrmini_alert") }}
			</div>

			<ToggleBlock
				class="encoderBlock"
				:class="{ disabled: isGoXLRMini }"
				:icons="['scroll']"
				:title="t('goxlr.scroll_info')"
			>
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

			<ToggleBlock
				class="encoderBlock"
				:class="{ disabled: isGoXLRMini }"
				:icons="['read']"
				:title="t('goxlr.readMark_info')"
			>
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

			<TTButton @click="openTriggers()">{{ t("goxlr.triggersBt") }}</TTButton>
		</template>

		<template #footer>
			<template v-if="!connected">
				<section class="card-item info">
					<p v-for="(info, index) in tm('goxlr.infos') as string[]">
						<Icon name="info" v-if="index === 0" />{{ info }}
					</p>
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
			</template>

			<i18n-t scope="global" class="donate" tag="div" keypath="goxlr.donate">
				<template #LINK>
					<a href="https://ko-fi.com/frostycoolslug" target="_blank">{{
						t("goxlr.donate_link")
					}}</a>
				</template>
			</i18n-t>
		</template>
	</ConnectionForm>
</template>

<script setup lang="ts">
import TTButton from "@/components/TTButton.vue";
import Icon from "@/components/Icon.vue";
import ToggleBlock from "@/components/ToggleBlock.vue";
import GoXLRUI from "@/components/goxlr/GoXLRUI.vue";
import { useConnectionForm } from "@/composables/useConnectionForm";
import type { GoXLRTypes } from "@/types/GoXLRTypes";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Config from "@/utils/Config";
import GoXLRSocket from "@/utils/goxlr/GoXLRSocket";
import { ref, computed, onBeforeMount } from "vue";
import { useI18n } from "vue-i18n";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import ParamItem from "../../ParamItem.vue";
import ConnectionForm from "./ConnectionForm.vue";

const DOWNLOAD_URL = "https://github.com/GoXLR-on-Linux/goxlr-utility/releases/latest";

const { t, tm } = useI18n();
const storeAuth = useStoreAuth();
const storeParams = useStoreParams();

const securityWarning = ref(false);
const showEncoderWarning = ref(false);
const knobSelectionScroll = ref<GoXLRTypes.ButtonTypesData[]>([]);
const knobSelectionReadMark = ref<GoXLRTypes.ButtonTypesData[]>([]);

const param_ip = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "127.0.0.1",
	label: "IP",
});
const param_port = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "number",
	value: 14564,
	label: "Port",
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

const { connecting, error, showSuccess, doConnect, doDisconnect } = useConnectionForm(
	() => GoXLRSocket.instance.connect(param_ip.value.value, param_port.value.value),
	() => GoXLRSocket.instance.disconnect(),
);

const connected = computed((): boolean => {
	return GoXLRSocket.instance.connected.value === true;
});
const noDevice = computed((): boolean => {
	return GoXLRSocket.instance.status.value == null;
});
const isGoXLRMini = computed((): boolean => {
	return GoXLRSocket.instance.isGoXLRMini.value;
});

onBeforeMount(() => {
	const config = storeParams.goxlrConfig;
	if (config.ip) param_ip.value.value = config.ip;
	if (config.port) param_port.value.value = config.port;
	onIpChange();

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
function onToggleEnabled(enabled: boolean): void {
	storeParams.setGoXLREnabled(enabled);
	// Enabling makes the store auto-connect. doConnect() gets that same pending
	// connection promise, so the toggle shows the loading state and the error.
	if (enabled) void doConnect();
}

/**
 * Opens the premium param page
 */
function openPremium(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
}

/**
 * Shows a warning if IP is not local as it requires a secured connection
 */
function onIpChange(): void {
	const ip = param_ip.value.value.trim();
	securityWarning.value = ip != "127.0.0.1" && ip != "localhost";
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
	.premiumBt {
		align-self: center;
	}

	.interfaceExample {
		max-width: 400px;
		margin: auto;
	}

	.security {
		white-space: pre-line;
	}

	.connectError {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.noDevice,
	.goxlrmini,
	.encoderBlock {
		align-self: stretch;
	}

	.noDevice {
		text-align: center;
	}

	.goxlrmini {
		.icon {
			height: 1em;
			margin-right: 0.5em;
			vertical-align: middle;
		}
	}

	.encoderBlock {
		transition: opacity 0.2s;
		&.disabled {
			opacity: 0.35;
		}
		.item {
			&:not(:first-child) {
				margin-top: 0.5em;
			}
			&.center {
				display: block;
				margin-left: auto;
				margin-right: auto;
				text-align: center;
			}
		}
	}

	.info {
		p:first-of-type {
			display: inline;
		}
		.icon {
			height: 1em;
			margin-right: 0.25em;
			vertical-align: middle;
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

	.donate {
		text-align: center;
		font-style: italic;
		text-decoration: none;
		line-height: 1.25em;
	}
}
</style>
