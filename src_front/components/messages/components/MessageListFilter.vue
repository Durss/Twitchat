<template>
	<div :class="classes" @wheel.stop>
		<div class="head" @click="expand = !expand">
			<img src="@/assets/icons/filters.svg" alt="filters" class="icon">
			<span class="label">Filters</span>
		</div>
		<div class="content" v-if="expand">
			<div class="info">Choose which message type to display on this column</div>
			<ParamItem class="item" v-for="f in filters" :key="f.storage" :paramData="f" clearToggle />
			<!-- <ParamItem class="item" v-for="f in filters" :key="f.storage+'1'" :paramData="f" clearToggle />
			<ParamItem class="item" v-for="f in filters" :key="f.storage+'2'" :paramData="f" clearToggle />
			<ParamItem class="item" v-for="f in filters" :key="f.storage+'3'" :paramData="f" clearToggle />
			<ParamItem class="item" v-for="f in filters" :key="f.storage+'4'" :paramData="f" clearToggle /> -->
		</div>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import ParamItem from '@/components/params/ParamItem.vue';
import ToggleButton from '@/components/ToggleButton.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{
		modelValue:{type:Object, default: {}},
	},
	components:{
		Button,
		ParamItem,
		ToggleButton,
	},
	emits: ['update:modelValue'],
})
export default class MessageListFilter extends Vue {
	
	public modelValue!:Partial<{[key in TwitchatDataTypes.TwitchatMessageStringType]:string}>;

	public expand:boolean = false;
	public typeToLabel:Partial<{[key in TwitchatDataTypes.TwitchatMessageStringType]:string}> = {};
	public typeToIcon:Partial<{[key in TwitchatDataTypes.TwitchatMessageStringType]:string}> = {};
	public filters:TwitchatDataTypes.ParameterData[] = [];
	private clickHandler!:(e:MouseEvent) => void;

	public get classes():string[] {
		const res = ["messagelistfilter"];
		if(this.expand) res.push("expand");
		return res;
	}

	public beforeMount(): void {
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.RAID] = "Raids";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.POLL] = "Polls";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.JOIN] = "Users join";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.LEAVE] = "Users leave";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.CHEER] = "Bits";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.BINGO] = "Bingos";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.RAFFLE] = "Raffles";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.REWARD] = "Rewards";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.NOTICE] = "TODO";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.MESSAGE] = "Users messages";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.WHISPER] = "Whispers";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.FOLLOWING] = "Follows";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.COUNTDOWN] = "Countdown";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.PREDICTION] = "Predictions";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION] = "Subs";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_SUMMARY] = "Hype train summaries";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN] = "Hype train cooldown";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.COMMUNITY_BOOST_COMPLETE] = "Community boosts";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION] = "Community challenge<br>contributions";
		
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.RAID] = "raid.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.POLL] = "poll.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.JOIN] = "enter_white.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.LEAVE] = "leave_white.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.CHEER] = "bits.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.BINGO] = "bingo.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.RAFFLE] = "ticket.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.REWARD] = "channelPoints.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.NOTICE] = "info.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.MESSAGE] = "user.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.WHISPER] = "whispers.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.FOLLOWING] = "follow.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.COUNTDOWN] = "countdown.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.PREDICTION] = "prediction.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION] = "sub.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_SUMMARY] = "train.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN] = "train.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.COMMUNITY_BOOST_COMPLETE] = "boost.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION] = "channelpoints.svg";

		const sortedFilters = [
			TwitchatDataTypes.TwitchatMessageType.MESSAGE,
			TwitchatDataTypes.TwitchatMessageType.WHISPER,
			TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION,
			TwitchatDataTypes.TwitchatMessageType.FOLLOWING,
			TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_SUMMARY,
			TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN,
			TwitchatDataTypes.TwitchatMessageType.CHEER,
			TwitchatDataTypes.TwitchatMessageType.RAID,
			TwitchatDataTypes.TwitchatMessageType.REWARD,
			TwitchatDataTypes.TwitchatMessageType.POLL,
			TwitchatDataTypes.TwitchatMessageType.PREDICTION,
			TwitchatDataTypes.TwitchatMessageType.BINGO,
			TwitchatDataTypes.TwitchatMessageType.RAFFLE,
			TwitchatDataTypes.TwitchatMessageType.COMMUNITY_BOOST_COMPLETE,
			TwitchatDataTypes.TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION,
			TwitchatDataTypes.TwitchatMessageType.JOIN,
			TwitchatDataTypes.TwitchatMessageType.LEAVE,
			TwitchatDataTypes.TwitchatMessageType.NOTICE,
			TwitchatDataTypes.TwitchatMessageType.COUNTDOWN,
		];

		this.filters = [];
		for (let i = 0; i < sortedFilters.length; i++) {
			const f = sortedFilters[i];
			this.filters.push({type:"toggle", value:false, label:this.typeToLabel[f] ?? f, storage:f, icon:this.typeToIcon[f]});
		}
		
		this.clickHandler = (e:MouseEvent) => this.onClick(e);
		document.addEventListener("mousedown", this.clickHandler);
	}

	public beforeUnmount():void {
		document.removeEventListener("mousedown", this.clickHandler);
	}

	private onClick(e:MouseEvent):void {
		let target = e.target as HTMLDivElement;
		const ref = this.$el as HTMLDivElement;
		while(target != document.body && target != ref && target) {
			target = target.parentElement as HTMLDivElement;
		}
		if(target != ref) {
			this.expand = false;
		}
	}

}
</script>

<style scoped lang="less">
.messagelistfilter{
	padding: .5em;
	font-size: .8em;
	color: @mainColor_light;
	background: @mainColor_normal;
	max-height: min(100%, 300px);
	display: flex;
	flex-direction: column;
	border-bottom-left-radius: .5em;

	&.expand {
		border-bottom-right-radius: .5em;
	}

	.head {
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		.icon {
			height: 1em;
			margin-right: .25em;
		}
	}

	.content {
		overflow: auto;
		.info {
			word-wrap: break-word;
		}
		.item{
			&:not(:first-child) {
				margin-top: .25em;
			}
			&:hover {
				background-color: fade(@mainColor_light, 10%);
			}
		}
	}
}
</style>