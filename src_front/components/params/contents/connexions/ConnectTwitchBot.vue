<template>
	<div class="connecttwitchbot parameterContent">
		<Icon name="twitch" alt="twitchbot icon" class="icon" />

		<div class="head">
			<i18n-t scope="global" tag="span" keypath="twitch_bot.header">
				<template #LINK>
					<a href="https://twitchbot.com/" target="_blank"
						><Icon name="newtab" />TwitchBot</a
					>
				</template>
			</i18n-t>
		</div>

		<section v-if="!storeTwitchBot.connected">
			<TTButton
				@click="storeTwitchBot.startAuthFlow($event)"
				icon="twitch"
				:loading="storeTwitchBot.connecting"
				>{{ t("global.connect") }}</TTButton
			>
			<div class="card-item alert error" v-if="error" @click="error = false">
				{{ t("error.twitch_bot_connect_failed") }}
			</div>
		</section>

		<section v-if="!storeTwitchBot.connected" class="card-item authHint">
			<p><Icon name="info" />{{ t("twitch_bot.auth_hint") }}</p>
			<img
				v-if="locale == 'fr'"
				src="@/assets/img/data_sharing/switchAccount_fr.png"
				alt="tutorial"
			/>
			<img v-else src="@/assets/img/data_sharing/switchAccount_en.png" alt="tutorial" />
		</section>

		<section v-if="storeTwitchBot.connected">
			<TTButton alert @click="storeTwitchBot.disconnect()"
				>{{ t("global.disconnect") }} - {{ storeTwitchBot.userInfos?.login }}</TTButton
			>
		</section>

		<section v-if="storeTwitchBot.connected && missingRole" class="card-item secondary info">
			<span><Icon name="info" />{{ t("twitch_bot.hints") }}</span>
			<TTButton icon="mod" @click="addMod()" :loading="loadingRole" secondary light>{{
				t("twitch_bot.add_modBt")
			}}</TTButton>
			<TTButton icon="mod" @click="addVip()" :loading="loadingRole" secondary light>{{
				t("twitch_bot.add_vipBt")
			}}</TTButton>
		</section>
	</div>
</template>

<script setup lang="ts">
import TTButton from "@/components/TTButton.vue";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeTwitchBot as useStoreTwitchBot } from "@/store/twitchbot/storeTwitchBot";
import { storeUsers as useStoreUsers } from "@/store/users/storeUsers";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

const { t, locale } = useI18n();
const storeAuth = useStoreAuth();
const storeTwitchBot = useStoreTwitchBot();
const storeUsers = useStoreUsers();

const error = ref(false);
const missingRole = ref(false);
const loadingRole = ref(false);

onMounted(() => {
	checkRoles();
});

async function addMod(): Promise<void> {
	loadingRole.value = true;
	const chanId = storeAuth.twitch.user.id;
	storeUsers.getUserFrom(
		"twitch",
		chanId,
		storeTwitchBot.userInfos?.user_id,
		storeTwitchBot.userInfos?.login,
		undefined,
		async (user) => {
			if (await TwitchUtils.addRemoveModerator(false, chanId, user)) {
				user.channelInfo[chanId]!.is_moderator = true;
			}
			checkRoles();
		},
	);
}

async function addVip(): Promise<void> {
	loadingRole.value = true;
	const chanId = storeAuth.twitch.user.id;
	storeUsers.getUserFrom(
		"twitch",
		chanId,
		storeTwitchBot.userInfos?.user_id,
		storeTwitchBot.userInfos?.login,
		undefined,
		async (user) => {
			if (await TwitchUtils.addRemoveVIP(false, chanId, user)) {
				user.channelInfo[chanId]!.is_vip = true;
			}
			checkRoles();
		},
	);
}

function checkRoles(): void {
	loadingRole.value = true;
	const chanId = storeAuth.twitch.user.id;
	storeUsers.getUserFrom(
		"twitch",
		chanId,
		storeTwitchBot.userInfos?.user_id,
		storeTwitchBot.userInfos?.login,
		undefined,
		async (user) => {
			if (
				!user.channelInfo[chanId]!.is_broadcaster &&
				!user.channelInfo[chanId]!.is_vip &&
				!user.channelInfo[chanId]!.is_moderator
			) {
				missingRole.value = true;
			} else {
				missingRole.value = false;
			}
			loadingRole.value = false;
		},
	);
}
</script>

<style scoped lang="less">
.connecttwitchbot {
	.error {
		cursor: pointer;
		line-height: 1.2em;
		text-align: center;
		white-space: pre-line;
	}

	.info {
		max-width: 300px;
		.icon {
			height: 1em;
			margin-right: 0.5em;
		}
	}

	.authHint {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1em;
		max-width: 300px;

		.icon {
			height: 1em;
			margin-right: 0.25em;
		}
	}
}
</style>
