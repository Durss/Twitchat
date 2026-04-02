<template>
	<div class="qnaform sidePanel" ref="rootEl">
		<div class="head">
			<div class="title">
				<Icon name="qna" />
				<i18n-t scope="global" tag="h1" keypath="qna.form.title"> </i18n-t>
			</div>

			<i18n-t scope="global" class="description" tag="span" keypath="qna.form.subtitle">
			</i18n-t>

			<ClearButton @click="close()" />
		</div>

		<div class="content">
			<form @submit.prevent="submitForm()">
				<div class="card-item">
					<ParamItem
						noBackground
						:paramData="param_command"
						autofocus
						@change="conflict = false"
						:error="conflict"
						:errorMessage="t('qna.form.conflict')"
					/>

					<div class="example">
						<span>{{ t("global.example") }}</span
						>:
						<i18n-t scope="global" tag="mark" keypath="qna.form.example_command">
							<template #CMD>{{ example }}</template>
							<template #QUESTION>{{ t("qna.form.example_question") }}</template>
						</i18n-t>
					</div>
				</div>

				<ParamItem :paramData="param_upvote" v-model="param_upvote.value" premium />

				<ParamItem
					:paramData="param_shareWithMods"
					v-model="param_shareWithMods.value"
					premium
				/>

				<PostOnChatParam
					botMessageKey="qnaStart"
					icon="announcement"
					:placeholderEnabled="false"
					titleKey="qna.form.announce_start"
					:placeholders="startPlaceholders"
				/>
				<TTButton type="submit">{{ t("global.start") }}</TTButton>
			</form>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, useTemplateRef, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import ClearButton from "../ClearButton.vue";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import ParamItem from "../params/ParamItem.vue";
import TTButton from "../TTButton.vue";
import PostOnChatParam from "../params/PostOnChatParam.vue";
import { storeQna as useStoreQna } from "@/store/qna/storeQna";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { useSidePanel } from "@/composables/useSidePanel";

const emit = defineEmits<{
	close: [];
}>();

const { t } = useI18n();
const storeAuth = useStoreAuth();
const storeQna = useStoreQna();
const rootEl = useTemplateRef<HTMLDivElement>("rootEl");
const { close } = useSidePanel(rootEl, emit);

const conflict = ref<boolean>(false);
const param_command = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "!q",
	placeholder: "!sugg",
	maxLength: 30,
	labelKey: "qna.form.param_command",
	icon: "commands",
});
const param_upvote = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "qna.form.param_upvote",
	icon: "add",
});
const param_shareWithMods = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "qna.form.param_shareWithMods",
	icon: "mod",
});

const example = computed((): string => {
	if (param_command.value.value) return param_command.value.value;
	return "!sugg";
});

const startPlaceholders = computed((): TwitchatDataTypes.PlaceholderEntry[] => {
	return [
		{
			tag: "CMD",
			descKey: "qna.form.cmd_placeholder",
			example: param_command.value.value,
		},
	];
});

function submitForm(): void {
	if (
		!storeQna.createSession(
			param_command.value.value,
			param_upvote.value.value,
			param_shareWithMods.value.value,
		)
	) {
		conflict.value = true;
	} else {
		close();
	}
}

onMounted(() => {
	if (storeAuth.isPremium) {
		param_upvote.value.value = true;
		param_shareWithMods.value.value = true;
	}
});
</script>

<style scoped lang="less">
.qnaform {
	.example {
		margin-left: auto;
		margin-top: 10px;
		border-radius: var(--border-radius);
		font-size: 0.8em;
		text-align: right;
	}
}
</style>
