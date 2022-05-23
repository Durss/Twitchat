<template>
	<div class="emoteselector">
		<div v-if="users.length == 0" class="loader">
			<img src="@/assets/loader/loader_white.svg" alt="loader">
			<p>loading...</p>
		</div>

		<input v-if="users.length > 0" type="text" v-model="filter" placeholder="search..." class="dark">

		<div class="list" v-if="users.length > 0 && filter">
			<div v-if="filter" class="item">
				<div class="emotes">
					<img
						class="emote"
						v-for="e in filteredEmotes"
						:key="e.id"
						loading="lazy" 
						:src="'https://static-cdn.jtvnw.net/emoticons/v2/'+e.id+'/'+e.format[e.format.length-1]+'/dark/1.0'"
						:alt="e.name"
						:data-tooltip="e.name"
						@click="$emit('select', e.name)">
				</div>
			</div>
		</div>

		<div class="list" v-if="users.length > 0 && !filter">
			<div v-for="u in users" :key="u.user.id" class="item">
				<div class="head">
					<img :src="u.user.profile_image_url" alt="profile pic" class="avatar">
					<div class="login">{{u.user.display_name}}</div>
				</div>
				<div class="emotes">
					<img
						class="emote"
						v-for="e in u.emotes"
						:key="e.id"
						loading="lazy" 
						:src="'https://static-cdn.jtvnw.net/emoticons/v2/'+e.id+'/'+e.format[e.format.length-1]+'/dark/1.0'"
						:alt="e.name"
						:data-tooltip="e.name"
						@click="$emit('select', e.name)">
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import store from '@/store';
import TwitchUtils, { TwitchTypes } from '@/utils/TwitchUtils';
import gsap from 'gsap/all';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{},
	components:{},
	emits:["close", "select"]
})
export default class EmoteSelector extends Vue {

	public users:{user:TwitchTypes.UserInfo, emotes:TwitchTypes.Emote[]}[] = [];
	public filter:string = "";

	private clickHandler!:(e:MouseEvent) => void;

	public get filteredEmotes():TwitchTypes.Emote[] {
		let res:TwitchTypes.Emote[] = [];
		const s = this.filter.toLowerCase();
		for (let i = 0; i < this.users.length; i++) {
			const u = this.users[i];
			for (let j = 0; j < u.emotes.length; j++) {
				const e = u.emotes[j];
				if(e.name.toLowerCase().indexOf(s) > -1) {
					res.push(e);
				}
			}
		}
		return res;
	}

	public async mounted():Promise<void> {
		if(Object.keys(store.state.userEmotesCache).length > 0) {
			this.users = store.state.userEmotesCache as {user:TwitchTypes.UserInfo, emotes:TwitchTypes.Emote[]}[];
		}else{

			const emotes = await TwitchUtils.getEmotes();
			//Get unique users
			var users = emotes.filter((v, i, a) => a.findIndex(v2 => v2.owner_id == v.owner_id) === i);
			//Remove users with wrong IDs (like "twitch")
			users = users.filter(v => parseInt(v.owner_id).toString() === v.owner_id)
			//Load all users details to get their names
			const userList = await TwitchUtils.loadUserInfo(users.map(v => v.owner_id));
			//Sort them by name
			userList.sort((a, b) => a.display_name > b.display_name?  1 : -1);
			//Bring self to top
			userList.sort((a, b) => a.id === store.state.user.user_id?  -1 : 0);
			//Build a fast access object to know the index of a user from its ID.
			const uidToIndex:{[key:string]:number} = {};
			for (let i = 0; i < userList.length; i++) {
				uidToIndex[ userList[i].id ] = i;
				if(userList[i].login.toLowerCase() === "qa_tw_partner") {
					userList[i].login = "unlocked";
					userList[i].display_name = "Unlocked";
				}
			}
	
			//Add global emotes
			uidToIndex["0"] = userList.length;
			userList.push({
				broadcaster_type: "partner",
				created_at: "2018-05-29T19:45:23Z",
				description: "",
				display_name: "Global",
				id: "0",
				login: "global",
				offline_image_url: "",
				profile_image_url: require("@/assets/icons/emote.svg"),
				type: "",
				view_count: 0,
			});
	
			//Build emotes list for each sorted user
			const sets:{user:TwitchTypes.UserInfo, emotes:TwitchTypes.Emote[]}[] = [];
			for (let i = 0; i < emotes.length; i++) {
				const e = emotes[i];
				const index = uidToIndex[e.owner_id];
				if(!sets[ index ]) {
					sets[ index ] = {
						user:userList.find(v => v.id == e.owner_id) as TwitchTypes.UserInfo,
						emotes: [],
					}
				}
				sets[ index ].emotes.push(e);
			}
	
			//Save it to storage to avoid loading everything back again
			store.dispatch("setUserEmotesCache", sets);
			this.users = sets;
		}

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


}
</script>

<style scoped lang="less">
.emoteselector{
	.window();
	width: min-content;
	left: auto;
	right: 0;
	margin-left: auto;
	transform-origin: bottom right;

	&>*:not(:last-child) {
		margin-bottom: 5px;
	}

	.loader {
		margin: auto;
		text-align: center;
		img {
			width: 30px;
			height: 30px;
		}
		p {
			color: #fff;
			font-style: italic;
			font-size: 16px;
		}
	}

	.list {
		height: 400px;
		width: 399px;
		max-width: 100%;
		max-height: 80%;
		overflow-x: hidden;
		overflow-y: auto;

		.item {
			&:not(:last-child) {
				margin-bottom: 20px;
			}
			.head {
				display: flex;
				flex-direction: row;
				align-items: center;
				margin-bottom: 5px;
				background-color: @mainColor_normal;
				border-radius: 20px;
				.avatar {
					height: 25px;
					border-radius: 50%;
					margin-right: 10px;
				}
				.login {
					color: @mainColor_light;
					flex-grow: 1;
					font-size: 15px;
				}
			}
			.emotes {
				display: flex;
				flex-direction: row;
				flex-wrap: wrap;
				padding-left: 35px;
				.emote {
					height: 33px;
					width: 33px;
					padding: 3px;
					object-fit: contain;
					cursor: pointer;
					border-radius: 5px;
					transition: background-color .15s;
					&:hover {
						background-color: fade(@mainColor_light, 70%);
					}
				}
			}
		}

	}
}
</style>