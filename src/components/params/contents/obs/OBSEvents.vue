<template>
	<div class="OBSEvents">
		<p class="header">Automatically show/hide OBS sources and filters when a specific Twitchat events occurs<br></p>
		<p class="useCase"><strong>Use case examples :</strong> display an overlay when someone writes on your chat for the first time, when someone subs, when a poll completes, ...</p>

		<!-- <Button title="+ add event" class="addBt" @click="$emit('openSourceForm')" /> -->
		<OBSEventsAction />
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import { Options, Vue } from 'vue-class-component';
import OBSEventsAction from './OBSEventsAction.vue';

@Options({
	props:{},
	components:{
		Button,
		OBSEventsAction,
	},
	emits:['openSourceForm']
})
export default class OBSEvents extends Vue {

	public entries = [];

	public async mounted():Promise<void> {
	}

}
</script>

<style scoped lang="less">
.OBSEvents{
	.header {
		text-align: center;
		margin-bottom: .5em;
	}

	.useCase {
		font-size: .8em;
		margin-bottom: 1em;
	}

	.addBt {
		display: block;
		margin: auto;
	}
}
</style>