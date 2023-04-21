<template>
	<div class="chatmessageclippending">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		
		<img :src="$image('icons/clip.svg')" alt="notice" class="icon">
		
		<div class="loading" v-if="loading && !error">
			<div class="message">{{ $t("global.moderation_action.clip_creating") }}</div>
			<img class="loader" src="@/assets/loader/loader.svg">
		</div>

		<div v-else-if="!error">
			<div class="message">{{ $t("global.moderation_action.clip_created") }}</div>
			<div class="ctas">
				<Button @click="highlight()" icon="highlight">{{ $t('chat.context_menu.highlight') }}</Button>
				<Button type="link" :href="messageData.clipUrl" target="_blank" icon="edit">{{ $t('global.moderation_action.clip_created_publishBt') }}</Button>
			</div>
		</div>

		<div v-if="error" class="error">{{ $t("error.clip_creation") }}</div>

	</div>
</template>

<script lang="ts">
import TwitchatEvent from '@/events/TwitchatEvent';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import type { JsonObject } from 'type-fest';
import { Component, Prop } from 'vue-facing-decorator';
import Button from '../Button.vue';
import AbstractChatMessage from './AbstractChatMessage.vue';

@Component({
	components:{
		Button,
	},
	emits:["onRead"]
})
export default class ChatMessageClipPending extends AbstractChatMessage {
	
	@Prop
	declare messageData:TwitchatDataTypes.MessageClipCreate;
	
	public error:boolean =  false;
	public loading:boolean =  true;
	
	public interval:number = -1;

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

		//This is a stupid solution to the fact the watcher doesn't seem to work
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
		color:var(--mainColor_warn);
	}
}
</style>