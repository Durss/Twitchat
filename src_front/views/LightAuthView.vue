<template>
	<div class="lightauthview modal">
		<div class="dimmer"></div>
		<div class="holder">
			<div class="head">
				<img class="icon" src="@/assets/logo.svg" alt="twitch" />
			</div>
			<div class="content">
				<span class="title">{{ $t("login.authenticating") }}</span>
				<Icon name="loader" class="spinner" v-if="authenticating" />
				<template v-else-if="error">
					<div class="card-item alert" v-if="error">
						{{ $t("error.twitch_auth_fail") }}
					</div>
					<TTButton
						icon="back"
						v-if="redirect"
						@click="$router.push({ name: redirect })"
						>{{ $t("global.back") }}</TTButton
					>
				</template>

				<div class="footer">
					<p>
						<span>{{ $t("home.info") }}</span>
						<a href="https://www.durss.ninja" target="_blank">Durss</a>
					</p>
					<p>
						<span>{{ $t("home.footer.title") }}</span>
						<a href="https://github.com/Durss/Twitchat" target="_blank">Github</a>
					</p>
					<p class="note" v-html="$t('home.footer.disclaimer')"></p>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import ApiHelper from "@/utils/ApiHelper";
import Utils from "@/utils/Utils";
import DataStoreCommon from "@/store/DataStoreCommon";
import Icon from "@/components/Icon.vue";
import TTButton from "@/components/TTButton.vue";
import { ref, onBeforeMount } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { storeCommon as useStoreCommon } from "@/store/common/storeCommon";
import { storePublic as useStorePublic } from "@/store/storePublic";

const { t } = useI18n();
const router = useRouter();
const storeCommon = useStoreCommon();
const storePublicInst = useStorePublic();

const error = ref<boolean>(false);
const redirect = ref<string>("");
const authenticating = ref<boolean>(true);

onBeforeMount(async () => {
	authenticating.value = true;
	redirect.value = DataStoreCommon.get(DataStoreCommon.REDIRECT);
	const code = Utils.getQueryParameterByName("code");
	const csrfToken = Utils.getQueryParameterByName("state");
	if (code) {
		const res = await ApiHelper.call("auth/CSRFToken", "POST", { token: csrfToken! });
		if (!res.json.success) {
			if (res.json.message) storeCommon.alert(res.json.message);
			error.value = true;
		} else {
			error.value = !(await storePublicInst.twitchAuth(code));
			if (error.value) {
				storeCommon.alert(t("error.invalid_credentials"));
			}
		}
	} else {
		storeCommon.alert(t("error.authorization_refused"));
	}
	DataStoreCommon.remove(DataStoreCommon.REDIRECT);
	router.push(redirect.value);
});
</script>

<style scoped lang="less">
.lightauthview {
	.spinner {
		height: 2em;
	}
	.content {
		gap: 1em;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.holder {
		width: fit-content;
		.head {
			margin-bottom: 0;
			padding: 0;
			padding-top: 20px;
			width: 200px;
			margin: auto;
			.icon {
				height: 50px;
				width: unset;
				max-width: unset;
				max-height: unset;
			}
		}
	}
	.content {
		text-transform: capitalize;
	}

	.footer {
		text-align: center;
		font-size: 0.8em;
		margin-bottom: 10px;

		.note {
			font-style: italic;
			margin-top: 0.5em;
			font-size: 0.9em;
			opacity: 0.8;
		}
	}
}
</style>
