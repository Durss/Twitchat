<template>
	<div class="overlayquiz">
		<div class="wrapper">
			<OverlayQuizLeaderboard v-if="showLeaderboard && leaderboard" :users="leaderboard" />

			<div v-else-if="currentQuestion" class="content">
				<div class="question">
					<h3>{{ currentQuestion.question }}</h3>
					<div class="timer">
						<svg class="timer-svg" viewBox="0 0 100 100">
							<circle class="timer-bg" cx="50" cy="50" r="45" />
							<circle
								class="timer-progress"
								cx="50"
								cy="50"
								r="45"
								v-if="!revealAnswers && timeRemaining > 0"
								:style="{ strokeDashoffset: circleOffsetAngle }"
							/>
						</svg>
						<transition name="scale">
							<div class="timer-text" v-if="!revealAnswers && timeRemaining > 0">
								{{ Math.round(timeRemaining / 1000) }}
							</div>
						</transition>
					</div>
				</div>
				<ul
					v-if="currentQuestion && currentQuestion.mode !== 'freeAnswer'"
					class="answers"
					:key="currentQuestion.id"
				>
					<li
						v-for="(answer, index) in answerList"
						:key="answer.id"
						class="answer-item"
						:class="{ good: isGoodAnswer(answer), revealed: revealAnswers }"
					>
						<div
							class="fill"
							:style="{
								opacity: revealAnswers ? 1 : 0,
								width:
									(quizData?.currentQuestionStats?.[answer.id]?.relativePercent ??
										0) *
										100 +
									'%',
							}"
						></div>
						<span class="index">{{
							["A", "B", "C", "D", "E", "F", "G", "H"][index]
						}}</span>
						<span class="answer">{{ answer.title }}</span>
						<div
							class="info"
							v-if="revealAnswers && quizData?.currentQuestionStats?.[answer.id]"
						>
							<span class="votes"
								><Icon name="user" />{{
									quizData.currentQuestionStats[answer.id]!.voteCount
								}}</span
							>
							<span class="percent"
								>{{
									(
										quizData.currentQuestionStats[answer.id]!.globalPercent *
										100
									).toFixed(0)
								}}%</span
							>
						</div>
					</li>
				</ul>
				<div
					v-else-if="
						currentQuestion && currentQuestion.mode === 'freeAnswer' && revealAnswers
					"
					class="answers"
					:key="'FA_' + currentQuestion.id"
				>
					<div class="answer-item revealed good freeAnswer">
						<span class="answer">{{ currentQuestion.answer }}</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import PublicAPI from "@/utils/PublicAPI";
import { useOverlayConnector } from "./composables/useOverlayConnector";
import { computed, onBeforeUnmount, ref, watch } from "vue";
import type TwitchatEvent from "@/events/TwitchatEvent";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Utils from "@/utils/Utils";
import OverlayQuizLeaderboard from "./quiz/OverlayQuizLeaderboard.vue";
import Icon from "../Icon.vue";

const quizData = ref<TwitchatDataTypes.QuizParams | null>(null);
const leaderboard = ref<TwitchatDataTypes.QuizState["users"] | null>(null);
const showLeaderboard = ref(false);
const timeRemaining = ref(3000);
let timerInterval: number | null = null;

const revealAnswers = computed(() => {
	return quizData.value?.currentQuestionRevealed ?? false;
});
const currentQuestion = computed(() => {
	if (!quizData.value) return null;
	let quizId = quizData.value.currentQuestionId ?? quizData.value.questionList[0]?.id;
	if (!quizId) return null;
	return quizData.value.questionList.find((q) => q.id === quizId) ?? null;
});

const answerList = computed(() => {
	if (currentQuestion.value && currentQuestion.value.mode !== "freeAnswer") {
		const seed =
			parseInt(currentQuestion.value!.id.replace(/[^0-9]/g, "").substring(0, 4), 16) ||
			Date.now();
		const seededRnd = Utils.seededRandom(seed);
		let a = currentQuestion.value.answerList.concat();
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(seededRnd() * (i + 1));
			[a[i]!, a[j]!] = [a[j]!, a[i]!];
		}
		return a;
	}
});

const duration = computed(() => {
	return quizData.value?.durationPerQuestion_s ?? currentQuestion.value?.duration_s ?? 30;
});

const circleOffsetAngle = computed(() => {
	const progress = Math.round((timeRemaining.value / 1000 / duration.value) * 100) / 100;
	return 2 * Math.PI * 45 * (1 - progress);
});

function startTimer() {
	if (timerInterval) clearInterval(timerInterval);
	const started_at = quizData.value?.questionStarted_at;
	if (!started_at) return;
	timeRemaining.value = new Date(started_at).getTime() - Date.now() + duration.value * 1000;
	timerInterval = window.setInterval(() => {
		if (timeRemaining.value > 0) {
			timeRemaining.value -= 1000;
		} else {
			if (timerInterval) clearInterval(timerInterval);
		}
	}, 1000);
}

function isGoodAnswer(answer: { id: string; title: string; correct?: boolean }): boolean {
	if (!quizData.value || !currentQuestion.value) return false;
	if (currentQuestion.value.mode === "classic") {
		return answer.correct == true;
	} else if (currentQuestion.value.mode === "majority") {
		const maxVotes = Math.max(
			...Object.values(quizData.value.currentQuestionStats ?? {}).map((s) => s.voteCount),
		);
		return (
			quizData.value.currentQuestionStats?.[answer.id]?.voteCount == maxVotes && maxVotes > 0
		);
	}
	return false;
}

watch(currentQuestion, (newQuestion) => {
	if (newQuestion) {
		startTimer();
	}
});

function onConnect() {
	PublicAPI.instance.broadcast("GET_QUIZ_CONFIGS");
	advertizePresence();
}

function advertizePresence() {
	PublicAPI.instance.broadcast("ON_QUIZ_OVERLAY_PRESENCE");
}

/**
 * Called when a quiz state is updated. Update local data.
 * Called when starting quiz, starting next question, etc...
 */
function onQuizState(e: TwitchatEvent<"ON_QUIZ_STATE">) {
	quizData.value = e.data.quiz ?? null;
	leaderboard.value = null;
}

function onQuizLeaderboard(e: TwitchatEvent<"ON_QUIZ_LEADERBOARD">) {
	if (!quizData.value) return;
	if (leaderboard.value) {
		leaderboard.value = null;
		showLeaderboard.value = false;
		return;
	}
	leaderboard.value = e.data.leaderboard;
	showLeaderboard.value = true;
}

useOverlayConnector(onConnect);

PublicAPI.instance.addEventListener("GET_QUIZ_OVERLAY_PRESENCE", advertizePresence);
PublicAPI.instance.addEventListener("ON_QUIZ_STATE", onQuizState);
PublicAPI.instance.addEventListener("ON_QUIZ_LEADERBOARD", onQuizLeaderboard);

onBeforeUnmount(() => {
	if (timerInterval) clearInterval(timerInterval);
	PublicAPI.instance.removeEventListener("GET_QUIZ_OVERLAY_PRESENCE", advertizePresence);
	PublicAPI.instance.removeEventListener("ON_QUIZ_STATE", onQuizState);
	PublicAPI.instance.removeEventListener("ON_QUIZ_LEADERBOARD", onQuizLeaderboard);
});

const scaleFactor = computed(() => {
	return Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
});
</script>

<style scoped lang="less">
.overlayquiz {
	width: 1920px;
	height: 1080px;
	position: fixed;
	top: 50%;
	left: 50%;
	transform: scale(v-bind(scaleFactor)) translate(-50%, -50%);
	transform-origin: top left;
	font-size: 18px;

	.wrapper {
		margin: auto;
		display: block;
		position: absolute;
		margin: auto;
		left: 0;
		right: 0;
		width: 60%;
		bottom: 50px;
	}

	.content {
		animation: slideUp 0.5s ease-out;
	}

	.question {
		background: linear-gradient(135deg, var(--color-primary-dark), var(--color-primary-fade));
		backdrop-filter: blur(10px);
		border-radius: 1.5em;
		padding: 1em 1.5em;
		margin-bottom: 1em;
		display: flex;
		align-items: center;
		gap: 2em;
		width: 100%;

		h3 {
			margin: 0;
			font-size: 1.75em;
			font-weight: 700;
			color: #ffffff;
			text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
			line-height: 1.3;
			flex: 1;
			text-align: center;
			text-wrap: balance;
			word-break: break-word;
		}

		.timer {
			position: relative;
			width: 80px;
			height: 80px;
			flex-shrink: 0;

			.timer-svg {
				width: 100%;
				height: 100%;
				transform: rotate(90deg) scaleX(-1);
				filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.5));

				.timer-bg {
					fill: none;
					stroke: rgba(255, 255, 255, 0.2);
					stroke-width: 8;
				}

				.timer-progress {
					fill: none;
					stroke: #ffffff;
					stroke-width: 8;
					stroke-linecap: round;
					stroke-dasharray: 283;
					transition: stroke-dashoffset 1s linear;
				}
			}

			.timer-text {
				position: absolute;
				top: 50%;
				left: 50%;
				font-size: 1.8em;
				font-weight: 800;
				color: #ffffff;
				text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
				transition: transform 0.35s;
				transform-origin: center;
				transform: translate(-50%, -50%) scale(1);

				&.scale-enter-from,
				&.scale-leave-to {
					transform: translate(-50%, -50%) scale(0);
				}
			}
		}
	}

	.answers {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(45%, 1fr));
		gap: 0.5em;

		.answer-item {
			background: var(--grayout);
			backdrop-filter: blur(10px);
			border-radius: 1em;
			padding: 1em 1.2em;
			display: flex;
			gap: 1em;
			transition: filter 0.3s ease;
			animation: fadeIn 0.5s ease-out backwards;
			cursor: pointer;
			align-items: center;
			position: relative;
			overflow: hidden;

			.fill {
				z-index: 0;
				position: absolute;
				top: 0;
				left: 0;
				bottom: 0;
				width: 0;
				transition: width 1s;
				background: rgba(0, 0, 0, 0.15);
				border-top-right-radius: 1em;
				border-bottom-right-radius: 1em;
				// backdrop-filter: brightness(1.25);
			}

			&:nth-last-child(1):nth-child(2n - 1) {
				grid-column: span 2;
			}

			&:nth-child(1) {
				animation-delay: 0.1s;
			}
			&:nth-child(2) {
				animation-delay: 0.2s;
			}
			&:nth-child(3) {
				animation-delay: 0.3s;
			}
			&:nth-child(4) {
				animation-delay: 0.4s;
			}
			&:nth-child(5) {
				animation-delay: 0.5s;
			}
			&:nth-child(6) {
				animation-delay: 0.6s;
			}
			&:nth-child(7) {
				animation-delay: 0.7s;
			}
			&:nth-child(8) {
				animation-delay: 0.8s;
			}
			&:nth-child(9) {
				animation-delay: 0.9s;
			}
			&:nth-child(10) {
				animation-delay: 1s;
			}

			&:hover {
				filter: brightness(1.5);
			}

			&.revealed.good {
				background: var(--color-primary-fade);
			}

			&.freeAnswer {
				margin: auto;
			}

			&.revealed:not(.good) {
				background: var(--color-secondary-fade);
				.index {
					background: var(--color-secondary);
				}
			}

			.index {
				z-index: 1;
				flex-shrink: 0;
				width: 2.2em;
				height: 2.2em;
				background: linear-gradient(
					135deg,
					var(--color-primary),
					var(--color-primary-dark)
				);
				border-radius: 50%;
				display: flex;
				align-items: center;
				justify-content: center;
				font-weight: 800;
				font-size: 1.2em;
				color: #ffffff;
				text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
				box-shadow: 0 2px 8px var(--color-dark);
			}

			.answer {
				z-index: 1;
				flex: 1;
				font-size: 1.3em;
				font-weight: 500;
				color: #ffffff;
				text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
				line-height: 1.4;
				word-break: break-word;
			}

			.info {
				z-index: 1;
				margin-left: auto;
				display: flex;
				flex-direction: column;
				align-items: center;
				gap: 0.25em;
				font-size: 1.2em;
				color: #ffffff;
				background-color: rgba(0, 0, 0, 0.25);
				padding: 0.25em 0.5em;
				border-radius: 0.5em;

				.votes {
					text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
					gap: 0.25em;
					display: inline-flex;
					align-items: center;
					font-weight: bold;
					.icon {
						height: 0.8em;
					}
				}
				.percent {
					font-size: 0.8em;
					font-style: italic;
				}
			}
		}
	}
}

@keyframes slideUp {
	from {
		opacity: 0;
		transform: translateY(50px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

@keyframes fadeIn {
	from {
		opacity: 0;
		transform: scale(0.95);
	}
	to {
		opacity: 1;
		transform: scale(1);
	}
}
</style>
