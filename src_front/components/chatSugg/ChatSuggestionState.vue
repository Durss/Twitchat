<template>
	<div class="chatsuggstate sidePanel">
		<div class="head">
			<ClearButton @click="close()" />
			<h1 class="title"><Icon name="chatSugg" />{{ $t('suggestion.state_title') }} <mark>{{poll.command}}</mark></h1>
		</div>
		
		<ProgressBar class="progress"
		v-if="progressPercent < 1"
		:percent="progressPercent"
		:duration="poll.duration*1000 * 60" />

		<div class="content">
			<div class="card-item actions">
				<div>{{ $tc('suggestion.state_header', entries.length, [entries.length]) }}</div>
				
				<TTButton icon="chatSugg"
					@click="pickEntry()"
					:disabled="poll.choices.length === 0">{{ $t('suggestion.state_pickBt') }}</TTButton>

				<TTButton icon="cross" alert
					@click="closePoll()">{{ $t('suggestion.state_closeBt') }}</TTButton>
			</div>
			
			<div class="splitter" v-if="entries.length > 0"></div>

			<TransitionGroup name="list" tag="div" ref="list" class="itemList" v-if="entries.length > 0">
			<div :class="c.selected? 'card-item secondary win' : 'card-item'" v-for="(c,index) in entries" :key="c.data.id">
				<div class="header">
					<Icon v-if="c.selected" name="sub" ref="selected" />
					
					<button class="deleteBt" v-else @click="deleteEntery(c.data)"><Icon name="trash" /></button>
					
					<a class="title" target="_blank"
					:href="'https://twitch.tv/'+c.data.user.login"
					@click.prevent="openUserCard(c.data.user)">{{c.data.user.displayNameOriginal}}</a>
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
import Utils from '@/utils/Utils';
import { Component, toNative } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel';
import ClearButton from '../ClearButton.vue';
import Icon from '../Icon.vue';
import ProgressBar from '../ProgressBar.vue';
import ToggleBlock from '../ToggleBlock.vue';
import TTButton from '../TTButton.vue';

@Component({
	components:{
		Icon,
		TTButton,
		ToggleBlock,
		ProgressBar,
		ClearButton,
	},
	emits:["close"]
})
class ChatSuggestionState extends AbstractSidePanel {

	public loading = false;
	public disposed = false;
	public progressPercent = 0;

	public get poll():TwitchatDataTypes.ChatSuggestionData { return this.$store.chatSuggestion.data!; }

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
			sessionId:Utils.getUUID(),
			command:"",
			created_at:Date.now(),
			entries:this.poll.choices.map(v=> {
				return {
					id:v.id,
					label:v.user.displayNameOriginal+" : "+v.label,
					score:1,
					joinCount:1,
				}
			}),
			customEntries:"",
			duration_s:0,
			followRatio:1,
			subgiftRatio:1,
			subRatio:1,
			subT2Ratio:1,
			subT3Ratio:1,
			vipRatio:1,
			multipleJoin:false,
			autoClose:true,
			ghost:true,
			subMode_excludeGifted:false,
			subMode_includeGifters:false,
			maxEntries:0,
			winners:[],
			mode:"chat",
			showCountdownOverlay:false,
		};

		data.resultCallback = (winner:TwitchatDataTypes.RaffleEntry)=> {
			if(data.winners
			&& data.winners.length > 0) {
				const index = this.poll.choices.findIndex(v=>v.id == winner.id);
				if(index > -1) {
					const entry = this.poll.choices.splice(index, 1)[0];
					if(entry) {
						this.poll.winners.push( entry );
						//Scroll back to top
						const doneList = (this.$refs["selected"] as Vue[]).map(v=>v.$el);
						if(doneList.length > 0) {
							doneList[doneList.length-1].scrollIntoView();
						}
					}
				}
			}
		}
		this.$store.raffle.pickWinner(data.sessionId!, data);
	}

	public closePoll():void {
		this.$confirm(this.$t("suggestion.state_close_confirm_title"), this.$t("suggestion.state_close_confirm_desc"))
		.then(async ()=> {
			await super.close();
			this.$store.chatSuggestion.setChatSuggestion(null);
		}).catch(()=>{});
	}

	public openUserCard(user:TwitchatDataTypes.TwitchatUser):void {
		this.$store.users.openUserCard(user);
	}

	public deleteEntery(entry:TwitchatDataTypes.ChatSuggestionDataChoice):void {
		this.poll.choices = this.poll.choices.filter(v=> v.id != entry.id);
	}

	private renderFrame():void {
		if(this.disposed) return;
		requestAnimationFrame(()=>this.renderFrame());
		const elapsed = Date.now() - this.poll.startTime;
		const duration = this.poll.duration * 1000 * 60;
		this.progressPercent = elapsed/duration;
	}

}
export default toNative(ChatSuggestionState);
</script>

<style scoped lang="less">
.chatsuggstate{

	.actions {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: .5em;
		flex-shrink: 0;
	}

	.itemList {
		color: var(--color-text);
		overflow-y: auto;
		overflow-x: hidden;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: center;
		gap: .5em;
		min-width: 300px;
		max-width: 600px;
		
		.card-item {
			.title {
				text-decoration: none;
			}

			.deleteBt, .star {
				height: 1em;
				align-self: center;
				transition: transform .1s;
				.icon {
					height: 100%;
					color: var(--color-text);
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