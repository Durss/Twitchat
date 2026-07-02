<template>
	<div class="overlayParamsSection">
		<div class="header">{{ $t("quiz.form.subtitle") }}</div>

		<QuizForm embedMode></QuizForm>
	</div>
</template>

<script setup lang="ts">
import QuizForm from "@/components/quiz/QuizForm.vue";
</script>
