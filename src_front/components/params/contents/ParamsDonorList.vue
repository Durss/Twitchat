<template>
	<div class="paramsdonorlist">
		<DonorPublicState class="publicDonation" noInfos @change="loadList()" />

		<div v-if="error">{{ t("error.donor_loading") }}</div>
		<Icon v-if="loading" name="loader" alt="loading" class="loader" />

		<div class="stats" v-if="!loading">
			<div v-for="b in badges" :key="'badge_' + b.level" class="item">
				<DonorBadge class="badge" :level="b.level" light />
				<div>x{{ b.count }}</div>
			</div>
		</div>

		<div class="me" v-if="storeAuth.donorLevel > -1 && !loading && mePos > -1">
			<DonorBadge class="badge" :level="storeAuth.donorLevel" light />
			<div class="pos">#{{ mePos + 1 }}</div>
			<div class="label">{{ userName }}</div>
		</div>

		<InfiniteList
			class="list"
			ref="list"
			v-if="!error && !loading && itemList.length > 0"
			:dataset="itemList"
			:itemSize="itemSize"
			:itemMargin="0"
			v-model:scrollOffset="scrollOffset"
			lockScroll
			v-slot="{ item }"
		>
			<div class="item">
				<DonorBadge class="badge" :level="item.v" light />
				<div class="pos">#{{ item.index + 1 }}</div>
				<span v-if="item.uid == '-1'" class="label">{{ item.login }}</span>
				<a class="label" v-else :href="'https://twitch.tv/' + item.login" target="_blank">{{
					item.login
				}}</a>
			</div>
		</InfiniteList>
	</div>
</template>

<script setup lang="ts">
import DonorPublicState from "@/components/user/DonorPublicState.vue";
import StoreProxy from "@/store/StoreProxy";
import ApiHelper from "@/utils/ApiHelper";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import {
	computed,
	onBeforeUnmount,
	onMounted,
	ref,
	watch,
	type ComponentPublicInstance,
} from "vue";
import { useI18n } from "vue-i18n";
import InfiniteList from "../../InfiniteList.vue";
import DonorBadge from "../../user/DonorBadge.vue";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";

const { t } = useI18n();
const storeAuth = useStoreAuth();

const badges = ref<{ level: number; count: number }[]>([]);
const itemList = ref<{ uid: string; v: number; login: string; index: number }[]>([]);
const error = ref(false);
const mePos = ref(-1);
const itemSize = ref(40);
const scrollOffset = ref(0);
const loading = ref(true);
const disposed = ref(false);
const list = ref<ComponentPublicInstance>();

let loadingNextPage = false;
let localList: { uid: string; v: number }[] = [];

const userName = computed<string>(() => {
	return StoreProxy.auth.twitch.user.displayName;
});

async function loadList(): Promise<void> {
	loading.value = true;
	error.value = false;
	itemList.value = [];
	try {
		const headers = TwitchUtils.headers;
		headers["App-Version"] = import.meta.env.PACKAGE_VERSION;
		const { json } = await ApiHelper.call("user/donor/all", "GET");
		if (disposed.value) return;

		localList = json.data.list;
		computeStats();
		await loadNext();
	} catch (e) {
		console.log(e);
		error.value = true;
	}
	loading.value = false;
}

async function loadNext(): Promise<void> {
	if (loadingNextPage) return;
	loadingNextPage = true;
	const items = localList.splice(0, 100);
	const uids = items.map((v) => v.uid).filter((v) => v != "-1");
	const users = await TwitchUtils.getUserInfo(uids);
	if (disposed.value) return;
	const res: { uid: string; v: number; login: string; index: number }[] = [];
	for (let i = 0; i < items.length; i++) {
		const item = {
			uid: items[i]!.uid,
			v: items[i]!.v,
			login: users.find((v) => v.id === items[i]!.uid)?.display_name || t("donor.anon"),
			index: res.length + itemList.value.length,
		};
		res.push(item);
	}
	itemList.value = itemList.value.concat(res);
	loadingNextPage = false;
}

function computeStats(): void {
	const lvl2Count: { [key: number]: number } = {};
	const meUID = StoreProxy.auth.twitch.user.id;
	mePos.value = -1;
	for (let i = 0; i < localList.length; i++) {
		const e = localList[i]!;
		if (!lvl2Count[e.v]) lvl2Count[e.v] = 0;
		lvl2Count[e.v]!++;
		if (e.uid === meUID) mePos.value = i;
	}

	const res: { level: number; count: number }[] = [];
	for (const level in lvl2Count) {
		res.push({ level: parseInt(level), count: lvl2Count[level]! });
	}
	badges.value = res.reverse();
}

onMounted(() => {
	loadList();
});

onBeforeUnmount(() => {
	disposed.value = true;
});

watch(
	() => scrollOffset.value,
	() => {
		const bounds = (list.value as ComponentPublicInstance).$el.getBoundingClientRect();
		const scrollMax = itemList.value.length * (itemSize.value + 0) - bounds.height;

		if (scrollOffset.value > scrollMax - 500) {
			loadNext();
		}
	},
);
</script>

<style scoped lang="less">
.paramsdonorlist {
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
				margin-right: 0.25em;
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
