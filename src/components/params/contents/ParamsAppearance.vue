<template>
	<div class="paramsappearance">
		<div class="row" v-for="(p,key) in params" :key="key">
			<ParamItem :paramData="p" />
			<ParamItem class="subItem" v-if="key == 'showBadges' && $store.state.params.appearance.showBadges.value" :paramData="minibadge" />
			<ParamItem class="subItem" v-if="key == 'splitView' && $store.state.params.appearance.splitView.value" :paramData="splitViewSwitch" />
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
export default class ParamsAppearance extends Vue {

	public minibadge: ParameterData = store.state.params.appearance.minimalistBadges;
	public splitViewSwitch: ParameterData = store.state.params.appearance.splitViewSwitch;

	public get params():{[key:string]:ParameterData} {
		let res:{[key:string]:ParameterData} = {};
		for (const key in store.state.params.appearance) {
			if(key == "minimalistBadges") continue;
			if(key == "splitViewSwitch") continue;
			/* eslint-disable-next-line */
			res[key] = (store.state.params.appearance as any)[key];
		}
		return res;
	}
}
</script>

<style scoped lang="less">
.paramsappearance{
	.row {
		margin: 10px 0;

		.subItem {
			margin-left: auto;
			margin-right: 0;
			margin-top: 5px;
			width: calc(100% - 40px);
			:deep(.toggle) {
				&::before {
					content: "⤷";
					display: inline-block;
					margin-right: 5px;
				}
				label {
					font-size: .9em;
				}
			}
		}
	}
}
</style>