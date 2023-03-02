<template>
	<div class="chatclear" @click.capture.ctrl.stop="copyJSON()"
	@click="$emit('onRead', messageData, $event)">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		
		<i18n-t scope="global" tag="span" keypath="chat.clear.title">
			<template #ROOM><strong>#{{room}}</strong></template>
			<template #USER>
				<i18n-t scope="global" tag="span" v-if="messageData.user" keypath="chat.clear.title_by">
					<template #USER>
						<a class="userlink" @click.stop="openUserCard()">{{messageData.user.displayName}}</a>
					</template>
				</i18n-t>
				<i18n-t scope="global" tag="span" v-else-if="messageData.fromAutomod" keypath="chat.clear.title_by">
					<template #USER><strong>automod</strong></template>
				</i18n-t>
			</template>
		</i18n-t>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{},
	emits:["onRead"]
})
export default class ChatClear extends Vue {

	@Prop
	public messageData!:TwitchatDataTypes.MessageClearChatData;
	
	public room:string = "";

	public get time():string {
		const d = new Date(this.messageData.date);
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes());
	}

	public mounted():void {
		this.room = this.$store("users").getUserFrom(this.messageData.platform, this.messageData.channel_id, this.messageData.channel_id).login;
	}

	public openUserCard():void {
		this.$store("users").openUserCard(this.messageData.user!);
	}

	public copyJSON():void {
		Utils.copyToClipboard(JSON.stringify(this.messageData));
		console.log(this.messageData);
		gsap.fromTo(this.$el, {scale:1.2}, {duration:.5, scale:1, ease:"back.out(1.7)"});
	}

}
</script>

<style scoped lang="less">
.chatclear{
	.chatMessageHighlight();
}
</style>