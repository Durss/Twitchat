<template>
	<div class="featureflagsadmin sidePanel admin" ref="rootEl">
		<div class="head">
			<div class="title">
				<Icon name="alert" />
				<i18n-t scope="global" tag="h1" keypath="featureFlags.title"> </i18n-t>
			</div>

			<i18n-t scope="global" class="description" tag="span" keypath="featureFlags.subtitle">
			</i18n-t>

			<ClearButton @click="close()" />
		</div>

		<div class="content">
			<form @submit.prevent="submitForm()" class="form">
				<ParamItem :paramData="param_flag" />
				<div class="card-item form">
					<div class="searchBlock">
						<label>{{ t("featureFlags.search_label") }}</label>
						<SearchUserForm
							inline
							v-model="selectedUser"
							:excludedUserIds="currentFlagUserIds"
							@select="onUserSelect"
						/>
					</div>
					<TTButton
						type="submit"
						light
						secondary
						:loading="submitting"
						:disabled="!selectedUser || !param_flag.value"
					>
						{{ t("featureFlags.addBt") }}
						<em v-if="selectedUser">({{ selectedUser?.display_name }})</em>
					</TTButton>
				</div>
			</form>

			<Splitter>{{ t("featureFlags.list") }}</Splitter>

			<Icon class="loader" name="loader" v-if="loading" />

			<div class="featureFlagList" v-else>
				<div class="card-item featureFlag" v-for="flag in knownFlags" :key="flag">
					<div class="featureFlagHead">
						<strong>{{ flag }}</strong>
						<span class="count">{{ (flagsMap[flag] || []).length }}</span>
					</div>
					<div class="users" v-if="(flagsMap[flag] || []).length > 0">
						<div class="user" v-for="uid in flagsMap[flag] || []" :key="uid">
							<img
								v-if="userInfos[uid]?.profile_image_url"
								:src="
									userInfos[uid]!.profile_image_url.replace(/300x300/gi, '50x50')
								"
								alt="avatar"
							/>
							<span class="login">
								{{ userInfos[uid]?.display_name || uid }}
							</span>
							<TTButton
								class="deleteBt"
								icon="trash"
								alert
								small
								@click="removeUser(flag, uid)"
							/>
						</div>
					</div>
					<p class="empty" v-else>{{ t("featureFlags.empty_open") }}</p>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import ApiHelper from "@/utils/ApiHelper";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { ref, useTemplateRef, onBeforeMount, computed } from "vue";
import { useI18n } from "vue-i18n";
import { useSidePanel } from "@/composables/useSidePanel";
import { useConfirm } from "@/composables/useConfirm";
import TTButton from "../TTButton.vue";
import ClearButton from "../ClearButton.vue";
import Icon from "../Icon.vue";
import Splitter from "../Splitter.vue";
import ParamItem from "../params/ParamItem.vue";
import SearchUserForm from "../SearchUserForm.vue";

type FlagsMap = { [flag: string]: string[] };

const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();
const { confirm } = useConfirm();
const rootEl = useTemplateRef<HTMLElement>("rootEl");
const { close } = useSidePanel(rootEl, () => emit("close"));

const loading = ref<boolean>(true);
const submitting = ref<boolean>(false);
const knownFlags = ref<string[]>([]);
const flagsMap = ref<FlagsMap>({});
const userInfos = ref<{ [uid: string]: TwitchDataTypes.UserInfo }>({});
const selectedUser = ref<TwitchDataTypes.UserInfo | undefined>(undefined);

const param_flag = ref<TwitchatDataTypes.ParameterData<string, string>>({
	type: "list",
	value: "",
	listValues: [],
	labelKey: "featureFlags.param_flag",
	icon: "alert",
});

const currentFlagUserIds = computed<string[]>(() => {
	const flag = param_flag.value.value;
	return flag ? flagsMap.value[flag] || [] : [];
});

onBeforeMount(() => {
	loadFlags();
});

async function loadFlags(): Promise<void> {
	loading.value = true;
	const { status, json } = await ApiHelper.call("admin/featureFlags", "GET");
	if (status === 200 && json.success && json.data) {
		knownFlags.value = json.data.knownFlags;
		flagsMap.value = json.data.flags;
		param_flag.value.listValues = knownFlags.value.map((f) => ({
			value: f,
			label: f,
		}));
		if (!param_flag.value.value && knownFlags.value.length > 0) {
			param_flag.value.value = knownFlags.value[0]!;
		}
		await refreshUserInfos();
	}
	loading.value = false;
}

async function refreshUserInfos(): Promise<void> {
	const allUids = new Set<string>();
	for (const flag of knownFlags.value) {
		(flagsMap.value[flag] || []).forEach((uid) => allUids.add(uid));
	}
	const missing = [...allUids].filter((uid) => !userInfos.value[uid]);
	if (missing.length === 0) return;
	const users = await TwitchUtils.getUserInfo(missing);
	users.forEach((u) => {
		userInfos.value[u.id] = u;
	});
}

function onUserSelect(user: TwitchDataTypes.UserInfo): void {
	selectedUser.value = user;
}

async function submitForm(): Promise<void> {
	const flag = param_flag.value.value;
	const user = selectedUser.value;
	if (!flag || !user) return;
	submitting.value = true;
	try {
		const { status, json } = await ApiHelper.call("admin/featureFlags", "POST", {
			flag,
			uid: user.id,
		});
		if (status === 200 && json.success && json.data) {
			flagsMap.value = json.data.flags;
			userInfos.value[user.id] = user;
			selectedUser.value = undefined;
		}
	} finally {
		submitting.value = false;
	}
}

function removeUser(flag: string, uid: string): void {
	const login = userInfos.value[uid]?.display_name || uid;
	confirm(
		t("featureFlags.remove_confirm.title"),
		t("featureFlags.remove_confirm.description", { USER: login, FLAG: flag }),
	)
		.then(async () => {
			const { status, json } = await ApiHelper.call("admin/featureFlags", "DELETE", {
				flag,
				uid,
			});
			if (status === 200 && json.success && json.data) {
				flagsMap.value = json.data.flags;
			}
		})
		.catch(() => {});
}
</script>

<style scoped lang="less">
.featureflagsadmin {
	.loader {
		display: block;
		width: 2em;
		margin: auto;
	}

	.searchBlock {
		display: flex;
		flex-direction: column;
		gap: 0.25em;
		label {
			font-size: 0.9em;
		}
	}

	.splitter {
		margin-top: 2em;
	}

	.featureFlagList {
		gap: 1em;
		display: flex;
		flex-direction: column;

		.featureFlag {
			gap: 0.5em;
			display: flex;
			flex-direction: column;

			.featureFlagHead {
				display: flex;
				flex-direction: row;
				align-items: center;
				gap: 0.5em;
				.count {
					font-size: 0.8em;
					padding: 0.1em 0.5em;
					border-radius: 50px;
					background-color: var(--grayout);
				}
			}

			.users {
				gap: 0.25em;
				display: flex;
				flex-direction: column;
			}

			.user {
				gap: 0.5em;
				display: flex;
				flex-direction: row;
				align-items: center;
				img {
					height: 2em;
					border-radius: 50%;
				}
				.login {
					flex-grow: 1;
					text-overflow: ellipsis;
					overflow: hidden;
				}
				.deleteBt {
					width: 1.5em;
				}
			}

			.empty {
				font-style: italic;
				opacity: 0.6;
			}
		}
	}
}
</style>
