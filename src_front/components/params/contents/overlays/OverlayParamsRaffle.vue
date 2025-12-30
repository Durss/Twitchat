<template>
	<div class="overlayparamsraffle overlayParamsSection">
		<a href="https://www.youtube.com/watch?v=VB4FDqB5kMo" target="_blank" class="youtubeTutorialBt">
			<Icon name="youtube" theme="light" />
			<span>{{ $t('overlay.youtube_demo_tt') }}</span>
			<Icon name="newtab" theme="light" />
		</a>

		<div class="header">{{ $t("overlay.raffle.head") }}</div>

		<section class="card-item">
			<div class="header">
				<div class="title"><Icon name="obs" /> {{ $t("overlay.title_install") }}</div>
			</div>
			<OverlayInstaller type="wheel" @obsSourceCreated="getOverlayPresence(true)" />
			
			<ToggleBlock class="shrink" small :title="$t('overlay.css_customization')" :open="false">
				<div class="cssHead">{{ $t("overlay.raffle.css") }}</div>
				<ul class="cssStructure">
					<li>#wheel-item { ... }</li>
					<li>#wheel-item.selected { ... }</li>
				</ul>
			</ToggleBlock>
		</section>

		<section class="card-item">
			<div class="header">
				<div class="title"><Icon name="params" /> {{ $t("overlay.title_settings") }}</div>
			</div>
		
			<Icon class="center loader card-item" name="loader" v-if="checkingOverlayPresence" />
			
			<TTButton class="center" v-else-if="overlayExists" :loading="loading" @click="testWheel()" icon="test">{{ $t('overlay.raffle.testBt') }}</TTButton>
	
			<div class="center card-item alert" v-else-if="!overlayExists">{{ $t("overlay.overlay_not_configured") }}</div>
		</section>
		
		<div class="card-item footer">
			<Icon name="info" />
			<i18n-t scope="global" tag="span" keypath="overlay.raffle.start">
				<template #MENU><Icon name="commands" class="icon" /></template>
				<template #CMD><strong>/raffle</strong></template>
			</i18n-t>
		</div>
	</div>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import PublicAPI from '@/utils/PublicAPI';
import Utils from '@/utils/Utils';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { Component, toNative, Vue } from 'vue-facing-decorator';
import TTButton from '../../../TTButton.vue';
import ToggleBlock from '../../../ToggleBlock.vue';
import OverlayInstaller from './OverlayInstaller.vue';

@Component({
	components:{
		Icon,
		TTButton,
		ToggleBlock,
		OverlayInstaller,
	}
})
class OverlayParamsRaffle extends Vue {

	public loading = false;
	public overlayExists = false;
	public checkingOverlayPresence:boolean = true;

	private checkInterval:number = -1;
	private subcheckTimeout:number = -1;
	private overlayPresenceHandler!:()=>void;
	
	public mounted():void {
		this.overlayPresenceHandler = ()=> {
			this.overlayExists = true;
			this.checkingOverlayPresence = false;
			clearTimeout(this.subcheckTimeout);
		};
		PublicAPI.instance.addEventListener("ON_WHEEL_OVERLAY_PRESENCE", this.overlayPresenceHandler);

		//Regularly check if the overlay exists
		this.checkInterval = window.setInterval(()=>this.getOverlayPresence(), 2000);
	}

	public beforeUnmount():void {
		clearInterval(this.checkInterval);
		clearTimeout(this.subcheckTimeout);
		PublicAPI.instance.removeEventListener("ON_WHEEL_OVERLAY_PRESENCE", this.overlayPresenceHandler);
	}

	/**
	 * Checks if overlay exists
	 */
	public getOverlayPresence(showLoader:boolean = false):void {
		if(showLoader) this.checkingOverlayPresence = true;
		PublicAPI.instance.broadcast("GET_WHEEL_OVERLAY_PRESENCE");
		clearTimeout(this.subcheckTimeout);
		//If after 1,5s the overlay didn't answer, assume it doesn't exist
		this.subcheckTimeout = window.setTimeout(()=>{
			this.overlayExists = false;
			this.checkingOverlayPresence = false;
		}, 1500);
	}

	public async testWheel():Promise<void> {
		this.checkingOverlayPresence = true;
		let items:TwitchatDataTypes.EntryItem[] = [];
		if(TwitchUtils.hasScopes([TwitchScopes.LIST_FOLLOWERS])) {
			const followers = await TwitchUtils.getFollowers(null, 500);
			items = followers.map(v=> {
				return {id:v.user_id, label:v.user_name, data:v};
			});
		}else{
			const fakeNames = ["GamerPro97","StreamKing87","TechGuru","GamingLegend87","TheRealStreamer","ProGamingMaster","EliteGamer24","DigitalWarrior","TwitchWarrior","TheStreamingPro","GamingGod_24","StreamMaster","the_gamer","CyberPunkGaming","TwitchKiller87","ProStreamGaming","GamingGuru","streamerNation","GamingBeast","TwitchFrenzy","digital_gamer","StreamingLegend87","CyberGamingPro","TechStreamMaster","GamerNation","ProTwitchGaming","TwitchGamer","StreamingGod_24","TheGamingNation","DigitalGaming","StreamerElite87","CyberNationGaming","GamingPro","TwitchElite","StreamingBeast87","TechGaming","GamerFrenzy","ProStreamNation","TwitchMaster","GamingKing","StreamingGod87","CyberProGamer","TechTwitchNation","GamerElite","TwitchNation","StreamingPro","DigitalNationGaming","ProGamer","TwitchGaming","StreamingLegend"];
			for (let i = 0; i < fakeNames.length; i++) {
				items.push({id:i.toString(), label:fakeNames[i]!});
				
			}
		}
		const data:TwitchatDataTypes.WheelData = {
			items,
			sessionId:Utils.getUUID(),
			winner: Utils.pickRand(items).id,
			skin: Config.instance.GET_CURRENT_AUTO_SKIN_CONFIG()?.skin || "default",
		}
		PublicAPI.instance.broadcast("ON_WHEEL_OVERLAY_START", data);
		await Utils.promisedTimeout(100);
		this.loading = false;
	}

}
export default toNative(OverlayParamsRaffle);
</script>

<style scoped lang="less">
.overlayparamsraffle{
}
</style>