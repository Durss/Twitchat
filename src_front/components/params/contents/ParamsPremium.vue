<template>
	<div class="paramspremium parameterContent">
		<Icon name="premium" class="icon" />
		
		<div class="head">{{ $t("premium.header") }}</div>
		
		<div class="card-item info">
			<Icon name="info" class="icon" />
			<p v-for="i in $tm('donate.infos')" v-html="i"></p>
		</div>

		<ParamsAccountPatreon class="card-item" />

		<div class="card-item premium lifetimePremiumProgress" v-if="showProgress">
			<div class="info">{{ $t("premium.progress") }}</div>
			<div class="card-item progressBar" :style="{backgroundSize:lifetimePercent+'% 100%'}">
				<div class="label">{{ Math.round(lifetimePercent/100*$config.LIFETIME_DONOR_VALUE) }}€ / {{ $config.LIFETIME_DONOR_VALUE }}€</div>
				<div class="labelOver" ref="label">{{ Math.round(lifetimePercent/100*$config.LIFETIME_DONOR_VALUE) }}€ / {{ $config.LIFETIME_DONOR_VALUE }}€</div>
			</div>
			<TTButton class="donateBt" @click="openDonate()" light premium icon="coin">{{ $t("params.categories.sponsor") }}</TTButton>
		</div>

		<SponsorTable />

		<div class="footer">
			<a :href="$router.resolve({name:'privacypolicy'}).href" target="_blank">{{ $t("global.privacy") }}</a>
			<a :href="$router.resolve({name:'termsofuse'}).href" target="_blank">{{ $t("global.terms") }}</a>
			<a :href="'mailto:'+$config.CONTACT_MAIL">{{ $t("global.contact", {MAIL:$config.CONTACT_MAIL}) }}</a>
		</div>
	</div>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import SponsorTable from '@/components/premium/SponsorTable.vue';
import { Component, Vue, toNative } from 'vue-facing-decorator';
import ParamsAccountPatreon from './account/ParamsAccountPatreon.vue';
import { gsap } from 'gsap/gsap-core';
import TTButton from '@/components/TTButton.vue';

@Component({
	components:{
		Icon,
		TTButton,
		SponsorTable,
		ParamsAccountPatreon,
	},
	emits:[],
})
class ParamsPremium extends Vue {

	public get lifetimePercent():number { return this.lifetimePercentEased; }
	public get showProgress():boolean { return this.$store.auth.premiumType != 'lifetime' && this.$store.auth.premiumType != 'gifted' && this.lifetimePercent > 0 && this.lifetimePercent < 100; }
	
	public lifetimePercentEased:number = 0;

	public async mounted():Promise<void> {
		const lifetime = this.$store.auth.lifetimePremiumPercent * 100;
		if(this.showProgress) {
			await this.$nextTick();//wait for the progress bar to build
			this.lifetimePercentEased = .0001;
			gsap.to(this, {lifetimePercentEased:lifetime, duration:2, ease:"sine.out", onUpdate:()=>{
				const label = this.$refs.label as HTMLDivElement;
				label.style.clipPath = `polygon(0 0, ${this.lifetimePercentEased}% 0, ${this.lifetimePercentEased}% 100%, 0 100%)`;
			}});
		}
	}

	public beforeUnmount():void {
		gsap.killTweensOf(this);
	}

	public openDonate():void {
		this.$store.params.openParamsPage("donate");
	}

}
export default toNative(ParamsPremium);
</script>

<style scoped lang="less">
.paramspremium {
	.info {
		margin: auto;
		line-height: 1.25em;
		p:first-of-type {
			display: inline;
		}
		.icon {
			height: 1.3em;
			margin-right: .25em;
			vertical-align: middle;
		}
	}

	.description {
		line-height: 1.25em;
		.icon {
			height: 1em;
			margin-right: .5em;
			vertical-align: middle;
		}
	}

	.premium {
		color: var(--color-text);
		background-color: var(--color-premium-fadest);
		strong {
			display: block;
			font-size: 1.2em;
			text-align: center;
			margin-bottom: .5em;
		}
	}
	.footer {
		gap: .5em;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.lifetimePremiumProgress {
		width: 100%;
		margin: 1em 0;
		background-color: var(--color-premium);
		font-weight: bold;
		.info  {
			text-align: center;
			margin-bottom: .5em;
		}
		.progressBar {
			position: relative;
			margin: auto;
			width: calc(100% - 1em);
			padding: 1em;
			@scale:2px;
			box-shadow: inset -@scale -@scale @scale rgba(255, 255, 255, 0.1), inset @scale @scale @scale rgba(0, 0, 0, .3);
			background-color: var(--color-light-fade);
			background-image: linear-gradient(90deg, var(--color-light) 0%, var(--color-light) 100%);
			background-repeat: no-repeat;
			background-size: 0% 100%;
			.label, .labelOver {
				.center();
				color: #ffffff;
				position: absolute;
				font-size: 1.5em;
				font-weight: bold;
				font-variant-numeric: tabular-nums;
				width: 100%;
				text-align: center;
			}

			.labelOver {
				color: var(--color-premium);
				text-shadow: 1px 1px 2px #000000A0;
			}
		}
		.donateBt {
			display: flex;
			margin: .5em auto 0 auto;
		}
	}
}
</style>