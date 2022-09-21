<template>
	<div :class="classes">
		<div class="content">
			<img src="@/assets/loader/loader.svg" alt="loader" class="loader" v-if="loading">
			
			<Button aria-label="Close live users list" small :icon="$image('icons/cross_white.svg')" class="closeBt" @click="close()" />

			<div class="noResult" v-if="!loading && streams?.length == 0">None of the people you follow is streaming :(</div>
			
			<div class="list">
				<div v-for="s in streams" :key="s.id" class="stream" ref="streamCard" @click="raid(s)">
					<div class="header">
						<img :src="getProfilePicURL(s)" alt="">
						<span class="login">{{s.user_name}}</span>
					</div>
					<div class="details">
						<span class="title">{{s.title}}</span>
						<span class="game">{{s.game_name}}</span>
					</div>
					<div class="footer">
						<span class="viewers"><img src="@/assets/icons/user_purple.svg" alt="user" class="icon">{{s.viewer_count}}</span>
						<span class="duration"><img src="@/assets/icons/timeout_purple.svg" alt="user" class="icon">{{computeDuration(s.started_at)}}</span>
					</div>
					<div class="raidBt">
						<img src="@/assets/icons/raid_purple.svg" alt="raid">
						Raid
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import IRCClient from '@/utils/IRCClient';
import TwitchUtils from '@/utils/TwitchUtils';
import type { TwitchDataTypes } from '@/types/TwitchDataTypes';
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import { storeParams } from '@/store/params/storeParams';
import { storeMain } from '@/store/storeMain';

@Options({
	props:{},
	components:{
		Button,
	}
})
export default class LiveFollowings extends Vue {

	public streams:TwitchDataTypes.StreamInfo[] = [];
	public loading = true;
	private clickHandler!:(e:MouseEvent) => void;
	
	public get splitView():boolean { return storeParams().appearance.splitView.value as boolean && storeMain().canSplitView; }
	public get classes():string[] {
		const res = ["livefollowings"];
		if(this.splitView) res.push("splitView");
		return res;
	}

	public mounted():void {
		this.clickHandler = (e:MouseEvent) => this.onClick(e);
		document.addEventListener("mousedown", this.clickHandler);
		// gsap.set(this.$refs.holder as HTMLElement, {marginTop:0, opacity:1});
		// gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:1});
		// gsap.from(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.out"});
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

	public computeDuration(start:string):string {
		const s = new Date(start);
		const ellapsed = Date.now() - s.getTime();
		return Utils.formatDuration(ellapsed);
	}

	public getProfilePicURL(s:TwitchDataTypes.StreamInfo):string {
		return s.user_info.profile_image_url.replace("300x300", "70x70");
	}

	public async close():Promise<void> {
		// gsap.killTweensOf([this.$refs.holder, this.$refs.dimmer]);
		// gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:0, ease:"sine.in"});
		// gsap.to(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.in", onComplete:()=> {
			this.$emit('close');
		// }});
	}


	private async updateList():Promise<void> {
		let res = await TwitchUtils.getActiveFollowedStreams();
		res = res.sort((a,b) => a.viewer_count - b.viewer_count);
		this.streams = res;
		this.loading = false;
		await this.$nextTick();
		const cards = this.$refs.streamCard as HTMLDivElement[];
		for (let i = 0; i < cards.length; i++) {
			gsap.from(cards[i], {duration:.25, opacity:0, y:-20, delay:i*.02})
		}
	}

	public raid(s:TwitchDataTypes.StreamInfo):void {
		this.$confirm("Raid ?", "Are you sure you want to raid " + s.user_login + " ?").then(async () => {
			IRCClient.instance.sendMessage("/raid "+s.user_login);
			this.close();
		}).catch(()=> { });
	}
}
</script>

<style scoped lang="less">
.livefollowings{
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

		.list {
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			justify-content: center;

			.stream {
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
	
				&:nth-child(odd) {
					margin-right: @gap;
				}
	
				&:hover {
					cursor: pointer;
					// border: 5px solid red;
					.header {
						background-color: @mainColor_normal_extralight;
					}
					.raidBt {
						opacity: 1;
					}
					.details, .footer {
						opacity: 0;
					}
				}
	
				.header {
					display: flex;
					flex-direction: row;
					background-color: @mainColor_normal;
					transition: all .2s;
	
					img {
						border-top-right-radius: 50%;
						border-bottom-right-radius: 50%;
						height: 30px;
						background-color: @mainColor_light;
					}
					.login {
						padding: 5px;
						flex-grow: 1;
						text-align: center;
						color: @mainColor_light;
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
					transition: all .2s;
					.title {
						font-size: 1em;
					}
					.game {
						font-size: .8em;
						margin-top: .5em;
						background-color: fade(@mainColor_normal, 15%);
						align-self: flex-start;
						padding: .25em .5em;
						width: auto;
						border-radius: 1em;
					}
				}
	
				.footer {
					font-size: 16px;
					display: flex;
					flex-direction: row;
					justify-content: space-between;
					padding: 0px 10px;
					padding-bottom: 5px;
					transition: all .2s;
					.icon {
						height: 14px;
						width: 14px;
						object-fit: contain;
						vertical-align: middle;
						margin-right: 5px;
					}
				}
	
				.raidBt{
					// align-self: center;
					.center();
					margin-top: 10px;
					position: absolute;
					opacity: 0;
					transition: all .2s;
					display:flex;
					flex-direction: row;
					align-items: center;
					img {
						width: 40px;
						vertical-align: middle;
						margin-right: .5em;
					}
				}
			}
		}
	}
}

@media only screen and (max-width: 700px) {
.livefollowings{
	&.splitView {
		.content {
			.list {
				.stream {
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
.livefollowings{
	.content {
		.list {
			.stream {
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