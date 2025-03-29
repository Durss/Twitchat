<template>
	<div class="groqhistoryitem card-item"
	:key="entry.id"
	:class="{isNew:entry.date > Date.now() - 10000}">
		<div class="wrapper">
			<ToggleBlock v-if="entry.preprompt" :open="false" title="Preprompt" small>
				<div class="preprompt">{{ deanonymizeUsers(entry.preprompt.trim()) }}</div>
			</ToggleBlock>
			<ToggleBlock v-if="entry.prompt" :open="false" title="Prompt" small>
				<div class="prompt">{{ deanonymizeUsers(entry.prompt.trim()) }}</div>
			</ToggleBlock>
			<img v-if="entry.answer.length < 2 || reprompting" class="loader" src="@/assets/icons/loader.svg" />
			<div class="answer" v-else>{{ deanonymizeUsers(entry.answer) }}</div>
			<div class="date">{{ date }}</div>

			<form @submit.prevent="onSubmit">
				<contenteditable class="input input-field" tag="p"
					v-model="newPrompt"
					:no-nl="false"
					:no-html="true"
					:placeholder="$t('groq.reprompt_placeholder')"
					@keydown.enter="onEnter" />
				<div class="placeholder" v-if="newPrompt.trim().length === 0">{{ $t('groq.reprompt_placeholder') }}</div>
				<TTButton icon="checkmark"></TTButton>
			</form>
		</div>
		<TTButton icon="trash" alert @click="deleteEntry(entry.id)" />
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import contenteditable from 'vue-contenteditable';
import { Component, Prop, toNative, Vue } from 'vue-facing-decorator';
import ClearButton from '../ClearButton.vue';
import ToggleBlock from '../ToggleBlock.vue';
import TTButton from '../TTButton.vue';

@Component({
	components:{
		TTButton,
		ToggleBlock,
		ClearButton,
		contenteditable,
	},
	emits:["close"],
})
class GroqHistoryItem extends Vue {

	@Prop
	public entry!:TwitchatDataTypes.GroqHistoryItem;

	public date:string = "";
	public newPrompt:string = "";
	public reprompting:boolean = false;

	private refreshTimeout = -1;

	public mounted():void {
		this.refreshDate();
	}

	public beforeUnmount():void {
		clearTimeout(this.refreshTimeout);
	}

	public async deleteEntry(id:string):Promise<void> {
		await this.$store.groq.removeAnswer(id);
		if(this.$store.groq.answerHistory.length === 0) this.$emit('close');
	}

	/**
	 * Submit new prompt on Enter but not Shift+Enter
	 * @param e
	 */
	public onEnter(e:KeyboardEvent):void {
		if(e.shiftKey) return;
		e.preventDefault();
		this.onSubmit();
	}

	/**
	 * Submits form for new prompt
	 */
	public async onSubmit():Promise<void> {
		this.reprompting = true;
		await this.$store.groq.repromptHistoryEntry(this.entry.id, this.newPrompt);
		this.reprompting = false;
		this.newPrompt = "";
	}

	/**
	 * Refreshes the date at a regular interval
	 */
	public refreshDate() {
		this.date = this.formatDate(this.entry.date);
			// entry.elapsed = Date.now() - entry.ts;
		clearTimeout(this.refreshTimeout);
		this.refreshTimeout = window.setTimeout(() => {
			this.refreshDate();
		}, 1000);
	}

	/**
	 * Deanonimize username
	 * @param text
	 */
	public deanonymizeUsers(text:string):string {
		for (const login in this.entry.userMap) {
			const anon = this.entry.userMap[login];
			const reg = new RegExp(anon.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1"), "gi");
			text = text.replace(reg, login);
		}
		return text
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
		if(elapsed < 10 * 60 * 1000) {
			return this.$t("global.elapsed_duration", {DURATION:Utils.formatDuration(elapsed)});
		}else{
			return Utils.formatDate(new Date(ts), true);
		}
	}

}
export default toNative(GroqHistoryItem);
</script>

<style scoped lang="less">
.groqhistoryitem{
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

		form {
			display: flex;
			flex-direction: row;
			gap: 1px;
			position: relative;
			align-items: stretch;
			.input {
				flex: 1;
				word-break: break-word;
			}
			* {
				border-radius: 0;
				&:first-child{
					border-top-left-radius: var(--border-radius);
					border-bottom-left-radius: var(--border-radius);
				}
				&:last-child{
					border-top-right-radius: var(--border-radius);
					border-bottom-right-radius: var(--border-radius);
				}
			}

			.placeholder {
				font-style: italic;
				opacity: .7;
				position: absolute;
				margin-left: 1em;
				pointer-events: none;
				align-self: center;
			}
		}

		.preprompt, .prompt{
			font-size: .8em;
			white-space: pre-line;
		}

		.loader {
			width: 1.5em;
			margin: 0 auto;
		}

		.answer {
			white-space: pre-line;
		}

		.date {
			font-style: italic;
			opacity: .7;
			font-size: .8em;
			text-align: right;
			font-variant-numeric: tabular-nums;
		}
	}
	&.isNew {
		outline-color: var(--color-secondary);
		background: var(--color-secondary-fadest);
	}
	.button {
		flex-shrink: 0;
	}
}
</style>
