<template>
	<div class="overlaytimer overlayParamsSection">
		<a href="https://www.youtube.com/watch?v=x_OnsPRA8Bs" target="_blank" class="youtubeTutorialBt">
			<Icon name="youtube" theme="light" />
			<span>{{ $t('overlay.youtube_demo_tt') }}</span>
			<Icon name="newtab" theme="light" />
		</a>

		<i18n-t scope="global" class="header" tag="div" keypath="overlay.timer.head">
			<template #CMD1><mark>/countdown</mark></template>
			<template #CMD2><mark>/timerStart</mark></template>
		</i18n-t>
		
		<section class="card-item">
			<div class="header">
				<div class="title"><Icon name="obs" /> {{ $t("overlay.title_install") }}</div>
			</div>
			<OverlayInstaller type="timer" />

			<ToggleBlock class="shrink" small :title="$t('overlay.css_customization')" :open="false">
				<div class="cssHead">{{ $t("overlay.timer.css") }}</div>
				<ul class="cssStructure">
					<li>#timer { ... }</li>
					<li class="sublist">
						<ul>
							<li>#timer_icon { ... }</li>
							<li>#timer_label { ... }</li>
						</ul>
					</li>
				</ul>
				<ul class="cssStructure">
					<li>#countdown { ... }</li>
					<li class="sublist">
						<ul>
							<li>#countdown_icon { ... }</li>
							<li>#countdown_label { ... }</li>
						</ul>
					</li>
				</ul>
			</ToggleBlock>
		</section>
		
		<section class="card-item">
			<div class="header">
				<div class="title"><Icon name="params" /> {{ $t("overlay.title_settings") }}</div>
			</div>
			<Button class="center" icon="timer" @click.stop="startTimer()">{{ $t('overlay.timer.try_timerBt') }}</Button>
			<Button class="center" icon="countdown" @click.stop="startCountdown()">{{ $t('overlay.timer.try_countdownBt') }}</Button>
		</section>
	</div>
</template>

<script lang="ts">
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';
import TTButton from '../../../TTButton.vue';
import ToggleBlock from '../../../ToggleBlock.vue';
import OverlayInstaller from './OverlayInstaller.vue';

@Component({
	components:{
		Button: TTButton,
		ToggleBlock,
		OverlayInstaller,
	}
})
class OverlayParamsTimer extends Vue {
	
	public startTimer():void { this.$store.timer.timerStart(); }
	public startCountdown():void { this.$store.timer.countdownStart(2 * 60 * 1000); }

}
export default toNative(OverlayParamsTimer);
</script>

<style scoped lang="less">
.overlaytimer{
	.actions{
		margin: auto;
		display: flex;
		flex-direction: row;
		justify-content: center;
		flex-wrap: wrap;
		gap: 1em;
	}
}
</style>