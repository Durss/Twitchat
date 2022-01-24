<template>
	<div class="pollstate">
		<h1 class="title"><img src="@/assets/icons/poll.svg">{{poll.title}}</h1>
		
		<ProgressBar class="progress"
			:percent="progressPercent"
			:duration="this.poll.duration*1000"
			v-if="poll.status == 'ACTIVE'" />
		
		<div class="choices">
			<div v-for="(c, index) in poll.choices"
			:key="index"
			:style="getAnswerStyles(c)"
			:class="getAnswerClasses(c)"
			>
				<div>{{c.title}}</div>
				<div>{{getPercent(c)}}% ({{c.votes}})</div>
			</div>
		</div>
		<div class="actions">
			<Button title="Delete poll" @click="deletePoll()" :loading="loading" v-if="poll.status == 'ACTIVE'" />
		</div>
	</div>
</template>

<script lang="ts">
import store from '@/store';
import TwitchUtils, { TwitchTypes } from '@/utils/TwitchUtils';
import Utils from '@/utils/Utils';
import gsap from 'gsap/all';
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

	public loading:boolean = false;
	public progressPercent:number = 0;

	private disposed:boolean = false;

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

	public getAnswerStyles(c:TwitchTypes.PollChoice):{[key:string]:string} {
		let res:{[key:string]:string} = {};
		res.backgroundSize = `${this.getPercent(c)}% 100%`;
		return res;
	}

	public getAnswerClasses(c:TwitchTypes.PollChoice):string[] {
		let res:string[] = ["choice"];
		
		if(this.poll.status == "COMPLETED") {
			let max = 0;
			this.poll.choices.forEach(v => { max = Math.max(max, v.votes); });
			if(c.votes == max) res.push("win");
			else res.push("lose");
		}

		return res;
	}

	public mounted():void {
		this.loadPolls();
		const ellapsed = new Date().getTime() - new Date(this.poll.started_at).getTime();
		const duration = this.poll.duration*1000;
		const timeLeft = duration - ellapsed
		this.progressPercent = ellapsed/duration;
		gsap.to(this, {progressPercent:1, duration:timeLeft/1000, ease:"linear"});
	}

	private async loadPolls():Promise<void> {
		if(this.disposed) return;
		await TwitchUtils.getPolls();//This actually automatically refresh the storage
		await Utils.promisedTimeout(1000);
		this.loadPolls();
	}

	public beforeUnmount():void {
		this.disposed = true;
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
		margin-bottom: 10px;
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
				@c: fade(#00cc00, 100%);
				background-image: linear-gradient(to right, @c 100%, @c 100%);
				border: 1px solid #00cc00;
			}

			&.lose {
				@c: fade(#cc0000, 40%);
				background-image: linear-gradient(to right, @c 100%, @c 100%);
				border: 1px solid #cc0000;
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