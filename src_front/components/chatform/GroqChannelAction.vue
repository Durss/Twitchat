<template>
	<div class="groqchannelaction">
		<ButtonNotification icon="groq" class="button" @click.stop="open"
			v-newflag="{date:$config.NEW_FLAGS_DATE_V16, id:'groq_chanaction_0'}"></ButtonNotification>

		<div class="popin blured-background-window" ref="popin" v-if="expand">
			<GroqSummaryFilterForm :messageList="$store.chat.messages" @complete="close" standalone/>
		</div>
	</div>
</template>

<script lang="ts">
import { gsap } from 'gsap/gsap-core';
import { Component, toNative, Vue } from 'vue-facing-decorator';
import ButtonNotification from '../ButtonNotification.vue';
import GroqSummaryFilterForm from '../GroqSummaryFilterForm.vue';

@Component({
	components:{
		ButtonNotification,
		GroqSummaryFilterForm,
	},
	emits:[],
})
class GroqChannelAction extends Vue {

	public expand:boolean = false;
	private clickHandler!:(e:MouseEvent) => void;

	public beforeMount():void {
		this.clickHandler = (e:MouseEvent) => this.onClickDOM(e);
		document.addEventListener("click", this.clickHandler, true);
	}
	
	public async beforeUnmount():Promise<void> {
		this.$store.chat.messageMode = "message";
		document.removeEventListener("click", this.clickHandler, true);
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
	}
}
</style>