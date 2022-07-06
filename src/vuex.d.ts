import type { Store } from 'vuex'

declare module '@vue/runtime-core' {
	interface ComponentCustomProperties {
		$store: Store<any>,
		$image: (path:string) => string,
		$placeDropdown: (dropdownList:HTMLDivElement, component:Vue, params:{width:string, left:string, top:string}) => void,
		$overlayURL: (id:string) => string,
		$confirm: <T>(title: string,
			description?: string,
			data?: T,
			yesLabel?:string,
			noLabel?:string) => Promise<T|undefined>,
	}
}