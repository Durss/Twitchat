<template>
	<div class="paramslist">
		<div class="row" v-for="(p) in params" :key="p.id">
			<ParamItem :paramData="p" />
		</div>
	</div>
</template>

<script lang="ts">
import store, { ParameterCategory, ParameterData } from '@/store';
import { Options, Vue } from 'vue-class-component';
import ParamItem from '../ParamItem.vue';

@Options({
	props:{
		category:String,
	},
	components:{
		ParamItem,
	},
})
export default class ParamsList extends Vue {

	public category!:ParameterCategory;

	public get params():{[key:string]:ParameterData} {
		if(!this.category) return {};
		let res:{[key:string]:ParameterData} = {};
		for (const key in store.state.params[this.category]) {
			if(store.state.params[this.category][key].parent) continue;
			res[key] = (store.state.params[this.category] as {[key:string]:ParameterData})[key] as ParameterData;
		}
		return res;
	}

}
</script>

<style scoped lang="less">
.paramslist{
	.row:not(:first-child) {
		margin-top: 10px;
	}
	.row:not(:last-child) {
		margin-bottom: 10px;
	}
}
</style>