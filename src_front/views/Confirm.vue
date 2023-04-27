<template>
	<div class="confirmView" v-if="confirmData">
		<div class="dimmer" ref="dimmer" @click="answer(false)"></div>
		<div class="holder" ref="holder">
			<!-- <img src="@/assets/icons/lock_fit.svg" class="icon"> -->

			<div class="title" v-html="confirmData.title"></div>
			
			<VoiceGlobalCommandsHelper v-if="voiceControl" :confirmMode="true" />

			<div class="description" v-html="confirmData.description"></div>
			<div class="buttons">
				<Button class="button" @click.stop="answer()" type="cancel" alert>{{ confirmData.noLabel ?? $t('global.cancel') }}</Button>
				<Button class="button" @click.stop="answer(true)">{{ confirmData.yesLabel ?? $t('global.yes') }}</Button>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import FormVoiceControllHelper from '@/components/voice/FormVoiceControllHelper';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap';
import { Component, Vue } from 'vue-facing-decorator';
import VoiceGlobalCommandsHelper from '../components/voice/VoiceGlobalCommandsHelper.vue';

@Component({
	components:{
		Button,
		VoiceGlobalCommandsHelper,
	}
})
export default class Confirm extends Vue {
	
	public confirmData:TwitchatDataTypes.ConfirmData|null = null;
	public submitPressed = false;
	public voiceControl = false;
	
	private keyUpHandler!:(e:KeyboardEvent) => void;
	private keyDownHandler!:(e:KeyboardEvent) => void;
	private voiceController!:FormVoiceControllHelper;

	public mounted():void {
		this.keyUpHandler = (e:KeyboardEvent) => this.onKeyUp(e);
		this.keyDownHandler = (e:KeyboardEvent) => this.onDownUp(e);
		document.addEventListener("keyup", this.keyUpHandler);
		document.addEventListener("keydown", this.keyDownHandler);
		watch(() => this.$store("main").confirmData, async () => {
			await Utils.promisedTimeout(50);
			this.onConfirmChanged();
		});
	}

	public beforeUnmount():void {
		document.removeEventListener("keyup", this.keyUpHandler);
		document.removeEventListener("keydown", this.keyDownHandler);
	}

	public async onConfirmChanged():Promise<void> {
		const d = this.$store("main").confirmData;
		
		let hidden = d == null;

		if(!hidden) {
			this.confirmData = d;
			await this.$nextTick();
			const holder = this.$refs.holder as HTMLElement;
			const dimmer = this.$refs.dimmer as HTMLElement;
			this.voiceControl = d!.STTOrigin === true;
			(document.activeElement as HTMLElement).blur();//avoid clicking again on focused button if submitting confirm via SPACE key
			gsap.killTweensOf([holder, dimmer]);
			gsap.set(holder, {marginTop:0, opacity:1});
			gsap.to(dimmer, {duration:.25, opacity:1});
			gsap.from(holder, {duration:.25, marginTop:100, opacity:0, ease:"back.out"});
			if(this.voiceControl) {
				this.voiceController = new FormVoiceControllHelper(this.$el, this.close, this.submitForm);
			}
		}else{
			if(this.voiceController) this.voiceController.dispose();
			gsap.killTweensOf([this.$refs.holder, this.$refs.dimmer]);
			const holder = this.$refs.holder as HTMLElement;
			const dimmer = this.$refs.dimmer as HTMLElement;
			gsap.to(dimmer, {duration:.25, opacity:0, ease:"sine.in"});
			gsap.to(holder, {duration:.25, marginTop:100, opacity:0, ease:"back.out", onComplete:()=> {
				this.confirmData = null;
			}});
		}
	}

	/**
	 * Used by FormVoiceControllHelper
	 */
	public close():void {
		this.answer(false);
	}

	/**
	 * Used by FormVoiceControllHelper
	 */
	public submitForm():void {
		this.answer(true);
	}

	private onDownUp(e:KeyboardEvent):void {
		if(!this.confirmData) return;
		if(e.key == "Enter" || e.key == " ") {//Enter / space
			this.submitPressed = true;
		}
	}

	private onKeyUp(e:KeyboardEvent):void {
		if(!this.confirmData) return;
		if(e.key == "Enter" || e.key == " ") {//Enter / space
			if(this.submitPressed) {
				this.answer(true);
				this.submitPressed = false;
			}
			e.preventDefault();
			e.stopPropagation();
		}
		if(e.key == "Escape") {//escape
			this.answer(false);
			e.preventDefault();
			e.stopPropagation();
		}
	}

	public answer(confirm = false):void {
		const d = this.$store("main").confirmData;
		if(!d) return;
		
		if(confirm) {
			if(d.confirmCallback) {
				d.confirmCallback!();
			}
		}else{
			if(d.cancelCallback) {
				d.cancelCallback!();
			}
		}
		this.$store("main").closeConfirm();
	}
}
</script>

<style lang="less" scoped>

.confirmView {
	z-index: 99;
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;

	.dimmer {
		backdrop-filter: blur(2px);
		background-color: rgba(0,0,0,.7);
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
	}

	&>.holder {
		.center();
		position: absolute;
		padding: 1em;
		width: 400px;
		box-sizing: border-box;
		border-radius: 1em;
		color:var(--color-light);
		background-color: var(--color-dark-light);

		.icon {
			display: block;
			margin: auto;
			margin-bottom: .5em;
			height: 3em;
		}

		.title {
			font-size: 2em;
			text-align: center;
		}

		.voiceHelper {
			margin: auto;
		}

		.description {
			font-size: 1.25em;
			line-height: 1.25em;
			margin-top: 1em;
			text-align: center;
			:deep(strong) {
				color: var(--mainColor_warn);
				font-weight: bold;
			}
		}

		.buttons {
			display: flex;
			flex-direction: row;
			margin: auto;
			margin-top: 1em;
			justify-content: space-evenly;
			.button {
				text-transform: uppercase;
			}
		}
	}
}

@media only screen and (max-width: 500px) {
	.confirmView {
		&>.holder {
			padding: .75em;
			width: 90vw;

			.icon {
				height: 2em;
			}

			.title {
				font-size: 1.5em;
			}

			.description {
				font-size: 1em;
				margin-top: .5em;
			}

			.buttons {
				margin-top: 1em;
			}
		}
	}
}

</style>
