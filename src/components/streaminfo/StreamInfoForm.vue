<template>
	<div class="streaminfo">
		<div class="dimmer" ref="dimmer" @click="close()"></div>
		<div class="holder" ref="holder">
			<div class="head">
				<span class="title">Stream info</span>
				<Button aria-label="Close prediction form" :icon="$image('icons/cross_white.svg')" @click="close()" class="close" bounce/>
			</div>
			
			<div class="content">
				<ToggleBlock title="Presets" v-if="presets.length > 0" class="presets">
					<div v-for="p in presets" :key="p.id" class="preset">
						<Button class="button" @click="deletePreset(p)" :icon="$image('icons/trash.svg')" data-tooltip="Delete preset" highlight bounce />
						<Button class="button" @click="editPreset(p)" :icon="$image('icons/edit.svg')" data-tooltip="Edit preset" bounce />
						<Button class="button" @click="applyPreset(p)" :title="p.name" data-tooltip="Click to set<br>stream infos" :loading="saving" bounce />
					</div>
				</ToggleBlock>
				

				<div class="content" v-if="loading">
					<img src="@/assets/loader/loader.svg" alt="loading" class="loader">
				</div>

				<ToggleBlock v-else :title="presetEditing? 'Preset: '+presetEditing.name : 'Update infos'"
				:open="presets.length == 0 || forceOpenForm" icon="update">
					<ParamItem class="item" :paramData="param_title" autofocus />
	
					<AutoCompleteForm title="Category" @search="searchCategory" v-slot="{ item }" v-model="categories" :maxItems="1" idKey="id">
						<Button class="autoComplete-item" small :title="item.name" :icon="item.box_art_url" />
					</AutoCompleteForm>
	
					<AutoCompleteForm title="Tags" @search="searchTags" v-slot="{ item }" :delay="0" v-model="tags" :maxItems="5" idKey="tag_id">
						<Button class="autoComplete-item" small :title="item.localization_names['en-us']" />
					</AutoCompleteForm>
					
					<ParamItem class="item" :paramData="param_savePreset" v-if="!presetEditing" />
					
					<div class="actions">
						<Button title="Cancel" class="submitBt" @click="cancelPresetEdit()" :loading="saving" highlight v-if="presetEditing" />
						<Button title="Submit" class="submitBt" @click="updateStreamInfo()" :loading="saving" />
					</div>
				</ToggleBlock>
			</div>
			
		</div>
	</div>
</template>

<script lang="ts">
import type { ParameterData } from '@/types/TwitchatDataTypes';
import gsap from 'gsap/all';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ParamItem from '../params/ParamItem.vue';
import AutoCompleteForm from '../params/AutoCompleteForm.vue';
import TwitchUtils from '@/utils/TwitchUtils';
import type { TwitchDataTypes } from '@/types/TwitchDataTypes';
import type { StreamInfoPreset } from '@/types/TwitchatDataTypes';
import store from '@/store';
import Utils from '@/utils/Utils';
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

	public param_title:ParameterData = {label:"Stream title", value:"", type:"text", placeholder:"title...", maxLength:140};
	public param_savePreset:ParameterData = {label:"Save to presets", value:false, type:"toggle"};
	public param_namePreset:ParameterData = {label:"Preset name", value:"", type:"text", placeholder:"name...", maxLength:50};

	public saving:boolean = false;
	public loading:boolean = true;
	public forceOpenForm:boolean = false;
	public tags:TwitchDataTypes.StreamTag[] = [];
	public categories:TwitchDataTypes.StreamCategory[] = [];
	public presetEditing:StreamInfoPreset|null = null;

	public get presets():StreamInfoPreset[] {
		return store.state.streamInfoPreset;
	}

	public async mounted():Promise<void> {
		this.param_savePreset.children = [this.param_namePreset];
		
		try {
			const infos = await TwitchUtils.getStreamInfos();
			this.param_title.value = infos.title;
			if(infos.game_id) {
				const game = await TwitchUtils.getCategoryByID(infos.game_id);
				game.box_art_url = game.box_art_url.replace("{width}", "52").replace("{height}", "72");
				this.categories = [game];
			}
			const tags = await TwitchUtils.getStreamTags();
			this.tags = tags;
		}catch(error) {
			store.state.alert = "Error loading current stream info";
		}

		this.loading = false;

		gsap.set(this.$refs.holder as HTMLElement, {marginTop:0, opacity:1});
		gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:1});
		gsap.from(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.out"});
	}

	public async close():Promise<void> {
		gsap.killTweensOf([this.$refs.holder, this.$refs.dimmer]);
		gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:0, ease:"sine.in"});
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

	public async searchTags(search:string, callback:(data:unknown[])=>{}):Promise<void> {
		const res = await TwitchUtils.searchTag(search);
		res.sort((a, b) => {
			return a.localization_names['en-us'] > b.localization_names['en-us'] ? 1 : -1;
		});
		callback(res);
	}

	public async updateStreamInfo():Promise<void> {
		this.saving = true;
		if(this.param_savePreset.value === true || this.presetEditing) {
			const preset:StreamInfoPreset = {
				name:this.param_namePreset.value as string,
				id:Utils.guid(),
				title:this.param_title.value as string,
			}
			if(this.categories.length >0) preset.categoryID = this.categories[0].id
			if(this.tags.length >0) preset.tagIDs = this.tags.map(t => t.tag_id);
			if(this.presetEditing) preset.id = this.presetEditing.id;
			store.dispatch("saveStreamInfoPreset", preset)
		}
		//If not editing, update the stream info
		if(!this.presetEditing) {
			try {
				await TwitchUtils.setStreamTags(this.tags.map(t => t.tag_id));
				await TwitchUtils.setStreamInfos(this.param_title.value as string, this.categories[0].id);
			}catch(error) {
				store.state.alert = "Error updating stream info";
			}
		}else {
			this.presetEditing = null;
			this.forceOpenForm = false;
		}
		this.saving = false;
	}

	public cancelPresetEdit():void {
		this.presetEditing = null;
		this.forceOpenForm = false;
	}

	public async deletePreset(p:StreamInfoPreset):Promise<void> {
		store.dispatch("deleteStreamInfoPreset", p);
	}

	public async editPreset(p:StreamInfoPreset):Promise<void> {
		this.loading = true;
		this.forceOpenForm = true;
		this.param_namePreset.value = p.title;
		this.presetEditing = p;
		
		try {
			this.param_title.value = p.title;
			if(p.categoryID) {
				const game = await TwitchUtils.getCategoryByID(p.categoryID);
				game.box_art_url = game.box_art_url.replace("{width}", "52").replace("{height}", "72");
				this.categories = [game];
			}
			const tags = await TwitchUtils.getStreamTags();
			this.tags = tags;
		}catch(error) {
			store.state.alert = "Error loading current stream info";
		}

		this.loading = false;
	}

	public async applyPreset(p:StreamInfoPreset):Promise<void> {
		this.saving = true;
		try {
			await TwitchUtils.setStreamTags(p.tagIDs as string[]);
			await TwitchUtils.setStreamInfos(p.title, p.categoryID as string);
		}catch(error) {
			store.state.alert = "Error updating stream info";
		}
		this.saving = false;
	}

}
</script>

<style scoped lang="less">
.streaminfo{
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	.modal();

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
			}
			.button:nth-child(2) {
				border-radius: 0;
				margin-right: 1px;
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
	}
	:deep(.selected) {
		.button {
			.icon{
				max-height: 4em;
			}
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
}
</style>