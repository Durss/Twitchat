<template>
	<ToggleBlock :open="open" class="overlaytimer" title="Timer & Countdown" :icons="['countdown_purple']">
		<div>When starting a countdown or a timer with <span class="cmd">/countdown</span> or <span class="cmd">/timerStart</span> commands, this overlay will display the ellapsed or remaining time.</div>
		<div class="content">
			<div class="row">
				<input type="text" v-model="overlayUrl">
				<ToggleBlock small title="CSS customization" :open="false">
					<div>You can change the appearance of the timers by overriding these CSS values on OBS browser source params</div>
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
				<Button :icon="$image('icons/timer.svg')" title="Try timer" @click.stop="startTimer()" />
				<Button :icon="$image('icons/countdown.svg')" title="Try 2min countdown" @click.stop="startCountdown()" />
			</div>
		</div>
	</ToggleBlock>
</template>

<script lang="ts">
import { storeTimer } from '@/store/timer/storeTimer';
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

	private sTimer = storeTimer();
	
	public startTimer():void { this.sTimer.startTimer(); }
	public startCountdown():void { this.sTimer.startCountdown(2 * 60 * 1000); }

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
		.cmd {
			background-color: fade(@mainColor_normal, 15%);
			border-radius: .5em;
			padding: 0 .5em;
			font-family: 'Courier New', Courier, monospace;
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