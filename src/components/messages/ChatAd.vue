<template>
	<div class="chatad">
		<div v-if="messageData.contentID == 1" class="sponsor">
			<div class="title">🍔 I like food 🍔</div>
			<div class="content">Are you enjoying <strong>Twitchat</strong> ?<br>
			It took me a lot of time and efforts to create.<br>
			Twitchat is free, but if you can afford it, any tip would really <strong>make my day brighter</strong>!</div>
			<div class="cta">
				<Button @click="openParamPage('sponsor')" title="🌞 Make my day brighter 🌞" />
			</div>
		</div>

		<div v-else-if="messageData.contentID == 2" class="updates">
			<div class="title">🎉 New updates 🎉</div>
			<div class="infos">Use <mark>/updates</mark> command to open this back</div>
			<div class="content">
				<ul>
					<li><Button small title="try it" @click="showSpecificParam('features.stopStreamOnRaid')" /> New option to automatically <strong>stop OBS stream</strong> after a raid completes</li>
					<li><Button small title="try it" @click="showSpecificParam('features.showUserPronouns')" /> New parameter to show viewers <strong>pronouns</strong></li>
					<li><Button small title="try it" @click="showSpecificParam('features.notifyJoinLeave')" /> New parameter to show when users <strong>enter/leave</strong> your chatroom</li>
					<li><Button small title="try it" @click="$emit('showModal', 'chatpoll')" /> New "<strong>Chat poll</strong>" feature to create new kind of polls</li>
					<li><Button small title="try it" @click="openParamPage('obs')" /> Create your own follow/sub/cheer/raid/rewards/.. alerts with the new <strong>trigger system</strong> that allows you to control and update your OBS sources adn filters</li>
					<li>Frankerfacez emotes supported</li>
				</ul>
			</div>
			<div class="cta">
				<Button @click="markUpdateAsRead()" title="OK got it" />
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import store from '@/store';
import Store from '@/store/Store';
import { IRCEventDataList } from '@/utils/IRCEvent';
import { Options, Vue } from 'vue-class-component';
import { ParamsContenType } from '../params/Parameters.vue';

@Options({
	props:{
		messageData:Object,
	},
	components:{
		Button
	},
	emits:["showModal", "delete"]
})
export default class ChatAd extends Vue {

	public messageData!:IRCEventDataList.TwitchatAd;

	//1 - sponsor
	//2 - updates

	public mounted():void {
		
	}

	public openParamPage(page:ParamsContenType):void {
		store.state.tempStoreValue = "CONTENT:"+page;
		store.dispatch("showParams", true);
	}

	public showSpecificParam(id:string):void {
		store.state.tempStoreValue = "SEARCH:"+id;
		store.dispatch("showParams", true);
	}

	public markUpdateAsRead():void {
		Store.set("updateIndex", store.state.latestUpdateIndex);
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

	&>* {
		color: @mainColor_normal;
	}

	.title {
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
	}

}
</style>