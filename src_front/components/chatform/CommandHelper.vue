<template>
	<div class="commandhelper">
		<Button small @click="openModal('poll');"		:icon="$image('icons/poll.svg')"		:title="$t('cmdmenu.poll')" :disabled="!canCreatePoll" />
		<Button small @click="openModal('pred');"		:icon="$image('icons/prediction.svg')"	:title="$t('cmdmenu.prediction')" :disabled="!canCreatePrediction" />
		<Button small @click="openModal('raffle');"		:icon="$image('icons/ticket.svg')"		:title="$t('cmdmenu.raffle')" />
		<Button small @click="openModal('bingo');"		:icon="$image('icons/bingo.svg')"		:title="$t('cmdmenu.bingo')" />
		<Button small @click="openModal('chatpoll');"	:icon="$image('icons/chatPoll.svg')"	:title="$t('cmdmenu.suggestions')" />
		<Button small @click="openModal('timer');"		:icon="$image('icons/timer.svg')"		:title="$t('cmdmenu.timer')" />
		<Button small @click="clearChat();"				:icon="$image('icons/clearChat.svg')"	:title="$t('cmdmenu.chat')" />
		<Button small @click="openModal('streamInfo');"	:icon="$image('icons/info.svg')"		:title="$t('cmdmenu.info')" />

		<div class="commercial">
			<Button aria-label="Start a 30s ad" v-if="adCooldown == 0" small @click="startAd(30); close();" :icon="$image('icons/coin.svg')" title="Start ad 30s" bounce :disabled="!hasChannelPoints" />
			<Button aria-label="Start a 60s ad" v-if="adCooldown == 0" small @click="startAd(60); close();" title="60s" bounce :disabled="!hasChannelPoints" />
			<Button aria-label="Start a 90s ad" v-if="adCooldown == 0" small @click="startAd(90); close();" title="90s" bounce :disabled="!hasChannelPoints" />
			<Button aria-label="Start a 120s ad" v-if="adCooldown == 0" small @click="startAd(120); close();" title="120s" bounce :disabled="!hasChannelPoints" />
			<Button aria-label="Start a 180s ad" v-if="adCooldown == 0" small @click="startAd(180); close();" title="180s" bounce :disabled="!hasChannelPoints" />
			<div v-if="adCooldown > 0" class="cooldown">{{$t('cmdmenu.commercial', {DURATION:adCooldownFormated})}}</div>
		</div>
		
		<ParamItem class="roomParam" :paramData="param_followOnly" @change="updateRoomSettings()" clearToggle />
		<ParamItem class="roomParam" :paramData="param_subOnly" @change="updateRoomSettings()" clearToggle />
		<ParamItem class="roomParam" :paramData="param_emotesOnly" @change="updateRoomSettings()" clearToggle />
		<ParamItem class="roomParam" :paramData="param_slowMode" @change="updateRoomSettings()" clearToggle />
		
		<div class="raid" v-if="$store('stream').currentRaid">
			<label for="raid_input"><img src="@/assets/icons/raid.svg" alt="raid">Raiding {{$store('stream').currentRaid!.user.displayName}}</label>
			<Button aria-label="Cancel raid" @click="cancelRaid()" type="button" :icon="$image('icons/cross_white.svg')" bounce highlight title="Cancel" />
		</div>
		<div class="raid" v-else>
			<label for="raid_input"><img src="@/assets/icons/raid.svg" alt="raid">{{$t('cmdmenu.raid')}}</label>
			<form @submit.prevent="raid()">
				<input class="dark" id="raid_input" type="text" placeholder="user name..." v-model="raidUser" maxlength="50">
				<Button aria-label="Start raid" type="submit" :icon="$image('icons/checkmark_white.svg')" bounce small :disabled="raidUser.length < 3" />
			</form>
			<a class="followings" @click.prevent="openLiveFollowings()" v-t="'cmdmenu.whoslive'"></a>
		</div>
	</div>
</template>

<script lang="ts">
import StoreProxy from '@/store/StoreProxy';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ParamItem from '../params/ParamItem.vue';

@Options({
	props:{
	},
	components:{
		Button,
		ParamItem,
	},
	emits:[ "openModal" ]
})
export default class CommandHelper extends Vue {
	
	public raidUser:string = "";
	public channelId:string = "";
	public adCooldown:number = 0;
	
	public param_followOnly:TwitchatDataTypes.ParameterData	= { type:"toggle", value:false, label:"Followers only" };
	public param_subOnly:TwitchatDataTypes.ParameterData	= { type:"toggle", value:false, label:"Subs only" };
	public param_emotesOnly:TwitchatDataTypes.ParameterData	= { type:"toggle", value:false, label:"Emotes only" };
	public param_slowMode:TwitchatDataTypes.ParameterData	= { type:"toggle", value:false, label:"Slow mode" };

	private ignoreUpdates = false;
	private adCooldownInterval = 0;

	private clickHandler!:(e:MouseEvent) => void;
	
	public get params():TwitchatDataTypes.IRoomSettings { return this.$store("stream").roomSettings["twitch"]!; }
	public get adCooldownFormated():string {
		return Utils.formatDuration(this.adCooldown);
	}

	public get canCreatePrediction():boolean {
		return this.$store("prediction").data?.id == undefined && this.hasChannelPoints === true;
	}

	public get hasChannelPoints():boolean {
		return this.$store("auth").twitch.user.is_affiliate || this.$store("auth").twitch.user.is_partner;
	}

	public get canCreatePoll():boolean {
		if(!this.hasChannelPoints) return false;
		return this.$store("poll").data == null;
	}

	public async beforeMount():Promise<void> {
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
		this.$store("stream").startAd(duration);
	}

	public openModal(type:TwitchatDataTypes.ModalTypes):void {
		this.$emit("openModal", type);
		this.close();
	}

	public clearChat():void {
		TwitchUtils.deleteMessages(StoreProxy.auth.twitch.user.id);
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

	public updateRoomSettings():void {
		if(this.ignoreUpdates) return;

		let settings:TwitchatDataTypes.IRoomSettings = {};
		settings.emotesOnly = this.param_emotesOnly.value === true;
		settings.followOnly = this.param_followOnly.value === true? 30 : false;
		settings.subOnly = this.param_subOnly.value === true;
		settings.slowMode = this.param_slowMode.value === true? 5 : 0;

		TwitchUtils.setRoomSettings(StoreProxy.auth.twitch.user.id, settings);
	}

	public openLiveFollowings():void {
		this.close();
		this.$emit("liveStreams");
	}
}
</script>

<style scoped lang="less">
.commandhelper{
	.window();
	gap:.25em;
	overflow-x: hidden;
	
	.button {
		:deep(img) {
			max-width: 20px;
		}
		:deep(.label) {
			white-space: normal;
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