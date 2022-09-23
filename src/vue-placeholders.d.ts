
declare module 'vue-placeholers' {
	interface ComponentCustomProperties {
		$image: (path:string) => string,
		$placeDropdown: (dropdownList:HTMLDivElement, component:Vue, params:{width:string, left:string, top:string}) => void,
		$overlayURL: (id:string) => string,
		$confirm: <T>(title: string,
			description?: string,
			data?: T,
			yesLabel?:string,
			noLabel?:string,
			STTOrigin?:boolean) => Promise<T|undefined>,
	}
}
declare global {
	interface Window {
		obsstudio?: any;
	}
}