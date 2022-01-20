<template>
	<div class="paramsappearance">
		<div class="row" v-for="(p,key) in params" :key="key">
			<ParamItem :paramData="p" />
			<ParamItem class="subItem" v-if="key == 'showBadges' && $store.state.params.appearance.showBadges.value" :paramData="minibadge" />
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

	public get params():{[key:string]:ParameterData} {
		let res:{[key:string]:ParameterData} = {};
		for (const key in store.state.params.appearance) {
			if(key == "minimalistBadge") continue;
			/* eslint-disable-next-line */
			res[key] = (store.state.params.appearance as any)[key];
		}
		return res;
	}

	public mounted():void {
		this.minibadge = store.state.params.appearance.minimalistBadges;
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