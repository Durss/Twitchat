<template>
	<div class="chatsuspendedtriggerstack chatMessage highlight alert">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>
		
		<div class="head">
			<Icon name="broadcast" alt="icon" class="icon"/>
			<span class="info">{{ $t("chat.suspended_trigger_stack.title") }}</span>
			<div class="history">
				<strong class="content">{{ $t("chat.suspended_trigger_stack.callstack") }}</strong>
				<ul class="callstack">
					<li v-for="(call, index) in messageData.triggerStack.stack" :key="index">
						{{ getLabelFromTriggerId(call.triggerId) }}
					</li>
				</ul>
			</div>
		</div>

		<TTButton @click.stop="resume()"
			v-if="messageData.triggerStack.resume"
			small light alert
			icon="play"
		>{{ $t('chat.suspended_trigger_stack.resumeBt') }}</TTButton>

		<ClearButton class="closeBt" @click.stop="deleteMessage()" small />

	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage';
import TTButton from '@/components/TTButton.vue';
import StoreProxy from '@/store/StoreProxy';
import { TriggerSubTypeLabel, TriggerTypesDefinitionList } from '@/types/TriggerActionDataTypes';
import ClearButton from '../ClearButton.vue';

@Component({
	components:{
		TTButton,
		ClearButton,
	},
	emits:["onRead"]
})
class ChatSuspendedTriggerStack extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageSuspendedTriggerStackData;
	
	public getLabelFromTriggerId(triggerId:string):string {
		const trigger = StoreProxy.triggers.triggerList.find(v=> v.id == triggerId)!;
		const event = TriggerTypesDefinitionList().find(v=> v.value === trigger.type)!;
		return StoreProxy.i18n.t(event?.descriptionKey || event?.labelKey, {SUB_ITEM_NAME: TriggerSubTypeLabel(trigger)});
	}

	public resume():void {
		this.deleteMessage();
		//Wait for message to visually be deleted
		setTimeout(() => {
			this.messageData.triggerStack.resume!();
		}, 1000);
	}

}
export default toNative(ChatSuspendedTriggerStack);
</script>

<style scoped lang="less">
.chatsuspendedtriggerstack{
	flex-direction: row;
	.head {
		flex-grow: 1;
	}
	.info {
		white-space: pre-line;
	}

	.history {
		margin-top: 1em;

		.callstack {
			max-height: 200px;
			overflow-y: auto;
			list-style-position: inside;
			list-style-type: decimal-leading-zero;
		}
	}
}
</style>