<template>
	<div class="simpletriggerlist" v-if="triggerList.length > 0 && filteredItemId == ''">
		<div class="item"
		v-for="item in triggerList" :key="item.id"
		@click="$emit('select', item.id)">
			<img class="icon" :src="item.iconURL" v-if="item.iconURL" :style="{backgroundColor:item.iconBG}">
			<Icon class="icon" :name="item.icon" v-else-if="item.icon" />
			<span class="label">{{ item.label }}</span>
		</div>
	</div>

	<div class="item"
	v-else-if="triggerList.length === 1"
	@click="$emit('select', triggerList[0].id)">
		<img class="icon" :src="triggerList[0].iconURL" v-if="triggerList[0].iconURL" :style="{backgroundColor:triggerList[0].iconBG}">
		<Icon class="icon" :name="triggerList[0].icon" v-else-if="triggerList[0].icon" />
		<span class="label">{{ triggerList[0].label }}</span>
	</div>

	<div v-else class="card-item alert deletedTrigger">{{ $t("triggers.missing_trigger") }}</div>
</template>

<script lang="ts">
import Utils from '@/utils/Utils';
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{},
	emits:["select"],
})
export default class SimpleTriggerList extends Vue {

	@Prop({type:String, default:""})
	public filteredItemId!:string;
	
	public triggerList:{id:string, label:string, icon?:string, iconURL?:string, iconBG?:string}[] = [];
	
	public mounted():void {
		//Remove deleted triggers
		const triggers = this.$store("triggers").triggerList;
		
		triggers.forEach(t=> {
			if(this.filteredItemId != "") {
				if(t.id != this.filteredItemId) return;
			}
			let infos = Utils.getTriggerDisplayInfo(t);
			this.triggerList.push({
				id:t.id,
				label: infos.label,
				icon: infos.icon,
				iconURL: infos.iconURL,
				iconBG: infos.iconBgColor,
			})
		})
	}

}
</script>

<style scoped lang="less">
.simpletriggerlist{
	gap: 2px;
	display: flex;
	flex-direction: column;
	max-height: 200px;
	overflow-y: auto;
}
.item {
	gap: .5em;
	display: flex;
	flex-direction: row;
	align-items: center;
	flex-shrink: 0;
	background-color: var(--background-color-fadest);
	transition: background-color .2s;
	cursor: pointer;
	border-radius: var(--border-radius);
	padding: 2px;
	padding-right: 5px;
	font-size: .9em;
	.icon {
		height: 1.5em;
		width: 1.5em;
		border-radius: var(--border-radius);
		object-fit: contain;
	}
	&:hover {
		background-color: var(--background-color-fader);
	}
}

.deletedTrigger {
	cursor: pointer;
	font-size: .9em;
}
</style>