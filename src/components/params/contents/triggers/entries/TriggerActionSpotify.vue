<template>
	<div class="triggeractionspotify">
		<ParamItem class="item file" :paramData="actions_conf" ref="textContent" v-model="action.spotifyAction" />
	</div>
</template>

<script lang="ts">
import { ParameterData, TriggerActionSpotifyData } from '@/store';
import { Options, Vue } from 'vue-class-component';
import ParamItem from '../../../ParamItem.vue';
import ToggleBlock from '../../../../ToggleBlock.vue';

@Options({
	props:{
		action:Object,
		event:String,
	},
	components:{
		ParamItem,
		ToggleBlock,
	},
})
export default class TriggerActionSpotify extends Vue {

	public action!:TriggerActionSpotifyData;
	public event!:string;

	public actions_conf:ParameterData = { label:"Message to send on your chat", type:"text", longText:true, value:"", icon:"whispers_purple.svg" };
}
</script>

<style scoped lang="less">
.triggeractionspotify{
	
}
</style>