<template>
	<div :class="classes">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>
		
		<img src="@/assets/icons/block.svg" alt="mod" class="icon">

		
		<div class="content">
			<i18n-t scope="global" :keypath="'chat.blocked_terms.'+messageData.action">
				<template #USER>
					<a class="userlink" @click.stop="openUserCard(messageData.user)">{{messageData.user.displayName}}</a>
				</template>
				<template #TERMS>
					<strong>"{{ messageData.terms.join("\", \"") }}"</strong>
				</template>
			</i18n-t>
		</div>
	</div>
</template>

<script lang="ts">
import { Component, Prop, toNative } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';

@Component({
	components:{},
	emits:['onRead'],
})
class ChatAutomodTermsUpdate extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageBlockedTermsData;

	public get classes():string[] {
		const res:string[] = ["chatautomodtermsupdate","chatMessage","highlight"];
		if(this.messageData.action == "add_blocked") {
			res.push("error");
		}
		if(this.messageData.action == "add_permitted") {
			res.push("success");
		}
		return res;
	}

}
export default toNative(ChatAutomodTermsUpdate);
</script>

<style scoped lang="less">
.chatautomodtermsupdate{
}
</style>