<template>
	<div class="paramstriggers">
		<img src="@/assets/icons/broadcast_purple.svg" alt="overlay icon" class="icon">

		<p class="header">Execute custom actions based on twitch events.<br></p>
		<p class="useCase"><strong>Use case examples: </strong>control <u>OBS</u> sources and filters; create <u>chat commands</u>; control <u>spotify</u></p>

		<TriggerActionList @setContent="(v:string)=>$emit('setContent', v)" />
	</div>
</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component';
import TriggerActionList from './triggers/TriggerActionList.vue';

@Options({
	props:{},
	components:{
		TriggerActionList,
	},
	emits:["setContent"]
})
export default class ParamsTriggers extends Vue {

}
</script>

<style scoped lang="less">
.paramstriggers{
	.icon {
		height: 4em;
		display: block;
		margin: auto;
		margin-bottom: 1em;
	}

	.header {
		text-align: center;
		margin-bottom: .5em;
	}

	.useCase {
		font-size: .8em;
		margin-bottom: 1em;
	}
}
</style>