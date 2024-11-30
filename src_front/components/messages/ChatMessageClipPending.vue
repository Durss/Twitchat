<template>
	<div class="chatmessageclippending chatMessage highlight">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>
		
		<Icon name="clip" alt="notice" class="icon"/>
		
		<div class="loading" v-if="loading && !error">
			<div class="message">{{ $t("global.moderation_action.clip_creating") }}</div>
			<Icon name="loader" alt="loading" class="loader"/>
		</div>

		<div v-else-if="!error">
			<div class="message">{{ $t("global.moderation_action.clip_created") }}</div>
			<div class="ctas">
				<Button small @click.stop="highlight()" icon="highlight">{{ $t('chat.context_menu.highlight') }}</Button>
				<Button small type="link" :href="messageData.clipUrl" target="_blank" icon="edit">{{ $t('global.moderation_action.clip_created_publishBt') }}</Button>
			</div>
		</div>

		<div v-if="error" class="card-item alert">{{ $t("error.clip_creation") }}</div>

	</div>
</template>

<script lang="ts">
import TwitchatEvent from '@/events/TwitchatEvent';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import type { JsonObject } from 'type-fest';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import TTButton from '../TTButton.vue';
import AbstractChatMessage from './AbstractChatMessage';
import TwitchUtils from '@/utils/twitch/TwitchUtils';

@Component({
	components:{
		Button: TTButton,
	},
	emits:["onRead"]
})
class ChatMessageClipPending extends AbstractChatMessage {
	
	@Prop
	declare messageData:TwitchatDataTypes.MessageClipCreate;
	
	public error:boolean =  false;
	public loading:boolean =  true;
	
	public interval:number = -1;

	public mounted():void {
		this.$store.accessibility.setAriaPolite(this.$t("global.moderation_action.clip_creating", {LINK:""}));
		
		/*
		//No idea why, but the watcher does not work :(
		watch(()=>this.messageData.loading, ()=> {
			console.log("CHANGE 1");
			this.loading = false;
			this.$store.accessibility.setAriaPolite(this.$t("global.moderation_action.clip_created", {LINK:""}));
		});
		//*/

		//This is a stupid solution to the fact the watcher doesn't seem to work
		//and I have no idea why :/
		this.interval = window.setInterval(async ()=> {
			this.loading = this.messageData.loading;
			this.error = this.messageData.error

			if(!this.loading) {
				clearInterval(this.interval);
				if(this.error) {
					this.$store.accessibility.setAriaPolite(this.$t("error.clip_creation"));
				}else{
					this.$store.accessibility.setAriaPolite(this.$t("global.moderation_action.clip_created", {LINK:""}));
				}
			}
		}, 1000);

	}

	public beforeUnmount(): void {
		clearInterval(this.interval);
	}

	public async highlight():Promise<void> {
		let clip:TwitchatDataTypes.ClipInfo|undefined = undefined;
		let infos = await TwitchUtils.getClipById(this.messageData.clipID);
		if(infos) {
			clip = {
				duration:infos.duration,
				url:infos.embed_url,
				// mp4:infos.thumbnail_url.replace(/-preview.*\.jpg/gi, ".mp4"),
			}
		}
		const data:TwitchatDataTypes.ChatHighlightInfo = {
			clip,
			date:this.messageData.date,
			message_id:this.messageData.id,
			params:this.$store.chat.chatHighlightOverlayParams,
			dateLabel:this.$store.i18n.tm("global.date_ago"),
		}
		PublicAPI.instance.broadcast(TwitchatEvent.SHOW_CLIP, (data as unknown) as JsonObject);
		this.$store.chat.highlightedMessageId = this.messageData.id;
	}

}
export default toNative(ChatMessageClipPending);
</script>

<style scoped lang="less">
.chatmessageclippending{
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
		.icon {
			height: 1em;
		}
	}
}
</style>