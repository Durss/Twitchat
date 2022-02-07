<template>
	<div class="paramsfilters">
		<div class="row" v-for="(p,key) in params" :key="key">
			<ParamItem :paramData="p" />
			<ParamItem class="subItem" v-if="key == 'showRewards' && $store.state.params.filters.showRewards.value" :paramData="showRewardsInfos" />
		</div>
	</div>
</template>

<script lang="ts">
import store, { ParameterData } from '@/store';
import { Options, Vue } from 'vue-class-component';
import ParamItem from '../ParamItem.vue';

@Options({
	props:{},
	components:{
		ParamItem,
	}
})
export default class ParamsFilters extends Vue {

	public showRewardsInfos: ParameterData = store.state.params.filters.showRewardsInfos;

	public get params():{[key:string]:ParameterData} {
		let res:{[key:string]:ParameterData} = {};
		for (const key in store.state.params.filters) {
			if(key == "showRewardsInfos") continue;
			/* eslint-disable-next-line */
			res[key] = (store.state.params.filters as any)[key];
		}
		return res;
	}

}
</script>

<style scoped lang="less">
.paramsfilters{
	.row {
		margin: 10px 0;

		.subItem {
			margin-left: auto;
			margin-right: 0;
			margin-top: 10px;
			width: calc(100% - 40px);
			:deep(.toggle)::before {
				content: "⤷";
				display: inline-block;
				margin-right: 5px;
			}
		}
	}
}
</style>