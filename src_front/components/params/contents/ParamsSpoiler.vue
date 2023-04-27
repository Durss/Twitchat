<template>
	<div class="paramsspoiler">
		<img src="@/assets/icons/show.svg" alt="emergency icon" class="icon">

		<i18n-t scope="global" tag="p" class="header" keypath="spoiler.header">
			<template #TAG><mark>||</mark></template>
		</i18n-t>

		<section class="card-item">
			<p>{{ $t('spoiler.message_example') }}</p>
			<ChatMessage v-if="spoilerExample" :messageData="spoilerExample" class="example" lightMode />
		</section>

		<Splitter class="splitter">{{ $t("spoiler.command.title") }}</Splitter>

		<section class="form">
			<div class="card-item ">
				<i18n-t scope="global" tag="div" keypath="spoiler.command.allowed">
					<template #CMD><mark>!spoiler</mark></template>
				</i18n-t>
				<PermissionsForm class="perms" v-model="chatCommandPerms" />
			</div>

			<div class="card-item ">
				<i18n-t scope="global" tag="div" keypath="spoiler.command.how_to">
					<template #CMD><mark>!spoiler</mark></template>
				</i18n-t>
				<img class="example" src="@/assets/img/spoilerTutorial.png" alt="spoiler tutorial">
			</div>
		</section>

		<Splitter class="splitter">{{ $t('spoiler.warning.title') }}</Splitter>

		<section class="card-item secondary warning">

			<div class="disclaimer">
				<i18n-t scope="global" tag="div" keypath="spoiler.warning.head">
					<template #CMD><mark>!spoiler</mark></template>
				</i18n-t>
				<i18n-t scope="global" tag="div" keypath="spoiler.warning.example">
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
import { Component, Vue } from 'vue-facing-decorator';
import Splitter from '../../Splitter.vue';
import PermissionsForm from '../../PermissionsForm.vue';
import type IParameterContent from './IParameterContent';

@Component({
	components: {
		Splitter,
		ChatMessage,
		PermissionsForm,
	}
})
export default class ParamsSpoiler extends Vue implements IParameterContent {

	public spoilerExample!: TwitchatDataTypes.MessageChatData;

	public chatCommandPerms: TwitchatDataTypes.PermissionsData = {
		broadcaster: true,
		mods: true,
		vips: false,
		subs: false,
		all: false,
		follower: true,
		follower_duration_ms: 0,
		usersAllowed: [],
		usersRefused: [],
	};

	public beforeMount(): void {

		this.$store("debug").simulateMessage(TwitchatDataTypes.TwitchatMessageType.MESSAGE, (data) => {
			const m = data as TwitchatDataTypes.MessageChatData;
			m.spoiler = true;
			this.spoilerExample = m;
		}, false);

		if (this.$store("chat").spoilerParams.permissions) {
			this.chatCommandPerms = this.$store("chat").spoilerParams.permissions;
		}

		watch(() => this.chatCommandPerms, () => {
			this.$store("chat").setSpoilerParams({
				permissions: this.chatCommandPerms
			});
		}, { deep: true })
	}

	public onNavigateBack(): boolean { return false; }

}
</script>

<style scoped lang="less">
.paramsspoiler {
	gap: 1em;
	display: flex;
	flex-direction: column;
	justify-content: center;
	padding-top: 0;

	.splitter {
		margin-top: 1em;
	}

	section {
		margin: 0 1em;
	}

	&>.icon {
		height: 4em;
		display: block;
		margin: auto;
	}

	.header {
		text-align: center;
	}

	.example {
		background-color: var(--color-dark);
		padding: .5em;
		border-radius: var(--border-radius);
		position: relative;
	}

	.form {
		gap: 1em;
		display: flex;
		flex-direction: column;
		align-items: stretch;

		.example {
			max-width: 100%;
			margin: auto;
			margin-top: 1em;
			display: block;
		}

		.perms {
			width: 100%;
		}
	}

	.warning {
		line-height: 1.5em;

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
	}

}</style>