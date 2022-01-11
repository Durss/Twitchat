<template>
	<div class="chat">
		<MessageList :max="$store.state.params.historySize" />
		<Params />
	</div>
</template>

<script lang="ts">
import MessageList from '@/components/messages/MessageList.vue';
import Params from '@/components/params/Parameters.vue';
import { Options, Vue } from 'vue-class-component';

@Options({
	components:{
		Params,
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