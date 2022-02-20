<template>

	<Button :icon="require('@/assets/icons/poll.svg')"
		bounce
		@click="$emit('setCurrentNotification', 'poll')"
		v-if="$store.state.currentPoll?.id" />

	<Button :icon="require('@/assets/icons/prediction.svg')"
		bounce
		@click="$emit('setCurrentNotification', 'prediction')"
		v-if="$store.state.currentPrediction?.id" />

	<Button :icon="require('@/assets/icons/magnet.svg')"
		bounce
		v-if="$store.state.trackedUsers.length > 0"
		data-tooltip="View tracked users"
		@click="$emit('setCurrentNotification', 'trackedUsers')" />

	<Button :icon="require('@/assets/icons/ticket.svg')"
		bounce
		v-if="$store.state.raffle.command"
		data-tooltip="Raffle"
		@click="$emit('setCurrentNotification', 'raffle')" />

	<Button :icon="require('@/assets/icons/whispers.svg')"
		bounce
		v-if="whispersAvailable"
		data-tooltip="Whispers"
		@click="$emit('setCurrentNotification', 'whispers')" />
		
	<Button :icon="require('@/assets/icons/debug.svg')"
		bounce
		@click="$emit('update:showDevMenu',true);"
		v-if="$store.state.devmode" />
</template>

<script lang="ts">
import store from '@/store';
import { IRCEventDataList } from '@/utils/IRCEvent';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';

@Options({
	props:{
		showFeed:Boolean,
		showEmotes:Boolean,
		showRewards:Boolean,
		showDevMenu:Boolean,
		showCommands:Boolean,
	},
	components:{
		Button,
	},
	emits:["update:showEmotes", "update:showDevMenu", "setCurrentNotification"]
})
export default class ChatNotificationButtons extends Vue {
	
	public showFeed!:boolean;
	public showEmotes!:boolean;
	public showRewards!:boolean;
	public showDevMenu!:boolean;
	public showCommands!:boolean;

	public get whispersAvailable():boolean {
		const whispers:{[key:string]:IRCEventDataList.Whisper[]} = store.state.whispers;
		for (const key in store.state.whispers) {
			if (whispers[key].length > 0) return true;
		}
		return false;
	}
	
}
</script>

<style scoped lang="less">
.button {
	.clearButton() !important;
}
</style>