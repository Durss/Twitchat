<template>
	<ToggleBlock :open="open" class="overlayparamsraffle" :title="$t('overlay.raffle.title')" :icons="['ticket']">
		<div class="holder">
			<a class="item demoLink" href="https://www.youtube.com/watch?v=VB4FDqB5kMo" target="_blank"><img src="@/assets/img/param_examples/wheelVideo.jpg" class="demo"></a>
			
			<div class="item">
				<div class="info">{{ $t("overlay.raffle.head") }}</div>
				<input class="primary" type="text" v-model="overlayUrl" v-click2Select>
				<ToggleBlock small :title="$t('overlay.css_customization')" :open="false">
					<div>{{ $t("overlay.raffle.css") }}</div>
					<ul class="cssStructure">
						<li>.wheel-item { ... }</li>
						<li>.wheel-item.selected { ... }</li>
					</ul>
				</ToggleBlock>
			</div>

			<div class="item center" v-if="overlayExists">
				<Button :loading="loading" @click="testWheel()" icon="test">{{ $t('overlay.raffle.testBt') }}</Button>
			</div>

			<Icon class="item center loader card-item" name="loader" v-else-if="checkingOverlayAtStart" />

			<div class="item center card-item alert" v-else-if="!overlayExists">{{ $t("overlay.raffle.no_overlay") }}</div>
			
			<div class="card-item item">
				<i18n-t scope="global" tag="div" keypath="overlay.raffle.start">
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

@Component({
	components:{
		Button,
		ToggleBlock,
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
	
	public get overlayUrl():string { return this.$overlayURL("wheel"); }

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
	.holder {
		display: flex;
		flex-direction: column;
		gap: .5em;
		.item {

			.info {
				margin-bottom: .5em;
			}

			input {
				width: 100%;
				margin-bottom: .5em;
			}

			&.center {
				margin: auto;
			}

			&.loader {
				height: 2.5em;
			}

			:deep(.icon) {
				height: 1em;
				vertical-align: middle;
			}

			ul {
				margin-top: .5em;
			}
		}
	}
}
</style>