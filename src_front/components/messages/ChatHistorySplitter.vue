<template>
	<div class="chathistorysplitter chatMessage">
		<Splitter theme="alert">{{ $t("chat.splitter.label") }}</Splitter>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop } from 'vue-facing-decorator';
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
export default class ChatHistorySplitter extends AbstractChatMessage {
	
	@Prop
	declare messageData:TwitchatDataTypes.MessageHistorySplitterData;
	
	@Prop
	declare childrenList:TwitchatDataTypes.MessageHistorySplitterData[];

}
</script>

<style scoped lang="less">
.chathistorysplitter{
}
</style>