<template>
	<div class="chatscoperequester" @click.capture.ctrl.stop="copyJSON()"
	@click="$emit('onRead', messageData, $event)">
		<button class="closeBt" @click="deleteMessage()"><img src="@/assets/icons/cross_white.svg"></button>

		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>

		<img src="@/assets/icons/alert.svg" alt="alert" class="icon">

		<div class="info">
			<p class="title">{{ $tc("chat.scope_request.title", messageData.twitch_scopes) }}</p>

			<ul class="scopes">
				<li v-for="s in messageData.twitch_scopes" :key="s">
					<img :src="getScopeImage(s)">
					<span>{{ $t("global.twitch_scopes."+s) }}</span>
				</li>
			</ul>

			<Button class="grantBt" :icon="$image('icons/lock_fit.svg')" :title="$t('chat.scope_request.grantBt')" @click="requestScopes()" white />
			<Button class="filterBt" :icon="$image('icons/filters.svg')" :title="$t('chat.scope_request.openFiltersBt')" @click="openFilters()" white />
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { TwitchScope2Icon, type TwitchScopesString } from '@/utils/twitch/TwitchScopes';
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import { Component, Prop } from 'vue-facing-decorator';
import Button from '../Button.vue';
import AbstractChatMessage from './AbstractChatMessage.vue';

@Component({
	components:{
		Button,
	},
	emits:["onRead", "openFilters"]
})
export default class ChatScopeRequester extends AbstractChatMessage {
	
	@Prop
	declare messageData:TwitchatDataTypes.MessageScopeRequestData;

	public getScopeImage(s:TwitchScopesString):string {
		return this.$image("icons/"+TwitchScope2Icon[s]?.replace("_purple", ""));
	}

	public mounted():void {
		
	}

	public copyJSON():void {
		Utils.copyToClipboard(JSON.stringify(this.messageData));
		console.log(this.messageData);
		gsap.fromTo(this.$el, {scale:1.2}, {duration:.5, scale:1, ease:"back.out(1.7)"});
	}

	public requestScopes():void {
		this.$store("auth").newScopesToRequest = this.messageData.twitch_scopes;
	}

	public openFilters():void {
		this.$emit("openFilters");
	}

	public deleteMessage():void {
		this.$store("chat").deleteMessage(this.messageData);
	}

}
</script>

<style scoped lang="less">
.chatscoperequester{
	.chatMessageHighlight();

	color: @mainColor_light;
	background-color: @mainColor_alert;
	position: relative;
	align-items: flex-start;

	&:hover {
		background-color: @mainColor_alert_light;
	}
	
	.closeBt {
		position: absolute;
		right: .5em;
		img {
			height: 1em;
		}
	}
	.info {
		width: 100%;
		.title {
			font-weight: bold;
			margin-bottom: .5em;
		}
		.scopes {
			display: flex;
			flex-direction: column;
			gap: .25em;
			li {
				img {
					height: 1em;
					width: 1em;
					margin-right: .5em;
					vertical-align: middle;
				}
			}
		}

		.grantBt, .filterBt {
			margin: auto;
			margin-top: .5em;
			display: block;
			color: @mainColor_dark;
			font-weight: bold;
			:deep(.icon) {
				filter: brightness(0);
			}
		}
	}
}
</style>