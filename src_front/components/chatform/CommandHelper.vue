<template>
	<div :class="classes">
		<Button small @click.capture="openModal('poll');"		:icon="$image('icons/poll.svg')"		:title="$t('cmdmenu.poll')" :disabled="!canCreatePoll" class="needsAffiliate" />
		<Button small @click.capture="openModal('pred');"		:icon="$image('icons/prediction.svg')"	:title="$t('cmdmenu.prediction')" :disabled="!canCreatePrediction" class="needsAffiliate" />
		<Button small @click="openModal('raffle');"				:icon="$image('icons/ticket.svg')"		:title="$t('cmdmenu.raffle')" />
		<Button small @click="openModal('bingo');"				:icon="$image('icons/bingo.svg')"		:title="$t('cmdmenu.bingo')" />
		<Button small @click="openModal('chatpoll');"			:icon="$image('icons/chatPoll.svg')"	:title="$t('cmdmenu.suggestions')" />
		<Button small @click="openModal('timer');"				:icon="$image('icons/timer.svg')"		:title="$t('cmdmenu.timer')" />
		<Button small @click.capture="clearChat();"				:icon="$image('icons/clearChat.svg')"	:title="$t('cmdmenu.chat')" :disabled="!canClearChat" />
		<Button small @click.capture="openModal('streamInfo');"	:icon="$image('icons/info.svg')"		:title="$t('cmdmenu.info')" :disabled="!canEditStreamInfos" />

		<div class="commercial">
			<Button aria-label="Start a 30s ad" v-if="adCooldown == 0" small @click.capture="startAd(30); close();" :icon="$image('icons/coin.svg')" title="Start ad 30s" bounce :disabled="!canStartCommercial" />
			<Button aria-label="Start a 60s ad" v-if="adCooldown == 0" small @click.capture="startAd(60); close();" title="60s" bounce :disabled="!canStartCommercial" />
			<Button aria-label="Start a 90s ad" v-if="adCooldown == 0" small @click.capture="startAd(90); close();" title="90s" bounce :disabled="!canStartCommercial" />
			<Button aria-label="Start a 120s ad" v-if="adCooldown == 0" small @click.capture="startAd(120); close();" title="120s" bounce :disabled="!canStartCommercial" />
			<Button aria-label="Start a 180s ad" v-if="adCooldown == 0" small @click.capture="startAd(180); close();" title="180s" bounce :disabled="!canStartCommercial" />
			<div v-if="adCooldown > 0" class="cooldown">{{$t('cmdmenu.commercial', {DURATION:adCooldownFormated})}}</div>
		</div>
		
		<ParamItem class="roomParam" :paramData="param_followOnly" @change="setFollowOnly()" clearToggle @click="requestRoomSettingsScopes()" />
		<ParamItem class="roomParam" :paramData="param_subOnly" @change="setSubOnly()" clearToggle @click="requestRoomSettingsScopes()" />
		<ParamItem class="roomParam" :paramData="param_emotesOnly" @change="setEmoteOnly()" clearToggle @click="requestRoomSettingsScopes()" />
		<ParamItem class="roomParam" :paramData="param_slowMode" @change="setSlowMode()" clearToggle @click="requestRoomSettingsScopes()" />
		
		<div class="raid" v-if="$store('stream').currentRaid">
			<label for="raid_input"><img src="@/assets/icons/raid.svg" alt="raid">Raiding {{$store('stream').currentRaid!.user.displayName}}</label>
			<Button aria-label="Cancel raid" @click="cancelRaid()" type="button" :icon="$image('icons/cross_white.svg')" bounce highlight title="Cancel" />
		</div>

		<div class="raid" v-else>
			<label for="raid_input"><img src="@/assets/icons/raid.svg" alt="raid">{{$t('cmdmenu.raid')}}</label>
			<form @submit.prevent="raid()" v-if="canRaid">
				<input class="dark" id="raid_input" type="text" placeholder="user name..." v-model="raidUser" maxlength="50">
				<Button aria-label="Start raid" type="submit" :icon="$image('icons/checkmark_white.svg')" bounce small :disabled="raidUser.length < 3" />
			</form>
			<div v-else class="missingScope">
				<p>{{ $t('cmdmenu.scope_grant') }}</p>
				<Button :icon="$image('icons/unlock.svg')" bounce highlight small :title="$t('cmdmenu.scope_grantBt')" @click="requestRaidScopes()" />
			</div>
			<a class="followings" @click.prevent="openModal('liveStreams')">{{ $t("cmdmenu.whoslive") }}</a>
		</div>
	</div>
</template>

<script lang="ts">
import StoreProxy from '@/store/StoreProxy';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap';
import { Component, Vue } from 'vue-facing-decorator';
import Button from '../Button.vue';
import ParamItem from '../params/ParamItem.vue';

@Component({
	components:{
		Button,
		ParamItem,
	},
	emits:[ "openModal", "close" ]
})
export default class CommandHelper extends Vue {
	
	public raidUser:string = "";
	public channelId:string = "";
	public adCooldown:number = 0;
	
	public param_followOnly:TwitchatDataTypes.ParameterData<boolean>			= { type:"boolean", value:false, twitch_scopes:[TwitchScopes.SET_ROOM_SETTINGS] };
	public param_subOnly:TwitchatDataTypes.ParameterData<boolean|undefined>		= { type:"boolean", value:false, twitch_scopes:[TwitchScopes.SET_ROOM_SETTINGS] };
	public param_emotesOnly:TwitchatDataTypes.ParameterData<boolean|undefined>	= { type:"boolean", value:false, twitch_scopes:[TwitchScopes.SET_ROOM_SETTINGS] };
	public param_slowMode:TwitchatDataTypes.ParameterData<boolean>				= { type:"boolean", value:false, twitch_scopes:[TwitchScopes.SET_ROOM_SETTINGS] };

	private ignoreUpdates = false;
	private adCooldownInterval = 0;

	public get classes():string[] {
		const res = ["commandhelper"];
		if(this.hasChannelPoints) res.push("isAffiliate")
		return res;
	}

	private clickHandler!:(e:MouseEvent) => void;
	
	public get adCooldownFormated():string { return Utils.formatDuration(this.adCooldown); }
	public get hasChannelPoints():boolean { return this.$store("auth").twitch.user.is_affiliate || this.$store("auth").twitch.user.is_partner; }
	public get canEditStreamInfos():boolean { return TwitchUtils.hasScopes([TwitchScopes.SET_STREAM_INFOS]); }
	public get canStartCommercial():boolean { return TwitchUtils.hasScopes([TwitchScopes.START_COMMERCIAL]) && this.hasChannelPoints; }
	public get canClearChat():boolean { return TwitchUtils.hasScopes([TwitchScopes.DELETE_MESSAGES]); }
	public get canRaid():boolean { return TwitchUtils.hasScopes([TwitchScopes.START_RAID]); }

	public get canCreatePrediction():boolean {
		if(!this.hasChannelPoints) return false;
		if(!TwitchUtils.hasScopes([TwitchScopes.MANAGE_PREDICTIONS])) return false;
		return this.$store("prediction").data?.id == undefined
			|| this.$store("prediction").data?.channel_id !== StoreProxy.auth.twitch.user.id;
	}

	public get canCreatePoll():boolean {
		if(!this.hasChannelPoints) return false;
		if(!TwitchUtils.hasScopes([TwitchScopes.MANAGE_POLLS])) return false;
		return this.$store("poll").data?.id == undefined
			|| this.$store("poll").data?.channel_id !== StoreProxy.auth.twitch.user.id;
	}

	public async beforeMount():Promise<void> {
	
		this.param_followOnly.labelKey		= "cmdmenu.followersOnly";
		this.param_subOnly.labelKey			= "cmdmenu.subsOnly";
		this.param_emotesOnly.labelKey		= "cmdmenu.emotesOnly";
		this.param_slowMode.labelKey		= "cmdmenu.slowMode";

		this.clickHandler = (e:MouseEvent) => this.onClick(e);
		document.addEventListener("mousedown", this.clickHandler);

		watch(()=>this.$store("stream").startAdCooldown, ()=>{
			this.adCooldown = this.$store("stream").startAdCooldown - Date.now();
		});

		const channelId = this.$store("auth").twitch.user.id;
		watch(()=>this.$store("stream").roomSettings[channelId], ()=>{
			this.populateSettings();
		}, {deep:true});

		this.adCooldown = Math.max(0, this.$store("stream").startAdCooldown - Date.now());
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
		if(!TwitchUtils.hasScopes([TwitchScopes.START_COMMERCIAL])) {
			this.$store("auth").requestTwitchScopes([TwitchScopes.START_COMMERCIAL]);
		}else{
			this.$store("stream").startCommercial(duration);
		}
	}

	public openModal(type:TwitchatDataTypes.ModalTypes):void {
		switch(type) {
			case "poll": {
				if(!this.hasChannelPoints) return;
				if(!TwitchUtils.hasScopes([TwitchScopes.MANAGE_POLLS])) {
					this.$store("auth").requestTwitchScopes([TwitchScopes.MANAGE_POLLS]);
					return;
				}break;
			}
			case "pred": {
				if(!this.hasChannelPoints) return;
				if(!TwitchUtils.hasScopes([TwitchScopes.MANAGE_PREDICTIONS])) {
					this.$store("auth").requestTwitchScopes([TwitchScopes.MANAGE_PREDICTIONS]);
					return;
				}break;
			}
			case "streamInfo": {
				if(!TwitchUtils.hasScopes([TwitchScopes.SET_STREAM_INFOS])) {
					this.$store("auth").requestTwitchScopes([TwitchScopes.SET_STREAM_INFOS]);
					return;
				}break;
			}
		}
		this.$emit("openModal", type);
		this.close();
	}

	public clearChat():void {
		if(!TwitchUtils.hasScopes([TwitchScopes.DELETE_MESSAGES])) {
			this.$store("auth").requestTwitchScopes([TwitchScopes.DELETE_MESSAGES]);
		}else{
			TwitchUtils.deleteMessages(StoreProxy.auth.twitch.user.id);
		}
	}

	private open():void {
		const ref = this.$el as HTMLDivElement;
		gsap.killTweensOf(ref);
		gsap.from(ref, {duration:.2, scaleX:0, delay:.1, clearProps:"scaleX", ease:"back.out"});
		gsap.from(ref, {duration:.3, scaleY:0, clearProps:"scaleY", ease:"back.out"});
	}

	public close():void {
		const ref = this.$el as HTMLDivElement;
		gsap.killTweensOf(ref);
		gsap.to(ref, {duration:.3, scaleX:0, ease:"back.in"});
		gsap.to(ref, {duration:.2, scaleY:0, delay:.1, clearProps:"scaleY, scaleX", ease:"back.in", onComplete:() => {
			this.$emit("close");
		}});
	}

	/**
	 * Populates the settings from storage
	 */
	private async populateSettings():Promise<void> {
		this.ignoreUpdates = true;

		const channelId = this.$store("auth").twitch.user.id;
		let settings = this.$store("stream").roomSettings[channelId] ?? {};
		this.param_followOnly.value	= typeof settings.followOnly == "number";
		this.param_subOnly.value	= settings.subOnly;
		this.param_emotesOnly.value	= settings.emotesOnly;
		this.param_slowMode.value	= typeof settings.slowMode == "number";

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
		//This timeout avoids auto confirmation if submitting the form
		//with enter key
		await Utils.promisedTimeout(100);
		
		this.$confirm("Raid ?", "Are you sure you want to raid " + this.raidUser + " ?").then(async () => {
			TwitchUtils.raidChannel(this.raidUser);
			this.raidUser = "";
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
		this.$store("auth").requestTwitchScopes([TwitchScopes.SET_ROOM_SETTINGS]);
	}

	public requestRaidScopes():void {
		if(TwitchUtils.hasScopes([TwitchScopes.START_RAID])) return;
		this.$store("auth").requestTwitchScopes([TwitchScopes.START_RAID]);
	}
}
</script>

<style scoped lang="less">
.commandhelper{
	.window();
	gap:.25em;
	overflow-x: hidden;

	&:not(.isAffiliate) {
		.button.disabled.needsAffiliate {
			cursor: not-allowed;
		}
	}
	
	.button:not([type="submit"]) {
		:deep(img) {
			max-width: 20px;
		}
		:deep(.label) {
			white-space: normal;
		}
		&.disabled {
			cursor: help;
		}
	}

	.commercial {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		.cooldown {
			max-width: 300px;
			font-size: .8em;
			margin: auto;
			background: fade(@mainColor_normal, 20%);
			padding: .5em;
			border-radius: @border_radius;
			text-align: center;
		}
	}

	.roomParam {
		background: fade(@mainColor_normal, 20%);
		padding: .3em;
		font-size: .8em;
		color: @mainColor_light;
		border-radius: @border_radius;
		&.disabled {
			opacity: .5;
			cursor: help;
		}
	}

	.raid {
		display: flex;
		flex-direction: column;
		background-color: @mainColor_dark_light;
		padding: 10px;
		border-radius: 10px;
		label {
			align-self: center;
			color: @mainColor_light;
			font-size: .9em;
			img {
				height: .9em;
				margin-right: .5em;
			}
		}

		form {
			display: flex;
			flex-direction: row;
			input {
				width: 100%;
				border-top-right-radius: 0;
				border-bottom-right-radius: 0;
			}
			.button {
				flex-grow: 1;
				border-top-left-radius: 0;
				border-bottom-left-radius: 0;
				transform-origin: left;
			}
		}

		.followings {
			text-align: center;
			font-size: .8em;
			margin-top: .5em;
			color: @mainColor_light;
			&:hover {
				color: @mainColor_normal_light;
			}
		}

		.missingScope {
			max-width: 300px;
			background-color: @mainColor_warn;
			border-radius: @border_radius;
			padding: .5em;
			p {
				font-size: .7em;
				color: @mainColor_light;
				text-align: center;
			}
			.button {
				margin: .5em auto 0 auto;
				display: block;
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