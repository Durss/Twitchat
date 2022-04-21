<template>
	<div class="obssources">
		<p class="header">Automatically show/hide OBS sources on specific Twitchat events.<br></p>
		<p class="useCase"><strong>Use case example :</strong> display an overlay when someone writes on your chat for the first time</p>

		<Button title="+ add event" class="addBt" @click="$emit('openSourceForm')" />

		<OBSSourcesEntry
			v-for="(e, index) in entries" :key="index"
		/>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import { Options, Vue } from 'vue-class-component';
import OBSSourcesEntry from './sources/OBSSourcesEntry.vue';

@Options({
	props:{},
	components:{
		Button,
		OBSSourcesEntry,
	},
	emits:['openSourceForm']
})
export default class OBSSources extends Vue {

	public entries = [];

	public async mounted():Promise<void> {
	}

}
</script>

<style scoped lang="less">
.obssources{
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