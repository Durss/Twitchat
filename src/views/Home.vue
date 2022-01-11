<template>
	<div class="home">
		<Button title="Chat" :to="{name:'chat'}" />
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{},
	components:{
		Button
	}
})
export default class Home extends Vue {

}
</script>

<style scoped lang="less">
.home{
	color: @mainColor_normal;
}
</style>