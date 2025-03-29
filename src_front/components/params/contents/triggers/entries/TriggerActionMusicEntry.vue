<template>
	<div class="TriggerActionMusicEntry triggerActionForm" v-if="!spotifyConnected">
		<div class="info warn">
			<img src="@/assets/icons/info.svg" alt="info">
			<i18n-t scope="global" class="label" tag="p" keypath="triggers.actions.music.header">
				<template #LINK>
					<a @click="$store.params.openParamsPage(contentConnexions, 'spotify')">{{ $t("triggers.actions.music.header_link") }}</a>
				</template>
			</i18n-t>
		</div>
	</div>

	<div class="TriggerActionMusicEntry triggerActionForm" v-else>
		<ParamItem	:paramData="param_actions"	v-model="action.musicAction" />
		<div v-if="isPlaylistEditAction && !canEditSpotifyPlaylists" class="card-item alert scopesAlert">
			<p><Icon name="lock_fit" />{{ $t("triggers.actions.music.missing_playlist_edit_scopes") }}</p>
			<TTButton light alert @click="spotifyAuth()">{{ $t("global.grant_scope") }}</TTButton>
		</div>
		<template v-else>
			<ParamItem v-if="showPlaylistInput"			:paramData="param_playlist"				v-model="action.playlist" />
			<ParamItem v-if="showTrackInput"			:paramData="param_limitDuration"		v-model="action.limitDuration">
				<ParamItem v-if="showTrackInput"		:paramData="param_maxDuration"			v-model="action.maxDuration" class="child" noBackground />
			</ParamItem>
			<ParamItem v-if="showTrackInput"			:paramData="param_maxPerUser"			v-model="param_maxPerUser.value">
				<ParamItem v-if="showTrackInput"		:paramData="param_maxPerUser_value"		v-model="action.maxPerUser" class="child" noBackground />
			</ParamItem>
			<ParamItem v-if="showTrackInput"			:paramData="param_selection"			v-model="action.musicSelectionType" />
			<ParamItem v-if="showTrackInput"			:paramData="param_track"				v-model="action.track" />
			<ParamItem v-if="showTrackInput"			:paramData="param_confirmSongRequest"	v-model="action.confirmMessage" />
			<ParamItem v-if="showTrackInput"			:paramData="param_failSongRequest"		v-model="action.failMessage" />
		</template>
	</div>
</template>

<script lang="ts">
import { MusicTriggerEvents, TriggerEventPlaceholders, TriggerEventTypeCategories, TriggerMusicTypes, TriggerTypes, type ITriggerPlaceholder, type TriggerActionMusicEntryData, type TriggerData, type TriggerMusicEventType, type TriggerMusicTypesValue, TriggerActionPlaceholders, TriggerActionMusicEntryDataSelectionList, type TriggerActionMusicEntryDataSelection } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import SpotifyHelper from '@/utils/music/SpotifyHelper';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import ParamItem from '../../../ParamItem.vue';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry';
import { SpotifyScopes } from '@/types/spotify/SpotifyDataTypes';
import TTButton from '@/components/TTButton.vue';


@Component({
	components:{
		TTButton,
		ParamItem,
	},
})
class TriggerActionMusicEntry extends AbstractTriggerActionEntry {

	@Prop
	declare action:TriggerActionMusicEntryData;
	
	@Prop
	declare triggerData:TriggerData;

	public param_actions:TwitchatDataTypes.ParameterData<TriggerMusicTypesValue, TriggerMusicTypesValue> = { type:"list", value:"0", listValues:[], icon:"music", labelKey:"triggers.actions.music.param_actions" };
	public param_limitDuration:TwitchatDataTypes.ParameterData<boolean> = { type:"boolean", value:false, icon:"timer", labelKey:"triggers.actions.music.param_limit_duration" };
	public param_maxDuration:TwitchatDataTypes.ParameterData<number> = { type:"duration", value:300, icon:"timer", max:3600, labelKey:"triggers.actions.music.param_max_duration" };
	public param_track:TwitchatDataTypes.ParameterData<string> = { type:"string", longText:true, value:"", icon:"music", maxLength:500, labelKey:"triggers.actions.music.param_track" };
	public param_confirmSongRequest:TwitchatDataTypes.ParameterData<string> = { type:"string", longText:true, value:"", icon:"checkmark", maxLength:500, labelKey:"triggers.actions.music.param_confirmSongRequest" };
	public param_failSongRequest:TwitchatDataTypes.ParameterData<string> = { type:"string", longText:true, value:"{FAIL_REASON}", icon:"cross", maxLength:500, labelKey:"triggers.actions.music.param_failSongRequest" };
	public param_playlist:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"", icon:"info", maxLength:500, labelKey:"triggers.actions.music.param_playlist" };
	public param_selection:TwitchatDataTypes.ParameterData<TriggerActionMusicEntryDataSelection> = { type:"list", value:"1", icon:"search", labelKey:"triggers.actions.music.param_selection" };
	public param_maxPerUser:TwitchatDataTypes.ParameterData<boolean> = { type:"boolean", value:false, icon:"user", labelKey:"triggers.actions.music.param_limit_perUser" };
	public param_maxPerUser_value:TwitchatDataTypes.ParameterData<number> = { type:"number", value:0, min:0, max:99, icon:"number", labelKey:"triggers.actions.music.param_max_perUser"};

	public get spotifyConnected():boolean { return SpotifyHelper.instance.connected; }
	public get showTrackInput():boolean { return this.param_actions.value == TriggerMusicTypes.ADD_TRACK_TO_QUEUE || this.param_actions.value == TriggerMusicTypes.ADD_TRACK_TO_PLAYLIST; }
	public get showPlaylistInput():boolean { return this.param_actions.value == TriggerMusicTypes.START_PLAYLIST || this.param_actions.value == TriggerMusicTypes.ADD_TRACK_TO_PLAYLIST; }
	public get isPlaylistEditAction():boolean { return this.param_actions.value == TriggerMusicTypes.ADD_TRACK_TO_PLAYLIST; }
	public get contentOverlays():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.OVERLAYS; }
	public get contentConnexions():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.CONNEXIONS; }
	public get canEditSpotifyPlaylists():boolean { return SpotifyHelper.instance.hasScopes([SpotifyScopes.EDIT_PRIVATE_PLAYLISTS,SpotifyScopes.EDIT_PUBLIC_PLAYLISTS]); }

	public beforeMount():void {
		//List all available trigger types
		let events:TriggerMusicEventType[] = [];
		events.push( {labelKey:"triggers.actions.music.param_actions_default", icon:"music", value:"0", category:TriggerEventTypeCategories.MUSIC} ),
		events = events.concat(MusicTriggerEvents());
		
		this.param_actions.value		= this.action.musicAction? this.action.musicAction : events[0].value;
		this.param_actions.listValues	= events;

		let selections:TwitchatDataTypes.ParameterDataListValue<TriggerActionMusicEntryDataSelection>[] = []
		for (let i = 0; i < TriggerActionMusicEntryDataSelectionList.length; i++) {
			const element = TriggerActionMusicEntryDataSelectionList[i];
			selections.push({
				value:element,
				labelKey:"triggers.actions.music.param_selection_options."+element,
			})
		}
		this.param_selection.value		= this.action.musicSelectionType? this.action.musicSelectionType : selections[0].value;
		this.param_selection.listValues	= selections;

		if(!this.action.track) this.action.track = "";
		if(!this.action.failMessage) this.action.failMessage = "";
		if(!this.action.confirmMessage) this.action.confirmMessage = "";
		if((this.action.maxPerUser ||0) > 0) this.param_maxPerUser.value = true;

	}

	/**
	 * Called when the available placeholder list is updated
	 */
	public onPlaceholderUpdate(list:ITriggerPlaceholder<any>[]):void {
		this.param_track.placeholderList = list;
		this.param_confirmSongRequest.placeholderList = list.concat(TriggerEventPlaceholders(TriggerTypes.TRACK_ADDED_TO_QUEUE));
		this.param_failSongRequest.placeholderList = list.concat(TriggerActionPlaceholders(this.action.type), TriggerEventPlaceholders(TriggerTypes.TRACK_ADD_TO_QUEUE_FAILED));
		this.param_playlist.placeholderList = list;
	}

	/**
	 * Start Spotify oAuth flow with fresh new scopes
	 */
	public spotifyAuth():void {
		SpotifyHelper.instance.startAuthFlow();
	}

}
export default toNative(TriggerActionMusicEntry);
</script>

<style scoped lang="less">
.TriggerActionMusicEntry{
	.scopesAlert {
		text-align: center;
		gap: .5em;
		display: flex;
		flex-direction: column;
		align-items: center;
		.icon {
			height: 1em;
			margin-right: .25em;
		}
	}
}
</style>