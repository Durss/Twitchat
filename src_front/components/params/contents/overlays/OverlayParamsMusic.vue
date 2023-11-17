<template>
	<div class="overlayparamsmusic overlayParamsSection">
		<div class="holder">
			<OverlayInstaller type="music" :sourceTransform="{width:400, height:100}" />
			
			<div class="params">
				<ParamItem :paramData="param_noScroll" v-model="$store('music').musicPlayerParams.noScroll" />
				<ParamItem :paramData="param_openFromLeft" v-model="$store('music').musicPlayerParams.openFromLeft" />
				<ParamItem :paramData="param_autoHide" v-model="$store('music').musicPlayerParams.autoHide" />
				<ParamItem :paramData="param_showCover" v-model="$store('music').musicPlayerParams.showCover" />
				<ParamItem :paramData="param_showArtist" v-model="$store('music').musicPlayerParams.showArtist" />
				<ParamItem :paramData="param_showTitle" v-model="$store('music').musicPlayerParams.showTitle" />
				<ParamItem :paramData="param_showProgress" v-model="$store('music').musicPlayerParams.showProgressbar" />
				<ParamItem :paramData="param_customTemplateToggle" />
			</div>
	
			<ToggleBlock class="shrink" small :title="$t('overlay.css_customization')" :open="false">
				<div class="cssHead">{{ $t("overlay.music_common.css") }}</div>
				<ul class="cssStructure">
					<li>#music_holder { ... }</li>
					<li>#music_cover { ... }</li>
					<li>#music_infos { ... }</li>
					<li>#music_title { ... }</li>
					<li>#music_artist { ... }</li>
					<li>#music_progress { ... }</li>
					<li>#music_progress_fill { ... }</li>
					<li>#music_info_custom_template { ... }</li>
				</ul>
			</ToggleBlock>
		</div>
	</div>
</template>

<script lang="ts">
import DataStore from '@/store/DataStore';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import SpotifyHelper from '@/utils/music/SpotifyHelper';
import { watch } from 'vue';
import { Component, Vue } from 'vue-facing-decorator';
import ToggleBlock from '../../../ToggleBlock.vue';
import ParamItem from '../../ParamItem.vue';
import OverlayInstaller from './OverlayInstaller.vue';

@Component({
	components:{
		ParamItem,
		ToggleBlock,
		OverlayInstaller,
	}
})
export default class OverlayParamsMusic extends Vue {

	public param_noScroll:TwitchatDataTypes.ParameterData<boolean>				= {type:"boolean", value:false, labelKey:"overlay.music_common.no_scroll"};
	public param_openFromLeft:TwitchatDataTypes.ParameterData<boolean>			= {type:"boolean", value:false, labelKey:"overlay.music_common.open_from_left"};
	public param_autoHideErase:TwitchatDataTypes.ParameterData<boolean>			= {type:"boolean", value:true, labelKey:"overlay.music_common.auto_hide_erase"};
	public param_showCover:TwitchatDataTypes.ParameterData<boolean>				= {type:"boolean", value:true, labelKey:"overlay.music_common.show_cover"};
	public param_showArtist:TwitchatDataTypes.ParameterData<boolean>			= {type:"boolean", value:true, labelKey:"overlay.music_common.show_artist"};
	public param_showTitle:TwitchatDataTypes.ParameterData<boolean>				= {type:"boolean", value:true, labelKey:"overlay.music_common.show_title"};
	public param_showProgress:TwitchatDataTypes.ParameterData<boolean>			= {type:"boolean", value:true, labelKey:"overlay.music_common.show_progress"};
	public param_customTemplate:TwitchatDataTypes.ParameterData<string>			= {type:"string", value:"", longText:true, labelKey:"overlay.music_common.custom_template"};
	public param_autoHide:TwitchatDataTypes.ParameterData<boolean, unknown, boolean>			= {type:"boolean", value:false, labelKey:"overlay.music_common.auto_hide"};
	public param_customTemplateToggle:TwitchatDataTypes.ParameterData<boolean, unknown, string>	= {type:"boolean", value:true, labelKey:"overlay.music_common.custom_template_toggle"};

	public beforeMount():void {
		this.param_customTemplate.placeholderList= [
			{tag:"TITLE", descKey:"overlay.music_common.custom_template_placeholders.title"},
			{tag:"ARTIST", descKey:"overlay.music_common.custom_template_placeholders.artist"},
			{tag:"COVER", descKey:"overlay.music_common.custom_template_placeholders.cover"},
		];

		const params = this.$store("music").musicPlayerParams as TwitchatDataTypes.MusicPlayerParamsData;
		this.param_autoHide.children				= [this.param_autoHideErase];
		this.param_autoHideErase.value				= params.erase;
		this.param_customTemplateToggle.children	= [this.param_customTemplate];
		this.param_customTemplateToggle.value		= params.customInfoTemplate?.length > 0;
		this.param_customTemplate.value				= params.customInfoTemplate;

		watch(()=> this.param_autoHideErase.value, ()=>{
			this.saveData();
		})

		watch(() => this.$store("music").musicPlayerParams, () => {
			this.saveData();
		},  {deep:true});

		watch(() => this.param_customTemplateToggle.value, () => {
			this.saveData();
		});

		watch(() => this.param_customTemplate.value, () => {
			this.saveData();
		});
	}

	private saveData():void {
		let template = this.param_customTemplate.value;
		if(!this.param_customTemplateToggle.value) template = "";
		this.$store("music").musicPlayerParams.customInfoTemplate = template;
		this.$store("music").musicPlayerParams.erase = this.param_autoHideErase.value;

		DataStore.set(DataStore.MUSIC_PLAYER_PARAMS, this.$store("music").musicPlayerParams);
		//This forces overlay refresh
		SpotifyHelper.instance.getCurrentTrack();
	}

}
</script>

<style scoped lang="less">
.overlayparamsmusic{

	.params {
		width:100%;
		max-width: 410px;
		margin: auto;
		gap: .25em;
		display: flex;
		flex-direction: column;
	}

}
</style>