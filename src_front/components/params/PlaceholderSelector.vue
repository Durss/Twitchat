<template>
	<ToggleBlock small class="placeholderselector"
		:title="$t('global.placeholder_selector_title')"
		:open="false"
	>
		<div class="list">
			<template v-for="(h,index) in placeholders" :key="h.tag+index">
				<button @click="insert(h)" v-tooltip="$t('global.placeholder_selector_insert')">
					<mark>&#123;{{h.tag}}&#125;</mark>
				</button>
				
				<i18n-t scope="global" :keypath="h.descKey" tag="span">
					<template v-for="(value,name) in h.descReplacedValues ?? {}" v-slot:[name]>
						<mark>{{ value }}</mark>
					</template>
				</i18n-t>
			</template>
		</div>
	</ToggleBlock>
</template>

<script lang="ts">
import ToggleBlock from '@/components/ToggleBlock.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		ToggleBlock,
	},
	emits:["update:modelValue"]
})
export default class PlaceholderSelector extends Vue {

	@Prop
	public placeholders!:TwitchatDataTypes.PlaceholderEntry[];
	@Prop
	public target!:(HTMLInputElement | HTMLTextAreaElement) | Promise<HTMLInputElement | HTMLTextAreaElement>;
	@Prop
	public modelValue!:string;

	/**
	 * Add a token on the text
	 */
	public async insert(h:TwitchatDataTypes.PlaceholderEntry):Promise<void> {
		let target = this.target as HTMLInputElement | HTMLTextAreaElement;
		if((this.target as Promise<HTMLInputElement | HTMLTextAreaElement>).then) {
			target = await(new Promise((resolve)=>{
				(this.target as Promise<HTMLInputElement | HTMLTextAreaElement>).then((input:HTMLInputElement | HTMLTextAreaElement)=>{
					resolve(input);
				});
			}))
		}
		const tag = "{"+h.tag+"}";
		let carretPos = target.selectionStart as number | 0;
		if(!carretPos) carretPos = 0;
		//Insert tag
		const text = target.value.substring(0, carretPos) + tag + target.value.substring(carretPos);
		this.$emit("update:modelValue", text);
	}
}
</script>

<style scoped lang="less">
.placeholderselector{
	font-size: .8em;
	padding-left: 2em;
	:deep(.content){
		background-color: transparent !important;
	}
	.list {
 		display: grid;
		grid-template-columns: .75fr 1fr;
		align-items: stretch;
		grid-gap: 4px;
		&>* {
			background-color: fade(@mainColor_normal, 10%);
			border-radius: .5em;
			padding: 1px;
			&:nth-child(odd) {
				word-break: break-all;
				border-top-right-radius: 0;
				border-bottom-right-radius: 0;
			}
			&:nth-child(even) {
				border-top-left-radius: 0;
				border-bottom-left-radius: 0;
			}

			&:not(:nth-last-child(-n+2)) {
  				margin-bottom: 4px;
			}
		}
		button {
			cursor: pointer;
			text-align: right;
			mark {
				color: var(--mainColor_normal);
				display: inline-block;
			}
			&:hover {
				background-color: fade(@mainColor_normal, 15%);
			}
		}
	}
}
</style>