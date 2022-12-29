<template>
	<div class="chatshoutout" @click.capture.ctrl.stop="copyJSON()"
	@click="$emit('onRead', messageData, $event)">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>

		<img src="@/assets/icons/shoutout.svg" alt="shoutout" class="icon">

		<div class="info">
			<i18n-t scope="global" tag="span"
			v-if="messageData.received" keypath="chat.shoutout.given">
				<template #USER>
					<a class="userlink" @click.stop="openUserCard">{{messageData.user.displayName}}</a>
				</template>
				<template #VIEWERS>
					<strong>{{messageData.viewerCount}}</strong>
				</template>
			</i18n-t>
			
			<i18n-t scope="global" tag="span" v-else
			keypath="chat.shoutout.received">
				<template #USER>
					<a class="userlink" @click.stop="openUserCard">{{messageData.user.displayName}}</a>
				</template>
				<template #VIEWERS>
					<strong>{{messageData.viewerCount}}</strong>
				</template>
			</i18n-t>

			<div v-if="messageData.received" class="streamInfo">
				<p>Streaming <strong>{{messageData.stream.category}}</strong>:</p>
				<p class="title">{{messageData.stream.title}}</p>
			</div>
		</div>
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
export default class ChatShoutout extends Vue {
	
	public messageData!:TwitchatDataTypes.MessageShoutoutData;

	public get time():string {
		const d = new Date(this.messageData.date);
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes());
	}

	public mounted():void {
		
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
.chatshoutout{
	.chatMessageHighlight();
	
	align-items: flex-start;
	
	.info {
		.streamInfo {
			width: 100%;
			.title {
				font-style: italic;
			}
		}
	}
}
</style>