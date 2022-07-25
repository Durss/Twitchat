<template>
	<div class="voicetranscript" v-if="show">
		<!-- <img src="@/assets/icons/microphone.svg" alt="microphone"> -->
		<div class="holder">
			<div class="text">{{text}}</div>
		</div>
	</div>
</template>

<script lang="ts">
import VoiceController from '@/utils/VoiceController';
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
		return VoiceController.instance.currentText;
		// return "Cillum reprehenderit incididunt";
		// return "Cillum reprehenderit incididunt et ea elit nostrud consectetur est ut incididunt adipisicing nostrud. Commodo adipisicing aliqua mollit ullamco et ea exercitation. Id sint quis non magna anim minim voluptate nisi minim qui pariatur deserunt cillum ad. Anim duis cupidatat qui labore. Ut eu sint ea ex esse duis et commodo.";
	}

	public mounted():void {
		watch(()=> VoiceController.instance.tempText, async ()=>{
			const res = VoiceController.instance.tempText !== "";
			if(res) {
				if(!this.show){
					this.show = true;
					await this.$nextTick();
					gsap.killTweensOf(this.$el);
					gsap.from(this.$el, {duration:.25, height:0, paddingTop:0, paddingBottom:0, clearProps:"all"});
				}
			}else if(this.show){
				gsap.killTweensOf(this.$el);
				const delay = VoiceController.instance.finalText.length * .025;
				console.log(delay);
				gsap.to(this.$el, {delay, duration:.25, height:0, paddingTop:0, paddingBottom:0, clearProps:"all", onComplete:()=>{
					this.show = false;
				}});
			}
		});
	}

}
</script>

<style scoped lang="less">
.voicetranscript{
	width: 100%;
	color:@mainColor_light;
	background-color: fade(@mainColor_dark, 90%);
	overflow: hidden;
	padding: .5em;

	.holder {
		overflow: hidden;
		display: flex;
		flex-direction: vertical;
		align-items: flex-end;
		justify-content: center;
		text-align: center;
		max-height: 2em;

		&::before {
			content:"";
			background-image: url("../../assets/icons/microphone.svg");
			background-repeat: no-repeat;
			width: 2em;
			min-width: 2em;
			height: 1em;
			align-self: flex-start;
		}

		.text {
			width: 100%;
		}
	}
}
</style>