<template>
	<div class="chatmessageinfobadges">
		<div v-for="i in infos" :class="['item', i.type].join(' ')" :data-tooltip="getTooltip(i)">
			<img :src="getIcon(i)" alt="emergency" v-if="getIcon(i)">
			<span>{{getLabel(i)}}</span>
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
export default class ChatMessageInfoBadges extends Vue {

	public infos!:TwitchatDataTypes.MessageBadgeData[];

	public mounted():void {
		
	}

	public getLabel(info:TwitchatDataTypes.MessageBadgeData):string {
		if(info.label) return info.label;
		const hashmap:{[key in TwitchatDataTypes.MessageBadgeDataStringType]:string} = {
			raider:"raider",
			automod:"automod",
			whisper:"whisper",
			cyphered:"cyphered",
			restrictedUser:"restricted",
			suspiciousUser:"suspicious",
			emergencyBlocked:"blocked",
		}
		if(hashmap[info.type]) return hashmap[info.type];
		return info.type;
	}

	public getIcon(info:TwitchatDataTypes.MessageBadgeData):string {
		const hashmap:Partial<{[key in TwitchatDataTypes.MessageBadgeDataStringType]:string}> = {
			raider:"train",
			automod:"shield",
			cyphered:"lock_fit",
			restrictedUser:"shield",
			suspiciousUser:"shield_alert",
			emergencyBlocked:"emergency",
		};
		if(hashmap[info.type]) {
			return this.$image("icons/"+hashmap[info.type]+".svg");
		}
		return "";
	}

	public getTooltip(info:TwitchatDataTypes.MessageBadgeData):string {
		const hashmap:Partial<{[key in TwitchatDataTypes.MessageBadgeDataStringType]:string}> = {
			restrictedUser:"Message only visible by<br>you and your mods",
		};
		return hashmap[info.type] ?? info.tooltip ?? "";
	}

}
</script>

<style scoped lang="less">
.chatmessageinfobadges{
	display: inline-flex;
	flex-direction: row;
	align-items: center;

	.item {
		border-radius: .25em;
		padding: .085em .4em;
		color: @mainColor_light;
		background-color: @mainColor_normal;
		white-space: nowrap;
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
			background-color: @mainColor_light;
			color: @mainColor_alert;
			font-weight: bold;
		}

		img {
			height: 1em;
			vertical-align: middle;
			margin-right: .25em;
		}
	}
}
</style>