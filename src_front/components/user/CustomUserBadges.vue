<template>
	<template v-if="badges.length > 0">
		<img class="customUserBadge" v-for="badge in badges" :src="badge.img"
		alt="custom badge"
		@click="$emit('select', badge.id)"
		v-tooltip="tooltip || badge.name || ''">
	</template>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{},
	emits:["select"],
})
export default class CustomUserBadges extends Vue {

	@Prop()
	public user!:TwitchatDataTypes.TwitchatUser;

	@Prop()
	public tooltip!:string;

	@Prop
	public channelId!:string;

	public get badges():TwitchatDataTypes.TwitchatCustomUserBadge[] {
		const isPremium = this.$store.auth.isPremium;
		const res:TwitchatDataTypes.TwitchatCustomUserBadge[] = [];
		const badges = this.$store.users.customUserBadges[this.user.id];
		if(!badges) return [];

		badges.forEach(badge=> {
			let list = this.$store.users.customBadgeList;
			if(!isPremium) {
				list = list.filter(v=>v.enabled !== false);
			}
			const badgeSource = list.find(v=> v.id == badge.id);
			if(badgeSource) {
				res.push(badgeSource);
			}
		});

		return res;
	}

}
</script>