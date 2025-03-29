<template>
	<div class="emoteselector" :class="classes">
		<div class="list" v-if="$store.stream.currentChatChannel.platform == 'youtube'">
			<div class="emotes">
				<img
					class="emote"
					v-for="e in youtubeEmotes"
						:key="e.id+e.code"
						:ref="e.id+e.code"
						loading="lazy"
						:src="e.images.url_1x"
						:alt="e.code"
					@mouseover="openTooltip($event, e)"
					@click="$emit('select', e)">
			</div>
		</div>

		<div v-else-if="filteredUsers.length == 0" class="loader">
			<Icon class="loader" name="loader" />
			<p>{{ $t("global.loading") }}</p>
		</div>

		<div class="list search" v-if="filteredUsers.length > 0 && filter">
			<div class="item">
				<div class="emotes">
					<div v-if="filteredEmotes.length == 0">{{ $t("global.no_result") }}</div>
					<img
						class="emote"
						v-for="e in filteredEmotes"
						:key="e.id+e.code"
						:ref="e.id+e.code"
						loading="lazy"
						:src="e.images.url_1x"
						:alt="e.code"
						@mouseover="openTooltip($event, e)"
						@click="$emit('select', e)">
				</div>
			</div>
		</div>

		<div class="list" v-if="filteredUsers.length > 0 && !filter">
			<div class="userEtry" v-for="u, index in filteredUsers" :key="u.user.id" :ref="'user_'+u.user.id" @click.ctrl="logEntry(u)">
				<div class="sticky">
					<img class="icon" :src="u.user.avatarPath" alt="profile pic">
					<div class="title">{{u.user.displayName}}</div>
				</div>

				<template class="item" v-if="buildOffset >= index">
					<div class="emotes">
						<img
							class="emote"
							v-for="e in u.emotes"
							:key="e.id+e.code"
							:ref="e.id+e.code"
							:id="'emote_'+e.id+e.code"
							loading="lazy"
							:src="e.images.url_1x"
							:alt="e.code"
							@mouseover="openTooltip($event, e)"
							@click="$emit('select', e)">
					</div>
				</template>
			</div>
		</div>

		<div class="card-item userList" v-if="filteredUsers.length > 0 && !filter">
			<TTButton class="user"
			v-for="u, index in filteredUsers" :key="u.user.id"
			v-tooltip="u.user.displayName"
			@click="scrollTo(u.user)"
			:loading="buildOffset < index">
				<img :src="u.user.avatarPath" alt="profile pic" class="avatar">
			</TTButton>
		</div>

		<TTButton v-if="!canListUserEmotes" secondary icon="lock_fit" @click="grantEmoteScope()">{{ $t("global.emote_scope") }}</TTButton>

		<input v-if="filteredUsers.length > 0" type="text" v-autofocus v-model="filter" :placeholder="$t('global.search_placeholder')" class="dark">
	</div>
</template>

<script lang="ts">
import StoreProxy from '@/store/StoreProxy';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import BTTVUtils from '@/utils/emotes/BTTVUtils';
import FFZUtils from '@/utils/emotes/FFZUtils';
import SevenTVUtils from '@/utils/emotes/SevenTVUtils';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { gsap } from 'gsap/gsap-core';
import {toNative,  Component, Vue, Prop } from 'vue-facing-decorator';
import { useTippy } from 'vue-tippy';
import Icon from '../Icon.vue';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import TTButton from '../TTButton.vue';
import { reactive } from 'vue';

@Component({
	components:{
		Icon,
		TTButton,
	},
	emits:["close", "select", "onLoad"]
})
class EmoteSelector extends Vue {

	@Prop({type:Boolean, default:false})
	public popoutMode!:boolean;

	public users:{user:TwitchatDataTypes.TwitchatUser, emotes:TwitchatDataTypes.Emote[]}[] = [];
	public filter = "";
	public buildOffset = 0;
	public youtubeEmotes:TwitchatDataTypes.Emote[] = [];

	private buildTimeout = -1;
	private tooltipCreated:{[key:string]:boolean} = {};
	private clickHandler!:(e:MouseEvent) => void;

	public get classes():{[key:string]:boolean} {
		return {
			"blured-background-window":this.popoutMode === false,
			"popout": this.popoutMode,
		}
	}

	public get canListUserEmotes():boolean {
		return TwitchUtils.hasScopes([TwitchScopes.READ_EMOTES]);
	}

	public get filteredUsers():typeof this.users {
		const chanId = this.$store.stream.currentChatChannel.id;
		const chanPlatform = this.$store.stream.currentChatChannel.platform;
		const res = this.users.filter(u=>{
			return u.emotes.filter(e=> {
				if(e.platform != chanPlatform) return false;
				return e.ownerOnly != true || e.owner!.id == chanId
			}).length > 0;
		});
		res.sort((a,b)=>{
			if(a.user.id === chanId) return -1;
			if(b.user.id === chanId) return 1;
			const idA = parseInt(a.user.id);
			const idB = parseInt(b.user.id);
			if(idA < 10) return idA;
			if(idB < 10) return idB;
			if(a.user.is_bot) return 1;
			return a.user.login.localeCompare(b.user.login);
		})
		return res;
	}

	public get filteredEmotes():TwitchatDataTypes.Emote[] {
		let res:TwitchatDataTypes.Emote[] = [];
		const s = this.filter.toLowerCase();
		for (let i = 0; i < this.filteredUsers.length; i++) {
			const u = this.filteredUsers[i];
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
		fetch(this.$asset("youtube/emote_list.json")).then(async query=> {
			const youtubeEmotes:{[code:string]:string} = await query.json();
			const res:TwitchatDataTypes.Emote[] = [];
			for (const key in youtubeEmotes) {
				const name = youtubeEmotes[key];
				res.push({
					code:key,
					id:key,
					images:{
						url_1x:"/youtube/emotes/sd/"+name,
						url_2x:"/youtube/emotes/sd/"+name,
						url_4x:"/youtube/emotes/hd/"+name,
					},
					is_public:true,
					platform:"youtube",
				})
			}

			this.youtubeEmotes = reactive(res);
		})

		if(Object.keys(this.$store.chat.emoteSelectorCache).length > 0) {
			this.users = this.$store.chat.emoteSelectorCache;
		}else{

			const emotes = await TwitchUtils.getEmotes();
			//Get unique users
			var users = emotes.filter((v, i, a) => a.findIndex(v2 => v2.owner!.id == v.owner!.id) === i);
			//Remove users with wrong IDs (like "twitch")
			users = users.filter(v => parseInt(v.owner!.id).toString() === v.owner!.id)
			//Load all users details to get their names
			const tmpList = await TwitchUtils.getUserInfo(users.map(v => v.owner!.id));
			const userList:TwitchatDataTypes.TwitchatUser[] = [];

			for (let i = 0; i < tmpList.length; i++) {
				const u = tmpList[i];
				const user = this.$store.users.getUserFrom("twitch", undefined, u.id, u.login, u.display_name);
				user.avatarPath = tmpList.find(v=>v.id == user.id)!.profile_image_url;
				userList.push(user);
			}

			//Sort them by name
			userList.sort((a, b) => a.displayName > b.displayName?  1 : -1);
			//Bring self to top
			userList.sort(a => a.id === StoreProxy.auth.twitch.user.id?  -1 : 0);
			//Build a fast access object to know the index of a user from their ID.
			const uidToIndex:{[key:string]:number} = {};
			for (let i = 0; i < userList.length; i++) {
				uidToIndex[ userList[i].id ] = i;
			}

			//Add global emotes
			uidToIndex["0"] = userList.length;
			userList.push({
				platform:"twitch",
				login:"global",
				displayName:"Global",
				displayNameOriginal:"Global",
				avatarPath:this.$asset("icons/twitch.svg"),
				id:"0",
				is_affiliate:false,
				is_partner:false,
				is_tracked:false,
				is_blocked:false,
				pronouns:false,
				pronounsLabel:false,
				pronounsTooltip:false,
				channelInfo:{},
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

			if(this.$store.params.appearance.bttvEmotes.value === true) {
				//Add BTTV emotes
				sets.push({
						user:{
						platform:"twitch",
						login:"BTTV",
						displayName:"BTTV",
						displayNameOriginal:"BTTV",
						avatarPath:this.$asset("icons/emote.svg"),
						id:"1",
						is_affiliate:false,
						is_partner:false,
						is_tracked:false,
						is_blocked:false,
						pronouns:false,
						pronounsLabel:false,
						pronounsTooltip:false,
						channelInfo:{},
						is_bot:true,
					},
					emotes: BTTVUtils.instance.emotes,
				});
			}

			if(this.$store.params.appearance.sevenTVEmotes.value === true) {
				//Add 7TV emotes
				sets.push({
						user:{
						platform:"twitch",
						login:"7TV",
						displayName:"7TV",
						displayNameOriginal:"7TV",
						avatarPath:this.$asset("icons/emote.svg"),
						id:"2",
						is_affiliate:false,
						is_partner:false,
						is_tracked:false,
						is_blocked:false,
						pronouns:false,
						pronounsLabel:false,
						pronounsTooltip:false,
						channelInfo:{},
						is_bot:true,
					},
					emotes: SevenTVUtils.instance.emotes,
				});
			}

			if(this.$store.params.appearance.ffzEmotes.value === true) {
				//Add FFZ emotes
				sets.push({
						user:{
						platform:"twitch",
						login:"FFZ",
						displayName:"FFZ",
						displayNameOriginal:"FFZ",
						avatarPath:this.$asset("icons/emote.svg"),
						id:"3",
						is_affiliate:false,
						is_partner:false,
						is_tracked:false,
						is_blocked:false,
						pronouns:false,
						pronounsLabel:false,
						pronounsTooltip:false,
						channelInfo:{},
						is_bot:true,
					},
					emotes: FFZUtils.instance.emotes,
				});
			}

			//Save it to storage to avoid loading everything back again
			this.$store.chat.setEmoteSelectorCache(sets);
			this.users = sets;
		}

		this.buildOffset = 0;
		await this.$nextTick();
		this.clickHandler = (e:MouseEvent) => this.onClick(e);
		document.addEventListener("mousedown", this.clickHandler);
		this.open();
		this.buildNextUser();
		this.$emit("onLoad");
	}

	public beforeUnmount():void {
		clearTimeout(this.buildTimeout);
		document.removeEventListener("mousedown", this.clickHandler);
	}

	/**
	 * Create tooltip only when hovering the image.
	 * This avoids huge lag on build if creating tooltip on every items
	 * at once.
	 *
	 * @param event
	 * @param emote
	 */
	public openTooltip(event:MouseEvent, emote:TwitchatDataTypes.Emote):void {
		if(this.tooltipCreated[emote.code] === true) return;
		this.tooltipCreated[emote.code] = true;
		useTippy(event.currentTarget as HTMLImageElement, {
			content: "<img src="+emote.images.url_4x+" width=\"112\" class=\"emote\"><br><center>"+emote.code+"</center>",
		});
	}

	/**
	 * Scrolls list ot a specific user
	 * @param user
	 */
	public scrollTo(user:TwitchatDataTypes.TwitchatUser):void {
		const [holder] = this.$refs["user_"+user.id] as  HTMLDivElement[];
		holder.scrollIntoView();
	}

	/**
	 * Requests for emote scope
	 */
	public grantEmoteScope():void {
		TwitchUtils.requestScopes([TwitchScopes.READ_EMOTES]);
	}

	public logEntry(entry:typeof this.users[number]):void {
		console.log(entry);
	}

	private open():void {
		if(this.popoutMode !== false) return;
		const ref = this.$el as HTMLDivElement;
		gsap.killTweensOf(ref);
		gsap.from(ref, {duration:.1, translateX:"115%", delay:.2, ease:"sine.out"});
		gsap.fromTo(ref, {scaleX:1.1}, {duration:.5, delay:.3, scaleX:1, clearProps:"scaleX,translateX", ease:"elastic.out(1)"});
	}

	private close():void {
		if(this.popoutMode !== false) return;
		clearTimeout(this.buildTimeout);
		const ref = this.$el as HTMLDivElement;
		gsap.killTweensOf(ref);
		gsap.to(ref, {duration:.1, scaleX:1.1, ease:"sin.in"});
		gsap.to(ref, {duration:.1, translateX:"100%", scaleX:1, delay:.1, clearProps:"translateX", ease:"sin.out", onComplete:() => {
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

	/**
	 * This increments a counter that's used as the reference
	 * for building users.
	 * A user is built only if its index is greater or equal
	 * to the current build offset.
	 * This avoids huge lag on open if user is subbed to lots
	 * of channels.
	 */
	private buildNextUser():void {
		if(this.buildOffset >= this.users.length) return;

		const u = this.users[this.buildOffset];
		this.buildTimeout = window.setTimeout(()=>{
			this.buildOffset ++;
			this.buildNextUser();
		}, Math.min(250, u.emotes.length * 5));
	}

}
export default toNative(EmoteSelector);
</script>

<style scoped lang="less">
.emoteselector{
	width: min-content;
	left: auto;
	right: 0;
	margin-left: auto;
	transform-origin: bottom right;
	overflow-y: hidden;

	&>*:not(:last-child) {
		margin-bottom: 5px;
	}

	.userList {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: .5em;
		max-height: 6em;
		overflow-y: auto;
		justify-content: center;
		margin: .5em 0;
		.user {
			cursor: pointer;
			padding: 0;
			height: 2em;
			width: 2em;
			font-size: 1em;
			border-radius: 50%;
			.avatar {
				width: 100%;
				border-radius: 50%;
			}
			&:hover {
				.avatar {
					filter: brightness(150%);
				}
			}
		}
	}

	.loader {
		margin: auto;
		text-align: center;
		color: var(--color-light);
		.icon {
			width: 2em;
			height: 2em;
		}
		p {
			font-style: italic;
			font-size: 1em;
		}
	}

	.list {
		width: 400px;
		max-width: 100%;
		overflow-x: hidden;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: .5em;
		flex-shrink: 1;
		color: var(--color-text);

		.sticky {
			top: 0;
			position: sticky;
			backdrop-filter: opacity(0%);

			display: flex;
			flex-direction: row;
			background-color: var(--background-color-fader);
			border-radius: 2em;
			padding: .5em;
			backdrop-filter: blur(5px);

			& > .icon {
				height: 2em;
				margin-top: -.5em;
				margin-left: -.5em;
				margin-bottom: -.5em;
				border-radius: 50%;
			}
			& > .title {
				align-self: center;
				flex-grow: 1;
				text-align: center;
				overflow-wrap: break-word;
				overflow: hidden;
				font-weight: bold;
				padding: 0 .5em
			}
		}
		.emotes, .hypetrain {
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			justify-content: center;
			margin-bottom: 1em;
			.emote {
				height: 2em;
				width: 2em;
				padding: 2px;
				cursor: pointer;
				border: 1px solid transparent;
				border-radius: 5px;
				object-fit: contain;
				&:hover {
					border-color: var(--color-secondary);
				}
			}
		}

		.hypetrain {
			font-size: .9em;
			text-align: center;
			line-height: 1.3em;
			padding-top: 1em;
		}

		&.search {
			.item {
				.emotes {
					border-radius: var(--border-radius);
					// background-color: transparent;
				}
			}
		}
	}
	input {
		width: 100%;
		color:var(--color-text);
	}

	&.popout {
		padding: .5em;
		border-radius: var(--border-radius);
		background-color: var(--background-color-primary);
		font-size: .8em;
		margin-left: unset;
		.list {
			max-height: 300px;
		}
		.userList {
			max-height: 3em;
		}
	}
}
</style>
