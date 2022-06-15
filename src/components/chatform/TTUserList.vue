<template>
	<div class="ttuserlist">
		<div class="content">
			<img src="@/assets/loader/loader.svg" alt="loader" class="loader" v-if="loading">
			
			<Button aria-label="Close users list" small :icon="$image('icons/cross_white.svg')" class="closeBt" @click="close()" />

			<div class="noResult" v-if="!loading && users?.length == 0">no user found :(</div>

			<div class="title">{{users.length}} users</div>

			<div class="list">
				<div v-for="u in users"
					:key="u.id"
					class="user"
					ref="userCard"
					@click="openUser(u)"
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
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import store from '@/store';
import Config from '@/utils/Config';
import TwitchUtils from '@/utils/TwitchUtils';
import type { TwitchTypes } from '@/utils/TwitchUtils';
import Utils from '@/utils/Utils';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';

@Options({
	props:{},
	components:{
		Button,
	}
})
export default class TTUserList extends Vue {

	public users:UserData[] = [];
	public loading:boolean = true;
	public token:string = "";

	private clickHandler!:(e:MouseEvent) => void;
	
	public get splitView():boolean { return store.state.params.appearance.splitView.value as boolean && store.state.canSplitView; }
	public get classes():string[] {
		const res = ["ttuserlist"];
		if(this.splitView) res.push("splitView");
		return res;
	}

	public formatDate(u:UserData):string {
		const d = new Date(u.date);
		Utils.formatDuration
		return Utils.toDigits(d.getDate())+ "/"
				+ Utils.toDigits(d.getMonth() + 1) + "/"
				+ d.getFullYear() + " "
				+ Utils.toDigits(d.getHours()) + "h"
				+ Utils.toDigits(d.getMinutes());
	}

	public beforeMount():void {
		this.token = store.state.tempStoreValue as string;
	}

	public mounted():void {
		this.clickHandler = (e:MouseEvent) => this.onClick(e);
		document.addEventListener("mousedown", this.clickHandler);
		this.updateList();
	}

	public beforeUnmount():void {
		document.removeEventListener("mousedown", this.clickHandler);
	}

	private onClick(e:MouseEvent):void {
		let target = e.target as HTMLDivElement;
		const ref = this.$el as HTMLDivElement;
		while(target != document.body && target != ref) {
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

	public openUser(u:UserData):void {
		window.open("https://twitch.tv/" + u.user.login, "_blank");
	}

	private async updateList():Promise<void> {
		let res;
		try {
			res = await fetch(Config.API_PATH+"/users?token=" + this.token, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			})
			const json = await res.json();
			if(json.success) {
				const users = json.users as {id:string, date:number, user:TwitchTypes.UserInfo}[];
				const ids = users.map(u => u.id);
				const channels = await TwitchUtils.loadUserInfo(ids);
				for (let i = 0; i < channels.length; i++) {
					const c = channels[i];
					const index = users.findIndex(u => u.id == c.id);
					users[index].user = c;
				}
				users.sort((a, b) => b.date - a.date);
				this.users = users;
			}else{
				store.state.alert = json.message;
				this.$emit("close");
			}
		}catch(err:unknown) {
			store.state.alert = "An error occured while loading users<br>";
		}
		
		this.loading = false;
	}
}

interface UserData {id:string, date:number, user:TwitchTypes.UserInfo}
</script>

<style scoped lang="less">
.ttuserlist{
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	.modal();

	.closeBt {
		position: absolute;
		top: 0;
		right: 0;
		z-index: 1;
		border-top-right-radius: 0;
		box-shadow: 0px 0px 20px 0px rgba(0,0,0,1);
	}

	.loader {
		.center();
		position: absolute;
	}

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
		padding: 10px;
		@gap: 5px;

		.title {
			text-align: center;
			margin-bottom: .5em;
		}

		.list {
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