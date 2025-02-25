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
			<div class="card-item entry"
			v-for="entry in entries"
			:key="entry.id"
			:class="{isNew:entry.date > Date.now() - 10000}">
				<div class="wrapper">
					<ToggleBlock v-if="entry.preprompt" :open="false" title="Preprompt" small>
						<div class="preprompt">{{ entry.preprompt.trim() }}</div>
					</ToggleBlock>
					<ToggleBlock v-if="entry.prompt" :open="false" title="Prompt" small>
						<div class="prompt">{{ entry.prompt.trim() }}</div>
					</ToggleBlock>
					<img v-if="entry.answer.length < 2" class="loader" src="@/assets/icons/loader.svg" />
					<div v-else>{{ entry.answer }}</div>
					<div class="date">{{ dateMaps[entry.id].display }}</div>
					<!-- <input type="text" :placeholder="$t('groq.reprompt_placeholder')"> -->
				</div>
				<TTButton icon="trash" alert @click="deleteEntry(entry.id)" />
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { Component, toNative } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel';
import ClearButton from '../ClearButton.vue';
import ToggleBlock from '../ToggleBlock.vue';
import Utils from '@/utils/Utils';
import TTButton from '../TTButton.vue';
import { watch } from 'vue';

@Component({
	components:{
		TTButton,
		ToggleBlock,
		ClearButton,
	},
	emits:["close"],
})
class GroqHistory extends AbstractSidePanel {

	public dateMaps:{[id:string]:{display:string, ts:number, elapsed:number}} = {};

	private pageindex = 0;
	private itemsPerPage = 20;
	private refreshTimeout = -1;

	public get entries() {
		const list = this.$store.groq.answerHistory;
		const start = Math.max(0, list.length - ((this.pageindex+1) * this.itemsPerPage));
		const res = list.slice(start, start + this.itemsPerPage);
		this.dateMaps = {};
		res.forEach((entry) => {
			this.dateMaps[entry.id] = {display:"", ts:entry.date, elapsed:Date.now() - entry.date};
		});
		return res;
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

		this.refreshDate();
	}

	public beforeUnmount():void {
		clearTimeout(this.refreshTimeout);
	}

	public async deleteEntry(id:string):Promise<void> {
		await this.$store.groq.removeAnswer(id);
		if(this.$store.groq.answerHistory.length === 0) this.close();
	}

	/**
	 * Refreshes the date at a regular interval
	 */
	public refreshDate() {
		for (const key in this.dateMaps) {
			const entry = this.dateMaps[key];
			entry.display = this.formatDate(entry.ts);
			entry.elapsed = Date.now() - entry.ts;
		}
		clearTimeout(this.refreshTimeout);
		this.refreshTimeout = window.setTimeout(() => {
			this.refreshDate();
		}, 1000);
	}

	/**
	 * Formats a date
	 */
	private formatDate(ts:number):string {
		const elapsed = Date.now() - ts;
		if(elapsed > 2 * 24 * 60 * 60 * 1000) {
			return Utils.formatDate(new Date(ts));
		}
		if(elapsed < 5000) return this.$t("global.elapsed_duration_now");
		return this.$t("global.elapsed_duration", {DURATION:Utils.formatDuration(elapsed)});
	}

}
export default toNative(GroqHistory);
</script>

<style scoped lang="less">
.groqhistory{
	.preprompt, .prompt{
		font-size: .8em;
		white-space: pre-line;
	}
	.entry {
		line-height: 1.2em;
		flex-shrink: 0;
		gap: .5em;
		display: flex;
		flex-direction: row;
		transition: background 2s, outline 2s;
		outline: 1px solid transparent;
		.wrapper {
			gap: .25em;
			display: flex;
			flex-direction: column;
			flex: 1;
		}
		.button {
			flex-shrink: 0;
		}
		&.isNew {
			outline-color: var(--color-secondary);
			background: var(--color-secondary-fadest);
		}
	}

	.loader {
		width: 1.5em;
		margin: 0 auto;
	}

	.date {
		font-style: italic;
		opacity: .7;
		font-size: .8em;
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	.content {
		overflow-y: auto;
	}
}
</style>
