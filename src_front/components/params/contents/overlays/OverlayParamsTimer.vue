<template>
	<ToggleBlock :open="open" class="overlaytimer" :title="$t('overlay.timer.title')" :icons="['countdown']">
		<div class="holder">
			<div class="item">
				<div class="info">
					<i18n-t scope="global" tag="div" keypath="overlay.timer.head">
						<template #CMD1><mark>/countdown</mark></template>
						<template #CMD2><mark>/timerStart</mark></template>
					</i18n-t>
				</div>
				<input type="text" v-model="overlayUrl" v-click2Select>
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
			<div class="item center actions">
				<Button icon="timer" @click.stop="startTimer()">{{ $t('overlay.timer.try_timerBt') }}</Button>
				<Button icon="countdown" @click.stop="startCountdown()">{{ $t('overlay.timer.try_countdownBt') }}</Button>
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
		gap: 1em;
		.item {

			.info {
				margin-bottom: .5em;
			}

			input {
				width: 100%;
				background-color: var(--color-primary);
			}

			&.center {
				text-align: center;
			}
		}

		ul {
			.cssStructure();
			margin-top: .5em;
		}

		.actions{
			margin: auto;
			display: flex;
			flex-direction: row;
			gap: 1em;
		}
	}
	
}
</style>