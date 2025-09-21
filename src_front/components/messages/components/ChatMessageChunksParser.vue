
<template>
	<span v-for="chunk in spoiledChunks" :class="{chunk:true, spoilerFrag:chunk.spoiler===true, spoilerTag:chunk.spoilerTag===true}">
		<template v-if="chunk.type == 'text'">{{ chunk.value }}</template>

		<template v-if="chunk.type == 'user'">
			<a class="login" v-if="$store.params.appearance.highlightusernames.value == true"
			@click.stop="openProfile(chunk.username!)"
			:style="getUserClasses(chunk.username!)"
			target="_blank">{{ chunk.value }}</a>
			<mark v-else-if="new RegExp('@?'+$store.auth.twitch.user?.login, 'gi').test(chunk.value)">{{ chunk.value }}</mark>
			<template v-else>{{ chunk.value }}</template>
		</template>
		
		<tooltip :class='chunk.type' v-else-if="(chunk.type == 'emote' || chunk.type == 'cheermote') && $store.params.appearance.showEmotes.value !== false"
		:content="chunk.emoteHD? '<center><img src='+chunk.emoteHD+' width=\''+(largeEmote? 150 : 112)+'\' class=\'emote\'><br>'+chunk.value+'</center>' : ''">
			<img :src="largeEmote? chunk.emoteHD : chunk.emote" :alt="chunk.value" loading="lazy">
		</tooltip>

		<template v-else-if="chunk.type == 'url'">
			<Icon name="copy" theme="secondary" class="copyBt" v-tooltip="$t('global.copy')" @click.stop="copyLink($event, chunk)" />
			<a @click.stop="" :href="chunk.href" target="_blank">{{ chunk.value }}</a>
		</template>

		<mark v-else-if="chunk.type == 'highlight'">{{ chunk.value }}</mark>
	</span>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import { gsap } from 'gsap';
import type { CSSProperties } from 'vue';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{},
	emits:[],
})
class ChatMessageChunksParser extends Vue {

	@Prop
	public platform!:TwitchatDataTypes.ChatPlatform;

	@Prop
	public channel!:string;

	@Prop({default:false, type:Boolean})
	public largeEmote!:boolean;

	@Prop({default:false, type:Boolean})
	public forceSpoiler!:boolean;

	@Prop({default:false, type:Boolean})
	public containsSpoiler!:boolean;

	@Prop
	public chunks!:TwitchatDataTypes.ParseMessageChunk[];

	public get colorDarken():string{
		return this.$store.common.theme == "dark" ? "none" : "brightness(0.8)";
	}

	public get spoiledChunks():TwitchatDataTypes.ParseMessageChunk[] {
		if((!this.forceSpoiler && !this.containsSpoiler) || this.$store.params.features.spoilersEnabled.value !== true) return this.chunks;
		
		const chunks:TwitchatDataTypes.ParseMessageChunk[] = [];

		for (let i = 0; i < this.chunks.length; i++) {
			const chunk = JSON.parse(JSON.stringify(this.chunks[i]));
			if(chunk.type == "text" && chunk.value.indexOf("||") > -1) {
				const spoilChunks = chunk.value.split("||");
				for (let j = 0; j < spoilChunks.length; j++) {
					const spoilChunk = spoilChunks[j];
					if(spoilChunk != "") chunks.push({type:"text", value:spoilChunk});
					if(j < spoilChunks.length-1) {
						chunks.push({type:"text", value:"||"})
					}
				}
			}else{
				chunks.push(chunk);
			}
		}

		let isSpoiler = false;
		for (let i = 0; i < chunks.length; i++) {
			const chunk = chunks[i];
			if(chunk.type == "text" && chunk.value == "||") {
				isSpoiler = !isSpoiler;
				chunk.spoilerTag = true;
			}else if(isSpoiler) {
				chunk.spoiler = true;
			}
			if(this.forceSpoiler === true) chunk.spoiler = true;
		}

		return chunks;
	}

	public copyLink(e:MouseEvent, chunk:TwitchatDataTypes.ParseMessageChunk):void {
		Utils.copyToClipboard(chunk.value);
		e.stopPropagation();
		gsap.fromTo(e.currentTarget, {scale:1.5, filter:"brightness(4)"}, {scale:1, filter:"brightness(1)", duration:0.2, clearProps:"all"});
	}

	public openProfile(username:string):void {
		const channelId = this.channel || this.$store.auth.twitch.user.id;
		const user = this.$store.users.getUserFrom(this.platform || "twitch", channelId, undefined, username);
		this.$store.users.openUserCard(user, channelId, this.platform);
	}

	public getUserClasses(username:string):CSSProperties {
		if(!this.$store.auth.twitch.user) return {color:"#c400da"};
		const color = this.$store.users.getUserColorFromLogin(username, this.platform || "twitch");
		if(color) {
			return {
				color: color,
			};
		}
		return {};
	}
}
export default toNative(ChatMessageChunksParser);
</script>

<style scoped lang="less">

.login {
	filter: v-bind(colorDarken);
	&:hover {
		background-color: var(--background-color-fader);
		border-radius: 3px;
	
		.copyBt {
			width: 1em;
		}
	}
}

.emote {
	img {
		height: 100%;
	}
}
</style>