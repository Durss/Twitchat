<template>
	<div class="streamsummary sidePanel" ref="rootEl">
		<div class="head">
			<ClearButton @click="close" />
			<h1 class="title"><Icon name="broadcast" />{{ t("summary.title") }}</h1>
			<div class="description" v-if="streamDuration">
				{{ t("summary.stream_duration") }} {{ streamDuration }}
			</div>
		</div>

		<div class="content" ref="content">
			<Icon class="spinner" name="loader" v-if="loading" />

			<template v-else>
				<div class="noData" v-if="noData">{{ t("summary.no_data") }}</div>
				<template v-else>
					<div class="card-item global">
						<div class="list">
							<div
								class="data card-item"
								v-tooltip="t('summary.data_subPrime')"
								v-if="subPrimeCount > 0"
							>
								<Icon name="prime" />{{ subPrimeCount }}
							</div>
							<div
								class="data card-item"
								v-tooltip="t('summary.data_subT1')"
								v-if="subT1Count > 0"
							>
								<Icon name="sub" /><small>T1</small>{{ subT1Count }}
							</div>
							<div
								class="data card-item"
								v-tooltip="t('summary.data_subT2')"
								v-if="subT2Count > 0"
							>
								<Icon name="sub" /><small>T2</small>{{ subT2Count }}
							</div>
							<div
								class="data card-item"
								v-tooltip="t('summary.data_subT3')"
								v-if="subT3Count > 0"
							>
								<Icon name="sub" /><small>T3</small>{{ subT3Count }}
							</div>
							<div
								class="data card-item"
								v-tooltip="t('summary.data_subgift')"
								v-if="subgiftCount > 0"
							>
								<Icon name="gift" />{{ subgiftCount }}
							</div>
							<div
								class="data card-item"
								v-tooltip="t('summary.data_bits')"
								v-if="bitsCount > 0"
							>
								<Icon name="bits" />{{ bitsCount }}
							</div>
							<div
								class="data card-item"
								v-tooltip="t('summary.data_hypeChat')"
								v-if="hypeChatCount > 0"
							>
								<Icon name="hypeChat" />{{ hypeChatCount }}
								<small class="data" v-for="(amount, key) in hypeChats"
									>{{ amount }} {{ key }}</small
								>
							</div>
							<div
								class="data card-item"
								v-tooltip="t('summary.data_hypeTrain')"
								v-if="hypeTrainCount > 0"
							>
								<Icon name="train" />{{ hypeTrainCount }}
							</div>
							<div class="data card-item" v-if="raidCount > 0">
								<span v-tooltip="t('summary.data_raid')"
									><Icon name="raid" />{{ raidCount }}</span
								><small class="data" v-tooltip="t('summary.data_raider')"
									><Icon name="user" />{{ raidViewerCount }}</small
								>
							</div>
							<div
								class="data card-item"
								v-tooltip="t('summary.data_follow')"
								v-if="followCount > 0"
							>
								<Icon name="follow" />{{ followCount }}
							</div>
							<div
								class="data card-item"
								v-tooltip="t('summary.data_messages')"
								v-if="messCount > 0"
							>
								<Icon name="whispers" />{{ messCount }}
							</div>
							<div
								class="data card-item"
								v-tooltip="t('summary.data_emotes')"
								v-if="emoteCount > 0"
							>
								<Icon name="emote" />{{ emoteCount }}
							</div>
							<div
								class="data card-item"
								v-tooltip="t('summary.data_chars')"
								v-if="charCount > 0"
							>
								<Icon name="font" />{{ charCount }}
							</div>
							<div
								class="data card-item"
								v-tooltip="t('summary.data_chatters')"
								v-if="chatterCount > 0"
							>
								<Icon name="user" />{{ chatterCount }}
							</div>
							<div
								class="data card-item"
								v-tooltip="t('summary.data_outShoutout')"
								v-if="outShoutout > 0"
							>
								<Icon name="shoutout" />{{ outShoutout }}
							</div>
							<div
								class="data card-item"
								v-tooltip="t('summary.data_inShoutout')"
								v-if="inShoutout > 0"
							>
								<Icon name="shoutout" class="flip" />{{ inShoutout }}
							</div>
							<div
								class="data card-item"
								v-tooltip="t('summary.data_rewards')"
								v-if="rewardCount > 0"
							>
								<Icon name="channelPoints" />{{ rewardCount }}
							</div>
							<div
								class="data card-item"
								v-tooltip="t('summary.data_channelPointCount')"
								v-if="channelPointCount > 0"
							>
								<Icon name="channelPoints" />{{ channelPointCount }}pts
							</div>
							<div
								class="data card-item"
								v-tooltip="t('summary.data_bans')"
								v-if="banUserCount > 0"
							>
								<Icon name="ban" />{{ banUserCount }}
							</div>
							<div
								class="data card-item"
								v-tooltip="t('summary.data_tos')"
								v-if="toUserCount > 0"
							>
								<Icon name="timer" />{{ toUserCount }}
							</div>
							<div
								class="data card-item"
								v-tooltip="t('summary.data_tosDuration')"
								v-if="toDuration > 0"
							>
								<Icon name="timer" />{{ toDuration }}s
							</div>
							<div
								class="data card-item"
								v-tooltip="t('summary.data_poll')"
								v-if="pollCount > 0"
							>
								<Icon name="poll" />{{ pollCount }}
							</div>
							<div
								class="data card-item"
								v-tooltip="t('summary.data_prediction')"
								v-if="predictionCount > 0"
							>
								<Icon name="prediction" />{{ predictionCount }}
							</div>
							<div
								class="data card-item"
								v-tooltip="t('summary.data_bingo')"
								v-if="bingoCount > 0"
							>
								<Icon name="bingo" />{{ bingoCount }}
							</div>
							<div
								class="data card-item"
								v-tooltip="t('summary.data_raffle')"
								v-if="raffleCount > 0"
							>
								<Icon name="ticket" />{{ raffleCount }}
							</div>
						</div>
						<div class="ctas">
							<TTButton icon="newtab" @click="exportCSV(true)">{{
								t("summary.csv_exportBt")
							}}</TTButton>
						</div>
					</div>

					<div class="card-item users">
						<div class="list">
							<div class="user card-item" v-for="u in userList" :key="u.user.id">
								<img
									class="avatar"
									loading="lazy"
									v-if="u.user.avatarPath"
									:src="u.user.avatarPath"
									alt="avatar"
								/>
								<a
									@click.prevent="openUserCard(u.user)"
									:href="'https://twitch.tv/' + u.user.login"
									class="login"
									>{{ u.user.displayName }}</a
								>
								<div
									class="data card-item"
									v-tooltip="t('summary.data_subPrime')"
									v-if="u.subPrime > 0"
								>
									<Icon name="prime" />{{ u.subPrime }}
								</div>
								<div
									class="data card-item"
									v-tooltip="t('summary.data_subT1')"
									v-if="u.subT1 > 0"
								>
									<Icon name="sub" /><small>T1</small>{{ u.subT1 }}
								</div>
								<div
									class="data card-item"
									v-tooltip="t('summary.data_subT2')"
									v-if="u.subT2 > 0"
								>
									<Icon name="sub" /><small>T2</small>{{ u.subT2 }}
								</div>
								<div
									class="data card-item"
									v-tooltip="t('summary.data_subT3')"
									v-if="u.subT3 > 0"
								>
									<Icon name="sub" /><small>T3</small>{{ u.subT3 }}
								</div>
								<div
									class="data card-item"
									v-tooltip="t('summary.data_subgift')"
									v-if="u.subgift > 0"
								>
									<Icon name="gift" />{{ u.subgift }}
								</div>
								<div
									class="data card-item"
									v-tooltip="t('summary.data_bits')"
									v-if="u.bits > 0"
								>
									<Icon name="bits" />{{ u.bits }}
								</div>
								<div
									class="data card-item"
									v-tooltip="t('summary.data_hypeChat')"
									v-if="u.hypeChatCount > 0"
								>
									<Icon name="hypeChat" />{{ u.hypeChatCount }}
									<small class="data" v-for="(amount, key) in u.hypeChats"
										>{{ amount }} {{ key }}</small
									>
								</div>
								<div class="data card-item" v-if="u.raidCount > 0">
									<span v-tooltip="t('summary.data_raid')"
										><Icon name="raid" />{{ u.raidCount }}</span
									><small class="data" v-tooltip="t('summary.data_raider')"
										><Icon name="user" />{{ u.raidViewerCount }}</small
									>
								</div>
								<div
									class="data card-item"
									v-tooltip="t('summary.data_messages')"
									v-if="u.messCount > 0"
								>
									<Icon name="whispers" />{{ u.messCount }}
								</div>
								<div
									class="data card-item"
									v-tooltip="t('summary.data_emotes')"
									v-if="u.emoteCount > 0"
								>
									<Icon name="emote" />{{ u.emoteCount }}
								</div>
								<div
									class="data card-item"
									v-tooltip="t('summary.data_chars')"
									v-if="u.charCount > 0"
								>
									<Icon name="font" />{{ u.charCount }}
								</div>
								<div
									class="data card-item"
									v-tooltip="t('summary.data_rewards')"
									v-if="u.rewards > 0"
								>
									<Icon name="channelPoints" />{{ u.rewards }}
								</div>
								<div
									class="data card-item"
									v-tooltip="t('summary.data_rewards')"
									v-if="u.channelPointCount > 0"
								>
									<Icon name="channelPoints" />{{ u.channelPointCount }}pts
								</div>
								<div
									class="data card-item"
									v-tooltip="t('summary.data_bans')"
									v-if="u.banUserCount > 0"
								>
									<Icon name="ban" />{{ u.banUserCount }}
								</div>
								<div
									class="data card-item"
									v-tooltip="t('summary.data_tos')"
									v-if="u.toUserCount > 0"
								>
									<Icon name="timer" />{{ u.toUserCount }}
								</div>
								<div
									class="data card-item"
									v-tooltip="t('summary.data_tosDuration')"
									v-if="u.toDuration > 0"
								>
									<Icon name="timer" />{{ u.toDuration }}s
								</div>
							</div>
						</div>
						<div class="ctas">
							<TTButton icon="newtab" @click="exportCSV()">{{
								t("summary.csv_exportBt")
							}}</TTButton>
						</div>
					</div>
				</template>
			</template>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useSidePanel } from "@/composables/useSidePanel";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeChat as useStoreChat } from "@/store/chat/storeChat";
import { storeUsers as useStoreUsers } from "@/store/users/storeUsers";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Config from "@/utils/Config";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import Utils from "@/utils/Utils";
import { onBeforeMount, onBeforeUnmount, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import ClearButton from "../ClearButton.vue";
import Icon from "../Icon.vue";
import TTButton from "../TTButton.vue";

interface UserActivities {
	user: TwitchatDataTypes.TwitchatUser;
	sortValue: number;
	messCount: number;
	charCount: number;
	emoteCount: number;
	subPrime: number;
	subT1: number;
	subT2: number;
	subT3: number;
	subgift: number;
	bits: number;
	rewards: number;
	channelPointCount: number;
	raidCount: number;
	raidViewerCount: number;
	hypeChatCount: number;
	hypeChats: { [key: string]: number };
	banUserCount: number;
	toUserCount: number;
	toDuration: number;
}

const emit = defineEmits<{
	close: [];
}>();

const { t } = useI18n();
const storeAuth = useStoreAuth();
const storeChat = useStoreChat();
const storeUsers = useStoreUsers();
const rootEl = useTemplateRef("rootEl");
const { close } = useSidePanel(rootEl, () => emit("close"));

const loading = ref(true);
const noData = ref(false);
const streamDuration = ref<string>("");
const messCount = ref(0);
const charCount = ref(0);
const emoteCount = ref(0);
const chatterCount = ref(0);
const subT1Count = ref(0);
const subT2Count = ref(0);
const subT3Count = ref(0);
const subPrimeCount = ref(0);
const subgiftCount = ref(0);
const bitsCount = ref(0);
const followCount = ref(0);
const rewardCount = ref(0);
const channelPointCount = ref(0);
const raidCount = ref(0);
const raidViewerCount = ref(0);
const hypeTrainCount = ref(0);
const pollCount = ref(0);
const predictionCount = ref(0);
const bingoCount = ref(0);
const raffleCount = ref(0);
const outShoutout = ref(0);
const inShoutout = ref(0);
const hypeChatCount = ref(0);
const banUserCount = ref(0);
const toUserCount = ref(0);
const toDuration = ref(0);
const hypeChats = ref<{ [key: string]: number }>({});
const userList = ref<UserActivities[]>([]);

let durationInterval: number = -1;

onBeforeMount(async () => {
	const res = await TwitchUtils.getCurrentStreamInfo([storeAuth.twitch.user.id]);
	let prevDate: number = 0;
	let dateOffset: number | null = null;
	if (res.length > 0) {
		dateOffset = new Date(res[0]!.started_at).getTime();

		durationInterval = window.setInterval(() => {
			streamDuration.value = Utils.formatDuration(Date.now() - dateOffset!);
		});
		// }else{
		// 	dateOffset = new Date("08/01/2023").getTime();//TODO comment
	}

	const userActivities: { [key: string]: UserActivities } = {};
	const messages = storeChat.messages;
	const userParsed: { [key: string]: boolean } = {};
	noData.value = true;

	for (let i = messages.length - 1; i >= 0; i--) {
		const m = messages[i]!;
		if (dateOffset && m.date < dateOffset) break;
		//If more than 4h past between the 2 messages, consider it's a different stream and stop there
		if (!dateOffset && prevDate > 0 && prevDate - m.date > 4 * 60 * 60000) {
			streamDuration.value = Utils.formatDuration(
				messages[messages.length - 1]!.date - m.date,
			);
			break;
		}
		prevDate = m.date;

		switch (m.type) {
			case TwitchatDataTypes.TwitchatMessageType.MESSAGE: {
				const uid = m.user.id;
				const emoteCnt = m.message_chunks.filter((v) => v.type == "emote").length;
				if (!userActivities[uid]) userActivities[uid] = getEmptyUserActivities(m.user);
				messCount.value++;
				charCount.value += m.message.length;
				emoteCount.value += emoteCnt;
				userActivities[uid].sortValue++;
				userActivities[uid].messCount++;
				userActivities[uid].charCount += m.message.length;
				userActivities[uid].emoteCount += emoteCnt;
				if (!userParsed[uid]) {
					chatterCount.value++;
					userParsed[uid] = true;
				}
				noData.value = false;
				break;
			}
			case TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION: {
				const uid = m.user.id;
				if (!userActivities[uid]) userActivities[uid] = getEmptyUserActivities(m.user);
				let count = 1;
				if (m.is_gift) {
					count = m.gift_count || 1;
					subgiftCount.value += count;
					userActivities[uid].subgift += count;
					userActivities[uid].sortValue +=
						(count || 1) * 250 * { 1: 1, 2: 2, 3: 3, prime: 1 }[m.tier || 1];
				}
				if (m.tier == "prime") {
					subPrimeCount.value += count;
					userActivities[uid].subPrime += count;
					userActivities[uid].sortValue += 250 * count;
				}
				if (m.tier == 1) {
					subT1Count.value += count;
					userActivities[uid].subT1 += count;
					userActivities[uid].sortValue += 250 * count;
				}
				if (m.tier == 2) {
					subT2Count.value += count;
					userActivities[uid].subT2 += count;
					userActivities[uid].sortValue += 2 * 250 * count;
				}
				if (m.tier == 3) {
					subT3Count.value += count;
					userActivities[uid].subT3 += count;
					userActivities[uid].sortValue += 3 * 250 * count;
				}
				noData.value = false;
				break;
			}
			case TwitchatDataTypes.TwitchatMessageType.CHEER: {
				const uid = m.user.id;
				if (!userActivities[uid]) userActivities[uid] = getEmptyUserActivities(m.user);
				bitsCount.value += m.bits;
				userActivities[uid].bits += m.bits;
				userActivities[uid].sortValue += m.bits;
				noData.value = false;
				break;
			}
			case TwitchatDataTypes.TwitchatMessageType.HYPE_CHAT: {
				const uid = m.message.user.id;
				if (!userActivities[uid])
					userActivities[uid] = getEmptyUserActivities(m.message.user);
				const hc = m.message.twitch_hypeChat!;
				if (!hypeChats.value[hc.currency]) hypeChats.value[hc.currency] = 0;
				hypeChats.value[hc.currency]! += hc.amount;
				hypeChatCount.value++;
				userActivities[uid].hypeChatCount++;
				if (!userActivities[uid].hypeChats[hc.currency])
					userActivities[uid].hypeChats[hc.currency] = 0;
				userActivities[uid].hypeChats[hc.currency]! += hc.amount;
				userActivities[uid].sortValue += Math.ceil(hc.amount / 4) * 250;
				noData.value = false;
				break;
			}
			case TwitchatDataTypes.TwitchatMessageType.RAID: {
				const uid = m.user.id;
				if (!userActivities[uid]) userActivities[uid] = getEmptyUserActivities(m.user);
				raidCount.value++;
				raidViewerCount.value += m.viewers;
				userActivities[uid].raidCount++;
				userActivities[uid].raidViewerCount += m.viewers;
				userActivities[uid].sortValue += m.viewers;
				noData.value = false;
				break;
			}
			case TwitchatDataTypes.TwitchatMessageType.FOLLOWING: {
				followCount.value++;
				noData.value = false;
				break;
			}
			case TwitchatDataTypes.TwitchatMessageType.REWARD: {
				const uid = m.user.id;
				if (!userActivities[uid]) userActivities[uid] = getEmptyUserActivities(m.user);
				rewardCount.value++;
				channelPointCount.value += m.reward.cost;
				userActivities[uid].rewards++;
				userActivities[uid].channelPointCount += m.reward.cost;
				userActivities[uid].sortValue += Math.round(m.reward.cost / 10);
				if (m.message) {
					const emoteCnt = m.message_chunks!.filter((v) => v.type == "emote").length;
					messCount.value++;
					charCount.value += m.message.length;
					emoteCount.value += emoteCnt;
					userActivities[uid].messCount++;
					userActivities[uid].charCount += m.message.length;
					userActivities[uid].emoteCount += emoteCnt;
				}
				noData.value = false;
				break;
			}
			case TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_SUMMARY: {
				hypeTrainCount.value++;
				noData.value = false;
				break;
			}
			case TwitchatDataTypes.TwitchatMessageType.POLL: {
				pollCount.value++;
				noData.value = false;
				break;
			}
			case TwitchatDataTypes.TwitchatMessageType.PREDICTION: {
				predictionCount.value++;
				noData.value = false;
				break;
			}
			case TwitchatDataTypes.TwitchatMessageType.BINGO: {
				bingoCount.value++;
				noData.value = false;
				break;
			}
			case TwitchatDataTypes.TwitchatMessageType.RAFFLE: {
				raffleCount.value++;
				noData.value = false;
				break;
			}
			case TwitchatDataTypes.TwitchatMessageType.BAN: {
				const uid = m.user.id;
				if (!userActivities[uid]) userActivities[uid] = getEmptyUserActivities(m.user);
				if (m.duration_s && m.duration_s > 0) {
					toUserCount.value++;
					toDuration.value += m.duration_s;
					userActivities[uid].toUserCount++;
					userActivities[uid].toDuration += m.duration_s;
				} else {
					banUserCount.value++;
					userActivities[uid].banUserCount++;
				}
				noData.value = false;
				break;
			}
			case TwitchatDataTypes.TwitchatMessageType.SHOUTOUT: {
				if (m.received) {
					inShoutout.value++;
				} else {
					outShoutout.value++;
				}
				noData.value = false;
				break;
			}
		}
	}

	let list: UserActivities[] = [];
	for (const uid in userActivities) {
		list.push(userActivities[uid]!);
	}
	list = list
		.sort((a, b) => {
			return b.sortValue - a.sortValue;
		})
		.slice(0, 1000);

	//Render only first 20 users initially
	userList.value = list.splice(0, 20);

	//Add users sequentially to avoid huge lag if rendering 1000 users at once
	window.setTimeout(() => {
		const renderInterval = window.setInterval(() => {
			if (list.length > 0) {
				userList.value.push(...list.splice(0, 10)!);
			} else {
				clearInterval(renderInterval);
			}
		}, 50);
	}, 1000);

	loading.value = false;
});

onBeforeUnmount(() => {
	clearInterval(durationInterval);
});

/**
 * Open a users' card
 */
function openUserCard(user: TwitchatDataTypes.TwitchatUser): void {
	storeUsers.openUserCard(user, storeAuth.twitch.user.id);
}

function exportCSV(globalData: boolean = false): void {
	let csv = "";

	if (globalData) {
		csv =
			"messCount, charCount, emoteCount, chatterCount, subT1Count, subT2Count, subT3Count, subPrimeCount, subgiftCount, bitsCount, followCount, rewardCount, channelPointCount, raidCount, raidViewerCount, hypeTrainCount, pollCount, predictionCount, bingoCount, raffleCount, outShoutout, inShoutout, hypeChatCount, hypeChats, banUserCount, toUserCount, toDuration\n";
		csv += messCount.value + ", ";
		csv += charCount.value + ", ";
		csv += emoteCount.value + ", ";
		csv += chatterCount.value + ", ";
		csv += subT1Count.value + ", ";
		csv += subT2Count.value + ", ";
		csv += subT3Count.value + ", ";
		csv += subPrimeCount.value + ", ";
		csv += subgiftCount.value + ", ";
		csv += bitsCount.value + ", ";
		csv += followCount.value + ", ";
		csv += rewardCount.value + ", ";
		csv += channelPointCount.value + ", ";
		csv += raidCount.value + ", ";
		csv += raidViewerCount.value + ", ";
		csv += hypeTrainCount.value + ", ";
		csv += pollCount.value + ", ";
		csv += predictionCount.value + ", ";
		csv += bingoCount.value + ", ";
		csv += raffleCount.value + ", ";
		csv += outShoutout.value + ", ";
		csv += inShoutout.value + ", ";
		csv += hypeChatCount.value + ", ";
		for (const currency in hypeChats.value) csv += `${hypeChats.value[currency]}(${currency}) `;
		csv += ",";
		csv += banUserCount.value + ", ";
		csv += toUserCount.value + ", ";
		csv += toDuration.value;
	} else {
		csv =
			"userID, userLogin, messCount, charCount, emoteCount, subPrime, subT1, subT2, subT3, subgift, bits, rewards, channelPointCount, raidCount, raidViewerCount, hypeChatCount, hypeChats, banUserCount, toUserCount, toDuration\n";
		for (const user of userList.value) {
			csv += Utils.escapeCSVCell(user.user.id) + ", ";
			csv += Utils.escapeCSVCell(user.user.login) + ", ";
			csv += user.messCount + ", ";
			csv += user.charCount + ", ";
			csv += user.emoteCount + ", ";
			csv += user.subPrime + ", ";
			csv += user.subT1 + ", ";
			csv += user.subT2 + ", ";
			csv += user.subT3 + ", ";
			csv += user.subgift + ", ";
			csv += user.bits + ", ";
			csv += user.rewards + ", ";
			csv += user.channelPointCount + ", ";
			csv += user.raidCount + ", ";
			csv += user.raidViewerCount + ", ";
			csv += user.hypeChatCount + ", ";
			for (const currency in user.hypeChats)
				csv += `${user.hypeChats[currency]}(${currency}) `;
			csv += ",";
			csv += user.banUserCount + ", ";
			csv += user.toUserCount + ", ";
			csv += user.toDuration + "\n";
		}
	}

	const blob = new Blob([csv], { type: "application/json" });
	const url = window.URL.createObjectURL(blob);
	//Start download session
	if (Config.instance.OBS_DOCK_CONTEXT) {
		window.open(url, "_blank");
	} else {
		var link = document.createElement("a");
		let filename = "export";
		filename += globalData ? "_global" : "_user";
		filename +=
			"_" +
			new Date().getDate() +
			"-" +
			(new Date().getMonth() + 1) +
			"-" +
			new Date().getFullYear();
		link.download = filename + ".csv";
		link.href = url;
		link.click();
	}
	URL.revokeObjectURL(url);
}

function getEmptyUserActivities(user: TwitchatDataTypes.TwitchatUser): UserActivities {
	return {
		user,
		sortValue: 0,
		messCount: 0,
		emoteCount: 0,
		charCount: 0,
		subPrime: 0,
		subT1: 0,
		subT2: 0,
		subT3: 0,
		subgift: 0,
		bits: 0,
		rewards: 0,
		channelPointCount: 0,
		raidCount: 0,
		raidViewerCount: 0,
		hypeChatCount: 0,
		hypeChats: {},
		banUserCount: 0,
		toUserCount: 0,
		toDuration: 0,
	};
}
</script>

<style scoped lang="less">
.streamsummary {
	.spinner {
		height: 2em;
		margin: auto;
	}

	.content {
		overflow-y: auto;
	}

	.global {
		overflow: visible;
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		.list {
			gap: 0.5em;
			display: flex;
			flex-direction: row;
			justify-content: center;
			flex-wrap: wrap;
		}
	}

	.users {
		overflow: hidden;
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		min-height: 100px;
		.list {
			flex-grow: 1;
			gap: 0.5em;
			display: flex;
			flex-direction: column;
			overflow: auto;
			.user {
				flex-shrink: 0;
				gap: 0.5em;
				display: flex;
				flex-direction: row;
				flex-wrap: wrap;
				align-items: center;
				.login {
					font-weight: bold;
				}

				.avatar {
					height: 2em;
					border-radius: 50%;
				}
			}
		}
	}

	.ctas {
		gap: 1em;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: center;
	}

	.data {
		display: flex;
		flex-direction: row;
		align-items: center;
		// font-weight: bold;
		cursor: default;
		.icon {
			height: 1em;
			max-width: 1em;
			margin-right: 0.5em;

			&.flip {
				transform: scale(-1, 1);
			}
		}

		small {
			font-size: 0.7em;
			// font-weight: normal;
			&.data {
				margin-left: 1em;
			}
			&:not(.data) {
				margin-right: 0.5em;
				margin-left: -0.5em;
			}
		}
	}

	.noData {
		text-align: center;
		flex-grow: 1;
		display: flex;
		align-items: center;
		white-space: pre-line;
		align-self: center;
	}
}
</style>
