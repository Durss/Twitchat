<template>
	<ToggleBlock :open="open" class="overlaytimer" :title="$t('overlay.timer.title')" :icons="['countdown_purple']">
		<div class="holder">
			<div class="row">
				<i18n-t scope="global" tag="div" keypath="overlay.timer.head">
					<template #CMD1><mark>/countdown</mark></template>
					<template #CMD2><mark>/timerStart</mark></template>
				</i18n-t>
			</div>
			<div class="row">
				<input type="text" v-model="overlayUrl">
				<ToggleBlock small :title="$t('overlay.css_customization')" :open="false">
					<div>{{ $t("overlay.timer.css") }}</div>
					<ul>
						<li>#timer { ... }</li>
						<li>
							<ul>
								<li>#timer_icon { ... }</li>
								<li>#timer_label { ... }</li>

							</ul>
						</li>
					</ul>
					<ul>
						<li>#countdown { ... }</li>
						<li>
							<ul>
								<li>#countdown_icon { ... }</li>
								<li>#countdown_label { ... }</li>
							</ul>
						</li>
					</ul>
				</ToggleBlock>
			</div>
			<div class="row center">
				<Button :icon="$image('icons/timer.svg')" :title="$t('overlay.timer.try_timerBt')" @click.stop="startTimer()" />
				<Button :icon="$image('icons/countdown.svg')" :title="$t('overlay.timer.try_countdownBt')" @click.stop="startCountdown()" />
			</div>
		</div>
	</ToggleBlock>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-facing-decorator';
import Button from '../../../Button.vue';
import ToggleBlock from '../../../ToggleBlock.vue';

@Component({
	components:{
		Button,
		ToggleBlock,
	}
})
export default class OverlayParamsTimer extends Vue {
	
	public open = false;
	public get overlayUrl():string { return this.$overlayURL("timer"); }

	public startTimer():void { this.$store("timer").timerStart(); }
	public startCountdown():void { this.$store("timer").countdownStart(2 * 60 * 1000); }

}
</script>

<style scoped lang="less">
.overlaytimer{

	.holder {
		display: flex;
		flex-direction: column;
		gap: 1em;
		.row {
			display: flex;
			flex-direction: column;

			&.center {
				align-items: center;
				.button {
					&:not(:first-child) {
						margin-top: .5em;
					}
				}
			}
		}


		ul {
			margin-top: .5em;
			li {
				list-style-type: disc;
				list-style-position: inside;
				margin-bottom: .25em;
				&:has(ul) {
					list-style-type: none;
				}
				ul {
					margin-top: 0;
					display: inline;
					list-style-type: none;
					li {
						margin-left: 1em;
					}
				}
			}
		}
	}
	
}
</style>