<template>
	<div class="sponsor">
		<div class="gradient"></div>

		<div class="logo" ref="logo">
			<img src="@/assets/logo.svg" alt="Twitchat">
		</div>

		<div class="lang">
			<select v-model="$i18n.locale">
				<option :value="lang" v-for="lang in enabledLocales" :key="lang">{{ $t('global.lang_label', lang)}}</option>
			</select>
		</div>

		<Button icon="back" ref="backBt" primary class="backBt" :to="{name:'home_forced'}">
			{{ $t('global.back') }}
		</Button>

		<ParamsSponsor class="content" ref="content" animate />
	</div>
</template>

<script lang="ts">
import StoreProxy from '@/store/StoreProxy';
import { gsap } from 'gsap';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import TTButton from '../components/TTButton.vue';
import ParamsSponsor from '../components/params/contents/ParamsSponsor.vue';
import type { ComponentPublicInstance } from 'vue';

@Component({
	components:{
		Button: TTButton,
		ParamsSponsor,
	}
})
class Sponsor extends Vue {

	public get enabledLocales():string[] {
		return this.$i18n.availableLocales.filter(v=> {
			let root:any = StoreProxy.i18n.getLocaleMessage(v);
			if(!root.global) return false;
			return root.global.lang_enabled;
		})
	}

	public async mounted():Promise<void> {
		const refs = ["backBt"];
		for (let i = 0; i < refs.length; i++) {
			let el = this.$refs[refs[i]] as HTMLElement | ComponentPublicInstance;
			if((el as ComponentPublicInstance).$el) el = (el as ComponentPublicInstance).$el as HTMLElement;
			const delay = i*.1+.5;
			gsap.fromTo(el, {opacity:0, y:-20, scale:.85},
							{duration:.5, scale:1, opacity:1, y:0, clearProps:"all", ease: "back.out", delay});
		}
	}

}
export default toNative(Sponsor);
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
