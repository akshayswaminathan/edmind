// Diagnosis feature library for the MDM writer.
//
// For each diagnosis we describe the clinical features that make it more or
// less likely, grouped the way an EM clinician reasons: History, Symptoms,
// Exam, Labs, Imaging. Each feature carries a direction:
//   dir: 'for'     -> presence SUPPORTS this diagnosis (absence argues against)
//   dir: 'against' -> presence ARGUES AGAINST this diagnosis (absence supports)
//
// The MDM generator turns the clinician's present/absent selections into prose.
// No patient data lives here — this is a static reference library only.

// Feature group order (also drives the UI layout).
export const GROUP_ORDER = ['History', 'Symptoms', 'Exam', 'Labs', 'Imaging'];

// Compact helper: F('label') or F('label', 'against')
const F = (label, dir = 'for') => ({ label, dir });

// ── Curated feature sets, keyed by a canonical diagnosis name ──────────────
// `aliases` power fuzzy matching against the differential database and free
// text (e.g. "Acute coronary syndromes (ACS)" -> matches on "acs").
const LIBRARY = [
  {
    name: 'Acute coronary syndrome',
    aliases: ['acs', 'acute coronary syndromes', 'myocardial infarction', 'mi', 'stemi', 'nstemi', 'unstable angina', 'acute myocardial infarction', 'heart attack'],
    groups: {
      History: [F('Cardiac risk factors (HTN, DM, smoking, hyperlipidemia)'), F('Known CAD / prior MI or stent'), F('Family history of early CAD'), F('Cocaine use')],
      Symptoms: [F('Exertional chest pressure'), F('Radiation to jaw or left arm'), F('Associated diaphoresis'), F('Associated nausea'), F('Dyspnea'), F('Reproducible / positional pain', 'against'), F('Sharp, pleuritic pain', 'against')],
      Exam: [F('Diaphoretic / ill-appearing'), F('New murmur or S3'), F('Signs of heart failure')],
      Labs: [F('Elevated troponin'), F('Down-trending / undetectable troponin', 'against')],
      Imaging: [F('Ischemic ECG changes (ST/T-wave)'), F('New LBBB'), F('Completely normal ECG', 'against')],
    },
  },
  {
    name: 'Aortic dissection',
    aliases: ['aortic dissection', 'thoracic aortic dissection', 'dissection', 'aortic aneurysm dissection'],
    groups: {
      History: [F('Uncontrolled hypertension'), F('Connective tissue disease (Marfan)'), F('Known aortic aneurysm'), F('Cocaine use')],
      Symptoms: [F('Sudden tearing / ripping pain'), F('Pain radiating to the back'), F('Maximal at onset'), F('Migratory pain'), F('Neuro deficit / syncope')],
      Exam: [F('Blood pressure differential between arms'), F('Pulse deficit'), F('New aortic regurgitation murmur'), F('Focal neuro deficit')],
      Labs: [F('Elevated D-dimer'), F('Negative D-dimer', 'against')],
      Imaging: [F('Widened mediastinum on CXR'), F('Intimal flap on CTA'), F('Normal CTA aorta', 'against')],
    },
  },
  {
    name: 'Pulmonary embolism',
    aliases: ['pulmonary embolism', 'pe', 'pulmonary emboli', 'saddle embolism'],
    groups: {
      History: [F('Recent immobilization / surgery / travel'), F('Active malignancy'), F('Prior VTE'), F('Estrogen / OCP use'), F('Pregnancy or postpartum')],
      Symptoms: [F('Pleuritic chest pain'), F('Acute dyspnea'), F('Unilateral leg swelling'), F('Hemoptysis'), F('Presyncope / syncope')],
      Exam: [F('Tachycardia'), F('Hypoxia'), F('Signs of DVT'), F('Clear lungs with dyspnea')],
      Labs: [F('Elevated D-dimer'), F('Negative D-dimer', 'against'), F('Hypoxia on ABG')],
      Imaging: [F('Filling defect on CTA chest'), F('Right heart strain on echo'), F('S1Q3T3 / RV strain on ECG'), F('Negative CTA chest', 'against')],
    },
  },
  {
    name: 'Pneumothorax',
    aliases: ['pneumothorax', 'tension pneumothorax', 'spontaneous pneumothorax', 'simple pneumothorax'],
    groups: {
      History: [F('Tall thin young male'), F('COPD / bullous lung disease'), F('Recent chest trauma or procedure'), F('Prior pneumothorax')],
      Symptoms: [F('Sudden pleuritic chest pain'), F('Acute dyspnea')],
      Exam: [F('Decreased breath sounds unilaterally'), F('Hyperresonance to percussion'), F('Tracheal deviation'), F('Hypotension (tension)')],
      Labs: [F('Hypoxia')],
      Imaging: [F('Pleural line / absent lung markings on CXR'), F('Lung point / absent lung sliding on US'), F('Normal lung US bilaterally', 'against')],
    },
  },
  {
    name: 'Cardiac tamponade',
    aliases: ['cardiac tamponade', 'tamponade', 'pericardial tamponade', 'pericardial effusion'],
    groups: {
      History: [F('Malignancy'), F('Recent MI / cardiac procedure'), F('Uremia / renal failure'), F('Recent viral illness')],
      Symptoms: [F('Dyspnea'), F('Chest pressure'), F('Presyncope')],
      Exam: [F('Hypotension'), F('Muffled heart sounds'), F('Jugular venous distension'), F('Pulsus paradoxus')],
      Labs: [],
      Imaging: [F('Effusion with diastolic collapse on echo'), F('Low voltage / electrical alternans on ECG'), F('Enlarged cardiac silhouette on CXR'), F('No effusion on echo', 'against')],
    },
  },
  {
    name: 'Pericarditis',
    aliases: ['pericarditis', 'acute pericarditis', 'myopericarditis'],
    groups: {
      History: [F('Recent viral illness'), F('Autoimmune disease'), F('Recent MI (Dressler)')],
      Symptoms: [F('Sharp pleuritic chest pain'), F('Pain worse supine, better leaning forward'), F('Exertional pain', 'against')],
      Exam: [F('Pericardial friction rub')],
      Labs: [F('Elevated inflammatory markers'), F('Mildly elevated troponin')],
      Imaging: [F('Diffuse ST elevation with PR depression'), F('Pericardial effusion on echo')],
    },
  },
  {
    name: 'Esophageal perforation',
    aliases: ['esophageal perforation', 'boerhaave', "boerhaave's syndrome", 'boerhaave syndrome', 'esophageal rupture'],
    groups: {
      History: [F('Forceful vomiting / retching'), F('Recent endoscopy or instrumentation'), F('Heavy alcohol use')],
      Symptoms: [F('Severe chest / epigastric pain after vomiting'), F('Odynophagia'), F('Dyspnea')],
      Exam: [F('Subcutaneous emphysema / Hamman crunch'), F('Ill / septic appearance')],
      Labs: [F('Leukocytosis'), F('Elevated lactate')],
      Imaging: [F('Pneumomediastinum on CXR/CT'), F('Contrast extravasation on esophagram'), F('Pleural effusion')],
    },
  },
  {
    name: 'GERD',
    aliases: ['gerd', 'gastroesophageal reflux disease', 'reflux', 'esophageal spasm', 'peptic ulcer disease', 'pud', 'dyspepsia', 'gastritis'],
    groups: {
      History: [F('Known reflux / prior similar symptoms'), F('Symptoms after meals or lying down'), F('NSAID use')],
      Symptoms: [F('Burning epigastric / retrosternal pain'), F('Acid / sour taste'), F('Relief with antacids'), F('Exertional pain', 'against'), F('Diaphoresis', 'against')],
      Exam: [F('Epigastric tenderness'), F('Benign exam')],
      Labs: [F('Negative troponin')],
      Imaging: [F('Normal ECG')],
    },
  },
  {
    name: 'Costochondritis',
    aliases: ['costochondritis', 'musculoskeletal chest pain', 'musculoskeletal pain', 'chest wall pain'],
    groups: {
      History: [F('Recent strenuous activity / cough'), F('Recent chest wall trauma')],
      Symptoms: [F('Well-localized sharp pain'), F('Pain worse with movement / breathing'), F('Exertional pain', 'against')],
      Exam: [F('Reproducible chest wall tenderness'), F('Benign cardiopulmonary exam')],
      Labs: [F('Negative troponin')],
      Imaging: [F('Normal ECG'), F('Normal CXR')],
    },
  },
  {
    name: 'Pneumonia',
    aliases: ['pneumonia', 'community acquired pneumonia', 'cap', 'lower respiratory tract infection', 'lrti'],
    groups: {
      History: [F('Fevers / chills'), F('Productive cough'), F('Immunocompromise'), F('Recent viral illness')],
      Symptoms: [F('Pleuritic chest pain'), F('Dyspnea'), F('Purulent sputum')],
      Exam: [F('Fever'), F('Focal crackles / bronchial breath sounds'), F('Hypoxia'), F('Tachypnea')],
      Labs: [F('Leukocytosis'), F('Elevated procalcitonin / CRP')],
      Imaging: [F('Focal consolidation on CXR'), F('Clear CXR', 'against')],
    },
  },
  {
    name: 'Acute heart failure',
    aliases: ['acute heart failure', 'chf', 'congestive heart failure', 'pulmonary edema', 'heart failure exacerbation', 'decompensated heart failure', 'flash pulmonary edema'],
    groups: {
      History: [F('Known heart failure / low EF'), F('Medication or dietary noncompliance'), F('Orthopnea / PND'), F('Progressive edema')],
      Symptoms: [F('Exertional dyspnea'), F('Orthopnea')],
      Exam: [F('Bibasilar crackles'), F('Jugular venous distension'), F('Peripheral edema'), F('S3 gallop')],
      Labs: [F('Elevated BNP / NT-proBNP'), F('Low BNP', 'against')],
      Imaging: [F('Pulmonary edema / vascular congestion on CXR'), F('B-lines on lung US'), F('Reduced EF on echo')],
    },
  },
  {
    name: 'COPD exacerbation',
    aliases: ['copd exacerbation', 'copd', 'chronic obstructive pulmonary disease', 'aecopd', 'emphysema exacerbation'],
    groups: {
      History: [F('Known COPD / smoking history'), F('Recent URI'), F('Increased sputum production'), F('Medication noncompliance')],
      Symptoms: [F('Worsening dyspnea'), F('Increased cough / sputum'), F('Wheezing')],
      Exam: [F('Diffuse wheezing'), F('Prolonged expiratory phase'), F('Accessory muscle use'), F('Hypoxia')],
      Labs: [F('Hypercarbia on ABG/VBG')],
      Imaging: [F('Hyperinflation without infiltrate on CXR'), F('New infiltrate on CXR', 'against')],
    },
  },
  {
    name: 'Asthma exacerbation',
    aliases: ['asthma exacerbation', 'asthma', 'reactive airway disease', 'bronchospasm'],
    groups: {
      History: [F('Known asthma'), F('Trigger exposure (allergen, cold, URI)'), F('Prior intubation / ICU for asthma'), F('Overuse of rescue inhaler')],
      Symptoms: [F('Wheezing'), F('Chest tightness'), F('Dyspnea'), F('Cough')],
      Exam: [F('Diffuse wheezing'), F('Prolonged expiration'), F('Accessory muscle use'), F('Silent chest (severe)')],
      Labs: [F('Normocarbia/hypercarbia despite tachypnea (fatigue)')],
      Imaging: [F('Clear CXR / hyperinflation')],
    },
  },
  {
    name: 'Anaphylaxis',
    aliases: ['anaphylaxis', 'anaphylactic reaction', 'anaphylactic shock', 'severe allergic reaction'],
    groups: {
      History: [F('Known allergen exposure'), F('Prior anaphylaxis'), F('New medication / food / sting')],
      Symptoms: [F('Rapid onset after exposure'), F('Throat tightness'), F('Dyspnea / wheeze'), F('Urticaria / pruritus'), F('GI symptoms (vomiting, cramping)')],
      Exam: [F('Diffuse urticaria / angioedema'), F('Wheeze / stridor'), F('Hypotension'), F('Isolated rash without systemic signs', 'against')],
      Labs: [F('Elevated tryptase')],
      Imaging: [],
    },
  },

  // ── Abdominal ────────────────────────────────────────────────────────────
  {
    name: 'Appendicitis',
    aliases: ['appendicitis', 'acute appendicitis'],
    groups: {
      History: [F('Periumbilical pain migrating to RLQ'), F('Anorexia'), F('Progressive over 12–24h')],
      Symptoms: [F('RLQ pain'), F('Nausea / vomiting'), F('Fever')],
      Exam: [F('RLQ / McBurney tenderness'), F('Rebound / guarding'), F('Rovsing / psoas sign'), F('Fever')],
      Labs: [F('Leukocytosis with left shift'), F('Elevated CRP'), F('Negative urine hCG')],
      Imaging: [F('Dilated non-compressible appendix on CT/US'), F('Periappendiceal fat stranding'), F('Normal appendix on CT', 'against')],
    },
  },
  {
    name: 'Cholecystitis',
    aliases: ['cholecystitis', 'acute cholecystitis', 'biliary colic', 'gallstones', 'cholelithiasis'],
    groups: {
      History: [F('Female, fat, forty, fertile'), F('Prior gallstones'), F('Postprandial / fatty-food pain')],
      Symptoms: [F('RUQ pain'), F('Radiation to right shoulder / scapula'), F('Nausea / vomiting'), F('Fever')],
      Exam: [F('RUQ tenderness'), F('Positive Murphy sign'), F('Fever')],
      Labs: [F('Leukocytosis'), F('Elevated LFTs / alk phos'), F('Normal lipase')],
      Imaging: [F('Gallstones with wall thickening / pericholecystic fluid on US'), F('Sonographic Murphy sign'), F('Normal gallbladder US', 'against')],
    },
  },
  {
    name: 'Pancreatitis',
    aliases: ['pancreatitis', 'acute pancreatitis'],
    groups: {
      History: [F('Heavy alcohol use'), F('Known gallstones'), F('Hypertriglyceridemia'), F('Recent ERCP')],
      Symptoms: [F('Epigastric pain radiating to back'), F('Pain improved leaning forward'), F('Nausea / vomiting')],
      Exam: [F('Epigastric tenderness'), F('Abdominal distension')],
      Labs: [F('Lipase > 3x upper limit'), F('Normal lipase', 'against')],
      Imaging: [F('Peripancreatic stranding / edema on CT'), F('Gallstones on US')],
    },
  },
  {
    name: 'Bowel obstruction',
    aliases: ['bowel obstruction', 'small bowel obstruction', 'sbo', 'large bowel obstruction', 'intestinal obstruction', 'ileus'],
    groups: {
      History: [F('Prior abdominal surgery / adhesions'), F('Known hernia'), F('Obstipation (no flatus/stool)')],
      Symptoms: [F('Crampy abdominal pain'), F('Bilious / feculent vomiting'), F('Abdominal distension')],
      Exam: [F('Distended tympanitic abdomen'), F('High-pitched / absent bowel sounds'), F('Incarcerated hernia')],
      Labs: [F('Elevated lactate (ischemia)'), F('Electrolyte derangement')],
      Imaging: [F('Dilated loops with air-fluid levels on CT/XR'), F('Transition point on CT'), F('Normal bowel gas pattern', 'against')],
    },
  },
  {
    name: 'Mesenteric ischemia',
    aliases: ['mesenteric ischemia', 'acute mesenteric ischemia', 'bowel ischemia', 'ischemic bowel'],
    groups: {
      History: [F('Atrial fibrillation / embolic source'), F('Vascular disease / prior emboli'), F('"Pain out of proportion" to exam')],
      Symptoms: [F('Severe diffuse abdominal pain'), F('Vomiting / diarrhea'), F('Bloody stool (late)')],
      Exam: [F('Pain out of proportion to benign exam'), F('Peritonitis (late)')],
      Labs: [F('Elevated lactate'), F('Metabolic acidosis'), F('Leukocytosis'), F('Normal lactate', 'against')],
      Imaging: [F('Vascular occlusion / bowel wall changes on CTA'), F('Pneumatosis (late)')],
    },
  },
  {
    name: 'Abdominal aortic aneurysm',
    aliases: ['abdominal aortic aneurysm', 'aaa', 'ruptured aaa', 'ruptured abdominal aortic aneurysm', 'aortic aneurysm'],
    groups: {
      History: [F('Age > 60, male, smoker'), F('Known AAA'), F('Hypertension')],
      Symptoms: [F('Sudden abdominal / flank / back pain'), F('Syncope'), F('Radiation to groin')],
      Exam: [F('Pulsatile abdominal mass'), F('Hypotension'), F('Unequal femoral pulses')],
      Labs: [F('Anemia / dropping hemoglobin')],
      Imaging: [F('Aortic diameter > 3 cm on US/CT'), F('Retroperitoneal hematoma on CT'), F('Normal-caliber aorta on US', 'against')],
    },
  },
  {
    name: 'Ectopic pregnancy',
    aliases: ['ectopic pregnancy', 'ruptured ectopic', 'tubal pregnancy'],
    groups: {
      History: [F('Reproductive age with amenorrhea'), F('Prior ectopic / tubal surgery'), F('IUD in place'), F('Assisted reproduction')],
      Symptoms: [F('Unilateral pelvic / lower abdominal pain'), F('Vaginal bleeding'), F('Shoulder pain (referred)'), F('Syncope')],
      Exam: [F('Adnexal tenderness'), F('Peritoneal signs'), F('Hemodynamic instability')],
      Labs: [F('Positive urine/serum hCG'), F('hCG above discriminatory zone'), F('Negative hCG', 'against')],
      Imaging: [F('No intrauterine pregnancy with positive hCG on US'), F('Adnexal mass / free fluid on US'), F('Confirmed IUP on US', 'against')],
    },
  },
  {
    name: 'Nephrolithiasis',
    aliases: ['nephrolithiasis', 'renal colic', 'kidney stone', 'ureterolithiasis', 'urolithiasis'],
    groups: {
      History: [F('Prior kidney stones'), F('Dehydration'), F('Sudden onset colicky pain')],
      Symptoms: [F('Flank pain radiating to groin'), F('Unable to find comfortable position'), F('Hematuria'), F('Nausea / vomiting')],
      Exam: [F('CVA tenderness'), F('Soft non-peritoneal abdomen')],
      Labs: [F('Hematuria on UA'), F('Negative urine hCG')],
      Imaging: [F('Ureteral stone with hydronephrosis on CT'), F('Hydronephrosis on US'), F('No stone on CT', 'against')],
    },
  },
  {
    name: 'Diverticulitis',
    aliases: ['diverticulitis', 'acute diverticulitis', 'sigmoid diverticulitis'],
    groups: {
      History: [F('Age > 50'), F('Known diverticulosis'), F('Prior episodes')],
      Symptoms: [F('LLQ pain'), F('Change in bowel habits'), F('Fever')],
      Exam: [F('LLQ tenderness'), F('Localized peritonitis'), F('Fever')],
      Labs: [F('Leukocytosis'), F('Elevated CRP')],
      Imaging: [F('Sigmoid wall thickening / fat stranding on CT'), F('Abscess / perforation on CT')],
    },
  },
  {
    name: 'Perforated viscus',
    aliases: ['perforated viscus', 'perforated peptic ulcer', 'perforation', 'perforated bowel', 'hollow viscus perforation'],
    groups: {
      History: [F('NSAID / steroid use'), F('Known peptic ulcer disease'), F('Sudden severe pain')],
      Symptoms: [F('Sudden severe diffuse abdominal pain'), F('Pain worse with movement')],
      Exam: [F('Rigid / board-like abdomen'), F('Diffuse rebound and guarding'), F('Septic appearance')],
      Labs: [F('Leukocytosis'), F('Elevated lactate')],
      Imaging: [F('Free air under diaphragm on upright CXR/CT'), F('No free air on CT', 'against')],
    },
  },
  {
    name: 'Gastrointestinal bleed',
    aliases: ['gastrointestinal bleed', 'gi bleed', 'upper gi bleed', 'lower gi bleed', 'gib', 'hematemesis', 'melena', 'hematochezia'],
    groups: {
      History: [F('NSAID / anticoagulant use'), F('Cirrhosis / varices'), F('Prior GI bleed'), F('Heavy alcohol use')],
      Symptoms: [F('Hematemesis / coffee-ground emesis'), F('Melena'), F('Hematochezia'), F('Lightheadedness')],
      Exam: [F('Pallor / hemodynamic instability'), F('Melena or blood on rectal exam'), F('Stigmata of liver disease')],
      Labs: [F('Anemia / dropping hemoglobin'), F('Elevated BUN:Cr ratio'), F('Coagulopathy')],
      Imaging: [F('Source identified on endoscopy')],
    },
  },

  // ── Neuro ──────────────────────────────────────────────────────────────
  {
    name: 'Ischemic stroke',
    aliases: ['ischemic stroke', 'stroke', 'cva', 'cerebrovascular accident', 'acute ischemic stroke', 'tia', 'transient ischemic attack'],
    groups: {
      History: [F('Sudden focal deficit'), F('Atrial fibrillation'), F('Vascular risk factors'), F('Clear last-known-well time')],
      Symptoms: [F('Unilateral weakness / numbness'), F('Facial droop'), F('Slurred speech / aphasia'), F('Visual field deficit')],
      Exam: [F('Focal neurologic deficit'), F('Elevated NIH stroke scale'), F('Nonfocal exam', 'against')],
      Labs: [F('Normal glucose (hypoglycemia excluded)')],
      Imaging: [F('No hemorrhage on non-contrast CT'), F('Large-vessel occlusion on CTA'), F('Ischemic changes on MRI DWI')],
    },
  },
  {
    name: 'Subarachnoid hemorrhage',
    aliases: ['subarachnoid hemorrhage', 'sah', 'aneurysmal subarachnoid hemorrhage', 'ruptured aneurysm'],
    groups: {
      History: [F('Thunderclap onset (maximal at onset)'), F('Worst headache of life'), F('Family history of aneurysm / PCKD'), F('Exertion / Valsalva at onset')],
      Symptoms: [F('Sudden severe headache'), F('Neck stiffness'), F('Vomiting'), F('Transient loss of consciousness')],
      Exam: [F('Meningismus'), F('Depressed level of consciousness'), F('Focal deficit / cranial nerve palsy')],
      Labs: [F('Xanthochromia on LP'), F('RBCs not clearing on LP')],
      Imaging: [F('Subarachnoid blood on non-contrast CT'), F('Aneurysm on CTA'), F('Normal CT within 6h of onset', 'against')],
    },
  },
  {
    name: 'Meningitis',
    aliases: ['meningitis', 'bacterial meningitis', 'meningoencephalitis', 'encephalitis'],
    groups: {
      History: [F('Fever with headache'), F('Immunocompromise'), F('Sick contacts / recent infection'), F('Unvaccinated')],
      Symptoms: [F('Headache'), F('Neck stiffness'), F('Photophobia'), F('Altered mental status')],
      Exam: [F('Fever'), F('Nuchal rigidity'), F('Kernig / Brudzinski sign'), F('Petechial rash (meningococcemia)')],
      Labs: [F('CSF pleocytosis'), F('Low CSF glucose / high protein'), F('Positive CSF Gram stain'), F('Normal CSF', 'against')],
      Imaging: [F('CT without mass effect before LP')],
    },
  },
  {
    name: 'Intracranial hemorrhage',
    aliases: ['intracranial hemorrhage', 'ich', 'intracerebral hemorrhage', 'hemorrhagic stroke', 'brain bleed'],
    groups: {
      History: [F('Anticoagulant use'), F('Uncontrolled hypertension'), F('Head trauma'), F('Sudden deficit with headache')],
      Symptoms: [F('Sudden headache'), F('Focal weakness'), F('Vomiting'), F('Decreased consciousness')],
      Exam: [F('Focal neurologic deficit'), F('Depressed GCS'), F('Hypertension')],
      Labs: [F('Coagulopathy / supratherapeutic INR')],
      Imaging: [F('Hyperdense blood on non-contrast CT'), F('No hemorrhage on CT', 'against')],
    },
  },
  {
    name: 'Migraine',
    aliases: ['migraine', 'migraine headache', 'tension headache', 'primary headache'],
    groups: {
      History: [F('Prior similar headaches'), F('Known migraine history'), F('Typical aura / trigger')],
      Symptoms: [F('Unilateral throbbing pain'), F('Photophobia / phonophobia'), F('Nausea'), F('Gradual onset', 'for'), F('Thunderclap onset', 'against')],
      Exam: [F('Normal neurologic exam'), F('Focal neurologic deficit', 'against')],
      Labs: [],
      Imaging: [F('Normal neuroimaging (if obtained)')],
    },
  },
  {
    name: 'Seizure',
    aliases: ['seizure', 'epilepsy', 'status epilepticus', 'generalized seizure', 'focal seizure'],
    groups: {
      History: [F('Known seizure disorder'), F('Antiepileptic noncompliance / subtherapeutic level'), F('Alcohol withdrawal'), F('Witnessed convulsion')],
      Symptoms: [F('Loss of consciousness with convulsion'), F('Tongue biting (lateral)'), F('Incontinence'), F('Postictal confusion')],
      Exam: [F('Postictal state'), F('Todd paralysis'), F('Oral trauma')],
      Labs: [F('Metabolic derangement (Na, glucose, Ca)'), F('Subtherapeutic AED level'), F('Elevated lactate (post-ictal)')],
      Imaging: [F('Structural lesion on CT/MRI')],
    },
  },
  {
    name: 'Giant cell arteritis',
    aliases: ['giant cell arteritis', 'temporal arteritis', 'gca'],
    groups: {
      History: [F('Age > 50'), F('Polymyalgia rheumatica'), F('New headache')],
      Symptoms: [F('Temporal headache'), F('Jaw claudication'), F('Visual changes / amaurosis'), F('Scalp tenderness')],
      Exam: [F('Tender / nonpulsatile temporal artery'), F('Visual field / acuity deficit')],
      Labs: [F('Markedly elevated ESR / CRP'), F('Normal ESR and CRP', 'against')],
      Imaging: [F('Halo sign on temporal artery US'), F('Positive temporal artery biopsy')],
    },
  },

  // ── Infectious / metabolic ─────────────────────────────────────────────
  {
    name: 'Sepsis',
    aliases: ['sepsis', 'septic shock', 'severe sepsis', 'bacteremia', 'septicemia'],
    groups: {
      History: [F('Documented / suspected infection source'), F('Immunocompromise'), F('Indwelling device / recent procedure')],
      Symptoms: [F('Fevers / rigors'), F('Localizing infectious symptoms'), F('Malaise / confusion')],
      Exam: [F('Fever or hypothermia'), F('Tachycardia'), F('Hypotension'), F('Altered mental status'), F('Tachypnea')],
      Labs: [F('Elevated lactate'), F('Leukocytosis / bandemia'), F('Elevated procalcitonin'), F('End-organ dysfunction (Cr, bili, INR)')],
      Imaging: [F('Imaging source of infection identified')],
    },
  },
  {
    name: 'Urinary tract infection',
    aliases: ['urinary tract infection', 'uti', 'pyelonephritis', 'cystitis', 'acute pyelonephritis'],
    groups: {
      History: [F('Dysuria / urinary frequency'), F('Recent UTIs'), F('Indwelling catheter'), F('Immunocompromise / diabetes')],
      Symptoms: [F('Dysuria'), F('Frequency / urgency'), F('Flank pain (pyelonephritis)'), F('Fever')],
      Exam: [F('Suprapubic tenderness'), F('CVA tenderness'), F('Fever')],
      Labs: [F('Pyuria / positive leukocyte esterase'), F('Positive nitrites'), F('Bacteriuria on culture'), F('Clean urinalysis', 'against')],
      Imaging: [F('Obstruction / abscess on CT (complicated)')],
    },
  },
  {
    name: 'Diabetic ketoacidosis',
    aliases: ['diabetic ketoacidosis', 'dka', 'ketoacidosis', 'hyperglycemic crisis'],
    groups: {
      History: [F('Known / new diabetes'), F('Insulin noncompliance'), F('Precipitating infection or illness'), F('Polyuria / polydipsia')],
      Symptoms: [F('Nausea / vomiting'), F('Abdominal pain'), F('Malaise'), F('Kussmaul breathing')],
      Exam: [F('Signs of dehydration'), F('Fruity breath'), F('Tachypnea'), F('Altered mental status')],
      Labs: [F('Hyperglycemia'), F('Anion-gap metabolic acidosis'), F('Ketonemia / ketonuria'), F('Normal anion gap', 'against')],
      Imaging: [],
    },
  },
  {
    name: 'Adrenal crisis',
    aliases: ['adrenal crisis', 'acute adrenal insufficiency', 'addisonian crisis', 'adrenal insufficiency'],
    groups: {
      History: [F('Known adrenal insufficiency / steroid dependence'), F('Missed steroid doses'), F('Recent illness / stressor')],
      Symptoms: [F('Profound fatigue / weakness'), F('Nausea / vomiting'), F('Abdominal pain')],
      Exam: [F('Hypotension refractory to fluids'), F('Hyperpigmentation'), F('Altered mental status')],
      Labs: [F('Hyponatremia'), F('Hyperkalemia'), F('Hypoglycemia'), F('Low random cortisol')],
      Imaging: [],
    },
  },

  // ── Dysrhythmia / cardiac ──────────────────────────────────────────────────
  {
    name: 'Cardiac arrhythmia',
    aliases: ['cardiac arrhythmia', 'cardiac arrhythmias', 'arrhythmia', 'arrhythmia / cardiac syncope', 'dysrhythmia', 'bradyarrhythmia', 'tachyarrhythmia', 'heart block', 'sick sinus syndrome'],
    groups: {
      History: [F('Structural heart disease / prior MI'), F('Known conduction disease or pacemaker'), F('AV-nodal or QT-prolonging medications'), F('Palpitations preceding syncope'), F('Family history of sudden cardiac death')],
      Symptoms: [F('Palpitations'), F('Syncope without prodrome'), F('Exertional syncope'), F('Lightheadedness'), F('Chest pain / dyspnea')],
      Exam: [F('Irregular or extreme heart rate'), F('Hypotension / poor perfusion'), F('Cannon a-waves')],
      Labs: [F('Electrolyte derangement (K, Mg, Ca)'), F('Elevated troponin'), F('Thyroid dysfunction')],
      Imaging: [F('Arrhythmia captured on ECG / telemetry'), F('Conduction block or QT prolongation on ECG'), F('Structural abnormality on echo'), F('Persistently normal ECG and monitoring', 'against')],
    },
  },
  {
    name: 'Ventricular tachycardia',
    aliases: ['ventricular tachycardia', 'vtach', 'v-tach', 'vt', 'wide complex tachycardia'],
    groups: {
      History: [F('Known cardiomyopathy / low EF'), F('Prior MI or scar'), F('ICD in place'), F('Family history of sudden cardiac death'), F('QT-prolonging or antiarrhythmic drugs')],
      Symptoms: [F('Palpitations'), F('Syncope / near-syncope'), F('Chest pain'), F('Dyspnea')],
      Exam: [F('Regular wide-complex tachycardia'), F('Hemodynamic instability'), F('AV dissociation / cannon a-waves')],
      Labs: [F('Hyperkalemia'), F('Hypomagnesemia / hypokalemia'), F('Elevated troponin')],
      Imaging: [F('Wide-complex tachycardia on ECG'), F('AV dissociation / capture or fusion beats'), F('Reduced EF or scar on echo'), F('Narrow-complex rhythm on ECG', 'against')],
    },
  },
  {
    name: 'Brugada syndrome',
    aliases: ['brugada syndrome', 'brugada', 'brugada pattern'],
    groups: {
      History: [F('Family history of sudden cardiac death'), F('Prior unexplained syncope'), F('Syncope during sleep or fever'), F('Southeast Asian ancestry'), F('Sodium-channel-blocking drug exposure')],
      Symptoms: [F('Syncope, often nocturnal'), F('Palpitations'), F('Aborted sudden death')],
      Exam: [F('Usually normal between events'), F('Fever unmasking pattern')],
      Labs: [F('Fever'), F('Normal electrolytes')],
      Imaging: [F('Coved ST elevation in V1–V2 (type 1) on ECG'), F('Pattern provoked by fever / sodium-channel blocker'), F('Structurally normal heart on echo'), F('Completely normal ECG at baseline', 'against')],
    },
  },
  {
    name: 'Hypertrophic cardiomyopathy',
    aliases: ['hypertrophic cardiomyopathy', 'hcm', 'hocm', 'hypertrophic obstructive cardiomyopathy'],
    groups: {
      History: [F('Young patient with exertional syncope'), F('Family history of HCM or sudden death'), F('Exertional chest pain or dyspnea'), F('Prior syncope')],
      Symptoms: [F('Exertional syncope / presyncope'), F('Exertional chest pain'), F('Palpitations'), F('Dyspnea on exertion')],
      Exam: [F('Systolic murmur that increases with Valsalva'), F('Murmur decreases with squatting'), F('Brisk bifid carotid pulse')],
      Labs: [F('Elevated BNP')],
      Imaging: [F('LVH with strain on ECG'), F('Asymmetric septal hypertrophy on echo'), F('Systolic anterior motion of mitral valve'), F('Normal echo', 'against')],
    },
  },
  {
    name: 'Atrial fibrillation',
    aliases: ['atrial fibrillation', 'afib', 'a-fib', 'af', 'atrial flutter', 'rapid ventricular response', 'rvr'],
    groups: {
      History: [F('Palpitations, often intermittent'), F('Known paroxysmal AF'), F('Hyperthyroidism / alcohol binge ("holiday heart")'), F('Hypertension or valvular disease'), F('Recent surgery or acute illness')],
      Symptoms: [F('Palpitations'), F('Dyspnea'), F('Fatigue'), F('Chest discomfort')],
      Exam: [F('Irregularly irregular pulse'), F('Tachycardia'), F('Signs of heart failure')],
      Labs: [F('Abnormal thyroid function'), F('Electrolyte derangement'), F('Elevated BNP')],
      Imaging: [F('Irregularly irregular rhythm without P waves on ECG'), F('Valvular disease or low EF on echo'), F('Sinus rhythm on ECG', 'against')],
    },
  },
  {
    name: 'Supraventricular tachycardia',
    aliases: ['supraventricular tachycardia', 'svt', 'avnrt', 'avrt', 'paroxysmal svt', 'psvt'],
    groups: {
      History: [F('Sudden-onset, sudden-offset palpitations'), F('Prior similar episodes'), F('Terminated by Valsalva previously'), F('Caffeine or stimulant use')],
      Symptoms: [F('Rapid regular palpitations'), F('Lightheadedness'), F('Chest tightness'), F('Dyspnea')],
      Exam: [F('Regular narrow-complex tachycardia ~150–250'), F('Generally well-perfused')],
      Labs: [F('Normal electrolytes'), F('Normal thyroid function')],
      Imaging: [F('Narrow-complex regular tachycardia on ECG'), F('Termination with vagal maneuver / adenosine'), F('Retrograde P waves'), F('Irregular rhythm on ECG', 'against')],
    },
  },
  {
    name: 'Premature ventricular contractions',
    aliases: ['premature ventricular contractions', 'pvc', 'pvcs', 'ventricular ectopy', 'premature beats'],
    groups: {
      History: [F('Sensation of skipped or extra beats'), F('Caffeine / stimulant use'), F('Structurally normal heart (usually benign)'), F('Symptoms resolve with exertion')],
      Symptoms: [F('Skipped-beat sensation'), F('Isolated palpitations'), F('Sustained palpitations or syncope', 'against')],
      Exam: [F('Occasional irregular beat with compensatory pause'), F('Otherwise normal exam')],
      Labs: [F('Hypokalemia / hypomagnesemia'), F('Normal electrolytes', 'against')],
      Imaging: [F('Isolated wide beats with compensatory pause on ECG'), F('Frequent or multifocal PVCs / runs of VT', 'against'), F('Normal EF on echo')],
    },
  },
  {
    name: 'Hyperthyroidism / thyroid storm',
    aliases: ['hyperthyroidism', 'thyroid storm', 'hyperthyroidism/thyroid storm', 'thyrotoxicosis', 'graves disease'],
    groups: {
      History: [F('Known hyperthyroidism / Graves'), F('Antithyroid medication noncompliance'), F('Recent illness, surgery, or iodine load'), F('Heat intolerance / weight loss')],
      Symptoms: [F('Palpitations'), F('Anxiety / agitation'), F('Tremor'), F('Diarrhea'), F('Heat intolerance')],
      Exam: [F('Tachycardia / atrial fibrillation'), F('Fever (storm)'), F('Goiter'), F('Lid lag / exophthalmos'), F('Warm moist skin / tremor'), F('Altered mental status (storm)')],
      Labs: [F('Suppressed TSH with elevated free T4/T3'), F('Normal TSH', 'against')],
      Imaging: [F('Sinus tachycardia or atrial fibrillation on ECG')],
    },
  },

  // ── Shock (undifferentiated) ───────────────────────────────────────────────
  {
    name: 'Hypovolemic shock',
    aliases: ['hypovolemic shock', 'hemorrhagic shock', 'hypovolemia'],
    groups: {
      History: [F('Ongoing blood loss (GI bleed, trauma)'), F('Vomiting / diarrhea / poor intake'), F('Anticoagulant use')],
      Symptoms: [F('Lightheadedness'), F('Thirst'), F('Decreased urine output')],
      Exam: [F('Hypotension with tachycardia'), F('Cool, clammy, mottled skin'), F('Flat neck veins'), F('Delayed capillary refill')],
      Labs: [F('Elevated lactate'), F('Dropping hemoglobin'), F('Elevated BUN:Cr'), F('Metabolic acidosis')],
      Imaging: [F('Collapsible IVC on POCUS'), F('Free fluid / source on FAST or CT'), F('Distended IVC on POCUS', 'against')],
    },
  },
  {
    name: 'Cardiogenic shock',
    aliases: ['cardiogenic shock'],
    groups: {
      History: [F('Recent or ongoing MI'), F('Known low EF / heart failure'), F('New dysrhythmia'), F('Progressive dyspnea and edema')],
      Symptoms: [F('Dyspnea'), F('Chest pain'), F('Fatigue / confusion')],
      Exam: [F('Hypotension with cool extremities'), F('Elevated JVP'), F('Pulmonary crackles'), F('S3 gallop')],
      Labs: [F('Elevated lactate'), F('Elevated troponin'), F('Elevated BNP'), F('Rising creatinine / LFTs')],
      Imaging: [F('Pulmonary edema on CXR'), F('Reduced EF on echo'), F('Distended non-collapsing IVC'), F('Ischemic changes on ECG'), F('Normal EF on echo', 'against')],
    },
  },
  {
    name: 'Obstructive shock',
    aliases: ['obstructive shock'],
    groups: {
      History: [F('Risk for PE (immobility, malignancy)'), F('Chest trauma or recent procedure'), F('Pericardial disease / malignancy')],
      Symptoms: [F('Acute dyspnea'), F('Chest pain'), F('Presyncope')],
      Exam: [F('Hypotension with distended neck veins'), F('Unilateral decreased breath sounds (pneumothorax)'), F('Muffled heart sounds / pulsus paradoxus (tamponade)'), F('Tracheal deviation (tension)')],
      Labs: [F('Elevated lactate')],
      Imaging: [F('RV strain or large PE on CTA / echo'), F('Pericardial effusion with tamponade physiology on echo'), F('Pneumothorax on CXR / US'), F('Normal echo and lungs', 'against')],
    },
  },
  {
    name: 'Distributive / neurogenic shock',
    aliases: ['neurogenic shock', 'distributive shock', 'spinal shock'],
    groups: {
      History: [F('Acute spinal cord injury'), F('High cervical / thoracic trauma'), F('Recent spinal anesthesia')],
      Symptoms: [F('Weakness / sensory level'), F('Lightheadedness')],
      Exam: [F('Hypotension with paradoxical bradycardia'), F('Warm, well-perfused extremities'), F('Sensory / motor level deficit'), F('Priapism')],
      Labs: [F('Lactate often normal early')],
      Imaging: [F('Cord injury on CT / MRI spine'), F('Preserved cardiac function and volume on echo')],
    },
  },

  // ── Neuro ──────────────────────────────────────────────────────────────────
  {
    name: 'Cerebral venous sinus thrombosis',
    aliases: ['cerebral venous thrombosis', 'cerebral venous sinus thrombosis', 'cvst', 'venous sinus thrombosis', 'dural sinus thrombosis'],
    groups: {
      History: [F('Hypercoagulable state / thrombophilia'), F('Pregnancy or postpartum'), F('Estrogen / OCP use'), F('Dehydration or recent infection'), F('Progressive headache over days')],
      Symptoms: [F('Gradual severe headache'), F('Seizure'), F('Focal neurologic deficit'), F('Visual changes'), F('Nausea / vomiting')],
      Exam: [F('Papilledema'), F('Focal deficit crossing arterial territories'), F('Depressed consciousness')],
      Labs: [F('Elevated D-dimer'), F('Thrombophilia on workup')],
      Imaging: [F('Filling defect / empty delta sign on CT/MR venography'), F('Venous infarct with hemorrhage'), F('Normal CT venogram', 'against')],
    },
  },
  {
    name: 'CNS infection / brain abscess',
    aliases: ['cns infection (e.g., brain abscess)', 'cns infection', 'brain abscess', 'cerebral abscess', 'intracranial abscess'],
    groups: {
      History: [F('Recent sinusitis, otitis, or dental infection'), F('Endocarditis / bacteremia'), F('Immunocompromise'), F('Prior neurosurgery / penetrating trauma'), F('Subacute progressive headache')],
      Symptoms: [F('Headache'), F('Fever'), F('Focal deficit'), F('Seizure'), F('Altered mental status')],
      Exam: [F('Fever'), F('Focal neurologic deficit'), F('Papilledema'), F('Meningismus')],
      Labs: [F('Leukocytosis'), F('Elevated inflammatory markers'), F('Positive blood cultures')],
      Imaging: [F('Ring-enhancing lesion with edema on CT/MRI'), F('Restricted diffusion on MRI'), F('Normal contrast MRI brain', 'against')],
    },
  },
  {
    name: 'Guillain-Barré syndrome',
    aliases: ['guillain-barré syndrome', 'guillain-barre syndrome', 'gbs', 'guillain barre', 'acute inflammatory demyelinating polyneuropathy'],
    groups: {
      History: [F('Antecedent GI or respiratory infection (1–3 wks)'), F('Recent Campylobacter illness'), F('Ascending symptoms over days')],
      Symptoms: [F('Ascending symmetric weakness'), F('Paresthesias in hands/feet'), F('Back / limb pain'), F('Difficulty walking'), F('Dyspnea (respiratory involvement)')],
      Exam: [F('Symmetric flaccid weakness'), F('Areflexia / hyporeflexia'), F('Facial or bulbar weakness'), F('Autonomic instability'), F('Declining vital capacity / NIF')],
      Labs: [F('Albuminocytologic dissociation on LP (high protein, normal cells)'), F('Normal CSF protein early', 'against')],
      Imaging: [F('Nerve root enhancement on MRI'), F('Normal CT head')],
    },
  },
  {
    name: 'Myasthenia gravis',
    aliases: ['myasthenia gravis', 'myasthenic crisis', 'mg'],
    groups: {
      History: [F('Known myasthenia gravis'), F('Fatigable weakness worse at end of day'), F('Recent infection / medication change (crisis trigger)'), F('Thymoma')],
      Symptoms: [F('Fluctuating diplopia / ptosis'), F('Dysphagia / dysarthria'), F('Proximal limb weakness'), F('Dyspnea (crisis)')],
      Exam: [F('Fatigable ptosis / ophthalmoplegia'), F('Weakness improving with rest'), F('Preserved reflexes and sensation'), F('Declining vital capacity / NIF (crisis)')],
      Labs: [F('Positive acetylcholine-receptor antibodies'), F('Normal CK')],
      Imaging: [F('Thymoma on chest CT'), F('Normal brain imaging')],
    },
  },
  {
    name: 'Botulism',
    aliases: ['botulism', 'clostridium botulinum', 'infant botulism', 'wound botulism'],
    groups: {
      History: [F('Home-canned or improperly preserved food'), F('Injection drug use (wound botulism)'), F('Infant with honey exposure / constipation'), F('Descending symptom progression')],
      Symptoms: [F('Diplopia / blurred vision'), F('Dysphagia / dysarthria'), F('Dry mouth'), F('Descending symmetric weakness'), F('Dyspnea')],
      Exam: [F('Bilateral cranial nerve palsies'), F('Descending flaccid paralysis'), F('Dilated / fixed pupils'), F('Normal mentation and sensation'), F('Absence of fever')],
      Labs: [F('Toxin detected in serum/stool'), F('Normal routine labs')],
      Imaging: [F('Normal brain imaging')],
    },
  },
  {
    name: 'Cauda equina syndrome',
    aliases: ['cauda equina syndrome', 'cauda equina'],
    groups: {
      History: [F('Recent severe low back pain'), F('Known malignancy or epidural pathology'), F('Bilateral sciatica'), F('New bladder/bowel dysfunction')],
      Symptoms: [F('Urinary retention or incontinence'), F('Fecal incontinence'), F('Saddle anesthesia'), F('Bilateral leg weakness / numbness'), F('Sexual dysfunction')],
      Exam: [F('Decreased perineal / saddle sensation'), F('Decreased rectal tone'), F('Elevated post-void residual'), F('Bilateral lower-extremity weakness'), F('Normal perineal sensation and PVR', 'against')],
      Labs: [],
      Imaging: [F('Compression of the cauda equina on MRI'), F('Normal lumbar MRI', 'against')],
    },
  },
  {
    name: 'Spinal cord compression',
    aliases: ['spinal cord compression', 'malignant spinal cord compression', 'cord compression', 'myelopathy'],
    groups: {
      History: [F('Known malignancy (esp. breast, lung, prostate)'), F('Progressive back pain worse at night'), F('Recent trauma'), F('Anticoagulation (epidural hematoma)')],
      Symptoms: [F('Bilateral leg weakness'), F('Sensory level on the trunk'), F('Bladder / bowel dysfunction'), F('Band-like radicular pain')],
      Exam: [F('Upper-motor-neuron signs below the level'), F('Sensory level'), F('Hyperreflexia / upgoing toes'), F('Point tenderness over spine')],
      Labs: [F('Hypercalcemia (malignancy)')],
      Imaging: [F('Cord compression on MRI'), F('Vertebral metastasis / pathologic fracture'), F('Normal spine MRI', 'against')],
    },
  },
  {
    name: 'Carbon monoxide poisoning',
    aliases: ['carbon monoxide poisoning', 'co poisoning', 'carbon monoxide', 'co toxicity'],
    groups: {
      History: [F('Faulty furnace / heater / generator use'), F('Multiple household members affected'), F('Symptoms improve away from home'), F('Fire / smoke exposure')],
      Symptoms: [F('Headache'), F('Dizziness / confusion'), F('Nausea'), F('Syncope'), F('Chest pain')],
      Exam: [F('Altered mental status'), F('Tachycardia'), F('Normal pulse-oximetry despite symptoms'), F('Cherry-red skin (late/uncommon)')],
      Labs: [F('Elevated carboxyhemoglobin on co-oximetry'), F('Metabolic acidosis / elevated lactate'), F('Normal carboxyhemoglobin', 'against')],
      Imaging: [F('Ischemic changes on ECG')],
    },
  },
  {
    name: 'Hypoglycemia',
    aliases: ['hypoglycemia', 'low blood sugar', 'insulin reaction'],
    groups: {
      History: [F('Insulin or sulfonylurea use'), F('Missed meal / decreased intake'), F('Alcohol use'), F('Renal failure (drug accumulation)')],
      Symptoms: [F('Diaphoresis / tremor'), F('Confusion / behavioral change'), F('Palpitations'), F('Seizure'), F('Symptoms resolve with glucose')],
      Exam: [F('Altered mental status'), F('Diaphoresis'), F('Focal deficit mimicking stroke'), F('Rapid improvement after dextrose')],
      Labs: [F('Documented low point-of-care glucose'), F('Normal glucose', 'against')],
      Imaging: [],
    },
  },
  {
    name: 'Hyperglycemia',
    aliases: ['hyperglycemia', 'hyperglycemic hyperosmolar state', 'hhs'],
    groups: {
      History: [F('Known / new diabetes'), F('Medication noncompliance'), F('Precipitating infection or illness'), F('Polyuria / polydipsia')],
      Symptoms: [F('Polyuria / polydipsia'), F('Blurred vision'), F('Fatigue / weakness'), F('Confusion')],
      Exam: [F('Signs of dehydration'), F('Altered mental status'), F('Tachycardia')],
      Labs: [F('Markedly elevated glucose'), F('Elevated serum osmolality (HHS)'), F('Minimal ketones / normal anion gap (HHS)'), F('Anion-gap acidosis with ketones (favors DKA)', 'against')],
      Imaging: [],
    },
  },

  // ── Metabolic / electrolyte ────────────────────────────────────────────────
  {
    name: 'Hyperkalemia',
    aliases: ['hyperkalemia', 'high potassium', 'elevated potassium'],
    groups: {
      History: [F('Renal failure / ESRD / missed dialysis'), F('ACE inhibitor, ARB, or potassium-sparing diuretic'), F('Crush injury / rhabdomyolysis'), F('Adrenal insufficiency')],
      Symptoms: [F('Generalized weakness'), F('Palpitations'), F('Paresthesias'), F('Often asymptomatic')],
      Exam: [F('Diminished reflexes'), F('Bradycardia / irregular rhythm'), F('Flaccid weakness')],
      Labs: [F('Elevated serum potassium'), F('Renal dysfunction'), F('Metabolic acidosis'), F('Normal potassium', 'against')],
      Imaging: [F('Peaked T waves / widened QRS on ECG'), F('Sine-wave pattern on ECG (severe)'), F('Normal ECG')],
    },
  },
  {
    name: 'Electrolyte abnormality',
    aliases: ['electrolyte abnormalities', 'electrolyte imbalance', 'electrolyte derangement', 'metabolic derangements (e.g., hyponatremia)', 'metabolic derangements', 'hyponatremia', 'hypernatremia', 'hypocalcemia', 'hypomagnesemia'],
    groups: {
      History: [F('Diuretic or other implicated medication'), F('Vomiting / diarrhea / poor intake'), F('Renal or adrenal disease'), F('Excess free-water intake or restriction')],
      Symptoms: [F('Weakness / fatigue'), F('Confusion'), F('Nausea'), F('Seizure (severe hyponatremia)'), F('Muscle cramps')],
      Exam: [F('Altered mental status'), F('Volume overload or depletion'), F('Hyperreflexia / tetany (low Ca/Mg)')],
      Labs: [F('Sodium abnormality'), F('Potassium / calcium / magnesium abnormality'), F('Assess serum osmolality and volume status'), F('Normal comprehensive metabolic panel', 'against')],
      Imaging: [F('QT changes / U waves on ECG')],
    },
  },
  {
    name: 'Dehydration',
    aliases: ['dehydration', 'volume depletion', 'hypovolemia (mild)'],
    groups: {
      History: [F('Vomiting / diarrhea'), F('Poor oral intake'), F('Diuretic use'), F('Extremes of age')],
      Symptoms: [F('Thirst'), F('Lightheadedness'), F('Decreased urination'), F('Fatigue')],
      Exam: [F('Dry mucous membranes'), F('Tachycardia'), F('Orthostatic vital sign changes'), F('Delayed capillary refill'), F('Normal vitals and moist mucosa', 'against')],
      Labs: [F('Elevated BUN:Cr ratio'), F('Concentrated urine / high specific gravity'), F('Prerenal azotemia')],
      Imaging: [F('Collapsible IVC on POCUS')],
    },
  },
  {
    name: 'Anemia',
    aliases: ['anemia', 'acute blood loss anemia', 'symptomatic anemia'],
    groups: {
      History: [F('Overt or occult blood loss (GI, menstrual)'), F('Known anemia / chronic disease'), F('Fatigue and exertional dyspnea'), F('Anticoagulant use')],
      Symptoms: [F('Exertional dyspnea'), F('Fatigue / weakness'), F('Lightheadedness'), F('Palpitations')],
      Exam: [F('Pallor (conjunctival / palmar)'), F('Tachycardia'), F('Flow murmur'), F('Melena or blood on rectal exam')],
      Labs: [F('Low hemoglobin / hematocrit'), F('Iron studies / MCV abnormality'), F('Elevated reticulocyte count (blood loss/hemolysis)'), F('Normal hemoglobin', 'against')],
      Imaging: [],
    },
  },

  // ── Infectious / systemic ──────────────────────────────────────────────────
  {
    name: 'Infective endocarditis',
    aliases: ['endocarditis', 'infective endocarditis', 'bacterial endocarditis', 'ie'],
    groups: {
      History: [F('Injection drug use'), F('Prosthetic valve / prior endocarditis'), F('Structural / valvular heart disease'), F('Recent bacteremia or invasive procedure'), F('Prolonged fever')],
      Symptoms: [F('Fever / night sweats'), F('Malaise / weight loss'), F('Dyspnea'), F('Focal neurologic symptoms (emboli)')],
      Exam: [F('New or changing murmur'), F('Fever'), F('Janeway lesions / Osler nodes'), F('Splinter hemorrhages / Roth spots'), F('Signs of embolic phenomena')],
      Labs: [F('Persistently positive blood cultures'), F('Elevated inflammatory markers'), F('Hematuria (immune complex)')],
      Imaging: [F('Valvular vegetation on echocardiography'), F('Septic emboli on imaging'), F('No vegetation on TEE', 'against')],
    },
  },
  {
    name: 'Toxic shock syndrome',
    aliases: ['toxic shock syndrome', 'tss', 'staphylococcal toxic shock', 'streptococcal toxic shock'],
    groups: {
      History: [F('Tampon use / retained foreign body'), F('Recent surgical wound or packing'), F('Skin/soft-tissue infection'), F('Postpartum or post-abortion')],
      Symptoms: [F('High fever'), F('Diffuse rash'), F('Vomiting / diarrhea'), F('Myalgias'), F('Confusion')],
      Exam: [F('Diffuse macular (sunburn-like) erythroderma'), F('Hypotension'), F('Mucous membrane hyperemia'), F('Later desquamation of palms/soles'), F('Wound with minimal local findings')],
      Labs: [F('Multi-organ dysfunction (renal, hepatic)'), F('Elevated CK'), F('Elevated lactate'), F('Leukocytosis with bandemia')],
      Imaging: [F('Source of infection on imaging')],
    },
  },
  {
    name: 'Cellulitis',
    aliases: ['cellulitis', 'skin and soft tissue infection', 'erysipelas'],
    groups: {
      History: [F('Skin breach / wound / bite'), F('Diabetes or venous insufficiency'), F('Prior cellulitis in same area'), F('Lymphedema')],
      Symptoms: [F('Spreading redness'), F('Warmth and pain'), F('Fever')],
      Exam: [F('Warm, tender, poorly-demarcated erythema'), F('Unilateral involvement'), F('Regional lymphadenopathy'), F('No fluctuance or crepitus'), F('Rapidly spreading margins or pain out of proportion', 'against')],
      Labs: [F('Leukocytosis'), F('Elevated CRP')],
      Imaging: [F('No drainable collection on US'), F('No gas in tissues on imaging'), F('Gas or fascial involvement on imaging', 'against')],
    },
  },
  {
    name: 'Necrotizing fasciitis',
    aliases: ['necrotizing fasciitis', 'nec fasc', 'necrotizing soft tissue infection', 'flesh-eating infection'],
    groups: {
      History: [F('Diabetes / immunocompromise'), F('Recent trauma, surgery, or injection'), F('Rapidly progressing over hours'), F('Peripheral vascular disease')],
      Symptoms: [F('Pain out of proportion to exam'), F('Rapidly spreading erythema'), F('Systemic toxicity'), F('Skin anesthesia over the area')],
      Exam: [F('Pain out of proportion / extending beyond erythema'), F('Crepitus'), F('Bullae or skin necrosis'), F('Dishwater-gray discharge'), F('Hypotension / toxic appearance')],
      Labs: [F('Elevated LRINEC components (WBC, CRP, Na, glucose, Cr)'), F('Elevated lactate'), F('Elevated CK')],
      Imaging: [F('Gas tracking along fascia on CT/X-ray'), F('Fascial thickening / fluid on imaging'), F('No fascial involvement on imaging', 'against')],
    },
  },
  {
    name: 'Osteomyelitis',
    aliases: ['osteomyelitis', 'vertebral osteomyelitis', 'bone infection', 'diabetic foot osteomyelitis', 'discitis'],
    groups: {
      History: [F('Diabetes / peripheral vascular disease'), F('Penetrating injury / open fracture / hardware'), F('Injection drug use (vertebral)'), F('Adjacent skin ulcer or infection'), F('Bacteremia')],
      Symptoms: [F('Localized bone pain'), F('Fever'), F('Non-healing ulcer'), F('Back pain (vertebral)')],
      Exam: [F('Focal bony tenderness'), F('Overlying ulcer / probe-to-bone'), F('Warmth and swelling'), F('Fever')],
      Labs: [F('Elevated ESR / CRP'), F('Leukocytosis'), F('Positive blood cultures'), F('Normal ESR and CRP', 'against')],
      Imaging: [F('Bone changes / marrow edema on MRI'), F('Periosteal reaction on X-ray (late)'), F('Normal MRI', 'against')],
    },
  },
  {
    name: 'Rocky Mountain spotted fever',
    aliases: ['rocky mountain spotted fever', 'rmsf', 'rickettsia rickettsii', 'tick-borne rickettsiosis'],
    groups: {
      History: [F('Tick bite or exposure'), F('Outdoor / wooded exposure'), F('Endemic region in spring/summer'), F('Fever then rash over days')],
      Symptoms: [F('Fever'), F('Severe headache'), F('Myalgias'), F('Nausea / vomiting'), F('Rash starting on wrists/ankles')],
      Exam: [F('Maculopapular rash spreading to palms/soles'), F('Petechiae (later)'), F('Fever'), F('Conjunctival injection')],
      Labs: [F('Thrombocytopenia'), F('Hyponatremia'), F('Elevated transaminases'), F('Rising rickettsial serologies')],
      Imaging: [],
    },
  },
  {
    name: 'Meningococcemia',
    aliases: ['meningococcemia', 'meningococcal disease', 'neisseria meningitidis sepsis'],
    groups: {
      History: [F('Unvaccinated / dormitory or crowded living'), F('Complement deficiency / asplenia'), F('Sick contacts'), F('Rapid onset over hours')],
      Symptoms: [F('High fever'), F('Headache'), F('Myalgias'), F('Rapidly spreading rash'), F('Confusion')],
      Exam: [F('Petechial / purpuric rash'), F('Ill / toxic appearance'), F('Hypotension'), F('Meningismus')],
      Labs: [F('Leukocytosis with bandemia'), F('Coagulopathy / DIC'), F('Elevated lactate'), F('Positive blood / CSF cultures')],
      Imaging: [],
    },
  },
  {
    name: 'Kawasaki disease',
    aliases: ['kawasaki disease', 'kawasaki', 'mucocutaneous lymph node syndrome'],
    groups: {
      History: [F('Child < 5 years'), F('Fever ≥ 5 days'), F('Poor response to antipyretics / antibiotics')],
      Symptoms: [F('Prolonged high fever'), F('Rash'), F('Red eyes'), F('Irritability')],
      Exam: [F('Bilateral non-exudative conjunctivitis'), F('Mucositis (cracked red lips, strawberry tongue)'), F('Polymorphous rash'), F('Extremity changes (edema, desquamation)'), F('Cervical lymphadenopathy > 1.5 cm')],
      Labs: [F('Elevated ESR / CRP'), F('Thrombocytosis (2nd week)'), F('Sterile pyuria'), F('Elevated transaminases')],
      Imaging: [F('Coronary artery aneurysm / dilation on echo')],
    },
  },
  {
    name: 'Diphtheria',
    aliases: ['diphtheria', 'corynebacterium diphtheriae'],
    groups: {
      History: [F('Unvaccinated / incomplete immunization'), F('Travel to endemic area'), F('Sick contacts')],
      Symptoms: [F('Sore throat'), F('Low-grade fever'), F('Difficulty swallowing'), F('Hoarseness / stridor')],
      Exam: [F('Gray adherent pseudomembrane on pharynx'), F('Bleeding when membrane scraped'), F('"Bull neck" cervical adenopathy'), F('Airway compromise')],
      Labs: [F('Culture on special media'), F('Toxin assay')],
      Imaging: [F('Soft-tissue neck imaging for airway')],
    },
  },

  // ── Airway / ENT ───────────────────────────────────────────────────────────
  {
    name: 'Epiglottitis',
    aliases: ['epiglottitis', 'supraglottitis', 'acute epiglottitis'],
    groups: {
      History: [F('Rapid onset over hours'), F('Unimmunized child (Hib) or adult'), F('Immunocompromise'), F('Severe sore throat with minimal pharyngitis')],
      Symptoms: [F('Odynophagia out of proportion to exam'), F('Muffled "hot potato" voice'), F('Drooling'), F('Dyspnea / stridor'), F('Fever')],
      Exam: [F('Tripod / sniffing position'), F('Drooling and pooling secretions'), F('Inspiratory stridor'), F('Toxic appearance'), F('Anterior neck tenderness over hyoid'), F('Benign oropharyngeal exam', 'against')],
      Labs: [F('Leukocytosis'), F('Positive blood cultures')],
      Imaging: [F('Thumbprint sign on lateral neck X-ray'), F('Swollen epiglottis on laryngoscopy'), F('Normal epiglottis on visualization', 'against')],
    },
  },
  {
    name: 'Peritonsillar abscess',
    aliases: ['peritonsillar abscess', 'pta', 'quinsy'],
    groups: {
      History: [F('Preceding pharyngitis / tonsillitis'), F('Adolescent or young adult'), F('Progressive unilateral throat pain')],
      Symptoms: [F('Severe unilateral sore throat'), F('Odynophagia'), F('Muffled "hot potato" voice'), F('Trismus'), F('Ipsilateral ear pain')],
      Exam: [F('Unilateral tonsillar swelling'), F('Uvular deviation to opposite side'), F('Trismus'), F('Fluctuant peritonsillar bulge'), F('Symmetric tonsils without deviation', 'against')],
      Labs: [F('Leukocytosis')],
      Imaging: [F('Rim-enhancing collection on CT neck'), F('Abscess on intraoral US'), F('No drainable collection on imaging', 'against')],
    },
  },
  {
    name: 'Retropharyngeal abscess',
    aliases: ['retropharyngeal abscess', 'rpa', 'deep neck space infection'],
    groups: {
      History: [F('Young child, or adult after penetrating trauma'), F('Recent pharyngitis or dental infection'), F('Neck stiffness with fever')],
      Symptoms: [F('Neck pain / stiffness'), F('Odynophagia / dysphagia'), F('Fever'), F('Muffled voice'), F('Dyspnea')],
      Exam: [F('Neck held rigid / refusal to extend'), F('Posterior pharyngeal bulge'), F('Drooling'), F('Torticollis'), F('Toxic appearance')],
      Labs: [F('Leukocytosis'), F('Elevated CRP')],
      Imaging: [F('Widened prevertebral soft tissue on lateral neck X-ray'), F('Rim-enhancing retropharyngeal collection on CT'), F('Normal prevertebral space', 'against')],
    },
  },
  {
    name: "Ludwig's angina",
    aliases: ["ludwig's angina", 'ludwig angina', 'ludwigs angina', 'submandibular space infection'],
    groups: {
      History: [F('Recent dental infection / extraction'), F('Poor dentition'), F('Diabetes / immunocompromise'), F('Rapid progression')],
      Symptoms: [F('Floor-of-mouth / neck swelling'), F('Odynophagia / drooling'), F('Dysphonia'), F('Dyspnea'), F('Fever')],
      Exam: [F('Brawny bilateral submandibular swelling'), F('Elevated / protruding tongue'), F('Trismus'), F('Drooling and stridor'), F('Toxic appearance')],
      Labs: [F('Leukocytosis'), F('Elevated CRP')],
      Imaging: [F('Submandibular space infection / gas on CT neck'), F('Airway narrowing on imaging')],
    },
  },

  // ── Ophthalmology ──────────────────────────────────────────────────────────
  {
    name: 'Acute angle-closure glaucoma',
    aliases: ['acute angle-closure glaucoma', 'acute angle closure glaucoma', 'angle closure glaucoma', 'acute glaucoma'],
    groups: {
      History: [F('Onset in dim light / after pupil dilation'), F('Hyperopia / prior similar episode'), F('Older age'), F('Anticholinergic or sympathomimetic medication')],
      Symptoms: [F('Severe unilateral eye pain'), F('Blurred vision with halos around lights'), F('Headache'), F('Nausea / vomiting')],
      Exam: [F('Mid-dilated, poorly reactive pupil'), F('Hazy / "steamy" cornea'), F('Conjunctival injection'), F('Firm ("rock-hard") globe'), F('Markedly elevated intraocular pressure')],
      Labs: [],
      Imaging: [F('Shallow anterior chamber on exam / US'), F('Normal intraocular pressure', 'against')],
    },
  },
  {
    name: 'Central retinal artery occlusion',
    aliases: ['central retinal artery occlusion', 'crao', 'retinal artery occlusion'],
    groups: {
      History: [F('Sudden painless monocular vision loss'), F('Vascular risk factors / atrial fibrillation'), F('Carotid disease'), F('Giant cell arteritis features')],
      Symptoms: [F('Sudden, painless, severe monocular vision loss'), F('Preceding amaurosis fugax'), F('Painful vision loss', 'against')],
      Exam: [F('Markedly reduced visual acuity'), F('Relative afferent pupillary defect'), F('Pale retina with cherry-red spot on fundoscopy'), F('Boxcar segmentation of retinal vessels')],
      Labs: [F('Elevated ESR / CRP (if GCA suspected)')],
      Imaging: [F('Retinal findings on POCUS / fundus imaging'), F('Carotid or cardiac embolic source on workup')],
    },
  },
  {
    name: 'Endophthalmitis',
    aliases: ['endophthalmitis', 'intraocular infection'],
    groups: {
      History: [F('Recent intraocular surgery / injection'), F('Penetrating eye trauma'), F('Bacteremia / endogenous seeding'), F('Immunocompromise')],
      Symptoms: [F('Rapidly worsening eye pain'), F('Decreased vision'), F('Redness'), F('Photophobia')],
      Exam: [F('Decreased visual acuity'), F('Hypopyon (layered pus in anterior chamber)'), F('Conjunctival injection / chemosis'), F('Loss of red reflex'), F('Lid swelling')],
      Labs: [F('Vitreous / aqueous culture'), F('Blood cultures (endogenous)')],
      Imaging: [F('Vitreous opacities on ocular US')],
    },
  },
  {
    name: 'Orbital cellulitis',
    aliases: ['orbital cellulitis', 'postseptal cellulitis'],
    groups: {
      History: [F('Recent sinusitis (esp. ethmoid)'), F('Orbital trauma / recent surgery'), F('Dental infection'), F('Progressive over days')],
      Symptoms: [F('Eye pain worse with movement'), F('Double vision'), F('Decreased vision'), F('Fever'), F('Eyelid swelling')],
      Exam: [F('Proptosis'), F('Painful / restricted extraocular movements'), F('Chemosis'), F('Decreased visual acuity / RAPD'), F('Fever'), F('Full painless eye movements', 'against')],
      Labs: [F('Leukocytosis'), F('Elevated inflammatory markers')],
      Imaging: [F('Postseptal inflammation / abscess on CT orbits'), F('Adjacent sinusitis on CT'), F('Preseptal only on CT', 'against')],
    },
  },
  {
    name: 'Corneal ulcer / keratitis',
    aliases: ['corneal ulcer', 'keratitis', 'bacterial keratitis', 'infectious keratitis'],
    groups: {
      History: [F('Contact lens wear / overnight use'), F('Corneal trauma or foreign body'), F('Prior herpetic keratitis')],
      Symptoms: [F('Eye pain / foreign-body sensation'), F('Photophobia'), F('Tearing / discharge'), F('Decreased vision')],
      Exam: [F('Corneal opacity / infiltrate'), F('Fluorescein-staining epithelial defect'), F('Hypopyon (severe)'), F('Ciliary flush'), F('Dendritic ulcer (herpetic)')],
      Labs: [F('Corneal scraping culture (severe)')],
      Imaging: [],
    },
  },
  {
    name: 'Uveitis / iritis',
    aliases: ['uveitis', 'iritis', 'anterior uveitis', 'iridocyclitis'],
    groups: {
      History: [F('Autoimmune / HLA-B27 disease'), F('Prior episodes'), F('Recent ocular trauma'), F('Associated systemic inflammatory disease')],
      Symptoms: [F('Deep aching eye pain'), F('Photophobia (including consensual)'), F('Blurred vision'), F('Tearing without discharge')],
      Exam: [F('Ciliary flush (perilimbal injection)'), F('Cells and flare in anterior chamber'), F('Constricted / irregular pupil'), F('Consensual photophobia'), F('Purulent discharge', 'against')],
      Labs: [F('Targeted autoimmune / infectious workup if recurrent')],
      Imaging: [],
    },
  },
  {
    name: 'Scleritis',
    aliases: ['scleritis', 'episcleritis'],
    groups: {
      History: [F('Underlying autoimmune disease (RA, vasculitis)'), F('Prior episodes')],
      Symptoms: [F('Severe boring eye pain'), F('Pain radiating to head/face'), F('Pain worse at night / on eye movement'), F('Photophobia')],
      Exam: [F('Deep bluish scleral injection'), F('Scleral tenderness to palpation'), F('Vessels do not blanch with phenylephrine'), F('Vessels blanch with phenylephrine (favors episcleritis)', 'against')],
      Labs: [F('Autoimmune workup')],
      Imaging: [F('Scleral thickening on US (posterior scleritis)')],
    },
  },
  {
    name: 'Conjunctivitis',
    aliases: ['conjunctivitis', 'pink eye', 'viral conjunctivitis', 'bacterial conjunctivitis', 'allergic conjunctivitis'],
    groups: {
      History: [F('Sick contacts / recent URI (viral)'), F('Allergen exposure / itching (allergic)'), F('Contact lens wear'), F('Purulent discharge (bacterial)')],
      Symptoms: [F('Redness and irritation'), F('Discharge / crusting'), F('Itching (allergic)'), F('Gritty foreign-body sensation'), F('Severe pain or vision loss', 'against')],
      Exam: [F('Diffuse conjunctival injection'), F('Discharge (watery vs purulent)'), F('Preserved visual acuity'), F('Normal pupil and cornea'), F('Preauricular node (viral)'), F('Ciliary flush or hypopyon', 'against')],
      Labs: [],
      Imaging: [],
    },
  },
  {
    name: 'Corneal abrasion',
    aliases: ['corneal abrasion', 'corneal foreign body sensation'],
    groups: {
      History: [F('Recent ocular trauma / scratch'), F('Contact lens use'), F('Foreign-body sensation after injury')],
      Symptoms: [F('Sharp foreign-body sensation'), F('Tearing'), F('Photophobia'), F('Pain with blinking')],
      Exam: [F('Fluorescein-staining epithelial defect'), F('Preserved visual acuity'), F('No infiltrate or hypopyon'), F('Corneal infiltrate / opacity', 'against')],
      Labs: [],
      Imaging: [],
    },
  },
  {
    name: 'Ocular foreign body',
    aliases: ['foreign body', 'ocular foreign body', 'corneal foreign body', 'intraocular foreign body'],
    groups: {
      History: [F('High-velocity work (grinding, hammering)'), F('No eye protection'), F('Sudden onset during activity')],
      Symptoms: [F('Foreign-body sensation'), F('Tearing / redness'), F('Pain with blinking'), F('Vision change (if intraocular)')],
      Exam: [F('Visible foreign body on lid eversion / cornea'), F('Rust ring (metallic)'), F('Fluorescein uptake around body'), F('Seidel sign / globe deformity (penetration)')],
      Labs: [],
      Imaging: [F('CT orbits for suspected intraocular foreign body'), F('No intraocular foreign body on CT', 'against')],
    },
  },
  {
    name: 'Subconjunctival hemorrhage',
    aliases: ['subconjunctival hemorrhage'],
    groups: {
      History: [F('Valsalva (coughing, straining, vomiting)'), F('Anticoagulant use / bleeding disorder'), F('Minor trauma'), F('Hypertension')],
      Symptoms: [F('Painless red patch on the eye'), F('No vision change'), F('Pain or vision loss', 'against')],
      Exam: [F('Flat, well-demarcated blood under conjunctiva'), F('Normal visual acuity'), F('Normal pupil and cornea')],
      Labs: [F('Coagulation studies if recurrent / on anticoagulation')],
      Imaging: [],
    },
  },
  {
    name: 'Blepharitis',
    aliases: ['blepharitis', 'lid margin inflammation'],
    groups: {
      History: [F('Chronic / recurrent lid irritation'), F('Rosacea or seborrheic dermatitis'), F('Worse in the morning')],
      Symptoms: [F('Burning / itching of lid margins'), F('Crusting of lashes'), F('Foreign-body sensation'), F('Vision loss or severe pain', 'against')],
      Exam: [F('Erythematous, scaly lid margins'), F('Crusting / collarettes at lash base'), F('Preserved visual acuity'), F('Normal cornea and anterior chamber')],
      Labs: [],
      Imaging: [],
    },
  },
  {
    name: 'Dry eye syndrome',
    aliases: ['dry eye syndrome', 'dry eyes', 'keratoconjunctivitis sicca'],
    groups: {
      History: [F('Screen use / low blink environment'), F('Autoimmune (Sjögren)'), F('Older age / postmenopausal'), F('Medications (antihistamines, anticholinergics)')],
      Symptoms: [F('Gritty / burning sensation'), F('Intermittent blurring that improves with blinking'), F('Reflex tearing'), F('Severe pain or acute vision loss', 'against')],
      Exam: [F('Reduced tear film / rapid tear breakup'), F('Mild diffuse punctate staining'), F('Preserved visual acuity'), F('Normal pupil and anterior chamber')],
      Labs: [],
      Imaging: [],
    },
  },

  // ── OB / GYN ───────────────────────────────────────────────────────────────
  {
    name: 'Placental abruption',
    aliases: ['placental abruption', 'abruptio placentae', 'abruption'],
    groups: {
      History: [F('Third-trimester pregnancy'), F('Hypertension / preeclampsia'), F('Trauma or fall'), F('Cocaine use'), F('Prior abruption')],
      Symptoms: [F('Painful vaginal bleeding'), F('Constant abdominal / back pain'), F('Frequent contractions'), F('Decreased fetal movement')],
      Exam: [F('Uterine tenderness / rigidity'), F('Vaginal bleeding (may be concealed)'), F('Hypertonic frequent contractions'), F('Maternal hypotension'), F('Non-reassuring fetal heart tracing')],
      Labs: [F('Anemia / dropping hemoglobin'), F('Coagulopathy / DIC (severe)'), F('Fibrinogen decline')],
      Imaging: [F('Retroplacental hematoma on US'), F('Normal US does not exclude abruption', 'against')],
    },
  },
  {
    name: 'Uterine rupture',
    aliases: ['uterine rupture', 'ruptured uterus'],
    groups: {
      History: [F('Prior cesarean / uterine surgery'), F('Trial of labor after cesarean'), F('Oxytocin / prostaglandin use'), F('Trauma')],
      Symptoms: [F('Sudden severe abdominal pain'), F('Vaginal bleeding'), F('Cessation of contractions'), F('Syncope')],
      Exam: [F('Loss of fetal station'), F('Palpable fetal parts abdominally'), F('Maternal hypotension / tachycardia'), F('Non-reassuring or absent fetal heart tones')],
      Labs: [F('Dropping hemoglobin'), F('Coagulopathy')],
      Imaging: [F('Free fluid / uterine defect on US'), F('Fetal parts outside uterus')],
    },
  },
  {
    name: 'Eclampsia',
    aliases: ['eclampsia', 'preeclampsia with seizure', 'eclamptic seizure'],
    groups: {
      History: [F('Pregnancy > 20 weeks or postpartum'), F('Known preeclampsia / hypertension'), F('Headache and visual changes'), F('Rapid weight gain / edema')],
      Symptoms: [F('Seizure in pregnancy'), F('Severe headache'), F('Visual disturbances (scotomata)'), F('Right-upper-quadrant / epigastric pain')],
      Exam: [F('Hypertension'), F('Hyperreflexia / clonus'), F('Peripheral / facial edema'), F('Altered mental status')],
      Labs: [F('Proteinuria'), F('Thrombocytopenia'), F('Elevated LFTs (HELLP)'), F('Elevated creatinine')],
      Imaging: [F('Posterior reversible encephalopathy (PRES) on MRI')],
    },
  },
  {
    name: 'Threatened / spontaneous abortion',
    aliases: ['miscarriage', 'threatened abortion', 'spontaneous abortion', 'incomplete abortion', 'missed abortion'],
    groups: {
      History: [F('Positive pregnancy test / known early IUP'), F('First-trimester bleeding'), F('Passage of tissue'), F('Prior miscarriage')],
      Symptoms: [F('Vaginal bleeding'), F('Cramping lower abdominal pain'), F('Passage of clots / tissue'), F('Decreasing pregnancy symptoms')],
      Exam: [F('Blood in vaginal vault'), F('Open vs closed cervical os'), F('Uterine tenderness'), F('Products of conception at os'), F('Hemodynamic instability')],
      Labs: [F('Quantitative β-hCG (trend)'), F('Falling / plateauing β-hCG'), F('Anemia if heavy bleeding'), F('Blood type & Rh')],
      Imaging: [F('IUP without cardiac activity / retained products on US'), F('No intrauterine pregnancy with positive hCG (r/o ectopic)', 'against'), F('Viable IUP with cardiac activity on US', 'against')],
    },
  },
  {
    name: 'Dysfunctional uterine bleeding',
    aliases: ['dysfunctional uterine bleeding', 'dub', 'abnormal uterine bleeding', 'hormonal imbalance', 'perimenopausal bleeding', 'anovulatory bleeding', 'menorrhagia'],
    groups: {
      History: [F('Irregular / anovulatory cycles'), F('Perimenopausal age'), F('PCOS / obesity / thyroid disease'), F('Hormonal contraception')],
      Symptoms: [F('Heavy or prolonged menstrual bleeding'), F('Irregular timing of bleeding'), F('Fatigue from blood loss')],
      Exam: [F('Blood from cervical os without structural lesion'), F('Normal-sized non-tender uterus'), F('Signs of anemia')],
      Labs: [F('Negative pregnancy test'), F('Anemia'), F('TSH / prolactin abnormality'), F('Coagulopathy screen if severe')],
      Imaging: [F('Endometrial / structural evaluation on pelvic US'), F('Endometrial thickening warranting biopsy')],
    },
  },
  {
    name: 'Uterine fibroids',
    aliases: ['fibroids', 'uterine fibroids', 'leiomyoma', 'myoma'],
    groups: {
      History: [F('Known fibroids'), F('Heavy menstrual bleeding'), F('Pelvic pressure / bulk symptoms'), F('Reproductive age')],
      Symptoms: [F('Heavy / prolonged menses'), F('Pelvic pressure or fullness'), F('Urinary frequency'), F('Dysmenorrhea')],
      Exam: [F('Enlarged, irregular, firm uterus'), F('Palpable pelvic mass')],
      Labs: [F('Anemia from chronic bleeding'), F('Negative pregnancy test')],
      Imaging: [F('Fibroids on pelvic US'), F('Degenerating fibroid causing acute pain')],
    },
  },
  {
    name: 'Endometrial / cervical polyp',
    aliases: ['endometrial polyps', 'cervical polyp', 'uterine polyp'],
    groups: {
      History: [F('Intermenstrual or postcoital bleeding'), F('Perimenopausal / postmenopausal'), F('Tamoxifen use')],
      Symptoms: [F('Irregular spotting'), F('Postcoital bleeding'), F('Light recurrent bleeding')],
      Exam: [F('Visible polyp protruding from cervical os'), F('Otherwise benign pelvic exam')],
      Labs: [F('Negative pregnancy test')],
      Imaging: [F('Focal endometrial lesion on US / saline sonography')],
    },
  },
  {
    name: 'Cervicitis',
    aliases: ['cervicitis'],
    groups: {
      History: [F('New / multiple sexual partners'), F('Unprotected intercourse'), F('Associated STI risk')],
      Symptoms: [F('Vaginal discharge'), F('Postcoital or intermenstrual bleeding'), F('Dyspareunia'), F('Dysuria')],
      Exam: [F('Mucopurulent cervical discharge'), F('Friable, easily-bleeding cervix'), F('Cervical motion tenderness (if PID)')],
      Labs: [F('Positive gonorrhea / chlamydia NAAT'), F('WBCs on wet mount'), F('Negative pregnancy test')],
      Imaging: [],
    },
  },
  {
    name: 'Postcoital bleeding',
    aliases: ['postcoital bleeding'],
    groups: {
      History: [F('Bleeding after intercourse'), F('Overdue cervical cancer screening'), F('STI risk factors'), F('Postmenopausal (higher concern)')],
      Symptoms: [F('Light bleeding after intercourse'), F('Associated discharge')],
      Exam: [F('Cervical lesion, polyp, or friability'), F('Atrophic vaginitis'), F('Normal cervix', 'against')],
      Labs: [F('Cervical cytology / HPV testing'), F('STI testing'), F('Negative pregnancy test')],
      Imaging: [],
    },
  },
  {
    name: 'Cervical cancer',
    aliases: ['cervical cancer', 'cervical carcinoma', 'cervical malignancy'],
    groups: {
      History: [F('No / overdue Pap screening'), F('HPV infection'), F('Smoking'), F('Postcoital or irregular bleeding'), F('Immunocompromise / HIV')],
      Symptoms: [F('Abnormal vaginal bleeding'), F('Postcoital bleeding'), F('Malodorous or watery discharge'), F('Pelvic pain (advanced)')],
      Exam: [F('Friable / exophytic cervical lesion'), F('Contact bleeding'), F('Fixed / enlarged parametrial exam (advanced)')],
      Labs: [F('Anemia (chronic bleeding)'), F('Renal impairment (obstruction, advanced)')],
      Imaging: [F('Cervical mass on pelvic imaging'), F('Hydronephrosis / nodal disease on CT/MRI (staging)')],
    },
  },

  // ── GU / renal ─────────────────────────────────────────────────────────────
  {
    name: 'Prostatitis',
    aliases: ['prostatitis', 'acute bacterial prostatitis'],
    groups: {
      History: [F('Recent UTI or urethral instrumentation'), F('BPH / urinary retention'), F('Recent unprotected intercourse')],
      Symptoms: [F('Dysuria and frequency'), F('Perineal / pelvic pain'), F('Fever / chills'), F('Painful ejaculation'), F('Obstructive urinary symptoms')],
      Exam: [F('Exquisitely tender, boggy prostate on gentle DRE'), F('Fever'), F('Suprapubic tenderness / distended bladder')],
      Labs: [F('Pyuria / positive leukocyte esterase'), F('Positive urine culture'), F('Leukocytosis')],
      Imaging: [F('Prostatic abscess on US/CT (if not improving)')],
    },
  },
  {
    name: 'Epididymitis / orchitis',
    aliases: ['epididymitis', 'orchitis', 'epididymo-orchitis'],
    groups: {
      History: [F('Sexually active < 35 (STI) or > 35 (coliform)'), F('Recent UTI or instrumentation'), F('Gradual onset over days')],
      Symptoms: [F('Gradual unilateral scrotal pain'), F('Dysuria / urethral discharge'), F('Scrotal swelling'), F('Fever')],
      Exam: [F('Tender, indurated epididymis'), F('Relief with testicular elevation (Prehn sign)'), F('Intact cremasteric reflex'), F('Normal testicular lie'), F('High-riding testis with absent cremasteric reflex', 'against')],
      Labs: [F('Pyuria / positive leukocyte esterase'), F('Positive gonorrhea / chlamydia NAAT')],
      Imaging: [F('Increased epididymal blood flow on Doppler US'), F('Preserved testicular perfusion on US'), F('Absent testicular flow (favors torsion)', 'against')],
    },
  },
  {
    name: 'Urethritis',
    aliases: ['urethritis', 'nongonococcal urethritis', 'gonococcal urethritis'],
    groups: {
      History: [F('New / multiple sexual partners'), F('Unprotected intercourse'), F('Male with discharge')],
      Symptoms: [F('Dysuria'), F('Urethral discharge'), F('Urethral itching / irritation'), F('Fever or flank pain', 'against')],
      Exam: [F('Mucopurulent or purulent urethral discharge'), F('Meatal erythema'), F('No CVA tenderness')],
      Labs: [F('Positive gonorrhea / chlamydia NAAT'), F('Pyuria on first-void urine'), F('WBCs on urethral smear')],
      Imaging: [],
    },
  },
  {
    name: 'Vulvovaginitis / vaginitis',
    aliases: ['vulvovaginitis', 'vaginitis', 'bacterial vaginosis', 'candidal vaginitis', 'trichomoniasis', 'yeast infection'],
    groups: {
      History: [F('Recent antibiotics (candidal)'), F('New sexual partner (trichomonas)'), F('Diabetes'), F('Change in discharge')],
      Symptoms: [F('Abnormal vaginal discharge'), F('Vulvar itching / irritation'), F('External dysuria'), F('Malodor (BV / trichomonas)')],
      Exam: [F('Discharge character (curdy, thin gray, frothy)'), F('Vulvar / vaginal erythema'), F('Strawberry cervix (trichomonas)'), F('No cervical motion tenderness')],
      Labs: [F('Clue cells / positive whiff test (BV)'), F('Pseudohyphae on KOH (candida)'), F('Motile trichomonads on wet mount'), F('Vaginal pH')],
      Imaging: [],
    },
  },
  {
    name: 'Genital herpes (HSV)',
    aliases: ['hsv', 'genital herpes', 'herpes simplex virus', 'herpes simplex'],
    groups: {
      History: [F('New / multiple sexual partners'), F('Prior similar outbreaks'), F('Prodrome of tingling / burning'), F('Immunocompromise')],
      Symptoms: [F('Painful genital lesions'), F('Dysuria (from lesions)'), F('Tingling / burning prodrome'), F('Flu-like symptoms (primary)')],
      Exam: [F('Grouped vesicles / shallow painful ulcers'), F('Tender inguinal lymphadenopathy'), F('Vulvar / penile erythema'), F('Urinary retention (severe primary)')],
      Labs: [F('Positive HSV PCR / culture of lesion'), F('Positive HSV serology')],
      Imaging: [],
    },
  },
  {
    name: 'Urethral trauma / foreign body',
    aliases: ['urethral trauma / foreign body', 'urethral trauma', 'urethral foreign body', 'urethral injury'],
    groups: {
      History: [F('Straddle injury / pelvic trauma'), F('Recent catheterization / instrumentation'), F('Inserted foreign body'), F('Blood at meatus after trauma')],
      Symptoms: [F('Dysuria'), F('Gross hematuria / blood at meatus'), F('Inability to void'), F('Pelvic / perineal pain')],
      Exam: [F('Blood at urethral meatus'), F('High-riding / boggy prostate (posterior injury)'), F('Perineal / scrotal hematoma'), F('Palpable distended bladder')],
      Labs: [F('Hematuria on urinalysis')],
      Imaging: [F('Contrast extravasation on retrograde urethrogram'), F('Foreign body on imaging'), F('Normal retrograde urethrogram', 'against')],
    },
  },

  // ── Coagulopathy ───────────────────────────────────────────────────────────
  {
    name: 'Coagulopathy',
    aliases: ['coagulopathy', 'bleeding disorder', 'anticoagulation-related bleeding', 'thrombocytopenia', 'dic'],
    groups: {
      History: [F('Anticoagulant / antiplatelet use'), F('Liver disease'), F('Known bleeding disorder'), F('Recent massive transfusion or sepsis (DIC)')],
      Symptoms: [F('Easy bruising / mucosal bleeding'), F('Prolonged bleeding from sites'), F('Heavy vaginal or GI bleeding'), F('Hematuria')],
      Exam: [F('Petechiae / ecchymoses'), F('Active bleeding from multiple sites'), F('Signs of liver disease')],
      Labs: [F('Elevated INR / PT / PTT'), F('Thrombocytopenia'), F('Low fibrinogen / elevated D-dimer (DIC)'), F('Anemia'), F('Normal coagulation panel', 'against')],
      Imaging: [F('Occult hemorrhage on imaging')],
    },
  },

  // ── Abdominal / GI ─────────────────────────────────────────────────────────
  {
    name: 'Acute gastroenteritis',
    aliases: ['acute gastroenteritis', 'gastroenteritis', 'viral gastroenteritis', 'food poisoning', 'stomach flu'],
    groups: {
      History: [F('Sick contacts / recent travel'), F('Suspect food exposure'), F('Diarrhea and vomiting together'), F('Self-limited course')],
      Symptoms: [F('Nausea / vomiting'), F('Watery diarrhea'), F('Diffuse crampy abdominal pain'), F('Low-grade fever')],
      Exam: [F('Diffuse mild abdominal tenderness without peritonism'), F('Signs of dehydration'), F('Hyperactive bowel sounds'), F('Focal / peritoneal signs', 'against')],
      Labs: [F('Electrolyte derangement from losses'), F('Leukocytosis (may be normal)'), F('Bloody diarrhea / high fever suggesting alternative', 'against')],
      Imaging: [F('Imaging reserved for red flags'), F('CT to exclude surgical abdomen if atypical')],
    },
  },
  {
    name: 'Constipation',
    aliases: ['constipation', 'fecal impaction'],
    groups: {
      History: [F('Infrequent / hard stools'), F('Low fiber / fluid intake'), F('Opioid or anticholinergic use'), F('Immobility')],
      Symptoms: [F('Infrequent bowel movements'), F('Straining / incomplete evacuation'), F('Crampy lower abdominal pain'), F('Bloating')],
      Exam: [F('Palpable stool in colon'), F('Hard stool / impaction on rectal exam'), F('Non-distended, soft abdomen'), F('Peritoneal signs', 'against')],
      Labs: [F('Hypercalcemia / hypothyroidism (secondary)')],
      Imaging: [F('Stool burden on abdominal X-ray'), F('No obstruction on imaging'), F('Obstruction / transition point (favors SBO)', 'against')],
    },
  },
  {
    name: 'Irritable bowel syndrome',
    aliases: ['irritable bowel syndrome', 'ibs'],
    groups: {
      History: [F('Chronic recurrent symptoms'), F('Pain relieved by defecation'), F('Altered stool frequency / form'), F('Symptoms tied to stress / meals'), F('No weight loss or GI bleeding')],
      Symptoms: [F('Crampy abdominal pain'), F('Bloating'), F('Alternating diarrhea / constipation'), F('Relief with bowel movement'), F('Nocturnal symptoms / weight loss', 'against')],
      Exam: [F('Mild non-specific tenderness'), F('Benign abdomen without mass'), F('Peritoneal signs', 'against')],
      Labs: [F('Normal inflammatory markers'), F('Negative celiac / fecal calprotectin'), F('Anemia or elevated inflammatory markers', 'against')],
      Imaging: [F('Normal imaging when obtained')],
    },
  },
  {
    name: 'Gastric outlet obstruction',
    aliases: ['gastric outlet obstruction', 'goo', 'pyloric obstruction'],
    groups: {
      History: [F('Peptic ulcer disease'), F('Gastric or pancreatic malignancy'), F('Prior gastric surgery'), F('Progressive postprandial vomiting')],
      Symptoms: [F('Nonbilious vomiting of undigested food'), F('Early satiety'), F('Epigastric fullness / bloating'), F('Weight loss')],
      Exam: [F('Succussion splash'), F('Epigastric distension'), F('Signs of dehydration')],
      Labs: [F('Hypochloremic hypokalemic metabolic alkalosis'), F('Prerenal azotemia')],
      Imaging: [F('Dilated stomach with retained contents on CT'), F('Obstructing mass or stricture on imaging / endoscopy')],
    },
  },
  {
    name: 'Hyperemesis gravidarum',
    aliases: ['hyperemesis gravidarum', 'severe morning sickness'],
    groups: {
      History: [F('Early pregnancy (first trimester)'), F('Multiple gestation / molar pregnancy'), F('Prior hyperemesis'), F('Inability to tolerate oral intake')],
      Symptoms: [F('Intractable nausea / vomiting'), F('Inability to keep down fluids'), F('Lightheadedness'), F('Decreased urination')],
      Exam: [F('Signs of dehydration'), F('Weight loss > 5%'), F('Orthostatic vital changes'), F('Focal abdominal tenderness', 'against')],
      Labs: [F('Positive pregnancy test'), F('Ketonuria'), F('Electrolyte derangement / hypokalemia'), F('Elevated hCG'), F('Abnormal TSH')],
      Imaging: [F('Confirm intrauterine pregnancy / exclude molar on US')],
    },
  },
  {
    name: 'Medication side effect',
    aliases: ['medication related', 'medication side effects', 'medication side effect', 'adverse drug reaction', 'drug side effect'],
    groups: {
      History: [F('Recent new medication or dose change'), F('Temporal link between drug and symptoms'), F('Polypharmacy'), F('Known side-effect profile')],
      Symptoms: [F('Nausea / vomiting'), F('Dizziness / sedation'), F('Symptom onset after starting drug'), F('Improvement after holding drug')],
      Exam: [F('Vital sign changes attributable to the drug'), F('Otherwise unremarkable exam')],
      Labs: [F('Supratherapeutic drug level'), F('Drug-induced lab abnormality (electrolytes, renal)')],
      Imaging: [],
    },
  },

  // ── Headache (benign / secondary) ─────────────────────────────────────────
  {
    name: 'Acute sinusitis',
    aliases: ['acute sinusitis', 'sinusitis', 'chronic sinusitis', 'rhinosinusitis', 'bacterial sinusitis'],
    groups: {
      History: [F('Preceding viral URI'), F('Symptoms > 10 days or worsening after improvement'), F('Purulent nasal discharge'), F('Facial pressure worse when bending forward')],
      Symptoms: [F('Facial pain / pressure'), F('Nasal congestion / purulent discharge'), F('Postnasal drip'), F('Reduced sense of smell'), F('Headache')],
      Exam: [F('Sinus tenderness to palpation'), F('Purulent nasal discharge'), F('Low-grade fever'), F('Focal neurologic deficit', 'against')],
      Labs: [],
      Imaging: [F('Sinus opacification / air-fluid levels on CT (if complicated)'), F('Findings of orbital / intracranial extension', 'against')],
    },
  },
  {
    name: 'Cluster headache',
    aliases: ['cluster headache', 'trigeminal autonomic cephalalgia'],
    groups: {
      History: [F('Attacks in clusters over weeks'), F('Male predominance'), F('Alcohol as a trigger'), F('Circadian / nocturnal pattern')],
      Symptoms: [F('Severe unilateral periorbital / temporal pain'), F('Short duration (15–180 min)'), F('Restlessness / agitation during attack'), F('Ipsilateral autonomic symptoms')],
      Exam: [F('Ipsilateral lacrimation / rhinorrhea'), F('Ipsilateral ptosis / miosis'), F('Conjunctival injection'), F('Normal neurologic exam')],
      Labs: [],
      Imaging: [F('Normal neuroimaging (first presentation to exclude secondary cause)')],
    },
  },
  {
    name: 'Medication-overuse headache',
    aliases: ['analgesia abuse', 'medication overuse headache', 'rebound headache', 'analgesic overuse headache'],
    groups: {
      History: [F('Frequent analgesic / triptan use (≥ 10–15 days/month)'), F('Pre-existing primary headache'), F('Headache on waking'), F('Escalating medication use')],
      Symptoms: [F('Near-daily headache'), F('Headache worse when medication wears off'), F('Improvement with medication withdrawal'), F('Thunderclap onset / new focal deficit', 'against')],
      Exam: [F('Normal neurologic exam'), F('No meningismus')],
      Labs: [],
      Imaging: [F('Normal neuroimaging if obtained')],
    },
  },
  {
    name: 'Post-dural-puncture headache',
    aliases: ['post-lumbar puncture headache', 'post-dural puncture headache', 'post-lp headache', 'spinal headache'],
    groups: {
      History: [F('Recent LP / spinal anesthesia / epidural'), F('Onset within days of procedure'), F('Younger patient / small stature')],
      Symptoms: [F('Positional headache worse upright, better supine'), F('Neck stiffness'), F('Nausea'), F('Tinnitus / hearing change'), F('Headache unrelated to position', 'against')],
      Exam: [F('Headache reproduced by sitting up'), F('Normal neurologic exam'), F('No fever or meningismus')],
      Labs: [],
      Imaging: [F('Dural enhancement / low-lying structures on MRI (if imaged)')],
    },
  },
  {
    name: 'TMJ dysfunction',
    aliases: ['tmj pain', 'temporomandibular joint dysfunction', 'tmj disorder', 'tmd'],
    groups: {
      History: [F('Jaw clenching / bruxism'), F('Recent dental work'), F('Pain with chewing'), F('Unilateral facial / preauricular pain')],
      Symptoms: [F('Preauricular / jaw pain'), F('Pain worse with chewing'), F('Jaw clicking / locking'), F('Referred ear or temple pain')],
      Exam: [F('Tenderness over the TMJ / masseter'), F('Clicking or crepitus with jaw movement'), F('Limited jaw opening'), F('Normal neurologic and cranial nerve exam')],
      Labs: [],
      Imaging: [F('TMJ imaging only if refractory')],
    },
  },

  // ── Back pain (mechanical) ─────────────────────────────────────────────────
  {
    name: 'Mechanical low back pain',
    aliases: ['lumbar strain', 'mechanical back pain', 'musculoskeletal back pain', 'muscle strain', 'osteoarthritis', 'degenerative disc disease', 'facet joint arthropathy', 'lumbar sprain'],
    groups: {
      History: [F('Recent lifting / twisting / overuse'), F('Pain worse with movement, better with rest'), F('No trauma or systemic features'), F('Prior similar episodes')],
      Symptoms: [F('Axial low back pain'), F('Pain radiating to buttock (non-dermatomal)'), F('Stiffness'), F('Fever, weight loss, or night pain', 'against'), F('Bowel/bladder dysfunction', 'against')],
      Exam: [F('Paraspinal muscle tenderness / spasm'), F('Pain with movement, full strength'), F('Normal neurologic exam'), F('Negative straight-leg raise'), F('Focal neurologic deficit', 'against')],
      Labs: [F('Normal inflammatory markers (if checked)')],
      Imaging: [F('Imaging not indicated without red flags'), F('Degenerative changes only on X-ray')],
    },
  },
  {
    name: 'Lumbar radiculopathy / herniated disc',
    aliases: ['herniated disc', 'sciatica', 'lumbar radiculopathy', 'disc herniation', 'radiculopathy'],
    groups: {
      History: [F('Radiating leg pain below the knee'), F('Onset with bending / lifting'), F('Pain worse with sitting / Valsalva'), F('Dermatomal distribution')],
      Symptoms: [F('Sharp radiating leg pain'), F('Dermatomal numbness / tingling'), F('Focal weakness'), F('Bilateral symptoms or saddle anesthesia', 'against')],
      Exam: [F('Positive straight-leg raise'), F('Dermatomal sensory loss'), F('Focal motor weakness / reflex change'), F('Normal rectal tone and perineal sensation'), F('Bilateral deficits / decreased rectal tone', 'against')],
      Labs: [],
      Imaging: [F('Nerve-root compression on MRI'), F('MRI reserved for deficits or red flags'), F('Normal MRI', 'against')],
    },
  },
  {
    name: 'Spinal stenosis',
    aliases: ['spinal stenosis', 'lumbar spinal stenosis', 'neurogenic claudication'],
    groups: {
      History: [F('Older age'), F('Leg pain with walking / standing'), F('Relief with sitting or leaning forward'), F('Gradual progression')],
      Symptoms: [F('Neurogenic claudication (leg pain with walking)'), F('Relief leaning forward / sitting'), F('Bilateral leg heaviness'), F('Pain relieved by rest alone', 'against')],
      Exam: [F('Relief with lumbar flexion'), F('Wide-based gait'), F('Often normal focal strength'), F('Preserved distal pulses (vs vascular claudication)')],
      Labs: [],
      Imaging: [F('Canal narrowing on MRI'), F('Degenerative changes on X-ray')],
    },
  },
  {
    name: 'Spinal epidural abscess',
    aliases: ['spinal epidural abscess', 'epidural abscess', 'sea'],
    groups: {
      History: [F('Injection drug use'), F('Recent bacteremia / endocarditis'), F('Diabetes / immunocompromise'), F('Recent spinal procedure or injection'), F('Progressive back pain with fever')],
      Symptoms: [F('Severe focal back pain'), F('Fever'), F('Radicular pain'), F('Progressive weakness'), F('Bowel / bladder dysfunction (late)')],
      Exam: [F('Focal spinal tenderness'), F('Fever'), F('Focal neurologic deficit'), F('Bilateral weakness / sensory level')],
      Labs: [F('Elevated ESR / CRP'), F('Leukocytosis'), F('Positive blood cultures'), F('Normal ESR and CRP', 'against')],
      Imaging: [F('Epidural collection compressing the cord/thecal sac on MRI'), F('Normal spine MRI with contrast', 'against')],
    },
  },
  {
    name: 'Sacroiliitis',
    aliases: ['sacroiliitis', 'sacroiliac joint dysfunction', 'si joint pain'],
    groups: {
      History: [F('Inflammatory back pain (young, morning stiffness)'), F('Improvement with activity (inflammatory)'), F('Associated spondyloarthropathy / IBD / psoriasis'), F('Buttock pain')],
      Symptoms: [F('Unilateral or alternating buttock pain'), F('Morning stiffness > 30 min'), F('Pain with prolonged sitting')],
      Exam: [F('Tenderness over the SI joint'), F('Positive FABER / provocation tests'), F('Normal neurologic exam')],
      Labs: [F('Elevated inflammatory markers (inflammatory type)'), F('HLA-B27 positive')],
      Imaging: [F('Sacroiliac changes on X-ray / MRI')],
    },
  },

  // ── Dizziness / vertigo ────────────────────────────────────────────────────
  {
    name: 'Benign paroxysmal positional vertigo',
    aliases: ['benign paroxysmal positional vertigo (bppv)', 'benign paroxysmal positional vertigo', 'bppv', 'positional vertigo'],
    groups: {
      History: [F('Brief episodes triggered by head position change'), F('Rolling over in bed provokes symptoms'), F('Episodes last seconds to a minute'), F('No hearing loss')],
      Symptoms: [F('Brief spinning with position change'), F('Nausea with episodes'), F('Symptom-free between episodes'), F('Constant vertigo / continuous symptoms', 'against'), F('Focal neurologic symptoms', 'against')],
      Exam: [F('Positive Dix-Hallpike with fatigable upbeat-torsional nystagmus'), F('Normal neurologic exam'), F('Normal gait between episodes'), F('Direction-changing or vertical nystagmus', 'against')],
      Labs: [],
      Imaging: [F('Neuroimaging generally unnecessary if exam typical')],
    },
  },
  {
    name: 'Vestibular neuritis / labyrinthitis',
    aliases: ['vestibular neuritis', 'labyrinthitis', 'vestibular neuronitis'],
    groups: {
      History: [F('Recent viral illness'), F('Acute onset over hours, then constant'), F('Days of continuous vertigo'), F('Hearing loss (labyrinthitis)')],
      Symptoms: [F('Continuous vertigo lasting days'), F('Nausea / vomiting'), F('Gait unsteadiness'), F('Hearing loss (labyrinthitis)'), F('Diplopia / dysarthria / weakness', 'against')],
      Exam: [F('Unidirectional horizontal nystagmus suppressed by fixation'), F('Abnormal head-impulse test (peripheral)'), F('Able to walk (though unsteady)'), F('Normal head-impulse test / direction-changing nystagmus (central)', 'against')],
      Labs: [],
      Imaging: [F('MRI if central features / HINTS concerning')],
    },
  },
  {
    name: "Ménière's disease",
    aliases: ["ménière's disease", 'menieres disease', 'meniere disease', 'meniere’s disease', 'endolymphatic hydrops'],
    groups: {
      History: [F('Recurrent discrete vertigo episodes (20 min–hours)'), F('Fluctuating hearing loss'), F('Aural fullness'), F('Prior similar episodes')],
      Symptoms: [F('Episodic vertigo lasting minutes to hours'), F('Unilateral hearing loss'), F('Tinnitus'), F('Ear fullness'), F('Continuous non-episodic vertigo', 'against')],
      Exam: [F('Sensorineural hearing loss on affected side'), F('Normal neurologic exam'), F('Nystagmus during acute episode')],
      Labs: [],
      Imaging: [F('MRI to exclude central cause if atypical')],
    },
  },

  // ── Syncope (reflex / orthostatic) ────────────────────────────────────────
  {
    name: 'Vasovagal syncope',
    aliases: ['vasovagal syncope', 'neurocardiogenic syncope', 'reflex syncope'],
    groups: {
      History: [F('Prolonged standing / heat / emotional trigger'), F('Prodrome of warmth, nausea, tunnel vision'), F('Rapid return to baseline'), F('Prior similar spells')],
      Symptoms: [F('Presyncopal prodrome (warmth, diaphoresis, nausea)'), F('Brief loss of consciousness'), F('Rapid recovery'), F('Exertional syncope', 'against'), F('Syncope without warning', 'against')],
      Exam: [F('Normal cardiovascular exam'), F('Normal neurologic exam'), F('Diaphoresis / pallor during spell')],
      Labs: [F('Normal hemoglobin')],
      Imaging: [F('Normal ECG'), F('Ischemia / conduction abnormality on ECG', 'against')],
    },
  },
  {
    name: 'Orthostatic hypotension',
    aliases: ['orthostatic hypotension', 'severe orthostatic hypotension', 'postural hypotension', 'medication-induced syncope'],
    groups: {
      History: [F('Symptoms on standing'), F('Volume depletion (bleeding, dehydration)'), F('Antihypertensive / diuretic / alpha-blocker use'), F('Autonomic dysfunction (diabetes, Parkinson)')],
      Symptoms: [F('Lightheadedness on standing'), F('Syncope after positional change'), F('Improvement when supine'), F('Exertional syncope', 'against')],
      Exam: [F('Orthostatic drop in blood pressure'), F('Compensatory tachycardia (or blunted, if autonomic)'), F('Signs of volume depletion')],
      Labs: [F('Anemia / GI blood loss'), F('Elevated BUN:Cr'), F('Electrolyte abnormality')],
      Imaging: [F('Normal ECG')],
    },
  },
  {
    name: 'Situational syncope',
    aliases: ['situational syncope'],
    groups: {
      History: [F('Syncope during cough, micturition, defecation, or swallowing'), F('Immediate recovery'), F('Reproducible trigger')],
      Symptoms: [F('Loss of consciousness tied to a specific maneuver'), F('Brief event with quick recovery'), F('Exertional syncope', 'against')],
      Exam: [F('Normal cardiovascular exam'), F('Normal neurologic exam')],
      Labs: [],
      Imaging: [F('Normal ECG')],
    },
  },
  {
    name: 'Carotid sinus hypersensitivity',
    aliases: ['carotid sinus hypersensitivity', 'carotid sinus syncope'],
    groups: {
      History: [F('Syncope with neck turning / tight collar / shaving'), F('Older patient'), F('Recurrent unexplained falls')],
      Symptoms: [F('Syncope triggered by neck pressure'), F('Brief loss of consciousness'), F('Rapid recovery')],
      Exam: [F('Symptomatic pause / BP drop with carotid sinus massage'), F('Normal baseline cardiovascular exam')],
      Labs: [],
      Imaging: [F('Sinus pause on monitoring during massage'), F('Normal ECG at baseline')],
    },
  },

  // ── Psych / functional ─────────────────────────────────────────────────────
  {
    name: 'Panic attack / anxiety',
    aliases: ['panic attack', 'panic attack / anxiety', 'panic disorder', 'anxiety disorder', 'anxiety/panic disorder', 'anxiety', 'hyperventilation', 'panic attack / anxiety disorder'],
    groups: {
      History: [F('Known anxiety / panic disorder'), F('Identifiable psychosocial stressor'), F('Prior identical episodes with negative workups'), F('Symptoms peak within minutes then resolve')],
      Symptoms: [F('Palpitations / chest tightness'), F('Shortness of breath / smothering feeling'), F('Perioral or digital paresthesias'), F('Sense of impending doom'), F('Exertional chest pain', 'against'), F('Syncope', 'against')],
      Exam: [F('Tachypnea / tachycardia that resolves with reassurance'), F('Nonfocal neurologic exam'), F('Benign cardiopulmonary exam'), F('Hypoxia', 'against')],
      Labs: [F('Negative troponin'), F('Respiratory alkalosis on VBG'), F('Elevated lactate or troponin', 'against')],
      Imaging: [F('Normal ECG'), F('Normal chest imaging')],
    },
  },
  {
    name: 'Psychogenic nonepileptic seizure',
    aliases: ['pseudoseizure (psychogenic non-epileptic seizure)', 'pseudoseizure', 'psychogenic nonepileptic seizure', 'pnes', 'non-epileptic seizure'],
    groups: {
      History: [F('Psychiatric history / prior trauma'), F('Events triggered by stress / with witnesses'), F('Prolonged episodes with fluctuating course'), F('No response to antiepileptics')],
      Symptoms: [F('Convulsive-appearing episode'), F('Preserved awareness during bilateral movements'), F('Rapid return to baseline (no true postictal)'), F('Tongue-tip rather than lateral biting')],
      Exam: [F('Asynchronous / side-to-side movements'), F('Resisted eye opening / eye closure'), F('No true postictal confusion'), F('Preserved reflexes'), F('Lateral tongue laceration / incontinence', 'against')],
      Labs: [F('Normal post-event lactate'), F('Normal prolactin'), F('Elevated lactate after event', 'against')],
      Imaging: [F('Normal EEG during a captured event'), F('Normal neuroimaging')],
    },
  },
  {
    name: 'Delirium',
    aliases: ['delirium', 'acute confusional state', 'encephalopathy'],
    groups: {
      History: [F('Acute onset over hours to days'), F('Underlying infection / metabolic trigger'), F('New medication / polypharmacy'), F('Older age / baseline dementia'), F('Fluctuating course')],
      Symptoms: [F('Waxing and waning confusion'), F('Disorientation'), F('Hallucinations'), F('Sleep-wake disruption')],
      Exam: [F('Inattention / fluctuating alertness'), F('Disorganized thinking'), F('Altered level of consciousness'), F('Findings of an underlying cause (infection, etc.)')],
      Labs: [F('Leukocytosis / positive infectious workup'), F('Electrolyte or glucose derangement'), F('Elevated ammonia / abnormal LFTs'), F('Toxicology / drug levels')],
      Imaging: [F('CT head for focal deficit or trauma'), F('Infectious source on imaging')],
    },
  },
  {
    name: 'Dementia',
    aliases: ['dementia', 'major neurocognitive disorder', 'alzheimer disease'],
    groups: {
      History: [F('Gradual progressive cognitive decline over months–years'), F('Functional decline (ADLs)'), F('Stable baseline without acute change'), F('Superimposed acute change (suggests delirium)', 'against')],
      Symptoms: [F('Memory impairment'), F('Word-finding / language difficulty'), F('Getting lost / executive dysfunction'), F('Preserved alertness and attention')],
      Exam: [F('Impaired cognition with preserved attention'), F('Normal level of consciousness'), F('Nonfocal neurologic exam'), F('Fluctuating attention (favors delirium)', 'against')],
      Labs: [F('Reversible-cause workup (B12, TSH, metabolic)')],
      Imaging: [F('Atrophy / chronic changes on neuroimaging'), F('Acute intracranial process', 'against')],
    },
  },
  {
    name: 'Intoxication',
    aliases: ['intoxication', 'drug overdose/intoxication', 'acute intoxication', 'alcohol intoxication', 'substance intoxication'],
    groups: {
      History: [F('Known substance use / access'), F('Witnessed ingestion'), F('Empty pill bottles / paraphernalia'), F('Co-ingestion possible')],
      Symptoms: [F('Altered mental status'), F('Slurred speech'), F('Nausea / vomiting'), F('Behavioral change')],
      Exam: [F('Toxidrome (pupils, skin, vitals) recognized'), F('Depressed or agitated sensorium'), F('Nystagmus / ataxia'), F('Focal neurologic deficit', 'against')],
      Labs: [F('Positive toxicology / measured drug level'), F('Elevated osmolar or anion gap (toxic alcohols)'), F('Elevated ethanol level'), F('Acetaminophen / salicylate level')],
      Imaging: [F('ECG for conduction effects (QRS/QT)'), F('CT head if trauma or not improving')],
    },
  },
  {
    name: 'Substance withdrawal',
    aliases: ['withdrawal', 'alcohol withdrawal', 'substance withdrawal', 'benzodiazepine withdrawal', 'opioid withdrawal'],
    groups: {
      History: [F('Chronic alcohol / sedative / opioid use'), F('Recent cessation or dose reduction'), F('Prior withdrawal seizures / DTs'), F('Timeline consistent with last use')],
      Symptoms: [F('Tremor / anxiety'), F('Nausea / vomiting'), F('Diaphoresis'), F('Hallucinations'), F('Seizure')],
      Exam: [F('Tachycardia / hypertension'), F('Tremor / diaphoresis'), F('Agitation / hyperreflexia'), F('Disorientation (DTs)'), F('Pupillary changes / piloerection (opioid)')],
      Labs: [F('Electrolyte / magnesium derangement'), F('Elevated / declining ethanol level'), F('Metabolic abnormalities')],
      Imaging: [],
    },
  },
  {
    name: 'Traumatic brain injury',
    aliases: ['traumatic brain injury', 'tbi', 'concussion', 'head injury', 'post-traumatic seizure'],
    groups: {
      History: [F('Recent head trauma'), F('Loss of consciousness / amnesia'), F('Anticoagulant use'), F('Post-traumatic seizure'), F('Dangerous mechanism')],
      Symptoms: [F('Headache'), F('Confusion / amnesia'), F('Vomiting'), F('Dizziness'), F('Progressive drowsiness')],
      Exam: [F('Depressed GCS'), F('Focal neurologic deficit'), F('Signs of skull fracture (Battle sign, raccoon eyes)'), F('Scalp hematoma / laceration'), F('Nonfocal exam with GCS 15', 'against')],
      Labs: [F('Coagulopathy / supratherapeutic INR')],
      Imaging: [F('Intracranial hemorrhage / fracture on CT head'), F('Normal non-contrast CT head', 'against')],
    },
  },
  {
    name: 'Chronic pain / fibromyalgia',
    aliases: ['fibromyalgia', 'chronic fatigue syndrome', 'chronic pain syndrome', 'myalgic encephalomyelitis'],
    groups: {
      History: [F('Chronic widespread pain / fatigue > 3 months'), F('Nonrestorative sleep'), F('Multiple prior negative workups'), F('Associated mood disorder')],
      Symptoms: [F('Diffuse musculoskeletal pain'), F('Fatigue'), F('Cognitive "fog"'), F('Focal weakness or objective deficit', 'against')],
      Exam: [F('Multiple tender points'), F('Normal strength and reflexes'), F('Nonfocal neurologic exam'), F('Objective weakness or atrophy', 'against')],
      Labs: [F('Normal inflammatory markers'), F('Normal CK / TSH'), F('Abnormal inflammatory or muscle labs', 'against')],
      Imaging: [F('Unremarkable imaging')],
    },
  },
  {
    name: 'Depression',
    aliases: ['depression', 'major depressive disorder', 'depressive disorder'],
    groups: {
      History: [F('Depressed mood / anhedonia ≥ 2 weeks'), F('Sleep and appetite change'), F('Psychosocial stressors'), F('Prior depression / psychiatric history')],
      Symptoms: [F('Fatigue / low energy'), F('Poor concentration'), F('Feelings of worthlessness'), F('Suicidal ideation'), F('Focal neurologic symptoms', 'against')],
      Exam: [F('Flat / depressed affect'), F('Psychomotor slowing'), F('Nonfocal neurologic exam')],
      Labs: [F('Screen for organic mimics (TSH, CBC, metabolic)')],
      Imaging: [],
    },
  },
  {
    name: 'Peripheral neuropathy',
    aliases: ['peripheral neuropathy', 'polyneuropathy', 'diabetic neuropathy'],
    groups: {
      History: [F('Diabetes / alcohol use'), F('Chronic gradually progressive symptoms'), F('B12 deficiency / chemotherapy'), F('Symmetric distal onset')],
      Symptoms: [F('Distal "stocking-glove" numbness / tingling'), F('Burning dysesthesias'), F('Gradual progression'), F('Acute ascending weakness', 'against')],
      Exam: [F('Distal sensory loss'), F('Diminished ankle reflexes'), F('Distal > proximal weakness'), F('Preserved central / cranial nerve function')],
      Labs: [F('Elevated HbA1c'), F('Low B12'), F('Abnormal TSH')],
      Imaging: [],
    },
  },
  {
    name: 'Viral illness',
    aliases: ['viral illness', 'viral syndrome', 'nonspecific viral infection'],
    groups: {
      History: [F('Sick contacts'), F('Recent URI symptoms'), F('Self-limited course'), F('Seasonal / community outbreak')],
      Symptoms: [F('Malaise / fatigue'), F('Myalgias'), F('Low-grade fever'), F('Sore throat / cough / congestion'), F('Focal severe pain or neurologic deficit', 'against')],
      Exam: [F('Nontoxic appearance'), F('Mild diffuse findings'), F('No focal source'), F('Toxic appearance / hemodynamic instability', 'against')],
      Labs: [F('Normal or mildly abnormal labs'), F('Lymphocyte-predominant count'), F('Marked leukocytosis / bandemia', 'against')],
      Imaging: [F('No focal findings on imaging')],
    },
  },

  // ── Respiratory / URI ──────────────────────────────────────────────────────
  {
    name: 'Influenza',
    aliases: ['influenza', 'flu', 'influenza-like illness'],
    groups: {
      History: [F('Flu season / community outbreak'), F('Sick contacts'), F('Unvaccinated'), F('Abrupt onset')],
      Symptoms: [F('Abrupt high fever'), F('Myalgias'), F('Headache'), F('Cough / sore throat'), F('Profound fatigue')],
      Exam: [F('Fever'), F('Toxic-but-nonfocal appearance'), F('Pharyngeal erythema'), F('Clear lungs (unless complicated)')],
      Labs: [F('Positive influenza PCR / antigen'), F('Leukopenia or normal WBC')],
      Imaging: [F('Clear CXR'), F('Focal consolidation suggesting bacterial pneumonia', 'against')],
    },
  },
  {
    name: 'Viral upper respiratory infection',
    aliases: ['viral upper respiratory infection', 'viral uri', 'common cold', 'upper respiratory infection', 'uri'],
    groups: {
      History: [F('Gradual onset over days'), F('Sick contacts'), F('Self-limited prior episodes'), F('No focal severe symptoms')],
      Symptoms: [F('Nasal congestion / rhinorrhea'), F('Sore throat'), F('Cough'), F('Low-grade fever'), F('High fever with toxicity', 'against')],
      Exam: [F('Nasal congestion / clear rhinorrhea'), F('Mild pharyngeal erythema'), F('Clear lungs'), F('Nontoxic appearance'), F('Focal consolidation / hypoxia', 'against')],
      Labs: [],
      Imaging: [F('Imaging not indicated in uncomplicated cases')],
    },
  },
  {
    name: 'Pulmonary hypertension',
    aliases: ['pulmonary hypertension', 'pulmonary arterial hypertension', 'cor pulmonale'],
    groups: {
      History: [F('Progressive exertional dyspnea'), F('Known connective tissue disease / chronic PE / left heart disease'), F('Chronic lung disease'), F('Exertional syncope')],
      Symptoms: [F('Exertional dyspnea'), F('Fatigue'), F('Exertional chest pain / syncope'), F('Lower extremity edema')],
      Exam: [F('Loud P2 / right-sided S3'), F('Elevated JVP'), F('Right ventricular heave'), F('Peripheral edema / ascites')],
      Labs: [F('Elevated BNP'), F('Hypoxia')],
      Imaging: [F('RV strain / right axis deviation on ECG'), F('Enlarged pulmonary arteries / RV on echo or CT'), F('Elevated estimated PA pressure on echo')],
    },
  },
  {
    name: 'Croup',
    aliases: ['croup', 'laryngotracheobronchitis'],
    groups: {
      History: [F('Child 6 months–3 years'), F('Preceding URI'), F('Symptoms worse at night'), F('Barky cough')],
      Symptoms: [F('Barking / seal-like cough'), F('Inspiratory stridor'), F('Hoarse voice'), F('Low-grade fever'), F('Drooling / toxic appearance', 'against')],
      Exam: [F('Inspiratory stridor (worse when agitated)'), F('Barky cough'), F('Suprasternal retractions'), F('Nontoxic appearance'), F('Drooling / tripoding', 'against')],
      Labs: [],
      Imaging: [F('Steeple sign on neck X-ray (if obtained)'), F('Thumbprint sign (favors epiglottitis)', 'against')],
    },
  },
  {
    name: 'Bronchiolitis',
    aliases: ['bronchiolitis', 'rsv bronchiolitis'],
    groups: {
      History: [F('Infant < 2 years'), F('Winter / RSV season'), F('Preceding URI'), F('Poor feeding')],
      Symptoms: [F('Cough / congestion'), F('Wheezing'), F('Increased work of breathing'), F('Poor feeding'), F('Apnea (young infants)')],
      Exam: [F('Diffuse wheezes / crackles'), F('Tachypnea and retractions'), F('Nasal flaring'), F('Hypoxia'), F('Focal consolidation', 'against')],
      Labs: [F('RSV / respiratory viral panel positive')],
      Imaging: [F('Hyperinflation / peribronchial thickening on CXR'), F('Focal lobar consolidation', 'against')],
    },
  },
  {
    name: 'Otitis media',
    aliases: ['otitis media', 'acute otitis media', 'ear infection'],
    groups: {
      History: [F('Young child'), F('Recent URI'), F('Ear pulling / irritability'), F('Fever')],
      Symptoms: [F('Ear pain'), F('Fever'), F('Irritability / poor sleep'), F('Decreased hearing'), F('Ear drainage (perforation)')],
      Exam: [F('Bulging, erythematous tympanic membrane'), F('Decreased TM mobility on pneumatic otoscopy'), F('Middle-ear effusion'), F('Postauricular swelling / erythema (mastoiditis)', 'against')],
      Labs: [],
      Imaging: [],
    },
  },
  {
    name: 'Streptococcal pharyngitis',
    aliases: ['streptococcal pharyngitis', 'strep throat', 'group a strep pharyngitis', 'bacterial pharyngitis'],
    groups: {
      History: [F('Sudden sore throat without cough'), F('Sick contacts / school exposure'), F('Fever'), F('Age 5–15')],
      Symptoms: [F('Sore throat / odynophagia'), F('Fever'), F('Absence of cough'), F('Headache / abdominal pain (children)'), F('Cough / rhinorrhea / conjunctivitis', 'against')],
      Exam: [F('Tonsillar exudates'), F('Tender anterior cervical lymphadenopathy'), F('Fever'), F('Palatal petechiae'), F('Scarlatiniform rash'), F('Ulcers / viral exanthem', 'against')],
      Labs: [F('Positive rapid strep / throat culture'), F('Negative rapid strep and culture', 'against')],
      Imaging: [],
    },
  },
  {
    name: 'Viral pharyngitis',
    aliases: ['viral pharyngitis', 'pharyngitis', 'sore throat (viral)'],
    groups: {
      History: [F('Gradual onset with URI symptoms'), F('Sick contacts'), F('Cough and rhinorrhea present'), F('Self-limited prior episodes')],
      Symptoms: [F('Sore throat'), F('Cough / rhinorrhea'), F('Hoarseness'), F('Conjunctivitis'), F('Tonsillar exudates with high fever and no cough', 'against')],
      Exam: [F('Pharyngeal erythema without exudate'), F('Rhinorrhea / cough'), F('Oral ulcers / viral exanthem'), F('Nontoxic appearance')],
      Labs: [F('Negative rapid strep')],
      Imaging: [],
    },
  },
  {
    name: 'Infectious mononucleosis',
    aliases: ['mononucleosis', 'mono', 'ebv', 'epstein-barr virus', 'infectious mononucleosis'],
    groups: {
      History: [F('Adolescent / young adult'), F('Prolonged sore throat and fatigue'), F('Close contact exposure'), F('Symptoms > 1 week')],
      Symptoms: [F('Severe sore throat'), F('Profound fatigue'), F('Fever'), F('Rash after amoxicillin')],
      Exam: [F('Tonsillar enlargement with exudates'), F('Posterior cervical lymphadenopathy'), F('Splenomegaly'), F('Palatal petechiae')],
      Labs: [F('Positive heterophile / Monospot'), F('Atypical lymphocytosis'), F('Elevated transaminases'), F('Positive EBV serologies')],
      Imaging: [F('Splenomegaly on US (return-to-play / rupture risk)')],
    },
  },
  {
    name: 'Oropharyngeal candidiasis',
    aliases: ['fungal infections (e.g., candida)', 'oral candidiasis', 'thrush', 'candida', 'oropharyngeal candidiasis'],
    groups: {
      History: [F('Inhaled / systemic steroid use'), F('Recent antibiotics'), F('Immunocompromise / HIV'), F('Diabetes'), F('Denture use')],
      Symptoms: [F('Sore mouth / throat'), F('Altered taste'), F('Odynophagia (esophageal involvement)'), F('White patches in mouth')],
      Exam: [F('White plaques that scrape off leaving erythema'), F('Angular cheilitis'), F('Erythematous mucosa')],
      Labs: [F('Pseudohyphae on KOH of scraping'), F('Consider HIV testing if unexplained')],
      Imaging: [],
    },
  },
  {
    name: 'Allergic rhinitis / postnasal drip',
    aliases: ['allergic rhinitis with post-nasal drip', 'allergic rhinitis', 'chronic sinusitis with post-nasal drip', 'post-nasal drip', 'postnasal drip'],
    groups: {
      History: [F('Seasonal / allergen-triggered symptoms'), F('Atopy / asthma / eczema'), F('Itchy eyes and nose'), F('Chronic recurrent pattern')],
      Symptoms: [F('Nasal congestion / rhinorrhea'), F('Postnasal drip / throat clearing'), F('Sneezing'), F('Itchy watery eyes'), F('High fever / toxicity', 'against')],
      Exam: [F('Pale, boggy nasal turbinates'), F('Clear rhinorrhea'), F('Cobblestoning of posterior pharynx'), F('Allergic shiners')],
      Labs: [],
      Imaging: [],
    },
  },
  {
    name: 'Obstructive sleep apnea',
    aliases: ['obstructive sleep apnea', 'osa', 'sleep apnea'],
    groups: {
      History: [F('Loud snoring / witnessed apneas'), F('Obesity / large neck circumference'), F('Daytime somnolence'), F('Morning headaches')],
      Symptoms: [F('Excessive daytime sleepiness'), F('Nonrestorative sleep'), F('Morning headache'), F('Nocturnal gasping')],
      Exam: [F('Obesity / crowded oropharynx (high Mallampati)'), F('Large neck circumference'), F('Hypertension'), F('Signs of right heart strain (advanced)')],
      Labs: [F('Polycythemia (chronic hypoxia)'), F('Elevated bicarbonate (hypoventilation)')],
      Imaging: [],
    },
  },

  // ── Dermatology ────────────────────────────────────────────────────────────
  {
    name: 'Stevens-Johnson syndrome / TEN',
    aliases: ['stevens-johnson syndrome (sjs)', 'stevens-johnson syndrome', 'sjs', 'toxic epidermal necrolysis (ten)', 'toxic epidermal necrolysis', 'ten', 'sjs/ten'],
    groups: {
      History: [F('New high-risk drug in prior 1–4 weeks'), F('Antibiotics / anticonvulsants / allopurinol / NSAIDs'), F('Prodrome of fever and malaise'), F('Painful skin')],
      Symptoms: [F('Painful / burning skin'), F('Fever'), F('Painful mouth and eyes'), F('Dysuria (mucosal involvement)')],
      Exam: [F('Mucosal erosions (≥ 2 sites)'), F('Targetoid lesions / dusky macules'), F('Skin sloughing / positive Nikolsky sign'), F('Body surface area of detachment'), F('Ocular involvement')],
      Labs: [F('Electrolyte / fluid derangement'), F('Leukopenia'), F('Elevated inflammatory markers')],
      Imaging: [],
    },
  },
  {
    name: 'Urticaria',
    aliases: ['urticaria', 'hives', 'acute urticaria'],
    groups: {
      History: [F('New food / drug / infection trigger'), F('Recurrent transient wheals'), F('Personal / family atopy'), F('Individual lesions last < 24 h')],
      Symptoms: [F('Intensely itchy wheals'), F('Lesions that migrate / resolve within hours'), F('Angioedema (lips, eyes)'), F('Throat tightness / wheeze / hypotension', 'against')],
      Exam: [F('Raised, blanching, well-circumscribed wheals'), F('Dermatographism'), F('Angioedema without airway compromise'), F('Stridor / wheeze / hypotension', 'against')],
      Labs: [],
      Imaging: [],
    },
  },
  {
    name: 'Contact dermatitis',
    aliases: ['contact dermatitis', 'allergic contact dermatitis', 'irritant dermatitis'],
    groups: {
      History: [F('Exposure to irritant / allergen (plants, metals, cosmetics)'), F('Rash localized to contact area'), F('New product / occupational exposure'), F('Recurrent with re-exposure')],
      Symptoms: [F('Itchy rash'), F('Burning / stinging'), F('Rash confined to exposed skin'), F('Fever / systemic symptoms', 'against')],
      Exam: [F('Erythema / vesicles in a geometric or exposure pattern'), F('Sharp demarcation at contact border'), F('Lichenification (chronic)'), F('Mucosal involvement', 'against')],
      Labs: [],
      Imaging: [],
    },
  },
  {
    name: 'Eczema (atopic dermatitis)',
    aliases: ['eczema', 'atopic dermatitis', 'dermatitis'],
    groups: {
      History: [F('History of atopy (asthma, allergic rhinitis)'), F('Chronic relapsing course'), F('Worse in winter / with irritants'), F('Family history of atopy')],
      Symptoms: [F('Intense itching'), F('Dry scaly skin'), F('Recurrent flares'), F('Sleep disturbance from itch')],
      Exam: [F('Erythematous scaly plaques in flexural areas'), F('Excoriations / lichenification'), F('Xerosis'), F('Signs of secondary infection (impetiginization)')],
      Labs: [],
      Imaging: [],
    },
  },
  {
    name: 'Drug eruption',
    aliases: ['drug eruption', 'morbilliform drug rash', 'exanthematous drug eruption', 'maculopapular drug rash'],
    groups: {
      History: [F('New drug within prior 1–2 weeks'), F('Antibiotics / anticonvulsants common'), F('Generalized symmetric rash'), F('Mild pruritus')],
      Symptoms: [F('Diffuse itchy rash'), F('Low-grade fever'), F('Mucosal pain / skin sloughing', 'against'), F('Facial edema / lymphadenopathy (DRESS)', 'against')],
      Exam: [F('Symmetric blanching maculopapular eruption on trunk'), F('No mucosal involvement'), F('Negative Nikolsky sign'), F('Skin detachment / mucosal erosions', 'against')],
      Labs: [F('Eosinophilia'), F('Elevated transaminases (DRESS)', 'against')],
      Imaging: [],
    },
  },
  {
    name: 'Impetigo',
    aliases: ['impetigo', 'bullous impetigo'],
    groups: {
      History: [F('Young child'), F('Warm humid climate / crowding'), F('Preceding minor skin breach'), F('Contagious spread among contacts')],
      Symptoms: [F('Localized crusting sores'), F('Mild itching'), F('Usually afebrile'), F('Systemic toxicity', 'against')],
      Exam: [F('Honey-colored crusted lesions'), F('Perioral / perinasal distribution'), F('Bullae (bullous form)'), F('Regional lymphadenopathy')],
      Labs: [],
      Imaging: [],
    },
  },
  {
    name: 'Pityriasis rosea',
    aliases: ['pityriasis rosea'],
    groups: {
      History: [F('Preceding "herald patch"'), F('Young adult'), F('Recent viral illness'), F('Self-limited over weeks')],
      Symptoms: [F('Single larger patch, then generalized eruption'), F('Mild itching'), F('No systemic symptoms')],
      Exam: [F('Herald patch'), F('Salmon-colored oval plaques in "Christmas-tree" pattern'), F('Collarette scale'), F('Truncal distribution sparing face'), F('Palms/soles involved (consider secondary syphilis)', 'against')],
      Labs: [F('RPR if atypical (r/o secondary syphilis)')],
      Imaging: [],
    },
  },
  {
    name: 'Psoriasis',
    aliases: ['psoriasis', 'plaque psoriasis'],
    groups: {
      History: [F('Chronic recurrent plaques'), F('Family history of psoriasis'), F('Associated joint pain (psoriatic arthritis)'), F('Triggers (stress, strep, medications)')],
      Symptoms: [F('Scaly plaques'), F('Itching'), F('Joint pain / stiffness'), F('Nail changes')],
      Exam: [F('Well-demarcated plaques with silvery scale'), F('Extensor surface / scalp distribution'), F('Auspitz sign (pinpoint bleeding)'), F('Nail pitting / onycholysis')],
      Labs: [],
      Imaging: [],
    },
  },
  {
    name: 'Tinea corporis',
    aliases: ['tinea corporis', 'ringworm', 'dermatophyte infection'],
    groups: {
      History: [F('Contact with infected person / animal'), F('Warm humid environment / sweating'), F('Athletic contact sports'), F('Slowly enlarging lesion')],
      Symptoms: [F('Itchy ring-shaped rash'), F('Slowly enlarging annular lesion')],
      Exam: [F('Annular plaque with raised scaly border and central clearing'), F('Well-demarcated edge'), F('Positive KOH')],
      Labs: [F('Hyphae on KOH prep')],
      Imaging: [],
    },
  },
  {
    name: 'Scabies',
    aliases: ['scabies', 'sarcoptes scabiei'],
    groups: {
      History: [F('Close contacts with similar itch'), F('Institutional / crowded living'), F('Itching worse at night'), F('Weeks of progressive itching')],
      Symptoms: [F('Intense nocturnal itching'), F('Rash in web spaces / wrists / genitals'), F('Contacts similarly affected')],
      Exam: [F('Burrows in finger webs / flexor wrists'), F('Excoriated papules'), F('Genital / periumbilical involvement'), F('Crusted (Norwegian) scabies if immunocompromised')],
      Labs: [F('Mite / eggs on skin scraping')],
      Imaging: [],
    },
  },
  {
    name: 'Viral exanthem',
    aliases: ['viral exanthem', 'viral rash', 'roseola', 'measles', 'nonspecific viral exanthem'],
    groups: {
      History: [F('Preceding / concurrent viral symptoms'), F('Sick contacts'), F('Child or young adult'), F('Fever then rash (roseola)'), F('Immunization status')],
      Symptoms: [F('Diffuse rash with viral prodrome'), F('Low-grade fever'), F('Mild itching'), F('Toxic appearance / hemodynamic instability', 'against')],
      Exam: [F('Blanching maculopapular / morbilliform rash'), F('Associated enanthem'), F('Nontoxic appearance'), F('Koplik spots (measles)'), F('Petechial / purpuric non-blanching rash', 'against')],
      Labs: [F('Viral studies if specific pathogen suspected')],
      Imaging: [],
    },
  },
  {
    name: 'Substance-induced palpitations',
    aliases: ['substance use (e.g., caffeine, cocaine)', 'stimulant use', 'caffeine', 'cocaine', 'sympathomimetic toxicity'],
    groups: {
      History: [F('Caffeine / energy drink / stimulant use'), F('Cocaine or amphetamine use'), F('Decongestant or performance supplement use'), F('Temporal link to ingestion')],
      Symptoms: [F('Palpitations'), F('Anxiety / restlessness'), F('Tremor'), F('Chest tightness'), F('Diaphoresis')],
      Exam: [F('Tachycardia / hypertension'), F('Mydriasis'), F('Diaphoresis / hyperthermia'), F('Agitation')],
      Labs: [F('Positive toxicology screen'), F('Normal electrolytes')],
      Imaging: [F('Sinus tachycardia on ECG'), F('Ischemic changes (cocaine)')],
    },
  },
  {
    name: 'Mitral valve prolapse',
    aliases: ['mitral valve prolapse', 'mvp'],
    groups: {
      History: [F('Young, often thin patient'), F('Atypical chest pain and palpitations'), F('Family history of MVP'), F('Connective tissue features')],
      Symptoms: [F('Palpitations'), F('Atypical chest pain'), F('Anxiety'), F('Lightheadedness'), F('Exertional pressure with diaphoresis', 'against')],
      Exam: [F('Mid-systolic click'), F('Late systolic murmur'), F('Click moves with maneuvers')],
      Labs: [F('Negative troponin')],
      Imaging: [F('Leaflet prolapse on echo'), F('Normal ECG')],
    },
  },
  {
    name: 'Intussusception',
    aliases: ['intussusception'],
    groups: {
      History: [F('Child 6 months–3 years'), F('Recent viral illness'), F('Intermittent episodes of drawing up legs'), F('Currant-jelly stool')],
      Symptoms: [F('Intermittent, colicky abdominal pain'), F('Vomiting'), F('Bloody / currant-jelly stool'), F('Lethargy between episodes')],
      Exam: [F('Sausage-shaped RUQ mass'), F('Lethargy / altered mental status'), F('Guaiac-positive stool'), F('Signs of peritonitis (late)')],
      Labs: [F('Leukocytosis'), F('Elevated lactate (ischemia)')],
      Imaging: [F('Target / doughnut sign on US'), F('Reduction with air/contrast enema'), F('Normal bowel on US', 'against')],
    },
  },
];

// ── Generic fallback ───────────────────────────────────────────────────────
// Any diagnosis not in the curated library still gets a usable scaffold so the
// tool works universally.
function genericGroups(name) {
  return {
    History: [F('Consistent risk factors / past history'), F('Compatible time course of illness'), F('Prior similar episodes')],
    Symptoms: [F('Characteristic symptom pattern'), F('Associated symptoms present'), F('Atypical / inconsistent features', 'against')],
    Exam: [F('Supportive physical exam findings'), F('Reassuring / benign exam', 'against')],
    Labs: [F('Supportive laboratory findings'), F('Unremarkable relevant labs', 'against')],
    Imaging: [F('Confirmatory imaging findings'), F('Negative / normal imaging', 'against')],
  };
}

// ── Lookup ─────────────────────────────────────────────────────────────────
function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')      // drop parentheticals
    .replace(/[^a-z0-9]+/g, ' ')      // punctuation -> space
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Editable override layer (admin) ─────────────────────────────────────────
// The LIBRARY above is the version-controlled source of truth. The admin view
// edits an OVERRIDE layer stored in localStorage, which is merged on top of the
// built-ins at runtime — so the running MDM Writer reflects edits immediately,
// with no rebuild. Export from the admin view to promote edits into LIBRARY.
//
// Override shape (keyed by a stable id):
//   built-in edit : overrides[builtinId] = { name, aliases, groups }
//   hidden builtin: overrides[builtinId] = { deleted: true }
//   new condition : overrides['custom:<slug>'] = { name, aliases, groups }
const OVERRIDE_KEY = 'emtools.mdm.libraryOverrides.v1';

// Stable id for a built-in entry (its normalized canonical name).
const builtinId = name => normalize(name);
const BUILTIN_IDS = new Set(LIBRARY.map(e => builtinId(e.name)));

function loadOverrides() {
  try {
    const raw = localStorage.getItem(OVERRIDE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch { return {}; }
}
let overrides = loadOverrides();

function persistOverrides() {
  try { localStorage.setItem(OVERRIDE_KEY, JSON.stringify(overrides)); }
  catch { /* storage unavailable */ }
}

// Subscribers (React components) are notified whenever the library changes.
// `snapshotCache` keeps getEditableLibrary() referentially stable between
// notifications, as useSyncExternalStore requires.
const listeners = new Set();
let snapshotCache = null;
export function subscribeLibrary(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function notify() { snapshotCache = null; rebuildIndex(); for (const fn of listeners) fn(); }

// Normalize an entry to the canonical { name, aliases, groups } shape.
function cleanEntry(entry = {}) {
  const groups = {};
  for (const g of GROUP_ORDER) {
    const list = Array.isArray(entry.groups?.[g]) ? entry.groups[g] : [];
    groups[g] = list
      .map(f => ({ label: String(f?.label || '').trim(), dir: f?.dir === 'against' ? 'against' : 'for' }))
      .filter(f => f.label);
  }
  const aliases = Array.isArray(entry.aliases)
    ? entry.aliases.map(a => String(a || '').trim()).filter(Boolean)
    : [];
  return { name: String(entry.name || '').trim(), aliases, groups };
}

// Shared overrides published to the database and loaded for every user. Applied
// beneath the local (personal) layer so a clinician's own edits always win.
let remoteOverrides = {};
export function applyRemoteOverrides(map) {
  remoteOverrides = (map && typeof map === 'object') ? map : {};
  notify();
}

// The effective library merges three layers by id, with precedence
// local (personal) > remote (shared) > built-in. Each row carries flags:
//   builtin — a shipped diagnosis   edited — has a LOCAL override
//   shared  — shown from the shared library (no local override)
function effectiveLibrary() {
  const out = [];
  const builtinById = new Map(LIBRARY.map(e => [builtinId(e.name), e]));
  const ids = new Set([
    ...builtinById.keys(),
    ...Object.keys(remoteOverrides),
    ...Object.keys(overrides),
  ]);
  for (const id of ids) {
    const isBuiltin = builtinById.has(id);
    const local = overrides[id];
    const remote = remoteOverrides[id];
    const chosen = local !== undefined ? local : remote;   // local personal edit wins
    if (chosen?.deleted) continue;
    let entry;
    if (chosen) entry = cleanEntry(chosen);
    else if (isBuiltin) entry = builtinById.get(id);
    else continue;
    out.push({
      id, builtin: isBuiltin,
      edited: local !== undefined,
      shared: local === undefined && remote !== undefined,
      ...entry,
    });
  }
  return out;
}

// Precompute a normalized index: every canonical name + alias -> entry.
let INDEX = [];
function rebuildIndex() {
  const idx = [];
  for (const entry of effectiveLibrary()) {
    const keys = new Set([normalize(entry.name), ...entry.aliases.map(normalize)]);
    for (const k of keys) if (k) idx.push({ key: k, entry });
  }
  // Longer keys first so "acute coronary syndrome" wins over "acs" on ties.
  idx.sort((a, b) => b.key.length - a.key.length);
  INDEX = idx;
}
rebuildIndex();

// Return { matched, groups } for a diagnosis name. Never throws.
export function getFeatureSet(diagnosisName) {
  const norm = normalize(diagnosisName);
  if (!norm) return { matched: false, groups: genericGroups(diagnosisName) };

  // 1) exact normalized match
  for (const { key, entry } of INDEX) {
    if (key === norm) return { matched: true, name: entry.name, groups: entry.groups };
  }
  // 2) whole-phrase containment either direction (word-boundary aware)
  for (const { key, entry } of INDEX) {
    if (key.length < 3) continue;
    const kWords = ` ${norm} `;
    if (kWords.includes(` ${key} `) || ` ${key} `.includes(` ${norm} `)) {
      return { matched: true, name: entry.name, groups: entry.groups };
    }
  }
  // 3) fallback scaffold
  return { matched: false, groups: genericGroups(diagnosisName) };
}

// ── Admin CRUD ───────────────────────────────────────────────────────────────
// The full effective library, sorted, for the admin editor. Cached so repeated
// calls return the same reference until the library changes (notify() clears it).
export function getEditableLibrary() {
  if (!snapshotCache) snapshotCache = effectiveLibrary().sort((a, b) => a.name.localeCompare(b.name));
  return snapshotCache;
}

// A blank condition scaffold (used by "add condition on the fly").
export function blankDiagnosis() {
  return { id: null, builtin: false, edited: false, name: '', aliases: [], groups: emptyGroups() };
}
export function emptyGroups() {
  return Object.fromEntries(GROUP_ORDER.map(g => [g, []]));
}

// Insert or update a condition. Pass the existing id when editing; omit for a
// new condition (an id is derived — matching a built-in name edits that
// built-in). Returns the id written.
export function saveDiagnosis(id, entry) {
  const clean = cleanEntry(entry);
  if (!clean.name) throw new Error('Diagnosis name is required');
  let key = id;
  if (!key) {
    const bId = builtinId(clean.name);
    key = BUILTIN_IDS.has(bId) ? bId : `custom:${bId || Date.now().toString(36)}`;
  }
  overrides[key] = clean;
  persistOverrides();
  notify();
  return key;
}

// Remove a condition: tombstone a built-in (hide it) or drop a custom entry.
export function deleteDiagnosis(id) {
  if (!id) return;
  if (BUILTIN_IDS.has(id)) overrides[id] = { deleted: true };
  else delete overrides[id];
  persistOverrides();
  notify();
}

// Revert a condition to its built-in default (or remove a custom entry).
export function resetDiagnosis(id) {
  if (!id) return;
  delete overrides[id];
  persistOverrides();
  notify();
}

// Drop all admin edits, restoring the shipped library.
export function resetAllOverrides() {
  overrides = {};
  persistOverrides();
  notify();
}

export function hasOverrides() {
  return Object.keys(overrides).length > 0;
}

// Export / import the override layer as JSON (for backup or sharing).
export function exportOverrides() {
  return JSON.stringify(overrides, null, 2);
}
export function importOverrides(json, { merge = false } = {}) {
  const parsed = typeof json === 'string' ? JSON.parse(json) : json;
  if (!parsed || typeof parsed !== 'object') throw new Error('Invalid overrides file');
  overrides = merge ? { ...overrides, ...parsed } : parsed;
  persistOverrides();
  notify();
}

// Emit the edited / new conditions as pasteable mdmFeatures.js source, so the
// admin can promote local edits into the committed LIBRARY.
export function exportChangedAsCode() {
  const changed = effectiveLibrary().filter(e => e.edited);
  if (!changed.length) return '// No local edits to export.';
  const fmt = f => (f.dir === 'against' ? `F(${JSON.stringify(f.label)}, 'against')` : `F(${JSON.stringify(f.label)})`);
  const entry = e => {
    const groups = GROUP_ORDER.map(g => `      ${g}: [${(e.groups[g] || []).map(fmt).join(', ')}],`).join('\n');
    return `  {\n    name: ${JSON.stringify(e.name)},\n    aliases: ${JSON.stringify(e.aliases)},\n    groups: {\n${groups}\n    },\n  },`;
  };
  return `// Edited/new conditions — paste into the LIBRARY array in src/data/mdmFeatures.js\n${changed.map(entry).join('\n')}`;
}

// Attach a stable id to each feature for state keys.
export function featuresWithIds(groups) {
  const out = {};
  for (const group of GROUP_ORDER) {
    const list = groups[group] || [];
    out[group] = list.map((f, i) => ({ ...f, id: `${group}:${i}` }));
  }
  return out;
}

// ── Plan / order menus (Epic quick-order style) ────────────────────────────
// Medications are grouped the way an EM clinician reasons about treatment:
// analgesia, fluids, antiemetics, sedation, and antimicrobials each get their
// own quick-order group, then labs, imaging, procedures, consults, and dispo.
export const PLAN_MENU = {
  Analgesia: [
    'Acetaminophen (Tylenol)', 'NSAIDs', 'Opioid analgesia', 'Nerve block',
    'Dental pain cocktail', 'Headache cocktail', 'Abdominal pain cocktail',
    'Neuropathic pain cocktail', 'MSK/axial back pain cocktail',
  ],
  'IV Fluids': [
    'NS bolus', 'LR bolus', 'Maintenance IV fluids',
  ],
  Antiemetics: [
    'Ondansetron', 'Metoclopramide', 'Prochlorperazine', 'Promethazine',
  ],
  Sedation: [
    'Lorazepam', 'Midazolam', 'Ketamine', 'Haloperidol', 'Droperidol',
  ],
  Antimicrobials: [
    'Trimethoprim-sulfamethoxazole (Bactrim)', 'Amoxicillin-clavulanate',
    'Azithromycin', 'Cephalexin', 'Doxycycline', 'Metronidazole',
    'Cephalosporin', 'Ceftriaxone', 'Vancomycin',
  ],
  Labs: [
    'CBC', 'BMP', 'CMP', 'Troponin', 'BNP', 'D-dimer', 'Lipase', 'LFTs',
    'Coags (PT/INR/PTT)', 'VBG', 'Lactate', 'Blood cultures x2', 'Urinalysis',
    'Urine hCG', 'Serum hCG', 'Type & screen', 'Procalcitonin', 'Ammonia',
  ],
  Imaging: [],   // entered via the modality menus below (IMAGING_SIMPLE / IMAGING_GROUPS)
  Procedures: [
    'Procedural sedation', 'Laceration repair', 'Incision & drainage',
    'Fracture/dislocation reduction', 'Splinting/immobilization', 'Lumbar puncture',
    'Central line', 'Arterial line', 'Chest tube / thoracostomy', 'Paracentesis',
    'Foley catheter', 'Cardioversion',
  ],
  Consults: [
    'Cardiology', 'Cardiothoracic surgery', 'Vascular surgery', 'General surgery',
    'Trauma surgery', 'Orthopedics', 'Neurology', 'Neurosurgery', 'OB/GYN',
    'Gastroenterology', 'Nephrology', 'Urology', 'ENT', 'Ophthalmology',
    'Pulmonology', 'Infectious disease', 'Hematology/Oncology', 'Psychiatry',
    'Toxicology', 'Critical care', 'Interventional radiology',
  ],
  Disposition: [
    'Plan to admit to floor', 'Plan to admit to telemetry', 'Plan to admit to ICU',
    'Plan for ED observation', 'Plan to discharge home',
    'Plan to transfer to higher level of care', 'Disposition pending workup',
  ],
};

export const PLAN_ORDER = [
  'Analgesia', 'IV Fluids', 'Antiemetics', 'Sedation', 'Antimicrobials',
  'Labs', 'Imaging', 'Procedures', 'Consults', 'Disposition',
];

// Imaging is entered through expandable modality menus rather than one long
// chip list: a few one-click studies, plus X-ray / CT / Ultrasound groups whose
// sub-options each add a specific order string (e.g. "X-ray wrist") to
// plan.Imaging. `format` maps a sub-option to the order text stored on the plan.
export const IMAGING_SIMPLE = ['ECG', 'MRI brain', 'CTA head/neck'];

export const IMAGING_GROUPS = [
  {
    label: 'X-ray',
    format: part => `X-ray ${part}`,
    options: [
      'clavicle', 'shoulder', 'humerus', 'elbow', 'forearm', 'wrist', 'hand',
      'fingers', 'pelvis', 'hip', 'femur', 'knee', 'tibia/fibula', 'ankle',
      'foot', 'toes', 'cervical spine', 'soft-tissue neck', 'chest',
      'abdomen (KUB)', 'thoracic spine', 'lumbar spine',
    ],
  },
  {
    label: 'CT',
    format: order => order,
    options: [
      'CT head without contrast', 'CT head with contrast',
      'CT chest without contrast', 'CT chest with contrast',
      'CT abdomen without contrast', 'CT abdomen with contrast',
      'CT pelvis without contrast', 'CT pelvis with contrast',
      'CT abdomen/pelvis with contrast', 'CTA chest (PE protocol)', 'CTA aorta',
    ],
  },
  {
    label: 'Ultrasound',
    format: type => `US — ${type}`,
    options: [
      'cardiac echo (POCUS)', 'lung (POCUS)', 'IVC', 'kidney', 'retroperitoneum',
      'pelvis (transabdominal)', 'RUQ', 'FAST', 'aorta', 'DVT',
    ],
  },
];

// Validated decision instruments; documenting their use is creditable cognitive
// work that is almost never captured in a note.
export const RISK_CALCULATORS = [
  'HEART score', 'PERC rule', 'Wells (PE)', 'Wells (DVT)', 'PECARN',
  'Canadian CT Head', 'NEXUS', 'Canadian C-spine', 'Ottawa ankle',
  'Ottawa knee', 'PSI/PORT', 'NIHSS', 'Alvarado', 'Centor/McIsaac',
];

// Study types offered for an independent-interpretation "my read" (Data Cat 2).
export const INTERP_STUDIES = ['ECG', 'Chest X-ray', 'CT', 'Ultrasound', 'X-ray', 'Rhythm strip'];

// Common non-identifying comorbidities for the one-liner (never PHI).
export const COMMON_PMH = [
  'HTN', 'HLD', 'DM2', 'CAD', 'CHF', 'COPD', 'asthma', 'CKD', 'ESRD',
  'atrial fibrillation', 'prior VTE', 'active malignancy', 'cirrhosis',
  'immunocompromise', 'prior stroke', 'seizure disorder',
];
