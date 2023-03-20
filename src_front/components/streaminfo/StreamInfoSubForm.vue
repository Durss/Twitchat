<template>
	<div class="streaminfosubform">
		<ParamItem class="item" :paramData="param_title" v-model="localTitle" autofocus @change="$emit('update:title', localTitle)" />

		<AutoCompleteForm class="item category"
		:title="$t('stream.form_stream_category')"
		:maxItems="1"
		@search="searchCategory" v-slot="{ item }"
		v-model="localCategories"
		idKey="id">
			<Button class="autoComplete-item" small :title="item.name" :icon="item.box_art_url" />
		</AutoCompleteForm>

		<ParamItem class="item"
		:paramData="param_tags"
		v-model="localTags"
		autofocus
		@change="onTagsUpdate()"
		v-if="(param_tags.value as string[])!.length < 10" />

		<div class="item tagList" v-else>
			<div>{{ $t(param_tags.labelKey!) }}</div>
			<button type="button" class="tagItem" aria-label="delete tag"
			v-for="i in (param_tags.value as string[])"
			@click="deleteTag(i)">
				<span>{{ i }}</span>
				<img src="@/assets/icons/cross.svg" class="icon">
			</button>
		</div>
	</div>
</template>

<script lang="ts">
import type { ITriggerActionPlaceholder } from '@/types/TriggerActionDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import { watch } from 'vue';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import Button from '../Button.vue';
import AutoCompleteForm from '../params/AutoCompleteForm.vue';
import ParamItem from '../params/ParamItem.vue';

@Component({
	components:{
		Button,
		ParamItem,
		AutoCompleteForm,
	},
	emits:["update:title", "update:tags", "update:category"]
})
export default class StreamInfoSubForm extends Vue {

	@Prop({
			type:String,
			default:""
		})
	public title!:string;
	@Prop({
			type:Object,
			default:[]
		})
	public tags!:string[];
	@Prop({
			type:Object,
			default:{}
		})
	public category!:TwitchDataTypes.StreamCategory;
	@Prop({
			type:Boolean,
			default:false
		})
	public triggerMode!:boolean;
	//This is used by the trigger action form.
	@Prop({
			type: Array,
			default:[],
		})
	public placeholderList!:ITriggerActionPlaceholder[];

	public param_title:TwitchatDataTypes.ParameterData	= {value:"", type:"string", maxLength:140};
	public param_tags:TwitchatDataTypes.ParameterData	= {value:[], type:"editablelist"};

	public localTitle:string = "";
	public localTags:string[] = [];
	public localCategories:TwitchDataTypes.StreamCategory[] = [];

	public beforeMount():void {
		this.param_title.labelKey			= 'stream.form_stream_title';
		this.param_title.placeholderKey		= 'stream.form_stream_title_placeholder';
		this.param_tags.labelKey			= 'stream.form_stream_tags';

		// this.param_title.placeholderList	= this.placeholderList;

		watch(()=>this.title, ()=> { this.populate(); })
		watch(()=>this.tags, ()=> { this.populate(); })
		watch(()=>this.category, ()=> { this.populate(); })
		watch(()=>this.localCategories, ()=> {
			const value = this.localCategories.length > 0? this.localCategories[0] : null;
			this.$emit('update:category', value);
		})

		this.populate();
	}

	/**
	 * Search for a category
	 * @param search 
	 * @param callback 
	 */
	public async searchCategory(search:string, callback:(data:unknown[])=>{}):Promise<void> {
		const res = await TwitchUtils.searchCategory(search);
		res.sort((a, b) => {
			return a.name > b.name ? 1 : -1;
		});
		callback(res);
	}

	/**
	 * Delete a tag.
	 * Used by the custom tags list once the maximum count is reached
	 * NOT called when deleting a tag from the <vue-select> instance
	 * @param t 
	 */
	public deleteTag(t:string):void {
		if(!this.param_tags.value) this.param_tags.value = [];
		this.param_tags.value = (this.param_tags.value as string[]).filter(v=> v != t);
		this.localTags = this.param_tags.value;
		this.$emit('update:tags', this.localTags);
	}

	/**
	 * Called when a tag is added
	 */
	public onTagsUpdate():void {
		for (let i = 0; i < this.localTags.length; i++) {
			this.localTags[i] = this.sanitizeTag(this.localTags[i]);
		}
		this.$emit('update:tags', this.localTags)
	}

	/**
	 * Makes sure a tag is valid
	 */
	private sanitizeTag(value:string):string {
		return Utils.replaceDiacritics(value).replace(/[^a-z0-9]/gi, "").substring(0, 25);
	}

	private populate():void {
		this.localTitle = this.param_title.value = this.title;
		this.localTags = this.param_tags.value = this.tags;
		this.localCategories = this.category? [this.category] : [];
	}

}
</script>

<style scoped lang="less">
.streaminfosubform{

	.item {
		margin-top: .5em;
		background-color: fade(@mainColor_normal_extralight, 30%);
		padding: .5em;
		border-radius: .5em;
	}
	
	.autoComplete-item {
		margin-right: .25em;
		margin-bottom: .25em;
		padding: 0;
		padding-right: .25em;
		max-width: 100%;
		:deep(.label) {
			padding: 4px;
			white-space: break-spaces;
		}
		:deep(.icon) {
			height: 100%;
			max-height: 2em;
			margin-right: .25em;
		}

		&:hover {
			&:after {
				width: 1.25em;
				height: 1.25em;
			}
		}
	}
	
	.category {
		display: flex;
		flex-direction: column;
		:deep(.selected) {
			display: inline-block;
			align-self: center;
			margin: 0;
			.button {
				.icon{
					max-height: 4em;
				}
	
				&:after {
					content: "";
					background-image: url("../../assets/icons/trash.svg");
					width: 1em;
					height: 1em;
					background-repeat: no-repeat;
					background-position: center;
					transition: .25s all;
				}
			}
		}
	}

	.tagList {
		margin-top: .8em;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 5px;
		align-items: center;
		.tagItem {
			display: inline;
			background-color: rgb(240, 240, 240);
			color: @mainColor_normal;
			font-size: .9em;
			padding: .25em;
			border-radius: 4px;
			transition: all .25s;

			.icon {
				height: .6em;
				margin-left: .25em;
			}
			&:hover {
				background: @mainColor_normal_extralight;
				// color: @mainColor_light;
			}
		}
	}
	
}
</style>