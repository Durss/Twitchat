<template>
	<div class="logout">
		<div class="head">
			<img class="icon" src="@/assets/logo.svg" alt="twitch">
		</div>

		<div class="content">
			<div v-t="'logout.title'"></div>
			<div class="link">
				<a @click="showDetails = !showDetails" v-if="!showDetails" v-t="'logout.are_you'"></a>
			</div>
			<div class="details" v-if="showDetails">
				<p class="row"><strong v-t="'logout.details_head'"></strong></p>
				<p class="row" v-t="'logout.details_1'"></p>
				<p class="row" v-t="'logout.details_2'"></p>
				
				<Button class="row" type="link"
					href="https://www.twitch.tv/settings/connections"
					target=_blank
					:title="$t('logout.settingBt')"
				/>
				<p class="row" v-html="$t('logout.details_3')"></p>
				
				<img src="@/assets/img/logout.png" alt="logout">
			</div>
			<Button :to="{name:'login'}" :title="$t('global.log_in')" class="login" />
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
export default class Logout extends Vue {
	public showDetails = false;
}
</script>

<style scoped lang="less">
.logout{
	.center();
	.block();
	position: absolute;
	width: 400px;
	z-index: 1;
	
	.head {
		margin-bottom:0;
		.icon {
			height: 50px;
		}
	}

	.content {
		text-align: center;
		.link, .details, .login {
			margin-top: 20px;
		}
		img {
			max-width: 100%;
		}
		.row {
			margin-bottom: 1em;
		}
	}

}
</style>