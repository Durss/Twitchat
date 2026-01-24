<template>
	<div class="qnalist sidePanel">
		<div class="head">
			<div class="title">
				<Icon name="qna" />
				<i18n-t scope="global" tag="h1" keypath="qna.list.title"></i18n-t>
			</div>
			<ClearButton @click="close()" />
			<!-- <div class="ctas">
				<TTButton secondary icon="cross">Close session</TTButton>
				<TTButton alert icon="trash">Delete session</TTButton>
			</div> -->
		</div>

		<div class="content" v-if="currentSession">
			<div class="description" v-if="currentSession.ownerId != $store.auth.twitch.user.id">
				<Icon name="mod" /> {{ $t("qna.list.owner", {USER:owner.displayNameOriginal}) }}
			</div>

			<div class="description" v-else-if="currentSession.shareWithMods">
				<Icon name="mod" /> {{ $t("qna.list.shared") }}
			</div>

			<div class="messageList" ref="messageList">
				<div class="noResult" v-if="messages.length === 0">{{ $t("global.no_result") }}</div>
				<div v-else v-for="(m, index) in messages" :key="m.message.id" class="messageItem">
					<MessageItem class="message" :messageData="buildFakeMessage(m)" :lightMode="true" />

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

			<div class="sessionlist">
				<div v-for="(s, index) in $store.qna.activeSessions" :key="s.id" class="user">
					<TTButton @click="currentSessionIndex = index" :selected="currentSession.id == s.id">{{ s.command }} <i>x{{ s.messages.length }}</i></TTButton>
					<TTButton icon="stop" @click="closeSession(s.id)" secondary v-if="s.open"></TTButton>
					<TTButton icon="trash" @click="deleteSession(s.id)" alert></TTButton>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { watch } from 'vue';
import TwitchatEvent from '@/events/TwitchatEvent';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import Utils from '@/utils/Utils';
import {toNative,  Component } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel';
import ClearButton from '../ClearButton.vue';
import TTButton from '../TTButton.vue';
import MessageItem from '../messages/MessageItem.vue';
import TwitchUtils from '@/utils/twitch/TwitchUtils';

@Component({
	components:{
		TTButton,
		ClearButton,
		MessageItem,
	},
	emits:["close"],
})
class QnaList extends AbstractSidePanel {

	public overlayAvailable = false;
	public highlightLoading = true;
	public itemsPerPage = 20;
	public pageIndex = 0;
	public currentSessionIndex:number = 0;

	public get currentSession():TwitchatDataTypes.QnaSession|null {
		if(this.$store.qna.activeSessions.length == 0) return null;
		return this.$store.qna.activeSessions[this.currentSessionIndex]!;
	}

	public get pageCount():number {
		if(!this.currentSession) return 0;
		return Math.ceil(this.currentSession.messages.length / this.itemsPerPage);
	}

	public get owner() {
		return this.$store.users.getUserFrom("twitch", this.$store.auth.twitch.user.id, this.currentSession!.ownerId);
	}

	public get messages():TwitchatDataTypes.QnaSession["messages"] {
		if(!this.currentSession) return [];
		const start = this.pageIndex * this.itemsPerPage;
		return this.currentSession.messages.sort((a,b)=>b.votes-a.votes).slice(start, this.itemsPerPage + start);
	}

	public getTime(message:TwitchatDataTypes.TranslatableMessage):string {
		const d = new Date(message.date);
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes());
	}

	public beforeMount():void {
		this.currentSessionIndex = 0;
	}

	public mounted():void {
		super.open();

		//Check if highlight overlay exists
		Utils.getHighlightOverPresence().then(res => {
			this.overlayAvailable = res;
			this.highlightLoading = false;
		});

		watch(()=>this.pageCount, ()=>{
			//Make sure we remain on last available page when items get removed
			if(this.pageIndex >= this.pageCount) {
				this.pageIndex = this.pageCount - 1;
			}
		})
	}

	public closeSession(id:string):void {
		this.$confirm(this.$t("qna.list.close_confirm.title"), this.$t("qna.list.close_confirm.description"))
		.then(()=>{
			this.$store.qna.stopSession(id);
		}).catch(()=>{});
	}

	public deleteSession(id:string):void {
		this.$confirm(this.$t("qna.list.delete_confirm.title"), this.$t("qna.list.delete_confirm.description"))
		.then(()=>{
			this.$store.qna.deleteSession(id);
			if(this.$store.qna.activeSessions.length == 0) this.close();
			else this.currentSessionIndex = 0;
		}).catch(()=>{});
	}

	/**
	 * Removes a message from pins
	 * @param m
	 */
	public async unpin(message:TwitchatDataTypes.QnaSession["messages"][number], index:number):Promise<void> {
		this.$store.qna.removeMessageFromSession(message, this.currentSession!);
	}

	/**
	 * Highlights a message on dedicated overlay
	 */
	public async chatHighlight(m:TwitchatDataTypes.QnaSession["messages"][number]):Promise<void> {
		if(!this.overlayAvailable) {
			//Open parameters if overlay is not found
			this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.OVERLAYS, TwitchatDataTypes.ParamDeepSections.HIGHLIGHT);
		}else{
			this.highlightLoading = true;
			this.$store.qna.highlightEntry(m);
			await Utils.promisedTimeout(1000);
			this.highlightLoading = false;
		}
	}

	/**
	 * Builds up a fake message data to display on list
	 * @param m
	 */
	public buildFakeMessage(m:TwitchatDataTypes.QnaSession["messages"][number]):TwitchatDataTypes.MessageChatData {
		return {
			id: m.message.id,
			platform: m.platform,
			channel_id: m.channelId,
			type: TwitchatDataTypes.TwitchatMessageType.MESSAGE,
			date: Date.now(),
			answers: [],
			is_short: false,
			message: m.message.chunks.map(v=>v.value)+" ",
			message_chunks: m.message.chunks,
			message_html: TwitchUtils.messageChunksToHTML(m.message.chunks),
			message_size: TwitchUtils.computeMessageSize(m.message.chunks),
			user: this.$store.users.getUserFrom(m.platform, m.channelId, m.user.id, undefined, m.user.name),
		}
	}

}
export default toNative(QnaList);
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

	.description {
		text-align: center;
		font-style: italic;
		background-color: #00a86555;
		padding: .25em;
		border-radius: var(--border-radius);
		.icon {
			height: 1em;
			vertical-align: bottom;
		}
	}

	.messageList {
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		flex-grow: 1;
		gap: .25em;

		.noResult {
			text-align: center;
			font-style: italic;
		}

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

	.sessionlist {
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
