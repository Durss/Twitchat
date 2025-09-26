<template>
	<div class="overlayendingcredits" v-if="data && slotList && !noEntry" :style="styles" ref="holder">
		<template v-for="item in slotList">
			<div :class="item.holderClasses" :style="item.categoryStyles" ref="listItem" :id="'item_'+item.params.id">
				<h1 data-title :style="item.titleStyles"><Icon :name="item.slot.icon" v-if="item.slot.id != 'text'" />{{ item.params.label }}</h1>

				<div v-if="data.premiumWarningSlots && data.premiumWarningSlots[item.slot.id] === true" data-list class="list premium" :style="item.entryStyles"><Icon name="premium" />{{ data.labels.premium_only }}</div>

				<div v-else-if="item.entryCount == 0" data-list class="list empty" :style="item.entryStyles">{{ data.labels.no_entry }}</div>

				<div v-else data-list class="list" :style="item.entryStyles">
					<div v-if="item.params.slotType == 'hypechats'" v-for="entry in makeUnique(item.params, data.hypeChats || []).concat().sort((a,b)=>b.amount-a.amount).splice(0, item.params.maxEntries)" class="item">
						<span class="info">{{entry.login}}</span>
						<div class="amount" v-if="item.params.showAmounts === true">
							<span class="currency"> − {{{EUR:"€",USD:"$", GBP:"£"}[entry.currency] || entry.currency}}</span>
							<span class="value">{{entry.amount}}</span>
						</div>
					</div>

					<div v-if="item.params.slotType == 'ytSuperchat'" v-for="entry in getSortedSuperMessages(item.params).splice(0, item.params.maxEntries)" class="item">
						<span class="info">{{entry.login}}</span>
						<div class="amount" v-if="item.params.showAmounts === true">
							<span class="currency"> − {{{EUR:"€",USD:"$", GBP:"£"}[entry.currency] || entry.currency}}</span>
							<span class="value">{{entry.amount}}</span>
						</div>
					</div>

					<div v-if="item.params.slotType == 'ytSuperSticker'" v-for="entry in getSortedSuperMessages(item.params).splice(0, item.params.maxEntries)" class="item">
						<div class="stickerList">
							<img v-for="sticker in entry.stickerUrlList" :src="sticker" class="sticker" alt="sticker" referrerpolicy="no-referrer">
						</div>
						<div class="user">
							<span class="info">{{entry.login}}</span>
							<div class="amount" v-if="item.params.showAmounts === true">
								<span class="currency">{{{EUR:"€",USD:"$", GBP:"£"}[entry.currency] || entry.currency}}</span>
								<span class="value">{{entry.amount}}</span>
							</div>
						</div>
					</div>

					<div v-if="item.params.slotType == 'tiktokGifts'" v-for="entry in getSortedTikTokGift(item.params).splice(0, item.params.maxEntries)" class="item">
						<div class="stickerList">
							<img v-for="sticker in entry.imageUrlList" :src="sticker" class="sticker" alt="sticker" referrerpolicy="no-referrer">
						</div>
						<div class="user">
							<span class="info">{{entry.login}}</span>
							<div class="amount" v-if="item.params.showAmounts === true">
								<span class="value"><img src="@/assets/icons/tiktok_diamond.svg">{{entry.cumulatedAmount || entry.amount}}</span>
							</div>
						</div>
					</div>

					<div v-if="item.params.slotType == 'tiktokLikes'" v-for="entry in getSortedTikTokLikes(item.params).splice(0, item.params.maxEntries)" class="item">
						<span class="info">{{entry.login}}</span>
						<span class="count" v-if="item.params.showAmounts === true"><Icon name="follow" class="userIcon" />{{ entry.count }}</span>
					</div>

					<div v-if="item.params.slotType == 'tiktokShares'" v-for="entry in getSortedTikTokShares(item.params).splice(0, item.params.maxEntries)" class="item">
						<span class="info">{{entry.login}}</span>
						<span class="count" v-if="item.params.showAmounts === true"><Icon name="share" class="userIcon" />{{ entry.count }}</span>
					</div>

					<div v-if="item.params.slotType == 'subs'" v-for="entry in getSortedSubs(item.params).splice(0, item.params.maxEntries)" class="item">
						<Icon class="badge" v-if="item.params.showBadges && entry.value.fromActiveSubs !== true" :name="entry.type == 'subgift'? 'gift' : 'sub'" />
						<span class="info">{{entry.value.login}}</span>
						<span class="count" v-if="entry.type!='subgift' && item.params.showSubMonths === true && entry.value.subDuration"> − {{ getMonthsDurationlabel(entry.value.subDuration) }}</span>
						<span class="count" v-if="entry.type=='subgift' && item.params.showAmounts === true"> − {{ entry.value.total }}</span>
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
						<span v-html="data.labels.train.replace(/\{LEVEL\}/gi, `<strong>${parseInt(entry.level+'')}</strong>`).replace(/\{PERCENT\}/gi, `<strong>${parseFloat(entry.percent+'')}</strong>`)"></span>
						<template v-if="item.params.showTrainConductors && (entry.conductorBits || entry.conductorSubs)">
							<div v-if="entry.conductorSubs" class="conductor">
								<Icon class="badge" name="sub" /><span>{{entry.conductorSubs.login}}</span>
								<!-- <span>x{{entry.conductorSubs.subs}} <Icon class="badge" name="sub" /></span> -->
							</div>
							<div v-if="entry.conductorBits" class="conductor">
								<Icon class="badge" name="bits" /><span>{{entry.conductorBits.login}}</span>
								<!-- <span>x{{entry.conductorBits.bits}} <Icon class="badge" name="bits" /></span> -->
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
							<span class="login" v-for="u in entry.users">
								<span>{{ u.login }}</span>
								<span v-if="item.params.showAmounts === true"> x{{ u.total }}</span>
							</span>
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

					<div v-if="item.params.slotType == 'tips'" v-for="entry in getTips(item.params).splice(0, item.params.maxEntries)" class="item">
						<!-- <Icon class="badge" v-if="item.params.showBadges" :name="{kofi:'kofi', tipeee:'tipeee', patreon:'patreon', streamlabs:'streamlabs', streamelements:'streamelements'}[entry.platform]" /> -->
						<span class="info">{{entry.login}}</span>
						<span class="count" v-if="item.params.showAmounts === true">{{ entry.amount +" "+entry.currency }}</span>
					</div>

					<div v-if="item.params.slotType == 'merch'" v-for="entry in getMerch(item.params).splice(0, item.params.maxEntries)" class="item">
						<!-- <Icon class="badge" v-if="item.params.showBadges" :name="{kofi:'kofi', tipeee:'tipeee', patreon:'patreon', streamlabs:'streamlabs', streamelements:'streamelements'}[entry.platform]" /> -->
						<span class="info">{{entry.login}}</span>
						<span class="merch">{{entry.products.join(", ")}}</span>
						<!-- <span class="count" v-if="entry.total > -1 && entry.currency">{{ entry.total +" "+entry.currency }}</span> -->
					</div>

					<div v-if="item.params.slotType == 'powerups'" v-for="entry in getSortedPowerups(item.params)" class="item" :class="entry.skinID || 'emote'">
						<div class="emoteList">
							<img v-if="entry.emoteUrlList" v-for="url in entry.emoteUrlList" class="emote" :src="url" alt="emote">
						</div>
						<div class="gradientBg" v-if="entry.skinID"></div>
						<span class="info">{{entry.login}}</span>
						<div class="amount" v-if="(entry.count || 0) > 0 && item.params.uniqueUsers === true">x<strong>{{ entry.count }}</strong></div>
					</div>

					<div v-if="item.params.slotType == 'patreonMembers'" v-for="entry in getPatreonMembers(item.params).splice(0, item.params.maxEntries)" class="item">
						<span class="info">{{entry.login}}</span>
						<span class="count" v-if="item.params.showAmounts === true"> − {{ getMonthsDurationlabel(entry.months) }}</span>
						<span class="count" v-if="item.params.showTotalAmounts === true"> − {{ entry.lifetimeAmount.toFixed(0) }}{{ item.params.currency }}</span>
					</div>
				</div>
			</div>
		</template>
		<Teleport to="body">
			<img class="ending_credits_powerupEmote" alt="emote"
			ref="powerupEmote"
			v-for="item in powerUpEmoteProps"
			v-show="data.params?.powerUpEmotes == true"
			:src="item.image">
		</Teleport>
	</div>
</template>

<script lang="ts">
import TwitchatEvent from '@/events/TwitchatEvent';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import Utils from '@/utils/Utils';
import { gsap } from 'gsap/gsap-core';
import DOMPurify from 'isomorphic-dompurify';
import { watch, type CSSProperties } from 'vue';
import { Component, toNative } from 'vue-facing-decorator';
import Icon from '../Icon.vue';
import AbstractOverlay from './AbstractOverlay';

@Component({
	components:{
		Icon,
	},
	emits:[],
})
class OverlayEndingCredits extends AbstractOverlay {

	public display:boolean = false;
	public noEntry:boolean = false;
	public data:TwitchatDataTypes.StreamSummaryData|null = null;
	public slotList:SlotItem[] = [];
	public powerUpEmoteProps:{image:string, behind:boolean, angle:number, angleSpeed:number, speedRatio:number, scale:number}[] = [];

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
	private prevPosY:number = 0;
	private scrollStarted_at:number = 0;
	private fixedScrollId:string = "";
	private creditsComplete:boolean = false;
	private styleNode:HTMLStyleElement|null = null;

	private keyupHandler!:(e:KeyboardEvent)=>void;
	private controlHandler!:(e:TwitchatEvent) => void;
	private summaryDataHandler!:(e:TwitchatEvent) => void;
	private paramsDataHandler!:(e:TwitchatEvent) => void;
	private overlayPresenceHandler!:(e:TwitchatEvent)=>void;

	public get styles():CSSProperties {
		const res:CSSProperties = {
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

	public getTips(item:TwitchatDataTypes.EndingCreditsSlotParams) {
		const tips = this.makeUnique(item, (this.data?.tips || [])
			.filter(tip =>
				(tip.platform == "kofi" && (item.showTipsKofi || item.showSubsKofi != false))//checking for "!= false" so this new props defaults to true if not specified
				|| (tip.platform == "tipeee" && item.showTipsTipeee)
				|| (tip.platform == "patreon" && item.showTipsPatreon)
				|| (tip.platform == "streamlabs" && item.showTipsStreamlabs)
				|| (tip.platform == "streamelements" && item.showTipsStreamelements)
			)
		);
		return tips.sort((a, b)=> {
			let scoreA = 0;
			let scoreB = 0;
			if(item.sortByAmounts){
				scoreA += a.amount;
				scoreB += b.amount;
			}
			if(item.sortByNames){
				if(a.login.toLowerCase() > b.login.toLowerCase()) scoreB ++;
				if(a.login.toLowerCase() < b.login.toLowerCase()) scoreA ++;
			}

			return scoreB - scoreA;
		});
	}

	public getMerch(item:TwitchatDataTypes.EndingCreditsSlotParams) {
		return (this.data?.merch || []).filter(v=>
		(item.showMerchKofi && v.platform == "kofi")
		||
		(item.showMerchStreamlabs && v.platform == "streamlabs"));
	}

	public getSortedSubs(params:TwitchatDataTypes.EndingCreditsSlotParams) {
		const subs = this.data?.subs || [];
		const resubs = this.data?.resubs || [];
		const subgifts = this.data?.subgifts || [];
		const tierToShow = {
								"prime": params.showSubsPrime !== false,
								1: params.showSubsT1 !== false,
								2: params.showSubsT2 !== false,
								3: params.showSubsT3 !== false
							};
		let res: ({type:"sub", value:TwitchatDataTypes.StreamSummaryData["subs"][0]}
				| {type:"resub", value:TwitchatDataTypes.StreamSummaryData["resubs"][0]}
				| {type:"subgift", value:TwitchatDataTypes.StreamSummaryData["subgifts"][0]})[] = [];

		if(params.showAllSubs === true) {
			res = res.concat(subs.filter(v=>v.fromActiveSubs === true && tierToShow[v.tier]).map(v=>{ return {type:"sub", value:v}}));
			res = res.concat(resubs.filter(v=>v.fromActiveSubs === true && tierToShow[v.tier]).map(v=>{ return {type:"resub", value:v}}));
		}

		if(params.showAllSubgifters === true) {
			res = res.concat(subgifts.filter(v=>v.fromActiveSubs === true && tierToShow[v.tier]).map(v=>{ return {type:"subgift", value:v}}));
		}

		if(params.showAllSubs !== true && params.showAllSubgifters !== true){
			const allowedPlatforms:TwitchatDataTypes.ChatPlatform[] = [];
			if(params.showSubs || params.showResubs || params.showSubgifts) allowedPlatforms.push("twitch");
			if(params.showSubsYoutube || params.showSubgiftsYoutube) allowedPlatforms.push("youtube");
			if(params.showSubsTiktok) allowedPlatforms.push("tiktok");

			if(params.showSubs !== false || params.showSubsYoutube !== false || params.showSubsTiktok !== false) {
				res = res.concat(subs.filter(v=>
					v.fromActiveSubs !== true && tierToShow[v.tier] && allowedPlatforms.includes(v.platform)
				).map(v=>{ return {type:"sub", value:v}}));
			}
			if(params.showResubs !== false) {
				res = res.concat(resubs.filter(v=>
					v.fromActiveSubs !== true && tierToShow[v.tier] && allowedPlatforms.includes(v.platform)
				).map(v=>{ return {type:"resub", value:v}}));
			}
			if(params.showSubgifts !== false || params.showSubgiftsYoutube !== false) {
				res = res.concat(this.makeUnique(params, subgifts.filter(v=>
					v.fromActiveSubs !== true && tierToShow[v.tier] && allowedPlatforms.includes(v.platform)
				)).map(v=>{ return {type:"subgift", value:v}}));
			}
		}

		return res.sort((a, b)=> {
			let scoreA = 0;
			let scoreB = 0;
			if(params.sortBySubTypes) {
				if(a.type == "subgift") scoreA += 100000000000;
				else scoreA += 1000000000;

				if(b.type == "subgift") scoreB += 100000000000;
				else scoreB += 1000000000;
			}
			if(params.sortByNames){
				if(a.value.login.toLowerCase() > b.value.login.toLowerCase()) scoreB += 10000000;
				if(a.value.login.toLowerCase() < b.value.login.toLowerCase()) scoreA += 10000000;
			}

			if(a.type === "subgift") scoreA += a.value.total;
			if(b.type === "subgift") scoreB += b.value.total;
			if(a.type != "subgift" && a.value.subDuration) scoreA += a.value.subDuration;
			if(b.type != "subgift" && b.value.subDuration) scoreB += b.value.subDuration;

			return scoreB - scoreA;
		});
	}

	public getPatreonMembers(params:TwitchatDataTypes.EndingCreditsSlotParams) {
		const allTiers = !params.patreonTiers || params.patreonTiers.length == 0
		let members:TwitchatDataTypes.StreamSummaryData["patreonMembers"][number][]
		= (this.data?.patreonMembers || []).filter(v=>(params.patreonTiers || []).includes(v.tier) || allTiers).concat();

		if(params.anonLastNames == true) {
			members = members.map(v=> {
				v = JSON.parse(JSON.stringify(v));
				let login = v.login.trim();
				//Keep the first first word as is.
				//Only keep first letter of the rest of the words.
				//Split first and second word with a space, split the next words with a dot.
				const chunks = login.split(" ");
				if(chunks.length > 1) {
					login = chunks.map((v,i)=> i == 0? v+" " : v[0].toUpperCase()+".").join("");
					login = login.substring(0, login.length-1);
					v.login = login;
				}
				return v;
			})
		}

		return members.sort((a, b)=> {
			let scoreA = 0;
			let scoreB = 0;

			if(params.sortByAmounts) {
				if(a.months > b.months) scoreA += 1000;
				if(a.months < b.months) scoreB += 1000;
			}

			if(params.sortByTotalAmounts) {
				if(a.lifetimeAmount > b.lifetimeAmount) scoreA += 10000;
				if(a.lifetimeAmount < b.lifetimeAmount) scoreB += 10000;
			}

			if(params.sortByNames) {
				if(a.login.toLowerCase() > b.login.toLowerCase()) scoreB ++;
				if(a.login.toLowerCase() < b.login.toLowerCase()) scoreA ++;
			}

			return scoreB - scoreA;
		});
	}

	public getSortedSuperMessages<T>(params:TwitchatDataTypes.EndingCreditsSlotParams):((TwitchatDataTypes.StreamSummaryData["superChats"][number] | TwitchatDataTypes.StreamSummaryData["superStickers"][number]) & {stickerUrlList?:string[]})[] {
		let res:((TwitchatDataTypes.StreamSummaryData["superChats"][number] | TwitchatDataTypes.StreamSummaryData["superStickers"][number]) & {stickerUrlList?:string[]})[] = [];

		if(params.slotType == "ytSuperchat") {
			res = this.data!.superChats.concat();
			if(params.uniqueUsers) {
				res = this.makeUnique(params, this.data!.superChats);
			}
		}else

		if(params.slotType == "ytSuperSticker") {
			let tmp = this.data!.superStickers.map(v => { return {...v, stickerUrlList:[v.stickerUrl!]}});
			if(params.uniqueUsers === true) {
				let usersDoneStickers:{[login:string]:typeof tmp[number]} = {};
				for (let i = 0; i < tmp.length; i++) {
					const item = tmp[i];
					if(!usersDoneStickers[item.login]) usersDoneStickers[item.login] = item;
					else if(item.stickerUrl) {
						usersDoneStickers[item.login].amount += item.amount;
						usersDoneStickers[item.login].stickerUrlList.push(item.stickerUrl);
						tmp.splice(i,1);
						i--;
					}
				}
			}
			res = tmp;
		}

		return res.sort((a, b)=> {
			let scoreA = 0;
			let scoreB = 0;

			if(params.sortByAmounts) {
				if(a.amount > b.amount) scoreA +=2;
				if(a.amount < b.amount) scoreB +=2;
			}

			if(params.sortByNames) {
				if(a.login.toLowerCase() > b.login.toLowerCase()) scoreB ++;
				if(a.login.toLowerCase() < b.login.toLowerCase()) scoreA ++;
			}

			return scoreB - scoreA;
		});
	}

	public getSortedTikTokGift<T>(params:TwitchatDataTypes.EndingCreditsSlotParams):((TwitchatDataTypes.StreamSummaryData["tiktokGifts"][number]) & {cumulatedAmount?:number, imageUrlList?:string[]})[] {
		let res:((TwitchatDataTypes.StreamSummaryData["tiktokGifts"][number]) & {cumulatedAmount?:number, imageUrlList?:string[]})[] = [];

		let tmp = this.data!.tiktokGifts.map(v => { return {...v, cumulatedAmount:0, imageUrlList:[v.imageUrl!]}});
		if(params.uniqueUsers === true) {
			let usersDoneGifts:{[login:string]:typeof tmp[number]} = {};
			let imageDoneGifts:{[key:string]:true} = {};
			for (let i = 0; i < tmp.length; i++) {
				const item = tmp[i];
				const dedupeKey = item.imageUrl+"____"+item.uid;

				if(!usersDoneGifts[item.login]) usersDoneGifts[item.login] = item;
				else if(item.imageUrl) {
					usersDoneGifts[item.login].count += item.count;
					usersDoneGifts[item.login].amount += item.amount;
					//Only show the same gift once for the same user if merging gifts by users
					if(imageDoneGifts[dedupeKey] != true) {
						usersDoneGifts[item.login].imageUrlList.push(item.imageUrl);
					}
					tmp.splice(i,1);
					i--;
				}
				imageDoneGifts[dedupeKey] = true;
				usersDoneGifts[item.login].cumulatedAmount += item.amount * item.count;
			}
		}
		res = tmp;

		return res.sort((a, b)=> {
			let scoreA = 0;
			let scoreB = 0;

			if(params.sortByAmounts) {
				if(a.count > b.count) scoreA += 2;
				if(a.count < b.count) scoreB += 2;
				if(a.amount > b.amount) scoreA += 10;
				if(a.amount < b.amount) scoreB += 10;
			}

			if(params.sortByNames) {
				if(a.login.toLowerCase() > b.login.toLowerCase()) scoreB ++;
				if(a.login.toLowerCase() < b.login.toLowerCase()) scoreA ++;
			}

			return scoreB - scoreA;
		});
	}

	public getSortedTikTokLikes<T>(params:TwitchatDataTypes.EndingCreditsSlotParams):TwitchatDataTypes.StreamSummaryData["tiktokLikes"][number][] {
		return this.data!.tiktokLikes.concat().sort((a, b)=> {
			let scoreA = 0;
			let scoreB = 0;

			if(params.sortByAmounts) {
				if(a.count > b.count) scoreA += 2;
				if(a.count < b.count) scoreB += 2;
			}

			if(params.sortByNames) {
				if(a.login.toLowerCase() > b.login.toLowerCase()) scoreB ++;
				if(a.login.toLowerCase() < b.login.toLowerCase()) scoreA ++;
			}

			return scoreB - scoreA;
		});
	}

	public getSortedTikTokShares<T>(params:TwitchatDataTypes.EndingCreditsSlotParams):TwitchatDataTypes.StreamSummaryData["tiktokShares"][number][] {
		return this.data!.tiktokShares.concat().sort((a, b)=> {
			let scoreA = 0;
			let scoreB = 0;

			if(params.sortByAmounts) {
				if(a.count > b.count) scoreA += 2;
				if(a.count < b.count) scoreB += 2;
			}

			if(params.sortByNames) {
				if(a.login.toLowerCase() > b.login.toLowerCase()) scoreB ++;
				if(a.login.toLowerCase() < b.login.toLowerCase()) scoreA ++;
			}

			return scoreB - scoreA;
		});
	}

	public getSortedPowerups(params:TwitchatDataTypes.EndingCreditsSlotParams):(TwitchatDataTypes.StreamSummaryData["powerups"][number] & {emoteUrlList?:string[], count?:number})[] {
		let anims:(TwitchatDataTypes.StreamSummaryData["powerups"][number] & {count:number})[] = [];
		let emotes:(TwitchatDataTypes.StreamSummaryData["powerups"][number] & {emoteUrlList:string[]})[] = [];
		if(params.showPuSkin !== false)		anims	= this.data!.powerups.filter(v=>v.type == "animation")
													.map(v => { return {...v, count:1}});
		if(params.showPuEmote !== false)	emotes	= this.data!.powerups.filter(v=>v.type == "gigantifiedemote")
													.map(v => { return {...v, emoteUrlList:[v.emoteUrl!]}});
		if(params.showPuCeleb !== false)	emotes	= emotes.concat(this.data!.powerups.filter(v=>v.type == "celebration")
													.map(v => { return {...v, emoteUrlList:[v.emoteUrl!]}}));

		if(params.uniqueUsers === true) {
			let usersDoneEmote:{[login:string]:typeof emotes[number]} = {};
			for (let i = 0; i < emotes.length; i++) {
				const item = emotes[i];
				if(!usersDoneEmote[item.login]) usersDoneEmote[item.login] = item;
				else if(item.emoteUrl) {
					usersDoneEmote[item.login].emoteUrlList.push(item.emoteUrl);
					emotes.splice(i,1);
					i--;
				}
			}

			let usersDoneAnims:{[login:string]:typeof anims[number]} = {};
			for (let i = 0; i < anims.length; i++) {
				const item = anims[i];
				if(!usersDoneAnims[item.login]) usersDoneAnims[item.login] = item;
				else {
					usersDoneAnims[item.login].count ++;
					anims.splice(i,1);
					i--;
				}
			}
		}

		if(params.sortByAmounts) {
			emotes.sort((a,b)=>{
				if(a.emoteUrlList.length == b.emoteUrlList.length) {
					return a.login.toLowerCase().localeCompare(b.login.toLowerCase());
				}
				return b.emoteUrlList.length - a.emoteUrlList.length;
			});
			anims.sort((a,b)=>{
				if(a.count == b.count) {
					return a.login.toLowerCase().localeCompare(b.login.toLowerCase());
				}
				return b.count - a.count;
			});
		}

		return [...emotes, ...anims].splice(0, params.maxEntries);
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
		if(item.showPinnedCheers !== false) res = res.concat(cheers.filter(v=> v.pinned === true));
		if(item.showNormalCheers !== false) res = res.concat(cheers.filter(v=> v.pinned === false));
		return this.makeUnique(item, res);
	}

	public getMonthsDurationlabel(duration:number):string {
		const [singular, plural] = this.data!.labels.sub_duration.split(" | ");
		let template = singular;
		if(duration > 1 && plural) template = plural;
		return template.replace(/\{MONTHS\}/gi, duration.toString());
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

		window.setInterval(()=> {
			PublicAPI.instance.broadcast(TwitchatEvent.CREDITS_OVERLAY_PRESENCE);
		}, 20000);

		this.styleNode = document.createElement("style");
		document.head.appendChild(this.styleNode);
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
			case "hypechats": count = this.makeUnique(item, (this.data?.hypeChats || [])).length; break;
			case "subs": count = this.getSortedSubs(item).length; break;
			case "cheers": count = this.getCheers(item).length; break;
			case "raids": count = this.makeUnique(item, (this.data?.raids || [])).length; break;
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
			case "tips": count = this.getTips(item).length; break;
			case "merch": count = this.getMerch(item).length; break;
			case "powerups": count = this.getSortedPowerups(item).length; break;
			case "shoutouts": count = (this.data?.shoutouts || []).length; break;
			case "ytSuperchat": count = this.getSortedSuperMessages(item).length; break;
			case "ytSuperSticker": count = this.getSortedSuperMessages(item).length; break;
			case "tiktokGifts": count = this.getSortedTikTokGift(item).length; break;
			case "tiktokLikes": count = (this.data?.tiktokLikes || []).length; break;
			case "tiktokShares": count = (this.data?.tiktokShares || []).length; break;
			case "patreonMembers": count = this.getPatreonMembers(item).length; break;
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
			case "ytSuperchat": {
				type keyType = keyof TwitchatDataTypes.StreamSummaryData["superChats"][0];
				type keyTypeNumber = KeysMatching<TwitchatDataTypes.StreamSummaryData["superChats"][0], number>;
				let key:keyType = "login";
				let val:keyTypeNumber = "amount";
				mergeKey = key as keyof T;
				valueKey = val as keyof T;
				break;
			}
			case "ytSuperSticker": {
				type keyType = keyof TwitchatDataTypes.StreamSummaryData["superStickers"][0];
				type keyTypeNumber = KeysMatching<TwitchatDataTypes.StreamSummaryData["superStickers"][0], number>;
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
			case "tips": {
				type keyType = keyof TwitchatDataTypes.StreamSummaryData["tips"][0];
				type keyTypeNumber = KeysMatching<TwitchatDataTypes.StreamSummaryData["tips"][0], number>;
				let key:keyType = "login";
				let val:keyTypeNumber = "amount";
				mergeKey = key as keyof T;
				valueKey = val as keyof T;
				break;
			}
			case "tiktokLikes": {
				type keyType = keyof TwitchatDataTypes.StreamSummaryData["tiktokLikes"][0];
				type keyTypeNumber = KeysMatching<TwitchatDataTypes.StreamSummaryData["tiktokLikes"][0], number>;
				let key:keyType = "login";
				let val:keyTypeNumber = "count";
				mergeKey = key as keyof T;
				valueKey = val as keyof T;
				break;
			}
			case "tiktokShares": {
				type keyType = keyof TwitchatDataTypes.StreamSummaryData["tiktokShares"][0];
				type keyTypeNumber = KeysMatching<TwitchatDataTypes.StreamSummaryData["tiktokShares"][0], number>;
				let key:keyType = "login";
				let val:keyTypeNumber = "count";
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
		const data = (e.data as unknown) as {speed?:number, next?:boolean, prev?:boolean, scrollTo?:string}
		if(data.speed != undefined) {
			this.speedScaleInc = data.speed;
		}
		if(data.scrollTo != undefined) {
			this.interpolating = this.fixedScrollId != data.scrollTo;
			if(this.interpolating) {
				const bounds = document.getElementById("item_"+data.scrollTo)?.getBoundingClientRect();
				if(!bounds) {
					//Item not found, cancel interpolation
					this.interpolating = false;
					return;
				}
				this.fixedScrollId = data.scrollTo;
				const tween = {y:0};
				const offset = this.posY;
				let targetYPos = window.innerHeight * .2;
				gsap.to(tween, {y:bounds.y - targetYPos, duration: 1, ease:"sine.inOut", onUpdate:()=>{
					this.posY = offset - tween.y;
				}, onComplete:()=>{
					// this.interpolating = false;
				}});
			}else{
				this.fixedScrollId = "";
			}
		}
		if(data.next === true || data.prev === true) {
			let targetYPos = window.innerHeight * .5;

			const lists = (this.$refs.listItem as HTMLDivElement[] | undefined) || [];
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
			this.fixedScrollId = "";
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

			this.prevParams = this.data.params;

			this.buildSlots();
			this.reset(resetScroll);

			this.styleNode!.innerHTML = `
			@font-face {
				font-family: "title-font";
				 src: local("${this.data?.params?.fontTitle}");
			}
			@font-face {
				font-family: "entry-font";
				 src: local("${this.data?.params?.fontEntry}");
			}`;
		}
	}

	/**
	 * Resets some data for better live reload
	 */
	private reset(resetScroll:boolean = true):void {
		this.display = false;
		if(resetScroll) {
			this.interpolating = false;
			this.fixedScrollId = "";
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
					this.startDelayTimeout = window.setTimeout(() => resolve(), this.data!.params!.startDelay * 1000);
				})
			}

			if(!this.data?.params) return;//No params?!
			this.display = true;

			if(resetScroll) {
				this.posY = window.innerHeight;

				if(this.data?.params?.timing == 'duration') {
					this.scrollStarted_at = Date.now();
				}

				const emotes = this.$refs.powerupEmote as HTMLImageElement[] || [];
				const vw = document.body.clientWidth;
				const vh = document.body.clientHeight;
				let py = vh + 300;
				emotes.forEach((imgTag, index)=>{
					const props = this.powerUpEmoteProps[index];
					const behind = props.behind;
					let px = Math.random() * (vw - 112*props.scale) + 112*props.scale*.5;
					imgTag.style.left = px + "px";
					imgTag.style.top = py + "px";
					py += (Math.random()* .25 + .75) * 250;
					if(behind) {
						imgTag.style.opacity = ".5";
						imgTag.style.zIndex = Math.round(-1000+props.scale*100).toString();
					}else{
						imgTag.style.opacity = "1";
						imgTag.style.zIndex = Math.round(props.scale*100).toString();
					}
				});

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

		//Move power up emotes based on current speed
		if(this.powerUpEmoteProps.length > 0 && !this.creditsComplete) {
			const emotes = this.$refs.powerupEmote as HTMLImageElement[] || null;
			let lowestY = 0;
			let highestY = 0;
			const speed = this.posY - this.prevPosY;
			emotes.forEach((img, index)=>{
				const py = parseFloat(img.style.top);
				lowestY = Math.max(py, lowestY);
				highestY = Math.min(py, highestY);
			});
			emotes.forEach((img, index)=>{
				const props = this.powerUpEmoteProps[index];
				if(!props) return;
				let py = (parseFloat(img.style.top) + speed * props.speedRatio);
				if(speed < 0 && py < -500) {
					py = Math.max(document.body.clientHeight + 300, lowestY + 300);
					lowestY = py;
				}
				if(speed > 0 && py > document.body.clientHeight + 500) {
					py = Math.min(-400, highestY - 300);
					highestY = py;
				}
				img.style.top = py + "px";
				img.style.transform = "rotate("+props.angle+"deg) scale("+props.scale+")";
				props.angle += props.angleSpeed;
			});
		}
		this.prevPosY = this.posY;

		if(this.paused) return;
		if(this.noEntry) return;
		if(this.interpolating) return;

		if(!this.prevTs) {
			this.prevTs = ts;
			return;
		}

		const fps = Math.max(1000/100, Math.min(1000/30, (ts - this.prevTs))); //At least 30fps to cancel random lags i've seen
		this.prevTs = ts;

		const holder = this.$el as HTMLElement;
		const bounds = holder.getBoundingClientRect();

		if(this.posY < -bounds.height) {
			if(!this.creditsComplete) {
				this.creditsComplete = true;
				PublicAPI.instance.broadcast(TwitchatEvent.ENDING_CREDITS_COMPLETE);
				if(this.data?.params?.loop !== true){
					const speed = ((this.data?.params?.speed || 2) + this.speedScale) / 1000 * fps;
					const emotes = this.$refs.powerupEmote as HTMLImageElement[] || null;
					gsap.to(emotes, {opacity:0, duration:.5, y:-speed*30, scale:0, ease:"none", clearProps:"y"});
				}
			}
			if(this.data?.params?.loop === true) {
				this.creditsComplete = false;
				this.scrollStarted_at = Date.now();
				this.posY = window.innerHeight;
				this.prevPosY = this.posY;
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
				this.prevPosY = this.posY;
			}
			//Rewrite the start scroll time depending on the scrolling percent
			//If credits are configured to scroll completely during a specific
			//duration, this allows to keep the credits at the same place after
			//stopping speed control by simulating a start date based on the
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
		let slots = this.data.params.slots;
		let totalEntries = 0;
		this.creditsComplete = false;

		slots.forEach(slotParams => {
			const slot = TwitchatDataTypes.EndingCreditsSlotDefinitions.find(v=>v.id == slotParams.slotType)!;
			//Slot disabled, ignore it
			if(slotParams.enabled === false) return;
			const entryCount = this.getEntryCountForSlot(slotParams);
			//Ignore empty slots if requested
			//Do not use "=== true" as the prop has been added later and might be missing
			if(entryCount === 0 && this.data!.params!.hideEmptySlots !== false) return;
			totalEntries += entryCount;
			//Pre compute styles and classes to avoid useless rerenders
			this.slotList.push({
				slot,
				entryCount,
				params:slotParams,
				holderClasses:this.getCategoryClasses(slotParams, entryCount),
				titleStyles:this.getTitleStyles(slotParams),
				entryStyles:this.getEntryStyles(slotParams),
				categoryStyles:this.getCategoryStyles(slotParams),
			})
		});

		this.powerUpEmoteProps = [];

		let powerups = this.data.powerups.concat();

		if(powerups.length > 0) {
			//20 items min
			while(powerups.length < 20) powerups.push(Utils.pickRand(powerups));
			//50 items max
			powerups = Utils.shuffle(powerups).splice(0, 50);

			for (let i = 0; i < powerups.length; i++) {
				if(!powerups[i].emoteUrl) continue;
				const behind = Math.random()>.2;
				const maxSpeed = behind? .5 : 1;
				this.powerUpEmoteProps.push({
					image:powerups[i].emoteUrl!,
					behind,
					angle:(Math.random()-Math.random()) * 360,
					speedRatio:Math.random()*maxSpeed+.75,
					angleSpeed:(Math.random()-Math.random())*.5,
					scale:(Math.random()*1 + 1) * (behind? Math.random()*.25 + .25 : Math.random()*.2+.8),
				})
			}
		}

		this.noEntry = totalEntries == 0 && this.data!.params!.hideEmptySlots !== false;
	}

	private getCategoryClasses(item:TwitchatDataTypes.EndingCreditsSlotParams, entryCount:number):string[] {
		const res = ["category", item.slotType];
		if(this.data?.params?.showIcons === false) res.push("noIcon");
		if(entryCount > 0) {
			//If requesting 3 cols but there are only 2 items, switch to 2 cols mode
			if(item.layout == "3cols" && entryCount == 2) res.push("layout_2cols");
			//If requestion 3 or 3 cols but only 1 item is available, switch to 1 col mode
			else if((item.layout == "3cols" && entryCount == 1) || (item.layout == "2cols" && entryCount == 1)) res.push("layout_col");
			else res.push("layout_"+item.layout);
		}
		if(item.slotType == "text" && !item.text) res.push("noText");
		if(item.slotType == "rewards" && item.showRewardUsers === true) res.push("largeSpace");
		if(!item.label) res.push("noLabel");
		if(this.data?.params?.stickyTitle === true) res.push("sticky");
		return res;
	}

	private getTitleStyles(item:TwitchatDataTypes.EndingCreditsSlotParams):CSSProperties {
		const res:CSSProperties = {
			color: this.data?.params?.colorTitle,
			fontFamily: `title-font, ${this.data?.params?.fontTitle || "Inter"}, Inter`,
			filter: `drop-shadow(2px 2px 0 rgba(0, 0, 0, ${(this.data?.params?.textShadow || 0) / 100}))`,
			marginBottom: `${this.data?.params?.paddingTitle}px`,
		}
		return res;
	}

	private getEntryStyles(item:TwitchatDataTypes.EndingCreditsSlotParams):CSSProperties {
		const res:CSSProperties = {
			color: this.data?.params?.colorEntry,
			fontFamily: `entry-font, ${this.data?.params?.fontEntry || "Inter"}, Inter`,
			filter: `drop-shadow(1px 1px 0 rgba(0, 0, 0, ${(this.data?.params?.textShadow || 0) / 100}))`,
			// marginBottom: ((this.data?.params?.padding||0)/100*7)+"em",
		}
		return res;
	}

	private getCategoryStyles(item:TwitchatDataTypes.EndingCreditsSlotParams):CSSProperties {
		const res:CSSProperties = {
			marginBottom: ((this.data?.params?.padding||0)/100*7)+"em",
		}
		return res;
	}
}

interface SlotItem {
	slot:TwitchatDataTypes.EndingCreditsSlotDefinition;
	params:TwitchatDataTypes.EndingCreditsSlotParams;
	holderClasses:string[];
	titleStyles:CSSProperties;
	entryStyles:CSSProperties;
	categoryStyles:CSSProperties;
	entryCount:number;
}

export default toNative(OverlayEndingCredits);
</script>

<style lang="less">
.ending_credits_powerupEmote {
	width: 112px;
	height: 112px;
	transform-origin: center;
	position: absolute;
	will-change: transform;
}
</style>
<style scoped lang="less">
.overlayendingcredits{
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 100%;
	color: #fff;
	will-change: transform;
	will-change: margin-top;
	//Necessary for proper gradients rendering!!
	position: absolute;

	.category {
		font-family: "Inter";
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 100%;
		padding: 0 20px;
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
					flex-direction: row;
					align-items: center;
					flex-wrap: nowrap;
					flex-shrink: 0;
					.icon {
						margin-right: .25em;
						height: 1em;
						width: 1em;
					}
				}
				.merch {
					margin-left: .5em;
					font-weight: bold;
					display: flex;
					flex-direction: row;
					align-items: center;
					flex-wrap: nowrap;
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

			&.empty {
				text-align: center;
				justify-content: center;
			}

			&.premium {
				text-align: center;
				justify-content: center;
				padding: .5em;
				border-radius: var(--border-radius);
				background-color: var(--color-premium);
				gap: .5em !important;
				display: flex !important;
				flex-direction: row !important;
				font-family: var(--font-inter) !important;
				color: var(--color-light) !important;
				font-size: 1rem;
				font-weight: normal;
				.icon {
					height:2em;
					width:2em;
					flex-shrink: 0;
				}
			}
		}

		&.ytSuperSticker,
		&.tiktokGifts {
			.item {
				gap: .5em;
				flex-direction: column;
				// align-items: center;
				.stickerList {
					display: flex;
					flex-direction: row;
					flex-wrap: wrap;
					// align-items: center;
					// justify-content: center;
				}
				.sticker {
					height: 5em;
				}
				.user {
					display: flex;
					flex-direction: row;
					align-items: center;
					.info {
						margin-right: .25em;
					}
				}
			}
		}

		&.ytSuperchat {
			.amount {
				margin-left: .5em;
			}
		}

		&.tiktokGifts {
			.amount>.value {
				gap: .15em;
				display: flex;
				flex-direction: row;
				align-items: center;
				img {
					height: 1em;
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
					flex-wrap: nowrap;
					width: fit-content;
					display: block;
					.count {
						display: inline;
					}
				}
			}
		}

		&.hypetrains {
			.list {
				row-gap: 4em;
				.item {
					gap: .5em;
					display: flex;
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

		&.powerups {
			.list {
				.item {
					gap: 1em;
					align-items: center;
					position: relative;
					&.emote {
						gap: .5em;
						flex-direction: column;
						// align-items: center;
						.emoteList {
							display: flex;
							flex-direction: row;
							flex-wrap: wrap;
							// align-items: center;
							// justify-content: center;
						}
						.emote {
							height: 3em;
						}
						.user {
							display: flex;
							flex-direction: row;
							align-items: center;
							.info {
								margin-right: .25em;
							}
						}
					}

					&.simmer {
						gap: .25em;
						border-radius: .5em;
						padding: 1em;
						z-index: 0;
						.gradientBg {
							z-index: -2;
							position: absolute;
							overflow: hidden;
							height: calc(100% - .25em);
							width: calc(100% - .25em);
							border-radius: .5em;
							left: .12em;
							top: .12em;
							--rect-size: 1.25em;
							background-image: linear-gradient(90deg, #3866dd, #ff4c5b);
							clip-path: polygon( evenodd,
								-10% -10%,
								110% -10%,
								120% 120%,
								0% 120%,
								-10% -10%,
								calc(var(--rect-size) / 2) calc(var(--rect-size) / 2),
								calc(100% - var(--rect-size) / 2) calc(var(--rect-size) / 2),
								calc(100% - var(--rect-size) / 2) calc(100% - var(--rect-size) / 2),
								calc(var(--rect-size) / 2) calc(100% - var(--rect-size) / 2),
								calc(var(--rect-size) / 2) calc(var(--rect-size) / 2),
							);
						}
					}


					&.rainbow-eclipse {
						gap: .25em;
						padding: 1em;
						overflow: hidden;
						z-index: 0;
						.gradientBg {
							z-index: -2;
							filter: blur(3px);
							position: absolute;
							overflow: hidden;
							height: calc(100% - .25em);
							width: calc(100% - .25em);
							border-radius: .5em;
							left: .12em;
							top: .12em;
							--rect-size: 1.25em;
							clip-path: polygon( evenodd,
								-10% -10%,
								110% -10%,
								120% 120%,
								0% 120%,
								-10% -10%,
								calc(var(--rect-size) / 2) calc(var(--rect-size) / 2),
								calc(100% - var(--rect-size) / 2) calc(var(--rect-size) / 2),
								calc(100% - var(--rect-size) / 2) calc(100% - var(--rect-size) / 2),
								calc(var(--rect-size) / 2) calc(100% - var(--rect-size) / 2),
								calc(var(--rect-size) / 2) calc(var(--rect-size) / 2),
							);
							&::before {
								animation: rotate 4s linear infinite;
								background-image: conic-gradient(#b23ff8, #3cc890, #38a7ca, #b23ff8);
								background-position: 0 0;
								background-repeat: no-repeat;
								content: "";
								height: 99999px;
								left: 50%;
								position: absolute;
								top: 50%;
								transform: translate(-50%, -50%) rotate(0deg);
								width: 99999px;
								z-index: 0;
							}
						}

						@keyframes rotate {
							100% {
								transform: translate(-50%, -50%) rotate(1turn);
							}
						}
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
							.icon, .dot {
								display: inline-block;
								width: 1em;
								margin: 0 .5em;
								vertical-align: middle;
							}
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
				h1 {
					text-align: right;
				}
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
				h1 {
					text-align: right;
				}
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
			h1 {
				align-self: flex-start;
				text-align: left;
			}
			.list {
				column-gap: 2em;
				flex-direction: row;
				flex-wrap: wrap;
				align-items: center;
				justify-content: flex-start;
				align-self: flex-start;
				.item {
					justify-content: flex-start;
					.userlist, .stickerList {
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
				.item {
					align-items: center;
					text-align: center;
				}
			}
		}

		&.layout_right {
			h1 {
				align-self: flex-end;
				text-align: right;
			}
			.list {
				column-gap: 2em;
				flex-direction: row;
				flex-wrap: wrap;
				align-items: flex-end;
				justify-content: flex-end;
				align-self: flex-end;
				.item {
					justify-content: flex-end;
					align-items: flex-end;
					.userlist, .stickerList {
						align-items: flex-end;
					}
				}
			}
		}

		&.layout_colRight {
			h1 {
				align-self: flex-end;
				text-align: right;
			}
			.list {
				align-items: flex-end;
				align-self: flex-end;
				.item {
					align-items: flex-end;
					justify-content: flex-end;
					.userlist, .stickerList {
						align-items: flex-end;
					}
				}
			}
		}

		&.layout_col {
			.list {
				.item {
					align-items: center;
				}
			}
		}

		&.layout_colLeft {
			h1 {
				align-self: flex-start;
				text-align: left;
			}
			.list {
				align-items: flex-start;
				align-self: flex-start;
				.item {
					justify-content: flex-start;
					.userlist, .stickerList {
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
						.userlist, .stickerList, &.emote  {
							align-items: flex-start;
						}
					}
					&:nth-child(2n+1) {
						align-self: flex-start;
						justify-self: end;
						justify-content: flex-end;
						.userlist, .stickerList, &.emote  {
							align-items: flex-end;
						}
					}
					.info {
						overflow: hidden;
						text-overflow: ellipsis;
						line-height: 1.2em;
						max-width: 40vw;
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
						text-align: right;
						.userlist, .stickerList, &.emote {
							align-items: flex-end;
							align-self: flex-end;
						}
					}
					&:nth-child(3n+2) {
						justify-self: center;
						align-self: flex-start;
						text-align: center;
						.userlist, .stickerList, &.emote {
							align-items: center;
							align-self: center;
						}
					}
					&:nth-child(3n) {
						justify-self: start;
						justify-content: flex-start;
						align-self: flex-start;
						text-align: left;
						.userlist, .stickerList, &.emote {
							align-items: flex-start;
							align-self: flex-start;
						}
					}
					.info {
						overflow: hidden;
						text-overflow: ellipsis;
						line-height: 1.2em;
						max-width: 25vw;
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
