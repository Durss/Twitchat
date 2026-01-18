<template>
	<div class="channelswitcher">
		<div class="current"
		v-if="currentChannel"
		v-tooltip="{
			touch:'hold',
			content:channels.length == 1? $t('chat.form.connect_extra_chan') : $t('chat.form.extra_chan_tt', {USER:currentChannel.user.displayNameOriginal})
		}"
		@click.capture="open($event)"
		@click.right="cycleChannel($event)">
			<img class="avatar" v-if="currentChannel.user.avatarPath"
				:src="currentChannel.user.avatarPath.replace(/300x300/gi, '50x50')"
				:style="{color:currentChannel.color}"
				alt="avatar"
				referrerpolicy="no-referrer">
			<div class="avatar" :style="{color:currentChannel.color}" v-else></div>
			<Icon :name="currentChannel.platform" class="platformIcon" />
		</div>

		<div class="popin blured-background-window" ref="popin" v-if="expand">
			<template v-if="showForm && !user">
				<p class="head"><Icon name="online" />{{ $t("chat.form.connect_extra_chan") }}</p>
				<SearchUserForm
					v-model="user"
					:staticUserList="liveFollingList"
					:excludedUserIds="channels.map(v=>v.user.id)"
					@close="showForm = false"
					@select="onSelectUser"
					inline />
				<!-- <input type="text" v-model="youtubeUrl" @keyup.enter="connectYoutube"> -->
				<p class="infos"><Icon name="info" />{{ $t("chat.form.extra_chan_info") }}</p>
			</template>
			
			<template v-else-if="userParams" >
			</template>
			
			<template v-else >
				<button v-for="entry in channels"
				:class="currentChannelId == entry.user.id? 'entry selected' : 'entry'"
				@click="onSelectChannel(entry.user.id, entry.user.login, entry.platform)">
					<img class="avatar" v-if="entry.user.avatarPath"
						:src="entry.user.avatarPath.replace(/300x300/gi, '50x50')"
						:style="{color:entry.color}"
						alt="avatar"
						referrerpolicy="no-referrer">
					<div class="avatar" :style="{color:entry.color}" v-else></div>

					<Icon :name="entry.platform" class="platformIcon" />

					<span class="pseudo">{{ entry.user.displayName }}</span>

					<TTButton v-if="entry.isRemoteChan"
						class="actionBt"
						icon="offline"
						transparent
						medium
						v-tooltip="$t('global.disconnect')"
						@click.capture.stop="disconnect(entry.user)" />

					<TTButton v-if="entry.isRemoteChan && (canPinChans || $store.stream.autoconnectChans.find(v=>v.id == entry.user.id && v.platform == entry.user.platform))"
						class="actionBt"
						transparent
						medium
						:icon="$store.stream.autoconnectChans.find(v=>v.id == entry.user.id && v.platform == entry.user.platform)? 'pin':'unpin'"
						@click.capture.stop="togglePinState(entry)" />

					<!-- <TTButton v-if="entry.isRemoteChan"
						class="actionBt"
						icon="params"
						transparent
						medium
						v-tooltip="$t('chat.form.extra_chan_params_tt')"
						@click.capture.stop="openParams(entry.user)" /> -->
				</button>
				<TTButton class="addChanBt" icon="add" v-if="$store.stream.connectedTwitchChans.length < 6" @click="showForm = true" transparent medium />
			</template>
		</div>
	</div>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { gsap } from 'gsap/gsap-core';
import { reactive } from 'vue';
import { Component, Prop, Vue, toNative } from 'vue-facing-decorator';
import SearchUserForm from '../params/contents/donate/SearchUserForm.vue';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import YoutubeHelper from '@/utils/youtube/YoutubeHelper';

@Component({
	components:{
		TTButton,
		SearchUserForm,
	},
	emits:["update:modelValue", "update:platform", "update:name", "change"],
})
class ChannelSwitcher extends Vue {
	
	@Prop({default:"", type:String})
	public modelValue!:string;
	
	@Prop({default:"twitch", type:String})
	public platform!:string;
	
	@Prop({default:"", type:String})
	public name!:string;
	
	public expand:boolean = false;
	public showForm:boolean = false;
	public youtubeUrl:string = "";
	public currentChannelId:string = "";
	public user:TwitchDataTypes.UserInfo | null = null;
	public userParams:TwitchatDataTypes.TwitchatUser | null = null;
	public liveFollingList:TwitchDataTypes.UserInfo[] = [];

	private clickHandler!:(e:MouseEvent) => void;

	public get canPinChans():boolean {
		return this.$store.stream.autoconnectChans.length < 6;
	}

	public get currentChannel():typeof this.channels[number]|undefined {
		return this.channels.find(v=>v.user.id == this.currentChannelId);
	}

	public get channels():ChannelEntry[] {
		let chans:ChannelEntry[] = reactive([]);
		
		chans.push({platform:"twitch", user:this.$store.auth.twitch.user, isRemoteChan:false, color:"transparent"});
		if(this.$store.auth.youtube.user) {
			chans.push({platform:"youtube", user:this.$store.auth.youtube.user, isRemoteChan:false, color:"transparent"});
		}
		
		this.$store.stream.connectedTwitchChans.forEach(entry=> {
			chans.push({platform:"twitch", user:entry.user, isRemoteChan:true, color:entry.color});
		});

		return chans
	}

	public beforeMount():void {
		if(this.channels.findIndex(v => v.user.id === this.modelValue) == -1) {
			this.currentChannelId = this.channels[0]!.user.id;
		}else{
			this.currentChannelId = this.modelValue;
		}

		this.$watch(()=>this.modelValue, ()=>{
			this.currentChannelId = this.modelValue;
		});
		
		this.loadLiveFollowing();
		this.clickHandler = (e:MouseEvent) => this.onClickDOM(e);
		document.addEventListener("click", this.clickHandler, true);
	}
	
	public async beforeUnmount():Promise<void> {
		document.removeEventListener("click", this.clickHandler, true);
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
	public async onSelectUser(user?:TwitchDataTypes.UserInfo):Promise<void> {
		if(user) this.user = user;
		if(!this.user) return;
		const ttUser = await this.$store.users.getUserFrom("twitch", this.user.id, this.user.id, this.user.login, this.user.display_name);
		this.$store.stream.connectToExtraChan(ttUser);
		this.user = null;
		this.showForm = false;
	}

	/**
	 * Called when selecting a connected channel to make it the current one
	 */
	public onSelectChannel(channelId:string, channelName:string, platform:TwitchatDataTypes.ChatPlatform):void {
		this.$emit("update:name", channelName);
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
		const channel = this.channels[index];
		if(channel) {
			this.onSelectChannel(channel.user.id, channel.user.login, channel.platform);
		}
	}

	/**
	 * Disconnect from given twitch channel
	 */
	public disconnect(user:TwitchatDataTypes.TwitchatUser):void {
		if(this.$store.stream.currentChatChannel.id === user.id) {
			const channel = this.channels[0];
			if(channel) {
				this.$store.stream.currentChatChannel.id = channel.user.id;
				this.$store.stream.currentChatChannel.name = channel.user.login;
				this.$store.stream.currentChatChannel.platform = channel.platform;
			}
		}
		this.$store.stream.disconnectFromExtraChan(user);
	}

	/**
	 * Toggle pin states of an entry
	 */
	public togglePinState(entry:ChannelEntry):void {
		const pinned = this.$store.stream.autoconnectChans.findIndex(v=>v.id == entry.user.id && v.platform == entry.user.platform) == -1;
		this.$store.stream.setExtraChanAutoconnectState(entry.user, pinned);
	}

	/**
	 * Open params form for a user
	 */
	public openParams(user:TwitchatDataTypes.TwitchatUser):void {
		this.userParams = user;
	}

	/**
	 * Opens the window
	 */
	public async open(event:MouseEvent):Promise<void> {
		this.loadLiveFollowing();
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

	public connectYoutube():void {
		YoutubeHelper.instance.connectToLiveByURL(this.youtubeUrl);
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

interface ChannelEntry {
	platform:TwitchatDataTypes.ChatPlatform;
	user:TwitchatDataTypes.TwitchatUser;
	color:string;
	isRemoteChan:boolean;
};
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
		padding: 2px;
		padding-right: 5px;
		border-radius: var(--border-radius);
		color: var(--color-text);
		text-align: left;
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
			flex-grow: 1;
		}
		.actionBt {
			flex-shrink: 0;
			margin-right: -5px;
		}
		&:hover {
			background-color: var(--background-color-fader);
		}
		&.selected {
			background-color: var(--color-primary-fader);
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

		.infos {
			font-style: italic;
			font-size: .85em;
			color: var(--color-secondary);
			white-space: pre-line;
			font-weight: normal;
		}
	}

	.current {
		cursor: pointer;
		.platformIcon {
			height: 15px;
			max-width: 15px;
			position: absolute;
			bottom: 0;
			right: -3px;
			background-color: var(--color-text-inverse);
			padding: 2px;// 2px 2px 3px;
			border-radius: 50%;
		}
		.avatar {
			width: 1.5em;
			height: 1.5em;
			border-radius: 50%;
			border: 2px solid currentColor;
			transition: all .1s;
		}

		&:hover {
			.avatar {
				transform: scale(1.1);
				filter: brightness(1.2);
			}
		}
	}

	.head {
		white-space: pre-line;
	}
}
</style>