<template>
	<div class="overlayparamsmusic">
		<input type="text" id="spotify_overlay_url" v-model="overlayUrl">
		<ToggleBlock small title="CSS customization" :open="false">
			<div>You can change the appearance of the player by overriding these CSS IDs on OBS browser source params</div>
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
			<ParamItem :paramData="param_noScroll" v-model="$store.state.musicPlayerParams.noScroll" />
			<ParamItem :paramData="param_openFromLeft" v-model="$store.state.musicPlayerParams.openFromLeft" />
			<ParamItem :paramData="param_autoHide" v-model="$store.state.musicPlayerParams.autoHide" />
			<ParamItem :paramData="param_showCover" v-model="$store.state.musicPlayerParams.showCover" />
			<ParamItem :paramData="param_showArtist" v-model="$store.state.musicPlayerParams.showArtist" />
			<ParamItem :paramData="param_showTitle" v-model="$store.state.musicPlayerParams.showTitle" />
			<ParamItem :paramData="param_showProgress" v-model="$store.state.musicPlayerParams.showProgressbar" />
			<ParamItem :paramData="param_customTemplateToggle" />
		</div>

	</div>
</template>

<script lang="ts">
import Store from '@/store/Store';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import StoreProxy from '@/utils/StoreProxy';
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

	public param_noScroll:TwitchatDataTypes.ParameterData = {type:"toggle", label:"Disable scrolling", value:false};
	public param_openFromLeft:TwitchatDataTypes.ParameterData = {type:"toggle", label:"Open from left", value:false};
	public param_autoHide:TwitchatDataTypes.ParameterData = {type:"toggle", label:"Keep player visible if nothing is playing", value:false};
	public param_autoHideErase:TwitchatDataTypes.ParameterData = {type:"toggle", label:"Erase track infos when nothing is playing", value:true};
	public param_showCover:TwitchatDataTypes.ParameterData = {type:"toggle", label:"Show cover", value:true};
	public param_showArtist:TwitchatDataTypes.ParameterData = {type:"toggle", label:"Show artist", value:true};
	public param_showTitle:TwitchatDataTypes.ParameterData = {type:"toggle", label:"Show title", value:true};
	public param_showProgress:TwitchatDataTypes.ParameterData = {type:"toggle", label:"Show progress bar", value:true};
	public param_customTemplateToggle:TwitchatDataTypes.ParameterData = {type:"toggle", label:"Use custom template", value:true};
	public param_customTemplate:TwitchatDataTypes.ParameterData = {type:"text", label:"Template (HTML accepted)", value:"", longText:true, placeholderList:[{tag:"TITLE", desc:"track title"}, {tag:"ARTIST", desc:"track artist"}]};
	
	public get overlayUrl():string { return this.$overlayURL("music"); }

	public mounted():void {
		const params = StoreProxy.store.state.musicPlayerParams as TwitchatDataTypes.MusicPlayerParamsData;
		this.param_autoHide.children = [this.param_autoHideErase];
		this.param_autoHideErase.value = params.erase;
		this.param_customTemplateToggle.children = [this.param_customTemplate];
		this.param_customTemplateToggle.value = params.customInfoTemplate?.length > 0;
		this.param_customTemplate.value = params.customInfoTemplate;

		watch(()=> this.param_autoHideErase.value, ()=>{
			this.saveData();
		})

		watch(() => StoreProxy.store.state.musicPlayerParams, () => {
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
		StoreProxy.store.state.musicPlayerParams.customInfoTemplate = template;
		StoreProxy.store.state.musicPlayerParams.erase = this.param_autoHideErase.value;

		Store.set(Store.MUSIC_PLAYER_PARAMS, StoreProxy.store.state.musicPlayerParams);
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
		// width: 80%;
		// margin: auto;
		margin-top: 1em;

		>*:not(:first-child) {
			margin-top: .25em;
		}
	}
}
</style>