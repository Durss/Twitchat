<template>
	<div class="componentlist">

		<Splitter>Buttons</Splitter>

		<div class="buttons">
			<div class="actions">
				<Checkbox v-model="loading">loading mode</Checkbox>
				<Checkbox v-model="type" :values="['link', 'button']">&lt;a&gt; mode</Checkbox>
				<Checkbox v-model="selected">selected mode</Checkbox>
			</div>
			
			<div class="list">
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" big :loading="loading" :selected="selected">Normal big</Button>
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" primary big :loading="loading" :selected="selected">Primary big</Button>
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" secondary big :loading="loading" :selected="selected">Secondary big</Button>
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" alert big :loading="loading" :selected="selected">Alert big</Button>
				
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" :loading="loading" :selected="selected">Normal</Button>
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" primary :loading="loading" :selected="selected">Primary</Button>
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" secondary :loading="loading" :selected="selected">Secondary</Button>
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" alert :loading="loading" :selected="selected">Alert</Button>
				
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" small :loading="loading" :selected="selected">Normal small</Button>
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" primary small :loading="loading" :selected="selected">Primary small</Button>
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" secondary small :loading="loading" :selected="selected">Secondary small</Button>
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" alert small :loading="loading" :selected="selected">Alert small</Button>
				
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" big :loading="loading" :selected="selected">Normal big icon</Button>
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" primary big :loading="loading" :selected="selected">Primary big icon</Button>
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" secondary big :loading="loading" :selected="selected">Secondary big icon</Button>
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" alert big :loading="loading" :selected="selected">Alert big icon</Button>
				
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" :loading="loading" :selected="selected">Normal icon</Button>
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" primary :loading="loading" :selected="selected">Primary icon</Button>
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" secondary :loading="loading" :selected="selected">Secondary icon</Button>
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" alert :loading="loading" :selected="selected">Alert icon</Button>
				
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" small :loading="loading" :selected="selected">Normal small icon</Button>
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" primary small :loading="loading" :selected="selected">Primary small icon</Button>
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" secondary small :loading="loading" :selected="selected">Secondary small icon</Button>
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" alert small :loading="loading" :selected="selected">Alert small icon</Button>
				
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" big :loading="loading" :selected="selected" />
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" primary big :loading="loading" :selected="selected" />
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" secondary big :loading="loading" :selected="selected" />
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" alert big :loading="loading" :selected="selected" />
				
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" :loading="loading" :selected="selected" />
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" primary :loading="loading" :selected="selected" />
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" secondary :loading="loading" :selected="selected" />
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" alert :loading="loading" :selected="selected" />
				
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" small :loading="loading" :selected="selected" />
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" primary small :loading="loading" :selected="selected" />
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" secondary small :loading="loading" :selected="selected" />
				<Button bounce href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" alert small :loading="loading" :selected="selected" />
			</div>
			<Button bounce href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" big :loading="loading" :selected="selected">Full width button</Button>
			<Button bounce href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" :loading="loading" :selected="selected">Full width button</Button>
			<Button bounce href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" small :loading="loading" :selected="selected">Full width button</Button>
		</div>

		<Splitter>Switch buttons</Splitter>

		<div class="switches">
			<SwitchButton label1="Big"				label2="Big" big />
			<SwitchButton label1="Big primary"		label2="Big primary" big primary />
			<SwitchButton label1="Big secondary"	label2="Big secondary" big secondary />
			<SwitchButton label1="Big alert"		label2="Big alert" alert />

			<SwitchButton label1="Normal"			label2="Normal" />
			<SwitchButton label1="Primary"			label2="Primary" primary />
			<SwitchButton label1="Secondary"		label2="Secondary" secondary />
			<SwitchButton label1="Alert"			label2="Alert" alert />

			<SwitchButton label1="Small"			label2="Small" small />
			<SwitchButton label1="Small primary"	label2="Small primary" small primary />
			<SwitchButton label1="Small secondary"	label2="Small secondary" small secondary />
			<SwitchButton label1="Small alert"		label2="Small alert" small alert />
		</div>

		<Splitter>Toggle buttons</Splitter>

		<div class="toggles">
			<ToggleButton big />
			<ToggleButton big primary />
			<ToggleButton big secondary />
			<ToggleButton big alert />

			<ToggleButton />
			<ToggleButton primary />
			<ToggleButton secondary />
			<ToggleButton alert />

			<ToggleButton small />
			<ToggleButton small primary />
			<ToggleButton small secondary />
			<ToggleButton small alert />
		</div>

		<Splitter>Toggle blocks</Splitter>

		<div class="toggleBlocks">
			<ToggleBlock title="Title" subtitle="subtitle" key="toggle1">
				<template #left_actions>
					<img src="@/assets/icons/dragZone.svg" class="icon">
				</template>
				<template #right_actions>
					<img src="@/assets/icons/cross_white.svg" class="icon">
				</template>
				<div>Laboris tempor velit incididunt velit enim. Lorem laboris nisi nostrud cupidatat mollit nostrud excepteur pariatur deserunt veniam ipsum minim ut. Reprehenderit ipsum voluptate tempor anim duis laborum veniam sint consectetur. Laboris Lorem laboris eu labore sit elit veniam in dolor velit sit sunt sint id. Ipsum sunt magna cupidatat reprehenderit.</div>
			</ToggleBlock>
			
			<ToggleBlock title="Error" error key="toggle3">
				<template #left_actions>
					<img src="@/assets/icons/dragZone.svg" class="icon">
				</template>
				<template #right_actions>
					<img src="@/assets/icons/cross_white.svg" class="icon">
				</template>
				<div>Laboris tempor velit incididunt velit enim. Lorem laboris nisi nostrud cupidatat mollit nostrud excepteur pariatur deserunt veniam ipsum minim ut. Reprehenderit ipsum voluptate tempor anim duis laborum veniam sint consectetur. Laboris Lorem laboris eu labore sit elit veniam in dolor velit sit sunt sint id. Ipsum sunt magna cupidatat reprehenderit.</div>
			</ToggleBlock>
			
			<ToggleBlock title="Medium box" medium key="toggle2">
				<template #left_actions>
					<img src="@/assets/icons/dragZone.svg" class="icon">
				</template>
				<template #right_actions>
					<img src="@/assets/icons/cross_white.svg" class="icon">
				</template>
				<div>Laboris tempor velit incididunt velit enim. Lorem laboris nisi nostrud cupidatat mollit nostrud excepteur pariatur deserunt veniam ipsum minim ut. Reprehenderit ipsum voluptate tempor anim duis laborum veniam sint consectetur. Laboris Lorem laboris eu labore sit elit veniam in dolor velit sit sunt sint id. Ipsum sunt magna cupidatat reprehenderit.</div>
			</ToggleBlock>

			<ToggleBlock title="Small box" subtitle="subtitle" small key="toggle4">
				<div>Laboris tempor velit incididunt velit enim. Lorem laboris nisi nostrud cupidatat mollit nostrud excepteur pariatur deserunt veniam ipsum minim ut. Reprehenderit ipsum voluptate tempor anim duis laborum veniam sint consectetur. Laboris Lorem laboris eu labore sit elit veniam in dolor velit sit sunt sint id. Ipsum sunt magna cupidatat reprehenderit.</div>
			</ToggleBlock>
		</div>

		<Splitter>Progress bar</Splitter>

		<div class="progress">
			<ProgressBar :percent="0.25" :duration="10 * 60 * 1000" />
		</div>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import Checkbox from '@/components/Checkbox.vue';
import ProgressBar from '@/components/ProgressBar.vue';
import Splitter from '@/components/Splitter.vue';
import SwitchButton from '@/components/SwitchButton.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import ToggleButton from '@/components/ToggleButton.vue';
import { Component, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		Button,
		Checkbox,
		Splitter,
		ToggleBlock,
		ProgressBar,
		SwitchButton,
		ToggleButton,
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
	gap: 1em;
	display: flex;
	flex-direction: column;

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
			grid-template-columns: 1fr 1fr 1fr 1fr;
			justify-items: flex-start;
			align-items: flex-start;
		}
	}

	.switches {
		display: grid;
		gap: .5em;
		grid-template-columns: 1fr 1fr 1fr 1fr;
		justify-items: stretch;
		align-items: stretch;

		&>* {
			padding: .5em;
			border: 1px solid white;
		}
	}

	.toggles {
		display: grid;
		gap: .5em;
		grid-template-columns: 1fr 1fr 1fr 1fr;
		justify-items: center;
		align-items: stretch;
	}

	.toggleBlocks {
		padding: .5em;
		@itemWidth: 400px;
		display: grid;
		gap: 5px;
		grid-template-columns: repeat(auto-fill, minmax(@itemWidth, 1fr));
	}
}
</style>