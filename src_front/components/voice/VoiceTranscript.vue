<template>
	<div class="voicetranscript">
		<div class="holder" ref="holder" v-if="show" @click="hide(true)">
			<div class="padder">
				<Icon name="microphone" alt="mic" class="icon" theme="light" />
				<div class="text">{{text}}</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { gsap } from 'gsap/gsap-core';
import { watch } from 'vue';
import {toNative,  Component, Vue } from 'vue-facing-decorator';

@Component({
	components:{}
})
class VoiceTranscript extends Vue {

	public show:boolean = false;

	public get text():string {
		// return "Cillum reprehenderit incididunt";
		// return "Cillum reprehenderit incididunt et ea elit nostrud consectetur est ut incididunt adipisicing nostrud. Commodo adipisicing aliqua mollit ullamco et ea exercitation. Id sint quis non magna anim minim voluptate nisi minim qui pariatur deserunt cillum ad. Anim duis cupidatat qui labore. Ut eu sint ea ex esse duis et commodo. Cillum reprehenderit incididunt et ea elit nostrud consectetur est ut incididunt adipisicing nostrud. Commodo adipisicing aliqua mollit ullamco et ea exercitation. Id sint quis non magna anim minim voluptate nisi minim qui pariatur deserunt cillum ad. Anim duis cupidatat qui labore. Ut eu sint ea ex esse duis et commodo.";
		if(this.$store.voice.voiceText.rawTempText) return this.$store.voice.voiceText.rawTempText;
		return this.$store.voice.voiceText.finalText;
	}

	public mounted():void {
		watch(()=> this.$store.voice.voiceText.rawTempText, async ()=>{
			if(!this.show){
				this.show = true;
				await this.$nextTick();
				const holder = this.$refs.holder as HTMLDivElement;
				gsap.killTweensOf(holder);
				gsap.to(holder, {duration:.25, y:"0%"});
			}
		});
		watch(()=> this.$store.voice.voiceText.finalText, async (value:string)=>{
			if(value != "") {
				this.hide();
			}
		});
	}

	public hide(force:boolean = false):void {
		if(!this.show) return;

		const holder = this.$refs.holder as HTMLDivElement;
		gsap.killTweensOf(holder);
		let len = this.$store.voice.voiceText.finalText.length;
		if(isNaN(len) || len < 0) len = 1;
		const delay = force? 0 : Math.min(2, len * .025);
		gsap.to(holder, {delay, duration:.25, y:"120%", clearProps:"all", onComplete:()=>{
			this.show = false;
		}});
	}

}
export default toNative(VoiceTranscript);
</script>

<style scoped lang="less">
.voicetranscript{
	width: 100%;
	color:var(--color-light);
	// overflow-x: hidden;
	overflow-y: hidden;
	z-index: 3;
	line-height: 1.1em;
	height: fit-content;
	max-height: 3em;
	pointer-events: none;

	.holder {
		padding: .5em;
		background-color: fade(#000000, 50%);
		pointer-events: all;
		backdrop-filter: blur(6px);
		z-index: -1;
		cursor: pointer;
		transition: background-color .25s;

		&:hover {
			background-color: fade(#111, 50%);
		}

		.padder {
			max-height: 2em;
			overflow: hidden;
			display: flex;
			align-items: flex-end;
			justify-content: center;
			text-align: center;

			.icon {
				height: 1em;
				margin-right: .5em;
				align-self: flex-start;
			}
		}

	}
}
</style>
