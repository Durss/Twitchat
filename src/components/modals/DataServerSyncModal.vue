==<template>
	<div class="dataserversyncmodal">
		<div class="dimmer" ref="dimmer"></div>
		<div class="holder" ref="holder">
			<div class="head" v-if="!loading">
				<span class="title">Sync parameters</span>
			</div>
			<div class="content loading" v-if="loading">
				<img src="@/assets/loader/loader.svg" alt="loader" class="loader">
				<p>please wait...</p>
			</div>
			<div class="content" v-else>
				<div>
					<p v-if="!isNewUser">Until now, your Twitchat parameters were only saved on your cookies.</p>
					<p class="question">Do you want to sync your parameters remotely?</p>
					<ToggleBlock class="details" title="Pros" :open="false" :icons="['pros_purple']">
						<ul>
							<li>You won't lose your parameters after cleaning up your cookies</li>
							<li>Your parameters will be synced across multiple browsers and OBS</li>
							<li>If you use Twitchat on 2 computers, parameters will be shared between them</li>
						</ul>
					</ToggleBlock>

					<ToggleBlock class="details" title="Cons" :open="false" :icons="['cons_purple']">
						<ul>
							<li>If you use Twitchat on 2 computers and you don't want them to have the same parameters, <strong>do not</strong> enable this option on one of them</li>
						</ul>
					</ToggleBlock>

					<div class="ctas">
						<ParamItem class="param" :paramData="sync_params" />
						<!-- <Button big title="🗄️ Save data on Twitchat server" />
						<Button big title="🍪 Keep data on my cookies" highlight /> -->
						<Button title="Submit" />
					</div>
					
					<p class="info">Personnal and sensitive data will never be saved on the server</p>
					<p class="info">You can change this later on <mark>Parameters</mark> => <mark>Account</mark></p>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import Store from '@/store/Store';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ToggleBlock from '../ToggleBlock.vue';
import ParamItem from '../params/ParamItem.vue';
import type { ParameterData } from '@/types/TwitchatDataTypes';
import store from '@/store';

@Options({
	props:{},
	components:{
		Button,
		ParamItem,
		ToggleBlock,
	}
})
export default class DataServerSyncModal extends Vue {

	public isNewUser:boolean = true;
	public loading:boolean = true;
	public sync_params:ParameterData = JSON.parse(JSON.stringify(store.state.accountParams.syncDataWithServer));

	public async mounted():Promise<void> {
		// const data = await res.json();
		this.sync_params.children = [
			{ type:"toggle", value:true, label:"Export current data", tooltip:"Do you want to overwrite<br>remote data with current data?" },
		]

		gsap.from(this.$refs.holder as HTMLDivElement, {scaleX:0, ease:"elastic.out", duration:1});
		gsap.from(this.$refs.holder as HTMLDivElement, {scaleY:0, ease:"elastic.out", duration:1, delay:.1});

		this.isNewUser = !await Store.loadRemoteData(false);
		this.loading = false;
	}

	public close():void {
		gsap.to(this.$refs.holder as HTMLDivElement, {scaleX:0, ease:"elastic.out", duration:1});
		gsap.to(this.$refs.holder as HTMLDivElement, {scaleY:0, ease:"elastic.out", duration:1, delay:.1});
	}

}
</script>{}

<style scoped lang="less">
.dataserversyncmodal{
	// visibility: hidden;
	.modal();
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	z-index: 2;

	.holder {
		z-index: 2;
		.head {
			.title {
				padding-left: 0;
			}
		}

		.content {
			//This avoids black space over sticky items inside the content
			margin-top: 20px;
			padding-top: 0;

			&.loading {
				text-align: center;
				font-style: italic;
			}

			P {
				margin-top: .5em;

				&.question {
					font-weight: bold;
					text-align: center;
				}

				&.info{
					font-style: italic;
					font-size: .8em;
				}
			}

			ul {
				margin-left: 1em;
				li {
					&:not(:last-child) {
						margin-bottom:.5em;
					}
				}
			}
			.details {
				margin-top: .5em;
			}

			.ctas {
				display: flex;
				flex-direction: column;
				align-items: center;
				margin: 2em 0;

				.param {
					width: 300px;
				}

				button:not(:first-child) {
					margin-top: .5em;
				}
			}
		}
	}

	.dimmer {
		z-index: 1;
	}

	mark {
		border: 1px dashed @mainColor_normal;
		background-color: fade(@mainColor_normal, 15%);
		padding: .1em .5em;
		border-radius: .5em;
	}
	
}
</style>