<template>
	<div class="TriggerActionMusicEntry" v-if="!musicServiceConfigured">
		<div class="item warn info">
			<img src="@/assets/icons/infos.svg" alt="info">
			<i18n-t scope="global" class="label" tag="p" keypath="triggers.actions.music.header">
				<template #LINK>
					<a @click="$store('params').openParamsPage(contentOverlays)">{{ $t("triggers.actions.music.header_link") }}</a>
				</template>
			</i18n-t>
		</div>
	</div>

	<div class="TriggerActionMusicEntry" v-else>
		<ParamItem class="row item file" :paramData="actions_conf" v-model="action.musicAction" />

		<div class="row item" v-if="showTrackInput" >
			<ParamItem :paramData="track_conf" v-model="action.track" />
		</div>

		<div class="row item" v-if="showTrackInput">
			<ParamItem :paramData="confirmSongRequest_conf" v-model="action.confirmMessage" />
		</div>

		<div class="row item" v-if="showPlaylistInput">
			<!-- <div class="item alert">{{ $t("triggers.actions.music.spotify_only") }}</div> -->
			<ParamItem :paramData="playlist_conf" v-model="action.playlist" />
		</div>
	</div>
</template>

<script lang="ts">
import { MusicTriggerEvents, TriggerActionPlaceholders, TriggerEventPlaceholders, TriggerEventTypeCategories, TriggerMusicTypes, type TriggerActionMusicEntryData, type TriggerData, type TriggerMusicEventType } from '@/types/TriggerActionDataTypes';
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

	public actions_conf:TwitchatDataTypes.ParameterData = { type:"list", value:"0", listValues:[], icon:"music_purple.svg" };
	public track_conf:TwitchatDataTypes.ParameterData = { type:"string", longText:true, value:"", icon:"music_purple.svg", maxLength:500 };
	public confirmSongRequest_conf:TwitchatDataTypes.ParameterData = { type:"string", longText:true, value:"", icon:"whispers_purple.svg", maxLength:500 };
	public playlist_conf:TwitchatDataTypes.ParameterData = { type:"string", value:"", icon:"info_purple.svg", maxLength:500 };

	public get showTrackInput():boolean { return this.actions_conf.value == TriggerMusicTypes.ADD_TRACK_TO_QUEUE; }
	public get showPlaylistInput():boolean { return this.actions_conf.value == TriggerMusicTypes.START_PLAYLIST; }
	public get musicServiceConfigured():boolean { return Config.instance.MUSIC_SERVICE_CONFIGURED_AND_CONNECTED; }
	public get contentOverlays():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.OVERLAYS; } 

	public mounted():void {
		//List all available trigger types
		let events:TriggerMusicEventType[] = [
			{labelKey:"triggers.actions.music.param_actions_default", icon:"music", value:"0", category:TriggerEventTypeCategories.MUSIC},
		];
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
	.triggerActionForm();

	.item.alert {
		display: block;
		width: fit-content;
		border-radius: .25em;
		margin:auto;
		margin-bottom: .5em;
		background-color: @mainColor_alert;
		color: @mainColor_light;
		padding: .25em .5em;
	}

}
</style>