<template>
	<div class="userlist">
		
		<div v-if="currentChan">
			<div v-for="chan, key in currentChan.users" :class="'userList '+key">
				<div class="title" v-if="currentChan.users[key].length > 0">
					{{getRole(key)}}
					<i>({{currentChan.users[key].length}})</i>
				</div>
				<div class="list" v-if="currentChan.users[key].length > 0">
					<a :class="userClasses(u)"
					target="_blank"
					:href="'https://twitch.tv/'+u.login"
					@click.prevent="openUserCard(u)"
					v-for="u in currentChan.users[key]" :key="u.id">
						<div v-if="currentChanId && u.channelInfo[currentChanId].is_banned" class="icon">
							<img v-if="currentChanId && u.channelInfo[currentChanId].banEndDate"
								src="@/assets/icons/timeout.svg"
								v-tooltip="getBanDuration(u.channelInfo[currentChanId])">
							<img v-else src="@/assets/icons/ban.svg" v-tooltip="$t('userlist.banned_tt')">
						</div>
						{{u.displayName}}
					</a>
				</div>
			</div>
		</div>

		<ToggleBlock class="infos" :open="false" medium v-if="currentChanId == myChannelId" :title="$t('userlist.infoBt')">
				<p class="info" v-for="e in $tm('userlist.infos')" v-html="e"></p>
		</ToggleBlock>

		<div class="users" v-if="currentChan">
			<TabMenu v-model="currentChanId" :values="userList.map(v=>v.id)" :labels="userList.map(v=>v.displayName)" />
		</div>
	</div>
</template>

<script lang="ts">
import StoreProxy from '@/store/StoreProxy';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import { watch } from 'vue';
import { Component, Vue } from 'vue-facing-decorator';
import Button from '../Button.vue';
import TabMenu from '../TabMenu.vue';
import ToggleBlock from '../ToggleBlock.vue';

@Component({
	components:{
		Button,
		TabMenu,
		ToggleBlock,
	},
	emits:["close"]
})
export default class UserList extends Vue {

	public showInfo:boolean = false;
	public myChannelId!:string;
	public channels:{[key:string]:ChannelUserList} = {};
	public currentChanId:string = "";

	public get currentChan():ChannelUserList {
		return this.channels[this.currentChanId]
	}

	private debounceTo:number = -1;

	public get userList():TwitchatDataTypes.TwitchatUser[] {
		const list:TwitchatDataTypes.TwitchatUser[] = [];
		for (const uid in this.channels) {
			const chan = this.channels[uid];
			list.push(this.$store("users").getUserFrom(chan.platform, chan.channelId, chan.channelId));
		}
		return list;
	}

	public getRole(key:string):string {
		return (this.$tm("userlist.roles") as {[key:string]:string})[key];
	}

	public getBroadcasterTitle(chan:ChannelUserList):string {
		const user = this.$store("users").getUserFrom(chan.platform, chan.channelId, chan.channelId);
		return user.displayName + '<i>('+(chan.users.broadcaster.length+chan.users.viewers.length+chan.users.vips.length+chan.users.mods.length)+')</i>'
	}

	public getBanDuration(chanInfo:TwitchatDataTypes.UserChannelInfo):string {
		const remaining = chanInfo.banEndDate! - Date.now();
		return Utils.formatDuration(remaining)+"s";
	}
	
	public userClasses(user:TwitchatDataTypes.TwitchatUser):string[] {
		let res = ["user"];
		if(this.$store("params").appearance.highlightNonFollowers.value === true
		&& user.channelInfo[this.currentChanId!]?.is_following === false) res.push("noFollow");
		return res;
	}

	private clickHandler!:(e:MouseEvent) => void;

	public beforeMount():void {
		this.myChannelId = StoreProxy.auth.twitch.user.id;
	}

	public mounted():void {
		this.clickHandler = (e:MouseEvent) => this.onClick(e);
		document.addEventListener("mousedown", this.clickHandler);
		watch(() => this.$store("users").users, () => {
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
		this.$store("users").openUserCard(user, this.currentChanId!);
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

		this.debounceTo = setTimeout(()=> {
			// const s = Date.now();
			const userList = this.$store("users").users;
			
			const channels:{[key:string]:ChannelUserList} = {};
			for (let i = 0; i < userList.length; i++) {
				const user = userList[i];
				for (const chan in user.channelInfo) {
					if(user.channelInfo[chan].online && user.temporary !== true && user.errored !== true) {
						if(!channels[chan]) {
							channels[chan] = {
								channelId:chan,
								platform:user.platform,
								users:{
									broadcaster:[],
									mods:[],
									vips:[],
									viewers:[],
								}
							}
						}
						const chanData = channels[chan];
						if(user.channelInfo[chan].is_broadcaster) chanData.users.broadcaster = [user];
						else if(user.channelInfo[chan].is_moderator) chanData.users.mods.push(user);
						else if(user.channelInfo[chan].is_vip) chanData.users.vips.push(user);
						else chanData.users.viewers.push(user);
					}
				}
			}
	
			for (const chan in channels) {
				//Sort users by their names
				const chanData = channels[chan].users;
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
		broadcaster:TwitchatDataTypes.TwitchatUser[],
		mods:TwitchatDataTypes.TwitchatUser[],
		vips:TwitchatDataTypes.TwitchatUser[],
		viewers:TwitchatDataTypes.TwitchatUser[]
	}
}
</script>

<style scoped lang="less">
.userlist{
	.window();

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
		font-size: .7em;
		max-width: 600px;
		margin: auto;
		margin-top: 1em;
		.info {
			font-size: 1.2em;
			line-height: 1.5em;
		}
	}

	.userList {
		&:not(:last-child) {
			margin-bottom: 20px;
		}

		.title {
			.emboss();
			color: var(--color-light);
			flex-grow: 1;
			padding: .25em;
			display: block;
			background-color: var(--color-primary-fade);
			border-radius: 1em;

			i {
				font-size: .8em;
			}
		}

		.list {
			background-color: var(--color-primary-fader);
			width: calc(100% - 2em);
			margin: auto;
			padding: .25em;
			border-bottom-left-radius: var(--border_radius);
			border-bottom-right-radius: var(--border_radius);

			@itemWidth: 150px;
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(@itemWidth, 1fr));
			

			.user {
				display: inline-block;
				text-overflow: ellipsis;
				overflow: hidden;
				width: @itemWidth;
				text-decoration: none;
				white-space:nowrap;
				line-height: 1.2em;
				width: 100%;
				padding: .25em;
				// box-shadow: 2px 2px 2px black;
				&:nth-child(odd) {
					background-color: fade(white, 2%);
				}
				&:nth-child(even) {
					background-color: fade(black, 10%);
				}

				&.noFollow {
					color: var(--mainColor_warn);
					&:hover {
						color: var(--mainColor_warn_light);
					}

					&::before {
						content: "";
						display: inline-block;
						background-image: url('../../assets/icons/unfollow.svg');
						background-repeat: no-repeat;
						height: .75em;
						width: .75em;
						margin-right: .25em;
					}
				}

				.icon {
					display: inline-block;
					vertical-align: middle;
					img {
						height: 1em;
					}
				}
			}
		}
	}
}
</style>