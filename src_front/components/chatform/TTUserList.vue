<template>
	<div class="ttuserlist">
		<div class="content" ref="content">
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
					<div class="partners"><label @click="onlyPartners = !onlyPartners">Partners:</label><ToggleButton v-model="onlyPartners" clear /></div>
					<!-- <Button small :disabled="loading" title="Load 24h" :icon="$image('icons/user.svg')" @click="loadTimeframe(1)" />
					<Button small :disabled="loading" title="Load 7d" :icon="$image('icons/user.svg')" @click="loadTimeframe(7)" />
					<Button small :disabled="loading" title="Load 30d" :icon="$image('icons/user.svg')" @click="loadTimeframe(30)" /> -->
				</div>
			</div>

			<div class="list" ref="list">
				<a v-for="u in filteredItems"
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
					<div class="header error" v-else>
						<img src="@/assets/icons/user_purple.svg" alt="profile" class="avatar">
						<span class="login">#{{u.id}}</span>
					</div>
					<div class="details">{{formatDate(u)}}</div>

				</a>
			</div>
			
			<Button class="loadBt" v-if="!loading && showLoadMoreBt && users.length > 0"
			small title="Load more"
			:icon="$image('icons/user.svg')"
			@click="loadNextUsers()" />

			<img class="loader" src="@/assets/loader/loader_white.svg" alt="loader" v-if="loading">
		</div>
	</div>
</template>

<script lang="ts">
import StoreProxy from '@/store/StoreProxy';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import Config from '@/utils/Config';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import { Component, Vue } from 'vue-facing-decorator';
import Button from '../Button.vue';
import ToggleButton from '../ToggleButton.vue';

@Component({
	components:{
		Button,
		ToggleButton,
	},
	emits:["close"]
})
export default class TTUserList extends Vue {

	public users:UserData[] = [];
	public usersSpool:UserData[] = [];
	public loading:boolean = true;
	public onlyPartners:boolean = false;
	public showLoadMoreBt:boolean = false;
	public token:string = "";
	public spoolChunkSize:number = 200;
	public userCount:number = 0;
	public activeLast24h:number = 0;
	public activeLast7days:number = 0;
	public activeLast30days:number = 0;

	private clickHandler!:(e:MouseEvent) => void;

	public get filteredItems():UserData[] {
		if(this.onlyPartners) {
			return this.usersSpool.filter(v=> v.user && v.user.broadcaster_type == "partner");
		}
		return this.usersSpool;
	}

	public formatDate(u:UserData):string {
		const d = new Date(u.date);
		return Utils.formatDate(d);
	}

	public beforeMount():void {
		this.token = this.$store("main").tempStoreValue as string;
	}

	public mounted():void {
		this.clickHandler = (e:MouseEvent) => this.onClick(e);
		document.addEventListener("mousedown", this.clickHandler);
		const content = this.$refs.content as HTMLDivElement;
		content.addEventListener("scroll", (ev:Event):void => {
			if ((content.clientHeight + content.scrollTop) >= content.scrollHeight) {
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
			res = await fetch(Config.instance.API_PATH+"/user/all", {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					"Authorization": "Bearer "+StoreProxy.auth.twitch.access_token,
					'App-Version': import.meta.env.PACKAGE_VERSION,
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
				this.$store("main").alert(json.message);
				this.$emit("close");
			}
		}catch(err:unknown) {
			this.$store("main").alert("An error occured while loading users<br>");
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
		let users = this.users.splice(0, chunk);
		const ids = users.map(u => u.id).filter( v => parseInt(v).toString() == v);
		const channels = await TwitchUtils.loadUserInfo(ids);
		for (let i = 0; i < channels.length; i++) {
			const c = channels[i];
			const index = users.findIndex(u => u.id == c.id);
			users[index].user = c;
		}
		this.usersSpool = this.usersSpool.concat(users);
		this.loading = false;
		this.showLoadMoreBt = false;

		await this.$nextTick();
		const content = this.$refs.content as HTMLDivElement;
		const list = this.$refs.list as HTMLDivElement;
		this.showLoadMoreBt = (list.offsetTop + list.clientHeight) < content.clientHeight;
	}
}

interface UserData {id:string, date:number, user:TwitchDataTypes.UserInfo}
</script>

<style scoped lang="less">
.ttuserlist{
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

				.partners {
					display: flex;
					color: @mainColor_light;
					label {
						cursor: pointer;
						margin-right: .5em;
					}
				}
			}
		}

		.list {
			padding: .5em;
			@itemWidth: 200px;
			display: grid;
			gap: 5px;
			grid-template-columns: repeat(auto-fill, minmax(@itemWidth, 1fr));

			.user {
				display: block;
				border-radius: 10px;
				background-color: @mainColor_light;
				// width: @itemWidth;
				overflow: hidden;
				display: flex;
				flex-direction: column;
				position: relative;
				transition: border .2s;
				text-decoration: none;
				color: @mainColor_normal;
				cursor: pointer;

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
					
					&.error {
						background-color: @mainColor_alert;
					}
	
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

		.loadBt, .loader {
			margin: auto;
			display: block;
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