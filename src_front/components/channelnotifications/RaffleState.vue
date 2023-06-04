<template>
	<div class="rafflestate gameStateWindow">
		<h1 class="title">
			<img src="@/assets/icons/ticket.svg">
			<span>{{ $t('raffle.state_title') }}</span>
			<mark class="cmd" v-if="raffleData.command">{{raffleData.command}}</mark>
		</h1>

		<ProgressBar class="progress" secondary v-if="timerPercent < 1"
			:percent="raffleData.entries?.length == raffleData.maxEntries && raffleData.maxEntries > 0?  1 : timerPercent"
			:duration="raffleData.entries?.length == raffleData.maxEntries && raffleData.maxEntries > 0?  0 : raffleData.duration_s * 1000"
		/>

		<div class="item entries">
			<img src="@/assets/icons/user.svg" alt="user">
			<i18n-t scope="global" tag="p" keypath="raffle.state_users" :plural="raffleData.entries?.length">
				<template #COUNT>
					<span>{{raffleData.entries?.length}}</span>
					<span v-if="raffleData.maxEntries">/{{raffleData.maxEntries}}</span>
				</template>
			</i18n-t>
		</div>

		<div class="item entries" v-if="cumulatedEntryCount != raffleData.entries?.length">
			<img src="@/assets/icons/ticket.svg" alt="ticket">
			<i18n-t scope="global" tag="p" keypath="raffle.state_users_cumulated" :plural="cumulatedEntryCount"
			v-if="cumulatedEntryCount != raffleData.maxEntries">
				<template #COUNT>
					<span>{{cumulatedEntryCount}}</span>
				</template>
			</i18n-t>
		</div>

		<div class="item card-item winners" v-if="raffleData.winners && raffleData.winners.length > 0">
			<div class="entries">
				<template v-for="w in raffleData.winners" :key="w.label">
					<Button v-if="w.user" small light
					icon="sub"
					type="link"
					target="_blank"
					:href="'https://twitch.tv/'+getUserFromEntry(w)?.login"
					@click.prevent="openUserCard(getUserFromEntry(w))">{{ w.label }}</Button>
					<div class="entry" v-else>{{ w.label }}</div>
				</template>
			</div>
		</div>

		<div class="ctas">
			<Button icon="cross"
				highlight
				alert
				@click="closeRaffle()">{{ $t('raffle.state_stopBt') }}</Button>
			<Button icon="ticket"
				@click="pickWinner()"
				secondary
				:loading="picking"
				v-if="canPick">{{ $t('raffle.state_pickBt') }}</Button>
		</div>
	</div>
</template>

<script lang="ts">
import TwitchatEvent from '@/events/TwitchatEvent';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import { Component, Vue } from 'vue-facing-decorator';
import Button from '../Button.vue';
import ProgressBar from '../ProgressBar.vue';

@Component({
	components:{
		Button,
		ProgressBar,
	},
	emits:["close"]
})
export default class RaffleState extends Vue {

	public picking = false;
	public disposed = false;
	public timerPercent:number = 0;
	public raffleData!:TwitchatDataTypes.RaffleData;
	public winnerPlaceholders!:TwitchatDataTypes.PlaceholderEntry[];
	
	public get canPick():boolean {
		return (this.raffleData.entries && this.raffleData.entries.length > 0)
			&& (this.raffleData.winners == undefined
			|| this.raffleData.winners?.length < this.raffleData.entries.length)
	}

	public get cumulatedEntryCount():number {
		let count = 0;
		this.raffleData.entries.forEach(v=> {
			count += v.joinCount;
		})
		return count;
	}
	
	public getUserFromEntry(entry:TwitchatDataTypes.RaffleEntry):TwitchatDataTypes.TwitchatUser|null {
		if(!entry.user) return null;
		return this.$store("users").getUserFrom(entry.user.platform, entry.user.channel_id, entry.user.id);
	}

	public beforeMount():void {
		this.winnerPlaceholders	= [{tag:"USER", descKey:"raffle.params.username_placeholder", example:this.$store("auth").twitch.user.displayName}];
		this.raffleData			= this.$store("raffle").data!;

		//Check if wheel's overlay exists
		PublicAPI.instance.broadcast(TwitchatEvent.GET_WHEEL_OVERLAY_PRESENCE);
	}
	
	public mounted():void {
		this.renderFrame();
	}
	
	public beforeUnmount():void {
		this.disposed = true;
	}

	public closeRaffle():void {
		this.$confirm(this.$t('raffle.delete_confirm.title'), this.$t('raffle.delete_confirm.description'))
		.then(async ()=> {
			this.$store("raffle").stopRaffle();
			this.$emit("close");
		}).catch(()=> {
			//ignore
		});
	}

	public openUserCard(user:TwitchatDataTypes.TwitchatUser | null):void {
		if(!user) return;
		this.$store("users").openUserCard(user);
	}

	public async pickWinner():Promise<void> {
		this.picking = true;
		
		await this.$store("raffle").pickWinner();

		this.picking = false;
	}

	private renderFrame():void {
		if(this.disposed) return;
		requestAnimationFrame(()=>this.renderFrame());
		const ellapsed	= Date.now() - new Date(this.raffleData.created_at).getTime();
		const duration	= this.raffleData.duration_s * 1000;
		this.timerPercent = 1 - (duration-ellapsed)/duration;
	}

}
</script>

<style scoped lang="less">
.rafflestate{

	.cmd {
		margin-left: .5em;
	}

	&>.entries {
		display: flex;
		flex-direction: row;
		align-items: center;
		font-style: italic;
		img {
			height: 1em;
			width: 1em;
			object-fit: fill;
			margin-right: .5em;
		}
	}

	.winners {
		flex-shrink: 0;
	}

	.ctas {
		gap: 1em;
		row-gap: .5em;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
	}
}
</style>