<script lang="ts">
import { gsap } from "gsap";
import { ComponentBase, Vue } from 'vue-facing-decorator';

@ComponentBase({
    name: "AbstractSidePanel"
})
export default class AbstractSidePanel extends Vue {

	/**
	 * Open animation
	 */
	public async open():Promise<void> {
		gsap.set(this.$el as HTMLElement, {translateY:0});
		gsap.from(this.$el as HTMLElement, {duration:.4, translateY:"100%", clearProps:"transform", ease:"back.out"});
	}

	/**
	 * Close animation
	 */
	public async close():Promise<void> {
		gsap.to(this.$el as HTMLElement, {duration:.25, translateY:"-100%", clearProps:"transform", ease:"back.in", onComplete:()=> {
			this.$emit('close');
		}});
	}

}
</script>