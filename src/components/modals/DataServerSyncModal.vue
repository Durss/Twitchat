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
							<li>If you use Twitchat on 2 places and you don't want them to have the same parameters, <strong>do not</strong> enable this option on one of them</li>
						</ul>
					</ToggleBlock>

					<div class="ctas">
						<ParamItem class="param" :paramData="sync_param" />
						<Button title="Submit" @click="submit()" :loading="uploading" />
						<!-- <Button big title="🗄️ Save data on Twitchat server" />
						<Button big title="🍪 Keep data on my cookies" highlight /> -->
					</div>
					
					<p class="info">Personnal and sensitive data will never be saved on the server</p>
					<p class="info">You can change this later on <mark>Parameters</mark> => <mark>Account</mark></p>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import DataStore from '@/store/DataStore';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ParamItem from '../params/ParamItem.vue';
import ToggleBlock from '../ToggleBlock.vue';

@Options({
	props:{},
	components:{
		Button,
		ParamItem,
		ToggleBlock,
	},
	emits:['close'],
})
export default class DataServerSyncModal extends Vue {

	public isNewUser:boolean = true;
	public loading:boolean = true;
	public uploading:boolean = false;
	public sync_param:TwitchatDataTypes.ParameterData = JSON.parse(JSON.stringify(this.$store("account").syncDataWithServer));
	public upload_param:TwitchatDataTypes.ParameterData = { type:"toggle", value:true, label:"Upload current data", tooltip:"Do you want to overwrite remote<br>params with current params?" };

	public async mounted():Promise<void> {
		gsap.from(this.$refs.dimmer as HTMLDivElement, {duration:.25, opacity:0});
		gsap.from(this.$refs.holder as HTMLDivElement, {scaleX:0, ease:"elastic.out", duration:1});
		gsap.from(this.$refs.holder as HTMLDivElement, {scaleY:0, ease:"elastic.out", duration:1, delay:.1});

		this.isNewUser = !await DataStore.loadRemoteData(false);
		if(!this.isNewUser) {
			this.sync_param.children = [this.upload_param];
		}
		this.loading = false;
	}

	public close():void {
		gsap.to(this.$refs.dimmer as HTMLDivElement, {duration:.25, opacity:0});
		gsap.to(this.$refs.holder as HTMLDivElement, {scaleX:0, ease:"elastic.out", duration:1});
		gsap.to(this.$refs.holder as HTMLDivElement, {scaleY:0, ease:"elastic.out", duration:1, delay:.1, onComplete:()=>{
			this.$emit('close');
		}});
	}

	public async submit():Promise<void> {
		this.uploading = true;
		if(this.upload_param.value === true) {
			await DataStore.save(true);
		}
		await DataStore.loadRemoteData(true);
		DataStore.set(DataStore.SYNC_DATA_TO_SERVER, this.sync_param.value);
		this.$store("main").loadDataFromStorage();
		this.close();
		this.uploading = false;
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
				border: 1px solid @mainColor_normal;
				padding: 1em;
				border-radius: 1em;
				font-size: 1.2em;

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