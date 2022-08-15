<template>
	<div class="rafflestate">
		<h1 class="title"><img src="@/assets/icons/ticket.svg">Raffle - <span class="highlight">{{raffleData.command}}</span></h1>

		<ProgressBar class="progress"
		:percent="raffleData.entries?.length == raffleData.maxEntries && raffleData.maxEntries > 0?  1 : progressPercent"
		:duration="raffleData.entries?.length == raffleData.maxEntries && raffleData.maxEntries > 0?  0 : raffleData.duration*60000" />

		<div class="item entries">
			<img src="@/assets/icons/user.svg" alt="user">
			<p class="count">{{raffleData.entries?.length}}</p>
			<p class="max" v-if="raffleData.maxEntries">/{{raffleData.maxEntries}}</p>
			<p>entered</p>
		</div>
		<div class="item winners" v-if="raffleData.winners.length > 0">
			<span class="title">Winners <span class="count">({{raffleData.winners.length}})</span> :</span>
			<div class="entries">
				<span v-for="w in raffleData.winners" :key="w.label" @click="openUserCard(w)">{{w.label}}</span>
			</div>
		</div>

		<Button class="item"
			:icon="$image('icons/ticket.svg')"
			title="Pick a winner"
			@click="pickWinner()"
			:loading="picking"
			:disabled="!raffleData.entries || raffleData.entries.length == 0 || raffleData.winners.length == raffleData.entries.length" />

		<PostOnChatParam botMessageKey="raffle" class="item postChat" :placeholders="winnerPlaceholders" />

		<Button class="item"
			:icon="$image('icons/cross_white.svg')"
			title="Stop Raffle"
			highlight
			@click="closeRaffle()" />
	</div>
</template>

<script lang="ts">
import type { PlaceholderEntry, WheelData } from '@/types/TwitchatDataTypes';
import type { RaffleData, RaffleEntry, WheelItem } from '@/utils/CommonDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import StoreProxy from '@/utils/StoreProxy';
import TwitchatEvent from '@/utils/TwitchatEvent';
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import type { JsonObject } from "type-fest";
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
	public raffleData:RaffleData = StoreProxy.store.state.raffle as RaffleData;
	public winnerPlaceholders:PlaceholderEntry[] = [{tag:"USER", desc:"User name"}];
	
	private wheelOverlayPresenceHandler!:()=>void;
	private wheelOverlayExists = false;

	public mounted():void {
		const ellapsed = new Date().getTime() - new Date(this.raffleData.created_at).getTime();
		const duration = this.raffleData.duration*60000;
		const timeLeft = duration - ellapsed;
		this.progressPercent = ellapsed/duration;
		gsap.to(this, {progressPercent:1, duration:timeLeft/1000, ease:"linear"});

		this.wheelOverlayPresenceHandler = ()=> { this.wheelOverlayExists = true; };

		PublicAPI.instance.addEventListener(TwitchatEvent.WHEEL_OVERLAY_PRESENCE, this.wheelOverlayPresenceHandler);
		
		//Check if wheel's overlay exists
		PublicAPI.instance.broadcast(TwitchatEvent.GET_WHEEL_OVERLAY_PRESENCE);
	}

	public closeRaffle():void {
		this.$confirm("Close raffle", "All raffle entries will be lost")
		.then(async ()=> {
			StoreProxy.store.dispatch("stopRaffle");
			this.$emit("close");
			PublicAPI.instance.removeEventListener(TwitchatEvent.WHEEL_OVERLAY_PRESENCE, this.wheelOverlayPresenceHandler);
		}).catch(()=> {
			//ignore
		});
	}

	public openUserCard(user:RaffleEntry):void {
		StoreProxy.store.dispatch("openUserCard", user.label);
	}

	public async pickWinner():Promise<void> {
		let winner:RaffleEntry;
		this.picking = true;
		
		const list = [];
		//Ponderate votes by adding one user many times if her/his
		//score is greater than 1
		for (let i = 0; i < this.raffleData.entries.length; i++) {
			const u = this.raffleData.entries[i];
			if(u.score==1) list.push(u);
			else {
				for (let j = 0; j < u.score; j++) {
					list.push(u);
				}
			}
		}
		
		//Pick a winner that has not already be picked
		do{
			winner = Utils.pickRand(list);
		}while(this.raffleData.winners.find(w => w.id == winner.id));
		
		//Ask if a wheel overlay exists
		this.wheelOverlayExists = false;
		PublicAPI.instance.broadcast(TwitchatEvent.GET_WHEEL_OVERLAY_PRESENCE);
		await Utils.promisedTimeout(500);//Give the overlay some time to answer

		//A wheel overlay exists, send it data and wait for it to complete
		if(this.wheelOverlayExists){
			const list:WheelItem[] = this.raffleData.entries.map((v:RaffleEntry):WheelItem=>{
										return {
											id:v.id,
											label:v.label,
										}
									});
			const data:WheelData = {
				items:list,
				winner:winner.id,
			}
			PublicAPI.instance.broadcast(TwitchatEvent.WHEEL_OVERLAY_START, (data as unknown) as JsonObject);

		}else{

			//no wheel overlay found, just announce the winner
			const winnerData:WheelItem = {
				id:winner.id,
				label:winner.label,
			}
			StoreProxy.store.dispatch("onRaffleComplete", {winner:winnerData});
		}

		this.picking = false;

	}

}
</script>

<style scoped lang="less">
.rafflestate{
	color: @mainColor_light;

	&>.title {
		color: @mainColor_light;
		width: 100%;
		text-align: center;
		padding-bottom: 10px;
		word-break: break-word;
		img {
			width: 20px;
			margin-right: 10px;
		}
		.highlight {
			color: @mainColor_normal;
			background: @mainColor_light;
			padding: 2px 5px;
			border-radius: 5px;
			font-size: .8em;
		}
	}

	.progress {
		margin-bottom: 20px;
	}

	.item {
		margin: auto;
		&:not(:last-child) {
			margin-bottom: 10px;
		}

		&.entries {
			display: flex;
			flex-direction: row;
			font-style: italic;
			opacity: .7;
			font-size: 15px;
			.count, .max {
				margin-right: 5px;
			}
			img {
				height: 14px;
				align-self: baseline;
				margin-right: 5px;
			}
		}

		&.postChat {
			width: 70%;
			margin-top: 10px;
			font-size: .8em;
			:deep(.togglebutton) {
				border-color: @mainColor_light;
				.circle {
					background-color: @mainColor_light;
				}
			}
			:deep(.togglebutton.selected) {
				background-color: fade(@mainColor_light, 40%);
			}
			:deep(.togglebutton:hover) {
				background-color: fade(@mainColor_light, 50%);
			}
		}

		&.winners {
			display: block;
			margin: auto;
			margin-bottom: 10px;
			background: @mainColor_light;
			padding: 2px 5px;
			border-radius: 5px;
			color: @mainColor_normal;
			max-width: 100%;
			display: flex;
			flex-direction: column;
			.title {
				// flex-grow: 1;
				font-weight: bold;
				align-self: center;
				margin-bottom: 10px;
				.count {
					font-size: .75em;
					font-style: italic;
				}
			}
			.entries {
				display: flex;
				flex-direction: row;
				flex-wrap: wrap;
				justify-content: center;
				span {
					cursor: pointer;
					margin-left: 5px;
					text-decoration: underline;
					&:hover {
						color: @mainColor_alert;
						text-decoration: none;
					}
				}
			}
		}
	}
	
}
</style>