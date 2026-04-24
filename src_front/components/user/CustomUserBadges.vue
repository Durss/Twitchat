<template>
	<template v-if="badges.length > 0">
		<img
			class="customUserBadge"
			v-for="badge in badges"
			:src="badge.img"
			alt="custom badge"
			@click="emit('select', badge.id)"
			v-tooltip="tooltip || badge.name || ''"
		/>
	</template>
</template>

<script setup lang="ts">
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeUsers as useStoreUsers } from "@/store/users/storeUsers";
import { computed } from "vue";

const storeAuth = useStoreAuth();
const storeUsers = useStoreUsers();
const emit = defineEmits<{ select: [badgeid: string] }>();
const props = defineProps<{
	user: TwitchatDataTypes.TwitchatUser;
	tooltip?: string;
}>();

const badges = computed(() => {
	const isPremium = storeAuth.isPremium;
	const res: TwitchatDataTypes.TwitchatCustomUserBadge[] = [];
	const badges = storeUsers.customUserBadges[props.user.id];
	if (!badges) return [];

	badges.forEach((badge) => {
		let list = storeUsers.customBadgeList;
		if (!isPremium) {
			list = list.filter((v) => v.enabled !== false);
		}
		const badgeSource = list.find((v) => v.id == badge.id);
		if (badgeSource) {
			res.push(badgeSource);
		}
	});

	return res;
});
</script>
