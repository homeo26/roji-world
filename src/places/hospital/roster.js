// Sunny Hill Hospital: the doctor's tools, what can be wrong, and the patients.
// Shared by the hospital rooms (src/places/hospital/interior.js) and Patient Rounds (src/arena/patients.js).

export const TOOLS = [
  { id: 'stethoscope', name: 'Stethoscope' },
  { id: 'thermometer', name: 'Thermometer' },
  { id: 'bandage', name: 'Bandage' },
  { id: 'medicine', name: 'Medicine' },
  { id: 'icepack', name: 'Ice pack' },
  { id: 'light', name: 'Throat light' },
  { id: 'splint', name: 'Splint' },
  { id: 'tweezers', name: 'Tweezers' },
];

// line: what the patient says. hint: Dr. Roji's gentle nudge after a wrong tool ({n} is the name).
// thanks: what the patient says when better. part: where the tool goes.
export const SYMPTOMS = {
  fever: { tool: 'thermometer', part: 'mouth', line: 'I feel hot and wobbly.', hint: '{n} feels very warm. What tells us the temperature?', thanks: 'I feel cool again!' },
  cough: { tool: 'stethoscope', part: 'chest', line: 'Cough, cough! My chest is rumbly.', hint: 'Let us listen to that rumbly chest.', thanks: 'My chest feels happy now!' },
  knee: { tool: 'bandage', part: 'knee', line: 'I fell off my bike. My knee stings.', hint: 'That scrape needs a soft cover.', thanks: 'It does not sting anymore!' },
  tummy: { tool: 'medicine', part: 'mouth', line: 'My tummy hurts.', hint: 'A spoon of tummy medicine could help {n}.', thanks: 'My tummy feels better!' },
  sneeze: { tool: 'medicine', part: 'mouth', line: 'Achoo! I cannot stop sneezing.', hint: 'Some sneeze syrup would help {n}.', thanks: 'No more achoos!' },
  bump: { tool: 'icepack', part: 'head', line: 'I bumped my head. Look, a bump!', hint: 'Something cold makes a bump smaller.', thanks: 'The bump is going away!' },
  throat: { tool: 'light', part: 'mouth', line: 'My throat feels scratchy.', hint: 'Let us look inside. Say ahh!', thanks: 'Ahh, that is much better!' },
  wrist: { tool: 'splint', part: 'wrist', line: 'I twisted my wrist at football.', hint: 'That wrist needs something to keep it still.', thanks: 'My wrist feels safe now!' },
  splinter: { tool: 'tweezers', part: 'finger', line: 'Ouch! A splinter in my finger.', hint: 'Something tiny needs pulling out, very gently.', thanks: 'It is out! Thank you!' },
};

const kid = (o) => ({ gender: 'girl', skin: '#f8dccb', hair: '#4a2c1a', hairstyle: 'bob', outfit: 'tee-pants', top: '#c7a6ff', bottom: '#c7a6ff', shoes: '#ffffff', accent: '#ffd166', ...o });

// The three patients in the hospital beds. gown: pyjama colours they wear in bed.
export const WARD = [
  { id: 'lina', name: 'Lina', symptom: 'fever', room: 1, blanket: '#ffb3c7', look: kid({ name: 'Lina', hair: '#2a1a13', hairstyle: 'buns', top: '#ffd1dc', bottom: '#ffd1dc', accent: '#ff7fa3' }) },
  { id: 'yousef', name: 'Yousef', symptom: 'wrist', room: 2, blanket: '#9fe0c8', look: kid({ name: 'Yousef', gender: 'boy', skin: '#e3b08e', hair: '#141010', hairstyle: 'curly', top: '#b8e6ff', bottom: '#b8e6ff' }) },
  { id: 'sami', name: 'Grandpa Sami', symptom: 'cough', room: 3, blanket: '#ffe08a', grown: true, glasses: true, moustache: true, look: kid({ name: 'Grandpa Sami', gender: 'boy', skin: '#f2cdb4', hair: '#e9e4de', hairstyle: 'sidepart', top: '#c9e7d6', bottom: '#c9e7d6' }) },
];

// More patients who come in during a shift.
export const VISITORS = [
  { id: 'nour', name: 'Nour', symptom: 'knee', look: kid({ name: 'Nour', hair: '#7a4a26', hairstyle: 'pigtails', outfit: 'overalls', top: '#ffd166', bottom: '#6fb8ff', accent: '#ef5b6f' }) },
  { id: 'adam', name: 'Adam', symptom: 'splinter', look: kid({ name: 'Adam', gender: 'boy', hair: '#4a2c1a', hairstyle: 'spiky', outfit: 'tee-shorts', top: '#3fbf7f', bottom: '#2c3e66' }) },
  { id: 'mira', name: 'Mira', symptom: 'throat', look: kid({ name: 'Mira', skin: '#c98f68', hair: '#141010', hairstyle: 'ponytail', outfit: 'skirt', top: '#8b5cf6', bottom: '#ff9eb5', accent: '#ffd166' }) },
  { id: 'zaid', name: 'Zaid', symptom: 'bump', look: kid({ name: 'Zaid', gender: 'boy', skin: '#e3b08e', hair: '#2a1a13', hairstyle: 'short', outfit: 'hoodie', top: '#f08a5d', bottom: '#3b2b3f' }) },
  { id: 'huda', name: 'Auntie Huda', symptom: 'tummy', grown: true, look: kid({ name: 'Auntie Huda', skin: '#f2cdb4', hair: '#2a1a13', hairstyle: 'long', outfit: 'dress', top: '#21a99a', bottom: '#21a99a', accent: '#ffd166', shoes: '#7a2e3a' }) },
  { id: 'leo', name: 'Leo', symptom: 'sneeze', look: kid({ name: 'Leo', gender: 'boy', skin: '#fbe6d8', hair: '#e3c07a', hairstyle: 'sidepart', outfit: 'overalls', top: '#ffffff', bottom: '#3f7bf0' }) },
  { id: 'salma', name: 'Salma', symptom: 'fever', look: kid({ name: 'Salma', skin: '#9c6a4a', hair: '#141010', hairstyle: 'pigtails', outfit: 'dress', top: '#7fd3a7', bottom: '#7fd3a7', accent: '#ffffff' }) },
  { id: 'omar', name: 'Omar', symptom: 'cough', look: kid({ name: 'Omar', gender: 'boy', skin: '#c98f68', hair: '#141010', hairstyle: 'curly', outfit: 'tee-pants', top: '#ef5b6f', bottom: '#2c3e66' }) },
  { id: 'rana', name: 'Rana', symptom: 'wrist', look: kid({ name: 'Rana', skin: '#f2cdb4', hair: '#b5773d', hairstyle: 'long', outfit: 'tee-shorts', top: '#6fb8ff', bottom: '#ffffff', accent: '#ff7fa3' }) },
];

export const PATIENTS = [...WARD, ...VISITORS];
export const patientById = (id) => PATIENTS.find((p) => p.id === id) || null;

// The people who work at the front desk and wait in the waiting room.
export const STAFF = {
  maya: { id: 'maya', name: 'Maya', look: kid({ name: 'Maya', skin: '#e3b08e', hair: '#2a1a13', hairstyle: 'ponytail', outfit: 'tee-pants', top: '#7fd8bf', bottom: '#5cc4a8', shoes: '#ffffff', accent: '#ffffff' }) },
};
