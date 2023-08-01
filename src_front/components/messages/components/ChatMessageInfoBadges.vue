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
			new_user:"sub",
			restrictedUser:"shield",
			suspiciousUser:"shield",
			emergencyBlocked:"emergency",
			firstToday:"hand",
			firstTimeChatter:"firstTime",
			presentation:"presentation",
			returningChatter:"returning",
			hypeChat:"hypeChat",
			new_account:"alert",
		};
		if(hashmap[info.type]) {
			return this.$image("icons/"+hashmap[info.type]+".svg");
		}
		return "";
	}

	public getTooltip(info:TwitchatDataTypes.MessageBadgeData):string {
		if(this.$te("chat.custom_badge.tooltip."+info.type)) {
			return this.$t("chat.custom_badge.tooltip."+info.type, info.tooltipLabelParams || {});
		}
		return info.tooltip ?? "";
	}

}
</script>

<style scoped lang="less">
.chatmessageinfobadges{
	display: inline-flex;
	flex-direction: row;
	align-items: stretch;

	.item {
		border-radius: .25em;
		padding: 1px 3px;
		color: var(--color-button);
		background-color: var(--color-primary);
		white-space: nowrap;
		cursor: default;
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 5px;

		&:not(:last-child) {
			margin-right: .25em;
		}

		&.automod, &.emergencyBlocked, &.restrictedUser {
			background-color: var(--color-alert);
		}

		&.suspiciousUser {
			background-color: var(--color-secondary);
			font-weight: bold;
		}

		img {
			height: .8em;
		}
	}
}
</style>