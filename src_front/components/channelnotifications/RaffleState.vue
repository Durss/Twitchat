<template>
	<div class="rafflestate gameStateWindow" v-if="raffleData">
		<div class="head" v-stickyTopShadow>
			<h1 class="title">
				<Icon name="ticket" />
				<span>{{ $t('raffle.state_title') }}</span>
				<mark v-if="raffleData.mode == 'chat' && raffleData.command">{{raffleData.command}}</mark>
				<mark v-if="raffleData.mode == 'chat' && raffleData.reward_id"><Icon name="channelPoints" />{{rewardName}}</mark>
				<mark v-if="raffleData.mode == 'tips'"><Icon name="coin" />{{tipPlatforms.join(" ")}}</mark>
			</h1>

			<ProgressBar secondary v-if="timerPercent < 1"
				:percent="raffleData.entries?.length == raffleData.maxEntries && raffleData.maxEntries > 0?  1 : timerPercent"
				:duration="raffleData.entries?.length == raffleData.maxEntries && raffleData.maxEntries > 0?  0 : raffleData.duration_s * 1000"
			/>
			
			<slot />
		</div>
		<div class="body" ref="content">

			<div class="card-item secondary warning" v-if="$store.raffle.raffleList.length >= 10"><Icon name="alert" />{{$t("raffle.state_many_raffles", {COUNT:$store.raffle.raffleList.length})}}</div>

			<div class="entries">
				<Icon name="user" alt="user" />
				<i18n-t scope="global" tag="p" keypath="raffle.state_users" :plural="raffleData.entries?.length">
					<template #COUNT>
						<span>{{raffleData.entries?.length}}</span>
						<span v-if="raffleData.maxEntries">/{{raffleData.maxEntries}}</span>
					</template>
				</i18n-t>
			</div>

			<div class="entries" v-if="cumulatedEntryCount != raffleData.entries?.length">
				<Icon name="ticket" alt="ticket" />
				<i18n-t scope="global" tag="p" keypath="raffle.state_users_cumulated" :plural="cumulatedEntryCount"
				v-if="cumulatedEntryCount != raffleData.maxEntries">
					<template #COUNT>
						<span>{{cumulatedEntryCount}}</span>
					</template>
				</i18n-t>
			</div>

			<div class="actions">
				<TTButton icon="cross"
					highlight
					alert
					@click="closeRaffle()">{{ $t('raffle.state_stopBt') }}</TTButton>

				<TTButton icon="timer"
					highlight
					light
					v-if="(raffleData.duration_s || 0) > 0"
					@click="expandDurationBy(60)">+1'</TTButton>

				<TTButton icon="ticket"
					@click="pickWinner()"
					light
					:loading="picking"
					:disabled="!canPick">{{ $t('raffle.state_pickBt') }}</TTButton>
			</div>

			<div class="winners" v-if="raffleData.winners && raffleData.winners.length > 0">
				<div class="entries">
					<template v-for="w in raffleData.winners.concat().reverse()" :key="w.label">
						<TTButton v-if="w.user" small light
							type="link"
							target="_blank"
							:href="'https://twitch.tv/'+getUserFromEntry(w)?.login"
							@click.prevent="openUserCard(getUserFromEntry(w))">{{ w.label }}</TTButton>
							
						<div class="entry" v-else>{{ w.label }}</div>
					</template>
				</div>
			</div>

			<ParamItem class="small" v-model="raffleData.autoClose" :paramData="param_autoClose" @change="$store.raffle.saveData()" />

			<OverlayPresenceChecker
				:overlayName="$t('raffle.overlay_name')"
				:overlayType="'raffle'" />
		</div>

		<TTButton transparent icon="left" v-if="availableRaffleList.length > 1" class="prevRaffleBt" @click="prevRaffle()" />
		<TTButton transparent icon="right" v-if="availableRaffleList.length > 1" class="nextRaffleBt" @click="nextRaffle()" />
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import OBSWebSocket from '@/utils/OBSWebSocket';
import PublicAPI from '@/utils/PublicAPI';
import { gsap } from 'gsap/gsap-core';
import { Component, toNative, Vue } from 'vue-facing-decorator';
import Icon from '../Icon.vue';
import ProgressBar from '../ProgressBar.vue';
import TTButton from '../TTButton.vue';
import ParamItem from '../params/ParamItem.vue';
import OverlayInstaller from '../params/contents/overlays/OverlayInstaller.vue';
import OverlayPresenceChecker from './OverlayPresenceChecker.vue';


@Component({
	components:{
		Icon,
		TTButton,
		ParamItem,
		ProgressBar,
		OverlayInstaller,
		OverlayPresenceChecker,
	},
	emits:["close"]
})
class RaffleState extends Vue {

	public picking:boolean = false;
	public disposed:boolean = false;
	public transitionDirection:"left"|"right" = "right";
	public timerPercent:number = 0;
	public raffleData:TwitchatDataTypes.RaffleData | null = null;
	public winnerPlaceholders!:TwitchatDataTypes.PlaceholderEntry[];
	public param_autoClose:TwitchatDataTypes.ParameterData<boolean> = {value:true, type:"boolean", labelKey:"raffle.params.param_autoClose", icon:"trash"};

	private validRaffleTypes:TwitchatDataTypes.RaffleData["mode"][] = ["chat", "tips", "sub"];

	public get obsConnected():boolean { return OBSWebSocket.instance.connected.value; }

	public get canPick():boolean {
		if(!this.raffleData) return false;
		return (this.raffleData.entries && this.raffleData.entries.length > 0)
			&& (this.raffleData.winners == undefined
			|| this.raffleData.winners?.length < this.raffleData.entries.length)
	}

	public get cumulatedEntryCount():number {
		if(!this.raffleData) return 0;
		let count = 0;
		this.raffleData.entries.forEach(v=> {
			count += v.joinCount;
		})
		return count;
	}

	public get rewardName():string {
		if(!this.raffleData || !this.raffleData.reward_id) return "";
		const reward = this.$store.rewards.rewardList.find(v=>v.id == this.raffleData!.reward_id);
		return reward?.title || "";
	}

	public get availableRaffleList():TwitchatDataTypes.RaffleData[] {
		return this.$store.raffle.raffleList.filter(v=> this.validRaffleTypes.includes(v.mode));
	}

	public get tipPlatforms():string[] {
		if(!this.raffleData) return [];
		let platforms:string[] = [];
		if(this.raffleData.tip_kofi){
			let label = "Ko-Fi";
			if((this.raffleData.tip_kofi_minAmount || 0) > 0)  label += " ("+this.raffleData.tip_kofi_minAmount+"🪙)";
			platforms.push(label);
		}
		if(this.raffleData.tip_streamlabs){
			let label = "Streamlabs";
			if((this.raffleData.tip_streamlabs_minAmount || 0) > 0)  label += " ("+this.raffleData.tip_streamlabs_minAmount+"🪙)";
			platforms.push(label);
		}
		if(this.raffleData.tip_streamlabsCharity){
			let label = "Streamlabs Charity";
			if((this.raffleData.tip_streamlabsCharity_minAmount || 0) > 0)  label += " ("+this.raffleData.tip_streamlabsCharity_minAmount+"🪙)";
			platforms.push(label);
		}
		if(this.raffleData.tip_streamelements){
			let label = "Streamelements";
			if((this.raffleData.tip_streamelements_minAmount || 0) > 0)  label += " ("+this.raffleData.tip_streamelements_minAmount+"🪙)";
			platforms.push(label);
		}
		if(this.raffleData.tip_tipeee){
			let label = "Tipeee";
			if((this.raffleData.tip_tipeee_minAmount || 0) > 0)  label += " ("+this.raffleData.tip_tipeee_minAmount+"🪙)";
			platforms.push(label);
		}
		if(this.raffleData.tip_tiltify){
			let label = "Tiltify";
			if((this.raffleData.tip_tiltify_minAmount || 0) > 0)  label += " ("+this.raffleData.tip_tiltify_minAmount+"🪙)";
			platforms.push(label);
		}
		return platforms;
	}

	public getUserFromEntry(entry:TwitchatDataTypes.RaffleEntry):TwitchatDataTypes.TwitchatUser|null {
		if(!entry.user) return null;
		return this.$store.users.getUserFrom(entry.user.platform, entry.user.channel_id, entry.user.id);
	}

	public beforeMount():void {
		this.winnerPlaceholders	= [{tag:"USER", descKey:"raffle.params.username_placeholder", example:this.$store.auth.twitch.user.displayName}];
		this.raffleData			= this.availableRaffleList.length > 0? this.availableRaffleList[0]! : null;
		//Check if wheel's overlay exists
		PublicAPI.instance.broadcast("GET_WHEEL_OVERLAY_PRESENCE");
	}

	public mounted():void {
		this.renderFrame();
	}

	public beforeUnmount():void {
		this.disposed = true;
	}

	public closeRaffle():void {
		if(!this.raffleData) return;
		this.$confirm(this.$t('raffle.delete_confirm.title'), this.$t('raffle.delete_confirm.description'))
		.then(async ()=> {
			let index = this.availableRaffleList.findIndex(v=>v.sessionId! == this.raffleData!.sessionId!);
			this.$store.raffle.stopRaffle(this.raffleData!.sessionId!);
			//If there are other raffles, switch to previous one
			if(this.availableRaffleList.length > 0) {
				if(--index < 0) index = this.availableRaffleList.length-1;
				this.raffleData = this.availableRaffleList[index]!;
			}else{
				this.raffleData = null;
			}
			this.$emit("close");
		}).catch(()=> {
			//ignore
		});
	}

	public openUserCard(user:TwitchatDataTypes.TwitchatUser | null):void {
		if(!user) return;
		this.$store.users.openUserCard(user);
	}

	public expandDurationBy(duration_s:number):void {
		if(this.timerPercent >= 1) {
			this.raffleData!.duration_s = duration_s;
			this.raffleData!.created_at = Date.now();
		}else{
			this.raffleData!.duration_s += duration_s;
		}
		if(this.raffleData?.showCountdownOverlay) {
			const defaultCd = this.$store.timers.timerList.find(v=>v.type == "countdown" && v.isDefault)
			if(defaultCd) this.$store.timers.timerAdd(defaultCd?.id, 60_000);
		}
	}

	public async pickWinner():Promise<void> {
		if(!this.raffleData) return;

		this.picking = true;

		await this.$store.raffle.pickWinner(this.raffleData.sessionId!);

		this.picking = false;
	}

	public async nextRaffle():Promise<void> {
		if(!this.raffleData) return;

		const holder = this.$refs.content as HTMLDivElement;
		const cmdHolder = this.$refs.methods as HTMLElement;
		gsap.to([holder,cmdHolder], {opacity:0, x:-10, duration:.1, onComplete:()=>{
			let index = this.availableRaffleList.findIndex(v=>v.sessionId! == this.raffleData!.sessionId!);
			let newIndex = (++index) % this.availableRaffleList.length;
			this.raffleData = this.availableRaffleList[newIndex]!;
			gsap.fromTo([holder,cmdHolder], {x:10, opacity:0}, {opacity:1, x:0, duration:.1});
		}});
	}

	public async prevRaffle():Promise<void> {
		if(!this.raffleData) return;

		const holder = this.$refs.content as HTMLDivElement;
		const cmdHolder = this.$refs.methods as HTMLElement;
		gsap.to([holder,cmdHolder], {opacity:0, x:10, duration:.1, onComplete:()=>{
			let index = this.availableRaffleList.findIndex(v=>v.sessionId! == this.raffleData!.sessionId!);
			let newIndex = index - 1;
			if(newIndex < 0) newIndex = this.availableRaffleList.length -1;
			this.raffleData = this.availableRaffleList[newIndex]!;
			gsap.fromTo([holder,cmdHolder], {x:-10, opacity:0}, {opacity:1, x:0, duration:.1});
		}});
	}

	private renderFrame():void {
		if(this.disposed) return;
		if(!this.raffleData) return;

		requestAnimationFrame(()=>this.renderFrame());
		const elapsed	= Date.now() - new Date(this.raffleData.created_at).getTime();
		const duration	= this.raffleData.duration_s * 1000;
		this.timerPercent = 1 - (duration-elapsed)/duration;
	}
}
export default toNative(RaffleState);
</script>

<style scoped lang="less">
.rafflestate{
	gap: .5em;

	.title {
		flex-wrap: wrap;
		row-gap: .25em;
	}

	.body>.entries {
		display: flex;
		flex-direction: row;
		align-items: center;
		font-style: italic;
		.icon {
			height: 1em;
			width: 1em;
			object-fit: fill;
			margin-right: .5em;
		}
	}

	.warning {
		white-space: pre-line;
		text-align: center;
		.icon {
			height: 1em;
			margin-right: .25em;
		}
	}

	.winners {
		flex-shrink: 0;

		.entries {
			.entry {
				padding: .5em;
				color: var(--color-primary);
				background-color: var(--color-light);
				border-radius: var(--border-radius);
				font-size: .8rem;
				font-weight: normal;
			}
		}
	}

	.small {
		font-size: .8em;
		background-color: rgba(0, 0, 0, .25);
	}

	.nextRaffleBt, .prevRaffleBt {
		position: absolute;
		top: 0;
		right: 0;
		height: 100%;
		&.prevRaffleBt {
			right:unset;
			left: 0;
		}
	}

	.body {
		display: flex;
		flex-direction: column;
		gap: 1em;
		align-items: center;
		width: 100%;
	}

	.winners {
		.count {
			font-style: italic;
			font-weight: normal;
			font-size: .8em;
		}
		.entries {
			padding: 5px;//Makes sure box-filter isn't cut
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			justify-content: center;
			gap: .5em;
		}
	}
}
</style>
