<template>
	<div class="userlist">
		
		<div v-if="currentChan">
			<div class="userList broadcaster" v-if="currentChan.broadcaster.length > 0">
				<div class="title">Broadcaster</div>
				<div class="list">
					<a :class="userClasses(u)" @click="openUserCard(u)" target="_blank" v-for="u in currentChan.broadcaster" :key="u.id">{{u.displayName}}</a>
				</div>
			</div>
			
			<div class="userList mods" v-if="currentChan.mods.length > 0">
				<div class="title">Moderators <i>({{currentChan.mods.length}})</i></div>
				<div class="list">
					<a :class="userClasses(u)" @click="openUserCard(u)" target="_blank" v-for="u in currentChan.mods" :key="u.id">{{u.displayName}}</a>
				</div>
			</div>
			
			<div class="userList vips" v-if="currentChan.vips.length > 0">
				<div class="title">VIPs <i>({{currentChan.vips.length}})</i></div>
				<div class="list">
					<a :class="userClasses(u)" @click="openUserCard(u)" target="_blank" v-for="u in currentChan.vips" :key="u.id">{{u.displayName}}</a>
				</div>
			</div>
	
			<div class="userList simple" v-if="currentChan.viewers.length > 0">
				<div class="title">Users <i>({{currentChan.viewers.length}})</i></div>
				<div class="list">
					<a :class="userClasses(u)" @click="openUserCard(u)" target="_blank" v-for="u in currentChan.viewers" :key="u.id">{{u.displayName}}</a>
				</div>
			</div>
		</div>

		<a v-if="currentChanId == channelId" @click="toggleInfos()" class="infoBt">Why is the chat users count different from the viewer count?</a>
		<div v-if="showInfo" class="infos" ref="infos">
			<p>Chat user count shows people actually connected to your chat. Viewers count tells how many people are watching your stream.</p>
			<p>It's possible to be on a chat without watching the stream <i>(like bots)</i> and it's possibler to watch the stream without being on the chat <i>(when watching from homepage or after closing the chat, ...)</i></p>
			<p>Also, nothing's official, but it's almost certain that Twitch removes you from the viewers count if you keep the stream on a background tab for some time.</p>
			<p>This usually makes your chatters count higher than your viewers count after a raid.</p>
			<p>When promoted on homepage though, your viewer count will be MUCH higher than your chatters count.</p>
		</div>

		<div class="users">
			<Button v-for="(chan, name) in channels" :key="name"
			v-if="Object.keys(channels).length > 1"
			white
			:class="currentChanId == name? 'current' : ''"
			@click="currentChan = chan; currentChanId = name as string;"
			:title="chan.broadcaster[0].displayName+'<i>('+(chan.broadcaster.length+chan.viewers.length+chan.vips.length+chan.mods.length)+')</i>'"
			/>
		</div>
	</div>
</template>

<script lang="ts">
import StoreProxy from '@/store/StoreProxy';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
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
	public channels:{[key:string]:{
		broadcaster:TwitchatDataTypes.TwitchatUser[],
		mods:TwitchatDataTypes.TwitchatUser[],
		vips:TwitchatDataTypes.TwitchatUser[],
		viewers:TwitchatDataTypes.TwitchatUser[]
	}} = {};
	public currentChanId:string|null = null;
	public currentChan:{
		broadcaster:TwitchatDataTypes.TwitchatUser[],
		mods:TwitchatDataTypes.TwitchatUser[],
		vips:TwitchatDataTypes.TwitchatUser[],
		viewers:TwitchatDataTypes.TwitchatUser[]
	}|null = null;

	
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
		this.updateList();
		watch(() => this.$store("users").users, () => {
			this.updateList();
		});
		this.currentChan	= this.channels[this.channelId];
		this.currentChanId	= this.channelId;
		this.open();
	}

	public beforeUnmount():void {
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
		const users = this.$store("users").users;
		
		this.channels = {};
		for (let i = 0; i < users.length; i++) {
			const user = users[i];
			for (const chan in user.channelInfo) {
				if(!this.channels[chan]) {
					this.channels[chan] = {
						broadcaster:[this.$store("users").getUserFrom(user.platform, chan, chan)],
						mods:[],
						vips:[],
						viewers:[]
					}
				}
				const chanData = this.channels[chan];
				if(user.channelInfo[chan].online && user.temporary !== true) {
					if(user.channelInfo[chan].is_broadcaster) chanData.broadcaster = [user];
					else if(user.channelInfo[chan].is_moderator) chanData.mods.push(user);
					else if(user.channelInfo[chan].is_vip) chanData.vips.push(user);
					else chanData.viewers.push(user);
				}
			}
		}

		for (const chan in this.channels) {
			const chanData = this.channels[chan];
			type keys = keyof typeof chanData;
			for (const cat in chanData) {
				chanData[cat as keys].sort((a,b) => {
					if(a.displayName > b.displayName ) return 1;
					if(a.displayName < b.displayName ) return -1;
					return 0;
				});
			}
		}
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
			}
		}
	}
}
</style>