<template>
	<div class="confirmView" v-if="confirmData">
		<div class="dimmer" ref="dimmer" @click="answer(false)"></div>
		<div class="holder" ref="holder">
			<div class="title" v-html="confirmData.title"></div>
			
			<VoiceGlobalCommandsHelper v-if="voiceControl" :confirmMode="true" />

			<div class="description" v-html="confirmData.description"></div>
			<div class="buttons">
				<Button class="cancel" type="cancel" @click.stop="answer()" :title="confirmData.noLabel ?? 'No'" alert />
				<Button class="confirm" @click.stop="answer(true)" :title="confirmData.yesLabel ?? 'Yes'" />
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
import { Options, Vue } from 'vue-class-component';
import VoiceGlobalCommandsHelper from '../components/voice/VoiceGlobalCommandsHelper.vue';

@Options({
	props:{},
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
		background-color: @mainColor_light_extralight;
		padding: 1em;
		width: 400px;
		box-sizing: border-box;
		border-radius: 1em;

		.title {
			font-size: 2em;
			text-align: center;
		}

		.voiceHelper {
			margin: auto;
		}

		.description {
			font-size: 1.2em;
			margin-top: 1em;
			:deep(strong) {
				color: @mainColor_warn;
				font-weight: bold;
			}
		}

		.buttons {
			display: flex;
			flex-direction: row;
			// max-width: 220px;
			margin: auto;
			margin-top: 30px;
			justify-content: space-evenly;
		}
	}
}

@media only screen and (max-width: 500px) {
	.confirmView {
		&>.holder {
			padding: 15px;
			width: 90vw;

			.title {
				font-size: 30px;
			}

			.description {
				font-size: 20px;
				margin-top: 10px;
			}

			.buttons {
				margin-top: 15px;
				button {
					font-size: 18px;
					padding: 10px;
				}
			}
		}
	}
}

@media only screen and (max-width: 360px) {
	.confirmView {
		&>.holder {
			padding: 15px;
			width: 90vw;

			.buttons {
				margin-top: 15px;
				button {
					font-size: 15px;
					padding: 10px;
				}
			}
		}
	}
}
</style>
