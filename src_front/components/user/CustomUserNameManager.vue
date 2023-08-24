<template>
	<div class="customusernamemanager">
		<div class="header">
			<button class="backBt" @click="$emit('close')"><Icon name="back" /></button>
			<h1>{{ $t("usercard.manage_usernames") }}</h1>
		</div>

		<div class="list">
			<div class="card-item user" v-for="u, key in $store('users').customUsernames">
				<button class="deleteBt" v-tooltip="$t('usercard.manage_usernames_removeBt')" @click="deleteCustomName(key as string)"><Icon name="cross" theme="alert" /></button>
				<span class="original" v-tooltip="$t('usercard.manage_usernames_real_tt')">{{ $store("users").getUserFrom(u.platform, u.channel, key as string).displayNameOriginal }}</span>
				<span class="rename" v-tooltip="$t('usercard.manage_usernames_custom_tt')">({{ u.name }})</span>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-facing-decorator';
import Button from '../Button.vue';
import Icon from '../Icon.vue';

@Component({
	components:{
		Icon,
		Button,
	},
	emits:[],
})
export default class CustomUserNameManager extends Vue {

	public async mounted():Promise<void> {
		const customUsernames = this.$store("users").customUsernames;
		for (const uid in customUsernames) {
			const u = customUsernames[uid];
			this.$store("users").getUserFrom(u.platform, u.channel, uid);
		}
	}

	public deleteCustomName(uid:string):void {
		this.$store("users").removeCustomUsername(uid);
	}

}
</script>

<style scoped lang="less">
.customusernamemanager{
	padding-bottom: 4px;//No idea why but this avoids scrollbar to show up when unnecessary

	.header {
		display: flex;
		flex-direction: row;
		.backBt {
			padding: .85em 1em;
			.icon {
				height: 1em;
				transition: transform .15s;
			}
			&:hover {
				.icon {
					transform: scale(1.2);
				}
			}
		}
		h1 {
			font-size: 2em;
			text-align: center;
		}
	}

	h2 {
		font-size: 1.5em;
		text-align: center;
		margin-top: .5em;
	}

	.list {
		gap: .5em;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: center;
		.user {
			display: inline-flex;
			flex-direction: row;
			align-items: center;
			flex-wrap: wrap;
			.deleteBt {
				height: 1em;
				width: 1em;
				margin-right: 5px;
				.icon {
					width: 100%;
					height: 100%;
				}
			}

			.rename {
				font-style: italic;
				margin-left: 2px;
			}
		}
	}
}
</style>