<template>
	<div class="chatpollstate">
		<h1 class="title"><img src="@/assets/icons/chatPoll.svg">{{poll.command}}</h1>

		<ProgressBar class="progress"
			:percent="progressPercent"
			:duration="poll.duration*1000 * 60" />
		
		<ToggleBlock medium :open="false" :title="entries.length+' entries'" class="row choices" v-if="entries.length > 0" :icons="['user']">
			<div class="holder">
				<div class="choice" v-for="(c,index) in poll.choices" :key="c.user['user-id']+'_'+index">
					<div class="username">{{c.user['display-name']}}</div>
					<div class="text">{{c.text}}</div>
				</div>
				<div class="choice win" v-for="(c,index) in poll.winners" :key="c.user['user-id']+'_'+index">
					<img src="@/assets/icons/checkmark_white.svg" alt="check">
					<div class="username">{{c.user['display-name']}}</div>
					<div class="text">{{c.text}}</div>
				</div>
			</div>
		</ToggleBlock>

		<div class="row winner" v-if="poll.winners.length > 0">
			<span class="user">{{poll.winners[0].user['display-name']}}</span>
			<span class="message">{{poll.winners[0].text}}</span>
		</div>

		<div class="actions">
			<Button class="item"
				:icon="getImage('assets/icons/chatPoll.svg')"
				title="Pick a random entry"
				@click="pickEntry()"
				:disabled="poll.choices.length === 0" />

			<Button class="item"
				:icon="getImage('assets/icons/cross_white.svg')"
				title="Close chat poll"
				highlight
				@click="closePoll()" />
		</div>
	</div>
</template>

<script lang="ts">
import store  from '@/store';
import type { ChatPollData, ChatPollDataChoice } from '@/store';
import gsap from 'gsap/all';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ProgressBar from '../ProgressBar.vue';
import ToggleBlock from '../ToggleBlock.vue';

@Options({
	props:{},
	components:{
		Button,
		ToggleBlock,
		ProgressBar,
	}
})
export default class ChatPollState extends Vue {

	public loading:boolean = false;
	public progressPercent:number = 0;
	public getImage(path:string):string { return new URL(`/src/${path}`, import.meta.url).href; }

	public get poll():ChatPollData { return store.state.chatPoll as ChatPollData; }

	public get entries():ChatPollDataChoice[] {
		let list = this.poll.choices;
		list = list.concat(this.poll.winners);
		return list;
	}

	public mounted():void {
		const timeLeft = Math.max(0, (this.poll.duration * 1000 * 60) - (Date.now()-this.poll.startTime));
		this.progressPercent = 1 - timeLeft/(this.poll.duration*1000*60);
		gsap.to(this, {progressPercent:1, duration:timeLeft/1000, ease:"linear"});
	}

	public pickEntry():void {
		const choices = this.poll.choices;
		const index =  Math.floor(Math.random() * choices.length)
		const choice = choices.splice(index, 1)[0];
		this.poll.winners.unshift(choice);
	}

	public closePoll():void {
		store.dispatch("setChatPoll", null);
	}

}
</script>

<style scoped lang="less">
.chatpollstate{
	color: @mainColor_light;

	.title {
		width: 100%;
		text-align: center;
		padding-bottom: 10px;
		word-break: break-word;
		img {
			height: 20px;
			margin-right: 10px;
		}
	}

	.progress {
		margin-bottom: 20px;
	}

	.row {
		margin: auto;
		margin-bottom: 1em;

		&.winner {
			padding: 0;
			border-radius: 5px;
			border: 2px solid @mainColor_light;
			display: flex;
			flex-direction: column;
			.user {
				text-align: center;
				padding: .25em .5em;
				color: @mainColor_normal;
				background: @mainColor_light;
			}
			.message {
				text-align: center;
				padding: .25em .5em;
				border-radius: 5px;
			}
		}
	}

	.choices {
		:deep(.content){
			background-color: fade(@mainColor_normal, 10%);
		}
		.holder {
			max-height: 200px;
			overflow-y: auto;
			
			.choice {
				display: flex;
				flex-direction: row;

				&.win {
					background-color: @mainColor_normal;
					img {
						height: 1em;
						margin-right: .25em;
					}
				}

				.username {
					font-weight: bold;
					margin-right: 1em;
				}
			}
		}
	}

	.actions {
		margin: auto;
		display: flex;
		flex-direction: column;
		justify-content: center;
		.button:not(:first-child) {
			margin-top: .25em;
		}
	}
}
</style>