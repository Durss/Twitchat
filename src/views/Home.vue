<template>
	<div class="home">
		<div class="head">
			<h1>Welcome to Twitchat</h1>
		</div>
		<div class="content">
			<p>This app adds adds some features to the Twitch chat to make it easier to follow your viewers and avoid missing some important messages</p>
			<Button title="Chat" :to="{name:'chat'}" />
		</div>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{},
	components:{
		Button,
	}
})
export default class Home extends Vue {
}
</script>

<style scoped lang="less">
.home{
	.block();
	.center();
	color: @mainColor_normal;
	position: absolute;
	
}
</style>