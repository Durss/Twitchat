<template>
	<div class="streaminfo sidePanel">
		<div class="head">
			<h1 class="title"><Icon name="info" class="icon" />{{ $t("stream.form_title") }}</h1>
			<ClearButton @click="close()" />
		</div>

		<div class="content">
			<transition name="scale">
				<div class="success card-item primary" v-if="updateSuccess" @click="updateSuccess = false">{{$t("stream.update_done")}}</div>
			</transition>

			<div v-if="presets.length > 0" class="presets">
				<div class="list">
					<div v-for="p in presets" :key="p.id" class="preset">
						<TTButton class="button" @click="applyPreset(p)"
							v-tooltip="$t('stream.preset_setBt_tt')" :loading="saving">{{ p.name }}</TTButton>

						<TTButton class="button" @click="editPreset(p)"
							icon="edit" secondary
							v-tooltip="$t('stream.preset_editBt_tt')" />

						<TTButton class="button delete" @click="deletePreset(p)"
							icon="trash" alert
							v-tooltip="$t('stream.preset_deleteBt_tt')" />
					</div>
				</div>
			</div>

			<Icon class="loader" name="loader" v-if="loading" />

			<div v-else class="form">
				<StreamInfoSubForm v-model:title="title" v-model:tags="tags" v-model:category="category" v-model:branded="branded" v-model:labels="labels" />

				<ParamItem class="card-item save" :paramData="param_savePreset" v-model="param_savePreset.value" v-if="!presetEditing" />

				<div class="actions">
					<TTButton class="submitBt" @click="cancelPresetEdit()" :loading="saving" alert v-if="presetEditing">{{$t('global.cancel')}}</TTButton>
					<TTButton class="submitBt" @click="updateStreamInfo()" :loading="saving">{{ presetEditing? $t('global.update') : $t('global.submit') }}</TTButton>
				</div>

				<div class="card-item alert error" v-if="error" @click="error = ''"><Icon name="alert" />{{error}}</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import StoreProxy from '@/store/StoreProxy';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import Utils from '@/utils/Utils';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import {toNative,  Component } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel';
import TTButton from '../TTButton.vue';
import ClearButton from '../ClearButton.vue';
import ToggleBlock from '../ToggleBlock.vue';
import AutoCompleteForm from '../params/AutoCompleteForm.vue';
import ParamItem from '../params/ParamItem.vue';
import StreamInfoSubForm from './StreamInfoSubForm.vue';

@Component({
	components:{
		TTButton,
		ParamItem,
		ClearButton,
		ToggleBlock,
		AutoCompleteForm,
		StreamInfoSubForm,
	},
	emits:["close"]
})
class StreamInfoForm extends AbstractSidePanel {

	public param_savePreset:TwitchatDataTypes.ParameterData<boolean, unknown, string>	= {value:false, type:"boolean", labelKey:"stream.form_save_preset"};
	public param_namePreset:TwitchatDataTypes.ParameterData<string>						= {value:"", type:"string", maxLength:50, labelKey:"stream.form_save_preset_name", placeholderKey:"stream.form_save_preset_name_placeholder"};

	public title:string = "";
	public error:string = "";
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
		return this.$store.stream.streamInfoPreset;
	}

	public beforeMount(): void {
	}

	public async mounted():Promise<void> {
		this.param_savePreset.children = [this.param_namePreset];

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
			this.$store.stream.saveStreamInfoPreset(preset)
		}
		//If not editing, update the stream info
		if(!this.presetEditing) {
			const channelId = StoreProxy.auth.twitch.user.id;
			try {
				if(await this.$store.stream.updateStreamInfos("twitch", channelId, this.title, this.category?.id ?? "", this.tags, this.branded, this.labels)) {
					this.updateSuccess = true;
					window.setTimeout(()=>{
						this.updateSuccess = false;
					}, 5000);
				}else{
					this.error = this.$t("error.stream_info_updating");
				}
			}catch(error:any) {
				this.error = this.$t("error.stream_info_updating")+"\n\n"+error.message.replace(/TagsRequest\.Tags /i, "");
			}
		}else {
			this.presetEditing = null;
			this.forceOpenForm = false;
		}
		this.saving = false;
		this.param_savePreset.value = false;
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
		this.$confirm(this.$t("stream.form_delete_confirm.title"), this.$t("stream.form_delete_confirm.description"))
		.then(()=>{
			this.$store.stream.deleteStreamInfoPreset(p);
		}).catch(()=>{});
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
			if(p.categoryID) {
				const game = await TwitchUtils.getCategoryByID(p.categoryID);
				game.box_art_url = game.box_art_url.replace("{width}", "52").replace("{height}", "72");
				this.category = game;
				if(p.tags){
					this.tags = p.tags.concat();
				}
			}
		}catch(error) {
			this.$store.common.alert( this.$t("stream.stream_info_preset_edit") );
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
		try {
			if(await this.$store.stream.updateStreamInfos("twitch", channelId, p.title, p.categoryID as string, p.tags, p.branded, p.labels)) {
				this.updateSuccess = true;
				window.setTimeout(()=>{
					this.updateSuccess = false;
				}, 5000);
			}else{
				this.$store.common.alert( this.$t("error.stream_info_updating") );
			}
		}catch(error) {}
		this.saving = false;
		this.populate();
	}

	/**
	 * Populate form with current stream info
	 */
	private async populate():Promise<void> {
		this.loading = true;
		const channelId = StoreProxy.auth.twitch.user.id;
		let [streamInfos] = await TwitchUtils.getCurrentStreamInfo([channelId]);
		const [channelInfos] = await TwitchUtils.getChannelInfo([channelId]);
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
			this.$store.common.alert( this.$t("error.stream_info_loading") );
		}

		this.loading = false;
	}

}
export default toNative(StreamInfoForm);
</script>

<style scoped lang="less">
.streaminfo{
	.presets {
		width: 100%;
		text-align: center;
		.list{
			gap: .5em;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			justify-content: center;
		}
		.preset {
			gap: 1px;
			display: inline-flex;
			flex-direction: row;
			.button {
				border-radius: 0;
			}
			.button:first-child {
				border-top-left-radius: var(--border-radius);
				border-bottom-left-radius: var(--border-radius);
			}
			.button:last-child {
				border-top-right-radius: var(--border-radius);
				border-bottom-right-radius: var(--border-radius);
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

	.error {
		cursor: pointer;
		margin-top: .5em;
		text-align: center;
		white-space: pre-line;
		.icon {
			height: 1em;
			vertical-align: middle;
			margin-right: .5em;
		}
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
