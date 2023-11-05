<template>
	<ToggleBlock :open="open" class="overlayparamsraffle overlayParamsSection" :title="$t('overlay.raffle.title')" :icons="['ticket']">
		<template #right_actions>
			<Button href="https://www.youtube.com/watch?v=VB4FDqB5kMo"
			target="_blank"
			type="link"
			icon="youtube"
			alert
			v-tooltip="$t('overlay.youtube_demo_tt')"
			@click.stop/>
		</template>

		<div class="holder">
			<div class="info">{{ $t("overlay.raffle.head") }}</div>

			<OverlayInstaller type="wheel" />

			<template v-if="overlayExists || true">
				<Button class="center" :loading="loading" @click="testWheel()" icon="test">{{ $t('overlay.raffle.testBt') }}</Button>
				
				<ToggleBlock class="shrink" small :title="$t('overlay.css_customization')" :open="false">
					<div class="cssHead">{{ $t("overlay.raffle.css") }}</div>
					<ul class="cssStructure">
						<li>.wheel-item { ... }</li>
						<li>.wheel-item.selected { ... }</li>
					</ul>
				</ToggleBlock>
			</template>

			<Icon class="center loader card-item" name="loader" v-else-if="checkingOverlayAtStart" />

			<div class="center card-item alert" v-else-if="!overlayExists">{{ $t("overlay.raffle.no_overlay") }}</div>
			
			<div class="card-item footer">
				<Icon name="info" />
				<i18n-t scope="global" tag="span" keypath="overlay.raffle.start">
					<template #MENU><Icon name="commands" class="icon" /></template>
					<template #CMD><strong>/raffle</strong></template>
				</i18n-t>
			</div>
		</div>
	</ToggleBlock>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import TwitchatEvent from '@/events/TwitchatEvent';
import Utils from '@/utils/Utils';
import type { JsonArray } from "type-fest";
import { Component, Prop, Vue } from 'vue-facing-decorator';
import Button from '../../../Button.vue';
import ToggleBlock from '../../../ToggleBlock.vue';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import OverlayInstaller from './OverlayInstaller.vue';

@Component({
	components:{
		Button,
		ToggleBlock,
		OverlayInstaller,
	}
})
export default class OverlayParamsRaffle extends Vue {
	
	@Prop({default:false})
	public open!:boolean;

	public loading = false;
	public overlayExists = false;
	public checkingOverlayAtStart:boolean = true;

	private checkInterval!:number;
	private subcheckTimeout!:number;
	private overlayPresenceHandler!:()=>void;
	
	public mounted():void {
		this.overlayPresenceHandler = ()=> {
			this.overlayExists = true;
			this.checkingOverlayAtStart = false;
			clearTimeout(this.subcheckTimeout);
		};
		PublicAPI.instance.addEventListener(TwitchatEvent.WHEEL_OVERLAY_PRESENCE, this.overlayPresenceHandler);

		//Regularly check if the overlay exists
		this.checkInterval = window.setInterval(()=>{
			PublicAPI.instance.broadcast(TwitchatEvent.GET_WHEEL_OVERLAY_PRESENCE);
			clearTimeout(this.subcheckTimeout);
			//If after 1,5s the overlay didn't answer, assume it doesn't exist
			this.subcheckTimeout = setTimeout(()=>{
				this.overlayExists = false;
				this.checkingOverlayAtStart = false;
			}, 1500);
		}, 2000);
	}

	public beforeUnmount():void {
		clearInterval(this.checkInterval);
		clearTimeout(this.subcheckTimeout);
		PublicAPI.instance.removeEventListener(TwitchatEvent.WHEEL_OVERLAY_PRESENCE, this.overlayPresenceHandler);
	}

	public async testWheel():Promise<void> {
		this.loading = true;
		let items:TwitchatDataTypes.EntryItem[] = [];
		if(TwitchUtils.hasScopes([TwitchScopes.LIST_FOLLOWERS])) {
			const followers = await TwitchUtils.getFollowers(null, 500);
			items = followers.map(v=> {
				return {id:v.user_id, label:v.user_name, data:v};
			});
		}else{
			const fakeNames = ["GamerPro97","StreamKing87","TechGuru","GamingLegend87","TheRealStreamer","ProGamingMaster","EliteGamer24","DigitalWarrior","TwitchWarrior","TheStreamingPro","GamingGod_24","StreamMaster","the_gamer","CyberPunkGaming","TwitchKiller87","ProStreamGaming","GamingGuru","streamerNation","GamingBeast","TwitchFrenzy","digital_gamer","StreamingLegend87","CyberGamingPro","TechStreamMaster","GamerNation","ProTwitchGaming","TwitchGamer","StreamingGod_24","TheGamingNation","DigitalGaming","StreamerElite87","CyberNationGaming","GamingPro","TwitchElite","StreamingBeast87","TechGaming","GamerFrenzy","ProStreamNation","TwitchMaster","GamingKing","StreamingGod87","CyberProGamer","TechTwitchNation","GamerElite","TwitchNation","StreamingPro","DigitalNationGaming","ProGamer","TwitchGaming","StreamingLegend"];
			for (let i = 0; i < fakeNames.length; i++) {
				items.push({id:i.toString(), label:fakeNames[i]});
				
			}
		}
		const data = {
			items:((items as unknown) as JsonArray),
			winner: Utils.pickRand(items).id,
		}
		PublicAPI.instance.broadcast(TwitchatEvent.WHEEL_OVERLAY_START, data)
		await Utils.promisedTimeout(100);
		this.loading = false;
	}

}
</script>

<style scoped lang="less">
.overlayparamsraffle{
}
</style>