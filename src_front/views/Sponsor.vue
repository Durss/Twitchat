<template>
	<div class="sponsor">
		<div class="logo">
			<img src="@/assets/logo.svg" alt="Twitchat">
		</div>

		<Button :icon="$image('icons/back.svg')"
			:title="$t('global.back')"
			class="backBt" :to="{name:'home_forced'}" />

		<ParamsSponsor class="content" />
	</div>
</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component';
import ParamsSponsor from '../components/params/contents/ParamsSponsor.vue';
import Button from '../components/Button.vue';

@Options({
	props:{},
	components:{
		Button,
		ParamsSponsor,
	}
})
export default class Sponsor extends Vue {

}
</script>

<style scoped lang="less">
.sponsor{
	text-align: center;
	color: @mainColor_light;
	min-height: 100%;
	background: linear-gradient(180deg, darken(@mainColor_normal, 40%) 0%, @mainColor_dark 100%);
	background-size: contain;
	background-repeat: no-repeat;
	background-position: center center;
	margin: auto;
	padding: 2em 5px;

	.logo {
		width: 80vw;
		max-width: 400px;
		margin: auto;
		img {
			filter: drop-shadow(0 10px 20px fade(#000000, 50%));
		}
	}

	.backBt {
		margin-top: 2em;
	}

	.content {
		margin: auto;
		margin-top: 2em;
		max-width: 600px;
	}
}
</style>