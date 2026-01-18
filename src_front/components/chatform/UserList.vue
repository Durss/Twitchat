<template>
	<div class="userlist blured-background-window">
		
		<div v-if="currentChan">
			<template v-for="chan, key in currentChan.users">
				<ToggleBlock v-if="currentChan.users[key].length > 0" :class="'userList '+key"
				small
				:title="getRole(key)"
				:subtitle="'('+currentChan.users[key].length+')'"
				:open="key != 'broadcaster'"
				>
					<div class="list" v-if="currentChan.users[key].length > 0">
						<a :class="userClasses(u)"
						target="_blank"
						:href="'https://twitch.tv/'+u.login"
						@click.prevent="openUserCard(u)"
						v-for="u in currentChan.users[key]" :key="u.id">
							<Icon name="unfollow" v-if="canListFollowers && u.channelInfo[currentChanId!]?.is_following === false" theme="secondary" />
							<div v-if="currentChanId && u.channelInfo[currentChanId]!.is_banned" class="icon">
								<Icon v-if="currentChanId && u.channelInfo[currentChanId]!.banEndDate"
									name="timeout"
									v-tooltip="getBanDuration(u.channelInfo[currentChanId]!)" />
								<Icon v-else name="ban" v-tooltip="$t('userlist.banned_tt')" />
							</div>
							<span>{{u.displayName}}</span>
						</a>
					</div>
				</ToggleBlock>
			</template>
		</div>

		<ToggleBlock class="infos" :open="false" small v-if="currentChanId == myChannelId" :title="$t('userlist.infoBt')">
			<p class="info" v-for="e in $tm('userlist.infos')" v-html="e"></p>
		</ToggleBlock>

		<div class="users" v-if="userList.length > 1">
			<TabMenu v-model="currentChanId" :values="userList.map(v=>v.id)" :labels="userList.map(v=>v.displayName)" />
		</div>
	</div>
</template>

<script lang="ts">
import StoreProxy from '@/store/StoreProxy';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import { gsap } from 'gsap/gsap-core';
import { watch } from 'vue';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import TTButton from '../TTButton.vue';
import TabMenu from '../TabMenu.vue';
import ToggleBlock from '../ToggleBlock.vue';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';

@Component({
	components:{
		Button: TTButton,
		TabMenu,
		ToggleBlock,
	},
	emits:["close"]
})
class UserList extends Vue {

	public showInfo:boolean = false;
	public myChannelId!:string;
	public channels:{[key:string]:ChannelUserList} = {};
	public currentChanId:string = "";

	public get currentChan():ChannelUserList { return this.channels[this.currentChanId]!; }
	public get canListFollowers():boolean { return this.$store.params.appearance.highlightNonFollowers.value === true && TwitchUtils.hasScopes([TwitchScopes.LIST_FOLLOWERS]); }

	private debounceTo:number = -1;
	private clickHandler!:(e:MouseEvent) => void;

	public get userList():TwitchatDataTypes.TwitchatUser[] {
		const list:TwitchatDataTypes.TwitchatUser[] = [];
		const validIds = this.$store.stream.connectedTwitchChans.concat().map(v=>v.user.id);
		if(this.$store.auth.youtube.user) validIds.push(this.$store.auth.youtube.user.id);
		validIds.push(this.$store.auth.twitch.user.id);

		for (const uid in this.channels) {
			const chan = this.channels[uid]!;
			
			//Not connected to chan anymore? Skip entry
			if(validIds.findIndex(v=>v == uid) == -1) continue;

			list.push(this.$store.users.getUserFrom(chan.platform, chan.channelId, chan.channelId));
		}
		return list;
	}

	public getRole(key:string):string {
		return (this.$tm("userlist.roles") as {[key:string]:string})[key]!;
	}

	public getBanDuration(chanInfo:TwitchatDataTypes.UserChannelInfo):string {
		const remaining = chanInfo.banEndDate! - Date.now();
		return Utils.formatDuration(remaining)+"s";
	}
	
	public userClasses(user:TwitchatDataTypes.TwitchatUser):string[] {
		let res = ["user"];
		if(this.canListFollowers
		&& user.channelInfo[this.currentChanId!]?.is_following === false) res.push("noFollow");
		return res;
	}

	public beforeMount():void {
		this.myChannelId = StoreProxy.auth.twitch.user.id;
	}

	public mounted():void {
		this.clickHandler = (e:MouseEvent) => this.onClick(e);
		document.addEventListener("mousedown", this.clickHandler);
		watch(() => this.$store.users.users, () => {
			this.updateList();
		});
		this.updateList();
		this.open();
	}

	public beforeUnmount():void {
		this.channels = {};
		document.removeEventListener("mousedown", this.clickHandler);
	}

	public async toggleInfos():Promise<void> {
		if(this.showInfo) {
			const holder = this.$refs.infos as HTMLDivElement;
			gsap.to(holder, {duration:.5, height:0, minHeight:0, marginTop:0, paddingTop:0, paddingBottom:0, ease:"sine.inOut", clearProps:"all", onComplete:()=>{this.showInfo = false;}});
		}else{
			this.showInfo = true;
			await this.$nextTick();
			const holder = this.$refs.infos as HTMLDivElement;
			const bounds = holder.getBoundingClientRect();
			holder.style.overflow = "hidden";
			holder.style.height = bounds.height+"px";
			holder.style.minHeight = bounds.height+"px";
			gsap.from(holder, {duration:.5, minHeight:0, height:0, marginTop:0, paddingTop:0, paddingBottom:0, clearProps:"all", ease:"sine.inOut"});
		}
	}

	public openUserCard(user:TwitchatDataTypes.TwitchatUser):void {
		this.$store.users.openUserCard(user, this.currentChanId!);
	}

	private open():void {
		const ref = this.$el as HTMLDivElement;
		gsap.killTweensOf(ref);
		gsap.from(ref, {duration:.3, scaleY:0, clearProps:"scaleY", ease:"back.out"});
	}

	private close():void {
		const ref = this.$el as HTMLDivElement;
		gsap.killTweensOf(ref);
		gsap.to(ref, {duration:.2, scaleY:0, delay:.1, clearProps:"scaleY", ease:"back.in", onComplete:() => {
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

	private updateList():void {
		clearTimeout(this.debounceTo);
		const isInit = Object.keys(this.channels).length==0;

		this.debounceTo = window.setTimeout(()=> {
			// const s = Date.now();
			const userList = this.$store.users.users;
			
			const channels:{[key:string]:ChannelUserList} = {};
			for (const user of userList) {
			
				for (const chan in user.channelInfo) {
					const chanInfo = user.channelInfo[chan];
					if(chanInfo && chanInfo.online && user.temporary !== true && user.errored !== true) {
						if(!channels[chan]) {
							channels[chan] = {
								channelId:chan,
								platform:user.platform,
								users:{
									broadcaster:[],
									mods:[],
									vips:[],
									subs:[],
									viewers:[],
									bots:[],
								}
							}
						}
						const chanData = channels[chan];
						if(chanInfo && chanInfo.is_broadcaster) chanData.users.broadcaster = [user];
						else if(user.is_bot) chanData.users.bots.push(user);
						else if(chanInfo && chanInfo.is_moderator) chanData.users.mods.push(user);
						else if(chanInfo && chanInfo.is_vip) chanData.users.vips.push(user);
						//Removed because not accurate as I don't load subscriber state everytime.
						//To date, the subscriber state is only given when user talks on chat
						// else if(user.channelInfo[chan].is_subscriber) chanData.users.subs.push(user);
						else chanData.users.viewers.push(user);
					}
				}
			}
	
			for (const chan in channels) {
				//Sort users by their names
				const chanData = channels[chan]!.users;
				type keys = keyof typeof chanData;
				for (const cat in chanData) {
					chanData[cat as keys].sort((a,b) => {
						const n1 = a.displayName.toLowerCase();
						const n2 = b.displayName.toLowerCase();
						if(n1 > n2 ) return 1;
						if(n1 < n2 ) return -1;
						return 0;
					});
				}
			}
			
			this.channels = channels;
			if(isInit) {
				this.currentChanId	= this.myChannelId;
			}
		}, isInit? 0 : 500);
	}
}

interface ChannelUserList {
	channelId:string;
	platform:TwitchatDataTypes.ChatPlatform;
	users:{
		broadcaster:TwitchatDataTypes.TwitchatUser[];
		mods:TwitchatDataTypes.TwitchatUser[];
		vips:TwitchatDataTypes.TwitchatUser[];
		subs:TwitchatDataTypes.TwitchatUser[];
		viewers:TwitchatDataTypes.TwitchatUser[];
		bots:TwitchatDataTypes.TwitchatUser[];
	}
}
export default toNative(UserList);
</script>

<style scoped lang="less">
.userlist{
	max-width: 600px;
	max-height: 500px;
	width: 100%;

	.users {
		position: sticky;
		bottom: 0;
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		padding-top: 1em;
		padding-bottom: .5em;

		:deep(i) {
			font-size: .8em;
			font-style: italic;
		}
	}


	.infos {
		font-size: .8em;
		max-width: 600px;
		margin-top: 1em;
		.info {
			line-height: 1.5em;
		}
	}

	.userList {
		&:not(:last-child) {
			margin-bottom: 20px;
		}

		.list {
			width: calc(100% - 2em);
			margin: auto;
			padding: .25em;
			border-bottom-left-radius: var(--border-radius);
			border-bottom-right-radius: var(--border-radius);

			@itemWidth: 150px;
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(@itemWidth, 1fr));
			
			.user {
				display: inline-flex;
				text-overflow: ellipsis;
				overflow: hidden;
				width: @itemWidth;
				text-decoration: none;
				white-space:nowrap;
				line-height: 1.2em;
				width: 100%;
				padding: .25em;
				color: var(--color-text);
				align-items: center;
				&:hover {
					text-decoration: underline;
				}
				// box-shadow: 2px 2px 2px black;
				&:nth-child(odd) {
					background-color: fade(white, 2%);
				}
				&:nth-child(even) {
					background-color: fade(black, 10%);
				}

				&.noFollow {
					color: var(--color-secondary);
					&:hover {
						color: var(--color-secondary-light);
					}

					.icon {
						height: .75em;
						vertical-align: top;
					}
				}

				.icon {
					display: block;
					vertical-align: middle;
					margin-right: .25em;
					height: 1em;
				}
			}
		}
	}
}

@media only screen and (max-width: 450px) {
	.userlist {
		max-height: unset;
	}
}
</style>