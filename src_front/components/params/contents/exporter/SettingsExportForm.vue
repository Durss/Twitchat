<template>
	<div class="triggerexportform card-item">
		<!-- <p><Icon name="share" class="icon" />Make selected triggers sharable</p> -->
		<form @submit.prevent="submit">
			<ParamItem noBackground :paramData="param_name" v-model="exportName" />

			<ParamItem noBackground :paramData="param_description" v-model="description" />
			
			<div class="paramList" v-if="paramList.length > 0">
				<div v-for="(param, index) in paramList" :key="index" class="paramItem">
					<div class="head">
						<span class="label">{{ param.valueType }}</span>
						<TTButton icon="trash" @click="removeParam(index)" transparent />
					</div>
					<input type="text" v-model="param.key" placeholder="param key" />
					<input type="text" v-model="param.description" placeholder="param description" />

					<ParamItem noBackground :paramData="param_list" v-model="param.listItems" v-if="param.valueType === 'list'" />
				</div>
			</div>

			<div class="paramForm">
				<select v-model="paramType" @change="addParam">
					<option value="" disabled>+ Add param type</option>
					<option value="string">string</option>
					<option value="number">number</option>
					<option value="boolean">boolean</option>
					<option value="list">list</option>
				</select>
				<!-- <TTButton icon="add" small @click="addParam">Add param</TTButton> -->
			</div>

			<div class="block">
				<div class="autoDeleteToggle">
					<label for="autoDeleteToggle">Auto delete settings</label> <ToggleButton inputId="autoDeleteToggle" v-model="autoDelete" />
				</div>
	
				<div class="autoDeleteValue" v-if="autoDelete">
					<label for="autoDeleteDate">Auto delete at</label> <input type="datetime-local" id="autoDeleteDate" v-model="autoDeleteDate" />
				</div>
			</div>

			<div class="block">
				<div class="protectToggle">
					<label for="protectToggle">Protect with password</label> <ToggleButton inputId="protectToggle" v-model="protect" />
				</div>

				<div class="protectPass" v-if="protect">
					<p class="info">Settings will be encrypted with no way to recover them if you lose your password.</p>
					<label for="protectPass">Password</label> <input type="password" id="protectPass" v-model="password" />
				</div>
			</div>
			
			<TTButton class="submitBt" small icon="checkmark" type="submit"
			:disabled="!canSubmit"
			:loading="$store.exporter.exportingSelectedSettings">Create</TTButton>

			<div v-if="result === false" class="card-item alert">Export failed :(</div>
			<div v-else-if="result != null" class="card-item primary result">
				<p class="head"><Icon name="checkmark" /> Export complete!</p>
				<p>Use this command to import the settings on another account:</p>
				<div class="card-item dark command">
					<p v-click2Select>/__import__ {{ result }}</p>
					<TTButton icon="copy" transparent :copy="'/__import__ '+result" />
				</div>
			</div>
		</form>
	</div>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import ToggleButton from '@/components/ToggleButton.vue';
import TTButton from '@/components/TTButton.vue';
import type { SettingsExportData } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, toNative, Vue } from 'vue-facing-decorator';
import { ParamItem } from '../../ParamItem.vue';

@Component({
	components:{
		Icon,
		TTButton,
		ParamItem,
		ToggleButton,
	},
	emits:[],
})
class SettingsExportForm extends Vue {

	public description:string = "";
	public exportName:string = "";
	public password:string = "";
	public protect:boolean = false;
	public autoDelete:boolean = false;
	public autoDeleteDate:string = "";
	public paramType:SettingsExportData["params"][number]["valueType"]|"" = "";
	public paramList:SettingsExportData["params"][number][] = [];
	public result:string|false|null = null;

	public param_name:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", placeholder:"Enter export name", label:"Name", allowedCharsRegex:"a-z0-9_-", maxLength:20};
	public param_description:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", longText:true, placeholder:"Enter export description", label:"Description", maxLength:1000};
	public param_list:TwitchatDataTypes.ParameterData<string, string> = {type:"editablelist", value:"", placeholder:"Option list...", max:100, maxLength:500};

	public get canSubmit():boolean{
		if(this.exportName.trim().length == 0) return false;
		if(this.protect && this.password.trim().length == 0) return false;
		if(this.$store.exporter.selectedTimerIDs.length === 0
			&& this.$store.exporter.selectedTriggerIDs.length === 0
			&& this.$store.exporter.selectedCounterIDs.length === 0
			&& this.$store.exporter.selectedValueIDs.length === 0
			&& this.$store.exporter.selectedLabelIDs.length === 0
			&& this.$store.exporter.selectedAnimatedTextIDs.length === 0
			&& this.$store.exporter.selectedCustomTrainIDs.length === 0
			&& this.$store.exporter.selectedEndingCreditsSlotIDs.length === 0
			&& this.$store.exporter.selectedBingoGridIDs.length === 0
		) return false;
		return true;
	}

	public async submit(){
		this.result = await this.$store.exporter.exportSelectedSettings(
			this.exportName,
			this.description,
			this.autoDelete? this.autoDeleteDate : undefined,
			this.paramList,
			this.protect? this.password : undefined
		);
	}

	public addParam(){
		if(this.paramType == "") return;
		this.paramList.push({key:"", description:"", valueType: this.paramType});
		this.paramType = "";
	}

	public removeParam(index:number){
		this.paramList.splice(index, 1);
	}
}
export default toNative(SettingsExportForm);
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

	.autoDeleteToggle, .protectToggle {
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

	.block {
		gap: .25em;
		display: flex;
		flex-direction: column;
		&>*:not(:first-child) {
			margin-left: 1em;
			position: relative;
			&::before {
				position: absolute;
				left: -1em;
				top: .1em;
				font-size: 1em;
				content: "⤷";
				display: block;
			}
		}
	}
	
	.protectPass {
		.info {
			font-style: italic;
			font-size: .8em;
			max-width: 350px;
		}
	}

	.result {
		gap: .5em;
		display: flex;
		flex-direction: column;
		.head {
			font-size: 1.25em;
			font-weight: bold;
			text-align: center;
		}
		.command {
			display: flex;
			align-items: center;
			flex-direction: row;
			p {
				flex-grow: 1;
				text-align: center;
			}
		}
	}
}
</style>