<template>
	<div class="sponsor">
		<div class="gradient"></div>
		
		<div class="logo" ref="logo">
			<img src="@/assets/logo.svg" alt="Twitchat">
		</div>
	
		<div class="lang">
			<select v-model="$i18n.locale">
				<option value="fr">Français</option>
				<option value="en">English</option>
			</select>
		</div>

		<Button icon="back" ref="backBt" primary class="backBt" :to="{name:'home_forced'}">
			{{ $t('global.back') }}
		</Button>

		<ParamsSponsor class="content" ref="content" animate />
	</div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-facing-decorator';
import ParamsSponsor from '../components/params/contents/ParamsSponsor.vue';
import Button from '../components/Button.vue';
import { gsap } from 'gsap';

@Component({
	components:{
		Button,
		ParamsSponsor,
	}
})
export default class Sponsor extends Vue {

	public async mounted():Promise<void> {
		const refs = ["backBt"];
		await this.$nextTick();
		for (let i = 0; i < refs.length; i++) {
			let el = this.$refs[refs[i]] as HTMLElement | Vue;
			if((el as Vue).$el) el = (el as Vue).$el as HTMLElement;
			const delay = i*.1+.5;
			gsap.fromTo(el, {opacity:0, y:-20, scale:.85}, 
							{duration:.5, scale:1, opacity:1, y:0, clearProps:"all", ease: "back.out", delay});
		}
	}

}
</script>

<style scoped lang="less">
.sponsor{
	text-align: center;
	color: var(--color-light);
	min-height: 100%;
	background-image: url("../assets/img/homepage/grain.png");
	margin: auto;
	padding: 4em 5px;
	position: relative;
	overflow: hidden;

	.gradient {
		background: linear-gradient(180deg, var(--color-primary-fadest) 0%, var(--color-secondary-transparent) 100%);
		background-size: 100% 100vh;
		background-repeat: no-repeat;
		background-position: top center;
		width: 100%;
		height: 100vh;
		position: absolute;
		top:0;
		left:0;
		z-index: -1;
	}


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
			color: var(--color-light);
			background: none;
			border: none;
			option {
				color: var(--color-light);
			}
		}
	}
}
</style>