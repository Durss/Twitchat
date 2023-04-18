<template>
	<ToggleBlock :open="open" class="overlaytimer" :title="$t('overlay.timer.title')" :icons="['countdown_purple']">
		<div class="holder">
			<div class="row">
				<div class="info">
					<i18n-t scope="global" tag="div" keypath="overlay.timer.head">
						<template #CMD1><mark>/countdown</mark></template>
						<template #CMD2><mark>/timerStart</mark></template>
					</i18n-t>
				</div>
				<input type="text" v-model="overlayUrl">
				<ToggleBlock small :title="$t('overlay.css_customization')" :open="false">
					<div>{{ $t("overlay.timer.css") }}</div>
					<ul>
						<li>#timer { ... }</li>
						<li class="sublist">
							<ul>
								<li>#timer_icon { ... }</li>
								<li>#timer_label { ... }</li>

							</ul>
						</li>
					</ul>
					<ul>
						<li>#countdown { ... }</li>
						<li class="sublist">
							<ul>
								<li>#countdown_icon { ... }</li>
								<li>#countdown_label { ... }</li>
							</ul>
						</li>
					</ul>
				</ToggleBlock>
			</div>
			<div class="row center">
				<Button icon="timer" :title="$t('overlay.timer.try_timerBt')" @click.stop="startTimer()" />
				<Button icon="countdown" :title="$t('overlay.timer.try_countdownBt')" @click.stop="startCountdown()" />
			</div>
		</div>
	</ToggleBlock>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-facing-decorator';
import Button from '../../../Button.vue';
import ToggleBlock from '../../../ToggleBlock.vue';

@Component({
	components:{
		Button,
		ToggleBlock,
	}
})
export default class OverlayParamsTimer extends Vue {
	
	@Prop({default:false})
	public open!:boolean;
	
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
		gap: .5em;
		.row {
			display: flex;
			flex-direction: column;
			padding: .5em;
			border-radius: .5em;
			background-color: fade(@mainColor_normal, 15%);

			.info {
				margin-bottom: .5em;
			}

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
			.cssStructure();
			margin-top: .5em;
		}
	}
	
}
</style>