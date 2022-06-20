<template>
	<div class="TriggerActionMusicEntry" v-if="!musicServiceConfigured">
		<div class="info">
			<img src="@/assets/icons/infos.svg" alt="info">
			<p class="label">This feature needs you to connect on <a @click="$emit('setContent', 'overlays')">Overlays tab</a> on the <strong>Spotify</strong> section</p>
		</div>
	</div>

	<div class="TriggerActionMusicEntry" v-else>
		<ParamItem class="item file" :paramData="actions_conf" v-model="action.musicAction" />

		<ParamItem class="item text" :paramData="track_conf" v-model="action.track" v-if="showTrackInput" ref="textContentTrack" />
		<ToggleBlock small class="helper"
			v-if="showTrackInput && getHelpers(event)?.length > 0"
			title="Special placeholders dynamically replaced"
			:open="false"
		>
			<ul class="list">
				<li v-for="(h,index) in getHelpers(event)" :key="h.tag+event+index" @click="insert(h, 'textContentTrack')" data-tooltip="Insert">
					<strong>&#123;{{h.tag}}&#125;</strong>
					{{h.desc}}
				</li>
			</ul>
		</ToggleBlock>

		<ParamItem class="item text" :paramData="confirmSongRequest_conf" v-model="action.confirmMessage" v-if="showTrackInput" ref="textContentConfirm" />
		<ToggleBlock small class="helper"
			v-if="showTrackInput && getHelpers(event)?.length > 0"
			title="Special placeholders dynamically replaced"
			:open="false"
		>
			<ul class="list">
				<li v-for="(h,index) in getHelpers(event)" :key="h.tag+event+index" @click="insert(h, 'textContentConfirm')" data-tooltip="Insert">
					<strong>&#123;{{h.tag}}&#125;</strong>
					{{h.desc}}
				</li>
			</ul>
		</ToggleBlock>
	</div>
</template>

<script lang="ts">
import type { ParameterData, TriggerActionMusicEntryData, TriggerEventTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import { MusicTriggerEvents, TriggerActionHelpers, TriggerMusicTypes, type ITriggerActionHelper } from '@/utils/TriggerActionData';
import { Options, Vue } from 'vue-class-component';
import ToggleBlock from '../../../../ToggleBlock.vue';
import ParamItem from '../../../ParamItem.vue';

@Options({
	props:{
		action:Object,
		event:String,
	},
	components:{
		ParamItem,
		ToggleBlock,
	},
})
export default class TriggerActionMusicEntry extends Vue {

	public action!:TriggerActionMusicEntryData;
	public event!:string;

	public actions_conf:ParameterData = { label:"Action type", type:"list", value:"0", listValues:[], icon:"music_purple.svg" };
	public track_conf:ParameterData = { label:"Track name or URL", type:"text", longText:false, value:"", icon:"music_purple.svg", maxLength:500 };
	public confirmSongRequest_conf:ParameterData = { label:"Send confirmation message", type:"text", longText:true, value:"", icon:"whispers_purple.svg", maxLength:500 };

	public getHelpers(key:string):ITriggerActionHelper[] { return TriggerActionHelpers(key); }
	public get showTrackInput():boolean { return this.actions_conf.value == TriggerMusicTypes.ADD_TRACK_TO_QUEUE; }
	public get musicServiceConfigured():boolean { return Config.instance.MUSIC_SERVICE_CONFIGURED_AND_CONNECTED; }

	public mounted():void {
		//List all available trigger types
		let events:TriggerEventTypes[] = [
			{label:"Select a trigger...", value:"0" },
		];
		events = events.concat(MusicTriggerEvents);
		this.actions_conf.value = this.action.musicAction? this.action.musicAction : events[0].value;
		this.actions_conf.listValues = events;

	}

	/**
	 * Add a token on the text
	 */
	public insert(h:{tag:string, desc:string}, target:string):void {
		const tag = "{"+h.tag+"}";
		const holder = (this.$refs[target] as ParamItem).$el as HTMLDivElement;
		console.log(holder);
		let input:HTMLInputElement|HTMLTextAreaElement = holder.getElementsByTagName("input")[0];
		if(!input) {
			input = holder.getElementsByTagName("textarea")[0];
		}
		let carretPos = input.selectionStart as number | 0;
		if(!carretPos) carretPos = 0;
		//Insert tag
		input.value = input.value.substring(0, carretPos) + tag + input.value.substring(carretPos);
		input.dispatchEvent(new Event("input"));//Tell vue the input's value changed
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