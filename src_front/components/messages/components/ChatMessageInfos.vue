<template>
	<div class="chatmessageinfos">
		<div v-for="i in infos" :class="['item', i.type].join(' ')" :data-tooltip="i.tooltip">
			<img :src="getIcon(i)" alt="emergency" v-if="getIcon(i)"> {{getLabel(i)}}
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{
		infos:Object,
	},
	components:{}
})
export default class ChatMessageInfos extends Vue {

	public infos!:TwitchatDataTypes.MessageBadgeData[];

	public mounted():void {
		
	}

	public getLabel(info:TwitchatDataTypes.MessageBadgeData):string {
		if(info.label) return info.label;
		const hashmap:{[key in TwitchatDataTypes.MessageBadgeDataStringType]:string} = {
			automod:"automod",
			whisper:"whisper",
			restrictedUser:"restrcited",
			suspiciousUser:"suspicious",
			emergencyBlocked:"blocked",
		}
		if(hashmap[info.type]) return hashmap[info.type];
		return info.type;
	}

	public getIcon(info:TwitchatDataTypes.MessageBadgeData):string {
		const hashmap:Partial<{[key in TwitchatDataTypes.MessageBadgeDataStringType]:string}> = {
			restrictedUser:"shield",
			emergencyBlocked:"emergency",
		};
		if(hashmap[info.type]) {
			return this.$image("icons/"+hashmap[info.type]+".svg");
		}
		return "";
	}

}
</script>

<style scoped lang="less">
.chatmessageinfos{
	display: inline-flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;

	.item {
		font-size: .9em;
		border-radius: 3px;
		padding: .15em .3em;
		vertical-align: middle;
		color: @mainColor_light;
		background-color: @mainColor_normal;
		white-space: nowrap;
		display: inline;
		cursor: default;

		&:not(:last-child) {
			margin-right: .25em;
		}

		&.whisper {
			color: @mainColor_dark;
			background-color: @mainColor_light;
		}

		&.automod, &.emergencyBlocked, &.restrictedUser {
			background-color: @mainColor_alert;
		}

		&.suspiciousUser {
			background-color: @mainColor_warn;
			color:@mainColor_dark;
			font-weight: bold;
		}

		img {
			height: 1em;
			vertical-align: middle;
		}
	}
}
</style>