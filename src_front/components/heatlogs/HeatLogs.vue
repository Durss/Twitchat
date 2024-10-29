<template>
	<div class="heatlogs sidePanel">
		<div class="head">
			<h1 class="title"><Icon name="broadcast" />{{ $t("heat.logs.title") }}</h1>
			<div class="subtitle">{{ $t("heat.logs.subtitle") }}</div>
			<ClearButton @click="close" />
		</div>
		
		<div class="ctas">
			<TTButton @click="refreshList()" icon="refresh" :loading="reloading">{{ $t("global.refresh") }}</TTButton>
			<TTButton @click="clearList()" icon="trash" alert>{{ $t("global.clear") }}</TTButton>
		</div>
		
		<div class="content empty" v-if="logs.length == 0 && !reloading">{{ $t("heat.logs.empty") }}</div>
		
		<div class="content empty" v-else-if="reloading">
			<Icon class="loader" name="loader" />
		</div>
		
		<div class="content entries" v-else-if="!reloading">
			<div v-for="item in logs" :key="item.id" :class="getRowClasses(item)">
				<div class="head" @click="idToExpandState[item.id] = !idToExpandState[item.id]">
					<div class="infos">
						<div class="status" v-tooltip="'started from<br>Test button'" v-if="item.testMode"><img src="@/assets/icons/test.svg"></div>
						<div class="status" v-tooltip="'Anonymous click'" v-if="item.anonymous"><img src="@/assets/icons/anon.svg"></div>
						<div class="status" v-if="item.user"><img src="@/assets/icons/user.svg"> {{ item.user.login }}</div>
						<div class="date">{{ getFormatedDime(item.date) }}</div>
					</div>
					<Icon name="arrowRight" class="arrow" />
				</div>
				<template v-if="idToExpandState[item.id] == true">
					<div class="details">
						<div v-if="item.info">{{item.info}}</div>
						<div>X: {{ (item.x * 100).toFixed(0) }}%</div>
						<div>Y: {{ (item.y * 100).toFixed(0) }}%</div>
						<div>ctrl: <Icon :name="item.ctrl? 'checkmark' : 'cross'" /></div>
						<div>alt: <Icon :name="item.alt? 'checkmark' : 'cross'" /></div>
						<div>shift: <Icon :name="item.shift? 'checkmark' : 'cross'" /></div>
					</div>
					<div class="messages">
						<ul class="messages">
							<li v-for="entry in item.targets">
								<template v-if="entry.spotify"><Icon name="spotify" />Spotify overlay</template>
								<template v-if="entry.ulule"><Icon name="ulule" />Ulule overlay</template>
								<template v-if="entry.distortiontID"><Icon name="distort" />{{ getDistortionNameById(entry.distortiontID) }}</template>
								
								<HeatScreenPreview class="heatScreen" v-if="entry.customAreaID && getScreenByAreaId(entry.customAreaID)"
								renderOnly
								:selectedAreas="[entry.customAreaID]"
								:screen="getScreenByAreaId(entry.customAreaID)" />
								<template v-else-if="entry.customAreaID"><Icon name="polygon" /> &lt;UNKNOWN AREA ID {{ entry.customAreaID }}&gt;</template>
								
								<template v-if="entry.obsSource"><Icon name="obs" />{{ entry.obsSource }}</template>
								<div class="coordinates">
									<span><strong>X:</strong> {{ (entry.x * 100).toFixed(0) }}%</span>
									<span><strong>Y:</strong> {{ (entry.y * 100).toFixed(0) }}%</span>
								</div>
							</li>
						</ul>
					</div>
				</template>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { LogHeat } from '@/utils/Logger';
import Logger from '@/utils/Logger';
import Utils from '@/utils/Utils';
import {toNative,  Component } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel';
import Icon from '../Icon.vue';
import TTButton from '../TTButton.vue';
import ClearButton from '../ClearButton.vue';
import type { HeatArea, HeatScreen } from '@/types/HeatDataTypes';
import HeatScreenPreview from '../params/contents/heat/areas/HeatScreenPreview.vue';

@Component({
	components:{
		Icon,
		TTButton,
		HeatScreenPreview,
		ClearButton,
	},
	emits:["close"]
})
class HeatLogs extends AbstractSidePanel {

	public reloading = false;

	public idToExpandState:{[key:string]:boolean} = {};

	public get logs():LogHeat[] {
		return Logger.instance.getLogs("heat").concat().reverse();
	}

	public getRowClasses(log:LogHeat):string[] {
		const res = ["entry"];
		if(this.idToExpandState[log.id]) res.push("open");
		return res;
	}

	public getDistortionNameById(id:string):string {
		const distortion = this.$store.heat.distortionList.find(v=>v.id == id);
		if(!distortion) return "<UNKNOWN DISTORTION ID "+id+">";
		let name = distortion.name;
		if(!name) {
			const chunks:string[] = [];
			if(distortion.obsItemPath.sceneName) chunks.push(distortion.obsItemPath.sceneName);
			if(distortion.obsItemPath.groupName) chunks.push(distortion.obsItemPath.groupName);
			if(distortion.obsItemPath.source.name) chunks.push(distortion.obsItemPath.source.name);
			name = chunks.join(" => ");
		}
		return name;
	}

	public getCustomAreaNameById(id:string):string {
		return "";
	}

	public getScreenByAreaId(id:string):HeatScreen {
		let area!:HeatArea;
		let screen!:HeatScreen;
		this.$store.heat.screenList.forEach(s => {
			let a = s.areas.find(v=>v.id == id);
			if(a) {
				area = a;
				screen = s;
			}
		});
		return screen;
	}

	public getFormatedDime(date:number):string {
		const d = new Date(date);
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes())+":"+Utils.toDigits(d.getSeconds())+"."+Utils.toDigits(d.getMilliseconds(),3);
	}

	public async mounted():Promise<void> {
		this.open();
		console.log((Logger.instance.getLogs("heat")));
	}

	public refreshList():void {
		this.reloading = true;
		window.setTimeout(()=>{
			this.reloading = false;
		}, 500)
	}

	public clearList():void {
		Logger.instance.clear("heat");
		this.refreshList();
	}
}
export default toNative(HeatLogs);
</script>

<style scoped lang="less">
.heatlogs{
	.ctas {
		margin-top: 1em;
		gap: .5em;
		display: flex;
		flex-direction: row;
		justify-content: center;
	}

	.entries {
		display: flex;
		flex-direction: column;
		gap: 1em;
	}

	.loader {
		height: 2em;
	}

	.empty {
		text-align: center;
		font-style: italic;
	}

	.entry {
		display: flex;
		flex-direction: column;
		gap: .25em;
		.head {
			display: flex;
			flex-direction: row;
			background-color: var(--color-primary);
			padding: .2em .5em;
			border-radius: .5em;
			color: var(--color-light);
			transition: background-color.25s;
			cursor:pointer;
			.arrow {
				height: 1em;
				justify-self: flex-end;
			}

			.infos {
				gap: .5em;
				display: flex;
				flex-direction: row;
				align-items: center;
				flex-grow: 1;
				.icon {
					height: 1em;
				}
				.status {
					img {
						height: 1em;
						vertical-align: middle;
					}
				}
			}
			&:hover {
				background-color: var(--color-primary-light);
			}
		}

		&.open {
			.head > .arrow {
				transform: rotate(90deg);
			}
		}

		.date {
			font-size: .7em;
		}

		.details {
			gap: .5em;
			row-gap: .25em;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			padding-left: .5em;
			margin-bottom: .5em;
			div {
				gap: .25em;
				display: flex;
				flex-direction: row;
				align-items: center;
				border: 1px solid var(--color-text-fade);
				padding: .2em .5em;
				border-radius: var(--border-radius);
				.icon {
					height: .8em;
				}
			}
		}

		.messages {
			padding-left: .5em;
			font-size: .9em;
			list-style-position: inside;
			display: flex;
			flex-direction: column;
			gap: .5em;
			
			li {
				display: flex;
				flex-direction: row;
				flex-wrap: wrap;
				align-items: center;
				.date {
					margin-right: .5em;
				}
				.icon {
					height: 1em;
					vertical-align: middle;
					margin-right: .5em;
				}
				.heatScreen {
					display: inline-block;
					width: 50px;
				}
				.coordinates {
					display: flex;
					flex-direction: row;
					flex-wrap: wrap;
					margin-left: 1em;
					gap: .5em;
					border: 1px solid var(--color-text-fade);
					padding: .2em .5em;
					border-radius: var(--border-radius);
				}
			}
		}

	}
	
}
</style>