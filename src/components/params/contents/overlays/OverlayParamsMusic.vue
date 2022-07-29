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
		</div>

	</div>
</template>

<script lang="ts">
import Store from '@/store/Store';
import type { ParameterData } from '@/types/TwitchatDataTypes';
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

	public param_noScroll:ParameterData = {type:"toggle", label:"Disable scrolling", value:false};
	public param_openFromLeft:ParameterData = {type:"toggle", label:"Open from left", value:false};
	public param_autoHide:ParameterData = {type:"toggle", label:"Keep player visible if nothing is playing", value:false};
	public param_autoHideErase:ParameterData = {type:"toggle", label:"Erase track infos when nothing is playing", value:true};
	public param_showCover:ParameterData = {type:"toggle", label:"Show cover", value:true};
	public param_showArtist:ParameterData = {type:"toggle", label:"Show artist", value:true};
	public param_showTitle:ParameterData = {type:"toggle", label:"Show title", value:true};
	public param_showProgress:ParameterData = {type:"toggle", label:"Show progress bar", value:true};
	
	public get overlayUrl():string { return this.$overlayURL("music"); }

	public mounted():void {
		this.param_autoHide.children = [this.param_autoHideErase];
		this.param_autoHideErase.value = StoreProxy.store.state.musicPlayerParams.erase;
		watch(()=> this.param_autoHideErase.value, ()=>{
			StoreProxy.store.state.musicPlayerParams.erase = this.param_autoHideErase.value;
			this.saveData();
		})

		watch(() => StoreProxy.store.state.musicPlayerParams, () => {
			this.saveData();
		},  {deep:true});
	}

	private saveData():void {
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