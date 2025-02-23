<template>
	<component tag="div" :is="popoutMode !== false? 'tooltip' : 'ToggleBlock'" small
	:title="$t('global.placeholder_selector_title')"
	:open="false"
	:inlinePositioning='false'
	:maxWidth="600"
	:maxHeight="200"
	interactive
	:interactiveDebounce="1000"
	:theme="$store.common.theme"
	:appendTo='tooltipTarget'
	:trigger="popoutMode !== false? 'click' : 'mouseenter'"
	:class="classes">
		<template #default>
			<button class="tooltipOpener"><Icon name="placeholder" /></button>
		</template>
		<template #content>

			<input class="placeholderSelector_searchField" type="text"
			v-if="search || localPlaceholders.length + globalPlaceholders.length + globalPlaceholderCategories.length > 5"
			v-model="search"
			:placeholder="$t('global.search_placeholder')"
			@keydown.capture.stop="onKeyUp($event)">

			<div :class="contentClasses">
				<div class="list" v-if="localPlaceholders.length > 0">
					<template v-for="(h,index) in localPlaceholders" :key="h.tag+index">
						<button type="button" @click="$event => insert(h, $event)"
							v-tooltip="copyMode !== false? $t('global.copy') : $t('global.placeholder_selector_insert')">&#123;{{h.tag}}&#125;</button>

						<i18n-t scope="global" :keypath="h.descKey" tag="span">
							<template v-for="(value,name) in h.descReplacedValues ?? {}" v-slot:[name]>
								<mark>{{ value }}</mark>
							</template>
						</i18n-t>
					</template>
				</div>

				<ToggleBlock class="global" small v-if="(globalPlaceholders.length + globalPlaceholderCategories.length) > 0" :open="search.length > 0"
				noBackground
				:title="$t('global.placeholder_selector_global')">
					<div class="list">
						<template v-for="(h,index) in globalPlaceholders" :key="h.tag+index">
							<button type="button" @click="$event => insert(h, $event)"
								v-tooltip="copyMode !== false? $t('global.copy') : $t('global.placeholder_selector_insert')">&#123;{{h.tag}}&#125;</button>

							<i18n-t scope="global" :keypath="h.descKey" tag="span">
								<template v-for="(value,name) in h.descReplacedValues ?? {}" v-slot:[name]>
									<mark>{{ value }}</mark>
								</template>
							</i18n-t>
						</template>
					</div>

					<ToggleBlock class="global" v-for="c in globalPlaceholderCategories" :key="c.key" small :open="search.length > 0"
					noBackground
					:title="$t('global.placeholder_selector_categories.'+c.key)">
						<div class="list">
							<template v-for="(h,index) in c.entries" :key="h.tag+index">
								<button type="button" @click="$event => insert(h, $event)"
									v-tooltip="copyMode !== false? $t('global.copy') : $t('global.placeholder_selector_insert')">&#123;{{h.tag}}&#125;</button>

								<i18n-t scope="global" :keypath="h.descKey" tag="span">
									<template v-for="(value,name) in h.descReplacedValues ?? {}" v-slot:[name]>
										<mark>{{ value }}</mark>
									</template>
								</i18n-t>
							</template>
						</div>
					</ToggleBlock>
				</ToggleBlock>
			</div>
		</template>
	</component>
</template>

<script lang="ts">
import ToggleBlock from '@/components/ToggleBlock.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import { gsap } from 'gsap';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';
import Icon from '../Icon.vue';

@Component({
	components:{
		Icon,
		ToggleBlock,
	},
	emits:["update:modelValue", "insert"]
})
class PlaceholderSelector extends Vue {

	@Prop
	public placeholders!:TwitchatDataTypes.PlaceholderEntry[];

	@Prop
	public target!:(HTMLInputElement | HTMLTextAreaElement) | Promise<HTMLInputElement | HTMLTextAreaElement>;

	@Prop
	public modelValue!:string;

	@Prop({default:false})
	public copyMode!:boolean;

	@Prop({default:false})
	public popoutMode!:boolean;

	public search:string = "";

	public get classes():string[] {
		const res:string[] = ["placeholderselector"];
		if(this.popoutMode !== false) res.push("popoutMode");
		return res;
	}

	public get contentClasses():string[] {
		const res:string[] = ["tooltipContent"];
		if(this.popoutMode !== false) res.push("popoutMode");
		return res;
	}

	public get tooltipTarget() {
		return document.body;
	}

	public get localPlaceholders():TwitchatDataTypes.PlaceholderEntry[]{
		const search = this.search.toLowerCase().trim();
		return this.placeholders.filter(v=>v.globalTag !== true
										&& v.private !== true
										&& (
											!this.search
											|| v.tag.toLowerCase().indexOf(search) > -1
											|| this.$t(v.descKey).toLowerCase().indexOf(search) > -1
										));
	}

	public get globalPlaceholders():TwitchatDataTypes.PlaceholderEntry[]{
		const search = this.search.toLowerCase().trim();
		const list = this.placeholders.filter(v=>v.globalTag === true
												&& !v.category
												&& v.private !== true
												&& (
													!this.search
													|| v.tag.toLowerCase().indexOf(search) > -1
													|| this.$t(v.descKey).toLowerCase().indexOf(search) > -1
												)
											).sort((a,b) => a.tag.length - b.tag.length);

		return list;
	}

	public get globalPlaceholderCategories():{key:string, entries:TwitchatDataTypes.PlaceholderEntry[]}[]{
		const search = this.search.toLowerCase().trim();
		const list = this.placeholders.filter(v=>v.globalTag === true
											&& v.category
											&& v.private !== true
											&& (
												!this.search
												|| v.tag.toLowerCase().indexOf(search) > -1
												|| this.$t(v.descKey).toLowerCase().indexOf(search) > -1
											)).sort((a,b)=> {
			if((a.category || "") < (b.category || "")) return -1;
			if((a.category || "") > (b.category || "")) return 1;
			return 0;
		});

		if(list.length === 0) return [];

		const categories:{key:string, entries:TwitchatDataTypes.PlaceholderEntry[]}[] = [];
		let currentCategory:{key:string, entries:TwitchatDataTypes.PlaceholderEntry[]} = { key:list[0].category!, entries:[list[0]]};
		for (let i = 1; i < list.length; i++) {
			const el = list[i];
			if(el.category != currentCategory.key) {
				categories.push(currentCategory);
				currentCategory = {key:el.category!, entries:[]};
			}
			currentCategory.entries.push(el);
		}
		categories.push(currentCategory);

		return categories;
	}

	/**
	 * Add a token on the text
	 */
	public async insert(h:TwitchatDataTypes.PlaceholderEntry, event:MouseEvent):Promise<void> {
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
			this.$emit("update:modelValue", this.modelValue+"{"+h.tag+"}");
			this.$emit("insert", "{"+h.tag+"}");
		}

		if(this.copyMode !== false) {
			Utils.copyToClipboard("{"+h.tag+"}");
		}
		gsap.fromTo(event.target, {scaleY:1.5, filter:"brightness(5)"}, {scaleY:1, filter:"brightness(1)", duration:.25, ease:"sine.out"});
	}

	/**
	 * Clear search on Escape
	 */
	public onKeyUp(event:KeyboardEvent):void {
		if(event.key == 'Escape') this.search = "";
	}
}
export default toNative(PlaceholderSelector);
</script>

<style lang="less">
.placeholderSelector_searchField {
	margin: 0 auto;
	margin-bottom: .5em;
	display: block;
	max-width: unset;
	min-width: unset;
	outline: 1ps solid red;
}
.tooltipContent {
	.global {
		margin-top: .25em;
	}

	&.popoutMode {
		width: 450px;
		max-width: 100vw;
		max-height: min(100vh, 300px);
		overflow-y: auto;

	}

	.list {
		display: grid;
		grid-template-columns: auto 1fr;
		align-items: stretch;
		column-gap: 1px;
		row-gap: .25em;
		font-size: .8em;
		color: var(--color-text);
		&>* {
			background-color: var(--color-light-fadest);
			border-radius: .5em;
			padding: .25em .5em;
			&:nth-child(odd) {
				max-width: 30vw;
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
		span {
			white-space: pre-line;
			line-height: 1.25em;
		}
	}
}
</style>
<style scoped lang="less">
.placeholderselector{

	&.popoutMode {
		border-top-right-radius: var(--border-radius);
		border-bottom-right-radius: var(--border-radius);
		background-color: var(--color-secondary);
		overflow: hidden;
		display: flex;
		.tooltipOpener{
			color:var(--color-light);
			display: block;
			display: flex;
			align-items: center;
			justify-content: center;
			padding: .25em .1em;
		}
	}
	.tooltipOpener {
		display: none;
		.icon {
			height: 1em;
		}
	}
}
</style>
