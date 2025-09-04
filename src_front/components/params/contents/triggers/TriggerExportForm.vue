<template>
	<div class="triggerexportform card-item">
		<p><Icon name="share" class="icon" />Make selected triggers sharable</p>
		<div class="paramList">
			<div v-for="(param, index) in paramList" :key="index" class="paramItem">
				<div class="head">
					<span class="label">{{ param.valueType }}</span>
					<TTButton icon="trash" @click="removeParam(index)" transparent />
				</div>
				<input type="text" v-model="param.key" placeholder="param key" />
				<input type="text" v-model="param.description" placeholder="param description" />
			</div>
		</div>
		<div class="paramForm">
			<select v-model="paramType">
				<option value="string">string</option>
				<option value="number">number</option>
				<option value="boolean">boolean</option>
			</select>
			<TTButton icon="add" @click="addParam">Add param</TTButton>
		</div>
		<form @submit.prevent="submit">
			<input type="text" placeholder="export name" v-model="exportName" required />
			<TTButton small icon="checkmark" type="submit" :loading="$store.triggers.exportingSelectedTriggers" />
		</form>
	</div>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import TTButton from '@/components/TTButton.vue';
import type { TriggerData, TriggerExportData } from '@/types/TriggerActionDataTypes';
import {toNative,  Component, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		Icon,
		TTButton,
	},
	emits:[],
})
class TriggerExportForm extends Vue {

	public exportName:string = "";
	public paramType:TriggerExportData["params"][number]["valueType"] = "string";
	public paramList:TriggerExportData["params"][number][] = [];

	public submit(){
		const triggers:TriggerData[] = [];
		this.$store.triggers.selectedTriggerIDs.forEach(id => {
			const t = this.$store.triggers.triggerList.find(v=> v.id == id);
			if(t) {
				triggers.push(t);
			}
		});
		const data:TriggerExportData = {
			version: 1,
			triggers,
			params: this.paramList,
		};
		this.$store.triggers.exportSelectedTriggers(this.exportName, data);
	}

	public addParam(){
		this.paramList.push({key:"", description:"", valueType: this.paramType});
	}

	public removeParam(index:number){
		this.paramList.splice(index, 1);
	}
}
export default toNative(TriggerExportForm);
</script>

<style scoped lang="less">
.triggerexportform{
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: .5em;
	width: fit-content;
	margin: auto;
	.icon {
		height: 1em;
		margin-right: .25em;
	}
	.paramList {
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: .5em;
		.paramItem {
			gap: 1px;
			display: flex;
			flex-direction: column;
			border: 1px solid var(--color-light-fade);
			border-radius: var(--border-radius);
			padding: .25em;
			.head {
				display: flex;
				flex-direction: row;
				align-items: center;
				margin-bottom: .25em;
				flex: 1;
				.label {
					flex: 1;
					font-weight: bold;
					text-transform: capitalize;
				}
			}
		}
	}
	.paramForm {
		display: flex;
		flex-direction: row;
		justify-content: center;
		gap: .5em;
		width: fit-content;
		margin: auto;
	}
	form {
		display: flex;
		flex-direction: row;
		justify-content: center;
		&>*{
			border-radius: 0;
		}
		&>*:first-child{
			border-top-left-radius: var(--border-radius);
			border-bottom-left-radius: var(--border-radius);
		}
		&>*:last-child{
			border-top-right-radius: var(--border-radius);
			border-bottom-right-radius: var(--border-radius);
		}
	}
}
</style>