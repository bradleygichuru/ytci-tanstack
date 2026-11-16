/* Audio Stories admin prototype — throwaway interaction layer. */

const app = document.getElementById("app");
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const views = $$(".view");

const STORIES = {
  mangrove: {
    title: "The Last Mangrove",
    collection: "Coastal Voices",
    summary: "Amina Yusuf follows the people replanting the mangrove that has held this coast together for generations.",
    badges: '<span class="badge badge--leaf">Published</span><span class="badge badge--amber">Revision 3 in review</span><span class="badge badge--outline">Standard</span>',
  },
  drum: {
    title: "The Drum at Dusk",
    collection: "Rift Valley Stories",
    summary: "Wanjiku M. traces a drumming tradition through a highland town, and the silence left when the last drummer stops.",
    badges: '<span class="badge badge--amber">In review</span><span class="badge badge--muted">Revision 2</span><span class="badge badge--amber">Sensitive</span>',
  },
  forest: {
    title: "Forest Keepers",
    collection: "Rift Valley Stories",
    summary: "Faith K. walks with the community forest association repairing a highland forest, one seedling at a time.",
    badges: '<span class="badge badge--muted">Draft</span><span class="badge badge--muted">Revision 1</span><span class="badge badge--outline">Restricted</span>',
  },
  lake: {
    title: "Lake Stories",
    collection: "Coastal Voices",
    summary: "Otieno A. listens to the fishing families reading the lake’s weather, and the stories they keep for the next generation.",
    badges: '<span class="badge badge--forest">Scheduled</span><span class="badge badge--muted">Approved</span><span class="badge badge--outline">Standard</span>',
  },
  tidal: {
    title: "Tidal Memories",
    collection: "Coastal Voices",
    summary: "A Swahili-language recollection of the tides, trade, and the families who read the water.",
    badges: '<span class="badge badge--leaf">Published</span><span class="badge badge--muted">Live version</span><span class="badge badge--outline">Rights expiring</span>',
  },
  oldtown: {
    title: "Old Town Walk",
    collection: "History & Places",
    summary: "A walking history of the old town, its doors, its streets, and the people who remember what was there before.",
    badges: '<span class="badge badge--muted">Unpublished</span><span class="badge badge--muted">Live version</span><span class="badge badge--outline">Standard</span>',
  },
};

const CRUMBS = {
  stories: "Stories",
  editor: "The Last Mangrove",
  collections: "Collections",
  "collection-editor": "Coastal Voices",
  review: "Review",
  "review-detail": "The Last Mangrove",
};

const state = {
  role: "administrator",
  scenario: "default",
  screen: "stories",
  editorTab: "story",
  queueFilter: "all",
  currentStory: "mangrove",
  reviewState: "in_review",
  secondReviewer: false,
  uploadTimer: null,
  toastTimer: null,
  dialogAction: null,
  initialised: false,
  decisionRecorded: false,
};

function toast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("is-visible");
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => el.classList.remove("is-visible"), 3600);
}

function setScreen(name) {
  state.screen = name;
  app.dataset.screen = name;
  views.forEach((view) => view.classList.toggle("is-active", view.dataset.view === name));
  document.getElementById("screenSelect").value = name;
  document.getElementById("crumbCurrent").textContent = CRUMBS[name] || "Stories";
  $(".content").scrollTop = 0;
  $$("[data-tab-screen]").forEach((tab) => {
    tab.tabIndex = tab.dataset.tabScreen === name ? 0 : -1;
  });
  if (name === "editor") {
    document.getElementById("conflictBanner").hidden = state.scenario !== "conflict";
  }
  applyRole(state.role, true);
}

function setEditorTab(tab) {
  state.editorTab = tab;
  $$("[data-editor-tab]").forEach((button) => {
    const active = button.dataset.editorTab === tab;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
  });
  $$("[data-editor-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.editorPanel !== tab;
  });
  if (tab === "tracks" && state.scenario === "upload-failed") {
    document.getElementById("uploadError").hidden = false;
    document.getElementById("uploadProgress").hidden = true;
  }
}

function syncFreeze() {
  const frozen = ["in_review", "approved", "scheduled", "published"].includes(state.reviewState);
  $$("[data-freeze-field]").forEach((field) => {
    field.disabled = frozen || field.dataset.freezeLocked === "true";
  });
  const banner = document.getElementById("freezeBanner");
  if (!banner) return;
  banner.hidden = !frozen;
  const title = document.getElementById("freezeTitle");
  const text = document.getElementById("freezeText");
  if (state.reviewState === "published") {
    title.textContent = "Revision 3 is live.";
    text.textContent = "Return it to draft to change audio, transcripts, placement, notes, or rights. Story details can still be saved.";
  } else if (state.reviewState === "scheduled") {
    title.textContent = "Revision 3 is approved and scheduled.";
    text.textContent = "The live version stays public until the scheduled time. Return to draft to change material content.";
  } else if (state.reviewState === "approved") {
    title.textContent = "Revision 3 is approved.";
    text.textContent = "Publish it or return it to draft to change material content. Story details can still be saved.";
  } else if (state.reviewState === "in_review") {
    title.textContent = "Revision 3 is frozen for review.";
    text.textContent = "Return it to draft to edit audio, transcripts, placement, notes, or rights. Story details can still be saved.";
  }
}

function setChecklist(count, detail, stateName = "ok") {
  const badge = document.getElementById("reviewCheckCount");
  if (badge) {
    badge.textContent = count;
    badge.className = `badge ${stateName === "warn" ? "badge--amber" : "badge--leaf"}`;
  }
  const detailEl = document.getElementById("riskCheckDetail");
  if (detailEl) detailEl.textContent = detail;
  const icon = document.getElementById("riskCheckIcon");
  if (icon) {
    icon.textContent = stateName === "warn" ? "!" : "✓";
    icon.className = `check-icon ${stateName === "warn" ? "check-icon--warn" : "check-icon--ok"}`;
  }
  const row = document.getElementById("riskCheckRow");
  if (row) row.classList.toggle("check-row--warn", stateName === "warn");
}

function applyRole(role, showBanner = true) {
  state.role = role;
  app.dataset.role = role;
  const banner = document.getElementById("roleBanner");
  const footRole = $(".sidebar-foot small");
  if (footRole) footRole.textContent = role.replace("_", " ").replace(/^./, (c) => c.toUpperCase());
  const copy = {
    administrator: "Administrator: review and publish. Archive, revoke, and separation overrides require a super-admin.",
    content_editor: "Content editor: draft and submit. Review, publish, unpublish, and takedown are administrator-only.",
    super_admin: "Super admin: full control, including archive, revoke, restore, and separation overrides.",
    moderator: "Read-only: you can inspect stories, collections, and reviews, but cannot edit, assign, decide, or publish.",
  };
  banner.hidden = !showBanner || role === "administrator";
  if (showBanner) {
    banner.innerHTML = `<svg class="icon"><use href="#${role === "moderator" ? "i-eye" : "i-shield"}"/></svg><span>${copy[role]}</span>`;
    banner.className = `role-banner${role === "moderator" ? " role-banner--readonly" : ""}`;
  }

  // Preserve intentionally disabled fields (e.g. immutable slug) while making the editor read-only for moderators.
  $$(".editor-panel input, .editor-panel select, .editor-panel textarea, [data-view='collection-editor'] .panel input, [data-view='collection-editor'] .panel select, [data-view='collection-editor'] .panel textarea").forEach((field) => {
    if (field.dataset.locked === undefined) field.dataset.locked = field.disabled ? "true" : "false";
    field.disabled = field.dataset.locked === "true" || role === "moderator";
  });

  const submit = $('[data-action="submit-review"]');
  if (submit) {
    submit.hidden = state.reviewState !== "draft";
    submit.disabled = state.reviewState !== "draft";
    submit.title = submit.hidden ? "Only a draft can be submitted for review." : "";
  }
  const saveDraft = $('[data-action="save-draft"]');
  if (saveDraft) saveDraft.textContent = state.reviewState === "draft" ? "Save draft" : "Save story details";
  const external = document.getElementById("recordExternalReview");
  if (external) external.disabled = !["administrator", "super_admin"].includes(role);
  const notes = document.getElementById("reviewNotes");
  if (notes) notes.disabled = !["administrator", "super_admin"].includes(role);
  $$(".decision-actions").forEach((actions) => {
    actions.hidden = !["administrator", "super_admin"].includes(role) || state.decisionRecorded;
  });
  const assigned = document.getElementById("assignedReviewer");
  if (assigned) assigned.disabled = !["administrator", "super_admin"].includes(role);
  syncFreeze();
  syncActionGates();
  if (role === "moderator") {
    $$(".editor-panel .link-btn, .ordered-row .link-btn, #addLanguage, #chooseAudio, [data-audio-replace]").forEach((control) => {
      control.dataset.editOnly = "true";
    });
  }
}

function syncActionGates() {
  const canPublish = ["approved", "scheduled", "published"].includes(state.reviewState);
  const canSchedule = state.reviewState === "approved";
  $$('[data-action="publish-now"]').forEach((button) => {
    button.disabled = !canPublish;
    button.title = canPublish ? "" : "Approve the revision before publishing.";
  });
  $$('[data-action="schedule"]').forEach((button) => {
    button.disabled = !canSchedule;
    button.title = canSchedule ? "" : "Only an approved revision can be scheduled.";
  });
}

function clearScenarioUI() {
  document.getElementById("scenarioBanner").hidden = true;
  document.getElementById("conflictBanner").hidden = true;
  document.getElementById("uploadError").hidden = true;
  document.getElementById("uploadProgress").hidden = true;
  document.getElementById("secondReviewerNote").hidden = true;
  document.getElementById("scenarioReviewAlert")?.remove();
  document.querySelectorAll('[data-action="approve-revision"]').forEach((button) => {
    button.disabled = false;
  });
  document.getElementById("decisionNote").textContent = "Approving makes revision 3 ready to publish. The live revision stays public until then.";
  state.reviewState = "in_review";
  state.decisionRecorded = false;
  const recorded = document.getElementById("decisionRecorded");
  if (recorded) recorded.hidden = true;
  $$(".decision-actions").forEach((actions) => {
    actions.hidden = !["administrator", "super_admin"].includes(state.role);
  });
  const publishBadge = document.getElementById("publishStatusBadge");
  publishBadge.className = "badge badge--amber";
  publishBadge.textContent = "Blocked by review";
  document.getElementById("revisionCardTitle").textContent = "Ready except review";
  document.getElementById("revisionCardCopy").textContent = "All content and rights checks pass. Approve the revision before publishing.";
  document.getElementById("readinessScore").textContent = "6 of 7";
  const ring = document.getElementById("readinessRing");
  ring.style.setProperty("--pct", "86");
  ring.textContent = "86%";
  document.getElementById("readinessCopy").textContent = "One blocking item. The live version stays public until revision 3 is approved and published.";
  document.getElementById("blockingGroup").hidden = false;
  syncActionGates();
  document.getElementById("reviewEyebrow").textContent = "Review · Revision 3 · Standard";
  setChecklist("7/7", "Standard · one reviewer", "ok");
  document.getElementById("cancelSchedule").hidden = true;
  document.getElementById("scheduleButton").hidden = false;
  syncFreeze();
  showStoriesState("default");
  showReviewState("default");
  const story = STORIES[state.currentStory] || STORIES.mangrove;
  document.getElementById("editorBadges").innerHTML = story.badges;
  document.getElementById("reviewBadges").innerHTML = '<span class="badge badge--amber">In review</span><span class="badge badge--leaf">Rev 2 live</span><span class="badge badge--outline">Submitted 2h ago</span>';
}

function showStoriesState(mode) {
  document.getElementById("storiesTable").hidden = mode !== "default";
  document.getElementById("storiesLoading").hidden = mode !== "loading";
  document.getElementById("storiesEmpty").hidden = mode !== "empty";
  document.getElementById("storiesError").hidden = mode !== "error";
  document.getElementById("storiesFooter").hidden = mode !== "default";
  document.getElementById("statGrid").hidden = mode !== "default";
}

function showReviewState(mode) {
  document.getElementById("reviewTable").hidden = mode !== "default";
  document.getElementById("reviewLoading").hidden = mode !== "loading";
  document.getElementById("reviewEmpty").hidden = mode !== "empty";
  document.getElementById("reviewError").hidden = mode !== "error";
  document.getElementById("reviewFooter").hidden = mode !== "default";
}

function scenarioReviewAlert(kind, title, copy, action = "") {
  document.getElementById("scenarioReviewAlert")?.remove();
  const alert = document.createElement("div");
  alert.id = "scenarioReviewAlert";
  alert.className = `review-alert review-alert--${kind}`;
  alert.innerHTML = `<svg class="icon"><use href="#i-alert"/></svg><div><strong>${title}</strong><span>${copy}</span>${action}</div>`;
  const head = $('[data-view="review-detail"] .editor-head');
  head.after(alert);
}

function recordExternalReview() {
  if (!["administrator", "super_admin"].includes(state.role)) {
    toast("Only an administrator can record an external cultural review.");
    return;
  }
  state.secondReviewer = true;
  document.getElementById("secondReviewerNote").innerHTML = '<svg class="icon"><use href="#i-shield"/></svg><div><strong>Second reviewer recorded</strong><span>Prof. J. Mwangi · community historian · external review recorded just now.</span></div>';
  document.querySelectorAll('[data-action="approve-revision"]').forEach((button) => (button.disabled = false));
  document.getElementById("decisionNote").textContent = "Both reviewers have approved. The revision is ready for an administrator to approve.";
  setChecklist("7/7", "Sensitive · two reviewers recorded", "ok");
  document.getElementById("scenarioReviewAlert")?.remove();
  toast("External cultural review recorded. Approval is now available.");
}

function applyScenario(scenario) {
  state.scenario = scenario;
  app.dataset.scenario = scenario;
  const banner = document.getElementById("scenarioBanner");
  banner.hidden = true;
  banner.className = "scenario-banner";
  clearScenarioUI();
  if (scenario === "default") {
    document.getElementById("scenarioSelect").value = "default";
    return;
  }
  if (scenario === "empty" || scenario === "loading" || scenario === "error") {
    const onReview = state.screen === "review";
    if (!onReview) setScreen("stories");
    if (onReview) {
      showReviewState(scenario === "empty" ? "empty" : scenario);
      banner.hidden = false;
      banner.innerHTML = `<svg class="icon"><use href="#i-alert"/></svg><div><strong>${scenario === "empty" ? "Empty queue" : scenario === "loading" ? "Loading queue" : "Queue load error"}</strong> · The Review screen shows its ${scenario} state.</div>`;
      banner.classList.toggle("is-warn", scenario !== "loading");
    } else {
      showStoriesState(scenario === "empty" ? "empty" : scenario);
      if (scenario === "empty") {
        document.getElementById("storiesEmpty").querySelector("h3").textContent = "No stories yet";
        document.getElementById("storiesEmpty").querySelector("p").textContent = "Create the first Audio Story. Drafts and reviews will appear here.";
        document.getElementById("clearStoryFilters").hidden = true;
      }
      banner.hidden = false;
      banner.innerHTML = `<svg class="icon"><use href="#i-alert"/></svg><div><strong>${scenario === "empty" ? "Empty library" : scenario === "loading" ? "Loading stories" : "Stories load error"}</strong> · The Stories list shows its ${scenario} state.</div>`;
      banner.classList.toggle("is-warn", scenario !== "loading");
    }
    return;
  }
  if (scenario === "conflict") {
    state.reviewState = "draft";
    setScreen("editor");
    document.getElementById("editorBadges").innerHTML = '<span class="badge badge--leaf">Published</span><span class="badge badge--muted">Revision 3 draft</span><span class="badge badge--outline">Standard</span>';
    syncFreeze();
    document.getElementById("conflictBanner").hidden = false;
    banner.hidden = false;
    banner.classList.add("is-warn");
    banner.innerHTML = '<svg class="icon"><use href="#i-alert"/></svg><div><strong>Edit conflict</strong> · Another editor saved a newer version. Reload or copy your changes before saving.</div>';
    return;
  }
  if (scenario === "upload-failed") {
    state.reviewState = "draft";
    setScreen("editor");
    document.getElementById("editorBadges").innerHTML = '<span class="badge badge--leaf">Published</span><span class="badge badge--muted">Revision 3 draft</span><span class="badge badge--outline">Standard</span>';
    syncFreeze();
    setEditorTab("tracks");
    document.getElementById("uploadError").hidden = false;
    document.getElementById("uploadProgress").hidden = true;
    setTimeout(() => document.getElementById("uploadCard")?.scrollIntoView({ block: "center" }), 80);
    banner.hidden = false;
    banner.classList.add("is-warn");
    banner.innerHTML = '<svg class="icon"><use href="#i-alert"/></svg><div><strong>Audio upload failed</strong> · The file was not attached. Retry without losing the rest of the editor.</div>';
    return;
  }
  if (scenario === "sensitive") {
    setScreen("review-detail");
    state.secondReviewer = false;
    document.getElementById("secondReviewerNote").hidden = false;
    document.getElementById("secondReviewerNote").innerHTML = '<svg class="icon"><use href="#i-shield"/></svg><div><strong>Second reviewer required</strong><span>Prof. J. Mwangi · community historian · external review pending. Record it from the review alert.</span></div>';
    document.getElementById("reviewBadges").innerHTML = '<span class="badge badge--amber">In review</span><span class="badge badge--leaf">Rev 2 live</span><span class="badge badge--amber">Sensitive</span>';
    document.getElementById("reviewEyebrow").textContent = "Review · Revision 3 · Sensitive";
    setChecklist("6/7", "Sensitive · second reviewer pending", "warn");
    document.querySelectorAll('[data-action="approve-revision"]').forEach((button) => (button.disabled = true));
    document.getElementById("decisionNote").textContent = "Sensitive revision: a second reviewer is required before approval. The external cultural review is pending.";
    scenarioReviewAlert("amber", "Second reviewer required", "Prof. J. Mwangi · community historian. Record the external review before approving.", '<button type="button" class="link-btn" data-role-min="administrator" data-record-external>Record external review</button>');
    banner.hidden = false;
    banner.classList.add("is-warn");
    banner.innerHTML = '<svg class="icon"><use href="#i-shield"/></svg><div><strong>Sensitive review</strong> · Two reviewers, consent evidence, and a content note are required.</div>';
    applyRole(state.role, false);
    return;
  }
  if (scenario === "restricted") {
    setScreen("review-detail");
    document.getElementById("reviewBadges").innerHTML = '<span class="badge badge--amber">In review</span><span class="badge badge--leaf">Rev 2 live</span><span class="badge badge--muted">Restricted</span>';
    document.getElementById("reviewEyebrow").textContent = "Review · Revision 3 · Restricted";
    setChecklist("6/7", "Restricted · no approval", "warn");
    document.querySelectorAll('[data-action="approve-revision"]').forEach((button) => (button.disabled = true));
    document.getElementById("decisionNote").textContent = "Restricted: no approval or publish until super-admin + legal/rights resolution is recorded.";
    scenarioReviewAlert("danger", "Restricted review", "Owner: Legal/rights · 3 days in restricted · missing consent reference. Request changes, reject, or escalate. Do not publish.", '<button type="button" class="link-btn" data-escalate-restricted>Escalate to super-admin + legal/rights</button>');
    banner.hidden = false;
    banner.classList.add("is-danger");
    banner.innerHTML = '<svg class="icon"><use href="#i-alert"/></svg><div><strong>Restricted</strong> · Approve and publish are blocked. Escalate to super-admin + legal/rights.</div>';
    applyRole(state.role, false);
    return;
  }
  if (scenario === "scheduled") {
    setScreen("editor");
    setEditorTab("publish");
    state.reviewState = "scheduled";
    document.getElementById("editorBadges").innerHTML = '<span class="badge badge--leaf">Published</span><span class="badge badge--forest">Revision 3 scheduled</span><span class="badge badge--outline">17 Nov · 09:00 EAT</span>';
    document.getElementById("publishStatusBadge").className = "badge badge--leaf";
    document.getElementById("publishStatusBadge").textContent = "Scheduled";
    document.getElementById("revisionCardTitle").textContent = "Scheduled · 17 Nov 2026, 09:00 EAT";
    document.getElementById("revisionCardCopy").textContent = "The live revision stays public until the scheduled time. Publish now is still available to an administrator.";
    document.getElementById("readinessScore").textContent = "7 of 7";
    document.getElementById("readinessRing").style.setProperty("--pct", "100");
    document.getElementById("readinessRing").textContent = "100%";
    document.getElementById("readinessCopy").textContent = "Approved and scheduled. The live revision stays public until the scheduled time.";
    document.getElementById("blockingGroup").hidden = true;
    document.getElementById("cancelSchedule").hidden = false;
    document.getElementById("scheduleButton").hidden = true;
    document.querySelectorAll('[data-action="approve-revision"]').forEach((button) => (button.disabled = true));
    syncFreeze();
    syncActionGates();
    banner.hidden = false;
    banner.innerHTML = '<svg class="icon"><use href="#i-clock"/></svg><div><strong>Scheduled for 17 Nov 2026, 09:00 EAT</strong> · The live revision remains public until this revision publishes.</div>';
    applyRole(state.role, false);
  }
}

function filterStories() {
  if (state.scenario !== "default") return;
  const query = document.getElementById("storySearch").value.trim().toLowerCase();
  const status = document.getElementById("statusFilter").value.toLowerCase();
  const attention = document.getElementById("needsAttention").classList.contains("is-active");
  const rows = $$("#storiesTable tbody tr");
  let visible = 0;
  rows.forEach((row) => {
    const text = row.textContent.toLowerCase();
    const rowStatus = row.querySelector("td:nth-child(3)")?.textContent.toLowerCase() || "";
    const matchQuery = !query || text.includes(query);
    const matchStatus = !status || rowStatus.includes(status);
    const matchAttention = !attention || row.dataset.attention === "true";
    const match = matchQuery && matchStatus && matchAttention;
    row.hidden = !match;
    if (match) visible += 1;
  });
  const tableVisible = visible > 0;
  document.getElementById("storiesTable").hidden = !tableVisible;
  document.getElementById("storiesEmpty").hidden = tableVisible;
  const shown = document.getElementById("storiesShown");
  if (shown) shown.textContent = `Showing ${visible} of ${rows.length} stories`;
  if (!tableVisible) {
    document.getElementById("storiesEmpty").querySelector("h3").textContent = "No stories match";
    document.getElementById("storiesEmpty").querySelector("p").textContent = "Try a different search or filter. Drafts and reviews stay here until they are published.";
    document.getElementById("clearStoryFilters").hidden = false;
  }
}

function filterQueue(filter) {
  state.queueFilter = filter;
  $$("[data-queue-filter]").forEach((button) => {
    const active = button.dataset.queueFilter === filter;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  const rows = $$("#reviewTable tbody tr");
  if (filter === "all") {
    const tbody = $("#reviewTable tbody");
    [...rows]
      .sort((a, b) => Number(b.textContent.includes("Unassigned")) - Number(a.textContent.includes("Unassigned")))
      .forEach((row) => tbody.append(row));
  }
  let visible = 0;
  rows.forEach((row) => {
    const text = row.textContent;
    const sensitive = Boolean(row.querySelector(".risk--sensitive"));
    const restricted = Boolean(row.querySelector(".risk--restricted"));
    const mine = text.includes("D. Otieno") && !text.includes("Unassigned");
    let match = true;
    if (filter === "unassigned") match = text.includes("Unassigned");
    if (filter === "mine") match = mine;
    if (filter === "sensitive") match = sensitive;
    if (filter === "restricted") match = restricted;
    row.hidden = !match;
    if (match) visible += 1;
  });
  document.getElementById("reviewTable").hidden = visible === 0;
  document.getElementById("reviewEmpty").hidden = visible > 0;
}

function openStory(id) {
  const story = STORIES[id];
  if (!story) return;
  state.currentStory = id;
  document.getElementById("editorTitle").textContent = story.title;
  document.getElementById("editorCollection").textContent = story.collection;
  document.getElementById("storyTitleInput").value = story.title;
  document.getElementById("storySummaryInput").value = story.summary;
  document.getElementById("editorBadges").innerHTML = story.badges;
  setScreen("editor");
  setEditorTab("story");
}

function openReview(id) {
  if (id !== "mangrove") {
    toast("Review detail is wired for The Last Mangrove in this prototype.");
    return;
  }
  state.reviewState = "in_review";
  setScreen("review-detail");
}

function openCollection(id) {
  if (id !== "coastal") {
    toast("Collection editor is wired for Coastal Voices in this prototype.");
    return;
  }
  setScreen("collection-editor");
}

function openPreview() {
  state.lastFocus = document.activeElement;
  const title = document.getElementById("editorTitle").textContent;
  document.getElementById("previewTitle").textContent = title;
  document.getElementById("previewBackdrop").hidden = false;
  document.getElementById("previewModal").hidden = false;
  document.getElementById("closePreview").focus();
}

function closePreview() {
  document.getElementById("previewBackdrop").hidden = true;
  document.getElementById("previewModal").hidden = true;
  requestAnimationFrame(() => {
    if (state.lastFocus && document.body.contains(state.lastFocus)) state.lastFocus.focus();
  });
}

function openDialog({ title, copy, confirm = "Confirm", requireReason = false, schedule = false, danger = false, action }) {
  state.lastFocus = document.activeElement;
  state.dialogAction = action;
  document.getElementById("dialogTitle").textContent = title;
  document.getElementById("dialogCopy").textContent = copy;
  document.getElementById("dialogReasonWrap").hidden = !requireReason;
  document.getElementById("dialogReason").value = "";
  document.getElementById("dialogExtra").hidden = !schedule;
  const button = document.getElementById("dialogConfirm");
  button.textContent = confirm;
  button.className = `btn ${danger ? "btn-danger" : "btn-primary"}`;
  document.getElementById("dialogBackdrop").hidden = false;
  document.getElementById("actionDialog").hidden = false;
  setTimeout(() => {
    (requireReason ? document.getElementById("dialogReason") : schedule ? document.getElementById("dialogScheduleAt") : button).focus();
  }, 20);
}

function closeDialog() {
  document.getElementById("dialogBackdrop").hidden = true;
  document.getElementById("actionDialog").hidden = true;
  state.dialogAction = null;
  requestAnimationFrame(() => {
    if (state.lastFocus && document.body.contains(state.lastFocus)) state.lastFocus.focus();
  });
}

function confirmDialog() {
  const action = state.dialogAction;
  if (!action) return;
  const reasonWrap = document.getElementById("dialogReasonWrap");
  const reason = document.getElementById("dialogReason").value.trim();
  const schedule = document.getElementById("dialogExtra").hidden ? null : document.getElementById("dialogScheduleAt").value;
  if (!reasonWrap.hidden && !reason) {
    document.getElementById("dialogReason").focus();
    toast("Add a reason for the audit trail.");
    return;
  }
  if (schedule !== null && !schedule) {
    toast("Choose a publish time.");
    return;
  }
  closeDialog();
  action({ reason, schedule });
}

function setReviewDecision(kind) {
  state.decisionRecorded = true;
  const recorded = document.getElementById("decisionRecorded");
  const recordedText = document.getElementById("decisionRecordedText");
  if (recorded) recorded.hidden = false;
  if (recordedText) {
    recordedText.textContent = kind === "approved"
      ? "Approved by D. Otieno · just now. The revision is read-only until a new revision is submitted."
      : kind === "rejected"
        ? "Rejected by D. Otieno · just now. The editor must materially revise or delete the draft."
        : "Changes requested by D. Otieno · just now. The editor must edit and resubmit.";
  }
  $$(".decision-actions").forEach((actions) => (actions.hidden = true));
  const badges = document.getElementById("reviewBadges");
  if (kind === "approved") {
    state.reviewState = "approved";
    setChecklist(state.scenario === "sensitive" ? "7/7" : "7/7", state.scenario === "sensitive" ? "Sensitive · two reviewers recorded" : "Standard · one reviewer", "ok");
    document.getElementById("cancelSchedule").hidden = true;
    document.getElementById("scheduleButton").hidden = false;
    syncFreeze();
    syncActionGates();
    badges.innerHTML = '<span class="badge badge--leaf">Approved</span><span class="badge badge--leaf">Rev 2 live</span><span class="badge badge--forest">Ready to publish</span>';
    const approvedBadge = document.getElementById("publishStatusBadge");
    approvedBadge.className = "badge badge--leaf";
    approvedBadge.textContent = "Ready to publish";
    document.getElementById("revisionCardTitle").textContent = "Approved · ready to publish";
    document.getElementById("revisionCardCopy").textContent = "The review is recorded. Publish now or schedule the swap.";
    document.getElementById("readinessScore").textContent = "7 of 7";
    const approvedRing = document.getElementById("readinessRing");
    approvedRing.style.setProperty("--pct", "100");
    approvedRing.textContent = "100%";
    document.getElementById("readinessCopy").textContent = "Review passed. The live revision stays public until you publish or the schedule reaches its time.";
    document.getElementById("blockingGroup").hidden = true;
    document.getElementById("decisionNote").textContent = "Approved. Publishing is a separate action; the live revision is unchanged until then.";
    document.querySelectorAll('[data-action="approve-revision"]').forEach((button) => (button.disabled = true));
    toast("Revision approved. It is ready to publish.");
    return;
  }
  state.reviewState = "draft";
  setChecklist("6/7", kind === "rejected" ? "Returned to draft · rejected" : "Returned to draft · changes requested", "warn");
  syncFreeze();
  syncActionGates();
  badges.innerHTML = `<span class="badge badge--muted">${kind === "rejected" ? "Rejected" : "Changes requested"}</span><span class="badge badge--leaf">Rev 2 live</span><span class="badge badge--outline">Returned to editor</span>`;
  const returnedBadge = document.getElementById("publishStatusBadge");
  returnedBadge.className = "badge badge--amber";
  returnedBadge.textContent = kind === "rejected" ? "Rejected" : "Changes requested";
  document.getElementById("revisionCardTitle").textContent = "Returned to the editor";
  document.getElementById("revisionCardCopy").textContent = "The revision is a draft again. The live revision remains public.";
  document.getElementById("readinessScore").textContent = "6 of 7";
  const returnedRing = document.getElementById("readinessRing");
  returnedRing.style.setProperty("--pct", "86");
  returnedRing.textContent = "86%";
  document.getElementById("readinessCopy").textContent = "The revision needs changes before it can be approved.";
  document.getElementById("blockingGroup").hidden = false;
  document.getElementById("decisionNote").textContent = kind === "rejected" ? "Rejected. The revision returned to draft with the review record retained." : "Changes requested. The editor can edit and resubmit.";
  toast(kind === "rejected" ? "Revision rejected and returned to draft." : "Changes requested. The editor has been notified in the queue.");
}

function handleAction(action) {
  if (["add-story", "replace-cover", "manage-links", "open-record", "open-audit", "view-checklist", "preview-play", "notifications"].includes(action)) {
    const messages = {
      "add-story": "Collection picker opened. Prototype: the story picker is illustrative.",
      "replace-cover": "Cover picker opened. Images use the existing media pipeline.",
      "manage-links": "Destination picker opened. Only published destinations can be linked.",
      "open-record": "Review record opened in the audit timeline.",
      "open-audit": "Audit timeline opened. It is append-only.",
      "view-checklist": "Readiness is computed by the API; the same checklist gates publish.",
      "more-filters": "More filters: county, theme, language, rights expiry, featured. Prototype: the quick filters cover the demo.",
      "preview-play": "Preview player is illustrative; playback is not wired in this artifact.",
      notifications: "No new notifications. Review counts live in the Audio Stories tab.",
    };
    if (action === "open-audit") {
      setEditorTab("rights");
      setTimeout(() => document.querySelector(".audit-block")?.scrollIntoView({ block: "center" }), 50);
    }
    toast(messages[action]);
    return;
  }
  if (action === "reassign") {
    openDialog({
      title: "Reassign review",
      copy: "Choose another administrator. The current reviewer is removed and the assignment is audited.",
      confirm: "Reassign",
      action: () => toast("Reassigned to A. Mwangi. The review snapshot is unchanged."),
    });
    return;
  }
  if (action === "preview-live") {
    toast("Live revision 2 is public. This artifact previews the draft revision from the editor.");
    return;
  }
  if (action === "request-return") {
    toast("Return requested from D. Otieno. The revision stays frozen until a reviewer returns it.");
    return;
  }
  if (action === "return-draft") {
    openDialog({
      title: "Return revision 3 to draft?",
      copy: "The review is cancelled, assignment is cleared, and material content becomes editable. The live revision is unaffected.",
      confirm: "Return to draft",
      requireReason: true,
      action: () => {
        state.reviewState = "draft";
        state.decisionRecorded = false;
        document.getElementById("decisionRecorded").hidden = true;
        document.getElementById("editorBadges").innerHTML = '<span class="badge badge--leaf">Published</span><span class="badge badge--muted">Revision 3 draft</span><span class="badge badge--outline">Standard</span>';
        document.getElementById("publishStatusBadge").className = "badge badge--amber";
        document.getElementById("publishStatusBadge").textContent = "Blocked by review";
        document.getElementById("revisionCardTitle").textContent = "Draft revision";
        document.getElementById("revisionCardCopy").textContent = "Returned to draft. Edit, resubmit, and review again.";
        document.getElementById("readinessScore").textContent = "6 of 7";
        document.getElementById("readinessCopy").textContent = "The revision is editable again and needs review before publishing.";
        document.getElementById("blockingGroup").hidden = false;
        setChecklist("6/7", "Returned to draft", "warn");
        syncFreeze();
        toast("Revision returned to draft. You can edit and resubmit.");
      },
    });
    return;
  }
  if (action === "cancel-schedule") {
    openDialog({
      title: "Cancel the scheduled publish?",
      copy: "The revision returns to approved. The live version stays public. You can reschedule or publish later.",
      confirm: "Cancel schedule",
      requireReason: true,
      action: () => {
        state.reviewState = "approved";
        document.getElementById("editorBadges").innerHTML = '<span class="badge badge--leaf">Published</span><span class="badge badge--forest">Revision 3 approved</span><span class="badge badge--outline">Standard</span>';
        document.getElementById("cancelSchedule").hidden = true;
        document.getElementById("scheduleButton").hidden = false;
        syncFreeze();
        toast("Schedule cancelled. The revision is approved and not scheduled.");
      },
    });
    return;
  }
  if (action === "save-draft") {
    document.getElementById("saveState").textContent = "Saved just now";
    toast(state.reviewState === "draft" ? "Draft saved." : "Story details saved. The reviewed revision is unchanged.");
    return;
  }
  if (action === "new-story") {
    state.currentStory = "mangrove";
    document.getElementById("editorTitle").textContent = "Untitled Audio Story";
    document.getElementById("editorCollection").textContent = "Unassigned";
    document.getElementById("storyTitleInput").value = "";
    document.getElementById("storySummaryInput").value = "";
    document.getElementById("editorBadges").innerHTML = '<span class="badge badge--muted">Draft</span><span class="badge badge--muted">Revision 1</span>';
    setScreen("editor");
    setEditorTab("story");
    toast("Draft created. Add a title, summary, and collection.");
    return;
  }
  if (action === "submit-review") {
    openDialog({
      title: "Submit for review?",
      copy: "The revision freezes. Reviewers see this exact snapshot until they request changes or approve it.",
      confirm: "Submit for review",
      action: () => {
        state.reviewState = "in_review";
        document.getElementById("editorBadges").innerHTML = '<span class="badge badge--muted">Draft</span><span class="badge badge--amber">Revision 2 in review</span>';
        toast("Submitted for review. The revision is now frozen.");
        applyRole(state.role, false);
      },
    });
    return;
  }
  if (action === "approve-revision") {
    const sensitiveBlocked = state.scenario === "sensitive" && !state.secondReviewer;
    if (state.scenario === "restricted") {
      toast("Restricted content cannot be approved. Escalate to super-admin + legal/rights.");
      return;
    }
    if (sensitiveBlocked) {
      toast("A second reviewer is required before approval.");
      return;
    }
    openDialog({
      title: "Approve revision 3?",
      copy: "Approval records the review decision. It does not publish the revision; publishing is a separate action.",
      confirm: "Approve revision",
      action: () => setReviewDecision("approved"),
    });
    return;
  }
  if (action === "request-changes") {
    openDialog({
      title: "Request changes?",
      copy: "The revision returns to the editor as a draft. The review record and notes are retained.",
      confirm: "Request changes",
      requireReason: true,
      action: () => setReviewDecision("changes"),
    });
    return;
  }
  if (action === "reject-revision") {
    openDialog({
      title: "Reject this revision?",
      copy: "Rejection returns the revision to draft. The editor must materially revise or delete the draft. The live version is unaffected.",
      confirm: "Reject revision",
      requireReason: true,
      danger: true,
      action: () => setReviewDecision("rejected"),
    });
    return;
  }
  if (action === "schedule") {
    if (state.reviewState !== "approved") {
      toast("Approve the revision before scheduling it.");
      return;
    }
    openDialog({
      title: "Schedule revision 3",
      copy: "The live revision stays public until this revision publishes. Collection visibility is checked at publish time.",
      confirm: "Schedule publish",
      schedule: true,
      action: ({ schedule }) => {
        state.reviewState = "scheduled";
        document.getElementById("editorBadges").innerHTML = `<span class="badge badge--leaf">Published</span><span class="badge badge--forest">Revision 3 scheduled</span><span class="badge badge--outline">${schedule.replace("T", " · ")} EAT</span>`;
        document.getElementById("cancelSchedule").hidden = false;
        document.getElementById("scheduleButton").hidden = true;
        document.getElementById("publishStatusBadge").className = "badge badge--leaf";
        document.getElementById("publishStatusBadge").textContent = "Scheduled";
        document.getElementById("revisionCardTitle").textContent = "Scheduled publish";
        document.getElementById("revisionCardCopy").textContent = "The live revision stays public until the scheduled time.";
        document.getElementById("readinessScore").textContent = "7 of 7";
        document.getElementById("readinessCopy").textContent = "Approved and scheduled. The live revision stays public until then.";
        document.getElementById("blockingGroup").hidden = true;
        setChecklist("7/7", "Reviewed", "ok");
        syncFreeze();
        toast("Revision scheduled. The live version stays public until then.");
      },
    });
    return;
  }
  if (action === "publish-now") {
    if (!["approved", "scheduled"].includes(state.reviewState)) {
      toast("Approve the revision before publishing it.");
      return;
    }
    openDialog({
      title: "Publish revision 3 now?",
      copy: "The live revision is superseded atomically. Audio downloads become stale and re-download on the next check.",
      confirm: "Publish now",
      action: () => {
        state.reviewState = "published";
        document.getElementById("editorBadges").innerHTML = '<span class="badge badge--leaf">Published</span><span class="badge badge--muted">Revision 3 live</span><span class="badge badge--outline">contentVersion 3</span>';
        document.getElementById("publishStatusBadge").className = "badge badge--leaf";
        document.getElementById("publishStatusBadge").textContent = "Live";
        document.getElementById("revisionCardTitle").textContent = "Revision 3 is live";
        document.getElementById("revisionCardCopy").textContent = "The previous revision is superseded. Downloads become stale on the next check.";
        syncFreeze();
        toast("Revision 3 is live. The previous revision is superseded.");
      },
    });
    return;
  }
  if (action === "unpublish") {
    openDialog({
      title: "Unpublish this story?",
      copy: "The story disappears from the public library. Open revisions are cancelled. Downloads are removed on the next check.",
      confirm: "Unpublish",
      requireReason: true,
      danger: true,
      action: () => {
        document.getElementById("editorBadges").innerHTML = '<span class="badge badge--muted">Unpublished</span><span class="badge badge--muted">Rev 2 retained</span>';
        toast("Story unpublished. The tombstone and audit record were created.");
      },
    });
    return;
  }
  if (action === "archive") {
    openDialog({
      title: "Archive this story?",
      copy: "Archive retires the story and keeps its records. Restoration requires a super-admin and a full re-review.",
      confirm: "Archive",
      requireReason: true,
      danger: true,
      action: () => toast("Story archived. It is hidden but retained for records."),
    });
    return;
  }
  if (action === "revoke") {
    openDialog({
      title: "Revoke this story?",
      copy: "Revocation is a rights/safety takedown. The story is hidden immediately, downloads are removed, and only a super-admin can restore it after a full re-review.",
      confirm: "Revoke story",
      requireReason: true,
      danger: true,
      action: () => toast("Story revoked. Tombstone and audit record created."),
    });
    return;
  }
  if (action === "publish-collection") {
    openDialog({
      title: "Publish Coastal Voices?",
      copy: "The collection is already published. A publish action records an audit entry and refreshes the public collection.",
      confirm: "Publish collection",
      action: () => toast("Collection published."),
    });
    return;
  }
  if (action === "unpublish-collection") {
    openDialog({
      title: "Unpublish Coastal Voices?",
      copy: "This hides 3 published stories from the library and destination sections. Story statuses do not change. Republish to restore them.",
      confirm: "Unpublish collection",
      requireReason: true,
      danger: true,
      action: () => {
        $('[data-view="collection-editor"] .title-badges').innerHTML = '<span class="badge badge--muted">Unpublished</span><span class="badge badge--amber">3 stories hidden</span>';
        toast("Collection unpublished. Stories are hidden, not changed.");
      },
    });
    return;
  }
  if (action === "save-collection") {
    const save = document.getElementById("collectionSaveState");
    if (save) save.textContent = "Saved just now";
    toast("Collection saved. Story order and metadata are up to date.");
    return;
  }
  if (action === "archive-collection") {
    openDialog({
      title: "Archive Coastal Voices?",
      copy: "Archiving hides the collection and its stories but retains all records. Restoration requires a super-admin and a re-review.",
      confirm: "Archive collection",
      requireReason: true,
      danger: true,
      action: () => toast("Collection archived. It is hidden but retained for records."),
    });
    return;
  }
  if (action === "new-collection") {
    toast("Prototype: the new collection form starts with title, description, cover, and order.");
    return;
  }
}

function startUpload(force = false) {
  clearInterval(state.uploadTimer);
  const progress = document.getElementById("uploadProgress");
  const error = document.getElementById("uploadError");
  const bar = document.getElementById("uploadBar");
  const status = document.getElementById("uploadStatus");
  error.hidden = true;
  if (state.scenario === "upload-failed" && !force) {
    progress.hidden = true;
    error.hidden = false;
    return;
  }
  progress.hidden = false;
  bar.style.width = "4%";
  status.textContent = "Uploading 4% · 0.8 MB of 19.4 MB";
  let percent = 4;
  state.uploadTimer = setInterval(() => {
    percent = Math.min(100, percent + 9);
    bar.style.width = `${percent}%`;
    status.textContent = percent < 100 ? `Uploading ${percent}% · ${(percent * 0.194).toFixed(1)} MB of 19.4 MB` : "Validating duration, format, and bitrate…";
    if (percent >= 100) {
      clearInterval(state.uploadTimer);
      setTimeout(() => {
        progress.hidden = true;
        toast("Audio uploaded and validated. The new track is attached to the revision.");
      }, 700);
    }
  }, 280);
}

function cancelUpload() {
  clearInterval(state.uploadTimer);
  document.getElementById("uploadProgress").hidden = true;
  document.getElementById("uploadError").hidden = true;
  toast("Upload cancelled. No file was attached.");
}

function addParagraph(block) {
  const rows = $$(".paragraph-row", block);
  const last = rows[rows.length - 1];
  const row = last.cloneNode(true);
  const next = rows.length + 1;
  row.querySelector(".para-num").textContent = String(next);
  row.querySelector("textarea").value = "";
  row.querySelector("input").value = "";
  row.querySelector("textarea").setAttribute("aria-label", `Paragraph ${next}`);
  row.querySelector("input").setAttribute("aria-label", `Cue for paragraph ${next}`);
  last.after(row);
  row.querySelector("textarea").focus();
}

function assignSelf(button) {
  const row = button.closest("tr");
  const reviewer = row.querySelector("td:nth-child(6)");
  reviewer.textContent = "D. Otieno";
  button.textContent = "Open review";
  button.removeAttribute("data-assign-self");
  button.dataset.openReview = "mangrove";
  toast("Assigned to you. The revision is frozen; decide or recuse.");
}

function moveOrderedRow(button, direction) {
  const row = button.closest(".ordered-row");
  if (direction === "up" && row.previousElementSibling) row.previousElementSibling.before(row);
  if (direction === "down" && row.nextElementSibling) row.nextElementSibling.after(row);
  const rows = $$(".ordered-row");
  rows.forEach((item, index) => (item.querySelector(".order-num").textContent = String(index + 1)));
  const save = document.getElementById("collectionSaveState");
  if (save) save.textContent = "Unsaved changes";
  toast("Collection order updated. Publish or save to keep the change.");
}

function resetPrototype() {
  location.reload();
}

/* Initialisation */
$$(".editor-panel .btn, .panel-head .btn, #addLanguage, #chooseAudio, [data-audio-replace]").forEach((control) => {
  control.dataset.editOnly = "true";
});

const freezeSelectors = [
  '[data-editor-panel="tracks"] input',
  '[data-editor-panel="tracks"] textarea',
  '[data-editor-panel="tracks"] select',
  '[data-editor-panel="tracks"] button',
  '[data-editor-panel="credits"] input',
  '[data-editor-panel="credits"] textarea',
  '[data-editor-panel="credits"] select',
  '[data-editor-panel="rights"] input',
  '[data-editor-panel="rights"] textarea',
  '[data-editor-panel="rights"] select',
  '#contentNoteText',
  '.check-grid input',
];
freezeSelectors.forEach((selector) => {
  $$(selector).forEach((field) => {
    if (field.closest('[data-audio-preview]')) return;
    field.dataset.freezeField = "true";
    field.dataset.freezeLocked = field.disabled ? "true" : "false";
  });
});
$$("[role='tab']").forEach((tab) => {
  if (!tab.hasAttribute("aria-selected")) tab.setAttribute("aria-selected", "false");
});
$$("[role='tablist']").forEach((list) => {
  if (!list.getAttribute("aria-label")) list.setAttribute("aria-label", "Audio Stories sections");
});
$$("th").forEach((th) => th.setAttribute("scope", "col"));
setEditorTab("story");

document.getElementById("roleSelect").addEventListener("change", (event) => applyRole(event.target.value));
document.getElementById("scenarioSelect").addEventListener("change", (event) => applyScenario(event.target.value));
document.getElementById("screenSelect").addEventListener("change", (event) => setScreen(event.target.value));
document.getElementById("resetPrototype").addEventListener("click", resetPrototype);

function markDirty(target) {
  if (!target.closest) return;
  if (target.closest(".editor-panel")) {
    const save = document.getElementById("saveState");
    if (save) save.textContent = "Unsaved changes";
  }
  if (target.closest('[data-view="collection-editor"]')) {
    const save = document.getElementById("collectionSaveState");
    if (save) save.textContent = "Unsaved changes";
  }
}
document.addEventListener("input", (event) => markDirty(event.target));
document.addEventListener("change", (event) => markDirty(event.target));
document.getElementById("storySearch").addEventListener("input", filterStories);
document.getElementById("statusFilter").addEventListener("change", filterStories);
document.getElementById("needsAttention").addEventListener("click", (event) => {
  const active = event.currentTarget.classList.toggle("is-active");
  event.currentTarget.setAttribute("aria-pressed", String(active));
  filterStories();
});
document.getElementById("clearStoryFilters").addEventListener("click", () => {
  document.getElementById("storySearch").value = "";
  document.getElementById("statusFilter").value = "";
  document.getElementById("needsAttention").classList.remove("is-active");
  document.getElementById("needsAttention").setAttribute("aria-pressed", "false");
  filterStories();
});
document.getElementById("retryStories").addEventListener("click", () => applyScenario("default"));
document.getElementById("retryReview").addEventListener("click", () => applyScenario("default"));
document.getElementById("openCollectionsFromStories").addEventListener("click", () => setScreen("collections"));
document.getElementById("addLanguage").addEventListener("click", () => toast("English and Kiswahili only in v1. Add a transcript for the other language instead."));
document.getElementById("chooseAudio").addEventListener("click", () => startUpload());
document.getElementById("retryUpload").addEventListener("click", () => startUpload(true));
document.getElementById("cancelUpload").addEventListener("click", cancelUpload);
document.getElementById("addParagraph").addEventListener("click", (event) => addParagraph(event.currentTarget.closest(".transcript-block")));
document.getElementById("addParagraphSw").addEventListener("click", (event) => addParagraph(event.currentTarget.closest(".transcript-block")));
document.getElementById("resetPrototype").addEventListener("click", resetPrototype);

document.addEventListener("click", (event) => {
  const go = event.target.closest("[data-go]");
  if (go) { setScreen(go.dataset.go); return; }
  const tabScreen = event.target.closest("[data-tab-screen]");
  if (tabScreen) { setScreen(tabScreen.dataset.tabScreen); return; }
  const storyRow = event.target.closest("[data-open-story]");
  if (storyRow) { openStory(storyRow.dataset.openStory); return; }
  const reviewRow = event.target.closest("[data-open-review]");
  if (reviewRow) {
    if (event.target.closest("[data-assign-self]")) { assignSelf(event.target); return; }
    openReview(reviewRow.dataset.openReview);
    return;
  }
  const collectionRow = event.target.closest("[data-open-collection]");
  if (collectionRow) { openCollection(collectionRow.dataset.openCollection); return; }
  const editorTab = event.target.closest("[data-editor-tab]");
  if (editorTab) { setEditorTab(editorTab.dataset.editorTab); return; }
  const queueTab = event.target.closest("[data-queue-filter]");
  if (queueTab) { filterQueue(queueTab.dataset.queueFilter); return; }
  const action = event.target.closest("[data-action]");
  if (action) { handleAction(action.dataset.action); return; }
  if (event.target.closest("[data-open-preview]")) { openPreview(); return; }
  if (event.target.closest("[data-audio-preview]")) { toast("Playing a short preview from the signed media URL."); return; }
  if (event.target.closest("[data-record-external]") || event.target.closest("#recordExternalReview")) { recordExternalReview(); return; }
  if (event.target.closest("[data-escalate-restricted]")) { toast("Escalated to super-admin + legal/rights. No publish until resolution is recorded."); return; }
  if (event.target.closest("[data-audio-replace]")) { startUpload(); return; }
  if (event.target.closest("[data-assign-self]")) { assignSelf(event.target.closest("[data-assign-self]")); return; }
  const up = event.target.closest('[aria-label="Move up"]');
  if (up) { moveOrderedRow(up, "up"); return; }
  const down = event.target.closest('[aria-label="Move down"]');
  if (down) { moveOrderedRow(down, "down"); return; }
  const remove = event.target.closest(".ordered-row .link-btn");
  if (remove && remove.textContent.trim() === "Remove") {
    remove.closest(".ordered-row").remove();
    const save = document.getElementById("collectionSaveState");
    if (save) save.textContent = "Unsaved changes";
    toast("Story removed from the collection. Save or publish to keep the change.");
    return;
  }
  if (event.target.closest("#closePreview") || event.target.closest("#closePreview2") || event.target.closest("#previewBackdrop")) { closePreview(); return; }
  if (event.target.closest("#closeDialog") || event.target.closest("#dialogCancel") || event.target.closest("#dialogBackdrop")) { closeDialog(); return; }
  if (event.target.closest("#dialogConfirm")) { confirmDialog(); return; }
  if (event.target.closest("#copyChanges")) {
    const text = "The Last Mangrove — revision 3 — edited summary: Amina Yusuf follows the people replanting the mangrove.";
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(() => toast("Changes copied to the clipboard. Reload to get the latest revision.")).catch(() => toast("Copy failed. Select your changes manually."));
    else toast("Changes copied to the clipboard. Reload to get the latest revision.");
    return;
  }
  if (event.target.closest("#reloadStory")) { document.getElementById("conflictBanner").hidden = true; toast("Latest version loaded. Your unsaved copy was discarded."); return; }
});

document.addEventListener("keydown", (event) => {
  const tab = event.target.closest ? event.target.closest('[role="tab"]') : null;
  if (tab && ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
    const list = tab.closest('[role="tablist"]');
    const tabs = list ? [...list.querySelectorAll('[role="tab"]')].filter((item) => !item.disabled) : [];
    const index = tabs.indexOf(tab);
    if (index >= 0 && tabs.length > 1) {
      let next = null;
      if (event.key === "ArrowRight") next = tabs[(index + 1) % tabs.length];
      if (event.key === "ArrowLeft") next = tabs[(index - 1 + tabs.length) % tabs.length];
      if (event.key === "Home") next = tabs[0];
      if (event.key === "End") next = tabs[tabs.length - 1];
      if (next) {
        event.preventDefault();
        next.focus();
        next.click();
        return;
      }
    }
  }
  if (event.key === "Tab") {
    const modal = !document.getElementById("previewModal").hidden
      ? document.getElementById("previewModal")
      : !document.getElementById("actionDialog").hidden
        ? document.getElementById("actionDialog")
        : null;
    if (!modal) return;
    const focusables = [...modal.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')];
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
    return;
  }
  if (event.key !== "Escape") return;
  if (!document.getElementById("previewModal").hidden) closePreview();
  else if (!document.getElementById("actionDialog").hidden) closeDialog();
});

/* Default state + review deep links */
const params = new URLSearchParams(window.location.search);
const role = params.get("role");
const screen = params.get("screen");
const scenario = params.get("scenario");
const bootRole = ["administrator", "content_editor", "super_admin", "moderator"].includes(role) ? role : "administrator";
document.getElementById("roleSelect").value = bootRole;
applyRole(bootRole);
setScreen(["stories", "editor", "collections", "collection-editor", "review", "review-detail"].includes(screen) ? screen : "stories");
if (params.get("tab")) setEditorTab(params.get("tab"));
if (scenario) {
  document.getElementById("scenarioSelect").value = scenario;
  applyScenario(scenario);
}
if (params.get("preview") === "1") openPreview();
state.initialised = true;
