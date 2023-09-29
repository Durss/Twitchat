<template>
	<div class="overlayendingcredits" v-if="data && data.params">
		<div v-for="item in data.params.slots.filter(v=>v.enabled)" :class="getCategoryClasses(item)">
			<h1>{{ item.label }}</h1>
			<div class="list">
				<div v-if="item.id == 'hypechats'" v-for="entry in (data.hypeChats || []).concat().splice(0, item.maxEntries)" class="item hypechat">
					<span class="login">{{entry.login}}</span>
					<div class="amount">
						<span class="currency">{{{EUR:"€",USD:"$", GBP:"£"}[entry.currency] || entry.currency}}</span>
						<span class="value">{{entry.amount}}</span>
					</div>
				</div>
				
				<div v-if="item.id == 'subs'" v-for="entry in (data.subs || [])" class="item sub">
					<span class="login">{{entry.login}}</span>
				</div>
				
				<div v-if="item.id == 'subgifts'" v-for="entry in (data.subgifts || []).sort((a,b)=>b.total-a.total)" class="item sub">
					<span class="login">{{entry.login}}</span>
					<span class="count"><Icon name="gift" theme="light" class="giftIcon" />{{ entry.total }}</span>
				</div>
				
				<div v-if="item.id == 'cheers'" v-for="entry in (data.bits || [])" class="item bits">
					<span class="login">{{entry.login}}</span>
					<span class="count"><Icon name="bits" theme="light" class="bitsIcon" />{{ entry.bits }}</span>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import TwitchatEvent from '@/events/TwitchatEvent';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import { Component } from 'vue-facing-decorator';
import AbstractOverlay from './AbstractOverlay.vue';

@Component({
	components:{},
	emits:[],
})
export default class OverlayEndingCredits extends AbstractOverlay {

	public data:TwitchatDataTypes.StreamSummaryData|null = null;

	private summaryDataHandler!:(e:TwitchatEvent) => void;

	public getCategoryClasses(item:TwitchatDataTypes.EndingCreditsSlot):string[] {
		const res = ["category"];
		res.push("layout_"+item.layout);
		return res;
	}

	public requestInfo():void {
		PublicAPI.instance.broadcast(TwitchatEvent.GET_SUMMARY_DATA, {includeParams:true, dateOffset:Date.parse("07/01/2023 18:27:02 GMT+0200")});
	}

	public beforeMount(): void {
		this.summaryDataHandler = (e:TwitchatEvent) => this.onSummaryData(e);
		PublicAPI.instance.addEventListener(TwitchatEvent.SUMMARY_DATA, this.summaryDataHandler);
	}

	public beforeUnmount(): void {
		PublicAPI.instance.removeEventListener(TwitchatEvent.SUMMARY_DATA, this.summaryDataHandler);
	}

	// public getEntriesFor<U extends keyof SlotTypeToEntryType>(id:TwitchatDataTypes.EndingCreditsSlotStringTypes):SlotEntries<SlotTypeToEntryType, U>[] {
	// 	switch(id) {
	// 		case "hypechats": return this.data?.hypeChats || [];
	// 		case "subs": return this.data?.subs || [];
	// 		case "subgifts": return this.data?.subgifts || [];
	// 		case "subsandgifts": return ([] as unknown[]).concat(this.data?.subgifts || [], this.data?.subs || []);
	// 		case "cheers": return this.data?.bits || [];
	// 		case "raids": return this.data?.raids || [];
	// 		case "follows": return this.data?.follows || [];
	// 		case "hypetrains": return this.data?.hypeTrains || [];
	// 		case "so_in": return (this.data?.shoutouts || []).filter(v=>v.received === true);
	// 		case "so_out": return (this.data?.shoutouts || []).filter(v=>v.received === false);
	// 		case "rewards": return this.data?.rewards || [];
	// 		// case "bans": return this.data?.bans || [];
	// 		// case "timeouts": return this.data?.timeouts || [];
	// 		// case "vips": return this.data?.vips || [];
	// 		// case "mods": return this.data?.mods || [];
	// 	}
	// 	return [];
	// }

	/**
	 * Called when API sends summary data counter data
	 */
	private async onSummaryData(e:TwitchatEvent):Promise<void> {
		console.log(e);
		if(e.data) {
			this.data = (e.data as unknown) as TwitchatDataTypes.StreamSummaryData;
		}
	}
}

</script>

<style scoped lang="less">
.overlayendingcredits{
	display: flex;
	flex-direction: column;
	align-items: center;
	background-color: red;

	.category {
		font-family: "Inter";
		margin-bottom: 7em;
		color: #fff;
		text-shadow: 3px 3px 0 rgba(0, 0, 0, .7);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		h1 {
			margin-bottom: 1em;
				font-size: 2.5em;
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
					filter: drop-shadow(3px 3px 0 rgba(0, 0, 0, .7));
				}
				&.hypechat {
					.login {
						margin-right: .5em;
					}
					.amount {
						font-weight: bold;
					}
				}
				&.sub {
					.count {
						margin-left: .5em;
						font-weight: bold;
						.giftIcon {
							margin-right: .25em;
						}
					}
				}
				&.bits {
					.count {
						margin-left: .5em;
						font-weight: bold;
						.giftIcon {
							margin-right: .25em;
						}
					}
				}
			}
		}

		&.layout_row {
			.list {
				column-gap: 4em;
				flex-direction: row;
				flex-wrap: wrap;
				align-items: center;
				justify-content: center;
			}
		}

		&.layout_2cols {
			.list {
				display: grid;
				column-gap: 4em;
				grid-template-columns: repeat(auto-fill, minmax(40%, 1fr));
				.item {
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
	}
}
</style>