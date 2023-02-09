<template>
	<div class="chatban" @click.capture.ctrl.stop="copyJSON()"
	@click="$emit('onRead', messageData, $event)">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		
		<img :src="$image('icons/timeout.svg')" alt="notice" class="icon" v-if="messageData.duration_s">
		<img :src="$image('icons/ban.svg')" alt="notice" class="icon" v-else>
		
		<i18n-t scope="global" v-if="messageData.duration_s" tag="span" keypath="global.moderation_action.timeout_by">
			<template #USER>
				<a class="userlink" @click.stop="openUserCard(messageData.user)">{{messageData.user.displayName}}</a>
			</template>
			<template #MODERATOR>
				<a class="userlink" @click.stop="openUserCard(messageData.moderator)">{{messageData.moderator.displayName}}</a>
			</template>
			<template #DURATION>
				<strong>{{ formatedBanDuration }}</strong>
			</template>
		</i18n-t>
		<i18n-t scope="global" v-else tag="span" keypath="global.moderation_action.banned_by">
			<template #USER>
				<a class="userlink" @click.stop="openUserCard(messageData.user)">{{messageData.user.displayName}}</a>
			</template>
			<template #MODERATOR>
				<a class="userlink" @click.stop="openUserCard(messageData.moderator)">{{messageData.moderator.displayName}}</a>
			</template>
		</i18n-t>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{
		messageData:Object,
	},
	components:{},
	emits:["onRead"]
})
export default class ChatBan extends Vue {
	
	public messageData!:TwitchatDataTypes.MessageBanData;

	public get time():string {
		const d = new Date(this.messageData.date);
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes());
	}

	public get formatedBanDuration():string{
		return Utils.formatDuration(this.messageData.duration_s!*1000);
	}

	public mounted():void {
		let aria = "";
		if(this.messageData.duration_s) {
			aria = this.$t("global.moderation_action.timeout_by", {MODERATOR:this.messageData.moderator.displayName, USER:this.messageData.user.displayName, DURATION:this.messageData.duration_s});
		}else{
			aria = this.$t("global.moderation_action.banned_by", {MODERATOR:this.messageData.moderator.displayName, USER:this.messageData.user.displayName});
		}
		this.$store("accessibility").setAriaPolite(aria);
	}

	public openUserCard(user:TwitchatDataTypes.TwitchatUser):void {
		this.$store("users").openUserCard(user, this.messageData.channel_id);
	}

	public copyJSON():void {
		Utils.copyToClipboard(JSON.stringify(this.messageData));
		console.log(this.messageData);
		gsap.fromTo(this.$el, {scale:1.2}, {duration:.5, scale:1, ease:"back.out(1.7)"});
	}
}
</script>

<style scoped lang="less">
.chatban{
	.chatMessageHighlight();
	background-color: fade(@mainColor_warn, 15%);
}
</style>