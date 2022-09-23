<template>

	<Button :icon="$image('icons/poll.svg')"
		bounce
		@click="$emit('setCurrentNotification', 'poll')"
		v-if="$store('poll').data?.id" />

	<Button :icon="$image('icons/prediction.svg')"
		bounce
		@click="$emit('setCurrentNotification', 'prediction')"
		v-if="$store('prediction').data?.id" />

	<Button :icon="$image('icons/magnet.svg')"
		bounce
		v-if="$store('users').trackedUsers.length > 0"
		data-tooltip="View tracked users"
		@click="$emit('setCurrentNotification', 'trackedUsers')" />

	<Button :icon="$image('icons/ticket.svg')"
		bounce
		v-if="$store('raffle').data"
		data-tooltip="Raffle"
		@click="$emit('setCurrentNotification', 'raffle')" />

	<Button :icon="$image('icons/bingo.svg')"
		bounce
		v-if="$store('bingo').data"
		data-tooltip="Bingo"
		@click="$emit('setCurrentNotification', 'bingo')" />

	<Button :icon="$image('icons/whispers.svg')"
		bounce
		v-if="whispersAvailable"
		data-tooltip="Whispers"
		@click="$emit('setCurrentNotification', 'whispers')" />
		
	<Button :icon="$image('icons/debug.svg')"
		bounce
		@click="$emit('update:showDevMenu',true);"
		v-if="$store('main').devmode" />
</template>

<script lang="ts">
import type { IRCEventDataList } from '@/utils/IRCEventDataTypes';
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
		const whispers:{[key:string]:IRCEventDataList.Whisper[]} = this.$store("chat").whispers;
		for (const key in this.$store("chat").whispers) {
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