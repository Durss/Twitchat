<template>
	<div class="chatsuggstate">
		<h1 class="title"><img src="@/assets/icons/chatPoll.svg">{{ $t('suggestion.state_title') }} <span class="highlight">{{poll.command}}</span></h1>

		<ProgressBar class="progress"
			:percent="progressPercent"
			:duration="poll.duration*1000 * 60" />
		
		<div class="item">{{ $tc('suggestion.state_header', entries.length, [entries.length]) }}</div>
		<TransitionGroup name="list" tag="div" ref="list" class="item choices" v-if="entries.length > 0">
		<div :class="c.selected? 'choice win' : 'choice'" v-for="(c,index) in entries" :key="c.data.id">
			<img v-if="c.selected" :src="$image('icons/sub'+(index>0?'_purple':'')+'.svg')" alt="star">
			<div class="info">
				<a class="user" @click="openUserCard(c.data.user)" target="_blank">{{c.data.user.displayName}}</a>
				<div class="text">{{c.data.label}}</div>
			</div>
		</div>
		</TransitionGroup>

		<div class="actions">
			<Button class="item"
				:icon="$image('icons/chatPoll_purple.svg')"
				:title="$t('suggestion.state_pickBt')"
				@click="pickEntry()"
				white
				:disabled="poll.choices.length === 0" />

			<Button class="item"
				:icon="$image('icons/cross_white.svg')"
				:title="$t('suggestion.state_closeBt')"
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

	public get entries():{data:TwitchatDataTypes.ChatSuggestionDataChoice, selected:boolean}[] {
		let list = this.poll.winners.map(v=> { return {data:v, selected:true} });
		list = list.concat(this.poll.choices.map(v=> { return {data:v, selected:false} }));
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

		const list = (this.$refs.list as Vue).$el;
		gsap.to(list, {duration:.25, scrollTo:{y:0}});

		const choice = choices.splice(index, 1)[0];
		this.poll.winners.unshift(choice);

		const data:TwitchatDataTypes.RaffleData = {
			command:"",
			created_at:Date.now(),
			entries:this.entries.map(v=> {
				return {
					id:v.data.id,
					label:v.data.user.displayName+" : "+v.data.label,
					score:1,
				}
			}),
			customEntries:"",
			duration_s:0,
			followRatio:1,
			subgiftRatio:1,
			subRatio:1,
			vipRatio:1,
			subMode_excludeGifted:false,
			subMode_includeGifters:false,
			maxEntries:0,
			mode:"chat",
			showCountdownOverlay:false,
		};

		const winner = {
					id:choice.id,
					label:choice.user.displayName+" : "+choice.label,
					score:1,
				};

		this.$store("raffle").pickWinner(data, winner);
	}

	public closePoll():void {
		this.$confirm(this.$t("suggestion.state_close_confirm_title"),
					this.$t("suggestion.state_close_confirm_desc"))
		.then(()=> {
			this.$store("chatSuggestion").setChatSuggestion(null);
		}).catch(()=>{});
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
		overflow-x: hidden;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: .5em;
		min-width: 300px;
		max-width: 600px;
		
		.choice {
			display: flex;
			flex-direction: column;
			font-size: .9em;
			padding: .25em;
			border-radius: .5em;
			background-color: fade(@mainColor_normal_extralight, 30%);

			&.win {
				display: flex;
				flex-direction: row;
				gap:.25em;
				background-color: fade(@mainColor_normal_extralight, 50%);
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
				font-size: .9em;
				font-weight: bold;
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

	.list-move,
	.list-enter-active,
	.list-leave-active {
		transition: all 0.5s ease;
	}

	.list-enter-from,
	.list-leave-to {
		opacity: 0;
		transform: translateX(30px);
	}

	.list-leave-active {
		position: absolute;
	}
}
</style>