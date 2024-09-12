<template>
	<div class="textsplitter">
		<span v-for="word in chunks" class="word">
			<span v-for="letter in word" class="letter">{{ letter }}</span>
		</span>
	</div>
</template>

<script lang="ts">
import { toNative, Component, Vue } from 'vue-facing-decorator';

@Component({
	components: {},
	emits: [],
})
class TextSplitter extends Vue {

	public chunks:string[][] = [];

	public mounted(): void {
		const slotText = this.$slots.default ? this.$slots.default()[0].children?.toString() || "" : "";
		const wordList = slotText.split(" ");
		const words = wordList.map((word, wordIndex) => {
			const letterList = Array.from(word).map((letter, letterIndex) => {
				return letter;
			});
			if(wordIndex < wordList.length) letterList.push(" ");
			return letterList;
		});
		this.chunks = words;
	}

}
export default toNative(TextSplitter);
</script>

<style scoped lang="less">
.textsplitter {

}
</style>