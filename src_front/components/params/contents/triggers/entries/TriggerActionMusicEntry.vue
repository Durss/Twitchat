<template>
	<div class="TriggerActionMusicEntry" v-if="!musicServiceConfigured">
		<div class="info">
			<img src="@/assets/icons/infos.svg" alt="info">
			<i18n-t scope="global" class="label" tag="p" keypath="triggers.actions.music.header">
				<template #LINK>
					<a @click="$emit('setContent', contentOverlays)" v-t="'triggers.actions.music.header_link'"></a>
				</template>
			</i18n-t>
		</div>
	</div>

	<div class="TriggerActionMusicEntry" v-else>
		<ParamItem class="item file" :paramData="actions_conf" v-model="action.musicAction" />

		<div class="item" v-if="showTrackInput" >
			<ParamItem :paramData="track_conf" v-model="action.track" />
		</div>

		<div class="item" v-if="showTrackInput">
			<ParamItem :paramData="confirmSongRequest_conf" v-model="action.confirmMessage" />
		</div>

		<div class="item" v-if="showPlaylistInput">
			<div class="item warn" v-t="'triggers.actions.music.spotify_only'"></div>
			<ParamItem :paramData="playlist_conf" v-model="action.playlist" />
		</div>
	</div>
</template>

<script lang="ts">
import { MusicTriggerEvents, TriggerActionHelpers, TriggerEventTypeCategories, TriggerMusicTypes, type TriggerActionMusicEntryData, type TriggerEventTypes } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import { Options, Vue } from 'vue-class-component';
import ParamItem from '../../../ParamItem.vue';


@Options({
	props:{
		action:Object,
		event:Object,
	},
	components:{
		ParamItem,
	},
})
export default class TriggerActionMusicEntry extends Vue {

	public action!:TriggerActionMusicEntryData;
	public event!:TriggerEventTypes;

	public actions_conf:TwitchatDataTypes.ParameterData = { label:"", type:"list", value:"0", listValues:[], icon:"music_purple.svg" };
	public track_conf:TwitchatDataTypes.ParameterData = { label:"", type:"text", longText:false, value:"", icon:"music_purple.svg", maxLength:500 };
	public confirmSongRequest_conf:TwitchatDataTypes.ParameterData = { label:"", type:"text", longText:true, value:"", icon:"whispers_purple.svg", maxLength:500 };
	public playlist_conf:TwitchatDataTypes.ParameterData = { label:"", type:"text", value:"", icon:"info_purple.svg", maxLength:500 };

	public get showTrackInput():boolean { return this.actions_conf.value == TriggerMusicTypes.ADD_TRACK_TO_QUEUE; }
	public get showPlaylistInput():boolean { return this.actions_conf.value == TriggerMusicTypes.START_PLAYLIST; }
	public get musicServiceConfigured():boolean { return Config.instance.MUSIC_SERVICE_CONFIGURED_AND_CONNECTED; }
	public get contentOverlays():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.OVERLAYS; } 

	public mounted():void {
		//List all available trigger types
		let events:TriggerEventTypes[] = [
			{label:this.$t("triggers.actions.music.param_actions_default"), icon:"music", value:"0", category:TriggerEventTypeCategories.MUSIC},
		];
		events = events.concat(MusicTriggerEvents());
		this.actions_conf.value = this.action.musicAction? this.action.musicAction : events[0].value;
		this.actions_conf.listValues = events;
		this.actions_conf.label = this.$t("triggers.actions.music.param_actions")
		this.track_conf.label = this.$t("triggers.actions.music.param_track")
		this.confirmSongRequest_conf.label = this.$t("triggers.actions.music.param_confirmSongRequest")
		this.playlist_conf.label = this.$t("triggers.actions.music.param_playlist")

		this.track_conf.placeholderList = TriggerActionHelpers(this.event.value);
		this.confirmSongRequest_conf.placeholderList = TriggerActionHelpers(this.event.value);
		this.playlist_conf.placeholderList = TriggerActionHelpers(this.event.value);

	}

}
</script>

<style scoped lang="less">
.TriggerActionMusicEntry{
	.helper {
		font-size: .8em;
		padding-left: 2em;
		.list {
			list-style-type: none;
			// padding-left: 1em;
			li {
				padding: .25em;
				cursor: pointer;
				&:hover {
					background-color: fade(@mainColor_normal, 10%);
				}
				&:not(:last-child) {
					border-bottom: 1px solid @mainColor_normal;
				}
				strong {
					display: inline-block;
					min-width: 82px;
					border-right: 1px solid @mainColor_normal;
				}
			}
		}
	}

	.item:not(:first-child) {
		margin-top: .5em;
	}

	.warn {
		display: block;
		width: fit-content;
		border-radius: .25em;
		margin:auto;
		margin-bottom: .5em;
		background-color: @mainColor_warn;
		color: @mainColor_light;
		padding: .25em .5em;
	}

	.info {
		overflow: hidden;
		padding: .5em;
		padding-left: calc(1em + 10px);
		background-color: @mainColor_light;
		border-radius: .5em;
		margin-bottom: .5em;
		img {
			height: 1em;
			margin-right: .5em;
			vertical-align: middle;
		}
		.label {
			display: inline;
			color: @mainColor_warn;
		}
	}
}
</style>