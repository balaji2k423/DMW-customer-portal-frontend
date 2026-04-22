// Mock data for DMW Robotics customer portal demo

export type MilestoneStatus = "completed" | "in-progress" | "pending";
export type TicketPriority = "low" | "medium" | "high" | "critical";
export type TicketStatus = "open" | "in-progress" | "closed";

export interface Milestone {
  id: string;
  name: string;
  description: string;
  plannedDate: string;
  actualDate: string | null;
  status: MilestoneStatus;
  owner: { name: string; initials: string };
  deliverables: string[];
  signedOff: boolean;
  progress: number;
}

export interface DocumentItem {
  id: string;
  name: string;
  category: "Commercials" | "Manuals" | "Drawings" | "Commissioning Reports";
  type: "pdf" | "dwg" | "xlsx" | "docx" | "zip";
  version: string;
  updatedDate: string;
  owner: { name: string; initials: string };
  size: string;
}

export interface TicketMessage {
  id: string;
  author: string;
  initials: string;
  role: "customer" | "engineer";
  timestamp: string;
  body: string;
  attachments?: { name: string; size: string }[];
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  lastUpdated: string;
  assignedEngineer: { name: string; initials: string; role: string };
  slaHoursRemaining: number;
  thread: TicketMessage[];
}

export interface NotificationItem {
  id: string;
  type: "milestone" | "document" | "ticket" | "system";
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
}

export const project = {
  name: "PRJ-2041 — Automotive Bodyshop Cell #3",
  customer: "Northwind Automotive Group",
  phase: "Commissioning",
  status: "In Progress",
  overallProgress: 68,
  startDate: "2025-08-12",
  targetCompletion: "2026-06-30",
};

export const currentUser = {
  name: "Alex Morgan",
  email: "alex.morgan@northwind-auto.com",
  role: "Project Sponsor",
  company: "Northwind Automotive Group",
  initials: "AM",
};

export const milestones: Milestone[] = [
  {
    id: "M1",
    name: "Concept & Design Approval",
    description: "Cell layout, robot selection, and process flow approved.",
    plannedDate: "2025-09-15",
    actualDate: "2025-09-12",
    status: "completed",
    owner: { name: "S. Patel", initials: "SP" },
    deliverables: ["Concept Layout v3.dwg", "Process FMEA.xlsx"],
    signedOff: true,
    progress: 100,
  },
  {
    id: "M2",
    name: "Detailed Engineering",
    description: "Mechanical, electrical, and controls engineering complete.",
    plannedDate: "2025-11-20",
    actualDate: "2025-11-22",
    status: "completed",
    owner: { name: "J. Lee", initials: "JL" },
    deliverables: ["GA Drawing.dwg", "Electrical Schematics.pdf", "BoM.xlsx"],
    signedOff: true,
    progress: 100,
  },
  {
    id: "M3",
    name: "Manufacturing & Procurement",
    description: "All long-lead items procured; fabrication complete.",
    plannedDate: "2026-01-30",
    actualDate: "2026-02-04",
    status: "completed",
    owner: { name: "R. Garcia", initials: "RG" },
    deliverables: ["FAT Plan.pdf", "Procurement Log.xlsx"],
    signedOff: true,
    progress: 100,
  },
  {
    id: "M4",
    name: "Factory Acceptance Test",
    description: "End-to-end FAT including robot pathing, safety circuits, and cycle time.",
    plannedDate: "2026-03-15",
    actualDate: null,
    status: "in-progress",
    owner: { name: "M. Chen", initials: "MC" },
    deliverables: ["FAT Report draft.pdf", "Cycle Time Log.xlsx"],
    signedOff: false,
    progress: 72,
  },
  {
    id: "M5",
    name: "Site Installation & Commissioning",
    description: "On-site mechanical install, controls integration, and dry runs.",
    plannedDate: "2026-05-10",
    actualDate: null,
    status: "pending",
    owner: { name: "T. Novak", initials: "TN" },
    deliverables: [],
    signedOff: false,
    progress: 0,
  },
  {
    id: "M6",
    name: "Site Acceptance & Handover",
    description: "SAT, operator training, and final handover documentation.",
    plannedDate: "2026-06-30",
    actualDate: null,
    status: "pending",
    owner: { name: "T. Novak", initials: "TN" },
    deliverables: [],
    signedOff: false,
    progress: 0,
  },
];

export const documents: DocumentItem[] = [
  { id: "D1", name: "Master Service Agreement.pdf", category: "Commercials", type: "pdf", version: "v2.1", updatedDate: "2025-08-20", owner: { name: "L. Hughes", initials: "LH" }, size: "2.4 MB" },
  { id: "D2", name: "Statement of Work — Cell #3.pdf", category: "Commercials", type: "pdf", version: "v1.3", updatedDate: "2025-09-02", owner: { name: "L. Hughes", initials: "LH" }, size: "1.1 MB" },
  { id: "D3", name: "Change Order — CO-007.pdf", category: "Commercials", type: "pdf", version: "v1.0", updatedDate: "2026-01-18", owner: { name: "L. Hughes", initials: "LH" }, size: "684 KB" },
  { id: "D4", name: "Robot Operating Manual — KR-1450.pdf", category: "Manuals", type: "pdf", version: "v4.0", updatedDate: "2025-10-11", owner: { name: "M. Chen", initials: "MC" }, size: "18.2 MB" },
  { id: "D5", name: "Safety PLC Manual.pdf", category: "Manuals", type: "pdf", version: "v2.0", updatedDate: "2025-10-11", owner: { name: "M. Chen", initials: "MC" }, size: "6.7 MB" },
  { id: "D6", name: "Maintenance Schedule.xlsx", category: "Manuals", type: "xlsx", version: "v1.2", updatedDate: "2026-02-12", owner: { name: "R. Garcia", initials: "RG" }, size: "320 KB" },
  { id: "D7", name: "Cell Layout — General Arrangement.dwg", category: "Drawings", type: "dwg", version: "v3.4", updatedDate: "2025-11-22", owner: { name: "J. Lee", initials: "JL" }, size: "4.1 MB" },
  { id: "D8", name: "Electrical Schematics.pdf", category: "Drawings", type: "pdf", version: "v2.2", updatedDate: "2025-11-22", owner: { name: "J. Lee", initials: "JL" }, size: "9.3 MB" },
  { id: "D9", name: "Pneumatic Diagrams.pdf", category: "Drawings", type: "pdf", version: "v1.1", updatedDate: "2025-12-04", owner: { name: "J. Lee", initials: "JL" }, size: "2.8 MB" },
  { id: "D10", name: "FAT Report — Phase 1.pdf", category: "Commissioning Reports", type: "pdf", version: "v1.0", updatedDate: "2026-03-08", owner: { name: "M. Chen", initials: "MC" }, size: "3.5 MB" },
  { id: "D11", name: "Cycle Time Analysis.xlsx", category: "Commissioning Reports", type: "xlsx", version: "v1.0", updatedDate: "2026-03-12", owner: { name: "M. Chen", initials: "MC" }, size: "412 KB" },
  { id: "D12", name: "Punch List — open items.docx", category: "Commissioning Reports", type: "docx", version: "v0.4", updatedDate: "2026-04-18", owner: { name: "M. Chen", initials: "MC" }, size: "98 KB" },
];

export const tickets: Ticket[] = [
  {
    id: "TKT-1042",
    title: "Robot 2 stops intermittently on tool change",
    description: "During FAT cycle 14, robot R2 halts at tool changer station with E-stop fault.",
    priority: "high",
    status: "in-progress",
    createdAt: "2026-04-18",
    lastUpdated: "2026-04-21",
    assignedEngineer: { name: "Marcus Chen", initials: "MC", role: "Senior Controls Engineer" },
    slaHoursRemaining: 6,
    thread: [
      { id: "m1", author: "Alex Morgan", initials: "AM", role: "customer", timestamp: "2026-04-18 10:24", body: "We are seeing intermittent stops on R2 at the tool changer. Happens roughly every 15 cycles. Can your team take a look before Friday's review?" },
      { id: "m2", author: "Marcus Chen", initials: "MC", role: "engineer", timestamp: "2026-04-18 11:02", body: "Thanks Alex — picked this up. Initial hypothesis is a proximity sensor debounce issue at the tool dock. I'll pull diagnostics from the controller this afternoon.", attachments: [{ name: "diagnostic-trace.zip", size: "1.2 MB" }] },
      { id: "m3", author: "Marcus Chen", initials: "MC", role: "engineer", timestamp: "2026-04-21 09:15", body: "Confirmed: prox sensor #3 is reporting flutter near the dock. We're shipping a replacement overnight and updating the PLC debounce window from 20ms → 50ms. Patch attached.", attachments: [{ name: "PLC-patch-v1.4.zip", size: "640 KB" }] },
    ],
  },
  {
    id: "TKT-1041",
    title: "Request: add HMI shortcut for manual jog mode",
    description: "Operators would like a one-tap shortcut on the HMI home screen.",
    priority: "low",
    status: "open",
    createdAt: "2026-04-15",
    lastUpdated: "2026-04-16",
    assignedEngineer: { name: "Sara Patel", initials: "SP", role: "HMI Specialist" },
    slaHoursRemaining: 38,
    thread: [],
  },
  {
    id: "TKT-1038",
    title: "Cycle time exceeds spec by 1.2s on station 4",
    description: "Measured cycle time at station 4 is 23.6s vs spec of 22.4s.",
    priority: "medium",
    status: "in-progress",
    createdAt: "2026-04-10",
    lastUpdated: "2026-04-19",
    assignedEngineer: { name: "Jin Lee", initials: "JL", role: "Process Engineer" },
    slaHoursRemaining: 22,
    thread: [],
  },
  {
    id: "TKT-1031",
    title: "Critical: Safety light curtain fault during dry run",
    description: "Light curtain at perimeter zone 2 latched a fault code that cleared after restart.",
    priority: "critical",
    status: "closed",
    createdAt: "2026-03-28",
    lastUpdated: "2026-04-02",
    assignedEngineer: { name: "Marcus Chen", initials: "MC", role: "Senior Controls Engineer" },
    slaHoursRemaining: 0,
    thread: [],
  },
  {
    id: "TKT-1027",
    title: "Updated electrical schematics needed for panel B",
    description: "Field changes during install need to be reflected in as-built drawings.",
    priority: "medium",
    status: "closed",
    createdAt: "2026-03-15",
    lastUpdated: "2026-03-22",
    assignedEngineer: { name: "Jin Lee", initials: "JL", role: "Process Engineer" },
    slaHoursRemaining: 0,
    thread: [],
  },
];

export const notifications: NotificationItem[] = [
  { id: "n1", type: "ticket", title: "TKT-1042 updated", description: "Marcus Chen posted a patch and replacement plan.", timestamp: "2 hours ago", read: false },
  { id: "n2", type: "document", title: "New document uploaded", description: "Punch List — open items.docx (v0.4)", timestamp: "5 hours ago", read: false },
  { id: "n3", type: "milestone", title: "FAT progress updated", description: "Factory Acceptance Test now at 72% complete.", timestamp: "Yesterday", read: false },
  { id: "n4", type: "document", title: "Cycle Time Analysis revised", description: "Cycle Time Analysis.xlsx updated by M. Chen", timestamp: "Yesterday", read: true },
  { id: "n5", type: "ticket", title: "TKT-1041 assigned", description: "Sara Patel assigned to your HMI feature request.", timestamp: "2 days ago", read: true },
  { id: "n6", type: "milestone", title: "Manufacturing milestone signed off", description: "Customer sign-off recorded for M3.", timestamp: "3 days ago", read: true },
  { id: "n7", type: "system", title: "MFA setup confirmed", description: "Two-factor authentication is active on your account.", timestamp: "1 week ago", read: true },
  { id: "n8", type: "ticket", title: "TKT-1038 status changed", description: "Cycle time investigation moved to In Progress.", timestamp: "1 week ago", read: true },
  { id: "n9", type: "document", title: "FAT Report — Phase 1 published", description: "FAT Report — Phase 1.pdf (v1.0)", timestamp: "2 weeks ago", read: true },
  { id: "n10", type: "milestone", title: "Detailed Engineering completed", description: "Milestone M2 marked complete.", timestamp: "3 weeks ago", read: true },
];

export const recentActivity = [
  { id: "a1", icon: "ticket", title: "Marcus Chen replied to TKT-1042", meta: "2 hours ago" },
  { id: "a2", icon: "document", title: "Punch List uploaded by M. Chen", meta: "5 hours ago" },
  { id: "a3", icon: "milestone", title: "FAT progress: 65% → 72%", meta: "Yesterday" },
  { id: "a4", icon: "document", title: "Cycle Time Analysis revised", meta: "Yesterday" },
  { id: "a5", icon: "milestone", title: "M3 signed off by sponsor", meta: "3 days ago" },
];
