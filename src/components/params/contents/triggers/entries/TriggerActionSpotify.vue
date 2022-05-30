<template>
	<div class="triggeractionspotify">
		<ParamItem class="item file" :paramData="actions_conf" ref="textContent" v-model="action.spotifyAction" />
		<ParamItem class="item text" :paramData="track_conf" v-model="action.track" v-if="showTrackInput" ref="textContent" />
		<ToggleBlock small class="helper"
			v-if="actions_conf.children && actions_conf.children.length > 0 && helpers[event]?.length > 0"
			title="Special placeholders dynamically replaced"
			:open="false"
		>
			<ul class="list">
				<li v-for="(h,index) in helpers[event]" :key="h.tag+event+index" @click="insert(h)" data-tooltip="Insert">
					<strong>&#123;{{h.tag}}&#125;</strong>
					{{h.desc}}
				</li>
			</ul>
		</ToggleBlock>
	</div>
</template>

<script lang="ts">
import { ParameterData, TriggerActionSpotifyData } from '@/store';
import { MusicTriggerEvents, TriggerActionHelpers, TriggerEventTypes, TriggerMusicTypes } from '@/utils/TriggerActionHandler';
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
export default class TriggerActionSpotify extends Vue {

	public action!:TriggerActionSpotifyData;
	public event!:string;

	public actions_conf:ParameterData = { label:"Action type", type:"list", value:"0", listValues:[], icon:"spotify_purple.svg" };
	public track_conf:ParameterData = { label:"Track name or URL", type:"text", longText:false, value:"", icon:"music_purple.svg" };

	public get helpers():{[key:string]:{tag:string, desc:string}[]} { return TriggerActionHelpers; }
	public get showTrackInput():boolean { return this.actions_conf.value == TriggerMusicTypes.ADD_TRACK_TO_QUEUE; }

	public mounted():void {
		//List all available trigger types
		let events:TriggerEventTypes[] = [
			{label:"Select a trigger...", value:"0" },
		];
		events = events.concat(MusicTriggerEvents);
		this.actions_conf.value = events[0].value;
		this.actions_conf.listValues = events;

	}

	/**
	 * Add a token on the text
	 */
	public insert(h:{tag:string, desc:string}):void {
		const tag = "{"+h.tag+"}";
		const holder = this.$refs.textContent as ParamItem;
		const input = (holder.$el as HTMLDivElement).getElementsByTagName("input")[0];
		let carretPos = input.selectionStart as number | 0;
		if(!carretPos) carretPos = 0;
		//Insert tag
		input.value = input.value.substring(0, carretPos) + tag + input.value.substring(carretPos);
		this.track_conf.value = input.value;
	}
}
</script>

<style scoped lang="less">
.triggeractionspotify{
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
}
</style>