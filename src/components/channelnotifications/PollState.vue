<template>
	<div class="pollstate">
		<h1 class="title"><img src="@/assets/icons/poll.svg">{{poll.title}}</h1>
		<div class="choices">
			<div class="choice" v-for="c in poll.choices" :key="c" :style="getAnswerStyles(c)">
				<div>{{c.title}}</div>
				<div>{{getPercent(c)}}% ({{c.votes}})</div>
			</div>
		</div>
		<div class="actions">
			<Button title="Delete poll" @click="deletePoll()" :loading="loading" />
		</div>
	</div>
</template>

<script lang="ts">
import store from '@/store';
import TwitchUtils, { TwitchTypes } from '@/utils/TwitchUtils';
import Utils from '@/utils/Utils';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';

@Options({
	props:{},
	components:{
		Button,
	}
})
export default class PollState extends Vue {

	public loading:boolean = false;

	private interval!:number;

	public get poll():TwitchTypes.Poll {
		return store.state.currentPoll as TwitchTypes.Poll;
	}

	public getPercent(c:TwitchTypes.PollChoice):number {
		let totalVotes = 0;
		if(this.poll) {
			for (let i = 0; i < this.poll.choices.length; i++) {
				totalVotes += this.poll.choices[i].votes;
			}
		}
		return Math.round(c.votes/Math.max(1,totalVotes) * 100);
	}

	public getAnswerStyles(c:TwitchTypes.PollChoice):unknown {
		return {
			backgroundSize: `${this.getPercent(c)*2}% 100%`
		}
	}

	public mounted():void {
		this.interval = setInterval(()=> {
			TwitchUtils.getPolls();
		}, 5000)
	}

	public beforeUnmount():void {
		clearInterval(this.interval);
	}

	public deletePoll():void {
		this.loading = true;
		Utils.confirm("Delete Poll", "Are you sure you want to delete this poll ?")
		.then(async ()=> {
			try {
				await TwitchUtils.endPoll(this.poll.id);
			}catch(error) {
				this.loading = false;
				store.state.alert = "An error occurred while deleting the poll";
			}
			this.loading = false;
		}).catch(error=> {
			this.loading = false;
		});
	}

}
</script>

<style scoped lang="less">
.pollstate{

	.title {
		color: @mainColor_light;
		width: 100%;
		text-align: center;
		border-bottom: 1px solid @mainColor_light;
		padding-bottom: 10px;
		margin-bottom: 10px;
		word-break: break-word;
		img {
			height: 20px;
			margin-right: 10px;
		}
	}

	.choices {
		.choice {
			display: flex;
			flex-direction: row;
			border-radius: 10px;
			padding: 7px 15px;
			font-size: 16px;
			color: @mainColor_light;
			@c: fade(@mainColor_light, 15%);
			background: linear-gradient(to right, @c 100%, @c 100%);
			background-color: fade(@mainColor_light, 5%);
			background-repeat: no-repeat;
			justify-content: space-between;
			&:not(:last-child) {
				margin-bottom: 5px;
			}
		}
	}

	.actions {
		display: flex;
		flex-direction: row;
		justify-content: center;
		margin-top: 10px;
	}
}
</style>