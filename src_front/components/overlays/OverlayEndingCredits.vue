<template>
	<div class="overlayendingcredits" v-if="data && slotList && !noEntry" :style="styles" ref="holder">
		<template v-for="item in slotList">
			<div :class="item.holderClasses" :style="item.categoryStyles" ref="listItem">
				<h1 data-title :style="item.titleStyles"><Icon :name="item.slot.icon" v-if="item.slot.id != 'text'" />{{ item.params.label }}</h1>
				<div data-list class="list" :style="item.entryStyles">
					<div v-if="item.params.slotType == 'hypechats'" v-for="entry in makeUnique(item.params, data.hypeChats || []).concat().sort((a,b)=>b.amount-a.amount).splice(0, item.params.maxEntries)" class="item">
						<span class="info">{{entry.login}}</span>
						<div class="amount" v-if="item.params.showAmounts === true">
							<span class="currency">{{{EUR:"€",USD:"$", GBP:"£"}[entry.currency] || entry.currency}}</span>
							<span class="value">{{entry.amount}}</span>
						</div>
					</div>
					
					<div v-if="item.params.slotType == 'subs'" v-for="entry in getSortedSubs(item.params).splice(0, item.params.maxEntries)" class="item">
						<Icon class="badge" v-if="item.params.showBadges" :name="entry.type == 'subgift'? 'gift' : 'sub'" />
						<span class="info">{{entry.value.login}}</span>
						<span class="count" v-if="entry.type=='subgift' && item.params.showAmounts === true"><Icon name="gift" class="giftIcon" />{{ entry.value.total }}</span>
					</div>
					
					<div v-if="item.params.slotType == 'cheers'" v-for="entry in getCheers(item.params).concat().splice(0, item.params.maxEntries)" class="item">
						<span class="info">{{entry.login}}</span>
						<span class="count" v-if="item.params.showAmounts === true"><Icon name="bits" class="bitsIcon" />{{ entry.bits }}</span>
					</div>
					
					<div v-if="item.params.slotType == 'raids'" v-for="entry in makeUnique(item.params, data.raids || []).concat().splice(0, item.params.maxEntries)" class="item">
						<span class="info">{{entry.login}}</span>
						<span class="count" v-if="item.params.showAmounts === true"><Icon name="user" class="userIcon" />{{ entry.raiders }}</span>
					</div>
					
					<div v-if="item.params.slotType == 'follows'" v-for="entry in (data.follows || []).concat().splice(0, item.params.maxEntries)" class="item">
						<span class="info">{{entry.login}}</span>
					</div>
					
					<div v-if="item.params.slotType == 'so_in'" v-for="entry in (data.shoutouts || []).concat().filter(v=>v.received).sort((a,b)=>b.viewers-a.viewers).splice(0, item.params.maxEntries)" class="item">
						<span class="info">{{entry.login}}</span>
						<span class="count" v-if="item.params.showAmounts === true"><Icon name="user" class="userIcon" />{{ entry.viewers }}</span>
					</div>
					
					<div v-if="item.params.slotType == 'so_out'" v-for="entry in (data.shoutouts || []).concat().filter(v=>!v.received).sort((a,b)=>b.viewers-a.viewers).splice(0, item.params.maxEntries)" class="item">
						<span class="info">{{entry.login}}</span>
						<span class="count" v-if="item.params.showAmounts === true"><Icon name="user" class="userIcon" />{{ entry.viewers }}</span>
					</div>
					
					<div v-if="item.params.slotType == 'hypetrains'" v-for="entry in (data.hypeTrains || []).concat().splice(0, item.params.maxEntries)" class="item">
						<i18n-t scope="global" keypath="train.ending_credits" tag="span">
							<template #LEVEL>
								<strong>{{ entry.level }}</strong>
							</template>
							<template #PERCENT>
								<strong>{{ entry.percent }}</strong>
							</template>
						</i18n-t>
						<template v-if="item.params.showTrainConductors && (entry.conductorBits || entry.conductorSubs)">
							<div v-if="entry.conductorSubs" class="conductor">
								<span>{{entry.conductorSubs.login}}</span>
								<span>x{{entry.conductorSubs.subs}} <Icon class="badge" name="sub" /></span>
							</div>
							<div v-if="entry.conductorBits" class="conductor">
								<span>{{entry.conductorBits.login}}</span>
								<span>x{{entry.conductorBits.bits}} <Icon class="badge" name="bits" /></span>
							</div>
						</template>
					</div>
					
					<div v-if="item.params.slotType == 'bans'" v-for="entry in (data.chatters || []).concat().filter(v=>v.bans > 0).sort((a,b)=> b.bans-a.bans).splice(0, item.params.maxEntries)" class="item">
						<span class="info">{{ entry.login }}</span>
						<span class="count" v-if="item.params.showAmounts === true">{{ entry.bans }}</span>
					</div>
					
					<div v-if="item.params.slotType == 'timeouts'" v-for="entry in (data.chatters || []).concat().filter(v=>v.tos > 0).sort((a,b)=> b.tosDuration-a.tosDuration).splice(0, item.params.maxEntries)" class="item">
						<span class="info">{{ entry.login }}</span>
						<span class="count" v-if="item.params.showAmounts === true"><Icon name="timeout" class="timeout" />{{ formatDuration(entry.tosDuration) }}s</span>
					</div>
					
					<div v-if="item.params.slotType == 'rewards'" v-for="entry in getRewards(item.params).concat().splice(0, item.params.maxEntries).sort((a,b)=>b.total-a.total)" class="item">
						<img :src="entry.reward.icon" alt="reward redeem icon" class="rewardIcon">
						<span class="info">{{ entry.reward.name }}</span>
						<span class="count" v-if="item.params.showAmounts === true">x{{ entry.total }}</span>
						<div class="userlist" v-if="item.params.showRewardUsers === true">
							<div class="login" v-for="u in entry.users">
								<span>{{ u.login }}</span>
								<span v-if="item.params.showAmounts === true"> x{{ u.total }}</span>
							</div>
						</div>
					</div>
					
					<div v-if="item.params.slotType == 'chatters'" v-for="entry in getSortedChatters(item.params)" class="item">
						<Icon class="badge" v-if="item.params.showBadges && (entry.vip || entry.mod || entry.sub)"
							:name="(entry.mod? 'mod' : (entry.vip? 'vip' : (entry.sub? 'sub' : 'min')))" />
						<span class="info">{{ entry.login }}</span>
						<span class="count" v-if="item.params.showAmounts === true"><Icon name="whispers" class="messageIcon" />{{ entry.count }}</span>
					</div>
					
					<div v-if="item.params.slotType == 'polls'" v-for="entry in (data.polls || []).concat()" class="item">
						<span class="info">{{ entry.title }}</span>
						<div class="pollItems">
							<div v-for="choice in entry.choices" class="pollItem">
								<p><Icon name="checkmark" v-if="choice.win"/><span class="dot" v-else>• </span>{{ choice.title }}</p>
								<p v-if="item.params.showAmounts">{{ Math.round(choice.votes/entry.votes * 100) }}%</p>
							</div>
						</div>
					</div>
					
					<div v-if="item.params.slotType == 'predictions'" v-for="entry in (data.predictions || []).concat()" class="item">
						<span class="info">{{ entry.title }}</span>
						<div class="pollItems">
							<div v-for="choice in entry.outcomes" class="pollItem">
								<p><Icon name="checkmark" v-if="choice.win"/><span class="dot" v-else>• </span>{{ choice.title }}</p>
								<p v-if="item.params.showAmounts">{{ choice.points }}<Icon name="channelPoints"/></p>
							</div>
						</div>
					</div>
					
					<div v-if="item.params.slotType == 'text' && item.params.text" class="item">
						<p class="textContent" v-html="safeHTML(item.params.text)"></p>
					</div>
				</div>
			</div>
		</template>
	</div>
</template>

<script lang="ts">
import TwitchatEvent from '@/events/TwitchatEvent';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import Utils from '@/utils/Utils';
import { watch, type StyleValue } from 'vue';
import { Component } from 'vue-facing-decorator';
import AbstractOverlay from './AbstractOverlay';
import DOMPurify from 'isomorphic-dompurify';
import gsap from 'gsap';

@Component({
	components:{},
	emits:[],
})
export default class OverlayEndingCredits extends AbstractOverlay {

	public display:boolean = false;
	public noEntry:boolean = false;
	public data:TwitchatDataTypes.StreamSummaryData|null = null;
	public slotList:SlotItem[] = [];
	
	private posY:number = 0;
	private animFrame:number = -1;
	private speedScale:number = 0;
	private speedScaleInc:number = 0;
	private paused:boolean = false;
	private interpolating:boolean = false;
	private prevParams:TwitchatDataTypes.EndingCreditsParams|null = null;
	private startDelayTimeout:number = -1;
	private entryCountCache:{[key:string]:number} = {}
	private prevTs:number = 0;
	private scrollStarted_at:number = 0;
	private fixedScrollIndex:number = -1;

	private keyupHandler!:(e:KeyboardEvent)=>void;
	private controlHandler!:(e:TwitchatEvent) => void;
	private summaryDataHandler!:(e:TwitchatEvent) => void;
	private paramsDataHandler!:(e:TwitchatEvent) => void;
	private overlayPresenceHandler!:(e:TwitchatEvent)=>void;

	public get styles():StyleValue {
		const res:StyleValue = {
			opacity: this.display? 1 : 0,
		}
		if(this.data?.params){
			// 0 -> .5em
			// 100 -> 5em
			const v = (this.data?.params!.scale || 30)/100;
			const minScale = .25;
			const maxScale = 3;
			res.fontSize = (v * (maxScale-minScale)+minScale)+"em";
		};
		return res;
	}

	public safeHTML(html:string):string {
		return DOMPurify.sanitize(html);
	}

	public getSortedSubs(item:TwitchatDataTypes.EndingCreditsSlotParams) {
		const subs = this.data?.subs || [];
		const resubs = this.data?.resubs || [];
		const subgifts = this.data?.subgifts || [];
		let res: ({type:"sub", value:TwitchatDataTypes.StreamSummaryData["subs"][0]}
				| {type:"resub", value:TwitchatDataTypes.StreamSummaryData["resubs"][0]}
				| {type:"subgift", value:TwitchatDataTypes.StreamSummaryData["subgifts"][0]})[] = [];

		if(item.showSubs !== false)		res = res.concat(subs.map(v=>{ return {type:"sub", value:v}}));
		if(item.showResubs !== false)	res = res.concat(resubs.map(v=>{ return {type:"resub", value:v}}));
		if(item.showSubgifts !== false)	res = res.concat(this.makeUnique(item, subgifts).map(v=>{ return {type:"subgift", value:v}}));
		return res.sort((a, b)=> {
			let scoreA = 0;
			let scoreB = 0;
			if(item.sortBySubTypes) {
				if(a.type == "subgift") scoreA += 10;
				else if(a.type == "resub") scoreA += 5;
				else scoreA += 2;

				if(b.type == "subgift") scoreB += 10;
				else if(b.type == "resub") scoreB += 5;
				else scoreB += 2;
			}
			if(item.sortByNames){
				if(a.value.login.toLowerCase() > b.value.login.toLowerCase()) scoreB ++;
				if(a.value.login.toLowerCase() < b.value.login.toLowerCase()) scoreA ++;
			}else {
				if(a.type === "subgift") scoreA += a.value.total;
				if(b.type === "subgift") scoreB += b.value.total;
			}
			
			return scoreB - scoreA;
		});
	}

	public getRewards(item:TwitchatDataTypes.EndingCreditsSlotParams) {
		const res:{total:number, users:{login:string, uid:string, total:number}[], reward:(TwitchatDataTypes.StreamSummaryData["rewards"][0]["reward"])}[] = [];
		let done:{[key:string]:number} = {};
		//merge reward entries linked to the same reward
		(this.data?.rewards || []).forEach(v=> {
			//Ignore rewards that are no enabled if requested to only show some
			if(item.filterRewards === true) {
				if(!(item.rewardIds || []).includes(v.reward.id)) return;
			}
			//Reward not parsed yet, create an entry
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
			//Save all users linked to the current entry to the main reward entry
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
		return res;
	}

	public getCheers(item:TwitchatDataTypes.EndingCreditsSlotParams) {
		let res:TwitchatDataTypes.StreamSummaryData["bits"][0][] = [];
		const cheers = this.data?.bits || [];
		if(item.showPinnedCheers !== false) res = res.concat(cheers.filter(v=> v.pinned === true))
		if(item.showNormalCheers !== false) res = res.concat(cheers.filter(v=> v.pinned === false))
		return res;
	}

	public getCategoryClasses(item:TwitchatDataTypes.EndingCreditsSlotParams):string[] {
		const res = ["category", item.slotType];
		if(this.data?.params?.showIcons === false) res.push("noIcon");
		const itemCount = this.getEntryCountForSlot(item);
		//If requesting 3 cols but there are only 2 items, switch to 2 cols mode
		if(item.layout == "3cols" && itemCount == 2) res.push("layout_2cols");
		//If requestion 3 or 3 cols but only 1 item is available, switch to 1 col mode
		else if((item.layout == "3cols" && itemCount == 1) || (item.layout == "2cols" && itemCount == 1)) res.push("layout_col");
		else res.push("layout_"+item.layout);
		if(item.slotType == "text" && !item.text) res.push("noText");
		if(item.slotType == "rewards" && item.showRewardUsers === true) res.push("largeSpace");
		if(!item.label) res.push("noLabel");
		if(this.data.params.stickyTitle === true) res.push("sticky");
		return res;
	}

	public getTitleStyles(item:TwitchatDataTypes.EndingCreditsSlotParams):StyleValue {
		const res:StyleValue = {
			color: this.data?.params?.colorTitle,
			fontFamily: this.data?.params?.fontTitle+", Inter",
			filter: "drop-shadow(2px 2px 0 rgba(0, 0, 0, "+((this.data?.params?.textShadow || 0)/100)+"))",
			marginBottom: this.data?.params?.paddingTitle+"px",
		}
		return res;
	}

	public getEntryStyles(item:TwitchatDataTypes.EndingCreditsSlotParams):StyleValue {
		const res:StyleValue = {
			color: this.data?.params?.colorEntry,
			fontFamily: this.data?.params?.fontEntry+", Inter",
			filter: "drop-shadow(1px 1px 0 rgba(0, 0, 0, "+((this.data?.params?.textShadow || 0)/100)+"))",
			// marginBottom: ((this.data?.params?.padding||0)/100*7)+"em",
		}
		return res;
	}

	public getCategoryStyles(item:TwitchatDataTypes.EndingCreditsSlotParams):StyleValue {
		const res:StyleValue = {
			marginBottom: ((this.data?.params?.padding||0)/100*7)+"em",
		}
		return res;
	}

	public requestInfo():void {
		PublicAPI.instance.broadcast(TwitchatEvent.GET_SUMMARY_DATA, {includeParams:true});
	}

	public beforeMount(): void {
		PublicAPI.instance.broadcast(TwitchatEvent.CREDITS_OVERLAY_PRESENCE);
		
		this.keyupHandler = (e:KeyboardEvent) => this.onKeyup(e);
		this.controlHandler = (e:TwitchatEvent) => this.onControl(e);
		this.summaryDataHandler = (e:TwitchatEvent) => this.onSummaryData(e);
		this.paramsDataHandler = (e:TwitchatEvent) => this.onParamsData(e);
		this.overlayPresenceHandler = ()=>{ PublicAPI.instance.broadcast(TwitchatEvent.CREDITS_OVERLAY_PRESENCE); }

		document.addEventListener("keyup", this.keyupHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.SUMMARY_DATA, this.summaryDataHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.ENDING_CREDITS_CONTROL, this.controlHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.ENDING_CREDITS_CONFIGS, this.paramsDataHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.GET_CREDITS_OVERLAY_PRESENCE, this.overlayPresenceHandler);

		watch(()=>this.posY, ()=> {
			// (this.$refs.holder as HTMLDivElement).style.transform = "translateY("+this.posY+"px)";
			(this.$refs.holder as HTMLDivElement).style.marginTop = this.posY+"px";
		});

		setInterval(()=> {
			PublicAPI.instance.broadcast(TwitchatEvent.CREDITS_OVERLAY_PRESENCE);
		}, 20000);
	}

	public beforeUnmount(): void {
		cancelAnimationFrame(this.animFrame);
		document.removeEventListener("keyup", this.keyupHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.SUMMARY_DATA, this.summaryDataHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.ENDING_CREDITS_CONTROL, this.controlHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.ENDING_CREDITS_CONFIGS, this.paramsDataHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.GET_CREDITS_OVERLAY_PRESENCE, this.overlayPresenceHandler);
	}

	/**
	 * Get the number of entries to be displayed
	 * @param item 
	 */
	public getEntryCountForSlot(item:TwitchatDataTypes.EndingCreditsSlotParams):number {
		if(this.entryCountCache[item.id] != undefined) return this.entryCountCache[item.id];
		let count = 0;
		switch(item.slotType) {
			case "hypechats": count =  this.makeUnique(item, (this.data?.hypeChats || [])).length; break;
			case "subs": count = this.getSortedSubs(item).length; break;
			case "cheers": count = this.getCheers(item).length; break;
			case "raids": count =  this.makeUnique(item, (this.data?.raids || [])).length; break;
			case "follows": count = (this.data?.follows || []).length; break;
			case "hypetrains": count = (this.data?.hypeTrains || []).length; break;
			case "so_in": count = (this.data?.shoutouts || []).filter(v=>v.received === true).length; break;
			case "so_out": count = (this.data?.shoutouts || []).filter(v=>v.received === false).length; break;
			case "rewards": count = this.getRewards(item).length; break;
			case "bans": count = (this.data?.chatters || []).filter(v=>v.bans > 0).length; break;
			case "timeouts": count = (this.data?.chatters || []).filter(v=>v.tosDuration > 0).length; break;
			case "polls": count = (this.data?.polls || []).length; break;
			case "predictions": count = (this.data?.predictions || []).length; break;
			case "vips": count = (this.data?.chatters || []).filter(v=>v.vip).length; break;
			case "mods": count = (this.data?.chatters || []).filter(v=>v.mod).length; break;
			case "text": count = item.text || item.label? 1 : 0; break;
			case "chatters": count = this.getSortedChatters(item).length; break;
		}
		count = Math.min(count, item.maxEntries);
		this.entryCountCache[item.id] = count;
		return count;
	}

	/**
	 * Sorts a chatters list
	 */
	public getSortedChatters(item:TwitchatDataTypes.EndingCreditsSlotParams) {
		let list = (this.data?.chatters || []).concat()
		.filter(v=>{
			if(v.count == 0) return false;
			if(v.mod) return item.showMods;
			else if(v.vip) return item.showVIPs;
			else if(v.sub) return item.showSubs;
			return item.showChatters;
		})
		.sort((a,b)=> {
			let scoreA = 0;
			let scoreB = 0;
			if(item.sortByRoles) {
				if(a.mod) scoreA +=10;
				else if(a.vip) scoreA +=5;
				else if(a.sub) scoreA +=2;
				
				if(b.mod) scoreB +=10;
				else if(b.vip) scoreB +=5;
				else if(b.sub) scoreB +=2;
			}

			if(item.sortByAmounts) {
				if(a.count > b.count) scoreA ++;
				if(a.count < b.count) scoreB ++;
			}

			if(item.sortByNames) {
				if(a.login.toLowerCase() > b.login.toLowerCase()) scoreB ++;
				if(a.login.toLowerCase() < b.login.toLowerCase()) scoreA ++;
			}

			return scoreB - scoreA;
		});
		return list.splice(0, item.maxEntries);
	}

	/**
	 * Converts milliseconds to duration
	 * @param seconds 
	 */
	public formatDuration(seconds:number):string {
		return Utils.formatDuration(seconds * 1000);
	}

	/**
	 * Toggles scroll pause
	 */
	public onKeyup(event:KeyboardEvent):void {
		if(event.code != "Space") return;
		event.stopPropagation();
		this.paused = !this.paused;
	}

	/**
	 * Merge entries so we get only unique entries if requested by the parameters
	 * 
	 * @param slot 
	 * @param values 
	 */
	public makeUnique<T>(slot:TwitchatDataTypes.EndingCreditsSlotParams, values:T[]):T[] {
		//Didn't request unique values, just return the array
		if(slot.uniqueUsers != true) return values;

		let mergeKey!:keyof T;
		let valueKey!:keyof T;

		type KeysMatching<T, V> = {[K in keyof T]-?: T[K] extends V ? K : never}[keyof T];

		switch(slot.slotType) {
			case "hypechats": {
				type keyType = keyof TwitchatDataTypes.StreamSummaryData["hypeChats"][0];
				type keyTypeNumber = KeysMatching<TwitchatDataTypes.StreamSummaryData["hypeChats"][0], number>;
				let key:keyType = "login";
				let val:keyTypeNumber = "amount";
				mergeKey = key as keyof T;
				valueKey = val as keyof T;
				break;
			}
			case "subs": {
				type keyType = keyof TwitchatDataTypes.StreamSummaryData["subgifts"][0];
				type keyTypeNumber = KeysMatching<TwitchatDataTypes.StreamSummaryData["subgifts"][0], number>;
				let key:keyType = "login";
				let val:keyTypeNumber = "total";
				mergeKey = key as keyof T;
				valueKey = val as keyof T;
				break;
			}
			case "cheers": {
				type keyType = keyof TwitchatDataTypes.StreamSummaryData["bits"][0];
				type keyTypeNumber = KeysMatching<TwitchatDataTypes.StreamSummaryData["bits"][0], number>;
				let key:keyType = "login";
				let val:keyTypeNumber = "bits";
				mergeKey = key as keyof T;
				valueKey = val as keyof T;
				break;
			}
			case "raids": {
				type keyType = keyof TwitchatDataTypes.StreamSummaryData["raids"][0];
				type keyTypeNumber = KeysMatching<TwitchatDataTypes.StreamSummaryData["raids"][0], number>;
				let key:keyType = "login";
				let val:keyTypeNumber = "raiders";
				mergeKey = key as keyof T;
				valueKey = val as keyof T;
				break;
			}
		}

		const result:T[] = [];
		const keyToUniqueItem:{[key:string]:T} = {};
		for (let i = 0; i < values.length; i++) {
			const v = values[i];
			const key = v[mergeKey];
			const val = v[valueKey];
			if(keyToUniqueItem[key as string] != undefined) {
				(keyToUniqueItem[key as string][valueKey] as number) += val as number;
			}else{
				const clone = JSON.parse(JSON.stringify(v));
				keyToUniqueItem[key as string] = clone;
				result.push(clone);
			}
		}
		return result;
	}

	/**
	 * Called when controlling remotely
	 * Used to control speed
	 */
	private async onControl(e:TwitchatEvent):Promise<void> {
		const data = (e.data as unknown) as {speed?:number, next?:boolean, prev?:boolean, scrollTo?:number}
		if(data.speed != undefined) {
			this.speedScaleInc = data.speed;
		}
		if(data.scrollTo != undefined) {
			this.interpolating = this.fixedScrollIndex != data.scrollTo;
			if(this.interpolating) {
				this.fixedScrollIndex = data.scrollTo;
				const lists = this.$refs.listItem as HTMLDivElement[];
				const bounds = lists[data.scrollTo].getBoundingClientRect();
				const tween = {y:0};
				const offset = this.posY;
				let targetYPos = window.innerHeight * .2;
				gsap.to(tween, {y:bounds.y - targetYPos, duration: 1, ease:"sine.inOut", onUpdate:()=>{
					this.posY = offset - tween.y;
				}, onComplete:()=>{
					// this.interpolating = false;
				}});
			}else{
				this.fixedScrollIndex = -1;
			}
		}
		if(data.next === true || data.prev === true) {
			let targetYPos = window.innerHeight * .5;
			
			const lists = this.$refs.listItem as HTMLDivElement[];
			let closestPos = Number.MAX_VALUE;
			let closestItemIndex:number = -1;
			//Search item closest to top of screen
			lists.forEach((item, index) => {
				const bounds = item.getBoundingClientRect();
				let py = bounds.top - targetYPos;
				if(data.prev) py += bounds.height;
				if(py < closestPos && py > 0 || (closestItemIndex == -1 && index == lists.length-1)) {
				// if(data.next && py < closestPos && py > 0) {
					closestItemIndex = index;
					closestPos = py;
				}
			});

			this.interpolating = true;
			//If asking for next item, increment the index to get the next one.
			//Only next if it's already above the limit
			if(data.next && closestPos < 0) closestItemIndex ++;
			//If asking for prev item, decrement the index to get the prev one.
			if(data.prev) closestItemIndex --;
			//Loop index both ways
			closestItemIndex = closestItemIndex % lists.length;
			if(closestItemIndex < 0) closestItemIndex = lists.length + closestItemIndex;
			//Animate holder's position
			const bounds = lists[closestItemIndex].getBoundingClientRect();
			const tween = {y:0};
			const offset = this.posY;
			gsap.to(tween, {y:bounds.y - targetYPos, duration: 1, ease:"sine.inOut", onUpdate:()=>{
				this.posY = offset - tween.y;
			}, onComplete:()=>{
				this.interpolating = false;
			}});

		}
	}

	/**
	 * Called when API sends summary data counter data
	 */
	private async onSummaryData(e:TwitchatEvent):Promise<void> {
		if(e.data) {
			this.data = (e.data as unknown) as TwitchatDataTypes.StreamSummaryData;
			this.buildSlots();
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
			//Only restart scrolling from bottom if one of the related params changed
			if(this.prevParams &&
			(
				this.prevParams.duration != this.data.params.duration
				|| this.prevParams.startDelay != this.data.params.startDelay
				|| this.prevParams.timing != this.data.params.timing
				|| this.prevParams.loop != this.data.params.loop
			)) resetScroll = true;
			if(this.data.params.lang) this.$i18n.locale = this.data.params.lang;

			this.prevParams = this.data.params;

			this.buildSlots();
			this.reset(resetScroll);
		}
	}

	/**
	 * Resets some data for better live reload
	 */
	private reset(resetScroll:boolean = true):void {
		this.display = false;
		if(resetScroll) {
			this.interpolating = false;
			this.fixedScrollIndex = -1;
			clearTimeout(this.startDelayTimeout)
			cancelAnimationFrame(this.animFrame);
		}
		this.startScroll(resetScroll);
	}

	/**
	 * Starts scrolling credits
	 */
	private startScroll(resetScroll:boolean):void {
		if(this.noEntry) return;
		
		this.$nextTick().then(async () => {
			if(resetScroll && this.data?.params?.startDelay) {
				await new Promise<void>((resolve) => {
					this.startDelayTimeout = setTimeout(() => resolve(), this.data!.params!.startDelay * 1000);
				})
			}
			
			if(!this.data?.params) return;//No params?!
			if(this.data.params.lang) this.$i18n.locale = this.data.params.lang;
			this.display = true;
			
			if(resetScroll) {
				this.posY = window.innerHeight;

				if(this.data?.params?.timing == 'duration') {
					this.scrollStarted_at = Date.now();
				}
				this.renderFrame(performance.now());
			}
		})
	}

	/**
	 * Scrolls credits at a specific speed
	 */
	private renderFrame(ts:number):void {
		this.animFrame = requestAnimationFrame((ts)=>this.renderFrame(ts));
		
		const fadeSize = this.data?.params?.fadeSize || 0;
		const lists = this.$refs.listItem as HTMLDivElement[];
		lists.forEach(item => {
			const title = item.querySelector("[data-title]") as HTMLDivElement | null;
			const list = item.querySelector("[data-list]") as HTMLDivElement;
			let titleHeight = 0;
			if(title) {
				const titleBounds = title.getBoundingClientRect()
				titleHeight = titleBounds.height + 20;
			}
			const listBounds = list.getBoundingClientRect();
			const screenHeight = document.body.clientHeight;
			if(this.data?.params?.stickyTitle !== true) {
				list.style.maskImage = "none";
				item.style.maskImage = "none";
				//@ts-ignore
				list.style["-webkit-mask-image"] = "none";
				//@ts-ignore
				item.style["-webkit-mask-image"] = "none";
			}else{
				if(title) title.style.top = fadeSize+"px";
				list.style.maskImage = "linear-gradient(transparent "+(titleHeight - listBounds.top + fadeSize)+"px, black "+(titleHeight*2 - listBounds.top + fadeSize)+"px)";
				item.style.maskImage = "none";
				//@ts-ignore
				list.style["-webkit-mask-image"] = "linear-gradient(transparent "+(titleHeight - listBounds.top + fadeSize)+"px, black "+(titleHeight*2 - listBounds.top + fadeSize)+"px)";
				//@ts-ignore
				item.style["-webkit-mask-image"] = "none";
			}
			
			if(fadeSize>1) {
				document.body.style.maskImage = "linear-gradient(transparent 0, black "+fadeSize+"px, black "+(screenHeight - fadeSize*2)+"px, transparent "+screenHeight+"px)";
				//@ts-ignore
				document.body.style["-webkit-mask-image"] = "linear-gradient(transparent 0, black "+fadeSize+"px, black "+(screenHeight - fadeSize*2)+"px, transparent "+screenHeight+"px)";
			}else{
				document.body.style.maskImage = "none";
				//@ts-ignore
				document.body.style["-webkit-mask-image"] = "none";
			}
		})
		
		if(this.paused) return;
		if(this.noEntry) return;
		if(this.interpolating) return;

		if(!this.prevTs) {
			this.prevTs = ts;
			return;
		}
		
		const fps = Math.min(1000/30, (ts - this.prevTs)); //At least 30fps to cancel random lags i've seen
		this.prevTs = ts;

		const holder = this.$el as HTMLElement;
		const bounds = holder.getBoundingClientRect();

		if(this.posY < -bounds.height) {
			if(this.data?.params?.loop === true) {
				this.scrollStarted_at = Date.now();
				this.posY = window.innerHeight;
			}
			return;
		}

		if(this.data?.params?.timing == 'duration' && this.speedScaleInc == 0) {
			const percent = Math.max(0, (Date.now() - this.scrollStarted_at) / (this.data?.params?.duration * 1000));
			let prevY = this.posY;
			this.posY = window.innerHeight - (bounds.height + window.innerHeight) * percent;
			//Save current speed so controling speed is based on it.
			//This makes sure speed control is fluid
			if(this.data.params) {
				this.data.params.speed = prevY - this.posY;
				this.speedScale = 0;
			}
		}else{
			const speed = ((this.data?.params?.speed || 2) + this.speedScale) / 1000 * fps;
			this.posY -= speed;
			//Bring back top top if scrolling backward with speed control
			if(this.posY > window.innerHeight && speed < 0 && this.data?.params?.loop === true) {
				this.scrollStarted_at = Date.now();
				this.posY = -bounds.height;
			}
			//Rewrite the start scroll time depending on the scrolling percent
			//If credits are configured to scroll completely during a specific
			//duration, this allows to keep the credits at the same place after
			//stoppiung speed control by simulating a start date based on the
			//current scrolling position
			if(this.data?.params) {
				let s = window.innerHeight;
				let e = -bounds.height;
				let percent = (this.posY - s) / (e - s);
				this.scrollStarted_at = Date.now() - (this.data.params.duration * 1000 * percent);
			}
		}
		if(this.speedScaleInc == 0) {
			//Reset custom speed to 0
			this.speedScale *= .98;
		}else{
			//Keep incrementing speed until speedScaleInc is set to 0
			this.speedScale += this.speedScaleInc;
		}
	}

	/**
	 * Pre computes the slots parameters
	 */
	private buildSlots():void {
		if(!this.data || !this.data.params) return;
		this.slotList = [];
		this.entryCountCache = {};
		const slots = this.data.params.slots.filter(v=>this.getEntryCountForSlot(v) > 0);
		let totalEntries = 0;
		slots.forEach(slotParams => {
			const slot = TwitchatDataTypes.EndingCreditsSlotDefinitions.find(v=>v.id == slotParams.slotType)!;
			//Slot disabled, ignore it
			if(slotParams.enabled === false) return;
			const entryCount = this.getEntryCountForSlot(slotParams);
			totalEntries += entryCount;
			//Pre compute styles and classes to avoid useless rerenders
			this.slotList.push({
				slot,
				entryCount,
				params:slotParams,
				holderClasses:this.getCategoryClasses(slotParams),
				titleStyles:this.getTitleStyles(slotParams),
				entryStyles:this.getEntryStyles(slotParams),
				categoryStyles:this.getCategoryStyles(slotParams),
			})
		});
		this.noEntry = totalEntries == 0;
	}
}

interface SlotItem {
	slot:TwitchatDataTypes.EndingCreditsSlotDefinition;
	params:TwitchatDataTypes.EndingCreditsSlotParams;
	holderClasses:string[];
	titleStyles:StyleValue;
	entryStyles:StyleValue;
	categoryStyles:StyleValue;
	entryCount:number;
}

</script>

<style scoped lang="less">
.overlayendingcredits{
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 100%;
	color: #fff;
	will-change: transform;
	will-change: margin-top;
	
	.category {
		font-family: "Inter";
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		h1 {
			font-size: 2.5em;
			text-align: center;
			z-index: 1;
			.icon {
				height: 1em;
				width: 1em;
				margin-right: .25em;
			}
			&:empty {
				display: none;
			}
		}
		.list {
			gap: 1em;
			display: flex;
			flex-direction: column;
			max-width: 100vw;
			align-items: center;

			.item {
				display: flex;
				flex-direction: row;
				justify-content: center;
				font-size: 1.5em;
				font-weight: 400;
				.icon {
					height: 1em;
				}
				.count {
					margin-left: .5em;
					font-weight: bold;
					display: flex;
					flex-direction: raw;
					align-items: center;
					.icon {
						margin-right: .25em;
						height: 1em;
						width: 1em;
					}
				}

				.badge {
					width: 1em;
					min-width: 1em;
					height: 1em;
					min-height: 1em;
					margin-right: .5em;
				}

				.rewardIcon {
					margin-right: .5em;
					height: 1em;
				}
				.userlist {
					gap: .25em;
					display: flex;
					flex-direction: column;
					align-items: center;
					flex-basis: 100%;
					margin-top: .5em;
					font-size: .8em;
					font-weight: 300;
				}
			}
		}

		&.sticky {
			h1 {
				position: sticky;
				top: 0;
			}
		}

		&.noLabel {
			h1 {
				.icon {
					margin-left: 0;
				}
			}
		}

		&.largeSpace {
			.list {
				row-gap: 3em;
			}
		}

		&.rewards {
			.list {
				.item {
					flex-wrap: wrap;
					width: fit-content;
				}
			}
		}

		&.hypetrains {
			.list {
				.item {
					gap: .5em;
					display: flex;
					align-items: center;
					flex-direction: column;
					.conductor {
						gap: 1em;
						row-gap: .25em;
						display: flex;
						align-items: center;
						flex-direction: row;
						flex-wrap: wrap;
						font-size: .8em;
					}
				}
			}
		}

		&.hypechats {
			.list {
				.item {
					.info {
						margin-right: .5em;
					}
					.amount {
						font-weight: bold;
					}
				}
			}
		}
		&.polls, &.predictions {
			.list {
				gap: 3em;
				.item {
					gap: .5em;
					flex-direction: column;
					min-width: 100%;
					.info {
						font-weight: bold;
					}
					.pollItems {
						gap: .25em;
						display: flex;
						flex-direction: column;
						max-width: fit-content;
						font-size: .9em;
						.pollItem {
							gap: 5em;
							display: flex;
							flex-direction: row;
							justify-content: space-between;
						}
					}
				}
			}
			&.layout_col {
				.list {
					text-align: center;
					.item {
						align-items: center;
					}
				}
			}
			&.layout_colRight {
				.list {
					text-align: right;
					.item {
						align-items: flex-end;
					}
				}
			}
		}

		&.text.noText {
			h1 {
				margin-bottom: 0;
			}
			.textContent {
				display: none;
			}
		}

		&.text {
			&.layout_col {
				.list {
					text-align: center;
				}
			}
			&.layout_colRight {
				.list {
					text-align: right;
				}
			}
			.textContent {
				white-space: pre-line;
				line-height: 1.5em;
			}
		}

		&.layout_left {
			.list {
				column-gap: 2em;
				flex-direction: row;
				flex-wrap: wrap;
				align-items: center;
				justify-content: flex-start;
				.item {
					justify-content: flex-start;
					.userlist {
						align-items: flex-start;
					}
				}
			}
		}

		&.layout_center {
			.list {
				width: 100%;
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
				.item {
					justify-content: flex-end;
					.userlist {
						align-items: flex-end;
					}
				}
			}
		}

		&.layout_colRight {
			.list {
				align-items: flex-end;
				.item {
					justify-content: flex-end;
					.userlist {
						align-items: flex-end;
					}
				}
			}
		}

		// &.layout_col {
		// 	width: 100%;
		// 	.list {
		// 		width: 100%;
		// 		align-items: center;
		// 	}
		// }

		&.layout_colLeft {
			.list {
				align-items: flex-start;
				.item {
					justify-content: flex-start;
					.userlist {
						align-items: flex-start;
					}
				}
			}
		}

		&.layout_2cols {
			.list {
				display: grid;
				column-gap: 4em;
				grid-template-columns: repeat(auto-fill, minmax(40%, 1fr));
				.item {
					&:nth-child(2n) {
						align-self: flex-start;
						justify-self: start;
						justify-content: flex-start;
						.userlist {
							align-items: flex-start;
						}
					}
					&:nth-child(2n+1) {
						align-self: flex-start;
						justify-self: end;
						justify-content: flex-end;
						.userlist {
							align-items: flex-end;
						}
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
					max-width: 100%;
					&:nth-child(3n+1) {
						justify-self: end;
						justify-content: flex-end;
						align-self: flex-start;
						.userlist {
							align-items: flex-end;
						}
					}
					&:nth-child(3n+2) {
						justify-self: center;
						align-self: flex-start;
					}
					&:nth-child(3n) {
						justify-self: start;
						justify-content: flex-start;
						align-self: flex-start;
						.userlist {
							align-items: flex-start;
						}
					}
					.info {
						overflow: hidden;
						text-overflow: ellipsis;
						line-height: 1.2em;
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