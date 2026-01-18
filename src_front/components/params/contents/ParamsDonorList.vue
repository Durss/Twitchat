<template>
	<div class="paramsdonorlist">
		<DonorPublicState class="publicDonation" noInfos @change="loadList()" />

		<div v-if="error">{{ $t("error.donor_loading") }}</div>
		<Icon v-if="loading" name="loader" alt="loading" class="loader" />

		<div class="stats" v-if="!loading">
			<div v-for="b in badges" :key="'badge_'+b.level" class="item">
				<DonorBadge class="badge" :level="b.level" light />
				<div>x{{b.count}}</div>
			</div>
		</div>

		<div class="me" v-if="$store.auth.donorLevel > -1 && !loading && mePos > -1">
			<DonorBadge class="badge" :level="$store.auth.donorLevel" light />
			<div class="pos">#{{mePos+1}}</div>
			<div class="label">{{userName}}</div>
		</div>

		<InfiniteList class="list" ref="list"
		v-if="!error && !loading && itemList.length > 0"
		:dataset="itemList"
		:itemSize="itemSize"
		:itemMargin="0"
		v-model:scrollOffset="scrollOffset"
		lockScroll
		v-slot="{ item }">
			<div class="item">
				<DonorBadge class="badge" :level="item.v" light />
				<div class="pos">#{{item.index+1}}</div>
				<span v-if="item.uid == '-1'" class="label">{{ item.login }}</span>
				<a class="label" v-else :href="'https://twitch.tv/'+item.login" target="_blank">{{item.login}}</a>
			</div>
		</InfiniteList>
	</div>
</template>

<script lang="ts">
import DonorPublicState from '@/components/user/DonorPublicState.vue';
import StoreProxy from '@/store/StoreProxy';
import ApiHelper from '@/utils/ApiHelper';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { watch, type ComponentPublicInstance } from 'vue';
import { Component, Vue, toNative } from 'vue-facing-decorator';
import InfiniteList from '../../InfiniteList.vue';
import DonorBadge from '../../user/DonorBadge.vue';

@Component({
	components:{
		DonorBadge,
		InfiniteList,
		DonorPublicState,
	}
})
class ParamsDonorList extends Vue {

	public badges:{level:number, count:number}[] = [];
	public itemList:{uid:string, v:number, login:string, index:number}[] = [];
	public error = false;
	public mePos = -1;
	public itemSize = 40;
	public scrollOffset = 0;
	public loading = true;
	public disposed = false;

	private loadingNextPage = false;
	private localList:{uid:string, v:number}[] = [];

	public get userName():string { return StoreProxy.auth.twitch.user.displayName; }

	public mounted():void {
		this.loadList();

		watch(()=>this.scrollOffset, ()=> {
			const bounds = (this.$refs.list as ComponentPublicInstance).$el.getBoundingClientRect();
			const scrollMax = this.itemList.length*(this.itemSize+0) - bounds.height;

			if(this.scrollOffset > scrollMax - 500) {
				this.loadNext();
			}
		});
	}

	public beforeUnmount():void {
		this.disposed = true;
	}

	public async loadList():Promise<void> {
		this.loading = true;
		this.error = false;
		this.itemList = [];
		try {
			const headers = TwitchUtils.headers;
			headers['App-Version'] = import.meta.env.PACKAGE_VERSION;
			const {json} = await ApiHelper.call("user/donor/all", "GET");
			if(this.disposed) return;

			this.localList = json.data.list;
			this.computeStats();
			await this.loadNext();
		}catch(error) {
			console.log(error);
			this.error = true;
		}
		this.loading = false;
	}

	private async loadNext():Promise<void> {
		if(this.loadingNextPage) return;
		this.loadingNextPage = true;
		const items = this.localList.splice(0, 100);
		const uids = items.map(v => v.uid).filter(v => v != "-1");
		const users = await TwitchUtils.getUserInfo(uids);
		if(this.disposed) return;
		const res:{uid:string, v:number, login:string, index:number}[] = [];
		for (let i = 0; i < items.length; i++) {
			const item = {
							uid:items[i]!.uid,
							v:items[i]!.v,
							login:users.find(v => v.id === items[i]!.uid)?.display_name || this.$t("donor.anon"),
							index:res.length + this.itemList.length,
						};
			res.push(item)
		}
		this.itemList = this.itemList.concat(res);
		this.loadingNextPage = false;
	}

	private computeStats():void {
		const lvl2Count:{[key:number]:number} = {};
		const meUID = StoreProxy.auth.twitch.user.id;
		this.mePos = -1;
		for (let i = 0; i < this.localList.length; i++) {
			const e = this.localList[i]!;
			if(!lvl2Count[e.v]) lvl2Count[e.v] = 0;
			lvl2Count[e.v]! ++;
			if(e.uid === meUID) this.mePos = i;
		}

		const res:{level:number, count:number}[] = [];
		for (const level in lvl2Count) {
			res.push({level:parseInt(level), count:lvl2Count[level]!});
		}
		this.badges = res.reverse();
	}

}
export default toNative(ParamsDonorList);
</script>

<style scoped lang="less">
.paramsdonorlist{

	.loader {
		height: 2em;
		margin: auto;
		display: block;
	}

	.publicDonation {
		width: fit-content;
		margin: auto;
		margin-bottom: 1em;
	}

	.stats {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: space-evenly;
		margin-bottom: 1em;
		.item {
			display: flex;
			flex-direction: column;
			align-items: center;
			&:not(:last-child) {
				margin-right: .25em;
			}
			.badge {
				@size: 2em;
				width: @size;
				height: @size;
				:deep(.beatingHeart) {
					width: @size;
					height: @size;
				}
				:deep(.level) {
					font-size: 1em;
				}
			}
		}
	}

	.me {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		margin-bottom: 1em;
		.pos {
			margin-right: 1em;
			font-size: 1.5em;
		}
		.label {
			font-size: 1.5em;
		}
		.badge {
			margin-right: 1em;
		}
	}

	.list {
		max-height: 500px;
		overflow: hidden;

		.item {
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: center;
			.label {
				min-width: 150px;
				text-align: right;
			}
			.pos {
				margin-right: 1em;
			}
			.badge {
				@size: 2em;
				width: @size;
				height: @size;
				margin-right: 1em;
				:deep(.beatingHeart) {
					width: @size;
					height: @size;
				}
				:deep(.level) {
					font-size: 1em;
				}
			}
		}
	}
}
</style>
