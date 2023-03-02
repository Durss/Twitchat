<template>
	<div class="chatstreamonoff" @click.capture.ctrl.stop="copyJSON()"
	@click="$emit('onRead', messageData, $event)">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>

		<img :src="$image('icons/online.svg')" alt="online" class="icon" v-if="isOnline">
		<img :src="$image('icons/offline.svg')" alt="offline" class="icon" v-else>

		<i18n-t scope="global" tag="span" :keypath="isOnline? 'chat.stream.online' : 'chat.stream.offline'">
			<template #USER>
				<a class="userlink" @click.stop="openUserCard(messageData.user)">{{messageData.user.displayName}}</a>
			</template>
		</i18n-t>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{},
	emits:["onRead"]
})
export default class ChatStreamOnOff extends Vue {
	
	@Prop
	public messageData!:TwitchatDataTypes.MessageStreamOnlineData | TwitchatDataTypes.MessageStreamOfflineData;

	public get isOnline():boolean {
		return this.messageData.type == TwitchatDataTypes.TwitchatMessageType.STREAM_ONLINE;
	}

	public get time():string {
		const d = new Date(this.messageData.date);
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes());
	}

	public mounted():void {
		let aria = "";
		if(this.isOnline) {
			aria = this.$t("chat.stream.online", {USER:this.messageData.user.displayName});
		}else{
			aria = this.$t("chat.stream.offline", {USER:this.messageData.user.displayName});
		}
		this.$store("accessibility").setAriaPolite(aria);
	}

	public openUserCard(user:TwitchatDataTypes.TwitchatUser):void {
		this.$store("users").openUserCard(user);
	}

	public copyJSON():void {
		Utils.copyToClipboard(JSON.stringify(this.messageData));
		console.log(this.messageData);
		gsap.fromTo(this.$el, {scale:1.2}, {duration:.5, scale:1, ease:"back.out(1.7)"});
	}
}
</script>

<style scoped lang="less">
.chatstreamonoff{
	.chatMessageHighlight();
	
}
</style>