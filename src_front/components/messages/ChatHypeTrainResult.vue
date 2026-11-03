<template>
	<div class="chathypetrainresult chatMessage highlight" ref="rootEl">
		<Icon name="train" alt="icon" class="icon" />
		<div class="infoHolder">
			<i18n-t scope="global" tag="strong" keypath="chat.hype_train.summary_title">
				<template #LEVEL
					><mark
						>{{ t("chat.hype_train.summary_level") }}
						{{ props.messageData.train.level }}</mark
					></template
				>
				<template #PERCENT
					><mark>{{ reachPercent }}%</mark></template
				>
			</i18n-t>

			<div class="details">
				<div class="row" v-if="bits > 0" v-tooltip="t('global.tooltips.bits')">
					<Icon name="bits" class="icon" key="bits" />
					<span class="label">{{ bits }}</span>
				</div>

				<button
					class="row subs"
					:class="{ open: showSubsDetails }"
					v-if="subs1 > 0 || subs2 > 0 || subs3 > 0 || primes > 0"
					key="subs"
					@click="showSubsDetails = !showSubsDetails"
				>
					<span class="sum">
						<Icon name="sub" class="icon" />
						<span class="label">{{ subs1 + subs2 + subs3 + primes }}</span>
					</span>
					<template v-if="showSubsDetails">
						<span
							class="info prime"
							v-if="primes > 0"
							v-tooltip="t('global.tooltips.primes')"
						>
							<span class="label">{{ primes }}</span>
							<Icon name="prime" class="icon" />
						</span>
						<span
							class="info t1"
							v-if="subs1 > 0"
							v-tooltip="t('global.tooltips.subs1')"
						>
							<span class="label">{{ subs1 }}</span>
							<span class="tier">T1</span>
						</span>
						<span
							class="info t2"
							v-if="subs2 > 0"
							v-tooltip="t('global.tooltips.subs2')"
						>
							<span class="label">{{ subs2 }}</span>
							<span class="tier">T2</span>
						</span>
						<span
							class="info t3"
							v-if="subs3 > 0"
							v-tooltip="t('global.tooltips.subs3')"
						>
							<span class="label">{{ subs3 }}</span>
							<span class="tier">T3</span>
						</span>
					</template>
					<Icon name="arrowRight" class="icon arrow" />
				</button>

				<div
					class="row"
					v-if="subgifts > 0"
					v-tooltip="t('global.tooltips.subgifts')"
					key="subgifts"
				>
					<Icon name="gift" class="icon" />
					<span class="label">{{ subgifts }}</span>
				</div>
			</div>

			<div class="conductors">
				<div
					v-if="props.messageData.train.conductor_subs"
					class="conductor"
					ref="conductor_subs_holder"
					v-tooltip="t('train.conductor_subs_tt')"
				>
					<Icon name="sub" />

					<img
						:src="props.messageData.train.conductor_subs.user.avatarPath"
						class="avatar"
					/>

					<div>
						<a
							class="userlink"
							:href="
								'https://twitch.tv/' +
								props.messageData.train.conductor_subs.user.login
							"
							target="_blank"
							@click.prevent="
								openUserCard(
									props.messageData.train.conductor_subs!.user,
									props.messageData.channel_id,
								)
							"
							>{{ props.messageData.train.conductor_subs.user.displayName }}</a
						>

						<i18n-t
							scope="global"
							tag="div"
							class="label"
							keypath="train.conductor_subs"
							:plural="getConductorSubCount()"
						>
							<template #COUNT>
								<span class="count">{{ getConductorSubCount() }}</span>
							</template>
						</i18n-t>
					</div>
				</div>

				<div
					v-if="props.messageData.train.conductor_bits"
					class="conductor"
					ref="conductor_bits_holder"
					v-tooltip="t('train.conductor_bits_tt')"
				>
					<Icon name="bits" />

					<img
						:src="props.messageData.train.conductor_bits.user.avatarPath"
						class="avatar"
					/>

					<div>
						<a
							class="userlink"
							:href="
								'https://twitch.tv/' +
								props.messageData.train.conductor_bits.user.login
							"
							target="_blank"
							@click.prevent="
								openUserCard(
									props.messageData.train.conductor_bits.user,
									props.messageData.channel_id,
								)
							"
							>{{ props.messageData.train.conductor_bits.user.displayName }}</a
						>

						<i18n-t
							scope="global"
							tag="div"
							class="label"
							keypath="train.conductor_bits"
							:plural="props.messageData.train.conductor_bits.amount"
						>
							<template #COUNT>
								<span class="count">{{
									props.messageData.train.conductor_bits.amount
								}}</span>
							</template>
						</i18n-t>
					</div>
				</div>
			</div>

			<TTButton
				v-if="!props.filtering && props.messageData.activities.length > 0"
				small
				icon="filters"
				@click="filter()"
				>{{ t("chat.hype_train.filterBt") }}</TTButton
			>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useChatMessage } from "@/composables/useChatMessage";
import { storeCommon as useStoreCommon } from "@/store/common/storeCommon";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { computed, onMounted, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import TTButton from "../TTButton.vue";
import Icon from "../Icon.vue";

const props = withDefaults(
	defineProps<{
		messageData: TwitchatDataTypes.MessageHypeTrainSummaryData;
		filtering?: boolean;
		lightMode?: boolean;
		contextMenuOff?: boolean;
	}>(),
	{
		filtering: false,
	},
);

const emit = defineEmits<{
	onRead: [message: TwitchatDataTypes.ChatMessageTypes, e: MouseEvent];
	setCustomActivities: [activities: TwitchatDataTypes.ChatMessageTypes[]];
}>();

const { t } = useI18n();
const storeCommon = useStoreCommon();
const rootEl = useTemplateRef("rootEl");
const { openUserCard } = useChatMessage(props, emit, rootEl);

const reachPercent = ref(0);
const subs1 = ref(0);
const subs2 = ref(0);
const subs3 = ref(0);
const subgifts = ref(0);
const primes = ref(0);
const bits = ref(0);
const showSubsDetails = ref(false);

const iconColor = computed(() => {
	return storeCommon.theme == "dark" ? "#00d6d6" : "#00a3a3";
});

function getConductorSubCount(): number {
	let count = 0;
	for (const element of props.messageData.activities) {
		if (
			element.type === TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION &&
			element.user.id === props.messageData.train.conductor_subs!.user.id
		) {
			if (element.is_gift) count += element.gift_count || 1;
			else count++;
		}
	}
	return count;
}

onMounted(() => {
	reachPercent.value = Math.round(
		(props.messageData.train.currentValue / props.messageData.train.goal) * 100,
	);
	for (const el of props.messageData.activities) {
		switch (el.type) {
			case TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION: {
				if (el.tier == "prime") primes.value++;
				else if (el.is_gift) {
					let count = el.gift_recipients!.length ?? 1;
					subgifts.value += count;
				} else {
					if (el.tier == 1) subs1.value++;
					if (el.tier == 2) subs2.value++;
					if (el.tier == 3) subs3.value++;
				}
				break;
			}

			case TwitchatDataTypes.TwitchatMessageType.CHEER: {
				bits.value += el.bits;
				break;
			}
		}
	}
});

function filter(): void {
	emit("setCustomActivities", [...props.messageData.activities, props.messageData]);
}
</script>

<style scoped lang="less">
.chathypetrainresult {
	& > .icon {
		color: v-bind(iconColor);
	}
	.highlight() {
		color: var(--color-text-light);
		background-color: var(--color-primary);
		border-radius: 0.5em;
		padding: 0 0.5em;
	}

	mark {
		.highlight();
	}

	.infoHolder {
		flex-grow: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		mark {
			font-size: 1em;
		}
	}

	.details {
		display: flex;
		flex-direction: row;
		margin: 0.5em 0;
		justify-content: center;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5em;

		.row {
			.highlight();
			padding-top: 0.25em;
			padding-bottom: 0.25em;
			cursor: default;

			.icon {
				height: 1em;
				max-width: 1em;
				margin-right: 0.25em;
				vertical-align: top;
			}
			.label {
				font-weight: normal;
			}

			&.subs {
				display: flex;
				flex-direction: row;
				align-items: center;
				flex-wrap: wrap;
				justify-content: center;
				gap: 0.25em;
				cursor: pointer;
				&:hover {
					background-color: var(--color-primary-light);
				}
				.sum {
					display: flex;
					align-items: center;
				}
				.arrow {
					height: 0.8em;
					margin-right: 0;
				}
				&.open .arrow {
					transform: scaleX(-1);
				}
				.tier {
					font-weight: bold;
					display: inline-block;
					font-size: 0.8em;
					vertical-align: top;
					font-weight: normal;
					opacity: 0.7;
				}
				.info {
					background-color: rgba(0, 0, 0, 0.3);
					padding: 0px 5px;
					border-radius: var(--border-radius);
					font-size: 0.8em;
					gap: 0.5em;
					display: flex;
					align-items: center;
					flex-direction: row;
					.icon {
						vertical-align: text-top;
					}

					&.prime {
						.icon {
							margin-right: 0;
							margin-top: -0.1em;
							opacity: 0.5;
							height: 0.8em;
						}
					}
				}
			}
		}
	}

	.conductors {
		margin: 0.5em 0;
		flex-wrap: wrap;
		display: inline-flex;
		align-items: center;
		flex-direction: row;
		position: relative;
		justify-content: center;
		gap: 1em;

		.conductor {
			display: inline-flex;
			align-items: center;
			flex-direction: row;
			position: relative;
			gap: 0.25em;
			background-color: var(--background-color-fader);
			border-radius: var(--border-radius);
			padding: 0.5em;
			min-width: 6em;

			.icon {
				position: absolute;
				top: -0.5em;
				left: -0.5em;
				background-color: var(--background-color-fader);
				padding: 0.25em;
				border-radius: 50%;
				width: 1.5em;
				height: 1.5em;
			}
			.avatar {
				width: 2em;
				height: 2em;
				border-radius: 50%;
				margin: auto;
				display: block;
			}
			.userlink {
				font-size: 0.9em;
				color: var(--color-text);
			}
			.label {
				color: var(--color-text-text);
				.count {
					font-weight: bold;
				}
			}
		}
	}
}
</style>
