<template>
	<div class="gngngn">
		<div class="dimmer" ref="dimmer" @click="close()"></div>
		<div class="holder">
			<div class="head">
				<span class="title">😡 Unacceptable 😡</span>
				<Button aria-label="Close popin" :icon="$image('icons/cross_white.svg')" class="close" @click="close()" />
			</div>
			<div class="content">
				<p>So, you're angry.</p>
				<p>That's something I can understand.</p>
				<p>May i share my point of view on this?</p>
				<br>
				<p>Twitchat is made by a single person <i>(<a href="http://twitch.tv/durss" target="_blank">hello 👋</a>)</i>) and required at the very least 4-5 months of <strong>FULL TIME</strong> work to date <i>(sept. 2022)</i>.</p>
				<br>
				<p>I'm allowing everyone to use it for free but it costs me money and a lot of time and efforts. I don't get ANY revenue from it besides very few donations <i>(on which I pay 30% taxes)</i>.</p>
				<p>I'm <strong>not</strong> sponsored by any company, I'm <strong>not</strong> gathering your personal info to sell them, and It's ad free <i>(yes)</i>.</p>
				<p><strong>We're not talking about advertising</strong> here. Not like on TV, Twitch or any other platform. I'm not advertising for products or whatever that would generate constant revenues.</p>
				<p>I'm just sharing a link to Twitchat.</p>
				<br>
				<p><strong>You can donate to disable it.</strong></p>
				<p>I'm not even asking for a specific amount. You can donate 1€ if you think my work isn't worth more than that, and you'll be able to disable that message.</p>
				<br>
				<p>And if you don't want to pay anything, Twitchat is <a href="https://github.com/Durss/Twitchat" target="_blank">open-source</a>. You're free to create an instance for yourself!</p>
				<br>
				<p>Finally, please <strong>don't take free services of this scale for granted</strong>. They require a huge effort and lots of knowledges to create.</p>
				<p>They usually are not free unless they sell your personnal data, are sponsored, or come with premium features leaving you with the least interesting ones.</p>
				<p>I'm not doing any of that.</p>
				<p>The only "revenues" I get from Twitchat are the very few donations.</p>
				<br>
				<p>For all these reasons, I don't think it's horrific to push a sporadic message on your chat and I see no good reason for you to be angry about that.</p>
				<br>
				<p>If you still think this automatic message is unacceptable, you're free to stop using Twitchat!</p>
				<br>
				<p>I hope this makes things look less "evil" and that you understand my point of view :)</p>
				<p>Have a nice stream ❤</p>
				<br>
				<p>Best regards,</p>
				<p>Durss</p>
				<br>
				<ToggleBlock class="block" title="Why didn't you warned me before?" small :open="false" v-if="isFreshAdWarning">
					<p>I have.</p>
					<p>Use <strong>/updates</strong> command and read again.</p>
					<p>I also warned about it on <a href="https://twitter.com/_durss/status/1566524588107988998" target="_blank">twitter</a> <i>(for french people)</i> and on <a :href="discordPath" target="_blank">Discord</a>. There's really not much more I could've done.</p>
				</ToggleBlock>
				<ToggleBlock class="block" title="Why posting with my account?" small :open="false">
					<p>Because it's the easiest and because, let's be honnest, if i was posting from another account you would ban it right away.</p>
				</ToggleBlock>
				<ToggleBlock class="block" title="I already tell my viewers about Twitchat regularly, I don't like this intrusive message!" small :open="false">
					<p>Well, thank you.</p>
					<p>But I have no way to know about that.</p>
					<p>Still, you can customize the message and everytime a link to "twitchat.fr" is sent on the chat <i>(by any viewer, wizebot, nightbot, etc...)</i> the timer is reset to 0.</p>
					<p>This means that when telling about Twitchat to your viewers, if you send the link, the 2h timer will be reset.</p>
				</ToggleBlock>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import Config from '@/utils/Config';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ToggleBlock from '../ToggleBlock.vue';

@Options({
	props:{},
	components:{
		Button,
		ToggleBlock,
	},
	emits:["close"]
})
export default class Gngngn extends Vue {

	public get discordPath():string { return Config.instance.DISCORD_URL; }
	public get isFreshAdWarning():boolean { return this.appVersion == "6.1.2"; }
	public get appVersion():string { return import.meta.env.PACKAGE_VERSION; }

	public mounted():void {
	}

	public async close():Promise<void> {
		this.$emit('close');
	}
}
</script>

<style scoped lang="less">
.gngngn{
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	z-index: 2;
	.modal();

	.holder {
		max-height: 625px;
		line-height: 1.2em;

		.block {
			margin-bottom: .5em;
		}
	}

}
</style>