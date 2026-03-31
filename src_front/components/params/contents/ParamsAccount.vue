<template>
	<div class="paramsaccount parameterContent">
		<section class="profilePic">
			<img :src="userPP" alt="profile pic" />
		</section>

		<section class="card-itemhead">
			<div
				v-html="$t('account.connected_as', { USER: '<strong>' + userName + '</strong>' })"
			></div>
		</section>

		<section class="card-item actions">
			<TTButton class="button" @click="logout()" icon="logout" alert>{{
				$t("global.log_out")
			}}</TTButton>
			<TTButton class="button" @click="latestUpdates()" icon="update">{{
				$t("account.updatesBt")
			}}</TTButton>
			<TTButton class="button" @click="ahs()" icon="twitchat" v-if="canInstall">{{
				$t("account.installBt")
			}}</TTButton>
		</section>

		<section class="card-item">
			<div class="title">{{ $t("account.language") }}</div>
			<AppLangSelector />
		</section>

		<section class="card-item scopes">
			<div class="title">
				<Icon name="lock_fit" class="icon" />{{ $t("account.authorization") }}
			</div>

			<ScopeSelector @update="onScopesUpdate" />

			<TTButton
				class="authorizeBt"
				primary
				@click.stop="authorize()"
				v-if="showAuthorizeBt"
				:loading="generatingCSRF || authenticating"
				v-tooltip="generatingCSRF ? $t('login.generatingCSRF') : ''"
				icon="twitch"
				>{{ $t("login.authorizeBt") }}</TTButton
			>
		</section>

		<section v-if="storeAuth.donorLevel > -1" class="card-item donorState">
			<DonorState />
		</section>

		<section class="card-item dataSync">
			<ParamItem
				class="param"
				:paramData="storeAccount.syncDataWithServer"
				v-model="syncEnabled"
				noBackground
			/>
			<TTButton class="button" v-if="!syncEnabled" @click="eraseData()" alert icon="delete">{{
				$t("account.erase_dataBt")
			}}</TTButton>
		</section>

		<section class="card-item dataShare">
			<i18n-t tag="p" scope="global" keypath="account.share.info">
				<template #USER>
					<strong>{{ storeAuth.twitch.user.displayNameOriginal }}</strong>
				</template>
			</i18n-t>
			<TTButton
				icon="twitch"
				class="button"
				@click="startParamsShareFlow()"
				:loading="connecting"
				>{{ $t("account.share.connectBt") }}</TTButton
			>

			<template v-if="sharedUsers.length > 0">
				<Splitter>{{ $t("account.share.sharingList") }}</Splitter>
				<div class="card-item alert" v-if="unlinkError" @click="unlinkError = false">
					{{ $t("account.share.unlink_fail") }}
				</div>
				<div class="card-item sharedUser" v-for="user in sharedUsers" :key="user.id">
					<Icon name="loader" v-if="user.temporary" />
					<template v-else>
						<img :src="user.avatarPath" alt="avatar" class="avatar" />
						<span>{{ user.displayNameOriginal }}</span>
						<TTButton @click="unlink(user)" icon="cross" small alert>{{
							$t("account.share.unlinkBt")
						}}</TTButton>
					</template>
				</div>
			</template>
		</section>
	</div>
</template>

<script setup lang="ts">
import DataStore from "@/store/DataStore";
import StoreProxy from "@/store/StoreProxy";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import OBSWebsocket from "@/utils/OBSWebsocket";
import TriggerActionHandler from "@/utils/triggers/TriggerActionHandler";
import TTSUtils from "@/utils/TTSUtils";
import VoicemodWebSocket from "@/utils/voice/VoicemodWebSocket";
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import TTButton from "../../TTButton.vue";
import ParamItem from "../ParamItem.vue";
import AppLangSelector from "@/components/AppLangSelector.vue";
import ScopeSelector from "@/components/login/ScopeSelector.vue";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import type IParameterContent from "./IParameterContent";
import DonorState from "@/components/user/DonorState.vue";
import ApiHelper from "@/utils/ApiHelper";
import Splitter from "@/components/Splitter.vue";
import { storeMain as useStoreMain } from "@/store/storeMain";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { storeCommon as useStoreCommon } from "@/store/common/storeCommon";
import { storeUsers as useStoreUsers } from "@/store/users/storeUsers";
import { storeAccount as useStoreAccount } from "@/store/account/storeAccount";
import { useConfirm } from "@/composables/useConfirm";
import { asset } from "@/composables/useAsset";

const { t } = useI18n();
const router = useRouter();
const storeMain = useStoreMain();
const storeAuth = useStoreAuth();
const storeParams = useStoreParams();
const storeCommon = useStoreCommon();
const storeUsers = useStoreUsers();
const storeAccount = useStoreAccount();
const { confirm } = useConfirm();
const { getAsset } = asset();

const disposed = ref(false);
const connecting = ref(false);
const syncEnabled = ref(false);
const unlinkError = ref(false);
const showAuthorizeBt = ref(false);
const scopes = ref<string[]>([]);
const generatingCSRF = ref(false);
const authenticating = ref(false);
const CSRFToken = ref("");
const sharedUsers = ref<TwitchatDataTypes.TwitchatUser[]>([]);

const canInstall = computed((): boolean => {
	return storeMain.ahsInstaller != null;
});

const userName = computed((): string => {
	return storeAuth.twitch.user.displayName;
});

const userPP = computed((): string => {
	let pp: string | undefined = storeAuth.twitch.user.avatarPath;
	if (!pp) {
		pp = getAsset("icons/user.svg");
	}
	return pp;
});

onMounted(async () => {
	syncEnabled.value = DataStore.get(DataStore.SYNC_DATA_TO_SERVER) !== "false";
	watch(
		() => syncEnabled.value,
		() => DataStore.set(DataStore.SYNC_DATA_TO_SERVER, syncEnabled.value, false),
	);
	updateSharedUserList();
});

onBeforeUnmount(() => {
	disposed.value = true;
});

function onNavigateBack(): boolean {
	return false;
}

function logout(): void {
	storeAuth.logout();
	router.push({ name: "logout" });
}

function latestUpdates(): void {
	storeParams.closeParameters();
	storeParams.openModal("updates");
	// this.$store.chat.sendTwitchatAd(TwitchatDataTypes.TwitchatAdTypes.UPDATES);
}

function ahs(): void {
	const ahsInstaller = storeMain.ahsInstaller;
	if (!ahsInstaller) return;
	// Show the prompt
	ahsInstaller.prompt();
}

function eraseData(): void {
	storeMain
		.confirm(t("account.erase_confirm_title"), t("account.erase_confirm_description"))
		.then(() => {
			DataStore.clear(true);
			StoreProxy.obs.$reset();
			StoreProxy.qna.$reset();
			StoreProxy.tts.$reset();
			StoreProxy.poll.$reset();
			StoreProxy.chat.$reset();
			StoreProxy.heat.$reset();
			StoreProxy.kofi.$reset();
			StoreProxy.quiz.$reset();
			StoreProxy.voice.$reset();
			StoreProxy.music.$reset();
			StoreProxy.lumia.$reset();
			StoreProxy.users.$reset();
			StoreProxy.raffle.$reset();
			StoreProxy.labels.$reset();
			StoreProxy.stream.$reset();
			StoreProxy.params.$reset();
			StoreProxy.values.$reset();
			StoreProxy.tipeee.$reset();
			StoreProxy.discord.$reset();
			StoreProxy.automod.$reset();
			StoreProxy.triggers.$reset();
			StoreProxy.counters.$reset();
			StoreProxy.bingoGrid.$reset();
			StoreProxy.emergency.$reset();
			StoreProxy.streamlabs.$reset();
			StoreProxy.prediction.$reset();
			StoreProxy.donationGoals.$reset();
			StoreProxy.streamelements.$reset();
			OBSWebsocket.instance.disconnect();
			VoicemodWebSocket.instance.disconnect();
			TTSUtils.instance.enabled = false;
			TriggerActionHandler.instance.populate([]);
			DataStore.set(DataStore.SYNC_DATA_TO_SERVER, false);
		})
		.catch((error) => {
			//ignore
		});
}

async function generateCSRF(): Promise<void> {
	generatingCSRF.value = true;
	showAuthorizeBt.value = true;
	try {
		const { json } = await ApiHelper.call("auth/CSRFToken", "GET");
		CSRFToken.value = json.token;
	} catch (e) {
		storeCommon.alert(t("error.csrf_failed"));
	}
	generatingCSRF.value = false;
}

async function onScopesUpdate(list: string[]): Promise<void> {
	await generateCSRF();
	scopes.value = list;
}

async function startParamsShareFlow(): Promise<void> {
	connecting.value = true;
	const { json } = await ApiHelper.call("auth/CSRFToken", "GET", { withRef: true });
	CSRFToken.value = json.token;
	document.location.href = TwitchUtils.getOAuthURL(CSRFToken.value, scopes.value);
	window.setTimeout(() => {
		connecting.value = false;
	}, 10000);
}

function unlink(user: TwitchatDataTypes.TwitchatUser): void {
	unlinkError.value = false;
	confirm(t("account.share.unlink_confirm.title"), t("account.share.unlink_confirm.description"))
		.then(async () => {
			const res = await ApiHelper.call("auth/dataShare", "DELETE", { uid: user.id });
			if (res.status == 200) {
				storeAuth.dataSharingUserList = res.json.users || [];
				updateSharedUserList();
			} else {
				unlinkError.value = true;
			}
		})
		.catch(() => {});
}

function authorize(): void {
	let oAuthURL = TwitchUtils.getOAuthURL(CSRFToken.value, scopes.value, "/popup");
	const win = window.open(oAuthURL, "twitchAuth", "width=600,height=800");
	if (win) {
		authenticating.value = true;
		const interval = setInterval(() => {
			if (win.closed) {
				clearInterval(interval);
				authenticating.value = false;
			}
		}, 500);
		window.authCallback = async (code: string, csrfToken: string) => {
			clearInterval(interval);
			win?.close();
			const { json: csrf } = await ApiHelper.call("auth/CSRFToken", "POST", {
				token: csrfToken,
			});
			if (!csrf.success) {
				storeCommon.alert(t("error.csrf_invalid"));
				authenticating.value = false;
				return;
			}
			storeAuth.twitch_updateAuthScopes(code).finally(() => {
				authenticating.value = false;
			});
		};
		win.focus();
		return;
	}
	oAuthURL = TwitchUtils.getOAuthURL(CSRFToken.value, scopes.value);
	window.location.href = oAuthURL;
}

function updateSharedUserList(): void {
	sharedUsers.value = [];
	storeAuth.dataSharingUserList.forEach((uid) => {
		sharedUsers.value.push(storeUsers.getUserFrom("twitch", storeAuth.twitch.user.id, uid));
	});
}

defineExpose<IParameterContent>({
	onNavigateBack,
});
</script>

<style scoped lang="less">
.paramsaccount {
	.profilePic {
		.emboss();
		overflow: hidden;
		border-radius: 50%;
		img {
			height: 5em;
			width: 5em;
			transition: all 0.25s;
		}
		&:hover {
			img {
				height: 10em;
				width: 10em;
			}
		}
	}

	.head {
		margin-top: 0;
	}

	.title {
		text-align: center;
		font-weight: bold;
		.icon {
			height: 1em;
			margin-right: 0.5em;
			vertical-align: text-top;
		}
	}

	.actions {
		align-items: center;
	}

	.donorState {
		overflow: visible;
	}

	.scopes {
		max-width: 400px;

		.title {
			margin-bottom: 0;
		}

		.authorizeBt {
			margin-top: 0.5em;
		}
	}

	.dataSync,
	.dataShare {
		line-height: 1.25em;
		align-items: center;
		text-align: center;
		white-space: pre-line;
	}

	.splitter {
		width: 100%;
		margin-top: 1em;
		margin-bottom: 0.5em;
	}

	.sharedUser {
		gap: 0.5em;
		display: flex;
		flex-direction: row;
		align-items: center;
		.avatar {
			height: 2em;
			border-radius: 50%;
		}
	}
}
</style>
