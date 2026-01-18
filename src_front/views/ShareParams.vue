<template>
	<div :class="classes">

		<div class="dimmer" ref="dimmer" @click="close()"></div>

		<div class="holder" ref="holder">
			<div class="head">
				<span class="title">{{$t("shareParams.title")}}</span>
				<ClearButton @click="close()" />
			</div>

			<div class="content success" v-if="success">
				<Icon name="checkmark" />
				<i18n-t tag="div" scope="global" keypath="shareParams.success">
					<template #USER>
						<Icon name="loader" v-if="!remoteUser" />
						<strong v-else>"{{ remoteUser.display_name }}"</strong>
					</template>
				</i18n-t>
				<TTButton @click="reload()" icon="refresh" light primary>{{ $t("shareParams.reloadBt") }}</TTButton>
			</div>

			<div class="content error" v-else-if="wrongAccount">
				<Icon name="alert" />
				<i18n-t tag="div" scope="global" keypath="shareParams.wrongAccount">
				</i18n-t>
				<img v-if="$i18n.locale == 'fr'" src="@/assets/img/data_sharing/switchAccount_fr.png" alt="tutorial">
				<img v-else src="@/assets/img/data_sharing/switchAccount_en.png" alt="tutorial">
				<TTButton @click="close()" light alert>{{ $t("global.close") }}</TTButton>
			</div>

			<div class="content error" v-else-if="error">
				<Icon name="alert" />
				<div v-if="errorDetails">{{ errorDetails }}</div>
				<div v-else>{{ $t("shareParams.error") }}</div>
				<TTButton @click="close()" light alert>{{ $t("global.close") }}</TTButton>
			</div>

			<div class="content" v-else>
				<i18n-t tag="div" scope="global" keypath="shareParams.description">
					<template #REMOTE_USER>
						<Icon name="loader" v-if="!remoteUser" />
						<strong v-else>"{{ remoteUser.display_name }}"</strong>
					</template>
					<template #CURRENT_USER>
						<strong>"{{ $store.auth.twitch.user.displayNameOriginal }}"</strong>
					</template>
				</i18n-t>
				<div class="ctas">
					<TTButton icon="cross" @click="close()" :loading="confirming" alert>{{ $t("global.cancel") }}</TTButton>
					<TTButton icon="checkmark" @click="confirm()" :loading="confirming" primary>{{ $t("shareParams.agreeBt") }}</TTButton>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import ClearButton from '@/components/ClearButton.vue';
import Icon from '@/components/Icon.vue';
import TTButton from '@/components/TTButton.vue';
import ScopeSelector from '@/components/login/ScopeSelector.vue';
import DataStore from '@/store/DataStore';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import ApiHelper from '@/utils/ApiHelper';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { gsap } from 'gsap';
import { Component, Vue, toNative } from 'vue-facing-decorator';

@Component({
	components:{
		Icon,
		TTButton,
		ClearButton,
		ScopeSelector,
	},
	emits:["close"]
})
class ShareParams extends Vue {

	public error:boolean = false;
	public success:boolean = false;
	public errorDetails:string = "";
	public confirming:boolean = false;
	public wrongAccount:boolean = false;
	public remoteUser:TwitchDataTypes.UserInfo|null = null;
	
	private csrfToken:string = "";

	public get classes():string[] {
		const res:string[] = ["shareparams","modal"];
		if(this.error) res.push("error");
		if(this.success) res.push("success");
		if(this.wrongAccount) res.push("secondary");
		return res;
	}

	public async beforeMount():Promise<void> {
		const data = this.$store.main.tempStoreValue as {uid:string, csrf:string}|undefined;
		if(data && data.uid && data.csrf) {
			if(data.uid == this.$store.auth.twitch.user.id) {
				this.wrongAccount = true;
			}else{
				this.csrfToken = data.csrf;
				const res = await TwitchUtils.getUserInfo([data.uid]);
				if(res && res.length > 0) {
					this.remoteUser = res[0]!;
				}
			}
		}
	}

	public mounted():void {
		this.open();
	}
	
	public async open():Promise<void> {
		await this.$nextTick();
		gsap.set(this.$refs.holder as HTMLElement, {marginTop:0, opacity:1});
		gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:1});
		gsap.from(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.out"});
	}

	public async close():Promise<void> {
		if(this.success) return;
		if(this.confirming) return;

		gsap.killTweensOf([this.$refs.holder, this.$refs.dimmer]);
		gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:0, ease:"sine.in"});
		gsap.to(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.in", onComplete:()=> {
			this.$emit("close")
		}});
	}

	public async confirm():Promise<void> {
		this.error = false;
		this.confirming = true;
		this.errorDetails = "";
		const res = await ApiHelper.call("auth/validateDataShare", "POST", {token:this.csrfToken});
		if(res.status == 200 && res.json.success === true) {
			this.success = true;
		}else{
			switch(res.json.errorCode) {
				case "CROSS_LINK":
					this.errorDetails = this.$t("shareParams.error_cross_link");
					break;
				case "INVALID_CSRF":
					this.errorDetails = this.$t("shareParams.error_csrf");
					break;
			}
			this.error = true;
		}
		this.confirming = false;
	}

	public reload():void {
		DataStore.clear(true);
		document.location.reload();
	}
}
export default toNative(ShareParams);
</script>

<style scoped lang="less">
.shareparams{

	&.error, &.success, &.secondary {
		.holder {
			color: var(--color-light);
			background-color: var(--color-alert);
			line-height: 1.5em;
			.content {
				align-items: center;
				strong {
					color: var(--color-light);
				}
			}
		}
		.clearbutton {
			color: var(--color-light);
		}
	}

	&.success .holder {
		background-color: var(--color-primary);
	}

	&.secondary .holder {
		background-color: var(--color-secondary-dark);
	}
	
	.holder {
		line-height: 1.2em;
		width: 600px;
		height: fit-content;
		max-width: 600px;
		max-height: var(--vh);
	}

	.content {
		gap: 1em;
		display: flex;
		flex-direction: column;
		white-space: pre-line;
		strong {
			color: var(--color-secondary);
		}
		.ctas {
			gap: 1em;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			align-self: center;
		}

		.icon {
			height: 1.5em;
		}

		&.success, &.error {
			gap: .5em;
			text-align: center;
			&>.icon {
				height: 3em;
			}
		}
	}
}
</style>