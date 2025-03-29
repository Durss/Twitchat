<template>
	<div class="moderatoractionswitcher">
		<ButtonNotification :icon="modeToIcon[mode]" class="button" @click.stop="open"></ButtonNotification>

		<div class="popin blured-background-window" ref="popin" v-if="expand">
			<template v-if="broadcastermode">
				<div v-if="showDetails == 2" class="card-item infos">{{ $t("chat.form.mode_private_mods_only_details", {USER:broadcasterName}) }}</div>
				
				<TTButton class="addChanBt" :icon="modeToIcon.dm_mods"
				@click="setMode('dm_mods')"
				@mouseenter="showDetails = 2"
				@mouseleave="showDetails=-1"
				transparent medium>{{ $t("chat.form.mode_private_mods_only", {USER:broadcasterName}) }}</TTButton>
			</template>
			<template v-else>
				<div v-if="showDetails == 1" class="card-item infos">{{ $t("chat.form.mode_private_details", {USER:broadcasterName}) }}</div>
				<div v-if="showDetails == 2" class="card-item infos">{{ $t("chat.form.mode_private_mods_details", {USER:broadcasterName}) }}</div>
				<div v-if="showDetails == 3" class="card-item infos">{{ $t("chat.form.mode_question_details", {USER:broadcasterName}) }}</div>
				<div v-if="showDetails == 4" class="card-item infos">{{ $t("chat.form.mode_public_details", {USER:broadcasterName}) }}</div>

				<TTButton class="addChanBt" :icon="modeToIcon.dm"
				@click="setMode('dm')"
				@mouseenter="showDetails = 1"
				@mouseleave="showDetails=-1"
				transparent medium>{{ $t("chat.form.mode_private", {USER:broadcasterName}) }}</TTButton>
	
				<!-- <TTButton class="addChanBt" :icon="modeToIcon.dm_mods"
				@click="setMode('dm_mods')"
				@mouseenter="showDetails = 2"
				@mouseleave="showDetails=-1"
				transparent medium>{{ $t("chat.form.mode_private_mods", {USER:broadcasterName}) }}</TTButton> -->
				
				<TTButton class="addChanBt" :icon="modeToIcon.question"
				@click="setMode('question')"
				@mouseenter="showDetails = 3"
				@mouseleave="showDetails=-1"
				transparent medium>{{ $t("chat.form.mode_question", {USER:broadcasterName}) }}</TTButton>
			</template>
			
			<TTButton class="addChanBt" :icon="modeToIcon.message"
			@click="setMode('message')"
			@mouseenter="showDetails = 4"
			@mouseleave="showDetails=-1"
			transparent medium>{{ $t("chat.form.mode_public", {USER:broadcasterName}) }}</TTButton>
		</div>
	</div>
</template>

<script lang="ts">
import {toNative,  Component, Vue, Prop } from 'vue-facing-decorator';
import ButtonNotification from '../ButtonNotification.vue';
import TTButton from '../TTButton.vue';
import { gsap } from 'gsap/gsap-core';
import type { IChatState } from '@/store/StoreProxy';

@Component({
	components:{
		TTButton,
		ButtonNotification,
	},
	emits:["update:mode"],
})
class ModeratorActionSwitcher extends Vue {

	@Prop()
	public mode!:IChatState["messageMode"];

	public expand:boolean = false;
	public showDetails:number = -1;
	public modeToIcon:{[key in typeof this.mode]:string} = {
		dm:"broadcaster",
		dm_mods:"mod",
		question:"question",
		message:"whispers",
	};

	private clickHandler!:(e:MouseEvent) => void;

	public get broadcastermode():boolean { return this.$store.stream.currentChatChannel.id == this.$store.auth.twitch.user.id; }
	public get broadcasterName():string { return this.$store.stream.currentChatChannel.name; }

	public beforeMount():void {
		this.clickHandler = (e:MouseEvent) => this.onClickDOM(e);
		document.addEventListener("click", this.clickHandler);
	}
	
	public async beforeUnmount():Promise<void> {
		this.$store.chat.messageMode = "message";
		document.removeEventListener("click", this.clickHandler);
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
		this.showDetails = -1;
	}

	/**
	 * Called when changing mode
	 */
	public setMode(mode:typeof this.mode):void {
		this.$emit("update:mode", mode);
		this.close();
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
export default toNative(ModeratorActionSwitcher);
</script>

<style scoped lang="less">
.moderatoractionswitcher{
	// position: absolute;
	margin-right: 0;
	margin-right: -.5em;

	&>.button {
		min-width: 1.5em;
		min-height: 1.5em;
		font-weight: bold;
		:deep(.icon) {
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