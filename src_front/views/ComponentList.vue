<template>
	<div class="componentlist">
		<div class="buttons">
			<div class="actions">
				<Checkbox v-model="loading">loading mode</Checkbox>
				<Checkbox v-model="type" :values="['link', 'button']">toggle type</Checkbox>
				<Checkbox v-model="selected">selected mode</Checkbox>
			</div>
			
			<div class="list">
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" big :loading="loading" :selected="selected">Big normal</Button>
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" highlight big :loading="loading" :selected="selected">Big highlight</Button>
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" white big :loading="loading" :selected="selected">Big white</Button>
				
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" :loading="loading" :selected="selected">Normal</Button>
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" highlight :loading="loading" :selected="selected">Highlight</Button>
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" white :loading="loading" :selected="selected">White</Button>
				
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" small :loading="loading" :selected="selected">Small normal</Button>
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" highlight small :loading="loading" :selected="selected">Small highlight</Button>
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" white small :loading="loading" :selected="selected">Small white</Button>
				
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" :icon="$image('icons/twitchat.svg')" big :loading="loading" :selected="selected">Big normal icon</Button>
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" :icon="$image('icons/twitchat.svg')" highlight big :loading="loading" :selected="selected">Big highlight icon</Button>
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" :icon="$image('icons/twitchat_purple.svg')" white big :loading="loading" :selected="selected">Big white icon</Button>
				
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" :icon="$image('icons/twitchat.svg')" :loading="loading" :selected="selected">Normal icon</Button>
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" :icon="$image('icons/twitchat.svg')" highlight :loading="loading" :selected="selected">Highlight icon</Button>
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" :icon="$image('icons/twitchat_purple.svg')" white :loading="loading" :selected="selected">White icon</Button>
				
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" :icon="$image('icons/twitchat.svg')" small :loading="loading" :selected="selected">Small normal icon</Button>
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" :icon="$image('icons/twitchat.svg')" highlight small :loading="loading" :selected="selected">Small highlight icon</Button>
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" :icon="$image('icons/twitchat_purple.svg')" white small :loading="loading" :selected="selected">Small white icon</Button>
				
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" :icon="$image('icons/twitchat.svg')" big :loading="loading" :selected="selected" />
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" :icon="$image('icons/twitchat.svg')" highlight big :loading="loading" :selected="selected" />
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" :icon="$image('icons/twitchat_purple.svg')" white big :loading="loading" :selected="selected" />
				
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" :icon="$image('icons/twitchat.svg')" :loading="loading" :selected="selected" />
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" :icon="$image('icons/twitchat.svg')" highlight :loading="loading" :selected="selected" />
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" :icon="$image('icons/twitchat_purple.svg')" white :loading="loading" :selected="selected" />
				
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" :icon="$image('icons/twitchat.svg')" small :loading="loading" :selected="selected" />
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" :icon="$image('icons/twitchat.svg')" highlight small :loading="loading" :selected="selected" />
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" :icon="$image('icons/twitchat_purple.svg')" white small :loading="loading" :selected="selected" />
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import Checkbox from '@/components/Checkbox.vue';
import { Component, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		Button,
		Checkbox,
	},
	emits:[],
})
export default class ComponentList extends Vue {

	public type:"button"|"link" = "button";
	public loading:boolean = false;
	public selected:boolean = false;
	
}
</script>

<style scoped lang="less">
.componentlist{
	.buttons {
		gap: 1em;
		display: flex;
		flex-direction: column;
		.actions {
			align-self: center;
			gap: 1em;
			display: flex;
			flex-direction: row;
		}
		.list {
			display: grid;
			gap: .5em;
			grid-template-columns: 1fr 1fr 1fr;
			&>* {
				justify-self: flex-start;
				align-self: flex-start;
			}
		}
	}
}
</style>