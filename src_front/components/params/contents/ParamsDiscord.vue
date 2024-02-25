<template>
	<div class="paramsdiscord parameterContent">
		<Icon name="discord" class="icon" />

		<div class="head">
			<i18n-t scope="global"  tag="p" keypath="discord.header"></i18n-t>
			<TTButton icon="discord" primary type="link" :href="$config.DISCORD_BOT_URL" target="_blank">{{ $t("discord.install_bt") }}</TTButton>
		</div>
		
		<section class="card-item" v-if="stateLoading">
			<Icon class="loader" name="loader" />
		</section>
		
		<template v-else-if="linkedToGuild">
			<section class="card-item linked">
				<i18n-t scope="global"  tag="p" keypath="discord.linked">
					<template #GUILD><mark>{{ linkedToGuild }}</mark></template>
				</i18n-t>
				<TTButton icon="cross" alert @click="unlink()" :loading="submitting">{{ $t("discord.unkinkBt") }}</TTButton>
			</section>

			<section class="card-item colSelector">
				<Icon name="split" />{{$t("discord.chat_col")}}
				<div class="columnList">
					<TTButton v-for="col, index in $store.params.chatColumnsConfig"
					:key="index"
					@click="selectColumn(col.order)"
					:secondary="$store.discord.chatCols.indexOf(col.order) > -1">{{ index+1 }}</TTButton>
				</div>
			</section>

			<section class="card-item chanSelector">
				<Icon name="save" />{{$t("discord.channel_logs")}}
				<ul>
					<li v-for="chan in channelList" :key="chan.id">
						<TTButton :secondary="$store.discord.logChanTarget == chan.id"
						@click="$store.discord.logChanTarget = chan.id; $store.discord.saveParams()">{{ chan.name }}</TTButton>
					</li>
				</ul>
				<div class="card-item info">
					<Icon name="info" />
					<i18n-t scope="global"  tag="span" keypath="discord.channel_logs_info">
						<template #OPTION><mark>{{ $t("chat.context_menu.export_discord") }}</mark></template>
					</i18n-t>
				</div>
			</section>
		</template>
		
		<section class="card-item confirm" v-else-if="linkConfirm">
			<div>{{ $t("discord.install_confirm") }}</div>
			<mark class="discordName">{{ discordName }}</mark>
			<div class="ctas">
				<TTButton icon="cross" alert @click="linkConfirm = false">{{ $t("global.cancel") }}</TTButton>
				<TTButton icon="checkmark" primary @click="confirmLink()" :loading="submitting">{{ $t("global.confirm") }}</TTButton>
			</div>
			<div @click="linkErrorCode = ''" v-if="linkErrorCode" class="card-item alert error">{{ $t("error.discord."+linkErrorCode) }}</div>
		</section>

		<section class="card-item codeForm" v-else>
			<i18n-t scope="global"  tag="p" keypath="discord.install_code">
				<template #CMD><mark>/link</mark></template>
			</i18n-t>
			<div class="code">
				<input type="text" placeholder="_"
					v-for="i, index in codeLength"
					@input="onChange"
					:value="code[index]"
					v-click2Select
					ref="codeInput">
			</div>
			<Icon class="loader" name="loader" v-if="linkLoading" />
			<div @click="linkErrorCode = ''" v-if="linkErrorCode" class="card-item alert error">{{ $t("error.discord."+linkErrorCode) }}</div>
		</section>

	</div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-facing-decorator';
import type IParameterContent from './IParameterContent';
import TTButton from '@/components/TTButton.vue';
import Icon from '@/components/Icon.vue';
import ApiController from '@/utils/ApiController';

@Component({
	components:{
		Icon,
		TTButton,
	},
	emits:[],
})
export default class ParamsDiscord extends Vue implements IParameterContent {

	public code:string = "";
	public codeLength:number = 4;
	public duration:number = 0;
	public discordName:string = "";
	public linkedToGuild:string = "";
	public validateDebounce:number = -1;
	public submitting:boolean = false;
	public stateLoading:boolean = true;
	public linkLoading:boolean = false;
	public linkConfirm:boolean = false;
	public linkErrorCode:string = "";
	// public discordChanId:string = "";
	// public cols:number[] = [];
	public channelList:{id:string, name:string}[] = [];
	
	public async beforeMount():Promise<void> {
		const result = await ApiController.call("discord/link");
		if(result.json.linked === true) {
			this.linkedToGuild = result.json.guildName;
		}
		await this.listChannels();

		this.stateLoading = false;
	}

	public onNavigateBack(): boolean { return false; }

	/**
	 * Called wanytime an input's value changes
	 * cycles the focus and manage copy/paste properly
	 * @param event 
	 */
	public onChange(event:Event):void {
		const inputs = this.$refs.codeInput as HTMLInputElement[];
		const currentInput = event.target as HTMLInputElement;
		if(currentInput.selectionEnd) {
			//Remove all chars after the carret
			currentInput.value = currentInput.value.substring(0,currentInput.selectionEnd);
			
		}
		//Set focus to next input
		let index = inputs.findIndex(v=>v === event.target);
		index ++;
		if(index > inputs.length-1) index = 0;
		inputs[index].focus();
		inputs[index].select();

		//Define new code as a concatenation of all inputs values
		this.code = inputs.map(v=>v.value).join("").substring(0, this.codeLength);

		if(this.code.length == this.codeLength) {
			this.linkLoading = true;
			this.linkErrorCode = "";
			//Debounce updates to avoid spamming server
			clearTimeout(this.validateDebounce);
			this.validateDebounce = setTimeout(()=>{
				this.validateCode();
			}, 500);
		}
	}

	/**
	 * Validate current code
	 */
	public async validateCode():Promise<void> {
		try {
			const result = await ApiController.call("discord/code", "GET", {code:this.code});
			if(result.status !== 200) {
				this.linkErrorCode = result.json.errorCode || "UNKNOWN";
			}else{
				this.discordName = result.json.guildName || "???";
				this.linkConfirm = true;
			}
		}catch(error) {
		}
		this.linkLoading = false;
	}

	/**
	 * Validate discord linking
	 */
	public async confirmLink():Promise<void> {
		this.submitting = true;
		try {
			const result = await ApiController.call("discord/code", "POST", {code:this.code});
			if(result.status !== 200) {
				this.linkErrorCode = result.json.errorCode || "UNKNOWN";
			}else{
				this.linkedToGuild = result.json.guildName!;
				this.$store.auth.twitch.user.discordLinked = true;
				await this.listChannels();
			}
		}catch(error) {
		}
		this.submitting = false;
	}

	/**
	 * Unlink discord
	 */
	public async unlink():Promise<void> {
		this.submitting = true;
		try {
			const result = await ApiController.call("discord/link", "DELETE");
			if(result.json.success) {
				this.linkedToGuild = "";
				this.$store.auth.twitch.user.discordLinked = false;
			}
		}catch(error) {
		}
		this.submitting = false;
	}

	/**
	 * Called when selecting a column
	 */
	public selectColumn(index:number):void {
		const arrayIndex = this.$store.discord.chatCols.indexOf(index);
		if(arrayIndex == -1) {
			this.$store.discord.chatCols.push(index);
		}else{
			this.$store.discord.chatCols.splice(arrayIndex, 1);
		}
		this.$store.discord.saveParams();
	}

	private async listChannels():Promise<void> {
		const res = await ApiController.call("discord/channels");
		if(res.status == 200) {
			this.channelList = res.json.channelList;
		}
	}

}
</script>

<style scoped lang="less">
.paramsdiscord{

	.error {
		cursor: pointer;
	}

	.loader {
		height: 2em;
		margin: auto;
	}

	.linked {
		text-align: center;
		align-items: center;
		.icon {
			height: 1.5em;
		}
	}

	section:not(.codeForm) {
		&>.icon {
			height: 2em;
			vertical-align: middle;
			margin-right: .5em;
		}
	}

	.chanSelector, .colSelector {
		max-width: 350px;
		ul {
			max-height: 200px;
			overflow: auto;
			li {
				margin-bottom: .25em;
				.button {
					width: 100%;
				}
			}
		}
		.info {
			font-size: .8em;
			text-align: justify;
			background-color: var(--color-secondary-fadest);
			.icon {
				height: 1em;
				margin-right: .25em;
			}
		}
		.columnList {
			gap: .5em;
			row-gap: .25em;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			align-items: center;
			justify-content: center;
		}
	}

	.success {
		text-align: center;
		max-width: 400px;
		.icon {
			height: 2em;
		}
	}

	.confirm {
		text-align: center;
		align-items: center;
		.discordName {
			font-size: 1.5em;
		}

		.ctas {
			gap: 1em;
			row-gap: .5em;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
		}
	}
	.codeForm {
		gap: 1em;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		max-width: 400px;
		line-height: 1.2em;
		.code {
			gap: 1em;
			display: flex;
			flex-direction: row;
			input {
				text-transform: uppercase;
				font-size: 3em;
				width: 1.5em;
				text-align: center;
				padding: .25em;
			}
		}
	}
}
</style>