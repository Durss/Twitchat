<template>
	<div class="paramsdonorlist">
		<div v-if="error">An error occured when loading donors list :(</div>
		<img src="@/assets/loader/loader.svg" alt="loader" v-if="loading">

		<div class="stats" v-if="!loading">
			<div v-for="b in badges" :key="'badge_'+b.level" class="item">
				<DonorState class="badge" :level="b.level" light />
				<div>x{{b.count}}</div>
			</div>
		</div>

		<div class="me" v-if="isDonor && !loading && mePos > -1">
			<DonorState class="badge" :level="donorLevel" light />
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
				<DonorState class="badge" :level="item.v" light />
				<div class="pos">#{{item.index+1}}</div>
				<span v-if="item.uid == '-1'" class="label">{{ item.login }}</span>
				<a class="label" v-else :href="'https://twitch.tv/'+item.login" target="_blank">{{item.login}}</a>
			</div>
		</InfiniteList>
	</div>
</template>

<script lang="ts">
import StoreProxy from '@/store/StoreProxy';
import Config from '@/utils/Config';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { watch } from 'vue';
import { Options, Vue } from 'vue-class-component';
import InfiniteList from '../../InfiniteList.vue';
import DonorState from '../../user/DonorState.vue';

@Options({
	props:{},
	components:{
		DonorState,
		InfiniteList,
	}
})
export default class ParamsDonorList extends Vue {

	public badges:{level:number, count:number}[] = [];
	public itemList:{uid:string, v:number, login:string, index:number}[] = [];
	public error = false;
	public mePos = -1;
	public itemSize = 40;
	public scrollOffset = 0;
	public loading = true;
	
	private localList:{uid:string, v:number}[] = [];

	public get isDonor():boolean { return StoreProxy.auth.twitch.user.donor.state; }
	public get donorLevel():number { return StoreProxy.auth.twitch.user.donor.level; }
	public get userName():string { return StoreProxy.auth.twitch.user.displayName; }

	public mounted():void {
		this.loadList();

		watch(()=>this.scrollOffset, ()=> {
			const bounds = (this.$refs.list as Vue).$el.getBoundingClientRect();
			const scrollMax = this.itemList.length*(this.itemSize+0) - bounds.height;
			
			if(this.scrollOffset > scrollMax - 100) {
				this.loadNext();
			}
		});
	}
	
	private async loadList():Promise<void> {
		this.error = false;
		try {
			const res = await fetch(Config.instance.API_PATH+"/user/donor/all", {method: "GET"});
			const json = await res.json();
			this.localList = json.data.list;
			this.computeStats();
			await this.loadNext();
		}catch(error) {
			this.error = true;
		}
		this.loading = false;
	}

	private async loadNext():Promise<void> {
		const items = this.localList.splice(0, 10);
		const uids = items.map(v => v.uid).filter(v => v != "-1");
		const users = await TwitchUtils.loadUserInfo(uids);
		const res:{uid:string, v:number, login:string, index:number}[] = [];
		for (let i = 0; i < items.length; i++) {
			const item = {
							uid:items[i].uid,
							v:items[i].v,
							login:users.find(v => v.id === items[i].uid)?.display_name ?? "Anonymous",
							index:res.length + this.itemList.length,
						};
			res.push(item)
		}
		this.itemList = this.itemList.concat(res);
	}

	private computeStats():void {
		const lvl2Count:{[key:number]:number} = {};
		const meUID = StoreProxy.auth.twitch.user.id;
		for (let i = 0; i < this.localList.length; i++) {
			const e = this.localList[i];
			if(!lvl2Count[e.v]) lvl2Count[e.v] = 0;
			lvl2Count[e.v] ++;
			if(e.uid === meUID) this.mePos = i;
		}

		const res:{level:number, count:number}[] = [];
		for (const level in lvl2Count) {
			res.push({level:parseInt(level), count:lvl2Count[level]});
		}
		this.badges = res.reverse();
		console.log(res);
	}

}
</script>

<style scoped lang="less">
.paramsdonorlist{
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
		height: 300px;
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