<template>
	<div class="groqchannelaction">
		<ButtonNotification icon="groq" class="button" @click.stop="open"
			v-newflag="{date:$config.NEW_FLAGS_DATE_V16, id:'groq_chanaction_0'}"></ButtonNotification>

		<div class="popin blured-background-window" ref="popin" v-if="expand">
			<i18n-t scope="global" tag="span" keypath="groq.summarize_durations">
				<template #DURATION>
					<select name="duration" ref="duration" v-model="duration">
						<option value="1">{{ $t("groq.summarize_1m_bt") }}</option>
						<option value="2">{{ $t("groq.summarize_2m_bt") }}</option>
						<option value="5">{{ $t("groq.summarize_5m_bt") }}</option>
						<option value="10">{{ $t("groq.summarize_10m_bt") }}</option>
						<option value="30">{{ $t("groq.summarize_30m_bt") }}</option>
						<option value="60">{{ $t("groq.summarize_60m_bt") }}</option>
					</select>
				</template>
			</i18n-t>
			<TTButton @click="summarize" icon="groq" :loading="loading" :disabled="messageList.length === 0">{{ $t("groq.summarize_duration_bt", {COUNT:messageList.length}) }}</TTButton>
		</div>
	</div>
</template>

<script lang="ts">
import { Component, toNative, Vue } from 'vue-facing-decorator';
import ButtonNotification from '../ButtonNotification.vue';
import TTButton from '../TTButton.vue';
import { gsap } from 'gsap/gsap-core';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';

@Component({
	components:{
		TTButton,
		ButtonNotification,
	},
	emits:[],
})
class GroqChannelAction extends Vue {

	public loading:boolean = false;
	public expand:boolean = false;
	public duration:string = "2";
	private clickHandler!:(e:MouseEvent) => void;

	public get messageList():TwitchatDataTypes.MessageChatData[] {
		const now = Date.now();
		return this.$store.chat.messages.filter(m => (
			m.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE
			&& now - m.date < parseInt(this.duration) * 60 * 1000
		)) as TwitchatDataTypes.MessageChatData[];
	}

	public beforeMount():void {
		this.clickHandler = (e:MouseEvent) => this.onClickDOM(e);
		document.addEventListener("click", this.clickHandler);
	}
	
	public async beforeUnmount():Promise<void> {
		this.$store.chat.messageMode = "message";
		document.removeEventListener("click", this.clickHandler);
	}

	public async summarize():Promise<void> {
		this.loading = true;
		try {
			await this.$store.groq.getSummary(this.messageList);
		}catch(e) {
			console.error(e);
			return;
		}
		this.close();
	}

	public click1(event:MouseEvent):void {
		event.preventDefault();
		event.stopPropagation();
		console.log("ok1")
		// const duration = (this.$refs.duration as HTMLSelectElement).value;
		// this.$store.chat.sendGroqSummary(duration);
		// this.close();
	}

	/**
	 * Opens the window
	 */
	public async open(event:MouseEvent):Promise<void> {
		event.stopPropagation();
		event.preventDefault();
		if(this.expand) {
			this.onClickDOM(event);
			return;
		}
		this.expand = true;
		await this.$nextTick();
		const holder = this.$refs.popin as HTMLDivElement;
		gsap.killTweensOf(holder);
		gsap.fromTo(holder, {scaleY:0}, {duration:.25, scaleY:1, ease:"back.out", delay:.05});
	}

	/**
	 * Closes the window
	 */
	public close():void {
		const holder = this.$refs.popin as HTMLDivElement;
		if(!holder) return;
		gsap.killTweensOf(holder);
		gsap.to(holder, {duration:.1, scaleY:0, clearProps:"scaleY", ease:"back.in", onComplete:() => {
			this.expand = false;
		}});
	}

	/**
	 * Detects click outside of the window to close it
	 */
	private onClickDOM(e:MouseEvent):void {
		if(!this.expand) return;
		const holder = this.$refs.popin as HTMLDivElement;
		if(!holder) return;

		let target = e.target as HTMLElement;
		while(target != document.body && target != holder && target != null) {
			target = target.parentElement as HTMLElement;
		}
		if(target === document.body) {
			this.close();
		}
	}

}
export default toNative(GroqChannelAction);
</script>

<style scoped lang="less">
.groqchannelaction{

	.newFlag {
		border: 1px solid var(--color-secondary);
		&::before {
			top: 0;
			left: 0;
		}
	}

	&>.button {
		min-width: 1.5em;
		min-height: 1.5em;
		font-weight: bold;
		:deep(.icon) {
			width: auto;
			font-size: .8em;
		}
	}

	.popin {
		position: absolute;
		bottom: 100%;
		gap: .25em;
		display: flex;
		flex-direction: column;
		max-width: 500px;

		.infos {
			font-style: italic;
			font-size: .85em;
			color: var(--color-secondary);
			white-space: pre-line;
			font-weight: normal;
			text-align: center;
			line-height: 1.2em;
		}
	}
}
</style>