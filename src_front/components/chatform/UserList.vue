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
					@click="openUserCard(u)"
					target="_blank"
					v-for="u in currentChan.users[key]" :key="u.id">
						<div v-if="currentChanId && u.channelInfo[currentChanId].is_banned" class="icon">
							<img v-if="currentChanId && u.channelInfo[currentChanId].banEndDate"
								src="@/assets/icons/timeout.svg"
								:data-tooltip="getBanDuration(u.channelInfo[currentChanId])">
							<img v-else src="@/assets/icons/ban.svg" :data-tooltip="$t('userlist.banned_tt')">
						</div>
						{{u.displayName}}
					</a>
				</div>
			</div>
		</div>

		<a v-if="currentChanId == channelId" @click="toggleInfos()" class="infoBt">{{ $t('userlist.infoBt') }}</a>
		<div v-if="showInfo" class="infos" ref="infos">
			<p v-for="e in $tm('userlist.infos')">{{e}}</p>
		</div>

		<div class="users">
			<Button v-for="(chan, uid) in channels" :key="uid"
			v-if="Object.keys(channels).length > 1"
			white
			:class="currentChanId == uid? 'current' : ''"
			@click="currentChan = chan; currentChanId = uid as string;"
			:title="getBraodcasterTitle(chan)"
			/>
		</div>
	</div>
</template>

<script lang="ts">
import StoreProxy from '@/store/StoreProxy';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import { watch } from 'vue';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';

@Options({
	props:{},
	components:{
		Button,
	},
	emits:["close"]
})
export default class UserList extends Vue {

	public showInfo:boolean = false;
	public channelId!:string;
	public channels:{[key:string]:ChannelUserList} = {};
	public currentChanId:string|null = null;
	public currentChan:ChannelUserList|null = null;

	private debounceTo:number = -1;

	public getRole(key:string):string {
		return (this.$tm("userlist.roles") as {[key:string]:string})[key];
	}

	public getBraodcasterTitle(chan:ChannelUserList):string {
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
		this.channelId = StoreProxy.auth.twitch.user.id;
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
					if(user.channelInfo[chan].online && user.temporary !== true) {
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
						if(a.displayName > b.displayName ) return 1;
						if(a.displayName < b.displayName ) return -1;
						return 0;
					});
				}
			}
			
			this.channels = channels;
			if(isInit) {
				this.currentChan	= this.channels[this.channelId];
				this.currentChanId	= this.channelId;
			}
			// const e = Date.now();
			// console.log(e-s);
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

	overflow-y: auto;
	font-size: 16px;
	padding-bottom: 0;

	.users {
		position: sticky;
		bottom: 0;
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		background-color: @mainColor_dark;
		padding: 1em;

		img {
			height: 1.25em;
			vertical-align: middle;
			margin-right: 10px;
		}
		
		button {
			// color: @mainColor_light;
			:deep(i) {
				font-style: italic;
				font-size: .8em;
			}

			&:not(:last-child) {
				margin-right: 10px;
			}

			&:not(.current) {
				background-color: transparent;
				border: 1px solid @mainColor_light;
				color: @mainColor_light;
				opacity: .7;
				&:hover {
					color: @mainColor_normal;
				}
			}
		}
	}

	.infoBt {
		margin: auto;
		font-style: italic;
		margin-top: 1em;
	}

	.infos {
		color:@mainColor_light;
		background-color: @mainColor_dark_light;
		padding: 1em;
		margin: auto;
		margin-top: 1em;
		border-radius: .5em;
		max-width: 500px;
		p:not(:last-of-type) {
			margin-bottom: .5em;
		}
		p:first-letter {
			margin-left: .5em;
		}
	}

	i {
		font-size: .8em;
		font-weight: normal;
	}

	.userList {
		&:not(:last-child) {
			margin-bottom: 20px;
		}

		.title {
			color: @mainColor_light;
			margin-bottom: 5px;
		}

		.list {
			@itemWidth: 150px;
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(@itemWidth, 1fr));
			margin-left: 10px;
			

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
					color: @mainColor_warn;
					&:hover {
						color: @mainColor_warn_light;
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