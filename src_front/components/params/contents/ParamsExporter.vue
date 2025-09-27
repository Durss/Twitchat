<template>
	<div class="paramsexporter parameterContent">
		<Icon name="share" class="icon" />

		<div class="head">
			<p>Export any kind of parameter and share them</p>
			<p class="card-item secondary"><Icon name="alert" class="icon" />This is a very experimental feature that may not work as expected.</p>
		</div>

		<SettingsExportForm />

		<Splitter class="splitter">👇 Select items to export 👇</Splitter>
		
		<ToggleBlock :icons="['broadcast']" :title="$t('params.categories.triggers')" :open="false">
			<template #right_actions>
				<p class="count">x{{ $store.exporter.selectedTriggerIDs.length }}</p>
			</template>
			<div class="itemList">
				<TriggerListFolderItem
					v-model:items="folderTriggerList"
					:noEdit="true"
					:selectMode="true" />
			</div>
		</ToggleBlock>

		<ToggleBlock :icons="['count']" :title="$t('params.categories.counters')" :open="false"
		v-if="$store.counters.counterList.length > 0">
			<template #right_actions>
				<p class="count">x{{ $store.exporter.selectedCounterIDs.length }}</p>
			</template>
			<div class="itemList">
				<div class="rowItem" v-for="item in $store.counters.counterList" @click="toggleCounter(item.id)" :key="item.id">
					<span class="label"><Icon name="count" />{{ item.name }}</span>
					<div class="toggle">
						<ToggleButton v-model="counterStates[item.id]" />
					</div>
				</div>
			</div>
		</ToggleBlock>

		<ToggleBlock :icons="['placeholder']" :title="$t('params.categories.values')" :open="false"
		v-if="$store.values.valueList.length > 0">
			<template #right_actions>
				<p class="count">x{{ $store.exporter.selectedValueIDs.length }}</p>
			</template>
			<div class="itemList">
				<div class="rowItem" v-for="item in $store.values.valueList" @click="toggleValue(item.id)" :key="item.id">
					<span class="label"><Icon name="placeholder" />{{ item.name }}</span>
					<div class="toggle">
						<ToggleButton v-model="valueStates[item.id]" />
					</div>
				</div>
			</div>
		</ToggleBlock>

		<ToggleBlock :icons="['label']" title="Label Overlays" :open="false"
		v-if="$store.labels.labelList.length > 0">
			<template #right_actions>
				<p class="count">x{{ $store.exporter.selectedLabelIDs.length }}</p>
			</template>
			<div class="itemList">
				<div class="rowItem" v-for="item in $store.labels.labelList" @click="toggleLabel(item.id)" :key="item.id">
					<span class="label"><Icon name="label" />{{ item.title }}</span>
					<div class="toggle">
						<ToggleButton v-model="labelStates[item.id]" />
					</div>
				</div>
			</div>
		</ToggleBlock>

		<ToggleBlock :icons="['easing']" title="Animated texts" :open="false"
		v-if="$store.animatedText.animatedTextList.length > 0">
			<template #right_actions>
				<p class="count">x{{ $store.exporter.selectedAnimatedTextIDs.length }}</p>
			</template>
			<div class="itemList">
				<div class="rowItem" v-for="item in $store.animatedText.animatedTextList" @click="toggleAnimatedText(item.id)" :key="item.id">
					<span class="label"><Icon name="easing" />{{ item.title }}</span>
					<div class="toggle">
						<ToggleButton v-model="animatedTextStates[item.id]" />
					</div>
				</div>
			</div>
		</ToggleBlock>

		<ToggleBlock :icons="['train']" title="Custom Hype Trains" :open="false"
		v-if="$store.customTrain.customTrainList.length > 0">
			<template #right_actions>
				<p class="count">x{{ $store.exporter.selectedCustomTrainIDs.length }}</p>
			</template>
			<div class="itemList">
				<div class="rowItem" v-for="item in $store.customTrain.customTrainList" @click="toggleCustomTrain(item.id)" :key="item.id">
					<span class="label"><Icon name="train" />{{ item.title }}</span>
					<div class="toggle">
						<ToggleButton v-model="customTrainStates[item.id]" />
					</div>
				</div>
			</div>
		</ToggleBlock>

		<ToggleBlock :icons="['timer']" title="Timers and Countdowns" :open="false"
		v-if="filteredTimers.length > 0">
			<template #right_actions>
				<p class="count">x{{ $store.exporter.selectedTimerIDs.length }}</p>
			</template>
			<div class="itemList">
				<div class="rowItem" v-for="item in filteredTimers" @click="toggleTimer(item.id)" :key="item.id">
					<span class="label">
						<Icon name="timer" v-if="item.type == 'timer'" />
						<Icon name="countdown" v-if="item.type == 'countdown'" />	
						{{ item.title }}
					</span>
					<div class="toggle">
						<ToggleButton v-model="timerStates[item.id]" />
					</div>
				</div>
			</div>
		</ToggleBlock>

		<ToggleBlock :icons="['credits']" title="Ending credits overlay" :open="false"
		v-if="endingCreditsSlots.length > 0">
			<template #right_actions>
				<p class="count">x{{ $store.exporter.selectedEndingCreditsSlotIDs.length }}</p>
			</template>
			<div class="itemList">
				<div class="rowItem" v-for="item in endingCreditsSlots" @click="toggleEndingCreditsSlot(item.id)" :key="item.id">
					<span class="label"><Icon :name="item.icon" />{{ item.title }}</span>
					<div class="toggle">
						<ToggleButton v-model="endingCreditSlotStates[item.id]" />
					</div>
				</div>
			</div>
		</ToggleBlock>

		<ToggleBlock :icons="['timer']" title="Bingo Grids" :open="false"
		v-if="$store.bingoGrid.gridList.length > 0">
			<template #right_actions>
				<p class="count">x{{ $store.exporter.selectedBingoGridIDs.length }}</p>
			</template>
			<div class="itemList">
				<div class="rowItem" v-for="item in $store.bingoGrid.gridList" @click="toggleBingoGrid(item.id)" :key="item.id">
					<span class="label"><Icon name="bingo" />{{ item.title }}</span>
					<div class="toggle">
						<ToggleButton v-model="bingoGridStates[item.id]" />
					</div>
				</div>
			</div>
		</ToggleBlock>
	</div>
</template>

<script lang="ts">
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import SettingsExportForm from './exporter/SettingsExportForm.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import TriggerListFolderItem from './triggers/TriggerListFolderItem.vue';
import type { TriggerListEntry, TriggerListFolderEntry } from './triggers/TriggerList.vue';
import type { TriggerTreeItemData } from '@/types/TriggerActionDataTypes';
import TriggerUtils from '@/utils/TriggerUtils';
import ToggleButton from '@/components/ToggleButton.vue';
import Icon from '@/components/Icon.vue';
import DataStore from '@/store/DataStore';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import StoreProxy from '@/store/StoreProxy';
import Splitter from '@/components/Splitter.vue';

@Component({
	components:{
		Icon,
		Splitter,
		ToggleBlock,
		ToggleButton,
		SettingsExportForm,
		TriggerListFolderItem,
	},
	emits:[],
})
class ParamsExporter extends Vue {

	public folderTriggerList:(TriggerListEntry|TriggerListFolderEntry)[] = [];
	public endingCreditsSlots:{id:string, title:string, slotType:TwitchatDataTypes.EndingCreditsSlotStringTypes, icon:string}[] = [];

	public counterStates:{[key:string]:boolean} = {};
	public valueStates:{[key:string]:boolean} = {};
	public labelStates:{[key:string]:boolean} = {};
	public animatedTextStates:{[key:string]:boolean} = {};
	public customTrainStates:{[key:string]:boolean} = {};
	public timerStates:{[key:string]:boolean} = {};
	public endingCreditSlotStates:{[key:string]:boolean} = {};
	public bingoGridStates:{[key:string]:boolean} = {};

	public get filteredTimers() {
		return this.$store.timers.timerList.filter(v=> !v.isDefault);
	}

	public get triggerList():TriggerListEntry[] {
		const triggers = this.$store.triggers.triggerList;
		const entries = triggers.map((trigger, index) => {
			const info = TriggerUtils.getTriggerDisplayInfo(trigger);
			const entry:TriggerListEntry = { type:"trigger", id:trigger.id, index, label:info.label, trigger, icon:info.icon, iconURL:info.iconURL, canTest:false };
			return entry;
		})
		return entries;
	}

	public mounted(){
		this.loadTriggers();

		this.$store.counters.counterList.forEach(item => {
			this.counterStates[item.id] = this.$store.exporter.selectedCounterIDs.includes(item.id);
		});

		this.$store.values.valueList.forEach(item => {
			this.valueStates[item.id] = this.$store.exporter.selectedValueIDs.includes(item.id);
		});

		this.$store.labels.labelList.forEach(item => {
			this.labelStates[item.id] = this.$store.exporter.selectedLabelIDs.includes(item.id);
		});

		this.$store.animatedText.animatedTextList.forEach(item => {
			this.animatedTextStates[item.id] = this.$store.exporter.selectedAnimatedTextIDs.includes(item.id);
		});

		this.$store.customTrain.customTrainList.forEach(item => {
			this.customTrainStates[item.id] = this.$store.exporter.selectedCustomTrainIDs.includes(item.id);
		});

		this.filteredTimers.forEach(item => {
			this.timerStates[item.id] = this.$store.exporter.selectedTimerIDs.includes(item.id);
		});

		this.$store.bingoGrid.gridList.forEach(item => {
			this.bingoGridStates[item.id] = this.$store.exporter.selectedBingoGridIDs.includes(item.id);
		});

		const json = DataStore.get(DataStore.ENDING_CREDITS_PARAMS);
		if(json) {
			const creditsData = StoreProxy.endingCredits.overlayData
			this.endingCreditsSlots = creditsData?.slots.map(v=> {
				const def = TwitchatDataTypes.EndingCreditsSlotDefinitions.find(d=>d.id == v.slotType)!
				this.endingCreditSlotStates[v.id] = this.$store.exporter.selectedEndingCreditsSlotIDs.includes(v.id);
				return {id:v.id, title:v.label, slotType:v.slotType, icon:def.icon}
			}) || [];
		}
	}

	public async loadTriggers(){
		const triggerList = this.$store.triggers.triggerList;
		const idToHasFolder:{[key:string]:boolean} = {};

		const flatList = triggerList.map<TriggerListEntry>(v=> {
			const info = TriggerUtils.getTriggerDisplayInfo(v);
			return { type:"trigger", index:0, label:info.label, id:v.id, trigger:v, icon:info.icon, iconURL:info.iconURL, canTest:false }
		})
		function buildItem(items:TriggerTreeItemData[]):(TriggerListEntry|TriggerListFolderEntry)[] {
			const res:(TriggerListEntry|TriggerListFolderEntry)[] = [];
			for (let i = 0; i < items.length; i++) {
				const item = items[i];
				if(item.type == "folder") {
					const children = buildItem(item.children || []);
					res.push({type:"folder",
							id:item.id,
							label:item.name!,
							items:children,
							color:{type:"color", value:item.color || "#60606c"},
							expand:item.expand == true,
							enabled:item.enabled !== false});
				}else{
					const entry = flatList.find(v=> v.trigger.id == item.triggerId);
					if(entry && !idToHasFolder[entry.id]) {
						idToHasFolder[entry.id] = true;
						res.push(entry);
					}
				}
			}
			return res;
		}
		this.folderTriggerList = buildItem(this.$store.triggers.triggerTree);
		for (let i = 0; i < this.triggerList.length; i++) {
			const t = this.triggerList[i];
			if(!idToHasFolder[t.id]) {
				idToHasFolder[t.id] = true;
				this.folderTriggerList.push(t);
			}
		}
	}

	public toggleCounter(id:string){
		this.counterStates[id] = !this.counterStates[id];
		if(this.counterStates[id]) this.$store.exporter.selectedCounterIDs.push(id);
		else this.$store.exporter.selectedCounterIDs.splice(this.$store.exporter.selectedCounterIDs.indexOf(id), 1);
	}

	public toggleValue(id:string){
		this.valueStates[id] = !this.valueStates[id];
		if(this.valueStates[id]) this.$store.exporter.selectedValueIDs.push(id);
		else this.$store.exporter.selectedValueIDs.splice(this.$store.exporter.selectedValueIDs.indexOf(id), 1);
	}

	public toggleLabel(id:string){
		this.labelStates[id] = !this.labelStates[id];
		if(this.labelStates[id]) this.$store.exporter.selectedLabelIDs.push(id);
		else this.$store.exporter.selectedLabelIDs.splice(this.$store.exporter.selectedLabelIDs.indexOf(id), 1);
	}
	
	public toggleAnimatedText(id:string){
		this.animatedTextStates[id] = !this.animatedTextStates[id];
		if(this.animatedTextStates[id]) this.$store.exporter.selectedAnimatedTextIDs.push(id);
		else this.$store.exporter.selectedAnimatedTextIDs.splice(this.$store.exporter.selectedAnimatedTextIDs.indexOf(id), 1);
	}

	public toggleCustomTrain(id:string){
		this.customTrainStates[id] = !this.customTrainStates[id];
		if(this.customTrainStates[id]) this.$store.exporter.selectedCustomTrainIDs.push(id);
		else this.$store.exporter.selectedCustomTrainIDs.splice(this.$store.exporter.selectedCustomTrainIDs.indexOf(id), 1);
	}

	public toggleTimer(id:string){
		this.timerStates[id] = !this.timerStates[id];
		if(this.timerStates[id]) this.$store.exporter.selectedTimerIDs.push(id);
		else this.$store.exporter.selectedTimerIDs.splice(this.$store.exporter.selectedTimerIDs.indexOf(id), 1);
	}

	public toggleEndingCreditsSlot(id:string){
		this.endingCreditSlotStates[id] = !this.endingCreditSlotStates[id];
		if(this.endingCreditSlotStates[id]) this.$store.exporter.selectedEndingCreditsSlotIDs.push(id);
		else this.$store.exporter.selectedEndingCreditsSlotIDs.splice(this.$store.exporter.selectedEndingCreditsSlotIDs.indexOf(id), 1);
	}
	
	public toggleBingoGrid(id:string){
		this.bingoGridStates[id] = !this.bingoGridStates[id];
		if(this.bingoGridStates[id]) this.$store.exporter.selectedBingoGridIDs.push(id);
		else this.$store.exporter.selectedBingoGridIDs.splice(this.$store.exporter.selectedBingoGridIDs.indexOf(id), 1);
	}

}
export default toNative(ParamsExporter);
</script>

<style scoped lang="less">
.paramsexporter{
	gap: 1em;
	display: flex;
	flex-direction: column;

	.splitter {
		margin: 1em 0;
	}

	.itemList {
		gap: 1px;
		display: flex;
		flex-direction: column;
		.rowItem {
			box-shadow: 0px 1px 1px rgba(0,0,0,0.25);
			background-color: var(--background-color-fadest);
			border-radius: .5em;
			padding: 0;
			gap: .5em;
			display: flex;
			flex-direction: row;
			min-height: 1.5em;
			position: relative;
			transition: background-color .1s;
			cursor: pointer;

			&:hover {
				background-color: var(--background-color-fader);
			}
			.label {
				flex-grow: 1;
				gap: .5em;
				display: flex;
				flex-direction: row;
				align-items: center;
				color: var(--color-text);
				padding: 0;
				margin-left: .5em;
				.icon {
					height: 1.5em;
					width: 1.5em;
					padding: 0.25em;
					object-fit: fill;
					margin-right: .5em;
				}

				.username {
					padding-left: .5em;
				}

				.small {
					font-style: italic;
					font-size: .9em;
					margin-left: -.5em;
				}
				.badgeList {
					gap: .5em;
					display: flex;
					flex-direction: row;
					.badge {
						padding: .25em;
						height: 2em;
					}
				}
			}
			.icon {
				height: 1em;
			}

			.heatScreen {
				pointer-events: none;
				flex-grow: 1;
			}
			.toggle, .deleteBt, .badgeList {
				padding: 0 .5em;
				border-left: 1px solid var(--color-dark-light);
			}
			.deleteBt {
				display: flex;
				align-items: center;
			}
		}
		&.heat, &.badges, &.users {
			gap: 1em;
			width: 100%;
			flex-direction: row;
			flex-wrap: wrap;
			align-items: center;
			justify-content: center;
			.rowItem {
				max-width: 200px;
				flex-grow: 1;
				align-items: center;
			}
		}

		&.badges {
			.rowItem {
				max-width: fit-content;
			}
		}

		&.users {
			.rowItem {
				padding: .5em;
				max-width: fit-content;
			}
		}
	}

	.count {
		font-variant-numeric: tabular-nums;
	}
}
</style>