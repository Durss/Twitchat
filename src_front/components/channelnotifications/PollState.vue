<template>
	<div class="pollstate gameStateWindow">
		<div class="head" v-stickyTopShadow>
			<h1 class="title"><Icon name="poll" />{{poll.title}}</h1>
			<ProgressBar class="progress"
				secondary
				:percent="progressPercent"
				:duration="poll.duration_s*1000" />
			<slot />
		</div>


		<div class="body">
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
	
			<i18n-t class="creator" scope="global" tag="div" keypath="poll.form.created_by"
			v-if="poll.creator && poll.creator.id != me.id">
				<template #USER>
					<a class="userlink" @click.stop="openUserCard()">{{poll.creator.displayName}}</a>
				</template>
			</i18n-t>
	
			<div class="actions" v-if="me.channelInfo[poll.channel_id]?.is_moderator">
				<TTButton alert @click="endPoll()" :loading="loading">{{ $t("poll.state.endBt") }}</TTButton>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import TTButton from '../TTButton.vue';
import ProgressBar from '../ProgressBar.vue';
import Icon from '../Icon.vue';

@Component({
	components:{
		Icon,
		TTButton,
		ProgressBar,
	}
})
class PollState extends Vue {

	public loading = false;
	public progressPercent = 0;

	private disposed = false;

	public get poll():TwitchatDataTypes.MessagePollData { return this.$store.poll.data!; }

	public get me():TwitchatDataTypes.TwitchatUser { return this.$store.auth.twitch.user; }

	public getPercent(c:TwitchatDataTypes.MessagePollDataChoice):number {
		let totalVotes = 0;
		if(this.poll) {
			for (let i = 0; i < this.poll.choices.length; i++) {
				totalVotes += this.poll.choices[i]!.votes;
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
		this.renderFrame();
	}

	public beforeUnmount():void {
		this.disposed = true;
	}

	public endPoll():void {
		this.loading = true;

		this.$confirm(this.$t("poll.state.closeConfirm.title"), this.$t("poll.state.closeConfirm.message"))
		.then(async ()=> {
			try {
				await TwitchUtils.endPoll(this.poll.id, this.poll.channel_id);
			}catch(error) {
				this.loading = false;
				this.$store.common.alert( "An error occurred while deleting the poll" );
			}
			this.loading = false;
		}).catch(()=> {
			this.loading = false;
		});
	}

	private renderFrame():void {
		if(this.disposed) return;
		requestAnimationFrame(()=>this.renderFrame());
		const elapsed = Date.now() - this.poll.started_at;
		const duration = this.poll.duration_s * 1000;
		this.progressPercent = elapsed/duration;
	}

	public openUserCard():void {
		this.$store.users.openUserCard(this.poll.creator!);
	}
}
export default toNative(PollState);
</script>

<style scoped lang="less">
.pollstate{
	.creator {
		font-size: .8em;
		text-align: center;
		width: calc(100% - 1em - 10px);
		font-style: italic;
	}

	.choices {
		align-self: stretch;
		.choice {
			.emboss();
			display: flex;
			flex-direction: row;
			border-radius: var(--border-radius);
			padding: .25em .5em;
			font-size: em;
			background-color: var(--color-secondary-fadest);
			transition: background-size .2s;
			justify-content: space-between;
			background-repeat: no-repeat;
			&:not(:last-child) {
				margin-bottom: 5px;
			}

			&.win {
				@c: var(--color-secondary);
				background-image: linear-gradient(to right, @c 100%, @c 100%);
				// border: 1px solid fade(#00cc00, 20%);
			}

			&.lose {
				@c: var(--color-secondary);
				background-image: linear-gradient(to right, @c 100%, @c 100%);
				// border: 1px solid #cc0000;
			}
		}
	}
}
</style>
