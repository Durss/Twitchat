<template>
	<div class="triggeractionhttpplaceholder">

		<div class="card-item placeholderList">
			<p icon="add">{{ $t("triggers.actions.http_ws.extract_data") }}</p>
			<div v-for="(item, index) in placeholderList" class="item">
				<select v-model="item.type">
					<option value="text">{{ $t("triggers.actions.http_ws.extract_data_type_text") }}</option>
					<option value="json">{{ $t("triggers.actions.http_ws.extract_data_type_json") }}</option>
				</select>
				<div class="jsonpath" v-if="item.type == 'json'">
					<input type="text" maxlength="500" v-model="item.path" :placeholder="$t('triggers.actions.http_ws.extract_data_jsonpath')">
					<TTButton class="helpBt" icon="help" secondary type="link" target="_blank" href="https://wikipedia.org/wiki/JSONPath" />
				</div>
				<div class="placeholder" :class="{error:isDuplicate(item)}" @click.stop="focusInput('input_'+index)">
					<span>{</span>
					<contenteditable tag="span"
						:ref="'input_'+index"
						:class="{input:true, empty:item.placeholder.length === 0}"
						:contenteditable="true"
						:no-nl="true"
						:no-html="true"
						v-model="item.placeholder"
						@input="limitPlaceholderSize(item)" />
					<span>}</span>
				</div>
				<TTButton class="deleteBt" icon="trash" alert @click="removeOutputPlacholder(index)" />
			</div>
			<TTButton icon="add" @click="addOutputPlaceholder" v-if="(placeholderList || []).length < 50">{{ $t("triggers.actions.http_ws.add_placeholder_bt") }}</TTButton>
		</div>

		<!-- <ParamItem :paramData="param_outputPlaceholder" v-model="action.outputPlaceholder" /> -->

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

@Component({
	components:{
		TTButton,
		contenteditable,
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
		for (let i = 0; i < this.placeholderList.length; i++) {
			const entry = this.placeholderList[i];
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
			type:"text",
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

	public focusInput(id:string):void {
		(this.$refs[id] as typeof contenteditable[])[0].$el.focus();
	}

	/**
	 * Limit the size of the label.
	 * Can't use maxLength because it's a content-editable tag.
	 * @param item
	 */
	public async limitPlaceholderSize(item:IHttpPlaceholder):Promise<void> {
		const sel = window.getSelection();
		if(sel && sel.rangeCount > 0) {
			//Save caret index
			var range = sel.getRangeAt(0);
			let caretIndex = range.startOffset;
			await this.$nextTick();
			//Normalize label and limit its size
			item.placeholder = item.placeholder.toUpperCase().trim().replace(/\W/gi, "").substring(0, 30);
			await this.$nextTick();
			//Reset caret to previous position
			if(range.startContainer.firstChild) range.setStart(range.startContainer.firstChild, Math.min(item.placeholder.length, caretIndex));
		}else{
			item.placeholder = item.placeholder.toUpperCase().trim().replace(/\W/gi, "").substring(0, 30);
		}
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
			// flex-grow: 1;
			// flex-shrink: 1;
			* {
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
		.placeholder {
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: center;
			background: var(--background-color-fader);
			border-radius: var(--border-radius);
			text-transform: uppercase;
			.input {
				margin: 0 .25em;
				min-width: 1em;
				text-align: center;
				cursor: text;
				&.empty::before {
					content: "...";
				}
			}
			span:first-child,
			span:last-child {
				font-size: 1.5em;
			}
			&.error {
				background-color: var(--color-alert-fader);
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
