<template>
	<div class="chatjoinleave">
		<span v-if="userList.length > 0" v-for="u, index in userList" :key="u.id">
			<a @click.prevent="openUserCard(u)">{{u.displayName}}</a>
			<span v-if="index < userList.length - 2 + remainingOffset">, </span>
			<span v-else-if="index < userList.length - 1 + remainingOffset"> and </span>
		</span>

		<span v-if="remainingCount > 0">{{remainingCount}} more</span>

		<span v-if="messageData.type=='join'"> joined the chat room</span>
		<span v-else> left the chat room</span>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{
		messageData:Object,
	},
	components:{},
	emits:["ariaMessage"]
})
export default class ChatJoinLeave extends Vue {
	
	public messageData!:TwitchatDataTypes.MessageJoinData|TwitchatDataTypes.MessageLeaveData;
	
	public userList:TwitchatDataTypes.TwitchatUser[] = [];
	public remainingOffset:number = 0;
	public remainingCount:number = 0;

	public mounted(): void {
		const usersClone = this.messageData.users.concat();
		const join = usersClone.splice(0, 30);
		this.userList = join;
		this.remainingCount = usersClone.length;
		
		let message = this.messageData.users.length+" users";
		if(this.messageData.type == TwitchatDataTypes.TwitchatMessageType.JOIN) {
			message += " joined the chat room";
		}else{
			message += " left the chat room";
		}

		this.$emit("ariaMessage", message);
	}

	public openUserCard(user:TwitchatDataTypes.TwitchatUser):void {
		this.$store("users").openUserCard(user);
	}

}
</script>

<style scoped lang="less">
.chatjoinleave{
	
}
</style>