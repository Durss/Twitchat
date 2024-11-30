<template>
	<div class="helpgenocidevictims modal">
		<div class="dimmer" ref="dimmer" @click="close()"></div>
		<div class="holder" ref="holder">
			<h1 class="head">
				<span class="title">{{ $t('gaza.title') }}</span>
				<ClearButton @click="close()" />
			</h1>
			<div class="content">
				<p v-for="e in $tm('gaza.description')">{{ e }}</p>

				<div class="ctas">
					
					<TTButton type="link"
					icon="newtab"
					:href="url"
					target="_blank">{{ $t("gaza.open_bt") }}</TTButton>

					<TTButton icon="whispers"
					:loading="sending"
					v-if="!sent"
					@click="sendOnChat()">{{ $t("gaza.send_bt") }}</TTButton>
					<div v-else class="card-item thanks">{{ $t("gaza.thanks") }}</div>
					
					<TTButton type="link"
					icon="newtab" transparent secondary
					href="https://docs.google.com/spreadsheets/d/1-DDMFyn-ttboPXrz1bB3MFk7BlzCwfugh4259Wh7U1s/htmlview"
					target="_blank">{{ $t("gaza.allFunds_bt") }}</TTButton>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import ClearButton from '../ClearButton.vue';
import { gsap } from 'gsap/gsap-core';
import TTButton from '../TTButton.vue';
import MessengerProxy from '@/messaging/MessengerProxy';
import Utils from '@/utils/Utils';
import OverlayInstaller from '../params/contents/overlays/OverlayInstaller.vue';
import Splitter from '../Splitter.vue';
import Icon from '../Icon.vue';
import ParamItem from '@/components/params/ParamItem.vue';
import {type TwitchatDataTypes} from '@/types/TwitchatDataTypes';
import DataStore from '@/store/DataStore';
import { watch } from 'vue';

@Component({
	components:{
		Icon,
		TTButton,
		Splitter,
		ParamItem,
		ClearButton,
		OverlayInstaller,
	},
	emits:["close"]
})
class HelpGenocideVictims extends Vue {

	public sent:boolean = false;
	public sending:boolean = false;
	public url:string = "https://gazafunds.com";

	public mounted():void {
		gsap.set(this.$refs.holder as HTMLElement, {marginTop:0, opacity:1});
		gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:1});
		gsap.from(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.out"});
	}

	public async close():Promise<void> {
		gsap.killTweensOf([this.$refs.holder, this.$refs.dimmer]);
		gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:0, ease:"sine.in"});
		gsap.to(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.in", onComplete:()=> {
			this.$emit('close');
		}});
	}

	public async sendOnChat():Promise<void> {
		this.sending = true;
		MessengerProxy.instance.sendMessage("💖 🍉 => "+this.url);
		await Utils.promisedTimeout(500);
		this.sending = false;
		this.sent = true;
	}

}
export default toNative(HelpGenocideVictims);
</script>

<style scoped lang="less">
.helpgenocidevictims{
	
	z-index: 2;

	.holder {
		line-height: 1.2em;
		width: calc(100% - 2em);
		max-width: 600px;
		height: fit-content;
		max-width: 600px;
		max-height: var(--vh);

		p {
			line-height: 1.5em;
			white-space: pre-line;
		}

		.ctas {
			margin-top: 1em;
			gap:.5em;
			display: flex;
			flex-direction: column;
			align-items: center;
		}

		.thanks {
			font-size: 1.5em;
			font-weight: bold;
			margin: auto;
		}
	}

	.icon {
		height: 1em;
		vertical-align: middle;
	}

	.installer {
		margin-top: .5em;
	}

	.splitter {
		margin-top: 1em;
	}
}
</style>