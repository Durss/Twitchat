<template>
	<div class="customusernamemanager">
		<div class="header">
			<button class="backBt" @click="$emit('close')"><Icon name="back" /></button>
			<h1>{{ $t("usercard.manage_usernames") }}</h1>
		</div>

		<div class="list">
			<div class="card-item user" v-for="item in itemList">
				<button class="deleteBt" v-tooltip="$t('usercard.manage_usernames_removeBt')" @click="deleteCustomName(item.user.id)"><Icon name="cross" theme="alert" /></button>
				<span class="original" v-tooltip="$t('usercard.manage_usernames_real_tt')">{{ item.user.displayNameOriginal }}</span>
				<span class="rename" v-tooltip="$t('usercard.manage_usernames_custom_tt')">({{ item.customName }})</span>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import TTButton from '../TTButton.vue';
import Icon from '../Icon.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';

@Component({
	components:{
		Icon,
		Button: TTButton,
	},
	emits:["close"],
})
class CustomUserNameManager extends Vue {

	public itemList:{customName:string, user:TwitchatDataTypes.TwitchatUser}[] = [];

	public async mounted():Promise<void> {
		const customUsernames = this.$store.users.customUsernames;
		for (const uid in customUsernames) {
			const u = customUsernames[uid];
			this.itemList.push( {user: this.$store.users.getUserFrom(u.platform, u.channel, uid), customName:u.name } );
		}
	}

	public deleteCustomName(uid:string):void {
		this.$store.users.removeCustomUsername(uid);
	}

}
export default toNative(CustomUserNameManager);
</script>

<style scoped lang="less">
.customusernamemanager{
	padding-bottom: 4px;//No idea why but this avoids scrollbar to show up when unnecessary

	.header {
		display: flex;
		flex-direction: row;
		align-items: center;
		.backBt {
			padding: .85em 1em;
			color:var(--color-text);
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
			flex-grow: 1;
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
		justify-content: flex-start;
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