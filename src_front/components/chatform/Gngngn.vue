<template>
	<div class="gngngn">
		<div class="dimmer" ref="dimmer" @click="close()"></div>
		<div class="holder" ref="holder">
			<div class="head">
				<span class="title">{{ $t('gngngn.title') }}</span>
				<Button :aria-label="$t('gngngn.closeBt_aria')" :icon="$image('icons/cross.svg')" class="close" @click="close()" />
			</div>
			<div class="content">
				<p v-for="e in $tm('gngngn.contents')" v-html="e"></p>
				<ToggleBlock class="block" :title="$t('gngngn.why_title')" small :open="false">
					<p>{{ $t('gngngn.why_info') }}</p>
				</ToggleBlock>
				<ToggleBlock class="block" :title="$t('gngngn.angry')" small :open="false">
					<p v-for="e in $tm('gngngn.angry_contents')" v-html="e"></p>
				</ToggleBlock>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import Config from '@/utils/Config';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ToggleBlock from '../ToggleBlock.vue';

@Options({
	props:{},
	components:{
		Button,
		ToggleBlock,
	},
	emits:["close"]
})
export default class Gngngn extends Vue {

	public get discordPath():string { return Config.instance.DISCORD_URL; }
	public get appVersion():string { return import.meta.env.PACKAGE_VERSION; }

	public mounted():void {
		gsap.set(this.$refs.holder as HTMLElement, {marginTop:0, opacity:1});
		gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:1});
		gsap.from(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.out"});
	}

	public async close():Promise<void> {
		gsap.killTweensOf([this.$refs.holder, this.$refs.dimmer]);
		gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:0, ease:"sine.in"});
		gsap.to(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.in", onComplete:()=> {
			this.$emit('close');
		}});
	}
}
</script>

<style scoped lang="less">
.gngngn{
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	z-index: 2;
	.modal();

	.holder {
		// max-height: 625px;
		line-height: 1.2em;
		width: 600px;
		max-width: 600px;
		left: unset;
		transform: unset;
		margin-left: calc((100vw - 600px)/2);
		.content {
		}

		.block {
			margin-bottom: .5em;
		}
	}

}
</style>