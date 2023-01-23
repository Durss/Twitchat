<template>
	<div class="chatmessageclippending" @click.capture.ctrl.stop="copyJSON()"
	@click="$emit('onRead', messageData, $event)">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		
		<img :src="$image('icons/clip.svg')" alt="notice" class="icon">
		
		<div class="loading" v-if="loading && !error">
			<div class="message">{{ $t("global.moderation_action.clip_creating") }}</div>
			<img class="loader" src="@/assets/loader/loader_white.svg">
		</div>

		<div v-else-if="!error">
			<div class="message">{{ $t("global.moderation_action.clip_created") }}</div>
			<div class="ctas">
				<Button @click="highlight()" :title="$t('chat.hover_actions.highlight')" :icon="$image('icons/highlight.svg')" />
				<Button type="link" :href="messageData.clipUrl" target="_blank" :title="$t('global.moderation_action.clip_created_publishBt')" :icon="$image('icons/edit.svg')" />
			</div>
		</div>

		<div v-if="error" class="error">{{ $t("error.clip_creation") }}</div>

	</div>
</template>

<script lang="ts">
import TwitchatEvent from '@/events/TwitchatEvent';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import type { JsonObject } from 'type-fest';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';

@Options({
	props:{
		messageData:Object,
	},
	components:{
		Button,
	},
	emits:["onRead"]
})
export default class ChatMessageClipPending extends Vue {
	
	public messageData!:TwitchatDataTypes.MessageClipCreate;
	
	public error:boolean =  false;
	public loading:boolean =  true;
	
	public interval:number = -1;

	public get time():string {
		const d = new Date(this.messageData.date);
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes());
	}

	public mounted():void {
		this.$store("accessibility").setAriaPolite(this.$t("global.moderation_action.clip_creating", {LINK:""}));
		
		/*
		//No idea why, but the watcher does not work :(
		watch(()=>this.messageData.loading, ()=> {
			console.log("CHANGE 1");
			this.loading = false;
			this.$store("accessibility").setAriaPolite(this.$t("global.moderation_action.clip_created", {LINK:""}));
		});
		//*/

		//This is a stupid solution to the fact the watch doesn't seem to work
		//and I have no idea why :/
		this.interval = setInterval(async ()=> {
			this.loading = this.messageData.loading;
			this.error = this.messageData.error

			if(!this.loading) {
				clearInterval(this.interval);
				if(this.error) {

					this.$store("accessibility").setAriaPolite(this.$t("error.clip_creation"));
				}else{
					this.$store("accessibility").setAriaPolite(this.$t("global.moderation_action.clip_created", {LINK:""}));
				}
			}
		}, 1000);

	}

	public beforeUnmount(): void {
		clearInterval(this.interval);
	}

	public highlight(): void {
		const data:TwitchatDataTypes.ChatHighlightInfo = {
			clip:this.messageData.clipData,
			params:this.$store("chat").chatHighlightOverlayParams,
		}
		PublicAPI.instance.broadcast(TwitchatEvent.SHOW_CLIP, (data as unknown) as JsonObject);
		this.$store("chat").isChatMessageHighlighted = true;
	}

	public copyJSON():void {
		Utils.copyToClipboard(JSON.stringify(this.messageData));
		console.log(this.messageData);
		gsap.fromTo(this.$el, {scale:1.2}, {duration:.5, scale:1, ease:"back.out(1.7)"});
	}
	
}
</script>

<style scoped lang="less">
.chatmessageclippending{
	.chatMessageHighlight();

	.ctas {
		margin-top: .25em;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 1em;
	}

	.loading {
		display: flex;
		flex-direction: row;
		gap: .5em;
		align-items: center;
		font-style: italic;
		img {
			height: 1em;
		}
	}

	.error {
		font-style: italic;
		color:@mainColor_warn;
	}
}
</style>