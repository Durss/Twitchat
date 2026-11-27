<template>
	<div class="connectstreamersonglist parameterContent">
		<Icon name="streamersonglist" class="icon" />

		<div class="head">
			<i18n-t scope="global" tag="span" keypath="streamersonglist.header">
				<template #LINK>
					<a href="https://www.streamersonglist.com/" target="_blank"
						><Icon name="newtab" />StreamerSongList</a
					>
				</template>
			</i18n-t>
		</div>

		<section v-if="!storeStreamerSongList.connected">
			<TTButton
				type="link"
				:href="oAuthURL"
				target="_self"
				:loading="loading"
				icon="online"
				>{{ t("global.connect") }}</TTButton
			>
			<div class="card-item alert error" v-if="error" @click="error = false">
				{{ t("error.streamersonglist_connect_failed") }}
			</div>
		</section>

		<section v-else>
			<ProfileInfoCard
				:avatar="storeStreamerSongList.user?.avatar"
				:name="
					storeStreamerSongList.user?.displayName || storeStreamerSongList.user?.username
				"
				@logout="disconnect()"
			/>
		</section>
	</div>
</template>

<script setup lang="ts">
import TTButton from "@/components/TTButton.vue";
import { storeStreamerSongList as useStoreStreamerSongList } from "@/store/streamersonglist/storeStreamerSongList";
import { onBeforeMount, ref } from "vue";
import { useI18n } from "vue-i18n";
import ProfileInfoCard from "../ProfileInfoCard.vue";

const { t } = useI18n();
const storeStreamerSongList = useStoreStreamerSongList();

const error = ref(false);
const loading = ref(false);
const oAuthURL = ref("");

onBeforeMount(() => {
	if (!storeStreamerSongList.connected) {
		if (storeStreamerSongList.authResult.code) {
			//Complete oauth process
			loading.value = true;
			storeStreamerSongList.getAccessToken().then((success) => {
				error.value = !success;
				loading.value = false;
				if (error.value) {
					loadAuthURL();
				}
			});
		} else {
			//Preload oAuth URL
			loadAuthURL();
		}
	}
});

/**
 * Disconnects from StreamerSongList
 */
function disconnect(): void {
	storeStreamerSongList.disconnect();
	loadAuthURL();
}

/**
 * Initialize the auth url
 */
function loadAuthURL(): void {
	loading.value = true;
	storeStreamerSongList.getOAuthURL().then((res) => {
		oAuthURL.value = res;
		loading.value = false;
	});
}
</script>

<style scoped lang="less">
.connectstreamersonglist {
	.error {
		cursor: pointer;
		line-height: 1.2em;
		text-align: center;
		white-space: pre-line;
	}
}
</style>
