<template>
	<div class="queueform sidePanel">
		<div class="head">
			<ClearButton @click="close()" />
			<h1><Icon name="list" class="icon" />{{ $t("queue.panel.title") }}</h1>
			<div class="description">{{ $t("queue.panel.description") }}</div>
		</div>

		<div class="content">
			<ParamsQueue panelContext />
		</div>
	</div>
</template>

<script lang="ts">
import { Component, toNative } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel';
import ClearButton from '../ClearButton.vue';
import ParamsQueue from '../params/contents/ParamsQueue.vue';

@Component({
	components:{
		ClearButton,
		ParamsQueue,
	},
	emits:["close"]
})
class QueueForm extends AbstractSidePanel {


	public async mounted():Promise<void> {
		super.open();
	}

}
export default toNative(QueueForm);
</script>

<style scoped lang="less">
.queueform{
	
}
</style>