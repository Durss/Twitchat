<template>
	<div class="voicetranscript">
		<!-- <img src="@/assets/icons/microphone.svg" alt="microphone"> -->
		<div class="holder" ref="holder" v-if="show" @click="hide(true)">
			<div class="padder">
				<div class="text">{{text}}</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import StoreProxy from '@/utils/StoreProxy';
import gsap from 'gsap';
import { watch } from 'vue';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{},
	components:{}
})
export default class VoiceTranscript extends Vue {

	public show:boolean = false;

	public get text():string {
		if(StoreProxy.store.state.voiceText.rawTempText) return StoreProxy.store.state.voiceText.rawTempText;
		return StoreProxy.store.state.voiceText.finalText;
		// return "Cillum reprehenderit incididunt";
		// return "Cillum reprehenderit incididunt et ea elit nostrud consectetur est ut incididunt adipisicing nostrud. Commodo adipisicing aliqua mollit ullamco et ea exercitation. Id sint quis non magna anim minim voluptate nisi minim qui pariatur deserunt cillum ad. Anim duis cupidatat qui labore. Ut eu sint ea ex esse duis et commodo.";
	}

	public mounted():void {
		watch(()=> StoreProxy.store.state.voiceText.rawTempText, async ()=>{
			if(!this.show){
				this.show = true;
				await this.$nextTick();
				const holder = this.$refs.holder as HTMLDivElement;
				gsap.killTweensOf(holder);
				gsap.to(holder, {duration:.25, y:"0%"});
			}
		});
		watch(()=> StoreProxy.store.state.voiceText.finalText, async (value:string)=>{
			if(value != "") {
				this.hide();
			}
		});
	}

	public hide(force:boolean = false):void {
		const holder = this.$refs.holder as HTMLDivElement;
		gsap.killTweensOf(holder);
		let len = StoreProxy.store.state.voiceText.finalText.length;
		if(isNaN(len) || len < 0) len = 1;
		const delay = force? 0 : Math.min(2, len * .025);
		gsap.to(holder, {delay, duration:.25, y:"120%", clearProps:"all", onComplete:()=>{
			this.show = false;
		}});
	}

}
</script>

<style scoped lang="less">
.voicetranscript{
	width: 100%;
	color:@mainColor_light;
	overflow: hidden;
	z-index: 1000;
	line-height: 1.1em;
	height: fit-content;
	max-height: 3em;
	pointer-events: none;

	.holder {
		padding: .5em;
		background-color: fade(#000000, 50%);
		transform: translate(0, calc(100% + 1em));
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

			&::before {
				content:"";
				background-image: url("../../assets/icons/microphone.svg");
				background-repeat: no-repeat;
				width: 2em;
				min-width: 2em;
				max-width: 2em;
				height: 1em;
				align-self: flex-start;
			}

			.text {//This holder makes sure no text is visible over the padding of its parent
				width: 100%;
			}
		}

	}
}
</style>