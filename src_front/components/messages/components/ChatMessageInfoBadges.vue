<template>
	<div class="chatmessageinfobadges">
		<div v-for="i in infos" :class="['item', i.type].join(' ')" v-tooltip="getTooltip(i)">
			<img :src="getIcon(i)" :alt="i.label" v-if="getIcon(i)">
			<span class="label" v-if="getLabel(i)">{{getLabel(i)}}</span>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{}
})
export default class ChatMessageInfoBadges extends Vue {

	@Prop
	public infos!:TwitchatDataTypes.MessageBadgeData[];

	public mounted():void {
		
	}

	public getLabel(info:TwitchatDataTypes.MessageBadgeData):string {
		if(info.label) return info.label;
		const hashmap = this.$tm("chat.custom_badge.label") as {[key in TwitchatDataTypes.MessageBadgeDataStringType]:string}
		return hashmap[info.type];
	}

	public getIcon(info:TwitchatDataTypes.MessageBadgeData):string {
		const hashmap:Partial<{[key in TwitchatDataTypes.MessageBadgeDataStringType]:string}> = {
			pinned:"pin",
			raider:"raid",
			automod:"shield",
			cyphered:"lock_fit",
			new_user:"new",
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
		const hashmap = this.$tm("chat.custom_badge.tooltip") as Partial<{[key in TwitchatDataTypes.MessageBadgeDataStringType]:string}>
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
		padding: .1em .4em;
		color: var(--mainColor_light);
		background-color: var(--mainColor_normal);
		white-space: nowrap;
		cursor: default;
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: .25em;

		&:not(:last-child) {
			margin-right: .25em;
		}

		&.whisper {
			color: var(--mainColor_dark);
			background-color: var(--mainColor_light);
		}

		&.automod, &.emergencyBlocked, &.restrictedUser {
			background-color: var(--mainColor_alert);
		}

		&.suspiciousUser {
			background-color: var(--mainColor_light);
			color: var(--mainColor_alert);
			font-weight: bold;
		}

		img {
			height: .8em;
		}
	}
}
</style>