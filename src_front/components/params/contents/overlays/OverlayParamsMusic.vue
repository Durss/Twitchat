<template>
	<div class="overlayparamsmusic">
		<input type="text" id="spotify_overlay_url" v-model="overlayUrl">
		<ToggleBlock small :title="$t('overlay.css_customization')" :open="false">
			<div v-t="'overlay.music_common.css'"></div>
			<ul>
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

	</div>
</template>

<script lang="ts">
import DataStore from '@/store/DataStore';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { watch } from 'vue';
import { Options, Vue } from 'vue-class-component';
import ToggleBlock from '../../../ToggleBlock.vue';
import ParamItem from '../../ParamItem.vue';

@Options({
	props:{},
	components:{
		ParamItem,
		ToggleBlock,
	}
})
export default class OverlayParamsMusic extends Vue {

	public param_noScroll:TwitchatDataTypes.ParameterData				= {type:"toggle", label:"", value:false};
	public param_openFromLeft:TwitchatDataTypes.ParameterData			= {type:"toggle", label:"", value:false};
	public param_autoHide:TwitchatDataTypes.ParameterData				= {type:"toggle", label:"", value:false};
	public param_autoHideErase:TwitchatDataTypes.ParameterData			= {type:"toggle", label:"", value:true};
	public param_showCover:TwitchatDataTypes.ParameterData				= {type:"toggle", label:"", value:true};
	public param_showArtist:TwitchatDataTypes.ParameterData				= {type:"toggle", label:"", value:true};
	public param_showTitle:TwitchatDataTypes.ParameterData				= {type:"toggle", label:"", value:true};
	public param_showProgress:TwitchatDataTypes.ParameterData			= {type:"toggle", label:"", value:true};
	public param_customTemplateToggle:TwitchatDataTypes.ParameterData	= {type:"toggle", label:"", value:true};
	public param_customTemplate:TwitchatDataTypes.ParameterData			= {type:"text", label:"", value:"", longText:true};

	public get overlayUrl():string { return this.$overlayURL("music"); }

	public beforeMount():void {
		this.param_noScroll.label				= this.$t("overlay.music_common.no_scroll");
		this.param_openFromLeft.label			= this.$t("overlay.music_common.open_from_left");
		this.param_autoHide.label				= this.$t("overlay.music_common.auto_hide");
		this.param_autoHideErase.label			= this.$t("overlay.music_common.auto_hide_erase");
		this.param_showCover.label				= this.$t("overlay.music_common.show_cover");
		this.param_showArtist.label				= this.$t("overlay.music_common.show_artist");
		this.param_showTitle.label				= this.$t("overlay.music_common.show_title");
		this.param_showProgress.label			= this.$t("overlay.music_common.show_progress");
		this.param_customTemplateToggle.label	= this.$t("overlay.music_common.custom_template_toggle");
		this.param_customTemplate.label			= this.$t("overlay.music_common.custom_template");
		this.param_customTemplate.placeholderList= [
			{tag:"TITLE", desc:this.$t("overlay.music_common.custom_template_placeholders.title")},
			{tag:"ARTIST", desc:this.$t("overlay.music_common.custom_template_placeholders.artist")}
		];

		const params = this.$store("music").musicPlayerParams as TwitchatDataTypes.MusicPlayerParamsData;
		this.param_autoHide.children = [this.param_autoHideErase];
		this.param_autoHideErase.value = params.erase;
		this.param_customTemplateToggle.children = [this.param_customTemplate];
		this.param_customTemplateToggle.value = params.customInfoTemplate?.length > 0;
		this.param_customTemplate.value = params.customInfoTemplate;

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
		let template = this.param_customTemplate.value as string;
		if(!this.param_customTemplateToggle.value) template = "";
		this.$store("music").musicPlayerParams.customInfoTemplate = template;
		this.$store("music").musicPlayerParams.erase = this.param_autoHideErase.value as boolean;

		DataStore.set(DataStore.MUSIC_PLAYER_PARAMS, this.$store("music").musicPlayerParams);
	}

}
</script>

<style scoped lang="less">
.overlayparamsmusic{
	display: flex;
	flex-direction: column;
	ul {
		margin-top: .5em;
		li {
			list-style-type: disc;
			list-style-position: inside;
		}
	}

	.params {
		width:100%;
		max-width: 410px;
		margin: auto;
		margin-top: 1em;
		padding: .5em;
		border-radius: @border_radius;
		background-color: fade(@mainColor_normal_extralight, 30%);

		>*:not(:first-child) {
			margin-top: .25em;
		}
	}
}
</style>