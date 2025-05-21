<template>
	<div class="chatmessageinfobadges">
		<div v-for="i in infos" :class="['item', i.type].join(' ')" v-tooltip="getTooltip(i)">
			<Icon :name="getIcon(i)" :alt="i.label" v-if="getIcon(i)" />
			<span class="label" v-if="getLabel(i)">{{getLabel(i)}}</span>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, toNative, Vue } from 'vue-facing-decorator';

@Component({
	components:{}
})
class ChatMessageInfoBadges extends Vue {

	@Prop
	public infos!:TwitchatDataTypes.MessageBadgeData[];

	public mounted():void {
		
	}

	public getLabel(info:TwitchatDataTypes.MessageBadgeData):string {
		let label = "";
		const hashmap = this.$tm("chat.custom_badge.label") as {[key in TwitchatDataTypes.MessageBadgeDataStringType]:string}
		label = hashmap[info.type] || "";
		if(info.label) label += " "+info.label;
		return label;
	}

	public getIcon(info:TwitchatDataTypes.MessageBadgeData):string {
		const hashmap:Partial<{[key in TwitchatDataTypes.MessageBadgeDataStringType]:string}> = {
			saved:"save",
			pinned:"pin",
			raider:"raid",
			automod:"shield",
			cyphered:"lock_fit",
			new_user:"firstTime",
			restrictedUser:"shield",
			suspiciousUser:"shield",
			emergencyBlocked:"emergency",
			firstToday:"hand",
			firstTimeChatter:"firstTime",
			presentation:"presentation",
			returningChatter:"returning",
			hypeChat:"hypeChat",
			new_account:"alert",
			powerUp:"watchStreak",
			watchStreak:"watchStreak",
		};
		if(hashmap[info.type]) {
			return hashmap[info.type] || "";
		}
		return "";
	}

	public getTooltip(info:TwitchatDataTypes.MessageBadgeData):string {
		let tt = "";
		if(this.$te("chat.custom_badge.tooltip."+info.type)) {
			tt = this.$t("chat.custom_badge.tooltip."+info.type, info.tooltipLabelParams || {});
		}
		if(info.tooltip) tt = info.tooltip;
		return tt ?? "";
	}

}
export default toNative(ChatMessageInfoBadges);
</script>

<style scoped lang="less">
.chatmessageinfobadges{
	display: inline-flex;
	flex-direction: row;
	align-items: stretch;

	.item {
		border-radius: .25em;
		padding: 5px 5px;
		color: var(--color-light);
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

		&.suspiciousUser, &.new_account {
			background-color: var(--color-secondary);
			color: #fff;
			font-weight: 300;
		}

		.icon {
			height: .8em;
		}

		.label {
			margin-top: -.1em;
		}
	}
}
</style>