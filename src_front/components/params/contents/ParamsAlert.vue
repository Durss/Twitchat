<template>
	<div class="paramsalert parameterContent">
		<Icon name="alert" class="icon" />

		<div class="head">{{ t("alert.header") }}</div>

		<Splitter class="splitter">{{ t("alert.command_title") }}</Splitter>
		<section class="card-item">
			<div>
				<ParamItem :paramData="param_chatCommand" />
				<ToggleBlock :title="t('global.allowed_users')" :open="false" small>
					<PermissionsForm v-model="chatCommandPerms" />
				</ToggleBlock>
			</div>
		</section>

		<Splitter class="splitter">{{ t("alert.actions") }}</Splitter>
		<section class="card-item">
			<ParamItem :paramData="param_message" v-model="param_message.value" />
			<ParamItem :paramData="param_shake" v-model="param_shake.value" />
			<ParamItem :paramData="param_sound" v-model="param_sound.value" />
			<ParamItem :paramData="param_blink" v-model="param_blink.value" />
			<ParamItem :paramData="param_vibrate" v-model="param_vibrate.value" />

			<i18n-t scope="global" tag="div" class="infos" keypath="alert.actions_triggers">
				<template #LINK>
					<a @click="storeParams.openParamsPage(contentTriggers)">{{
						t("alert.actions_triggers_link")
					}}</a>
				</template>
			</i18n-t>

			<TTButton class="testBt" icon="test" @click="testAlert()">{{
				t("alert.testBt")
			}}</TTButton>
		</section>
	</div>
</template>

<script setup lang="ts">
import StoreProxy from "@/store/StoreProxy";
import { storeMain as useStoreMain } from "@/store/storeMain";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { storeUsers as useStoreUsers } from "@/store/users/storeUsers";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Utils from "@/utils/Utils";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { computed, onBeforeMount, ref, watch } from "vue";
import TTButton from "../../TTButton.vue";
import PermissionsForm from "../../PermissionsForm.vue";
import Splitter from "../../Splitter.vue";
import ToggleBlock from "../../ToggleBlock.vue";
import ParamItem from "../ParamItem.vue";
import type IParameterContent from "./IParameterContent";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const storeMain = useStoreMain();
const storeParams = useStoreParams();
const storeUsers = useStoreUsers();

const param_chatCommand = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	labelKey: "alert.command",
	value: "!alert",
});
const param_message = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	labelKey: "alert.option_popin",
	value: true,
});
const param_shake = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	labelKey: "alert.option_shake",
	value: true,
});
const param_blink = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	labelKey: "alert.option_blink",
	value: false,
});
const param_sound = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	labelKey: "alert.option_sound",
	value: true,
});
const param_vibrate = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	labelKey: "alert.option_vibrate",
	value: true,
});
const chatCommandPerms = ref<TwitchatDataTypes.PermissionsData>(
	Utils.getDefaultPermissions(true, true, false, false, false, false),
);

const finalData = computed<TwitchatDataTypes.AlertParamsData>(() => {
	return {
		chatCmd: param_chatCommand.value.value,
		shake: param_shake.value.value,
		message: param_message.value.value,
		blink: param_blink.value.value,
		sound: param_sound.value.value,
		vibrate: param_vibrate.value.value,
		permissions: chatCommandPerms.value,
	};
});

const contentTriggers = computed<TwitchatDataTypes.ParameterPagesStringType>(() => {
	return TwitchatDataTypes.ParameterPages.TRIGGERS;
});

function testAlert(): void {
	const uid = StoreProxy.auth.twitch.user.id;
	const str = "GivePLZ  Read your chat !!! TakeNRG ";
	const chunks = TwitchUtils.parseMessageToChunks(str, undefined, true);
	const message: TwitchatDataTypes.MessageChatData = {
		id: Utils.getUUID(),
		platform: "twitch",
		date: Date.now(),
		type: TwitchatDataTypes.TwitchatMessageType.MESSAGE,
		user: storeUsers.getUserFrom("twitch", uid, uid),
		answers: [],
		channel_id: uid,
		message: str,
		message_chunks: chunks,
		message_html: TwitchUtils.messageChunksToHTML(chunks),
		message_size: TwitchUtils.computeMessageSize(chunks),
		is_short: false,
	};
	storeMain.executeChatAlert(message);
}

onBeforeMount(() => {
	let params: TwitchatDataTypes.AlertParamsData = JSON.parse(
		JSON.stringify(storeMain.chatAlertParams),
	);
	if (params) {
		//Prefill forms from storage
		param_chatCommand.value.value = params.chatCmd;
		param_shake.value.value = params.shake;
		param_message.value.value = params.message;
		param_blink.value.value = params.blink;
		param_sound.value.value = params.sound;
		param_vibrate.value.value = params.vibrate;
		chatCommandPerms.value = params.permissions;
	}
});

watch(
	() => finalData.value,
	() => {
		storeMain.setChatAlertParams(finalData.value);
	},
	{ deep: true },
);

defineExpose<IParameterContent>({
	onNavigateBack: () => {
		return false;
	},
});
</script>

<style scoped lang="less">
.paramsalert {
	.testBt {
		align-self: center;
	}
	section {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
	}
}
</style>
