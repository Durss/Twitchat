<template>
	<div class="emoteselector">
		<div v-if="users.length == 0" class="loader">
			<img src="@/assets/loader/loader_white.svg" alt="loader">
			<p>{{ $t("global.loading") }}</p>
		</div>

		<input v-if="users.length > 0" type="text" v-model="filter" :placeholder="$t('global.search_placeholder')" class="dark">

		<div class="list" v-if="users.length > 0 && filter">
			<div v-if="filter" class="item">
				<div class="emotes">
					<img
						class="emote"
						v-for="e in filteredEmotes"
						:key="e.id"
						loading="lazy" 
						:src="e.images.url_1x"
						:alt="e.code"
						:data-tooltip="'<img src='+e.images.url_4x+' width=\'112\' class=\'emote\'><br><center>'+e.code+'</center>'"
						@click="$emit('select', e.code)">
				</div>
			</div>
		</div>

		<div class="list" v-if="users.length > 0 && !filter">
			<div v-for="u in users" :key="u.user.id" class="item">
				<div class="head">
					<img :src="u.user.avatarPath" alt="profile pic" class="avatar">
					<div class="login">{{u.user.displayName}}</div>
				</div>

				<div v-if="u.user.id=='477339272'" class="hypetrain">{{ $t("global.hypetrain_emotes") }}</div>

				<div class="emotes">
					<img
						class="emote"
						v-for="e in u.emotes"
						:key="e.id"
						loading="lazy" 
						:src="e.images.url_1x"
						:alt="e.code"
						:data-tooltip="'<img src='+e.images.url_4x+' width=\'112\' class=\'emote\'><br><center>'+e.code+'</center>'"
						@click="$emit('select', e.code)">
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import StoreProxy from '@/store/StoreProxy';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import BTTVUtils from '@/utils/emotes/BTTVUtils';
import FFZUtils from '@/utils/emotes/FFZUtils';
import SevenTVUtils from '@/utils/emotes/SevenTVUtils';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import gsap from 'gsap';
import { Component, Vue } from 'vue-facing-decorator';

@Component({
	components:{},
	emits:["close", "select"]
})
export default class EmoteSelector extends Vue {

	public users:{user:TwitchatDataTypes.TwitchatUser, emotes:TwitchatDataTypes.Emote[]}[] = [];
	public filter = "";

	private clickHandler!:(e:MouseEvent) => void;

	public get filteredEmotes():TwitchatDataTypes.Emote[] {
		let res:TwitchatDataTypes.Emote[] = [];
		const s = this.filter.toLowerCase();
		for (let i = 0; i < this.users.length; i++) {
			const u = this.users[i];
			for (let j = 0; j < u.emotes.length; j++) {
				const e = u.emotes[j];
				if(e.code.toLowerCase().indexOf(s) > -1) {
					res.push(e);
				}
			}
		}
		return res;
	}

	public async mounted():Promise<void> {
		if(Object.keys(this.$store("chat").emoteSelectorCache).length > 0) {
			this.users = this.$store("chat").emoteSelectorCache;
		}else{

			const emotes = await TwitchUtils.getEmotes();
			//Get unique users
			var users = emotes.filter((v, i, a) => a.findIndex(v2 => v2.owner!.id == v.owner!.id) === i);
			//Remove users with wrong IDs (like "twitch")
			users = users.filter(v => parseInt(v.owner!.id).toString() === v.owner!.id)
			//Load all users details to get their names
			const tmpList = await TwitchUtils.loadUserInfo(users.map(v => v.owner!.id));
			const userList:TwitchatDataTypes.TwitchatUser[] = [];
			
			for (let i = 0; i < tmpList.length; i++) {
				const u = tmpList[i];
				const user = this.$store("users").getUserFrom("twitch", undefined, u.id, u.login, u.display_name);
				user.avatarPath = tmpList.find(v=>v.id == user.id)!.profile_image_url;
				userList.push(user);
			}
			
			//Sort them by name
			userList.sort((a, b) => a.displayName > b.displayName?  1 : -1);
			//Bring self to top
			userList.sort(a => a.id === StoreProxy.auth.twitch.user.id?  -1 : 0);
			//Build a fast access object to know the index of a user from its ID.
			const uidToIndex:{[key:string]:number} = {};
			for (let i = 0; i < userList.length; i++) {
				uidToIndex[ userList[i].id ] = i;
				if(userList[i].login.toLowerCase() === "qa_tw_partner") {
					userList[i].login = "unlocked";
					userList[i].displayName = "Unlocked";
				}
			}
	
			//Add hype trains emotes
			uidToIndex["477339272"] = userList.length;
			userList.push({
				platform:"twitch",
				login:"twitchhypetrain",
				displayName:"TwitchHypeTrain",
				avatarPath:this.$image("img/hypetrain_avatar.png"),
				id:"477339272",
				is_raider:false,
				is_affiliate:false,
				is_partner:false,
				is_tracked:false,
				pronouns:false,
				pronounsLabel:false,
				pronounsTooltip:false,
				channelInfo:{},
				donor:{state:false, level:0, upgrade:false, noAd:false},
				is_bot:false,
			});
	
			//Add global emotes
			uidToIndex["0"] = userList.length;
			userList.push({
				platform:"twitch",
				login:"global",
				displayName:"Global",
				avatarPath:this.$image("icons/emote.svg"),
				id:"0",
				is_raider:false,
				is_affiliate:false,
				is_partner:false,
				is_tracked:false,
				pronouns:false,
				pronounsLabel:false,
				pronounsTooltip:false,
				channelInfo:{},
				donor:{state:false, level:0, upgrade:false, noAd:false},
				is_bot:false,
			});
	
			//Build emotes list for each sorted user
			const sets:{user:TwitchatDataTypes.TwitchatUser, emotes:TwitchatDataTypes.Emote[]}[] = [];
			for (let i = 0; i < emotes.length; i++) {
				const e = emotes[i];
				const index = uidToIndex[e.owner!.id];
				if(!sets[ index ]) {
					sets[ index ] = {
						user:userList.find(v => v.id == e.owner!.id)!,
						emotes: [],
					}
				}
				sets[ index ].emotes.push(e);
			}

			sets[ uidToIndex["477339272"] ] = {
				user:userList.find(v => v.id == "477339272")!,
				emotes: [],
			};
	
			if(this.$store("params").appearance.bttvEmotes.value === true) {
				//Add BTTV emotes
				sets.push({
						user:{
						platform:"twitch",
						login:"BTTV",
						displayName:"BTTV",
						avatarPath:this.$image("icons/emote.svg"),
						id:"1",
						is_raider:false,
						is_affiliate:false,
						is_partner:false,
						is_tracked:false,
						pronouns:false,
						pronounsLabel:false,
						pronounsTooltip:false,
						channelInfo:{},
						donor:{state:false, level:0, upgrade:false, noAd:false},
						is_bot:true,
					},
					emotes: BTTVUtils.instance.emotes,
				});
			}
	
			if(this.$store("params").appearance.sevenTVEmotes.value === true) {
				//Add 7TV emotes
				sets.push({
						user:{
						platform:"twitch",
						login:"7TV",
						displayName:"7TV",
						avatarPath:this.$image("icons/emote.svg"),
						id:"2",
						is_raider:false,
						is_affiliate:false,
						is_partner:false,
						is_tracked:false,
						pronouns:false,
						pronounsLabel:false,
						pronounsTooltip:false,
						channelInfo:{},
						donor:{state:false, level:0, upgrade:false, noAd:false},
						is_bot:true,
					},
					emotes: SevenTVUtils.instance.emotes,
				});
			}
	
			if(this.$store("params").appearance.ffzEmotes.value === true) {
				//Add FFZ emotes
				sets.push({
						user:{
						platform:"twitch",
						login:"FFZ",
						displayName:"FFZ",
						avatarPath:this.$image("icons/emote.svg"),
						id:"3",
						is_raider:false,
						is_affiliate:false,
						is_partner:false,
						is_tracked:false,
						pronouns:false,
						pronounsLabel:false,
						pronounsTooltip:false,
						channelInfo:{},
						donor:{state:false, level:0, upgrade:false, noAd:false},
						is_bot:true,
					},
					emotes: FFZUtils.instance.emotes,
				});
			}
	
			//Save it to storage to avoid loading everything back again
			this.$store("chat").setEmoteSelectorCache(sets);
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
		while(target != document.body && target != ref && target) {
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
				justify-content: center;
				background-color: fade(@mainColor_normal, 30%);
				color:@mainColor_light;
				width: calc(100% - 2em);
				margin: auto;
				border-bottom-left-radius: @border_radius;
				border-bottom-right-radius: @border_radius;
				.emote {
					height: 33px;
					width: 33px;
					padding: 3px;
					cursor: pointer;
					border-radius: 5px;
					border: 1px solid transparent;
					&:hover {
						border-color: fade(@mainColor_light, 70%);
					}
				}
			}

			.hypetrain {
				font-size: .7em;
				text-align: center;
				background-color: fade(@mainColor_normal, 30%);
				color:@mainColor_light;
				padding: .5em;
				width: calc(100% - 2em);
				margin: auto;
				border-bottom-left-radius: @border_radius;
				border-bottom-right-radius: @border_radius;
			}
		}

	}
}
</style>