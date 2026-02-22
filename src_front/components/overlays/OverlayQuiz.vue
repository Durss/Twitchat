<template>
	<div class="overlayquiz">
		<div v-if="currentQuestion" class="content">
			<div class="question">
				<h3>{{ currentQuestion.question }}</h3>
				<div class="timer">
					<svg class="timer-svg" viewBox="0 0 100 100">
						<circle class="timer-bg" cx="50" cy="50" r="45" />
						<circle class="timer-progress" cx="50" cy="50" r="45" 
							v-if="!revealAnswers && timeRemaining > 0"
							:style="{ strokeDashoffset: circleOffsetAngle }" />
					</svg>
					<transition name="scale">
						<div class="timer-text" v-if="!revealAnswers && timeRemaining > 0">{{ Math.round(timeRemaining / 1000) }}</div>
					</transition>
				</div>
			</div>
			<ul v-if="currentQuestion && currentQuestion.mode !== 'freeAnswer'" class="answers" :key="currentQuestion.id">
				<li v-for="(answer, index) in answerList" :key="answer.id" class="answer-item"
				:class="{ good: isGoodAnswer(answer), revealed: revealAnswers }">
					<span class="index">{{ ["A", "B", "C", "D", "E", "F", "G", "H"][index] }}</span>
					<span class="answer">{{ answer.title }}</span>
					<span class="votes" v-if="revealAnswers">{{ answersVotes[answer.id] ? `(${answersVotes[answer.id]} votes)` : "" }}</span>
				</li>
			</ul>
		</div>
	</div>
</template>

<script setup lang="ts">
import PublicAPI from '@/utils/PublicAPI';
import { useOverlayConnector } from './composables/useOverlayConnector';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import type TwitchatEvent from '@/events/TwitchatEvent';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';

const quizData = ref<TwitchatDataTypes.QuizParams|null>(null);
const timeRemaining = ref(3000);
const answersVotes = ref<{[answerId: string]: number}>({});
let timerInterval: number | null = null;

const revealAnswers = computed(()=> {
	return quizData.value?.currentQuestionRevealed ?? false;
});
const currentQuestion = computed(()=> {
	if(!quizData.value) return null;
	let quizId = quizData.value.currentQuestionId ?? quizData.value.questionList[0]?.id;
	if(!quizId) return null;
	return quizData.value.questionList.find(q => q.id === quizId) ?? null;
});

const answerList = computed(()=> {
	if(currentQuestion.value && currentQuestion.value.mode !== "freeAnswer") {
		const seed = parseInt(currentQuestion.value!.id.replace(/[^0-9]/g, '').substring(0, 4), 16) || Date.now();
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
	const progress = Math.round(((timeRemaining.value/1000) / duration.value) * 100) / 100;
	return 2 * Math.PI * 45 * (1 - progress);
});

function startTimer() {
	if (timerInterval) clearInterval(timerInterval);
	const started_at = quizData.value?.questionStarted_at;
	if(!started_at) return;
	timeRemaining.value = new Date(started_at).getTime() - Date.now() + duration.value * 1000;
	timerInterval = window.setInterval(() => {
		if (timeRemaining.value > 0) {
			timeRemaining.value-=1000;
		} else {
			if (timerInterval) clearInterval(timerInterval);
		}
	}, 1000);
}

function isGoodAnswer(answer:{id:string; title:string; correct?:boolean}):boolean {
	if(!quizData.value || !currentQuestion.value) return false;
	if(currentQuestion.value.mode === "classic") {
		return answer.correct == true;
	}else if(currentQuestion.value.mode === "majority") {
		const maxVotes = Math.max(...Object.values(answersVotes.value));
		return answersVotes.value[answer.id] == maxVotes && maxVotes > 0;
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

function advertizePresence() { PublicAPI.instance.broadcast("ON_QUIZ_OVERLAY_PRESENCE"); }

/**
 * Called when a quiz config is updated. Update local data.
 * Called when starting quiz, starting next question, etc...
 */
function onQuizConfigs(e:TwitchatEvent<"ON_QUIZ_CONFIGS">) {
	quizData.value = e.data.quiz ?? null;
}

useOverlayConnector(onConnect);

PublicAPI.instance.addEventListener("GET_QUIZ_OVERLAY_PRESENCE", advertizePresence);
PublicAPI.instance.addEventListener("ON_QUIZ_CONFIGS", onQuizConfigs);

onBeforeUnmount(() => {
	if (timerInterval) clearInterval(timerInterval);
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
				font-size: 1.8em;
				font-weight: 800;
				color: #ffffff;
				text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
				transition: transform .35s;
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

			&.revealed.good {
				background: linear-gradient(135deg, var(--color-primary-dark), var(--color-primary-dark));
				box-shadow: 0 4px 16px rgba(0, 100, 0, 0.5);
			}

			&.revealed:not(.good) {
				opacity: 0.7;
				background: linear-gradient(135deg, var(--color-secondary-dark), var(--color-secondary-dark));
				.index {
					background: linear-gradient(135deg, var(--color-secondary), var(--color-secondary-dark));
				}
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

			.votes {
				font-size: 0.9em;
				color: #ffffff;
				text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
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