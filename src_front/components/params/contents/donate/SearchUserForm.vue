<template>
	<div class="searchuserform" :class="{inline: inline !== false, upwards: upwards !== false}">
		<form @submit.prevent>
			<input class="giftedInput" type="text"
				maxlength="25"
				:placeholder="$t('global.search_placeholder')"
				v-model="search"
				@input="onSearch()"
				@keydown.stop="onKeyDown($event)"
				v-autofocus>
			<Icon v-if="searching" name="loader" class="loader" />
			<TTButton v-else-if="search" icon="cross" class="cancel" transparent noBounce @click="clearSearch()"></TTButton>
		</form>
		
		<div class="userList" v-if="users.length > 0">
			<TransitionGroup name="list"
			:css="false"
			@enter="onEnter">
				<button type="button"
				v-for="(user, index) in users"
				v-if="showResult"
				:class="{user:true, selected:selectedindex === index, live:liveStates[user.id]}"
				:key="user.id"
				:data-index="index"
				@click="selectUser(user)">
					<img :src="user.profile_image_url.replace(/300x300/gi, '50x50')" alt="avatar">
					<Icon name="mod" class="icon" v-if="moderatedChanIds.includes(user.id)" />
					<div class="login">{{ user.display_name }}</div>
				</button>
			</TransitionGroup>
		</div>

		<div class="userList">
			<TransitionGroup name="list"
			:css="false"
			@enter="onEnter"
			@leave="onLeave">
				<button class="user live" type="button"
				v-for="(user, index) in staticUserListFiltered"
				v-if="staticUserListFiltered.length > 0 && search.length == 0 && showStatic"
				:key="user.id"
				:data-index="index"
				@click="selectUser(user)">
					<img :src="user.profile_image_url.replace(/300x300/gi, '50x50')" alt="avatar">
					<Icon name="mod" class="icon" v-if="moderatedChanIds.includes(user.id)" />
					<div class="login">{{ user.display_name }}</div>
				</button>
			</TransitionGroup>
		</div>
		<div class="noResult" v-if="noResult">{{ $t("global.no_result") }}</div>
	</div>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import { TTButton } from '@/components/TTButton.vue';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { gsap } from 'gsap/gsap-core';
import { Component, Prop, Vue, toNative } from 'vue-facing-decorator';

@Component({
	components:{
		Icon,
		TTButton,
	},
	emits:["close", "update:modelValue", "select"],
})
class SearchUserForm extends Vue {

	@Prop()
	public modelValue?:TwitchDataTypes.UserInfo;

	@Prop({default:false})
	public inline!:boolean;
	
	@Prop({default:false, type:Boolean})
	public upwards!:boolean;

	@Prop({default:[]})
	public excludedUserIds!:string[];

	@Prop({default:[]})
	public staticUserList!:TwitchDataTypes.UserInfo[];

	public search:string = "";
	public selectedindex = 0;
	public users:TwitchDataTypes.UserInfo[] = []
	public noResult:boolean = false;
	public searching:boolean = false;
	public showResult:boolean = false;
	public showStatic:boolean = false;
	public liveStates:{[uid:string]:boolean} = {}
	public moderatedChanIds:string[] = [];

	private abortQuery:AbortController|null = null;

	public get staticUserListFiltered():TwitchDataTypes.UserInfo[] {
		return (this.staticUserList || [])
		.filter(user => (this.excludedUserIds || []).indexOf(user.id) === -1)
		.sort((a,b) => {
			if(this.moderatedChanIds.includes(a.id) && !this.moderatedChanIds.includes(b.id)) return -1;
			if(!this.moderatedChanIds.includes(a.id) && this.moderatedChanIds.includes(b.id)) return 1;
			return a.login.toLowerCase().localeCompare(b.login.toLowerCase());
		})
	}

	public mounted():void {
		this.showStatic = true;
		this.moderatedChanIds = this.$store.auth.twitchModeratedChannels.map(u=>u.broadcaster_id);
	}

	public onKeyDown(event:KeyboardEvent):void {
		if(event.key == 'Escape') {
			this.clearSearch();
		}
		if(event.key == 'ArrowDown') {
			this.selectedindex += this.upwards !== false? -1 : 1;
		}
		if(event.key == 'ArrowUp') {
			this.selectedindex += this.upwards !== false? 1 : -1;
		}
		if(this.selectedindex < 0) this.selectedindex = this.users.length - 1;
		if(this.selectedindex >= this.users.length) this.selectedindex = 0;
		if(event.key == 'Enter') {
			this.selectUser(this.users[this.selectedindex]!);
		}
	}

	public async onSearch():Promise<void> {
		this.searching = this.search != "";
		this.noResult = false;
		if(this.abortQuery && !this.abortQuery.signal.aborted) this.abortQuery.abort("search update");
		this.abortQuery = new AbortController();
		if(this.searching) {
			const signal = this.abortQuery!.signal;
			const result = (await TwitchUtils.searchUser(this.search, 5, signal) || []);
			this.liveStates = result.liveStates;
			this.users = result.users.filter(user => (this.excludedUserIds || []).indexOf(user.id) === -1)
						.sort((a,b) => {
							const aMod = this.moderatedChanIds.includes(a.id);
							const bMod = this.moderatedChanIds.includes(b.id);
							if(aMod && !bMod) return -1;
							if(!aMod && bMod) return 1;
							if(aMod && bMod) return a.login.toLowerCase().toLowerCase().localeCompare(b.login.toLowerCase().toLowerCase())
							return 0
						});
			if(!signal.aborted) {
				this.searching = false;
				this.noResult = this.users.length === 0;
				await this.$nextTick();
				this.showResult = true;
			}
			this.selectedindex = 0;
		}else{
			this.users = [];
			this.showResult = false;
		}
	}

	public clearSearch():void {
		this.search = "";
		this.onSearch();
		this.$emit("close");
	}

	public selectUser(user:TwitchDataTypes.UserInfo):void {
		this.$emit("update:modelValue", user);
		this.$emit("select", user);
	}

	public onEnter(el:Element, done:()=>void) {
		gsap.fromTo(el, {opacity:0, y:-20},
		{
			y: 0,
			opacity: 1,
			duration:.25,
			// maxHeight: "2em",
			delay: parseInt((el as HTMLElement).dataset.index!) * 0.015,
			onComplete: done
		})
	}

	public onLeave(el:Element, done:()=>void) {
		gsap.to(el,
		{
			y: -20,
			opacity: 0,
			duration:.25,
			delay: parseInt((el as HTMLElement).dataset.index!) * 0.015,
			onComplete: done
		})
	}
}
export default toNative(SearchUserForm);
</script>

<style scoped lang="less">
.searchuserform{
	position: relative;

	&.inline {
		background: unset;
		backdrop-filter: unset;
		box-shadow: unset;
		input {
			background-color: var(--background-color-fader);
		}

		.userList{
			position: relative;
			background: unset;
			.user:hover {
				background-color: var(--background-color-fader);
			}
		}
	}
	form {
		.loader {
			height: 1em;
			width: 1em;
			position: relative;
			top: .25em;
			margin-left: -1.25em;
		}
		.cancel {
			position: relative;
			top: .25em;
			margin-left: -1.7em;
		}
		input {
			background-color: var(--grayout-fadest);
			width: 100%;
			min-width: unset;
			max-width: unset;
		}
	}

	.noResult {
		text-align: center;
		margin-top: .5em;
	}

	.userList{
		gap: 1px;
		display: flex;
		flex-direction: column;
		position: absolute;
		padding: .5em;
		border-radius: var(--border-radius);
		background: var(--background-color-secondary);
		width: 100%;
		&:empty  {
			display: none;
		}
		.user.live > img {
			border: 1px solid #f00;
		}
		.user.live::after {
			content:"";
			width:7px;
			height:7px;
			border-radius: 50%;
			background-color: #f00;
			box-shadow: -2px 2px 3px #000;
			position: absolute;
			top: .1em;
			left: 1.6em;
		}
	}

	&.upwards {
		.userList {
			bottom: 100%;
			flex-direction: column-reverse;
		}
	}

	.user {
		gap: .5em;
		display: flex;
		flex-direction: row;
		align-items: center;
		color: var(--color-text);
		border-radius: 50px;
		position:relative;
		border: 1px solid transparent;
		.login {
			text-overflow: ellipsis;
			overflow: hidden;
			flex-grow: 1;
		}
		img {
			height: 2em;
			border-radius: 50%;
		}
		.icon {
			height: 1em;
			border-radius: 50%;
		}
		&:hover {
			background-color: var(--grayout);
		}
		&.selected {
			border-color: var(--color-text);
			background-color: var(--grayout);
		}
	}
}
</style>