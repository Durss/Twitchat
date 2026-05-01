<template>
	<div class="connectpatreon parameterContent">
		<Icon name="patreon" alt="patreon icon" class="icon" />

		<div class="head">
			<i18n-t scope="global" tag="span" keypath="patreon.header">
				<template #LINK>
					<a href="https://patreon.com/" target="_blank"><Icon name="newtab" />Patreon</a>
				</template>
			</i18n-t>
		</div>

		<ProfileInfoCard
			v-if="storePatreon.connected"
			:avatar="storePatreon.userAvatar"
			:name="storePatreon.userName"
			:url="storePatreon.userUrl"
			@logout="
				storePatreon.disconnect();
				loadAuthURL();
			"
		/>

		<section v-if="!storeAuth.isPremium">
			<TTButton icon="premium" @click="openPremium()" premium big>{{
				t("premium.become_premiumBt")
			}}</TTButton>
		</section>

		<section v-else-if="storeAuth.isPremium && !storePatreon.connected">
			<TTButton
				type="link"
				:href="oAuthURL"
				target="_self"
				:loading="loading"
				icon="newtab"
				>{{ t("global.connect") }}</TTButton
			>
			<div class="card-item alert error" v-if="error" @click="error = false">
				{{ t("error.patreon_connect_failed") }}
			</div>
		</section>

		<section class="examples">
			<h2><Icon name="whispers" />{{ t("streamelements.examples") }}</h2>
			<Icon name="loader" v-if="!fakeMember" />
			<MessageItem v-else="fakeMember" :messageData="fakeMember" />
		</section>
	</div>
</template>

<script setup lang="ts">
import MessageItem from "@/components/messages/MessageItem.vue";
import TTButton from "@/components/TTButton.vue";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeDebug as useStoreDebug } from "@/store/debug/storeDebug";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { storePatreon as useStorePatreon } from "@/store/patreon/storePatreon";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import ProfileInfoCard from "../ProfileInfoCard.vue";

const { t } = useI18n();
const storeAuth = useStoreAuth();
const storeDebug = useStoreDebug();
const storeParams = useStoreParams();
const storePatreon = useStorePatreon();

const error = ref(false);
const loading = ref(false);
const oAuthURL = ref("");
const fakeMember = ref<TwitchatDataTypes.PatreonNewMemberData | undefined>(undefined);

onMounted(async () => {
	if (storePatreon.oauthFlowParams) {
		loading.value = true;
		if (!(await storePatreon.completeOAuthFlow())) {
			await loadAuthURL();
		} else {
			loading.value = false;
		}
	} else {
		await loadAuthURL();
	}
	storeDebug.simulateMessage<TwitchatDataTypes.PatreonNewMemberData>(
		TwitchatDataTypes.TwitchatMessageType.PATREON,
		(mess) => {
			mess.eventType = "new_member";
			fakeMember.value = mess;
		},
		false,
	);
});

function openPremium(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
}

async function loadAuthURL(): Promise<void> {
	loading.value = true;
	oAuthURL.value = await storePatreon.getOAuthURL();
	loading.value = false;
}
</script>

<style scoped lang="less">
.connectpatreon {
	.error {
		cursor: pointer;
		line-height: 1.2em;
		text-align: center;
		white-space: pre-line;
	}

	.examples {
		.icon {
			height: 1em;
			margin-right: 0.5em;
			vertical-align: middle;
		}
		.chatMessage {
			font-size: 1em;
		}
	}

	.beta {
		white-space: pre-line;
		.button {
			margin-top: 0.5em;
		}
	}

	.info {
		.icon {
			height: 1em;
			margin-right: 0.25em;
		}
		i {
			font-size: 0.8em;
			text-align: center;
		}
	}
}
</style>
