<template>
	<div class="changeloglabels">
		<div class="card-item label1">Followers: <strong>{{ followers }}</strong></div>
		<div class="card-item label1">Subs: <strong>{{ subs }}</strong></div>
		<div class="card-item follower">Last follower:<div class="infos"><img :src="lastFollower.avatar" alt="avatar" class=avatar> <strong>{{ lastFollower.login }}</strong></div></div>
		<div class="card-item sub">Last Sub:<div class="infos"><img :src="lastSub.avatar" alt="avatar" class=avatar> <strong>{{ lastSub.login }}</strong> - tier <strong>{{ lastSub.tier }}</strong></div></div>
		<div class="card-item music">Now playing:<div class="infos"><Icon name="music" /> <strong>{{ currentTrack }}</strong></div></div>
		<div class="card-item gigantified">Last gigantified emote: <img :src="gigantified.url" alt="emote"> <strong>{{ gigantified.login }}</strong></div>
	</div>
</template>

<script lang="ts">
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import Icon from "@/components/Icon.vue"
import SpotifyHelper from "@/utils/music/SpotifyHelper"

@Component({
	components:{
		Icon,
	},
	emits:[],
})
class ChangelogLabels extends Vue {

	public get subs():string|number { return this.$store.labels.getLabelByKey("SUB_COUNT") || 1234; }
	public get followers():string|number { return this.$store.labels.getLabelByKey("FOLLOWER_COUNT") || 1234; }
	public get lastFollower():{login:string, avatar:string} {
		return {
			login: this.$store.labels.getLabelByKey("FOLLOWER_NAME") as string || "JaneDoe",
			avatar:  this.$store.labels.getLabelByKey("FOLLOWER_AVATAR") as string || "https://static-cdn.jtvnw.net/user-default-pictures-uv/294c98b5-e34d-42cd-a8f0-140b72fba9b0-profile_image-300x300.png",
		};
	}
	public get lastSub():{login:string, avatar:string, tier:string} {
		return {
			login: this.$store.labels.getLabelByKey("SUB_NAME") as string || "JaneDoe",
			avatar: this.$store.labels.getLabelByKey("SUB_AVATAR") as string || "https://static-cdn.jtvnw.net/user-default-pictures-uv/294c98b5-e34d-42cd-a8f0-140b72fba9b0-profile_image-300x300.png",
			tier: this.$store.labels.getLabelByKey("SUB_TIER") as string || "2",
		};
	}

	public get gigantified():{login:string, url:string} {
		return {
			login: this.$store.labels.getLabelByKey("POWER_UP_GIANTIFIED_NAME") as string || "JaneDoe",
			url:  this.$store.labels.getLabelByKey("POWER_UP_GIANTIFIED_IMAGE") as string || "https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_c1f4899e65cf4f53b2fd98e15733973a/default/light/3.0",
		};
	}

	public get currentTrack():string {
		if(SpotifyHelper.instance.currentTrack.value) {
			return SpotifyHelper.instance.currentTrack.value.title;
		}
		return "Bohemian Rhapsody"
	}
}
export default toNative(ChangelogLabels);
</script>

<style scoped lang="less">
.changeloglabels{
	gap: .5em;
	display: flex;
	align-items: center;
	flex-direction: column;
	.follower, .sub {
		.infos {
			margin-top: .5em;
		}
		img {
			height: 2em;
			border-radius: 50%;
			vertical-align: middle;
		}
	}

	.music {
		max-width: 300px;
		.icon {
			height: 1em;
			margin-right: .5em;
		}
	}

	.music .infos {
		width: max-content;
		white-space: nowrap;
		display: block;
		animation: marquee 5s linear infinite;
		will-change: transform, left;
		transform: translateX(0);
		left: 100%;
		position: relative;
	}

	@keyframes marquee {
		0% { transform: translateX(0); left:100%; }
		100% { transform: translateX(-100%); left:0; }
	}

	.gigantified {
		display: flex;
		flex-direction: column;
		align-items: center;
	}
}
</style>