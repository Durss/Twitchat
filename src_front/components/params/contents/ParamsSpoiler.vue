<template>
	<div class="paramsspoiler">
		<img src="@/assets/icons/show_purple.svg" alt="emergency icon" class="icon">
		
		<p class="header">Messages starting with <mark>||</mark> will be masked by default and revealed on hover</p>

		<section>
			<p>Message example:</p>
			<ChatMessage :messageData="spoilerExample" class="example" lightMode />
		</section>

		<section>
			<Splitter class="splitter">Spoil somone else's message</Splitter>
			<div class="item">You can allow your mods to flag a message sent by another viewer as a spoiler by answering the message with the <mark>!spoiler</mark> command</div>
			<div class="item">Users allowed to use <mark>!spoiler</mark> command:</div>
			<PermissionsForm class="item perms" v-model="chatCommandPerms" />
		</section>
		
		<section>
			<Splitter class="splitter">How to spoil another message</Splitter>
			<img class="item" src="@/assets/img/spoilerTutorial.png" alt="spoiler tutorial">
	
			<div class="item disclaimer">
				<div><strong>WARNING:</strong> Twitch's answer system being terribly bad, if you try to use <mark>!spoiler</mark> on an answer, it will actually make the original message <i>(the one the user answered to)</i> as a spoiler instead of its answer.</div>
				<div>For example, bellow, if you try to spoil the <mark>Answer 1</mark> by answering to it, it will actually spoil the <mark>Original message</mark> instead:</div>
			</div>
			<ul>
				<li>
					<span>Original message</span>
					<ul>
						<li>Answer 1</li>
						<li>Answer 2</li>
						<li>Answer 3</li>
					</ul>
				</li>
			</ul>
		</section>
	</div>
</template>

<script lang="ts">
import ChatMessage from '@/components/messages/ChatMessage.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { watch } from 'vue';
import { Options, Vue } from 'vue-class-component';
import Splitter from '../../Splitter.vue';
import PermissionsForm from './obs/PermissionsForm.vue';

@Options({
	props:{},
	components:{
		Splitter,
		ChatMessage,
		PermissionsForm,
	}
})
export default class ParamsSpoiler extends Vue {

	public spoilerExample!:TwitchatDataTypes.MessageChatData;

	public chatCommandPerms:TwitchatDataTypes.PermissionsData = {
		broadcaster:true,
		mods:true,
		vips:false,
		subs:false,
		all:false,
		users:"",
	};

	public beforeMount(): void {
		
		this.$store("debug").simulateMessage(TwitchatDataTypes.TwitchatMessageType.MESSAGE, (data)=> {
			const m = data as TwitchatDataTypes.MessageChatData;
			m.spoiler = true;
			this.spoilerExample = m;
		}, false);

		if(this.$store("chat").spoilerParams.permissions) {
			this.chatCommandPerms = this.$store("chat").spoilerParams.permissions;
		}

		watch(()=>this.chatCommandPerms, ()=> {
			this.$store("chat").setSpoilerParams({
				permissions:this.chatCommandPerms
			});
		}, {deep:true})
	}

}
</script>

<style scoped lang="less">
.paramsspoiler{
	display: flex;
	flex-direction: column;
	justify-content: center;
	padding-top: 0;
	
	section {
		border-radius: .5em;
		background-color: fade(@mainColor_normal_extralight, 30%);
		padding: .5em;
		margin-top: 2em;
		.splitter {
			margin: .25em 0 1em 0;
		}
	}

	&>.icon {
		height: 4em;
		display: block;
		margin: auto;
		margin-bottom: 1em;
	}

	.header {
		text-align: center;
	}

	mark {
		font-weight: bold;
		padding: .25em .5em;
		border-radius: .5em;
		font-size: .8em;
		background: fade(@mainColor_normal, 15%);
	}

	.example {
		background-color: @mainColor_dark;
		padding: 1em;
		border-radius: .5em;
	}


	.item {
		&:not(:nth-child(2)) {
			margin-top: .5em;
		}

		&.perms {
			margin: 0 10%;
			margin-top: 1em;
		}

		&.disclaimer {
			margin-top: 1em;
			font-size: .8em;
			margin-bottom: 1em;
			div:not(:last-child) {
				margin-bottom: .5em;
			}
		}
	}

	ul {
		margin-left: 1em;
		li {
			text-align: left;
			// list-style-type: none;
			// list-style-position: inside;
			padding-left: 0;
			margin-left: 10px;
		}
	}

	img {
		max-width: 100%;
		margin: auto;
		display: block;
	}
}
</style>