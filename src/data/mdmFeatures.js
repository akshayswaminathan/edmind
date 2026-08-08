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

// Precompute a normalized index: every canonical name + alias -> entry.
const INDEX = [];
for (const entry of LIBRARY) {
  const keys = new Set([normalize(entry.name), ...entry.aliases.map(normalize)]);
  for (const k of keys) {
    if (k) INDEX.push({ key: k, entry });
  }
}
// Longer keys first so "acute coronary syndrome" wins over "acs" on ties.
INDEX.sort((a, b) => b.key.length - a.key.length);

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
// Deliberately broad — categories over specific orders, no doses. The MDM
// records the class of intervention; the actual order lives in Epic.
export const PLAN_MENU = {
  Medications: [
    'Non-opioid analgesia', 'Opioid-based pain management', 'IV fluids',
    'Antiemetics', 'Aspirin', 'Nitroglycerin', 'Anticoagulation',
    'Antibiotics', 'Bronchodilators', 'Corticosteroids', 'Antihypertensives',
    'Insulin / glucose management', 'GI cocktail / acid suppression',
    'Anxiolytic / sedation', 'Anticoagulation reversal',
  ],
  Labs: [
    'CBC', 'BMP / CMP', 'Troponin', 'BNP', 'D-dimer', 'Coags', 'LFTs',
    'Lipase', 'VBG / lactate', 'Blood cultures', 'Urinalysis', 'hCG',
    'Type & screen', 'Procalcitonin',
  ],
  Imaging: [
    'ECG', 'X-ray (chest)', 'X-ray (extremity)', 'X-ray (abdomen)',
    'CT (head)', 'CT (chest)', 'CT (abdomen/pelvis)', 'CT angiography',
    'Ultrasound (bedside)', 'Ultrasound (formal)', 'MRI',
  ],
  Procedures: [
    'Procedural sedation', 'Laceration repair', 'Incision & drainage',
    'Fracture/dislocation reduction', 'Splinting', 'Lumbar puncture',
    'Central line', 'Chest tube', 'Cardioversion',
  ],
  Consults: [
    'Cardiology', 'Surgery', 'Vascular surgery', 'OB/GYN', 'Neurology',
    'Gastroenterology', 'Nephrology', 'Psychiatry', 'Critical care',
  ],
  Disposition: [
    'Admit', 'Admit to telemetry', 'Admit to ICU', 'ED observation',
    'Discharge home', 'Transfer', 'Awaiting workup',
  ],
};

export const PLAN_ORDER = ['Medications', 'Labs', 'Imaging', 'Procedures', 'Consults', 'Disposition'];

// Validated decision instruments; documenting their use is creditable and
// almost never captured (design brief P5 / FAQ #12).
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
