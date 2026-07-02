<template>
	<div class="rafflestate gameStateWindow" v-if="raffleData">
		<div class="head" v-stickyTopShadow>
			<h1 class="title">
				<Icon name="ticket" />
				<span>{{ $t("raffle.state_title") }}</span>
				<mark v-if="raffleData.mode == 'chat' && raffleData.command">{{
					raffleData.command
				}}</mark>
				<mark v-if="raffleData.mode == 'chat' && raffleData.reward_id"
					><Icon name="channelPoints" />{{ rewardName }}</mark
				>
				<mark v-if="raffleData.mode == 'tips'"
					><Icon name="coin" />{{ tipPlatforms.join(" ") }}</mark
				>
			</h1>

			<ProgressBar
				secondary
				v-if="timerPercent < 1"
				:percent="
					raffleData.entries?.length == raffleData.maxEntries && raffleData.maxEntries > 0
						? 1
						: timerPercent
				"
				:duration="
					raffleData.entries?.length == raffleData.maxEntries && raffleData.maxEntries > 0
						? 0
						: raffleData.duration_s * 1000
				"
			/>

			<slot />
		</div>
		<div class="body" ref="content">
			<div class="card-item secondary warning" v-if="storeRaffle.raffleList.length >= 10">
				<Icon name="alert" />{{
					$t("raffle.state_many_raffles", { COUNT: storeRaffle.raffleList.length })
				}}
			</div>

			<div class="entries">
				<Icon name="user" alt="user" />
				<i18n-t
					scope="global"
					tag="p"
					keypath="raffle.state_users"
					:plural="raffleData.entries?.length"
				>
					<template #COUNT>
						<span>{{ raffleData.entries?.length }}</span>
						<span v-if="raffleData.maxEntries">/{{ raffleData.maxEntries }}</span>
					</template>
				</i18n-t>
			</div>

			<div class="entries" v-if="cumulatedEntryCount != raffleData.entries?.length">
				<Icon name="ticket" alt="ticket" />
				<i18n-t
					scope="global"
					tag="p"
					keypath="raffle.state_users_cumulated"
					:plural="cumulatedEntryCount"
					v-if="cumulatedEntryCount != raffleData.maxEntries"
				>
					<template #COUNT>
						<span>{{ cumulatedEntryCount }}</span>
					</template>
				</i18n-t>
			</div>

			<div class="actions">
				<TTButton icon="cross" highlight alert @click="closeRaffle()">{{
					$t("raffle.state_stopBt")
				}}</TTButton>

				<TTButton
					icon="timer"
					highlight
					light
					v-if="(raffleData.duration_s || 0) > 0"
					@click="expandDurationBy(60)"
					>+1'</TTButton
				>

				<TTButton
					icon="ticket"
					@click="pickWinner()"
					light
					:loading="picking"
					:disabled="!canPick"
					>{{ $t("raffle.state_pickBt") }}</TTButton
				>
			</div>

			<div class="winners" v-if="raffleData.winners && raffleData.winners.length > 0">
				<div class="entries">
					<template v-for="w in raffleData.winners.concat().reverse()" :key="w.label">
						<TTButton
							v-if="w.user"
							small
							light
							type="link"
							target="_blank"
							:href="'https://twitch.tv/' + getUserFromEntry(w)?.login"
							@click.prevent="openUserCard(getUserFromEntry(w))"
							>{{ w.label }}</TTButton
						>

						<div class="entry" v-else>{{ w.label }}</div>
					</template>
				</div>
			</div>

			<ParamItem
				class="small"
				v-model="raffleData.autoClose"
				:paramData="param_autoClose"
				@change="storeRaffle.saveData()"
			/>

			<OverlayPresenceChecker
				:overlayName="$t('raffle.overlay_name')"
				:overlayType="'wheel'"
			/>
		</div>

		<TTButton
			transparent
			icon="left"
			v-if="availableRaffleList.length > 1"
			class="prevRaffleBt"
			@click="prevRaffle()"
		/>
		<TTButton
			transparent
			icon="right"
			v-if="availableRaffleList.length > 1"
			class="nextRaffleBt"
			@click="nextRaffle()"
		/>
	</div>
</template>

<script setup lang="ts">
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import PublicAPI from "@/utils/PublicAPI";
import { gsap } from "gsap/gsap-core";
import { computed, onBeforeMount, onBeforeUnmount, onMounted, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import { useConfirm } from "@/composables/useConfirm";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeRaffle as useStoreRaffle } from "@/store/raffle/storeRaffle";
import { storeRewards as useStoreRewards } from "@/store/rewards/storeRewards";
import { storeTimer as useStoreTimer } from "@/store/timer/storeTimer";
import { storeUsers as useStoreUsers } from "@/store/users/storeUsers";
import Icon from "../Icon.vue";
import ProgressBar from "../ProgressBar.vue";
import TTButton from "../TTButton.vue";
import ParamItem from "../params/ParamItem.vue";
import OverlayPresenceChecker from "./OverlayPresenceChecker.vue";

const { t } = useI18n();
const { confirm } = useConfirm();
const storeAuth = useStoreAuth();
const storeRaffle = useStoreRaffle();
const storeRewards = useStoreRewards();
const storeTimer = useStoreTimer();
const storeUsers = useStoreUsers();

const emit = defineEmits<{
	close: [];
}>();

const picking = ref<boolean>(false);
const timerPercent = ref<number>(0);
const raffleData = ref<TwitchatDataTypes.RaffleData | null>(null);
const winnerPlaceholders = ref<TwitchatDataTypes.PlaceholderEntry[]>([]);
const param_autoClose = ref<TwitchatDataTypes.ParameterData<boolean>>({
	value: true,
	type: "boolean",
	labelKey: "raffle.params.param_autoClose",
	icon: "trash",
});

const content = useTemplateRef<HTMLDivElement>("content");
const methods = useTemplateRef<HTMLElement>("methods");

let disposed = false;

const validRaffleTypes: TwitchatDataTypes.RaffleData["mode"][] = ["chat", "tips", "sub"];

const canPick = computed<boolean>(() => {
	if (!raffleData.value) return false;
	return (
		raffleData.value.entries &&
		raffleData.value.entries.length > 0 &&
		(raffleData.value.winners == undefined ||
			raffleData.value.winners?.length < raffleData.value.entries.length)
	);
});

const cumulatedEntryCount = computed<number>(() => {
	if (!raffleData.value) return 0;
	let count = 0;
	raffleData.value.entries.forEach((v) => {
		count += v.joinCount;
	});
	return count;
});

const rewardName = computed<string>(() => {
	if (!raffleData.value || !raffleData.value.reward_id) return "";
	const reward = storeRewards.rewardList.find((v) => v.id == raffleData.value!.reward_id);
	return reward?.title || "";
});

const availableRaffleList = computed<TwitchatDataTypes.RaffleData[]>(() => {
	return storeRaffle.raffleList.filter((v) => validRaffleTypes.includes(v.mode));
});

const tipPlatforms = computed<string[]>(() => {
	if (!raffleData.value) return [];
	let platforms: string[] = [];
	if (raffleData.value.tip_kofi) {
		let label = "Ko-Fi";
		if ((raffleData.value.tip_kofi_minAmount || 0) > 0)
			label += " (" + raffleData.value.tip_kofi_minAmount + "🪙)";
		platforms.push(label);
	}
	if (raffleData.value.tip_streamlabs) {
		let label = "Streamlabs";
		if ((raffleData.value.tip_streamlabs_minAmount || 0) > 0)
			label += " (" + raffleData.value.tip_streamlabs_minAmount + "🪙)";
		platforms.push(label);
	}
	if (raffleData.value.tip_streamlabsCharity) {
		let label = "Streamlabs Charity";
		if ((raffleData.value.tip_streamlabsCharity_minAmount || 0) > 0)
			label += " (" + raffleData.value.tip_streamlabsCharity_minAmount + "🪙)";
		platforms.push(label);
	}
	if (raffleData.value.tip_streamelements) {
		let label = "Streamelements";
		if ((raffleData.value.tip_streamelements_minAmount || 0) > 0)
			label += " (" + raffleData.value.tip_streamelements_minAmount + "🪙)";
		platforms.push(label);
	}
	if (raffleData.value.tip_tipeee) {
		let label = "Tipeee";
		if ((raffleData.value.tip_tipeee_minAmount || 0) > 0)
			label += " (" + raffleData.value.tip_tipeee_minAmount + "🪙)";
		platforms.push(label);
	}
	if (raffleData.value.tip_tiltify) {
		let label = "Tiltify";
		if ((raffleData.value.tip_tiltify_minAmount || 0) > 0)
			label += " (" + raffleData.value.tip_tiltify_minAmount + "🪙)";
		platforms.push(label);
	}
	return platforms;
});

function getUserFromEntry(
	entry: TwitchatDataTypes.RaffleEntry,
): TwitchatDataTypes.TwitchatUser | null {
	if (!entry.user) return null;
	return storeUsers.getUserFrom(entry.user.platform, entry.user.channel_id, entry.user.id);
}

function closeRaffle(): void {
	if (!raffleData.value) return;
	confirm(t("raffle.delete_confirm.title"), t("raffle.delete_confirm.description"))
		.then(async () => {
			let index = availableRaffleList.value.findIndex(
				(v) => v.sessionId! == raffleData.value!.sessionId!,
			);
			storeRaffle.stopRaffle(raffleData.value!.sessionId!);
			//If there are other raffles, switch to previous one
			if (availableRaffleList.value.length > 0) {
				if (--index < 0) index = availableRaffleList.value.length - 1;
				raffleData.value = availableRaffleList.value[index]!;
			} else {
				raffleData.value = null;
			}
			emit("close");
		})
		.catch(() => {
			//ignore
		});
}

function openUserCard(user: TwitchatDataTypes.TwitchatUser | null): void {
	if (!user) return;
	storeUsers.openUserCard(user);
}

function expandDurationBy(duration_s: number): void {
	if (timerPercent.value >= 1) {
		raffleData.value!.duration_s = duration_s;
		raffleData.value!.created_at = Date.now();
	} else {
		raffleData.value!.duration_s += duration_s;
	}
	if (raffleData.value?.showCountdownOverlay) {
		const defaultCd = storeTimer.timerList.find((v) => v.type == "countdown" && v.isDefault);
		if (defaultCd) storeTimer.timerAdd(defaultCd?.id, 60_000);
	}
}

async function pickWinner(): Promise<void> {
	if (!raffleData.value) return;

	picking.value = true;

	await storeRaffle.pickWinner(raffleData.value.sessionId!);

	picking.value = false;
}

async function nextRaffle(): Promise<void> {
	if (!raffleData.value) return;

	const holder = content.value!;
	const cmdHolder = methods.value!;
	gsap.to([holder, cmdHolder], {
		opacity: 0,
		x: -10,
		duration: 0.1,
		onComplete: () => {
			let index = availableRaffleList.value.findIndex(
				(v) => v.sessionId! == raffleData.value!.sessionId!,
			);
			let newIndex = ++index % availableRaffleList.value.length;
			raffleData.value = availableRaffleList.value[newIndex]!;
			gsap.fromTo(
				[holder, cmdHolder],
				{ x: 10, opacity: 0 },
				{ opacity: 1, x: 0, duration: 0.1 },
			);
		},
	});
}

async function prevRaffle(): Promise<void> {
	if (!raffleData.value) return;

	const holder = content.value!;
	const cmdHolder = methods.value!;
	gsap.to([holder, cmdHolder], {
		opacity: 0,
		x: 10,
		duration: 0.1,
		onComplete: () => {
			let index = availableRaffleList.value.findIndex(
				(v) => v.sessionId! == raffleData.value!.sessionId!,
			);
			let newIndex = index - 1;
			if (newIndex < 0) newIndex = availableRaffleList.value.length - 1;
			raffleData.value = availableRaffleList.value[newIndex]!;
			gsap.fromTo(
				[holder, cmdHolder],
				{ x: -10, opacity: 0 },
				{ opacity: 1, x: 0, duration: 0.1 },
			);
		},
	});
}

function renderFrame(): void {
	if (disposed) return;
	if (!raffleData.value) return;

	requestAnimationFrame(() => renderFrame());
	const elapsed = Date.now() - new Date(raffleData.value.created_at).getTime();
	const duration = raffleData.value.duration_s * 1000;
	timerPercent.value = 1 - (duration - elapsed) / duration;
}

onBeforeMount(() => {
	winnerPlaceholders.value = [
		{
			tag: "USER",
			descKey: "raffle.params.username_placeholder",
			example: storeAuth.twitch.user.displayName,
		},
	];
	raffleData.value = availableRaffleList.value.length > 0 ? availableRaffleList.value[0]! : null;
	//Check if wheel's overlay exists
	PublicAPI.instance.broadcast("GET_WHEEL_OVERLAY_PRESENCE");
});

onMounted(() => {
	renderFrame();
});

onBeforeUnmount(() => {
	disposed = true;
});
</script>

<style scoped lang="less">
.rafflestate {
	gap: 0.5em;

	.title {
		flex-wrap: wrap;
		row-gap: 0.25em;
	}

	.body > .entries {
		display: flex;
		flex-direction: row;
		align-items: center;
		font-style: italic;
		.icon {
			height: 1em;
			width: 1em;
			object-fit: fill;
			margin-right: 0.5em;
		}
	}

	.warning {
		white-space: pre-line;
		text-align: center;
		.icon {
			height: 1em;
			margin-right: 0.25em;
		}
	}

	.winners {
		flex-shrink: 0;

		.entries {
			.entry {
				padding: 0.5em;
				color: var(--color-primary);
				background-color: var(--color-light);
				border-radius: var(--border-radius);
				font-size: 0.8rem;
				font-weight: normal;
			}
		}
	}

	.small {
		font-size: 0.8em;
		background-color: rgba(0, 0, 0, 0.25);
	}

	.nextRaffleBt,
	.prevRaffleBt {
		position: absolute;
		top: 0;
		right: 0;
		height: 100%;
		&.prevRaffleBt {
			right: unset;
			left: 0;
		}
	}

	.body {
		display: flex;
		flex-direction: column;
		gap: 1em;
		align-items: center;
		width: 100%;
	}

	.winners {
		.count {
			font-style: italic;
			font-weight: normal;
			font-size: 0.8em;
		}
		.entries {
			padding: 5px; //Makes sure box-filter isn't cut
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			justify-content: center;
			gap: 0.5em;
		}
	}
}
</style>
