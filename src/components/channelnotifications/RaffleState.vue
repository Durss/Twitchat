<template>
	<div class="rafflestate">
		<h1 class="title"><img src="@/assets/icons/ticket.svg">Raffle</h1>

		<ProgressBar class="progress" :percent="progressPercent" :duration="raffleData.duration*60000" />

		<div class="item users">
			<img src="@/assets/icons/user.svg" alt="user">
			<p class="count">{{raffleData.users?.length}}</p>
			<p class="max" v-if="raffleData.maxUsers">/{{raffleData.maxUsers}}</p>
			<p>entered</p>
		</div>
		<div class="item winners" v-if="winners.length > 0">
			<span class="title">Winners <span class="count">({{winners.length}})</span> :</span>
			<div class="users">
				<span v-for="w in winners" :key="w['user-id']" @click="openUserCard(w)">{{w['display-name']}}</span>
			</div>
		</div>

		<Button class="item"
			:icon="require('@/assets/icons/ticket.svg')"
			title="Pick a winner"
			@click="pickWinner()"
			:disabled="!raffleData.users || raffleData.users.length == 0 || winners.length == raffleData.users.length" />

		<div class="item command">
			<div class="title">Configured command</div>
			<div class="cmd">{{raffleData.command}}</div>
		</div>

		<ParamItem class="item postChat" :paramData="postOnChatParam" />

		<Button class="item"
			:icon="require('@/assets/icons/cross_white.svg')"
			title="Close"
			highlight
			@click="closeRaffle()" />
	</div>
</template>

<script lang="ts">
import store, { ParameterData, RaffleData } from '@/store';
import IRCClient from '@/utils/IRCClient';
import Utils from '@/utils/Utils';
import gsap from 'gsap/all';
import { ChatUserstate } from 'tmi.js';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ParamItem from '../params/ParamItem.vue';
import ProgressBar from '../ProgressBar.vue';

@Options({
	props:{},
	components:{
		Button,
		ParamItem,
		ProgressBar,
	},
	emits:["close"]
})
export default class RaffleState extends Vue {

	public progressPercent:number = 0;
	public raffleData:RaffleData = store.state.raffle as RaffleData;
	public postOnChatParam:ParameterData = {label:"Post winner on chat", value:true, type:"toggle"};
	public winners:ChatUserstate[] = [];

	public mounted():void {
		const ellapsed = new Date().getTime() - new Date(this.raffleData.created_at).getTime();
		const duration = this.raffleData.duration*60000;
		const timeLeft = duration - ellapsed;
		this.progressPercent = ellapsed/duration;
		gsap.to(this, {progressPercent:1, duration:timeLeft/1000, ease:"linear"});
	}

	public closeRaffle():void {
		store.dispatch("startRaffle", {});
		this.$emit("close")
	}

	public openUserCard(user:ChatUserstate):void {
		store.dispatch("openUserCard", user.username);
	}

	public pickWinner():void {
		let winner:ChatUserstate;
		do{
			winner = Utils.pickRand(this.raffleData.users);
		}while(this.winners.find(w => w['user-id'] == winner['user-id']));

		this.winners.push( winner );
		if(this.postOnChatParam.value) {
			IRCClient.instance.sendMessage("Congrats @"+winner['display-name']+" you won the raffle!");
		}
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
	}

	.progress {
		margin-bottom: 10px;
	}

	.item {
		margin: auto;
		&:not(:last-child) {
			margin-bottom: 10px;
		}

		&.users {
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

		&.command {
			display: flex;
			flex-direction: row;
			font-size: 15px;
			.title {
				flex-grow: 1;
			}
			.cmd {
				margin-left: 10px;
				background: @mainColor_light;
				padding: 2px 5px;
				border-radius: 5px;
				color: @mainColor_normal;
			}
		}

		&.postChat {
			:deep(label) {
				font-size: 15px;
				align-self: center;
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
			.users {
				display: flex;
				flex-direction: row;
				flex-wrap: wrap;
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