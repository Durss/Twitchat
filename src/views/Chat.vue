<template>
	<div class="chat">
		<MessageList :max="30" />
	</div>
</template>

<script lang="ts">
import MessageList from '@/components/MessageList.vue';
import { Options, Vue } from 'vue-class-component';

@Options({
	components:{
		MessageList
	}
})
export default class Chat extends Vue {

}

</script>

<style scoped lang="less">
.chat{
}
</style>