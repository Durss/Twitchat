<template>
	<div class="chathistorysplitter chatMessage">
		<Splitter theme="alert">{{ $t("chat.splitter.label") }}</Splitter>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage';
import Splitter from '../Splitter.vue';
import Icon from '../Icon.vue';

@Component({
	components:{
		Icon,
		Splitter,
	},
	emits:["onRead"],
})
class ChatHistorySplitter extends AbstractChatMessage {
	
	@Prop
	declare messageData:TwitchatDataTypes.MessageHistorySplitterData;
	
	@Prop
	declare childrenList:TwitchatDataTypes.MessageHistorySplitterData[];

}
export default toNative(ChatHistorySplitter);
</script>

<style scoped lang="less">
.chathistorysplitter{
}
</style>