import { describe as copy } from '@/domain/activity'
import type { ActivityEntry } from '@/domain/activity'
import { generateAssetTag } from '@/domain/assets'
import { checklistFor } from '@/domain/onboarding'
import type {
  Activity,
  Asset,
  AssetAssignment,
  AssetCategory,
  AssetCondition,
  Department,
  Employee,
  EmployeeStatus,
  OffboardingRecord,
  OnboardingRecord,
  ReturnState,
  WorkspaceData,
} from '@/types/domain'
import { addDays, toISODate } from '@/utils/date'

/*
 * Deterministic seed for a ~150-person SaaS startup's IT inventory.
 *
 * Every date is an offset from `today`, so the demo never goes stale:
 * warranties are always about to expire, joiners are always days away.
 * Activities are derived from the same rows that build assets and
 * assignments, with the copy helpers the domain ops use, so the starting
 * history can't contradict the data.
 */

const IT_TEAM = ['Jordan Lee', 'Sam Ortiz'] as const

type EmployeeRow = [
  key: string,
  name: string,
  department: Department,
  designation: string,
  /** Days since joining; negative means they start in the future. */
  joinedDaysAgo: number,
  status: EmployeeStatus,
  location: string,
]

const EMPLOYEES: EmployeeRow[] = [
  ['priya', 'Priya Sharma', 'Engineering', 'Senior Software Engineer', 1100, 'Active', 'San Francisco'],
  ['marcus', 'Marcus Chen', 'Engineering', 'Staff Engineer', 1500, 'Active', 'Remote · Austin'],
  ['elena', 'Elena Rodriguez', 'Product', 'Product Manager', 820, 'Active', 'New York'],
  ['david', 'David Okafor', 'Design', 'Product Designer', 400, 'Active', 'San Francisco'],
  ['sarah', 'Sarah Kim', 'Sales', 'Account Executive', 310, 'Active', 'New York'],
  ['james', 'James Wilson', 'Marketing', 'Content Marketing Manager', 960, 'Offboarding', 'Remote · Denver'],
  ['aisha', 'Aisha Patel', 'Operations', 'Operations Lead', 1200, 'Active', 'San Francisco'],
  ['tom', 'Tom Becker', 'HR', 'People Partner', 610, 'Active', 'New York'],
  ['lena', 'Lena Novak', 'Engineering', 'Frontend Engineer', 520, 'Offboarding', 'Remote · Toronto'],
  ['ryan', 'Ryan O’Connor', 'Sales', 'Sales Development Rep', 260, 'Offboarding', 'New York'],
  ['nikhil', 'Nikhil Rao', 'Engineering', 'Engineering Manager', 840, 'Active', 'San Francisco'],
  ['sofia', 'Sofia Rossi', 'Product', 'Senior Product Manager', 340, 'Active', 'Remote · Chicago'],
  ['ben', 'Ben Carter', 'Operations', 'IT Support Specialist', 700, 'Active', 'San Francisco'],
  ['fatima', 'Fatima Zahra', 'HR', 'Talent Acquisition Partner', 160, 'Active', 'New York'],
  ['kevin', 'Kevin Murphy', 'Sales', 'Sales Manager', 900, 'Inactive', 'New York'],
  ['arjun', 'Arjun Mehta', 'Engineering', 'Data Engineer', 9, 'Active', 'San Francisco'],
  ['mei', 'Mei Tanaka', 'Engineering', 'Backend Engineer', -3, 'Onboarding', 'San Francisco'],
  ['carlos', 'Carlos Mendes', 'Design', 'UX Researcher', -7, 'Onboarding', 'San Francisco'],
  ['hannah', 'Hannah Fischer', 'Sales', 'Account Executive', -12, 'Onboarding', 'New York'],
  ['omar', 'Omar Haddad', 'Engineering', 'DevOps Engineer', -1, 'Onboarding', 'Remote · Seattle'],
  ['grace', 'Grace Liu', 'Marketing', 'Growth Marketing Manager', -21, 'Onboarding', 'San Francisco'],
]

const SF = 'San Francisco HQ'
const NY = 'New York Office'
const REMOTE = 'Remote'
const SF_STORE = 'SF HQ · IT storage'
const NY_STORE = 'NY Office · IT closet'

interface AssetRow {
  category: AssetCategory
  name: string
  manufacturer: string
  model: string
  serial: string
  purchasedDaysAgo: number
  cost: number
  /** Days until warranty ends; negative means already expired. */
  warrantyInDays: number
  condition: AssetCondition
  location: string
  /** Current holder and how many days ago they received it. */
  holder?: [employeeKey: string, assignedDaysAgo: number]
  status?: 'Available' | 'Under Repair' | 'Retired'
  notes?: string
}

const ASSETS: AssetRow[] = [
  // Laptops
  { category: 'Laptop', name: 'MacBook Pro 14" M3 Pro', manufacturer: 'Apple', model: 'MacBook Pro 14 (M3 Pro, 2023)', serial: 'C02FK1ABQ6L4', purchasedDaysAgo: 720, cost: 2499, warrantyInDays: 375, condition: 'Excellent', location: SF, holder: ['priya', 700] },
  { category: 'Laptop', name: 'MacBook Pro 16" M2 Max', manufacturer: 'Apple', model: 'MacBook Pro 16 (M2 Max, 2023)', serial: 'C02GT7PLMD6T', purchasedDaysAgo: 1080, cost: 3499, warrantyInDays: 12, condition: 'Good', location: REMOTE, holder: ['marcus', 1075], notes: 'AppleCare+ ends soon; decide on renewal.' },
  { category: 'Laptop', name: 'MacBook Air 13" M2', manufacturer: 'Apple', model: 'MacBook Air 13 (M2, 2022)', serial: 'FVFHK2XWQ6LR', purchasedDaysAgo: 800, cost: 1299, warrantyInDays: 295, condition: 'Good', location: NY, holder: ['elena', 790] },
  { category: 'Laptop', name: 'MacBook Pro 14" M3', manufacturer: 'Apple', model: 'MacBook Pro 14 (M3, 2023)', serial: 'C02J3MZPQ05N', purchasedDaysAgo: 390, cost: 1999, warrantyInDays: 705, condition: 'Excellent', location: SF, holder: ['david', 385] },
  { category: 'Laptop', name: 'ThinkPad X1 Carbon Gen 11', manufacturer: 'Lenovo', model: '21HM-0045US', serial: 'PF4KZ8RQ', purchasedDaysAgo: 300, cost: 1849, warrantyInDays: 795, condition: 'Excellent', location: NY, holder: ['sarah', 300] },
  { category: 'Laptop', name: 'MacBook Pro 14" M1 Pro', manufacturer: 'Apple', model: 'MacBook Pro 14 (M1 Pro, 2021)', serial: 'C02H9VRAQ6LT', purchasedDaysAgo: 940, cost: 2199, warrantyInDays: 20, condition: 'Good', location: REMOTE, holder: ['james', 930] },
  { category: 'Laptop', name: 'XPS 15', manufacturer: 'Dell', model: 'XPS 15 9530', serial: '7HQK2T3', purchasedDaysAgo: 500, cost: 2099, warrantyInDays: 595, condition: 'Fair', location: REMOTE, holder: ['lena', 495], notes: 'Hinge is loose; check on return.' },
  { category: 'Laptop', name: 'MacBook Air 13" M2', manufacturer: 'Apple', model: 'MacBook Air 13 (M2, 2022)', serial: 'FVFJL9CMQ6LC', purchasedDaysAgo: 260, cost: 1299, warrantyInDays: 835, condition: 'Good', location: NY_STORE, status: 'Available' },
  { category: 'Laptop', name: 'MacBook Pro 14" M3 Pro', manufacturer: 'Apple', model: 'MacBook Pro 14 (M3 Pro, 2023)', serial: 'C02KM2QXQ6P1', purchasedDaysAgo: 60, cost: 2499, warrantyInDays: 1035, condition: 'Excellent', location: SF, holder: ['carlos', 5] },
  { category: 'Laptop', name: 'MacBook Pro 14" M3 Pro', manufacturer: 'Apple', model: 'MacBook Pro 14 (M3 Pro, 2023)', serial: 'C02KM2QYQ6P2', purchasedDaysAgo: 60, cost: 2499, warrantyInDays: 1035, condition: 'Excellent', location: REMOTE, holder: ['omar', 3] },
  { category: 'Laptop', name: 'MacBook Pro 14" M3', manufacturer: 'Apple', model: 'MacBook Pro 14 (M3, 2023)', serial: 'C02KN7RTQ05P', purchasedDaysAgo: 30, cost: 1999, warrantyInDays: 1065, condition: 'Excellent', location: SF_STORE, status: 'Available' },
  { category: 'Laptop', name: 'ThinkPad T14s Gen 4', manufacturer: 'Lenovo', model: '21F6-0012US', serial: 'PF5BX2LM', purchasedDaysAgo: 45, cost: 1499, warrantyInDays: 1050, condition: 'Excellent', location: NY_STORE, status: 'Available' },
  { category: 'Laptop', name: 'MacBook Pro 16" M1 Max', manufacturer: 'Apple', model: 'MacBook Pro 16 (M1 Max, 2021)', serial: 'C02G41JZMD6M', purchasedDaysAgo: 1150, cost: 3299, warrantyInDays: -55, condition: 'Damaged', location: SF_STORE, status: 'Under Repair', notes: 'Keyboard failure after liquid spill. Out of warranty; repair quote requested from Apple.' },
  { category: 'Laptop', name: 'MacBook Pro 14" M3 Max', manufacturer: 'Apple', model: 'MacBook Pro 14 (M3 Max, 2023)', serial: 'C02JX8LQQ6L9', purchasedDaysAgo: 820, cost: 3199, warrantyInDays: 275, condition: 'Good', location: SF, holder: ['nikhil', 815] },
  { category: 'Laptop', name: 'MacBook Air 15" M3', manufacturer: 'Apple', model: 'MacBook Air 15 (M3, 2024)', serial: 'FVFL2C4NQ6MD', purchasedDaysAgo: 330, cost: 1499, warrantyInDays: 760, condition: 'Excellent', location: REMOTE, holder: ['sofia', 330] },
  { category: 'Laptop', name: 'MacBook Pro 13" Intel', manufacturer: 'Apple', model: 'MacBook Pro 13 (2020)', serial: 'C02DQ3KZML85', purchasedDaysAgo: 1800, cost: 1799, warrantyInDays: -705, condition: 'Fair', location: SF_STORE, status: 'Retired', notes: 'End of life; battery swelling. Drive wiped and disposal certificate filed.' },
  { category: 'Laptop', name: 'ThinkPad X1 Carbon Gen 10', manufacturer: 'Lenovo', model: '21CB-007MUS', serial: 'PF3TQ6WN', purchasedDaysAgo: 620, cost: 1699, warrantyInDays: 475, condition: 'Good', location: SF, holder: ['aisha', 38] },
  { category: 'Laptop', name: 'MacBook Air 13" M2', manufacturer: 'Apple', model: 'MacBook Air 13 (M2, 2022)', serial: 'FVFHT4R1Q6L7', purchasedDaysAgo: 610, cost: 1299, warrantyInDays: 485, condition: 'Good', location: NY, holder: ['tom', 605] },
  { category: 'Laptop', name: 'MacBook Air 13" M3', manufacturer: 'Apple', model: 'MacBook Air 13 (M3, 2024)', serial: 'FVFM8D2KQ6N3', purchasedDaysAgo: 160, cost: 1299, warrantyInDays: 935, condition: 'Excellent', location: NY, holder: ['fatima', 160] },
  { category: 'Laptop', name: 'ThinkPad P1 Gen 6', manufacturer: 'Lenovo', model: '21FV-000AUS', serial: 'PF4WRX9C', purchasedDaysAgo: 700, cost: 2899, warrantyInDays: 395, condition: 'Good', location: SF, holder: ['ben', 695] },
  { category: 'Laptop', name: 'ThinkPad T14 Gen 3', manufacturer: 'Lenovo', model: '21AH-00BHUS', serial: 'PF3MZK7A', purchasedDaysAgo: 880, cost: 1399, warrantyInDays: 215, condition: 'Good', location: NY_STORE, status: 'Available' },
  { category: 'Laptop', name: 'MacBook Pro 14" M3', manufacturer: 'Apple', model: 'MacBook Pro 14 (M3, 2023)', serial: 'C02KN7RVQ05Q', purchasedDaysAgo: 30, cost: 1999, warrantyInDays: 1065, condition: 'Excellent', location: SF, holder: ['arjun', 11] },
  // Monitors
  { category: 'Monitor', name: 'UltraSharp 27 4K', manufacturer: 'Dell', model: 'U2723QE', serial: 'CN0F2K9Y', purchasedDaysAgo: 700, cost: 629, warrantyInDays: 395, condition: 'Good', location: SF, holder: ['priya', 690] },
  { category: 'Monitor', name: 'UltraSharp 27 4K', manufacturer: 'Dell', model: 'U2723QE', serial: 'CN0F2KA1', purchasedDaysAgo: 820, cost: 629, warrantyInDays: 275, condition: 'Good', location: SF, holder: ['nikhil', 810] },
  { category: 'Monitor', name: 'UltraFine 27 4K', manufacturer: 'LG', model: '27UN880-B', serial: '204NTWG1C882', purchasedDaysAgo: 820, cost: 649, warrantyInDays: 275, condition: 'Good', location: SF, holder: ['nikhil', 810] },
  { category: 'Monitor', name: 'UltraSharp 27 4K', manufacturer: 'Dell', model: 'U2723QE', serial: 'CN0F2KB7', purchasedDaysAgo: 950, cost: 629, warrantyInDays: 145, condition: 'Good', location: SF_STORE, status: 'Available' },
  { category: 'Monitor', name: '27" QHD USB-C', manufacturer: 'Dell', model: 'P2723DE', serial: 'CN0H8RT2', purchasedDaysAgo: 120, cost: 379, warrantyInDays: 975, condition: 'Excellent', location: REMOTE, holder: ['omar', 3] },
  { category: 'Monitor', name: '27" 4K UHD', manufacturer: 'LG', model: '27UP850-W', serial: '312NTRL5A104', purchasedDaysAgo: 400, cost: 449, warrantyInDays: 330, condition: 'Good', location: SF_STORE, status: 'Available' },
  { category: 'Monitor', name: '27" QHD USB-C', manufacturer: 'Dell', model: 'P2723DE', serial: 'CN0H8RS9', purchasedDaysAgo: 1070, cost: 379, warrantyInDays: 25, condition: 'Damaged', location: SF_STORE, status: 'Under Repair', notes: 'Cluster of dead pixels. Dell RMA #4471-208 opened; claim before warranty ends.' },
  { category: 'Monitor', name: 'ViewFinity S8 27"', manufacturer: 'Samsung', model: 'LS27B800PXNXGO', serial: '0QA7HNAT300218', purchasedDaysAgo: 400, cost: 499, warrantyInDays: 330, condition: 'Excellent', location: SF, holder: ['david', 385] },
  { category: 'Monitor', name: 'UltraSharp 27 4K', manufacturer: 'Dell', model: 'U2723QE', serial: 'CN0F2KC4', purchasedDaysAgo: 790, cost: 629, warrantyInDays: 28, condition: 'Good', location: NY, holder: ['elena', 780] },
  // Mobile phones
  { category: 'Mobile Phone', name: 'iPhone 15', manufacturer: 'Apple', model: 'A3090', serial: 'F2LZQ1XKN7', purchasedDaysAgo: 300, cost: 799, warrantyInDays: 400, condition: 'Excellent', location: NY, holder: ['sarah', 300] },
  { category: 'Mobile Phone', name: 'iPhone 14', manufacturer: 'Apple', model: 'A2649', serial: 'F4GXK8P2N6', purchasedDaysAgo: 500, cost: 699, warrantyInDays: 230, condition: 'Good', location: REMOTE, holder: ['lena', 495] },
  { category: 'Mobile Phone', name: 'Pixel 8', manufacturer: 'Google', model: 'GKWS6', serial: '35AKX0QJ9', purchasedDaysAgo: 420, cost: 699, warrantyInDays: 310, condition: 'Good', location: NY_STORE, status: 'Available' },
  { category: 'Mobile Phone', name: 'iPhone 15 Pro', manufacturer: 'Apple', model: 'A3102', serial: 'F7KMV3R9QP', purchasedDaysAgo: 250, cost: 999, warrantyInDays: 480, condition: 'Excellent', location: SF, holder: ['nikhil', 245] },
  { category: 'Mobile Phone', name: 'iPhone 13', manufacturer: 'Apple', model: 'A2482', serial: 'DNPZ8F1KN72', purchasedDaysAgo: 1250, cost: 699, warrantyInDays: -520, condition: 'Damaged', location: SF_STORE, status: 'Retired', notes: 'Cracked display and back glass; repair uneconomical.' },
  // Keyboards
  { category: 'Keyboard', name: 'Magic Keyboard with Touch ID', manufacturer: 'Apple', model: 'MK293LL/A', serial: 'FTPK41XJ1', purchasedDaysAgo: 820, cost: 149, warrantyInDays: -90, condition: 'Good', location: SF, holder: ['nikhil', 810] },
  { category: 'Keyboard', name: 'MX Keys S', manufacturer: 'Logitech', model: '920-011406', serial: '2213LZ0AF8', purchasedDaysAgo: 175, cost: 109, warrantyInDays: 190, condition: 'Excellent', location: SF_STORE, status: 'Available' },
  { category: 'Keyboard', name: 'MX Keys S', manufacturer: 'Logitech', model: '920-011406', serial: '2213LZ0B12', purchasedDaysAgo: 690, cost: 109, warrantyInDays: -325, condition: 'Good', location: SF, holder: ['priya', 690] },
  { category: 'Keyboard', name: 'K2 Wireless Mechanical', manufacturer: 'Keychron', model: 'K2 V2', serial: 'K2V2-88231', purchasedDaysAgo: 540, cost: 89, warrantyInDays: -175, condition: 'Fair', location: SF_STORE, status: 'Available' },
  // Mice
  { category: 'Mouse', name: 'MX Master 3S', manufacturer: 'Logitech', model: '910-006557', serial: '2224HS01K2', purchasedDaysAgo: 820, cost: 99, warrantyInDays: -90, condition: 'Good', location: SF, holder: ['nikhil', 810] },
  { category: 'Mouse', name: 'MX Master 3S', manufacturer: 'Logitech', model: '910-006557', serial: '2224HS02M7', purchasedDaysAgo: 260, cost: 99, warrantyInDays: 105, condition: 'Damaged', location: NY_STORE, status: 'Under Repair', notes: 'Scroll wheel broken.' },
  { category: 'Mouse', name: 'Magic Mouse', manufacturer: 'Apple', model: 'MK2E3AM/A', serial: 'CC2H71XKP', purchasedDaysAgo: 200, cost: 79, warrantyInDays: 165, condition: 'Excellent', location: SF, holder: ['arjun', 11] },
  { category: 'Mouse', name: 'MX Master 3S', manufacturer: 'Logitech', model: '910-006557', serial: '2224HS03P4', purchasedDaysAgo: 690, cost: 99, warrantyInDays: -325, condition: 'Good', location: SF, holder: ['priya', 690] },
  { category: 'Mouse', name: 'MX Anywhere 3S', manufacturer: 'Logitech', model: '910-006933', serial: '2231HA07C1', purchasedDaysAgo: 150, cost: 79, warrantyInDays: 215, condition: 'Excellent', location: SF_STORE, status: 'Available' },
  // Headphones
  { category: 'Headphones', name: 'WH-1000XM5', manufacturer: 'Sony', model: 'WH1000XM5/B', serial: '5821307', purchasedDaysAgo: 600, cost: 399, warrantyInDays: 130, condition: 'Good', location: REMOTE, holder: ['james', 595] },
  { category: 'Headphones', name: 'QuietComfort Ultra', manufacturer: 'Bose', model: '880066-0100', serial: '076543Z21', purchasedDaysAgo: 300, cost: 429, warrantyInDays: 65, condition: 'Excellent', location: NY, holder: ['sarah', 300] },
  { category: 'Headphones', name: 'Evolve2 65', manufacturer: 'Jabra', model: '26599-999-999', serial: 'J65-0081453', purchasedDaysAgo: 700, cost: 249, warrantyInDays: 9, condition: 'Good', location: SF_STORE, status: 'Available' },
  { category: 'Headphones', name: 'AirPods Pro (2nd gen)', manufacturer: 'Apple', model: 'MTJV3AM/A', serial: 'GX7QW2NHPL', purchasedDaysAgo: 420, cost: 249, warrantyInDays: -55, condition: 'Good', location: REMOTE, holder: ['marcus', 415] },
  // Accessories & other
  { category: 'Accessories', name: 'TS4 Thunderbolt 4 Dock', manufacturer: 'CalDigit', model: 'TS4', serial: 'TS4C2109884', purchasedDaysAgo: 720, cost: 399, warrantyInDays: 375, condition: 'Good', location: REMOTE, holder: ['marcus', 715] },
  { category: 'Accessories', name: '7-in-1 USB-C Hub', manufacturer: 'Anker', model: 'A83460A1', serial: 'AK7H-220931', purchasedDaysAgo: 200, cost: 49, warrantyInDays: 165, condition: 'Excellent', location: SF_STORE, status: 'Available' },
  { category: 'Accessories', name: 'Brio 4K Webcam', manufacturer: 'Logitech', model: '960-001105', serial: '2209LZ5RB8', purchasedDaysAgo: 790, cost: 199, warrantyInDays: -60, condition: 'Good', location: NY, holder: ['elena', 780] },
  { category: 'Other', name: 'YubiKey 5C NFC', manufacturer: 'Yubico', model: '5C NFC', serial: '23818844', purchasedDaysAgo: 90, cost: 55, warrantyInDays: 275, condition: 'Excellent', location: SF_STORE, status: 'Available' },
]

/** Assignments that have already ended: [serial, employee, assignedDaysAgo, returnedDaysAgo, condition]. */
const PAST_ASSIGNMENTS: [string, string, number, number, AssetCondition][] = [
  ['PF3MZK7A', 'kevin', 875, 62, 'Good'],
  ['35AKX0QJ9', 'kevin', 415, 62, 'Good'],
  ['312NTRL5A104', 'marcus', 395, 300, 'Good'],
  ['C02G41JZMD6M', 'aisha', 1145, 40, 'Damaged'],
  ['CN0F2KB7', 'james', 945, 3, 'Good'],
  ['FVFJL9CMQ6LC', 'ryan', 255, 2, 'Good'],
  ['2224HS02M7', 'ryan', 255, 2, 'Damaged'],
]

/** [employee, createdDaysAgo, completedDaysAgo | null]; checklists come from the department. */
const ONBOARDING: [string, number, number | null][] = [
  ['arjun', 20, 9],
  ['omar', 12, null],
  ['carlos', 14, null],
  ['mei', 10, null],
  ['hannah', 8, null],
  ['grace', 2, null],
]

interface OffboardingRow {
  employee: string
  initiatedDaysAgo: number
  /** Offset from today; negative means it has passed. */
  lastWorkingDayIn: number
  items: [serial: string, state: ReturnState, processedDaysAgo: number | null][]
  completedDaysAgo: number | null
}

const OFFBOARDING: OffboardingRow[] = [
  {
    employee: 'kevin',
    initiatedDaysAgo: 70,
    lastWorkingDayIn: -62,
    items: [
      ['PF3MZK7A', 'Returned', 62],
      ['35AKX0QJ9', 'Returned', 62],
    ],
    completedDaysAgo: 61,
  },
  {
    employee: 'ryan',
    initiatedDaysAgo: 6,
    lastWorkingDayIn: -1,
    items: [
      ['FVFJL9CMQ6LC', 'Returned', 2],
      ['2224HS02M7', 'Damaged on Return', 2],
    ],
    completedDaysAgo: null,
  },
  {
    employee: 'james',
    initiatedDaysAgo: 4,
    lastWorkingDayIn: 3,
    items: [
      ['C02H9VRAQ6LT', 'Pending Return', null],
      ['5821307', 'Pending Return', null],
      ['CN0F2KB7', 'Returned', 3],
    ],
    completedDaysAgo: null,
  },
  {
    employee: 'lena',
    initiatedDaysAgo: 1,
    lastWorkingDayIn: 10,
    items: [
      ['7HQK2T3', 'Pending Return', null],
      ['F4GXK8P2N6', 'Pending Return', null],
    ],
    completedDaysAgo: null,
  },
]

/** Lifecycle events that aren't implied by assignments: [serial, kind, daysAgo, detail]. */
const ASSET_EVENTS: [string, 'repair' | 'retire' | 'condition', number, string][] = [
  ['C02DQ3KZML85', 'retire', 90, 'end of life, battery swelling'],
  ['DNPZ8F1KN72', 'retire', 150, 'cracked display, repair uneconomical'],
  ['CN0H8RS9', 'repair', 6, 'dead pixels, Dell RMA opened'],
  ['7HQK2T3', 'condition', 40, 'Good'],
]

/** Only recent history is seeded into the activity log. */
const ACTIVITY_WINDOW_DAYS = 180

function emailFor(name: string): string {
  return `${name.toLowerCase().replace(/[’']/g, '').replace(/\s+/g, '.')}@equiply.dev`
}

export function createSeedData(today: Date = new Date()): WorkspaceData {
  const dateIn = (offset: number) => toISODate(addDays(today, offset))
  /** Business-hours timestamp `daysAgo` days back; `slot` spreads events across the day. */
  const stamp = (daysAgo: number, slot: number) => {
    const d = addDays(today, -daysAgo)
    d.setHours(9 + (slot % 8), (slot * 17) % 60, 0, 0)
    return d.toISOString()
  }

  const employees: Employee[] = EMPLOYEES.map(([key, name, department, designation, joinedDaysAgo, status, location], i) => ({
    id: `emp_${key}`,
    employeeId: `EQ-${1001 + i}`,
    name,
    email: emailFor(name),
    department,
    designation,
    joiningDate: dateIn(-joinedDaysAgo),
    status,
    location,
  }))
  const employeeByKey = new Map(employees.map((e) => [e.id.slice(4), e]))
  const joinedDaysAgo = new Map(EMPLOYEES.map((row) => [row[0], row[4]]))
  const emp = (key: string): Employee => {
    const e = employeeByKey.get(key)
    if (!e) throw new Error(`Seed references unknown employee "${key}"`)
    return e
  }

  const assets: Asset[] = []
  for (const [i, row] of ASSETS.entries()) {
    assets.push({
      id: `ast_${String(i + 1).padStart(3, '0')}`,
      assetTag: generateAssetTag(row.category, assets),
      name: row.name,
      category: row.category,
      manufacturer: row.manufacturer,
      model: row.model,
      serialNumber: row.serial,
      purchaseDate: dateIn(-row.purchasedDaysAgo),
      purchaseCost: row.cost,
      warrantyExpiry: dateIn(row.warrantyInDays),
      status: row.holder ? 'Assigned' : (row.status ?? 'Available'),
      condition: row.condition,
      assignedEmployeeId: row.holder ? emp(row.holder[0]).id : null,
      location: row.location,
      notes: row.notes ?? '',
    })
  }
  const assetBySerial = new Map(assets.map((a) => [a.serialNumber, a]))
  const asset = (serial: string): Asset => {
    const a = assetBySerial.get(serial)
    if (!a) throw new Error(`Seed references unknown serial "${serial}"`)
    return a
  }

  // --- assignments -----------------------------------------------------------
  type DraftAssignment = Omit<AssetAssignment, 'id'>
  const drafts: DraftAssignment[] = []
  /** Equipment handed over within a few days of the start date counts as onboarding. */
  const sourceFor = (employeeKey: string, assignedDaysAgo: number) =>
    Math.abs((joinedDaysAgo.get(employeeKey) ?? 0) - assignedDaysAgo) <= 3 ? ('onboarding' as const) : ('manual' as const)

  ASSETS.forEach((row, i) => {
    if (!row.holder) return
    const [key, daysAgo] = row.holder
    drafts.push({
      assetId: assets[i]!.id,
      employeeId: emp(key).id,
      assignedAt: stamp(daysAgo, i),
      returnedAt: null,
      assignedDuring: emp(key).status === 'Onboarding' ? 'onboarding' : sourceFor(key, daysAgo),
      returnCondition: null,
    })
  })
  PAST_ASSIGNMENTS.forEach(([serial, key, assignedDaysAgo, returnedDaysAgo, condition], i) => {
    drafts.push({
      assetId: asset(serial).id,
      employeeId: emp(key).id,
      assignedAt: stamp(assignedDaysAgo, i + 3),
      returnedAt: stamp(returnedDaysAgo, i + 5),
      assignedDuring: sourceFor(key, assignedDaysAgo),
      returnCondition: condition,
    })
  })
  drafts.sort((a, b) => a.assignedAt.localeCompare(b.assignedAt))
  const assignments: AssetAssignment[] = drafts.map((draft, i) => ({
    id: `asg_${String(i + 1).padStart(3, '0')}`,
    ...draft,
  }))

  // --- lifecycle records -----------------------------------------------------
  const onboarding: OnboardingRecord[] = ONBOARDING.map(([key, createdDaysAgo, completedDaysAgo], i) => ({
    id: `onb_${String(i + 1).padStart(3, '0')}`,
    employeeId: emp(key).id,
    startDate: emp(key).joiningDate,
    checklist: checklistFor(emp(key).department),
    createdAt: stamp(createdDaysAgo, i),
    completedAt: completedDaysAgo === null ? null : stamp(completedDaysAgo, i + 2),
  }))

  const offboarding: OffboardingRecord[] = OFFBOARDING.map((row, i) => ({
    id: `off_${String(i + 1).padStart(3, '0')}`,
    employeeId: emp(row.employee).id,
    initiatedAt: stamp(row.initiatedDaysAgo, i + 1),
    lastWorkingDay: dateIn(row.lastWorkingDayIn),
    items: row.items.map(([serial, state, processedDaysAgo], j) => ({
      assetId: asset(serial).id,
      state,
      processedAt: processedDaysAgo === null ? null : stamp(processedDaysAgo, i + j + 5),
    })),
    completedAt: row.completedDaysAgo === null ? null : stamp(row.completedDaysAgo, i + 4),
  }))

  // --- activity log, derived from everything above ---------------------------
  const events: (ActivityEntry & { timestamp: string })[] = []
  const recent = (iso: string) => addDays(today, -ACTIVITY_WINDOW_DAYS) <= new Date(iso)
  const add = (timestamp: string, entry: ActivityEntry) => {
    if (recent(timestamp)) events.push({ ...entry, timestamp })
  }
  const employeeOf = (id: string) => employees.find((e) => e.id === id)!
  const assetOf = (id: string) => assets.find((a) => a.id === id)!

  ASSETS.forEach((row, i) => {
    const a = assets[i]!
    add(stamp(row.purchasedDaysAgo, i), { entityType: 'asset', entityId: a.id, action: 'asset_added', description: copy.assetAdded(a) })
  })
  for (const asg of assignments) {
    const a = assetOf(asg.assetId)
    const e = employeeOf(asg.employeeId)
    const related = { entityType: 'employee' as const, entityId: e.id }
    add(asg.assignedAt, { entityType: 'asset', entityId: a.id, action: 'asset_assigned', description: copy.assetAssigned(a, e, asg.assignedDuring), related })
    if (asg.returnedAt && asg.returnCondition) {
      add(asg.returnedAt, { entityType: 'asset', entityId: a.id, action: 'asset_returned', description: copy.assetReturned(a, e, asg.returnCondition), related })
    }
  }
  ASSET_EVENTS.forEach(([serial, kind, daysAgo, detail], i) => {
    const a = asset(serial)
    const timestamp = stamp(daysAgo, i + 2)
    if (kind === 'retire') add(timestamp, { entityType: 'asset', entityId: a.id, action: 'asset_retired', description: copy.assetRetired(a, detail) })
    if (kind === 'repair') add(timestamp, { entityType: 'asset', entityId: a.id, action: 'asset_repair', description: copy.assetRepair(a, detail) })
    if (kind === 'condition')
      add(timestamp, { entityType: 'asset', entityId: a.id, action: 'asset_condition_updated', description: copy.conditionUpdated(a, detail as AssetCondition, a.condition) })
  })
  for (const record of onboarding) {
    const e = employeeOf(record.employeeId)
    add(record.createdAt, { entityType: 'employee', entityId: e.id, action: 'onboarding_started', description: copy.onboardingStarted(e, record.startDate) })
    if (record.completedAt) {
      const count = assignments.filter((a) => a.employeeId === e.id && a.returnedAt === null).length
      add(record.completedAt, { entityType: 'employee', entityId: e.id, action: 'employee_onboarded', description: copy.employeeOnboarded(e, count) })
    }
  }
  for (const record of offboarding) {
    const e = employeeOf(record.employeeId)
    add(record.initiatedAt, { entityType: 'employee', entityId: e.id, action: 'offboarding_initiated', description: copy.offboardingInitiated(e, record.items.length) })
    if (record.completedAt) {
      add(record.completedAt, { entityType: 'employee', entityId: e.id, action: 'employee_offboarded', description: copy.employeeOffboarded(e) })
    }
  }

  events.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  const activities: Activity[] = events
    .map((event, i) => ({
      id: `act_${String(i + 1).padStart(3, '0')}`,
      performedBy: IT_TEAM[i % IT_TEAM.length]!,
      ...event,
    }))
    .reverse()

  return { assets, employees, assignments, activities, onboarding, offboarding }
}
