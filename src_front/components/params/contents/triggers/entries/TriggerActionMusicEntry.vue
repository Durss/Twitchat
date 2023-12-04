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
		<ParamItem 								:paramData="param_actions"			v-model="action.musicAction" />
		<ParamItem v-if="showTrackInput"		:paramData="param_limitDuration"	v-model="action.limitDuration">
			<ParamItem v-if="showTrackInput"	:paramData="param_maxDuration"		v-model="action.maxDuration" />
		</ParamItem>
		<ParamItem v-if="showTrackInput"		:paramData="param_track"			v-model="action.track" />
		<ParamItem v-if="showTrackInput"		:paramData="param_confirmSongRequest" v-model="action.confirmMessage" />
		<ParamItem v-if="showTrackInput"		:paramData="param_failSongRequest"	v-model="action.failMessage" />
		<ParamItem v-if="showPlaylistInput"		:paramData="param_playlist"			v-model="action.playlist" />
	</div>
</template>

<script lang="ts">
import { MusicTriggerEvents, TriggerEventPlaceholders, TriggerEventTypeCategories, TriggerMusicTypes, TriggerTypes, type ITriggerPlaceholder, type TriggerActionMusicEntryData, type TriggerData, type TriggerMusicEventType, type TriggerMusicTypesValue, TriggerActionPlaceholders } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import SpotifyHelper from '@/utils/music/SpotifyHelper';
import { Component, Prop } from 'vue-facing-decorator';
import ParamItem from '../../../ParamItem.vue';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry';


@Component({
	components:{
		ParamItem,
	},
})
export default class TriggerActionMusicEntry extends AbstractTriggerActionEntry {

	@Prop
	declare action:TriggerActionMusicEntryData;
	
	@Prop
	declare triggerData:TriggerData;

	public param_actions:TwitchatDataTypes.ParameterData<TriggerMusicTypesValue, TriggerMusicTypesValue> = { type:"list", value:"0", listValues:[], icon:"music", labelKey:"triggers.actions.music.param_actions" };
	public param_limitDuration:TwitchatDataTypes.ParameterData<boolean> = { type:"boolean", value:false, icon:"timer", labelKey:"triggers.actions.music.param_limit_duration" };
	public param_maxDuration:TwitchatDataTypes.ParameterData<number> = { type:"time", value:300, icon:"timer", max:3600, labelKey:"triggers.actions.music.param_max_duration" };
	public param_track:TwitchatDataTypes.ParameterData<string> = { type:"string", longText:true, value:"", icon:"music", maxLength:500, labelKey:"triggers.actions.music.param_track" };
	public param_confirmSongRequest:TwitchatDataTypes.ParameterData<string> = { type:"string", longText:true, value:"", icon:"checkmark", maxLength:500, labelKey:"triggers.actions.music.param_confirmSongRequest" };
	public param_failSongRequest:TwitchatDataTypes.ParameterData<string> = { type:"string", longText:true, value:"{FAIL_REASON}", icon:"cross", maxLength:500, labelKey:"triggers.actions.music.param_failSongRequest" };
	public param_playlist:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"", icon:"info", maxLength:500, labelKey:"triggers.actions.music.param_playlist" };

	public get spotifyConnected():boolean { return SpotifyHelper.instance.connected; }
	public get showTrackInput():boolean { return this.param_actions.value == TriggerMusicTypes.ADD_TRACK_TO_QUEUE; }
	public get showPlaylistInput():boolean { return this.param_actions.value == TriggerMusicTypes.START_PLAYLIST; }
	public get contentOverlays():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.OVERLAYS; } 
	public get contentConnexions():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.CONNEXIONS; } 

	public mounted():void {
		//List all available trigger types
		let events:TriggerMusicEventType[] = []
		events.push( {labelKey:"triggers.actions.music.param_actions_default", icon:"music", value:"0", category:TriggerEventTypeCategories.MUSIC} ),
		
		events = events.concat(MusicTriggerEvents());
		this.param_actions.value		= this.action.musicAction? this.action.musicAction : events[0].value;
		this.param_actions.listValues	= events;

	}

	/**
	 * Called when the available placeholder list is updated
	 */
	public onPlaceholderUpdate(list:ITriggerPlaceholder<any>[]):void {
		this.param_track.placeholderList = list;
		this.param_confirmSongRequest.placeholderList = list.concat(TriggerEventPlaceholders(TriggerTypes.TRACK_ADDED_TO_QUEUE));
		this.param_failSongRequest.placeholderList = list.concat(TriggerActionPlaceholders(this.action.type), TriggerEventPlaceholders(TriggerTypes.TRACK_ADDED_TO_QUEUE));
		this.param_playlist.placeholderList = list;
	}

}
</script>

<style scoped lang="less">
.TriggerActionMusicEntry{

}
</style>