<template>
	<div class="paramspremium parameterContent">
		<Icon name="sub" class="icon" />
		
		<div class="head">{{ $t("premium.header") }}</div>

		<ParamsAccountPatreon class="card-item" />

		<div class="card-item description"><Icon name=info />{{ $t("premium.description") }}</div>
	</div>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import { Component, Vue } from 'vue-facing-decorator';
import ParamsAccountPatreon from './account/ParamsAccountPatreon.vue';

@Component({
	components:{
		Icon,
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
}
</style>