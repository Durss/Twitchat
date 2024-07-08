<template>
	<div class="channelswitcher">
		<div class="entry current" v-if="currentChannel" @click.capture="open($event)">
			<img class="avatar" v-if="currentChannel.user.avatarPath" :src="currentChannel.user.avatarPath" alt="avatar" referrerpolicy="no-referrer">
			<Icon :name="currentChannel.platform" class="platformIcon" />
		</div>

		<div class="popin blured-background-window" ref="popin" v-if="expand">
			<template v-if="showForm && !user">
				<p><Icon name="online" />{{ $t("chat.form.connect_extra_chan") }}</p>
				<SearchUserForm class="blured-background-window"
					v-model="user"
					@close="showForm = false"
					@select="onSelectUser"
					inline />
			</template>
			
			<template v-else >
				<div class="entry" v-for="entry in channels">
					<img class="avatar" v-if="entry.user.avatarPath" :src="entry.user.avatarPath" alt="avatar" referrerpolicy="no-referrer">
					<Icon :name="entry.platform" class="platformIcon" />
					<span class="pseudo">{{ entry.user.displayName }}</span>
				</div>
				<TTButton class="addChanBt" icon="add" @click="showForm = true" transparent medium />
			</template>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import { gsap } from 'gsap/gsap-core';
import TTButton from '@/components/TTButton.vue';
import SearchUserForm from '../params/contents/donate/SearchUserForm.vue';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import TwitchMessengerClient from '@/messaging/TwitchMessengerClient';

@Component({
	components:{
		TTButton,
		SearchUserForm,
	},
	emits:[],
})
class ChannelSwitcher extends Vue {
	
	public expand:boolean = false;
	public showForm:boolean = false;
	public currentChannelId:string = "";
	public user:TwitchDataTypes.UserInfo | null = null;
	public channels:{platform:TwitchatDataTypes.ChatPlatform ,user:TwitchatDataTypes.TwitchatUser}[] = [];
	
	private clickHandler!:(e:MouseEvent) => void;

	public get currentChannel():typeof this.channels[number]|undefined {
		return this.channels.find(v=>v.user.id == this.currentChannelId);
	}

	public beforeMount():void {
		this.channels.push({platform:"twitch", user:this.$store.auth.twitch.user});
		if(this.$store.auth.youtube.user) {
			this.channels.push({platform:"youtube", user:this.$store.auth.youtube.user});
		}
		
		this.currentChannelId = this.channels[0].user.id;
		
		this.clickHandler = (e:MouseEvent) => this.onClose(e);
		document.addEventListener("click", this.clickHandler);
	}
	
	public async beforeUnmount():Promise<void> {
		document.removeEventListener("click", this.clickHandler);
	}

	public async open(event:MouseEvent):Promise<void> {
		event.stopPropagation();
		event.preventDefault();
		if(this.expand) {
			this.onClose(event);
			return;
		}
		this.expand = true;
		await this.$nextTick();
		const holder = this.$refs.popin as HTMLDivElement;
		gsap.killTweensOf(holder);
		gsap.fromTo(holder, {scaleY:0}, {duration:.25, scaleY:1, ease:"back.out", delay:.05});
	}

	public onSelectUser():void {
		if(!this.user) return;
		TwitchMessengerClient.instance.connectToChannel(this.user?.login);
		this.user = null;
	}

	private onClose(e:MouseEvent):void {
		if(!this.expand) return;
		const holder = this.$refs.popin as HTMLDivElement;
		if(!holder) return;

		gsap.killTweensOf(holder);
		let target = e.target as HTMLElement;
		while(target != document.body && target != holder && target != null) {
			target = target.parentElement as HTMLElement;
		}
		if(target === document.body) {
			gsap.to(holder, {duration:.1, scaleY:0, clearProps:"scaleY", ease:"back.in", onComplete:() => {
				this.expand = false;
				this.showForm = false;
			}});
		}
	}

}
export default toNative(ChannelSwitcher);
</script>

<style scoped lang="less">
.channelswitcher{
	position: relative;
	.entry {
		gap: .5em;
		display: flex;
		flex-direction: row;
		align-items: center;
		.avatar {
			width: 1.5em;
			height: 1.5em;
			border-radius: 50%;
		}
	
		.platformIcon {
			height: 1em;
			max-width: 1em;
			flex-shrink: 0;
		}
		.pseudo {
			text-wrap: nowrap;
			margin-right: 1em;
		}
	}

	.popin {
		position: absolute;
		bottom: 100%;
		gap: .25em;
		display: flex;
		flex-direction: column;
		p>.icon {
			height: 1em;
			margin-right: .5em;
			vertical-align: middle;
		}
	}

	.current {
		cursor: pointer;
		.platformIcon {
			height: 15px;
			position: absolute;
			bottom: 0;
			right: 0;
			background-color: var(--color-dark);
			padding: 2px;
			border-radius: 50%;
		}
	}
}
</style>