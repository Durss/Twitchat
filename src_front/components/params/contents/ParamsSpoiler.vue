<template>
	<div class="paramsspoiler parameterContent">
		<Icon name="spoiler" class="icon" />

		<div class="head">
			<i18n-t scope="global" tag="p" class="head" keypath="spoiler.header">
				<template #TAG><mark>||</mark></template>
			</i18n-t>
		</div>

		<section class="card-item">
			<p>{{ $t('spoiler.message_example') }}</p>
			<ChatMessage v-if="spoilerExample" :messageData="spoilerExample" class="example" lightMode />
		</section>

		<ParamItem :paramData="param_autospoil" v-model="param_autospoil.value" @change="save()" v-newflag="{date:1693519200000, id:'params_spoiler1stchatters'}" />

		<Splitter class="splitter">{{ $t("spoiler.command.title") }}</Splitter>

		<section class="form">
			<div class="card-item">
				<i18n-t scope="global" tag="div" keypath="spoiler.command.how_to">
					<template #CMD><mark>!spoiler</mark></template>
				</i18n-t>
				<img class="tuto" src="@/assets/img/spoilerTutorial.png" alt="spoiler tutorial">
			</div>

			<div class="card-item">
				<i18n-t scope="global" tag="div" keypath="spoiler.command.allowed" class="title">
					<template #CMD><mark>!spoiler</mark></template>
				</i18n-t>
				<PermissionsForm class="perms" v-model="chatCommandPerms" />
			</div>
		</section>
	</div>
</template>

<script lang="ts">
import ChatMessage from '@/components/messages/ChatMessage.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { watch } from 'vue';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import Splitter from '../../Splitter.vue';
import PermissionsForm from '../../PermissionsForm.vue';
import type IParameterContent from './IParameterContent';
import ParamItem from '../ParamItem.vue';
import Utils from '@/utils/Utils';

@Component({
	components: {
		Splitter,
		ParamItem,
		ChatMessage,
		PermissionsForm,
	}
})
class ParamsSpoiler extends Vue implements IParameterContent {

	public spoilerExample!: TwitchatDataTypes.MessageChatData;
	public param_autospoil:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"spoiler.autospoil_new_users", icon:"firstTime"};

	public chatCommandPerms: TwitchatDataTypes.PermissionsData = Utils.getDefaultPermissions(true, true, false, false, false, false)
	public beforeMount(): void {

		this.$store.debug.simulateMessage(TwitchatDataTypes.TwitchatMessageType.MESSAGE, (data) => {
			const m = data as TwitchatDataTypes.MessageChatData;
			m.spoiler = true;
			this.spoilerExample = m;
		}, false);

		if (this.$store.chat.spoilerParams.permissions) {
			this.chatCommandPerms = this.$store.chat.spoilerParams.permissions;
		}

		this.param_autospoil.value = this.$store.chat.spoilerParams?.autoSpoilNewUsers === true;

		watch(() => this.chatCommandPerms, () => this.save(), { deep: true })
	}

	public onNavigateBack(): boolean { return false; }

	public save():void {
		this.$store.chat.setSpoilerParams({
			permissions: this.chatCommandPerms,
			autoSpoilNewUsers: this.param_autospoil.value,
		});
	}

}
export default toNative(ParamsSpoiler);
</script>

<style scoped lang="less">
.paramsspoiler {

	.example {
		background-color: var(--background-color-primary);
		padding: .5em;
		position: relative;
	}

	.title {
		margin-bottom: .5em;
	}

	.form {
		gap: 1em;
		display: flex;
		flex-direction: column;
		align-items: stretch;

		.tuto {
			max-width: 100%;
			margin: auto;
			margin-top: .5em;
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
