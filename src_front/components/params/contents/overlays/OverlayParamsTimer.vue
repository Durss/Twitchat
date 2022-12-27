<template>
	<ToggleBlock :open="open" class="overlaytimer" :title="$t('overlay.timer.title')" :icons="['countdown_purple']">
		<div v-html="$t('overlay.timer.head')"></div>
		<div class="content">
			<div class="row">
				<input type="text" v-model="overlayUrl">
				<ToggleBlock small :title="$t('overlay.css_customization')" :open="false">
					<div v-t="'overlay.timer.css'"></div>
					<ul>
						<li>#timer { ... }</li>
						<li>#timer_icon { ... }</li>
						<li>#timer_label { ... }</li>
						<br>
						<li>#countdown { ... }</li>
						<li>#countdown_icon { ... }</li>
						<li>#countdown_label { ... }</li>
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
import { Options, Vue } from 'vue-class-component';
import Button from '../../../Button.vue';
import ToggleBlock from '../../../ToggleBlock.vue';

@Options({
	props:{},
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

	.content {
		.row {
			display: flex;
			flex-direction: column;

			&:not(:first-of-type) {
				margin-top: .5em;
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
				margin-top: .5em;
			li {
				list-style-type: disc;
				list-style-position: inside;
			}
		}
	}
	
}
</style>