import { storeMain as useStoreMain } from "@/store/storeMain";

export function useConfirm() {
	return {
		confirm: <T>(
			title: string,
			description?: string,
			data?: T,
			yesLabel?: string,
			noLabel?: string,
		) => useStoreMain().confirm(title, description, data, yesLabel, noLabel),
	};
}
