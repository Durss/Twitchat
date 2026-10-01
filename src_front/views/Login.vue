<template>
	<div :class="classes">
		<div class="dimmer" ref="dimmer" @click="close()"></div>

		<div class="holder" ref="holder">
			<div class="head" v-if="!props.scopeOnly">
				<img class="icon" src="@/assets/logo.svg" alt="twitch" />
				<div class="beta" v-if="isBeta === true">{{ t("global.beta") }}</div>
			</div>

			<ClearButton @click="close()" />

			<div class="content betaWarn" v-if="closedBeta === true && !props.scopeOnly">
				<div class="head">
					<Icon name="lock" />
					<p>{{ t("login.closed_beta") }}</p>
				</div>
				<TTButton
					type="link"
					href="https://twitchat.fr"
					class="link"
					target="_self"
					icon="twitchat"
					>{{ t("login.prodBt") }}</TTButton
				>

				<div class="migrate" v-if="migrateInfo.betaDate && !transferComplete">
					<div>{{ t("login.transfer_details") }}</div>
					<div class="envs">
						<div class="env">
							<div class="noBorder"></div>
							<div>{{ t("login.transfer_details_date") }}</div>
							<div>{{ t("login.transfer_details_version") }}</div>
						</div>
						<div class="env">
							<div>{{ t("login.transfer_details_beta") }}</div>
							<div>{{ migrateInfo.betaDate }}</div>
							<div>{{ migrateInfo.betaVersion }}</div>
						</div>
						<div class="env">
							<div>{{ t("login.transfer_details_production") }}</div>
							<div v-if="migrateInfo.prodDate">{{ migrateInfo.prodDate }}</div>
							<div v-else>{{ t("login.transfer_no_data") }}</div>
							<div v-if="migrateInfo.prodVersion">{{ migrateInfo.prodVersion }}</div>
							<div v-else>{{ t("login.transfer_no_data") }}</div>
						</div>
					</div>

					<TTButton
						class="tranferBt"
						icon="download"
						@click="transferData"
						:loading="transferingData"
						light
						secondary
						>{{ t("login.transfer_datatBt") }}</TTButton
					>
				</div>

				<div class="migrate" v-if="transferComplete">
					<Icon name="checkmark" class="icon" />
					<div>{{ t("login.transfer_complete") }}</div>
				</div>
			</div>

			<div class="content" v-if="!closedBeta || props.scopeOnly">
				<div class="description" v-if="!authenticating && requestedScopes.length == 0">
					{{ t("login.head") }}
				</div>

				<ScopeSelector
					v-if="!authenticating"
					@update="onScopesUpdate"
					:requestedScopes="requestedScopes"
				/>

				<TTButton
					@click.capture.prevent="generateCSRF(true)"
					type="link"
					:href="oAuthURL"
					v-if="!authenticating && oAuthURL"
					bounce
					primary
					:loading="generatingCSRF"
					v-tooltip="generatingCSRF ? t('login.generatingCSRF') : ''"
					icon="twitch"
					>{{ t("login.authorizeBt") }}</TTButton
				>

				<TTButton
					v-if="!authenticating && !oAuthURL"
					@click="generateCSRF()"
					:loading="generatingCSRF"
					alert
					icon="refresh"
					>{{ t("login.retryBt") }}</TTButton
				>

				<div class="loader" v-if="authenticating">
					<p>{{ t("login.authenticating") }}</p>
					<Icon class="loader" name="loader" />
				</div>
			</div>

			<div class="footer" v-if="!props.scopeOnly">
				<p>
					<span>{{ t("home.info") }}</span>
					<a href="https://www.durss.ninja" target="_blank">Durss</a>
				</p>
				<p>
					<span>{{ t("home.footer.title") }}</span>
					<a href="https://github.com/Durss/Twitchat" target="_blank">Github</a>
				</p>
				<p class="note" v-html="t('home.footer.disclaimer')"></p>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import TTButton from "@/components/TTButton.vue";
import ClearButton from "@/components/ClearButton.vue";
import ScopeSelector from "@/components/login/ScopeSelector.vue";
import DataStore from "@/store/DataStore";
import ApiHelper from "@/utils/ApiHelper";
import Config from "@/utils/Config";
import type { TwitchScopesString } from "@/utils/twitch/TwitchScopes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import Utils from "@/utils/Utils";
import { gsap } from "gsap";
import { computed, nextTick, onBeforeMount, onMounted, ref, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter, useRoute } from "vue-router";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeCommon as useStoreCommon } from "@/store/common/storeCommon";
import { storeMain as useStoreMain } from "@/store/storeMain";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { useConfirm } from "@/composables/useConfirm";

const props = withDefaults(
	defineProps<{
		show?: boolean;
		scopeOnly?: boolean;
	}>(),
	{
		show: false,
		scopeOnly: false,
	},
);

const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const { confirm } = useConfirm();

const storeAuth = useStoreAuth();
const storeCommon = useStoreCommon();
const storeMain = useStoreMain();
const storeParams = useStoreParams();

const dimmer = useTemplateRef("dimmer");
const holder = useTemplateRef("holder");

const isBeta = ref(false);
const closedBeta = ref(false);
const generatingCSRF = ref(false);
const authenticating = ref(false);
const transferingData = ref(false);
const transferComplete = ref(false);
const oAuthURL = ref("");
const scopes = ref<string[]>([]);
const CSRFToken = ref("");
const requestedScopes = ref<TwitchScopesString[]>([]);
const migrateInfo = ref<{
	betaDate?: string;
	prodDate?: string;
	betaVersion?: number;
	prodVersion?: number;
}>({});

const classes = computed(() => {
	const res = ["login"];
	if (props.scopeOnly !== false) res.push("no-bg");
	return res;
});

onBeforeMount(() => {
	if (router.currentRoute.value.params.betaReason) {
		closedBeta.value = true;
		checkIfCanMigrate();
	}

	if (router.currentRoute.value.params.scope) {
		if (Array.isArray(router.currentRoute.value.params.scope)) {
			requestedScopes.value = router.currentRoute.value.params.scope as TwitchScopesString[];
		} else {
			requestedScopes.value = [router.currentRoute.value.params.scope as TwitchScopesString];
		}
	} else {
		requestedScopes.value = storeAuth.newScopesToRequest;
	}
});

onMounted(async () => {
	isBeta.value = Config.instance.BETA_MODE;

	if (route.name == "oauth") {
		authenticating.value = true;
		const code = Utils.getQueryParameterByName("code");
		const csrfToken = Utils.getQueryParameterByName("state");
		if (code) {
			const res = await ApiHelper.call("auth/CSRFToken", "POST", { token: csrfToken! });
			if (!res.json.success) {
				if (res.json.message) storeCommon.alert(res.json.message);
				authenticating.value = false;
			} else {
				storeAuth.twitch_autenticate(code, (success: boolean, betaRefused?: boolean) => {
					if (success) {
						if (res.json.uidShare) {
							storeMain.tempStoreValue = {
								uid: res.json.uidShare,
								csrf: csrfToken,
							};
							storeParams.openModal("shareParams");
							authenticating.value = false;
						}
						redirect();
					} else {
						authenticating.value = false;
						if (betaRefused === true) {
							closedBeta.value = true;
							checkIfCanMigrate();
						} else {
							storeCommon.alert(t("error.invalid_credentials"));
						}
					}
				});
			}
		} else {
			storeCommon.alert(t("error.authorization_refused"));
			authenticating.value = false;
		}
	}

	open();
});

watch(
	() => props.show,
	() => {
		if (props.show) open();
	},
);

/**
 * Open window
 */
async function open(): Promise<void> {
	//Uncomment to debug forced scopes state
	// storeAuth.newScopesToRequest = ['moderator:read:chatters', 'channel:read:redemptions', 'channel:manage:polls'];

	await nextTick();
	if (dimmer.value) {
		gsap.killTweensOf(dimmer.value);
		gsap.fromTo(
			dimmer.value,
			{ opacity: 0 },
			{ opacity: 1, ease: "sine.out", duration: 0.2, clearProps: "all" },
		);
	}
	holder.value!.removeAttribute("style");
	await nextTick();
	gsap.killTweensOf(holder.value!);
	gsap.fromTo(holder.value!, { scaleX: 0.1 }, { scaleX: 1, ease: "elastic.out", duration: 1 });
	gsap.fromTo(
		holder.value!,
		{ scaleY: 0.1 },
		{ scaleY: 1, ease: "elastic.out", duration: 1, delay: 0.1, clearProps: "all" },
	);
}

/**
 * Generates a CSRF token
 * @param redirect
 */
async function generateCSRF(redirect: boolean = false): Promise<void> {
	generatingCSRF.value = true;
	try {
		const { json } = await ApiHelper.call("auth/CSRFToken", "GET");
		CSRFToken.value = json.token;
		onScopesUpdate(scopes.value);
	} catch (e) {
		storeCommon.alert(t("error.csrf_failed"));
	}
	if (redirect) {
		if (storeAuth.authenticated) {
			oAuthURL.value = TwitchUtils.getOAuthURL(CSRFToken.value, scopes.value, "/popup");
			const win = window.open(oAuthURL.value, "twitchAuth", "width=600,height=800");
			if (win) {
				const interval = setInterval(() => {
					if (win.closed) {
						clearInterval(interval);
						generatingCSRF.value = false;
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
						generatingCSRF.value = false;
						return;
					}
					storeAuth
						.twitch_updateAuthScopes(code)
						.then((success) => {
							if (success) {
								close();
							}
						})
						.finally(() => {
							generatingCSRF.value = false;
						});
				};
				win.focus();
				return;
			}
		}
		oAuthURL.value = TwitchUtils.getOAuthURL(CSRFToken.value, scopes.value);
		window.location.href = oAuthURL.value;
	}
}

/**
 * Called when scope selection changes
 * Updates the oAuthURL
 */
async function onScopesUpdate(list: string[]): Promise<void> {
	scopes.value = list;
	oAuthURL.value = TwitchUtils.getOAuthURL(CSRFToken.value, scopes.value);
}

/**
 * Close the window
 */
async function close(): Promise<void> {
	if (dimmer.value) {
		gsap.killTweensOf(dimmer.value);
		gsap.to(dimmer.value, {
			opacity: 0,
			ease: "sine.in",
			duration: 0.2,
		});
	}
	gsap.killTweensOf(holder.value!);
	gsap.to(holder.value!, {
		scaleX: 0.1,
		scaleY: 0.1,
		ease: "back.in",
		duration: 0.35,
		clearProps: "all",
		onComplete: () => {
			storeAuth.newScopesToRequest = [];
			emit("close");
		},
	});
}

/**
 * Called when requesting to transfer our data from beta to production
 */
function transferData(): void {
	confirm(t("login.transfer_confirm_title"), t("login.transfer_confirm_description"))
		.then(async () => {
			transferingData.value = true;
			const res = await ApiHelper.call("beta/user/migrateToProduction", "POST");
			if (res.status == 200) {
				transferComplete.value = true;
			} else {
				storeCommon.alert(t("error.beta_transfer"));
			}
			transferingData.value = false;
		})
		.catch(() => {
			/*ignore*/
		});
}

/**
 * Check if the user has data on beta server that can be migrated to production
 */
async function checkIfCanMigrate(): Promise<void> {
	const res = await ApiHelper.call("beta/user/hasData", "GET");
	if (res.status === 200) {
		const json = res.json;
		if (json.success) {
			migrateInfo.value = {};
			if (json.data!.betaDate)
				migrateInfo.value.betaDate = Utils.formatDate(new Date(json.data!.betaDate));
			if (json.data!.prodDate)
				migrateInfo.value.prodDate = Utils.formatDate(new Date(json.data!.prodDate));
			if (json.data!.betaVersion) migrateInfo.value.betaVersion = json.data!.betaVersion;
			if (json.data!.prodVersion) migrateInfo.value.prodVersion = json.data!.prodVersion;
		}
	}
}

/**
 * Redirect user after auth complete
 */
function redirect(): void {
	let redirectPath: string | undefined = undefined;
	const routeRedirect = router.currentRoute.value.params?.redirect;
	if (Array.isArray(routeRedirect)) redirectPath = routeRedirect[0];
	else redirectPath = routeRedirect;

	if (!props.scopeOnly) {
		if (redirectPath && redirectPath != "logout") {
			DataStore.set(DataStore.REDIRECT, redirectPath, false);
		}
	}
	redirectPath = DataStore.get(DataStore.REDIRECT);
	DataStore.remove(DataStore.REDIRECT);
	if (redirectPath) {
		router.push(redirectPath);
	} else {
		router.push({ name: "chat" });
	}
}
</script>

<style scoped lang="less">
.login {
	position: fixed;
	top: 0;
	left: 0;
	z-index: 99;
	width: var(--vw);
	height: var(--vh);

	.dimmer {
		backdrop-filter: blur(10px);
		background: rgba(0, 0, 0, 0.75);
		position: absolute;
		top: 0;
		left: 0;
		width: var(--vw);
		height: var(--vh);
	}

	.holder {
		.center();
		pointer-events: all;
		transform-origin: center center;
		position: absolute;
		display: flex;
		flex-direction: column;
		gap: 1em;
		width: 380px;
		z-index: 1;
		color: var(--color-text);
		background-color: var(--background-color-secondary);
		padding: 0.5em;
		box-shadow: 0px 0px 10px 2px rgba(0, 0, 0, 0.5);
		border-radius: 0.5em;
		overflow-y: auto;
		max-width: var(--vw);

		.beta {
			position: absolute;
			top: 10px;
			left: -50px;
			font-weight: bold;
			background-color: var(--color-secondary);
			color: var(--color-light);
			padding: 5px 50px;
			border-radius: 10px;
			text-transform: uppercase;
			font-size: 18px;
			transform: rotate(-45deg);
		}

		& > .head {
			margin-bottom: 0;
			padding: 0;
			padding-top: 20px;
			width: 200px;
			margin: auto;
			.icon {
				height: 50px;
			}
		}

		.content {
			text-align: center;
			display: flex;
			flex-direction: column;
			gap: 1em;
			align-items: center;
			flex-grow: 1;
			justify-content: center;

			&.betaWarn {
				.head {
					border-radius: var(--border-radius);
					color: var(--color-text);
					.icon {
						height: 2em;
						margin-bottom: 0.5em;
					}
				}
				.migrate {
					display: flex;
					flex-direction: column;
					gap: 0.5em;
					padding: 1em;
					background-color: var(--color-secondary);
					border-radius: var(--border-radius);
					color: var(--color-light);
					.icon {
						height: 2em;
						margin: auto;
					}
					.envs {
						display: table;
						border-spacing: 2px;
						.env {
							display: table-row;
							div {
								display: table-cell;
								&:not(.noBorder) {
									padding: 5px;
									// border: 1px solid var(--color-light);
									.bevel();
									background-color: rgba(0, 0, 0, 0.25);
									border-radius: 4px;
								}
								&:first-child {
									font-weight: bold;
									text-align: right;
								}
							}
						}
					}
				}
			}

			.description {
				min-width: 250px;
			}
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
}

@media only screen and (max-width: 600px) {
	.login {
		.holder {
			top: 0;
			left: 0;
			transform: unset;
			width: var(--vw);
			height: var(--vh);
			min-height: var(--vh);
		}
	}
}
</style>
