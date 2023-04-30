<template>
	<div class="TriggerActionMusicEntry triggerActionForm" v-if="!musicServiceConfigured">
		<div class="info warn">
			<img src="@/assets/icons/info.svg" alt="info">
			<i18n-t scope="global" class="label" tag="p" keypath="triggers.actions.music.header">
				<template #LINK>
					<a @click="$store('params').openParamsPage(contentOverlays, 'spotify')">{{ $t("triggers.actions.music.header_link") }}</a>
				</template>
			</i18n-t>
		</div>
	</div>

	<div class="TriggerActionMusicEntry triggerActionForm" v-else>
		<ParamItem 							:paramData="actions_conf" v-model="action.musicAction" />
		<ParamItem v-if="showTrackInput"	:paramData="track_conf" v-model="action.track" />
		<ParamItem v-if="showTrackInput"	:paramData="confirmSongRequest_conf" v-model="action.confirmMessage" />
		<ParamItem v-if="showPlaylistInput"	:paramData="playlist_conf" v-model="action.playlist" />
	</div>
</template>

<script lang="ts">
import { MusicTriggerEvents, TriggerActionPlaceholders, TriggerEventPlaceholders, TriggerEventTypeCategories, TriggerMusicTypes, type TriggerActionMusicEntryData, type TriggerData, type TriggerMusicEventType, type TriggerMusicTypesValue } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import ParamItem from '../../../ParamItem.vue';


@Component({
	components:{
		ParamItem,
	},
})
export default class TriggerActionMusicEntry extends Vue {

	@Prop
	public action!:TriggerActionMusicEntryData;
	@Prop
	public triggerData!:TriggerData;

	public actions_conf:TwitchatDataTypes.ParameterData<TriggerMusicTypesValue, TriggerMusicTypesValue> = { type:"list", value:"0", listValues:[], icon:"music.svg" };
	public track_conf:TwitchatDataTypes.ParameterData<string> = { type:"string", longText:true, value:"", icon:"music.svg", maxLength:500 };
	public confirmSongRequest_conf:TwitchatDataTypes.ParameterData<string> = { type:"string", longText:true, value:"", icon:"whispers.svg", maxLength:500 };
	public playlist_conf:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"", icon:"info.svg", maxLength:500 };

	public get showTrackInput():boolean { return this.actions_conf.value == TriggerMusicTypes.ADD_TRACK_TO_QUEUE; }
	public get showPlaylistInput():boolean { return this.actions_conf.value == TriggerMusicTypes.START_PLAYLIST; }
	public get musicServiceConfigured():boolean { return Config.instance.MUSIC_SERVICE_CONFIGURED_AND_CONNECTED; }
	public get contentOverlays():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.OVERLAYS; } 

	public mounted():void {
		//List all available trigger types
		let events:TriggerMusicEventType[] = []
		events.push( {labelKey:"triggers.actions.music.param_actions_default", icon:"music", value:"0", category:TriggerEventTypeCategories.MUSIC} ),
		
		events = events.concat(MusicTriggerEvents());
		this.actions_conf.value					= this.action.musicAction? this.action.musicAction : events[0].value;
		this.actions_conf.listValues			= events;
		this.actions_conf.labelKey				= "triggers.actions.music.param_actions";
		this.track_conf.labelKey				= "triggers.actions.music.param_track";
		this.confirmSongRequest_conf.labelKey	= "triggers.actions.music.param_confirmSongRequest";
		this.playlist_conf.labelKey				= "triggers.actions.music.param_playlist";

		let placeholders = TriggerEventPlaceholders(this.triggerData.type).concat();
		placeholders = placeholders.concat(TriggerActionPlaceholders("music"));

		this.track_conf.placeholderList = placeholders;
		this.confirmSongRequest_conf.placeholderList = placeholders;
		this.playlist_conf.placeholderList = placeholders;

	}

}
</script>

<style scoped lang="less">
.TriggerActionMusicEntry{
	.item.alert {
		display: block;
		width: fit-content;
		border-radius: .25em;
		margin:auto;
		margin-bottom: .5em;
		background-color: var(--mainColor_alert);
		color: var(--mainColor_light);
		padding: .25em .5em;
	}

}
</style>