/* Then & Now admin authoring prototype — throwaway. No persistence, no API. */
"use strict";

/* ---------------- icons ---------------- */
const ICONS = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.4 2.4 4.6-5"/>',
  mapPin: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  arrowLeft: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  warning: '<path d="M10.3 3.7 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  play: '<path d="m8 5 11 7-11 7Z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 11h18"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/>',
  flask: '<path d="M9 3h6M10 3v5l-6 10.5A2 2 0 0 0 5.8 22h12.4a2 2 0 0 0 1.7-3.5L14 8V3"/><path d="M7.5 15h9"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  external: '<path d="M14 3h7v7M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>',
  dots: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  archive: '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M10 13h4"/>',
  revoke: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 9 6 6M15 9l-6 6"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8"/>',
  fileText: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M8 13h8M8 17h6"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2"/>',
  map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z"/><path d="M9 3v15M15 6v15"/>',
  sparkle: '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z"/>',
  wifiOff: '<path d="M2 2l20 20M8.5 8.5A10 10 0 0 1 22 9M2 9a15 15 0 0 1 4.5-2.5M5 12.5a10 10 0 0 1 5-1.5M8.5 16a5 5 0 0 1 4-.7M12 20h.01"/>',
  sliders: '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="8" cy="18" r="2"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  photo: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8" cy="10" r="1.5"/><path d="m21 16-5-5L5 19"/>',
};

function icon(name, extra = "") {
  const body = ICONS[name] || ICONS.info;
  return `<svg class="icon ${extra}" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
}

const esc = (value = "") =>
  String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const initials = (name = "?") => name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

/* ---------------- roles ---------------- */
const ROLE_USERS = {
  content_editor: { name: "Amina W.", role: "Content editor", short: "Editor", initials: "AW" },
  admin: { name: "Daniel M.", role: "Administrator", short: "Admin", initials: "DM" },
  super_admin: { name: "Grace K.", role: "Super-admin", short: "Super-admin", initials: "GK" },
  moderator: { name: "Peter O.", role: "Moderator", short: "Moderator", initials: "PO" },
};
const ROLES = ["content_editor", "admin", "super_admin", "moderator"];
const SCENARIOS = [
  { id: "default", label: "Default" },
  { id: "empty", label: "Empty" },
  { id: "loading", label: "Loading" },
  { id: "offline", label: "Offline" },
  { id: "conflict", label: "409 conflict" },
  { id: "sensitive", label: "Sensitive review" },
  { id: "permission", label: "Read-only" },
  { id: "error", label: "Error" },
];
const ACCESS_LABEL = { camera_video: "Camera + video", video_only: "Video only", not_available: "Not available yet" };
const SENSITIVITY_LABEL = { standard: "Standard", sensitive: "Sensitive", restricted: "Restricted" };
const STATUS_LABEL = {
  published: "Published",
  draft: "Draft",
  in_review: "In review",
  approved: "Approved",
  scheduled: "Scheduled",
  unpublished: "Unpublished",
  archived: "Archived",
  revoked: "Revoked",
};
const STATUS_KIND = {
  published: "published",
  draft: "draft",
  in_review: "review",
  approved: "approved",
  scheduled: "scheduled",
  unpublished: "neutral",
  archived: "neutral",
  revoked: "blocked",
};

/* ---------------- fixtures ---------------- */
function makeData() {
  const sites = [
    {
      id: "railway",
      name: "Nairobi Railway Museum",
      slug: "nairobi-railway-museum",
      county: "Nairobi",
      locality: "Nairobi",
      type: "Historical",
      access: "camera_video",
      sensitivity: "standard",
      status: "published",
      managingAuthority: "National Museums of Kenya",
      destination: "Nairobi Railway Museum",
      photography: "Allowed with attribution · no tripods",
      culturalAuthority: "National Museums of Kenya",
      consent: "Community review recorded",
      consentDate: "12 Sep 2026",
      siteRules: "Stay behind the marked line. No climbing on locomotives. Filming for personal use is allowed.",
      safety: "The yard is uneven. Wear closed shoes; watch for moving vehicles near the depot.",
      shortDescription: "The railway that built Nairobi, as it is today.",
      fullDescription:
        "The museum preserves the locomotives, carriages, engineering equipment, photographs, and artefacts of Kenya and East Africa’s railway system. The Uganda Railway reached Nairobi in 1899 and helped shape the city’s growth.",
      sources: "NMK object labels · East African Railways archive · site visit 12 Sep 2026",
      factCheck: "Signed off by the content editor · 12 Sep 2026",
      publicRights: "Footage: client-supplied. Used with permission. Text: YTCI and community review.",
      updated: "Today, 09:42",
      image: "assets/railway.jpg",
      experiences: ["railway-exp"],
    },
    {
      id: "cemetery",
      name: "Nairobi War Cemetery",
      slug: "nairobi-war-cemetery",
      county: "Nairobi",
      locality: "Nairobi",
      type: "Historical",
      access: "video_only",
      sensitivity: "sensitive",
      status: "published",
      managingAuthority: "Commonwealth War Graves Commission",
      destination: "Nairobi War Cemetery",
      photography: "Respectful photography only · no individual graves without permission",
      culturalAuthority: "CWGC · custodian guidance",
      consent: "Custodian review recorded",
      consentDate: "11 Sep 2026",
      siteRules: "Walk quietly. Do not film individual graves or visitors. Follow the custodian’s guidance.",
      safety: "This is a place of remembrance. Group visits should announce themselves at the office.",
      shortDescription: "A place of remembrance, as it is today.",
      fullDescription:
        "The cemetery commemorates 1,952 Commonwealth service personnel who died during the Second World War, and others whose graves are unknown. Nairobi was the headquarters of the East African Force and an important military medical centre.",
      sources: "CWGC cemetery record · custodian briefing · site visit 11 Sep 2026",
      factCheck: "Signed off · 11 Sep 2026",
      publicRights: "Footage: client-supplied. Used with permission. Photography policy agreed with CWGC.",
      updated: "Yesterday, 16:20",
      image: "assets/cemetery.jpg",
      experiences: ["cemetery-exp"],
    },
    {
      id: "african",
      name: "African Heritage House",
      slug: "african-heritage-house",
      county: "Machakos",
      locality: "Mlolongo, Mavoko",
      type: "Cultural",
      access: "not_available",
      sensitivity: "standard",
      status: "draft",
      managingAuthority: "African Heritage House",
      destination: "",
      photography: "Not confirmed",
      culturalAuthority: "House management",
      consent: "",
      consentDate: "",
      siteRules: "Visits by arrangement. The house is a private property and a national monument.",
      safety: "Confirm the visitor route and photography rules before travelling.",
      shortDescription: "An African archive in architecture and objects.",
      fullDescription:
        "Completed in 1994, the house draws on Malian earthen structures, Moroccan mud palaces, and Swahili architecture. Its collection includes textiles, jewellery, pottery, ceremonial clothing, carved objects, and furniture.",
      sources: "House notes · client description · licence not yet cleared",
      factCheck: "Pending rights review",
      publicRights: "Rights and community consent not yet confirmed.",
      updated: "2 days ago",
      image: "assets/african-house.jpg",
      experiences: [],
    },
    {
      id: "nabongo",
      name: "Nabongo Cultural Centre",
      slug: "nabongo-cultural-centre",
      county: "Kakamega",
      locality: "Matungu",
      type: "Cultural",
      access: "not_available",
      sensitivity: "restricted",
      status: "draft",
      managingAuthority: "Wanga community",
      destination: "",
      photography: "Guided visits only · sacred spaces restricted",
      culturalAuthority: "Wanga community · Nabongo cultural custodians",
      consent: "",
      consentDate: "",
      siteRules: "Visit with a community guide. The mausoleum and sacred spaces need explicit permission.",
      safety: "Follow the guide’s instructions. Some spaces are restricted.",
      shortDescription: "The Wanga story, held by the community.",
      fullDescription:
        "Also known as Eshiembekho, the centre preserves the royal heritage and indigenous knowledge of the Wanga people. It holds royal regalia, tools, weapons, and artefacts, and includes a mausoleum and sacred spaces.",
      sources: "Community description · client notes · consent pending",
      factCheck: "Pending community review",
      publicRights: "Community consent not yet recorded.",
      updated: "3 days ago",
      image: "assets/nabongo.jpg",
      experiences: [],
    },
  ];

  const experiences = {
    "railway-exp": {
      id: "railway-exp",
      siteId: "railway",
      title: "The railway that built Nairobi",
      promise: "See the museum yard, the locomotives, and the workshop as they are today.",
      story:
        "The Uganda Railway reached Nairobi in 1899. The museum holds the locomotives, carriages, and engineering equipment that shaped the city. This is a current-scene portrait of the site, not a historical reconstruction.",
      period: "1899–1971",
      duration: 77,
      contentNotes: "The video is a current-scene walk through the yard. No historical footage is used.",
      safetyNotes: "Stay behind the marked line. No climbing on locomotives.",
      sources: "NMK object labels · East African Railways archive · site visit 12 Sep 2026",
      factCheck: "Signed off · 12 Sep 2026",
      mode: "camera_video",
      status: "published",
      liveRevision: 3,
      draftRevision: 4,
      draftStatus: "draft",
      submittedBy: "Amina W.",
      uploadedBy: "Amina W.",
      submittedAt: "",
      reviewer: "Unassigned",
      secondReviewer: null,
      secondReviewerApproved: false,
      clientApproval: null,
      languages: ["EN", "SW"],
      rightsExpiry: "30 Jun 2027",
      sensitivity: "standard",
      videoMaster: "4K master · 16:9 · 1:17",
      videoSize: "1.4 GB",
      renditions: { "1080": "Ready", "720": "Ready", "540": "Ready" },
      poster: true,
      captions: { en: true, sw: false },
      transcript: true,
      audioDescription: false,
      rights: "Client footage · cleared for app and web",
      rightsEvidence: "Signed release · 12 Sep 2026",
      consent: "Community review recorded · 12 Sep 2026",
      textCards: [
        { at: 6, text: "1899 — the Uganda Railway reaches Nairobi." },
        { at: 22, text: "The railway helped Nairobi grow into a major urban centre." },
        { at: 52, text: "The museum opened in 1971 under the East African Railways and Harbours Corporation." },
      ],
      updated: "Today, 09:42",
      lastSaved: "Today, 09:42",
      reviewNotes: [
        {
          author: "Daniel M.",
          role: "Administrator",
          at: "Today, 08:50",
          note: "Tighten card 02: the railway growth line repeats the promise. Keep the 1899 date and the 1971 opening.",
        },
      ],
      lastDecision: "changes",
      diff: {
        live: ["Title: The railway that built Nairobi", "Video: 4K master · 1:17", "Text cards: 2", "Transcript: EN"],
        draft: ["Title: The railway that built Nairobi", "Video: 1080p file replaced", "Text cards: 3", "Transcript: EN + timings"],
        changes: [1, 2, 3],
      },
    },
    "cemetery-exp": {
      id: "cemetery-exp",
      siteId: "cemetery",
      title: "A place of remembrance",
      promise: "A quiet, current-scene portrait of the cemetery and its custodian’s guidance.",
      story:
        "The cemetery commemorates 1,952 Commonwealth service personnel from the Second World War. The video is a respectful current-scene portrait. It does not film individual graves or visitors.",
      period: "1939–1945",
      duration: 93,
      contentNotes: "Sensitive site. No individual graves or visitors. Custodian approved the route.",
      safetyNotes: "Walk quietly. Follow the custodian’s guidance.",
      sources: "CWGC record · custodian briefing · site visit 11 Sep 2026",
      factCheck: "Signed off · 11 Sep 2026",
      mode: "video_only",
      status: "published",
      liveRevision: 2,
      draftRevision: 3,
      draftStatus: "in_review",
      submittedBy: "Amina W.",
      uploadedBy: "Amina W.",
      submittedAt: "Yesterday, 16:20",
      reviewer: "Unassigned",
      secondReviewer: null,
      secondReviewerApproved: false,
      clientApproval: { name: "Njeri K.", role: "Client approver", at: "Yesterday, 17:02" },
      languages: ["EN", "SW"],
      rightsExpiry: "31 Mar 2028",
      sensitivity: "sensitive",
      videoMaster: "4K master · 16:9 · 1:33",
      videoSize: "1.8 GB",
      renditions: { "1080": "Ready", "720": "Ready", "540": "Ready" },
      poster: true,
      captions: { en: true, sw: false },
      transcript: true,
      audioDescription: false,
      rights: "Client footage · cleared for app and web",
      rightsEvidence: "Signed release · 11 Sep 2026",
      consent: "CWGC custodian review · 11 Sep 2026",
      textCards: [
        { at: 10, text: "1,952 Commonwealth service personnel from the Second World War are commemorated here." },
        { at: 36, text: "Nairobi was the headquarters of the East African Force and an important military medical centre." },
        { at: 62, text: "The cemetery is a place of remembrance. Filming individual graves is not permitted." },
      ],
      updated: "Yesterday, 16:20",
      lastSaved: "Yesterday, 16:20",
      reviewNotes: [
        { author: "Daniel M.", role: "Administrator", at: "Yesterday, 17:05", note: "Sensitive site. Please confirm the no-graves note with the custodian before approval." },
      ],
      diff: {
        live: ["Video: 4K master · 1:33", "Text cards: 2", "Photography policy: respectful only"],
        draft: ["Video: 1080p file replaced", "Text cards: 3", "Photography policy: no individual graves"],
        changes: [0, 1, 2],
      },
    },
    "african-exp": {
      id: "african-exp",
      siteId: "african",
      title: "An African archive",
      promise: "",
      story: "",
      period: "1994",
      duration: 102,
      contentNotes: "",
      safetyNotes: "",
      sources: "House notes · client description · licence not yet cleared",
      factCheck: "Pending rights review",
      mode: "video_only",
      status: "draft",
      liveRevision: 0,
      draftRevision: 1,
      draftStatus: "draft",
      submittedBy: "Amina W.",
      uploadedBy: "Amina W.",
      submittedAt: "",
      reviewer: "Unassigned",
      secondReviewer: null,
      secondReviewerApproved: false,
      clientApproval: null,
      languages: ["EN", "SW"],
      rightsExpiry: "",
      sensitivity: "standard",
      videoMaster: "",
      videoSize: "",
      renditions: {},
      poster: false,
      captions: { en: false, sw: false },
      transcript: false,
      audioDescription: false,
      rights: "",
      rightsEvidence: "",
      consent: "",
      textCards: [],
      updated: "2 days ago",
      lastSaved: "2 days ago",
      reviewNotes: [],
      diff: { live: ["No live revision"], draft: ["Draft created · media not uploaded"], changes: [] },
    },
    "nabongo-exp": {
      id: "nabongo-exp",
      siteId: "nabongo",
      title: "The Wanga story",
      promise: "",
      story: "",
      period: "Wanga Kingdom",
      duration: 106,
      contentNotes: "",
      safetyNotes: "",
      sources: "Community description · client notes · consent pending",
      factCheck: "Pending community review",
      mode: "video_only",
      status: "draft",
      liveRevision: 0,
      draftRevision: 1,
      draftStatus: "draft",
      submittedBy: "Amina W.",
      uploadedBy: "Amina W.",
      submittedAt: "",
      reviewer: "Unassigned",
      secondReviewer: null,
      secondReviewerApproved: false,
      clientApproval: null,
      languages: ["EN", "SW"],
      rightsExpiry: "",
      sensitivity: "restricted",
      videoMaster: "",
      videoSize: "",
      renditions: {},
      poster: false,
      captions: { en: false, sw: false },
      transcript: false,
      audioDescription: false,
      rights: "",
      rightsEvidence: "",
      consent: "",
      textCards: [],
      updated: "3 days ago",
      lastSaved: "3 days ago",
      reviewNotes: [],
      diff: { live: ["No live revision"], draft: ["Draft created · consent pending"], changes: [] },
    },
  };

  const audit = [
    { id: "a1", entity: "railway-exp", type: "draft", title: "Draft v4 created", meta: "Amina W. · Today 08:15", note: "Revision for the current-scene video replacement." },
    { id: "a2", entity: "railway-exp", type: "media", title: "1080p video file replaced", meta: "Amina W. · Today 09:02", note: "Current-scene master, 4K 16:9. 1080p, 720p, 540p video files ready." },
    { id: "a3", entity: "railway-exp", type: "cards", title: "Text card 03 added", meta: "Amina W. · Today 09:18", note: "1971 museum opening context." },
    { id: "a4", entity: "railway-exp", type: "save", title: "Draft saved", meta: "Amina W. · Today 09:42", note: "Ready to submit for review." },
    { id: "a5", entity: "cemetery-exp", type: "submit", title: "Revision v3 submitted for review", meta: "Amina W. · Yesterday 16:20", note: "Sensitive site. Second reviewer required." },
    { id: "a6", entity: "cemetery-exp", type: "client", title: "Client approval recorded", meta: "Njeri K. · Yesterday 17:02", note: "Recorded by Daniel M. No client account." },
    { id: "a7", entity: "african", type: "site", title: "Access set to Not available yet", meta: "Daniel M. · 2 days ago", note: "Rights and community consent pending." },
    { id: "a8", entity: "nabongo", type: "site", title: "Sensitivity set to Restricted", meta: "Daniel M. · 3 days ago", note: "Mausoleum and sacred spaces." },
  ];

  return { sites, experiences, audit };
}

/* ---------------- state ---------------- */
let state = {};
function resetDemo({ keepRole = false, keepTheme = true } = {}) {
  const data = makeData();
  state = {
    sites: data.sites,
    experiences: data.experiences,
    audit: data.audit,
    role: keepRole ? state.role || "admin" : "admin",
    scenario: "default",
    theme: keepTheme ? state.theme || "light" : "light",
    tab: "story",
    siteTab: "identity",
    wizardStep: 1,
    wizard: { siteId: "railway", title: "A new site story", promise: "", mode: "camera_video", cards: [{ at: 6, text: "" }] },
    dirty: false,
    protoOpen: false,
    sidebarOpen: false,
    modal: null,
    toast: null,
    toastTimer: null,
    auditOpen: false,
    revisionsOpen: false,
    reviewFilter: "unassigned",
    siteSearch: "",
    siteCounty: "all",
    siteStatus: "all",
    expSearch: "",
    expStatus: "all",
    expSite: "all",
    uploadDemo: false,
    captionsOn: true,
  };
  if (state.theme === "dark") document.documentElement.classList.add("dark");
  else document.documentElement.classList.remove("dark");
}
resetDemo({ keepTheme: false });

/* ---------------- helpers ---------------- */
const user = () => ROLE_USERS[state.role];
const uploadedBy = (exp) => exp.uploadedBy || "Amina W.";
const cannotReview = (exp) => uploadedBy(exp) === user().name;
const can = (action) => {
  if (state.role === "moderator") return false;
  if (action === "publish" || action === "review" || action === "schedule" || action === "unpublish")
    return state.role === "admin" || state.role === "super_admin";
  if (action === "archive" || action === "revoke") return state.role === "super_admin";
  return true;
};
const route = () => (location.hash.replace(/^#/, "") || "/sites").split("?")[0];
const parts = () => route().split("/").filter(Boolean);
const siteById = (id) => state.sites.find((s) => s.id === id);
const expById = (id) => state.experiences[id];
const inReview = () => Object.values(state.experiences).filter((e) => e.draftStatus === "in_review");
const liveExperiences = () => Object.values(state.experiences).filter((e) => e.status === "published");
const isEditorPath = (path) => {
  const [page, id] = path.split("/").filter(Boolean);
  return (page === "sites" && id && id !== "new") || (page === "experiences" && id && id !== "new");
};
const isEditorRoute = () => isEditorPath(route());
const currentSite = () => (parts()[0] === "sites" ? siteById(parts()[1]) : null);
const currentExp = () => {
  const [page, id] = parts();
  if (page === "experiences" || page === "review") return expById(id);
  return null;
};

function badge(kind, label, extra = "") {
  return `<span class="badge badge-${kind} ${extra}"><span class="dot"></span>${esc(label)}</span>`;
}
function statusBadge(status, label) {
  return badge(STATUS_KIND[status] || "neutral", label || STATUS_LABEL[status] || status);
}
function accessBadge(access) {
  const kind = access === "camera_video" ? "approved" : access === "video_only" ? "neutral" : "warning";
  return badge(kind, ACCESS_LABEL[access] || access);
}
function sensitivityBadge(sensitivity) {
  if (sensitivity === "standard") return badge("neutral", "Standard");
  return badge("sensitive", SENSITIVITY_LABEL[sensitivity] || sensitivity);
}
function expStatusBadges(exp) {
  if (exp.status === "scheduled") return badge("scheduled", "Scheduled");
  if (exp.draftStatus === "in_review") return badge("review", "In review");
  if (exp.draftStatus === "approved") return badge("approved", "Approved");
  if (exp.status === "published" && exp.draftRevision > exp.liveRevision)
    return `${badge("published", `Live v${exp.liveRevision}`)} ${badge("draft", `Draft v${exp.draftRevision}`)}`;
  if (exp.status === "published") return badge("published", `Live v${exp.liveRevision}`);
  return badge("draft", "Draft");
}

function revisionSnapshot(exp) {
  return JSON.stringify({
    title: exp.title, promise: exp.promise, story: exp.story, period: exp.period,
    contentNotes: exp.contentNotes, safetyNotes: exp.safetyNotes, sources: exp.sources,
    textCards: (exp.textCards || []).map((card) => [card.at, card.text]),
  });
}

function materialChangeNeeded(exp) {
  if (exp.lastDecision !== "rejected") return false;
  if (!exp.rejectedSnapshot) return !exp.revisedSinceDecision;
  return revisionSnapshot(exp) === exp.rejectedSnapshot;
}

function submitBlockReason(exp) {
  if (state.scenario === "conflict") return "Resolve the 409 conflict before submitting";
  if (state.scenario === "offline") return "Reconnect before submitting";
  if (expReadiness(exp).blockers.some((b) => b.section !== "review")) return "Resolve the blocking checks first";
  if (materialChangeNeeded(exp)) return "Make a material change before resubmitting a rejected revision";
  return "";
}

function expReadiness(exp) {
  const blockers = [];
  const warnings = [];
  const add = (section, label) => blockers.push({ section, label });
  if (!exp.title?.trim()) add("story", "Title");
  if (!exp.promise?.trim()) add("story", "Promise");
  if (!exp.story?.trim()) add("story", "Story");
  if (!exp.videoMaster) add("media", "Current-scene video master");
  if (!exp.renditions?.["1080"] || exp.renditions["1080"] === "Missing") add("media", "1080p video file");
  if (!exp.poster) add("media", "Poster image");
  if (!exp.captions?.en) add("accessibility", "English captions");
  if (!exp.transcript) add("accessibility", "Transcript");
  if (!exp.rights) add("rights", "Rights record");
  if (!exp.consent) add("rights", "Cultural authority / consent");
  if ((exp.textCards || []).filter((c) => c.text.trim()).length < 2) add("cards", "At least two text cards");
  if (exp.draftStatus === "in_review") add("review", "Review decision");
  else if (exp.liveRevision > 0 && exp.draftRevision > exp.liveRevision && !["approved", "published"].includes(exp.draftStatus))
    add("review", `Review approval for v${exp.draftRevision}`);
  if (exp.languages.includes("SW") && !exp.captions?.sw) warnings.push({ section: "accessibility", label: "Swahili captions" });
  if (!exp.audioDescription) warnings.push({ section: "accessibility", label: "Audio description" });
  if (!exp.renditions?.["540"]) warnings.push({ section: "media", label: "540p video file" });
  return { blockers, warnings };
}

function siteReadiness(site) {
  const blockers = [];
  const warnings = [];
  const add = (section, label) => blockers.push({ section, label });
  if (!site.name?.trim()) add("identity", "Name");
  if (!site.county?.trim()) add("identity", "County");
  if (!site.type?.trim()) add("identity", "Site type");
  if (!site.access) add("policy", "Access mode");
  if (!site.sensitivity) add("policy", "Sensitivity");
  if (!site.photography?.trim()) add("policy", "Photography policy");
  if (!site.culturalAuthority?.trim()) add("policy", "Cultural authority");
  if (!site.consent?.trim()) add("policy", "Consent record");
  const published = (site.experiences || []).filter((id) => state.experiences[id]?.status === "published");
  if (published.length === 0) add("experiences", "At least one published experience");
  if (site.access === "not_available") warnings.push({ section: "policy", label: "Access mode is not available yet" });
  return { blockers, warnings };
}

function pageHead({ kicker, title, sub, actions = "", back = "" }) {
  return `<div class="page-head">
    <div>
      ${back ? `<button class="btn btn-text btn-sm" data-nav="${back.path}" style="padding-left:0;margin-bottom:8px">${icon("arrowLeft", "icon-sm")} ${esc(back.label)}</button>` : ""}
      <div class="kicker">${kicker}</div>
      <h1 class="page-title" tabindex="-1">${title}</h1>
      ${sub ? `<p class="page-sub">${sub}</p>` : ""}
    </div>
    <div class="page-actions">${actions}</div>
  </div>`;
}

function emptyState({ icon: iconName = "sparkle", title, body, cta, action }) {
  return `<div class="card empty">
    <div class="empty-icon">${icon(iconName, "icon-lg")}</div>
    <div class="empty-title">${esc(title)}</div>
    <p class="empty-body">${esc(body)}</p>
    ${cta ? `<button class="btn btn-primary" data-action="${action}">${icon("plus", "icon-sm")} ${esc(cta)}</button>` : ""}
  </div>`;
}

function skeleton(kind = "list") {
  if (kind === "editor") {
    return `<div class="sk-line sk-title"></div><div class="card card-pad"><div class="sk-line" style="width:30%"></div><div class="sk-line"></div><div class="sk-line"></div><div class="sk-line" style="width:70%"></div></div><div class="sk-card skeleton" style="margin-top:16px"></div>`;
  }
  if (kind === "review") {
    return `<div class="sk-line sk-title"></div><div class="sk-card skeleton"></div><div class="sk-card skeleton"></div>`;
  }
  return `<div class="sk-line sk-title"></div><div class="grid-4"><div class="sk-card skeleton"></div><div class="sk-card skeleton"></div><div class="sk-card skeleton"></div><div class="sk-card skeleton"></div></div><div class="sk-card skeleton" style="height:260px"></div>`;
}

/* ---------------- shell ---------------- */
function sidebar() {
  const count = state.role === "content_editor" ? 0 : inReview().length;
  const locked = (label) => `<button class="nav-item is-locked" data-action="locked-nav" data-label="${esc(label)}">${icon("lock")}<span>${esc(label)}</span></button>`;
  const mobileHidden = !state.sidebarOpen && window.innerWidth <= 980;
  return `<aside id="app-sidebar" class="sidebar ${state.sidebarOpen ? "open" : ""}" aria-label="Admin navigation" ${mobileHidden ? 'inert aria-hidden="true"' : ""}>
    <div class="brand">
      <div class="brand-mark">YTC</div>
      <div>
        <div class="brand-name">YTC Explorer</div>
        <div class="brand-sub">Admin portal</div>
      </div>
    </div>
    <nav class="nav">
      <div class="nav-group">
        <div class="nav-label">Discovery</div>
        <button class="nav-item" data-action="locked-nav" data-label="Analytics">${icon("grid")}<span>Analytics</span></button>
        <button class="nav-item" data-action="locked-nav" data-label="CMS">${icon("map")}<span>CMS</span></button>
        <button class="nav-item" data-action="locked-nav" data-label="Audio Stories">${icon("mic")}<span>Audio Stories</span></button>
        <button class="nav-item active" data-nav="/sites">${icon("film")}<span>Then &amp; Now</span>${count ? `<span class="nav-count">${count}</span>` : ""}</button>
        <button class="nav-item" data-action="locked-nav" data-label="Media Library">${icon("image")}<span>Media Library</span></button>
      </div>
      <div class="nav-group">
        <div class="nav-label">Engagement</div>
        ${locked("LMS")}${locked("Conservation")}${locked("Events")}
      </div>
      <div class="nav-group">
        <div class="nav-label">Platform</div>
        ${locked("Challenges")}${locked("Comments")}${locked("Campaigns")}${locked("User Management")}${locked("AI Config")}
      </div>
    </nav>
    <div class="sidebar-foot">
      <div class="sidebar-user">
        <div class="avatar">${user().initials}</div>
        <div>
          <div class="sidebar-user-name">${esc(user().name)}</div>
          <div class="sidebar-user-role">${esc(user().role)}</div>
        </div>
      </div>
      <button class="nav-item" data-action="locked-nav" data-label="Settings">${icon("sliders")}<span>Settings</span></button>
      <p class="sidebar-note">Throwaway prototype. Fixture data only; no server writes.</p>
    </div>
  </aside>`;
}

function crumbs() {
  const [page, id] = parts();
  let trail = `<button class="link" data-nav="/sites">Then &amp; Now</button>`;
  if (page === "sites") {
    trail += ` <span class="sep">/</span> <button class="link" data-nav="/sites">Sites</button>`;
    if (id === "new") trail += ` <span class="sep">/</span> <strong>New site</strong>`;
    else if (id) trail += ` <span class="sep">/</span> <strong>${esc(siteById(id)?.name || "Site")}</strong>`;
  } else if (page === "experiences") {
    trail += ` <span class="sep">/</span> <button class="link" data-nav="/experiences">Experiences</button>`;
    if (id === "new") trail += ` <span class="sep">/</span> <strong>New experience</strong>`;
    else if (id) trail += ` <span class="sep">/</span> <strong>${esc(expById(id)?.title || "Experience")}</strong>`;
  } else if (page === "review") {
    trail += ` <span class="sep">/</span> <button class="link" data-nav="/review">Review queue</button>`;
    if (id) trail += ` <span class="sep">/</span> <strong>${esc(expById(id)?.title || "Revision")}</strong>`;
  }
  return trail;
}

function topbar() {
  return `<header class="topbar">
    <button class="btn btn-icon btn-ghost menu-btn" data-action="toggle-sidebar" aria-label="${state.sidebarOpen ? "Close navigation" : "Open navigation"}" aria-expanded="${state.sidebarOpen}" aria-controls="app-sidebar">${icon("menu")}</button>
    <div class="crumbs">${crumbs()}</div>
    <div class="topbar-spacer"></div>
    <div class="topbar-actions">
      <button class="chip chip-gold" data-action="toggle-proto" aria-expanded="${state.protoOpen}" aria-controls="proto-panel" title="Open prototype controls">${icon("flask", "icon-sm")} Prototype</button>
      <span class="chip topbar-user" style="gap:7px"><span class="mini-avatar">${user().initials}</span><span class="nowrap">${esc(user().name)} · ${esc(user().short)}</span></span>
      <button class="btn btn-ghost btn-icon" data-action="toggle-theme" aria-label="Toggle light and dark mode" aria-pressed="${state.theme === "dark"}">${icon(state.theme === "dark" ? "sun" : "moon")}</button>
    </div>
  </header>`;
}

function shell(content) {
  return `<a class="skip-link" href="#content">Skip to main content</a>
  ${state.sidebarOpen ? `<div style="position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:35" data-action="toggle-sidebar" aria-hidden="true"></div>` : ""}
  <div class="app">
    ${sidebar()}
    <div class="main">
      ${topbar()}
      <main class="content" id="content">${content}</main>
    </div>
  </div>
  ${state.protoOpen ? protoPanel() : ""}`;
}

/* ---------------- prototype controls ---------------- */
function protoPanel() {
  const exp = currentExp();
  const siteForRail = currentSite();
  const readiness = exp ? expReadiness(exp) : siteForRail ? siteReadiness(siteForRail) : { blockers: [], warnings: [] };
  const snapshot = {
    route: route(), role: state.role, scenario: state.scenario, dirty: state.dirty,
    draftStatus: exp?.draftStatus || null,
    blocking: readiness.blockers.map((b) => b.label),
    warnings: readiness.warnings.map((w) => w.label),
  };
  return `<section class="proto-panel" id="proto-panel" aria-label="Prototype controls">
    <div class="proto-head"><span class="proto-title">Prototype controls</span><button class="close-btn" data-action="toggle-proto" aria-label="Close prototype controls">${icon("x")}</button></div>
    <div class="proto-body">
      <div><div class="proto-label">View as</div><select class="select" data-role-select aria-label="View as role">${ROLES.map((r) => `<option value="${r}" ${state.role === r ? "selected" : ""}>${ROLE_USERS[r].name} · ${ROLE_USERS[r].role}</option>`).join("")}</select></div>
      <div><div class="proto-label">Scenario</div><div class="proto-scenarios">${SCENARIOS.map((s) => `<button data-scenario="${s.id}" class="${state.scenario === s.id ? "active" : ""}">${s.label}</button>`).join("")}</div></div>
      <div><div class="proto-label">Jump to</div><div class="proto-scenarios">
        <button data-nav="/sites">Sites</button>
        <button data-nav="/experiences">Experiences</button>
        <button data-nav="/review">Review</button>
        <button data-nav="/experiences/railway-exp">Editor</button>
        <button data-nav="/sites/new">Site wizard</button>
      </div></div>
      <div><div class="proto-label">State</div><pre class="proto-state">${esc(JSON.stringify(snapshot, null, 2))}</pre></div>
      <div class="row" style="gap:6px"><button class="btn btn-ghost btn-sm" data-action="toggle-theme">${icon("moon", "icon-sm")} ${state.theme === "dark" ? "Light" : "Dark"} mode</button><button class="btn btn-ghost btn-sm" data-action="reset-demo">${icon("refresh", "icon-sm")} Reset</button></div>
      <p class="proto-note">Throwaway prototype. No persistence, API, or real uploads. The readiness rail mirrors the server contract; the UI never decides publishability.</p>
    </div>
  </section>`;
}

/* ---------------- routing ---------------- */
function navigate(path, { force = false } = {}) {
  if (!force && state.dirty && isEditorRoute() && path !== route()) {
    openModal({
      title: "Unsaved changes",
      sub: "You have edits that have not been saved.",
      body: `<p class="small muted">Save the draft before leaving, or leave without saving. This prototype does not keep a local copy.</p>`,
      actions: [
        { label: "Stay on this page", kind: "ghost", action: "close-modal" },
        { label: "Leave without saving", kind: "danger", action: "leave-dirty", value: path },
      ],
    });
    return;
  }
  state.dirty = false;
  state.sidebarOpen = false;
  if (location.hash === "#" + path) render();
  else location.hash = path;
}

/* ---------------- screens ---------------- */
function render() {
  document.documentElement.classList.toggle("dark", state.theme === "dark");
  state.currentRoute = route();
  const routeChanged = state.lastRenderedRoute !== state.currentRoute;
  state.lastRenderedRoute = state.currentRoute;
  if (state.toast && state.toastRoute !== state.currentRoute && !state.toast.keepOnRoute) {
    state.toast = null;
    clearTimeout(state.toastTimer);
  }
  const [page, id] = parts();
  let content = "";
  if (state.scenario === "loading") {
    content = `${pageHead({ kicker: "Then &amp; Now", title: "Loading", sub: "Loading the latest sites and experiences…" })}${skeleton(page === "review" ? "review" : "list")}`;
    document.getElementById("app").innerHTML = shell(content);
    renderChrome();
    return;
  }
  if (state.scenario === "error") {
    content = `${pageHead({ kicker: "Then &amp; Now · Experiences", title: "Experiences", sub: "One site video, two modes. The experience owns the media, text cards, accessibility, rights, and review." })}${topTabs("experiences")}<div class="card"><div class="empty" style="padding:52px"><div class="empty-icon" style="background:var(--danger-soft);color:var(--danger)">${icon("warning", "icon-lg")}</div><div class="empty-title">We couldn’t load the Then &amp; Now records</div><p class="empty-body">The server took too long to respond. Nothing was changed in the live revision. Check the connection and try again.</p><button class="btn btn-primary" data-action="retry-load">${icon("refresh", "icon-sm")} Retry</button></div></div>`;
    document.getElementById("app").innerHTML = shell(content);
    renderChrome();
    return;
  }
  if (page === "sites" && !id) content = sitesPage();
  else if (page === "sites" && id === "new") content = siteWizardPage();
  else if (page === "sites" && id) content = siteEditorPage(siteById(id));
  else if (page === "experiences" && !id) content = experiencesPage();
  else if (page === "experiences" && id === "new") content = experienceWizardPage();
  else if (page === "experiences" && id) content = experienceEditorPage(expById(id));
  else if (page === "review" && !id) content = reviewQueuePage();
  else if (page === "review" && id) content = reviewDetailPage(expById(id));
  else content = sitesPage();
  document.getElementById("app").innerHTML = shell(content);
  if (routeChanged) {
    window.scrollTo(0, 0);
    focusHeading();
  }
  renderChrome();
}

function focusHeading() {
  const heading = document.querySelector("#content h1");
  if (!heading) return;
  const text = heading.textContent.trim();
  if (text) document.title = `${text} · Then & Now admin`;
  heading.focus({ preventScroll: true });
}

function labelFields(root = document) {
  if (!root) return;
  root.querySelectorAll(".field").forEach((field) => {
    const label = field.querySelector("label");
    const control = field.querySelector("input,select,textarea");
    if (label && control && !control.getAttribute("aria-label")) {
      control.setAttribute("aria-label", label.textContent.trim().replace(/\s+/g, " "));
    }
  });
}

function renderChrome() {
  const modalRoot = document.getElementById("modal-root");
  if (modalRoot) modalRoot.innerHTML = state.modal ? modalHTML() : "";
  document.body.style.overflow = state.modal ? "hidden" : "";
  const appRoot = document.getElementById("app");
  if (appRoot) labelFields(appRoot);
  if (modalRoot && state.modal) labelFields(modalRoot);
  renderToast();
  if (state.modal) setTimeout(() => document.querySelector("[data-modal-panel] button, [data-modal-panel] input, [data-modal-panel] textarea")?.focus(), 30);
  if (state.sidebarOpen && window.innerWidth <= 980) setTimeout(() => document.querySelector("#app-sidebar .nav-item")?.focus(), 30);
}

function renderToast() {
  const root = document.getElementById("toast-root");
  if (!root) return;
  root.innerHTML = state.toast ? `<div class="toast ${state.toast.kind === "error" ? "toast-error" : ""}" role="status">${icon(state.toast.kind === "error" ? "warning" : "check")}<span>${esc(state.toast.message)}</span></div>` : "";
}

function toast(message, kind = "success", { keepOnRoute = false } = {}) {
  state.toast = { message, kind, keepOnRoute };
  state.toastRoute = route();
  clearTimeout(state.toastTimer);
  renderToast();
  state.toastTimer = setTimeout(() => { state.toast = null; renderToast(); }, 3600);
}

function topTabs(active) {
  const reviewCount = inReview().length;
  const tab = (id, label, href, count, locked = false) => `<button class="tab ${active === id ? "active" : ""} ${locked ? "is-locked" : ""}" ${locked ? 'data-action="locked-tab" data-label="' + label + '"' : `data-nav="${href}"`} ${active === id ? 'aria-current="page"' : ""}>${locked ? icon("lock", "icon-sm") : ""}${label}${count !== undefined ? `<span class="tab-count">${count}</span>` : ""}${locked ? `<span class="tiny" style="margin-left:4px">Post-v1</span>` : ""}</button>`;
  return `<div class="tabs" style="margin-bottom:18px">
    ${tab("sites", "Sites", "/sites", state.sites.length)}
    ${tab("experiences", "Experiences", "/experiences", Object.keys(state.experiences).length)}
    ${state.role === "content_editor" ? `<button class="tab is-locked" data-action="review-locked" aria-disabled="true">${icon("lock", "icon-sm")} Review</button>` : tab("review", "Review", "/review", reviewCount)}
    ${tab("trails", "Trails", "#", undefined, true)}
    ${tab("recognition", "Recognition", "#", undefined, true)}
  </div>`;
}

function roleNote() {
  if (state.role === "moderator") return `<div class="permission-banner">${icon("lock")} <span><strong>Read-only.</strong> Moderators can inspect records but cannot edit, review, publish, archive, or revoke.</span></div>`;
  if (state.role === "content_editor") return `<div class="permission-banner">${icon("info")} <span><strong>Editor access.</strong> You can draft, save, and submit. An administrator reviews and publishes.</span></div>`;
  return "";
}

function offlineBanner() {
  if (state.scenario !== "offline") return "";
  return `<div class="offline-banner">${icon("wifiOff")} <span>You’re offline. Changes stay on this device; uploads are paused. The last synced revision is shown.</span><button class="btn btn-ghost btn-sm" data-action="retry-connection">Retry</button></div>`;
}

function conflictBanner() {
  if (state.scenario !== "conflict") return "";
  return `<div class="conflict-banner">${icon("warning")} <span><strong>409 conflict.</strong> A newer revision (v5) was saved by Daniel at 10:14. Your draft is based on v4.</span><button class="btn btn-ghost btn-sm" data-action="save-draft">Resolve</button></div>`;
}

/* ---------------- sites list ---------------- */
function sitesPage() {
  const sites = state.scenario === "empty" ? [] : state.sites;
  const published = sites.filter((s) => s.status === "published").length;
  const needsRights = sites.filter((s) => s.access === "not_available" || !s.consent).length;
  const reviewCount = inReview().length;
  const pathCard = `<div class="card" style="border-left:3px solid var(--gold);margin-bottom:18px">
    <div class="panel-body" style="display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap">
      <div style="max-width:430px">
        <div class="kicker">Demo route</div>
        <div class="panel-title" style="font-size:16px;margin-top:4px">Author → review → publish</div>
        <div class="panel-sub">Follow the Railway Museum fixture through the v1 flow. Fixture data only.</div>
      </div>
      <div class="row wrap" style="gap:6px">
        <button class="btn btn-ghost btn-sm" data-nav="/sites/railway"><span class="mono" style="color:var(--gold-deep)">01</span> Site record</button>
        <button class="btn btn-ghost btn-sm" data-nav="/experiences/railway-exp"><span class="mono" style="color:var(--gold-deep)">02</span> Experience editor</button>
        <button class="btn btn-ghost btn-sm" data-nav="/review"><span class="mono" style="color:var(--gold-deep)">03</span> Review queue</button>
        <button class="btn btn-ghost btn-sm" data-nav="/review/cemetery-exp"><span class="mono" style="color:var(--gold-deep)">04</span> Sensitive review</button>
      </div>
    </div>
  </div>`;
  const rows = sites.map((site) => {
    const experiences = (site.experiences || []).map((id) => state.experiences[id]).filter(Boolean);
    const live = experiences.filter((e) => e.status === "published").length;
    const draft = experiences.some((e) => e.draftStatus === "in_review" || e.draftRevision > e.liveRevision);
    return `<tr data-site-row data-name="${esc(site.name.toLowerCase())}" data-county="${esc(site.county)}" data-access="${site.access}" data-status="${site.status}">
      <td><button class="row-link" data-nav="/sites/${site.id}"><div class="cell-title">${esc(site.name)}</div><div class="cell-sub">${esc(site.locality)} · ${esc(site.type)}</div><div class="mobile-table-meta">${esc(site.county)} · ${SENSITIVITY_LABEL[site.sensitivity]} · ${esc(site.updated)}</div></button></td>
      <td>${esc(site.county)}</td>
      <td>${accessBadge(site.access)}</td>
      <td>${sensitivityBadge(site.sensitivity)}</td>
      <td><span class="small">${live} live${draft ? ` · <span style="color:var(--gold-deep);font-weight:700">draft</span>` : ""}</span></td>
      <td>${statusBadge(site.status)}</td>
      <td class="tiny muted nowrap">${esc(site.updated)}</td>
      <td><button class="btn btn-ghost btn-sm" data-nav="/sites/${site.id}">Open</button></td>
    </tr>`;
  }).join("");
  return `${pageHead({
    kicker: "Then &amp; Now · Discovery",
    title: "Heritage sites",
    sub: "Author the place, its access policy, and the current-scene site video. The public app reads the published version.",
    actions: `<button class="btn btn-ghost" data-action="open-audit">${icon("history", "icon-sm")} Audit log</button><button class="btn btn-primary" data-nav="/sites/new">${icon("plus", "icon-sm")} New site</button>`,
  })}
  ${offlineBanner()}
  ${topTabs("sites")}
  ${sites.length ? pathCard : ""}
  <div class="grid-4">
    <div class="card stat stat-accent-green"><span class="stat-label">Sites</span><span class="stat-value">${sites.length}</span><span class="stat-foot">${published} published</span></div>
    <div class="card stat"><span class="stat-label">Live experiences</span><span class="stat-value">${liveExperiences().length}</span><span class="stat-foot">One primary per site</span></div>
    <div class="card stat stat-accent"><span class="stat-label">In review</span><span class="stat-value">${reviewCount}</span><span class="stat-foot">${reviewCount ? "Needs a decision" : "Queue clear"}</span></div>
    <div class="card stat stat-accent-red"><span class="stat-label">Needs rights / consent</span><span class="stat-value">${needsRights}</span><span class="stat-foot">Not playable yet</span></div>
  </div>
  <div class="section-head"><span class="section-title">All sites</span><span class="tiny muted" data-list-count>${sites.length} sites</span></div>
  <div class="panel">
    <div class="panel-head">
      <div class="row wrap" style="gap:8px">
        <div class="input" style="display:flex;align-items:center;gap:7px;width:230px;min-height:34px;padding:0 9px">${icon("search", "icon-sm")}<input data-filter="site-search" placeholder="Search sites" style="border:0;background:transparent;outline:none;width:100%;font-size:12px" aria-label="Search sites"/></div>
        <select class="select" data-filter="site-county" aria-label="Filter by county" style="width:145px;min-height:34px"><option value="all">All counties</option>${[...new Set(sites.map((s) => s.county))].map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join("")}</select>
        <select class="select" data-filter="site-status" aria-label="Filter by status" style="width:140px;min-height:34px"><option value="all">All statuses</option><option value="published">Published</option><option value="draft">Draft</option></select>
      </div>
      <span class="tiny muted">${sites.length ? "Server data · fixture" : "No records"}</span>
    </div>
    ${sites.length ? `<div class="table-wrap"><table class="sites-table" aria-label="Heritage sites"><thead><tr><th>Site</th><th>County</th><th>Access</th><th>Sensitivity</th><th>Experiences</th><th>Status</th><th>Updated</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : `<div class="panel-body"><div class="empty" style="padding:32px"><div class="empty-icon">${icon("grid", "icon-lg")}</div><div class="empty-title">No heritage sites yet</div><p class="empty-body">Create the first site, set its access policy, and add a current-scene experience. A site needs at least one published experience before it can go live.</p><button class="btn btn-primary" data-nav="/sites/new">${icon("plus", "icon-sm")} Create the first site</button></div></div>`}
  </div>`;
}

/* ---------------- site editor ---------------- */
function siteEditorPage(site) {
  if (!site) return `${pageHead({ kicker: "Then &amp; Now · Sites", title: "Site not found", sub: "This fixture is not available in the current scenario." })}${emptyState({ icon: "grid", title: "No site here", body: "Return to the sites list and choose a fixture.", cta: "Back to sites", action: "back-sites" })}`;
  const { blockers, warnings } = siteReadiness(site);
  const tabs = [
    ["identity", "Identity", ""],
    ["policy", "Policy", ""],
    ["location", "Location", ""],
    ["experiences", "Experiences", String((site.experiences || []).length)],
    ["sources", "Sources", ""],
  ];
  const siteTabId = `site-tab-${state.siteTab}`;
  const tabBar = `<div class="tabs editor-tabs" role="tablist">${tabs.map(([id, label, count]) => `<button class="tab ${state.siteTab === id ? "active" : ""}" id="site-tab-${id}" data-site-tab="${id}" role="tab" aria-selected="${state.siteTab === id}" aria-controls="site-tabpanel">${label}${count ? `<span class="tab-count">${count}</span>` : ""}</button>`).join("")}</div>`;
  const actions = `<button class="btn btn-ghost" data-action="open-site-preview">${icon("eye", "icon-sm")} Preview</button>
    ${can("edit") ? `<span class="chip" data-dirty>${state.dirty ? "Unsaved changes" : "Saved"}</span><button class="btn btn-ghost" data-action="save-site">${icon("save", "icon-sm")} ${site.status === "published" ? "Save changes" : "Save draft"}</button>` : ""}
    ${site.status === "published"
      ? can("publish") ? `<button class="btn btn-ghost" data-action="unpublish-site">Unpublish</button>` : `<span class="chip">${icon("lock", "icon-sm")} Admins publish</span>`
      : can("publish") ? `<button class="btn btn-primary" data-action="publish-site" ${blockers.length ? "disabled title=\"Resolve the readiness blockers first\"" : ""}>${icon("send", "icon-sm")} Publish site</button>` : `<span class="chip">${icon("lock", "icon-sm")} Admins publish</span>`}
    ${can("archive") ? `<button class="btn btn-ghost" data-action="archive-site" style="color:var(--danger)">${icon("archive", "icon-sm")} Archive</button>` : ""}`;
  return `${pageHead({
    kicker: "Heritage site", title: esc(site.name), sub: `${statusBadge(site.status)} · ${esc(site.locality === site.county ? site.locality : `${site.locality} · ${site.county}`)} · ${esc(site.type)} · ${(site.experiences || []).length} experience${(site.experiences || []).length === 1 ? "" : "s"}`,
    actions, back: { path: "/sites", label: "All sites" },
  })}
  ${roleNote()}${offlineBanner()}
  <div class="editor-layout">
    <div class="editor-main">
      <div class="panel">
        ${tabBar}
        <div class="tab-pane" role="tabpanel" id="site-tabpanel" aria-labelledby="${siteTabId}">${siteTabContent(site, state.siteTab)}</div>
      </div>
    </div>
    <aside class="rail" id="readiness-rail" aria-label="Site readiness">${siteRail(site)}</aside>
  </div>`;
}

function siteTabContent(site, tab) {
  const ro = !can("edit");
  if (tab === "policy") {
    return `<div class="tab-section">
      <div class="tab-section-head"><div><div class="section-number">02</div><div class="tab-section-title">Access, sensitivity, and consent</div><div class="tab-section-sub">The public app reads this policy before it shows the camera portal, the site video, or a not-available state.</div></div></div>
      <div class="form-grid">
        <div class="field span-2"><label>Access mode</label><div class="segmented" role="group" aria-label="Access mode">${Object.entries(ACCESS_LABEL).map(([id, label]) => `<button type="button" data-site-access="${id}" class="${site.access === id ? "active" : ""}" ${ro ? "disabled" : ""}>${label}</button>`).join("")}</div><div class="hint">Camera + video enables the on-site portal. Video only is the 2D experience. Not available yet keeps the site page up but non-playable.</div></div>
        <div class="field"><label>Sensitivity tier</label><select class="select" data-site-field="sensitivity" ${ro ? "disabled" : ""}>${Object.entries(SENSITIVITY_LABEL).map(([id, label]) => `<option value="${id}" ${site.sensitivity === id ? "selected" : ""}>${label}</option>`).join("")}</select></div>
        <div class="field span-2"><label>Photography and filming policy</label><textarea class="textarea" data-site-field="photography" ${ro ? "disabled" : ""}>${esc(site.photography)}</textarea></div>
        <div class="field"><label>Cultural authority</label><input class="input" data-site-field="culturalAuthority" value="${esc(site.culturalAuthority)}" ${ro ? "disabled" : ""}/></div>
        <div class="field"><label>Consent record</label><input class="input" data-site-field="consent" value="${esc(site.consent)}" placeholder="Record the community or custodian consent" ${ro ? "disabled" : ""}/><div class="hint">${site.consent ? "Recorded " + esc(site.consentDate) : "Required before publish for cultural and sensitive sites."}</div></div>
        <div class="field span-2"><label>Site rules</label><textarea class="textarea" data-site-field="siteRules" ${ro ? "disabled" : ""}>${esc(site.siteRules)}</textarea></div>
        <div class="field span-2"><label>Safety notes</label><textarea class="textarea" data-site-field="safety" ${ro ? "disabled" : ""}>${esc(site.safety)}</textarea></div>
      </div>
      ${site.access === "not_available" ? `<div class="callout callout-gold" style="margin-top:16px">${icon("info")}<div><strong>Not available yet.</strong> The site page can stay visible with the reason and a save action. The video and camera portal are disabled until rights and consent are recorded.</div></div>` : ""}
      ${site.sensitivity !== "standard" ? `<div class="callout" style="margin-top:12px">${icon("shield")}<div><strong>${SENSITIVITY_LABEL[site.sensitivity]} site.</strong> A second reviewer is required for sensitive revisions. The review queue records external cultural reviewers and client approvers without accounts.</div></div>` : ""}
    </div>`;
  }
  if (tab === "location") {
    return `<div class="tab-section">
      <div class="tab-section-head"><div><div class="section-number">03</div><div class="tab-section-title">Location and standing point</div><div class="tab-section-sub">V1 uses a site geofence for the camera portal. Anchor, bearing, and ghost-frame calibration are post-v1.</div></div><span class="chip">${icon("mapPin", "icon-sm")} 150 m default</span></div>
      <div class="location-grid">
        <div>
          <svg viewBox="0 0 620 300" role="img" aria-label="Illustrative map of the site geofence" style="width:100%;height:auto;border-radius:8px;border:1px solid var(--line);background:#e7f0e8">
            <defs><pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="#c9dbc9" stroke-width="1"/></pattern></defs>
            <rect width="620" height="300" fill="url(#grid)"/>
            <path d="M-20 210 C60 160 120 240 190 196 S320 120 390 160 520 230 660 160" fill="none" stroke="#8fb7c9" stroke-width="14" opacity=".7"/>
            <path d="M40 80 C150 120 230 70 330 100 S470 180 600 120" fill="none" stroke="#f4f7f2" stroke-width="10"/>
            <path d="M40 80 C150 120 230 70 330 100 S470 180 600 120" fill="none" stroke="#c2c9bb" stroke-width="1" stroke-dasharray="4 4"/>
            <path d="M120 300 C180 220 260 210 300 150 S360 60 460 -20" fill="none" stroke="#f4f7f2" stroke-width="8"/>
            <path d="M120 300 C180 220 260 210 300 150 S360 60 460 -20" fill="none" stroke="#c2c9bb" stroke-width="1" stroke-dasharray="4 4"/>
            <circle cx="330" cy="150" r="78" fill="#fdc003" opacity=".13" stroke="#785a00" stroke-width="1.5" stroke-dasharray="6 5"/>
            <circle cx="330" cy="150" r="4" fill="#154212"/>
            <path d="M330 150c-14-18-14-28 0-40 14 12 14 22 0 40Z" fill="#154212"/>
            <circle cx="330" cy="127" r="5" fill="#fdc003"/>
            <text x="342" y="142" font-family="Plus Jakarta Sans, sans-serif" font-size="10" font-weight="700" fill="#154212">Nairobi Railway Museum</text>
            <text x="342" y="155" font-family="Plus Jakarta Sans, sans-serif" font-size="9" fill="#42493e">Standing point · geofence 150 m</text>
          </svg>
          <div class="tiny muted" style="margin-top:6px">Illustrative map. Production uses MapLibre GL JS with a draggable pin and numeric fallback.</div>
        </div>
        <div class="stack">
          <div class="field"><label>Latitude</label><input class="input mono" value="${site.id === "railway" ? "-1.293613" : site.id === "cemetery" ? "-1.309866" : site.id === "african" ? "-1.400717" : "0.391607"}" ${ro ? "disabled" : ""}/></div>
          <div class="field"><label>Longitude</label><input class="input mono" value="${site.id === "railway" ? "36.822641" : site.id === "cemetery" ? "36.748275" : site.id === "african" ? "36.939163" : "34.477219"}" ${ro ? "disabled" : ""}/></div>
          <div class="field"><label>Geofence radius</label><input class="input" value="150 m" ${ro ? "disabled" : ""}/></div>
          <div class="field"><label>Standing point note</label><textarea class="textarea" style="min-height:68px" ${ro ? "disabled" : ""}>Main yard entrance, beside the information board.</textarea></div>
          <button class="btn btn-ghost btn-sm" data-action="use-map" ${ro ? "disabled" : ""}>${icon("mapPin", "icon-sm")} Use map pin</button>
        </div>
      </div>
      <div class="callout callout-gold" style="margin-top:16px">${icon("info")}<div><strong>Post-v1:</strong> camera anchor, heading, pitch, HFOV, ghost-frame composite, and a signed device preview. V1 ships a site geofence and a standing-point note for the camera portal.</div></div>
    </div>`;
  }
  if (tab === "experiences") {
    const items = (site.experiences || []).map((id) => state.experiences[id]).filter(Boolean);
    return `<div class="tab-section">
      <div class="tab-section-head"><div><div class="section-number">04</div><div class="tab-section-title">Experiences at this site</div><div class="tab-section-sub">One primary experience per site in v1. The experience owns the site video, text cards, captions, rights, and review.</div></div><button class="btn btn-ghost btn-sm" data-action="new-experience-site" data-site="${site.id}" ${!can("edit") ? "disabled" : ""}>${icon("plus", "icon-sm")} New experience</button></div>
      ${items.length ? `<div class="stack">${items.map((exp) => `<div class="card card-pad" style="box-shadow:none"><div class="row-between"><div><div class="row" style="gap:8px;flex-wrap:wrap"><strong>${esc(exp.title)}</strong>${expStatusBadges(exp)}${sensitivityBadge(exp.sensitivity)}</div><div class="tiny muted" style="margin-top:4px">${ACCESS_LABEL[exp.mode]} · ${exp.languages.join(" / ")} · rights ${esc(exp.rightsExpiry || "not set")}</div></div><button class="btn btn-ghost btn-sm" data-nav="/experiences/${exp.id}">Open</button></div></div>`).join("")}</div>` : `<div class="empty" style="padding:34px"><div class="empty-icon">${icon("film", "icon-lg")}</div><div class="empty-title">No experience yet</div><p class="empty-body">Add the site video and the context cards. The site cannot publish until at least one experience is live.</p><button class="btn btn-primary" data-action="new-experience-site" data-site="${site.id}" ${!can("edit") ? "disabled" : ""}>${icon("plus", "icon-sm")} Create the first experience</button></div>`}
    </div>`;
  }
  if (tab === "sources") {
    return `<div class="tab-section">
      <div class="tab-section-head"><div><div class="section-number">05</div><div class="tab-section-title">Sources and fact check</div><div class="tab-section-sub">The public rights line is shown with the site. Sources are for the review record, not the public page.</div></div></div>
      <div class="form-grid">
        <div class="field span-2"><label>Sources</label><textarea class="textarea" ${ro ? "disabled" : ""}>${esc(site.sources)}</textarea></div>
        <div class="field"><label>Fact-check sign-off</label><input class="input" value="${esc(site.factCheck)}" ${ro ? "disabled" : ""}/></div>
        <div class="field"><label>Review date</label><input class="input" value="12 Sep 2026" ${ro ? "disabled" : ""}/></div>
        <div class="field span-2"><label>Public rights line</label><textarea class="textarea" style="min-height:70px" ${ro ? "disabled" : ""}>${esc(site.publicRights)}</textarea><div class="hint">Shown at the bottom of the public site page.</div></div>
      </div>
      <div class="callout" style="margin-top:16px">${icon("shield")}<div><strong>Review evidence.</strong> Rights, consent, and the fact-check are part of the readiness gate. The admin preview is watermarked; no public draft links.</div></div>
    </div>`;
  }
  return `<div class="tab-section">
    <div class="tab-section-head"><div><div class="section-number">01</div><div class="tab-section-title">Identity</div><div class="tab-section-sub">The place the public app shows. Keep the public name plain and searchable.</div></div><span class="chip">${site.status === "published" ? "Live" : "Draft"}</span></div>
    <div class="form-grid">
      <div class="field span-2"><label>Site name</label><input class="input" data-site-field="name" value="${esc(site.name)}" ${ro ? "disabled" : ""}/></div>
      <div class="field"><label>County</label><input class="input" data-site-field="county" value="${esc(site.county)}" ${ro ? "disabled" : ""}/></div>
      <div class="field"><label>Locality</label><input class="input" data-site-field="locality" value="${esc(site.locality)}" ${ro ? "disabled" : ""}/></div>
      <div class="field"><label>Site type</label><select class="select" data-site-field="type" ${ro ? "disabled" : ""}><option ${site.type === "Historical" ? "selected" : ""}>Historical</option><option ${site.type === "Cultural" ? "selected" : ""}>Cultural</option></select></div>
      <div class="field"><label>Linked Destination</label><input class="input" data-site-field="destination" value="${esc(site.destination)}" placeholder="Optional catalog link" ${ro ? "disabled" : ""}/></div>
      <div class="field span-2"><label>Short description</label><input class="input" data-site-field="shortDescription" value="${esc(site.shortDescription)}" ${ro ? "disabled" : ""}/></div>
      <div class="field span-2"><label>Full description</label><textarea class="textarea" data-site-field="fullDescription" ${ro ? "disabled" : ""}>${esc(site.fullDescription)}</textarea></div>
      <div class="field span-2"><label>Managing authority</label><input class="input" data-site-field="managingAuthority" value="${esc(site.managingAuthority)}" ${ro ? "disabled" : ""}/></div>
    </div>
    <div class="callout" style="margin-top:16px">${icon("info")}<div><strong>V1 boundary.</strong> This record describes the site as it is today. It does not carry historical reconstructions, trails, or XP. Those are parked.</div></div>
  </div>`;
}

function siteRail(site) {
  const { blockers, warnings } = siteReadiness(site);
  const ready = blockers.length === 0;
  const groups = [];
  const group = (label, items, tab) => {
    if (!items.length) return;
    groups.push(`<div class="rail-group"><div class="rail-group-label"><span>${label}</span><span>${items.length}</span></div>${items.map((item) => `<button class="rail-item ${item.kind}" data-site-tab="${item.section || tab}">${icon(item.kind === "blocking" ? "warning" : item.kind === "warning" ? "info" : "checkCircle")}<span>${esc(item.label)}</span><span class="rail-deep">Open</span></button>`).join("")}</div>`);
  };
  group("Blocking", blockers.map((b) => ({ ...b, kind: "blocking" })), "identity");
  group("Warnings", warnings.map((w) => ({ ...w, kind: "warning" })), "policy");
  const published = (site.experiences || []).filter((id) => state.experiences[id]?.status === "published");
  return `<div class="rail-card">
    <div class="rail-head"><div class="kicker">Site readiness</div><div class="rail-state ${ready ? "ready" : ""}">${ready ? (site.status === "published" ? "Live" : "Ready to publish") : `${blockers.length} blocker${blockers.length === 1 ? "" : "s"}`}</div><div class="rail-sub">${published.length} published experience${published.length === 1 ? "" : "s"} · ${warnings.length} warning${warnings.length === 1 ? "" : "s"}</div></div>
    <div id="rail-body">
      <div class="rail-groups">${groups.join("") || `<div class="rail-group"><div class="rail-item ready">${icon("checkCircle")}<span>All site checks pass.</span></div></div>`}</div>
      <div class="rail-footer">
        <div class="rail-note">${site.status === "published" ? "The public site is live. Use Unpublish in the header to hide it; the records stay published internally." : !can("publish") ? "Administrators publish. You can save the draft." : ready ? "All site checks pass. Use Publish site in the header." : "Resolve the blocking checks before publishing."}</div>
        <button class="btn btn-text btn-sm" style="width:100%;margin-top:4px" data-action="refresh-readiness">${icon("refresh", "icon-sm")} Refresh readiness</button>
      </div>
    </div>
  </div>`;
}

function siteWizardPage() {
  const step = Math.min(4, Math.max(1, state.wizardStep || 1));
  state.wizardStep = step;
  const w = state.wizard;
  const total = 4;
  const stepLabel = { 1: "Identity", 2: "Policy", 3: "Location", 4: "Review" }[step];
  const steps = [1, 2, 3, 4].map((n) => `<div class="wizard-step ${n === step ? "active" : ""} ${n < step ? "done" : ""}"><span class="num">${n < step ? "✓" : n}</span>${n === 1 ? "Identity" : n === 2 ? "Policy" : n === 3 ? "Location" : "Review"}</div>`).join("");
  const body = step === 1 ? `<div class="form-grid">
      <div class="field span-2"><label>Site name</label><input class="input" data-wizard-field="name" value="${esc(w.name || "")}" placeholder="e.g. Nairobi Railway Museum"/><div class="hint">The public name. Plain and searchable.</div></div>
      <div class="field"><label>County</label><input class="input" data-wizard-field="county" value="${esc(w.county || "")}" placeholder="Nairobi"/></div>
      <div class="field"><label>Locality</label><input class="input" data-wizard-field="locality" value="${esc(w.locality || "")}" placeholder="Nairobi"/></div>
      <div class="field"><label>Site type</label><select class="select" data-wizard-field="type"><option>Historical</option><option>Cultural</option></select></div>
      <div class="field"><label>Managing authority</label><input class="input" data-wizard-field="authority" value="${esc(w.authority || "")}" placeholder="e.g. National Museums of Kenya"/></div>
    </div>` : step === 2 ? `<div class="form-grid">
      <div class="field span-2"><label>Access mode</label><div class="segmented">${Object.entries(ACCESS_LABEL).map(([id, label]) => `<button type="button" data-wizard-access="${id}" class="${(w.access || "camera_video") === id ? "active" : ""}">${label}</button>`).join("")}</div><div class="hint">Camera + video is the on-site portal. Video only is the 2D experience. Not available yet keeps the page up but non-playable.</div></div>
      <div class="field"><label>Sensitivity</label><select class="select" data-wizard-field="sensitivity"><option value="standard">Standard</option><option value="sensitive">Sensitive</option><option value="restricted">Restricted</option></select></div>
      <div class="field"><label>Cultural authority</label><input class="input" data-wizard-field="authority" value="${esc(w.authority || "")}" placeholder="Who speaks for the site?"/></div>
      <div class="field span-2"><label>Photography policy</label><textarea class="textarea" data-wizard-field="photography" placeholder="What may be photographed or filmed?">${esc(w.photography || "")}</textarea></div>
      <div class="field span-2"><label>Consent record</label><input class="input" data-wizard-field="consent" value="${esc(w.consent || "")}" placeholder="Record the community or custodian consent"/><div class="hint">Required before publish for cultural and sensitive sites.</div></div>
    </div>` : step === 3 ? `<div class="form-grid">
      <div class="field span-2"><label>Standing point</label><input class="input" data-wizard-field="standing" value="${esc(w.standing || "")}" placeholder="Where should the visitor stand?"/><div class="hint">A short, safe instruction. V1 uses a 150 m site geofence; camera anchors are post-v1.</div></div>
      <div class="field"><label>Latitude</label><input class="input" data-wizard-field="lat" value="${esc(w.lat || "")}" placeholder="-1.293613"/></div>
      <div class="field"><label>Longitude</label><input class="input" data-wizard-field="lng" value="${esc(w.lng || "")}" placeholder="36.822641"/></div>
      <div class="field"><label>Geofence radius</label><input class="input" data-wizard-field="radius" value="${esc(w.radius || "150")}"/></div>
      <div class="field"><label>Safety note</label><textarea class="textarea" data-wizard-field="safety" style="min-height:70px" placeholder="Steps, uneven ground, opening hours…">${esc(w.safety || "")}</textarea></div>
      <div class="callout" style="grid-column:1/-1">${icon("map")}<div><strong>Map picker.</strong> Production opens MapLibre with a draggable pin. The site editor’s Location tab shows the current pin, the 150 m geofence, and the standing-point note. Anchors and ghost frames are post-v1.</div></div>
    </div>` : `<div class="stack">
      <div class="callout callout-green">${icon("checkCircle")}<div><strong>The draft can be created now.</strong> Readiness is checked in the site editor. A site needs at least one published experience before it can go live.</div></div>
      <div class="summary-list">
        <div class="summary-row"><span>Site</span><span>${esc(w.name || "Untitled site")}</span></div>
        <div class="summary-row"><span>County</span><span>${esc(w.county || "Not set")}</span></div>
        <div class="summary-row"><span>Access</span><span>${ACCESS_LABEL[w.access || "camera_video"]}</span></div>
        <div class="summary-row"><span>Consent</span><span>${w.consent ? esc(w.consent) : "Not recorded"}</span></div>
      </div>
      <div class="callout">${icon("info")}<div>The wizard creates a draft and opens the full editor. It never bypasses the readiness gate.</div></div>
    </div>`;
  return `${pageHead({ kicker: "Then &amp; Now · Sites", title: "New heritage site", sub: "A short wizard creates the draft. The full editor owns the policy, location, experiences, and sources.", back: { path: "/sites", label: "All sites" } })}
  <div class="wizard-shell">
    <div class="panel">
      <div class="wizard-steps">${steps}</div>
      <div class="wizard-body">${body}</div>
      <div class="wizard-foot"><button class="btn btn-ghost" data-action="wizard-prev" ${step === 1 ? "disabled" : ""}>${icon("chevronLeft", "icon-sm")} Back</button><span class="tiny muted">Step ${step} of ${total} · ${stepLabel}</span>${step < total ? `<button class="btn btn-primary" data-action="wizard-next">Continue ${icon("chevronRight", "icon-sm")}</button>` : `<button class="btn btn-primary" data-action="create-site">${icon("plus", "icon-sm")} Create draft</button>`}</div>
    </div>
    <aside class="wizard-aside"><div class="rail-card"><div class="rail-head"><div class="kicker">Draft summary</div><div class="rail-state" style="font-size:20px">${esc(w.name || "Untitled site")}</div><div class="rail-sub">${esc(w.county || "County not set")} · ${ACCESS_LABEL[w.access || "camera_video"]}</div></div><div class="rail-footer"><div class="rail-note">The site will start as a draft. Add an experience and clear the readiness rail before publishing.</div></div></div></aside>
  </div>`;
}

/* ---------------- experiences list ---------------- */
function experiencesPage() {
  const exps = state.scenario === "empty" ? [] : Object.values(state.experiences);
  const live = exps.filter((e) => e.status === "published").length;
  const review = exps.filter((e) => e.draftStatus === "in_review").length;
  const blocked = exps.filter((e) => expReadiness(e).blockers.some((b) => b.section !== "review")).length;
  const rows = exps.map((exp) => {
    const site = siteById(exp.siteId);
    return `<tr data-exp-row data-name="${esc(exp.title.toLowerCase())}" data-site="${exp.siteId}" data-status="${exp.draftStatus || exp.status}">
      <td><button class="row-link" data-nav="/experiences/${exp.id}"><div class="cell-title">${esc(exp.title)}</div><div class="cell-sub">${esc(site?.name || "Unknown site")} · ${esc(exp.mode === "camera_video" ? "Camera + video" : "Video only")}</div><div class="mobile-table-meta">${exp.languages.join(" / ")} · ${exp.liveRevision ? `v${exp.liveRevision} live` : `v${exp.draftRevision} draft`} · rights ${esc(exp.rightsExpiry || "not set")}</div></button></td>
      <td>${esc(site?.name || "—")}</td>
      <td>${badge(exp.mode === "camera_video" ? "approved" : "neutral", exp.mode === "camera_video" ? "Camera + video" : "Video only")}</td>
      <td>${exp.languages.join(" / ")}</td>
      <td>${expStatusBadges(exp)}</td>
      <td class="tiny">${exp.liveRevision ? `v${exp.liveRevision} live${exp.draftRevision > exp.liveRevision ? ` · v${exp.draftRevision} draft` : ""}` : `v${exp.draftRevision} draft`}</td>
      <td class="tiny">${esc(exp.rightsExpiry || "Not set")}</td>
      <td class="tiny muted nowrap">${esc(exp.updated)}</td>
      <td><button class="btn btn-ghost btn-sm" data-nav="/experiences/${exp.id}">Open</button></td>
    </tr>`;
  }).join("");
  return `${pageHead({ kicker: "Then &amp; Now · Experiences", title: "Experiences", sub: "One site video, two modes. The experience owns the media, text cards, accessibility, rights, and review.", actions: `<button class="btn btn-ghost" data-action="open-audit">${icon("history", "icon-sm")} Audit log</button><button class="btn btn-primary" data-nav="/experiences/new">${icon("plus", "icon-sm")} New experience</button>` })}
  ${offlineBanner()}${topTabs("experiences")}
  <div class="grid-4">
    <div class="card stat stat-accent-green"><span class="stat-label">Experiences</span><span class="stat-value">${exps.length}</span><span class="stat-foot">Across ${new Set(exps.map((e) => e.siteId)).size} sites</span></div>
    <div class="card stat"><span class="stat-label">Live</span><span class="stat-value">${live}</span><span class="stat-foot">Published revisions</span></div>
    <div class="card stat stat-accent"><span class="stat-label">In review</span><span class="stat-value">${review}</span><span class="stat-foot">Frozen revisions</span></div>
    <div class="card stat stat-accent-red"><span class="stat-label">Blocked</span><span class="stat-value">${blocked}</span><span class="stat-foot">Readiness blockers</span></div>
  </div>
  <div class="section-head"><span class="section-title">All experiences</span><span class="tiny muted" data-list-count>${exps.length} experiences</span></div>
  <div class="panel">
    <div class="panel-head"><div class="row wrap" style="gap:8px">
      <div class="input" style="display:flex;align-items:center;gap:7px;width:230px;min-height:34px;padding:0 9px">${icon("search", "icon-sm")}<input data-filter="exp-search" placeholder="Search experiences" style="border:0;background:transparent;outline:none;width:100%;font-size:12px" aria-label="Search experiences"/></div>
      <select class="select" data-filter="exp-site" aria-label="Filter by site" style="width:190px;min-height:34px"><option value="all">All sites</option>${state.sites.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join("")}</select>
      <select class="select" data-filter="exp-status" aria-label="Filter by status" style="width:145px;min-height:34px"><option value="all">All statuses</option><option value="in_review">In review</option><option value="draft">Draft</option><option value="published">Published</option></select>
    </div><span class="tiny muted">Rights expiry · EAT</span></div>
    ${exps.length ? `<div class="table-wrap"><table class="experiences-table" aria-label="Then and Now experiences"><thead><tr><th>Experience</th><th>Site</th><th>Mode</th><th>Languages</th><th>Status</th><th>Revision</th><th>Rights</th><th>Updated</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : `<div class="panel-body"><div class="empty" style="padding:32px"><div class="empty-icon">${icon("film", "icon-lg")}</div><div class="empty-title">No experiences yet</div><p class="empty-body">Create the first experience for a site. The wizard creates a draft; the readiness rail decides when it can be submitted and published.</p><button class="btn btn-primary" data-nav="/experiences/new">${icon("plus", "icon-sm")} Create the first experience</button></div></div>`}
  </div>`;
}

/* ---------------- experience editor ---------------- */
function experienceEditorPage(exp) {
  if (!exp) return `${pageHead({ kicker: "Then &amp; Now · Experiences", title: "Experience not found", sub: "This fixture is not available in the current scenario." })}${emptyState({ icon: "film", title: "No experience here", body: "Return to the experiences list and choose a fixture.", cta: "Back to experiences", action: "back-experiences" })}`;
  const site = siteById(exp.siteId);
  const { blockers, warnings } = expReadiness(exp);
  const authoringBlockers = blockers.filter((b) => b.section !== "review");
  const frozen = exp.draftStatus === "in_review" || exp.draftStatus === "approved";
  const submitReason = submitBlockReason(exp);
  const submitBlocked = Boolean(submitReason);
  const submitTitle = submitReason;
  const readOnly = frozen || !can("edit");
  const tabs = [
    ["story", "Story & sources", ""],
    ["media", "Video & media", ""],
    ["cards", "Text cards", String(exp.textCards.length)],
    ["accessibility", "Accessibility", ""],
    ["rights", "Rights & review", ""],
    ["preview", "Preview", ""],
  ];
  const actions = `${exp.draftStatus === "in_review" ? `<button class="btn btn-primary" data-action="open-review">${icon("checkCircle", "icon-sm")} Open review</button>` : ""}
    ${!frozen && can("edit") ? `<span class="chip" data-dirty>${state.dirty ? "Unsaved changes" : "Saved"}</span><button class="btn btn-ghost" data-action="save-draft">${icon("save", "icon-sm")} Save draft</button>` : ""}
    ${exp.draftStatus === "approved" && can("publish") ? `<button class="btn btn-gold" data-action="schedule-publish">${icon("calendar", "icon-sm")} Schedule</button><button class="btn btn-primary" data-publish-btn data-action="publish-now">${icon("send", "icon-sm")} Publish now</button>` : ""}
    ${!frozen && exp.draftStatus === "draft" && can("edit") ? `<button class="btn btn-primary" data-publish-btn data-action="submit-review" ${submitBlocked ? `disabled title="${submitTitle}"` : ""}>${icon("send", "icon-sm")} ${exp.lastDecision === "rejected" ? "Revise and resubmit" : exp.lastDecision === "changes" ? "Resubmit for review" : "Submit for review"}</button>` : ""}
    ${exp.status === "published" && !frozen && exp.draftRevision <= exp.liveRevision && can("edit") ? `<button class="btn btn-primary" data-action="new-revision">${icon("history", "icon-sm")} Edit new revision</button>` : ""}
    ${exp.draftStatus === "in_review" && can("edit") ? `<button class="btn btn-ghost" data-action="return-draft">Return to draft</button>` : ""}`;
  const expTabId = `exp-tab-${state.tab}`;
  const tabBar = `<div class="tabs editor-tabs" role="tablist">${tabs.map(([id, label, count]) => `<button class="tab ${state.tab === id ? "active" : ""}" id="exp-tab-${id}" data-tab="${id}" role="tab" aria-selected="${state.tab === id}" aria-controls="exp-tabpanel">${label}${count ? `<span class="tab-count">${count}</span>` : ""}</button>`).join("")}</div>`;
  const revisionBanner = exp.liveRevision && exp.draftRevision > exp.liveRevision ? `<div class="revision-banner">${icon("history")}<span><strong>${exp.draftStatus === "in_review" ? "Draft v" + exp.draftRevision + " is frozen in review." : exp.draftStatus === "approved" ? "Draft v" + exp.draftRevision + " is approved." : "Editing draft v" + exp.draftRevision + "."}</strong> Live v${exp.liveRevision} stays public until this revision is published. <button class="btn btn-text btn-sm" data-action="open-revisions">View revision history</button></span></div>` : "";
  const frozenBanner = frozen ? `<div class="callout callout-gold" style="margin-bottom:14px">${icon("lock")}<div><strong>${exp.draftStatus === "in_review" ? "Frozen for review." : "Approved and frozen."}</strong> ${exp.draftStatus === "in_review" ? "Return the revision to draft to make changes. Reviewers see the frozen snapshot." : "This revision is ready to publish. Return to draft to make changes."}</div></div>` : "";
  const feedbackLabel = exp.lastDecision === "rejected" ? "Rejected by" : exp.lastDecision === "returned" ? "Returned to draft by" : "Changes requested by";
  const feedback = exp.draftStatus === "draft" && exp.reviewNotes?.length
    ? `<div class="callout ${exp.lastDecision === "rejected" ? "callout-red" : exp.lastDecision === "returned" ? "" : "callout-gold"}" style="margin-bottom:14px">${icon(exp.lastDecision === "rejected" ? "warning" : "info")}<div><strong>${feedbackLabel} ${esc(exp.reviewNotes[0].author)}${exp.reviewNotes[0].author.endsWith(".") ? "" : "."}</strong> ${esc(exp.reviewNotes[0].at)}<br/>${esc(exp.reviewNotes[0].note)}${exp.lastDecision === "rejected" ? `<div class="tiny" style="margin-top:5px">${materialChangeNeeded(exp) ? "Edit the content to enable resubmission." : "Content changed. You can resubmit for review."}</div>` : ""}</div><button class="btn btn-text btn-sm" data-action="open-audit">View audit</button></div>`
    : "";
  return `${pageHead({ kicker: `Experience · ${esc(site?.name || "Site")}`, title: esc(exp.title), sub: `${expStatusBadges(exp)} · ${ACCESS_LABEL[exp.mode]} · ${exp.languages.join(" / ")} · rights ${esc(exp.rightsExpiry || "not set")} · last saved ${esc(exp.lastSaved)}`, actions, back: { path: "/experiences", label: "All experiences" } })}
  ${roleNote()}${offlineBanner()}${conflictBanner()}${feedback}${revisionBanner}${frozenBanner}
  <div class="editor-layout">
    <div class="editor-main"><div class="panel">${tabBar}<div class="tab-pane" role="tabpanel" id="exp-tabpanel" aria-labelledby="${expTabId}">${expTabContent(exp, site, state.tab, readOnly)}</div></div></div>
    <aside class="rail" id="readiness-rail" aria-label="Publish readiness">${expRail(exp)}</aside>
  </div>`;
}

function expTabContent(exp, site, tab, ro) {
  if (tab === "media") return expMediaTab(exp, site, ro);
  if (tab === "cards") return expCardsTab(exp, ro);
  if (tab === "accessibility") return expAccessibilityTab(exp, site, ro);
  if (tab === "rights") return expRightsTab(exp, ro);
  if (tab === "preview") return expPreviewTab(exp, site);
  return `<div class="tab-section">
    <div class="tab-section-head"><div><div class="section-number">01</div><div class="tab-section-title">Story &amp; sources</div><div class="tab-section-sub">The public promise and the review record. Keep the promise honest: current scene, not a historical reconstruction.</div></div><span class="chip">${esc(exp.period)}</span></div>
    <div class="form-grid">
      <div class="field span-2"><label>Title</label><input class="input" data-exp-field="title" value="${esc(exp.title)}" ${ro ? "disabled" : ""}/></div>
      <div class="field span-2"><label>Promise</label><input class="input" data-exp-field="promise" value="${esc(exp.promise)}" ${ro ? "disabled" : ""}/><div class="hint">One line. What will the visitor see?</div></div>
      <div class="field span-2"><label>Story</label><textarea class="textarea" data-exp-field="story" ${ro ? "disabled" : ""}>${esc(exp.story)}</textarea></div>
      <div class="field"><label>Historical period</label><input class="input" data-exp-field="period" value="${esc(exp.period)}" ${ro ? "disabled" : ""}/></div>
      <div class="field"><label>Duration</label><input class="input" value="${exp.duration} seconds" ${ro ? "disabled" : ""}/><div class="hint">Short: 60–110 seconds in v1.</div></div>
      <div class="field span-2"><label>Content notes</label><textarea class="textarea" style="min-height:70px" data-exp-field="contentNotes" ${ro ? "disabled" : ""}>${esc(exp.contentNotes)}</textarea></div>
      <div class="field span-2"><label>Safety notes</label><textarea class="textarea" style="min-height:70px" data-exp-field="safetyNotes" ${ro ? "disabled" : ""}>${esc(exp.safetyNotes)}</textarea></div>
      <div class="field span-2"><label>Sources</label><textarea class="textarea" style="min-height:70px" data-exp-field="sources" ${ro ? "disabled" : ""}>${esc(exp.sources)}</textarea></div>
      <div class="field"><label>Fact-check sign-off</label><input class="input" value="${esc(exp.factCheck)}" ${ro ? "disabled" : ""}/></div>
      <div class="field"><label>Rights line</label><input class="input" value="${esc(site?.publicRights || "")}" disabled/></div>
    </div>
    <div class="callout callout-gold" style="margin-top:16px">${icon("info")}<div><strong>Current scene only.</strong> The site video shows the place as it is today. Text cards add short context from the client description; they are not a historical reconstruction.</div></div>
  </div>`;
}

function expMediaTab(exp, site, ro) {
  const renditionRow = (label, format, status, size) => `<tr><td><strong>${label}</strong><div class="tiny muted">${format}</div></td><td>${status === "Ready" ? badge("published", "Ready") : status === "Missing" ? badge("blocked", "Missing") : badge("warning", status)}</td><td class="tiny">${size || "—"}</td><td>${status === "Ready" ? `<button class="btn btn-text btn-sm" data-action="open-preview" ${ro ? "disabled" : ""}>Preview</button>` : `<button class="btn btn-text btn-sm" data-action="simulate-upload" ${ro ? "disabled" : ""}>Upload</button>`}</td></tr>`;
  return `<div class="tab-section">
    <div class="tab-section-head"><div><div class="section-number">02</div><div class="tab-section-title">Video &amp; media</div><div class="tab-section-sub">Pre-compressed 4K current-scene master with 1080p, 720p, and 540p video files. No transcoding in v1.</div></div><span class="chip">${icon("video", "icon-sm")} ${esc(exp.videoMaster || "No master yet")}</span></div>
    ${exp.videoMaster ? `<div class="media-master">
      <button class="media-thumb media-thumb-btn" data-action="open-preview" aria-label="Open the watermarked preview for ${esc(exp.title)}"><img src="${site?.image || "assets/railway.jpg"}" alt="" loading="lazy"/><span class="media-play"><span>${icon("play", "icon-lg")}</span></span></button>
      <div class="media-meta"><strong>Current-scene master</strong><br/>${esc(exp.videoMaster)} · ${esc(exp.videoSize)}<br/>H.264 MP4 · 16:9 · stereo · ${exp.duration} s<br/><span class="tiny muted">Poster ready · rights expire ${esc(exp.rightsExpiry)}</span><div class="row" style="gap:6px;margin-top:8px"><button class="btn btn-ghost btn-sm" data-action="replace-video" ${ro ? "disabled" : ""}>${icon("upload", "icon-sm")} Replace video</button><button class="btn btn-text btn-sm" data-action="toggle-upload-demo">Upload states</button></div></div>
    </div>` : `<div class="upload-drop"><strong>No video master yet</strong><span class="tiny">Upload the pre-compressed 4K current-scene master. It must be 16:9, under the duration limit, and carry a current rights record.</span><button class="btn btn-primary btn-sm" data-action="replace-video" ${ro ? "disabled" : ""}>${icon("upload", "icon-sm")} Choose file</button></div>`}
    ${state.uploadDemo ? `<div class="card" style="margin-top:14px;box-shadow:none"><div class="panel-body"><div class="panel-title" style="margin-bottom:8px">Upload states</div><div class="reviewer-row"><span class="badge badge-warning"><span class="dot"></span>Validating</span><span class="tiny muted">Magic bytes, duration, dimensions, checksum</span></div><div class="reviewer-row"><span class="badge badge-scheduled"><span class="dot"></span>Uploading</span><div class="grow"><div style="height:6px;background:var(--paper-3);border-radius:3px;overflow:hidden;margin-top:5px"><div style="width:64%;height:100%;background:var(--gold)"></div></div></div><span class="tiny">64%</span></div><div class="reviewer-row"><span class="badge badge-blocked"><span class="dot"></span>Failed</span><span class="grow tiny">Checksum mismatch on 1080p. The file was not saved.</span><button class="btn btn-ghost btn-sm" data-action="retry-upload">Retry</button></div></div></div>` : ""}
    <div style="margin-top:16px"><div class="row-between"><div class="panel-title">Video files</div><span class="tiny muted">Pre-compressed for the app and offline pack</span></div><table class="rendition-table"><thead><tr><th>Video file</th><th>Status</th><th>Size</th><th></th></tr></thead><tbody>${renditionRow("1080p", "H.264 · 8 Mbps", exp.renditions?.["1080"] || "Missing", "210 MB")}${renditionRow("720p", "H.264 · 5 Mbps", exp.renditions?.["720"] || "Missing", "120 MB")}${renditionRow("540p", "H.264 · 3 Mbps", exp.renditions?.["540"] || "Missing", "64 MB")}</tbody></table></div>
    <div class="two-col" style="margin-top:16px"><div class="card card-pad" style="box-shadow:none"><div class="panel-title">Poster &amp; preview</div><div class="row" style="margin-top:8px;gap:8px"><div style="width:88px;height:50px;border-radius:4px;background:var(--forest);display:grid;place-items:center;color:var(--gold)">${icon("photo")}</div><div><div class="small"><strong>Poster ready</strong></div><div class="tiny muted">16:9 · 1920×1080</div><button class="btn btn-text btn-sm" data-action="replace-poster" ${ro ? "disabled" : ""}>Replace</button></div></div></div><div class="card card-pad" style="box-shadow:none"><div class="panel-title">Media checks</div><ul class="hint-list" style="margin-top:8px"><li>${icon("check", "icon-sm")} Magic bytes match MP4</li><li>${icon("check", "icon-sm")} Dimensions 3840×2160</li><li>${icon("check", "icon-sm")} Checksum verified</li><li>${icon("check", "icon-sm")} Rights expiry current</li></ul></div></div>
    <div class="callout" style="margin-top:16px">${icon("info")}<div><strong>Replacing media on a published experience</strong> creates a new revision. The live version stays public while the replacement is reviewed and promoted.</div></div>
  </div>`;
}

function expCardsTab(exp, ro) {
  return `<div class="tab-section">
    <div class="tab-section-head"><div><div class="section-number">03</div><div class="tab-section-title">Text cards</div><div class="tab-section-sub">Short context from the client description. Two or three cards; readable over the site video; no historical reconstruction.</div></div><span class="chip">${exp.textCards.length} of 3</span></div>
    <div class="text-card-list">${exp.textCards.map((card, index) => `<div class="text-card-item"><div class="text-card-time"><span class="text-card-index">${String(index + 1).padStart(2, "0")}</span><input class="input" value="${card.at}" aria-label="Card ${index + 1} time in seconds" data-card-time="${index}" ${ro ? "disabled" : ""}/><span class="tiny muted">s</span></div><textarea class="textarea" data-card-text="${index}" aria-label="Card ${index + 1} text" ${ro ? "disabled" : ""}>${esc(card.text)}</textarea><button class="btn btn-icon btn-ghost" data-action="remove-card" data-index="${index}" aria-label="Remove card ${index + 1}" ${ro ? "disabled" : ""}>${icon("x", "icon-sm")}</button></div>`).join("")}</div>
    ${exp.textCards.length < 3 ? `<button class="btn btn-ghost btn-sm" style="margin-top:10px" data-action="add-card" ${ro ? "disabled" : ""}>${icon("plus", "icon-sm")} Add a card</button>` : `<div class="tiny muted" style="margin-top:10px">Three cards is the v1 maximum. Remove one to add another.</div>`}
    <div class="callout" style="margin-top:16px">${icon("info")}<div><strong>Not a narrated Story cut.</strong> These are short text cards from the site description. Audio Stories owns narration; Then &amp; Now does not.</div></div>
  </div>`;
}

function expAccessibilityTab(exp, site, ro) {
  const asset = (label, ok, note) => `<div class="reviewer-row"><span class="badge ${ok ? "badge-published" : "badge-warning"}"><span class="dot"></span>${ok ? "Ready" : "Missing"}</span><span class="grow"><strong>${label}</strong><div class="tiny muted">${note}</div></span><button class="btn btn-text btn-sm" data-action="upload-asset" data-asset="${label}" ${ro ? "disabled" : ""}>${ok ? "Replace" : "Upload"}</button></div>`;
  return `<div class="tab-section">
    <div class="tab-section-head"><div><div class="section-number">04</div><div class="tab-section-title">Accessibility</div><div class="tab-section-sub">Captions, transcript, and audio description. Publication requires English captions and a transcript; warnings do not block.</div></div><span class="chip ${exp.captions.en && exp.transcript ? "" : "chip-red"}">${exp.captions.en && exp.transcript ? "Required files ready" : "Required files missing"}</span></div>
    <div class="card" style="box-shadow:none"><div class="panel-body" style="padding:6px 0">${asset("English captions · WebVTT", exp.captions.en, "Required · synced to the site video")}${asset("Swahili captions · WebVTT", exp.captions.sw, "Warning in v1 · Swahili copy is provisional, review before release")}${asset("Transcript · plain text", exp.transcript, "Required · full text for screen readers and search")}${asset("Audio description", exp.audioDescription, "Optional warning · describe visual context")}</div></div>
    <div class="card" style="margin-top:14px;box-shadow:none"><div class="panel-head"><div><div class="panel-title">Caption preview</div><div class="panel-sub">A sample from the site video</div></div><span class="chip">${state.captionsOn ? "Captions on" : "Captions off"}</span></div><div class="panel-body"><div style="position:relative;border-radius:7px;overflow:hidden;background:#07140a"><img src="${site?.image || "assets/railway.jpg"}" alt="${esc(site?.name || "Site")} video caption preview" style="width:100%;aspect-ratio:16/9;object-fit:cover;opacity:.8"/><div style="position:absolute;left:10px;right:10px;bottom:10px;background:rgba(7,20,10,.85);border:1px solid rgba(255,255,255,.16);border-radius:6px;padding:8px 10px;color:#fff;font-size:12px;line-height:1.45">${state.captionsOn ? "The museum opened in 1971 under the East African Railways and Harbours Corporation." : ""}</div></div><div class="row" style="margin-top:8px"><button class="btn btn-ghost btn-sm" data-action="toggle-captions">${state.captionsOn ? "Turn captions off" : "Turn captions on"}</button><span class="tiny muted">Captions are always available in the video notes sheet.</span></div></div></div>
    <div class="callout callout-gold" style="margin-top:14px">${icon("info")}<div><strong>Swahili is provisional for v1.</strong> The copy review was waived; keep the Swahili captions and transcript on the release checklist. They are a warning, not a publish blocker in this prototype.</div></div>
  </div>`;
}

function expRightsTab(exp, ro) {
  return `<div class="tab-section">
    <div class="tab-section-head"><div><div class="section-number">05</div><div class="tab-section-title">Rights &amp; review</div><div class="tab-section-sub">The legal and cultural record behind the video. Review is a gate, not a badge.</div></div>${sensitivityBadge(exp.sensitivity)}</div>
    <div class="two-col">
      <div class="card card-pad" style="box-shadow:none"><div class="panel-title">Rights record</div><div class="summary-list" style="margin-top:10px"><div class="summary-row"><span>Rights holder</span><span>YTCI / client footage</span></div><div class="summary-row"><span>Evidence</span><span>${esc(exp.rightsEvidence || "Not recorded")}</span></div><div class="summary-row"><span>Rights expiry</span><span>${esc(exp.rightsExpiry || "Not set")}</span></div><div class="summary-row"><span>Territories</span><span>Kenya</span></div><div class="summary-row"><span>Uses</span><span>App · web · offline</span></div></div><button class="btn btn-text btn-sm" style="margin-top:8px;padding-left:0" data-action="open-rights" ${ro ? "disabled" : ""}>Edit rights record</button></div>
      <div class="card card-pad" style="box-shadow:none"><div class="panel-title">Cultural authority</div><div class="summary-list" style="margin-top:10px"><div class="summary-row"><span>Authority</span><span>${esc(siteById(exp.siteId)?.culturalAuthority || "Not set")}</span></div><div class="summary-row"><span>Consent</span><span>${esc(exp.consent || "Not recorded")}</span></div><div class="summary-row"><span>Review tier</span><span>${SENSITIVITY_LABEL[exp.sensitivity]}</span></div><div class="summary-row"><span>Reviewer</span><span>${esc(exp.reviewer)}</span></div><div class="summary-row"><span>Second reviewer</span><span>${exp.secondReviewer ? esc(exp.secondReviewer.name) : exp.sensitivity === "standard" ? "Not required" : "Required"}</span></div></div></div>
    </div>
    <div class="card" style="margin-top:14px;box-shadow:none"><div class="panel-head"><div><div class="panel-title">Client approval</div><div class="panel-sub">Recorded by an administrator; no client account</div></div>${exp.clientApproval ? badge("approved", "Recorded") : badge("warning", "Not recorded")}</div><div class="panel-body">${exp.clientApproval ? `<div class="reviewer-row"><span class="avatar">${initials(exp.clientApproval.name)}</span><span class="grow"><span class="name">${esc(exp.clientApproval.name)}</span><span class="role">${esc(exp.clientApproval.role)} · ${esc(exp.clientApproval.at)}</span></span>${icon("checkCircle", "icon-sm")}</div>` : `<p class="small muted">The client approver does not get an admin account. An administrator records their decision with a name and date.</p>`}<button class="btn btn-ghost btn-sm" data-action="record-client" ${!can("review") ? "disabled" : ""}>${icon("plus", "icon-sm")} Record client approval</button></div></div>
    ${exp.sensitivity !== "standard" ? `<div class="callout" style="margin-top:14px">${icon("shield")}<div><strong>${SENSITIVITY_LABEL[exp.sensitivity]} review.</strong> Two reviewers are required: an administrator and an external cultural reviewer or client approver. One request-changes or reject blocks the revision.</div></div>` : `<div class="callout" style="margin-top:14px">${icon("shield")}<div><strong>Standard review.</strong> Reviewer ≠ uploader. An approved revision does not auto-publish; an administrator schedules or publishes it.</div></div>`}
  </div>`;
}

function expPreviewTab(exp, site) {
  const card = exp.textCards[0];
  return `<div class="tab-section">
    <div class="tab-section-head"><div><div class="section-number">06</div><div class="tab-section-title">Preview</div><div class="tab-section-sub">Authenticated, watermarked, and device-targeted. No public draft links.</div></div><span class="chip chip-gold">${icon("lock", "icon-sm")} Admin only</span></div>
    <div class="preview-stage"><div class="preview-frame"><img src="${site?.image || "assets/railway.jpg"}" alt="${esc(exp.title)} preview"/><div class="preview-watermark"><span>Admin preview · not public</span></div><div class="preview-caption"><span class="preview-index">01</span><span>${esc(card?.text || exp.promise)}</span></div></div><div class="preview-meta"><span>${esc(exp.title)}</span><span>${exp.duration}s · ${ACCESS_LABEL[exp.mode]}</span></div><div class="preview-list"><button class="btn btn-ghost btn-sm" data-action="open-preview" style="justify-content:flex-start">${icon("play", "icon-sm")} Play the site video</button><div class="row">${icon("fileText", "icon-sm")} Captions and transcript are included</div><div class="row">${icon("globe", "icon-sm")} ${exp.languages.join(" / ")} · Swahili copy provisional</div></div></div>
    <div class="two-col" style="margin-top:16px"><div class="card card-pad" style="box-shadow:none"><div class="panel-title">Device preview</div><div class="drawer-body" style="padding:10px 0 0"><div style="width:110px;height:110px;background:repeating-linear-gradient(90deg,var(--ink) 0 6px,var(--card) 6px 12px),repeating-linear-gradient(0deg,var(--ink) 0 6px,var(--card) 6px 12px);background-blend-mode:multiply;border:8px solid var(--card);border-radius:6px;box-shadow:0 0 0 1px var(--line)" aria-label="QR placeholder"></div><p class="tiny muted" style="margin-top:8px">Signed admin deep link. The field calibration is separate. No browser camera simulator.</p></div></div><div class="card card-pad" style="box-shadow:none"><div class="panel-title">Preview checks</div><ul class="hint-list" style="margin-top:8px"><li>Watermark visible</li><li>Current-scene video, no historical overlay</li><li>Text cards readable over the video</li><li>Captions and transcript available</li><li>No public URL is generated</li></ul><button class="btn btn-primary btn-sm" style="margin-top:12px" data-action="open-preview">${icon("external", "icon-sm")} Open full preview</button></div></div>
  </div>`;
}

function expRail(exp) {
  const { blockers, warnings } = expReadiness(exp);
  const authoring = blockers.filter((b) => b.section !== "review");
  const review = blockers.filter((b) => b.section === "review");
  const frozen = exp.draftStatus === "in_review" || exp.draftStatus === "approved";
  const stage = exp.draftStatus === "in_review" ? "Frozen" : exp.draftStatus === "approved" ? "Ready to publish" : exp.lastDecision === "rejected" ? "Rejected" : exp.lastDecision === "changes" ? "Changes requested" : exp.lastDecision === "returned" ? "Returned to draft" : authoring.length ? `${authoring.length} blocker${authoring.length === 1 ? "" : "s"}` : "Ready to submit";
  const kicker = exp.draftStatus === "draft" ? "Review readiness" : "Publish readiness";
  const group = (label, items, kind, tab) => items.length ? `<div class="rail-group"><div class="rail-group-label"><span>${label}</span><span>${items.length}</span></div>${items.map((item) => `<button class="rail-item ${kind}" data-tab="${item.section === "review" ? "rights" : item.section || tab}">${icon(kind === "blocking" ? "warning" : kind === "warning" ? "info" : "checkCircle")}<span>${esc(item.label)}</span><span class="rail-deep">Open</span></button>`).join("")}</div>` : "";
  const beforePublish = review.length ? `<div class="rail-group"><div class="rail-group-label"><span>Before publish</span><span>${review.length}</span></div><button class="rail-item warning" ${exp.draftStatus === "in_review" ? 'data-action="open-review"' : 'data-tab="rights"'} >${icon("clock")}<span>${review[0].label === "Review decision" ? "Review decision" : "Awaiting review approval"}</span><span class="rail-deep">${exp.draftStatus === "in_review" ? "Open review" : "Open"}</span></button></div>` : "";
  return `<div class="rail-card">
    <div class="rail-head"><div class="kicker">${kicker}</div><div class="rail-state ${!frozen && !authoring.length && !["changes", "rejected", "returned"].includes(exp.lastDecision) ? "ready" : ""}">${stage}</div><div class="rail-sub">${exp.liveRevision ? `Live v${exp.liveRevision} · ` : ""}Draft v${exp.draftRevision} · ${warnings.length} warning${warnings.length === 1 ? "" : "s"}</div></div>
    <div id="rail-body">
      <div class="rail-groups">${authoring.length ? group("Before review", authoring, "blocking") : `<div class="rail-group"><div class="rail-item ready">${icon("checkCircle")}<span>All content checks pass.</span></div></div>`}${beforePublish}${group("Warnings", warnings, "warning", "accessibility")}</div>
      <div class="rail-footer">
        <div class="rail-note">${!can("edit") ? "Read-only. Moderators cannot edit, submit, review, or publish." : exp.draftStatus === "in_review" ? "Frozen. The review decision is pending; open the revision from the header." : exp.draftStatus === "approved" ? "Approved. Use Publish now or Schedule in the header. Publishing is a separate step." : exp.lastDecision === "rejected" ? "Rejected. Make a material change, then resubmit for review." : exp.lastDecision === "changes" ? "Changes requested. Address the reviewer’s note, then resubmit for review." : exp.lastDecision === "returned" ? "Returned to draft. Revise, then resubmit for review." : authoring.length ? "Resolve the blocking checks before submitting." : "Ready to submit. Use Submit for review in the header. Review approval is required before publish."}</div>
        ${exp.draftStatus === "approved" && can("edit") ? `<button class="btn btn-text btn-sm" style="width:100%;margin-top:4px" data-action="return-draft">Return to draft</button>` : ""}
        <button class="btn btn-text btn-sm" style="width:100%;margin-top:4px" data-action="refresh-readiness">${icon("refresh", "icon-sm")} Refresh readiness</button>
        <div class="row" style="gap:6px;margin-top:6px"><button class="btn btn-text btn-sm" data-action="open-audit">${icon("history", "icon-sm")} Audit</button><button class="btn btn-text btn-sm" data-action="open-revisions">${icon("list", "icon-sm")} Revisions</button></div>
        ${exp.status === "published" && can("publish") ? `<button class="btn btn-text btn-sm" style="width:100%" data-action="unpublish-experience">Unpublish experience</button>` : ""}
        ${can("archive") ? `<button class="btn btn-text btn-sm" style="width:100%;color:var(--danger)" data-action="archive-experience">${icon("archive", "icon-sm")} Archive / revoke</button>` : ""}
      </div>
    </div>
  </div>`;
}

/* ---------------- experience wizard ---------------- */
function experienceWizardPage() {
  const step = Math.min(5, Math.max(1, state.wizardStep || 1));
  state.wizardStep = step;
  const w = state.wizard;
  const site = siteById(w.siteId);
  const total = 5;
  const steps = [1, 2, 3, 4, 5].map((n) => `<div class="wizard-step ${n === step ? "active" : ""} ${n < step ? "done" : ""}"><span class="num">${n < step ? "✓" : n}</span>${["Site", "Identity", "Video", "Text cards", "Rights"][n - 1]}</div>`).join("");
  const body = step === 1 ? `<div class="form-grid"><div class="field span-2"><label>Heritage site</label><select class="select" data-wizard-field="siteId">${state.sites.map((s) => `<option value="${s.id}" ${w.siteId === s.id ? "selected" : ""}>${esc(s.name)} · ${esc(s.county)}</option>`).join("")}</select><div class="hint">One primary experience per site in v1.</div></div><div class="field span-2"><label>Primary mode</label><div class="segmented">${["camera_video", "video_only"].map((m) => `<button type="button" data-wizard-mode="${m}" class="${w.mode === m ? "active" : ""}">${ACCESS_LABEL[m]}</button>`).join("")}</div><div class="hint">Camera + video adds the on-site portal. Video only is the 2D experience. Both use the same site video.</div></div></div>` : step === 2 ? `<div class="form-grid"><div class="field span-2"><label>Experience title</label><input class="input" data-wizard-field="title" value="${esc(w.title)}"/></div><div class="field span-2"><label>Promise</label><input class="input" data-wizard-field="promise" value="${esc(w.promise)}" placeholder="One line: what will the visitor see?"/></div><div class="field"><label>Historical period</label><input class="input" data-wizard-field="period" value="${esc(w.period || "")}" placeholder="e.g. 1899–1971"/></div><div class="field"><label>Duration</label><input class="input" data-wizard-field="duration" value="${esc(w.duration || "77")}" placeholder="Seconds"/></div></div>` : step === 3 ? `<div class="stack"><div class="upload-drop"><strong>Upload the current-scene video master</strong><span class="tiny">Pre-compressed 4K MP4, 16:9, 60–110 seconds. The wizard creates a draft; media can be added later.</span><button class="btn btn-primary btn-sm" data-action="wizard-mock-upload">${icon("upload", "icon-sm")} Choose file</button></div><div class="callout">${icon("info")}<div>The 1080p, 720p, and 540p video files are added in the full editor. 4K is stream-only; 1080p is the default offline video file.</div></div></div>` : step === 4 ? `<div class="stack"><div class="callout callout-gold">${icon("info")}<div>Two or three short cards from the client description. They are context, not a historical reconstruction.</div></div>${w.cards.map((c, i) => `<div class="text-card-item"><div class="text-card-time"><span class="text-card-index">${String(i + 1).padStart(2, "0")}</span><input class="input" value="${c.at}" data-wizard-card-time="${i}" aria-label="Card ${i + 1} time"/><span class="tiny muted">s</span></div><textarea class="textarea" data-wizard-card-text="${i}" aria-label="Card ${i + 1} text">${esc(c.text)}</textarea><button class="btn btn-icon btn-ghost" data-action="wizard-remove-card" data-index="${i}" aria-label="Remove card">${icon("x", "icon-sm")}</button></div>`).join("")}<button class="btn btn-ghost btn-sm" data-action="wizard-add-card" ${w.cards.length >= 3 ? "disabled" : ""}>${icon("plus", "icon-sm")} Add a card</button></div>` : `<div class="stack"><div class="form-grid"><div class="field"><label>Rights record</label><input class="input" data-wizard-field="rights" value="${esc(w.rights || "")}" placeholder="Client footage · signed release"/></div><div class="field"><label>Rights expiry</label><input class="input" data-wizard-field="expiry" value="${esc(w.expiry || "")}" placeholder="30 Jun 2027"/></div><div class="field span-2"><label>Cultural authority / consent</label><input class="input" data-wizard-field="consent" value="${esc(w.consent || "")}" placeholder="Recorded consent"/></div><div class="field"><label>Default reviewer</label><select class="select"><option>Unassigned</option><option>Daniel M. · Administrator</option></select></div><div class="field"><label>Review tier</label><select class="select"><option>Standard</option><option>Sensitive</option><option>Restricted</option></select></div></div><div class="callout">${icon("shield")}<div>The wizard creates a draft. Review and readiness happen in the full editor; publish is disabled until the gate is clear.</div></div></div>`;
  return `${pageHead({ kicker: "Then &amp; Now · Experiences", title: "New experience", sub: "A short wizard creates the draft and opens the full editor. It does not bypass readiness or review.", back: { path: "/experiences", label: "All experiences" } })}
  <div class="wizard-shell"><div class="panel"><div class="wizard-steps">${steps}</div><div class="wizard-body">${body}</div><div class="wizard-foot"><button class="btn btn-ghost" data-action="wizard-prev" ${step === 1 ? "disabled" : ""}>${icon("chevronLeft", "icon-sm")} Back</button><span class="tiny muted">Step ${step} of ${total}</span>${step < total ? `<button class="btn btn-primary" data-action="wizard-next">Continue ${icon("chevronRight", "icon-sm")}</button>` : `<button class="btn btn-primary" data-action="create-experience">${icon("plus", "icon-sm")} Create draft</button>`}</div></div>
  <aside class="wizard-aside"><div class="rail-card"><div class="rail-head"><div class="kicker">Draft summary</div><div class="rail-state" style="font-size:20px">${esc(w.title || "Untitled experience")}</div><div class="rail-sub">${esc(site?.name || "Site not set")} · ${ACCESS_LABEL[w.mode || "camera_video"]}</div></div><div class="rail-footer"><div class="rail-note">At least two text cards, English captions, a transcript, a video master, a 1080p video file, a poster, rights, and consent are required before publish.</div></div></div></aside></div>`;
}

/* ---------------- review queue ---------------- */
function reviewQueuePage() {
  if (state.role === "content_editor") {
    return `${pageHead({ kicker: "Then &amp; Now · Review", title: "Review queue", sub: "Submitted revisions are frozen. Review is an administrator decision." })}${topTabs("experiences")}<div class="card"><div class="empty" style="padding:52px"><div class="empty-icon">${icon("lock", "icon-lg")}</div><div class="empty-title">Admins review revisions</div><p class="empty-body">You can draft, save, and submit experiences. An administrator reviews the frozen revision and records the decision. Your own submission will appear here for an administrator.</p><button class="btn btn-ghost" data-nav="/experiences">${icon("film", "icon-sm")} Back to experiences</button></div></div>`;
  }
  const items = inReview();
  const unassigned = items.filter((e) => e.reviewer === "Unassigned").length;
  const mine = items.filter((e) => e.reviewer === user().name).length;
  const sensitive = items.filter((e) => e.sensitivity !== "standard").length;
  const filtered = items.filter((e) => state.reviewFilter === "all" || (state.reviewFilter === "unassigned" ? e.reviewer === "Unassigned" : e.reviewer === user().name));
  const rows = filtered.map((exp) => {
    const site = siteById(exp.siteId);
    return `<tr><td><button class="row-link" data-nav="/review/${exp.id}"><div class="cell-title">${esc(exp.title)}</div><div class="cell-sub">${esc(site?.name || "Unknown site")} · revision v${exp.draftRevision}${uploadedBy(exp) !== exp.submittedBy ? ` · uploaded by ${esc(uploadedBy(exp))}` : ""}</div><div class="mobile-table-meta">${esc(exp.submittedBy)} · ${esc(exp.submittedAt || "Just now")} · ${esc(exp.reviewer)}</div></button></td><td>${esc(site?.name || "—")}</td><td>${esc(exp.submittedBy)}</td><td>${esc(exp.submittedAt || "Just now")}</td><td>${sensitivityBadge(exp.sensitivity)}</td><td>${exp.reviewer === "Unassigned" ? badge("warning", "Unassigned") : `<span class="small">${esc(exp.reviewer)}</span>`}</td><td><button class="btn btn-ghost btn-sm" data-nav="/review/${exp.id}">Open</button></td></tr>`;
  }).join("");
  return `${pageHead({ kicker: "Then &amp; Now · Review", title: "Review queue", sub: "Submitted revisions are frozen. Assign a reviewer, compare against live, and record a decision. Reviewers never review their own upload.", actions: `<button class="btn btn-ghost" data-action="open-audit">${icon("history", "icon-sm")} Audit log</button>` })}
  ${offlineBanner()}${topTabs("review")}
  <div class="grid-4"><div class="card stat stat-accent"><span class="stat-label">Unassigned</span><span class="stat-value">${unassigned}</span><span class="stat-foot">Needs an owner</span></div><div class="card stat"><span class="stat-label">Assigned to me</span><span class="stat-value">${mine}</span><span class="stat-foot">${user().name}</span></div><div class="card stat stat-accent-red"><span class="stat-label">Sensitive</span><span class="stat-value">${sensitive}</span><span class="stat-foot">Two reviewers</span></div><div class="card stat stat-accent-green"><span class="stat-label">Ready to publish</span><span class="stat-value">${Object.values(state.experiences).filter((e) => e.draftStatus === "approved").length}</span><span class="stat-foot">Approved revisions</span></div></div>
  <div class="section-head"><span class="section-title">Submitted revisions</span><span class="tiny muted">${items.length} in queue</span></div>
  <div class="panel"><div class="panel-head"><div class="tabs" style="border-bottom:0;flex:1" role="group" aria-label="Review filters">${[["unassigned", "Unassigned"], ["mine", "Assigned to me"], ["all", "All open"]].map(([id, label]) => `<button class="tab ${state.reviewFilter === id ? "active" : ""}" data-action="review-filter" data-filter="${id}" aria-pressed="${state.reviewFilter === id}">${label}</button>`).join("")}</div><span class="tiny muted">Order: unassigned, then assigned-to-me, then age</span></div>
  ${items.length ? `<div class="table-wrap"><table class="review-table" aria-label="Review queue"><thead><tr><th>Revision</th><th>Site</th><th>Submitted by</th><th>Submitted</th><th>Review tier</th><th>Reviewer</th><th></th></tr></thead><tbody>${rows || `<tr><td colspan="7"><div class="empty" style="padding:28px"><div class="empty-title" style="font-size:18px">Nothing in this filter</div><p class="empty-body">Try “All open” or wait for the next submission.</p></div></td></tr>`}</tbody></table></div>` : `<div class="panel-body"><div class="empty" style="padding:40px"><div class="empty-icon">${icon("checkCircle", "icon-lg")}</div><div class="empty-title">Queue clear</div><p class="empty-body">No revisions are waiting. An approved revision does not auto-publish; schedule it from the review detail when it is ready.</p><button class="btn btn-ghost" data-nav="/experiences">${icon("film", "icon-sm")} View experiences</button></div></div>`}</div>`;
}

/* ---------------- review detail ---------------- */
function reviewDetailPage(exp) {
  if (state.role === "content_editor" && exp && exp.submittedBy !== user().name && uploadedBy(exp) !== user().name) {
    return `${pageHead({ kicker: "Then &amp; Now · Review", title: "Review queue", sub: "This revision belongs to another editor." })}${topTabs("experiences")}<div class="card"><div class="empty" style="padding:52px"><div class="empty-icon">${icon("lock", "icon-lg")}</div><div class="empty-title">This revision is with an administrator</div><p class="empty-body">Editors can see their own submissions; the review decision is admin-only.</p><button class="btn btn-ghost" data-nav="/experiences">${icon("film", "icon-sm")} Back to experiences</button></div></div>`;
  }
  if (!exp || (exp.draftStatus !== "in_review" && exp.draftStatus !== "approved")) return `${pageHead({ kicker: "Then &amp; Now · Review", title: "Revision not in review", sub: "The revision may have been approved, returned to draft, or published.", back: { path: "/review", label: "Review queue" } })}${emptyState({ icon: "checkCircle", title: "Nothing to review here", body: "Open the review queue to see the current submitted revisions.", cta: "Back to queue", action: "back-review" })}`;
  const site = siteById(exp.siteId);
  const assigned = exp.reviewer !== "Unassigned";
  const selfReview = cannotReview(exp);
  const sensitive = exp.sensitivity !== "standard";
  const secondOk = !sensitive || exp.secondReviewerApproved;
  const approved = exp.draftStatus === "approved";
  const canReview = can("review") && (state.role === "admin" || state.role === "super_admin");
  const decisionDisabled = !assigned || selfReview || !canReview;
  const approveDisabled = decisionDisabled || !secondOk;
  const notes = exp.reviewNotes || [];
  return `${pageHead({ kicker: `Review · revision v${exp.draftRevision}`, title: esc(exp.title), sub: `${approved ? badge("approved", "Approved") : badge("review", "In review")} · Submitted by ${esc(exp.submittedBy)} · ${esc(exp.submittedAt || "just now")} · ${esc(site?.name || "Site")} · ${SENSITIVITY_LABEL[exp.sensitivity]}`, actions: `<button class="btn btn-ghost decision-jump" data-action="jump-decision">${icon("checkCircle", "icon-sm")} Decision</button><button class="btn btn-ghost" data-action="open-preview">${icon("eye", "icon-sm")} Preview</button><button class="btn btn-ghost" data-action="open-audit">${icon("history", "icon-sm")} Audit</button>`, back: { path: "/review", label: "Review queue" } })}
  ${roleNote()}${offlineBanner()}
  ${sensitive ? `<div class="review-banner sensitive">${icon("shield")}<span><strong>Sensitive site.</strong> Two reviewers are required. One may be an external cultural reviewer; the client approver is recorded, not an account.</span></div>` : ""}
  <div class="review-layout">
    <div class="review-main stack">
      <div class="panel"><div class="review-frozen"><div><div class="panel-title">${approved ? "Approved" : "Frozen"} revision v${exp.draftRevision}</div><div class="panel-sub">Submitted by ${esc(exp.submittedBy)} · ${esc(exp.submittedAt || "just now")}${uploadedBy(exp) !== exp.submittedBy ? ` · Uploaded by ${esc(uploadedBy(exp))}` : ""} · ${exp.languages.join(" / ")}</div></div>${approved ? badge("approved", "Approved") : `<span class="chip">${icon("lock", "icon-sm")} Frozen</span>`}</div><div class="panel-body"><div class="two-col"><div><div class="diff-label">Story</div><div class="small"><strong>${esc(exp.title)}</strong></div><p class="small muted" style="margin-top:4px">${esc(exp.promise)}</p><div class="tiny muted" style="margin-top:8px">${esc(exp.period)} · ${exp.duration}s · ${ACCESS_LABEL[exp.mode]}</div></div><div><div class="diff-label">Media &amp; accessibility</div><div class="small">${esc(exp.videoMaster || "No video master")}</div><div class="tiny muted" style="margin-top:4px">1080p ${exp.renditions?.["1080"] || "Missing"} · 720p ${exp.renditions?.["720"] || "Missing"} · 540p ${exp.renditions?.["540"] || "Missing"}</div><div class="tiny muted" style="margin-top:4px">EN captions ${exp.captions.en ? "ready" : "missing"} · transcript ${exp.transcript ? "ready" : "missing"} · SW captions ${exp.captions.sw ? "ready" : "missing"}</div></div></div><div class="callout" style="margin-top:14px">${icon("lock")}<div><strong>${approved ? "Approved and frozen until publish." : "Frozen at submission."}</strong> ${approved ? "Publishing is a separate step. Return to draft to make changes." : "Changes are not allowed in review. “Request changes” returns it to draft; “Return to draft” withdraws it with a reason."}</div></div></div></div>
      <div class="panel"><div class="panel-head"><div><div class="panel-title">What the visitor will see</div><div class="panel-sub">The text cards and a video still from this revision</div></div><span class="chip">${exp.textCards.length} cards · ${exp.duration}s</span></div><div class="panel-body"><div class="media-master" style="grid-template-columns:160px minmax(0,1fr);align-items:start"><button class="media-thumb media-thumb-btn" data-action="open-preview" aria-label="Open the watermarked preview for ${esc(exp.title)}"><img src="${site?.image || "assets/railway.jpg"}" alt="" loading="lazy"/><span class="media-play"><span>${icon("play", "icon-lg")}</span></span></button><div class="stack" style="gap:8px">${exp.textCards.map((card, index) => `<div class="row" style="align-items:flex-start;gap:8px"><span class="preview-index">${String(index + 1).padStart(2, "0")}</span><div><div class="tiny muted">${card.at}s</div><div class="small">${esc(card.text)}</div></div></div>`).join("")}</div></div></div></div>
      <div class="panel"><div class="panel-head"><div><div class="panel-title">Diff against live v${exp.liveRevision || 0}</div><div class="panel-sub">What changed in this revision</div></div><span class="chip">${exp.diff?.changes?.length || 0} changed</span></div><div class="panel-body"><div class="diff"><div class="diff-col"><div class="diff-label">Live v${exp.liveRevision || 0}</div>${(exp.diff?.live || []).map((l, i) => `<div class="diff-line ${(exp.diff?.changes || []).includes(i) ? "del" : ""}">${esc(l)}</div>`).join("")}</div><div class="diff-col"><div class="diff-label">Revision v${exp.draftRevision}</div>${(exp.diff?.draft || []).map((l, i) => `<div class="diff-line ${(exp.diff?.changes || []).includes(i) ? "add" : ""}">${esc(l)}</div>`).join("")}</div></div></div></div>
      <div class="panel"><div class="panel-head"><div><div class="panel-title">Evidence &amp; rights</div><div class="panel-sub">The record behind the decision</div></div></div><div class="panel-body"><div class="two-col"><div class="summary-list"><div class="summary-row"><span>Rights</span><span>${esc(exp.rights)}</span></div><div class="summary-row"><span>Evidence</span><span>${esc(exp.rightsEvidence)}</span></div><div class="summary-row"><span>Expiry</span><span>${esc(exp.rightsExpiry || "Not set")}</span></div><div class="summary-row"><span>Consent</span><span>${esc(exp.consent || "Not recorded")}</span></div></div><div class="summary-list"><div class="summary-row"><span>Review tier</span><span>${SENSITIVITY_LABEL[exp.sensitivity]}</span></div><div class="summary-row"><span>Second reviewer</span><span>${exp.secondReviewer ? esc(exp.secondReviewer.name) : sensitive ? "Required" : "Not required"}</span></div><div class="summary-row"><span>Client approval</span><span>${exp.clientApproval ? esc(exp.clientApproval.name) : "Not recorded"}</span></div><div class="summary-row"><span>Uploaded by</span><span>${esc(uploadedBy(exp))}</span></div><div class="summary-row"><span>Reviewer ≠ uploader</span><span>${!assigned ? "Not assigned" : selfReview ? "Blocked" : "Yes"}</span></div></div></div><div class="row wrap" style="gap:6px;margin-top:12px"><button class="btn btn-ghost btn-sm" data-action="record-client" ${!canReview ? "disabled" : ""}>${icon("plus", "icon-sm")} Record client approval</button></div></div></div>
      <div class="panel"><div class="panel-head"><div><div class="panel-title">Review thread</div><div class="panel-sub">Notes are part of the audit record</div></div></div><div class="panel-body">${notes.length ? `<div class="timeline">${notes.map((n) => `<div class="timeline-item"><div class="timeline-title">${esc(n.author)} <span class="tiny muted">· ${esc(n.role)} · ${esc(n.at)}</span></div><div class="timeline-note">${esc(n.note)}</div></div>`).join("")}</div>` : `<p class="small muted">No notes yet. Decisions and request-changes notes are recorded here.</p>`}</div></div>
    </div>
    <aside class="review-side">
      <div class="rail-card"><div class="rail-head"><div class="kicker">Assignment</div><div class="rail-state" style="font-size:20px">${esc(exp.reviewer)}</div><div class="rail-sub">${approved ? "Review complete" : sensitive ? "Sensitive · two reviewers" : "Standard review"}</div></div><div class="rail-footer">
        ${exp.draftStatus !== "in_review"
          ? `<div class="rail-note">${approved ? "The decision is recorded. Publishing is a separate step." : "Assignment is closed for this revision."}</div>`
          : exp.reviewer === user().name
            ? `<div class="callout callout-green" style="margin-bottom:6px">${icon("checkCircle")}<div><strong>Assigned to you.</strong> Review the frozen revision, then record a decision.</div></div><button class="btn btn-text btn-sm" style="width:100%" data-action="unassign" ${!canReview ? "disabled" : ""}>Unassign reviewer</button>`
            : `<button class="btn btn-ghost" style="width:100%" data-action="assign-me" ${!canReview || selfReview ? "disabled" : ""}>${icon("user", "icon-sm")} Assign to me</button>`}
        ${selfReview ? `<div class="callout callout-red" style="margin-top:8px">${icon("warning")}<div>You are the uploader. Reviewer ≠ uploader is enforced.</div></div>` : ""}
        <div class="rail-note">${exp.draftStatus === "in_review" ? "Reviewers see the frozen revision and its diff against live. Assignment is audited." : "The reviewer and decision stay in the audit record."}</div>
      </div></div>
      ${sensitive ? `<div class="rail-card"><div class="rail-head"><div class="kicker">Second reviewer</div><div class="rail-state" style="font-size:18px">${secondOk ? "Recorded" : "Required"}</div><div class="rail-sub">Sensitive / restricted tier</div></div><div class="rail-footer">${exp.secondReviewer ? `<div class="reviewer-row"><span class="avatar">${initials(exp.secondReviewer.name)}</span><span class="grow"><span class="name">${esc(exp.secondReviewer.name)}</span><span class="role">${esc(exp.secondReviewer.org)} · ${exp.secondReviewerApproved ? "Approved" : "Changes requested"}</span></span>${exp.secondReviewerApproved ? icon("checkCircle", "icon-sm") : icon("warning", "icon-sm")}</div>` : `<div class="rail-note">Record an external cultural reviewer or client approver. They do not need an account.</div>`}<button class="btn ${secondOk ? "btn-ghost" : "btn-primary"} btn-sm" style="width:100%;margin-top:6px" data-action="record-external" ${!canReview ? "disabled" : ""}>${icon("plus", "icon-sm")} ${secondOk ? "Record reviewer" : "Record second reviewer"}</button></div></div>` : ""}
      <div class="rail-card" id="decision-card"><div class="rail-head"><div class="kicker">Decision</div><div class="rail-state" style="font-size:20px">${approved ? "Approved" : !assigned ? "Unassigned" : sensitive && !secondOk ? "Second reviewer" : "Ready"}</div><div class="rail-sub">${approved ? "Publishing is a separate step" : "Reviewer ≠ uploader"}</div></div><div class="decision-panel">
        ${approved
          ? `<div class="callout callout-green">${icon("checkCircle")}<div><strong>Approved by ${esc(exp.reviewer)}${exp.reviewer.endsWith(".") ? "" : "."}</strong> Publishing is a separate step. The approval note is in the review thread.</div></div>`
          : `<label class="field"><span style="font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)">Review notes</span><textarea class="textarea" id="decision-notes" aria-label="Review notes" placeholder="Required for request changes or reject" style="min-height:78px"></textarea></label><div class="decision-help"><div><strong>Approve</strong> marks the revision ready to publish; it does not publish.</div><div><strong>Request changes</strong> returns the same revision to the editor.</div><div><strong>Reject</strong> records a rejection; the editor must revise materially.</div><div><strong>Return to draft</strong> withdraws the revision without a review decision.</div></div>`}
        <div class="decision-actions" style="margin-top:10px">${approved ? `<button class="btn btn-primary" data-action="publish-now" ${!can("publish") ? "disabled" : ""}>${icon("send", "icon-sm")} Publish now</button><button class="btn btn-gold" data-action="schedule-publish" ${!can("publish") ? "disabled" : ""}>${icon("calendar", "icon-sm")} Schedule publish (EAT)</button><button class="btn btn-ghost" data-action="return-draft" ${!can("edit") ? "disabled" : ""}>Return to draft</button>` : `<button class="btn btn-primary" data-action="approve" ${approveDisabled ? "disabled" : ""}>${icon("checkCircle", "icon-sm")} Approve revision</button><button class="btn btn-ghost" data-action="request-changes" ${decisionDisabled ? "disabled" : ""}>${icon("refresh", "icon-sm")} Request changes</button><button class="btn btn-danger" data-action="reject" ${decisionDisabled ? "disabled" : ""}>${icon("x", "icon-sm")} Reject</button><button class="btn btn-ghost" data-action="return-draft" ${!can("edit") ? "disabled" : ""}>Return to draft</button>`}</div>${!approved ? (!assigned ? `<div class="rail-note" style="margin-top:8px">Assign a reviewer before deciding.</div>` : selfReview ? `<div class="rail-note" style="margin-top:8px;color:var(--danger)">You submitted this revision; the decision is blocked.</div>` : sensitive && !secondOk ? `<div class="rail-note" style="margin-top:8px;color:var(--gold-deep)">Record the second reviewer before approving. Request changes or reject can still be recorded.</div>` : !canReview ? `<div class="rail-note" style="margin-top:8px">Only administrators can decide.</div>` : `<div class="rail-note" style="margin-top:8px">Approve does not publish. “Request changes” returns the revision to draft.</div>`) : ""}</div></div>
      <div class="rail-card"><div class="rail-footer"><button class="btn btn-ghost btn-sm" style="width:100%" data-action="open-audit">${icon("history", "icon-sm")} Open audit timeline</button></div></div>
    </aside>
  </div>`;
}

/* ---------------- modals ---------------- */
function modalHTML() {
  const m = state.modal;
  return `<div class="modal-backdrop" data-modal-backdrop>
    <div class="modal ${m.wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-labelledby="modal-title" data-modal-panel>
      <div class="modal-head"><div><div class="modal-title" id="modal-title">${esc(m.title)}</div>${m.sub ? `<div class="modal-sub">${esc(m.sub)}</div>` : ""}</div><button class="close-btn" data-action="close-modal" aria-label="Close">${icon("x")}</button></div>
      <div class="modal-body">${m.body || ""}</div>
      ${m.actions?.length ? `<div class="modal-foot">${m.actions.map((a) => `<button class="btn btn-${a.kind || "ghost"}" data-modal-action="${a.action}" ${a.value ? `data-value="${esc(a.value)}"` : ""} ${a.disabled ? "disabled" : ""}>${esc(a.label)}</button>`).join("")}</div>` : ""}
    </div>
  </div>`;
}

function openModal({ title, sub = "", body = "", actions = [], wide = false }) {
  state.lastFocus = document.activeElement;
  state.modal = { title, sub, body, actions, wide };
  renderChrome();
}
function closeModal() {
  state.modal = null;
  const target = state.lastFocus;
  state.lastFocus = null;
  renderChrome();
  if (target && typeof target.focus === "function") setTimeout(() => target.focus(), 0);
}

function confirmDialog({ title, sub, body, confirmLabel, confirmKind = "primary", action, value }) {
  openModal({
    title, sub, body,
    actions: [
      { label: "Cancel", kind: "ghost", action: "close-modal" },
      { label: confirmLabel, kind: confirmKind, action, value },
    ],
  });
}

/* ---------------- actions ---------------- */
function saveDraft() {
  const exp = currentExp();
  if (!exp) return;
  if (state.scenario === "conflict") {
    openModal({
      title: "409 · Version conflict",
      sub: "Your draft is based on v4; the server has v5.",
      body: `<div class="callout callout-red">${icon("warning")}<div><strong>Daniel M. saved a newer revision at 10:14.</strong> Reload the latest version or keep editing and resolve manually. This prototype does not merge.</div></div><div class="summary-list" style="margin-top:12px"><div class="summary-row"><span>Your base</span><span>v4 · 09:42</span></div><div class="summary-row"><span>Server</span><span>v5 · 10:14</span></div><div class="summary-row"><span>Conflict</span><span>Text card 02 copy, 1080p video file</span></div></div>`,
      actions: [
        { label: "Keep editing", kind: "ghost", action: "close-modal" },
        { label: "Reload latest", kind: "primary", action: "reload-latest" },
      ],
    });
    return;
  }
  if (state.scenario === "offline") {
    state.dirty = false;
    toast("Saved locally; will sync when you’re back online.");
  } else {
    state.dirty = false;
    exp.lastSaved = "Just now";
    exp.updated = "Just now";
    addAudit(exp.id, "save", "Draft saved", "Explicit save. The live revision is unchanged.");
    toast("Draft saved · v" + exp.draftRevision);
  }
  render();
}

function submitReview() {
  const exp = currentExp();
  if (!exp) return;
  const { blockers } = expReadiness(exp);
  const authoring = blockers.filter((b) => b.section !== "review");
  if (state.scenario === "conflict") return toast("Resolve the 409 conflict before submitting.", "error");
  if (state.scenario === "offline") return toast("Reconnect before submitting.", "error");
  if (materialChangeNeeded(exp)) {
    return toast("Make a material change before resubmitting a rejected revision.", "error");
  }
  if (authoring.length) {
    openModal({
      title: "Readiness has blockers",
      sub: `${authoring.length} authoring item${authoring.length === 1 ? "" : "s"} must be resolved before review.`,
      body: `<div class="stack">${authoring.map((b) => `<div class="rail-item blocking" style="padding:4px 0">${icon("warning")}<span>${esc(b.label)}</span><span class="rail-deep">${esc(b.section)}</span></div>`).join("")}</div><p class="small muted" style="margin-top:10px">Open the section from the readiness rail and complete the item.</p>`,
      actions: [{ label: "Close", kind: "ghost", action: "close-modal" }],
    });
    return;
  }
  const resubmit = exp.lastDecision === "changes" || exp.lastDecision === "rejected";
  confirmDialog({
    title: `${resubmit ? "Resubmit" : "Submit"} v${exp.draftRevision} for review?`,
    sub: resubmit ? "The previous review note stays in the audit; this freezes a new snapshot." : "The revision will be frozen and appear in the review queue.",
    body: `<div class="callout">${icon("lock")}<div>The live version stays public. Reviewers see this snapshot and a diff against live v${exp.liveRevision}. An approval does not auto-publish.</div></div>`,
    confirmLabel: resubmit ? "Resubmit for review" : "Submit for review",
    action: "confirm-submit",
  });
}

function confirmSubmit() {
  const exp = currentExp();
  if (!exp) return;
  exp.draftStatus = "in_review";
  exp.lastDecision = null;
  exp.submittedBy = user().name;
  exp.submittedAt = "Just now";
  exp.reviewer = "Unassigned";
  exp.lastSaved = "Just now";
  state.dirty = false;
  addAudit(exp.id, "submit", `Revision v${exp.draftRevision} submitted for review`, `${user().name} · just now`);
  closeModal();
  toast("Submitted v" + exp.draftRevision + " for review.", "success", { keepOnRoute: true });
  navigate("/review/" + exp.id, { force: true });
}

function approve() {
  const exp = currentExp();
  if (!exp) return;
  if (exp.reviewer === "Unassigned") return toast("Assign a reviewer first.", "error");
  if (cannotReview(exp)) return toast("You cannot review your own upload.", "error");
  if (exp.sensitivity !== "standard" && !exp.secondReviewerApproved) return toast("Record the second reviewer before approval.", "error");
  const notes = document.getElementById("decision-notes")?.value.trim();
  exp.draftStatus = "approved";
  exp.lastDecision = "approved";
  exp.reviewer = user().name;
  exp.reviewNotes = [{ author: user().name, role: user().role, at: "Just now", note: notes || "Approved." }, ...(exp.reviewNotes || [])];
  addAudit(exp.id, "approve", `Revision v${exp.draftRevision} approved`, `${user().name} · just now`);
  toast("Approved. Publishing is a separate step.");
  render();
}

function requestChanges(reject = false) {
  const exp = currentExp();
  if (!exp) return;
  if (exp.reviewer === "Unassigned") return toast("Assign a reviewer first.", "error");
  const notes = document.getElementById("decision-notes")?.value.trim();
  if (!notes) return toast("Add a note explaining the decision.", "error");
  if (reject) {
    state.pendingRejectNote = notes;
    confirmDialog({
      title: `Reject revision v${exp.draftRevision}?`,
      sub: "This is recorded as a rejection, not a request for changes.",
      body: `<div class="callout callout-red">${icon("warning")}<div><strong>${esc(exp.title)}</strong> returns to draft with a rejected review record. The editor must materially revise the content before resubmitting; the note below stays in the audit trail.</div></div><div class="timeline-note" style="margin-top:12px">${esc(notes)}</div>`,
      confirmLabel: "Reject revision",
      confirmKind: "danger",
      action: "confirm-reject",
    });
    return;
  }
  applyDecision(false, notes);
}

function applyDecision(reject, notes) {
  const exp = currentExp();
  if (!exp) return;
  exp.draftStatus = "draft";
  exp.lastDecision = reject ? "rejected" : "changes";
  exp.revisedSinceDecision = false;
  if (reject) exp.rejectedSnapshot = revisionSnapshot(exp);
  exp.reviewer = "Unassigned";
  exp.reviewNotes = [{ author: user().name, role: user().role, at: "Just now", note: notes }, ...(exp.reviewNotes || [])];
  addAudit(exp.id, reject ? "reject" : "changes", `Revision v${exp.draftRevision} ${reject ? "rejected" : "returned for changes"}`, `${user().name} · just now`);
  toast(reject ? "Revision rejected. The editor must materially revise." : "Changes requested. The editor can revise and resubmit.", "success", { keepOnRoute: true });
  navigate("/experiences/" + exp.id, { force: true });
}

function confirmReject() {
  const notes = state.pendingRejectNote || "Rejected.";
  state.pendingRejectNote = null;
  closeModal();
  applyDecision(true, notes);
}

function unassign() {
  const exp = currentExp();
  if (!exp) return;
  if (exp.draftStatus !== "in_review") return toast("Assignment is locked once a decision is recorded.", "error");
  exp.reviewer = "Unassigned";
  state.reviewFilter = "unassigned";
  addAudit(exp.id, "assign", "Reviewer unassigned", `${user().name} · just now`);
  toast("Reviewer unassigned. The revision is back in the unassigned queue.");
  render();
}

function assignMe() {
  const exp = currentExp();
  if (!exp) return;
  if (exp.draftStatus !== "in_review") return toast("Assignment is closed once a decision is recorded.", "error");
  if (exp.reviewer === user().name) return toast("You already own this review.");
  if (cannotReview(exp)) return toast("The uploader cannot review their own revision.", "error");
  exp.reviewer = user().name;
  state.reviewFilter = "mine";
  addAudit(exp.id, "assign", "Reviewer assigned", `${user().name} · just now`);
  toast("Assigned to " + user().name);
  render();
}

function recordClient() {
  openModal({
    title: "Record client approval",
    sub: "The client approver does not get an account.",
    body: `<div class="form-grid"><div class="field"><label>Name</label><input class="input" id="client-name" placeholder="e.g. Njeri K."/></div><div class="field"><label>Role</label><input class="input" id="client-role" value="Client approver"/></div><div class="field span-2"><label>Date</label><input class="input" id="client-date" value="Today"/></div></div><div class="callout" style="margin-top:12px">${icon("info")}<div>The decision is recorded by an administrator and appears in the audit timeline.</div></div>`,
    actions: [{ label: "Cancel", kind: "ghost", action: "close-modal" }, { label: "Record approval", kind: "primary", action: "confirm-client" }],
  });
}

function confirmClient() {
  const exp = currentExp();
  if (!exp) return;
  const name = document.getElementById("client-name")?.value.trim();
  if (!name) return toast("Add the client approver’s name.", "error");
  const role = document.getElementById("client-role")?.value.trim() || "Client approver";
  const at = document.getElementById("client-date")?.value.trim() || "Today";
  exp.clientApproval = { name, role, at };
  addAudit(exp.id, "client", "Client approval recorded", `${name} · ${at}`);
  closeModal();
  toast("Client approval recorded.");
  render();
}

function recordExternal() {
  openModal({
    title: "Record external reviewer",
    sub: "Used for sensitive or restricted revisions. No account is created.",
    body: `<div class="form-grid"><div class="field"><label>Name</label><input class="input" id="external-name" placeholder="e.g. Wanjiku M."/></div><div class="field"><label>Organisation</label><input class="input" id="external-org" placeholder="Community / cultural reviewer"/></div><div class="field span-2"><label>Decision</label><select class="select" id="external-decision"><option value="approved">Approved</option><option value="changes">Request changes</option></select></div></div><div class="callout" style="margin-top:12px">${icon("shield")}<div>The external reviewer’s decision is recorded by an administrator. One request-changes blocks the revision.</div></div>`,
    actions: [{ label: "Cancel", kind: "ghost", action: "close-modal" }, { label: "Record reviewer", kind: "primary", action: "confirm-external" }],
  });
}

function confirmExternal() {
  const exp = currentExp();
  if (!exp) return;
  const name = document.getElementById("external-name")?.value.trim();
  if (!name) return toast("Add the reviewer’s name.", "error");
  const org = document.getElementById("external-org")?.value.trim() || "External reviewer";
  const decision = document.getElementById("external-decision")?.value;
  exp.secondReviewer = { name, org, decision };
  exp.secondReviewerApproved = decision === "approved";
  addAudit(exp.id, "reviewer", "External reviewer recorded", `${name} · ${org} · ${decision === "approved" ? "approved" : "changes requested"}`);
  closeModal();
  toast(decision === "approved" ? "External reviewer recorded as approved." : "External reviewer requested changes.");
  render();
}

function publishNow() {
  const exp = currentExp();
  if (!exp) return;
  if (!can("publish")) return toast("Administrators publish.", "error");
  confirmDialog({
    title: `Publish v${exp.draftRevision} now?`,
    sub: "The revision is approved; publishing is a separate step.",
    body: `<div class="callout callout-green">${icon("checkCircle")}<div>The live revision becomes v${exp.draftRevision}. The site page and offline packs update on the next sync. No email or push is sent.</div></div>`,
    confirmLabel: "Publish now",
    action: "confirm-publish",
  });
}

function confirmSaveSite() {
  const site = currentSite();
  if (!site) return;
  site.updated = "Just now";
  state.dirty = false;
  addAudit(site.id, "save", "Site changes saved", "Updated the public site immediately; no staged revision.");
  closeModal();
  toast("Public site updated.");
  render();
}

function confirmPublishSite() {
  const site = currentSite();
  if (!site) return;
  site.status = "published";
  site.updated = "Just now";
  addAudit(site.id, "publish", "Site published", `${user().name} · just now`);
  closeModal();
  toast("Site published. The public page is live.");
  render();
}

function confirmPublish() {
  const exp = currentExp();
  if (!exp) return;
  exp.status = "published";
  exp.liveRevision = exp.draftRevision;
  exp.draftStatus = "published";
  exp.reviewer = "Published";
  exp.updated = "Just now";
  addAudit(exp.id, "publish", `Revision v${exp.draftRevision} published`, `${user().name} · just now`);
  const fromReview = route().startsWith("/review");
  closeModal();
  toast(`Published v${exp.liveRevision}. The live site is updated.`, "success", { keepOnRoute: true });
  if (fromReview) navigate("/experiences/" + exp.id, { force: true });
  else render();
}

function schedulePublish() {
  const exp = currentExp();
  if (!exp) return;
  if (!can("publish")) return toast("Administrators schedule.", "error");
  openModal({
    title: "Schedule publish",
    sub: "Africa/Nairobi (EAT). Approval and publish are separate.",
    body: `<div class="form-grid"><div class="field"><label>Date</label><input class="input" id="schedule-date" type="date" value="2026-11-20"/></div><div class="field"><label>Time (EAT)</label><input class="input" id="schedule-time" type="time" value="09:00"/></div><div class="field span-2"><label>Release note</label><textarea class="textarea" id="schedule-note" placeholder="Optional note for the audit log" style="min-height:70px"></textarea></div></div><div class="callout" style="margin-top:12px">${icon("calendar")}<div>The scheduler publishes this revision at the chosen date and time. Rights expiry is checked again before it goes live.</div></div>`,
    actions: [{ label: "Cancel", kind: "ghost", action: "close-modal" }, { label: "Schedule publish", kind: "primary", action: "confirm-schedule" }],
  });
}

function confirmSchedule() {
  const exp = currentExp();
  if (!exp) return;
  const date = document.getElementById("schedule-date")?.value || "2026-11-20";
  const time = document.getElementById("schedule-time")?.value || "09:00";
  exp.status = "scheduled";
  exp.scheduledAt = `${date} ${time} EAT`;
  exp.draftStatus = "approved";
  addAudit(exp.id, "schedule", "Publish scheduled", `${exp.scheduledAt} · ${user().name}`);
  closeModal();
  toast(`Scheduled for ${exp.scheduledAt}.`);
  render();
}

function returnDraft() {
  const exp = currentExp();
  if (!exp) return;
  openModal({
    title: "Return to draft?",
    sub: "This withdraws the revision from review and unfreezes it.",
    body: `<div class="field"><label>Reason</label><textarea class="textarea" id="return-reason" placeholder="Why are you withdrawing the revision?" style="min-height:80px"></textarea></div>`,
    actions: [{ label: "Cancel", kind: "ghost", action: "close-modal" }, { label: "Return to draft", kind: "danger", action: "confirm-return" }],
  });
}

function confirmReturn() {
  const exp = currentExp();
  if (!exp) return;
  const reason = document.getElementById("return-reason")?.value.trim();
  if (!reason) return toast("Add a reason.", "error");
  exp.draftStatus = "draft";
  exp.lastDecision = "returned";
  exp.reviewer = "Unassigned";
  exp.reviewNotes = [{ author: user().name, role: user().role, at: "Just now", note: `Returned to draft: ${reason}` }, ...(exp.reviewNotes || [])];
  addAudit(exp.id, "return", "Returned to draft", reason);
  closeModal();
  toast("Returned to draft. The live revision is unchanged.", "success", { keepOnRoute: true });
  navigate("/experiences/" + exp.id, { force: true });
}

function unpublish(kind = "experience") {
  const exp = currentExp();
  if (!exp) return;
  const isSite = kind === "site";
  const label = isSite ? currentSite()?.name : exp.title;
  openModal({
    title: `Unpublish ${isSite ? "site" : "experience"}?`,
    sub: "The record stays; the public surface is hidden.",
    body: `<div class="callout callout-gold">${icon("warning")}<div><strong>${esc(label)}</strong> will stop appearing in the app. ${isSite ? "Its experiences are hidden from public read but stay published internally." : "The live revision is hidden; history and audit stay intact."}</div></div><div class="field" style="margin-top:12px"><label>Reason</label><textarea class="textarea" id="unpublish-reason" placeholder="Why is this being unpublished?" style="min-height:70px"></textarea></div>`,
    actions: [{ label: "Cancel", kind: "ghost", action: "close-modal" }, { label: "Unpublish", kind: "danger", action: isSite ? "confirm-unpublish-site" : "confirm-unpublish-exp" }],
  });
}

function confirmUnpublish(kind) {
  const site = currentSite();
  const exp = currentExp();
  const reason = document.getElementById("unpublish-reason")?.value.trim() || "No reason recorded";
  if (kind === "site" && site) {
    site.status = "unpublished";
    addAudit(site.id, "unpublish", "Site unpublished", reason);
    closeModal(); toast("Site unpublished. Its experiences are hidden from the app."); render();
  } else if (exp) {
    exp.status = "unpublished";
    addAudit(exp.id, "unpublish", "Experience unpublished", reason);
    closeModal(); toast("Experience unpublished."); render();
  }
}

function archive(kind = "experience") {
  const exp = currentExp();
  const site = currentSite();
  openModal({
    title: `Archive ${kind}?`,
    sub: "Super-admin only. This is not a hard delete.",
    body: `<div class="callout callout-red">${icon("archive")}<div>The record is removed from the working lists. Audit and revision history are retained. No hard delete after first publish.</div></div><div class="field" style="margin-top:12px"><label>Reason</label><textarea class="textarea" id="archive-reason" placeholder="Required for the audit record" style="min-height:70px"></textarea></div>`,
    actions: [{ label: "Cancel", kind: "ghost", action: "close-modal" }, { label: "Archive", kind: "danger", action: kind === "site" ? "confirm-archive-site" : "confirm-archive-exp" }],
  });
}

function confirmArchive(kind) {
  const reason = document.getElementById("archive-reason")?.value.trim();
  if (!reason) return toast("Add a reason.", "error");
  const site = currentSite();
  const exp = currentExp();
  if (kind === "site" && site) {
    site.status = "archived";
    addAudit(site.id, "archive", "Site archived", reason);
    closeModal(); toast("Site archived.", "success", { keepOnRoute: true }); navigate("/sites", { force: true });
  } else if (exp) {
    exp.status = "archived";
    addAudit(exp.id, "archive", "Experience archived", reason);
    closeModal(); toast("Experience archived.", "success", { keepOnRoute: true }); navigate("/experiences", { force: true });
  }
}

function addAudit(entity, type, title, note) {
  state.audit.unshift({ id: "a" + Date.now(), entity, type, title, meta: `${user().name} · Just now`, note });
}

function openPreview() {
  const exp = currentExp();
  const site = exp ? siteById(exp.siteId) : currentSite();
  if (!site) return;
  const card = exp?.textCards?.[0];
  openModal({
    title: "Admin preview",
    sub: "Watermarked · authenticated · not public",
    wide: true,
    body: `<div class="preview-stage"><div class="preview-frame"><img src="${site.image}" alt="${esc(exp?.title || site.name)} preview"/><div class="preview-watermark"><span>Admin preview · not public</span></div>${card ? `<div class="preview-caption"><span class="preview-index">01</span><span>${esc(card.text)}</span></div>` : ""}</div><div class="preview-meta"><span>${esc(exp?.title || site.name)}</span><span>${exp ? `${exp.duration}s · ${ACCESS_LABEL[exp.mode]}` : site.county}</span></div></div><div class="row wrap" style="gap:8px;margin-top:12px"><button class="btn btn-primary btn-sm" data-action="mock-play">${icon("play", "icon-sm")} Play</button><button class="btn btn-ghost btn-sm" data-action="toggle-captions">${state.captionsOn ? "Captions on" : "Captions off"}</button><span class="tiny muted">The video is a still in this prototype.</span></div>`,
    actions: [{ label: "Close preview", kind: "ghost", action: "close-modal" }],
  });
}

function openRevisions() {
  const exp = currentExp();
  if (!exp) return;
  openModal({
    title: "Revision history",
    sub: `${exp.title} · contentVersion ${exp.draftRevision}`,
    wide: true,
    body: `<div class="two-col"><div class="card card-pad" style="box-shadow:none"><div class="row-between"><div class="panel-title">Live v${exp.liveRevision || 0}</div>${exp.liveRevision ? badge("published", "Live") : badge("neutral", "No live revision")}</div><p class="small muted" style="margin-top:8px">${exp.liveRevision ? "The version the public app reads." : "This experience has not been published."}</p><button class="btn btn-ghost btn-sm" style="margin-top:8px" data-action="open-preview">${icon("eye", "icon-sm")} View live preview</button></div><div class="card card-pad" style="box-shadow:none"><div class="row-between"><div class="panel-title">Draft v${exp.draftRevision}</div>${expStatusBadges(exp)}</div><p class="small muted" style="margin-top:8px">The working revision. ${exp.draftStatus === "in_review" ? "Frozen in review." : exp.draftStatus === "approved" ? "Approved; ready to publish." : "Editable."}</p><div class="tiny muted">Last saved ${esc(exp.lastSaved)}</div></div></div><div class="callout" style="margin-top:12px">${icon("info")}<div>Published experiences use staged revisions: the live version stays public while a replacement is drafted, reviewed, and promoted. One open revision at a time.</div></div>`,
    actions: [{ label: "Close", kind: "ghost", action: "close-modal" }],
  });
}

function openAudit() {
  const exp = currentExp();
  const site = currentSite();
  const entity = exp?.id || site?.id || "railway-exp";
  const ids = new Set([entity, ...(site?.experiences || [])]);
  const entries = state.audit.filter((a) => ids.has(a.entity));
  openModal({
    title: "Audit timeline",
    sub: "Append-only · every state change is recorded",
    wide: true,
    body: `<div class="timeline">${entries.length ? entries.map((a) => `<div class="timeline-item"><div class="timeline-title">${esc(a.title)}</div><div class="timeline-meta">${esc(a.meta)}</div>${a.note ? `<div class="timeline-note">${esc(a.note)}</div>` : ""}</div>`).join("") : `<p class="small muted">No audit entries for this record yet.</p>`}</div>`,
    actions: [{ label: "Close", kind: "ghost", action: "close-modal" }],
  });
}

/* ---------------- filters ---------------- */
function filterSites() {
  const search = (document.querySelector('[data-filter="site-search"]')?.value || "").toLowerCase().trim();
  const county = document.querySelector('[data-filter="site-county"]')?.value || "all";
  const status = document.querySelector('[data-filter="site-status"]')?.value || "all";
  let visible = 0;
  document.querySelectorAll("[data-site-row]").forEach((row) => {
    const ok = (!search || row.dataset.name.includes(search)) && (county === "all" || row.dataset.county === county) && (status === "all" || row.dataset.status === status);
    row.style.display = ok ? "" : "none";
    if (ok) visible++;
  });
  const count = document.querySelector("[data-list-count]");
  if (count) count.textContent = `${visible} site${visible === 1 ? "" : "s"}`;
}
function filterExperiences() {
  const search = (document.querySelector('[data-filter="exp-search"]')?.value || "").toLowerCase().trim();
  const site = document.querySelector('[data-filter="exp-site"]')?.value || "all";
  const status = document.querySelector('[data-filter="exp-status"]')?.value || "all";
  let visible = 0;
  document.querySelectorAll("[data-exp-row]").forEach((row) => {
    const ok = (!search || row.dataset.name.includes(search)) && (site === "all" || row.dataset.site === site) && (status === "all" || row.dataset.status === status);
    row.style.display = ok ? "" : "none";
    if (ok) visible++;
  });
  const count = document.querySelector("[data-list-count]");
  if (count) count.textContent = `${visible} experience${visible === 1 ? "" : "s"}`;
}

/* ---------------- event wiring ---------------- */
function setScenario(id) {
  const keepTheme = true;
  if (id === "default") {
    resetDemo({ keepRole: false, keepTheme });
    state.role = "admin";
    navigate("/sites", { force: true });
    toast("Default scenario restored.", "success", { keepOnRoute: true });
    return;
  }
  resetDemo({ keepRole: true, keepTheme });
  state.scenario = id;
  if (id === "empty") {
    state.sites = [];
    state.experiences = {};
    state.audit = [];
    navigate("/sites", { force: true });
  } else if (id === "loading") {
    navigate("/sites", { force: true });
  } else if (id === "offline") {
    navigate("/experiences/railway-exp", { force: true });
    toast("Offline scenario: uploads paused.", "error", { keepOnRoute: true });
  } else if (id === "conflict") {
    navigate("/experiences/railway-exp", { force: true });
    toast("409 scenario: save will conflict.", "error", { keepOnRoute: true });
  } else if (id === "sensitive") {
    state.role = "admin";
    navigate("/review/cemetery-exp", { force: true });
    toast("Sensitive review: second reviewer required.", "error", { keepOnRoute: true });
  } else if (id === "permission") {
    state.role = "moderator";
    navigate("/experiences/railway-exp", { force: true });
    toast("Read-only scenario: moderator access.", "success", { keepOnRoute: true });
  } else if (id === "error") {
    navigate("/experiences", { force: true });
  }
}

document.addEventListener("click", (event) => {
  const modalAction = event.target.closest("[data-modal-action]");
  if (modalAction) {
    const action = modalAction.dataset.modalAction;
    const value = modalAction.dataset.value;
    if (action === "close-modal") return closeModal();
    if (action === "leave-dirty") {
      const path = value;
      state.dirty = false;
      closeModal();
      navigate(path, { force: true });
      return;
    }
    if (action === "confirm-submit") return confirmSubmit();
    if (action === "confirm-publish") return confirmPublish();
    if (action === "confirm-publish-site") return confirmPublishSite();
    if (action === "confirm-reject") return confirmReject();
    if (action === "confirm-save-site") return confirmSaveSite();
    if (action === "confirm-schedule") return confirmSchedule();
    if (action === "confirm-return") return confirmReturn();
    if (action === "confirm-unpublish-site") return confirmUnpublish("site");
    if (action === "confirm-unpublish-exp") return confirmUnpublish("exp");
    if (action === "confirm-archive-site") return confirmArchive("site");
    if (action === "confirm-archive-exp") return confirmArchive("exp");
    if (action === "confirm-client") return confirmClient();
    if (action === "confirm-external") return confirmExternal();
    if (action === "reload-latest") {
      state.scenario = "default";
      state.dirty = false;
      closeModal();
      toast("Reloaded the server revision v5. Your local edits were discarded.");
      render();
      return;
    }
    return;
  }
  if (event.target.closest("[data-modal-panel]")) return;
  if (event.target.closest("[data-modal-backdrop]")) return closeModal();

  const nav = event.target.closest("[data-nav]");
  if (nav) {
    navigate(nav.dataset.nav);
    return;
  }
  const actionEl = event.target.closest("[data-action]");
  if (actionEl) {
    const action = actionEl.dataset.action;
    if (action === "toggle-sidebar") { const wasOpen = state.sidebarOpen; state.sidebarOpen = !state.sidebarOpen; render(); if (wasOpen) setTimeout(() => document.querySelector(".menu-btn")?.focus(), 30); return; }
    if (action === "toggle-theme") { state.theme = state.theme === "dark" ? "light" : "dark"; document.documentElement.classList.toggle("dark", state.theme === "dark"); render(); return; }
    if (action === "toggle-proto") { state.protoOpen = !state.protoOpen; render(); return; }
    if (action === "reset-demo") { resetDemo({ keepTheme: true }); navigate("/sites", { force: true }); toast("Demo reset."); return; }
    if (action === "locked-nav") { toast(`${actionEl.dataset.label} is outside this prototype.`); return; }
    if (action === "locked-tab") { toast(`${actionEl.dataset.label} is parked for v1. The v1 scope is site video + camera portal + visited record.`); return; }
    if (action === "review-locked") { toast("Only administrators can review revisions.", "error"); return; }
    if (action === "retry-load") { state.scenario = "default"; render(); toast("Loaded the latest records."); return; }
    if (action === "save-draft") { saveDraft(); return; }
    if (action === "save-site") {
      const site = currentSite();
      if (!site) return;
      if (site.status === "published") {
        openModal({
          title: "Save changes to the public site?",
          sub: "This site has no staged revision.",
          body: `<div class="callout callout-gold">${icon("warning")}<div><strong>These changes update the public site immediately.</strong> Policy, sensitivity, and consent changes should be reviewed before saving. A staged site revision is not part of this prototype.</div></div>`,
          actions: [
            { label: "Cancel", kind: "ghost", action: "close-modal" },
            { label: "Save changes", kind: "primary", action: "confirm-save-site" },
          ],
        });
      } else {
        site.updated = "Just now";
        state.dirty = false;
        addAudit(site.id, "save", "Site draft saved", `${user().name} · just now`);
        toast("Site draft saved.");
        render();
      }
      return;
    }
    if (action === "publish-site") {
      const site = currentSite();
      if (!site) return;
      const { blockers } = siteReadiness(site);
      if (blockers.length) return toast("Resolve the site readiness blockers first.", "error");
      confirmDialog({ title: `Publish ${site.name}?`, sub: "The public site page will go live.", body: `<div class="callout callout-green">${icon("checkCircle")}<div>At least one published experience is linked. Publishing is audited; the site can be unpublished without archiving.</div></div>`, confirmLabel: "Publish site", action: "confirm-publish-site" });
      return;
    }
    if (action === "unpublish-site") { unpublish("site"); return; }
    if (action === "archive-site") { archive("site"); return; }
    if (action === "submit-review") { submitReview(); return; }
    if (action === "open-review") { const exp = currentExp(); if (exp) navigate("/review/" + exp.id, { force: true }); return; }
    if (action === "publish-now") { publishNow(); return; }
    if (action === "schedule-publish") { schedulePublish(); return; }
    if (action === "new-revision") {
      const exp = currentExp();
      if (!exp) return;
      exp.draftRevision = Math.max(exp.draftRevision, exp.liveRevision) + 1;
      exp.draftStatus = "draft";
      exp.updated = "Just now";
      addAudit(exp.id, "draft", `Draft v${exp.draftRevision} created`, "New revision for a published experience.");
      toast(`Draft v${exp.draftRevision} created. Live v${exp.liveRevision} stays public.`);
      render();
      return;
    }
    if (action === "return-draft") { returnDraft(); return; }
    if (action === "unpublish-experience") { unpublish("experience"); return; }
    if (action === "archive-experience") { archive("experience"); return; }
    if (action === "assign-me") { assignMe(); return; }
    if (action === "unassign") { unassign(); return; }
    if (action === "assign-uploader") {
      const exp = currentExp();
      toast(exp ? `Cannot assign to ${exp.submittedBy}: reviewer ≠ uploader.` : "No revision selected.", "error");
      return;
    }
    if (action === "approve") { approve(); return; }
    if (action === "request-changes") { requestChanges(false); return; }
    if (action === "reject") { requestChanges(true); return; }
    if (action === "record-client") { recordClient(); return; }
    if (action === "record-external") { recordExternal(); return; }
    if (action === "open-preview") { openPreview(); return; }
    if (action === "jump-decision") {
      const card = document.getElementById("decision-card");
      if (card) {
        card.scrollIntoView({ block: "start", behavior: "smooth" });
        setTimeout(() => card.querySelector("textarea, .decision-actions .btn:not(:disabled)")?.focus({ preventScroll: true }), 260);
      }
      return;
    }
    if (action === "open-audit") { openAudit(); return; }
    if (action === "open-revisions") { openRevisions(); return; }
    if (action === "open-site-preview") { openPreview(); return; }
    if (action === "new-experience-site") {
      state.wizard = { ...state.wizard, siteId: actionEl.dataset.site || "railway" };
      state.wizardStep = 1;
      navigate("/experiences/new", { force: true });
      return;
    }
    if (action === "wizard-next") { state.wizardStep = Math.min(5, (state.wizardStep || 1) + 1); render(); return; }
    if (action === "wizard-prev") { state.wizardStep = Math.max(1, (state.wizardStep || 1) - 1); render(); return; }
    if (action === "wizard-add-card") { if (state.wizard.cards.length < 3) state.wizard.cards.push({ at: 40, text: "" }); render(); return; }
    if (action === "wizard-remove-card") { const i = Number(actionEl.dataset.index); state.wizard.cards.splice(i, 1); render(); return; }
    if (action === "wizard-mock-upload") { toast("Upload is mocked in this prototype."); return; }
    if (action === "create-site") {
      const w = state.wizard;
      if (!w.name?.trim()) return toast("Add a site name before creating the draft.", "error");
      const id = "site-" + Date.now();
      const site = { ...state.sites[0], id, name: w.name, slug: w.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), county: w.county || "Nairobi", locality: w.locality || w.county || "Nairobi", type: w.type || "Historical", access: w.access || "camera_video", sensitivity: w.sensitivity || "standard", status: "draft", managingAuthority: w.authority || "", photography: w.photography || "", consent: w.consent || "", siteRules: w.rules || "", safety: w.safety || "", shortDescription: "", fullDescription: "", sources: "", factCheck: "Pending", publicRights: "", updated: "Just now", experiences: [] };
      state.sites.unshift(site);
      state.dirty = false;
      addAudit(site.id, "site", "Site draft created", `${user().name} · just now`);
      closeModal();
      toast("Site draft created.", "success", { keepOnRoute: true });
      navigate("/sites/" + site.id, { force: true });
      return;
    }
    if (action === "create-experience") {
      const w = state.wizard;
      if (!w.title?.trim()) return toast("Add an experience title before creating the draft.", "error");
      const id = "exp-" + Date.now();
      const exp = { ...state.experiences["railway-exp"], id, siteId: w.siteId || "railway", title: w.title, uploadedBy: user().name, promise: w.promise || "", story: "", mode: w.mode || "camera_video", status: "draft", liveRevision: 0, draftRevision: 1, draftStatus: "draft", videoMaster: "", renditions: {}, poster: false, captions: { en: false, sw: false }, transcript: false, audioDescription: false, rights: w.rights || "", rightsExpiry: w.expiry || "", consent: w.consent || "", textCards: w.cards || [], updated: "Just now", lastSaved: "Just now", diff: { live: ["No live revision"], draft: ["Draft created"] } };
      state.experiences[id] = exp;
      const site = siteById(exp.siteId);
      if (site && !site.experiences.includes(id)) site.experiences.push(id);
      addAudit(id, "draft", "Experience draft created", `${user().name} · just now`);
      toast("Experience draft created.", "success", { keepOnRoute: true });
      navigate("/experiences/" + id, { force: true });
      return;
    }
    if (action === "add-card") { const exp = currentExp(); if (exp && exp.textCards.length < 3) { exp.textCards.push({ at: 60, text: "" }); exp.revisedSinceDecision = true; state.dirty = true; render(); } return; }
    if (action === "remove-card") { const exp = currentExp(); if (exp) { exp.textCards.splice(Number(actionEl.dataset.index), 1); exp.revisedSinceDecision = true; state.dirty = true; render(); } return; }
    if (action === "toggle-captions") { state.captionsOn = !state.captionsOn; render(); return; }
    if (action === "toggle-upload-demo") { state.uploadDemo = !state.uploadDemo; render(); return; }
    if (action === "simulate-upload") { toast("Upload is mocked. The 1080p video file is ready in this fixture."); return; }
    if (action === "retry-upload") { toast("Retry is mocked. The checksum error is cleared in this fixture."); return; }
    if (action === "replace-video") { toast(expDraft().status === "published" ? "Replacing video on a published experience creates a new revision." : "Upload is mocked in this prototype."); return; }
    if (action === "replace-poster") { toast("Poster upload is mocked."); return; }
    if (action === "upload-asset") { toast("Asset upload is mocked. WebVTT validation is part of the production uploader."); return; }
    if (action === "open-rights") { toast("Rights editor is mocked in this prototype."); return; }
    if (action === "use-map") { toast("Map picker is mocked. Production uses MapLibre GL JS."); return; }
    if (action === "refresh-readiness") { updateRail(); toast("Readiness refreshed from the server contract."); return; }
    if (action === "retry-connection") { state.scenario = "default"; toast("Back online."); render(); return; }
    if (action === "review-filter") { state.reviewFilter = actionEl.dataset.filter; render(); return; }
    if (action === "back-sites") { navigate("/sites", { force: true }); return; }
    if (action === "back-experiences") { navigate("/experiences", { force: true }); return; }
    if (action === "back-review") { navigate("/review", { force: true }); return; }
    if (action === "mock-play") { toast("Playback is a still in this prototype."); return; }
    if (action === "close-modal") { closeModal(); return; }
  }
  const siteTab = event.target.closest("[data-site-tab]");
  if (siteTab) {
    state.siteTab = siteTab.dataset.siteTab;
    render();
    setTimeout(() => document.getElementById(`site-tab-${state.siteTab}`)?.focus(), 30);
    return;
  }
  const tab = event.target.closest("[data-tab]");
  if (tab) {
    state.tab = tab.dataset.tab;
    render();
    setTimeout(() => document.getElementById(`exp-tab-${state.tab}`)?.focus(), 30);
    return;
  }
  const access = event.target.closest("[data-site-access]");
  if (access) {
    const site = currentSite();
    if (!site) return;
    site.access = access.dataset.siteAccess;
    state.dirty = true;
    render();
    return;
  }
  const wizardAccess = event.target.closest("[data-wizard-access]");
  if (wizardAccess) { state.wizard.access = wizardAccess.dataset.wizardAccess; render(); return; }
  const wizardMode = event.target.closest("[data-wizard-mode]");
  if (wizardMode) { state.wizard.mode = wizardMode.dataset.wizardMode; render(); return; }
  const scenario = event.target.closest("[data-scenario]");
  if (scenario) { setScenario(scenario.dataset.scenario); return; }
});

document.addEventListener("change", (event) => {
  if (event.target.matches("[data-role-select]")) {
    state.role = event.target.value;
    toast(`Viewing as ${user().name} · ${user().role}.`);
    render();
    return;
  }
  if (event.target.matches('[data-filter="site-county"], [data-filter="site-status"], [data-filter="exp-site"], [data-filter="exp-status"]')) {
    if (event.target.dataset.filter.startsWith("site")) filterSites(); else filterExperiences();
    return;
  }
  if (event.target.matches("[data-site-field]")) {
    const site = currentSite();
    if (!site) return;
    site[event.target.dataset.siteField] = event.target.value;
    state.dirty = true;
    updateRail();
    return;
  }
  if (event.target.matches("[data-exp-field]")) {
    const exp = currentExp();
    if (!exp) return;
    exp[event.target.dataset.expField] = event.target.value;
    exp.revisedSinceDecision = true;
    state.dirty = true;
    updateRail();
    return;
  }
  if (event.target.matches("[data-card-time]")) {
    const exp = currentExp(); if (!exp) return;
    exp.textCards[Number(event.target.dataset.cardTime)].at = Number(event.target.value) || 0;
    exp.revisedSinceDecision = true; state.dirty = true; updateRail(); return;
  }
  if (event.target.matches("[data-wizard-field]")) {
    state.wizard[event.target.dataset.wizardField] = event.target.value;
    return;
  }
  if (event.target.matches("[data-filter]")) {
    if (event.target.dataset.filter.startsWith("site")) filterSites(); else filterExperiences();
  }
});

document.addEventListener("input", (event) => {
  if (event.target.matches('[data-filter="site-search"]')) { filterSites(); return; }
  if (event.target.matches('[data-filter="exp-search"]')) { filterExperiences(); return; }
  if (event.target.matches("[data-site-field]")) {
    const site = currentSite(); if (!site) return;
    site[event.target.dataset.siteField] = event.target.value; state.dirty = true; updateRail(); return;
  }
  if (event.target.matches("[data-exp-field]")) {
    const exp = currentExp(); if (!exp) return;
    exp[event.target.dataset.expField] = event.target.value; exp.revisedSinceDecision = true; state.dirty = true; updateRail(); return;
  }
  if (event.target.matches("[data-card-text]")) {
    const exp = currentExp(); if (!exp) return;
    const i = Number(event.target.dataset.cardText);
    if (exp.textCards[i]) exp.textCards[i].text = event.target.value;
    exp.revisedSinceDecision = true; state.dirty = true; updateRail(); return;
  }
  if (event.target.matches("[data-card-time]")) {
    const exp = currentExp(); if (!exp) return;
    exp.textCards[Number(event.target.dataset.cardTime)].at = Number(event.target.value) || 0;
    exp.revisedSinceDecision = true; state.dirty = true; updateRail(); return;
  }
  if (event.target.matches("[data-wizard-card-text]")) {
    state.wizard.cards[Number(event.target.dataset.wizardCardText)].text = event.target.value;
    return;
  }
  if (event.target.matches("[data-wizard-card-time]")) {
    state.wizard.cards[Number(event.target.dataset.wizardCardTime)].at = Number(event.target.value) || 0;
  }
});

document.addEventListener("keydown", (event) => {
  const editorTab = event.target.closest('[role="tab"][data-tab], [role="tab"][data-site-tab]');
  if (editorTab && ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
    const list = [...editorTab.closest('[role="tablist"]').querySelectorAll('[role="tab"]')];
    const index = list.indexOf(editorTab);
    const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? list.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + list.length) % list.length;
    event.preventDefault();
    list[nextIndex]?.click();
    return;
  }
  if (state.modal && event.key === "Tab") {
    const panel = document.querySelector("[data-modal-panel]");
    if (panel) {
      const focusables = [...panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((el) => !el.disabled && el.offsetParent !== null);
      if (focusables.length) {
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (!panel.contains(document.activeElement)) {
          event.preventDefault();
          first.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
  }
  if (event.key === "Escape") {
    if (state.modal) closeModal();
    else if (state.protoOpen) { state.protoOpen = false; render(); }
    else if (state.sidebarOpen) { state.sidebarOpen = false; render(); }
  }
});

function expDraft() {
  return currentExp() || { status: "draft" };
}

function updateRail() {
  const rail = document.getElementById("readiness-rail");
  if (!rail) return;
  const exp = currentExp();
  const site = currentSite();
  if (exp) rail.innerHTML = expRail(exp);
  else if (site) rail.innerHTML = siteRail(site);
  const expNow = currentExp();
  if (expNow) {
    const { blockers, warnings } = expReadiness(expNow);
    const btn = document.querySelector("[data-publish-btn]");
    if (btn && expNow.draftStatus === "draft") {
      const reason = submitBlockReason(expNow) || (!can("edit") ? "You do not have permission to submit" : "");
      btn.disabled = Boolean(reason);
      btn.title = reason;
    }
    document.querySelectorAll("[data-dirty]").forEach((el) => { el.textContent = state.dirty ? "Unsaved changes" : "Saved"; el.className = state.dirty ? "chip chip-gold" : "chip"; });
  }
}

/* ---------------- hash routing + boot ---------------- */
window.addEventListener("hashchange", () => {
  const next = route();
  if (next === state.currentRoute) return;
  if (state.dirty && state.currentRoute && isEditorPath(state.currentRoute) && next !== state.currentRoute) {
    history.replaceState(null, "", "#" + state.currentRoute);
    openModal({
      title: "Unsaved changes",
      sub: "You have edits that have not been saved.",
      body: `<p class="small muted">Save the draft before leaving, or leave without saving. This prototype does not keep a local copy.</p>`,
      actions: [
        { label: "Stay on this page", kind: "ghost", action: "close-modal" },
        { label: "Leave without saving", kind: "danger", action: "leave-dirty", value: next },
      ],
    });
    return;
  }
  state.dirty = false;
  render();
});
window.addEventListener("beforeunload", (event) => { if (!state.dirty) return; event.preventDefault(); event.returnValue = ""; });
if (!location.hash) location.hash = "/sites";
render();

/* Expose a small read-only surface for the critique harness. */
window.__thenNowPrototype = {
  state: () => ({ route: route(), role: state.role, scenario: state.scenario, dirty: state.dirty }),
  go: (path) => navigate(path, { force: true }),
  setRole: (role) => { state.role = role; render(); },
  setScenario: (scenario) => setScenario(scenario),
};
