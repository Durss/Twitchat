<template>
	<div :class="classes" @click.capture.ctrl.stop="copyJSON()"
	@mouseover="$emit('onOverMessage', messageData, $event)"
	@click="$emit('onRead', messageData, $event)"
	>
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		
		<img v-if="messageData.restricted" src="@/assets/icons/lock_fit.svg" alt="notice" class="icon">
		<img v-else src="@/assets/icons/shield.svg" alt="notice" class="icon">
		
		<i18n-t scope="global" v-if="messageData.restricted"
		keypath="global.moderation_action.user_restricted" tag="p">
			<template #USER>
				<a @click="openUserCard(messageData.user)">{{ messageData.user.displayName }}</a>
			</template>
			<template #MODERATOR>
				<a @click="openUserCard(messageData.moderator)">{{ messageData.moderator.displayName }}</a>
			</template>
		</i18n-t>
		
		<i18n-t scope="global" v-else-if="messageData.monitored"
		keypath="global.moderation_action.user_monitored" tag="p">
			<template #USER>
				<a @click="openUserCard(messageData.user)">{{ messageData.user.displayName }}</a>
			</template>
			<template #MODERATOR>
				<a @click="openUserCard(messageData.moderator)">{{ messageData.moderator.displayName }}</a>
			</template>
		</i18n-t>
		
		<i18n-t scope="global" v-else
		keypath="global.moderation_action.user_unflagged" tag="p">
			<template #USER>
				<a @click="openUserCard(messageData.user)">{{ messageData.user.displayName }}</a>
			</template>
			<template #MODERATOR>
				<a @click="openUserCard(messageData.moderator)">{{ messageData.moderator.displayName }}</a>
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
	emits:['onOverMessage', 'onRead'],
})
export default class ChatLowTrustTreatment extends Vue {
 
	public messageData!:TwitchatDataTypes.MessageLowtrustTreatmentData;

	public get time():string {
		const d = new Date(this.messageData.date);
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes());
	}

	public get classes():string[] {
		const res:string[] = ["chatlowtrusttreatment"];
		if(this.messageData.restricted
		|| this.messageData.monitored) res.push("alert");
		return res;
	}

	public openUserCard(user:TwitchatDataTypes.TwitchatUser):void {
		this.$store("users").openUserCard(user);
	}

	/**
	 * Copy JSON data of the message
	 */
	 public copyJSON():void {
		Utils.copyToClipboard(JSON.stringify(this.messageData));
		console.log(this.messageData);
		gsap.fromTo(this.$el, {scale:1.2}, {duration:.5, scale:1, ease:"back.out(1.7)"});
	}
}
</script>

<style scoped lang="less">
.chatlowtrusttreatment{
	.chatMessageHighlight();
	background-color: fade(@mainColor_normal, 10%);

	a {
		color: @mainColor_normal_light;
		font-weight: bold;
	}
	
	&.alert {
		background-color: @mainColor_alert;
		&:hover {
			background-color: @mainColor_alert_light;
		}
		a {
			color:@mainColor_light;
		}
	}
}
</style>