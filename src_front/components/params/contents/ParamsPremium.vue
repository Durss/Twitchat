<template>
	<div class="paramspremium parameterContent">
		<Icon name="premium" class="icon" />
		
		<div class="head">{{ $t("premium.header") }}</div>
		
		<!-- <div class="card-item description"><Icon name=info />{{ $t("premium.description") }}</div> -->
		
		<div class="card-item info">
			<Icon name="info" class="icon" />
			<p v-for="i in $tm('donate.infos')" v-html="i"></p>
		</div>

		<ParamsAccountPatreon class="card-item" />

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
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import ParamsAccountPatreon from './account/ParamsAccountPatreon.vue';
import SponsorTable from '@/components/premium/SponsorTable.vue';

@Component({
	components:{
		Icon,
		SponsorTable,
		ParamsAccountPatreon,
	},
	emits:[],
})
 class ParamsPremium extends Vue {

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
}
</style>