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
			<template v-else>
				<div class="ctas">
					<Button class="downloadBt" icon="download" @click="downloadLogs()">Download logs</Button>
					<Button class="resetBt" icon="download" alert @click="clearLogs()">Clear logs</Button>
				</div>
				
				<div v-for="(log, index) in logs" class="card-item entry">
					<div class="head" @click="expandState[index] = !expandState[index] ?? true">
						<div class="row">
							<span class="date">{{ formatDate(log.date) }}</span>
							<span>{{ log.info }}</span>
						</div>
						<button v-if="log.data"><Icon :name="expandState[index] === true? 'hide' : 'show'" /></button>
					</div>
					<div class="body" v-click2Select v-if="log.data != undefined && expandState[index]">{{ JSON.stringify(log.data) }}</div>
				</div>
			</template>
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
import Button from '../Button.vue';

@Component({
	components:{
		Button,
		ParamItem,
		CloseButton,
	},
	emits:["close"]
})
export default class ObsHeatLogs extends AbstractSidePanel {

	public search:string = "";
	public searching:boolean = false;
	public expandState:boolean[] = [];
	public param_search:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", placeholder:"search..."};

	private searchTO:number = -1;

	public get logs() {
		this.expandState = [];
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

	public async clearLogs():Promise<void> {
		OBSWebsocket.instance.logs = [];
	}

	public async downloadLogs():Promise<void> {
		const data = JSON.stringify(this.logs);
		const blob = new Blob([data], { type: 'application/json' });
		const url = window.URL.createObjectURL(blob);
		window.open(url, "_blank");
	}

	public async onSearch():Promise<void> {
		this.searching = true;
		clearTimeout(this.searchTO);
		this.searchTO = setTimeout(()=>{
			this.search = this.param_search.value;
			this.searching = false;
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
			margin-right: .5em;
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

	.ctas {
		margin: auto;
		gap: .5em;
		display: flex;
		flex-direction: row;
	}

	.entries {
		gap: .5em;
		font-size: .8em;
		.entry {
			flex-shrink: 0;
			gap: .5em;
			display: flex;
			flex-direction: column;
			.head {
				gap: 1em;
				display: flex;
				flex-direction: row;
				line-height: 1.5em;
				.row {
					flex-grow: 1;
					.date {
						font-size: .7em;
						margin-right: .5em;
					}
				}
				button {
					cursor: pointer;
					color: var(--color-text);
					flex-shrink: 0;
					.icon {
						height: 1em;
					}
				}
			}
			.body {
				font-size: .9em;
				font-family: 'Courier New', Courier, monospace;
				word-wrap: break-word;
				max-height: 500px;
				overflow-y: auto;
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