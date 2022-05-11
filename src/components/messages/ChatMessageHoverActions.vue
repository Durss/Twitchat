<template>
	<div class="ChatMessageHoverActions">
		<Button :aria-label="'Track '+messageData.tags.username+' messages'"
			:icon="require('@/assets/icons/magnet.svg')"
			data-tooltip="Track user"
			@click="trackUser()"
			v-if="!isSelf"
			/>
		<Button :aria-label="'Shoutout '+messageData.tags.username"
			:icon="require('@/assets/icons/shoutout.svg')"
			data-tooltip="Shoutout"
			@click="shoutout()"
			v-if="!isSelf"
			:loading="shoutoutLoading"
			/>
	</div>
</template>

<script lang="ts">
import store from '@/store';
import { IRCEventDataList } from '@/utils/IRCEvent';
import TwitchUtils from '@/utils/TwitchUtils';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';

@Options({
	props:{
		messageData:Object
	},
	components:{
		Button,
	},
	emits: ["trackUser"]
})
export default class ChatMessageHoverActions extends Vue {

	public messageData!:IRCEventDataList.Message;
	public shoutoutLoading:boolean = false;

	public get isSelf():boolean {
		return this.messageData.tags.username?.toLowerCase() == store.state.user.login.toLowerCase();
	}

	public trackUser():void {
		store.dispatch("trackUser", this.messageData);
	}

	public async shoutout():Promise<void> {
		this.shoutoutLoading = true;
		try {
			await TwitchUtils.shoutout(this.messageData.tags['display-name'] as string);
		}catch(error) {
			store.state.alert = "Shoutout failed :(";
			console.log(error);
		}
		this.shoutoutLoading = false;
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
		width: 1.5em;
		height: 1.5em;
		min-width: 20px;
		min-height: 20px;
		border-radius: .5em;
		padding: 0;
		// font-size: 20px;
		:deep(.icon) {
			min-width: 100%;
		}
		&:not(:last-child) {
			margin-right: 2px;
		}
	}
}
</style>