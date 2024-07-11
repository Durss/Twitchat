<template>
	<div class="channelswitcher">
		<div class="entry current" v-if="currentChannel" @click.capture="open($event)" @click.right="cycleChannel($event)">
			<img class="avatar" v-if="currentChannel.user.avatarPath"
				:src="currentChannel.user.avatarPath"
				:style="{color:currentChannel.color}"
				alt="avatar"
				referrerpolicy="no-referrer">
			<Icon :name="currentChannel.platform" class="platformIcon" />
		</div>

		<div class="popin blured-background-window" ref="popin" v-if="expand">
			<template v-if="showForm && !user">
				<p><Icon name="online" />{{ $t("chat.form.connect_extra_chan") }}</p>
				<SearchUserForm class="blured-background-window"
					v-model="user"
					:staticUserList="liveFollingList"
					:excludedUserIds="channels.map(v=>v.user.id)"
					@close="showForm = false"
					@select="onSelectUser"
					inline />
			</template>
			
			<template v-else >
				<div class="entry" v-for="entry in channels" @click="onSelectChannel(entry.user.id, entry.platform)">
					<img class="avatar" v-if="entry.user.avatarPath"
						:src="entry.user.avatarPath"
						:style="{color:entry.color}"
						alt="avatar"
						referrerpolicy="no-referrer">
					<Icon :name="entry.platform" class="platformIcon" />
					<span class="pseudo">{{ entry.user.displayName }}</span>
					<TTButton v-if="entry.canDisconnect"
						class="disconnectBt"
						icon="offline"
						transparent
						medium
						v-tooltip="$t('global.disconnect')"
						@click.capture.stop="disconnect(entry.user)" />
				</div>
				<TTButton class="addChanBt" icon="add" @click="showForm = true" transparent medium />
			</template>
		</div>
	</div>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { gsap } from 'gsap/gsap-core';
import { Component, Prop, Vue, toNative } from 'vue-facing-decorator';
import SearchUserForm from '../params/contents/donate/SearchUserForm.vue';
import TwitchUtils from '@/utils/twitch/TwitchUtils';

@Component({
	components:{
		TTButton,
		SearchUserForm,
	},
	emits:["update:modelValue", "update:platform", "change"],
})
class ChannelSwitcher extends Vue {
	
	@Prop({default:"", type:String})
	public modelValue!:string;
	
	@Prop({default:"twitch", type:String})
	public platform!:string;
	
	public expand:boolean = false;
	public showForm:boolean = false;
	public currentChannelId:string = "";
	public user:TwitchDataTypes.UserInfo | null = null;
	public liveFollingList:TwitchDataTypes.UserInfo[] = [];

	
	private clickHandler!:(e:MouseEvent) => void;

	public get currentChannel():typeof this.channels[number]|undefined {
		return this.channels.find(v=>v.user.id == this.currentChannelId);
	}

	public get channels() {
		let chans:{platform:TwitchatDataTypes.ChatPlatform, user:TwitchatDataTypes.TwitchatUser, color:string, canDisconnect:boolean}[] = [];
		
		chans.push({platform:"twitch", user:this.$store.auth.twitch.user, canDisconnect:false, color:"transparent"});
		if(this.$store.auth.youtube.user) {
			chans.push({platform:"youtube", user:this.$store.auth.youtube.user, canDisconnect:false, color:"transparent"});
		}
		
		this.$store.stream.connectedTwitchChans.forEach(entry=> {
			chans.push({platform:"twitch", user:entry.user, canDisconnect:true, color:entry.color});
		})

		return chans;
	}

	public beforeMount():void {
		if(this.channels.findIndex(v => v.user.id === this.modelValue) == -1) {
			this.currentChannelId = this.channels[0].user.id;
		}else{
			this.currentChannelId = this.modelValue;
		}

		this.$watch(()=>this.modelValue, ()=>{
			this.currentChannelId = this.modelValue;
		});
		
		this.loadLiveFollowing();
		this.clickHandler = (e:MouseEvent) => this.onClickDOM(e);
		document.addEventListener("click", this.clickHandler);
	}
	
	public async beforeUnmount():Promise<void> {
		document.removeEventListener("click", this.clickHandler);
	}

	/**
	 * Loads currently live following for fast channel access
	 */
	public async loadLiveFollowing():Promise<void> {
		this.liveFollingList = [];
		const list = await TwitchUtils.getActiveFollowedStreams();
		this.liveFollingList = await TwitchUtils.getUserInfo(list.map(v=>v.user_id));
	}

	/**
	 * Called when selecting a twitch user after searching for them
	 */
	public onSelectUser(user?:TwitchDataTypes.UserInfo):void {
		if(user) this.user = user;
		if(!this.user) return;
		const ttUser = this.$store.users.getUserFrom("twitch", this.user.id, this.user.id, this.user.login, this.user.display_name);
		this.$store.stream.connectToExtraChan(ttUser);
		this.user = null;
		this.showForm = false;
	}

	/**
	 * Called when selecting a connected channel to make it the current one
	 */
	public onSelectChannel(channelId:string, platform:TwitchatDataTypes.ChatPlatform):void {
		this.$emit("update:platform", platform);
		this.$emit("update:modelValue", channelId);
		this.$emit("change", channelId);
		this.close();
	}

	/**
	 * Calle dwhen right clicking button.
	 * Cycles through connected channels for faster switch
	 */
	public cycleChannel(event:MouseEvent):void {
		event.preventDefault();
		let index = this.channels.findIndex(v=>v.user.id == this.currentChannelId);
		index = (++index)%this.channels.length;
		this.onSelectChannel(this.channels[index].user.id, this.channels[index].platform);
	}

	/**
	 * Disconnect from given twitch channel
	 */
	public disconnect(user:TwitchatDataTypes.TwitchatUser):void {
		if(this.$store.stream.currentChatChannel.id === user.id) {
			this.$store.stream.currentChatChannel.id = this.channels[0].user.id;
			this.$store.stream.currentChatChannel.platform = this.channels[0].platform;
		}
		this.$store.stream.disconnectFromExtraChan(user);
	}

	/**
	 * Opens the window
	 */
	public async open(event:MouseEvent):Promise<void> {
		event.stopPropagation();
		event.preventDefault();
		if(this.expand) {
			this.onClickDOM(event);
			return;
		}
		this.expand = true;
		await this.$nextTick();
		const holder = this.$refs.popin as HTMLDivElement;
		gsap.killTweensOf(holder);
		gsap.fromTo(holder, {scaleY:0}, {duration:.25, scaleY:1, ease:"back.out", delay:.05});
	}

	/**
	 * Closes the window
	 */
	public close():void {
		const holder = this.$refs.popin as HTMLDivElement;
		if(!holder) return;
		gsap.killTweensOf(holder);
		gsap.to(holder, {duration:.1, scaleY:0, clearProps:"scaleY", ease:"back.in", onComplete:() => {
			this.expand = false;
			this.showForm = false;
		}});
	}

	/**
	 * Detects click outside of the window to close it
	 */
	private onClickDOM(e:MouseEvent):void {
		if(!this.expand) return;
		const holder = this.$refs.popin as HTMLDivElement;
		if(!holder) return;

		let target = e.target as HTMLElement;
		while(target != document.body && target != holder && target != null) {
			target = target.parentElement as HTMLElement;
		}
		if(target === document.body) {
			this.close();
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
		cursor: pointer;
		.avatar {
			width: 1.5em;
			height: 1.5em;
			border-radius: 50%;
			border: 2px solid currentColor;
		}
	
		.platformIcon {
			height: 1em;
			max-width: 1em;
			flex-shrink: 0;
		}
		.pseudo {
			text-wrap: nowrap;
		}
		.disconnectBt {
			flex-shrink: 0;
		}
		&:hover {
			background-color: var(--background-color-fader);
		}
	}

	.popin {
		position: absolute;
		bottom: 100%;
		gap: .25em;
		display: flex;
		flex-direction: column;
		width: max-content;
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