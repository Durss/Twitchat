<template>
	<div class="chat">
		<MessageList :max="$store.state.params.historySize" />
		<NewUsers v-if="$store.state.params.firstMessage" />
		<Params />
	</div>
</template>

<script lang="ts">
import MessageList from '@/components/messages/MessageList.vue';
import Params from '@/components/params/Parameters.vue';
import NewUsers from '@/components/newusers/NewUsers.vue';
import { Options, Vue } from 'vue-class-component';

@Options({
	components:{
		Params,
		NewUsers,
		MessageList,
	}
})
export default class Chat extends Vue {

}

</script>

<style scoped lang="less">
.chat{
}
</style>