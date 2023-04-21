<template>
	<div :class="classes">
		<Button @click.capture="openModal('poll');"		icon="poll"			:disabled="!canCreatePoll" v-tooltip="hasChannelPoints? '' : $t('cmdmenu.not_affiliate')">{{$t('cmdmenu.poll')}}</Button>
		<Button @click.capture="openModal('pred');"		icon="prediction"	:disabled="!canCreatePrediction" v-tooltip="hasChannelPoints? '' : $t('cmdmenu.not_affiliate')">{{$t('cmdmenu.prediction')}}</Button>
		<Button @click.capture="openModal('raffle');"		icon="ticket"		>{{$t('cmdmenu.raffle')}}</Button>
		<Button @click.capture="openModal('bingo');"		icon="bingo"		>{{$t('cmdmenu.bingo')}}</Button>
		<Button @click.capture="openModal('chatpoll');"	icon="chatPoll"		>{{$t('cmdmenu.suggestions')}}</Button>
		<Button @click.capture="openModal('timer');"		icon="timer"		>{{$t('cmdmenu.timer')}}</Button>
		<Button @click.capture="clearChat();"				icon="clearChat"	:disabled="!canClearChat">{{$t('cmdmenu.chat')}}</Button>
		<Button @click.capture="openModal('streamInfo');"	icon="info"			:disabled="!canEditStreamInfos">{{$t('cmdmenu.info')}}</Button>

		<div class="commercial" v-tooltip="hasChannelPoints? '' : $t('cmdmenu.not_affiliate')">
			<Button aria-label="Start a 30s ad"		v-if="adCooldown == 0" small @click.capture="startAd(30);" icon="coin" bounce :disabled="!canStartCommercial">{{ $t('cmdmenu.start_ad') }}</Button>
			<Button aria-label="Start a 60s ad"		v-if="adCooldown == 0" small @click.capture="startAd(60);" bounce :disabled="!canStartCommercial">60s</Button>
			<Button aria-label="Start a 90s ad"		v-if="adCooldown == 0" small @click.capture="startAd(90);" bounce :disabled="!canStartCommercial">90s</Button>
			<Button aria-label="Start a 120s ad"	v-if="adCooldown == 0" small @click.capture="startAd(120);" bounce :disabled="!canStartCommercial">120s</Button>
			<Button aria-label="Start a 180s ad"	v-if="adCooldown == 0" small @click.capture="startAd(180);" bounce :disabled="!canStartCommercial">180s</Button>
			<div v-if="adCooldown > 0" class="cooldown">{{$t('cmdmenu.commercial', {DURATION:adCooldownFormated})}}</div>
		</div>
		
		<ParamItem class="roomParam" :paramData="param_followOnly"		@change="setFollowOnly()"	clearToggle @click="requestRoomSettingsScopes()" />
		<ParamItem class="roomParam" :paramData="param_subOnly"			@change="setSubOnly()"	clearToggle @click="requestRoomSettingsScopes()" />
		<ParamItem class="roomParam" :paramData="param_emotesOnly"		@change="setEmoteOnly()"	clearToggle @click="requestRoomSettingsScopes()" />
		<ParamItem class="roomParam" :paramData="param_slowMode"		@change="setSlowMode()"	clearToggle @click="requestRoomSettingsScopes()" />
		
		<div class="raid" v-if="$store('stream').currentRaid">
			<label for="raid_input"><img src="@/assets/icons/raid.svg" alt="raid">Raiding {{$store('stream').currentRaid!.user.displayName}}</label>
			<Button aria-label="Cancel raid" @click="cancelRaid()" type="button" icon="cross_white" bounce highlight title="Cancel" />
		</div>

		<div class="raid" v-else>
			<label for="raid_input"><img src="@/assets/icons/raid.svg" alt="raid">{{$t('cmdmenu.raid')}}</label>
			<form @submit.prevent="raid()" v-if="canRaid">
				<input id="raid_input" type="text" :placeholder="$t('cmdmenu.raid_placeholder')" v-model="raidUser" maxlength="50">
				<Button class="button"
					aria-label="Start raid"
					type="submit"
					icon="checkmark" :disabled="raidUser.length < 3" />
			</form>
			<div v-else class="missingScope">
				<p>{{ $t('cmdmenu.scope_grant') }}</p>
				<Button icon="unlock" alert small @click="requestRaidScopes()" >{{$t('cmdmenu.scope_grantBt')}}</Button>
			</div>
			<a class="whoStreams" @click.prevent="openModal('liveStreams')">{{ $t("cmdmenu.whoslive") }}</a>
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
	emits:[ "close" ]
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
		}else if(this.canStartCommercial){
			this.$store("stream").startCommercial(duration);
			this.close();
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
		this.$store("params").currentModal = type;
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
	gap:10px;
	overflow-x: hidden;

	.commercial {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		.cooldown {
			.card();
			max-width: 300px;
			font-size: .8em;
			margin: auto;
			padding: .5em;
			text-align: center;
			background-color: var(--color-alert);
		}
	}

	.raid {
		.card();
		display: flex;
		flex-direction: column;
		padding: .5em;
		color: var(--color-light);
		label {
			align-self: center;
			img {
				height: .9em;
				margin-right: .5em;
			}
		}

		form {
			display: flex;
			flex-direction: row;
			border-radius: var(--border_radius);
			input {
				width: 100%;
				border-top-right-radius: 0;
				border-bottom-right-radius: 0;
			}
			.button {
				flex-grow: 1;
				:deep(.background) {
					border-radius: var(--border_radius);
					border-top-left-radius: 0;
					border-bottom-left-radius: 0;
				}
			}
		}

		.whoStreams {
			text-align: center;
			font-size: .8em;
			margin-top: .5em;
		}

		.missingScope {
			max-width: 300px;
			background-color: var(--color-primary);
			border-radius: var(--border_radius);
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