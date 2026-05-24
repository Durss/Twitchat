<template>
	<div
		class="chatcustompowerup chatMessage highlight"
		@contextmenu="onContextMenu($event, messageData, $el)"
	>
		<div class="holder">
			<Icon name="watchStreak" />
			<i18n-t scope="global" class="label" tag="span" keypath="chat.custom_power_up.message">
				<template #USER>
					<a
						class="userlink"
						@click.stop="openUserCard(messageData.user, messageData.channel_id)"
						>{{ messageData.user.displayName }}</a
					>
				</template>
				<template #NAME>
					<strong>{{ messageData.powerUpTitle }}</strong>
				</template>
			</i18n-t>
			<div class="cost">{{ messageData.cost }} <Icon class="bitsIcon" name="bits" /></div>
		</div>
	</div>
</template>

<script lang="ts">
import { Component, Prop, toNative } from "vue-facing-decorator";
import Icon from "../Icon.vue";
import AbstractChatMessage from "./AbstractChatMessage";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";

@Component({
	components: {
		Icon,
	},
	emits: ["onRead"],
})
class ChatCustomPowerUp extends AbstractChatMessage {
	@Prop
	declare messageData: TwitchatDataTypes.MessageTwitchCustomPowerUpData;
}
export default toNative(ChatCustomPowerUp);
</script>

<style scoped lang="less">
.chatcustompowerup {
	.cost {
		font-size: 1.25em;
		gap: 0.2em;
		display: flex;
		font-weight: bold;
		flex-direction: row;
		align-items: center;
		flex-shrink: 0;
		.icon {
			height: 0.9em;
		}
	}

	.emote {
		height: 1.5em;

		&.large {
			display: inline-block;
			height: 3em;
		}
	}

	.holder {
		gap: 1em;
		width: 100%;
		display: flex;
		flex-direction: row;
		align-items: center;

		.label {
			flex-grow: 1;
		}

		& > .icon {
			color: #5cffbe;
			width: 1.25em;
			height: 1.25em;
			margin-right: 5px;
			flex-shrink: 0;
		}
	}
}
</style>
