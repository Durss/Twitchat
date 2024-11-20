<template>
	<div class="paramsgoxlr parameterContent">
		<Icon name="goxlr" class="icon" />
		
		<div class="head">
			<i18n-t scope="global" tag="span" keypath="goxlr.header">
				<template #LINK>
					<a href="https://github.com/GoXLR-on-Linux/goxlr-utility/releases/latest" target="_blank"><Icon name="newtab" />{{ $t("goxlr.header_link") }}</a>
				</template>
			</i18n-t>
		</div>

		<template v-if="$store.auth.isPremium">
			<ParamItem class="item enableBt" :paramData="param_enabled" v-model="param_enabled.value" @change="toggleState()" />
	
			<section v-if="connecting" class="card-item">
				<Icon class="item center" name="loader" />
				<div class="item center">{{ $t("goxlr.connecting") }}</div>
			</section>
	
			<div class="fadeHolder" :style="holderStyles">
				<GoXLRConnectForm />
			</div>
		</template>
		<template v-else>
			<TTButton class="premiumBt" icon="premium" @click="openPremium()" premium big>{{ $t('premium.become_premiumBt')  }}</TTButton>
			<img src="@/assets/img/goxlr_features.png" alt="goxlr" class="interfaceExample">
		</template>

		<section class="card-item alert error" v-if="connected && noDevice">
			<div class="item">{{ $t("goxlr.no_device") }}</div>
		</section>

		<div class="fadeHolder" :style="subholderStyles" v-if="connected">
			<ToggleBlock :icons="['scroll']" :title="$t('goxlr.scroll_info')">
				<ParamItem class="item" :paramData="param_chatColIndexScroll" noBackground @change="onSelectChatColumnIndex()" />
				
				<template v-if="param_chatColIndexScroll.value >= 0">
					<div class="item center">{{ $t("goxlr.scroll_select_encoder") }}</div>
					<div class="item card-item secondary" v-if="showEncoderWarning">{{ $t("goxlr.pitch_warning") }}</div>
					<GoXLRUI class="item" childMode knobMode v-model="knobSelectionScroll" @change="onGoXLRSelectionChange()" />
				</template>
			</ToggleBlock>
		</div>

		<div class="fadeHolder" :style="subholderStyles" v-if="connected">
			<ToggleBlock :icons="['read']" :title="$t('goxlr.readMark_info')">
				<ParamItem class="item" :paramData="param_chatColIndexMarkRead" noBackground @change="onSelectChatColumnIndex()" />
				
				<template v-if="param_chatColIndexMarkRead.value >= 0">
					<div class="item center">{{ $t("goxlr.readMark_select_encoder") }}</div>
					<div class="item card-item secondary" v-if="showEncoderWarning">{{ $t("goxlr.pitch_warning") }}</div>
					<GoXLRUI class="item" childMode knobMode v-model="knobSelectionReadMark" @change="onGoXLRSelectionChange(true)" />
				</template>
			</ToggleBlock>
		</div>
		
		<div class="card-item secondary goxlrmini" v-if="connected && isGoXLRMini">
			<Icon name="alert" />{{ $t("goxlr.goxlrmini_alert") }}
		</div>
		
		<section class="card-item info">
			<p v-for="info, index in $tm('goxlr.infos')"><Icon name="info" v-if="index === 0" />{{ info }}</p>
			<TTButton class="triggersBt" @click="openTriggers()">{{ $t("goxlr.triggersBt") }}</TTButton>
		</section>

		<div class="youtubeLinks">
			<a href="https://www.youtube.com/watch?v=4EqwWVK7BAA" target="_blank">
				<img src="@/assets/img/youtube_goxlr1.jpg" alt="youtube example" class="youtubeBt">
			</a>
			<a href="https://www.youtube.com/watch?v=epfuG9K1vtc" target="_blank">
				<img src="@/assets/img/youtube_goxlr2.jpg" alt="youtube example" class="youtubeBt">
			</a>
		</div>
	
		<i18n-t scope="global" class="donate" tag="div" keypath="goxlr.donate">
			<template #LINK>
				<a href="https://ko-fi.com/frostycoolslug" target="_blank">{{ $t("goxlr.donate_link") }}</a>
			</template>
		</i18n-t>
	</div>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import Icon from '@/components/Icon.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import GoXLRUI from '@/components/goxlr/GoXLRUI.vue';
import type { GoXLRTypes } from '@/types/GoXLRTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import GoXLRSocket from '@/utils/goxlr/GoXLRSocket';
import type { CSSProperties } from 'vue';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import Splitter from '../../../Splitter.vue';
import ParamItem from '../../ParamItem.vue';
import GoXLRConnectForm from '../goxlr/GoXLRConnectForm.vue';

@Component({
	components:{
		Icon,
		TTButton,
		GoXLRUI,
		Splitter,
		ParamItem,
		ToggleBlock,
		GoXLRConnectForm,
	},
	emits:[],
})
class ConnectGoXLR extends Vue {

	public connecting:boolean = false;
	public showEncoderWarning:boolean = false;
	public knobSelectionScroll:GoXLRTypes.ButtonTypesData[] = [];
	public knobSelectionReadMark:GoXLRTypes.ButtonTypesData[] = [];

	public param_enabled:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"global.enable"};
	public param_chatColIndexScroll:TwitchatDataTypes.ParameterData<number> = {type:"list", value:-1, labelKey:"goxlr.param_chat_col"};
	public param_chatColIndexMarkRead:TwitchatDataTypes.ParameterData<number> = {type:"list", value:-1, labelKey:"goxlr.param_chat_col"};

	public get connected():boolean { return GoXLRSocket.instance.connected === true; }
	public get noDevice():boolean { return GoXLRSocket.instance.status == null; }
	public get isGoXLRMini():boolean { return GoXLRSocket.instance.isGoXLRMini; }

	public get holderStyles():CSSProperties {
		return {
			opacity:this.param_enabled.value === true && !this.connecting? 1 : .5,
			pointerEvents:this.param_enabled.value === true && !this.connecting? "all" : "none",
		};
	}

	public get subholderStyles():CSSProperties {
		return {
			opacity:this.connected === true && !this.connecting && !this.isGoXLRMini? 1 : .35,
			pointerEvents:this.connected === true && !this.connecting? "all" : "none",
		};
	}

	public beforeMount():void {
		this.param_enabled.value = this.$store.params.goxlrConfig.enabled;
		const cols:TwitchatDataTypes.ParameterDataListValue<number>[] = [
			{value:-1, labelKey:"global.select_placeholder"}
		];
		for (let i = 0; i < this.$store.params.chatColumnsConfig.length; i++) {
			cols.push({value:i, label:(i+1).toString()});
		}
		this.param_chatColIndexScroll.listValues = cols;
		this.param_chatColIndexMarkRead.listValues = cols;
	}

	/**
	 * Called when clicking triggers button
	 */
	public openTriggers():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.TRIGGERS);
	}

	/**
	 * Called when toggling the "enabled" state
	 */
	public toggleState():void {
		this.$store.params.setGoXLREnabled(this.param_enabled.value);
	}

	/**
	 * Opens the premium param page
	 */
	public openPremium():void{
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
	}

	/**
	 * Called when selecting a new chat column index
	 */
	public onSelectChatColumnIndex():void {
		const configs = this.$store.params.goxlrConfig;
		if(this.param_chatColIndexScroll.value > -1) {
			this.knobSelectionScroll = configs.chatScrollSources[this.param_chatColIndexScroll.value] || [];
		}
		if(this.param_chatColIndexMarkRead.value > -1 && configs.chatReadMarkSources) {
			this.knobSelectionReadMark = configs.chatReadMarkSources[this.param_chatColIndexMarkRead.value] || [];
		}
	}

	/**
	 * Called when selection changes on GoXLR UI
	 */
	public onGoXLRSelectionChange(readMarkMode:boolean = false):void {
		if(readMarkMode) {
			//Extract last knob ID
			const knobs = this.knobSelectionReadMark.filter(v => v == "reverb" || v == "echo" || v == "pitch" || v == "gender");
			const knob = knobs.pop();
			//Remove all knob IDs and push the previously extracted one
			const list:typeof this.knobSelectionReadMark = this.knobSelectionReadMark.filter(v => v != "reverb" && v != "echo" && v != "pitch" && v != "gender");
			if(knob) list.push(knob);
			this.knobSelectionReadMark = list;
			this.showEncoderWarning = list[list.length-1] == "pitch";
			const index = this.param_chatColIndexMarkRead.value;
			this.$store.params.setGoXLRChatColReadMarkParams(index, list);
		}else{
			//Extract last knob ID
			const knobs = this.knobSelectionScroll.filter(v => v == "reverb" || v == "echo" || v == "pitch" || v == "gender");
			const knob = knobs.pop();
			//Remove all knob IDs and push the previously extracted one
			const list:typeof this.knobSelectionReadMark = this.knobSelectionScroll.filter(v => v != "reverb" && v != "echo" && v != "pitch" && v != "gender");
			if(knob) list.push(knob);
			this.knobSelectionScroll = list;
			this.showEncoderWarning = list[list.length-1] == "pitch";
			const index = this.param_chatColIndexScroll.value;
			this.$store.params.setGoXLRChatColScrollParams(index, list);
		}
	}
}
export default toNative(ConnectGoXLR);
</script>

<style scoped lang="less">
.paramsgoxlr{
	.head {
		white-space: pre-line;
	}
	.premium {
		align-self: center;
	}
	.fadeHolder {
		transition: opacity .2s;
		width: 100%;
		gap: 1em;
		display: flex;
		flex-direction: column;
	}

	.interfaceExample {
		max-width: 400px;
		margin: auto;
	}

	.youtubeLinks {
		gap: 1em;
		display: flex;
		flex-wrap: wrap;
		flex-direction: row;
		justify-content: center;
		.youtubeBt {
			.emboss();
			width: 200px;
			border-radius: var(--border-radius);
		}
	}

	.goxlrmini {
		.icon {
			height: 1em;
			margin-right: .5em;
		}
	}

	section, .toggleblock {
		
		.item {
			&:not(:first-child) {
				margin-top: .5em;
			}
			&.splitter {
				margin: .5em 0 1em 0;
			}
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
			&.small {
				font-size: .8em;
			}
			&.center {
				display: block;
				margin-left: auto;
				margin-right: auto;
				text-align: center;
			}
			&.shrinkInput {
				:deep(.inputHolder) {
					max-width: 150px;
				}
				:deep(input) {
					max-width: 150px;
				}
			}
			&.param {
				margin-top: 0;
				:deep(.icon) {
					width: 2em;
					height: 2em;
				}
				:deep(.content) {
					align-items: center;
				}
			}
			&.users {
				padding-left: 1em;
			}
		}

		&.error {
			text-align: center;
		}

		&.info {
			p:first-of-type {
				display: inline;
			}
			.triggersBt {
				margin: auto;
			}
			.icon {
				height: 1em;
				margin-right: .25em;
				vertical-align: middle;
			}
		}
		&.scroll {
			margin: 0;
		}
	}

	.donate {
		text-align: center;
		font-style: italic;
		text-decoration: none;
		line-height: 1.25em;
	}
	
}
</style>