<template>
	<ToggleBlock small class="placeholderselector"
		:title="$t('global.placeholder_selector_title')"
		:open="false"
	>
		<div class="list" v-if="localPlaceholders.length > 0">
			<template v-for="(h,index) in localPlaceholders" :key="h.tag+index">
				<button type="button" @click="$event => insert(h, $event)" v-tooltip="copyMode !== false? $t('global.copy') : $t('global.placeholder_selector_insert')">&#123;{{h.tag}}&#125;</button>
				
				<i18n-t scope="global" :keypath="h.descKey" tag="span">
					<template v-for="(value,name) in h.descReplacedValues ?? {}" v-slot:[name]>
						<mark>{{ value }}</mark>
					</template>
				</i18n-t>
			</template>
		</div>

		<ToggleBlock class="global" :title="$t('global.placeholder_selector_global')" small v-if="globalPlaceholders.length > 0">
			<div class="list">
				<template v-for="(h,index) in globalPlaceholders" :key="h.tag+index">
					<button type="button" @click="$event => insert(h, $event)" v-tooltip="copyMode !== false? $t('global.copy') : $t('global.placeholder_selector_insert')">&#123;{{h.tag}}&#125;</button>
					
					<i18n-t scope="global" :keypath="h.descKey" tag="span">
						<template v-for="(value,name) in h.descReplacedValues ?? {}" v-slot:[name]>
							<mark>{{ value }}</mark>
						</template>
					</i18n-t>
				</template>
			</div>
		</ToggleBlock>
	</ToggleBlock>
</template>

<script lang="ts">
import ToggleBlock from '@/components/ToggleBlock.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import { gsap } from 'gsap';
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		ToggleBlock,
	},
	emits:["update:modelValue", "insert"]
})
export default class PlaceholderSelector extends Vue {

	@Prop
	public placeholders!:TwitchatDataTypes.PlaceholderEntry[];

	@Prop
	public target!:(HTMLInputElement | HTMLTextAreaElement) | Promise<HTMLInputElement | HTMLTextAreaElement>;
	
	@Prop
	public modelValue!:string;
	
	@Prop({default:false})
	public copyMode!:boolean;
	
	public get localPlaceholders():TwitchatDataTypes.PlaceholderEntry[]{
		return this.placeholders.filter(v=>v.globalTag !== true);
	}
	
	public get globalPlaceholders():TwitchatDataTypes.PlaceholderEntry[]{
		return this.placeholders.filter(v=>v.globalTag === true);
	}

	/**
	 * Add a token on the text
	 */
	public async insert(h:TwitchatDataTypes.PlaceholderEntry, event:MouseEvent):Promise<void> {
		console.log(this.target);
		if(this.target) {
			let target = this.target as HTMLInputElement | HTMLTextAreaElement;
			//target can be a promise returning the actual target, if it's a promise
			//wait for it to complete.
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
		}else{
			this.$emit("insert", "{"+h.tag+"}");
		}

		if(this.copyMode !== false) {
			Utils.copyToClipboard("{"+h.tag+"}");
		}
		gsap.fromTo(event.target, {scaleY:1.5, filter:"brightness(5)"}, {scaleY:1, filter:"brightness(1)", duration:.25, ease:"sine.out"});
	}
}
</script>

<style scoped lang="less">
.placeholderselector{
	.global {
		margin-top: .25em;
	}

	.list {
 		display: grid;
		grid-template-columns: auto 1fr;
		align-items: stretch;
		column-gap: 1px;
		row-gap: .25em;
		font-size: .8em;
		&>* {
			background-color: var(--color-dark-fadest);
			border-radius: .5em;
			padding: .25em .5em;
			&:nth-child(odd) {
				max-width: 20vw;
				word-break: break-all;
				border-top-right-radius: 0;
				border-bottom-right-radius: 0;
			}
			&:nth-child(even) {
				border-top-left-radius: 0;
				border-bottom-left-radius: 0;
			}
		}
		button {
			display: inline;
			text-align: right;
			font-weight: bold;
			color: var(--color-light);
			background-color: var(--color-primary);
			&:hover {
				background-color: var(--color-primary-light);
			}
		}
	}
}
</style>