<template>
	<div class="TriggerActionMusicEntry" v-if="!musicServiceConfigured">
		<div class="info">
			<img src="@/assets/icons/infos.svg" alt="info">
			<p class="label">This feature needs you to connect on <a @click="$emit('setContent', 'overlays')">Overlays tab</a> on the <strong>Spotify</strong> section</p>
		</div>
	</div>

	<div class="TriggerActionMusicEntry" v-else>
		<ParamItem class="item file" :paramData="actions_conf" v-model="action.musicAction" />

		<div v-if="showTrackInput" >
			<ParamItem class="item text" :paramData="track_conf" v-model="action.track" ref="textContentTrack" />
			<PlaceholderSelector class="placeholders"
				:target="getField('textContentTrack')"
				:placeholders="helpers"
				v-model="action.track"
			/>
		</div>

		<div v-if="showTrackInput">
			<ParamItem class="item text" :paramData="confirmSongRequest_conf" v-model="action.confirmMessage" ref="textContentConfirm" />
			<PlaceholderSelector class="placeholders"
				:target="getField('textContentConfirm')"
				:placeholders="helpers"
				v-model="action.confirmMessage"
			/>
		</div>

		<div v-if="showPlaylistInput">
			<div class="item warn">Only works with Spotify</div>
			<ParamItem class="item text" :paramData="playlist_conf" v-model="action.playlist" ref="playlistName" />
			<PlaceholderSelector class="placeholders"
				:target="getField('playlistName')"
				:placeholders="helpers"
				v-model="action.playlist"
			/>
		</div>
	</div>
</template>

<script lang="ts">
import type { ParameterData, PlaceholderEntry, TriggerActionMusicEntryData, TriggerEventTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import { MusicTriggerEvents, TriggerActionHelpers, TriggerMusicTypes } from '@/utils/TriggerActionData';
import { Options, Vue } from 'vue-class-component';
import ToggleBlock from '../../../../ToggleBlock.vue';
import ParamItem from '../../../ParamItem.vue';
import PlaceholderSelector from '../../../PlaceholderSelector.vue';

@Options({
	props:{
		action:Object,
		event:String,
	},
	components:{
		ParamItem,
		ToggleBlock,
		PlaceholderSelector,
	},
})
export default class TriggerActionMusicEntry extends Vue {

	public action!:TriggerActionMusicEntryData;
	public event!:string;

	public actions_conf:ParameterData = { label:"Action", type:"list", value:"0", listValues:[], icon:"music_purple.svg" };
	public track_conf:ParameterData = { label:"Track (name or URL)", type:"text", longText:false, value:"", icon:"music_purple.svg", maxLength:500 };
	public confirmSongRequest_conf:ParameterData = { label:"Send confirmation message", type:"text", longText:true, value:"", icon:"whispers_purple.svg", maxLength:500 };
	public playlist_conf:ParameterData = { label:"Playlist name, link or ID", type:"text", longText:true, value:"", icon:"info_purple.svg", maxLength:500 };

	public get helpers():PlaceholderEntry[] { return TriggerActionHelpers(this.event); }
	public get showTrackInput():boolean { return this.actions_conf.value == TriggerMusicTypes.ADD_TRACK_TO_QUEUE; }
	public get showPlaylistInput():boolean { return this.actions_conf.value == TriggerMusicTypes.START_PLAYLIST; }
	public get musicServiceConfigured():boolean { return Config.instance.MUSIC_SERVICE_CONFIGURED_AND_CONNECTED; }
	
	public async getField(ref:string):Promise<HTMLInputElement|HTMLTextAreaElement> {
		await this.$nextTick();
		let target = this.$refs[ref];
		if((target as Vue).$el) target = (target as Vue).$el;
		let input:HTMLInputElement|HTMLTextAreaElement = (target as HTMLDivElement).getElementsByTagName("input")[0];
		if(!input) {
			input = (target as HTMLDivElement).getElementsByTagName("textarea")[0];
		}

		return input;
	}

	public mounted():void {
		//List all available trigger types
		let events:TriggerEventTypes[] = [
			{label:"Select a trigger...", value:"0" },
		];
		events = events.concat(MusicTriggerEvents);
		this.actions_conf.value = this.action.musicAction? this.action.musicAction : events[0].value;
		this.actions_conf.listValues = events;

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