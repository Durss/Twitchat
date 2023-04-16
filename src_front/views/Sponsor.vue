<template>
	<div class="sponsor">
		<div class="logo">
			<img src="@/assets/logo.svg" alt="Twitchat">
		</div>
	
		<div class="lang">
			<select v-model="$i18n.locale">
				<option value="fr">Français</option>
				<option value="en">English</option>
			</select>
		</div>

		<Button :icon="$image('icons/back.svg')"
			:title="$t('global.back')"
			class="backBt" :to="{name:'home_forced'}" />

		<ParamsSponsor class="content" />
	</div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-facing-decorator';
import ParamsSponsor from '../components/params/contents/ParamsSponsor.vue';
import Button from '../components/Button.vue';

@Component({
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
	color: var(--mainColor_light);
	min-height: 100%;
	background: linear-gradient(180deg, darken(@mainColor_normal, 40%) 0%, var(--mainColor_dark 100%));
	background-size: contain;
	background-repeat: no-repeat;
	background-position: center center;
	margin: auto;
	padding: 2em 5px;
	position: relative;

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

	.lang {
		position: absolute;
		top: 10px;
		right: 10px;
		font-size: .8em;
		select{
			color: var(--mainColor_light);
			background: none;
			border: none;
			option {
				color: var(--mainColor_normal);
			}
		}
	}
}
</style>