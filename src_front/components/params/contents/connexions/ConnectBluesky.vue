<template>
	<div class="connectbluesky parameterContent">
		<Icon name="bluesky" alt="bluesky icon" class="icon" />

		<div class="head">
			{{ t("bluesky.header") }}
		</div>

		<div v-if="!storeBluesky.connected" class="card-item content">
			<form @submit.prevent="authenticate">
				<ParamItem
					class="param"
					:paramData="param_handle"
					v-model="param_handle.value"
					noBackground
				/>

				<TTButton icon="newtab" type="submit" :loading="loading" :disabled="!canSubmit">{{
					t("global.connect")
				}}</TTButton>

				<ToggleBlock small :title="t('global.advanced_params')" :open="false">
					<ParamItem
						class="param"
						:paramData="param_handleResolver"
						v-model="storeBluesky.handleResolver"
						noBackground
					/>
				</ToggleBlock>

				<div class="card-item alert error" v-if="error" @click="error = false">
					{{ t("bluesky.error") }}
				</div>
			</form>
		</div>

		<div v-else class="content" v-if="storeBluesky.connected">
			<ProfileInfoCard
				:url="'https://bsky.app/profile/' + storeBluesky.profile?.handle"
				:avatar="storeBluesky.profile?.avatar"
				:name="storeBluesky.profile?.displayName ?? storeBluesky.profile?.handle"
				:details="storeBluesky.profile ? '@' + storeBluesky.profile.handle : undefined"
				@logout="storeBluesky.disconnect()"
			/>

			<ParamItem :paramData="param_autoLive" v-model="param_autoLive.value" />
		</div>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import TTButton from "@/components/TTButton.vue";
import { storeBluesky as useStoreBluesky } from "@/store/bluesky/storeBluesky";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import ParamItem from "../../ParamItem.vue";
import ProfileInfoCard from "../ProfileInfoCard.vue";
import ToggleBlock from "@/components/ToggleBlock.vue";

const { t } = useI18n();
const error = ref(false);
const loading = ref(false);
const storeBluesky = useStoreBluesky();
const param_handle = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "twitchdev.bsky.social",
	labelKey: "bluesky.param_handle",
	icon: "user",
});
const param_handleResolver = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "https://bsky.social/",
	labelKey: "bluesky.param_handleResolver",
	icon: "internet",
});
const param_autoLive = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "bluesky.param_autoLive",
});

const canSubmit = computed(() => {
	return (
		param_handle.value.value.length > 3 &&
		param_handleResolver.value.value.startsWith("https://")
	);
});

async function authenticate() {
	error.value = false;
	loading.value = true;
	const result = await storeBluesky.startOAuthProcess(param_handle.value.value);
	if (!result) {
		error.value = true;
	}
	loading.value = false;
}
</script>

<style scoped lang="less">
.connectbluesky {
	.content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5em;
		margin: auto;

		form {
			gap: 0.5em;
			display: flex;
			flex-direction: column;
			align-items: center;
			.param {
				:deep(.holder) {
					flex-direction: column;
				}
				:deep(.inputHolder) {
					width: 100%;
				}
			}

			.error {
				margin: auto;
				cursor: pointer;
			}
		}
	}
}
</style>
