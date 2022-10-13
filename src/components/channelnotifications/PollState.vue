<template>
	<div class="pollstate">
		<h1 class="title"><img src="@/assets/icons/poll.svg">{{poll.title}}</h1>
		
		<ProgressBar class="progress"
			:percent="progressPercent"
			:duration="poll.duration_s*1000" />
		
		<div class="choices">
			<div v-for="(c, index) in poll.choices"
				:key="index"
				:style="getAnswerStyles(c)"
				:class="getAnswerClasses(c)"
			>
				<div>{{c.label}}</div>
				<div>{{getPercent(c)}}% ({{c.votes}})</div>
			</div>
		</div>
		<div class="actions">
			<Button title="End poll" @click="endPoll()" :loading="loading" />
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ProgressBar from '../ProgressBar.vue';

@Options({
	props:{},
	components:{
		Button,
		ProgressBar,
	}
})
export default class PollState extends Vue {

	public loading = false;
	public progressPercent = 0;

	public get poll():TwitchatDataTypes.MessagePollData {
		return this.$store("poll").data!;
	}

	public getPercent(c:TwitchatDataTypes.MessagePollDataChoice):number {
		let totalVotes = 0;
		if(this.poll) {
			for (let i = 0; i < this.poll.choices.length; i++) {
				totalVotes += this.poll.choices[i].votes;
			}
		}
		return Math.round(c.votes/Math.max(1,totalVotes) * 100);
	}

	public getAnswerStyles(c:TwitchatDataTypes.MessagePollDataChoice):{[key:string]:string} {
		let res:{[key:string]:string} = {};
		res.backgroundSize = `${this.getPercent(c)}% 100%`;
		return res;
	}

	public getAnswerClasses(c:TwitchatDataTypes.MessagePollDataChoice):string[] {
		let res:string[] = ["choice"];
	
		let max = 0;
		this.poll.choices.forEach(v => { max = Math.max(max, v.votes); });
		if(c.votes == max) res.push("win");
		else res.push("lose");

		return res;
	}

	public mounted():void {
		// this.loadPolls();
		const ellapsed = new Date().getTime() - new Date(this.poll.started_at).getTime();
		const duration = this.poll.duration_s*1000;
		const timeLeft = duration - ellapsed
		this.progressPercent = ellapsed/duration;
		gsap.to(this, {progressPercent:1, duration:timeLeft/1000, ease:"linear"});
	}

	public beforeUnmount():void {
		
	}

	public endPoll():void {
		this.loading = true;

		this.$confirm("End Poll", "Are you sure you want to end this poll now? ")
		.then(async ()=> {
			try {
				await TwitchUtils.endPoll(this.poll.id);
			}catch(error) {
				this.loading = false;
				this.$store("main").alertData = "An error occurred while deleting the poll";
			}
			this.loading = false;
		}).catch(()=> {
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

	.choices {
		.choice {
			display: flex;
			flex-direction: row;
			border-radius: 10px;
			padding: 7px 15px;
			font-size: 16px;
			color: @mainColor_light;
			@c: fade(@mainColor_light, 15%);
			transition: background-size .2s;
			background: linear-gradient(to right, @c 100%, @c 100%);
			background-color: fade(@mainColor_light, 10%);
			background-repeat: no-repeat;
			justify-content: space-between;
			&:not(:last-child) {
				margin-bottom: 5px;
			}

			&.win {
				@c: fade(#00cc00, 40%);
				background-image: linear-gradient(to right, @c 100%, @c 100%);
				// border: 1px solid fade(#00cc00, 20%);
			}

			&.lose {
				@c: fade(#cc0000, 40%);
				background-image: linear-gradient(to right, @c 100%, @c 100%);
				// border: 1px solid #cc0000;
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