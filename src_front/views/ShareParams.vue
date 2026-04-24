<template>
	<div :class="classes">
		<div class="dimmer" ref="dimmer" @click="close()"></div>

		<div class="holder" ref="holder">
			<div class="head">
				<span class="title">{{ t("shareParams.title") }}</span>
				<ClearButton @click="close()" />
			</div>

			<div class="content success" v-if="success">
				<Icon name="checkmark" />
				<i18n-t tag="div" scope="global" keypath="shareParams.success">
					<template #USER>
						<Icon name="loader" v-if="!remoteUser" />
						<strong v-else>"{{ remoteUser.display_name }}"</strong>
					</template>
				</i18n-t>
				<TTButton @click="reload()" icon="refresh" light primary>{{
					t("shareParams.reloadBt")
				}}</TTButton>
			</div>

			<div class="content error" v-else-if="wrongAccount">
				<Icon name="alert" />
				<i18n-t tag="div" scope="global" keypath="shareParams.wrongAccount"> </i18n-t>
				<img
					v-if="$i18n.locale == 'fr'"
					src="@/assets/img/data_sharing/switchAccount_fr.png"
					alt="tutorial"
				/>
				<img v-else src="@/assets/img/data_sharing/switchAccount_en.png" alt="tutorial" />
				<TTButton @click="close()" light alert>{{ t("global.close") }}</TTButton>
			</div>

			<div class="content error" v-else-if="error">
				<Icon name="alert" />
				<div v-if="errorDetails">{{ errorDetails }}</div>
				<div v-else>{{ t("shareParams.error") }}</div>
				<TTButton @click="close()" light alert>{{ t("global.close") }}</TTButton>
			</div>

			<div class="content" v-else>
				<i18n-t tag="div" scope="global" keypath="shareParams.description">
					<template #REMOTE_USER>
						<Icon name="loader" v-if="!remoteUser" />
						<strong v-else>"{{ remoteUser.display_name }}"</strong>
					</template>
					<template #CURRENT_USER>
						<strong>"{{ storeAuth.twitch.user.displayNameOriginal }}"</strong>
					</template>
				</i18n-t>
				<div class="ctas">
					<TTButton icon="cross" @click="close()" :loading="confirming" alert>{{
						t("global.cancel")
					}}</TTButton>
					<TTButton icon="checkmark" @click="confirm()" :loading="confirming" primary>{{
						t("shareParams.agreeBt")
					}}</TTButton>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import ClearButton from "@/components/ClearButton.vue";
import Icon from "@/components/Icon.vue";
import TTButton from "@/components/TTButton.vue";
import DataStore from "@/store/DataStore";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeMain as useStoreMain } from "@/store/storeMain";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import ApiHelper from "@/utils/ApiHelper";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { gsap } from "gsap";
import { computed, nextTick, onBeforeMount, onMounted, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";

const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();
const storeMain = useStoreMain();
const storeAuth = useStoreAuth();

const holder = useTemplateRef<HTMLElement>("holder");
const dimmer = useTemplateRef<HTMLElement>("dimmer");

const error = ref<boolean>(false);
const success = ref<boolean>(false);
const errorDetails = ref<string>("");
const confirming = ref<boolean>(false);
const wrongAccount = ref<boolean>(false);
const remoteUser = ref<TwitchDataTypes.UserInfo | null>(null);

let csrfToken: string = "";

const classes = computed<string[]>(() => {
	const res: string[] = ["shareparams", "modal"];
	if (error.value) res.push("error");
	if (success.value) res.push("success");
	if (wrongAccount.value) res.push("secondary");
	return res;
});

onBeforeMount(async () => {
	const data = storeMain.tempStoreValue as { uid: string; csrf: string } | undefined;
	if (data && data.uid && data.csrf) {
		if (data.uid == storeAuth.twitch.user.id) {
			wrongAccount.value = true;
		} else {
			csrfToken = data.csrf;
			const res = await TwitchUtils.getUserInfo([data.uid]);
			if (res && res.length > 0) {
				remoteUser.value = res[0]!;
			}
		}
	}
});

onMounted(() => {
	open();
});

async function open(): Promise<void> {
	await nextTick();
	gsap.set(holder.value!, { marginTop: 0, opacity: 1 });
	gsap.to(dimmer.value!, { duration: 0.25, opacity: 1 });
	gsap.from(holder.value!, {
		duration: 0.25,
		marginTop: -100,
		opacity: 0,
		ease: "back.out",
	});
}

async function close(): Promise<void> {
	if (success.value) return;
	if (confirming.value) return;

	gsap.killTweensOf([holder.value, dimmer.value]);
	gsap.to(dimmer.value!, { duration: 0.25, opacity: 0, ease: "sine.in" });
	gsap.to(holder.value!, {
		duration: 0.25,
		marginTop: -100,
		opacity: 0,
		ease: "back.in",
		onComplete: () => {
			emit("close");
		},
	});
}

async function confirm(): Promise<void> {
	error.value = false;
	confirming.value = true;
	errorDetails.value = "";
	const res = await ApiHelper.call("auth/validateDataShare", "POST", {
		token: csrfToken,
	});
	if (res.status == 200 && res.json.success === true) {
		success.value = true;
	} else {
		switch (res.json.errorCode) {
			case "CROSS_LINK":
				errorDetails.value = t("shareParams.error_cross_link");
				break;
			case "INVALID_CSRF":
				errorDetails.value = t("shareParams.error_csrf");
				break;
		}
		error.value = true;
	}
	confirming.value = false;
}

function reload(): void {
	DataStore.clear(true);
	document.location.reload();
}
</script>

<style scoped lang="less">
.shareparams {
	&.error,
	&.success,
	&.secondary {
		.holder {
			color: var(--color-light);
			background-color: var(--color-alert);
			line-height: 1.5em;
			.content {
				align-items: center;
				strong {
					color: var(--color-light);
				}
			}
		}
		.clearbutton {
			color: var(--color-light);
		}
	}

	&.success .holder {
		background-color: var(--color-primary);
	}

	&.secondary .holder {
		background-color: var(--color-secondary-dark);
	}

	.holder {
		line-height: 1.2em;
		width: 600px;
		height: fit-content;
		max-width: 600px;
		max-height: var(--vh);
	}

	.content {
		gap: 1em;
		display: flex;
		flex-direction: column;
		white-space: pre-line;
		strong {
			color: var(--color-secondary);
		}
		.ctas {
			gap: 1em;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			align-self: center;
		}

		.icon {
			height: 1.5em;
		}

		&.success,
		&.error {
			gap: 0.5em;
			text-align: center;
			& > .icon {
				height: 3em;
			}
		}
	}
}
</style>
