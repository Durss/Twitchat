<template>
	<div class="premiumfeaturelist">
		<ul>
			<li v-for="line in $tm('premium.features')"><Icon name="sub" />{{ line }}</li>
		</ul>
	</div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-facing-decorator';
import Icon from '../Icon.vue';

@Component({
	components:{
		Icon,
	},
	emits:[],
})
export default class PremiumFeatureList extends Vue {

}
</script>

<style scoped lang="less">
.premiumfeaturelist{
	ul {
		li {
			text-align: left;
			list-style-type: none;
			margin: 1em;
			line-height: 1.25em;

			.icon {
				height: 1em;
				margin-right: 1em;
			}
		}
	}
}
</style>