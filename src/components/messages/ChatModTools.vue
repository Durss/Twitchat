<template>
	<div class="chatmodtools">
		<img src="@/assets/icons/ban.svg" alt="ban" data-tooltip="Ban" @click="ban()">
		<img src="@/assets/icons/timeout.svg" alt="timeout" data-tooltip="Timeout<br/>(10min)" @click="timeout()">
		<img src="@/assets/icons/trash.svg" alt="trash" data-tooltip="Delete" @click="deleteMessage()">
	</div>
</template>

<script lang="ts">
import IRCClient from '@/utils/IRCClient';
import { IRCEventDataList } from '@/utils/IRCEvent';
import Utils from '@/utils/Utils';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{
		messageData:Object
	},
	components:{},
	emits:["deleteMessage", "deleteUser"]
})
export default class ChatModTools extends Vue {
	
	public messageData!:IRCEventDataList.Message;

	public ban():void {
		Utils.confirm("Ban "+this.messageData.tags['display-name'], "Are you sure you want to ban this user ?")
		.then(() => {
		this.$emit('deleteUser', this.messageData);
			IRCClient.instance.sendMessage(`/ban ${this.messageData.tags['display-name']}`);
		})
	}

	public timeout():void {
		this.$emit('deleteUser', this.messageData);
		IRCClient.instance.sendMessage(`/timeout ${this.messageData.tags['display-name']} 600`);
	}

	public deleteMessage():void {
		this.$emit('deleteMessage', this.messageData);
		IRCClient.instance.deleteMessage(this.messageData.tags.id as string);
	}
}
</script>

<style scoped lang="less">
.chatmodtools{
	img {
		opacity: 0.75;
		height: 1em;
		vertical-align: middle;
		cursor: pointer;
		&:hover {
			opacity: .75;;
		}
		&:not(:last-child) {
			margin-right: 5px;
		}
	}
}
</style>