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

				<div class="ctas" v-newflag="{date:1759253466000, id:'gaza:araborg'}">
					<div class="head">
						<a href="https://arab.org/fr/click-to-help/palestine/" target="_blank"><strong>Arab.org <Icon name="newtab"/></strong></a>
						<i>{{ $t("gaza.araborg_head") }}</i>
					</div>
					<TTButton icon="whispers"
						:loading="sendingAraborg"
						v-if="!sentAraborg"
						@click="sendOnChat('https://arab.org/fr/click-to-help/palestine')">{{ $t("gaza.send_bt") }}</TTButton>
						<div v-else class="card-item thanks">{{ $t("gaza.thanks") }}</div>
				</div>

				<div class="ctas">
					
					<div class="head">
						<a href="https://gazafunds.com" target="_blank"><strong>Gazafunds.com <Icon name="newtab"/></strong></a>
						<i>{{ $t("gaza.gazafunds_head") }}</i>
					</div>

					<TTButton icon="whispers"
						:loading="sendingGazafunds"
						v-if="!sentGazafunds"
						@click="sendOnChat('https://gazafunds.com')">{{ $t("gaza.send_bt") }}</TTButton>
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
import ParamItem from '@/components/params/ParamItem.vue';
import MessengerProxy from '@/messaging/MessengerProxy';
import Utils from '@/utils/Utils';
import { gsap } from 'gsap/gsap-core';
import { Component, toNative, Vue } from 'vue-facing-decorator';
import ClearButton from '../ClearButton.vue';
import Icon from '../Icon.vue';
import OverlayInstaller from '../params/contents/overlays/OverlayInstaller.vue';
import Splitter from '../Splitter.vue';
import TTButton from '../TTButton.vue';

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

	public sentGazafunds:boolean = false;
	public sendingGazafunds:boolean = false;
	public sentAraborg:boolean = false;
	public sendingAraborg:boolean = false;

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

	public async sendOnChat(url:string):Promise<void> {
		let message = "";
		if(url.indexOf("arab.org") > -1) {
			this.sentAraborg = false;
			this.sendingAraborg = true;
			message = this.$t("gaza.araborg_message");
		} else {
			this.sentGazafunds = false;
			this.sendingGazafunds = true;
			message = this.$t("gaza.gazafunds_message");
		}
		MessengerProxy.instance.sendMessage(message + url);
		await Utils.promisedTimeout(500);
		if(url.indexOf("arab.org") > -1) {
			this.sentAraborg = true;
			this.sendingAraborg = false;
		} else {
			this.sentGazafunds = true;
			this.sendingGazafunds = false;
		}
	}

}
export default toNative(HelpGenocideVictims);
</script>

<style scoped lang="less">
.helpgenocidevictims{
	
	z-index: 2;

	.holder {
		width: calc(100% - 2em);
		max-width: 600px;
		height: fit-content;
		max-width: 600px;
		max-height: var(--vh);

		p {
			line-height: 1.25em;
			white-space: pre-line;
		}

		.ctas {
			margin-top: 1em;
			gap:.5em;
			display: flex;
			flex-direction: column;
			align-items: flex-start;
			align-self: center;
			justify-self: center;
			min-width: 280px;
			border-radius: var(--border-radius);

			&.newFlag {
				padding: .5em;
			}

			.head {
				display: flex;
				flex-direction: column;
				white-space: pre-line;
			}

			.button {
				align-self: center;
			}
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