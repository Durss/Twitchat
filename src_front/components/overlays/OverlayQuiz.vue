<template>
	<div class="overlayquiz">
		<div v-if="quizData">
			<h3>{{ quizData.title }}</h3>
		 <ul>
			<li v-for="(question, index) in quizData.questionList" :key="index">
				<strong>Q{{ index + 1 }}: {{ question.question }}</strong>
				<ul>
					<li v-for="(option, optIndex) in question.answerList" :key="optIndex">
						{{ option }}
					</li>
				</ul>
			</li>
		 </ul>
		</div>
	</div>
</template>

<script setup lang="ts">
import PublicAPI from '@/utils/PublicAPI';
import { useOverlayConnector } from './composables/useOverlayConnector';
import { useRoute } from 'vue-router';
import { onBeforeUnmount, ref } from 'vue';
import type TwitchatEvent from '@/events/TwitchatEvent';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';

const route = useRoute();
const quizData = ref<TwitchatDataTypes.QuizParams|null>(null);
const quizId = route.query.twitchat_overlay_id as string ?? "";

function onConnect() {
	PublicAPI.instance.broadcast("GET_QUIZ_CONFIGS", { quizId });
	advertizePresence();
}

function advertizePresence() { PublicAPI.instance.broadcast("ON_QUIZ_OVERLAY_PRESENCE", { quizId }); }

function onQuizConfigs(e:TwitchatEvent<"ON_QUIZ_CONFIGS">) {
	quizData.value = e.data;
	console.log("Received quiz configs:", quizData.value);
}

useOverlayConnector(onConnect);

PublicAPI.instance.addEventListener("GET_QUIZ_CONFIGS", onConnect);
PublicAPI.instance.addEventListener("GET_QUIZ_OVERLAY_PRESENCE", advertizePresence);
PublicAPI.instance.addEventListener("ON_QUIZ_CONFIGS", onQuizConfigs);

onBeforeUnmount(() => {
	PublicAPI.instance.removeEventListener("GET_QUIZ_CONFIGS", onConnect);
	PublicAPI.instance.removeEventListener("GET_QUIZ_OVERLAY_PRESENCE", advertizePresence);
	PublicAPI.instance.removeEventListener("ON_QUIZ_CONFIGS", onQuizConfigs);
});

</script>

<style scoped lang="less">
.overlayquiz{
	
}
</style>