<template>
	<div class="triggerimportform modal">
		<div class="dimmer" ref="dimmer" @click="close()"></div>
		<div class="holder" ref="holder">
			<div class="head">
				<h1 class="title"><Icon name="alert" /> {{ $t('premium.cleanup.title') }}</h1>
				<ClearButton @click="close()" v-if="!$store.main.nonPremiumLimitExceeded" />
			</div>
			<div class="content">
				coucou
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { gsap } from 'gsap/gsap-core';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import ClearButton from '../ClearButton.vue';

@Component({
	components:{
		ClearButton,
	},
	emits:[],
})
class TriggerImportForm extends Vue {

	public mounted():void {
		console.log("okoko")
		gsap.set(this.$refs.holder as HTMLElement, {marginTop:0, opacity:1});
		gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:1});
		gsap.from(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.out"});
	}

	public async close():Promise<void> {
		//Don't close if there still are limits exceed
		if(this.$store.main.nonPremiumLimitExceeded) return;

		gsap.killTweensOf([this.$refs.holder, this.$refs.dimmer]);
		gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:0, ease:"sine.in"});
		gsap.to(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.in", onComplete:()=> {
			this.$emit('close');
		}});
	}

}
export default toNative(TriggerImportForm);
</script>

<style scoped lang="less">
.triggerimportform{
	
}
</style>