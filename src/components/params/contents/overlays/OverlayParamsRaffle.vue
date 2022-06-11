<template>
	<ToggleBlock :open="open" class="overlayparamsraffle" title="Wheel" :icons="['ticket_purple']">
		<div>When doing a raffle, this page will display a wheel that'll animate to pick a winner.</div>
		<div class="content">
			<div class="row">
				<input type="text" v-model="overlayUrl">
				<ToggleBlock small title="CSS customization" :open="false">
					<div>You can change the appearance of the wheel by overriding these CSS values on OBS browser source params</div>
					<ul>
						<li>.wheel-item { ... }</li>
						<li>.wheel-item.selected { ... }</li>
					</ul>
				</ToggleBlock>
			</div>
			<div class="row center" v-if="wheelOverlayExists">
				<Button :loading="loading" @click="testWheel()" title="Test with some<br>of your followers" :icon="require('@/assets/icons/test.svg')" />
			</div>
			<div class="row center" v-if="!wheelOverlayExists">
				<span class="error">- overlay not configured or hidden -</span>
			</div>
			<div class="row">
				<span>To start a raffle, open the commands menu <img src="@/assets/icons/commands_purple.svg" class="icon"> or use the <strong>/raffle</strong> command.</span>
			</div>
		</div>
	</ToggleBlock>
</template>

<script lang="ts">
import { WheelItem } from '@/components/overlays/OverlaysRaffleWheel.vue';
import PublicAPI from '@/utils/PublicAPI';
import TwitchatEvent from '@/utils/TwitchatEvent';
import TwitchUtils from '@/utils/TwitchUtils';
import Utils from '@/utils/Utils';
import { JsonArray, JsonObject } from "type-fest";
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
export default class OverlayParamsRaffle extends Vue {

	public open:boolean = false;
	public loading:boolean = false;
	public wheelOverlayExists:boolean = false;

	private answerIndex:number = 0;
	private checkInterval!:number;
	private subcheckTimeout!:number;
	private wheelOverlayPresenceHandler!:()=>void;
	
	public get overlayUrl():string { return Utils.getOverlayURL("wheel"); }

	public mounted():void {
		this.wheelOverlayPresenceHandler = ()=> {
			this.wheelOverlayExists = true;
			clearTimeout(this.subcheckTimeout);
		};
		PublicAPI.instance.addEventListener(TwitchatEvent.WHEEL_OVERLAY_PRESENCE, this.wheelOverlayPresenceHandler);

		//Regularly check if the overlay exists
		this.checkInterval = setInterval(()=>{
			PublicAPI.instance.broadcast(TwitchatEvent.GET_WHEEL_OVERLAY_PRESENCE);
			clearTimeout(this.subcheckTimeout);
			//If after 1,5s the overlay didn't answer, assume it doesn't exist
			this.subcheckTimeout = setTimeout(()=>{
				this.wheelOverlayExists = false;
			}, 1500);
		}, 2000);
	}

	public beforeUnmount():void {
		clearInterval(this.checkInterval);
		clearTimeout(this.subcheckTimeout);
		PublicAPI.instance.removeEventListener(TwitchatEvent.WHEEL_OVERLAY_PRESENCE, this.wheelOverlayPresenceHandler);
	}

	public async testWheel():Promise<void> {
		this.loading = true;
		const followers = await TwitchUtils.getFollowers(null, 500);
		const items:WheelItem[] = followers.map(v=> {
			return {id:v.from_id, label:v.from_name, data:v};
		});
		const data = {
			items:((items as unknown) as JsonArray),
			winner: (Utils.pickRand(items) as unknown) as JsonObject,
		}
		PublicAPI.instance.broadcast(TwitchatEvent.WHEEL_OVERLAY_START, data)
		await Utils.promisedTimeout(100);
		this.loading = false;
	}

}
</script>

<style scoped lang="less">
.overlayparamsraffle{
	.content {
		.row {
			display: flex;
			flex-direction: column;

			&:not(:first-of-type) {
				margin-top: .5em;
			}

			&.center {
				align-items: center;
			}

			.icon {
				height: 1em;
				vertical-align: middle;
			}

			.error {
				color:@mainColor_alert;
				font-style: italic;
			}
		}
	}
}
</style>