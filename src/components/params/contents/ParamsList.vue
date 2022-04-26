<template>
	<div class="paramslist">
		<div class="row" v-for="(p) in params" :key="p.id">
			<ParamItem :paramData="p" />
			<transition
				@enter="onShowItem"
				@leave="onHideItem"
			>
				<div v-if="p.id == 212 && p.value === true && !isOBSConnected" class="obsConnect">
					<img src="@/assets/icons/infos.svg" alt="info">
					<p class="label">This feature needs you to connect on <a @click="$emit('setContent', 'obs')">OBS tab</a></p>
				</div>
			</transition>
		</div>
	</div>
</template>

<script lang="ts">
import store, { ParameterCategory, ParameterData } from '@/store';
import OBSWebsocket from '@/utils/OBSWebsocket';
import gsap from 'gsap/all';
import { Options, Vue } from 'vue-class-component';
import ParamItem from '../ParamItem.vue';

@Options({
	props:{
		category:String,
	},
	components:{
		ParamItem,
	},
	emits:['setContent'],
})
export default class ParamsList extends Vue {

	public category!:ParameterCategory;

	public get isOBSConnected():boolean {
		return OBSWebsocket.instance.connected;
	}

	public get params():{[key:string]:ParameterData} {
		if(!this.category) return {};
		let res:{[key:string]:ParameterData} = {};
		for (const key in store.state.params[this.category]) {
			if(store.state.params[this.category][key].parent) continue;
			res[key] = (store.state.params[this.category] as {[key:string]:ParameterData})[key] as ParameterData;
		}
		return res;
	}

	public onShowItem(el:HTMLDivElement, done:()=>void):void {
		gsap.from(el, {height:0, duration:.2, ease:"sine.out"});
	}

	public onHideItem(el:HTMLDivElement, done:()=>void):void {
		gsap.to(el, {height:0, duration:.2, ease:"sine.out"});
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

	.obsConnect {
		overflow: hidden;
		padding-left: calc(1em + 10px);
		img {
			height: 1em;
			vertical-align: middle;
		}

		.label {
			display: inline;
			color: @mainColor_warn;
		}
	}
}
</style>