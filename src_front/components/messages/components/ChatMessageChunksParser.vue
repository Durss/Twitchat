
<template>
	<template v-for="chunk in chunks">
		<template v-if="chunk.type == 'text'">{{ chunk.value }}</template>

		<template v-if="chunk.type == 'user'">
			<a class="login" v-if="$store('params').appearance.highlightusernames.value == true"
			@click.stop="openProfile(chunk.username!)"
			:style="getUserClasses(chunk.username!)"
			target="_blank"><strong>{{ chunk.value }}</strong></a>
			<template v-else>{{ chunk.value }}</template>
		</template>
		
		<tooltip v-else-if="(chunk.type == 'emote' || chunk.type == 'cheermote') && $store('params').appearance.showEmotes.value !== false"
		:content="'<img src='+chunk.emoteHD+' width=\'112\' class=\'emote\'><br><center>'+chunk.value+'</center>'">
			<img :src="chunk.emote" :class='chunk.type' :alt="chunk.value">
		</tooltip>

		<template v-else-if="chunk.type == 'url'">
			<Icon name="copy" theme="secondary" class="copyBt" v-tooltip="$t('global.copy')" @click.stop="copyLink($event, chunk)" />
			<a @click.stop="" :href="chunk.href" target="_blank">{{ chunk.value }}</a>
		</template>

		<mark v-else-if="chunk.type == 'highlight'">{{ chunk.value }}</mark>
	</template>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import Utils from '@/utils/Utils';
import { gsap } from 'gsap';
import type { StyleValue } from 'vue';
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{},
	emits:[],
})
export default class ChatMessageChunksParser extends Vue {

	@Prop
	public platform!:TwitchatDataTypes.ChatPlatform;

	@Prop
	public channel!:string;

	@Prop
	public chunks!:TwitchDataTypes.ParseMessageChunk[];

	public copyLink(e:MouseEvent, chunk:TwitchDataTypes.ParseMessageChunk):void {
		Utils.copyToClipboard(chunk.value);
		e.stopPropagation();
		gsap.fromTo(e.currentTarget, {scale:1.5, filter:"brightness(4)"}, {scale:1, filter:"brightness(1)", duration:0.2, clearProps:"all"});
	}

	public openProfile(username:string):void {
		const user = this.$store("users").getUserFrom(this.platform || "twitch", this.channel, undefined, username);
		this.$store("users").openUserCard(user);
	}

	public getUserClasses(username:string):StyleValue {
		const user = this.$store("users").getUserFrom(this.platform || "twitch", this.channel, undefined, username);
		if(user.color) {
			return {
				color: Utils.getUserColor(user),
			};
		}
		return {};
	}
}
</script>

<style scoped lang="less">
.login:hover {
	background-color: var(--background-color-fader);
	border-radius: 3px;
}
</style>