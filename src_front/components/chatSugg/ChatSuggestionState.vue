<template>
	<div class="chatsuggstate sidePanel">
		<div class="head">
			<CloseButton @click="close()" />
			<h1 class="title"><img src="@/assets/icons/chatPoll.svg" class="icon">{{ $t('suggestion.state_title') }} <mark>{{poll.command}}</mark></h1>
		</div>
		
		<ProgressBar class="progress"
		v-if="progressPercent < 1"
		:percent="progressPercent"
		:duration="poll.duration*1000 * 60" />

		<div class="content">
	
			<div class="card-item primary actions">
				<div>{{ $tc('suggestion.state_header', entries.length, [entries.length]) }}</div>
				
				<Button icon="chatPoll"
					@click="pickEntry()"
					:disabled="poll.choices.length === 0">{{ $t('suggestion.state_pickBt') }}</Button>

				<Button icon="cross" alert
					@click="closePoll()">{{ $t('suggestion.state_closeBt') }}</Button>
			</div>
			
			<div class="splitter" v-if="entries.length > 0"></div>

			<TransitionGroup name="list" tag="div" ref="list" class="itemList" v-if="entries.length > 0">
			<div :class="c.selected? 'card-item primary win' : 'card-item primary'" v-for="(c,index) in entries" :key="c.data.id">
				<div class="header">
					<img v-if="c.selected" :src="$image('icons/sub.svg')" alt="star">
					
					<button class="deleteBt" v-else @click="deleteEntery(c.data)"><img src="@/assets/icons/trash.svg?v="></button>
					
					<a class="title" target="_blank"
					:href="'https://twitch.tv/'+c.data.user.login"
					@click.prevent="openUserCard(c.data.user)">{{c.data.user.displayName}}</a>
				</div>
				<div class="info">
					<div class="text">{{c.data.label}}</div>
				</div>
			</div>
			</TransitionGroup>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import gsap from 'gsap';
import { Component } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel.vue';
import Button from '../Button.vue';
import CloseButton from '../CloseButton.vue';
import ProgressBar from '../ProgressBar.vue';
import ToggleBlock from '../ToggleBlock.vue';

@Component({
	components:{
		Button,
		ToggleBlock,
		ProgressBar,
		CloseButton,
	},
	emits:["close"]
})
export default class ChatSuggestionState extends AbstractSidePanel {

	public loading = false;
	public disposed = false;
	public progressPercent = 0;

	public get poll():TwitchatDataTypes.ChatSuggestionData { return this.$store("chatSuggestion").data!; }

	public get entries():{data:TwitchatDataTypes.ChatSuggestionDataChoice, selected:boolean}[] {
		let list = this.poll.winners.map(v=> { return {data:v, selected:true} });
		list = list.concat(this.poll.choices.map(v=> { return {data:v, selected:false} }));
		return list;
	}

	public mounted():void {
		this.renderFrame();
		super.open();
	}

	public beforeUnmount():void {
		this.disposed = true;
	}

	public pickEntry():void {
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
			winners:[],
			mode:"chat",
			showCountdownOverlay:false,
		};

		data.resultCallback = ()=> {
			if(data.winners
			&& data.winners.length > 0) {
				const winnerId = data.winners[data.winners.length-1].id;
				const index = this.poll.choices.findIndex(v=>v.id == winnerId);
				const entry = this.poll.choices.splice(index, 1)[0];
				if(entry) {
					this.poll.winners.push( entry );
					//Scroll back to top
					const list = (this.$refs.list as Vue).$el;
					gsap.to(list, {duration:.25, scrollTo:{y:0}});
				}
			}
		}
		this.$store("raffle").pickWinner(data);
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

	public deleteEntery(entry:TwitchatDataTypes.ChatSuggestionDataChoice):void {
		this.poll.choices = this.poll.choices.filter(v=> v.id != entry.id);
	}

	private renderFrame():void {
		if(this.disposed) return;
		requestAnimationFrame(()=>this.renderFrame());
		const ellapsed = Date.now() - this.poll.startTime;
		const duration = this.poll.duration * 1000 * 60;
		this.progressPercent = ellapsed/duration;
	}

}
</script>

<style scoped lang="less">
.chatsuggstate{

	.actions {
		align-items: center;
		flex-shrink: 0;
	}

	.itemList {
		color: var(--color-light);
		overflow-y: auto;
		overflow-x: hidden;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: center;
		gap: .5em;
		min-width: 300px;
		max-width: 600px;
		
		.item {
			&.win {
				border: 1px solid var(--color-secondary);
				img {
					height: 1em;
				}
				.header {
					background-color: var(--color-secondary);
				}
			}
			.title {
				text-decoration: none;
			}

			.text {
				padding-left: .5em;
			}

			.deleteBt {
				height: 1em;
				align-self: center;
				transition: transform .1s;
				img {
					height: 100%;
				}
				&:hover {
					transform: scale(1.1);
				}
			}
		}
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