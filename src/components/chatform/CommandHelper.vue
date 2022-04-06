<template>
	<div class="commandhelper">
		<Button small @click="$emit('poll'); close();" :icon="require('@/assets/icons/poll.svg')" title="Create poll" bounce :disabled="!canCreatePoll" />
		<Button small @click="$emit('pred'); close();" :icon="require('@/assets/icons/prediction.svg')" title="Create prediction" bounce :disabled="!canCreatePrediction" />
		<Button small @click="$emit('raffle'); close();" :icon="require('@/assets/icons/ticket.svg')" title="Create raffle" bounce />
		<Button small @click="$emit('bingo'); close();" :icon="require('@/assets/icons/bingo.svg')" title="Create bingo" bounce />
		<Button small @click="$emit('clear'); close();" :icon="require('@/assets/icons/clearChat.svg')" title="Clear chat" bounce />

		<div class="commercial">
			<Button small @click="$emit('ad', 30); close();" :icon="require('@/assets/icons/coin.svg')" title="Start ad 30s" bounce />
			<Button small @click="$emit('ad', 60); close();" title="60s" bounce />
			<Button small @click="$emit('ad', 90); close();" title="90s" bounce />
			<Button small @click="$emit('ad', 120); close();" title="120s" bounce />
			<Button small @click="$emit('ad', 180); close();" title="180s" bounce />
		</div>

		<div v-for="(p,key) in params" :key="key">
			<ParamItem :paramData="p" @change="onChangeParam(key, p)" />
		</div>
		<div class="raid" v-if="$store.state.raiding == null">
			<label for="raid_input"><img src="@/assets/icons/raid.svg" alt="raid">Raid someone</label>
			<form @submit.prevent="raid()">
				<input class="dark" id="raid_input" type="text" placeholder="user name..." v-model="raidUser" maxlength="50">
				<Button type="submit" :icon="require('@/assets/icons/checkmark_white.svg')" bounce small :disabled="raidUser.length < 3" />
			</form>
			<a class="followings" @click.prevent="openLiveFollowings()">Who's live ?</a>
		</div>
		<div class="raid" v-else>
			<label for="raid_input"><img src="@/assets/icons/raid.svg" alt="raid">Raiding {{$store.state.raiding.target_display_name}}</label>
			<Button @click="cancelRaid()" type="button" :icon="require('@/assets/icons/cross_white.svg')" bounce highlight title="Cancel" />
		</div>
	</div>
</template>

<script lang="ts">
import store, { ParameterData } from '@/store';
import IRCClient from '@/utils/IRCClient';
import { TwitchTypes } from '@/utils/TwitchUtils';
import Utils from '@/utils/Utils';
import gsap from 'gsap/all';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ParamItem from '../params/ParamItem.vue';

@Options({
	props:{},
	components:{
		Button,
		ParamItem,
	},
	emits:["close","poll","pred","clear","raffle","bingo","liveStreams","ad"]
})
export default class CommandHelper extends Vue {
	
	public raidUser:string = "";

	private clickHandler!:(e:MouseEvent) => void;
	
	public get params():{[key:string]:ParameterData} { return store.state.roomStatusParams; }

	public get canCreatePrediction():boolean {
		return store.state.currentPrediction?.id == undefined && store.state.hasChannelPoints === true;
	}
	public get canCreatePoll():boolean {
		if(!store.state.hasChannelPoints) return false;
		const poll = store.state.currentPoll as TwitchTypes.Poll;
		return poll == undefined || poll.status != "ACTIVE";
	}

	public async mounted():Promise<void> {
		await this.$nextTick();
		this.clickHandler = (e:MouseEvent) => this.onClick(e);
		document.addEventListener("mousedown", this.clickHandler);
		this.open();
	}

	public beforeUnmount():void {
		document.removeEventListener("mousedown", this.clickHandler);
	}

	private open():void {
		const ref = this.$el as HTMLDivElement;
		gsap.killTweensOf(ref);
		gsap.from(ref, {duration:.2, scaleX:0, delay:.1, clearProps:"scaleX", ease:"back.out"});
		gsap.from(ref, {duration:.3, scaleY:0, clearProps:"scaleY", ease:"back.out"});
	}

	private close():void {
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
		while(target != document.body && target != ref) {
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
		
		Utils.confirm("Raid ?", "Are you sure you want to raid " + this.raidUser + " ?").then(async () => {
			IRCClient.instance.sendMessage("/raid "+this.raidUser);
			this.raidUser = "";
		}).catch(()=> { });
	}

	public cancelRaid():void {
		IRCClient.instance.sendMessage("/unraid");
	}

	public onChangeParam(key:string, p:ParameterData):void {
		let channel = IRCClient.instance.channel;
		switch(key) {
			case "emotesOnly": {
				if(p.value) IRCClient.instance.client.emoteonly(channel);
				else  IRCClient.instance.client.emoteonlyoff(channel)
				break;
			}
			case "followersOnly": {
				if(p.value) IRCClient.instance.client.followersonly(channel);
				else  IRCClient.instance.client.followersonlyoff(channel)
				break;
			}
			case "subsOnly": {
				if(p.value) IRCClient.instance.client.subscribers(channel);
				else  IRCClient.instance.client.subscribersoff(channel)
				break;
			}
			case "slowMode": {
				if(p.value) IRCClient.instance.client.slow(channel, 5);
				else  IRCClient.instance.client.slowoff(channel)
				break;
			}
		}
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