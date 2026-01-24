<template>
	<div class="chatmessageclippending chatMessage highlight">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>
		
		<Icon name="clip" alt="notice" class="icon"/>
		
		<div class="loading" v-if="loading && !error">
			<div class="message">{{ $t("global.moderation_action.clip_creating") }}</div>
			<Icon name="loader" alt="loading" class="loader"/>
		</div>

		<div class="holder" v-else-if="!error">
			<div class="message">{{ $t("global.moderation_action.clip_created") }}</div>
			<div class="ctas">
				<Button small :loading="highlighting" @click.stop="highlight()" icon="highlight">{{ $t('global.moderation_action.clip_created_highlightBt') }}</Button>
				<Button small type="link" :href="messageData.clipUrl" target="_blank" icon="newtab">{{ $t('global.moderation_action.clip_created_publishBt') }}</Button>
			</div>
		</div>

		<div v-if="error" class="card-item alert">{{ $t("error.clip_creation") }}</div>

	</div>
</template>

<script lang="ts">
import TwitchatEvent from '@/events/TwitchatEvent';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import Utils from '@/utils/Utils';
import type { JsonObject } from 'type-fest';
import { Component, Prop, toNative } from 'vue-facing-decorator';
import TTButton from '../TTButton.vue';
import AbstractChatMessage from './AbstractChatMessage';

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
	public highlighting:boolean =  false;
	
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
		this.highlighting = true;
		console.log(this.messageData.clipData)
		const data:TwitchatDataTypes.ChatHighlightInfo = {
			clip:this.messageData.clipData,
			date:this.messageData.date,
			message_id:this.messageData.id,
			params:this.$store.chat.chatHighlightOverlayParams,
			dateLabel:this.$store.i18n.tm("global.date_ago"),
		}
		const exists = await Utils.getHighlightOverPresence();
		if(exists) {
			PublicAPI.instance.broadcast(TwitchatEvent.SHOW_CLIP, (data as unknown) as JsonObject);
			this.$store.chat.highlightedMessageId = this.messageData.id;
		}else{
			this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.OVERLAYS, TwitchatDataTypes.ParamDeepSections.HIGHLIGHT);
		}
		this.highlighting = false;
	}

}
export default toNative(ChatMessageClipPending);
</script>

<style scoped lang="less">
.chatmessageclippending{

	.holder {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		flex: 1;
		.message{
			flex: 1;
		}
	}
	
	.ctas {
		margin-top: .25em;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: .5em;
		row-gap: .25em;
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