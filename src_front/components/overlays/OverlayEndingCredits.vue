<template>
	<div class="overlayendingcredits" v-if="data && data.params" :style="styles">
		<template v-for="item in data.params.slots.filter(v=>v.enabled)">
			<div v-if="getEntryCountFor(item) > 0" :class="getCategoryClasses(item)">
				<h1><Icon :name="getIconFor(item)" />{{ item.label }}</h1>
				<div class="list">
					<div v-if="item.id == 'hypechats'" v-for="entry in (data.hypeChats || []).concat().concat().splice(0, item.maxEntries)" class="item hypechat">
						<span class="login">{{entry.login}}</span>
						<div class="amount" v-if="item.showAmounts === true">
							<span class="currency">{{{EUR:"€",USD:"$", GBP:"£"}[entry.currency] || entry.currency}}</span>
							<span class="value">{{entry.amount}}</span>
						</div>
					</div>
					
					<div v-if="item.id == 'subsandgifts'" v-for="entry in (data.subs || []).concat().concat((data.subgifts || [])).concat().splice(0, item.maxEntries)" class="item sub">
						<span class="login">{{entry.login}}</span>
					</div>
					
					<div v-if="item.id == 'subs'" v-for="entry in (data.subs || []).concat().splice(0, item.maxEntries)" class="item sub">
						<span class="login">{{entry.login}}</span>
					</div>
					
					<div v-if="item.id == 'subgifts'" v-for="entry in (data.subgifts || []).concat().sort((a,b)=>b.total-a.total).splice(0, item.maxEntries)" class="item subgift">
						<span class="login">{{entry.login}}</span>
						<span class="count" v-if="item.showAmounts === true"><Icon name="gift" class="giftIcon" />{{ entry.total }}</span>
					</div>
					
					<div v-if="item.id == 'cheers'" v-for="entry in (data.bits || []).concat().splice(0, item.maxEntries)" class="item bits">
						<span class="login">{{entry.login}}</span>
						<span class="count" v-if="item.showAmounts === true"><Icon name="bits" class="bitsIcon" />{{ entry.bits }}</span>
					</div>
					
					<div v-if="item.id == 'raids'" v-for="entry in (data.raids || []).concat().splice(0, item.maxEntries)" class="item raids">
						<span class="login">{{entry.login}}</span>
						<span class="count" v-if="item.showAmounts === true"><Icon name="user" class="userIcon" />{{ entry.raiders }}</span>
					</div>
					
					<div v-if="item.id == 'follows'" v-for="entry in (data.follows || []).concat().splice(0, item.maxEntries)" class="item follows">
						<span class="login">{{entry.login}}</span>
					</div>
					
					<div v-if="item.id == 'so_in'" v-for="entry in (data.shoutouts || []).concat().filter(v=>v.received).splice(0, item.maxEntries)" class="item so_in">
						<span class="login">{{entry.login}}</span>
						<span class="count" v-if="item.showAmounts === true"><Icon name="user" class="userIcon" />{{ entry.viewers }}</span>
					</div>
					
					<div v-if="item.id == 'so_out'" v-for="entry in (data.shoutouts || []).concat().filter(v=>!v.received).splice(0, item.maxEntries)" class="item so_out">
						<span class="login">{{entry.login}}</span>
						<span class="count" v-if="item.showAmounts === true"><Icon name="user" class="userIcon" />{{ entry.viewers }}</span>
					</div>
					
					<div v-if="item.id == 'hypetrains'" v-for="entry in (data.hypeTrains || []).concat().splice(0, item.maxEntries)" class="item trains">
						<span class="login">{{ $t('train.ending_credits', {LEVEL:entry.level, PERCENT:entry.percent})}}</span>
					</div>
					
					<div v-if="item.id == 'bans'" v-for="entry in (data.chatters || []).concat().filter(v=>v.bans > 0).sort((a,b)=> b.bans-a.bans).splice(0, item.maxEntries)" class="item bans">
						<span class="login">{{ entry.login }}</span>
						<span class="count" v-if="item.showAmounts === true">{{ entry.bans }}</span>
					</div>
					
					<div v-if="item.id == 'timeouts'" v-for="entry in (data.chatters || []).concat().filter(v=>v.tos > 0).sort((a,b)=> b.tosDuration-a.tosDuration).splice(0, item.maxEntries)" class="item tos">
						<span class="login">{{ entry.login }}</span>
						<span class="count" v-if="item.showAmounts === true"><Icon name="timeout" class="timeout" />{{ formatDuration(entry.tosDuration) }}s</span>
					</div>
					
					<div v-if="item.id == 'rewards'" v-for="entry in rewards.concat().splice(0, item.maxEntries).sort((a,b)=>b.total-a.total)" class="item rewards">
						<img :src="entry.reward.icon" alt="reward redeem icon" class="rewardIcon">
						<span class="login">{{ entry.reward.name }}</span>
						<span class="count" v-if="item.showAmounts === true">x{{ entry.total }}</span>
					</div>
				</div>
			</div>
		</template>
	</div>
</template>

<script lang="ts">
import TwitchatEvent from '@/events/TwitchatEvent';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import { Component } from 'vue-facing-decorator';
import AbstractOverlay from './AbstractOverlay.vue';
import gsap from 'gsap/all';
import { Linear } from 'gsap';
import type { StyleValue } from 'vue';
import Utils from '@/utils/Utils';

@Component({
	components:{},
	emits:[],
})
export default class OverlayEndingCredits extends AbstractOverlay {

	public posY:number = 0;
	public display:boolean = false;
	public data:TwitchatDataTypes.StreamSummaryData|null = null;
	
	private animFrame:number = -1;
	private prevParams:TwitchatDataTypes.EndingCreditsParams|null = null;
	private startDelayTimeout:number = -1;
	private entryCountCache:{[key:string]:number} = {}

	private summaryDataHandler!:(e:TwitchatEvent) => void;
	private paramsDataHandler!:(e:TwitchatEvent) => void;

	public get rewards() {
		const res:{total:number, users:{login:string, uid:string, total:number}[], reward:(TwitchatDataTypes.StreamSummaryData["rewards"][0]["reward"])}[] = [];
		let done:{[key:string]:number} = {};
		(this.data?.rewards || []).forEach(v=> {
			if(done[v.reward.id] === undefined) {
				let entry:typeof res[0] = {
					 reward:v.reward,
					 total:0,
					 users:[]
				}
				done[v.reward.id] = res.push(entry) -1 ;
			}
			let index = done[v.reward.id];
			const entry = res[index];
			entry.total ++;
			let user = entry.users.find(w=>v.uid == w.uid);
			if(!user) {
				user = {
					uid:v.uid,
					login:v.login,
					total:0,
				};
				entry.users.push(user)
			}

			user.total ++;
		});
		console.log(res);
		return res;
	}

	public get styles():StyleValue {
		const res:StyleValue = {
			opacity: this.display? 1 : 0,
			fontSize: [.5, .75, 1, 1.5, 2][(this.data?.params!.scale || 3) - 1]+"em",
			color: this.data?.params?.textColor,
			filter: "drop-shadow(2px 2px 0 rgba(0, 0, 0, "+((this.data?.params?.textShadow || 0)/100)+"))",
		}
		if(this.data?.params?.timing == 'speed') {
			res.top = this.posY+"px";
		}
		return res;
	}

	public getCategoryClasses(item:TwitchatDataTypes.EndingCreditsSlot):string[] {
		const res = ["category"];
		if(this.data?.params?.showIcons === false) res.push("noIcon");
		const itemCount = this.getEntryCountFor(item);
		//If requesting 3 cols but there are only 2 items, switch to 2 cols mode
		if(item.layout == "3cols" && itemCount == 2) res.push("layout_2cols");
		//If requestion 3 or 3 cols but only 1 item is available, switch to 1 col mode
		else if((item.layout == "3cols" && itemCount == 1) || (item.layout == "2cols" && itemCount == 1)) res.push("layout_col");
		else res.push("layout_"+item.layout);
		return res;
	}

	public requestInfo():void {
		PublicAPI.instance.broadcast(TwitchatEvent.GET_SUMMARY_DATA, {includeParams:true, dateOffset:Date.parse("06/01/2023 18:27:02 GMT+0200")});
	}

	public beforeMount(): void {
		this.summaryDataHandler = (e:TwitchatEvent) => this.onSummaryData(e);
		this.paramsDataHandler = (e:TwitchatEvent) => this.onParamsData(e);
		PublicAPI.instance.addEventListener(TwitchatEvent.SUMMARY_DATA, this.summaryDataHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.ENDING_CREDITS_CONFIGS, this.paramsDataHandler);
	}

	public beforeUnmount(): void {
		cancelAnimationFrame(this.animFrame);
		gsap.killTweensOf(this.$el as HTMLElement);
		PublicAPI.instance.removeEventListener(TwitchatEvent.SUMMARY_DATA, this.summaryDataHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.ENDING_CREDITS_CONFIGS, this.paramsDataHandler);
	}

	public getIconFor(item:TwitchatDataTypes.EndingCreditsSlot):string {
		switch(item.id) {
			case "hypechats": return "hypeChat";
			case "subs": return "sub";
			case "subgifts": return "gift";
			case "subsandgifts": return "sub";
			case "cheers": return "bits";
			case "raids": return "raid";
			case "follows": return "follow";
			case "hypetrains": return "train";
			case "so_in": return "shoutout";
			case "so_out": return "shoutout";
			case "rewards": return "channelPoints";
			case "bans": return "ban";
			case "timeouts": return "timeout";
			case "vips": return "vip";
			case "mods": return "mod";
		}
		return "";
	}

	public getEntryCountFor(item:TwitchatDataTypes.EndingCreditsSlot):number {
		if(this.entryCountCache[item.id] != undefined) return this.entryCountCache[item.id];
		let count = 0;
		switch(item.id) {
			case "hypechats": count = (this.data?.hypeChats || []).length; break;
			case "subs": count = (this.data?.subs || []).length; break;
			case "subgifts": count = (this.data?.subgifts || []).length; break;
			case "subsandgifts": count = ([] as unknown[]).concat(this.data?.subgifts || [], this.data?.subs || []).length; break;
			case "cheers": count = (this.data?.bits || []).length; break;
			case "raids": count = (this.data?.raids || []).length; break;
			case "follows": count = (this.data?.follows || []).length; break;
			case "hypetrains": count = (this.data?.hypeTrains || []).length; break;
			case "so_in": count = (this.data?.shoutouts || []).filter(v=>v.received === true).length; break;
			case "so_out": count = (this.data?.shoutouts || []).filter(v=>v.received === false).length; break;
			case "rewards": count = (this.data?.rewards || []).length; break;
			case "bans": count = (this.data?.chatters || []).filter(v=>v.bans > 0).length; break;
			case "timeouts": count = (this.data?.chatters || []).filter(v=>v.tosDuration > 0).length; break;
			case "vips": count = (this.data?.chatters || []).filter(v=>v.vip).length; break;
			case "mods": count = (this.data?.chatters || []).filter(v=>v.mod).length; break;
		}
		count = Math.min(count, item.maxEntries);
		this.entryCountCache[item.id] = count;
		return count;
	}

	/**
	 * Converts milliseconds to duration
	 * @param seconds 
	 */
	public formatDuration(seconds:number):string {
		return Utils.formatDuration(seconds * 1000);
	}

	/**
	 * Called when API sends summary data counter data
	 */
	private async onSummaryData(e:TwitchatEvent):Promise<void> {
		if(e.data) {
			this.data = (e.data as unknown) as TwitchatDataTypes.StreamSummaryData;
			this.reset();
		}
	}

	/**
	 * Called when API sends new credits parameters
	 */
	private async onParamsData(e:TwitchatEvent):Promise<void> {
		if(e.data && this.data) {
			this.data.params = (e.data as unknown) as TwitchatDataTypes.EndingCreditsParams;
			let resetScroll = false;
			//Only restart delay if one of the related params changed
			if(this.prevParams &&
			(
				this.prevParams.duration != this.data.params.duration
				|| this.prevParams.speed != this.data.params.speed
				|| this.prevParams.startDelay != this.data.params.startDelay
				|| this.prevParams.timing != this.data.params.timing
				|| this.prevParams.loop != this.data.params.loop
				|| !this.data.params.loop
			)) resetScroll = true;

			this.prevParams = this.data.params;

			this.reset(resetScroll);
		}
	}

	/**
	 * Resets some data for better live reload
	 */
	private reset(resetScroll:boolean = true):void {
		this.display = false;
		this.entryCountCache = {};
		if(resetScroll) {
			clearTimeout(this.startDelayTimeout)
			cancelAnimationFrame(this.animFrame);
			gsap.killTweensOf(this.$el as HTMLElement);
		}
		this.startScroll(resetScroll);
	}

	/**
	 * Starts scrolling credits
	 */
	private startScroll(resetScroll:boolean):void {
		this.$nextTick().then(async () => {
			if(this.data?.params?.startDelay) {
				await new Promise<void>((resolve) => {
					this.startDelayTimeout = setTimeout(() => resolve(), this.data!.params!.startDelay * 1000);
				})
			}
			if(!this.data?.params) return;//No params?!
			this.display = true;
			
			if(resetScroll) {
				const holder = this.$el as HTMLElement;
				const bounds = holder.getBoundingClientRect();
				this.posY = window.innerHeight;

				if(this.data?.params?.timing == 'duration') {
					gsap.fromTo(holder, {top:this.posY}, {duration:this.data!.params!.duration, top:-bounds.height, ease:Linear.easeNone, onComplete:()=>{
						if(this.data?.params?.loop === true) {
							this.reset(true);
						}
					}});
				}else{
					this.renderFrame();
				}
			}
		})
	}

	/**
	 * Scrolls credits at a specific speed
	 */
	private renderFrame():void {
		this.animFrame = requestAnimationFrame(()=>this.renderFrame());
		const holder = this.$el as HTMLElement;
		const bounds = holder.getBoundingClientRect();

		if(this.posY < -bounds.height) {
			if(this.data?.params?.loop === true) {
				this.reset(true);
			}
			return;
		}

		this.posY -= this.data?.params?.speed || 2;
		
	}
}

</script>

<style scoped lang="less">
.overlayendingcredits{
	display: flex;
	flex-direction: column;
	align-items: center;
	position: absolute;
	width: 100%;
	// background-color: red;
	color: #fff;

	.category {
		font-family: "Inter";
		margin-bottom: 7em;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		h1 {
			margin-bottom: 1em;
			font-size: 2.5em;
			text-align: center;
			.icon {
				height: 1em;
				width: 1em;
				margin-right: .25em;
				margin-left: -1em;
			}
		}
		.list {
			gap: 1em;
			display: flex;
			flex-direction: column;
			max-width: 800px;

			.item {
				display: flex;
				flex-direction: row;
				align-items: flex-end;
				justify-content: center;
				font-size: 1.5em;
				font-weight: 400;
				.icon {
					height: 1em;
				}
				&.hypechat {
					.login {
						margin-right: .5em;
					}
					.amount {
						font-weight: bold;
					}
				}
				.count {
					margin-left: .5em;
					font-weight: bold;
					.icon {
						margin-right: .25em;
					}
				}

				.rewardIcon {
					margin-right: .5em;
					height: 1em;
				}
			}
		}

		&.layout_left {
			.list {
				column-gap: 2em;
				flex-direction: row;
				flex-wrap: wrap;
				align-items: center;
				justify-content: flex-start;
			}
		}

		&.layout_center {
			.list {
				column-gap: 2em;
				flex-direction: row;
				flex-wrap: wrap;
				align-items: center;
				justify-content: center;
			}
		}

		&.layout_right {
			.list {
				column-gap: 2em;
				flex-direction: row;
				flex-wrap: wrap;
				align-items: center;
				justify-content: flex-end;
			}
		}

		&.layout_colRight {
			.list {
				align-items: flex-end;
			}
		}

		&.layout_colLeft {
			.list {
				align-items: flex-start;
			}
		}

		&.layout_2cols {
			.list {
				display: grid;
				column-gap: 4em;
				grid-template-columns: repeat(auto-fill, minmax(40%, 1fr));
				.item {
					&:nth-child(2n) {
						justify-self: start;
					}
					&:nth-child(2n+1) {
						justify-self: end;
					}
				}
			}
		}

		&.layout_3cols {
			.list {
				display: grid;
				column-gap: 4em;
				grid-template-columns: repeat(auto-fill, minmax(25%, 1fr));
				.item {
					&:nth-child(3n+1) {
						justify-self: end;
					}
					&:nth-child(3n+2) {
						justify-self: center;
					}
					&:nth-child(3n) {
						justify-self: start;
					}
				}
			}
		}

		&.noIcon {
			h1 {
				.icon {
					display: none;
				}
			}
		}
	}
}
</style>