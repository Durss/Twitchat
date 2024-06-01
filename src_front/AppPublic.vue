<template>
	<div class="apppublic">
		<router-view />

		<Alert />
	</div>
</template>

<script lang="ts">
import { Component, Vue, toNative } from 'vue-facing-decorator';
import Alert from './views/AlertView.vue';

@Component({
	components:{
		Alert,
	},
	emits:[],
})
class AppPublic extends Vue {

}
export default toNative(AppPublic);
</script>

<style scoped lang="less">
.apppublic{
	min-width: 100vw;
	min-height: 100vh;
}
</style>
