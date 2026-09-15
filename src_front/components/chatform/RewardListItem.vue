<template>
	<div :class="classes">
		<TTButton
			@click.stop
			:copy="props.reward.id"
			icon="id"
			v-tooltip="t('global.copy_id')"
			class="copyIdBt"
			small
		/>
		<div class="infos" :style="styles">
			<img :src="icon" alt="reward icon" />

			<p class="cost" v-if="props.powerUp === true"><Icon name="bits" />{{ localCost }}</p>
			<p class="cost" v-else>
				<Icon name="channelPoints" />

				<ContentEditable
					tag="p"
					:no-nl="true"
					:no-html="true"
					v-model="localCost"
					:contenteditable="props.manageable !== false"
					@blur="validateCostValue()"
					@keydown="onKeyDown($event)"
				/>
			</p>

			<div class="indicators" v-if="props.reward.is_paused || !props.reward.is_enabled">
				<Icon
					name="pause"
					class="indicator"
					v-if="props.reward.is_paused"
					v-tooltip="t('rewards.manage.pause_tt')"
				/>
				<Icon
					name="ban"
					class="indicator"
					v-if="!props.reward.is_enabled"
					v-tooltip="t('rewards.manage.disable_tt')"
				/>
			</div>
		</div>

		<div class="ctas">
			<ContentEditable
				class="title"
				tag="p"
				:no-nl="true"
				:no-html="true"
				v-model="localTitle"
				:contenteditable="props.manageable !== false"
				@blur="updateTitle()"
			/>

			<TTButton
				v-if="props.manageable === true"
				class="settingsBt"
				small
				transparent
				@click="openMenu($event)"
				icon="settings"
			/>
		</div>

		<div
			class="jumpscare"
			v-tooltip="t('rewards.manage.jumpscare_tt')"
			@click="jumpscare = !jumpscare"
		>
			<Icon name="fear" /><ToggleButton small @click.capture.stop v-model="jumpscare" />
		</div>

		<TTButton
			v-if="props.manageable === false && props.powerUp !== true"
			icon="twitchat"
			@click="emit('transfer', editableReward)"
			small
			secondary
			>{{ t("rewards.manage.transferBt") }}</TTButton
		>
	</div>
</template>

<script setup lang="ts">
import ContentEditable from "@/components/ContentEditable.vue";
import { useConfirm } from "@/composables/useConfirm";
import StoreProxy from "@/store/StoreProxy";
import { storeDebug as useStoreDebug } from "@/store/debug/storeDebug";
import { storeTriggers as useStoreTriggers } from "@/store/triggers/storeTriggers";
import { TriggerTypes } from "@/types/TriggerActionDataTypes";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import Utils from "@/utils/Utils";
import TriggerActionHandler from "@/utils/triggers/TriggerActionHandler";
import { TwitchScopes } from "@/utils/twitch/TwitchScopes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import type * as CMTypes from "@imengyu/vue3-context-menu";
import ContextMenu from "@imengyu/vue3-context-menu";
import {
	computed,
	h,
	onBeforeMount,
	ref,
	type CSSProperties,
	type RendererElement,
	type RendererNode,
	type VNode,
} from "vue";
import { useI18n } from "vue-i18n";
import Icon from "../Icon.vue";
import TTButton from "../TTButton.vue";
import ToggleButton from "../ToggleButton.vue";
import { storeRewards as useStoreRewards } from "@/store/rewards/storeRewards.js";

const props = defineProps<{
	reward: TwitchDataTypes.Reward | TwitchDataTypes.CustomPowerUp;
	manageable?: boolean;
	/**
	 * Power Ups are display only. They cannot be edited nor transfered
	 */
	powerUp?: boolean;
}>();

const emit = defineEmits<{
	transfer: [reward: TwitchDataTypes.Reward];
	edit: [reward: TwitchDataTypes.Reward];
	delete: [];
}>();

const { t } = useI18n();
const { confirm } = useConfirm();
const storeTriggers = useStoreTriggers();
const storeDebug = useStoreDebug();
const storeRewards = useStoreRewards();

const localCost = ref("");
const localTitle = ref("");
const loading = ref(false);

let updateDebounce: number = -1;

const jumpscare = computed<boolean>({
	get: () => storeRewards.jumpscareReward[props.reward.id] === true,
	set: (value) => storeRewards.setJumpscareReward(props.reward.id, value),
});

const cost = computed(() => ("bits" in props.reward ? props.reward.bits : props.reward.cost));

/**
 * All edition features are guarded against Power Ups which are display only.
 * This spares narrowing the union on every single one of them.
 */
const editableReward = computed(() => props.reward as TwitchDataTypes.Reward);

const icon = computed(() => {
	if (props.reward.image?.url_2x) return props.reward.image.url_2x;
	return props.reward.default_image.url_1x;
});

const classes = computed(() => {
	const res = ["rewardlistitem"];
	if (loading.value) res.push("loading");
	if (props.reward.is_paused || !props.reward.is_enabled || props.manageable === false)
		res.push("disabled");
	return res;
});

const styles = computed<CSSProperties>(() => {
	const res = {
		backgroundColor: props.reward.background_color,
	};
	return res;
});

onBeforeMount(() => {
	localCost.value = cost.value.toString();
	localTitle.value = props.reward.title;
});

/**
 * Makes sure the cost is a number within the min/max range
 */
function validateCostValue(save: boolean = true): void {
	if (props.powerUp === true) return;

	const reward = editableReward.value;
	let txt = localCost.value;
	txt = txt.replace(",", ".").replace(/[^\d.]/g, "");
	let v = Math.max(1, Math.min(1000000000, parseFloat(txt)));
	if (isNaN(v)) v = 0;

	const changed = v != reward.cost;
	reward.cost = v;
	localCost.value = v.toString();

	if (!changed) return;

	if (save) {
		loading.value = true;
		clearTimeout(updateDebounce);
		updateDebounce = window.setTimeout(async () => {
			await TwitchUtils.updateReward(reward.id, { cost: reward.cost });
			await Utils.promisedTimeout(250);
			loading.value = false;
		}, 250);
	}
}

/**
 * Called when enabling/disabling reward
 * @param reward
 */
async function updateTitle(): Promise<void> {
	if (props.powerUp === true) return;

	const reward = editableReward.value;
	localTitle.value = localTitle.value.substring(0, 45);
	if (localTitle.value == reward.title) return;

	loading.value = true;
	if (await TwitchUtils.updateReward(reward.id, { title: localTitle.value })) {
		reward.title = localTitle.value;
	} else {
		localTitle.value = reward.title;
	}
	await Utils.promisedTimeout(250);
	loading.value = false;
}

/**
 * Increment/Decrement value with up and down keyboard arrows
 * @param event
 */
function onKeyDown(event: KeyboardEvent): void {
	let add = 0;
	switch (event.key) {
		case "ArrowUp":
			add = 1;
			break;
		case "ArrowDown":
			add = -1;
			break;
	}
	if (add != 0) {
		localCost.value = String(parseInt(localCost.value) + add);
		// validateCostValue(false);
	} else {
		let parsed = parseInt(localCost.value);
		if (isNaN(parsed)) parsed = 0;
		parsed = Math.max(1, Math.min(1000000000, parsed));
		localCost.value = parsed.toString();
		// validateCostValue(false);
	}
}

async function openMenu(e: MouseEvent): Promise<void> {
	if (props.powerUp === true) return;
	if (!TwitchUtils.requestScopes([TwitchScopes.MANAGE_REWARDS])) return;

	const reward = editableReward.value;
	e.preventDefault();
	const options: CMTypes.MenuItem[] = [];
	options.push({
		label: reward.is_paused
			? t("rewards.manage.contextmenu_unpause")
			: t("rewards.manage.contextmenu_pause"),
		icon: getIcon(reward.is_paused ? "icons/play.svg" : "icons/pause.svg"),
		onClick: async () => {
			loading.value = true;
			await TwitchUtils.updateReward(reward.id, {
				is_paused: !reward.is_paused,
			});
			await Utils.promisedTimeout(250);
			reward.is_paused = !reward.is_paused;
			loading.value = false;
		},
	});
	options.push({
		label: reward.is_enabled
			? t("rewards.manage.contextmenu_disable")
			: t("rewards.manage.contextmenu_enable"),
		icon: getIcon("icons/disable.svg"),
		onClick: async () => {
			loading.value = true;
			await TwitchUtils.updateReward(reward.id, {
				is_enabled: !reward.is_enabled,
			});
			await Utils.promisedTimeout(250);
			reward.is_enabled = !reward.is_enabled;
			loading.value = false;
		},
	});
	options.push({
		label: t("rewards.manage.contextmenu_edit"),
		icon: getIcon("icons/edit.svg"),
		onClick: () => {
			emit("edit", reward);
		},
	});
	options.push({
		label: t("rewards.manage.contextmenu_delete"),
		icon: getIcon("icons/trash.svg"),
		customClass: "alert",
		onClick: () => {
			confirm(
				t("rewards.manage.contextmenu_delete_confirm_title"),
				t("rewards.manage.contextmenu_delete_confirm_desc"),
			)
				.then(async () => {
					await TwitchUtils.deleteReward(reward.id);
					emit("delete");
				})
				.catch(() => {
					/* ignore */
				});
		},
	});

	const relatedTriggers = storeTriggers.triggerList.filter(
		(v) => v.type == TriggerTypes.REWARD_REDEEM && v.rewardId == reward.id,
	);
	if (relatedTriggers.length > 0) {
		options.push({
			label: t("rewards.manage.contextmenu_trigger"),
			icon: getIcon("icons/broadcast.svg"),
			customClass: "alert",
			onClick: () => {
				relatedTriggers.forEach((trigger) => {
					storeDebug.simulateMessage<TwitchatDataTypes.MessageRewardRedeemData>(
						TwitchatDataTypes.TwitchatMessageType.REWARD,
						(message) => {
							message.reward = {
								color: reward.background_color,
								cost: reward.cost,
								description: reward.prompt,
								icon: {
									sd: reward.image
										? reward.image.url_1x
										: reward.default_image.url_1x,
									hd: reward.image
										? reward.image.url_4x
										: reward.default_image.url_4x,
								},
								id: reward.id,
								title: reward.title,
							};
							void TriggerActionHandler.instance.executeTrigger(
								trigger,
								message,
								false,
							);
						},
						false,
					);
				});
			},
		});
	}

	ContextMenu.showContextMenu({
		theme: "mac " + StoreProxy.common.theme,
		x: e.x,
		y: e.y,
		items: options,
		closeWhenScroll: false,
	});
}

function getIcon(icon: string): VNode<RendererNode, RendererElement> {
	return h("img", {
		src: StoreProxy.asset(icon),
		style: {
			width: "1em",
			height: "1em",
		},
	});
}
</script>

<style scoped lang="less">
.rewardlistitem {
	gap: 0.25em;
	display: flex;
	flex-direction: column;
	width: calc(25% - 0.5em);
	background-color: var(--background-color-fader);
	border-radius: var(--border-radius);
	align-items: center;
	padding: 0.5em;
	min-height: 120px;
	transition: all 0.5s;
	// cursor: pointer;
	overflow: hidden;
	position: relative;

	&.loading::before {
		width: 50px;
		height: 500%;
		content: "";
		position: absolute;
		background-color: var(--color-text-fadest);
		z-index: 1;
		animation: slide 0.5s linear infinite;
		@keyframes slide {
			0% {
				transform: translateY(-50%) translateX(-200%) rotate(45deg);
			}
			100% {
				transform: translateY(-50%) translateX(500%) rotate(45deg);
			}
		}
	}

	&.disabled {
		.infos {
			filter: saturate(0%);
		}
	}

	&.grayout {
		background-color: var(--background-color-fadest);
		.infos {
			opacity: 0.5;
			filter: saturate(70%);
		}
	}

	.infos {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		border-radius: var(--border-radius);
		transition: all 0.5s;
		overflow: hidden;
		img {
			height: 28px;
			margin: 10px;
		}

		.cost {
			gap: 0.25em;
			display: flex;
			flex-direction: row;
			font-size: 0.7em;
			padding: 0.5em;
			border-radius: 5px;
			background-color: var(--background-color-fade);
			color: var(--color-text-inverse);
			font-weight: normal;
			margin-bottom: 5px;
			max-width: 100%;
			.icon {
				height: 1em;
				vertical-align: -0.15em;
			}
		}
		.indicators {
			gap: 0.5em;
			display: flex;
			flex-direction: row;
			position: absolute;
			top: 0;
			right: 0;
			padding: 0.25em;
			background-color: var(--grayout);
			border-bottom-left-radius: 0.25em;
			.indicator {
				height: 0.5em;
			}
		}
	}

	.cost:focus,
	.title:focus {
		.bevel();
	}

	.ctas {
		display: flex;
		flex-direction: row;
		width: 100%;
		align-items: center;
		justify-content: center;
		flex-grow: 1;

		.title {
			font-size: 0.8em;
			text-align: center;
			flex-grow: 1;
			border-radius: 5px;
			// padding: 0.5em;
			max-width: calc(100% - 1em);
		}
		.settingsBt {
			width: 1.5em;
			flex-shrink: 0;
		}
	}

	.jumpscare {
		gap: 0.5em;
		display: flex;
		flex-direction: row;
		align-items: center;
		cursor: pointer;
		.icon {
			height: 1em;
		}
	}

	.copyIdBt {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 1;
		border-radius: var(--border-radius);
		opacity: 0;
	}

	&:hover {
		.copyIdBt {
			opacity: 1;
		}
	}
}
</style>
