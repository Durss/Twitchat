<template>
	<div class="textsplitter">
		<span v-for="word in chunks" class="word">
			<span v-for="letter in word" class="letter">{{ letter }}</span>
		</span>
	</div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";

const props = withDefaults(
	defineProps<{
		message?: string;
	}>(),
	{
		message: "",
	},
);

const chunks = ref<string[][]>([]);

onMounted(() => {
	renderText();
});

watch(
	() => props.message,
	() => renderText(),
);

function renderText(): void {
	const slotText = props.message || "";
	const wordList = slotText.split(" ");
	const words = wordList.map((word, wordIndex) => {
		const letterList = Array.from(word).map((letter, letterIndex) => {
			return letter;
		});
		if (wordIndex < wordList.length) letterList.push(" ");
		return letterList;
	});
	chunks.value = words;
}
</script>

<style scoped lang="less">
.textsplitter {
}
</style>
