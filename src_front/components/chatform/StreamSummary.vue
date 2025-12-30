<template>
	<div class="streamsummary sidePanel">
		<div class="head">
			<ClearButton @click="close" />
			<h1 class="title"><Icon name="broadcast" />{{ $t("summary.title") }}</h1>
			<div class="description" v-if="streamDuration">{{ $t("summary.stream_duration") }} {{ streamDuration }}</div>
		</div>

		<div class="content" ref="content">
			<Icon class="spinner" name="loader" v-if="loading" />

			<template v-else>
				<div class="noData" v-if="noData">{{ $t("summary.no_data") }}</div>
				<template v-else>
					<div class="card-item global">
						<div class="list">
							<div class="data card-item" v-tooltip="$t('summary.data_subPrime')" v-if="subPrimeCount > 0"><Icon name="prime" />{{ subPrimeCount }}</div>
							<div class="data card-item" v-tooltip="$t('summary.data_subT1')" v-if="subT1Count > 0"><Icon name="sub" /><small>T1</small>{{ subT1Count }}</div>
							<div class="data card-item" v-tooltip="$t('summary.data_subT2')" v-if="subT2Count > 0"><Icon name="sub" /><small>T2</small>{{ subT2Count }}</div>
							<div class="data card-item" v-tooltip="$t('summary.data_subT3')" v-if="subT3Count > 0"><Icon name="sub" /><small>T3</small>{{ subT3Count }}</div>
							<div class="data card-item" v-tooltip="$t('summary.data_subgift')" v-if="subgiftCount > 0"><Icon name="gift" />{{ subgiftCount }}</div>
							<div class="data card-item" v-tooltip="$t('summary.data_bits')" v-if="bitsCount > 0"><Icon name="bits" />{{ bitsCount }}</div>
							<div class="data card-item" v-tooltip="$t('summary.data_hypeChat')" v-if="hypeChatCount > 0"><Icon name="hypeChat" />{{ hypeChatCount }} <small class="data" v-for="amount, key in hypeChats">{{amount}} {{ key }}</small></div>
							<div class="data card-item" v-tooltip="$t('summary.data_hypeTrain')" v-if="hypeTrainCount > 0"><Icon name="train" />{{ hypeTrainCount }}</div>
							<div class="data card-item" v-if="raidCount > 0"><span v-tooltip="$t('summary.data_raid')"><Icon name="raid" />{{ raidCount }}</span><small class="data" v-tooltip="$t('summary.data_raider')"><Icon name="user" />{{ raidViewerCount }}</small></div>
							<div class="data card-item" v-tooltip="$t('summary.data_follow')" v-if="followCount > 0"><Icon name="follow" />{{ followCount }}</div>
							<div class="data card-item" v-tooltip="$t('summary.data_messages')" v-if="messCount > 0"><Icon name="whispers" />{{ messCount }}</div>
							<div class="data card-item" v-tooltip="$t('summary.data_emotes')" v-if="emoteCount > 0"><Icon name="emote" />{{ emoteCount }}</div>
							<div class="data card-item" v-tooltip="$t('summary.data_chars')" v-if="charCount > 0"><Icon name="font" />{{ charCount }}</div>
							<div class="data card-item" v-tooltip="$t('summary.data_chatters')" v-if="chatterCount > 0"><Icon name="user" />{{ chatterCount }}</div>
							<div class="data card-item" v-tooltip="$t('summary.data_outShoutout')" v-if="outShoutout > 0"><Icon name="shoutout" />{{ outShoutout }}</div>
							<div class="data card-item" v-tooltip="$t('summary.data_inShoutout')" v-if="inShoutout > 0"><Icon name="shoutout" class="flip" />{{ inShoutout }}</div>
							<div class="data card-item" v-tooltip="$t('summary.data_rewards')" v-if="rewardCount > 0"><Icon name="channelPoints" />{{ rewardCount }}</div>
							<div class="data card-item" v-tooltip="$t('summary.data_channelPointCount')" v-if="channelPointCount > 0"><Icon name="channelPoints" />{{ channelPointCount }}pts</div>
							<div class="data card-item" v-tooltip="$t('summary.data_bans')" v-if="banUserCount > 0"><Icon name="ban" />{{ banUserCount }}</div>
							<div class="data card-item" v-tooltip="$t('summary.data_tos')" v-if="toUserCount > 0"><Icon name="timer" />{{ toUserCount }}</div>
							<div class="data card-item" v-tooltip="$t('summary.data_tosDuration')" v-if="toDuration > 0"><Icon name="timer" />{{ toDuration }}s</div>
							<div class="data card-item" v-tooltip="$t('summary.data_poll')" v-if="pollCount > 0"><Icon name="poll" />{{ pollCount }}</div>
							<div class="data card-item" v-tooltip="$t('summary.data_prediction')" v-if="predictionCount > 0"><Icon name="prediction" />{{ predictionCount }}</div>
							<div class="data card-item" v-tooltip="$t('summary.data_bingo')" v-if="bingoCount > 0"><Icon name="bingo" />{{ bingoCount }}</div>
							<div class="data card-item" v-tooltip="$t('summary.data_raffle')" v-if="raffleCount > 0"><Icon name="ticket" />{{ raffleCount }}</div>
						</div>
						<div class="ctas">
							<TTButton icon="newtab" @click="exportCSV(true)">{{ $t("summary.csv_exportBt") }}</TTButton>
						</div>
					</div>


					<div class="card-item users">
						<div class="list">
							<div class="user card-item" v-for="u in userList" :key="u.user.id">
							<img class="avatar" loading="lazy" v-if="u.user.avatarPath" :src="u.user.avatarPath" alt="avatar">
							<a @click.prevent="openUserCard(u.user)" :href="'https://twitch.tv/'+u.user.login" class="login">{{ u.user.displayName }}</a>
							<div class="data card-item" v-tooltip="$t('summary.data_subPrime')" v-if="u.subPrime > 0"><Icon name="prime" />{{ u.subPrime }}</div>
							<div class="data card-item" v-tooltip="$t('summary.data_subT1')" v-if="u.subT1 > 0"><Icon name="sub" /><small>T1</small>{{ u.subT1 }}</div>
							<div class="data card-item" v-tooltip="$t('summary.data_subT2')" v-if="u.subT2 > 0"><Icon name="sub" /><small>T2</small>{{ u.subT2 }}</div>
							<div class="data card-item" v-tooltip="$t('summary.data_subT3')" v-if="u.subT3 > 0"><Icon name="sub" /><small>T3</small>{{ u.subT3 }}</div>
							<div class="data card-item" v-tooltip="$t('summary.data_subgift')" v-if="u.subgift > 0"><Icon name="gift" />{{ u.subgift }}</div>
							<div class="data card-item" v-tooltip="$t('summary.data_bits')" v-if="u.bits > 0"><Icon name="bits" />{{ u.bits }}</div>
							<div class="data card-item" v-tooltip="$t('summary.data_hypeChat')" v-if="u.hypeChatCount > 0"><Icon name="hypeChat" />{{ u.hypeChatCount }} <small class="data" v-for="amount, key in u.hypeChats">{{amount}} {{ key }}</small></div>
							<div class="data card-item" v-if="u.raidCount > 0"><span v-tooltip="$t('summary.data_raid')"><Icon name="raid" />{{ u.raidCount }}</span><small class="data" v-tooltip="$t('summary.data_raider')"><Icon name="user" />{{ u.raidViewerCount }}</small></div>
							<div class="data card-item" v-tooltip="$t('summary.data_messages')" v-if="u.messCount > 0"><Icon name="whispers" />{{ u.messCount }}</div>
							<div class="data card-item" v-tooltip="$t('summary.data_emotes')" v-if="u.emoteCount > 0"><Icon name="emote" />{{ u.emoteCount }}</div>
							<div class="data card-item" v-tooltip="$t('summary.data_chars')" v-if="u.charCount > 0"><Icon name="font" />{{ u.charCount }}</div>
							<div class="data card-item" v-tooltip="$t('summary.data_rewards')" v-if="u.rewards > 0"><Icon name="channelPoints" />{{ u.rewards }}</div>
							<div class="data card-item" v-tooltip="$t('summary.data_rewards')" v-if="u.channelPointCount > 0"><Icon name="channelPoints" />{{ u.channelPointCount }}pts</div>
							<div class="data card-item" v-tooltip="$t('summary.data_bans')" v-if="u.banUserCount > 0"><Icon name="ban" />{{ u.banUserCount }}</div>
							<div class="data card-item" v-tooltip="$t('summary.data_tos')" v-if="u.toUserCount > 0"><Icon name="timer" />{{ u.toUserCount }}</div>
							<div class="data card-item" v-tooltip="$t('summary.data_tosDuration')" v-if="u.toDuration > 0"><Icon name="timer" />{{ u.toDuration }}s</div>
							</div>
						</div>
						<div class="ctas">
							<TTButton icon="newtab" @click="exportCSV()">{{ $t("summary.csv_exportBt") }}</TTButton>
						</div>
					</div>
				</template>
			</template>
		</div>
	</div>
</template>

<script lang="ts">
import {toNative,  Component } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel';
import ClearButton from '../ClearButton.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import TTButton from '../TTButton.vue';
import Icon from '../Icon.vue';
import Config from '@/utils/Config';

@Component({
	components:{
		Icon,
		TTButton,
		ClearButton,
	},
	emits:["close"],
})
class StreamSummary extends AbstractSidePanel {

	public loading:boolean = true;
	public noData:boolean = false;
	public streamDuration:string = "";
	public messCount = 0;
	public charCount = 0;
	public emoteCount = 0;
	public chatterCount = 0;
	public subT1Count = 0;
	public subT2Count = 0;
	public subT3Count = 0;
	public subPrimeCount = 0;
	public subgiftCount = 0;
	public bitsCount = 0;
	public followCount = 0;
	public rewardCount = 0;
	public channelPointCount = 0;
	public raidCount = 0;
	public raidViewerCount = 0;
	public hypeTrainCount = 0;
	public pollCount = 0;
	public predictionCount = 0;
	public bingoCount = 0;
	public raffleCount = 0;
	public outShoutout = 0;
	public inShoutout = 0;
	public hypeChatCount = 0;
	public banUserCount = 0;
	public toUserCount = 0;
	public toDuration = 0;
	public hypeChats:{[key:string]:number} = {};
	public userList:UserActivities[] = [];

	private durationInterval:number = -1;

	public async beforeMount():Promise<void> {

		const res = await TwitchUtils.getCurrentStreamInfo([this.$store.auth.twitch.user.id]);
		let prevDate:number = 0;
		let dateOffset:number|null = null;
		if(res.length > 0) {
			dateOffset = new Date(res[0]!.started_at).getTime();
			
			this.durationInterval = window.setInterval(()=> {
				this.streamDuration = Utils.formatDuration(Date.now() - dateOffset!);
			})
		// }else{
		// 	dateOffset = new Date("08/01/2023").getTime();//TODO comment
		}

		const userActivities:{[key:string]:UserActivities} = {};
		const messages = this.$store.chat.messages;
		const userParsed:{[key:string]:boolean} = {};
		this.noData = true;
		
		for (let i = messages.length-1; i >= 0; i--) {
			const m = messages[i]!;
			if(dateOffset && m.date < dateOffset) break;
			//If more than 4h past between the 2 messages, consider it's a different stream and stop there
			if(!dateOffset && prevDate > 0 && prevDate - m.date > 4 * 60 * 60000) {
				this.streamDuration = Utils.formatDuration(messages[messages.length - 1]!.date - m.date);
				break;
			}
			prevDate = m.date;
			
			switch(m.type) {
				case TwitchatDataTypes.TwitchatMessageType.MESSAGE: {
					const uid = m.user.id;
					const emoteCount = m.message_chunks.filter(v=>v.type == "emote").length;
					if(!userActivities[uid]) userActivities[uid] = this.getEmptyUserActivities(m.user);
					this.messCount ++;
					this.charCount += m.message.length;
					this.emoteCount += emoteCount;
					userActivities[uid].sortValue ++;
					userActivities[uid].messCount ++;
					userActivities[uid].charCount += m.message.length;
					userActivities[uid].emoteCount += emoteCount;
					if(!userParsed[uid]) {
						this.chatterCount ++;
						userParsed[uid] = true;
					}
					this.noData = false;
					break;
				}
				case TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION: {
					const uid = m.user.id;
					if(!userActivities[uid]) userActivities[uid] = this.getEmptyUserActivities(m.user);
					let count = 1;
					if(m.is_gift) {
						count = m.gift_count || 1;
						this.subgiftCount += count;
						userActivities[uid].subgift += count;
						userActivities[uid].sortValue += (count || 1) * 250 * {1:1, 2:2, 3:3, "prime":1}[m.tier || 1];
					}
					if(m.tier == "prime") {
						this.subPrimeCount += count;
						userActivities[uid].subPrime += count;
						userActivities[uid].sortValue += 250 * count;
					}
					if(m.tier == 1) {
						this.subT1Count += count;
						userActivities[uid].subT1 += count;
						userActivities[uid].sortValue += 250 * count;
					}
					if(m.tier == 2) {
						this.subT2Count += count;
						userActivities[uid].subT2 += count;
						userActivities[uid].sortValue += 2 * 250 * count;
					}
					if(m.tier == 3) {
						this.subT3Count += count;
						userActivities[uid].subT3 += count;
						userActivities[uid].sortValue += 3 * 250 * count;
					}
					this.noData = false;
					break;
				}
				case TwitchatDataTypes.TwitchatMessageType.CHEER: {
					const uid = m.user.id;
					if(!userActivities[uid]) userActivities[uid] = this.getEmptyUserActivities(m.user);
					this.bitsCount += m.bits;
					userActivities[uid].bits += m.bits;
					userActivities[uid].sortValue += m.bits;
					this.noData = false;
					break;
				}
				case TwitchatDataTypes.TwitchatMessageType.HYPE_CHAT: {
					const uid = m.message.user.id;
					if(!userActivities[uid]) userActivities[uid] = this.getEmptyUserActivities(m.message.user);
					const hc = m.message.twitch_hypeChat!;
					if(!this.hypeChats[hc.currency]) this.hypeChats[hc.currency] = 0;
					this.hypeChats[hc.currency]! += hc.amount;
					this.hypeChatCount ++;
					userActivities[uid].hypeChatCount ++;
					if(!userActivities[uid].hypeChats[hc.currency]) userActivities[uid].hypeChats[hc.currency] = 0;
					userActivities[uid].hypeChats[hc.currency]! += hc.amount;
					userActivities[uid].sortValue += Math.ceil(hc.amount/4) * 250;
					this.noData = false;
					break;
				}
				case TwitchatDataTypes.TwitchatMessageType.RAID: {
					const uid = m.user.id;
					if(!userActivities[uid]) userActivities[uid] = this.getEmptyUserActivities(m.user);
					this.raidCount ++;
					this.raidViewerCount += m.viewers;
					userActivities[uid].raidCount ++;
					userActivities[uid].raidViewerCount += m.viewers;
					userActivities[uid].sortValue += m.viewers;
					this.noData = false;
					break;
				}
				case TwitchatDataTypes.TwitchatMessageType.FOLLOWING: {
					this.followCount ++;
					this.noData = false;
					break;
				}
				case TwitchatDataTypes.TwitchatMessageType.REWARD: {
					const uid = m.user.id;
					if(!userActivities[uid]) userActivities[uid] = this.getEmptyUserActivities(m.user);
					this.rewardCount ++;
					this.channelPointCount += m.reward.cost;
					userActivities[uid].rewards ++;
					userActivities[uid].channelPointCount += m.reward.cost;
					userActivities[uid].sortValue += Math.round(m.reward.cost / 10);
					if(m.message) {
						const emoteCount = m.message_chunks!.filter(v=>v.type == "emote").length;
						this.messCount ++;
						this.charCount += m.message.length;
						this.emoteCount += emoteCount;
						userActivities[uid].messCount ++;
						userActivities[uid].charCount += m.message.length;
						userActivities[uid].emoteCount += emoteCount;
					}
					this.noData = false;
					break;
				}
				case TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_SUMMARY: {
					this.hypeTrainCount ++;
					this.noData = false;
					break;
				}
				case TwitchatDataTypes.TwitchatMessageType.POLL: {
					this.pollCount ++;
					this.noData = false;
					break;
				}
				case TwitchatDataTypes.TwitchatMessageType.PREDICTION: {
					this.predictionCount ++;
					this.noData = false;
					break;
				}
				case TwitchatDataTypes.TwitchatMessageType.BINGO: {
					this.bingoCount ++;
					this.noData = false;
					break;
				}
				case TwitchatDataTypes.TwitchatMessageType.RAFFLE: {
					this.raffleCount ++;
					this.noData = false;
					break;
				}
				case TwitchatDataTypes.TwitchatMessageType.BAN: {
					const uid = m.user.id;
					if(!userActivities[uid]) userActivities[uid] = this.getEmptyUserActivities(m.user);
					if(m.duration_s && m.duration_s > 0) {
						this.toUserCount ++;
						this.toDuration += m.duration_s;
						userActivities[uid].toUserCount ++;
						userActivities[uid].toDuration += m.duration_s;
					}else{
						this.banUserCount ++;
						userActivities[uid].banUserCount ++;
					}
					this.noData = false;
					break;
				}
				case TwitchatDataTypes.TwitchatMessageType.SHOUTOUT: {
					if(m.received) {
						this.inShoutout ++;
					}else{
						this.outShoutout ++;
					}
					this.noData = false;
					break;
				}
			}
		}

		let list:UserActivities[] = [];
		for (const uid in userActivities) {
			list.push(userActivities[uid]!);
		}
		list = list.sort((a,b)=>{
			return b.sortValue - a.sortValue;
		}).slice(0, 1000);

		//Render only first 20 users initially
		this.userList = list.splice(0, 20);

		//Add users sequentially to avoid huge lag if rendering 1000 users at once
		window.setTimeout(()=> {
			const renderInterval = window.setInterval(()=> {
				if(list.length > 0) {
					this.userList.push(...list.splice(0, 10)!);
				}else{
					clearInterval(renderInterval);
				}
				
			}, 50);
		}, 1000);

		this.loading = false;
	}

	public beforeUnmount():void {
		clearInterval(this.durationInterval);
	}

	/**
	 * Open a users' card
	 */
	public openUserCard(user:TwitchatDataTypes.TwitchatUser):void {
		this.$store.users.openUserCard(user, this.$store.auth.twitch.user.id);
	}

	public exportCSV(globalData:boolean = false):void {
		let csv = "";
		
		if(globalData) {
			console.log("ON_OK");
			csv = "messCount, charCount, emoteCount, chatterCount, subT1Count, subT2Count, subT3Count, subPrimeCount, subgiftCount, bitsCount, followCount, rewardCount, channelPointCount, raidCount, raidViewerCount, hypeTrainCount, pollCount, predictionCount, bingoCount, raffleCount, outShoutout, inShoutout, hypeChatCount, hypeChats, banUserCount, toUserCount, toDuration\n";
			csv += this.messCount+", ";
			csv += this.charCount+", ";
			csv += this.emoteCount+", ";
			csv += this.chatterCount+", ";
			csv += this.subT1Count+", ";
			csv += this.subT2Count+", ";
			csv += this.subT3Count+", ";
			csv += this.subPrimeCount+", ";
			csv += this.subgiftCount+", ";
			csv += this.bitsCount+", ";
			csv += this.followCount+", ";
			csv += this.rewardCount+", ";
			csv += this.channelPointCount+", ";
			csv += this.raidCount+", ";
			csv += this.raidViewerCount+", ";
			csv += this.hypeTrainCount+", ";
			csv += this.pollCount+", ";
			csv += this.predictionCount+", ";
			csv += this.bingoCount+", ";
			csv += this.raffleCount+", ";
			csv += this.outShoutout+", ";
			csv += this.inShoutout+", ";
			csv += this.hypeChatCount+", ";
			for (const currency in this.hypeChats) csv += `${this.hypeChats[currency]}(${currency}) `;
			csv += ",";
			csv += this.banUserCount+", ";
			csv += this.toUserCount+", ";
			csv += this.toDuration;
		}else{
			csv = "userID, userLogin, messCount, charCount, emoteCount, subPrime, subT1, subT2, subT3, subgift, bits, rewards, channelPointCount, raidCount, raidViewerCount, hypeChatCount, hypeChats, banUserCount, toUserCount, toDuration\n";
			for (const user of this.userList) {
				csv += user.user.id+", ";
				csv += user.user.login+", ";
				csv += user.messCount+", ";
				csv += user.charCount+", ";
				csv += user.emoteCount+", ";
				csv += user.subPrime+", ";
				csv += user.subT1+", ";
				csv += user.subT2+", ";
				csv += user.subT3+", ";
				csv += user.subgift+", ";
				csv += user.bits+", ";
				csv += user.rewards+", ";
				csv += user.channelPointCount+", ";
				csv += user.raidCount+", ";
				csv += user.raidViewerCount+", ";
				csv += user.hypeChatCount+", ";
				for (const currency in user.hypeChats) csv += `${user.hypeChats[currency]}(${currency}) `;
				csv += ",";
				csv += user.banUserCount+", ";
				csv += user.toUserCount+", ";
				csv += user.toDuration+"\n";
			}
		}

		const blob = new Blob([csv], { type: 'application/json' });
		const url = window.URL.createObjectURL(blob);
		//Start download session
		if(Config.instance.OBS_DOCK_CONTEXT) {
			window.open(url, "_blank");
		}else{
			var link = document.createElement("a");
			let filename = "export";
			filename += globalData? "_global" : "_user";
			filename += "_"+new Date().getDate()+"-"+(new Date().getMonth()+1)+"-"+new Date().getFullYear();
			link.download = filename+".csv";
			link.href = url;
			link.click();
		}
		URL.revokeObjectURL(url);
	}

	private getEmptyUserActivities(user:TwitchatDataTypes.TwitchatUser):UserActivities {
		return {
			user,
			sortValue:0,
			messCount:0,
			emoteCount:0,
			charCount:0,
			subPrime:0,
			subT1:0,
			subT2:0,
			subT3:0,
			subgift:0,
			bits:0,
			rewards:0,
			channelPointCount:0,
			raidCount:0,
			raidViewerCount:0,
			hypeChatCount:0,
			hypeChats:{},
			banUserCount:0,
			toUserCount:0,
			toDuration:0,
		};
	}

}

interface UserActivities{
	user:TwitchatDataTypes.TwitchatUser;
	sortValue:number;
	messCount:number;
	charCount:number;
	emoteCount:number;
	subPrime:number;
	subT1:number;
	subT2:number;
	subT3:number;
	subgift:number;
	bits:number;
	rewards:number;
	channelPointCount:number;
	raidCount:number;
	raidViewerCount:number;
	hypeChatCount:number;
	hypeChats:{[key:string]:number};
	banUserCount:number;
	toUserCount:number;
	toDuration:number;
}
export default toNative(StreamSummary);
</script>

<style scoped lang="less">
.streamsummary{
	.spinner {
		height: 2em;
	}

	.content {
		overflow-y: auto;
	}

	.global {
		overflow: visible;
		gap: .5em;
		display: flex;
		flex-direction: column;
		.list {
			gap: .5em;
			display: flex;
			flex-direction: row;
			justify-content: center;
			flex-wrap: wrap;
		}
	}

	.users {
		overflow: hidden;
		gap: .5em;
		display: flex;
		flex-direction: column;
		min-height: 100px;
		.list {
			flex-grow: 1;
			gap: .5em;
			display: flex;
			flex-direction: column;
			overflow: auto;
			.user {
				flex-shrink: 0;
				gap: .5em;
				display: flex;
				flex-direction: row;
				flex-wrap: wrap;
				align-items: center;
				.login {
					font-weight: bold;
				}
	
				.avatar {
					height: 2em;
					border-radius: 50%;
				}
			}
		}
	}

	.ctas {
		gap: 1em;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: center;
	}

	.data {
		display: flex;
		flex-direction: row;
		align-items: center;
		// font-weight: bold;
		cursor: default;
		.icon {
			height: 1em;
			max-width: 1em;
			margin-right: .5em;

			&.flip {
				transform: scale(-1, 1);
			}
		}

		small {
			font-size: .7em;
			// font-weight: normal;
			&.data {
				margin-left: 1em;
			}
			&:not(.data) {
				margin-right: .5em;
				margin-left: -.5em;
			}
		}
	}

	.noData {
		text-align: center;
		flex-grow: 1;
		display: flex;
		align-items: center;
		white-space: pre-line;
		align-self: center;
	}
}
</style>