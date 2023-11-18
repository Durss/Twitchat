<template>
	<div class="obsheatlogs sidePanel">
		<div class="head">
			<h1 class="title">OBS/Heat logs</h1>
			<div class="subtitle">Get logs about what happens when you click on OBS sources via heat</div>
			<CloseButton @click="close" />
		</div>
		
		<div class="content entries">
			<div class="card-item searchForm">
				<ParamItem :paramData="param_search" @change="onSearch()" noBackground />
				<Icon name="loader" class="loader" v-if="searching" />
				<button v-else-if="search" @click="param_search.value = search = ''; searching=false;"><Icon name="cross" /></button>
			</div>

			<div v-if="logs.length == 0" class="noResult">- no result -</div>

			<div v-else v-for="log in logs" class="card-item entry">
				<span class="date">{{ formatDate(log.date) }}</span>
				<span>{{ log.info }}</span>
				<div>{{ JSON.stringify(log.data) }}</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { Component } from 'vue-facing-decorator';
import CloseButton from '../CloseButton.vue';
import OBSWebsocket from '@/utils/OBSWebsocket';
import Utils from '@/utils/Utils';
import AbstractSidePanel from '../AbstractSidePanel.vue';
import ParamItem from '../params/ParamItem.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';

@Component({
	components:{
		ParamItem,
		CloseButton,
	},
	emits:["close"]
})
export default class ObsHeatLogs extends AbstractSidePanel {

	public search:string = "";
	public searching:boolean = false;
	public param_search:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", placeholder:"search..."};

	private searchTO:number = -1;

	public get logs() {
		if(this.param_search.value) {
			const reg = new RegExp(this.search, "gi");
			return OBSWebsocket.instance.logs.filter(v=> {
				reg.lastIndex = 0
				return reg.test(v.info)
			});
		}else{
			return OBSWebsocket.instance.logs;
		}
	}
	
	public formatDate(date:number) {
		const d = new Date(date);
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes())+":"+Utils.toDigits(d.getSeconds())+"."+Utils.toDigits(d.getMilliseconds(),3);
	}

	public async mounted():Promise<void> {
		this.open();
	}

	public async onSearch():Promise<void> {
		clearTimeout(this.searchTO);
		this.searchTO = setTimeout(()=>{
			this.search = this.param_search.value;
		}, 250)
	}

}
</script>

<style scoped lang="less">
.obsheatlogs{

	.searchForm {
		margin: 0 auto;
		display: flex;
		gap: .5em;
		flex-direction: row;
		align-items: center;
		flex-shrink: 0;
		button {
			color: var(--color-text);
			height: 1em;
			margin-left: -2em;
			cursor: pointer;
			z-index: 1;
			.icon {
				height: 100%;
			}
		}
		.loader {
			margin-left: -2em;
		}
		:deep(input) {
			padding-right: 2em;
		}
	}

	.entries {
		gap: .25em;
		.entry {
			flex-shrink: 0;
			.date {
				font-size: .7em;
				margin-right: .5em;
			}	
		}
	}

	.noResult {
		text-align: center;
		margin-top: 1em;
		font-style: italic;
	}
}
</style>