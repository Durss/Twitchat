<template>
	<div class="chatcustomtrainsummary chatMessage highlight"
	@contextmenu="onContextMenu($event, messageData, $el)">

		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>

		<Icon name="train" alt="train" class="icon"/>

		<div class="messageHolder">
			<mark class="record" v-if="messageData.isRecord"><Icon name="leaderboard" />{{ $t("chat.custom_train_summary.record") }}</mark>
			<i18n-t scope="global" keypath="chat.custom_train_summary.title" tag="span">
				<template #NAME><strong>{{ train?.title || messageData.trainName }}</strong></template>
				<template #LEVEL><strong>{{ messageData.level }}</strong></template>
				<template #PERCENT><strong>{{ messageData.percent }}%</strong></template>
				<template #AMOUNT><strong>{{ amount }}</strong></template>
			</i18n-t>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage';
import Utils from '@/utils/Utils';
import Icon from '../Icon.vue';

@Component({
	components:{
		Icon,
	},
	emits:[],
})
class ChatCustomTrainSummary extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageCustomTrainSummaryData;

	public get train():TwitchatDataTypes.CustomTrainData | null {
		return this.$store.customTrain.customTrainList.find(train=>train.id == this.messageData.trainId) || null;
	}

	public get amount():string {
		return Utils.formatCurrency(Math.round(this.messageData.amount), this.train?.currency || "$"+Utils.CURRENCY_AMOUNT_TOKEN);
	}

}
export default toNative(ChatCustomTrainSummary);
</script>

<style scoped lang="less">
.chatcustomtrainsummary{
	.record {
		// display: inline-flex;
		// flex-direction: row;
		// align-items: center;
		background-color: #e6b400;
		color: #000000;
		margin-right: .5em;
		padding-left: .5em;
		padding-right: .5em;
		.icon {
			height: 1em;
			margin-bottom: -.1em;
			margin-right: .25em;
		}
	}
}
</style>
