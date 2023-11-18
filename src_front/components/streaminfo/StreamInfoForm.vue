<template>
	<div class="streaminfo sidePanel">
		<div class="head">
			<h1 class="title"><Icon name="info" class="icon" />{{ $t("stream.form_title") }}</h1>
			<CloseButton @click="close()" />
		</div>
		
		<div class="content">
			<transition name="scale">
				<div class="success card-item primary" v-if="updateSuccess" @click="updateSuccess = false">{{$t("stream.update_done")}}</div>
			</transition>

			<ToggleBlock :title="$t('stream.presets_title')" v-if="presets.length > 0" class="presets">
				<div class="list">
					<div v-for="p in presets" :key="p.id" class="preset">
						<Button class="button delete" @click="deletePreset(p)"
							icon="trash" alert
							v-tooltip="$t('stream.preset_deleteBt_tt')" />
							
						<Button class="button" @click="editPreset(p)"
							icon="edit" secondary
							v-tooltip="$t('stream.preset_editBt_tt')" />
	
						<Button class="button" @click="applyPreset(p)"
							v-tooltip="$t('stream.preset_setBt_tt')" :loading="saving">{{ p.name }}</Button>
					</div>
				</div>
			</ToggleBlock>
			
			<Icon class="loader" name="loader" v-if="loading" />

			<ToggleBlock v-else class="form" :title="presetEditing? $t('stream.form_title_preset', {TITLE:presetEditing.name}) : $t('stream.form_title_update')"
			:open="presets.length == 0 || forceOpenForm" icon="update">
				<StreamInfoSubForm v-model:title="title" v-model:tags="tags" v-model:category="category" v-model:branded="branded" v-model:labels="labels" />
				
				<ParamItem class="card-item save" :paramData="param_savePreset" v-if="!presetEditing" />
				
				<div class="actions">
					<Button class="submitBt" @click="cancelPresetEdit()" :loading="saving" alert v-if="presetEditing">{{$t('global.cancel')}}</Button>
					<Button class="submitBt" @click="updateStreamInfo()" :loading="saving">{{$t('global.submit')}}</Button>
				</div>
			</ToggleBlock>
		</div>
	</div>
</template>

<script lang="ts">
import StoreProxy from '@/store/StoreProxy';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import Utils from '@/utils/Utils';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { Component } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel.vue';
import Button from '../Button.vue';
import CloseButton from '../CloseButton.vue';
import ToggleBlock from '../ToggleBlock.vue';
import AutoCompleteForm from '../params/AutoCompleteForm.vue';
import ParamItem from '../params/ParamItem.vue';
import StreamInfoSubForm from './StreamInfoSubForm.vue';

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

	public param_savePreset:TwitchatDataTypes.ParameterData<boolean>	= {value:false, type:"boolean", labelKey:"stream.form_save_preset"};
	public param_namePreset:TwitchatDataTypes.ParameterData<string>		= {value:"", type:"string", maxLength:50, labelKey:"stream.form_save_preset_name", placeholderKey:"stream.form_save_preset_name_placeholder"};

	public title:string = "";
	public tags:string[] = [];
	public branded:boolean = false;
	public updateSuccess:boolean = false;
	public labels:{id:string, enabled:boolean}[] = [];
	public category:TwitchDataTypes.StreamCategory|null = null;

	public saving:boolean = false;
	public loading:boolean = true;
	public forceOpenForm:boolean = true;
	public presetEditing:TwitchatDataTypes.StreamInfoPreset|null = null;

	public get presets():TwitchatDataTypes.StreamInfoPreset[] {
		return this.$store("stream").streamInfoPreset;
	}

	public beforeMount(): void {
	}

	public async mounted():Promise<void> {
		this.param_savePreset.children = [this.param_namePreset];

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
				name:this.presetEditing?.name?.substring(0, 50) ?? this.param_namePreset.value,
				id:Utils.getUUID(),
				title:this.title,
			}
			preset.labels = this.labels;
			preset.branded = this.branded;
			if(this.category) preset.categoryID = this.category.id
			if(this.tags.length > 0) preset.tags = this.tags.concat();
			if(this.presetEditing) preset.id = this.presetEditing.id;
			this.$store("stream").saveStreamInfoPreset(preset)
		}
		//If not editing, update the stream info
		if(!this.presetEditing) {
			const channelId = StoreProxy.auth.twitch.user.id;
			if(await this.$store("stream").setStreamInfos("twitch", this.title, this.category?.id ?? "", channelId, this.tags, this.branded, this.labels)) {
				this.updateSuccess = true;
				setTimeout(()=>{
					this.updateSuccess = false;
				}, 5000);
			}else{
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
			this.labels = p.labels || [];
			this.branded = p.branded === true;
			console.log(p);
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
		const channelId = StoreProxy.auth.twitch.user.id;
		if(await this.$store("stream").setStreamInfos("twitch", p.title, p.categoryID as string, channelId, p.tags, p.branded, p.labels)) {
			this.updateSuccess = true;
			setTimeout(()=>{
				this.updateSuccess = false;
			}, 5000);
		}else{
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
		let [streamInfos] = await TwitchUtils.loadCurrentStreamInfo([channelId]);
		const [channelInfos] = await TwitchUtils.loadChannelInfo([channelId]);
		try {
			let title:string = "";
			let gameId:string = "";
			let tags:string[] = [];
			if(streamInfos) {
				title = streamInfos.title;
				gameId = streamInfos.game_id;
				tags = streamInfos.tags;
			}else{
				//Fallback to channel info if we're not live
				title = channelInfos.title;
				gameId = channelInfos.game_id;
				tags = channelInfos.tags;
			}
			this.title = title;
			this.branded = channelInfos.is_branded_content === true;
			this.labels = channelInfos.content_classification_labels.filter(v=>v != "MatureGame").map(v=> { return {id:v, enabled:true}});
			this.tags = tags.concat();
			if(gameId) {
				const game = await TwitchUtils.getCategoryByID(gameId);
				game.box_art_url = game.box_art_url.replace("{width}", "52").replace("{height}", "72");
				this.category = game;
			}
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
				width: 1.75em;
				transform-origin: right center;
			}
			.button:nth-child(2) {
				width: 1.75em;
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

	.loader {
		width: 3em;
		margin: auto;
		display: block;
	}

	.actions {
		display: flex;
		gap: 1em;
		flex-direction: row;
		justify-content: center;
		margin-top: .5em;
	}

	.success {
		flex-shrink: 0;
		text-align: center;
		cursor: pointer;
		&.scale-enter-active {
			transition: all .25s;
		}

		&.scale-leave-active {
			transition: all .25s;
		}

		&.scale-enter-from,
		&.scale-leave-to {
			height: 0;
			padding-top: 0;
			padding-bottom: 0;
			margin-top: 0;
			margin-bottom: -1em;
		}
	}

	.save {
		margin-top: .5em;
	}
}
</style>