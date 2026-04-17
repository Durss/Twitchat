<template>
	<div class="paramsvoicemod parameterContent">
		<Icon name="voicemod" class="icon" />

		<div class="head">
			<i18n-t scope="global" tag="div" keypath="voicemod.header">
				<template #LINK>
					<a href="https://www.voicemod.net" target="_blank"
						><Icon name="newtab" />{{ t("voicemod.header_link") }}</a
					>
				</template>
			</i18n-t>
		</div>

		<ParamItem
			class="item enableBt"
			:paramData="param_enabled"
			v-model="param_enabled.value"
			@change="toggleState()"
		/>

		<section v-if="connecting" class="card-item">
			<Icon class="item center" name="loader" />
			<div class="item center">{{ t("voicemod.connecting") }}</div>
		</section>

		<BrowserPermissionChecker
			tag="section"
			v-if="connectionFailed && !connected"
			@click="connectionFailed = false"
			class="card-item alert error"
			:errorMessage="t('error.local_network_access_denied')"
			:permissionName="'local-network-access'"
		>
			{{ t("voicemod.connect_failed") }}
		</BrowserPermissionChecker>

		<ToggleBlock
			class="advancedParamsToggle"
			:title="t('global.advanced_params')"
			small
			:open="false"
		>
			<div class="card-item advancedParams">
				<ParamItem :paramData="param_ip" v-model="param_ip.value" noBackground />
				<ParamItem :paramData="param_port" v-model="param_port.value" noBackground />
			</div>
		</ToggleBlock>

		<div class="fadeHolder" :style="holderStyles">
			<template v-if="connected">
				<Splitter>{{ t("voicemod.params_title") }}</Splitter>

				<section>
					<ParamItem
						class="item"
						:paramData="param_voiceIndicator"
						v-model="param_voiceIndicator.value"
						@change="saveData()"
					/>
					<div class="card-item">
						<div class="item">
							<strong>{{ t("voicemod.allowed_users") }}</strong>
						</div>
						<PermissionsForm
							class="item users"
							v-model="permissions"
							@change="saveData()"
						/>
					</div>
				</section>

				<Splitter>{{ t("voicemod.voices_title") }}</Splitter>

				<section>
					<div class="item center">{{ t("voicemod.voices_infos") }}</div>
					<i18n-t
						scope="global"
						tag="div"
						class="item small"
						keypath="voicemod.voices_triggers"
					>
						<template #LINK>
							<a @click="storeParams.openParamsPage(contentTriggers)">{{
								t("voicemod.voices_triggers_link")
							}}</a>
						</template>
					</i18n-t>
					<div class="loader center" v-if="loadingList"><Icon name="loader" /></div>
					<ParamItem
						class="item param voiceEffect"
						v-for="p in voiceParams"
						:paramData="p"
						@change="saveData()"
					/>
				</section>
			</template>
		</div>
	</div>
</template>

<script setup lang="ts">
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import VoicemodWebSocket from "@/utils/voice/VoicemodWebSocket";
import { computed, onMounted, ref, watch, type CSSProperties } from "vue";
import Splitter from "../../../Splitter.vue";
import ToggleBlock from "../../../ToggleBlock.vue";
import ParamItem from "../../ParamItem.vue";
import PermissionsForm from "../../../PermissionsForm.vue";
import type { VoicemodTypes } from "@/utils/voice/VoicemodTypes";
import Icon from "@/components/Icon.vue";
import Utils from "@/utils/Utils";
import BrowserPermissionChecker from "@/components/BrowserPermissionChecker.vue";
import { useI18n } from "vue-i18n";
import { storeVoice as useStoreVoice } from "@/store/voice/storeVoice";
import { storeParams as useStoreParams } from "@/store/params/storeParams";

const { t } = useI18n();
const storeVoice = useStoreVoice();
const storeParams = useStoreParams();

const loadingList = ref(false);
const connecting = ref(false);
const connectionFailed = ref(false);
const voices = ref<VoicemodTypes.Voice[]>([]);
const voiceParams = ref<
	TwitchatDataTypes.ParameterData<string, unknown, unknown, VoicemodTypes.Voice>[]
>([]);
const param_enabled = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "global.enable",
});
const param_ip = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "127.0.0.1",
	label: "IP",
});
const param_port = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "number",
	value: 59129,
	labelKey: "connexions.port",
	min: 0,
	max: 65535,
});
const param_voiceIndicator = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: true,
	example: "voicemod_reset.png",
	labelKey: "voicemod.show_indicator",
});
const permissions = ref<TwitchatDataTypes.PermissionsData>(
	Utils.getDefaultPermissions(true, true, false, false, false, false),
);

let loadCount = 0;
let loadTotal = 0;
let voiceIdToCommand: { [key: string]: string } = {};

const contentTriggers = computed<TwitchatDataTypes.ParameterPagesStringType>(() => {
	return TwitchatDataTypes.ParameterPages.TRIGGERS;
});

const connected = computed(() => {
	return VoicemodWebSocket.instance.connected.value;
});

const holderStyles = computed<CSSProperties>(() => {
	return {
		opacity: param_enabled.value.value === true && !connecting.value ? 1 : 0.5,
		pointerEvents: param_enabled.value.value === true && !connecting.value ? "all" : "none",
	};
});

onMounted(() => {
	prefill();
	watch(
		VoicemodWebSocket.instance.connected,
		() => {
			if (connected.value) {
				populate();
			}
			connecting.value = false;
		},
		{ immediate: true },
	);
});

function onNavigateBack(): boolean {
	return false;
}

/**
 * Called when toggling the "enabled" state
 */
function toggleState(): void {
	if (param_enabled.value.value === true) {
		connect();
	} else {
		connecting.value = false;
		connectionFailed.value = false;
		saveData();
		VoicemodWebSocket.instance.disconnect();
	}
}

/**
 * Connect to Voicemod
 */
async function connect(): Promise<void> {
	connecting.value = true;
	connectionFailed.value = false;
	let isConnected = false;
	console.log("Connecting to Voicemod...");
	try {
		await VoicemodWebSocket.instance.connect(param_ip.value.value, param_port.value.value);
		isConnected = true;
	} catch (e) {}

	if (!isConnected) {
		connecting.value = false;
		connectionFailed.value = true;
	}
}

/**
 * Populate voices list.
 * Grabs image for all voices then add it to the list
 */
async function populate(): Promise<void> {
	voices.value = VoicemodWebSocket.instance.voices;
	voiceParams.value = [];
	loadingList.value = true;
	const voicemodParams = storeVoice.voicemodParams as TwitchatDataTypes.VoicemodParamsData;

	//Build hashmap for faster access
	for (const key in voicemodParams.commandToVoiceID) {
		voiceIdToCommand[voicemodParams.commandToVoiceID[key]!] = key;
	}

	loadTotal = voices.value.length;
	loadCount = 0;
	let prevBatchIndex = 0;
	for (let i = 0; i < loadTotal; i++) {
		const v = voices.value[i]!;
		const batchIndex = Math.floor(i / 20);
		if (prevBatchIndex !== batchIndex) {
			prevBatchIndex = batchIndex;
			await Utils.promisedTimeout(100);
		}
		addVoiceTolist(v);
	}
	loadingList.value = false;
}

/**
 * Save current configs
 */
function saveData(): void {
	let commandToVoiceID: { [key: string]: string } = {};

	for (const p of voiceParams.value) {
		const cmd = p.value.trim().toLowerCase();
		if (cmd.length > 0) {
			commandToVoiceID[cmd] = p.storage!.id;
		}
	}
	if (Object.keys(commandToVoiceID).length === 0) {
		commandToVoiceID = storeVoice.voicemodParams.commandToVoiceID;
	}

	const data: TwitchatDataTypes.VoicemodParamsData = {
		enabled: param_enabled.value.value,
		voiceIndicator: param_voiceIndicator.value.value,
		chatCmdPerms: permissions.value,
		commandToVoiceID,
		ip: param_ip.value.value,
		port: param_port.value.value,
	};
	storeVoice.setVoicemodParams(data);
}

/**
 * Prefills the forms
 */
function prefill(): void {
	const params: TwitchatDataTypes.VoicemodParamsData = storeVoice.voicemodParams;
	param_enabled.value.value = params.enabled === true;
	param_ip.value.value = params.ip ?? "127.0.0.1";
	param_port.value.value = params.port ?? 59129;

	param_voiceIndicator.value.value = params.voiceIndicator;

	const storedPermissions = params.chatCmdPerms;
	permissions.value.broadcaster = storedPermissions.broadcaster;
	permissions.value.mods = storedPermissions.mods;
	permissions.value.vips = storedPermissions.vips;
	permissions.value.subs = storedPermissions.subs;
	permissions.value.all = storedPermissions.all;
	permissions.value.follower = storedPermissions.follower;
	permissions.value.follower_duration_ms = storedPermissions.follower_duration_ms;
	permissions.value.usersAllowed = storedPermissions.usersAllowed;
	permissions.value.usersRefused = storedPermissions.usersRefused;
}

function addVoiceTolist(v: VoicemodTypes.Voice): void {
	const data: TwitchatDataTypes.ParameterData<string> = {
		type: "string",
		storage: v,
		label: v.friendlyName,
		value: voiceIdToCommand[v.id] ?? "",
		placeholder: "!command",
		maxLength: 50,
		icon: "loader",
	};
	VoicemodWebSocket.instance.getBitmapForVoice(v.id).then((img: string) => {
		data.icon = undefined;
		data.iconURL = "data:image/png;base64," + img;
	});
	voiceParams.value.push(data);
	voiceParams.value.sort((a, b) => {
		if (a.storage!.friendlyName < b.storage!.friendlyName) return -1;
		if (a.storage!.friendlyName > b.storage!.friendlyName) return 1;
		return 0;
	});
	if (++loadCount === loadTotal) {
		saveData();
	}
}

defineExpose({ onNavigateBack });
</script>

<style scoped lang="less">
.paramsvoicemod {
	.fadeHolder {
		transition: opacity 0.2s;
	}

	section {
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
			&.voiceEffect {
				:deep(.inputHolder) {
					max-width: 150px;
				}
				:deep(.paramIcon) {
					height: 2em;
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
			cursor: pointer;
			text-align: center;
		}
	}

	.loader {
		margin: auto;
		height: 1.5em;
		.icon {
			height: 100%;
		}
	}

	.advancedParamsToggle {
		margin: auto;
	}

	.advancedParams {
		max-width: 300px;
		display: flex;
		gap: 0.25em;
		flex-wrap: wrap;
		flex-direction: column;
		justify-content: center;
	}
}
</style>
