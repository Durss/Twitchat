<template>
	<div :class="classes">
		<div class="head" v-stickyTopShadow>
			<h1 class="title"><Icon name="prediction" />{{ prediction.title }}</h1>

			<ProgressBar
				class="progress"
				secondary
				:percent="progressPercent"
				:duration="prediction.duration_s * 1000"
				v-if="!prediction.pendingAnswer"
			/>

			<slot />
		</div>

		<div class="body">
			<div class="chooseOutcomeTitle" v-if="prediction.pendingAnswer && canAnswer">
				<span class="arrow">⤺</span> {{ $t("prediction.state.choose_outcome") }}
			</div>

			<div class="choices">
				<div class="choice" v-for="(c, index) in prediction.outcomes" :key="index">
					<div class="color" v-if="!prediction.pendingAnswer || !canAnswer"></div>
					<TTButton
						class="winBt"
						secondary
						@click="setOutcome(c)"
						icon="checkmark"
						v-if="prediction.pendingAnswer && canAnswer"
						:loading="loading"
					/>

					<div class="bar" :style="getAnswerStyles(c)">
						<div>{{ c.label }}</div>
						<div class="details">
							<span class="percent">{{ getPercent(c) }}%</span>
							<span class="votes"
								><Icon name="user" alt="user" class="icon" />{{ c.voters }}</span
							>
							<span class="points"
								><Icon name="channelPoints" alt="channelPoints" class="icon" />{{
									c.votes
								}}</span
							>
						</div>
					</div>
				</div>
			</div>

			<i18n-t
				class="creator"
				scope="global"
				tag="div"
				keypath="poll.form.created_by"
				v-if="prediction.creator && prediction.creator.id != me.id"
			>
				<template #USER>
					<a class="userlink" @click.stop="openUserCard()">{{
						prediction.creator.displayName
					}}</a>
				</template>
			</i18n-t>

			<div class="actions">
				<TTButton v-if="canAnswer" @click="deletePrediction()" :loading="loading" alert>{{
					$t("prediction.state.cancelBt")
				}}</TTButton>
			</div>

			<OverlayPresenceChecker
				:overlayName="$t('prediction.state.overlay_name')"
				:overlayType="'predictions'"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useConfirm } from "@/composables/useConfirm";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeCommon as useStoreCommon } from "@/store/common/storeCommon";
import { storePrediction as useStorePrediction } from "@/store/prediction/storePrediction";
import { storeUsers as useStoreUsers } from "@/store/users/storeUsers";
import TTButton from "../TTButton.vue";
import ProgressBar from "../ProgressBar.vue";
import Icon from "../Icon.vue";
import OverlayPresenceChecker from "./OverlayPresenceChecker.vue";

const { t } = useI18n();
const { confirm } = useConfirm();
const storeAuth = useStoreAuth();
const storeCommon = useStoreCommon();
const storePrediction = useStorePrediction();
const storeUsers = useStoreUsers();

const loading = ref(false);
const progressPercent = ref(0);

let disposed = false;

const me = computed<TwitchatDataTypes.TwitchatUser>(() => storeAuth.twitch.user);

const prediction = computed<TwitchatDataTypes.MessagePredictionData>(
	() => storePrediction.data!,
);

const canAnswer = computed<boolean>(
	() => prediction.value.channel_id == storeAuth.twitch.user.id,
);

const classes = computed<string[]>(() => {
	let res = ["predictionstate", "gameStateWindow"];
	if (prediction.value.outcomes.length > 2) res.push("noColorMode");
	return res;
});

function getPercent(c: TwitchatDataTypes.MessagePredictionDataOutcome): number {
	let totalVotes = 0;
	if (prediction.value) {
		for (let i = 0; i < prediction.value.outcomes.length; i++) {
			totalVotes += prediction.value.outcomes[i]!.votes;
		}
	}
	return Math.round((c.votes / Math.max(1, totalVotes)) * 100);
}

function getAnswerStyles(c: TwitchatDataTypes.MessagePredictionDataOutcome): {
	[key: string]: string;
} {
	return {
		backgroundSize: `${getPercent(c)}% 100%`,
	};
}

function setOutcome(c: TwitchatDataTypes.MessagePredictionDataOutcome): void {
	loading.value = true;
	confirm(
		t("prediction.state.outcome_confirm_title"),
		t("prediction.state.outcome_confirm_desc", { CHOICE: c.label }),
	)
		.then(async () => {
			try {
				await TwitchUtils.endPrediction(
					prediction.value.channel_id,
					prediction.value.id,
					c.id,
				);
			} catch (error) {
				loading.value = false;
				storeCommon.alert(t("error.prediction_outcome"));
			}
			loading.value = false;
		})
		.catch(() => {
			loading.value = false;
		});
}

function deletePrediction(): void {
	loading.value = true;
	confirm(
		t("prediction.state.delete_title"),
		t("prediction.state.delete_desc"),
	)
		.then(async () => {
			try {
				await TwitchUtils.endPrediction(
					prediction.value.channel_id,
					prediction.value.id,
					"",
					true,
				);
			} catch (error) {
				loading.value = false;
				storeCommon.alert(t("error.prediction_delete"));
			}
			loading.value = false;
		})
		.catch(() => {
			loading.value = false;
		});
}

function openUserCard(): void {
	storeUsers.openUserCard(prediction.value.creator!);
}

function renderFrame(): void {
	if (disposed) return;
	requestAnimationFrame(() => renderFrame());
	const elapsed = Date.now() - prediction.value.started_at;
	const duration = prediction.value.duration_s * 1000;
	progressPercent.value = elapsed / duration;
}

onMounted(() => {
	// const elapsed = Date.now() - prediction.value.started_at;
	// const duration = prediction.value.duration_s*1000;
	// const timeLeft = duration - elapsed
	// progressPercent.value = elapsed/duration;
	// gsap.to(progressPercent, {value:1, duration:timeLeft/1000, ease:"linear"});

	renderFrame();
});

onBeforeUnmount(() => {
	disposed = true;
});
</script>

<style scoped lang="less">
.predictionstate {
	.creator {
		font-size: 0.8em;
		text-align: center;
		width: calc(100% - 1em - 10px);
		font-style: italic;
	}

	.chooseOutcomeTitle {
		align-self: stretch;
		margin-left: 1em;
		color: var(--color-light);
		margin-top: -0.8em;
		margin-bottom: -0.25em;
		pointer-events: none;
		.arrow {
			display: inline;
			font-size: 25px;
			display: inline-block;
			margin-right: -10px;
			margin-left: -7px;
			position: relative;
			top: -5px;
			animation: slide 0.5s infinite ease-in-out alternate-reverse;
			transform: rotate(-40deg);
			transform-origin: bottom right;
		}
		@keyframes slide {
			from {
				transform: rotate(-40deg);
			}
			to {
				transform: rotate(-60deg);
			}
		}
	}

	&:not(.noColorMode) {
		.choices {
			.choice {
				&:not(:first-of-type) {
					.color,
					.winBt {
						background-color: #f50e9b;
					}
				}
			}
		}
	}

	.choices {
		align-self: stretch;
		.choice {
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: stretch;
			&:not(:last-child) {
				margin-bottom: 5px;
			}

			.color {
				.emboss();
				background-color: #387aff;
				width: 1em;
				height: 1em;
				display: inline-block;
				border-radius: 50%;
				align-self: center;
				margin-right: 0.5em;
			}
			&:first-of-type {
				.color,
				.winBt {
					background-color: #387aff;
				}
			}

			.winBt {
				height: 1.25em;
				width: 1.25em;
				background-color: #387aff;
				margin-right: 0.5em;
				padding: 0px;
				:deep(.icon) {
					width: 18px;
					height: 18px;
				}
			}

			.bar {
				.emboss();
				flex-grow: 1;
				display: flex;
				flex-direction: row;
				border-radius: var(--border-radius);
				padding: 0.25em 0.5em;
				font-size: 1em;
				color: var(--color-light);
				@c: var(--color-secondary);
				transition: background-size 0.2s;
				background: linear-gradient(to right, @c 100%, @c 100%);
				background-color: var(--color-secondary-fadest);
				background-repeat: no-repeat;
				justify-content: space-between;
				align-items: center;

				.details {
					display: flex;
					flex-direction: row;

					.percent,
					.votes,
					.points {
						display: flex;
						flex-direction: row;
						align-items: center;
						padding: 0.25em 0.5em;
						border-radius: var(--border-radius);
						background-color: rgba(0, 0, 0, 0.25);
						font-size: 0.8em;

						&:not(:last-child) {
							margin-right: 0.25em;
						}

						.icon {
							height: 1em;
							margin-right: 0.25em;
						}
					}
				}
			}
		}
	}
}
</style>
