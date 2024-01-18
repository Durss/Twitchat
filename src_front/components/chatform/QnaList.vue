<template>
	<div class="qnalist sidePanel">
		<div class="head">
			<div class="title">
				<Icon name="qna" />
				<i18n-t scope="global" tag="h1" keypath="qna.list.title"></i18n-t>
			</div>
			<div class="description">{{ currentSession.command }}</div>
			<CloseButton @click="close()" />
			<!-- <div class="ctas">
				<TTButton secondary icon="cross">Close session</TTButton>
				<TTButton alert icon="trash">Delete session</TTButton>
			</div> -->
		</div>

		<div class="content">
			<div class="messageList" ref="messageList">
				<div v-for="(m, index) in messages" :key="m.id" class="messageItem">
					<MessageItem class="message" :messageData="m" :lightMode="true" />
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

			<div class="pagination" v-if="pageCount > 1">
				<TTButton v-for="i in pageCount" :selected="pageIndex == i-1" @click="pageIndex = i-1">{{ i }}</TTButton>
			</div>
			 
			<div class="userlist">
				<div v-for="s in $store.qna.activeSessions" :key="s.id" class="user">
					<TTButton class="login" @click="currentSession = s" :selected="currentSession.id == s.id">{{ s.command }} <i>x{{ s.messages.length }}</i></TTButton>
					<TTButton class="close" icon="pause" @click="closeSession(s.id)" secondary v-if="s.open"></TTButton>
					<TTButton class="delete" icon="trash" @click="deleteSession(s.id)" alert></TTButton>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import TwitchatEvent from '@/events/TwitchatEvent';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import Utils from '@/utils/Utils';
import { Component } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel';
import CloseButton from '../CloseButton.vue';
import TTButton from '../TTButton.vue';
import MessageItem from '../messages/MessageItem.vue';
import ChatMessageChunksParser from '../messages/components/ChatMessageChunksParser.vue';

@Component({
	components:{
		TTButton,
		CloseButton,
		MessageItem,
		ChatMessageChunksParser,
	},
	emits:["close"],
})
export default class QnaList extends AbstractSidePanel {
	
	public overlayAvailable = false;
	public highlightLoading = true;
	public itemsPerPage = 20;
	public pageIndex = 0;

	public currentSession!:TwitchatDataTypes.QnaSession;

	public get pageCount():number {
		return Math.ceil(this.currentSession.messages.length / this.itemsPerPage);
	}

	public get messages():TwitchatDataTypes.TranslatableMessage[] {
		const start = this.pageIndex * this.itemsPerPage;
		return this.currentSession.messages.slice(start, this.itemsPerPage + start);
	}

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
		this.$confirm(this.$t("qna.list.close_confirm.title"), this.$t("qna.list.close_confirm.description"))
		.then(()=>{
			this.$store.qna.stopSession(id);
		});
	}

	public deleteSession(id:string):void {
		this.$confirm(this.$t("qna.list.delete_confirm.title"), this.$t("qna.list.delete_confirm.description"))
		.then(()=>{
			this.$store.qna.deleteSession(id);
		});
	}

	/**
	 * Removes a message from pins
	 * @param m 
	 */
	public async unpin(m:TwitchatDataTypes.TranslatableMessage, index:number):Promise<void> {
		this.currentSession.messages.splice(index + this.pageIndex * this.itemsPerPage, 1);
		if(this.pageIndex >= this.pageCount) {
			this.pageIndex = this.pageCount - 1;
		}
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

	.head {
		.ctas {
			gap: 1em;
			row-gap: .25em;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			justify-content: center;
			align-items: center;
		}
	}

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
				align-self: flex-start;
			}

		}
	}

	.pagination {
		gap: .5em;
		row-gap: .25em;
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		button {
			padding: .25em .5em;
			min-width: 1em;
			border-radius: var(--border-radius);
			color: var(--color-light);
			background-color: var(--color-button);
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
			button {
				border-radius: 0;
			}
			button:first-child{
				border-top-left-radius: var(--border-radius);
				border-bottom-left-radius: var(--border-radius);
			}
			button:last-child {
				border-top-right-radius: var(--border-radius);
				border-bottom-right-radius: var(--border-radius);
				padding: 0 .5em;
			}
		}
	}
	i {
		font-weight: normal;
		font-size: .9em;
		padding: 0;
	}
}
</style>