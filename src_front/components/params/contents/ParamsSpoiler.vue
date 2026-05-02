<template>
	<div class="paramsspoiler parameterContent">
		<Icon name="spoiler" class="icon" />

		<div class="head">
			<i18n-t scope="global" tag="p" class="head" keypath="spoiler.header">
				<template #TAG><mark>||</mark></template>
			</i18n-t>
		</div>

		<section class="card-item">
			<p>{{ t("spoiler.message_example") }}</p>
			<ChatMessage
				v-if="spoilerExample"
				:messageData="spoilerExample"
				class="example"
				lightMode
			/>
		</section>

		<ParamItem
			:paramData="param_autospoil"
			v-model="param_autospoil.value"
			@change="save()"
			v-newflag="{ date: 1693519200000, id: 'params_spoiler1stchatters' }"
		/>

		<Splitter class="splitter">{{ t("spoiler.command.title") }}</Splitter>

		<section class="form">
			<div class="card-item">
				<i18n-t scope="global" tag="div" keypath="spoiler.command.how_to">
					<template #CMD><mark>!spoiler</mark></template>
				</i18n-t>
				<img class="tuto" src="@/assets/img/spoilerTutorial.png" alt="spoiler tutorial" />
			</div>

			<div class="card-item">
				<i18n-t scope="global" tag="div" keypath="spoiler.command.allowed" class="title">
					<template #CMD><mark>!spoiler</mark></template>
				</i18n-t>
				<PermissionsForm class="perms" v-model="chatCommandPerms" />
			</div>
		</section>
	</div>
</template>

<script setup lang="ts">
import ChatMessage from "@/components/messages/ChatMessage.vue";
import { storeChat as useStoreChat } from "@/store/chat/storeChat";
import { storeDebug as useStoreDebug } from "@/store/debug/storeDebug";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { onBeforeMount, ref, watch } from "vue";
import Splitter from "../../Splitter.vue";
import PermissionsForm from "../../PermissionsForm.vue";
import type IParameterContent from "./IParameterContent";
import ParamItem from "../ParamItem.vue";
import Utils from "@/utils/Utils";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const storeChat = useStoreChat();
const storeDebug = useStoreDebug();

const spoilerExample = ref<TwitchatDataTypes.MessageChatData>();
const param_autospoil = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "spoiler.autospoil_new_users",
	icon: "firstTime",
});

const chatCommandPerms = ref<TwitchatDataTypes.PermissionsData>(
	Utils.getDefaultPermissions(true, true, false, false, false, false),
);

function save(): void {
	storeChat.setSpoilerParams({
		permissions: chatCommandPerms.value,
		autoSpoilNewUsers: param_autospoil.value.value,
	});
}

onBeforeMount(() => {
	storeDebug.simulateMessage(
		TwitchatDataTypes.TwitchatMessageType.MESSAGE,
		(data) => {
			const m = data as TwitchatDataTypes.MessageChatData;
			m.spoiler = true;
			spoilerExample.value = m;
		},
		false,
	);

	if (storeChat.spoilerParams.permissions) {
		chatCommandPerms.value = storeChat.spoilerParams.permissions;
	}

	param_autospoil.value.value = storeChat.spoilerParams?.autoSpoilNewUsers === true;
});

watch(
	() => chatCommandPerms.value,
	() => save(),
	{ deep: true },
);

defineExpose<IParameterContent>({
	onNavigateBack: () => {
		return false;
	},
});
</script>

<style scoped lang="less">
.paramsspoiler {
	.example {
		background-color: var(--background-color-primary);
		padding: 0.5em;
		position: relative;
	}

	.title {
		margin-bottom: 0.5em;
	}

	.form {
		gap: 1em;
		display: flex;
		flex-direction: column;
		align-items: stretch;

		.tuto {
			max-width: 100%;
			margin: auto;
			margin-top: 0.5em;
			display: block;
		}

		.perms {
			width: 100%;
		}
	}

	.warning {
		line-height: 1.5em;

		ul {
			margin-left: 1em;

			li {
				text-align: left;
				// list-style-type: none;
				// list-style-position: inside;
				padding-left: 0;
				margin-left: 10px;
			}
		}
	}
}
</style>
