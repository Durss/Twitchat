<template>
	<div class="overlayquiz">
		<div v-if="currentQuestion" class="content">
			<div class="question">
				<h3>{{ currentQuestion.question }}</h3>
				<div class="timer">
					<svg class="timer-svg" viewBox="0 0 100 100">
						<circle class="timer-bg" cx="50" cy="50" r="45" />
						<circle class="timer-progress" cx="50" cy="50" r="45" 
							v-if="timeRemaining > 0"
							:style="{ strokeDashoffset: circleOffsetAngle }" />
					</svg>
					<span class="timer-text" v-if="timeRemaining > 0">{{ timeRemaining }}</span>
				</div>
			</div>
			<ul v-if="!isFreeAnswerQuestion(currentQuestion)" class="answers" :key="currentQuestion.id">
				<li v-for="(answer, index) in answerList" :key="answer.id" class="answer-item">
					<span class="index">{{ ["A", "B", "C", "D", "E", "F", "G", "H"][index] }}</span>
					<span class="answer">{{ answer.title }}</span>
				</li>
			</ul>
		</div>
	</div>
</template>

<script setup lang="ts">
import PublicAPI from '@/utils/PublicAPI';
import { useOverlayConnector } from './composables/useOverlayConnector';
import { useRoute } from 'vue-router';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import type TwitchatEvent from '@/events/TwitchatEvent';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';

const route = useRoute();
const quizData = ref<TwitchatDataTypes.QuizParams|null>(null);
const quizId = route.query.twitchat_overlay_id as string ?? "";
const timeRemaining = ref(30);
const seed = parseInt(quizId.replace(/[^0-9]/g, ''), 16) || Date.now();
let timerInterval: number | null = null;

const currentQuestion = computed(()=> {
	if(!quizData.value) return null;
	let quizId = quizData.value.currentQuestionId ?? quizData.value.questionList[0]?.id;
	if(!quizId) return null;
	return quizData.value.questionList.find(q => q.id === quizId) ?? null;
});

const answerList = computed(()=> {
	if(currentQuestion.value && !isFreeAnswerQuestion(currentQuestion.value)) {
		const seededRnd = Utils.seededRandom(seed);
		let a = currentQuestion.value.answerList.concat();
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(seededRnd() * (i + 1));
			[a[i]!, a[j]!] = [a[j]!, a[i]!];
		}
		return a;
	}
});

const duration = computed(()=> {
	return quizData.value?.durationPerQuestion_s ?? currentQuestion.value?.duration_s ?? 30;
});

const circleOffsetAngle = computed(() => {
	const progress = timeRemaining.value / duration.value;
	return 2 * Math.PI * 45 * (1 - progress);
});

function startTimer() {
	if (timerInterval) clearInterval(timerInterval);
	const started_at = quizData.value?.questionStarted_at;
	if(!started_at) return;
	timeRemaining.value = new Date(started_at).getTime() - Date.now() + duration.value * 1000;
	timerInterval = window.setInterval(() => {
		if (timeRemaining.value > 0) {
			timeRemaining.value--;
		} else {
			if (timerInterval) clearInterval(timerInterval);
		}
	}, 1000);
}

watch(currentQuestion, (newQuestion) => {
	if (newQuestion) {
		startTimer();
	}
});

function onConnect() {
	PublicAPI.instance.broadcast("GET_QUIZ_CONFIGS", { quizId });
	advertizePresence();
}

function advertizePresence() { PublicAPI.instance.broadcast("ON_QUIZ_OVERLAY_PRESENCE", { quizId }); }

/**
 * Check if question is from a free answer quiz
 */
function isFreeAnswerQuestion(_question: any): _question is TwitchatDataTypes.QuizParams<"freeAnswer">["questionList"][number] {
	return quizData.value?.mode === "freeAnswer";
}

function onQuizConfigs(e:TwitchatEvent<"ON_QUIZ_CONFIGS">) {
	quizData.value = e.data;
}

useOverlayConnector(onConnect);

PublicAPI.instance.addEventListener("GET_QUIZ_CONFIGS", onConnect);
PublicAPI.instance.addEventListener("GET_QUIZ_OVERLAY_PRESENCE", advertizePresence);
PublicAPI.instance.addEventListener("ON_QUIZ_CONFIGS", onQuizConfigs);

onBeforeUnmount(() => {
	if (timerInterval) clearInterval(timerInterval);
	PublicAPI.instance.removeEventListener("GET_QUIZ_CONFIGS", onConnect);
	PublicAPI.instance.removeEventListener("GET_QUIZ_OVERLAY_PRESENCE", advertizePresence);
	PublicAPI.instance.removeEventListener("ON_QUIZ_CONFIGS", onQuizConfigs);
});

</script>

<style scoped lang="less">
.overlayquiz{
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	width: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 2em;
	box-sizing: border-box;
	
	.content {
		width: 100%;
		max-width: 1200px;
		animation: slideUp 0.5s ease-out;
	}
	
	.question {
		background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
		backdrop-filter: blur(10px);
		border-radius: 16px;
		padding: 1.5em 2em;
		margin-bottom: 1em;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
		display: flex;
		align-items: center;
		gap: 2em;
		min-width: 400px;
		
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
				filter: drop-shadow(0 0 5px rgba(255, 255, 255, .5));
				
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
				transform: translate(-50%, -50%);
				font-size: 1.8em;
				font-weight: 800;
				color: #ffffff;
				text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
			}
		}
	}
	
	.answers {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
		gap: 0.8em;
		
		.answer-item {
			background: linear-gradient(135deg, rgba(30, 30, 30, 0.95), rgba(50, 50, 50, 0.95));
			backdrop-filter: blur(10px);
			border-radius: 12px;
			padding: 1.2em 1.5em;
			display: flex;
			gap: 1em;
			box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
			transition: all 0.3s ease;
			animation: fadeIn 0.5s ease-out backwards;
			cursor: pointer;

			&:nth-last-child(1):nth-child(2n - 1) {
  				grid-column: span 2;
			}

			&:nth-child(1) { animation-delay: 0.1s; }
			&:nth-child(2) { animation-delay: 0.2s; }
			&:nth-child(3) { animation-delay: 0.3s; }
			&:nth-child(4) { animation-delay: 0.4s; }
			&:nth-child(5) { animation-delay: 0.5s; }
			&:nth-child(6) { animation-delay: 0.6s; }
			&:nth-child(7) { animation-delay: 0.7s; }
			&:nth-child(8) { animation-delay: 0.8s; }
			&:nth-child(9) { animation-delay: 0.9s; }
			&:nth-child(10) { animation-delay: 1s; }
			
			&:hover {
				transform: translateY(-2px);
				box-shadow: 0 6px 20px var(--color-dark-fade);
				background: linear-gradient(135deg, var(--color-secondary-dark), var(--color-secondary-dark));
			}
			
			.index {
				flex-shrink: 0;
				width: 2.2em;
				height: 2.2em;
				background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
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
				flex: 1;
				font-size: 1.3em;
				font-weight: 500;
				color: #ffffff;
				text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
				line-height: 1.4;
				word-break: break-word;
				margin-top: .25em;
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