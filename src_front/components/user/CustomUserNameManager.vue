<template>
	<div class="customusernamemanager">
		<div class="header">
			<button class="backBt" @click="emit('close')"><Icon name="back" /></button>
			<h1>{{ $t("usercard.manage_usernames") }}</h1>
		</div>

		<div class="list">
			<div class="card-item user" v-for="item in itemList">
				<button
					class="deleteBt"
					v-tooltip="$t('usercard.manage_usernames_removeBt')"
					@click="deleteCustomName(item.user.id)"
				>
					<Icon name="cross" theme="alert" />
				</button>
				<span class="original" v-tooltip="$t('usercard.manage_usernames_real_tt')">{{
					item.user.displayNameOriginal
				}}</span>
				<span class="rename" v-tooltip="$t('usercard.manage_usernames_custom_tt')"
					>({{ item.customName }})</span
				>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import Icon from "../Icon.vue";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { storeUsers as useStoreUsers } from "@/store/users/storeUsers";

const emit = defineEmits<{ close: [] }>();

const storeUsers = useStoreUsers();

const itemList = ref<{ customName: string; user: TwitchatDataTypes.TwitchatUser }[]>([]);

function deleteCustomName(uid: string): void {
	storeUsers.removeCustomUsername(uid);
	refreshList();
}

function refreshList(): void {
	const customUsernames = storeUsers.customUsernames;
	itemList.value = [];
	for (const uid in customUsernames) {
		const u = customUsernames[uid]!;
		itemList.value.push({
			user: storeUsers.getUserFrom(u.platform, u.channel, uid),
			customName: u.name,
		});
	}
	if (itemList.value.length == 0) {
		emit("close");
	}
}

onMounted(() => {
	refreshList();
});
</script>

<style scoped lang="less">
.customusernamemanager {
	padding-bottom: 4px; //No idea why but this avoids scrollbar to show up when unnecessary

	.header {
		display: flex;
		flex-direction: row;
		align-items: center;
		.backBt {
			padding: 0.85em 1em;
			color: var(--color-text);
			.icon {
				height: 1em;
				transition: transform 0.15s;
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
		margin-top: 0.5em;
	}

	.list {
		gap: 0.5em;
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
