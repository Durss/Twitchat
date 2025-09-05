<template>
	<div class="triggerexportform card-item">
		<p><Icon name="share" class="icon" />Make selected triggers sharable</p>
		<form @submit.prevent="submit">
			<input type="text" placeholder="export name" v-model="exportName" required maxlength="20" />

			<textarea rows="3" v-model="description" placeholder="Enter a description of the imported data" maxlength="1000"></textarea>

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
					<option value="list">list</option>
				</select>
				<TTButton icon="add" small @click="addParam">Add param</TTButton>
			</div>

			<div class="autoDeleteToggle">
				<label for="autoDeleteToggle">Auto delete settings</label> <ToggleButton inputId="autoDeleteToggle" v-model="autoDelete" />
			</div>

			<div class="autoDeleteValue" v-if="autoDelete">
				Auto delete at <input type="datetime-local" v-model="autoDeleteDate" />
			</div>
			
			<TTButton class="submitBt" small icon="checkmark" type="submit" :loading="$store.triggers.exportingSelectedTriggers">Create</TTButton>
		</form>
	</div>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import ToggleButton from '@/components/ToggleButton.vue';
import TTButton from '@/components/TTButton.vue';
import type { TriggerData, TriggerExportData } from '@/types/TriggerActionDataTypes';
import {toNative,  Component, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		Icon,
		TTButton,
		ToggleButton,
	},
	emits:[],
})
class TriggerExportForm extends Vue {

	public description:string = "";
	public exportName:string = "";
	public autoDelete:boolean = false;
	public autoDeleteDate:string = "";
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
		const data:Omit<TriggerExportData, "authorId"> = {
			version: 1,
			triggers,
			info: this.description,
			autoDelete_at: this.autoDeleteDate? new Date(this.autoDeleteDate).getTime() : 0,
			params: this.paramList,
			name: this.exportName,
		};
		if(isNaN(data.autoDelete_at)){
			data.autoDelete_at = 0;
		}
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
	gap: .5em;
	width: fit-content;
	margin: auto;
	.icon {
		height: 1em;
		margin-right: .5em;
		vertical-align: bottom;
	}

	textarea {
		width: 100%;
		resize: vertical;
	}

	.autoDeleteToggle {
		flex: 1;
		gap: 1em;
		display: flex;
		flex-direction: row;
		label {
			flex: 1;
			cursor: pointer;
		}
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
		select {
			font-size: .8em;
		}
	}
	form {
		gap: .5em;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	.submitBt {
		align-self: center;
	}
}
</style>