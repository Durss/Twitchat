<template>
	<div class="commandhelper">
		<Button small @click="$emit('poll'); close();" :icon="$image('icons/poll.svg')" title="Create poll" bounce :disabled="!canCreatePoll" />
		<Button small @click="$emit('pred'); close();" :icon="$image('icons/prediction.svg')" title="Create prediction" bounce :disabled="!canCreatePrediction" />
		<Button small @click="$emit('raffle'); close();" :icon="$image('icons/ticket.svg')" title="Create raffle" bounce />
		<Button small @click="$emit('bingo'); close();" :icon="$image('icons/bingo.svg')" title="Create bingo" bounce />
		<Button small @click="$emit('chatpoll'); close();" :icon="$image('icons/chatPoll.svg')" title="Chat suggestions" bounce />
		<Button small @click="$emit('clear'); close();" :icon="$image('icons/clearChat.svg')" title="Clear chat" bounce />
		<Button small @click="$emit('streamInfo'); close();" :icon="$image('icons/info.svg')" title="Stream info" bounce />

		<div class="commercial">
			<Button aria-label="Start a 30s ad" v-if="adCooldown == 0" small @click="$emit('ad', 30); close();" :icon="$image('icons/coin.svg')" title="Start ad 30s" bounce :disabled="!hasChannelPoints" />
			<Button aria-label="Start a 60s ad" v-if="adCooldown == 0" small @click="$emit('ad', 60); close();" title="60s" bounce :disabled="!hasChannelPoints" />
			<Button aria-label="Start a 90s ad" v-if="adCooldown == 0" small @click="$emit('ad', 90); close();" title="90s" bounce :disabled="!hasChannelPoints" />
			<Button aria-label="Start a 120s ad" v-if="adCooldown == 0" small @click="$emit('ad', 120); close();" title="120s" bounce :disabled="!hasChannelPoints" />
			<Button aria-label="Start a 180s ad" v-if="adCooldown == 0" small @click="$emit('ad', 180); close();" title="180s" bounce :disabled="!hasChannelPoints" />
			<div v-if="adCooldown > 0" class="cooldown">You can start a new<br>commercial in {{adCooldownFormated}}</div>
		</div>

		<div v-for="(p,key) in params" :key="key">
			<ParamItem :paramData="p" @change="onChangeParam(key as string, p)" />
		</div>
		<div class="raid" v-if="$store('stream').currentRaid">
			<label for="raid_input"><img src="@/assets/icons/raid.svg" alt="raid">Raiding {{$store('stream').currentRaid!.user.displayName}}</label>
			<Button aria-label="Cancel raid" @click="cancelRaid()" type="button" :icon="$image('icons/cross_white.svg')" bounce highlight title="Cancel" />
		</div>
		<div class="raid" v-else>
			<label for="raid_input"><img src="@/assets/icons/raid.svg" alt="raid">Raid someone</label>
			<form @submit.prevent="raid()">
				<input class="dark" id="raid_input" type="text" placeholder="user name..." v-model="raidUser" maxlength="50">
				<Button aria-label="Start raid" type="submit" :icon="$image('icons/checkmark_white.svg')" bounce small :disabled="raidUser.length < 3" />
			</form>
			<a class="followings" @click.prevent="openLiveFollowings()">Who's live ?</a>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { TwitchDataTypes } from '@/types/TwitchDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import UserSession from '@/utils/UserSession';
import Utils from '@/utils/Utils';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ParamItem from '../params/ParamItem.vue';

@Options({
	props:{
		startAdCooldown:Number,
	},
	components:{
		Button,
		ParamItem,
	},
	emits:[
		"ad",
		"poll",
		"pred",
		"clear",
		"bingo",
		"close",
		"raffle",
		"chatpoll",
		"streamInfo",
		"liveStreams",
	]
})
export default class CommandHelper extends Vue {
	
	public startAdCooldown!:number;
	public raidUser = "";
	public adCooldown = 0;
	private adCooldownInterval = 0;

	private clickHandler!:(e:MouseEvent) => void;
	
	public get params():TwitchatDataTypes.IRoomStatusCategory { return this.$store("stream").roomStatusParams["twitch"]!; }
	public get adCooldownFormated():string {
		return Utils.formatDuration(this.adCooldown);
	}

	public get canCreatePrediction():boolean {
		return this.$store("prediction").data?.id == undefined && this.hasChannelPoints === true;
	}

	public get hasChannelPoints():boolean {
		return UserSession.instance.hasChannelPoints === true;
	}

	public get canCreatePoll():boolean {
		if(!this.hasChannelPoints) return false;
		return this.$store("poll").data == null;
	}

	public async mounted():Promise<void> {
		await this.$nextTick();
		this.clickHandler = (e:MouseEvent) => this.onClick(e);
		document.addEventListener("mousedown", this.clickHandler);
		this.open();

		watch(()=>this.startAdCooldown, ()=>{
			this.adCooldown = this.startAdCooldown - Date.now();
		})
		this.adCooldown = Math.max(0, this.startAdCooldown - Date.now());
		this.adCooldownInterval = window.setInterval(()=>{
			this.adCooldown -= 1000;
			if(this.adCooldown < 0) this.adCooldown = 0;
		}, 1000);
	}

	public beforeUnmount():void {
		clearInterval(this.adCooldownInterval);
		document.removeEventListener("mousedown", this.clickHandler);
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

	public onChangeParam(key:string, p:TwitchatDataTypes.ParameterData):void {
		let settings:TwitchDataTypes.RoomSettingsUpdate = {};
		switch(key) {
			case "emotesOnly": {
				settings.emotesOnly = p.value === true;
				break;
			}
			case "followersOnly": {
				settings.followOnly = p.value === true? 30 : false;
				break;
			}
			case "subsOnly": {
				settings.subOnly = p.value === true;
				break;
			}
			case "slowMode": {
				settings.slowMode = p.value === true? 5 : 0;
				break;
			}
		}
		TwitchUtils.setRoomSettings(settings);
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
	
	&>*:not(:last-child) {
		margin-bottom: .25em;
	}
	.button {
		:deep(img) {
			max-width: 20px;
		}
	}

	.commercial {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		margin-bottom: .5em;
		.cooldown {
			font-size: .8em;
			margin: auto;
		}
	}

	.raid {
		display: flex;
		flex-direction: column;
		background-color: @mainColor_dark_light;
		padding: 10px;
		border-radius: 10px;
		label {
			color: @mainColor_light;
			img {
				height: 20px;
				margin-right: 10px;
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
			color: @mainColor_normal;
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