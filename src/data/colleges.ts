import type { College, ApplicationOption } from "@/lib/college-types";
import { COLLEGE_EXTENDED_DATA, COLLEGE_ALIASES } from "./college-extended";
import { CDS_DATA } from "./cds-data";

// UNDO [application-plan]: rename RAW_COLLEGES back to `export const COLLEGES`
// and delete the UNDO block at the bottom of this file.
const RAW_COLLEGES: College[] = [
  // ── Ivy League ──────────────────────────────────────────────────────────────
  { name: "Harvard University", state: "MA", type: "private", size: "medium", setting: "urban", acceptanceRate: 3, avgGPAUW: 3.95, avgGPAW: 4.50, sat25: 1480, sat75: 1580, act25: 34, act75: 36, testPolicy: "required", topMajors: ["Economics", "Computer Science", "Political Science"], competitiveMajors: [], tags: [], usNewsRank: 3, region: "Northeast" },
  { name: "Yale University", state: "CT", type: "private", size: "medium", setting: "urban", acceptanceRate: 4, avgGPAUW: 3.95, avgGPAW: 4.50, sat25: 1470, sat75: 1570, act25: 34, act75: 36, testPolicy: "required", topMajors: ["Economics", "Political Science", "History"], competitiveMajors: [], tags: [], usNewsRank: 5, region: "Northeast" },
  { name: "Princeton University", state: "NJ", type: "private", size: "medium", setting: "suburban", acceptanceRate: 4, avgGPAUW: 3.95, avgGPAW: 4.50, sat25: 1490, sat75: 1580, act25: 34, act75: 36, testPolicy: "required", topMajors: ["Computer Science", "Economics", "Engineering"], competitiveMajors: [], tags: [], usNewsRank: 1, region: "Northeast" },
  { name: "Columbia University", state: "NY", type: "private", size: "medium", setting: "urban", acceptanceRate: 4, avgGPAUW: 3.93, avgGPAW: 4.48, sat25: 1470, sat75: 1570, act25: 34, act75: 36, testPolicy: "required", topMajors: ["Computer Science", "Economics", "Political Science"], competitiveMajors: [], tags: [], usNewsRank: 3, region: "Northeast" },
  { name: "University of Pennsylvania", state: "PA", type: "private", size: "medium", setting: "urban", acceptanceRate: 5, avgGPAUW: 3.93, avgGPAW: 4.48, sat25: 1460, sat75: 1570, act25: 34, act75: 35, testPolicy: "required", topMajors: ["Business", "Economics", "Biology"], competitiveMajors: [], tags: [], usNewsRank: 6, region: "Northeast" },
  { name: "Brown University", state: "RI", type: "private", size: "medium", setting: "urban", acceptanceRate: 5, avgGPAUW: 3.92, avgGPAW: 4.47, sat25: 1440, sat75: 1560, act25: 33, act75: 35, testPolicy: "optional", topMajors: ["Computer Science", "Economics", "Biology"], competitiveMajors: [], tags: [], usNewsRank: 9, region: "Northeast" },
  { name: "Dartmouth College", state: "NH", type: "private", size: "small", setting: "rural", acceptanceRate: 6, avgGPAUW: 3.90, avgGPAW: 4.45, sat25: 1440, sat75: 1560, act25: 33, act75: 35, testPolicy: "required", topMajors: ["Economics", "Computer Science", "Engineering"], competitiveMajors: [], tags: [], usNewsRank: 9, region: "Northeast" },
  { name: "Cornell University", state: "NY", type: "private", size: "large", setting: "rural", acceptanceRate: 7, avgGPAUW: 3.90, avgGPAW: 4.45, sat25: 1420, sat75: 1550, act25: 33, act75: 35, testPolicy: "required", topMajors: ["Engineering", "Business", "Biology"], competitiveMajors: [], tags: [], usNewsRank: 11, region: "Northeast" },

  // ── Top Privates ────────────────────────────────────────────────────────────
  { name: "MIT", state: "MA", type: "private", size: "medium", setting: "urban", acceptanceRate: 4, avgGPAUW: 3.96, avgGPAW: 4.51, sat25: 1510, sat75: 1580, act25: 35, act75: 36, testPolicy: "required", topMajors: ["Computer Science", "Engineering", "Mathematics"], competitiveMajors: [], tags: [], usNewsRank: 2, region: "Northeast" },
  { name: "Stanford University", state: "CA", type: "private", size: "medium", setting: "suburban", acceptanceRate: 4, avgGPAUW: 3.95, avgGPAW: 4.50, sat25: 1470, sat75: 1570, act25: 34, act75: 36, testPolicy: "required", topMajors: ["Computer Science", "Engineering", "Biology"], competitiveMajors: [], tags: [], usNewsRank: 3, region: "West" },
  { name: "Duke University", state: "NC", type: "private", size: "medium", setting: "suburban", acceptanceRate: 6, avgGPAUW: 3.92, avgGPAW: 4.47, sat25: 1450, sat75: 1570, act25: 34, act75: 36, testPolicy: "optional", topMajors: ["Computer Science", "Economics", "Biology"], competitiveMajors: [], tags: [], usNewsRank: 7, region: "Southeast" },
  { name: "Northwestern University", state: "IL", type: "private", size: "medium", setting: "suburban", acceptanceRate: 7, avgGPAUW: 3.90, avgGPAW: 4.45, sat25: 1430, sat75: 1550, act25: 33, act75: 35, testPolicy: "optional", topMajors: ["Economics", "Communications", "Engineering"], competitiveMajors: [], tags: [], usNewsRank: 9, region: "Midwest" },
  { name: "Johns Hopkins University", state: "MD", type: "private", size: "medium", setting: "urban", acceptanceRate: 7, avgGPAUW: 3.90, avgGPAW: 4.45, sat25: 1440, sat75: 1560, act25: 34, act75: 35, testPolicy: "optional", topMajors: ["Biology", "Pre-Med", "Engineering"], competitiveMajors: [], tags: [], usNewsRank: 9, region: "Northeast" },
  { name: "Caltech", state: "CA", type: "private", size: "small", setting: "suburban", acceptanceRate: 3, avgGPAUW: 3.97, avgGPAW: 4.52, sat25: 1530, sat75: 1580, act25: 35, act75: 36, testPolicy: "required", topMajors: ["Physics", "Engineering", "Computer Science"], competitiveMajors: [], tags: [], usNewsRank: 6, region: "West" },
  { name: "Rice University", state: "TX", type: "private", size: "small", setting: "urban", acceptanceRate: 8, avgGPAUW: 3.90, avgGPAW: 4.45, sat25: 1430, sat75: 1560, act25: 33, act75: 35, testPolicy: "optional", topMajors: ["Engineering", "Computer Science", "Biology"], competitiveMajors: [], tags: [], usNewsRank: 15, region: "Southwest" },
  { name: "Vanderbilt University", state: "TN", type: "private", size: "medium", setting: "urban", acceptanceRate: 6, avgGPAUW: 3.90, avgGPAW: 4.45, sat25: 1440, sat75: 1560, act25: 33, act75: 35, testPolicy: "optional", topMajors: ["Economics", "Engineering", "Education"], competitiveMajors: [], tags: [], usNewsRank: 13, region: "Southeast" },
  { name: "Washington University in St. Louis", state: "MO", type: "private", size: "medium", setting: "suburban", acceptanceRate: 11, avgGPAUW: 3.88, avgGPAW: 4.38, sat25: 1430, sat75: 1550, act25: 33, act75: 35, testPolicy: "optional", topMajors: ["Business", "Biology", "Computer Science"], competitiveMajors: [], tags: [], usNewsRank: 15, region: "Midwest" },
  { name: "Emory University", state: "GA", type: "private", size: "medium", setting: "suburban", acceptanceRate: 11, avgGPAUW: 3.85, avgGPAW: 4.35, sat25: 1380, sat75: 1520, act25: 32, act75: 34, testPolicy: "optional", topMajors: ["Business", "Biology", "Psychology"], competitiveMajors: [], tags: [], usNewsRank: 24, region: "Southeast" },
  { name: "Georgetown University", state: "DC", type: "private", size: "medium", setting: "urban", acceptanceRate: 12, avgGPAUW: 3.88, avgGPAW: 4.38, sat25: 1380, sat75: 1530, act25: 32, act75: 35, testPolicy: "optional", topMajors: ["Political Science", "Business", "Economics"], competitiveMajors: [], tags: [], usNewsRank: 22, region: "Northeast" },
  { name: "Carnegie Mellon University", state: "PA", type: "private", size: "medium", setting: "urban", acceptanceRate: 11, avgGPAUW: 3.88, avgGPAW: 4.38, sat25: 1430, sat75: 1560, act25: 33, act75: 35, testPolicy: "optional", topMajors: ["Computer Science", "Engineering", "Business"], competitiveMajors: [], tags: [], usNewsRank: 21, region: "Northeast" },
  { name: "University of Notre Dame", state: "IN", type: "private", size: "medium", setting: "suburban", acceptanceRate: 13, avgGPAUW: 3.87, avgGPAW: 4.37, sat25: 1380, sat75: 1530, act25: 32, act75: 35, testPolicy: "optional", topMajors: ["Business", "Economics", "Political Science"], competitiveMajors: [], tags: [], usNewsRank: 18, region: "Midwest" },
  { name: "University of Southern California", state: "CA", type: "private", size: "large", setting: "urban", acceptanceRate: 12, avgGPAUW: 3.85, avgGPAW: 4.35, sat25: 1370, sat75: 1520, act25: 32, act75: 34, testPolicy: "optional", topMajors: ["Business", "Engineering", "Communications"], competitiveMajors: [], tags: [], usNewsRank: 24, region: "West" },
  { name: "Tufts University", state: "MA", type: "private", size: "medium", setting: "suburban", acceptanceRate: 10, avgGPAUW: 3.88, avgGPAW: 4.38, sat25: 1400, sat75: 1540, act25: 33, act75: 35, testPolicy: "optional", topMajors: ["Computer Science", "Economics", "Biology"], competitiveMajors: [], tags: [], usNewsRank: 24, region: "Northeast" },
  { name: "NYU", state: "NY", type: "private", size: "large", setting: "urban", acceptanceRate: 12, avgGPAUW: 3.80, avgGPAW: 4.30, sat25: 1350, sat75: 1510, act25: 31, act75: 34, testPolicy: "optional", topMajors: ["Business", "Economics", "Communications"], competitiveMajors: [], tags: [], usNewsRank: 27, region: "Northeast" },
  { name: "Boston College", state: "MA", type: "private", size: "medium", setting: "suburban", acceptanceRate: 16, avgGPAUW: 3.85, avgGPAW: 4.35, sat25: 1370, sat75: 1510, act25: 32, act75: 34, testPolicy: "optional", topMajors: ["Economics", "Business", "Biology"], competitiveMajors: [], tags: [], usNewsRank: 35, region: "Northeast" },
  { name: "Wake Forest University", state: "NC", type: "private", size: "medium", setting: "suburban", acceptanceRate: 21, avgGPAUW: 3.80, avgGPAW: 4.30, sat25: 1330, sat75: 1480, act25: 30, act75: 33, testPolicy: "optional", topMajors: ["Business", "Communications", "Biology"], competitiveMajors: [], tags: [], usNewsRank: 29, region: "Southeast" },
  { name: "Boston University", state: "MA", type: "private", size: "large", setting: "urban", acceptanceRate: 14, avgGPAUW: 3.78, avgGPAW: 4.23, sat25: 1350, sat75: 1500, act25: 31, act75: 34, testPolicy: "optional", topMajors: ["Business", "Communications", "Engineering"], competitiveMajors: [], tags: [], usNewsRank: 35, region: "Northeast" },
  { name: "Northeastern University", state: "MA", type: "private", size: "large", setting: "urban", acceptanceRate: 7, avgGPAUW: 3.85, avgGPAW: 4.35, sat25: 1390, sat75: 1530, act25: 33, act75: 35, testPolicy: "optional", topMajors: ["Computer Science", "Business", "Engineering"], competitiveMajors: [], tags: [], usNewsRank: 35, region: "Northeast" },
  { name: "Tulane University", state: "LA", type: "private", size: "medium", setting: "urban", acceptanceRate: 11, avgGPAUW: 3.75, avgGPAW: 4.20, sat25: 1310, sat75: 1470, act25: 30, act75: 33, testPolicy: "optional", topMajors: ["Business", "Biology", "Psychology"], competitiveMajors: [], tags: [], usNewsRank: 42, region: "Southeast" },
  { name: "Villanova University", state: "PA", type: "private", size: "medium", setting: "suburban", acceptanceRate: 23, avgGPAUW: 3.78, avgGPAW: 4.23, sat25: 1310, sat75: 1460, act25: 30, act75: 33, testPolicy: "optional", topMajors: ["Business", "Nursing", "Engineering"], competitiveMajors: [], tags: [], usNewsRank: 51, region: "Northeast" },
  { name: "Case Western Reserve University", state: "OH", type: "private", size: "medium", setting: "urban", acceptanceRate: 30, avgGPAUW: 3.78, avgGPAW: 4.23, sat25: 1330, sat75: 1490, act25: 31, act75: 34, testPolicy: "optional", topMajors: ["Engineering", "Biology", "Computer Science"], competitiveMajors: [], tags: [], usNewsRank: 42, region: "Midwest" },

  // ── Top Public / State Flagships ────────────────────────────────────────────
  { name: "UCLA", state: "CA", type: "public", size: "large", setting: "urban", acceptanceRate: 9, avgGPAUW: 3.90, avgGPAW: 4.45, sat25: 1290, sat75: 1500, act25: 30, act75: 34, testPolicy: "blind", topMajors: ["Biology", "Psychology", "Economics"], competitiveMajors: [], tags: [], usNewsRank: 15, region: "West" },
  { name: "UC Berkeley", state: "CA", type: "public", size: "large", setting: "urban", acceptanceRate: 11, avgGPAUW: 3.90, avgGPAW: 4.45, sat25: 1300, sat75: 1520, act25: 30, act75: 35, testPolicy: "blind", topMajors: ["Computer Science", "Engineering", "Economics"], competitiveMajors: [], tags: [], usNewsRank: 15, region: "West" },
  { name: "University of Michigan", state: "MI", type: "public", size: "large", setting: "suburban", acceptanceRate: 18, avgGPAUW: 3.85, avgGPAW: 4.35, sat25: 1350, sat75: 1510, act25: 32, act75: 34, testPolicy: "optional", topMajors: ["Business", "Engineering", "Computer Science"], competitiveMajors: [], tags: [], usNewsRank: 21, region: "Midwest" },
  { name: "University of Virginia", state: "VA", type: "public", size: "large", setting: "suburban", acceptanceRate: 19, avgGPAUW: 3.85, avgGPAW: 4.35, sat25: 1350, sat75: 1510, act25: 32, act75: 34, testPolicy: "optional", topMajors: ["Business", "Economics", "Biology"], competitiveMajors: [], tags: [], usNewsRank: 24, region: "Southeast" },
  { name: "UNC Chapel Hill", state: "NC", type: "public", size: "large", setting: "suburban", acceptanceRate: 17, avgGPAUW: 3.82, avgGPAW: 4.32, sat25: 1300, sat75: 1480, act25: 29, act75: 34, testPolicy: "optional", topMajors: ["Biology", "Business", "Communications"], competitiveMajors: [], tags: [], usNewsRank: 22, region: "Southeast" },
  { name: "Georgia Tech", state: "GA", type: "public", size: "large", setting: "urban", acceptanceRate: 17, avgGPAUW: 3.85, avgGPAW: 4.35, sat25: 1370, sat75: 1520, act25: 32, act75: 35, testPolicy: "optional", topMajors: ["Engineering", "Computer Science", "Business"], competitiveMajors: [], tags: [], usNewsRank: 27, region: "Southeast" },
  { name: "University of Florida", state: "FL", type: "public", size: "large", setting: "suburban", acceptanceRate: 23, avgGPAUW: 3.78, avgGPAW: 4.23, sat25: 1290, sat75: 1440, act25: 29, act75: 33, testPolicy: "optional", topMajors: ["Business", "Biology", "Engineering"], competitiveMajors: [], tags: [], usNewsRank: 27, region: "Southeast" },
  { name: "UT Austin", state: "TX", type: "public", size: "large", setting: "urban", acceptanceRate: 31, avgGPAUW: 3.75, avgGPAW: 4.20, sat25: 1230, sat75: 1450, act25: 27, act75: 33, testPolicy: "optional", topMajors: ["Business", "Engineering", "Computer Science"], competitiveMajors: [], tags: [], usNewsRank: 27, region: "Southwest" },
  { name: "University of Wisconsin-Madison", state: "WI", type: "public", size: "large", setting: "urban", acceptanceRate: 49, avgGPAUW: 3.75, avgGPAW: 4.20, sat25: 1270, sat75: 1440, act25: 28, act75: 32, testPolicy: "optional", topMajors: ["Computer Science", "Biology", "Economics"], competitiveMajors: [], tags: [], usNewsRank: 35, region: "Midwest" },
  { name: "University of Illinois Urbana-Champaign", state: "IL", type: "public", size: "large", setting: "urban", acceptanceRate: 45, avgGPAUW: 3.72, avgGPAW: 4.17, sat25: 1230, sat75: 1460, act25: 28, act75: 33, testPolicy: "optional", topMajors: ["Computer Science", "Engineering", "Business"], competitiveMajors: [], tags: [], usNewsRank: 35, region: "Midwest" },
  { name: "Ohio State University", state: "OH", type: "public", size: "large", setting: "urban", acceptanceRate: 53, avgGPAUW: 3.70, avgGPAW: 4.15, sat25: 1200, sat75: 1400, act25: 27, act75: 31, testPolicy: "optional", topMajors: ["Business", "Biology", "Psychology"], competitiveMajors: [], tags: [], usNewsRank: 42, region: "Midwest" },
  { name: "Penn State University", state: "PA", type: "public", size: "large", setting: "suburban", acceptanceRate: 55, avgGPAUW: 3.65, avgGPAW: 4.05, sat25: 1160, sat75: 1360, act25: 26, act75: 31, testPolicy: "optional", topMajors: ["Business", "Engineering", "Biology"], competitiveMajors: [], tags: [], usNewsRank: 60, region: "Northeast" },
  { name: "University of Washington", state: "WA", type: "public", size: "large", setting: "urban", acceptanceRate: 48, avgGPAUW: 3.75, avgGPAW: 4.20, sat25: 1220, sat75: 1420, act25: 28, act75: 33, testPolicy: "optional", topMajors: ["Computer Science", "Engineering", "Biology"], competitiveMajors: [], tags: [], usNewsRank: 40, region: "West" },
  { name: "Purdue University", state: "IN", type: "public", size: "large", setting: "suburban", acceptanceRate: 53, avgGPAUW: 3.65, avgGPAW: 4.05, sat25: 1180, sat75: 1410, act25: 26, act75: 32, testPolicy: "optional", topMajors: ["Engineering", "Computer Science", "Business"], competitiveMajors: [], tags: [], usNewsRank: 42, region: "Midwest" },
  { name: "University of Maryland", state: "MD", type: "public", size: "large", setting: "suburban", acceptanceRate: 45, avgGPAUW: 3.75, avgGPAW: 4.20, sat25: 1280, sat75: 1450, act25: 29, act75: 33, testPolicy: "optional", topMajors: ["Computer Science", "Engineering", "Business"], competitiveMajors: [], tags: [], usNewsRank: 42, region: "Northeast" },
  { name: "Virginia Tech", state: "VA", type: "public", size: "large", setting: "rural", acceptanceRate: 57, avgGPAUW: 3.68, avgGPAW: 4.08, sat25: 1180, sat75: 1370, act25: 26, act75: 31, testPolicy: "optional", topMajors: ["Engineering", "Computer Science", "Business"], competitiveMajors: [], tags: [], usNewsRank: 60, region: "Southeast" },
  { name: "Indiana University Bloomington", state: "IN", type: "public", size: "large", setting: "suburban", acceptanceRate: 80, avgGPAUW: 3.55, avgGPAW: 3.90, sat25: 1080, sat75: 1290, act25: 24, act75: 30, testPolicy: "optional", topMajors: ["Business", "Biology", "Communications"], competitiveMajors: [], tags: [], usNewsRank: 73, region: "Midwest" },
  { name: "UC San Diego", state: "CA", type: "public", size: "large", setting: "suburban", acceptanceRate: 24, avgGPAUW: 3.82, avgGPAW: 4.32, sat25: 1280, sat75: 1470, act25: 29, act75: 34, testPolicy: "blind", topMajors: ["Biology", "Computer Science", "Engineering"], competitiveMajors: [], tags: [], usNewsRank: 24, region: "West" },
  { name: "UC Davis", state: "CA", type: "public", size: "large", setting: "suburban", acceptanceRate: 37, avgGPAUW: 3.75, avgGPAW: 4.20, sat25: 1170, sat75: 1390, act25: 26, act75: 32, testPolicy: "blind", topMajors: ["Biology", "Engineering", "Psychology"], competitiveMajors: [], tags: [], usNewsRank: 42, region: "West" },
  { name: "UC Santa Barbara", state: "CA", type: "public", size: "large", setting: "suburban", acceptanceRate: 26, avgGPAUW: 3.78, avgGPAW: 4.23, sat25: 1220, sat75: 1430, act25: 27, act75: 33, testPolicy: "blind", topMajors: ["Economics", "Biology", "Communications"], competitiveMajors: [], tags: [], usNewsRank: 35, region: "West" },
  { name: "UC Irvine", state: "CA", type: "public", size: "large", setting: "suburban", acceptanceRate: 21, avgGPAUW: 3.78, avgGPAW: 4.23, sat25: 1200, sat75: 1410, act25: 27, act75: 33, testPolicy: "blind", topMajors: ["Biology", "Computer Science", "Business"], competitiveMajors: [], tags: [], usNewsRank: 33, region: "West" },
  { name: "University of Georgia", state: "GA", type: "public", size: "large", setting: "suburban", acceptanceRate: 43, avgGPAUW: 3.72, avgGPAW: 4.17, sat25: 1210, sat75: 1380, act25: 27, act75: 32, testPolicy: "optional", topMajors: ["Business", "Biology", "Psychology"], competitiveMajors: [], tags: [], usNewsRank: 47, region: "Southeast" },
  { name: "Clemson University", state: "SC", type: "public", size: "large", setting: "rural", acceptanceRate: 43, avgGPAUW: 3.68, avgGPAW: 4.08, sat25: 1200, sat75: 1370, act25: 27, act75: 32, testPolicy: "optional", topMajors: ["Engineering", "Business", "Biology"], competitiveMajors: [], tags: [], usNewsRank: 60, region: "Southeast" },
  { name: "University of Pittsburgh", state: "PA", type: "public", size: "large", setting: "urban", acceptanceRate: 57, avgGPAUW: 3.65, avgGPAW: 4.05, sat25: 1190, sat75: 1380, act25: 27, act75: 32, testPolicy: "optional", topMajors: ["Business", "Engineering", "Biology"], competitiveMajors: [], tags: [], usNewsRank: 60, region: "Northeast" },
  { name: "Michigan State University", state: "MI", type: "public", size: "large", setting: "suburban", acceptanceRate: 72, avgGPAUW: 3.55, avgGPAW: 3.90, sat25: 1100, sat75: 1300, act25: 24, act75: 30, testPolicy: "optional", topMajors: ["Business", "Engineering", "Biology"], competitiveMajors: [], tags: [], usNewsRank: 77, region: "Midwest" },
  { name: "University of Minnesota", state: "MN", type: "public", size: "large", setting: "urban", acceptanceRate: 60, avgGPAUW: 3.65, avgGPAW: 4.05, sat25: 1220, sat75: 1420, act25: 27, act75: 32, testPolicy: "optional", topMajors: ["Business", "Engineering", "Psychology"], competitiveMajors: [], tags: [], usNewsRank: 51, region: "Midwest" },
  { name: "Texas A&M University", state: "TX", type: "public", size: "large", setting: "suburban", acceptanceRate: 63, avgGPAUW: 3.62, avgGPAW: 4.02, sat25: 1130, sat75: 1350, act25: 25, act75: 31, testPolicy: "optional", topMajors: ["Engineering", "Business", "Biology"], competitiveMajors: [], tags: [], usNewsRank: 47, region: "Southwest" },
  { name: "University of Colorado Boulder", state: "CO", type: "public", size: "large", setting: "suburban", acceptanceRate: 80, avgGPAUW: 3.55, avgGPAW: 3.90, sat25: 1120, sat75: 1330, act25: 25, act75: 30, testPolicy: "optional", topMajors: ["Business", "Engineering", "Psychology"], competitiveMajors: [], tags: [], usNewsRank: 73, region: "West" },
  { name: "Arizona State University", state: "AZ", type: "public", size: "large", setting: "urban", acceptanceRate: 88, avgGPAUW: 3.45, avgGPAW: 3.75, sat25: 1060, sat75: 1280, act25: 22, act75: 28, testPolicy: "optional", topMajors: ["Business", "Engineering", "Computer Science"], competitiveMajors: [], tags: [], usNewsRank: 105, region: "Southwest" },
  { name: "University of Arizona", state: "AZ", type: "public", size: "large", setting: "urban", acceptanceRate: 87, avgGPAUW: 3.40, avgGPAW: 3.70, sat25: 1040, sat75: 1260, act25: 21, act75: 28, testPolicy: "optional", topMajors: ["Business", "Biology", "Psychology"], competitiveMajors: [], tags: [], usNewsRank: 105, region: "Southwest" },
  { name: "Rutgers University", state: "NJ", type: "public", size: "large", setting: "suburban", acceptanceRate: 66, avgGPAUW: 3.60, avgGPAW: 4.00, sat25: 1160, sat75: 1370, act25: 26, act75: 31, testPolicy: "optional", topMajors: ["Business", "Biology", "Computer Science"], competitiveMajors: [], tags: [], usNewsRank: 51, region: "Northeast" },
  { name: "University of Connecticut", state: "CT", type: "public", size: "large", setting: "rural", acceptanceRate: 56, avgGPAUW: 3.65, avgGPAW: 4.05, sat25: 1200, sat75: 1370, act25: 27, act75: 32, testPolicy: "optional", topMajors: ["Business", "Biology", "Engineering"], competitiveMajors: [], tags: [], usNewsRank: 58, region: "Northeast" },

  // ── Additional Top 100 (US News National Universities) ───────────────────
  { name: "University of Chicago", state: "IL", type: "private", size: "medium", setting: "urban", acceptanceRate: 5, avgGPAUW: 3.95, avgGPAW: 4.45, sat25: 1510, sat75: 1570, act25: 34, act75: 36, testPolicy: "optional", topMajors: ["Economics", "Mathematics", "Computer Science"], competitiveMajors: [], tags: [], usNewsRank: 6, region: "Midwest" },
  { name: "University of Rochester", state: "NY", type: "private", size: "medium", setting: "suburban", acceptanceRate: 39, avgGPAUW: 3.80, avgGPAW: 4.25, sat25: 1350, sat75: 1510, act25: 31, act75: 34, testPolicy: "optional", topMajors: ["Engineering", "Biology", "Economics"], competitiveMajors: [], tags: [], usNewsRank: 29, region: "Northeast" },
  { name: "College of William & Mary", state: "VA", type: "public", size: "medium", setting: "suburban", acceptanceRate: 33, avgGPAUW: 3.85, avgGPAW: 4.30, sat25: 1360, sat75: 1510, act25: 31, act75: 34, testPolicy: "optional", topMajors: ["Business", "Biology", "Psychology"], competitiveMajors: [], tags: [], usNewsRank: 32, region: "Southeast" },
  { name: "Brandeis University", state: "MA", type: "private", size: "small", setting: "suburban", acceptanceRate: 35, avgGPAUW: 3.80, avgGPAW: 4.25, sat25: 1350, sat75: 1500, act25: 31, act75: 34, testPolicy: "optional", topMajors: ["Biology", "Economics", "Computer Science"], competitiveMajors: [], tags: [], usNewsRank: 33, region: "Northeast" },
  { name: "Lehigh University", state: "PA", type: "private", size: "medium", setting: "suburban", acceptanceRate: 32, avgGPAUW: 3.75, avgGPAW: 4.20, sat25: 1330, sat75: 1490, act25: 30, act75: 34, testPolicy: "optional", topMajors: ["Engineering", "Business", "Biology"], competitiveMajors: [], tags: [], usNewsRank: 35, region: "Northeast" },
  { name: "Rensselaer Polytechnic Institute", state: "NY", type: "private", size: "medium", setting: "suburban", acceptanceRate: 47, avgGPAUW: 3.75, avgGPAW: 4.20, sat25: 1340, sat75: 1500, act25: 31, act75: 34, testPolicy: "optional", topMajors: ["Computer Science", "Engineering", "Information Technology"], competitiveMajors: [], tags: [], usNewsRank: 40, region: "Northeast" },
  { name: "Stony Brook University", state: "NY", type: "public", size: "large", setting: "suburban", acceptanceRate: 49, avgGPAUW: 3.70, avgGPAW: 4.15, sat25: 1280, sat75: 1450, act25: 28, act75: 33, testPolicy: "optional", topMajors: ["Biology", "Computer Science", "Psychology"], competitiveMajors: [], tags: [], usNewsRank: 41, region: "Northeast" },
  { name: "George Washington University", state: "DC", type: "private", size: "medium", setting: "urban", acceptanceRate: 49, avgGPAUW: 3.70, avgGPAW: 4.15, sat25: 1290, sat75: 1460, act25: 29, act75: 33, testPolicy: "optional", topMajors: ["Political Science", "International Relations", "Business"], competitiveMajors: [], tags: [], usNewsRank: 43, region: "Northeast" },
  { name: "Santa Clara University", state: "CA", type: "private", size: "medium", setting: "suburban", acceptanceRate: 49, avgGPAUW: 3.72, avgGPAW: 4.17, sat25: 1300, sat75: 1460, act25: 29, act75: 33, testPolicy: "optional", topMajors: ["Business", "Engineering", "Computer Science"], competitiveMajors: [], tags: [], usNewsRank: 44, region: "West" },
  { name: "Pepperdine University", state: "CA", type: "private", size: "small", setting: "suburban", acceptanceRate: 49, avgGPAUW: 3.72, avgGPAW: 4.17, sat25: 1280, sat75: 1450, act25: 29, act75: 33, testPolicy: "optional", topMajors: ["Business", "Communications", "Psychology"], competitiveMajors: [], tags: [], usNewsRank: 46, region: "West" },
  { name: "Syracuse University", state: "NY", type: "private", size: "large", setting: "urban", acceptanceRate: 54, avgGPAUW: 3.65, avgGPAW: 4.10, sat25: 1230, sat75: 1410, act25: 27, act75: 32, testPolicy: "optional", topMajors: ["Communications", "Business", "Engineering"], competitiveMajors: [], tags: [], usNewsRank: 47, region: "Northeast" },
  { name: "Fordham University", state: "NY", type: "private", size: "medium", setting: "urban", acceptanceRate: 46, avgGPAUW: 3.68, avgGPAW: 4.13, sat25: 1270, sat75: 1430, act25: 29, act75: 32, testPolicy: "optional", topMajors: ["Business", "Communications", "Political Science"], competitiveMajors: [], tags: [], usNewsRank: 49, region: "Northeast" },
  { name: "University of Iowa", state: "IA", type: "public", size: "large", setting: "urban", acceptanceRate: 84, avgGPAUW: 3.55, avgGPAW: 3.95, sat25: 1130, sat75: 1340, act25: 23, act75: 29, testPolicy: "optional", topMajors: ["Business", "Engineering", "Nursing"], competitiveMajors: [], tags: [], usNewsRank: 50, region: "Midwest" },
  { name: "Southern Methodist University", state: "TX", type: "private", size: "medium", setting: "suburban", acceptanceRate: 52, avgGPAUW: 3.65, avgGPAW: 4.10, sat25: 1270, sat75: 1430, act25: 29, act75: 32, testPolicy: "optional", topMajors: ["Business", "Engineering", "Communications"], competitiveMajors: [], tags: [], usNewsRank: 51, region: "Southwest" },
  { name: "University of Delaware", state: "DE", type: "public", size: "large", setting: "suburban", acceptanceRate: 68, avgGPAUW: 3.55, avgGPAW: 4.00, sat25: 1150, sat75: 1350, act25: 25, act75: 30, testPolicy: "optional", topMajors: ["Business", "Nursing", "Engineering"], competitiveMajors: [], tags: [], usNewsRank: 52, region: "Northeast" },
  { name: "Baylor University", state: "TX", type: "private", size: "large", setting: "suburban", acceptanceRate: 52, avgGPAUW: 3.60, avgGPAW: 4.05, sat25: 1210, sat75: 1380, act25: 27, act75: 32, testPolicy: "optional", topMajors: ["Business", "Biology", "Nursing"], competitiveMajors: [], tags: [], usNewsRank: 56, region: "Southwest" },
  { name: "University of South Carolina", state: "SC", type: "public", size: "large", setting: "urban", acceptanceRate: 68, avgGPAUW: 3.55, avgGPAW: 4.00, sat25: 1150, sat75: 1340, act25: 25, act75: 30, testPolicy: "optional", topMajors: ["Business", "Biology", "Engineering"], competitiveMajors: [], tags: [], usNewsRank: 57, region: "Southeast" },
  { name: "Marquette University", state: "WI", type: "private", size: "medium", setting: "urban", acceptanceRate: 75, avgGPAUW: 3.55, avgGPAW: 4.00, sat25: 1150, sat75: 1340, act25: 25, act75: 30, testPolicy: "optional", topMajors: ["Business", "Nursing", "Engineering"], competitiveMajors: [], tags: [], usNewsRank: 59, region: "Midwest" },
  { name: "University of South Florida", state: "FL", type: "public", size: "large", setting: "urban", acceptanceRate: 42, avgGPAUW: 3.65, avgGPAW: 4.10, sat25: 1200, sat75: 1370, act25: 26, act75: 31, testPolicy: "optional", topMajors: ["Business", "Biology", "Engineering"], competitiveMajors: [], tags: [], usNewsRank: 60, region: "Southeast" },
  { name: "Stevens Institute of Technology", state: "NJ", type: "private", size: "small", setting: "urban", acceptanceRate: 41, avgGPAUW: 3.75, avgGPAW: 4.20, sat25: 1330, sat75: 1490, act25: 30, act75: 34, testPolicy: "optional", topMajors: ["Computer Science", "Engineering", "Business"], competitiveMajors: [], tags: [], usNewsRank: 61, region: "Northeast" },
  { name: "University of Oregon", state: "OR", type: "public", size: "large", setting: "urban", acceptanceRate: 82, avgGPAUW: 3.50, avgGPAW: 3.95, sat25: 1100, sat75: 1310, act25: 23, act75: 29, testPolicy: "optional", topMajors: ["Business", "Journalism", "Psychology"], competitiveMajors: [], tags: [], usNewsRank: 64, region: "West" },
  { name: "Brigham Young University", state: "UT", type: "private", size: "large", setting: "suburban", acceptanceRate: 59, avgGPAUW: 3.75, avgGPAW: 4.20, sat25: 1260, sat75: 1440, act25: 28, act75: 33, testPolicy: "required", topMajors: ["Business", "Engineering", "Biology"], competitiveMajors: [], tags: [], usNewsRank: 65, region: "West" },
  { name: "University of Tennessee Knoxville", state: "TN", type: "public", size: "large", setting: "urban", acceptanceRate: 78, avgGPAUW: 3.50, avgGPAW: 3.95, sat25: 1120, sat75: 1310, act25: 24, act75: 30, testPolicy: "optional", topMajors: ["Business", "Engineering", "Psychology"], competitiveMajors: [], tags: [], usNewsRank: 67, region: "Southeast" },
  { name: "North Carolina State University", state: "NC", type: "public", size: "large", setting: "urban", acceptanceRate: 47, avgGPAUW: 3.70, avgGPAW: 4.15, sat25: 1260, sat75: 1420, act25: 27, act75: 32, testPolicy: "optional", topMajors: ["Engineering", "Computer Science", "Business"], competitiveMajors: [], tags: [], usNewsRank: 68, region: "Southeast" },
  { name: "University of Massachusetts Amherst", state: "MA", type: "public", size: "large", setting: "suburban", acceptanceRate: 57, avgGPAUW: 3.65, avgGPAW: 4.10, sat25: 1230, sat75: 1400, act25: 27, act75: 32, testPolicy: "optional", topMajors: ["Computer Science", "Business", "Psychology"], competitiveMajors: [], tags: [], usNewsRank: 70, region: "Northeast" },
  { name: "Howard University", state: "DC", type: "private", size: "medium", setting: "urban", acceptanceRate: 30, avgGPAUW: 3.60, avgGPAW: 4.05, sat25: 1150, sat75: 1340, act25: 24, act75: 30, testPolicy: "optional", topMajors: ["Biology", "Communications", "Political Science"], competitiveMajors: [], tags: [], usNewsRank: 73, region: "Southeast" },
  { name: "Colorado School of Mines", state: "CO", type: "public", size: "medium", setting: "suburban", acceptanceRate: 52, avgGPAUW: 3.75, avgGPAW: 4.20, sat25: 1310, sat75: 1470, act25: 30, act75: 34, testPolicy: "optional", topMajors: ["Engineering", "Computer Science", "Physics"], competitiveMajors: [], tags: [], usNewsRank: 75, region: "West" },
  { name: "Gonzaga University", state: "WA", type: "private", size: "medium", setting: "urban", acceptanceRate: 67, avgGPAUW: 3.60, avgGPAW: 4.05, sat25: 1170, sat75: 1350, act25: 26, act75: 31, testPolicy: "optional", topMajors: ["Business", "Engineering", "Biology"], competitiveMajors: [], tags: [], usNewsRank: 76, region: "West" },
  { name: "University of Alabama", state: "AL", type: "public", size: "large", setting: "suburban", acceptanceRate: 80, avgGPAUW: 3.45, avgGPAW: 3.90, sat25: 1080, sat75: 1300, act25: 23, act75: 30, testPolicy: "optional", topMajors: ["Business", "Engineering", "Communications"], competitiveMajors: [], tags: [], usNewsRank: 77, region: "Southeast" },
  { name: "Binghamton University", state: "NY", type: "public", size: "large", setting: "suburban", acceptanceRate: 42, avgGPAUW: 3.70, avgGPAW: 4.15, sat25: 1290, sat75: 1440, act25: 28, act75: 33, testPolicy: "optional", topMajors: ["Business", "Computer Science", "Biology"], competitiveMajors: [], tags: [], usNewsRank: 78, region: "Northeast" },
  { name: "Auburn University", state: "AL", type: "public", size: "large", setting: "suburban", acceptanceRate: 75, avgGPAUW: 3.50, avgGPAW: 3.95, sat25: 1100, sat75: 1290, act25: 24, act75: 30, testPolicy: "optional", topMajors: ["Engineering", "Business", "Biology"], competitiveMajors: [], tags: [], usNewsRank: 82, region: "Southeast" },

  // ── Liberal Arts ────────────────────────────────────────────────────────────
  { name: "Williams College", state: "MA", type: "private", size: "small", setting: "rural", acceptanceRate: 9, avgGPAUW: 3.93, avgGPAW: 4.48, sat25: 1430, sat75: 1560, act25: 33, act75: 35, testPolicy: "optional", topMajors: ["Economics", "Mathematics", "English"], competitiveMajors: [], tags: [], usNewsRank: null, region: "Northeast" },
  { name: "Amherst College", state: "MA", type: "private", size: "small", setting: "rural", acceptanceRate: 7, avgGPAUW: 3.92, avgGPAW: 4.47, sat25: 1430, sat75: 1550, act25: 33, act75: 35, testPolicy: "optional", topMajors: ["Economics", "Mathematics", "Political Science"], competitiveMajors: [], tags: [], usNewsRank: null, region: "Northeast" },
  { name: "Pomona College", state: "CA", type: "private", size: "small", setting: "suburban", acceptanceRate: 7, avgGPAUW: 3.92, avgGPAW: 4.47, sat25: 1420, sat75: 1540, act25: 33, act75: 35, testPolicy: "optional", topMajors: ["Economics", "Computer Science", "Mathematics"], competitiveMajors: [], tags: [], usNewsRank: null, region: "West" },
  { name: "Middlebury College", state: "VT", type: "private", size: "small", setting: "rural", acceptanceRate: 13, avgGPAUW: 3.88, avgGPAW: 4.38, sat25: 1370, sat75: 1510, act25: 32, act75: 34, testPolicy: "optional", topMajors: ["Economics", "Political Science", "English"], competitiveMajors: [], tags: [], usNewsRank: null, region: "Northeast" },
  { name: "Bowdoin College", state: "ME", type: "private", size: "small", setting: "suburban", acceptanceRate: 9, avgGPAUW: 3.90, avgGPAW: 4.45, sat25: 1390, sat75: 1530, act25: 33, act75: 35, testPolicy: "optional", topMajors: ["Economics", "Mathematics", "Biology"], competitiveMajors: [], tags: [], usNewsRank: null, region: "Northeast" },
];

// ── UNDO [application-plan] ─────────────────────────────────────────────────
// Everything below is the application-plan data layer. To revert:
//   1. Delete this entire block (from this comment to "end UNDO").
//   2. Rename `RAW_COLLEGES` at the top of the file back to
//      `export const COLLEGES`.
// Nothing else in the codebase reads `RAW_COLLEGES` directly.
// ────────────────────────────────────────────────────────────────────────────

// Option presets — small reusable arrays so the lookup map stays readable.
const RD: readonly ApplicationOption[] = [{ type: "RD" }];
const RD_ROLLING: readonly ApplicationOption[] = [{ type: "RD" }, { type: "Rolling" }];
const RD_EA: readonly ApplicationOption[] = [{ type: "RD" }, { type: "EA" }];
const RD_SCEA: readonly ApplicationOption[] = [{ type: "RD" }, { type: "SCEA" }];
const RD_REA: readonly ApplicationOption[] = [{ type: "RD" }, { type: "REA" }];
const RD_ED: readonly ApplicationOption[] = [
  { type: "RD" },
  { type: "ED", binding: true },
];
const RD_ED_ED2: readonly ApplicationOption[] = [
  { type: "RD" },
  { type: "ED", binding: true },
  { type: "ED2", binding: true },
];
const RD_EA_ED: readonly ApplicationOption[] = [
  { type: "RD" },
  { type: "EA" },
  { type: "ED", binding: true },
];
const RD_EA_ED_ED2: readonly ApplicationOption[] = [
  { type: "RD" },
  { type: "EA" },
  { type: "ED", binding: true },
  { type: "ED2", binding: true },
];

/**
 * Per-college application-plan options. Based on publicly documented
 * policies. Schools not listed here fall back to RD-only automatically
 * via getApplicationOptions() in admissions.ts.
 */
const APPLICATION_OPTIONS_BY_NAME: Record<string, readonly ApplicationOption[]> = {
  // ── Ivy League ──
  "Harvard University": RD_SCEA,
  "Yale University": RD_SCEA,
  "Princeton University": RD_SCEA,
  "Columbia University": RD_ED,
  "University of Pennsylvania": RD_ED,
  "Brown University": RD_ED,
  "Dartmouth College": RD_ED,
  "Cornell University": RD_ED,

  // ── Top Privates ──
  "MIT": RD_EA,
  "Stanford University": RD_REA,
  "Duke University": RD_ED,
  "Northwestern University": RD_ED,
  "Johns Hopkins University": RD_ED_ED2,
  "Caltech": RD_REA,
  "Rice University": RD_ED,
  "Vanderbilt University": RD_ED_ED2,
  "Washington University in St. Louis": RD_ED_ED2,
  "Emory University": RD_ED_ED2,
  "Georgetown University": RD_REA,
  "Carnegie Mellon University": RD_ED,
  "University of Notre Dame": RD_REA,
  "University of Southern California": RD_EA,
  "Tufts University": RD_ED_ED2,
  "NYU": RD_ED_ED2,
  "Boston College": RD_EA_ED_ED2,
  "Wake Forest University": RD_ED_ED2,
  "Boston University": RD_ED_ED2,
  "Northeastern University": RD_EA_ED,
  "Tulane University": RD_EA_ED_ED2,
  "Villanova University": RD_EA_ED_ED2,
  "Case Western Reserve University": RD_EA_ED_ED2,

  // ── Top Public / State Flagships ──
  // UC system runs a single RD-only cycle.
  "UCLA": RD,
  "UC Berkeley": RD,
  "UC San Diego": RD,
  "UC Davis": RD,
  "UC Santa Barbara": RD,
  "UC Irvine": RD,
  "University of Michigan": RD_EA,
  "University of Virginia": RD_EA_ED,
  "UNC Chapel Hill": RD_EA,
  "Georgia Tech": RD_EA,
  "University of Florida": RD_EA,
  "UT Austin": RD,
  "University of Wisconsin-Madison": RD_EA,
  "University of Illinois Urbana-Champaign": RD_EA,
  "Ohio State University": RD_EA,
  "Penn State University": RD_ROLLING,
  "University of Washington": RD,
  "Purdue University": RD_EA,
  "University of Maryland": RD_EA,
  "Virginia Tech": RD_EA,
  "Indiana University Bloomington": RD_ROLLING,
  "University of Georgia": RD_EA,
  "Clemson University": RD_EA,
  "University of Pittsburgh": RD_ROLLING,
  "Michigan State University": RD_ROLLING,
  "University of Minnesota": RD_ROLLING,
  "Texas A&M University": RD,
  "University of Colorado Boulder": RD_EA,
  "Arizona State University": RD_ROLLING,
  "University of Arizona": RD_ROLLING,
  "Rutgers University": RD,
  "University of Connecticut": RD_EA,

  // ── Additional Top 100 ──
  "University of Chicago": RD_EA_ED,
  "University of Rochester": RD_ED,
  "College of William & Mary": RD_EA_ED,
  "Brandeis University": RD_ED_ED2,
  "Lehigh University": RD_ED_ED2,
  "Rensselaer Polytechnic Institute": RD_ED_ED2,
  "Stony Brook University": RD_EA,
  "George Washington University": RD_ED_ED2,
  "Santa Clara University": RD_EA_ED,
  "Pepperdine University": RD_EA,
  "Syracuse University": RD_ED_ED2,
  "Fordham University": RD_EA_ED,
  "University of Iowa": RD_ROLLING,
  "Southern Methodist University": RD_EA_ED,
  "University of Delaware": RD_EA,
  "Baylor University": RD_EA_ED,
  "University of South Carolina": RD_EA,
  "Marquette University": RD_EA,
  "University of South Florida": RD,
  "Stevens Institute of Technology": RD_EA_ED_ED2,
  "University of Oregon": RD_EA,
  "Brigham Young University": RD,
  "University of Tennessee Knoxville": RD_EA,
  "North Carolina State University": RD_EA,
  "University of Massachusetts Amherst": RD_EA,
  "Howard University": RD_EA_ED,
  "Colorado School of Mines": RD_EA_ED,
  "Gonzaga University": RD_EA,
  "University of Alabama": RD_ROLLING,
  "Binghamton University": RD_EA,
  "Auburn University": RD_EA,

  // ── Liberal Arts ──
  "Williams College": RD_ED,
  "Amherst College": RD_ED,
  "Pomona College": RD_ED_ED2,
  "Middlebury College": RD_ED_ED2,
  "Bowdoin College": RD_ED_ED2,
};

export const COLLEGES: College[] = RAW_COLLEGES.map((c) => {
  const opts = APPLICATION_OPTIONS_BY_NAME[c.name];
  const ext = COLLEGE_EXTENDED_DATA[c.name];
  const cds = CDS_DATA[c.name]?.data;
  const aliases = COLLEGE_ALIASES[c.name];
  // Merge layers (later keys win):
  //   base data  ←  application options  ←  hand-curated extended data  ←
  //   CDS-authoritative fields (scripts/cds-sync.ts)  ←  aliases.
  // CDS values intentionally OVERRIDE the hand-curated estimates so acceptance
  // rates, test score ranges, demographics, etc. reflect each college's actual
  // Common Data Set rather than rounded-by-hand numbers. Qualitative fields
  // (vibeTags, knownFor, qualitative, campusDetails, cultureDetails,
  // locationDetails, topIndustries, careerPipelines) are never present on
  // cds and therefore survive unchanged.
  return {
    ...c,
    ...(opts ? { applicationOptions: opts } : {}),
    ...(ext ?? {}),
    ...(cds ?? {}),
    ...(aliases ? { aliases } : {}),
  };
});
// end UNDO [application-plan]
