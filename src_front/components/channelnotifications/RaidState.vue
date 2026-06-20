<template>
	<div class="raidstate gameStateWindow" v-if="user">
		<div class="head" v-stickyTopShadow>
			<div class="subHolder">
				<h1 class="title">
					<icon name="raid" />
					{{ raidInfo.user.displayName }}

					<img :src="user.avatarPath" alt="avatar" class="avatar" />

					<img
						v-if="!isOwnRaid && remoteChan && !remoteChan.temporary"
						:src="remoteChan.avatarPath"
						alt="avatar"
						class="avatar mini"
						v-tooltip="remoteChan.displayName"
						referrerpolicy="no-referrer"
					/>
				</h1>
				<div class="roomInfo">
					<mark
						class="viewerCount"
						@click="censorCount = !censorCount"
						v-tooltip="$t('raid.viewers')"
					>
						<icon name="show" />
						<span v-if="!censorCount">{{ raidInfo.viewerCount }}</span>
						<span v-else class="censored">{{ raidInfo.viewerCount }}</span>
					</mark>
					<mark v-if="roomSettings?.subOnly == true"
						><icon name="sub" />{{ $t("raid.sub_only") }}</mark
					>
					<mark v-if="roomSettings?.followOnly == true"
						><icon name="follow" />{{ $t("raid.follower_only") }}</mark
					>
					<mark v-if="roomSettings?.emotesOnly == true"
						><icon name="emote" />{{ $t("raid.emote_only") }}</mark
					>
				</div>
			</div>

			<ProgressBar
				secondary
				v-if="timerPercent < 1"
				:percent="timerPercent"
				:duration="raidInfo.timerDuration_s * 1000"
			/>

			<slot />
		</div>

		<div class="body" v-if="loading">
			<icon name="loader" />
		</div>

		<div class="body" v-else>
			<div class="actions">
				<TTButton
					icon="cross"
					alert
					@click="cancelRaid()"
					v-if="isOwnRaid"
					:loading="canceling"
					v-tooltip="$t('raid.cancel_raid')"
				/>
				<TTButton
					light
					@click="remoteConnect()"
					v-if="canRemoteConnect"
					:loading="remoteConnecting"
					icon="offline"
					v-tooltip="$t('raid.remote_chat', { USER: user!.displayNameOriginal })"
				/>
				<TTButton
					light
					@click="spamLink()"
					v-if="isOwnRaid"
					:loading="coolingDownSpam"
					icon="whispers"
					v-tooltip="$t('raid.spam_linkBt')"
				/>
				<TTButton
					light
					@click="openSummary()"
					v-if="isOwnRaid"
					icon="poll"
					v-tooltip="$t('raid.stream_summaryBt')"
				/>
			</div>

			<div class="card-item infos" v-if="!isModeratedChan && raidingLatestRaid">
				<Icon name="info" />{{ $t("raid.target_channel_previous_raid") }}
			</div>

			<div class="card-item infos alert" v-if="targetChannelOffline">
				<Icon name="alert" />{{ $t("raid.target_channel_offline") }}
			</div>

			<ToggleBlock
				class="bannedAlert"
				v-if="(isModeratedChan && bannedOnline.length > 0) || timedoutOnline.length > 0"
				alert
				medium
				:open="false"
				:title="
					$t(
						'raid.banned_users_title',
						{ COUNT: bannedOnline.length + timedoutOnline.length },
						bannedOnline.length + timedoutOnline.length,
					)
				"
			>
				<template #left_actions>
					<Icon name="alert" class="icon" />
				</template>
				<i18n-t scope="global" tag="div" keypath="raid.banned_users" class="head">
					<template #USER>
						<strong>{{ raidInfo.user.displayName }}</strong>
					</template>
				</i18n-t>
				<ul class="list">
					<li class="user" v-for="(u, index) in bannedOnline" :key="index + u.id">
						<Icon name="ban" v-tooltip="'Ban'" />
						<a
							:href="'https://twitch.tv/' + u.login"
							target="_blank"
							@click.stop.prevent="openUserCard(u)"
							class="login"
							>{{ u.login }}</a
						>
					</li>
					<li class="user" v-for="(u, index) in timedoutOnline" :key="index + u.id">
						<Icon name="timeout" v-tooltip="'Timeout'" />
						<a
							:href="'https://twitch.tv/' + u.login"
							target="_blank"
							@click.stop.prevent="openUserCard(u)"
							class="login"
							>{{ u.login }}</a
						>
						<span class="duration">({{ getBanDuration(u) }})</span>
					</li>
				</ul>
				<div class="actions">
					<TTButton ref="copyBt" icon="copy" alert @click="copybannedUsers()">{{
						$t("raid.copy_logins")
					}}</TTButton>
				</div>
			</ToggleBlock>

			<div class="card-item infos" v-if="isOwnRaid">
				{{ $t("raid.cant_force", { TIMER: timeLeft }) }}
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import MessengerProxy from "@/messaging/MessengerProxy";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import Utils from "@/utils/Utils";
import { gsap } from "gsap";
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, type ComponentPublicInstance } from "vue";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { storeStream as useStoreStream } from "@/store/stream/storeStream";
import { storeUsers as useStoreUsers } from "@/store/users/storeUsers";
import ToggleBlock from "../ToggleBlock.vue";
import TTButton from "../TTButton.vue";
import ProgressBar from "../ProgressBar.vue";

const storeAuth = useStoreAuth();
const storeParams = useStoreParams();
const storeStream = useStoreStream();
const storeUsers = useStoreUsers();

const timeLeft = ref("");
const loading = ref(false);
const isOwnRaid = ref(false);
const canceling = ref(false);
const censorCount = ref(false);
const canRemoteConnect = ref(false);
const remoteConnecting = ref(false);
const coolingDownSpam = ref(false);
const raidingLatestRaid = ref(false);
const targetChannelOffline = ref(false);
const user = ref<TwitchatDataTypes.TwitchatUser | null>(null);
const remoteChan = ref<TwitchatDataTypes.TwitchatUser | null>(null);
const bannedOnline = ref<TwitchatDataTypes.TwitchatUser[]>([]);
const timedoutOnline = ref<TwitchatDataTypes.TwitchatUser[]>([]);
const roomSettings = ref<TwitchatDataTypes.IRoomSettings | null>(null);
const timerPercent = ref<number>(0);

const copyBt = useTemplateRef<ComponentPublicInstance>("copyBt");

let timerInterval: number = -1;

const raidInfo = computed(() => storeStream.currentRaid!);

const isModeratedChan = computed(() => {
	if (!user.value) return false;
	const chaninfo = storeAuth.twitch.user.channelInfo[user.value.id];
	if (!chaninfo) return false;
	return chaninfo.is_broadcaster || chaninfo.is_moderator;
});

function getBanDuration(user: TwitchatDataTypes.TwitchatUser): string {
	const chanInfo = user.channelInfo[storeAuth.twitch.user.id];
	if (!chanInfo || !chanInfo.banEndDate) return "???";
	const remaining = chanInfo.banEndDate! - Date.now();
	return Utils.formatDuration(remaining) + "s";
}

function updateTimer(): void {
	const seconds = raidInfo.value.timerDuration_s * 1000 - (Date.now() - raidInfo.value.startedAt);
	if (seconds <= 0) {
		storeStream.onRaidComplete();
		return;
	}
	timeLeft.value = Utils.formatDuration(seconds);
	timerPercent.value = 1 - seconds / (raidInfo.value.timerDuration_s * 1000);
}

async function cancelRaid(): Promise<void> {
	canceling.value = true;
	await TwitchUtils.raidCancel();
	await Utils.promisedTimeout(500);
	canceling.value = false;
}

async function spamLink(): Promise<void> {
	coolingDownSpam.value = true;
	for (let i = 0; i < 10; i++) {
		MessengerProxy.instance.sendMessage("https://twitch.tv/" + raidInfo.value.user.login, [
			"twitch",
		]);
		await Utils.promisedTimeout(50);
	}
	await Utils.promisedTimeout(1000);
	coolingDownSpam.value = false;
}

function openSummary(): void {
	storeParams.openModal("streamSummary");
}

function openUserCard(u: TwitchatDataTypes.TwitchatUser): void {
	storeUsers.openUserCard(u);
}

function copybannedUsers(): void {
	const list = bannedOnline.value.concat().concat(timedoutOnline.value);
	Utils.copyToClipboard(list.map((v) => v.login).join(", "));
	const bt = copyBt.value!;
	gsap.fromTo(bt.$el, { filter: "brightness(3)" }, { filter: "brightness(1)", duration: 0.25 });
}

/**
 * Connect to raided chat
 */
function remoteConnect(): void {
	remoteConnecting.value = true;
	storeStream.connectToExtraChan(user.value!);
	window.setTimeout(() => {
		canRemoteConnect.value = false;
	}, 500);
}

onMounted(async () => {
	updateTimer();
	timerInterval = window.setInterval(() => {
		updateTimer();
	}, 250);

	censorCount.value = storeParams.appearance.showViewersCount.value !== true;

	canRemoteConnect.value =
		storeStream.connectedTwitchChans.findIndex((v) => v.user.id === raidInfo.value.user.id) ==
		-1;

	const raid = storeStream.currentRaid;
	if (raid) {
		loading.value = true;
		user.value = raid.user;
		roomSettings.value = await TwitchUtils.getRoomSettings(user.value.id);
		const liveInfos = await TwitchUtils.getCurrentStreamInfo([user.value.id]);
		targetChannelOffline.value = liveInfos.length == 0;
		const latestRaid = (storeStream.raidHistory || []).slice(-1)[0]!;
		raidingLatestRaid.value = latestRaid && latestRaid.uid === raid.user.id;
		isOwnRaid.value = storeAuth.twitch.user.id == raid.channel_id;
		if (!isOwnRaid.value) {
			remoteChan.value = await storeUsers.getUserFrom(
				"twitch",
				storeAuth.twitch.user.id,
				raid.channel_id,
			);
		}
		loading.value = false;
	}

	const userlist = storeUsers.users;
	const me = storeAuth.twitch.user;
	const bannedOnlineList: TwitchatDataTypes.TwitchatUser[] = [];
	const timedoutOnlineList: TwitchatDataTypes.TwitchatUser[] = [];
	//Check for banned and timedout users still connected to the chat
	for (const u of userlist) {
		//User online?
		if (u.platform === "twitch") {
			if (u.channelInfo[me.id]?.is_banned === true) {
				if (u.channelInfo[me.id]?.banEndDate != undefined) {
					//User timedout
					if (u.channelInfo[me.id]?.online === true) timedoutOnlineList.push(u);
				} else if (u.channelInfo[me.id]?.lastActivityDate) {
					//User perma ban
					bannedOnlineList.push(u);
				}
			}
		}
	}
	/* Add fake banned users
	let u = this.$store.users.getUserFrom("twitch", me.id, "2521956","marinelepen","marinelepen");
	u.channelInfo[me.id].online = true;
	u.channelInfo[me.id].is_banned = true;
	u.channelInfo[me.id].lastActivityDate = Date.now();
	u.channelInfo[me.id].banEndDate = Date.now() + (Math.random()*20*60*1000);
	timedoutOnline.push(u);
	u = this.$store.users.getUserFrom("twitch", me.id, "441488346","jordanbardella","jordanbardella");
	u.channelInfo[me.id].online = true;
	u.channelInfo[me.id].is_banned = true;
	u.channelInfo[me.id].lastActivityDate = Date.now();
	bannedOnline.push(u);
	//*/

	bannedOnline.value = bannedOnlineList;
	timedoutOnline.value = timedoutOnlineList;
});

onBeforeUnmount(() => {
	clearInterval(timerInterval);
});
</script>

<style scoped lang="less">
.raidstate {
	.subHolder {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5em;
		flex-wrap: wrap;

		.viewerCount {
			cursor: pointer;
			.censored {
				filter: blur(5px);
			}
		}

		mark {
			display: flex;
			flex-direction: row;
			align-items: center;
			background-color: rgba(0, 0, 0, 0.25);

			.icon {
				height: 1em;
				margin-right: 0.25em;
			}
		}

		.roomInfo {
			display: flex;
			flex-direction: row;
			align-items: center;
			flex-wrap: wrap;
			gap: 0.25em;

			mark {
				padding: 0.2em 0.5em;
				font-size: 0.8em;
			}
			& > mark {
				flex-shrink: 0;
			}
		}
	}

	.avatar {
		border-radius: 50%;
	}

	.timer {
		font-variant-numeric: tabular-nums;
	}

	.startBt {
		pointer-events: none;
	}

	.infos {
		font-size: 0.9em;
		flex-shrink: 0;
		text-align: center;
		.icon {
			height: 1em;
			margin-right: 0.25em;
		}

		&:not(.alert) {
			font-style: italic;
			background-color: rgba(0, 0, 0, 0.25);
		}
	}

	.roomSettings {
		gap: 0.5em;
		display: flex;
		flex-wrap: wrap;
		flex-direction: row;
		margin-top: 0.25em;
		mark {
			background-color: rgba(0, 0, 0, 0.25);
			padding: 0.2em 0.5em;
		}
	}

	.bannedAlert {
		.icon {
			height: 1em;
			margin-left: 0.5em;
		}
		.list {
			font-size: 0.8em;
			max-height: 200px;
			overflow: auto;
			.user {
				display: flex;
				flex-direction: row;
				align-items: center;
				margin-top: 0.5em;
				img {
					height: 1em;
					margin-right: 0.5em;
					vertical-align: middle;
				}
				.login {
					color: var(--color-light);
					text-decoration: none;
					&:hover {
						text-decoration: underline;
					}
				}
				.duration {
					margin-left: 0.5em;
					font-size: 0.8em;
					font-style: italic;
				}
			}
		}
		.actions {
			margin-top: 0.5em;
		}
	}
}
</style>
