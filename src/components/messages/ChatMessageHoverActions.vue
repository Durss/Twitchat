<template>
	<div class="ChatMessageHoverActions">
		<Button :icon="require('@/assets/icons/magnet.svg')"
			data-tooltip="Track user"
			@click="trackUser()"
			v-if="!isSelf"
			/>
		
		<Button :icon="require('@/assets/icons/markRead.svg')"
			data-tooltip="Flag as read"
			@click="$emit('toggleMarkRead')" />
	</div>
</template>

<script lang="ts">
import store from '@/store';
import { IRCEventDataList } from '@/utils/IRCEvent';
import { TwitchTypes } from '@/utils/TwitchUtils';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';

@Options({
	props:{
		messageData:Object
	},
	components:{
		Button,
	},
	emits: ["toggleMarkRead", "trackUser"]
})
export default class ChatMessageHoverActions extends Vue {

	public messageData!:IRCEventDataList.Message;

	public get isSelf():boolean {
		return this.messageData.tags.username?.toLowerCase() == store.state.user.login.toLowerCase();
	}

	public trackUser():void {
		const user = this.messageData.tags;
		store.dispatch("trackUser", user);
	}
}
</script>

<style scoped lang="less">
.ChatMessageHoverActions{
	background-color: @mainColor_light;
	padding: 2px;
	border-top-left-radius: 5px;
	border-bottom-left-radius: 5px;
	box-shadow: 0px 0px 20px 0px rgba(0,0,0,1);

	.button {
		width: 25px;
		height: 25px;
		border-radius: 5px;
		padding: 2px;
		:deep(.icon) {
			min-width: 100%;
		}
		&:not(:last-child) {
			margin-right: 2px;
		}
	}
}
</style>