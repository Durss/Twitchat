<template>
	<div class="streaminfo">
		<div class="holder" ref="holder">
			<div class="head">
				<span class="title">{{ $t("stream.form_title") }}</span>
				<Button :aria-label="$t('stream.closeBt_aria')" :icon="$image('icons/cross.svg')" @click="close()" class="close" bounce/>
			</div>
			
			<div class="content">
				<ToggleBlock :title="$t('stream.presets_title')" v-if="presets.length > 0" class="presets">
					<div v-for="p in presets" :key="p.id" class="preset">
						<Button class="button" @click="deletePreset(p)"
							:icon="$image('icons/trash.svg')"
							:data-tooltip="$t('stream.preset_deleteBt_tt')" highlight bounce />
							
						<Button class="button" @click="editPreset(p)"
							:icon="$image('icons/edit.svg')"
							:data-tooltip="$t('stream.preset_editBt_tt')" bounce />

						<Button class="button" @click="applyPreset(p)"
							:title="p.name"
							:data-tooltip="$t('stream.preset_setBt_tt')" :loading="saving" bounce />
					</div>
				</ToggleBlock>
				

				<div class="content" v-if="loading">
					<img src="@/assets/loader/loader.svg" alt="loading" class="loader">
				</div>

				<ToggleBlock v-else :title="presetEditing? $t('stream.form_title_preset', {TITLE:presetEditing.name}) : $t('stream.form_title_update')"
				:open="presets.length == 0 || forceOpenForm" icon="update">
					<ParamItem class="item" :paramData="param_title" autofocus />
	
					<AutoCompleteForm class="item category" :title="$t('stream.form_stream_category')" @search="searchCategory" v-slot="{ item }" v-model="categories" :maxItems="1" idKey="id">
						<Button class="autoComplete-item" small :title="item.name" :icon="item.box_art_url" />
					</AutoCompleteForm>
	
					<div class="item">
						<label>{{ param_tags.label }}</label>
						<vue-select class="itemSelector" label="label"
							placeholder="tag..."
							v-model="param_tags.listValues"
							:create-option="(v:string) => createTagOption(v)"
							:calculate-position="$placeDropdown"
							appendToBody
							taggable
							multiple
							v-if="param_tags.listValues!.length < 10"
						></vue-select>
						
						<div v-else class="tagList">
							<button type="button" class="tagItem" aria-label="delete tag"
							v-for="i in param_tags.listValues"
							@click="deleteTag(i)">
								<span>{{ i.label }}</span>
								<img src="@/assets/icons/cross.svg" class="icon">
							</button>
						</div>
					</div>
					
					<ParamItem class="item" :paramData="param_savePreset" v-if="!presetEditing" />
					
					<div class="actions">
						<Button :title="$t('global.cancel')" class="submitBt" @click="cancelPresetEdit()" :loading="saving" highlight v-if="presetEditing" />
						<Button :title="$t('global.submit')" class="submitBt" @click="updateStreamInfo()" :loading="saving" />
					</div>
				</ToggleBlock>
			</div>
			
		</div>
	</div>
</template>

<script lang="ts">
import StoreProxy from '@/store/StoreProxy';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import AutoCompleteForm from '../params/AutoCompleteForm.vue';
import ParamItem from '../params/ParamItem.vue';
import ToggleBlock from '../ToggleBlock.vue';

@Options({
	props:{},
	components:{
		Button,
		ParamItem,
		ToggleBlock,
		AutoCompleteForm,
	},
	emits:["close"]
})
export default class StreamInfoForm extends Vue {

	public param_title:TwitchatDataTypes.ParameterData			= {value:"", type:"text", placeholder:"", maxLength:140};
	public param_tags:TwitchatDataTypes.ParameterData			= {value:"", listValues:[], type:"list"};
	public param_savePreset:TwitchatDataTypes.ParameterData		= {value:false, type:"toggle"};
	public param_namePreset:TwitchatDataTypes.ParameterData		= {value:"", type:"text", placeholder:"", maxLength:50};

	public saving:boolean = false;
	public loading:boolean = true;
	public forceOpenForm:boolean = true;
	public categories:TwitchDataTypes.StreamCategory[] = [];
	public presetEditing:TwitchatDataTypes.StreamInfoPreset|null = null;

	public get presets():TwitchatDataTypes.StreamInfoPreset[] {
		return this.$store("stream").streamInfoPreset;
	}

	public beforeMount(): void {
		this.param_title.labelKey			= 'stream.form_stream_title';
		this.param_title.placeholder		= this.$t('stream.form_stream_title_placeholder');
		this.param_savePreset.labelKey		= 'stream.form_save_preset';
		this.param_namePreset.labelKey		= 'stream.form_save_preset_name';
		this.param_namePreset.placeholder	= this.$t('stream.form_save_preset_name_placeholder');
		this.param_tags.labelKey			= 'stream.form_stream_tags';
	}

	public async mounted():Promise<void> {
		this.param_savePreset.children = [this.param_namePreset];

		gsap.set(this.$refs.holder as HTMLElement, {marginTop:0, opacity:1});
		gsap.from(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.out"});

		await Utils.promisedTimeout(250);

		this.populate();
	}

	public async close():Promise<void> {
		gsap.to(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.in", onComplete:()=> {
			this.$emit('close');
		}});
	}

	public async searchCategory(search:string, callback:(data:unknown[])=>{}):Promise<void> {
		const res = await TwitchUtils.searchCategory(search);
		res.sort((a, b) => {
			return a.name > b.name ? 1 : -1;
		});
		callback(res);
	}

	public async updateStreamInfo():Promise<void> {
		this.saving = true;
		if(this.param_savePreset.value === true || this.presetEditing) {
			const preset:TwitchatDataTypes.StreamInfoPreset = {
				name:this.presetEditing?.name ?? this.param_namePreset.value as string,
				id:Utils.getUUID(),
				title:this.param_title.value as string,
			}
			if(this.categories.length >0) preset.categoryID = this.categories[0].id
			if(this.param_tags.listValues
			&& this.param_tags.listValues.length > 0) preset.tags = this.param_tags.listValues.map(v=>v.label!);
			if(this.presetEditing) preset.id = this.presetEditing.id;
			this.$store("stream").saveStreamInfoPreset(preset)
		}
		//If not editing, update the stream info
		if(!this.presetEditing) {
			try {
				const channelId = StoreProxy.auth.twitch.user.id;
				await TwitchUtils.setStreamInfos(this.param_title.value as string, this.categories[0].id, channelId);
			}catch(error) {
				this.$store("main").alert( this.$t("error.stream_info_updating") );
			}
		}else {
			this.presetEditing = null;
			this.forceOpenForm = false;
		}
		this.saving = false;
	}

	public createTagOption(value:string):{label:string, value:string} {
		value = this.sanitizeTag(value);
		return {label: value, value};
	}

	public cancelPresetEdit():void {
		this.presetEditing = null;
		this.forceOpenForm = false;
	}

	public async deletePreset(p:TwitchatDataTypes.StreamInfoPreset):Promise<void> {
		this.$store("stream").deleteStreamInfoPreset(p);
	}

	public async editPreset(p:TwitchatDataTypes.StreamInfoPreset):Promise<void> {
		this.loading = true;
		this.forceOpenForm = true;
		this.presetEditing = p;
		
		try {
			this.param_title.value = p.title;
			if(p.categoryID) {
				const game = await TwitchUtils.getCategoryByID(p.categoryID);
				game.box_art_url = game.box_art_url.replace("{width}", "52").replace("{height}", "72");
				this.categories = [game];
				if(p.tags){
					this.param_tags.listValues = p.tags.map(v=> { return {label:v, value:v}});
				}
			}
		}catch(error) {
			this.$store("main").alert( this.$t("stream.stream_info_preset_edit") );
		}

		this.loading = false;
	}

	public async applyPreset(p:TwitchatDataTypes.StreamInfoPreset):Promise<void> {
		this.saving = true;
		try {
			const channelId = StoreProxy.auth.twitch.user.id;
			await TwitchUtils.setStreamInfos(p.title, p.categoryID as string, channelId, p.tags?.map(v=> this.sanitizeTag(v)));
		}catch(error) {
			this.$store("main").alert( this.$t("error.stream_info_updating") );
		}
		this.saving = false;
		this.populate();
	}

	public deleteTag(p:TwitchatDataTypes.ParameterDataListValue):void {
		if(!this.param_tags.listValues) this.param_tags.listValues = [];
		this.param_tags.listValues = this.param_tags.listValues.filter(v=> v.value != p.value);
	}

	private sanitizeTag(value:string):string {
		return Utils.replaceDiacritics(value).replace(/[^a-z0-9]/gi, "").substring(0, 25);
	}

	private async populate():Promise<void> {
		this.loading = true;
		const channelId = StoreProxy.auth.twitch.user.id;
		try {
			const infos = await TwitchUtils.getStreamInfos(channelId);
			this.param_title.value = infos.title;
			if(infos.game_id) {
				const game = await TwitchUtils.getCategoryByID(infos.game_id);
				game.box_art_url = game.box_art_url.replace("{width}", "52").replace("{height}", "72");
				this.categories = [game];
			}
			this.param_tags.listValues = infos.tags.map(v=> {return {label:v, value:v}});
		}catch(error) {
			this.$store("main").alert( this.$t("error.stream_info_loading") );
		}

		this.loading = false;
	}

}
</script>

<style scoped lang="less">
.streaminfo{
	.modal();

	.item {
		margin-top: .5em;
		background-color: fade(@mainColor_normal_extralight, 30%);
		padding: .5em;
		border-radius: .5em;
	}

	.presets {
		margin-bottom: 1em;
		.preset {
			display: inline-flex;
			flex-direction: row;
			margin-right: .5em;
			margin-bottom: .5em;
			.button:nth-child(1) {
				border-top-right-radius: 0;
				border-bottom-right-radius: 0;
				margin-right: 1px;
				transform-origin: right center;
				width: 1.5em;
				min-width: 1.5em;
			}
			.button:nth-child(2) {
				border-radius: 0;
				margin-right: 1px;
				width: 1.5em;
				min-width: 1.5em;
			}
			.button:nth-child(3) {
				border-top-left-radius: 0;
				border-bottom-left-radius: 0;
				transform-origin: left center;
			}
			.button {
				:deep(.label) {
					white-space: break-spaces;
				}
			}
		}
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
	:deep(.selected) {
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

	.category :deep(.selected) {
		width: 100%;
		.button {
			display: flex;
			margin: auto;
		}
	}


	.loader {
		width: 3em;
		margin: auto;
		display: block;
	}

	.actions {
		display: flex;
		flex-direction: row;
		margin-top: 1em;
		justify-content: center;
		.button {
			&:not(:last-child) {
				margin-right: .5em;
			}
		}
	}

	.itemSelector {
		margin-top: .5em;
	}

	.tagList {
		margin-top: .8em;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 5px;
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
				background: @mainColor_alert;
				color: @mainColor_light;
			}
		}
	}
}
</style>