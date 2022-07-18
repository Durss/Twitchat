<template>
	<div class="paramsspoiler">
		<img src="@/assets/icons/show_purple.svg" alt="emergency icon" class="icon">
		
		<p class="header">Messages starting by <mark>||</mark> will be masked by default and revealed on hover</p>

		<div class="item">You can allow your mods to flag a message sent by another viewer as a spoiler by answering the message with the <mark>!spoiler</mark> command</div>
		<PermissionsForm class="item" v-model="chatCommandPerms" />
		
		<div class="item">How to spoil someone else's message:</div>
		<img class="item" src="@/assets/img/spoilerTutorial.png" alt="spoiler tutorial">

		<div class="item disclaimer">
			<div><strong>WARNING:</strong> Twitch's answer system being terrible, if you try to use <mark>!spoiler</mark> on an answer, it will actually make the original message <i>(the one the user answered to)</i> as a spoiler instead of its anwser.</div>
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
	</div>
</template>

<script lang="ts">
import store from '@/store';
import type { PermissionsData } from '@/types/TwitchatDataTypes';
import { watch } from 'vue';
import { Options, Vue } from 'vue-class-component';
import PermissionsForm from './obs/PermissionsForm.vue';

@Options({
	props:{},
	components:{
		PermissionsForm,
	}
})
export default class ParamsSpoiler extends Vue {

	public chatCommandPerms:PermissionsData = {
		mods:true,
		vips:false,
		subs:false,
		all:false,
		users:"",
	};

	public mounted():void {
		if(store.state.spoilerParams.permissions) {
			this.chatCommandPerms = store.state.spoilerParams.permissions;
		}

		watch(()=>this.chatCommandPerms, ()=> {
			store.dispatch("setSpoilerParams", {
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

	&>.icon {
		height: 4em;
		display: block;
		margin: auto;
		margin-bottom: 1em;
	}

	.header {
		text-align: center;
		margin-bottom: .5em;
	}

	mark {
		font-weight: bold;
		padding: .25em .5em;
		border-radius: .5em;
		font-size: .8em;
		background: fade(@mainColor_normal, 15%);
	}

	.item {
		margin-top: .5em;
		&.label {
			i {
				font-size: .8em;
			}
			.icon {
				width: 1.2em;
				max-height: 1.2em;
				margin-right: .5em;
				margin-bottom: 2px;
				display: inline;
				vertical-align: middle;
			}
			p {
				display: inline;
			}
		}

		&.splitter {
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
	}
}
</style>