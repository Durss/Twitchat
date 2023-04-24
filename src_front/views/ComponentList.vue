<template>
	<div class="componentlist">

		<Splitter>Buttons</Splitter>

		<div class="card-item section buttons">
			<div class="actions">
				<Checkbox v-model="loading">loading mode</Checkbox>
				<Checkbox v-model="type" :values="['link', 'button']">&lt;a&gt; mode</Checkbox>
				<Checkbox v-model="selected">selected mode</Checkbox>
			</div>
			
			<div class="list">
				<Button href="https://twitchat.fr" target="_blank" :type="type" big :loading="loading" :selected="selected">Normal big</Button>
				<Button href="https://twitchat.fr" target="_blank" :type="type" secondary big :loading="loading" :selected="selected">Secondary big</Button>
				<Button href="https://twitchat.fr" target="_blank" :type="type" alert big :loading="loading" :selected="selected">Alert big</Button>
				
				<Button href="https://twitchat.fr" target="_blank" :type="type" :loading="loading" :selected="selected">Normal</Button>
				<Button href="https://twitchat.fr" target="_blank" :type="type" secondary :loading="loading" :selected="selected">Secondary</Button>
				<Button href="https://twitchat.fr" target="_blank" :type="type" alert :loading="loading" :selected="selected">Alert</Button>
				
				<Button href="https://twitchat.fr" target="_blank" :type="type" small :loading="loading" :selected="selected">Normal small</Button>
				<Button href="https://twitchat.fr" target="_blank" :type="type" secondary small :loading="loading" :selected="selected">Secondary small</Button>
				<Button href="https://twitchat.fr" target="_blank" :type="type" alert small :loading="loading" :selected="selected">Alert small</Button>
				
				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" big :loading="loading" :selected="selected">Normal big icon</Button>
				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" secondary big :loading="loading" :selected="selected">Secondary big icon</Button>
				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" alert big :loading="loading" :selected="selected">Alert big icon</Button>
				
				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" :loading="loading" :selected="selected">Normal icon</Button>
				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" secondary :loading="loading" :selected="selected">Secondary icon</Button>
				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" alert :loading="loading" :selected="selected">Alert icon</Button>
				
				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" small :loading="loading" :selected="selected">Normal small icon</Button>
				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" secondary small :loading="loading" :selected="selected">Secondary small icon</Button>
				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" alert small :loading="loading" :selected="selected">Alert small icon</Button>
				
				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" big :loading="loading" :selected="selected" />
				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" secondary big :loading="loading" :selected="selected" />
				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" alert big :loading="loading" :selected="selected" />
				
				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" :loading="loading" :selected="selected" />
				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" secondary :loading="loading" :selected="selected" />
				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" alert :loading="loading" :selected="selected" />
				
				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" small :loading="loading" :selected="selected" />
				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" secondary small :loading="loading" :selected="selected" />
				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" alert small :loading="loading" :selected="selected" />
			</div>
			<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" big :loading="loading" :selected="selected">Full width button</Button>
			<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" :loading="loading" :selected="selected">Full width button</Button>
			<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" small :loading="loading" :selected="selected">Full width button</Button>
		</div>

		<Splitter>Switch buttons</Splitter>

		<div class="card-item section switches">
			<SwitchButton label1="Big"				label2="Big" big />
			<SwitchButton label1="Big secondary"	label2="Big secondary" big secondary />
			<SwitchButton label1="Big alert"		label2="Big alert" big alert />

			<SwitchButton label1="Normal"			label2="Normal" />
			<SwitchButton label1="Secondary"		label2="Secondary" secondary />
			<SwitchButton label1="Alert"			label2="Alert" alert />

			<SwitchButton label1="Small"			label2="Small" small />
			<SwitchButton label1="Small secondary"	label2="Small secondary" small secondary />
			<SwitchButton label1="Small alert"		label2="Small alert" small alert />
		</div>

		<Splitter>Toggle buttons</Splitter>

		<div class="card-item section toggles">
			<ToggleButton big />
			<ToggleButton big secondary />
			<ToggleButton big alert />

			<ToggleButton />
			<ToggleButton secondary />
			<ToggleButton alert />

			<ToggleButton small />
			<ToggleButton small secondary />
			<ToggleButton small alert />
		</div>

		<Splitter>Toggle blocks</Splitter>

		<div class="card-item section toggleBlocks">
			<ToggleBlock title="Title" subtitle="subtitle" key="toggle1">
				<template #left_actions>
					<img src="@/assets/icons/dragZone.svg" class="icon">
				</template>
				<template #right_actions>
					<img src="@/assets/icons/cross.svg" class="icon">
				</template>
				<div>Laboris tempor velit incididunt velit enim. Lorem laboris nisi nostrud cupidatat mollit nostrud excepteur pariatur deserunt veniam ipsum minim ut. Reprehenderit ipsum voluptate tempor anim duis laborum veniam sint consectetur. Laboris Lorem laboris eu labore sit elit veniam in dolor velit sit sunt sint id. Ipsum sunt magna cupidatat reprehenderit.</div>
			</ToggleBlock>
			
			<ToggleBlock title="Error" error key="toggle3">
				<template #left_actions>
					<img src="@/assets/icons/dragZone.svg" class="icon">
				</template>
				<template #right_actions>
					<img src="@/assets/icons/cross.svg" class="icon">
				</template>
				<div>Laboris tempor velit incididunt velit enim. Lorem laboris nisi nostrud cupidatat mollit nostrud excepteur pariatur deserunt veniam ipsum minim ut. Reprehenderit ipsum voluptate tempor anim duis laborum veniam sint consectetur. Laboris Lorem laboris eu labore sit elit veniam in dolor velit sit sunt sint id. Ipsum sunt magna cupidatat reprehenderit.</div>
			</ToggleBlock>
			
			<ToggleBlock title="Medium box" medium key="toggle2">
				<template #left_actions>
					<img src="@/assets/icons/dragZone.svg" class="icon">
				</template>
				<template #right_actions>
					<img src="@/assets/icons/cross.svg" class="icon">
				</template>
				<div>Laboris tempor velit incididunt velit enim. Lorem laboris nisi nostrud cupidatat mollit nostrud excepteur pariatur deserunt veniam ipsum minim ut. Reprehenderit ipsum voluptate tempor anim duis laborum veniam sint consectetur. Laboris Lorem laboris eu labore sit elit veniam in dolor velit sit sunt sint id. Ipsum sunt magna cupidatat reprehenderit.</div>
			</ToggleBlock>

			<ToggleBlock title="Small box" subtitle="subtitle" small key="toggle4">
				<div>Laboris tempor velit incididunt velit enim. Lorem laboris nisi nostrud cupidatat mollit nostrud excepteur pariatur deserunt veniam ipsum minim ut. Reprehenderit ipsum voluptate tempor anim duis laborum veniam sint consectetur. Laboris Lorem laboris eu labore sit elit veniam in dolor velit sit sunt sint id. Ipsum sunt magna cupidatat reprehenderit.</div>
			</ToggleBlock>
		</div>

		<Splitter>Progress bar</Splitter>

		<div class="card-item section progressbars">
			<ProgressBar :percent="progresses[0]" :duration="100 * 60 * 1000" />
			<ProgressBar :percent="progresses[1]" :duration="100 * 60 * 1000" secondary />
			<ProgressBar :percent="progresses[2]" :duration="100 * 60 * 1000" alert />
			<ProgressBar :percent="progresses[3]" :duration="100 * 60 * 1000" boostMode />
			<ProgressBar :percent="progresses[4]" :duration="100 * 60 * 1000" />
			<Button class="restartBt" @click="resetProgressbars()" icon="refresh">Restart</Button>
		</div>

		<Splitter>Sliders</Splitter>

		<div class="card-item section sliders">
			<Slider />
			<Slider secondary />
			<Slider alert />
			<Slider disabled />
		</div>

		<Splitter>Tab menu</Splitter>

		<div class="card-item section tabmenus">
			<div>
				<TabMenu big :values="[0,1,2]" :labels="['item 1', 'item 2', 'item 3']" :icons="[null, 'twitchat', 'spotify']" />
				<TabMenu big secondary :values="[0,1,2]" :labels="['item 1', 'item 2', 'item 3']" :icons="[null, 'twitchat', 'spotify']" />
				<TabMenu big alert :values="[0,1,2]" :labels="['item 1', 'item 2', 'item 3']" :icons="[null, 'twitchat', 'spotify']" />
			</div>
			<div>
				<TabMenu :values="[0,1,2]" :labels="['item 1', 'item 2', 'item 3']" :icons="[null, 'twitchat', 'spotify']" />
				<TabMenu secondary :values="[0,1,2]" :labels="['item 1', 'item 2', 'item 3']" :icons="[null, 'twitchat', 'spotify']" />
				<TabMenu alert :values="[0,1,2]" :labels="['item 1', 'item 2', 'item 3']" :icons="[null, 'twitchat', 'spotify']" />
			</div>
			<div>
				<TabMenu small :values="[0,1,2]" :labels="['item 1', 'item 2', 'item 3']" :icons="[null, 'twitchat', 'spotify']" />
				<TabMenu small secondary :values="[0,1,2]" :labels="['item 1', 'item 2', 'item 3']" :icons="[null, 'twitchat', 'spotify']" />
				<TabMenu small alert :values="[0,1,2]" :labels="['item 1', 'item 2', 'item 3']" :icons="[null, 'twitchat', 'spotify']" />
			</div>
		</div>

		<Splitter>Parameters</Splitter>

		<div class="card-item section params">
			<ParamItem :paramData="param_bool" />
			<ParamItem :paramData="param_color" />
			<ParamItem :paramData="param_slider" />
			<ParamItem :paramData="param_text" />
			<ParamItem :paramData="param_text" error />
			<ParamItem :paramData="param_textLong" />
			<ParamItem :paramData="param_textLong" error />
			<ParamItem :paramData="param_number" />
			<ParamItem :paramData="param_list" />
			<ParamItem :paramData="param_list" error />
			<ParamItem :paramData="param_listEdit" />
			<ParamItem :paramData="param_listEdit" error />
		</div>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import Checkbox from '@/components/Checkbox.vue';
import ProgressBar from '@/components/ProgressBar.vue';
import Slider from '@/components/Slider.vue';
import Splitter from '@/components/Splitter.vue';
import SwitchButton from '@/components/SwitchButton.vue';
import TabMenu from '@/components/TabMenu.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import ToggleButton from '@/components/ToggleButton.vue';
import ParamItem from '@/components/params/ParamItem.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		Button,
		Slider,
		TabMenu,
		Checkbox,
		Splitter,
		ParamItem,
		ToggleBlock,
		ProgressBar,
		SwitchButton,
		ToggleButton,
	},
	emits:[],
})
export default class ComponentList extends Vue {

	public type:"button"|"link" = "button";
	public disposed:boolean = false;
	public loading:boolean = false;
	public selected:boolean = false;
	public progresses:number[] = [];

	public param_bool:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, label:"Enabled"};
	public param_color:TwitchatDataTypes.ParameterData<string> = {type:"color", value:"#ff0000", label:"Color"};
	public param_slider:TwitchatDataTypes.ParameterData<number> = {type:"slider", value:0, label:"Slider", min:0, max:10};
	public param_text:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", label:"Text", placeholder:"value..."};
	public param_textLong:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", longText:true, label:"Text", placeholder:"value..."};
	public param_number:TwitchatDataTypes.ParameterData<number> = {type:"number", value:0, label:"Count"};
	public param_list:TwitchatDataTypes.ParameterData<string, string> = {type:"list", value:"", listValues:[{value:"item1",label:"Item 1"}, {value:"item2",label:"Item 2"},{value:"item1",label:"Item 3"}], label:"List"};
	public param_listEdit:TwitchatDataTypes.ParameterData<string[], string> = {type:"editablelist", value:["Item 2"], maxLength:2, options:["Item 1", "Item 2", "Item 3"], label:"Editable List"};
	
	public mounted():void {
		this.resetProgressbars();
		this.renderFrame();
	}
	
	public beforeUnmount():void {
		this.disposed = true;
	}
	
	public resetProgressbars():void {
		this.progresses = [.25,.25,.25,.25,.95];
	}

	private renderFrame():void {
		if(this.disposed) return;
		requestAnimationFrame(()=>this.renderFrame());
		for (let i = 0; i < this.progresses.length; i++) {
			this.progresses[i] += .00003;
		}
	}

}
</script>

<style scoped lang="less">
.componentlist{
	gap: 1em;
	display: flex;
	flex-direction: column;
	margin: 2em 0;
	
	.section {
		margin: 0 2em;
	}

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
			justify-items: flex-start;
			align-items: flex-start;
		}
	}

	.switches {
		display: grid;
		gap: 2em;
		grid-template-columns: 1fr 1fr 1fr;
		justify-items: stretch;
		align-items: stretch;
	}

	.toggles {
		display: grid;
		gap: .5em;
		grid-template-columns: 1fr 1fr 1fr;
		justify-items: center;
		align-items: stretch;
	}

	.toggleBlocks {
		padding: .5em;
		@itemWidth: 400px;
		display: grid;
		gap: 1em;
		grid-template-columns: repeat(auto-fill, minmax(@itemWidth, 1fr));
	}

	.tabmenus {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 1em;
		justify-items: flex-start;
		align-items: flex-start;
		&>div{
			display: flex;
			flex-direction: column;
			gap: .5em;
		}
	}

	.progressbars {
		display: flex;
		flex-direction: column;
		flex-wrap: wrap;
		gap: 1em;
		&> div {
			// flex-basis: 300px;
			margin-bottom: 1em;
		}
		.restartBt {
			align-self: center;
		}
	}

	.sliders {
		gap: 1em;
		display: flex;
		flex-direction: column;
	}

	.params{
		display: flex;
		flex-direction: column;
		gap: 1em;
		align-items: center;
		&>* {
			width: 600px;
		}
	}
}
</style>