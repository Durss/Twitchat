<template>
	<div class="triggeractionhttpplaceholder">

		<div class="card-item placeholderList">
			<p icon="add">{{ $t("triggers.actions.http_ws.extract_data") }}</p>
			<div v-for="(item, index) in placeholderList" class="item">
				<!-- <select v-model="item.type">
					<option value="text">{{ $t("triggers.actions.http_ws.extract_data_type_text") }}</option>
					<option value="json">{{ $t("triggers.actions.http_ws.extract_data_type_json") }}</option>
				</select> -->
				<div class="jsonpath" v-if="item.type == 'json'">
					<input type="text" maxlength="500" v-model="item.path" :placeholder="$t('triggers.actions.http_ws.extract_data_jsonpath')">
					<TTButton class="helpBt" icon="help" secondary type="link" target="_blank" href="https://wikipedia.org/wiki/JSONPath" />
				</div>
				<PlaceholderField class="input-field" :class="{error:isDuplicate(item)}" v-model="item.placeholder" :maxLength="30" />
				<TTButton class="deleteBt" icon="trash" alert @click="removeOutputPlacholder(index)" />
			</div>
			<TTButton icon="add" @click="addOutputPlaceholder" v-if="(placeholderList || []).length < 50">{{ $t("triggers.actions.http_ws.add_placeholder_bt") }}</TTButton>
		</div>


		<i18n-t scope="global" class="card-item info" tag="div"
		keypath="triggers.actions.common.custom_placeholder_example"
		v-if="placeholderList && placeholderList.length > 0">
			<template #PLACEHOLDER>
				<template v-for="(p, index) in placeholderList">
					<mark v-click2Select>{{"{" + p.placeholder.toUpperCase() + "}"}}</mark>
					<template v-if="index < placeholderList.length-1">{{ $t("global.or") }}</template>
				</template>
			</template>
		</i18n-t>
	</div>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import type { IHttpPlaceholder } from '@/types/TriggerActionDataTypes';
import {toNative,  Component, Vue, Prop } from 'vue-facing-decorator';
import contenteditable from 'vue-contenteditable';
import PlaceholderField from '@/components/PlaceholderField.vue';

@Component({
	components:{
		TTButton,
		contenteditable,
		PlaceholderField,
	},
	emits:[],
})
class TriggerActionHttpPlaceholder extends Vue {

	@Prop({required:true, type:Object, default:[]})
	public placeholderList:IHttpPlaceholder[] = [];

	/**
	 * Check if given item has a duplicate placeholder
	 * @param item
	 */
	public isDuplicate(item:IHttpPlaceholder):boolean {
		for (const entry of this.placeholderList) {
			if(entry === item) continue;
			if(entry.placeholder.toUpperCase().trim() === item.placeholder.toUpperCase().trim()) return true;
		}

		return false;
	}

	/**
	 * Creates an output placeholder
	 */
	public addOutputPlaceholder():void {
		this.placeholderList.push({
			type:"json",
			path:"",
			placeholder:"",
		})
	}

	/**
	 * Deletes an output placeholder
	 */
	public removeOutputPlacholder(index:number):void {
		this.placeholderList.splice(index, 1);
	}

}
export default toNative(TriggerActionHttpPlaceholder);
</script>

<style scoped lang="less">
.triggeractionhttpplaceholder{
	gap: .5em;
	display: flex;
	flex-direction: column;

	.placeholderList {
		gap: .5em;
		display: flex;
		flex-direction: column;
	}

	.item {
		gap: .5em;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		border-radius: var(--border-radius);
		&:hover {
			background-color: var(--background-color-fadest);
		}
		&>*:nth-child(2) {
			flex: 1;
		}
		.jsonpath {
			display: flex;
			flex-direction: row;
			flex-basis: 60%;
			&>* {
				border-radius: 0;
				&:first-child {
					border-top-left-radius: var(--border-radius);
					border-bottom-left-radius: var(--border-radius);
				}
				&:last-child {
					border-top-right-radius: var(--border-radius);
					border-bottom-right-radius: var(--border-radius);
				}
			}
			.helpBt {
				flex-shrink: 0;
			}
		}
		.deleteBt {
			flex-shrink: 0;
			flex-basis: 1.5em;
		}
		input {
			flex-grow: 1;
			flex-shrink: 1;
			display:inline-block;
			min-width:0;
			width: 100%;
			min-width: 8em;
		}
	}
}
</style>
