<template>
	<div class="privacypolicy">
		<ThemeSelector class="themeSelector" />
		<div class="content card-item">
			<div class="head">
				<h1>PRIVACY POLICY</h1>
				<p>Last updated January 25, 2024</p>
			</div>

			<p>This privacy notice for <strong>François Dursus</strong> ("<strong>we</strong>," "<strong>us</strong>," or "<strong>our</strong>"), describes how and why we might collect, store, use, and/or share ("<strong>process</strong>") your information when you use our services ("<strong>Services</strong>"), such as when you:</p>
			<ul>
				<li>Visit our website at twitchat.fr, or any website of ours that links to this privacy notice</li>
				<li>Engage with us in other related ways, including any sales, marketing, or events</li>
			</ul>

			<p>
				<strong>Questions or concerns?</strong> Reading this privacy notice will help you understand your privacy rights and choices. If you do not agree with our policies and practices, please do not use our Services. If you still have any questions or concerns, please contact us at {{ $config.CONTACT_MAIL }}.
			</p>

			<h2>SUMMARY OF KEY POINTS</h2>

			<p><strong>This summary provides key points from our privacy notice, but you can find out more details about any of these topics by clicking the link following each key point or by using our <a href="#toc">table of contents</a> below to find the section you are looking for.</strong></p>

			<p><strong>What personal information do we process?</strong> When you visit, use, or navigate our Services, we may process personal information depending on how you interact with us and the Services, the choices you make, and the products and features you use. Learn more about <a href="#infocollect">personal information you disclose to us</a>.</p>

			<p><strong>Do we process any sensitive personal information?</strong> We do not process sensitive personal information.</p>

			<p><strong>Do we receive any information from third parties?</strong> We receive information you specifically grant us to access. This can include Twitch data like your login, your followers, your followings or your subscribers. If you connect with Yoube services, this also includes your Youtube profile name and your Youtube live broadcast sessions.</p>

			<p><strong>How do we process your information?</strong> We process your information to provide, improve, and administer our Services, communicate with you, for security and fraud prevention, and to comply with law. We may also process your information for other purposes with your consent. We process your information only when we have a valid legal reason to do so. Learn more about <a href="#infouse">how we process your information</a>.</p>

			<p><strong>In what situations and with which parties do we share personal information?</strong> We may share information in specific situations and with specific third parties. Learn more about <a href="#whoshare">when and with whom we share your personal information</a>.</p>

			<p><strong>How do we keep your information safe?</strong> We have organizational and technical processes and procedures in place to protect your personal information. However, no electronic transmission over the internet or information storage technology can be guaranteed to be 100% secure, so we cannot promise or guarantee that hackers, cybercriminals, or other unauthorized third parties will not be able to defeat our security and improperly collect, access, steal, or modify your information. Learn more about <a href="#infosafe">how we keep your information safe</a>.</p>

			<p><strong>What are your rights?</strong> Depending on where you are located geographically, the applicable privacy law may mean you have certain rights regarding your personal information. Learn more about <a href="#privacyrights" target="_blank">your privacy rights</a>.</p>

			<p><strong>How do you exercise your rights?</strong> The easiest way to exercise your rights is by <a @click="openDataMnagerForm()" target="_blank">opening data management form</a>.</p>

			<p>Want to learn more about what we do with any information we collect? <a href="#toc">Review the privacy notice in full</a>.</p>

			<h2 id="toc">TABLE OF CONTENTS</h2>
			<ul class="index">
				<li><a href="#infocollect">WHAT INFORMATION DO WE COLLECT?</a></li>
				<li><a href="#infouse">HOW DO WE PROCESS YOUR INFORMATION?</a></li>
				<li><a href="#legalbases">WHAT LEGAL BASES DO WE RELY ON TO PROCESS YOUR PERSONAL INFORMATION?</a></li>
				<li><a href="#whoshare">WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?</a></li>
				<li><a href="#sociallogins">HOW DO WE HANDLE YOUR SOCIAL LOGINS?</a></li>
				<li><a href="#inforetain">HOW LONG DO WE KEEP YOUR INFORMATION?</a></li>
				<li><a href="#infosafe">HOW DO WE KEEP YOUR INFORMATION SAFE?</a></li>
				<li><a href="#infominors">DO WE COLLECT INFORMATION FROM MINORS?</a></li>
				<li><a href="#privacyrights">WHAT ARE YOUR PRIVACY RIGHTS?</a></li>
				<li><a href="#youtube">YOUTUBE SERVICES</a></li>
				<li><a href="#3rdparty">THIRD-PARTY DATA SHARING</a></li>
				<li><a href="#DNT">CONTROLS FOR DO-NOT-TRACK FEATURES</a></li>
				<li><a href="#caresidents">DO CALIFORNIA RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?</a></li>
				<li><a href="#virginia">DO VIRGINIA RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?</a></li>
				<li><a href="#policyupdates">DO WE MAKE UPDATES TO THIS NOTICE?</a></li>
				<li><a href="#contact">HOW CAN YOU CONTACT US ABOUT THIS NOTICE?</a></li>
				<li><a href="#request">HOW CAN YOU REVIEW, UPDATE, OR DELETE THE DATA WE COLLECT FROM YOU?</a></li>
			</ul>





			<h2 id="infocollect">1. WHAT INFORMATION DO WE COLLECT?</h2>
			<p><strong>Personal information you disclose to us</strong></p>

			<p><strong>In Short:</strong> We collect personal information that you provide to us.</p>

			<p>We collect personal information that you voluntarily provide to us when you register on the Services, express an interest in obtaining information about us or our products and Services, when you participate in activities on the Services, or otherwise when you contact us.</p>

			<p><strong>Personal Information Provided by You.</strong> The personal information that we collect depends on the context of your interactions with us and the Services, the choices you make, and the products and features you use. The personal information we collect may include the following:</p>
			<ul>
				<li>Your Twitch user ID</li>
				<li>Your Twitchat parameters</li>
			</ul>

			<p><strong>Sensitive Information.</strong> We do not process sensitive information.</p>

			<p><strong>Social Media Login Data.</strong> We may provide you with the option to register with us using your existing social media account details, like Twitch, Youtube, or other social media account. If you choose to register in this way, we will collect the information described in the section called "<a href="#sociallogins">HOW DO WE HANDLE YOUR SOCIAL LOGINS?</a>" below.</p>

			<p>All personal information that you provide to us must be true, complete, and accurate, and you must notify us of any changes to such personal information.</p>

			<p>By using Twitchat, you acknowledge and agree that our service may store, access, or collect information directly or indirectly on or from users' devices. This includes, but is not limited to, access tokens, cookies or similar technologies on users' devices or browsers.</p>

			<p><strong>Third-Party Involvement:</strong></p>
			<p>In some instances, third parties may also be involved in the storage, access, or collection of information through Twitchat. These third parties are subject to their own privacy policies and terms of service.</p>


			<h2 id="infouse">2. HOW DO WE PROCESS YOUR INFORMATION?</h2>
			<p><strong>In Short:</strong> We process your information to provide, improve, and administer our Services, communicate with you, for security and fraud prevention, and to comply with law. We may also process your information for other purposes with your consent.</p>

			<strong>We process your personal information for a variety of reasons, depending on how you interact with our Services, including:</strong>

			<ul>
				<li><strong>To facilitate account creation and authentication and otherwise manage user accounts.</strong> We may process your information so you can create and log in to your account, as well as keep your account in working order.</li>
				<li><strong>To save or protect an individual's vital interest.</strong> We may process your information when necessary to save or protect an individual’s vital interest, such as to prevent harm.</li>
			</ul>
			By using [Your API Client Name], you acknowledge and agree that our service may store, access, or collect information directly or indirectly on or from users' devices. This includes, but is not limited to, the placement, access, or recognition of cookies or similar technologies on users' devices or browsers.





			<h2 id="legalbases">3. WHAT LEGAL BASES DO WE RELY ON TO PROCESS YOUR INFORMATION?</h2>
			<p><strong>In Short:</strong> We only process your personal information when we believe it is necessary and we have a valid legal reason (i.e. , legal basis) to do so under applicable law, like with your consent, to comply with laws, to provide you with services to enter into or fulfill our contractual obligations, to protect your rights, or to fulfill our legitimate business interests.</p>

			<p class="underline">If you are located in the EU or UK, this section applies to you.</p>

			<p>The General Data Protection Regulation (GDPR) and UK GDPR require us to explain the valid legal bases we rely on in order to process your personal information. As such, we may rely on the following legal bases to process your personal information:</p>
			<ul>
				<li><strong>Consent.</strong> We may process your information if you have given us permission (i.e. , consent) to use your personal information for a specific purpose. You can withdraw your consent at any time. Learn more about <a href="#withdrawconsent">withdrawing your consent</a>.</li>
				<li><strong>Legal Obligations.</strong> We may process your information where we believe it is necessary for compliance with our legal obligations, such as to cooperate with a law enforcement body or regulatory agency, exercise or defend our legal rights, or disclose your information as evidence in litigation in which we are involved.</li>
				<li><strong>Vital Interests.</strong> We may process your information where we believe it is necessary to protect your vital interests or the vital interests of a third party, such as situations involving potential threats to the safety of any person.</li>
			</ul>

			<p class="underline">If you are located in Canada, this section applies to you.</p>

			<p>We may process your information if you have given us specific permission (i.e. , express consent) to use your personal information for a specific purpose, or in situations where your permission can be inferred (i.e. , implied consent). You can <a href="#withdrawconsent">withdraw your consent</a> at any time.</p>

			<p>In some exceptional cases, we may be legally permitted under applicable law to process your information without your consent, including, for example:</p>
			<ul>
				<li>If collection is clearly in the interests of an individual and consent cannot be obtained in a timely way</li>
				<li>For investigations and fraud detection and prevention</li>
				<li>For business transactions provided certain conditions are met</li>
				<li>If it is contained in a witness statement and the collection is necessary to assess, process, or settle an insurance claim</li>
				<li>For identifying injured, ill, or deceased persons and communicating with next of kin</li>
				<li>If we have reasonable grounds to believe an individual has been, is, or may be victim of financial abuse</li>
				<li>If it is reasonable to expect collection and use with consent would compromise the availability or the accuracy of the information and the collection is reasonable for purposes related to investigating a breach of an agreement or a contravention of the laws of Canada or a province</li>
				<li>If disclosure is required to comply with a subpoena, warrant, court order, or rules of the court relating to the production of records</li>
				<li>If it was produced by an individual in the course of their employment, business, or profession and the collection is consistent with the purposes for which the information was produced</li>
				<li>If the collection is solely for journalistic, artistic, or literary purposes</li>
				<li>If the information is publicly available and is specified by the regulations</li>
			</ul>





			<h2 id="whoshare">4. WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?</h2>
			<p><strong>In Short:</strong> We may share information in specific situations described in this section and/or with the following third parties.</p>

			<p>We may need to share your personal information in the following situations:</p>
			<ul>
				<li>Business Transfers. We may share or transfer your information in connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our business to another company.</li>
			</ul>





			<h2 id="sociallogins">5. HOW DO WE HANDLE YOUR SOCIAL LOGINS?</h2>
			<p><strong>In Short:</strong> If you choose to register or log in to our Services using a social media account, we may have access to certain information about you</p>

			<p>Our Services offer you the ability to register and log in using your third-party social media account details (like your Twitch logins). Where you choose to do this, we will receive certain profile information about you from your social media provider. The profile information we receive may vary depending on the social media provider concerned, but will often include your nickname, real name (with Youtube), your followers, and profile picture, as well as other information you choose to make public on such a social media platform.</p>

			<p>We will use the information we receive only for the purposes that are described in this privacy notice or that are otherwise made clear to you on the relevant Services. Please note that we do not control, and are not responsible for, other uses of your personal information by your third-party social media provider. We recommend that you review their privacy notice to understand how they collect, use, and share your personal information, and how you can set your privacy preferences on their sites and apps.</p>





			<h2 id="inforetain">6. HOW LONG DO WE KEEP YOUR INFORMATION?</h2>
			<p><strong>In Short:</strong> We keep your information for as long as necessary to fulfill the purposes outlined in this privacy notice unless otherwise required by law.</p>

			<p>We will only keep your personal information for as long as it is necessary for the purposes set out in this privacy notice, unless a longer retention period is required or permitted by law (such as tax, accounting, or other legal requirements). No purpose in this notice will require us keeping your personal information for longer than the period of time in which users have an account with us .</p>

			<p>When we have no ongoing legitimate business need to process your personal information, we will either delete or anonymize such information, or, if this is not possible (for example, because your personal information has been stored in backup archives), then we will securely store your personal information and isolate it from any further processing until deletion is possible.</p>





			<h2 id="infosafe">7. HOW DO WE KEEP YOUR INFORMATION SAFE?</h2>
			<p><strong>In Short:</strong> We aim to protect your personal information through a system of organizational and technical security measures.</p>

			<p>We have implemented appropriate and reasonable technical and organizational security measures designed to protect the security of any personal information we process. However, despite our safeguards and efforts to secure your information, no electronic transmission over the Internet or information storage technology can be guaranteed to be 100% secure, so we cannot promise or guarantee that hackers, cybercriminals, or other unauthorized third parties will not be able to defeat our security and improperly collect, access, steal, or modify your information. Although we will do our best to protect your personal information, transmission of personal information to and from our Services is at your own risk. You should only access the Services within a secure environment.</p>





			<h2 id="infominors">8. DO WE COLLECT INFORMATION FROM MINORS?</h2>
			<p><strong>In Short:</strong> We do not knowingly collect data from or market to children under 18 years of age.</p>

			<p>We do not knowingly solicit data from or market to children under 18 years of age. By using the Services, you represent that you are at least 18 or that you are the parent or guardian of such a minor and consent to such minor dependent’s use of the Services. If we learn that personal information from users less than 18 years of age has been collected, we will deactivate the account and take reasonable measures to promptly delete such data from our records. If you become aware of any data we may have collected from children under age 18, please contact us at {{ $config.CONTACT_MAIL }}.</p>





			<h2 id="privacyrights">9. WHAT ARE YOUR PRIVACY RIGHTS?</h2>
			<p><strong>In Short:</strong>  In some regions, such as the European Economic Area (EEA), United Kingdom (UK), and Canada , you have rights that allow you greater access to and control over your personal information.  You may review, change, or terminate your account at any time.</p>

			<p>In some regions (like the EEA, UK, and Canada ), you have certain rights under applicable data protection laws. These may include the right (i) to request access and obtain a copy of your personal information, (ii) to request rectification or erasure; (iii) to restrict the processing of your personal information; and (iv) if applicable, to data portability. In certain circumstances, you may also have the right to object to the processing of your personal information. You can make such a request by contacting us by using the contact details provided in the section "<a href="#contact">HOW CAN YOU CONTACT US ABOUT THIS NOTICE?</a>" below.</p>

			<p>We will consider and act upon any request in accordance with applicable data protection laws.</p>

			<p>If you are located in the EEA or UK and you believe we are unlawfully processing your personal information, you also have the right to complain to your <a href="https://ico.org.uk/make-a-complaint/data-protection-complaints/data-protection-complaints/" target="_blank">Member State data protection authority</a> or <a href="https://ico.org.uk/make-a-complaint/data-protection-complaints/data-protection-complaints/" target="_blank">UK data protection authority</a>.</p>

			<p>If you are located in Switzerland, you may contact the <a href="https://www.edoeb.admin.ch/edoeb/en/home.html" target="_blank">Federal Data Protection and Information Commissioner</a>.</p>

			<p><strong class="underline" id="withdrawconsent">Withdrawing your consent:</strong> If we are relying on your consent to process your personal information, which may be express and/or implied consent depending on the applicable law, you have the right to withdraw your consent at any time. You can withdraw your consent at any time by contacting us by using the contact details provided in the section "<a href="#contact">HOW CAN YOU CONTACT US ABOUT THIS NOTICE?</a>" below or updating your preferences .</p>

			<p>However, please note that this will not affect the lawfulness of the processing before its withdrawal nor, when applicable law allows, will it affect the processing of your personal information conducted in reliance on lawful processing grounds other than consent.</p>

			<strong>Account Information</strong>
			<p>If you would at any time like to review or change the information in your account or terminate your account, you can:</p>
			<ul>
				<li>Log in to your account settings and update your user account.</li>
			</ul>
			<p>Upon your request to terminate your account, we will deactivate or delete your account and information from our active databases. However, we may retain some information in our files to prevent fraud, troubleshoot problems, assist with any investigations, enforce our legal terms and/or comply with applicable legal requirements.</p>

			<p>If you have questions or comments about your privacy rights, you may email us at {{ $config.CONTACT_MAIL }}.</p>




			<h2 id="youtube">10. YOUTUBE SERVICES</h2>
			<p>Twitchat utilizes YouTube API Services to enhance and provide specific functionalities within our platform. By using Twitchat, you acknowledge and agree to the collection and processing of data through YouTube API Services as outlined in <a href="https://policies.google.com/privacy" target="_blank">Google Privacy Policy</a>.</p>
			<p>If Twitchat accesses or uses Authorized Data, users have the ability to revoke the API Client's access to their data through the <a href="https://security.google.com/settings/security/permissions" target="_blank">Google security settings page</a>. In addition to Twitchat's normal procedure for deleting stored data, users can take the following steps to manage access:</p>
			<ul>
				<li>Visit the Google security settings page: <a href="https://security.google.com/settings/security/permissions" target="_blank">Google security settings page</a>.</li>
				<li>Locate <strong>Twitchat</strong> in the list of authorized applications.</li>
				<li>Revoke access by selecting Twitchat and following the provided instructions.</li>
			</ul>

			<p>Twitchat use and transfer to any other app of information received from Google APIs will adhere to <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank">Google API Services User Data Policy</a>, including the Limited Use requirements.</p>




			<h2 id="3rdparty">11. THIRD-PARTY DATA SHARING</h2>
			<p>We want to make it clear that none of the data obtained from third-party APIs will be shared with any other third party. The information retrieved from these services is solely used to provide and improve the functionality of our web app.</p>





			<h2 id="DNT">12. CONTROLS FOR DO-NOT-TRACK FEATURES</h2>
			<p>Most web browsers and some mobile operating systems and mobile applications include a Do-Not-Track ( "DNT" ) feature or setting you can activate to signal your privacy preference not to have data about your online browsing activities monitored and collected. At this stage no uniform technology standard for recognizing and implementing DNT signals has been finalized . As such, we do not currently respond to DNT browser signals or any other mechanism that automatically communicates your choice not to be tracked online. If a standard for online tracking is adopted that we must follow in the future, we will inform you about that practice in a revised version of this privacy notice.</p>





			<h2 id="caresidents">13. DO CALIFORNIA RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?</h2>
			<p><strong>In Short:</strong> Yes, if you are a resident of California, you are granted specific rights regarding access to your personal information.</p>

			<p>California Civil Code Section 1798.83, also known as the "Shine The Light" law, permits our users who are California residents to request and obtain from us, once a year and free of charge, information about categories of personal information (if any) we disclosed to third parties for direct marketing purposes and the names and addresses of all third parties with which we shared personal information in the immediately preceding calendar year. If you are a California resident and would like to make such a request, please submit your request in writing to us using the contact information provided below.</p>

			<p>If you are under 18 years of age, reside in California, and have a registered account with Services, you have the right to request removal of unwanted data that you publicly post on the Services. To request removal of such data, please contact us using the contact information provided below and include the email address associated with your account and a statement that you reside in California. We will make sure the data is not publicly displayed on the Services, but please be aware that the data may not be completely or comprehensively removed from all our systems (e.g. , backups, etc.).</p>

			<strong>CCPA Privacy Notice</strong>
			<p>The California Code of Regulations defines a "resident" as:</p>
			<ul>
				<li>(1) every individual who is in the State of California for other than a temporary or transitory purpose and</li>
				<li>(2) every individual who is domiciled in the State of California who is outside the State of California for a temporary or transitory purpose</li>
			</ul>
			<p>All other individuals are defined as "non-residents."</p>
			<p>If this definition of "resident" applies to you, we must adhere to certain rights and obligations regarding your personal information.</p>

			<strong>What categories of personal information do we collect?</strong>

			<p>We have collected the following categories of personal information in the past twelve (12) months:</p>

			<table>
				<tr>
					<th>Category</th>
					<th>Examples</th>
					<th>Collected</th>
				</tr>
				<tr>
					<td>A. Identifiers</td>
					<td>Contact details, such as real name, alias, postal address, telephone or mobile contact number, unique personal identifier, online identifier, Internet Protocol address, email address, and account name</td>
					<td class="center"><Icon name="cross" theme="alert" /></td>
				</tr>
				<tr>
					<td>B. Personal information categories listed in the California Customer Records statute</td>
					<td>Name, contact information, education, employment, employment history, and financial information</td>
					<td class="center"><Icon name="cross" theme="alert" /></td>
				</tr>
				<tr>
					<td>C. Protected classification characteristics under California or federal law</td>
					<td>Gender and date of birth</td>
					<td class="center"><Icon name="cross" theme="alert" /></td>
				</tr>
				<tr>
					<td>D. Commercial information</td>
					<td>Transaction information, purchase history, financial details, and payment information</td>
					<td class="center"><Icon name="cross" theme="alert" /></td>
				</tr>
				<tr>
					<td>E. Biometric information</td>
					<td>Fingerprints and voiceprints</td>
					<td class="center"><Icon name="cross" theme="alert" /></td>
				</tr>
				<tr>
					<td>F. Internet or other similar network activity</td>
					<td>Browsing history, search history, online behavior , interest data, and interactions with our and other websites, applications, systems, and advertisements</td>
					<td class="center"><Icon name="cross" theme="alert" /></td>
				</tr>
				<tr>
					<td>G. Geolocation data</td>
					<td>Device location</td>
					<td class="center"><Icon name="cross" theme="alert" /></td>
				</tr>
				<tr>
					<td>H. Audio, electronic, visual, thermal, olfactory, or similar information</td>
					<td>Images and audio, video or call recordings created in connection with our business activities</td>
					<td class="center"><Icon name="cross" theme="alert" /></td>
				</tr>
				<tr>
					<td>I. Professional or employment-related information</td>
					<td>Business contact details in order to provide you our Services at a business level or job title, work history, and professional qualifications if you apply for a job with us</td>
					<td class="center"><Icon name="cross" theme="alert" /></td>
				</tr>
				<tr>
					<td>J. Education Information</td>
					<td>Student records and directory information</td>
					<td class="center"><Icon name="cross" theme="alert" /></td>
				</tr>
				<tr>
					<td>K. Inferences drawn from other personal information</td>
					<td>Inferences drawn from any of the collected personal information listed above to create a profile or summary about, for example, an individual’s preferences and characteristics</td>
					<td class="center"><Icon name="cross" theme="alert" /></td>
				</tr>
				<tr>
					<td>L. Sensitive Personal Information</td>
					<td></td>
					<td class="center"><Icon name="cross" theme="alert" /></td>
				</tr>
			</table>


			<p>We may also collect other personal information outside of these categories through instances where you interact with us in person, online, or by phone or mail in the context of:</p>
			<ul>
				<li>Receiving help through our customer support channels;</li>
				<li>Participation in customer surveys or contests; and</li>
				<li>Facilitation in the delivery of our Services and to respond to your inquiries.</li>
			</ul>

			<strong>How do we use and share your personal information?</strong>

			<p>More information about our data collection and sharing practices can be found in this privacy notice .</p>

			<p>You may contact us by email at  {{ $config.CONTACT_MAIL }} , or by referring to the contact details at the bottom of this document.</p>

			<p>If you are using an authorized agent to exercise your right to opt out we may deny a request if the authorized agent does not submit proof that they have been validly authorized to act on your behalf.</p>

			<strong>Will your information be shared with anyone else?</strong>

			<p>We may disclose your personal information with our service providers pursuant to a written contract between us and each service provider. Each service provider is a for-profit entity that processes the information on our behalf, following the same strict privacy protection obligations mandated by the CCPA.</p>

			<p>We may use your personal information for our own business purposes, such as for undertaking internal research for technological development and demonstration. This is not considered to be "selling" of your personal information.</p>

			<p>We have not disclosed, sold, or shared any personal information to third parties for a business or commercial purpose in the preceding twelve (12) months. We will not sell or share personal information in the future belonging to website visitors, users, and other consumers.</p>


			<strong>Your rights with respect to your personal data</strong>

			<p class="underline">Right to request deletion of the data — Request to delete</p>

			<p>You can ask for the deletion of your personal information. If you ask us to delete your personal information, we will respect your request and delete your personal information, subject to certain exceptions provided by law, such as (but not limited to) the exercise by another consumer of his or her right to free speech, our compliance requirements resulting from a legal obligation, or any processing that may be required to protect against illegal activities.</p>

			<p class="underline">Right to be informed — Request to know</p>

			<p>Depending on the circumstances, you have a right to know:</p>
			<ul>
				<li>whether we collect and use your personal information;</li>
				<li>the categories of personal information that we collect;</li>
				<li>the purposes for which the collected personal information is used;</li>
				<li>whether we sell or share personal information to third parties;</li>
				<li>the categories of personal information that we sold, shared, or disclosed for a business purpose;</li>
				<li>the categories of third parties to whom the personal information was sold, shared, or disclosed for a business purpose;</li>
				<li>the business or commercial purpose for collecting, selling, or sharing personal information; and</li>
				<li>the specific pieces of personal information we collected about you.</li>
			</ul>
			<p>In accordance with applicable law, we are not obligated to provide or delete consumer information that is de-identified in response to a consumer request or to re-identify individual data to verify a consumer request.</p>

			<p class="underline">Right to Non-Discrimination for the Exercise of a Consumer’s Privacy Rights</p>

			<p>We will not discriminate against you if you exercise your privacy rights.</p>

			<p class="underline">Right to Limit Use and Disclosure of Sensitive Personal Information</p>

			<p>We do not process consumer's sensitive personal information.</p>

			<p class="underline">Verification process</p>

			<p>Upon receiving your request, we will need to verify your identity to determine you are the same person about whom we have the information in our system. These verification efforts require us to ask you to provide information so that we can match it with information you have previously provided us. For instance, depending on the type of request you submit, we may ask you to provide certain information so that we can match the information you provide with the information we already have on file, or we may contact you through a communication method (e.g. , phone or email) that you have previously provided to us. We may also use other verification methods as the circumstances dictate.</p>

			<p>We will only use personal information provided in your request to verify your identity or authority to make the request. To the extent possible, we will avoid requesting additional information from you for the purposes of verification. However, if we cannot verify your identity from the information already maintained by us, we may request that you provide additional information for the purposes of verifying your identity and for security or fraud-prevention purposes. We will delete such additionally provided information as soon as we finish verifying you.</p>

			<p class="underline">Other privacy rights</p>
			<ul>
				<li>You may object to the processing of your personal information.</li>
				<li>You may request correction of your personal data if it is incorrect or no longer relevant, or ask to restrict the processing of the information.</li>
				<li>You can designate an authorized agent to make a request under the CCPA on your behalf. We may deny a request from an authorized agent that does not submit proof that they have been validly authorized to act on your behalf in accordance with the CCPA.</li>
				<li>You may request to opt out from future selling or sharing of your personal information to third parties. Upon receiving an opt-out request, we will act upon the request as soon as feasibly possible, but no later than fifteen (15) days from the date of the request submission.</li>
			</ul>

			<p>To exercise these rights, you can contact us  by email at {{ $config.CONTACT_MAIL }} , or by referring to the contact details at the bottom of this document. If you have a complaint about how we handle your data, we would like to hear from you.</p>





			<h2 id="virginia">14. DO VIRGINIA RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?</h2>
			<p><strong>In Short:</strong> Yes, if you are a resident of Virginia, you may be granted specific rights regarding access to and use of your personal information.</p>

			<strong>Virginia CDPA Privacy Notice</strong>
			<p>Under the Virginia Consumer Data Protection Act (CDPA):</p>
			<p>"Consumer" means a natural person who is a resident of the Commonwealth acting only in an individual or household context. It does not include a natural person acting in a commercial or employment context.</p>
			<p>"Personal data" means any information that is linked or reasonably linkable to an identified or identifiable natural person. "Personal data" does not include de-identified data or publicly available information.</p>
			<p>"Sale of personal data" means the exchange of personal data for monetary consideration.</p>
			<p>If this definition "consumer" applies to you, we must adhere to certain rights and obligations regarding your personal data.</p>
			<p>The information we collect, use, and disclose about you will vary depending on how you interact with us and our Services. To find out more, please visit the following links:</p>
			<ul>
				<li><a href="#infocollect">Personal data we collect</a></li>
				<li><a href="#infouse">How we use your personal data</a></li>
				<li><a href="#whoshare">When and with whom we share your personal data</a></li>
			</ul>

			<p class="underline">Your rights with respect to your personal data</p>
			<ul>
				<li>Right to be informed whether or not we are processing your personal data</li>
				<li>Right to access your personal data</li>
				<li>Right to correct inaccuracies in your personal data</li>
				<li>Right to request deletion of your personal data</li>
				<li>Right to obtain a copy of the personal data you previously shared with us</li>
				<li>Right to opt out of the processing of your personal data if it is used for targeted advertising, the sale of personal data, or profiling in furtherance of decisions that produce legal or similarly significant effects ( "profiling" )</li>
			</ul>

			<p>We have not sold any personal data to third parties for business or commercial purposes. We will not sell personal data in the future belonging to website visitors, users, and other consumers.</p>

			<p class="underline">Exercise your rights provided under the Virginia CDPA</p>
			<p>More information about our data collection and sharing practices can be found in this privacy notice .</p>
			<p>You may contact us by email at {{ $config.CONTACT_MAIL }}.</p>
			<p>If you are using an authorized agent to exercise your rights, we may deny a request if the authorized agent does not submit proof that they have been validly authorized to act on your behalf.</p>
			<p class="underline">Verification process</p>
			<p>We may request that you provide additional information reasonably necessary to verify you and your consumer's request. If you submit the request through an authorized agent, we may need to collect additional information to verify your identity before processing your request.</p>
			<p>Upon receiving your request, we will respond without undue delay, but in all cases, within forty-five (45) days of receipt. The response period may be extended once by forty-five (45) additional days when reasonably necessary. We will inform you of any such extension within the initial 45-day response period, together with the reason for the extension.</p>
			<p class="underline">Right to appeal </p>
			<p>If we decline to take action regarding your request, we will inform you of our decision and reasoning behind it. If you wish to appeal our decision, please email us at {{ $config.CONTACT_MAIL }} . Within sixty (60) days of receipt of an appeal, we will inform you in writing of any action taken or not taken in response to the appeal, including a written explanation of the reasons for the decisions. If your appeal if denied, you may contact the <a href="Attorney General to submit a complaint" target="_blank">Attorney General to submit a complaint</a>.</p>





			<h2 id="policyupdates">15. DO WE MAKE UPDATES TO THIS NOTICE?</h2>
			<p><strong>In Short:</strong> Yes, we will update this notice as necessary to stay compliant with relevant laws.</p>
			<p>We may update this privacy notice from time to time. The updated version will be indicated by an updated "Revised" date and the updated version will be effective as soon as it is accessible. If we make material changes to this privacy notice, we may notify you either by prominently posting a notice of such changes or by directly sending you a notification. We encourage you to review this privacy notice frequently to be informed of how we are protecting your information.</p>





			<h2 id="contact">16. HOW CAN YOU CONTACT US ABOUT THIS NOTICE?</h2>
			<p>If you have questions or comments about this notice, you may email us at {{ $config.CONTACT_MAIL }}.</p>





			<h2 id="request">17. HOW CAN YOU REVIEW, UPDATE, OR DELETE THE DATA WE COLLECT FROM YOU?</h2>
			<p>Based on the applicable laws of your country, you may have the right to request access to the personal information we collect from you, change that information, or delete it. To request to review, update, or delete your personal information, please <a @click="openDataMnagerForm()" target="_blank">open data management form</a>.</p>
			<p>This privacy policy was created using Termly's <a href="https://termly.io/products/privacy-policy-generator/" target="_blank">Privacy Policy Generator</a>.</p>
		</div>

		<div class="dataManager modal" v-if="showDataManager">
			<div class="dimmer" @click="showDataManager = false"></div>
			<div class="holder">
				<div class="head">
					<div class="title">Manage your personnal data</div>
					<ClearButton @click="showDataManager = false" />
				</div>
				<div class="content" v-if="auhtenticating">
					<Icon name="loader" class="loader" />
				</div>
				<div class="content" v-else-if="!auhtenticated">
					<p class="card-item alert"><Icon name="alert" />You must be authenticated</p>
					<Button class="loginBt"
						ref="loginBt"
						@click="showLoginForm = true; showDataManager = false;"
						icon="twitch"
					>{{ $t('home.loginBt') }}</Button>
				</div>
				<div class="content" v-else>
					<p>Twitchat only keeps your parameters on its server. You can download or delete them.</p>
					<div class="ctas">
						<Button @click="downloadData()" icon="download" :loading="downloadingData">Download your personnal data</Button>
						<Button v-if="!showDeleteInput" @click="showDeleteInput=true" icon="trash" alert>Delete your personnal data</Button>
						<p v-if="showDeleteInput && !deleteDone && !deletingData" class="instructions">Please write "<strong>DELETE MY DATA</strong>" below and submit</p>
						<form v-if="showDeleteInput && !deleteDone && !deletingData" @submit.prevent="deleteData()">
							<input type="text" placeholder="write DELETE MY DATA..." v-model="confirmation">
							<Button type="submit" alert :disabled="confirmation.trim().toLowerCase() != 'delete my data'">DELETE</Button>
						</form>
						<Icon v-if="deletingData" class="loader" name="loader" />
						<div v-if="deleteDone" class="card-item primary">Your data have been successfully deleted</div>
					</div>
				</div>
			</div>
		</div>
		<Login v-show="showLoginForm" :show="showLoginForm" @close="showLoginForm = false; showDataManager = true;" />
	</div>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import ClearButton from '@/components/ClearButton.vue';
import Icon from '@/components/Icon.vue';
import ThemeSelector from '@/components/ThemeSelector.vue';
import ApiHelper from '@/utils/ApiHelper';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import Login from './Login.vue';
import DataStore from '@/store/DataStore';
import Utils from '@/utils/Utils';
import Config from '@/utils/Config';

@Component({
	components:{
		Icon,
		Login,
		Button: TTButton,
		ClearButton,
		ThemeSelector,
	},
	emits:[],
})
class PrivacyPolicy extends Vue {

	public confirmation:string = "";
	public showDeleteInput:boolean = false;
	public showDataManager:boolean = false;
	public auhtenticating:boolean = true;
	public auhtenticated:boolean = false;
	public showLoginForm:boolean = false;
	public downloadingData:boolean = false;
	public deletingData:boolean = false;
	public deleteDone:boolean = false;

	public mounted():void {
		//Force scroll to hash if any
		//Doesn't work by default because of the loading delay
		let hash = window.location.hash;
		if (hash) {
			let elem = document.getElementById(hash.substring(1));
			if (elem) elem.scrollIntoView({behavior:"auto", block:"center"});
		}
	}

	public openDataMnagerForm():void {
		this.showDataManager = true;
		this.auhtenticating = true;
		this.$store.auth.twitch_tokenRefresh()
		.then(result => {
			this.auhtenticated = result !== false;
			this.auhtenticating = false;
			DataStore.set(DataStore.REDIRECT, this.$route.fullPath, false);
		}).catch(() => {
			this.auhtenticated = false;
			this.auhtenticating = false;
		});
	}

	public downloadData():void {
		this.downloadingData = true;
		ApiHelper.call("user/data", "GET").then(async (result) => {
			if(result.json.success) {
				const data = JSON.stringify(result.json.data);
				Utils.downloadFile("twitchat_data.json", data);
				await Utils.promisedTimeout(1000);
			}else{
				this.$store.common.alert("Something went wrong when downloading your data. Please try again or contact us at "+Config.instance.CONTACT_MAIL)
			}
			this.downloadingData = false;
		});
	}

	public deleteData():void {
		this.deletingData = true;
		this.$confirm("Delete your data?",
		"You will be logged out and all your Twitchat parameters will be erased from Twitchat server and from your browser storage.<br><br><strong>This cannot be undone</strong>!")
		.then(()=> {
			ApiHelper.call("user/data", "DELETE").then(()=>{
				this.deletingData = false;
				this.deleteDone = true;
				DataStore.clear();
			});
		}).catch(()=>{
			this.deletingData = false;
		})
	}

}
export default toNative(PrivacyPolicy);
</script>

<style scoped lang="less">
.privacypolicy{
	color: var(--color-text);
	margin: 2em;

	.loader {
		margin:auto;
		height: 2em;
		display: block;
	}

	.themeSelector {
		margin: auto;
		display: block;
		width: fit-content;
		margin-bottom: 1em;
	}

	&>.content {
		line-height: 1.25em;
		padding: 1em;

		&>.head {
			margin-bottom: 1em;
		}


		&>p, &>ul {
			margin-bottom: 1em;
		}
	}

	h2 {
		margin-top: 5em;
		margin-bottom: .5em;
		font-size: 1.25em;
	}

	ul {
		li {
			list-style-type: disc;
			list-style-position: inside;
			margin-bottom: .25em;
		}
		&.index {
			li {
				list-style-type: decimal;
			}
		}
	}

	.underline {
		text-decoration: underline;
		font-style: italic;
	}

	table, th, td {
		border: 1px solid var(--color-text);
	}
	th, td {
		padding: .5em;
		&.center {
			text-align: center;
			align-items: center;
			vertical-align: middle;
		}
		.icon {
			height: 1em;
		}
	}

	.dataManager {
		.content {
			text-align: center;
			.ctas {
				margin-top: 1em;
				gap: .5em;
				display: flex;
				flex-direction: column;
				flex-wrap: wrap;
				align-items: center;
				justify-content: center;

				form {
					display: flex;
					flex-direction: row;
					input {
						border-top-right-radius: 0;
						border-bottom-right-radius: 0;
					}
					.button {
						border-top-left-radius: 0;
						border-bottom-left-radius: 0;
					}
				}
			}

			&>.alert {
				width: auto;
				margin: auto;
				width: fit-content;
				margin-bottom: 1em;
				.icon {
					height: 1em;
					margin-right: .5em;
					vertical-align: middle;
				}
			}
		}
	}
}
</style>
