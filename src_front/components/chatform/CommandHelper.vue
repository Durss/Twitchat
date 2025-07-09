<template>
	<div :class="classes">
		<div class="menuItem">
			<TTButton @click.capture="openModal('poll');"
				icon="poll"
				:disabled="!canCreatePoll"
				v-tooltip="hasChannelPoints? '' : $t('cmdmenu.not_affiliate')">{{$t('cmdmenu.poll')}}</TTButton>
			<!-- <TTButton icon="pin" :primary="isPinned('poll')" @click="onTogglePin('poll')" :disabled="!canCreatePoll" /> -->
		</div>
		<div class="menuItem">
			<TTButton @click.capture="openModal('pred');"
				icon="prediction"
				:disabled="!canCreatePrediction"
				v-tooltip="hasChannelPoints? '' : $t('cmdmenu.not_affiliate')">{{$t('cmdmenu.prediction')}}</TTButton>
			<!-- <TTButton icon="pin" :primary="isPinned('prediction')" @click="onTogglePin('prediction')" :disabled="!canCreatePrediction" /> -->
		</div>
		<div class="menuItem">
			<TTButton @click.capture="openModal('raffle');"
				icon="ticket">{{$t('cmdmenu.raffle')}}</TTButton>
			<!-- <TTButton icon="pin" :primary="isPinned('raffle')" @click="onTogglePin('raffle')" /> -->
		</div>
		<div class="menuItem">
			<TTButton @click.capture="openModal('bingo');"
				icon="bingo">{{$t('cmdmenu.bingo')}}</TTButton>
			<!-- <TTButton icon="pin" :primary="isPinned('bingo')" @click="onTogglePin('bingo')" /> -->
		</div>
		<div class="menuItem">
			<TTButton @click.capture="openModal('bingo_grid');"
				icon="bingo_grid"
				v-newflag="{date:$config.NEW_FLAGS_DATE_V13, id:'cmdhelper.bingo_grid'}">{{$t('cmdmenu.bingo_grid')}}</TTButton>
			<!-- <TTButton icon="pin" :primary="isPinned('bingo_grid')" @click="onTogglePin('bingo_grid')" /> -->
		</div>
		<div class="menuItem">
			<TTButton @click.capture="openModal('qnaForm');"
				icon="qna"
				v-newflag="{date:$config.NEW_FLAGS_DATE_V11, id:'cmdhelper.qna'}">{{$t('cmdmenu.qna')}}</TTButton>
			<!-- <TTButton icon="pin" :primary="isPinned('qna')" @click="onTogglePin('qna')" /> -->
		</div>
		<div class="menuItem">
			<TTButton @click.capture="openModal('chatPoll');"
				v-newflag="{date:$config.NEW_FLAGS_DATE_V16, id:'cmdhelper.chat_poll'}"
				icon="chatPoll">{{$t('cmdmenu.chatPoll')}}</TTButton>
			<!-- <TTButton icon="pin" :primary="isPinned('chatPoll')" @click="onTogglePin('chatPoll')" /> -->
		</div>
		<div class="menuItem">
			<TTButton @click.capture="openModal('chatsuggForm');"
				icon="chatSugg">{{$t('cmdmenu.suggestions')}}</TTButton>
			<!-- <TTButton icon="pin" :primary="isPinned('chatSugg')" @click="onTogglePin('chatSugg')" /> -->
		</div>
		<div class="menuItem">
			<TTButton @click.capture="openModal('timer');"
				v-newflag="{date:$config.NEW_FLAGS_DATE_V16, id:'cmdhelper.timers'}"
				icon="timer">{{$t('cmdmenu.timer')}}</TTButton>
			<!-- <TTButton icon="pin" :primary="isPinned('timer')" @click="onTogglePin('timer')" /> -->
		</div>
		<div class="menuItem">
			<TTButton @click.capture="clearChat();"
				icon="clearChat"
				:disabled="!canClearChat">{{$t('cmdmenu.chat')}}</TTButton>
			<!-- <TTButton icon="pin" :primary="isPinned('clearChat')" @click="onTogglePin('clearChat')" /> -->
		</div>
		<div class="menuItem">
			<TTButton @click.capture="openModal('streamInfo');"
				icon="info"
				:disabled="!canEditStreamInfos">{{$t('cmdmenu.info')}}</TTButton>
			<!-- <TTButton icon="pin" :primary="isPinned('streamInfo')" @click="onTogglePin('streamInfo')" /> -->
		</div>
		<div class="menuItem">
			<TTButton @click.capture="openModal('extensions');"
				icon="extension"
				v-newflag="{date:$config.NEW_FLAGS_DATE_V11, id:'cmdhelper.extensions'}" :disabled="!canEditStreamInfos">{{$t('cmdmenu.extensions')}}</TTButton>
			<!-- <TTButton icon="pin" :primary="isPinned('extensions')" @click="onTogglePin('extensions')" /> -->
		</div>
		<div class="menuItem">
			<TTButton @click.capture="$emit('update:showChatUsers', true); close()"
				icon="user">{{$t('cmdmenu.chatters')}}</TTButton>
			<!-- <TTButton icon="pin" :primary="isPinned('chatters')" @click="onTogglePin('chatters')" /> -->
		</div>
		<div class="menuItem">
			<TTButton @click.capture="$emit('update:showRewards', true); close()"
				icon="channelPoints"
				:disabled="!hasChannelPoints">{{$t('cmdmenu.rewards')}}</TTButton>
			<!-- <TTButton icon="pin" :primary="isPinned('rewards')" @click="onTogglePin('rewards')" :disabled="!hasChannelPoints" /> -->
		</div>

		<TTButton @click.capture="openModal('twitchatAnnouncement');"
			icon="announcement"
			v-if="isAdmin" secondary>{{$t('cmdmenu.announcement')}}</TTButton>

		<div class="commercial" v-tooltip="hasChannelPoints? '' : $t('cmdmenu.not_affiliate')">
			<TTButton aria-label="Start a 30s ad"	v-if="adCooldown == 0" small @click.capture="startAd(30);"	:disabled="!canStartCommercial" icon="coin">{{ $t('cmdmenu.start_ad') }}</TTButton>
			<TTButton aria-label="Start a 60s ad"	v-if="adCooldown == 0" small @click.capture="startAd(60);"	:disabled="!canStartCommercial">1'00</TTButton>
			<TTButton aria-label="Start a 90s ad"	v-if="adCooldown == 0" small @click.capture="startAd(90);"	:disabled="!canStartCommercial">1'30</TTButton>
			<TTButton aria-label="Start a 120s ad"	v-if="adCooldown == 0" small @click.capture="startAd(120);"	:disabled="!canStartCommercial">2'00</TTButton>
			<TTButton aria-label="Start a 150s ad"	v-if="adCooldown == 0" small @click.capture="startAd(150);"	:disabled="!canStartCommercial">2'30</TTButton>
			<TTButton aria-label="Start a 180s ad"	v-if="adCooldown == 0" small @click.capture="startAd(180);"	:disabled="!canStartCommercial">3'00</TTButton>
			<div v-if="adCooldown > 0" class="card-item alert cooldown">{{$t('cmdmenu.commercial', {DURATION:adCooldownFormatted})}}</div>
		</div>

		<ParamItem class="roomParam" :paramData="param_followOnly"	v-model="param_followOnly.value"	@change="setFollowOnly()"	@click="requestRoomSettingsScopes()"	noBackground />
		<ParamItem class="roomParam" :paramData="param_subOnly"		v-model="param_subOnly.value"		@change="setSubOnly()"		@click="requestRoomSettingsScopes()"	noBackground />
		<ParamItem class="roomParam" :paramData="param_emotesOnly"	v-model="param_emotesOnly.value"	@change="setEmoteOnly()"	@click="requestRoomSettingsScopes()"	noBackground />
		<ParamItem class="roomParam" :paramData="param_slowMode"	v-model="param_slowMode.value"		@change="setSlowMode()"		@click="requestRoomSettingsScopes()"	noBackground />

		<div class="card-item raid" v-if="$store.stream.currentRaid">
			<div class="title">
				<Icon name="raid" />
				Raiding {{$store.stream.currentRaid!.user.displayName}}
			</div>
			<TTButton aria-label="Cancel raid" @click="cancelRaid()" type="button" icon="cross" alert>{{ $t("global.cancel") }}</TTButton>
		</div>

		<div class="card-item raid" v-else>
			<label class="title" for="raid_input">
				<Icon name="raid" />{{$t('cmdmenu.raid')}}
			</label>

			<SearchUserForm class="raidForm"
				v-if="canRaid"
				upwards
				v-model="raidUser"
				@select="raid"/>

			<div v-else class="missingScope">
				<p>{{ $t('cmdmenu.scope_grant') }}</p>
				<TTButton icon="unlock" alert small @click="requestRaidScopes()" >{{$t('cmdmenu.scope_grantBt')}}</TTButton>
			</div>
			<a class="whoStreams" @click.prevent="openModal('liveStreams')">{{ $t("cmdmenu.whoslive") }}</a>
		</div>
	</div>
</template>

<script lang="ts">
import StoreProxy from '@/store/StoreProxy';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { gsap } from 'gsap/gsap-core';
import {toNative,  Component, Vue, Prop } from 'vue-facing-decorator';
import TTButton from '../TTButton.vue';
import ParamItem from '../params/ParamItem.vue';
import DataStore from '@/store/DataStore';
import { watch } from 'vue';
import SearchUserForm from '../params/contents/donate/SearchUserForm.vue';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';

@Component({
	components:{
		TTButton,
		ParamItem,
		SearchUserForm,
	},
	emits:[
		"close",
		"update:showChatUsers",
		"update:showRewards",
	]
})
class CommandHelper extends Vue {

	@Prop()
	public showChatUsers!:boolean;

	@Prop()
	public showRewards!:boolean;

	public raidUser:TwitchDataTypes.UserInfo | null = null;
	public channelId:string = "";
	public adCooldown:number = 0;

	public param_followOnly:TwitchatDataTypes.ParameterData<boolean>			= { type:"boolean", value:false, twitch_scopes:[TwitchScopes.SET_ROOM_SETTINGS] };
	public param_subOnly:TwitchatDataTypes.ParameterData<boolean|undefined>		= { type:"boolean", value:false, twitch_scopes:[TwitchScopes.SET_ROOM_SETTINGS] };
	public param_emotesOnly:TwitchatDataTypes.ParameterData<boolean|undefined>	= { type:"boolean", value:false, twitch_scopes:[TwitchScopes.SET_ROOM_SETTINGS] };
	public param_slowMode:TwitchatDataTypes.ParameterData<boolean>				= { type:"boolean", value:false, twitch_scopes:[TwitchScopes.SET_ROOM_SETTINGS] };

	private ignoreUpdates = false;
	private adCooldownInterval = -1;

	public get classes():string[] {
		const res = ["commandhelper", "blured-background-window"];
		if(this.hasChannelPoints) res.push("isAffiliate")
		return res;
	}

	private clickHandler!:(e:MouseEvent) => void;

	public get adCooldownFormatted():string { return Utils.formatDuration(this.adCooldown); }
	public get hasChannelPoints():boolean { return this.$store.auth.twitch.user.is_affiliate || this.$store.auth.twitch.user.is_partner; }
	public get canEditStreamInfos():boolean { return TwitchUtils.hasScopes([TwitchScopes.SET_STREAM_INFOS]); }
	public get canStartCommercial():boolean { return TwitchUtils.hasScopes([TwitchScopes.START_COMMERCIAL]) && this.hasChannelPoints; }
	public get canClearChat():boolean { return TwitchUtils.hasScopes([TwitchScopes.DELETE_MESSAGES]); }
	public get canRaid():boolean {
		//First check for channel.moderate v1 scope
		// TwitchUtils.hasScopes([TwitchScopes.START_RAID, TwitchScopes.MODERATION_EVENTS])
		//Alternatively check for all permissions required by channel.moderate v2
		// ||
		return TwitchUtils.hasScopes([TwitchScopes.START_RAID,
								TwitchScopes.BLOCKED_TERMS,
								TwitchScopes.SET_ROOM_SETTINGS,
								TwitchScopes.UNBAN_REQUESTS,
								TwitchScopes.EDIT_BANNED,
								TwitchScopes.DELETE_MESSAGES,
								TwitchScopes.CHAT_WARNING,
								TwitchScopes.READ_MODERATORS,
								TwitchScopes.READ_VIPS
		]);
	}
	public get isAdmin():boolean { return this.$store.auth.twitch.user.is_admin === true; }

	public get canCreatePrediction():boolean {
		if(!this.hasChannelPoints) return false;
		if(!TwitchUtils.hasScopes([TwitchScopes.MANAGE_PREDICTIONS])) return false;
		return this.$store.prediction.data?.id == undefined
			|| this.$store.prediction.data?.channel_id !== StoreProxy.auth.twitch.user.id;
	}

	public get canCreatePoll():boolean {
		if(!this.hasChannelPoints) return false;
		if(!TwitchUtils.hasScopes([TwitchScopes.MANAGE_POLLS])) return false;
		return this.$store.poll.data?.id == undefined
			|| this.$store.poll.data?.channel_id !== StoreProxy.auth.twitch.user.id;
	}

	public async beforeMount():Promise<void> {
		//Fake raid to test "raiding" card
		// this.$store.stream.currentRaid = {
		// 	channel_id:this.$store.auth.twitch.user.id,
		// 	startedAt:Date.now(),
		// 	timerDuration_s:9999999999,
		// 	user:this.$store.auth.twitch.user,
		// 	viewerCount:855,
		// };

		this.param_followOnly.labelKey		= "cmdmenu.followersOnly";
		this.param_subOnly.labelKey			= "cmdmenu.subsOnly";
		this.param_emotesOnly.labelKey		= "cmdmenu.emotesOnly";
		this.param_slowMode.labelKey		= "cmdmenu.slowMode";

		const uid = this.$store.auth.twitch.user.id;

		this.clickHandler = (e:MouseEvent) => this.onClick(e);
		document.addEventListener("mousedown", this.clickHandler);

		watch(()=>this.$store.stream.commercial[uid].prevAdStart_at, ()=>{
			this.adCooldown = this.$store.stream.commercial[uid].prevAdStart_at - Date.now();
		});

		const channelId = this.$store.auth.twitch.user.id;
		watch(()=>this.$store.stream.roomSettings[channelId], ()=>{
			this.populateSettings();
		}, {deep:true});

		this.adCooldown = Math.max(0, this.$store.stream.commercial[uid].prevAdStart_at - Date.now());
		this.adCooldownInterval = window.setInterval(()=>{
			if(this.adCooldown === 0) return;
			this.adCooldown -= 1000;
			if(this.adCooldown < 0) this.adCooldown = 0;
		}, 1000);

		this.populateSettings();
	}

	public async mounted():Promise<void> {
		await this.$nextTick();
		this.open();
	}

	public beforeUnmount():void {
		clearInterval(this.adCooldownInterval);
		document.removeEventListener("mousedown", this.clickHandler);
	}

	public startAd(duration:number):void {
		if(!this.canStartCommercial) {
			this.$store.auth.requestTwitchScopes([TwitchScopes.START_COMMERCIAL]);
		}else {
			const uid = this.$store.auth.twitch.user.id;
			this.$store.stream.startCommercial(uid, duration);
			this.close();
		}
	}

	public openModal(type:TwitchatDataTypes.ModalTypes):void {
		switch(type) {
			case "poll": {
				if(!this.hasChannelPoints) return;
				if(!TwitchUtils.hasScopes([TwitchScopes.MANAGE_POLLS])) {
					this.$store.auth.requestTwitchScopes([TwitchScopes.MANAGE_POLLS]);
					return;
				}
				if(!this.canCreatePoll) return;
				break;
			}
			case "pred": {
				if(!this.hasChannelPoints) return;
				if(!TwitchUtils.hasScopes([TwitchScopes.MANAGE_PREDICTIONS])) {
					this.$store.auth.requestTwitchScopes([TwitchScopes.MANAGE_PREDICTIONS]);
					return;
				}
				if(!this.canCreatePrediction) return;
				break;
			}
			case "streamInfo": {
				if(!TwitchUtils.hasScopes([TwitchScopes.SET_STREAM_INFOS])) {
					this.$store.auth.requestTwitchScopes([TwitchScopes.SET_STREAM_INFOS]);
					return;
				}
				break;
			}
			case "extensions": {
				if(!TwitchUtils.hasScopes([TwitchScopes.EXTENSIONS])) {
					this.$store.auth.requestTwitchScopes([TwitchScopes.EXTENSIONS]);
					return;
				}
				break;
			}
		}
		this.$store.params.openModal(type)
		this.close();
	}

	public clearChat():void {
		if(!TwitchUtils.hasScopes([TwitchScopes.DELETE_MESSAGES])) {
			this.$store.auth.requestTwitchScopes([TwitchScopes.DELETE_MESSAGES]);
		}else{
			this.$confirm(this.$t("params.clearChat_confirm_title"), this.$t("params.clearChat_confirm_desc"))
			.then(()=>{
				TwitchUtils.deleteMessages(this.$store.auth.twitch.user.id);
			}).catch(()=>{});
		}
	}

	private open():void {
		const ref = this.$el as HTMLDivElement;
		gsap.killTweensOf(ref);
		gsap.from(ref, {duration:.1, translateX:"-115%", delay:.2, ease:"sine.out"});
		gsap.fromTo(ref, {scaleX:1.1}, {duration:.5, delay:.3, scaleX:1, clearProps:"scaleX,translateX", ease:"elastic.out(1)"});

		// const elements = (this.$el as HTMLDivElement).childNodes;
		// let delay = .2;
		// elements.forEach(v=> {
		// 	gsap.from(v, {opacity:.1, duration:.25, delay, translateY:-10, ease:"sine.out"});
		// 	delay += .025;
		// })
	}

	public close():void {
		const ref = this.$el as HTMLDivElement;
		gsap.killTweensOf(ref);
		gsap.to(ref, {duration:.1, scaleX:1.1, ease:"sin.in"});
		gsap.to(ref, {duration:.1, translateX:"-100%", scaleX:1, delay:.1, clearProps:"translateX", ease:"sin.out", onComplete:() => {
			this.$emit("close");
		}});
	}

	/**
	 * Populates the settings from storage
	 */
	private async populateSettings():Promise<void> {
		this.ignoreUpdates = true;

		const channelId = this.$store.auth.twitch.user.id;
		let settings = this.$store.stream.roomSettings[channelId] ?? {};
		this.param_followOnly.value	= typeof settings.followOnly == "number";
		this.param_subOnly.value	= settings.subOnly;
		this.param_emotesOnly.value	= settings.emotesOnly;
		this.param_slowMode.value	= typeof settings.slowMode == "number" && settings.slowMode > 0;

		await this.$nextTick();
		this.ignoreUpdates = false;
	}

	/**
	 * Detect click outside view to close it
	 */
	private onClick(e:MouseEvent):void {
		let target = e.target as HTMLDivElement;
		const ref = this.$el as HTMLDivElement;
		while(target != document.body && target != ref && target) {
			target = target.parentElement as HTMLDivElement;
		}
		if(target != ref) {
			this.close();
		}
	}

	public async raid():Promise<void> {
		if(!this.raidUser) return;
		//This timeout avoids auto confirmation if submitting the form
		//with enter key
		await Utils.promisedTimeout(100);

		this.$confirm("Raid ?", "Are you sure you want to raid " + this.raidUser.login + " ?").then(async () => {
			TwitchUtils.raidChannel(this.raidUser!.login);
			this.raidUser = null;
		}).catch(()=> { });
	}

	public cancelRaid():void {
		TwitchUtils.raidCancel();
	}

	public setFollowOnly():void {
		if(this.ignoreUpdates) return;

		let settings:TwitchatDataTypes.IRoomSettings = {};
		settings.followOnly = this.param_followOnly.value === true? 30 : false;

		TwitchUtils.setRoomSettings(StoreProxy.auth.twitch.user.id, settings);
	}

	public setSubOnly():void {
		if(this.ignoreUpdates) return;

		let settings:TwitchatDataTypes.IRoomSettings = {};
		settings.subOnly = this.param_subOnly.value === true;

		TwitchUtils.setRoomSettings(StoreProxy.auth.twitch.user.id, settings);
	}

	public setEmoteOnly():void {
		if(this.ignoreUpdates) return;

		let settings:TwitchatDataTypes.IRoomSettings = {};
		settings.emotesOnly = this.param_emotesOnly.value === true;

		TwitchUtils.setRoomSettings(StoreProxy.auth.twitch.user.id, settings);
	}

	public setSlowMode():void {
		if(this.ignoreUpdates) return;

		let settings:TwitchatDataTypes.IRoomSettings = {};
		settings.slowMode = this.param_slowMode.value === true? 5 : 0;

		TwitchUtils.setRoomSettings(StoreProxy.auth.twitch.user.id, settings);
	}

	public requestRoomSettingsScopes():void {
		if(TwitchUtils.hasScopes([TwitchScopes.SET_ROOM_SETTINGS])) return;
		this.$store.auth.requestTwitchScopes([TwitchScopes.SET_ROOM_SETTINGS]);
	}

	public requestRaidScopes():void {
		const scopes = [TwitchScopes.START_RAID,
						TwitchScopes.BLOCKED_TERMS,
						TwitchScopes.SET_ROOM_SETTINGS,
						TwitchScopes.UNBAN_REQUESTS,
						TwitchScopes.EDIT_BANNED,
						TwitchScopes.DELETE_MESSAGES,
						TwitchScopes.CHAT_WARNING,
						TwitchScopes.READ_MODERATORS,
						TwitchScopes.READ_VIPS]
		if(TwitchUtils.hasScopes(scopes)) return;
		this.$store.auth.requestTwitchScopes(scopes);
	}

	public onTogglePin(pinId:typeof TwitchatDataTypes.PinnableMenuItems[number]["id"]):void {
		this.$store.params.toggleChatMenuPin(pinId);
	}

	public isPinned(pinId:typeof TwitchatDataTypes.PinnableMenuItems[number]["id"]):boolean {
		return this.$store.params.pinnedMenuItems.findIndex(v=>v == pinId) > -1;
	}
}
export default toNative(CommandHelper);
</script>

<style scoped lang="less">
.commandhelper{
	gap:10px;
	overflow-x: hidden;
	color: var(--color-text);

	.menuItem {
		display: flex;
		flex-direction: row;
		flex: 1;
		justify-content: stretch;
		.button {
			flex: 1;
		}
	}

	.commercial {
		display: flex;
		flex-direction: row;
		margin: 0 auto;
		.cooldown {
			max-width: 300px;
			font-size: .8em;
			margin: auto;
			text-align: center;
			background-color: var(--color-alert);
		}
		.button {
			padding-left: .5em;
			padding-right: .5em;
		}
		.button:first-child {
			border-top-right-radius: 0;
			border-bottom-right-radius: 0;
		}

		.button:not(:last-child) {
			border-right: 1px solid var(--color-text);
		}

		.button:not(:first-child):not(:last-child) {
			border-radius: 0;
		}

		.button:last-child {
			border-top-left-radius: 0;
			border-bottom-left-radius: 0;
		}
	}

	.raid {
		display: flex;
		flex-direction: column;
		gap: .5em;
		overflow: visible;
		.title {
			align-self: center;
			.icon {
				height: .9em;
				margin-right: .5em;
			}
		}

		.raidForm {
			:deep(input) {
				background-color: var(--background-color-fader);
			}
		}

		.whoStreams {
			text-align: center;
			font-size: .8em;
			color: var(--color-text);
			&:hover {
				text-decoration: underline;
			}
		}

		.missingScope {
			max-width: 300px;
			background-color: var(--color-primary);
			border-radius: var(--border-radius);
			padding: .5em;
			p {
				font-size: .8em;
				text-align: center;
			}
			.button {
				margin: auto;
				margin-top: .5em;
				display: flex;
			}
		}
	}
}

@media only screen and (max-width: 285px) {
	.commandhelper {
		.commercial {
			.button:nth-last-child(1) {
				display: none;
			}
		}
	}
}

@media only screen and (max-width: 240px) {
	.commandhelper {
		.commercial {
			.button:nth-last-child(2) {
				display: none;
			}
		}
	}
}
</style>
