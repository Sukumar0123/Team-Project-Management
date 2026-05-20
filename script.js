const STORAGE_KEY = 'teamflow-static-v1';
const columns = ['Todo', 'In Progress', 'Review', 'Done'];
let state = loadState();
let activeProjectId = state.activeProjectId;
let currentView = 'dashboard';
let activeFilter = 'all';
let editingTaskId = null;
let deletingTaskId = null;
let editingMemberId = null;
let deletingMemberId = null;

const $ = (id) => document.getElementById(id);

function defaultState() {
  const p1 = crypto.randomUUID();
  const m1 = crypto.randomUUID();
  const m2 = crypto.randomUUID();
  const m3 = crypto.randomUUID();
  const now = new Date().toISOString();
  return {
    activeProjectId: p1,
    theme: 'dark',
    projects: [{ id: p1, name: 'Smart Hospital System', createdAt: now, archived: false }],
    members: [
      { id: m1, name: 'Sukumar', role: 'Frontend Developer' },
      { id: m2, name: 'Chandu', role: 'Backend Developer' },
      { id: m3, name: 'Ravi', role: 'Documentation' }
    ],
    tasks: [
      {
        id: crypto.randomUUID(), projectId: p1, title: 'Create patient module UI',
        description: 'Build responsive patient list, add patient form, and profile page.',
        assigneeId: m1, priority: 'High', dueDate: nextDate(3), status: 'In Progress', progress: 55,
        labels: ['Frontend', 'Feature'], comments: [{ text: 'Patient UI layout completed. Form validation pending.', time: now }], createdAt: now
      },
      {
        id: crypto.randomUUID(), projectId: p1, title: 'Doctor API integration',
        description: 'Connect doctor module frontend with Django REST API.',
        assigneeId: m2, priority: 'Medium', dueDate: nextDate(5), status: 'Review', progress: 85,
        labels: ['Backend', 'API'], comments: [{ text: 'API tested in Postman. Need frontend verification.', time: now }], createdAt: now
      },
      {
        id: crypto.randomUUID(), projectId: p1, title: 'Prepare project documentation',
        description: 'Add architecture, workflow, modules, testing and screenshots.',
        assigneeId: m3, priority: 'Low', dueDate: nextDate(7), status: 'Todo', progress: 0,
        labels: ['Documentation'], comments: [], createdAt: now
      }
    ],
    activity: [
      { id: crypto.randomUUID(), projectId: p1, text: 'Project created: Smart Hospital System', time: now },
      { id: crypto.randomUUID(), projectId: p1, text: 'Sample tasks added to board', time: now }
    ]
  };
}

function nextDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  const data = saved ? JSON.parse(saved) : defaultState();
  data.projects = (data.projects || []).map(p => ({ ...p, archived: Boolean(p.archived) }));
  data.members = data.members || [];
  data.tasks = data.tasks || [];
  data.activity = data.activity || [];
  const activeExists = data.projects.some(p => p.id === data.activeProjectId && !p.archived);
  if (!activeExists) data.activeProjectId = (data.projects.find(p => !p.archived) || data.projects[0] || {}).id;
  return data;
}

function saveState() {
  state.activeProjectId = activeProjectId;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function activeProject() {
  return state.projects.find(p => p.id === activeProjectId) || state.projects.find(p => !p.archived) || state.projects[0];
}
function activeProjects() { return state.projects.filter(p => !p.archived); }

function projectTasks() {
  const q = $('searchInput').value.toLowerCase().trim();
  return state.tasks.filter(task => {
    if (task.projectId !== activeProjectId) return false;
    const assignee = getMember(task.assigneeId)?.name || '';
    const haystack = `${task.title} ${task.description} ${assignee} ${task.priority} ${task.status} ${task.labels.join(' ')}`.toLowerCase();
    const searchOk = !q || haystack.includes(q);
    const filterOk = activeFilter === 'all' ||
      (activeFilter === 'unassigned' && !task.assigneeId) ||
      task.priority === activeFilter || task.status === activeFilter || task.labels.includes(activeFilter);
    return searchOk && filterOk;
  });
}

function getMember(id) { return state.members.find(m => m.id === id); }
function initials(name = '?') { return name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase(); }
function formatTime(iso) { return new Date(iso).toLocaleString(); }

function addActivity(text) {
  state.activity.unshift({ id: crypto.randomUUID(), projectId: activeProjectId, text, time: new Date().toISOString() });
  state.activity = state.activity.slice(0, 100);
}

function statusFromProgress(progress, currentStatus) {
  const value = Number(progress);
  if (value === 0) return 'Todo';
  if (value === 100) return 'Done';
  if (currentStatus === 'Review') return 'Review';
  return 'In Progress';
}

function render() {
  document.body.classList.toggle('light', state.theme === 'light');
  $('themeToggle').textContent = state.theme === 'light' ? '☀' : '☾';
  renderProjects();
  renderAssignees();
  renderStats();
  renderBoard();
  renderMembers();
  renderActivity();
  $('activeProjectName').textContent = activeProject()?.name || 'Project';
}

function renderProjects() {
  const select = $('projectSelect');
  const projects = activeProjects();
  if (!projects.length) {
    select.innerHTML = '<option>No active projects</option>';
    $('archiveProjectBtn').disabled = true;
    return;
  }
  if (!projects.some(p => p.id === activeProjectId)) activeProjectId = projects[0].id;
  select.innerHTML = projects.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
  select.value = activeProjectId;
  $('archiveProjectBtn').disabled = projects.length <= 1;
}

function renderAssignees() {
  $('taskAssignee').innerHTML = `<option value="">Unassigned</option>` + state.members.map(m => `<option value="${m.id}">${escapeHtml(m.name)} - ${escapeHtml(m.role || 'Member')}</option>`).join('');
}

function renderStats() {
  const tasks = state.tasks.filter(t => t.projectId === activeProjectId);
  const done = tasks.filter(t => t.status === 'Done').length;
  const todo = tasks.filter(t => t.status === 'Todo').length;
  const progress = tasks.filter(t => t.status === 'In Progress').length;
  const review = tasks.filter(t => t.status === 'Review').length;
  const avg = tasks.length ? Math.round(tasks.reduce((sum, t) => sum + Number(t.progress), 0) / tasks.length) : 0;

  const cards = [
    ['📌', tasks.length, 'Total Tasks'], ['✅', done, 'Done'], ['⏳', todo, 'Todo'], ['🚀', progress + review, 'Active Work']
  ];
  $('statsGrid').innerHTML = cards.map(c => `<article class="stat-card glass"><div class="stat-icon">${c[0]}</div><h3>${c[1]}</h3><p>${c[2]}</p></article>`).join('');
  $('projectProgressText').textContent = `${avg}%`;
  $('projectProgressBar').style.width = `${avg}%`;
  $('projectSummary').textContent = `${done} completed, ${todo} todo, ${progress} in progress, ${review} in review.`;

  const workload = state.members.map(m => {
    const assigned = tasks.filter(t => t.assigneeId === m.id);
    const percent = tasks.length ? Math.round((assigned.length / tasks.length) * 100) : 0;
    return `<div class="workload-item"><div class="workload-top"><span>${escapeHtml(m.name)}</span><span>${assigned.length} tasks</span></div><div class="progress-line"><span style="width:${percent}%"></span></div></div>`;
  }).join('');
  const unassigned = tasks.filter(t => !t.assigneeId).length;
  const unassignedPercent = tasks.length ? Math.round((unassigned / tasks.length) * 100) : 0;
  const unassignedRow = `<div class="workload-item"><div class="workload-top"><span>Unassigned</span><span>${unassigned} tasks</span></div><div class="progress-line"><span style="width:${unassignedPercent}%"></span></div></div>`;
  $('workloadList').innerHTML = (workload + unassignedRow) || `<div class="empty-state">No workload data yet.</div>`;
}

function renderBoard() {
  const tasks = projectTasks();
  $('kanbanBoard').innerHTML = columns.map(col => {
    const colTasks = tasks.filter(t => t.status === col);
    return `<section class="column glass" data-status="${col}">
      <div class="column-head"><h3>${col}</h3><span class="count-pill">${colTasks.length}</span></div>
      <div class="task-list" data-drop="${col}">
        ${colTasks.length ? colTasks.map(taskCard).join('') : `<div class="empty-state">Drop tasks here</div>`}
      </div>
    </section>`;
  }).join('');

  document.querySelectorAll('.task-card').forEach(card => {
    card.addEventListener('dragstart', () => card.classList.add('dragging'));
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
  });
  document.querySelectorAll('[data-drop]').forEach(zone => {
    zone.addEventListener('dragover', e => e.preventDefault());
    zone.addEventListener('drop', e => {
      e.preventDefault();
      const id = e.dataTransfer.getData('text/plain');
      moveTask(id, zone.dataset.drop);
    });
  });
}

function taskCard(t) {
  const member = getMember(t.assigneeId) || { name: 'Unassigned', role: '' };
  const days = deadlineText(t.dueDate);
  return `<article class="task-card" draggable="true" ondragstart="event.dataTransfer.setData('text/plain','${t.id}')">
    <div class="task-title-row"><h4>${escapeHtml(t.title)}</h4><span class="priority ${t.priority}">${t.priority}</span></div>
    <p class="task-desc">${escapeHtml(t.description || 'No description')}</p>
    <div class="meta-row"><span class="avatar">${initials(member.name)}</span><strong>${member.name}</strong><span class="muted">${days}</span></div>
    <div class="label-row">${t.labels.map(l => `<span class="label">${escapeHtml(l)}</span>`).join('')}</div>
    <div class="progress-line"><span style="width:${t.progress}%"></span></div>
    <div class="meta-row"><span>${t.progress}% complete</span><span>${t.comments.length} notes</span></div>
    <div class="card-actions"><button class="small-btn" onclick="openDetails('${t.id}')">Details</button><button class="small-btn" onclick="openEditTask('${t.id}')">Edit</button></div>
  </article>`;
}

function deadlineText(date) {
  const today = new Date(); today.setHours(0,0,0,0);
  const due = new Date(date); due.setHours(0,0,0,0);
  const diff = Math.ceil((due - today) / 86400000);
  if (diff < 0) return `${Math.abs(diff)} days overdue`;
  if (diff === 0) return 'Due today';
  return `${diff} days left`;
}

function renderMembers() {
  const tasks = state.tasks.filter(t => t.projectId === activeProjectId);
  const membersHtml = state.members.map(m => {
    const assigned = tasks.filter(t => t.assigneeId === m.id);
    const done = assigned.filter(t => t.status === 'Done').length;
    return `<article class="member-card">
      <div class="member-head"><span class="avatar">${initials(m.name)}</span><div><h4>${escapeHtml(m.name)}</h4><p class="muted">${escapeHtml(m.role || 'Team Member')}</p></div></div>
      <p><strong>${assigned.length}</strong> assigned tasks</p>
      <p class="muted">${done} completed</p>
      <div class="card-actions"><button class="small-btn" onclick="openEditMember('${m.id}')">Edit</button><button class="small-btn danger-text" onclick="openDeleteMember('${m.id}')">Delete</button></div>
    </article>`;
  }).join('');
  const unassigned = tasks.filter(t => !t.assigneeId);
  const unassignedCard = `<article class="member-card highlight-card"><div class="member-head"><span class="avatar">?</span><div><h4>Unassigned Tasks</h4><p class="muted">Needs owner</p></div></div><p><strong>${unassigned.length}</strong> tasks without member</p><button class="small-btn" onclick="showUnassignedTasks()">Show Unassigned</button></article>`;
  $('membersGrid').innerHTML = membersHtml + unassignedCard;
}

function renderActivity() {
  const items = state.activity.filter(a => a.projectId === activeProjectId);
  const html = items.map(a => `<div class="activity-item"><strong>${escapeHtml(a.text)}</strong><br><small>${formatTime(a.time)}</small></div>`).join('') || `<div class="empty-state">No activity yet.</div>`;
  $('recentActivity').innerHTML = items.slice(0,5).map(a => `<div class="activity-item"><strong>${escapeHtml(a.text)}</strong><br><small>${formatTime(a.time)}</small></div>`).join('') || `<div class="empty-state">No activity yet.</div>`;
  $('allActivity').innerHTML = html;
}

function moveTask(id, status) {
  const task = state.tasks.find(t => t.id === id);
  if (!task || task.status === status) return;
  task.status = status;
  if (status === 'Todo') task.progress = 0;
  if (status === 'Done') task.progress = 100;
  if (status === 'In Progress' && task.progress === 0) task.progress = 10;
  addActivity(`${task.title} moved to ${status}`);
  if (status === 'Done') celebrate();
  saveState(); render(); showToast('Task moved successfully');
}

function openAddTask() {
  editingTaskId = null;
  $('taskModalTitle').textContent = 'Add Task';
  $('taskForm').reset();
  $('taskId').value = '';
  $('taskProgress').value = 0;
  $('deleteTaskBtn').classList.add('hidden');
  openModal('taskModal');
}

window.openEditTask = function(id) {
  const t = state.tasks.find(x => x.id === id);
  if (!t) return;
  editingTaskId = id;
  $('taskModalTitle').textContent = 'Edit Task';
  $('taskId').value = t.id;
  $('taskTitle').value = t.title;
  $('taskDescription').value = t.description;
  $('taskAssignee').value = t.assigneeId || '';
  $('taskPriority').value = t.priority;
  $('taskDueDate').value = t.dueDate;
  $('taskStatus').value = t.status;
  $('taskProgress').value = t.progress;
  $('taskLabels').value = t.labels.join(', ');
  $('deleteTaskBtn').classList.remove('hidden');
  openModal('taskModal');
}

window.openDetails = function(id) {
  const t = state.tasks.find(x => x.id === id);
  if (!t) return;
  const member = getMember(t.assigneeId) || { name: 'Unassigned' };
  $('detailTitle').textContent = t.title;
  $('detailContent').innerHTML = `
    <p class="muted">${escapeHtml(t.description || 'No description')}</p>
    <div class="meta-row"><span class="priority ${t.priority}">${t.priority}</span><span class="label">${t.status}</span><span class="label">Assigned: ${member.name}</span><span class="label">Due: ${t.dueDate}</span></div>
    <div class="large-progress"><span style="width:${t.progress}%"></span></div>
    <p><strong>${t.progress}% completed</strong></p>
    <div class="comment-box">
      <h3>Work Notes / Comments</h3>
      <form id="commentForm" class="meta-row">
        <input id="commentInput" class="input" placeholder="Add update like: Frontend completed, API pending..." required />
        <button class="btn btn-primary" type="submit">Add Note</button>
      </form>
      <div class="comment-list">
        ${t.comments.length ? t.comments.map(c => `<div class="comment"><p>${escapeHtml(c.text)}</p><small>${formatTime(c.time)}</small></div>`).join('') : '<div class="empty-state">No notes yet.</div>'}
      </div>
    </div>`;
  openModal('detailModal');
  $('commentForm').addEventListener('submit', e => {
    e.preventDefault();
    const text = $('commentInput').value.trim();
    if (!text) return;
    t.comments.unshift({ text, time: new Date().toISOString() });
    addActivity(`Note added on ${t.title}`);
    saveState(); render(); showToast('Note added');
    openDetails(id);
  });
}

function saveTask(e) {
  e.preventDefault();
  const progress = Math.max(0, Math.min(100, Number($('taskProgress').value || 0)));
  const data = {
    title: $('taskTitle').value.trim(),
    description: $('taskDescription').value.trim(),
    assigneeId: $('taskAssignee').value || null,
    priority: $('taskPriority').value,
    dueDate: $('taskDueDate').value,
    status: statusFromProgress(progress, $('taskStatus').value),
    progress,
    labels: $('taskLabels').value.split(',').map(x => x.trim()).filter(Boolean)
  };
  if (editingTaskId) {
    const task = state.tasks.find(t => t.id === editingTaskId);
    const oldProgress = task.progress;
    Object.assign(task, data);
    addActivity(`${task.title} updated${oldProgress !== progress ? ` from ${oldProgress}% to ${progress}%` : ''}`);
    if (progress === 100 && oldProgress !== 100) celebrate();
    showToast('Task updated');
  } else {
    const task = { id: crypto.randomUUID(), projectId: activeProjectId, ...data, comments: [], createdAt: new Date().toISOString() };
    state.tasks.unshift(task);
    addActivity(`Task created: ${task.title}`);
    showToast('Task created');
  }
  closeModal('taskModal'); saveState(); render();
}

function openModal(id) { $(id).classList.remove('hidden'); }
function closeModal(id) { $(id).classList.add('hidden'); }
function showToast(msg) { $('toast').textContent = msg; $('toast').classList.remove('hidden'); setTimeout(() => $('toast').classList.add('hidden'), 2200); }
function celebrate() { $('confetti').classList.remove('hidden'); setTimeout(() => $('confetti').classList.add('hidden'), 1800); }
function escapeHtml(str) { return String(str).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch])); }

function switchView(view) {
  currentView = view;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active-view'));
  $(`${view}View`).classList.add('active-view');
  document.querySelectorAll('.nav-link').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  $('pageTitle').textContent = view === 'board' ? 'Project Board' : view[0].toUpperCase() + view.slice(1);
}


function resetMemberForm() {
  editingMemberId = null;
  $('memberIdInput').value = '';
  $('memberNameInput').value = '';
  $('memberRoleInput').value = '';
  $('memberModalTitle').textContent = 'Add Member';
  $('memberSubmitBtn').textContent = 'Add Member';
}

window.openEditMember = function(id) {
  const member = state.members.find(m => m.id === id);
  if (!member) return;
  editingMemberId = id;
  $('memberIdInput').value = id;
  $('memberNameInput').value = member.name;
  $('memberRoleInput').value = member.role || '';
  $('memberModalTitle').textContent = 'Edit Member';
  $('memberSubmitBtn').textContent = 'Update Member';
  openModal('memberModal');
}

window.openDeleteMember = function(id) {
  const member = state.members.find(m => m.id === id);
  if (!member) return;
  deletingMemberId = id;
  const assignedCount = state.tasks.filter(t => t.assigneeId === id).length;
  $('memberDeleteMessage').textContent = assignedCount
    ? `${member.name} has ${assignedCount} assigned task(s). Deleting will keep the tasks and mark them as Unassigned.`
    : `${member.name} has no assigned tasks. This member can be deleted safely.`;
  openModal('memberConfirmModal');
}

window.showUnassignedTasks = function() {
  activeFilter = 'unassigned';
  document.querySelectorAll('.filter').forEach(b => b.classList.toggle('active', b.dataset.filter === 'unassigned'));
  switchView('board');
  renderBoard();
}

function deleteMember() {
  const member = state.members.find(m => m.id === deletingMemberId);
  if (!member) return;
  const affected = state.tasks.filter(t => t.assigneeId === deletingMemberId);
  affected.forEach(t => { t.assigneeId = null; });
  state.members = state.members.filter(m => m.id !== deletingMemberId);
  addActivity(`Member deleted: ${member.name}. ${affected.length} task(s) moved to Unassigned`);
  deletingMemberId = null;
  closeModal('memberConfirmModal');
  saveState(); render(); showToast('Member deleted and tasks unassigned');
}

function archiveCurrentProject() {
  const projects = activeProjects();
  if (projects.length <= 1) { showToast('Keep at least one active project'); return; }
  const project = activeProject();
  project.archived = true;
  addActivity(`Project archived: ${project.name}`);
  activeProjectId = activeProjects()[0].id;
  closeModal('archiveConfirmModal');
  saveState(); render(); showToast('Project archived');
}

function bindEvents() {
  $('addTaskBtn').addEventListener('click', openAddTask);
  $('taskForm').addEventListener('submit', saveTask);
  $('projectSelect').addEventListener('change', e => { activeProjectId = e.target.value; saveState(); render(); });
  $('searchInput').addEventListener('input', renderBoard);
  $('themeToggle').addEventListener('click', () => { state.theme = state.theme === 'light' ? 'dark' : 'light'; saveState(); render(); });
  $('newProjectBtn').addEventListener('click', () => openModal('projectModal'));
  $('archiveProjectBtn').addEventListener('click', () => openModal('archiveConfirmModal'));
  $('confirmArchiveBtn').addEventListener('click', archiveCurrentProject);
  $('confirmMemberDeleteBtn').addEventListener('click', deleteMember);
  $('addMemberBtn').addEventListener('click', () => { resetMemberForm(); openModal('memberModal'); });
  document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', () => closeModal(btn.dataset.close)));
  document.querySelectorAll('.nav-link').forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.view)));
  document.querySelectorAll('.filter').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); activeFilter = btn.dataset.filter; renderBoard();
  }));
  $('projectForm').addEventListener('submit', e => {
    e.preventDefault();
    const name = $('projectNameInput').value.trim(); if (!name) return;
    const p = { id: crypto.randomUUID(), name, createdAt: new Date().toISOString(), archived: false };
    state.projects.push(p); activeProjectId = p.id; addActivity(`Project created: ${name}`);
    $('projectNameInput').value = ''; closeModal('projectModal'); saveState(); render(); showToast('Project created');
  });
  $('memberForm').addEventListener('submit', e => {
    e.preventDefault();
    const name = $('memberNameInput').value.trim(); if (!name) return;
    const role = $('memberRoleInput').value.trim();
    if (editingMemberId) {
      const member = state.members.find(m => m.id === editingMemberId);
      if (member) {
        const oldName = member.name;
        member.name = name; member.role = role;
        addActivity(`Member updated: ${oldName} → ${name}`);
      }
      showToast('Member updated');
    } else {
      state.members.push({ id: crypto.randomUUID(), name, role });
      addActivity(`Member added: ${name}`);
      showToast('Member added');
    }
    resetMemberForm(); closeModal('memberModal'); saveState(); render();
  });
  $('deleteTaskBtn').addEventListener('click', () => { deletingTaskId = editingTaskId; openModal('confirmModal'); });
  $('confirmDeleteBtn').addEventListener('click', () => {
    const task = state.tasks.find(t => t.id === deletingTaskId);
    state.tasks = state.tasks.filter(t => t.id !== deletingTaskId);
    if (task) addActivity(`Task deleted: ${task.title}`);
    closeModal('confirmModal'); closeModal('taskModal'); saveState(); render(); showToast('Task deleted');
  });
  document.querySelectorAll('.modal').forEach(modal => modal.addEventListener('click', e => { if (e.target === modal) closeModal(modal.id); }));
}

bindEvents();
render();
