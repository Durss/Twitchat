<template>
	<div class="chatscoperequester chatMessage highlight error">
		<ClearButton @click="deleteMessage()" />

		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>

		<Icon  name="lock_fit" />

		<div class="info">
			<p class="title">{{ $t("chat.scope_request.title", messageData.twitch_scopes.length) }}</p>

			<ul class="scopes">
				<li v-for="s in messageData.twitch_scopes" :key="s">
					<Icon v-if="getScopeImage(s)" :name="getScopeImage(s)" />
					<span>{{ $t("global.twitch_scopes."+s) }}</span>
				</li>
			</ul>

			<Button class="grantBt" small light alert icon="lock_fit" @click.stop="requestScopes()">{{ $t('chat.scope_request.grantBt') }}</Button>
			<Button class="filterBt" small light alert icon="filters" @click.stop="openFilters()">{{ $t('chat.scope_request.openFiltersBt') }}</Button>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { TwitchScope2Icon, type TwitchScopesString } from '@/utils/twitch/TwitchScopes';
import { Component, Prop, toNative } from 'vue-facing-decorator';
import ClearButton from '../ClearButton.vue';
import TTButton from '../TTButton.vue';
import AbstractChatMessage from './AbstractChatMessage';

@Component({
	components:{
		Button: TTButton,
		ClearButton,
	},
	emits:["onRead", "openFilters"]
})
class ChatScopeRequester extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageScopeRequestData;

	public getScopeImage(s:TwitchScopesString):string {
		return TwitchScope2Icon[s] ?? "";
	}

	public mounted():void {

	}

	public requestScopes():void {
		this.$store.auth.newScopesToRequest = this.messageData.twitch_scopes;
	}

	public openFilters():void {
		this.$emit("openFilters");
	}

	public deleteMessage():void {
		this.$store.chat.deleteMessage(this.messageData);
	}

}
export default toNative(ChatScopeRequester);
</script>

<style scoped lang="less">
.chatscoperequester{
	// background-color: var(--color-alert-fader) !important;
	.info {
		width: 100%;
		.title {
			font-weight: bold;
			margin-bottom: .5em;
			width: calc(100% - 2.5em);
		}
		.scopes {
			display: flex;
			flex-direction: column;
			gap: .25em;
			list-style-position: inside;
			li {
				font-size: .9em;
				.icon {
					height: 1em;
					width: 1em;
					margin-right: .5em;
				}
			}
		}

		.grantBt, .filterBt {
			margin: auto;
			margin-top: .5em;
			display: flex;
		}
	}
}
</style>
