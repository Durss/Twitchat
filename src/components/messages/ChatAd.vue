<template>
	<div class="chatad" @click.stop="">
		<div v-if="isSponsor" class="sponsor">
			<div class="title">🍔 I like food 🍔</div>
			<div class="content">Are you enjoying <strong>Twitchat</strong> ?<br>
			It took <strong>months</strong> of my life to create.<br>
			Twitchat is free, but <strong>if you can afford it</strong>, any tip would really make my day brighter!</div>
			<div class="cta">
				<img @click.stop="openParamPage('sponsor')" src="@/assets/img/eating.gif" alt="nomnom" class="sponsorGif">
				<Button aria-label="Open tip options" @click.stop="openParamPage('sponsor')" title="🌞 Make my day brighter 🌞" />
			</div>
		</div>

		<div v-else-if="isUpdate" class="updates">
			<Button aria-label="Remove message" @click.stop="deleteMessage()" :icon="$image('icons/cross_white.svg')" class="closeBt" />
			<div class="title">🎉 New updates 🎉</div>
			<div class="infos">Use <mark>/updates</mark> command to open this back</div>
			<div class="content">
				<ToggleBlock class="block new" title="New features" :icons="['new']">
					<ul>
						<li>
							<Button aria-label="open stream infos params" small title="try it" @click.stop="openModal('streamInfo')" />
							<span>Edit your <strong>stream infos</strong> and create presets.</span>
						</li>
						<li>
							<span>New <span class="cmd">/countdown</span> command to start a countdown of a custom duration</span>
						</li>
						<li>
							<span>New <span class="cmd">/timerStart</span> command to time anything you want</span>
						</li>
						<li>
							<Button aria-label="open timer overlay params" small title="try it" @click.stop="openParamPage('overlays')" />
							<span>New timer and countdown <strong>overlay</strong></span>
						</li>
						<li>
							<Button aria-label="open triggers params" small title="try it" @click.stop="openParamPage('triggers')" />
							<span>New timer and countdown <strong>triggers</strong></span>
						</li>
						<li>
							<Button aria-label="open triggers params" small title="try it" @click.stop="openParamPage('triggers')" />
							<span>New stream info update <strong>trigger</strong></span>
						</li>
						<li>
							<span>You can now easily <strong>enable or disable triggers</strong></span>
						</li>
						<li>
							<span>Raffle can now send confirmation message when a viewer enters</span>
						</li>
						<li>
							<span>Raffle timer can be displayed on your stream with the new overlay</span>
						</li>
					</ul>
				</ToggleBlock>
				<ToggleBlock class="block other" title="Other updates" :open="false" :icons="['change']">
					<ul>
						<li>
							<Button aria-label="open about section" small title="open" @click.stop="openParamPage('about')" />
							<span>Twitchat API documentation added to about section</span>
						</li>
						<li>You can now resize the <strong>Greet them</strong> section as you wish</li>
						<li><strong>Founders badge</strong> now displayed in the mini-badges</li>
						<li>First load size of the app reduced by 50%</li>
						<li>When changing the stream info a chat notification will be displayed</li>
						<li>Improved message list performance</li>
					</ul>
				</ToggleBlock>
				<ToggleBlock class="block fix" title="Fixes" :open="false" :icons="['fix']">
					<ul>
						<li>Triggers could get stuck which was blocking chat commands execution</li>
						<li>Closing a bingo wasn't possible</li>
						<li>Raffle, Bingo, Prediction and Poll triggers weren't fully implemented <i>(woops :3)</i></li>
						<li>2min timeout was doing a 30min timeout</li>
					</ul>
				</ToggleBlock>
			</div>
			<div class="cta">
				<Button aria-label="Close updates" @click.stop="deleteMessage()" title="OK got it" />
			</div>
		</div>

		<div v-if="isTip" class="tip">
			<Button aria-label="Close tips &amp; tricks message" @click.stop="deleteMessage()" :icon="$image('icons/cross_white.svg')" class="closeBt" />
			<div class="title">💡 Tips &amp; tricks 💡</div>
			<ChatTipAndTrickAd class="content"
				@showModal="(v:string)=> $emit('showModal', v)"
				@openParam="(v:string)=> openParamPage(v)"
				@openParamItem="(v:string)=> showSpecificParam(v)"
			/>
		</div>

		<div v-if="isDiscord" class="discord">
			<Button aria-label="Close discord message" @click.stop="deleteMessage()" :icon="$image('icons/cross_white.svg')" class="closeBt" />
			<div class="title">Join us on Discord</div>
			<div class="content">
				<img src="@/assets/icons/discord_purple.svg" alt="discord" class="icon">
				<div>You have a feature suggestion or an issue to report?<br>join us on discord!</div>
			</div>
			<div class="cta">
				<Button :icon="$image('icons/discord.svg')"
					title="Join Discord"
					:href="discordURL"
					target="_blank"
					type="link"
				/>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import store from '@/store';
import Store from '@/store/Store';
import Config from '@/utils/Config';
import type { IRCEventDataList } from '@/utils/IRCEventDataTypes';
import { Options, Vue } from 'vue-class-component';
import ChatTipAndTrickAd from './ChatTipAndTrickAd.vue';
import ToggleBlock from '../ToggleBlock.vue';
import { TwitchatAdTypes } from '@/types/TwitchatDataTypes';

@Options({
	props:{
		messageData:Object,
	},
	components:{
		Button,
		ToggleBlock,
		ChatTipAndTrickAd,
	},
	emits:["showModal", "delete", "close", "ariaMessage"]
})
export default class ChatAd extends Vue {

	public messageData!:IRCEventDataList.TwitchatAd;
	

	public get isSponsor():boolean { return this.messageData.contentID == TwitchatAdTypes.SPONSOR; }
	public get isUpdate():boolean { return this.messageData.contentID == TwitchatAdTypes.UPDATES; }
	public get isTip():boolean { return this.messageData.contentID == TwitchatAdTypes.TIP_AND_TRICK; }
	public get isDiscord():boolean { return this.messageData.contentID == TwitchatAdTypes.DISCORD; }
	
	public get discordURL():string { return Config.instance.DISCORD_URL; }

	public mounted():void {
		
	}

	public openParamPage(page:string):void {
		store.state.tempStoreValue = "CONTENT:"+page;
		store.dispatch("showParams", true);
	}

	public showSpecificParam(id:string):void {
		store.state.tempStoreValue = "SEARCH:"+id;
		store.dispatch("showParams", true);
	}

	public openModal(modal:string):void { this.$emit("showModal", modal); }

	public deleteMessage():void {
		if(this.isUpdate) {
			Store.set(Store.UPDATE_INDEX, store.state.latestUpdateIndex);
		}
		store.dispatch("delChatMessage", {messageId:this.messageData.tags.id});
		this.$emit("delete");
	}

}
</script>

<style scoped lang="less">
.chatad{
	background-color: @mainColor_light;
	border-radius: 1em;
	overflow: hidden;
	margin: .5em 0;
	position: relative;

	&>* {
		color: @mainColor_normal;
	}

	.closeBt {
		position: absolute;
		top:0;
		right:0;
		height: 3em;
	}

	div>.title {
		text-align: center;
		background: @mainColor_normal;
		color: @mainColor_light;
		font-weight: bold;
		padding: .5em;
		font-size: 1.5em;
	}

	.infos {
		font-style: italic;
		text-align: center;
		padding: .5em;
		color: @mainColor_dark_extralight;
		mark {
			border: 1px dashed @mainColor_dark_extralight;
			border-radius: .5em;
			padding: 0 .25em;
		}
	}

	.content {
		padding: .5em;
		text-align: center;

		.icon {
			height: 4em;
			width: 4em;
		}

		.block {
			&.new {
				:deep(.header){
					color: @mainColor_light;
					background-color: @mainColor_warn;
					border-bottom-color: darken(@mainColor_warn, 10%);
					&:hover {
						background-color: lighten(@mainColor_warn, 5%);
					}
				}
				:deep(.content){
					color: @mainColor_warn;
					background-color: lighten(@mainColor_warn_extralight, 15%);
				}
				.button {
					border-color: @mainColor_warn;
					color: @mainColor_warn !important;
					&:hover {
						background: fade(@mainColor_warn, 10%);
					}
				}

				.cmd {
					background-color: fade(@mainColor_warn, 15%);
				}
			}
			&.fix {
				:deep(.header){
					color: @mainColor_light;
					background-color: @mainColor_alert;
					border-bottom-color: darken(@mainColor_alert, 10%);
					&:hover {
						background-color: lighten(@mainColor_alert, 5%);
					}
				}
				:deep(.content){
					color: @mainColor_alert;
					background-color: lighten(@mainColor_alert_extralight, 5%);
				}
				.button {
					border-color: @mainColor_alert;
					color: @mainColor_alert !important;
					&:hover {
						background: fade(@mainColor_alert, 10%);
					}
				}

				.cmd {
					background-color: fade(@mainColor_alert, 15%);
				}
			}
			&:not(:last-of-type) {
				margin-bottom: .5em;
			}
			:deep(.header){
					color: @mainColor_light;
					background-color: @mainColor_normal;
					&:hover {
						background-color: lighten(@mainColor_normal, 5%);
					}
			}

			.cmd {
				background-color: fade(@mainColor_normal, 15%);
				border-radius: .5em;
				padding: 0 .5em;
				font-family: 'Courier New', Courier, monospace;
			}
		}

		ul {
			text-align: left;
			margin-left: 2em;
			li {
				&:not(:last-child) {
					margin-bottom:.5em;
				}

				.button {
					background: transparent;
					border: 1px solid @mainColor_normal;
					padding: .16em .3em;
					margin-right: .5em;
					color: @mainColor_normal !important;
					&:hover {
						background: fade(@mainColor_normal, 10%);
					}
				}
			}
		}
	}

	.cta {
		padding: .5em;
		display: flex;
		flex-direction: column;
		align-items: center;

		.sponsorGif {
			width: 8em;
			cursor: pointer;
		}
	}

}
</style>