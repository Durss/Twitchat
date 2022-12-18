<template>
	<div class="chatsuggstate">
		<h1 class="title"><img src="@/assets/icons/chatPoll.svg">Chat suggestion - <span class="highlight">{{poll.command}}</span></h1>

		<ProgressBar class="progress"
			:percent="progressPercent"
			:duration="poll.duration*1000 * 60" />
		
		<div class="item">{{entries.length}} suggestions</div>
		<div class="item choices" v-if="poll.winners.length > 0 || poll.choices.length > 0">
			<div class="choice win" v-for="(c,index) in poll.winners" :key="c.user.id+'_'+index">
				<img :src="$image('icons/sub'+(index>0?'_purple':'')+'.svg')" alt="star">
				<div class="info">
					<a class="user" @click="openUserCard(c.user)" target="_blank">{{c.user.displayName}}</a>
					<div class="text">{{c.label}}</div>
				</div>
			</div>
			<div class="choice" v-for="(c,index) in poll.choices" :key="c.user.id+'_'+index">
				<a class="user" @click="openUserCard(c.user)" target="_blank">{{c.user.displayName}}</a>
				<div class="text">{{c.label}}</div>
			</div>
		</div>

		<div class="actions">
			<Button class="item"
				:icon="$image('icons/chatPoll_purple.svg')"
				title="Pick a random entry"
				@click="pickEntry()"
				white
				:disabled="poll.choices.length === 0" />

			<Button class="item"
				:icon="$image('icons/cross_white.svg')"
				title="Close chat poll"
				highlight
				@click="closePoll()" />
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import gsap from 'gsap';
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
export default class ChatSuggestionState extends Vue {

	public loading = false;
	public progressPercent = 0;

	public get poll():TwitchatDataTypes.ChatSuggestionData { return this.$store("chatSuggestion").data!; }

	public get entries():TwitchatDataTypes.ChatSuggestionDataChoice[] {
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
		this.$store("chatSuggestion").setChatSuggestion(null);
	}

	public openUserCard(user:TwitchatDataTypes.TwitchatUser):void {
		this.$store("users").openUserCard(user);
	}

}
</script>

<style scoped lang="less">
.chatsuggstate{
	.gameStateWindow();

	.title>.highlight {
		margin-left: .5em;
	}

	.item {
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
		padding: .5em;
		border-radius: .5em;
		background-color: @mainColor_light;
		color: @mainColor_normal;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: .5em;
		
		.choice {
			display: flex;
			flex-direction: column;
			padding: .25em;
			border-radius: .5em;
			background-color: fade(@mainColor_normal_extralight, 30%);

			&.win {
				display: flex;
				flex-direction: row;
				gap:.25em;
				img {
					height: 1em;
				}
				&:first-of-type{
					color: @mainColor_light;
					background-color: @mainColor_normal;
					a {
						color: @mainColor_light;
						&:hover {
							color: @mainColor_alert_extralight;
						}
					}
				}
				&:not(:first-of-type) {
					border: 1px solid @mainColor_normal;
				}
			}
			.user {
				font-weight: bold
			}

			.text {
				padding-left: .5em;
			}
		}
	}

	.actions {
		display: flex;
		flex-direction: column;
		align-items: center;
	}
}
</style>