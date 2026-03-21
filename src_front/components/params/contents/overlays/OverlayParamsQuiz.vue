<template>
	<div class="overlayparamsquiz overlayParamsSection">
		<div class="header">{{ $t("quiz.form.subtitle") }}</div>

		<QuizForm embedMode></QuizForm>
	</div>
</template>

<script setup lang="ts">
import QuizForm from "@/components/chatform/quiz/QuizForm.vue";
</script>

<style scoped lang="less">
.overlayparamsquiz {
}
</style>
