<template>
	<div class="paramstriggers">
		<TriggerActionList />
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
	
}
</style>