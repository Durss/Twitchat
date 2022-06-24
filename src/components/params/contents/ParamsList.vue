<template>
	<div class="paramslist">
		<div class="row" v-for="(p) in params" :key="p.id">
			<!-- Special case for shoutout label -->
			<PostOnChatParam v-if="p.id==14"
				icon="shoutout_purple.svg"
				botMessageKey="shoutout"
				:noToggle="true"
				:title="p.label"
				:placeholders="soPlaceholders"
			/>

			<ParamItem v-else :paramData="p" save />
			
			<transition
				@enter="onShowItem"
				@leave="onHideItem"
			>
				<div v-if="p.id == 212 && p.value === true && !isOBSConnected" class="info obsConnect">
					<img src="@/assets/icons/infos.svg" alt="info">
					<p class="label">This feature needs you to connect on <a @click="$emit('setContent', 'obs')">OBS tab</a></p>
				</div>
				<div v-else-if="p.id == 213 && p.value === true" class="info pronouns">
					<p class="label">based on
						<a href='https://pronouns.alejo.io' target='_blank'>https://pronouns.alejo.io</a>
						and
						<a href='https://pronoundb.org/' target='_blank'>PronounDB</a>
					</p>
				</div>
			</transition>
		</div>
	</div>
</template>

<script lang="ts">
import store from '@/store';
import type { ParameterCategory, ParameterData, PlaceholderEntry } from '@/types/TwitchatDataTypes';
import OBSWebsocket from '@/utils/OBSWebsocket';
import gsap from 'gsap/all';
import { Options, Vue } from 'vue-class-component';
import ParamItem from '../ParamItem.vue';
import PostOnChatParam from '../PostOnChatParam.vue';

@Options({
	props:{
		category:String,
	},
	components:{
		ParamItem,
		PostOnChatParam,
	},
	emits:['setContent'],
})
export default class ParamsList extends Vue {

	public category!:ParameterCategory;

	public get isOBSConnected():boolean {
		return OBSWebsocket.instance.connected;
	}

	public get soPlaceholders():PlaceholderEntry[] {
		return [
			{
				tag:"USER",
				desc:"User name",
			},
			{
				tag:"URL",
				desc:"User channel URL",
			},
			{
				tag:"TITLE",
				desc:"Last stream's title",
			},
			{
				tag:"CATEGORY",
				desc:"Last stream's category",
			},
		];
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
		gsap.from(el, {height:0, duration:.2, ease:"sine.out", onComplete:()=>{
			done();
		}});
	}

	public onHideItem(el:HTMLDivElement, done:()=>void):void {
		gsap.to(el, {height:0, duration:.2, ease:"sine.out", onComplete:()=>{
			done();
		}});
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

	.info {
		overflow: hidden;
		padding-left: calc(1em + 10px);
		img {
			height: 1em;
			vertical-align: middle;
		}

		.label {
			display: inline;
		}

		&.obsConnect {
			.label {
				color: @mainColor_warn;
			}
		}

		&.pronouns {
			.label {
				font-size: .8em;
			}
		}
	}
}
</style>