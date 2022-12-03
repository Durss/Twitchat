<template>
	<div class="chatpollresult" @click.capture.ctrl.stop="copyJSON()"
	@click="$emit('onRead', messageData, $event)">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		<img src="@/assets/icons/poll.svg" alt="icon" class="icon">
		<div class="content">
			<div class="title">{{messageData.title}}</div>
			<div class="choices">
				<div v-for="o in messageData.choices" :key="o.id" class="choice">
					<div class="choiceTitle">{{o.label}}</div>
					<div class="barCell">
						<div class="bar" :style="getChoiceStyles(o)">
							<div class="users">
								<img src="@/assets/icons/user.svg" alt="user" class="icon">
								{{o.votes}}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{
		messageData:Object
	},
	components:{},
	emits:["onRead"]
})
export default class ChatPollResult extends Vue {

	public messageData!:TwitchatDataTypes.MessagePollData;

	public get time():string {
		const d = new Date(this.messageData.date);
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes());
	}

	public getChoiceStyles(o:TwitchatDataTypes.MessagePollDataChoice):{[key:string]:string} {
		let totalVotes = 0;
		if(this.messageData.choices) {
			for (let i = 0; i < this.messageData.choices.length; i++) {
				totalVotes += this.messageData.choices[i].votes;
			}
		}
		const percent = o.votes/Math.max(1,totalVotes);
		return {
			backgroundSize: `${percent * 100}% 100%`,
		};
	}

	public copyJSON():void {
		Utils.copyToClipboard(JSON.stringify(this.messageData));
		console.log(this.messageData);
		gsap.fromTo(this.$el, {scale:1.2}, {duration:.5, scale:1, ease:"back.out(1.7)"});
	}

}
</script>

<style scoped lang="less">
.chatpollresult{
	.chatMessageHighlight();
	text-align: center;

	.content {
		flex-grow: 1;
		.title {
			font-weight: bold;
			font-size: 1.2em;
			margin-bottom: 5px;
		}
		.choices {
			// If anyone figures out how to make that darn table autosize on labels
			// (with a 50% max width) and fill up the remaining space with the bars,
			// well, congrats and thank you <3
			display: table;
			table-layout: auto;
			border-spacing: 1px;
			width: 100%;
			.choice {
				display: table-row;
				margin-bottom: 1px;

				.choiceTitle {
					display: table-cell;
					padding-right: 10px;
					text-align: right;
					word-wrap: break-word;
					word-break: break-word;
					width: 10em;
				}

				.barCell {
					display: table-cell;
				}
				.bar {
					width: 100%;
					display: flex;
					flex-direction: row;
					padding: 3px;
					border-radius: 5px;
					@c: fade(@mainColor_light, 25%);
					background: linear-gradient(to right, @c 100%, @c 100%);
					background-color: fade(@c, 20%);
					background-repeat: no-repeat;
					justify-content: space-evenly;

					.users {
						display: flex;
						flex-direction: row;
						align-items: center;
						padding: 5px;
						border-radius: 5px;
						background-color: rgba(0, 0, 0, .25);
						font-size: .8em;

						.icon {
							height: 1em;
							margin-right: 5px;
						}
					}
				}
			}
		}
	}
}
</style>