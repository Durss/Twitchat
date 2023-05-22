<template>
	<div :class="classes">
		<ParamItem class="card-item" :paramData="param_title" v-model="localTitle" autofocus @change="$emit('update:title', localTitle)" />

		<AutoCompleteForm class="card-item category"
		:title="$t('stream.form_stream_category')"
		:maxItems="1"
		@search="searchCategory" v-slot="{ item }"
		v-model="localCategories"
		idKey="id">
			<button class="autoComplete-item">
				<img class="icon" :src="item.box_art_url" alt="">
				<span class="label">{{ item.name }}</span>
			</button>
		</AutoCompleteForm>

		<ParamItem class="card-item"
			:paramData="param_tags"
			v-model="localTags"
			autofocus
			@change="onTagsUpdate()"
			v-if="param_tags.value!.length < 10" />

		<div class="card-item tagList" v-else>
			<div>{{ $t(param_tags.labelKey!) }}</div>
			<button type="button" class="tagItem" aria-label="delete tag"
			v-for="i in param_tags.value"
			@click="deleteTag(i)">
				<span>{{ i }}</span>
				<Icon name="cross" theme="primary" class="icon" />
				<Icon name="alert" class="icon" />
			</button>
		</div>
	</div>
</template>

<script lang="ts">
import type { ITriggerPlaceholder } from '@/types/TriggerActionDataTypes';
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

	@Prop({type:String, default:""})
	public title!:string;

	@Prop({type:Object, default:[]})
	public tags!:string[];

	@Prop({ type:Object, default:{}})
	public category!:TwitchDataTypes.StreamCategory;

	@Prop({type:Boolean, default:false})
	public triggerMode!:boolean;

	//This is used by the trigger action form.
	@Prop({ type: Array, default:[]})
	public placeholderList!:ITriggerPlaceholder[];

	public param_title:TwitchatDataTypes.ParameterData<string>	= {value:"", type:"string", maxLength:140};
	public param_tags:TwitchatDataTypes.ParameterData<string[]>	= {value:[], type:"editablelist"};

	public localTitle:string = "";
	public localTags:string[] = [];
	public localCategories:TwitchDataTypes.StreamCategory[] = [];

	public get classes():string[] {
		let res = ["streaminfosubform"];
		if(this.triggerMode !== false) res.push("embedMode")
		return res;
	}

	public beforeMount():void {
		this.param_title.labelKey			= 'stream.form_stream_title';
		this.param_title.placeholderKey		= 'stream.form_stream_title_placeholder';
		this.param_tags.labelKey			= 'stream.form_stream_tags';

		// this.param_title.placeholderList	= this.placeholderList;

		watch(()=>this.title, ()=> { this.populate(); });
		watch(()=>this.tags, ()=> { this.populate(); });
		watch(()=>this.category, ()=> { this.populate(); });
		watch(()=>this.localCategories, ()=> {
			const value = this.localCategories.length > 0? this.localCategories[0] : null;
			this.$emit('update:category', value);
		});

		if(this.triggerMode !== false) {
			this.param_tags.placeholderList = this.placeholderList;
			this.param_title.placeholderList = this.placeholderList;
		}

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
		this.param_tags.value = this.param_tags.value.filter(v=> v != t);
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
		if(this.triggerMode !== false) {
			//Allow curly brackets and underscores so we can use placeholders as tags
			return Utils.replaceDiacritics(value).replace(/[^a-z0-9{}_]/gi, "").substring(0, 25);
		}
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
	gap: .5em;
	display: flex;
	flex-direction: column;

	:deep(.autocomplete) {
		gap: .5em;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		.autoComplete-item {
			font-size: .8em;
			.icon {
				height: 30px;
			}
		}
	}

	.autoComplete-item {
		padding: 0;
		gap: .5em;
		margin: auto;
		display: flex;
		overflow: hidden;
		align-items: center;
		flex-direction: row;
		border-radius: var(--border-radius);
		background-color: var(--color-secondary);
		.label {
			padding: .5em;
			color: var(--color-light);
			white-space: break-spaces;
		}
		.icon {
			height: 60px;
		}

		&:hover {
			&:after {
				width: 1.25em;
				height: 1.25em;
			}
		}
	
		&:after {
			content: "";
			background-image: url("../../assets/icons/trash.svg");
			width: 1em;
			height: 1em;
			margin-right: .5em;
			background-repeat: no-repeat;
			background-position: center;
			transition: .25s all;
			background-size: contain;
		}
	}

	&.embedMode {
		gap: .25em;
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
			color: var(--color-primary);
			font-size: 1em;
			padding: .25em;
			border-radius: 4px;
			transition: all .25s;

			.icon {
				height: .7em;
				margin-left: .25em;
			}
			&:hover {
				background: var(--color-light-dark);
			}
		}
	}
}
</style>