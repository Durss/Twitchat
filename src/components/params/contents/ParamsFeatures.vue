<template>
	<div class="paramsfeatures">
		<div class="row" v-for="(p,key) in params" :key="key">
			<ParamItem :paramData="p" />
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
export default class ParamsFeatures extends Vue {

	public get params():{[key:string]:ParameterData} {
		let res:{[key:string]:ParameterData} = {};
		for (const key in store.state.params.features) {
			if(store.state.params.features[key].parent) continue;
			res[key] = (store.state.params.features as {[key:string]:ParameterData})[key] as ParameterData;
		}
		return res;
	}
}
</script>

<style scoped lang="less">
.paramsfeatures{
	.row {
		margin: 10px 0;
	}
}
</style>