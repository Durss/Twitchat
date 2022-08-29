<template>
	<div class="ttuserlist">
		<div class="content" ref="list">
			<div class="title">
				<p><img src="@/assets/icons/user.svg" class="icon" />{{userCount}} users</p>
				<Button aria-label="Close users list" small :icon="$image('icons/cross_white.svg')" class="closeBt" @click="close()" />
			</div>
			
			<div class="noResult" v-if="!loading && userCount == 0">no user found :(</div>
		
			<div class="stats">
				<div class="table">
					<p>Active users last 24h :</p><p>{{activeLast24h}}</p>
					<p>Active users last 7 days :</p><p>{{activeLast7days}}</p>
					<p>Active users last 30 days :</p><p>{{activeLast30days}}</p>
				</div>
				<div class="ctas">
					<Button small :disabled="loading" title="Reload" :icon="$image('icons/refresh.svg')" @click="updateList()" />
					<!-- <Button small :disabled="loading" title="Load 24h" :icon="$image('icons/user.svg')" @click="loadTimeframe(1)" />
					<Button small :disabled="loading" title="Load 7d" :icon="$image('icons/user.svg')" @click="loadTimeframe(7)" />
					<Button small :disabled="loading" title="Load 30d" :icon="$image('icons/user.svg')" @click="loadTimeframe(30)" /> -->
				</div>
			</div>

			<div class="list">
				<a v-for="u in usersSpool"
					:key="u.id"
					class="user"
					ref="userCard"
					:href="u.user? 'https://twitch.tv/' + u.user.login : '#'"
					target="_blank"
				>
					<div class="header" v-if="u.user">
						<img :src="getProfilePicURL(u)" alt="profile" class="avatar">
						
						<span class="login">
							{{u.user.login}}
							<img src="@/assets/icons/partner.svg" alt="partner" class="partner" v-if="u.user.broadcaster_type == 'partner'">
						</span>
					</div>
					<div class="header" v-else>
						<img src="@/assets/icons/user_purple.svg" alt="profile" class="avatar">
						<span class="login">DELETED USER ID {{u.id}}</span>
					</div>
					<div class="details">{{formatDate(u)}}</div>
				</a>

				<img src="@/assets/loader/loader_white.svg" alt="loader" class="loader" v-if="loading">
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchDataTypes } from '@/types/TwitchDataTypes';
import Config from '@/utils/Config';
import StoreProxy from '@/utils/StoreProxy';
import TwitchUtils from '@/utils/TwitchUtils';
import UserSession from '@/utils/UserSession';
import Utils from '@/utils/Utils';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';

@Options({
	props:{},
	components:{
		Button,
	},
	emits:["close"]
})
export default class TTUserList extends Vue {

	public users:UserData[] = [];
	public usersSpool:UserData[] = [];
	public loading:boolean = true;
	public token:string = "";
	public spoolChunkSize:number = 200;
	public userCount:number = 0;
	public activeLast24h:number = 0;
	public activeLast7days:number = 0;
	public activeLast30days:number = 0;

	private clickHandler!:(e:MouseEvent) => void;
	
	public get splitView():boolean { return StoreProxy.store.state.params.appearance.splitView.value as boolean && StoreProxy.store.state.canSplitView; }
	public get classes():string[] {
		const res = ["ttuserlist"];
		if(this.splitView) res.push("splitView");
		return res;
	}

	public formatDate(u:UserData):string {
		const d = new Date(u.date);
		return Utils.formatDate(d);
	}

	public beforeMount():void {
		this.token = StoreProxy.store.state.tempStoreValue as string;
	}

	public mounted():void {
		this.clickHandler = (e:MouseEvent) => this.onClick(e);
		document.addEventListener("mousedown", this.clickHandler);
		const list = this.$refs.list as HTMLDivElement;
		list.addEventListener("scroll", (ev:Event):void => {
			if ((list.clientHeight + list.scrollTop) >= list.scrollHeight) {
				if(!this.loading) {
					this.loadNextUsers();
				}
			}
		});
		this.updateList();
	}

	public beforeUnmount():void {
		document.removeEventListener("mousedown", this.clickHandler);
	}

	private onClick(e:MouseEvent):void {
		let target = e.target as HTMLDivElement;
		const ref = this.$el as HTMLDivElement;
		while(target != document.body && target != ref && target) {
			target = target.parentElement as HTMLDivElement;
		}
		if(target != ref) {
			this.$emit("close");
		}
	}

	public getProfilePicURL(u:UserData):string {
		if(!u.user.profile_image_url) return  this.$image("icons/user.svg");
		return u.user.profile_image_url.replace("300x300", "70x70");
	}

	public async close():Promise<void> {
		this.$emit('close');
	}

	public async updateList():Promise<void> {
		let res;
		this.loading = true;
		this.users = [];
		this.usersSpool = [];
		try {
			res = await fetch(Config.instance.API_PATH+"/users", {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					"Authorization": "Bearer "+UserSession.instance.access_token as string,
				},
			})
			const json = await res.json();
			if(json.success) {
				const users = json.users as {id:string, date:number, user:TwitchDataTypes.UserInfo}[];
				this.activeLast24h = 0;
				this.activeLast7days = 0;
				this.activeLast30days = 0;
				const offset24h = Date.now() - 24 * 60 * 60 * 1000;
				const offset7days = Date.now() - 7 * 24 * 60 * 60 * 1000;
				const offset30days = Date.now() - 30 * 24 * 60 * 60 * 1000;
				this.users = users.sort((a, b) => b.date - a.date);
				for (let i = 0; i < users.length; i++) {
					const c = users[i];
					const date = c.date;
					if(date > offset24h) this.activeLast24h++;
					if(date > offset7days) this.activeLast7days++;
					if(date > offset30days) this.activeLast30days++;
				}
				this.userCount = this.users.length;
				this.loadNextUsers();
			}else{
				StoreProxy.store.state.alert = json.message;
				this.$emit("close");
			}
		}catch(err:unknown) {
			StoreProxy.store.state.alert = "An error occured while loading users<br>";
		}
		this.loading = false;
	}

	public async loadTimeframe(days:number):Promise<void> {
		const limit = Date.now() - (days * 24 * 60 * 60 * 1000);
		let i = 0;
		for (; i < this.users.length; i++) {
			const u = this.users[i];
			if(u.date < limit) break;
		}
		
		if(i > 0) {
			this.loadNextUsers(i);
		}
	}

	public async loadNextUsers(chunk?:number):Promise<void> {
		this.loading = true;
		chunk = chunk? chunk : this.spoolChunkSize;
		const users = this.users.splice(0, chunk);
		const ids = users.map(u => u.id);
		const channels = await TwitchUtils.loadUserInfo(ids);
		for (let i = 0; i < channels.length; i++) {
			const c = channels[i];
			const index = users.findIndex(u => u.id == c.id);
			users[index].user = c;
			const date = users[index].date;
		}
		this.usersSpool = this.usersSpool.concat(users);
		this.loading = false;
	}
}

interface UserData {id:string, date:number, user:TwitchDataTypes.UserInfo}
</script>

<style scoped lang="less">
.ttuserlist{
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	.modal();

	.noResult {
		.center();
		position: absolute;
		text-align: center;
	}

	.content {
		width: 100%;
		height: 100%;
		overflow: auto;
		background-color: @mainColor_dark;
		@gap: 5px;

		.title {
			text-align: center;
			margin-bottom: .5em;
			color: @mainColor_light;
			background-color: @mainColor_normal;
			display: flex;
			flex-direction: row;
			p {
				padding: .5em;
				padding-left: 2em;//Makes sure title is visually centered
				flex-grow: 1;
			}
			.closeBt {
				padding: .5em;
			}
			.icon {
				height: 1em;
				margin-right: .5em;
				vertical-align: middle;
			}
		}

		.stats {
			.table {
				display: grid;
				grid-template-columns: auto auto;
				font-size: .8em;
				padding: 0 1em;
				color: @mainColor_light;
				p:nth-child(odd) {
					text-align: right;
					margin-right: .5em;
				}
				p:nth-child(even) {
					font-weight: bold;
				}
			}
			
			.ctas {
				margin-top: .5em;
				display: flex;
				flex-direction: row;
				justify-content: space-evenly;
			}
		}

		.list {
			padding: .5em;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			justify-content: center;

			.user {
				display: block;
				border-radius: 10px;
				background-color: @mainColor_light;
				width: calc(50% - @gap);
				margin-bottom: @gap;
				overflow: hidden;
				display: flex;
				flex-direction: column;
				position: relative;
				transition: border .2s;
				text-decoration: none;
				color: @mainColor_normal;
				cursor: pointer;
	
				&:nth-child(odd) {
					margin-right: @gap;
				}

				&:hover {
					.header {
						background-color: @mainColor_normal_light;
					}
				}
	
				.header {
					display: flex;
					flex-direction: row;
					background-color: @mainColor_normal;
					transition: all .2s;
	
					.avatar {
						height: 30px;
						border-top-right-radius: 50%;
						border-bottom-right-radius: 50%;
						background-color: @mainColor_light;
					}

					.partner {
						width: .8em;
						vertical-align: middle;
					}

					.login {
						padding: 5px;
						flex-grow: 1;
						text-align: center;
						color: @mainColor_light;
						font-size: .8em;
						text-overflow: ellipsis;
						overflow: hidden;
					}
				}
	
				.details {
					font-size: 14px;
					display: flex;
					flex-direction: column;
					padding: 5px 10px;
					flex-grow: 1;
				}
			}
		}
	}
}

@media only screen and (max-width: 700px) {
.ttuserlist{
	&.splitView {
		.content {
			.list {
				.user {
					width: 100%;
					&:nth-child(odd) {
						margin-right: 0;
					}
				}
			}
		}
	}
}
}
	
@media only screen and (max-width: 400px) {
.ttuserlist{
	.content {
		.list {
			.user {
				width: 100%;
				&:nth-child(odd) {
					margin-right: 0;
				}
			}
		}
	}
}
}
</style>