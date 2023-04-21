<template>
	<div class="streaminfo sidePanel">
		<div class="head">
			<h1 class="title">{{ $t("stream.form_title") }}</h1>
			<CloseButton @click="close()" />
		</div>
		
		<div class="content">
			<ToggleBlock :title="$t('stream.presets_title')" v-if="presets.length > 0" class="presets">
				<div class="list">
					<div v-for="p in presets" :key="p.id" class="preset">
						<Button class="button" @click="deletePreset(p)"
							icon="trash"
							v-tooltip="$t('stream.preset_deleteBt_tt')" />
							
						<Button class="button" @click="editPreset(p)"
							icon="edit"
							v-tooltip="$t('stream.preset_editBt_tt')" />
	
						<Button class="button" @click="applyPreset(p)"
							v-tooltip="$t('stream.preset_setBt_tt')" :loading="saving">{{ p.name }}</Button>
					</div>
				</div>
			</ToggleBlock>
			
		
			<img v-if="loading" src="@/assets/loader/loader.svg" alt="loading" class="loader">

			<ToggleBlock v-else class="form" :title="presetEditing? $t('stream.form_title_preset', {TITLE:presetEditing.name}) : $t('stream.form_title_update')"
			:open="presets.length == 0 || forceOpenForm" icon="update">
				<StreamInfoSubForm v-model:title="title" v-model:tags="tags" v-model:category="category" />
				
				<ParamItem class="item" :paramData="param_savePreset" v-if="!presetEditing" />
				
				<div class="actions">
					<Button :title="$t('global.cancel')" class="submitBt" @click="cancelPresetEdit()" :loading="saving" highlight v-if="presetEditing" />
					<Button :title="$t('global.submit')" class="submitBt" @click="updateStreamInfo()" :loading="saving" />
				</div>
			</ToggleBlock>
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
import { Component, Vue } from 'vue-facing-decorator';
import Button from '../Button.vue';
import AutoCompleteForm from '../params/AutoCompleteForm.vue';
import ParamItem from '../params/ParamItem.vue';
import ToggleBlock from '../ToggleBlock.vue';
import StreamInfoSubForm from './StreamInfoSubForm.vue';
import CloseButton from '../CloseButton.vue';
import AbstractSidePanel from '../AbstractSidePanel.vue';

@Component({
	components:{
		Button,
		ParamItem,
		CloseButton,
		ToggleBlock,
		AutoCompleteForm,
		StreamInfoSubForm,
	},
	emits:["close"]
})
export default class StreamInfoForm extends AbstractSidePanel {

	public param_savePreset:TwitchatDataTypes.ParameterData<boolean>	= {value:false, type:"boolean"};
	public param_namePreset:TwitchatDataTypes.ParameterData<string>		= {value:"", type:"string", placeholder:"", maxLength:50};

	public title:string = "";
	public tags:string[] = [];
	public category:TwitchDataTypes.StreamCategory|null = null;

	public saving:boolean = false;
	public loading:boolean = true;
	public forceOpenForm:boolean = true;
	public presetEditing:TwitchatDataTypes.StreamInfoPreset|null = null;

	public get presets():TwitchatDataTypes.StreamInfoPreset[] {
		return this.$store("stream").streamInfoPreset;
	}

	public beforeMount(): void {
		this.param_savePreset.labelKey		= 'stream.form_save_preset';
		this.param_namePreset.labelKey		= 'stream.form_save_preset_name';
		this.param_namePreset.placeholderKey= 'stream.form_save_preset_name_placeholder';
	}

	public async mounted():Promise<void> {
		this.param_savePreset.children = [this.param_namePreset];

		gsap.set(this.$refs.holder as HTMLElement, {marginTop:0, opacity:1});
		gsap.from(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.out"});

		this.open();

		await Utils.promisedTimeout(250);

		this.populate();
	}

	/**
	 * Updates stream info when submitting form
	 */
	public async updateStreamInfo():Promise<void> {
		this.saving = true;
		if(this.param_savePreset.value === true || this.presetEditing) {
			const preset:TwitchatDataTypes.StreamInfoPreset = {
				name:this.presetEditing?.name ?? this.param_namePreset.value,
				id:Utils.getUUID(),
				title:this.title,
			}
			if(this.category) preset.categoryID = this.category.id
			if(this.tags.length > 0) preset.tags = this.tags.concat();
			if(this.presetEditing) preset.id = this.presetEditing.id;
			this.$store("stream").saveStreamInfoPreset(preset)
		}
		//If not editing, update the stream info
		if(!this.presetEditing) {
			try {
				const channelId = StoreProxy.auth.twitch.user.id;
				await this.$store("stream").setStreamInfos("twitch", this.title, this.category?.id ?? "", channelId, this.tags);
			}catch(error) {
				this.$store("main").alert( this.$t("error.stream_info_updating") );
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

	/**
	 * Delete specified preset
	 * @param p 
	 */
	public async deletePreset(p:TwitchatDataTypes.StreamInfoPreset):Promise<void> {
		this.$store("stream").deleteStreamInfoPreset(p);
	}

	/**
	 * Edit a preset
	 * @param p 
	 */
	public async editPreset(p:TwitchatDataTypes.StreamInfoPreset):Promise<void> {
		this.loading = true;
		this.forceOpenForm = true;
		this.presetEditing = p;
		
		try {
			this.title = p.title;
			if(p.categoryID) {
				const game = await TwitchUtils.getCategoryByID(p.categoryID);
				game.box_art_url = game.box_art_url.replace("{width}", "52").replace("{height}", "72");
				this.category = game;
				if(p.tags){
					this.tags = p.tags.concat();
				}
			}
		}catch(error) {
			this.$store("main").alert( this.$t("stream.stream_info_preset_edit") );
		}

		this.loading = false;
	}

	/**
	 * Applies a preset
	 * @param p 
	 */
	public async applyPreset(p:TwitchatDataTypes.StreamInfoPreset):Promise<void> {
		this.saving = true;
		try {
			const channelId = StoreProxy.auth.twitch.user.id;
			await this.$store("stream").setStreamInfos("twitch", p.title, p.categoryID as string, channelId, p.tags);
		}catch(error) {
			this.$store("main").alert( this.$t("error.stream_info_updating") );
		}
		this.saving = false;
		this.populate();
	}

	/**
	 * Populate form with current stream info
	 */
	private async populate():Promise<void> {
		this.loading = true;
		const channelId = StoreProxy.auth.twitch.user.id;
		try {
			let [infos] = await TwitchUtils.loadCurrentStreamInfo([channelId]);
			let title:string = "";
			let gameId:string = "";
			let tags:string[] = [];
			if(infos) {
				title = infos.title;
				gameId = infos.game_id;
				tags = infos.tags;
			}else{
				//Fallback to channel info if we're not live
				const [chanInfos] = await TwitchUtils.loadChannelInfo([channelId]);
				title = chanInfos.title;
				gameId = chanInfos.game_id;
				tags = chanInfos.tags;
			}
			this.title = title;
			if(gameId) {
				const game = await TwitchUtils.getCategoryByID(gameId);
				game.box_art_url = game.box_art_url.replace("{width}", "52").replace("{height}", "72");
				this.category = game;
			}
			this.tags = tags.concat();
		}catch(error) {
			console.log(error);
			this.$store("main").alert( this.$t("error.stream_info_loading") );
		}

		this.loading = false;
	}

}
</script>

<style scoped lang="less">
.streaminfo{
	.item {
		margin-top: .5em;
		background-color: fade(@mainColor_normal_extralight, 30%);
		padding: .5em;
		border-radius: .5em;
	}

	.presets {
		width: 100%;
		.list{
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			gap: .5em;
		}
		.preset {
			display: inline-flex;
			flex-direction: row;
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

	.form {
		width: 100%;
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
		align-items: center;
		.tagItem {
			display: inline;
			background-color: rgb(240, 240, 240);
			color: var(--mainColor_normal);
			font-size: .9em;
			padding: .25em;
			border-radius: 4px;
			transition: all .25s;

			.icon {
				height: .6em;
				margin-left: .25em;
			}
			&:hover {
				background: var(--mainColor_normal_extralight);
				// color: var(--mainColor_light);
			}
		}
	}
}
</style>