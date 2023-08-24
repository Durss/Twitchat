<template>
	<div class="paramspremium parameterContent">
		<Icon name="premium" class="icon" />
		
		<div class="head">{{ $t("premium.header") }}</div>

		<ParamsAccountPatreon class="card-item" />

		<div class="card-item premium">
			<strong>{{ $t("premium.features_title") }}</strong>
			<PremiumFeatureList />
		</div>

		<div class="card-item description"><Icon name=info />{{ $t("premium.description") }}</div>
	</div>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import { Component, Vue } from 'vue-facing-decorator';
import ParamsAccountPatreon from './account/ParamsAccountPatreon.vue';
import PremiumFeatureList from '@/components/premium/PremiumFeatureList.vue';

@Component({
	components:{
		Icon,
		PremiumFeatureList,
		ParamsAccountPatreon,
	},
	emits:[],
})
export default class ParamsPremium extends Vue {

}
</script>

<style scoped lang="less">
.paramspremium {
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
}
</style>