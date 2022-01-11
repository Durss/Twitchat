<template>
	<div class="chat">
		<MessageList :max="$store.state.params.historySize" />
		<NewUsers v-if="$store.state.params.firstMessage" />
	</div>
</template>

<script lang="ts">
import MessageList from '@/components/messages/MessageList.vue';
import NewUsers from '@/components/newusers/NewUsers.vue';
import { Options, Vue } from 'vue-class-component';

@Options({
	components:{
		NewUsers,
		MessageList,
	},
	props:{
	},
})
export default class Chat extends Vue {

}

</script>

<style scoped lang="less">
.chat{
}
</style>