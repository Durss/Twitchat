<template>
	<div class="paramsyoutube parameterContent">
		<Icon name="youtube" alt="youtube icon" class="youtube"/>
		<ConnectYoutube />
	</div>
</template>

<script lang="ts">
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import ConnectYoutube from './connexions/ConnectYoutube.vue';
import Icon from '@/components/Icon.vue';

@Component({
	components:{
		Icon,
		ConnectYoutube,
	},
	emits:[],
})
 class ParamsYoutube extends Vue {

}
export default toNative(ParamsYoutube);
</script>

<style scoped lang="less">
.paramsyoutube{
	
}
</style>