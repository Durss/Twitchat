<template>
	<div class="connecttwitchbot parameterContent beta">
		<Icon name="twitch" alt="twitchbot icon" class="icon" />

		<div class="head">
			<i18n-t scope="global" tag="span" keypath="twitch_bot.header">
				<template #LINK>
					<a href="https://twitchbot.com/" target="_blank"><Icon name="newtab" />TwitchBot</a>
				</template>
			</i18n-t>
		</div>

		<section v-if="!$store.twitchBot.connected">
			<TTButton @click="$store.twitchBot.startAuthFlow($event)"
				icon="twitch"
				:loading="$store.twitchBot.connecting">{{ $t("global.connect") }}</TTButton>
			<div class="card-item alert error" v-if="error" @click="error = false">{{ $t("error.twitch_bot_connect_failed") }}</div>
		</section>


		<section v-if="!$store.twitchBot.connected" class="card-item authHint">
			<p><Icon name="info" />{{ $t("twitch_bot.auth_hint") }}</p>
			<img v-if="$i18n.locale == 'fr'" src="@/assets/img/data_sharing/switchAccount_fr.png" alt="tutorial">
			<img v-else src="@/assets/img/data_sharing/switchAccount_en.png" alt="tutorial">
		</section>

		<section v-if="$store.twitchBot.connected">
			<TTButton alert @click="$store.twitchBot.disconnect()">{{ $t("global.disconnect") }} - {{ $store.twitchBot.userInfos?.login }}</TTButton>
		</section>

		<section v-if="$store.twitchBot.connected && missingRole" class="card-item secondary info">
			<span><Icon name="info" />{{ $t("twitch_bot.hints") }}</span>
			<TTButton icon="mod" @click="addMod()" :loading="loadingRole" secondary light>{{ $t("twitch_bot.add_modBt") }}</TTButton>
			<TTButton icon="mod" @click="addVip()" :loading="loadingRole" secondary light>{{ $t("twitch_bot.add_vipBt") }}</TTButton>
		</section>
	</div>
</template>

<script lang="ts">
import MessageItem from '@/components/messages/MessageItem.vue';
import TTButton from '@/components/TTButton.vue';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { Component, toNative, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		TTButton,
		MessageItem,
	},
	emits:[],
})
class ConnectTwitchBot extends Vue {

	public error = false;
	public missingRole = false;
	public loadingRole = false;

	public async mounted():Promise<void> {
		this.checkRoles();
	}
	
	public async addMod():Promise<void> {
		this.loadingRole = true;
		const chanId = this.$store.auth.twitch.user.id;
		this.$store.users.getUserFrom("twitch", chanId, this.$store.twitchBot.userInfos?.user_id, this.$store.twitchBot.userInfos?.login, undefined, async (user)=>{
			if(await TwitchUtils.addRemoveModerator(false, chanId, user)) {
				user.channelInfo[chanId].is_moderator = true;
			}
			this.checkRoles();
		});
	}
	
	public async addVip():Promise<void> {
		this.loadingRole = true;
		const chanId = this.$store.auth.twitch.user.id;
		this.$store.users.getUserFrom("twitch", chanId, this.$store.twitchBot.userInfos?.user_id, this.$store.twitchBot.userInfos?.login, undefined, async (user)=>{
			if(await TwitchUtils.addRemoveVIP(false, chanId, user)) {
				user.channelInfo[chanId].is_vip = true;
			}
			this.checkRoles();
		});
	}

	private checkRoles():void {
		this.loadingRole = true;
		const chanId = this.$store.auth.twitch.user.id;
		this.$store.users.getUserFrom("twitch", chanId, this.$store.twitchBot.userInfos?.user_id, this.$store.twitchBot.userInfos?.login, undefined, async (user)=>{
			if(!user.channelInfo[chanId].is_broadcaster
			&& !user.channelInfo[chanId].is_vip
			&& !user.channelInfo[chanId].is_moderator) {
				this.missingRole = true;
			}else{
				this.missingRole = false;
			}
			this.loadingRole = false;
		});
	}

}
export default toNative(ConnectTwitchBot);
</script>

<style scoped lang="less">
.connecttwitchbot{
	.error {
		cursor: pointer;
		line-height: 1.2em;
		text-align: center;
		white-space: pre-line;
	}

	.info {
		max-width: 300px;
		.icon {
			height: 1em;
			margin-right: .5em;
		}
	}
	
	.authHint {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1em;
		max-width: 300px;

		.icon {
			height: 1em;
			margin-right: .25em;
		}
	}
}
</style>