export default interface IParameterContent {
	/**
	 * Called when "back" button is clicked.
	 * This is a hook to allow contents to override default back button
	 * behavior.
	 * The call must return true if the default behavior is overriden
	 * 
	 * @returns true if the call acted on the navigation
	 */
	onNavigateBack():boolean;
}