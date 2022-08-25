<template>
	<div class="userlist">
		<h1><img src="@/assets/icons/user.svg" alt="users"> Chat users <i>({{users.length}})</i></h1>
		<a @click="toggleInfos()" class="infoBt">Why is the chat users count different from the viewer count?</a>
		<div v-if="showInfo" class="infos" ref="infos">
			<p>Chat user count shows people actually connected on your chat, viewers count tells how many viewers are watching you.</p>
			<p>It's possible to be on a chat without watching the stream <i>(like bots)</i> and it's possibler to watch the stream without being on the chat <i>(when watching from homepage or after closing the chat or in audio-only on mobile)</i></p>
			<p>Also, nothing's official, but it's almost certain that Twitch removes you from the viewer count if you keep the stream on a background tab for some time while keeping you connected on the chat so you keep receiving messages.</p>
			<p>This usually makes your chatters count go higher than your viewers count after a raid.</p>
			<p>When on homepage though, your viewer count will be MUCH higher than your chatters count.</p>
		</div>
		
		<div class="users broadcaster" v-if="broadcaster.length > 0">
			<div class="title">Broadcaster <i>({{broadcaster.length}})</i></div>
			<div class="list">
				<a :class="userClasses(u.login)" :href="'https://twitch.tv/'+u.login" target="_blank" v-for="u in broadcaster" :key="u.id">{{u.login}}</a>
			</div>
		</div>
		
		<div class="users mods" v-if="mods.length > 0">
			<div class="title">Moderators <i>({{mods.length}})</i></div>
			<div class="list">
				<a :class="userClasses(u.login)" :href="'https://twitch.tv/'+u.login" target="_blank" v-for="u in mods" :key="u.id">{{u.login}}</a>
			</div>
		</div>
		
		<div class="users vips" v-if="vips.length > 0">
			<div class="title">VIPs <i>({{vips.length}})</i></div>
			<div class="list">
				<a :class="userClasses(u.login)" :href="'https://twitch.tv/'+u.login" target="_blank" v-for="u in vips" :key="u.id">{{u.login}}</a>
			</div>
		</div>

		<div class="users simple" v-if="simple.length > 0">
			<div class="title">Users <i>({{simple.length}})</i></div>
			<div class="list">
				<a :class="userClasses(u.login)" :href="'https://twitch.tv/'+u.login" target="_blank" v-for="u in simple" :key="u.id">{{u.login}}</a>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchDataTypes } from '@/types/TwitchDataTypes';
import StoreProxy from '@/utils/StoreProxy';
import UserSession from '@/utils/UserSession';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{},
	components:{},
	emits:["close"]
})
export default class UserList extends Vue {

	public users:UserItem[] = [];
	public showInfo:boolean = false;

	public get broadcaster():UserItem[] { return this.users.filter(u=>u.broadcaster); }

	public get mods():UserItem[] { return this.users.filter(u=>u.mod); }

	public get vips():UserItem[] { return this.users.filter(u=>u.vip); }

	public get simple():UserItem[] { return this.users.filter(u=>{ return !u.mod && !u.broadcaster && !u.vip; }); }
	
	public userClasses(name:string):string[] {
		let res = ["user"];
		if(StoreProxy.store.state.params.appearance.highlightNonFollowers.value === true
		&& StoreProxy.store.state.followingStatesByNames[name.toLowerCase()] === false) res.push("noFollow");
		return res;
	}

	private clickHandler!:(e:MouseEvent) => void;

	public mounted():void {
		this.clickHandler = (e:MouseEvent) => this.onClick(e);
		document.addEventListener("mousedown", this.clickHandler);
		this.updateList();
		watch(() => StoreProxy.store.state.onlineUsers, () => {
			this.updateList();
		}, { deep: true });
		this.open();
	}

	public beforeUnmount():void {
		document.removeEventListener("mousedown", this.clickHandler);
	}

	public async toggleInfos():Promise<void> {
		if(this.showInfo) {
			const holder = this.$refs.infos as HTMLDivElement;
			gsap.to(holder, {duration:.5, height:0, minHeight:0, marginTop:0, paddingTop:0, paddingBottom:0, ease:"sine.inOut", onComplete:()=>{this.showInfo = false;}});
		}else{
			this.showInfo = true;
			await this.$nextTick();
			const holder = this.$refs.infos as HTMLDivElement;
			const bounds = holder.getBoundingClientRect();
			holder.style.overflow = "hidden";
			holder.style.height = bounds.height+"px";
			holder.style.minHeight = bounds.height+"px";
			console.log(bounds);
			gsap.from(holder, {duration:.5, minHeight:0, height:0, marginTop:0, paddingTop:0, paddingBottom:0, ease:"sine.inOut"});
		}
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
		let res:UserItem[] = [];
		const users = StoreProxy.store.state.onlineUsers as string[];
		for (let j = 0; j < users.length; j++) {
			const userName = users[j];
			const userNameLow = userName?.toLowerCase();
			res.push({
				login:userName,
				id:userNameLow,
				broadcaster:userNameLow == UserSession.instance.authToken.login.toLowerCase(),
				vip:false,
				mod:(StoreProxy.store.state.mods as TwitchDataTypes.ModeratorUser[]).find(m => m.user_login === userNameLow) !== undefined,
				sub:false,
			});
		}

		res.sort((a,b) => {
			if(a.broadcaster && !b.broadcaster) return -1;
			if(b.broadcaster && !a.broadcaster) return  1;
			if(a.mod && !b.mod) return -1;
			if(b.mod && !a.mod) return  1;
			if(a.vip && !b.vip) return -1;
			if(b.vip && !a.vip) return  1;
			if(a.login > b.login ) return 1;
			if(a.login < b.login ) return -1;
			return 0;
		});

		this.users = res;
	}


}

interface UserItem {
	login:string;
	id:string;
	broadcaster:boolean;
	vip:boolean;
	mod:boolean;
	sub:boolean;
}
</script>

<style scoped lang="less">
.userlist{
	.window();

	overflow-y: auto;
	font-size: 16px;

	h1 {
		color: @mainColor_light;
		align-self: center;
		margin-bottom: 10px;

		img {
			height: 1em;
			vertical-align: middle;
		}
	}

	.infoBt {
		margin: auto;
		font-style: italic;
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

	.users {
		margin-top: 20px;

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

				&.noFollow {
					color: @mainColor_warn;

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