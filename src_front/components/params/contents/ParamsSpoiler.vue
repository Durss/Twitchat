<template>
	<div class="paramsspoiler">
		<img src="@/assets/icons/show_purple.svg" alt="emergency icon" class="icon">
		
		<p class="header"></p>
		<i18n-t scope="global" tag="p" class="header" keypath="spoiler.header">
			<template #TAG><mark>||</mark></template>
		</i18n-t>

		<section>
			<p>{{ $t('spoiler.message_example') }}</p>
			<ChatMessage :messageData="spoilerExample" class="example" lightMode />
		</section>

		<section>
			<Splitter class="splitter">{{ $t("spoiler.command.title") }}</Splitter>
			
			<i18n-t scope="global" tag="div" class="item" keypath="spoiler.command.how_to">
				<template #CMD><mark>!spoiler</mark></template>
			</i18n-t>
			<img class="item" src="@/assets/img/spoilerTutorial.png" alt="spoiler tutorial">
			<i18n-t scope="global" tag="div" class="item" keypath="spoiler.command.allowed">
				<template #CMD><mark>!spoiler</mark></template>
			</i18n-t>
			<PermissionsForm class="item perms" v-model="chatCommandPerms" />
		</section>
		
		<section>
			<Splitter class="splitter">{{ $t('spoiler.warning.title') }}</Splitter>
	
			<div class="item disclaimer">
				<i18n-t scope="global" tag="div" class="item" keypath="spoiler.warning.head">
					<template #CMD><mark>!spoiler</mark></template>
				</i18n-t>
				<i18n-t scope="global" tag="div" class="item" keypath="spoiler.warning.example">
					<template #ANSWER><mark>{{ $t("spoiler.warning.example_2") }}</mark></template>
					<template #ROOT><mark>{{ $t("spoiler.warning.example_1") }}</mark></template>
				</i18n-t>
			</div>
			<ul>
				<li>
					<span>{{ $t("spoiler.warning.example_1") }}</span>
					<ul>
						<li>{{ $t("spoiler.warning.example_2") }}</li>
						<li>{{ $t("spoiler.warning.example_3") }}</li>
						<li>{{ $t("spoiler.warning.example_4") }}</li>
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
import PermissionsForm from '../../PermissionsForm.vue';

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
		follower:true,
		follower_duration_ms:0,
		usersAllowed:[],
		usersRefused:[],
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