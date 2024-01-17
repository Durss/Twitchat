<template>
	<div class="qnalist sidePanel">
		<div class="head">
			<div class="title">
				<Icon name="qna" />
				<i18n-t scope="global" tag="h1" keypath="qna.list.title"></i18n-t>
			</div>
			<div class="description">{{ currentSession.command }}</div>
			<CloseButton @click="close()" />
		</div>

		<div class="content">
			<div class="messageList" ref="messageList">
				<div v-for="(m, index) in currentSession.messages" :key="m.id" class="messageItem">
					<ChatMessage class="message" :messageData="m" :lightMode="true" />
					<TTButton :aria-label="$t('pin.highlightBt_aria')"
						@click.capture="chatHighlight(m)"
						class="button"
						small
						icon="highlight"
						v-tooltip="$t('pin.highlightBt_tt')"
						:loading="highlightLoading"
						:disabled="!overlayAvailable"
						/>
					<TTButton :aria-label="$t('pin.unpinBt_aria')"
						@click="unpin(m, index)"
						class="button"
						small
						secondary
						highlight
						icon="delete" />
				</div>
			</div>
			
			<div class="userlist" v-if="$store.qna.activeSessions.length > 1">
				<div v-for="s in $store.qna.activeSessions" :key="s.id" class="user">
					<TTButton small class="login" @click="currentSession = s" :selected="currentSession.id == s.id">{{ s.command }}</TTButton>
					<TTButton small class="delete" icon="trash" @click="deleteSession(s.id)" alert></TTButton>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { Component } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel';
import CloseButton from '../CloseButton.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TTButton from '../TTButton.vue';
import Utils from '@/utils/Utils';
import ChatMessageChunksParser from '../messages/components/ChatMessageChunksParser.vue';
import ChatMessage from '../messages/ChatMessage.vue';
import PublicAPI from '@/utils/PublicAPI';
import TwitchatEvent from '@/events/TwitchatEvent';

@Component({
	components:{
		TTButton,
		CloseButton,
		ChatMessage,
		ChatMessageChunksParser,
	},
	emits:[],
})
export default class QnaList extends AbstractSidePanel {
	
	public overlayAvailable = false;
	public highlightLoading = true;


	public currentSession!:TwitchatDataTypes.QnaSession;

	public getTime(message:TwitchatDataTypes.TranslatableMessage):string {
		const d = new Date(message.date);
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes());
	}

	public beforeMount():void {
		this.currentSession = this.$store.qna.activeSessions[0];
	}

	public mounted():void {
		super.open();

		//Check if highlight overlay exists
		this.getHighlightOverPresence().then(res => {
			this.overlayAvailable = res;
			this.highlightLoading = false;
		});
	}

	public closeSession(id:string):void {
		this.$store.qna.stopSession(id);
	}

	public deleteSession(id:string):void {
		this.$store.qna.deleteSession(id);
	}

	/**
	 * Removes a message from pins
	 * @param m 
	 */
	public async unpin(m:TwitchatDataTypes.TranslatableMessage, index:number):Promise<void> {
		this.currentSession.messages.splice(index, 1);
	}
	
	/**
	 * Highlights a message on dedicated overlay
	 */
	public async chatHighlight(m:TwitchatDataTypes.TranslatableMessage):Promise<void> {
		if(!this.overlayAvailable) {
			//Open parameters if overlay is not found
			this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.OVERLAYS, TwitchatDataTypes.ParamDeepSections.HIGHLIGHT);
		}else{
			this.highlightLoading = true;
			this.$store.chat.highlightChatMessageOverlay(m);
			await Utils.promisedTimeout(1000);
			this.highlightLoading = false;
		}
	}

	/**
	 * Check if the "chat highlight" overlay exists or not
	 */
	private getHighlightOverPresence():Promise<boolean> {
		return new Promise((resolve, reject)=> {
			const timeout = setTimeout(() =>{
				resolve(false);
				PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_HIGHLIGHT_OVERLAY_PRESENCE, handler);
			}, 1000)
			let handler = (e:TwitchatEvent)=> {
				clearTimeout(timeout)
				resolve(true);
				PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_HIGHLIGHT_OVERLAY_PRESENCE, handler);
			}
			PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_HIGHLIGHT_OVERLAY_PRESENCE, handler);
			PublicAPI.instance.broadcast(TwitchatEvent.GET_CHAT_HIGHLIGHT_OVERLAY_PRESENCE);
		})
	}
}
</script>

<style scoped lang="less">
.qnalist{

	.messageList {
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		flex-grow: 1;
		gap: .5em;

		.messageItem {
			display: flex;
			flex-direction: row;
			align-items: center;
			position: relative;
			gap: .25em;
			width: 100%;
			max-width: 100%;

			.message {
				flex-grow: 1;
			}

			.button {
				width: fit-content;
				min-width: fit-content;
			}

		}
	}
	.userlist {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: center;
		gap: 10px;
		flex-shrink: 0;
		.user {
			display: flex;
			flex-direction: row;
			.login {
				border-top-right-radius: 0;
				border-bottom-right-radius: 0;
			}
			.delete {
				border-top-left-radius: 0;
				border-bottom-left-radius: 0;
				padding: 0 .5em;
			}
		}
	}
}
</style>