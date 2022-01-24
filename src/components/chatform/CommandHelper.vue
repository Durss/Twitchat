<template>
	<div class="commandhelper">
		<Button @click="$emit('poll'); close();" :icon="require('@/assets/icons/poll.svg')" title="Create poll" bounce :disabled="!canCreatePoll" />
		<Button @click="$emit('pred'); close();" :icon="require('@/assets/icons/prediction.svg')" title="Create prediction" bounce :disabled="$store.state.currentPrediction?.id != undefined" />
		<Button @click="$emit('clear'); close();" :icon="require('@/assets/icons/clearChat.svg')" title="Clear chat" bounce />

		<div v-for="(p,key) in params" :key="key">
			<ParamItem :paramData="p" @change="onChangeParam(key, p)" />
		</div>
		<div class="raid">
			<label for="raid_input"><img src="@/assets/icons/raid.svg" alt="raid">Raid someone</label>
			<form @submit.prevent="raid()">
				<input class="dark" id="raid_input" type="text" placeholder="user name..." v-model="raidUser" maxlength="50">
				<Button type="submit" :icon="require('@/assets/icons/checkmark_white.svg')" bounce small :disabled="raidUser.length < 3" />
			</form>
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
	emits:["close","poll","pred","clear"]
})
export default class CommandHelper extends Vue {
	public raidUser:string = "";

	private clickHandler!:(e:MouseEvent) => void;
	
	public get params():{[key:string]:ParameterData} { return store.state.params.roomStatus; }

	public get canCreatePoll():boolean {
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
				if(p.value) IRCClient.instance.client.slow(channel, 10);
				else  IRCClient.instance.client.slowoff(channel)
				break;
			}
		}
	}
}
</script>

<style scoped lang="less">
.commandhelper{
	left: 30px;
	padding: 10px;
	background-color: @mainColor_dark;
	box-shadow: 0px 0px 20px 0px rgba(0,0,0,1);
	border-radius: 10px;
	width: 250px;
	display: flex;
	flex-direction: column;
	transform-origin: bottom left;
	&>*:not(:last-child) {
		margin-bottom: 5px;
	}
	.button {
		:deep(img) {
			max-width: 20px;
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
	}
}
</style>