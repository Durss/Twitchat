<template>
	<div class="logout">
		<div class="home-gradient-bg"></div>

		<div class="holder blured-background-window">
			<div class="head">
				<img class="icon" src="@/assets/logo.svg" alt="twitch" />
			</div>

			<div class="content">
				<div v-if="!showDetails">{{ t("logout.title") }}</div>
				<div class="link" v-if="!showDetails">
					<a @click="showDetails = !showDetails">{{ t("logout.are_you") }}</a>
				</div>
				<div class="details" v-if="showDetails">
					<p>
						<strong>{{ t("logout.details_head") }}</strong>
					</p>
					<p>{{ t("logout.details_1") }}</p>
					<p>{{ t("logout.details_2") }}</p>

					<TTButton
						type="link"
						href="https://www.twitch.tv/settings/connections"
						target="_blank"
						>{{ t("logout.settingBt") }}</TTButton
					>

					<p v-html="t('logout.details_3')"></p>

					<img src="@/assets/img/logout.png" alt="logout" />
				</div>
				<TTButton :to="{ name: 'login' }" class="login">{{ t("global.log_in") }}</TTButton>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import TTButton from "@/components/TTButton.vue";
import { ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const showDetails = ref(false);
</script>

<style scoped lang="less">
.logout {
	.holder {
		.center();
		color: var(--color-text);
		position: fixed;
		z-index: 1;
		display: flex;
		flex-direction: column;
		gap: 1em;
		width: max-content;
		max-width: 600px;

		.head {
			align-self: center;
			.icon {
				height: 50px;
			}
		}

		.content {
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 1em;
			.details {
				display: flex;
				flex-direction: column;
				align-items: center;
				text-align: center;
				gap: 0.5em;
				line-height: 1.5em;
			}
		}
	}
}
</style>
