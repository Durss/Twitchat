<template>
	<div class="rafflestate">
		<h1 class="title"><img src="@/assets/icons/ticket.svg">{{ $t('raffle.state_title') }} <span class="cmd highlight">{{raffleData.command}}</span></h1>

		<ProgressBar class="progress"
			:percent="raffleData.entries?.length == raffleData.maxEntries && raffleData.maxEntries > 0?  1 : progressPercent"
			:duration="raffleData.entries?.length == raffleData.maxEntries && raffleData.maxEntries > 0?  0 : raffleData.duration_s"
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

		<div class="item winners highlight" v-if="raffleData.winners && raffleData.winners.length > 0">
			<i18n-t class="title" scope="global" tag="p" keypath="raffle.state_winners">
				<template #COUNT>
					<span class="count">({{raffleData.winners.length}})</span>
				</template>
			</i18n-t>
			<div class="entries">
				<template v-for="w in raffleData.winners" :key="w.label">
					<Button v-if="!w.user" :title="w.label" small @click="openUserCard(getUserFromEntry(w))" />
					<div class="entry" v-else>{{ w.label }}</div>
				</template>
			</div>
		</div>

		<Button class="item"
			:icon="$image('icons/ticket_purple.svg')"
			:title="$t('raffle.state_pickBt')"
			@click="pickWinner()"
			white
			:loading="picking"
			v-if="canPick" />

		<PostOnChatParam class="item postChat highlight" botMessageKey="raffle"
			titleKey="global.post_winner"
			:placeholders="winnerPlaceholders" />

		<Button class="item"
			:icon="$image('icons/cross_white.svg')"
			:title="$t('raffle.state_stopBt')"
			highlight
			@click="closeRaffle()" />
	</div>
</template>

<script lang="ts">
import TwitchatEvent from '@/events/TwitchatEvent';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import PostOnChatParam from '../params/PostOnChatParam.vue';
import ProgressBar from '../ProgressBar.vue';

@Options({
	props:{},
	components:{
		Button,
		ProgressBar,
		PostOnChatParam,
	},
	emits:["close"]
})
export default class RaffleState extends Vue {

	public picking = false;
	public progressPercent = 0;
	public raffleData!:TwitchatDataTypes.RaffleData;
	public winnerPlaceholders!:TwitchatDataTypes.PlaceholderEntry[];
	
	public get canPick():boolean {
		return (this.raffleData.entries && this.raffleData.entries.length > 0)
		 && (this.raffleData.winners == undefined
		 || this.raffleData.winners?.length < this.raffleData.entries.length)
	}
	
	public getUserFromEntry(entry:TwitchatDataTypes.RaffleEntry):TwitchatDataTypes.TwitchatUser|null {
		if(!entry.user) return null;
		return this.$store("users").getUserFrom(entry.user.platform, entry.user.channel_id, entry.user.id);

	}

	public beforeMount():void {

		this.winnerPlaceholders	= [{tag:"USER", descKey:"raffle.params.username_placeholder", example:this.$store("auth").twitch.user.displayName}];
		this.raffleData			= this.$store("raffle").data!;
		const ellapsed			= Date.now() - new Date(this.raffleData.created_at).getTime();
		const duration			= this.raffleData.duration_s;
		const timeLeft			= duration - ellapsed;
		this.progressPercent	= ellapsed/duration;
		gsap.to(this, {progressPercent:1, duration:timeLeft/1000, ease:"linear"});

		//Check if wheel's overlay exists
		PublicAPI.instance.broadcast(TwitchatEvent.GET_WHEEL_OVERLAY_PRESENCE);
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
		let winner:TwitchatDataTypes.RaffleEntry;
		this.picking = true;
		
		await this.$store("raffle").pickWinner();

		this.picking = false;
	}

}
</script>

<style scoped lang="less">
.rafflestate{
	.gameStateWindow();

	.cmd {
		margin-left: .5em;
	}

	.item {

		&.entries {
			display: flex;
			flex-direction: row;
			align-items: center;
			font-style: italic;
			opacity: .7;
			font-size: .8em;
			img {
				height: 1em;
				margin-right: .5em;
			}
		}

		&.winners {
			font-size: 1em;
			color: @mainColor_normal;
			max-width: 100%;
			display: flex;
			flex-direction: column;
			.title {
				font-weight: bold;
				align-self: center;
				margin-bottom: .5em;
				.count {
					font-size: .75em;
					font-weight: normal;
					font-style: italic;
				}
			}
			.entries {
				display: flex;
				flex-direction: row;
				flex-wrap: wrap;
				justify-content: center;
				gap: .25em;
				.entry {
					color: @mainColor_light;
					background-color: @mainColor_normal;
					padding: .2em;
					border-radius: .3em;
					font-size: .85em;
					min-height: calc(.85em + .1em);
				}
			}
		}

		&.postChat {
			max-width: 320px;
			font-size: .8em;
			color: @mainColor_normal;
		}
	}
}
</style>