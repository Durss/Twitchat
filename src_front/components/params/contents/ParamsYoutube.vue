<template>
	<div class="paramsyoutube parameterContent">
		<Icon name="youtube" alt="youtube icon" class="youtube"/>
		<ConnectYoutube />
	</div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-facing-decorator';
import ConnectYoutube from './connexions/ConnectYoutube.vue';
import Icon from '@/components/Icon.vue';

@Component({
	components:{
		Icon,
		ConnectYoutube,
	},
	emits:[],
})
export default class ParamsYoutube extends Vue {

}
</script>

<style scoped lang="less">
.paramsyoutube{
	
}
</style>