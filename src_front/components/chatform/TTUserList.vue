<template>
	<div class="ttuserlist sidePanel">
		<div class="head">
			<ClearButton @click="close" />
			<h1 class="title"><Icon name="user" />Twitchat users : {{userCount}}</h1>
		</div>

		<div class="content" ref="content">
			<div class="noResult" v-if="!loading && userCount == 0">no user found :(</div>

			<div class="card-item stats">
				<div class="table">
					<p>Active users last 24h :</p><p>{{activeLast24h}}</p>
					<p>Active users last 7 days :</p><p>{{activeLast7days}}</p>
					<p>Active users last 30 days :</p><p>{{activeLast30days}}</p>
				</div>
				<div class="ctas">
					<TTButton small :loading="loading" icon="refresh" @click="updateList()">Reload</TTButton>
					<div class="partners"><label @click="onlyPartners = !onlyPartners">Partners:</label><ToggleButton v-model="onlyPartners" clear /></div>
					<!-- <TTButton small :disabled="loading" title="Load 24h" icon="user" @click="loadTimeframe(1)" />
					<TTButton small :disabled="loading" title="Load 7d" icon="user" @click="loadTimeframe(7)" />
					<TTButton small :disabled="loading" title="Load 30d" icon="user" @click="loadTimeframe(30)" /> -->
				</div>
			</div>

			<div class="list" ref="list">
				<a v-for="u in filteredItems"
					:key="u.id"
					class="card-item user"
					ref="userCard"
					:href="u.user? 'https://twitch.tv/' + u.user.login : '#'"
					target="_blank"
				>
					<div class="header" v-if="u.user">
						<img :src="getProfilePicURL(u)" alt="profile" class="icon">

						<span class="title">
							{{u.user.login}}
							<Icon name="partner" alt="partner" class="partner" v-if="u.user.broadcaster_type == 'partner'" />
						</span>
					</div>
					<div class="header error" v-else>
						<Icon name="user" alt="profile" class="icon" theme="light" />
						<span class="title">#{{u.id}}</span>
					</div>
					<div class="details">{{formatDate(u)}}</div>

				</a>
			</div>

			<TTButton class="loadBt" v-if="!loading && showLoadMoreBt && users.length > 0"
			small title="Load more"
			icon="add"
			@click="loadNextUsers()" />

			<Icon class="loader" name="loader" v-if="loading" />
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import ApiHelper from '@/utils/ApiHelper';
import Utils from '@/utils/Utils';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import {toNative,  Component } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel';
import TTButton from '../TTButton.vue';
import ClearButton from '../ClearButton.vue';
import ToggleButton from '../ToggleButton.vue';
import Icon from '../Icon.vue';

@Component({
	components:{
		Icon,
		TTButton,
		ClearButton,
		ToggleButton,
	},
	emits:["close"]
})
class TTUserList extends AbstractSidePanel {

	public users:UserData[] = [];
	public usersSpool:UserData[] = [];
	public loading:boolean = true;
	public onlyPartners:boolean = false;
	public showLoadMoreBt:boolean = false;
	public spoolChunkSize:number = 200;
	public userCount:number = 0;
	public activeLast24h:number = 0;
	public activeLast7days:number = 0;
	public activeLast30days:number = 0;

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

	public mounted():void {
		const content = this.$refs.content as HTMLDivElement;
		content.addEventListener("scroll", (ev:Event):void => {
			if ((content.clientHeight + content.scrollTop) >= content.scrollHeight) {
				if(!this.loading) {
					this.loadNextUsers();
				}
			}
		});
		super.open();
		this.updateList();
	}

	public getProfilePicURL(u:UserData):string {
		if(!u.user.profile_image_url) return  this.$asset("icons/user.svg");
		return u.user.profile_image_url.replace("300x300", "70x70");
	}

	public async updateList():Promise<void> {
		let res;
		this.loading = true;
		this.users = [];
		this.usersSpool = [];
		try {
			const {json} = await ApiHelper.call("user/all", "GET");
			if(json.success) {
				const users = json.users;
				this.activeLast24h = 0;
				this.activeLast7days = 0;
				this.activeLast30days = 0;
				const offset24h = Date.now() - 24 * 60 * 60 * 1000;
				const offset7days = Date.now() - 7 * 24 * 60 * 60 * 1000;
				const offset30days = Date.now() - 30 * 24 * 60 * 60 * 1000;
				this.users = users.sort((a, b) => b.date - a.date);
				for (const c of users) {
					const date = c.date;
					if(date > offset24h) this.activeLast24h++;
					if(date > offset7days) this.activeLast7days++;
					if(date > offset30days) this.activeLast30days++;
				}
				this.userCount = this.users.length;
				this.loadNextUsers();
			}else{
				this.$store.common.alert(json.message);
				this.$emit("close");
			}
		}catch(err:unknown) {
			this.$store.common.alert("An error occured while loading users<br>");
		}
		this.loading = false;
	}

	public async loadTimeframe(days:number):Promise<void> {
		const limit = Date.now() - (days * 24 * 60 * 60 * 1000);
		let i = 0;
		for (; i < this.users.length; i++) {
			const u = this.users[i]!;
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
		const channels = await TwitchUtils.getUserInfo(ids);
		for (const c of channels) {
			const index = users.findIndex(u => u.id == c.id);
			users[index]!.user = c;
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
export default toNative(TTUserList);
</script>

<style scoped lang="less">
.ttuserlist{
	.noResult {
		.center();
		position: absolute;
		text-align: center;
	}

	.head {
		max-width: 100%;
	}

	.content {

		max-width: 100%;
		.stats {
			flex-shrink: 0;
			.table {
				display: grid;
				grid-template-columns: auto auto;
				padding: 0 1em;
				color: var(--color-text);
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
					color: var(--color-text);
					label {
						cursor: pointer;
						margin-right: .5em;
					}
				}
			}
		}

		.list {
			@itemWidth: 200px;
			display: grid;
			gap: .5em;
			grid-template-columns: repeat(auto-fill, minmax(@itemWidth, 1fr));

			.user {
				text-decoration: none;
				color: var(--color-text);

				&:hover {
						background-color: var(--color-primary);
					.header {
						background-color: var(--color-primary-light);
					}
				}

				.header {
					.partner {
						width: .8em;
						vertical-align: middle;
					}

					&.error {
						background-color: var(--color-alert);
						.icon {
							background-color: var(--color-dark);
						}
					}
				}

				.details {
					font-size: .8em;
				}
			}
		}

		.loadBt, .loader {
			margin: auto;
		}
	}
}
</style>
