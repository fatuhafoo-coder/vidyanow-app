export const COMMISSION = 0.2; // platform keeps 20%, tutor gets 80%
export const DEFAULT_CATALOG: Record<string, { subjects: Record<string, number> }> = {
  "Class 1-5 (Primary)": { subjects: { "All Subjects": 250, "Basic Mathematics": 200, "English Phonics": 190, "EVS / General Science": 190, Hindi: 180 } },
  "Class 6-8 (Middle School)": { subjects: { Mathematics: 290, "General Science": 280, "Social Studies": 260, "English Grammar": 250, Hindi: 230 } },
  "Class 9-10 (High School)": { subjects: { Mathematics: 340, Physics: 330, Chemistry: 330, Biology: 310, "Social Science": 295, English: 285 } },
  "Class 11-12 (Science)": { subjects: { "Physics (JEE/NEET)": 460, "Chemistry (Org/Inorg)": 440, "Mathematics (Calculus/Algebra)": 460, "Biology (Botany/Zoology)": 430, "Computer Science (Python)": 490 } },
  "Class 11-12 (Commerce)": { subjects: { Accountancy: 430, Economics: 390, "Business Studies": 370, "Applied Mathematics": 410 } },
  "B.Tech / Engineering": { subjects: { "Engineering Mathematics": 550, "Basic Electrical & Electronics": 500, "Data Structures & Algorithms": 600, "Object Oriented Programming": 550 } },
  "BCA / Computer Science": { subjects: { "Python Programming": 520, "Java Programming & OOPs": 500, "Web Development": 550, "DBMS (SQL)": 480 } },
};
export type Catalog = typeof DEFAULT_CATALOG;
// One shared price rule, used by the student app (admin edits the same catalog)
export const calcPrice = (cat: Catalog, cls: string, subs: string[], hrs: number) => {
  const sum = subs.reduce((a, s) => a + (cat[cls]?.subjects[s] ?? 300), 0);
  return Math.round((subs.length > 1 ? sum * 0.85 : sum) * hrs);
};
