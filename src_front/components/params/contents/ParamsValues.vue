<template>
	<div class="paramsvalues parameterContent">
		<Icon name="placeholder" class="icon" />

		<div class="head">
			<i18n-t scope="global"  tag="p" keypath="values.header">
				<template #LINK_TRIGGER>
					<a @click="openTriggers()" target="_blank">{{ $t("values.header_link_trigger") }}</a>
				</template>
			</i18n-t>
		</div>

		<section v-if="!showForm">
			<Button icon="add" @click="showForm = true">{{ $t('values.addBt') }}</Button>
		</section>

		<section class="card-item" v-if="showForm">
			<form @submit.prevent="createCounter()">
				<ParamItem :paramData="param_title" :errorMessage="$t('values.form.name_conflict')" />
				<ParamItem :paramData="param_value" />
				<ParamItem :paramData="param_placeholder" :errorMessage="$t('values.form.placeholder_conflict')" />
				<div class="ctas">
					<Button type="button" icon="cross" alert @click="cancelForm()">{{ $t('global.cancel') }}</Button>
					<Button type="submit" v-if="!editedCounter" icon="add" :disabled="param_title.value.length == 0">{{ $t('global.create') }}</Button>
					<Button type="submit" v-else icon="edit" :disabled="param_title.value.length == 0 || param_title.error || param_placeholder.error">{{ $t('values.editBt') }}</Button>
				</div>
			</form>
		</section>

		<ToggleBlock class="valueEntry" :open="false"
		v-if="valueEntries.length > 0"
		v-for="entry in valueEntries" :key="entry.value.id"
		:title="entry.value.name">
		
			<template #right_actions>
				<div class="actions">
					<Button class="actionBt" v-tooltip="$t('values.editBt')" icon="edit" @click.stop="editValue(entry.value)" />
					<Button class="actionBt" alert icon="trash" @click.stop="deleteValue(entry)" />
				</div>
			</template>

			<div class="content">
				<ParamItem class="value"
					:paramData="entry.param"
					@change="onChangeValue(entry)" />
			</div>
		</ToggleBlock>

	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import InfiniteList from '@/components/InfiniteList.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import OverlayCounter from '@/components/overlays/OverlayCounter.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import { reactive, watch } from 'vue';
import { Component, Vue } from 'vue-facing-decorator';
import ParamItem from '../ParamItem.vue';
import type IParameterContent from './IParameterContent';

@Component({
	components:{
		Button,
		ParamItem,
		ToggleBlock,
		InfiniteList,
		OverlayCounter,
	},
	emits:[]
})
export default class ParamsCounters extends Vue implements IParameterContent {

	public showForm:boolean = false;
	public timeoutSearch:number = -1;
	public timeoutEdit:number = -1;
	public editedCounter:TwitchatDataTypes.ValueData|null = null;

	public param_title:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", maxLength:50, labelKey:"values.form.name"};
	public param_value:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", labelKey:"values.form.value"};
	public param_placeholder:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", maxLength:20, labelKey:"values.form.placholder", icon:"broadcast", tooltipKey:"values.form.placholder_tt", allowedCharsRegex:"A-z0-9_"};


	public get valueEntries():ValueEntry[] {
		const list = this.$store("values").valueList;
		return list.map((v):ValueEntry => {
			return {
					value:v,
					param:reactive({type:'string', value:v.value, labelKey:'values.form.value'})
				}
		});
	}

	public openTriggers():void {
		this.$store("params").openParamsPage(TwitchatDataTypes.ParameterPages.TRIGGERS);
	}

	public getUserFromID(id:string):TwitchatDataTypes.TwitchatUser {
		return this.$store("users").getUserFrom("twitch", this.$store("auth").twitch.user.id, id);
	}

	public openOverlays():void {
		this.$store("params").openParamsPage(TwitchatDataTypes.ParameterPages.OVERLAYS);
	}

	public mounted(): void {

		watch(()=> this.param_title.value, ()=> {
			const values = this.$store("values").valueList;
			const name = this.param_title.value.toLowerCase();
			let exists = false;
			for (let i = 0; i < values.length; i++) {
				const c = values[i];
				if(c.id == this.editedCounter?.id) continue;
				if(c.name.toLowerCase() === name) {
					exists = true;
					continue;
				}
			}
			this.param_title.error = exists;
		})

		watch(()=> this.param_placeholder.value, ()=> {
			if(!this.param_placeholder.value) {
				this.param_placeholder.error = false;
				return;
			}
			//Check if a placeholder with the same name already exists
			const values = this.$store("values").valueList;
			const placeholder = this.param_placeholder.value.toLowerCase();
			let exists = false;
			for (let i = 0; i < values.length; i++) {
				const c = values[i];
				if(c.id == this.editedCounter?.id) continue;
				if(c.placeholderKey.toLowerCase() === placeholder) {
					exists = true;
					continue;
				}
			}
			this.param_placeholder.error = exists;
		})
	}

	public onNavigateBack(): boolean { return false; }

	/**
	 * Create a new Value
	 */
	public createCounter(): void {
		let placeholderKey = this.param_placeholder.value;
		if(!placeholderKey){
			//No placeholder define, create a default one from the value's name
			placeholderKey = Utils.slugify(this.param_title.value).toUpperCase();
			//Load all placeholders
			let hashmap:{[key:string]:boolean} = {};
			for (let i = 0; i < this.valueEntries.length; i++) {
				const c = this.valueEntries[i];
				if(this.editedCounter && c.value.id == this.editedCounter.id) continue;
				hashmap[c.value.placeholderKey] = true;
			}
			//If a placeholder with the same name exists, add an increment suffix
			//until a slot is available
			if(hashmap[placeholderKey]) {
				let index = 1;
				while(hashmap[placeholderKey+"_"+index]) index ++;
				placeholderKey = placeholderKey+"_"+index;
			}
		}

		const data:TwitchatDataTypes.ValueData = {
			id:this.editedCounter? this.editedCounter.id : Utils.getUUID(),
			placeholderKey,
			name:this.param_title.value,
			value:this.param_value.value,
		};
		if(this.editedCounter) {
			this.editedCounter = null;
			this.$store("values").updateValue(data.id, data);
		}else{
			this.$store("values").addValue(data);
		}
		this.showForm = false;
		this.cancelForm();
	}

	/**
	 * Called when editing the value of an existing value
	 */
	public onChangeValue(entry:ValueEntry):void {
		clearTimeout(this.timeoutEdit);
		this.timeoutEdit = setTimeout(() => {
			this.$store("values").updateValue(entry.value.id, {value:entry.param.value});
		}, 250);
	}

	/**
	 * Called when requesting to delete a value
	 * @param entry 
	 */
	public deleteValue(entry:ValueEntry):void {
		this.$confirm(this.$t("values.delete_confirm.title"), this.$t("values.delete_confirm.desc")).then(()=>{
			this.$store("values").delValue(entry.value);
		}).catch(()=>{/* ignore */});
	}

	/**
	 * Start a value edition
	 */
	public editValue(c:TwitchatDataTypes.ValueData):void {
		this.editedCounter = c;
		this.showForm = true;
		this.param_title.value = c.name;
		this.param_value.value = c.value;
		this.param_placeholder.value = c.placeholderKey;
	}

	/**
	 * Called when canceling value edition
	 */
	public cancelForm():void {
		this.editedCounter = null;
		this.showForm = false;
		this.param_title.value = "";
		this.param_value.value = "";
		this.param_placeholder.value = "";
		this.param_placeholder.value = "";

	}

}

interface ValueEntry {
    param: TwitchatDataTypes.ParameterData<string, unknown, unknown>;
    value: TwitchatDataTypes.ValueData;
}

</script>

<style scoped lang="less">
.paramsvalues{

	section {
		display: flex;
		flex-direction: column;
		gap: .5em;
		max-width: 400px;

		form {
			display: flex;
			flex-direction: column;
			gap: .25em;
			.ctas {
				display: flex;
				flex-direction: row;
				flex-wrap: wrap;
				justify-content: space-evenly;
			}

			.errorDetails {
				text-align: center;
				margin-top: -.25em;
				&.shrink {
					margin-left: 1.5em;
				}
				.text {
					//Text is inside a sub holder so we can set its font-size without
					//it impacting the margin-left of the holder specified in "em" unit
					font-size: .8em;
				}
			}
		}
	}

	.valueEntry {
		// width: 100%;
		width: calc(100% - 2em);
		max-width: 400px;
		margin: auto;
		.actions {
			gap: .25em;
			display: flex;
			flex-direction: row;
			align-items: center;
			margin: calc(-.5em - 1px);
			align-self: stretch;
			.actionBt {
				width: 1.5em;
				min-width: 1.5em;
				border-radius: 0;
				align-self: stretch;
				&:last-child {
					margin-left: -.25em;//avoid gap between buttons without putting them in a dedicated container
				}
			}
		}
		:deep(h2) {
			text-align: left;
			margin-right: 1em;
		}

	}
}
</style>