<template>
	<ToggleBlock small class="placeholderselector"
		title="Special placeholders dynamically replaced"
		:open="false"
	>
		<ul class="list">
			<li v-for="(h,index) in placeholders" :key="h.tag+index" @click="insert(h)" data-tooltip="Insert">
				<strong>&#123;{{h.tag}}&#125;</strong>
				{{h.desc}}
			</li>
		</ul>
	</ToggleBlock>
</template>

<script lang="ts">
import ToggleBlock from '@/components/ToggleBlock.vue';
import type { PlaceholderEntry } from '@/types/TwitchatDataTypes';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{
		placeholders:Object,
		target:Object,
		modelValue:String,
	},
	components:{
		ToggleBlock,
	},
	emits:["update:modelValue"]
})
export default class PlaceholderSelector extends Vue {

	public placeholders!:PlaceholderEntry[];
	public target!:(HTMLInputElement | HTMLTextAreaElement) | Promise<HTMLInputElement | HTMLTextAreaElement>;
	public modelValue!:string;

	/**
	 * Add a token on the text
	 */
	public async insert(h:{tag:string, desc:string}):Promise<void> {
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
	.list {
		list-style-type: none;
		// padding-left: 1em;
		li {
			padding: .25em;
			cursor: pointer;
			&:hover {
				background-color: fade(@mainColor_normal, 10%);
			}
			&:not(:last-child) {
				border-bottom: 1px solid @mainColor_normal;
			}
			strong {
				display: inline-block;
				min-width: 82px;
				border-right: 1px solid @mainColor_normal;
			}
		}
	}
}
</style>