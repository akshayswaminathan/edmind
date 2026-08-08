// Terms of Use for EM Tools, operated by practiceLabs, Inc.
//
// Presented in the consent gate the user must accept before using the MDM
// Writer. Bump `version` whenever the substance changes so previously
// accepted users are re-prompted. Sections render as: numbered heading, then
// a list of blocks — a string is a paragraph (supports **bold** inline), and
// an object { ul: [...] } is a bullet list.

export const TERMS_META = {
  title: 'Terms of Use',
  lastRevised: 'July 23, 2025',
  version: '2025-07-23',
  contactEmail: 'contact@practicelabs.com',
};

// The three acknowledgments a user must affirm to use the MDM Writer.
export const CONSENT_POINTS = [
  'I am a licensed medical provider using this tool in my professional capacity.',
  'I will not enter protected health information (PHI). This is not a HIPAA-covered system.',
  'EM Tools does not provide medical advice. I am solely responsible for all clinical decisions and for anything I place in the medical record.',
];

export const TERMS_SECTIONS = [
  {
    n: 1,
    title: 'Application of these Terms of Use',
    blocks: [
      `The website or application (collectively, “Site”) on which this Terms of Use (“Terms”) appears is owned and operated by practiceLabs, Inc (“practiceLabs,” “we,” “our,” or “us”). For purposes of these Terms, “you” or “your” means the person accessing the Site and any persons that allow others to provide information about themselves to us. The Site may provide information, documents, tools, products, services, and accounts (collectively, “Services”).`,
      `THESE TERMS CONSTITUTE A BINDING AGREEMENT BETWEEN YOU AND US. PLEASE READ CAREFULLY THROUGH ALL SECTIONS OF THESE TERMS. YOUR ACCESS TO AND USE OF THE SITE IS SUBJECT TO THESE TERMS AND ALL APPLICABLE LAWS AND WE RESERVE THE RIGHT TO TERMINATE YOUR ACCESS TO THE SITE IF YOU VIOLATE THESE TERMS. BY CLICKING ON LINKS WITHIN THE SITE OR WEBPAGES BEYOND THE SITE’S HOMEPAGE OR BY CLICKING ON A BOX OR ICON YOU AGREE TO THESE TERMS WHETHER OR NOT YOU COMPLETE A TRANSACTION WITH US AND WHETHER OR NOT YOU COMPLETE YOUR TRANSACTION ON THE SITE OR THROUGH OTHER CHANNELS, SUCH AS BY TELEPHONE, EMAIL, FACSIMILE OR OTHERWISE. IF YOU DO NOT AGREE WITH THESE TERMS, DO NOT ACCESS OR OTHERWISE USE THE SITE, ANY SERVICES AVAILABLE THROUGH THIS SITE, OR ANY INFORMATION CONTAINED ON THIS SITE.`,
      `MANDATORY ARBITRATION NOTICE AND CLASS ACTION AND JURY TRIAL WAIVER. These Terms contain a mandatory (binding) arbitration provision and class action and jury trial waiver clauses. Except for certain types of disputes described in the arbitration section below or where prohibited by applicable law, you agree that disputes between you and us regarding your use of the Site or Services will be resolved by binding, individual arbitration and you waive your right to participate in a class action lawsuit or class-wide arbitration, including as a class representative. The arbitrator’s decision will be subject to very limited review by a court. You will be entitled to a fair hearing, but the arbitration procedures are simpler and more limited than rules applicable in court. For more details, see below.`,
      `We may make changes to the content available on the Site at any time. We can change, update, add, or remove provisions of these Terms at any time by posting the updated Terms on the Site. We will make commercially reasonable efforts to notify you of any material changes to these Terms, however we are not obligated to. You waive any right you may have to receive specific notice of such changes to these Terms except for changes to our agreement to arbitration, which is discussed more fully below. By using the Site after we have updated the Terms, you are agreeing to the then current Terms. You are responsible for regularly reviewing these Terms.`,
      `In addition to these Terms, your use of certain Services may be governed by additional agreements.`,
    ],
  },
  {
    n: 2,
    title: 'Account Registration',
    blocks: [
      `You may need to register an account to access the Services. Registration requires you to provide us with your name, email address, profession, specialty and other information specified in the registration form (“Registration Information”), and to select a username and password that will be associated with your account. You agree that your Registration Information is true, accurate, current, and complete, and you will promptly update your Registration Information as necessary so that it continues to be true, accurate, current and complete. We may attempt to verify the accuracy of the Registration Information that you have provided and update it as necessary. You are solely responsible for maintaining the confidentiality and security of your account username and password and you may not permit another person to use your username and password to access the Services. You are responsible for all activity that occurs under your account. If you believe that the security of your account information has been compromised, you should immediately change your username and password through the account settings feature or notify us and we will assist you. We shall have no liability for any unauthorized access to or use of your account information. We have the right to disable any username, password, or other identifier, whether chosen by you or provided by us, at any time in our sole discretion for any reason, including if, in our opinion, you have violated any provision of these Terms.`,
    ],
  },
  {
    n: 3,
    title: 'Accessing the Site and Services',
    blocks: [
      `We reserve the right to withdraw or amend this Site, and any Services or Materials (defined below) we provide on the Site, in our sole discretion and without notice. We will not be liable if, for any reason, all or any part of the Site is unavailable at any time or for any period. From time to time, in our sole discretion and without notice, we may restrict access to some parts of the Site, or the entire Site, to users, including registered users.`,
      `You are responsible for both:`,
      { ul: [
        `Making all arrangements necessary for you to have access to the Site.`,
        `Ensuring that all persons who access the Site through your internet connection are aware of these Terms and comply with them.`,
      ] },
    ],
  },
  {
    n: 4,
    title: 'AI Technologies',
    blocks: [
      `“AI Technologies” means any system we use or make available through our Site or Service, that for any explicit or implicit objectives, infers from the inputs the system receives how to generate outputs, including content, decisions, predictions, or recommendations that can influence physical or virtual environments. For the avoidance of doubt Services includes AI Technologies. Subject to these Terms, we grant you a nontransferable, nonexclusive, non sublicensable, revocable, and limited right and license to access and use the AI Technologies. You agree to access and use the AI Technologies only as authorized by these Terms.`,
      `You may provide input, including content, documents, text, images, audio, video, photographs, or any other information (“Input”) to be processed by the AI Technologies and receive output generated and returned by the AI Technologies (“Output”). You are responsible for all Input and represent and warrant that you have all rights, licenses, and permissions required to provide Input into the AI Technologies. You agree not to input any protected health information covered by the Health Insurance Portability and Accountability Act (HIPAA) into the Services. You represent and warrant that all Input will not: (a) violate any applicable laws or these Terms, or (b) infringe, violate, or misappropriate any of our rights or the rights of any third party.`,
      `You acknowledge that Output may not be unique and the AI Technologies may generate the same or similar Output for any number of users. You are solely responsible for all use of the Output and for evaluating the accuracy and appropriateness of Output for your use case, including by utilizing human review as appropriate. You agree not to use the Services or any Output for any medical decision making.`,
      `You agree not to use the AI Technologies to: (i) develop data sets, foundation models, or other large scale models that may compete with the AI Technologies, (ii) mislead any person or imply that Output is unique or solely human generated, or (iii) generate spam or content for dissemination in an unlawful manner. You further agree not to reverse assemble, reverse compile, decompile, translate, engage in model extraction or stealing attacks, or otherwise attempt to discover the source code or underlying components, algorithms, or systems of the AI Technologies or automatically or programmatically extract data.`,
      `We own all right, title, and interest in and to the AI Technologies and any resulting usage data, including all intellectual property and proprietary rights therein. We reserve the right to use all Inputs and Outputs to train the AI Technologies. You hereby grant us a worldwide, limited, revocable, nonexclusive right and license to use and reproduce data in a de identified manner for the purposes of training, maintaining, developing, and improving the AI Technologies. We may disclose, distribute, and transfer data that we collect through the AI Technologies to third parties, provided, that the data is de-identified.`,
    ],
  },
  {
    n: 5,
    title: 'Proprietary Rights and Your Use of the Site',
    blocks: [
      `Unless otherwise specified in these Terms, all information and screens appearing on this Site are the sole property of us or our subsidiaries and affiliates, and other parties. We provide content through the Site that is copyrighted or contains protectable trademarks of us or our third party licensors and suppliers (collectively, the “Materials”). Materials may include documents, services, software, site design, text, graphics, logos, video, images, icons, and other content, as well as the arrangement thereof.`,
      `Subject to these Terms, we hereby grant to you a revocable, limited, personal, non exclusive, and non transferable license to use, view, print, display, and download the Materials for the sole purpose of viewing them on a stand alone personal computer or mobile device and to use this Site solely for your personal use. Except for the foregoing license and as otherwise required or limited by applicable law, you have no other rights in the Site or any Materials and you may not modify, edit, copy, reproduce, create derivative works of, reverse engineer, alter, enhance, or in any way exploit any of the Site or Materials in any manner or for any purpose that would constitute infringement of our, our licensors’, or the Site’s other users’ intellectual property rights. All rights not expressly granted herein are reserved.`,
      `If you breach any of these Terms, the above license will terminate automatically and you must immediately destroy any downloaded or printed Materials.`,
    ],
  },
  {
    n: 6,
    title: 'Your Communications to the Site',
    blocks: [
      `By forwarding any content or communications to us through the Site or by other electronic means, you thereby grant us a perpetual, royalty free, fully paid up, world wide, irrevocable, nonexclusive, freely transferable, and freely sublicensable license to use, reproduce, modify, adapt, publish, translate, create derivative works from, redistribute, and display such content and communications in any form for the purposes of providing the Services and any purpose tangentially related to the Services. No compensation will be paid to you with respect to our or our sublicensees’ use of your communications. By providing or submitting content, you represent and warrant that you own or otherwise control all of the rights to your submitted content and communications as described in this section, including all the rights necessary for you to submit the content and communications and grant the license above.`,
    ],
  },
  {
    n: 7,
    title: 'Electronic Communications',
    blocks: [
      `By using the Site and, or the Services, you consent to receiving electronic communications, including electronic notices, from us. These electronic communications may include notices about applicable fees and charges, transactional information and other information concerning or related to the Site and, or Materials. These electronic communications are part of your relationship with us. You agree that any notices, agreements, disclosures or other communications that we send you electronically will satisfy any legal communication requirements, including that such communications be in writing.`,
    ],
  },
  {
    n: 8,
    title: 'Permitted and Prohibited Uses',
    blocks: [
      `By accessing or using the Site and Services, you agree that:`,
      { ul: [
        `Your use of the Site is subject to and governed by these Terms.`,
        `You will only access or use the Site and transact business with us if you are at least eighteen (18) years old.`,
        `You will use the Site solely for its Services offered in the normal course of business.`,
        `You will always act in accordance with the law and custom, and in good faith.`,
        `You will comply with and be bound by these Terms as they appear on the Site each time you access and use the Site.`,
        `Each use of the Site by you indicates and confirms your agreement to be bound by these Terms.`,
        `These Terms are a legally binding agreement between you and us that will be enforceable against you.`,
      ] },
      `You further agree to not use the Site and Services in any way that:`,
      { ul: [
        `Changes or alters the Site or content or Services that may appear on the Site.`,
        `Impairs in any way the integrity or operation of the Site.`,
        `Interferes with or induces a breach of the contractual relationships between us and our employees.`,
        `Is in any way unlawful or prohibited, or that is harmful or destructive to anyone or their property.`,
        `Transmits any advertisements, solicitations, schemes, spam, flooding, or other unsolicited email and commercial communications.`,
        `Transmits any harmful or disabling computer codes or viruses.`,
        `Harvests email addresses from the Site.`,
        `Transmits unsolicited email to the Site or to anyone whose email address includes the domain name of the Site.`,
        `Interferes with our network services.`,
        `Attempts to gain unauthorized access to our network services.`,
        `Suggests an express or implied affiliation or relationship with us without our express written permission.`,
        `Impairs or limits our ability to operate the Site or any other person’s ability to access and use the Site.`,
        `Unlawfully impersonates or otherwise misrepresents your affiliation with any person or entity.`,
        `Transmits or uploads violent, obscene, sexually explicit, discriminatory, hateful, threatening, abusive, defamatory, offensive, harassing, or otherwise objectionable content or images.`,
        `Dilutes or depreciates our or any of our affiliates’ name and reputation.`,
        `Transmits or uploads content or images that infringe upon any third party’s intellectual property rights or right to privacy.`,
        `Unlawfully transmits or uploads any confidential, proprietary or trade secret information.`,
      ] },
      `We have no obligation, but maintain the right, to monitor the Site and Services. This list of prohibited activities provides examples and is not complete or exclusive. We reserve the right to terminate your access to use this Site or Services with or without cause and with or without notice, for any reason or no reason, or for any action that we determine is inappropriate or disruptive to this Site or to any other user of this Site and, or Services. We may report to law enforcement authorities any actions that may be illegal, and any reports we receive of such conduct. When legally required or at our discretion, we will cooperate with law enforcement agencies in any investigation of alleged illegal activity on this Site or on the internet, which may include disclosing any information we obtain. In addition, we may disclose information we obtain as necessary or appropriate to operate or improve the Site, to protect us and, or our Site users, or for any other purpose that the law permits.`,
    ],
  },
  {
    n: 9,
    title: 'Content Standards',
    blocks: [
      `These content standards apply to any Input you provide. All Input must comply with all applicable federal, state, local, and international laws and regulations. Without limiting the foregoing, Input must not:`,
      { ul: [
        `Contain any material that is defamatory, obscene, indecent, abusive, offensive, harassing, violent, hateful, inflammatory, or otherwise objectionable.`,
        `Promote sexually explicit or pornographic material, violence, or discrimination based on race, sex, religion, nationality, disability, sexual orientation, or age.`,
        `Infringe any patent, trademark, trade secret, copyright, or other intellectual property or other rights of any other person.`,
        `Violate the legal rights (including the rights of publicity and privacy) of others or contain any material that could give rise to any civil or criminal liability under applicable laws or regulations or that otherwise may be in conflict with these Terms.`,
        `Be likely to deceive any person.`,
        `Promote any illegal activity, or advocate, promote, or assist any unlawful act.`,
        `Cause annoyance, inconvenience, or needless anxiety or be likely to upset, embarrass, alarm, or annoy any other person.`,
        `Impersonate any person or misrepresent your identity or affiliation with any person or organization.`,
        `Involve commercial activities or sales, such as contests, sweepstakes, and other sales promotions, barter, or advertising.`,
        `Give the impression that they emanate from or are endorsed by us or any other person or entity, if this is not the case.`,
      ] },
      `We have the right to cooperate fully with any law enforcement authorities or court order requesting or directing us to disclose the identity or other information of anyone posting any materials on or through the Site. YOU WAIVE AND HOLD HARMLESS US FROM ANY CLAIMS RESULTING FROM ANY ACTION TAKEN BY US DURING, OR TAKEN AS A CONSEQUENCE OF, INVESTIGATIONS BY EITHER US OR LAW ENFORCEMENT AUTHORITIES.`,
      `However, we cannot review all material or Input before it is uploaded or posted through the Services, and cannot ensure prompt removal of objectionable material after it has been posted. Accordingly, we assume no liability for any action or inaction regarding transmissions, communications, or content provided by any user or third party. We have no liability or responsibility to anyone for performance or nonperformance of the activities described in this section.`,
    ],
  },
  {
    n: 10,
    title: 'Reliance on Information Posted',
    blocks: [
      `The information presented on or through the Site is made available solely for general information purposes. We do not warrant the accuracy, completeness, or usefulness of this information. Any reliance you place on such information is strictly at your own risk. We disclaim all liability and responsibility arising from any reliance placed on such materials by you or any other visitor to the Site, or by anyone who may be informed of any of its contents.`,
      `This Site may include content provided by third parties, including materials provided by other users, bloggers, and third party licensors, syndicators, aggregators, and, or reporting services. All statements and, or opinions expressed in these materials, and all articles and responses to questions and other content, other than the content provided by us, are solely the opinions and the responsibility of the person or entity providing those materials. These materials do not necessarily reflect our opinion. We are not responsible, or liable to you or any third party, for the content or accuracy of any materials provided by any third parties.`,
    ],
  },
  {
    n: 11,
    title: 'Third-Party Links',
    blocks: [
      `This Site may link to other websites that are not sites controlled or operated by us (collectively, “Third-Party Sites”). You acknowledge and agree that the Third-Party Sites may have different privacy policies and terms and conditions and/or user guides and business practices than us, and you further acknowledge and agree that your use of such Third-Party Sites is governed by the respective Third-Party Site privacy policy and terms and conditions and/or user guides. We provide links to the Third-Party Sites to you as a convenience, and we do not verify, make any representations or take responsibility for such Third-Party Sites, including the truthfulness, accuracy, quality or completeness of the content, services, links displayed and/or any other activities conducted on or through such Third-Party Sites. YOU AGREE THAT WE WILL NOT, UNDER ANY CIRCUMSTANCES, BE RESPONSIBLE OR LIABLE, DIRECTLY OR INDIRECTLY, FOR ANY GOODS, SERVICES, INFORMATION, RESOURCES AND/OR CONTENT AVAILABLE ON OR THROUGH ANY THIRD-PARTY SITES AND/OR THIRD- PARTY DEALINGS OR COMMUNICATIONS, OR FOR ANY HARM RELATED THERETO, OR ANY DAMAGES OR LOSSES CAUSED OR ALLEGED TO BE CAUSED BY OR IN CONNECTION WITH YOUR USE OR RELIANCE ON THE CONTENT OR BUSINESS PRACTICES OF ANY THIRD PARTY. Any reference on the Site to any product, service, publication, institution, or organization of any third-party entity or individual does not constitute or imply our endorsement or recommendation.`,
    ],
  },
  {
    n: 12,
    title: 'Federal and State Laws',
    blocks: [
      `The Site is operated from the U.S. and is intended for U.S. residents only. The Site is not approved for distribution outside of the U.S. and non U.S. residents should not rely or act upon the information contained within. When using the Site, on the Site, or when using any content provided by us, you must obey all applicable U.S. federal, state, and local laws.`,
    ],
  },
  {
    n: 13,
    title: 'Minimum Age',
    blocks: [
      `We do not allow persons under the age of eighteen (18) to use the Site. By using the Site, you represent and warrant that you are eighteen (18) years of age or over.`,
    ],
  },
  {
    n: 14,
    title: 'Disclaimer of Warranties',
    blocks: [
      `Your use of the Site and Services is at your own risk. The Materials have not been verified or authenticated in whole or in part by us, and they may include inaccuracies or typographical or other errors. We do not warrant the accuracy or timeliness of the Materials contained on this Site. We have no liability for any errors or omissions in the Materials, whether provided by us, our licensors or suppliers or other users.`,
      `TO THE FULLEST EXTENT PROVIDED BY LAW AND EXCEPT AS OTHERWISE PROVIDED HEREIN OR ON THE SITE, THE INFORMATION AND SERVICES OFFERED ON OR THROUGH THE SITE AND ANY REFERENCED THIRD-PARTY SITE ARE PROVIDED “AS IS” AND WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. ANY THIRD-PARTY GOODS OR SERVICES PROVIDED ARE SUPPLIED AS A CONVENIENCE TO YOU AND DO NOT CONSTITUTE SPONSORSHIP, AFFILIATION, PARTNERSHIP, OR ENDORSEMENT. TO THE FULLEST EXTENT ALLOWED BY LAW, WE DISCLAIM ALL EXPRESS AND IMPLIED WARRANTIES, INCLUDING THE IMPLIED WARRANTY OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.`,
      `TO THE FULLEST EXTENT ALLOWED BY LAW, WE DO NOT WARRANT OR MAKE ANY REPRESENTATIONS REGARDING THE USE OR THE RESULTS OF THE USE OF THE SITE, THE MATERIALS, ANY CONTENT, OR OTHER POSTED MATERIALS ON THE SITE IN TERMS OF ITS CORRECTNESS, ACCURACY, TIMELINESS, RELIABILITY OR OTHERWISE.`,
      `BY PROVIDING THE SERVICES ON THE SITE, WE DO NOT IN ANY WAY PROMISE THAT THE SERVICES WILL REMAIN AVAILABLE TO YOU. WE ARE ENTITLED TO TERMINATE ALL OR PART OF ANY OF THE SITE AT ANY TIME, IN OUR SOLE DISCRETION WITHOUT NOTICE TO YOU.`,
    ],
  },
  {
    n: 15,
    title: 'No Medical Advice',
    blocks: [
      `We are not a health care provider and the Services are not intended to provide medical advice, diagnosis or treatment or substitute for an individual patient assessment based on a qualified health care provider’s evaluation of each patient, including factors unique to such patient. The Services (a) are intended and presented only for general educational purposes and should not be relied upon or construed to indicate that the use of a pharmaceutical or treatment is safe, appropriate, or effective for a specific individual, (b) is not comprehensive and does not cover all uses, precautions, side effects, warnings, and interactions related to pharmaceuticals or treatments, (c) may not apply to any specific medical condition, (d) is only applicable to use in the United States and pharmaceuticals legally available in the United States, (e) has not been reviewed for compliance with federal or state pharmaceutical marketing, advertising, and disclosure statutes or regulations, and (f) is subject to change without notice. We are not responsible or liable for any advice, course of treatment, diagnosis, or any other information or services, including health care services. The Services should not be used if you or a patient is in a life threatening or emergency medical situation. IF YOU HAVE ANY QUESTIONS ABOUT YOUR HEALTH, INCLUDING ANY MEDICAL CONDITION OR TREATMENT, PLEASE CONTACT YOUR HEALTHCARE PROVIDER OR, IF YOU HAVE A MEDICAL EMERGENCY, SEEK IMMEDIATE MEDICAL HELP OR CALL EMERGENCY SERVICES AT 911 (OR YOUR LOCAL MEDICAL EMERGENCY NUMBER).`,
    ],
  },
  {
    n: 16,
    title: 'Limitation of Liability',
    blocks: [
      `WE CANNOT GUARANTEE THE SITE AND SERVICES WILL BE AVAILABLE ONE HUNDRED PERCENT (100%) OF THE TIME BECAUSE PUBLIC NETWORKS, SUCH AS THE INTERNET, OCCASIONALLY EXPERIENCE DISRUPTIONS. ALTHOUGH WE STRIVE TO PROVIDE THE MOST RELIABLE WEBSITE REASONABLY POSSIBLE, INTERRUPTIONS AND DELAYS IN ACCESSING THE SITE AND SERVICES ARE UNAVOIDABLE AND WE DISCLAIM ANY LIABILITY FOR DAMAGES RESULTING FROM SUCH PROBLEMS.`,
      `NOTWITHSTANDING THE FOREGOING, OUR LIABILITY AND THE LIABILITY OF OUR AFFILIATES, EMPLOYEES, AGENTS, REPRESENTATIVES AND THIRD-PARTY SERVICE PROVIDERS WITH RESPECT TO ANY AND ALL CLAIMS ARISING OUT OF YOUR USE OF THE SITE, THE MATERIALS, AND ANY CONTENT OR SERVICES OBTAINED THROUGH THE SITE, WHETHER BASED ON WARRANTY, CONTRACT, NEGLIGENCE, STRICT LIABILITY OR OTHERWISE, SHALL NOT EXCEED, IN THE AGGREGATE, FIFTY DOLLARS ($50).`,
      `IN NO EVENT WILL WE BE LIABLE TO YOU OR ANY PARTY FOR ANY DIRECT, INDIRECT, SPECIAL OR OTHER CONSEQUENTIAL DAMAGES FOR ANY USE OF THE SITE, OR ON ANY OTHER HYPERLINKED WEBSITE, INCLUDING, WITHOUT LIMITATION, ANY LOST PROFITS, BUSINESS INTERRUPTION, LOSS OF PROGRAMS OR OTHER DATA OR OTHERWISE, EVEN IF WE ARE EXPRESSLY ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.`,
    ],
  },
  {
    n: 17,
    title: 'Indemnification',
    blocks: [
      `You agree to indemnify, defend and hold harmless us and, to the extent applicable, our subsidiaries and affiliates, and each of their and our respective directors, officers, shareholders, employees, agents, representatives, clients, contractors and third party service providers, for any and all losses, claims, demands, actions, liability, fines, penalties and expenses (including reasonable legal fees) that may arise from any of your acts through the use of the Site. Such acts may include: (a) providing content to or communicating with us or, to the extent applicable, our subsidiaries or affiliates, (b) unauthorized use of material obtained through the Site, (c) engaging in a prohibited activity, or (d) any other action that breaches these Terms. We reserve the right to assume the exclusive defense and control of any matter otherwise subject to indemnification by you, which shall not excuse your indemnity obligations.`,
    ],
  },
  {
    n: 18,
    title: 'Copyright Complaints',
    blocks: [
      `We respect the intellectual property of others. If you believe that your work has been copied in a way that constitutes copyright infringement, please contact us as provided in the “Questions” section below.`,
    ],
  },
  {
    n: 19,
    title: 'Injunctive Relief',
    blocks: [
      `You acknowledge that we may be irreparably damaged if these Terms are not specifically enforced, and damages at law would be an inadequate remedy. Therefore, in the event of a breach or threatened breach of any provision of these Terms by you, we shall be entitled, without prejudice to any other rights and remedies that may be sought under the mandatory arbitration provision of these Terms, to an injunction restraining such breach or threatened breach, without being required to show any actual damage or to post an injunction bond, and, or to a decree for specific performance of the provisions of these Terms. For purposes of this section, you agree that any action or proceeding with regard to such injunction restraining such breach or threatened breach shall be brought in the state or federal courts located in Delaware. You consent to the jurisdiction of such court and waive any objection to the laying of venue of any such action or proceeding in such court. You agree that service of any court paper may be effected on such party by mail or in such other manner as may be provided under applicable laws, rules of procedure or local rules.`,
    ],
  },
  {
    n: 20,
    title: 'Mandatory Arbitration and Class Action and Jury Trial Waiver',
    blocks: [
      `Most concerns can be resolved quickly and to your satisfaction by contacting us as set forth in the “Questions” section below.`,
      `In the event that we are not able to resolve a dispute, and with the exception of the claims for injunctive relief by us as described above and to the extent allowed by law, you hereby agree that either you or we may require any dispute, claim, or cause of action (“Claim”) between you and us or any third parties arising out of use of the Site, the Services, and any other actions with us (whether based in contract, tort, statute, fraud, misrepresentation, or any other legal theory) to be arbitrated on an individual (non class) basis. Claims also include, except as otherwise provided herein, disputes related to the coverage, applicability, arbitrability, enforceability, formation, scope, or validity of these Terms, including this Arbitration provision, all of which shall be subject to the sole power of the arbitrator as described herein. Notwithstanding anything else herein, the enforceability of the class action waiver shall be determined by a court. In addition, both parties retain the right to seek relief in a small claims court (or a state court equivalent) for a Claim within the scope of its jurisdiction so long as the small claims action does not seek to certify a class, combine the claims of multiple persons, recover damages in excess of the limit for a small claim under applicable state law or is not transferred, removed, or appealed from small claims court to any different court. Additionally, if you are a California resident, you retain the right to obtain public injunctive relief from any court with proper jurisdiction.`,
      `THERE IS NO JUDGE OR JURY IN ARBITRATION, AND COURT REVIEW OF AN ARBITRATION AWARD IS VERY LIMITED. ADDITIONALLY, ANY ARBITRATION OF A CLAIM WILL BE ON AN INDIVIDUAL BASIS, AND, THEREFORE, YOU UNDERSTAND AND AGREE THAT YOU ARE WAIVING THE RIGHT TO PARTICIPATE AS A CLASS REPRESENTATIVE OR CLASS MEMBER IN A CLASS ACTION LAWSUIT. AS PART OF THIS WAIVER, YOU AGREE THAT YOU WAIVE THE RIGHT TO ACT AS A PRIVATE ATTORNEY GENERAL IN AN ARBITRATION; THAT EXCEPT AS OTHERWISE PROVIDED IN THIS ARBITRATION AGREEMENT, CLAIMS BROUGHT BY OR AGAINST YOU MAY NOT BE JOINED OR CONSOLIDATED WITH CLAIMS BROUGHT BY OR AGAINST ANY OTHER PERSON; AND THE ARBITRATOR SHALL HAVE NO AUTHORITY TO CONDUCT A CLASS-WIDE ARBITRATION, PRIVATE ATTORNEY GENERAL ARBITRATION OR MULTIPLE-PARTY ARBITRATION.`,
      `You and we agree that your use of the Services involves interstate commerce, and that this arbitration agreement shall be interpreted and enforced in accordance with the Federal Arbitration Act (FAA) set forth in Title 9 of the U.S. Code to the fullest extent possible, notwithstanding any state law to the contrary, regardless of the origin or nature of the Claims at issue. The arbitrator must follow, to the extent applicable, (a) the substantive law of the state in which we entered into the transaction giving rise to this arbitration agreement, (b) the applicable statutes of limitations, and (c) claims of privilege recognized at law. The arbitrator will not be bound by federal, state or local rules of procedure and evidence or by state or local laws concerning arbitration proceedings.`,
      `If either you or we elect to arbitrate a Claim, the dispute shall be resolved by binding arbitration administered under the applicable rules of the American Arbitration Association (AAA). Either you or we may elect to resolve a particular Claim through arbitration, even if the other party has already initiated litigation in court related to the Claim, by (i) making written demand for arbitration upon the other party, (ii) initiating arbitration against the other party, or (iii) filing a motion to compel arbitration in court.`,
      `If this is a consumer purpose transaction, the applicable rules will be the AAA’s Consumer Arbitration Rules. The applicable AAA rules and other information about arbitrating a claim under AAA, including how to submit a dispute to arbitration, may be obtained by visiting its website at https://www.adr.org/ or by calling 1-800-778-7879. If AAA will not serve as the administrator of the arbitration, and you and we cannot then agree upon a substitute arbitrator, you and we shall request that a court with proper jurisdiction appoint an arbitrator. However, we will abide by the applicable AAA rules regardless of the forum. Arbitration shall be conducted in the county and state where you accepted these Terms, you reside, or another reasonably convenient place to you as determined by the arbitrator, unless applicable laws require another location. Judgment on the award rendered by the arbitrator may be entered in any court having jurisdiction thereof. Except as provided in applicable statutes, the arbitrator’s award is not subject to review by the court and it cannot be appealed. The parties will have the option to request and receive a statement of reasons for the arbitration award.`,
      `If you elect to file the arbitration, and this is a consumer purpose transaction, you will pay the filing fee to the extent required by AAA’s Consumer Arbitration Rules but not to exceed the cost of filing a lawsuit. Any amount above what it would cost you to file a lawsuit, we will pay. All other arbitration fees and expenses shall be allocated to us according to AAA rules. Except for the arbitration fees and expenses, each party shall pay its own costs and fees incurred (including attorneys’ fees), unless the arbitrator allocates them differently in accordance with applicable law. This paragraph applies only if this is a consumer purpose transaction.`,
      `**Additional Procedures for Mass Arbitration**`,
      `If twenty five (25) or more similar Claims (including yours) are asserted against us by the same or coordinated counsel or are otherwise coordinated (Mass Arbitration), you and we agree that these Additional Procedures for Mass Arbitration (in addition to the other provisions of this arbitration agreement) shall apply. You agree to this process even though resolution of your Claim may be delayed and ultimately proceed in court. The parties agree that as part of these procedures, their counsel shall meet and confer in good faith in an effort to resolve the Claims, streamline procedures, address the exchange of information, modify the number of Claims to be adjudicated, and conserve the parties’ and the AAA’s resources. If your Claim is part of a Mass Arbitration, any applicable limitations periods (including statutes of limitations) shall be tolled for your Claim from the time that your Claim is first submitted to the AAA until your Claim is selected to proceed as part of a staged process or is settled, withdrawn, otherwise resolved, or opted out of arbitration pursuant to this provision.`,
      `**Stage One:** In Stage One, if at least fifty (50) Claims are submitted as part of the Mass Arbitration, claimants’ counsel and practiceLabs will each select an equal number of Claims to be filed in arbitration and resolved individually by different arbitrators. For example, claimant and practiceLabs will each select 25 Claims (50 Claims total). The number of Claims to be selected to proceed in Stage One can be modified by agreement of counsel for the parties provided that, if there are fewer than 50 Claims, all shall proceed individually in Stage One. The remaining Claims shall not be filed or deemed filed in arbitration nor shall any arbitration fees be assessed or collected in connection with those claims. If a case is withdrawn before the issuance of an arbitration award, another Claim shall be selected to proceed as part of the first stage. After this initial set of proceedings, the parties must engage in a single mediation of all remaining Claims, and we will pay the mediation fee.`,
      `**Stage Two:** If the parties cannot agree how to resolve the remaining Claims (if any) after mediation, claimants’ counsel and practiceLabs will each select an equal number of Claims per side, not to exceed 50 Claims total, to be filed and to proceed as cases in individual arbitrations as part of Stage Two. The number of Claims to be selected to proceed as part of Stage Two can be modified by agreement of counsel for the parties provided that if there are fewer than 50 Claims remaining, all shall proceed individually in Stage Two. The remaining Claims shall not be filed or deemed filed in arbitration nor shall any arbitration fees be assessed or collected in connection with those claims. If a case is withdrawn before the issuance of an arbitration award, another Claim shall be selected to proceed as part of the second stage. After Stage Two is completed, the parties must engage in a single mediation of all remaining Claims, and we will pay the mediation fee.`,
      `Upon the completion of the mediation in Stage Two, each remaining Claim (if any) that is not settled or not withdrawn shall be opted out of arbitration and may proceed in a court of competent jurisdiction consistent with the remainder of these Terms. Notwithstanding the foregoing, counsel for the parties may mutually agree in writing to proceed with the adjudication of some or all of the remaining Claims in individual arbitrations consistent with the process set forth in Stage Two (except Claims shall be randomly selected and mediation shall be elective by agreement of counsel) or through another mutually agreeable process. A court of competent jurisdiction shall have the authority to enforce the Procedures for Mass Arbitration, including the power to enjoin the filing or prosecution of arbitrations and the assessment or collection of arbitration fees. The Procedures for Mass Arbitration and each of its requirements are essential parts of this arbitration agreement. If, after exhaustion of all appeals, a court of competent jurisdiction decides that the Procedures for Mass Arbitration apply to your Claim and are not enforceable, then your Claim shall not proceed in arbitration and shall only proceed in a court of competent jurisdiction consistent with the remainder of these Terms.`,
      `Notwithstanding anything to the contrary in these Terms, and except as otherwise set forth in this paragraph, the agreement to arbitration may be amended by us only upon advance notice to you. If we make any amendment to this agreement to arbitration (other than renumbering the agreement to align with any other amendment to the Terms) in the future, that amendment shall not apply to any claim that was filed in a legal proceeding or action against us prior to the effective date of the amendment. The amendment shall apply to all other Claims governed by this agreement to arbitration that have arisen or may arise between you and us. However, we may amend this agreement to arbitration and not provide you notice, in that case, the amendments will not apply to you and the agreement to arbitration contained in these Terms to which you agreed will continue to apply to you and us as if no amendments were made.`,
      `If any part of this arbitration provision is invalid, all other parts of it remain valid. However, if the class action limitation is invalid, then this arbitration provision is invalid in its entirety, provided that the remaining Terms shall remain in full force and effect. This arbitration provision will survive the termination of your use of the Site, the Services, and any other actions with us.`,
      `You may reject this arbitration provision within thirty (30) days of accepting the Terms by emailing us at contact@practicelabs.com and including in the subject line “Rejection of Arbitration Provision.”`,
    ],
  },
  {
    n: 21,
    title: 'Other Terms',
    blocks: [
      `**Merger.** These Terms (which hereby incorporate by reference any other provisions applicable to use of the Site) constitutes the entire agreement between you and us and it supersedes all prior or contemporaneous communications, promises and proposals, whether oral, written or electronic, between you and us with respect to the Sites and information, software, products and services associated with it.`,
      `**Severability.** If any term or provision in these Terms is found to be void, against public policy, or unenforceable by a court of competent jurisdiction and such finding or order becomes final with all appeals exhausted, then the offending provision shall be deemed modified to the extent necessary to make it valid and enforceable. If the offending provision cannot be so modified, then the same shall be deemed stricken from these Terms in its entirety and the remainder of these Terms shall survive with the said offending provision eliminated.`,
      `**Governing Law and Venue.** These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, excluding its conflicts of law rules, and the United States of America. Except as set forth in the agreement to arbitration and without waiving it, you agree that any dispute arising from or relating to the subject matter of these Terms (including but not limited to if you opt out of the agreement to arbitration) shall be governed by the exclusive jurisdiction and venue of the state and federal courts of Delaware, except where the jurisdiction and venue are mandated by applicable assignment.`,
      `**Assignment.** You may not assign, delegate or transfer these Terms or your rights or obligations hereunder, in any way (by operation of law or otherwise) without our prior written consent. We may freely assign our obligations and rights under these Terms.`,
      `**No Waiver.** No failure, omission or delay on the part of us in exercising any right under these Terms will preclude any other further exercise of that right or other right under these Terms.`,
      `**Survival.** All provisions of these Terms shall survive termination of your practiceLabs Inc. account except for your license to access and use the Services and EM Tools.`,
      `**Headings.** Provision and section headings are for convenience of reference only and shall not affect the interpretation of these Terms.`,
      `**Typographical Errors.** Information on the Site may contain technical inaccuracies or typographical errors. We attempt to make the Site’s postings as accurate as possible, but we do not warrant the content of the Site is accurate, complete, reliable, current, or error free.`,
    ],
  },
  {
    n: 22,
    title: 'Questions',
    blocks: [
      `If you have any questions or comments about these Terms or this Site, please contact us by email at contact@practicelabs.com.`,
    ],
  },
];
