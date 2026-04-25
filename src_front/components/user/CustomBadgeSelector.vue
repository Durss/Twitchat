<template>
	<div class="custombadgeselector">
		<tooltip tag="div" interactive>
			<template #default>
				<Button
					class="addBt"
					type="file"
					accept="image/*"
					transparent
					theme="secondary"
					@change="onSelectBadgeFile"
				>
					<template #icon><Icon name="add" theme="secondary" /></template>
				</Button>
			</template>

			<template #content v-if="noTooltip === false">
				<div class="list" v-if="storeUsers.customBadgeList.length > 0">
					<Button
						light
						secondary
						small
						icon="edit"
						class="editBt"
						@click="emit('manageBadges')"
						>{{ $t("usercard.manage_badgesBt") }}</Button
					>

					<button
						:class="getBadgeClasses(badge)"
						v-for="badge in storeUsers.customBadgeList"
						:key="badge.id"
						@click="addBadge(badge.id)"
					>
						<img :src="badge.img" />
					</button>
				</div>
				<div v-else>{{ $t("usercard.add_badgeBt_tt") }}</div>
			</template>
		</tooltip>
	</div>
</template>

<script setup lang="ts">
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Utils from "@/utils/Utils";
import Icon from "../Icon.vue";
import Button from "../TTButton.vue";
import { storeUsers as useStoreUsers } from "@/store/users/storeUsers";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";

const props = withDefaults(
	defineProps<{
		user: TwitchatDataTypes.TwitchatUser;
		channelId: string;
		noTooltip?: boolean;
	}>(),
	{
		noTooltip: false,
	},
);

const emit = defineEmits<{
	manageBadges: [];
	limitReached: [];
}>();

const storeUsers = useStoreUsers();
const storeAuth = useStoreAuth();

function onSelectBadgeFile(e: Event): void {
	const input = e.target as HTMLInputElement;

	const files = input.files;
	if (!files || files.length == 0) return;

	Utils.fileToBase64Img(files[0]!).then((base64Img) => {
		const badgeId = storeUsers.createCustomBadge(base64Img);
		if (badgeId !== false && props.user) {
			storeUsers.giveCustomBadge(
				props.user.id,
				props.user.platform,
				badgeId as string,
				props.channelId,
			);
		}
		input.value = "";
	});
}

function getBadgeClasses(badge: TwitchatDataTypes.TwitchatCustomUserBadge): string[] {
	const res: string[] = ["badge"];
	if (!storeAuth.isPremium && badge.enabled === false) res.push("disabled");
	return res;
}

function addBadge(id: string): void {
	if (
		!storeUsers.giveCustomBadge(
			props.user!.id,
			props.user!.platform,
			id as string,
			props.channelId,
		)
	) {
		emit("limitReached");
	}
}
</script>

<style scoped lang="less">
.custombadgeselector {
	position: relative;

	.addBt {
		height: 1.2em; //Dunno why i need these weird values
		width: 1.2em; //Dunno why i need these weird values
		border: 1px dashed var(--color-secondary);
		padding: 2px;
		box-shadow: unset;
		border-radius: 0;
		.icon {
			height: 100%;
			max-width: 100%;
			justify-self: center;
			line-height: 1em;
			:deep(svg) {
				//No idea why i need this *ù@& to get icon properly centered vertically...
				height: 0.8em;
				vertical-align: top;
			}
		}
	}

	.list {
		gap: 1px;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		padding: 5px;
		width: 130px;
		justify-content: center;
		max-height: 300px;
		overflow: auto;
		.badge {
			padding: 2px;
			// background-color: var(--grayout);
			outline: 1px solid var(--color-light-fade);
			img,
			.icon {
				display: block;
				width: 32px;
				height: 32px;
			}

			&:hover {
				outline: 1px solid var(--color-light);
			}

			&.disabled {
				cursor: not-allowed;
				opacity: 0.35;
				outline: 1px dashed var(--color-light);
			}
		}
		.editBt {
			flex-basis: 100%;
			margin-bottom: 0.5em;
		}
	}
}
</style>
