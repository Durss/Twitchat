<template>
	<div class="textsplitter">
		<span v-for="word in chunks" class="word">
			<span v-for="letter in word" class="letter">{{ letter }}</span>
		</span>
	</div>
</template>

<script lang="ts">
import { watch } from 'vue';
import { toNative, Component, Vue, Prop } from 'vue-facing-decorator';

@Component({
	components: {},
	emits: [],
})
class TextSplitter extends Vue {

	@Prop({default:"", type:String})
	public message!:string;

	public chunks:string[][] = [];

	public mounted(): void {
		this.renderText();
		watch(()=>this.message, ()=>this.renderText());
	}
	
	private renderText():void{
		const slotText = this.message || "";
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