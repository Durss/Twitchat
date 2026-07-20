<template>
	<div class="rewardslist blured-background-window" ref="rootEl">
		<div v-if="!scopeGranted" class="scope scrollable">
			<p>{{ t("rewards.manage.scope_grant") }}</p>
			<TTButton icon="lock_fit" primary @click="grantScopes()">{{
				t("rewards.manage.scope_grantBt")
			}}</TTButton>
		</div>

		<div v-else-if="loading && !rewardToTransfer" class="loader scrollable">
			<Icon class="loader" name="loader" />
			<p>{{ t("global.loading") }}</p>
		</div>

		<div v-else-if="rewardToTransfer" class="transfer scrollable">
			<div class="head">
				<TTButton icon="back" @click="rewardToTransfer = null" class="backBt" transparent />
				<h1>{{ t("rewards.manage.transfer_title") }}</h1>
			</div>
			<RewardListTransferForm :reward="rewardToTransfer" @transferDone="loadRewards(true)" />
		</div>

		<div v-else-if="rewardToEdit" class="edit scrollable">
			<div class="head">
				<TTButton icon="back" @click="rewardToEdit = null" class="backBt" transparent />
				<h1>{{ t("rewards.manage.edit_title") }}</h1>
			</div>
			<RewardListEditForm :reward="rewardToEdit" @complete="onCreateComplete()" />
		</div>

		<div v-else-if="createReward" class="create scrollable">
			<div class="head">
				<TTButton icon="back" @click="createReward = false" class="backBt" transparent />
				<h1>{{ t("rewards.manage.create_title") }}</h1>
			</div>
			<RewardListEditForm @complete="onCreateComplete()" />
		</div>

		<template v-else>
			<div class="rewards scrollable">
				<TTButton
					class="refreshBt"
					icon="refresh"
					transparent
					@click="loadRewards(true)"
					v-tooltip="t('global.refresh')"
				/>

				<div class="list">
					<div class="head">
						<h1>{{ t("rewards.manage.title") }}</h1>
					</div>
					<button @click="createReward = true" class="createRewardBt">
						<Icon name="add" />
					</button>
					<RewardListItem
						v-for="r in manageableRewards"
						:key="r.id"
						:reward="r"
						manageable
						@edit="rewardToEdit = $event"
						@delete="onDeleteReward()"
					/>
				</div>

				<div class="list" v-if="nonManageableRewards.length > 0">
					<div class="head">
						<h1>{{ t("rewards.manage.not_manageable_title") }}</h1>
					</div>
					<p class="subtitle">{{ t("rewards.manage.not_manageable_description") }}</p>
					<RewardListItem
						v-for="r in nonManageableRewards"
						:key="r.id"
						:reward="r"
						:manageable="false"
						@transfer="transferReward"
					/>
				</div>
			</div>
		</template>
	</div>
</template>

<script setup lang="ts">
/**
 * This displays all the user's rewards.
 */
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import { TwitchScopes } from "@/utils/twitch/TwitchScopes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { gsap } from "gsap/gsap-core";
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import Icon from "../Icon.vue";
import TTButton from "../TTButton.vue";
import RewardListEditForm from "./RewardListEditForm.vue";
import RewardListItem from "./RewardListItem.vue";
import RewardListTransferForm from "./RewardListTransferForm.vue";

const emit = defineEmits<{
	close: [];
}>();

const { t } = useI18n();

const rootEl = useTemplateRef("rootEl");

const loading = ref(true);
const createReward = ref(false);
const rewardToEdit = ref<TwitchDataTypes.Reward | null>(null);
const rewardToTransfer = ref<TwitchDataTypes.Reward | null>(null);
const nonManageableRewards = ref<TwitchDataTypes.Reward[]>([]);
const manageableRewards = ref<TwitchDataTypes.Reward[]>([]);

const scopeGranted = computed(() => TwitchUtils.hasScopes([TwitchScopes.MANAGE_REWARDS]));

const clickHandler = (e: MouseEvent) => onClick(e);

onMounted(() => {
	open();
	loadRewards();

	document.addEventListener("mousedown", clickHandler);
});

onBeforeUnmount(() => {
	document.removeEventListener("mousedown", clickHandler);
});

function transferReward(reward: TwitchDataTypes.Reward): void {
	if (!TwitchUtils.requestScopes([TwitchScopes.MANAGE_REWARDS])) return;

	rewardToTransfer.value = reward;
}

function onCreateComplete(): void {
	createReward.value = false;
	rewardToEdit.value = null;
	loadRewards(true);
}

function onDeleteReward(): void {
	loadRewards(true);
}

function grantScopes(): void {
	TwitchUtils.requestScopes([TwitchScopes.LIST_REWARDS, TwitchScopes.MANAGE_REWARDS]);
}

async function loadRewards(forceReload: boolean = false): Promise<void> {
	loading.value = true;
	try {
		nonManageableRewards.value = await TwitchUtils.getRewards(forceReload);
		manageableRewards.value = await TwitchUtils.getRewards(forceReload, true);
	} catch (e) {
		//User is probably not an affiliate
		loading.value = false;
		return;
	}
	// rewards.value = rewards.value.filter(v => v.is_enabled);
	manageableRewards.value.sort((a, b) => a.cost - b.cost);
	loading.value = false;

	//Filter out manageable rewards from the list
	nonManageableRewards.value = nonManageableRewards.value
		.filter((v) => manageableRewards.value.findIndex((w) => w.id == v.id) == -1)
		.sort((a, b) => a.cost - b.cost);
}

function open(): void {
	const ref = rootEl.value!;
	gsap.killTweensOf(ref);
	gsap.from(ref, {
		duration: 0.2,
		scaleX: 0,
		delay: 0.1,
		clearProps: "scaleX",
		ease: "back.out",
	});
	gsap.from(ref, { duration: 0.3, scaleY: 0, clearProps: "scaleY", ease: "back.out" });
}

function close(): void {
	if (rewardToTransfer.value) return;
	const ref = rootEl.value!;
	gsap.killTweensOf(ref);
	gsap.to(ref, { duration: 0.3, scaleX: 0, ease: "back.in" });
	gsap.to(ref, {
		duration: 0.2,
		scaleY: 0,
		delay: 0.1,
		clearProps: "scaleY, scaleX",
		ease: "back.in",
		onComplete: () => {
			emit("close");
		},
	});
}

function onClick(e: MouseEvent): void {
	let target = e.target as HTMLDivElement;
	const ref = rootEl.value!;
	while (
		target != document.body &&
		target != ref &&
		target &&
		!target.classList.contains("confirmView") &&
		target.dataset.type != "ContextSubMenu"
	) {
		target = target.parentElement as HTMLDivElement;
	}
	if (
		target != ref &&
		!target.classList.contains("confirmView") &&
		target.dataset.type != "ContextSubMenu"
	) {
		close();
	}
}
</script>

<style scoped lang="less">
.rewardslist {
	color: var(--color-text);
	padding: 0;

	.scrollable {
		height: 500px;
		width: 450px;
		max-height: 80%;
		max-width: 100%;
		overflow-x: hidden;
		overflow-y: auto;
		gap: 1em;
		display: flex;
		flex-direction: column;
		white-space: pre-line;

		&.loader {
			align-items: center;
			justify-content: center;
			margin: 0 auto;
			.icon {
				width: 30px;
				height: 30px;
			}
			p {
				color: #fff;
				font-style: italic;
				font-size: 1em;
			}
		}

		&.scope {
			align-items: center;
			justify-content: center;
			margin: 0 auto;
			p {
				max-width: 80%;
				text-align: center;
			}
		}

		&.rewards {
			gap: 2em;
			.createRewardBt {
				transition: background-color 0.25s;
				background-color: var(--background-color-fader);
				border-radius: var(--border-radius);
				padding: 2em;
				width: calc(25% - 0.5em);
				.icon {
					height: 1em;
					color: var(--color-text);
					transition: transform 0.25s;
				}
				&:hover {
					background-color: var(--background-color-fade);
					.icon {
						transform: scale(1.5);
					}
				}
			}
			.refreshBt {
				position: absolute;
				top: 0;
				right: 0;
				z-index: 2;
				padding: 0.75em;
				padding-right: 1em;
			}
		}

		.list {
			gap: 0.5em;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			justify-content: center;
			h1 {
				position: sticky;
			}
		}

		.head {
			display: flex;
			flex-direction: row;
			justify-content: flex-start;
			align-items: center;
			width: 100%;
			position: sticky;
			top: 0;
			z-index: 1;
			line-height: 1.1em;
			background: linear-gradient(
				180deg,
				var(--color-text-inverse) 30%,
				var(--color-text-inverse-fadest) 100%
			);
			margin-bottom: -1em;

			h1 {
				text-align: center;
				flex-grow: 1;
				padding: 0.5em;
				padding-bottom: 1em;
				line-height: 1em;
			}

			.backBt {
				z-index: 1;
				padding: 0.75em;
				flex-shrink: 0;
			}
		}
		.subtitle {
			padding: 0 0.5em;
		}
	}

	.empty {
		text-align: center;
	}
}

@media only screen and (max-width: 450px) {
	.rewardslist {
		.scrollable {
			height: 100%;
			width: 100%;
			max-height: 100%;
		}
	}
}
</style>
