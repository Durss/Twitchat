<template>
	<div class="groqhistory sidePanel">
		<div class="head">
			<div class="title">
				<Icon name="groq" />
				<h1>{{ $t("groq.history.title") }}</h1>
			</div>

			<ClearButton @click="close()" />
		</div>

		<div class="content" ref="holder">
			<GroqHistoryItem class="card-item"
				v-for="entry in entries"
				:key="entry.id"
				:entry="entry" />
		</div>
	</div>
</template>

<script lang="ts">
import { watch } from 'vue';
import { Component, toNative } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel';
import ClearButton from '../ClearButton.vue';
import GroqHistoryItem from './GroqHistoryItem.vue';

@Component({
	components:{
		ClearButton,
		GroqHistoryItem,
	},
	emits:["close"],
})
class GroqHistory extends AbstractSidePanel {

	private pageindex = 0;
	private itemsPerPage = 20;

	public get entries() {
		const list = this.$store.groq.answerHistory;
		const start = Math.max(0, list.length - ((this.pageindex+1) * this.itemsPerPage));
		return list.slice(start, start + this.itemsPerPage);
	}

	public mounted():void {
		super.open();
		const holder = this.$refs.holder as HTMLDivElement;
		holder.scrollTop = holder.scrollHeight;
		watch(()=> this.$store.groq.answerHistory, () => {
			this.$nextTick(() => {
				holder.scrollTop = holder.scrollHeight;
			});
		}, {deep:true});
	}

}
export default toNative(GroqHistory);
</script>

<style scoped lang="less">
.groqhistory{
	.content {
		overflow-y: auto;
	}
}
</style>
