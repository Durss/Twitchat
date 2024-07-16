<template>
	<div :class="classes">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>
		
		<Icon name="block" />
		
		<div class="content">
			<i18n-t scope="global" :keypath="label">
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
import Icon from '../Icon.vue';

@Component({
	components:{
		Icon,
	},
	emits:['onRead'],
})
class ChatAutomodTermsUpdate extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageBlockedTermsData;

	public get label():string {
		let res = "chat.blocked_terms."+this.messageData.action;
		if(this.messageData.temporary === true) {
			res += "_temp";
		}
		return res;
	}

	public get classes():string[] {
		const res:string[] = ["chatautomodtermsupdate","chatMessage","highlight"];
		if(this.messageData.action == "add_blocked" || this.messageData.action == "remove_permitted") {
			res.push("error");
		}
		if(this.messageData.action == "add_permitted" || this.messageData.action == "remove_blocked") {
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