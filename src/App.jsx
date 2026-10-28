import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowDownToLine, ArrowRight, BookOpen, CalendarDays, Check, CheckCircle2,
  CircleHelp, Clock3, FileUp, GraduationCap, LayoutDashboard, Menu, Plus,
  Search, Settings2, ShieldCheck, Trash2, X
} from 'lucide-react';
import './App.css';

const STORAGE_KEY = 'studysync-data-v1';
const emptyData = { courses: [], assignments: [] };

function readData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return {
      courses: Array.isArray(saved?.courses) ? saved.courses : [],
      assignments: Array.isArray(saved?.assignments) ? saved.assignments : []
    };
  } catch {
    return emptyData;
  }
}

const today = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};

const formatDate = (value, options = { month: 'short', day: 'numeric' }) =>
  new Date(`${value}T12:00:00`).toLocaleDateString('en-US', options);
const makeId = () => crypto.randomUUID();

function gradePoints(percentage) {
  if (percentage >= 93) return 4;
  if (percentage >= 90) return 3.7;
  if (percentage >= 87) return 3.3;
  if (percentage >= 83) return 3;
  if (percentage >= 80) return 2.7;
  if (percentage >= 77) return 2.3;
  if (percentage >= 73) return 2;
  if (percentage >= 70) return 1.7;
  if (percentage >= 67) return 1.3;
  if (percentage >= 63) return 1;
  if (percentage >= 60) return 0.7;
  return 0;
}

function letterGrade(percentage) {
  if (percentage >= 93) return 'A';
  if (percentage >= 90) return 'A−';
  if (percentage >= 87) return 'B+';
  if (percentage >= 83) return 'B';
  if (percentage >= 80) return 'B−';
  if (percentage >= 77) return 'C+';
  if (percentage >= 73) return 'C';
  if (percentage >= 70) return 'C−';
  if (percentage >= 67) return 'D+';
  if (percentage >= 63) return 'D';
  if (percentage >= 60) return 'D−';
  return 'F';
}

function App() {
  const [data, setData] = useState(readData);
  const [view, setView] = useState('Overview');
  const [modal, setModal] = useState('');
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [mobileNav, setMobileNav] = useState(false);
  const [error, setError] = useState('');
  const importRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setError('');
    } catch {
      setError('Your browser could not save this update. Export a backup and free some storage space.');
    }
  }, [data]);

  const { courses, assignments } = data;
  const pending = assignments.filter((item) => !item.completed);
  const overdue = pending.filter((item) => item.due_date < today());
  const upcoming = pending.filter((item) => item.due_date >= today()).sort(byDueDate).slice(0, 5);
  const creditTotal = courses.reduce((sum, course) => sum + Number(course.credits), 0);
  const gpa = creditTotal
    ? courses.reduce((sum, course) => sum + gradePoints(Number(course.grade)) * Number(course.credits), 0) / creditTotal
    : 0;

  function showModal(type, item = null) {
    setEditing(item);
    setModal(type);
  }

  function saveCourse(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const course = {
      id: editing?.id || makeId(),
      name: String(form.get('name')).trim(),
      subject: String(form.get('subject')).trim() || 'General',
      grade: Number(form.get('grade')),
      credits: Number(form.get('credits'))
    };
    setData((current) => ({
      ...current,
      courses: editing
        ? current.courses.map((item) => item.id === course.id ? course : item)
        : [...current.courses, course]
    }));
    setModal('');
    setEditing(null);
  }

  function saveAssignment(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const score = form.get('score') === '' ? null : Number(form.get('score'));
    const maxScore = form.get('max_score') === '' ? null : Number(form.get('max_score'));
    if (score !== null && maxScore !== null && score > maxScore) {
      setError('Points earned cannot be greater than total points.');
      return;
    }
    const assignment = {
      id: editing?.id || makeId(),
      course_id: String(form.get('course_id') || ''),
      title: String(form.get('title')).trim(),
      due_date: String(form.get('due_date')),
      priority: String(form.get('priority')),
      completed: editing?.completed || false,
      score,
      max_score: maxScore
    };
    setData((current) => ({
      ...current,
      assignments: editing
        ? current.assignments.map((item) => item.id === assignment.id ? assignment : item)
        : [...current.assignments, assignment]
    }));
    setModal('');
    setEditing(null);
  }

  function toggleAssignment(assignment) {
    setData((current) => ({
      ...current,
      assignments: current.assignments.map((item) => item.id === assignment.id
        ? { ...item, completed: !item.completed }
        : item)
    }));
  }

  function deleteAssignment(assignment) {
    if (!window.confirm(`Delete “${assignment.title}”?`)) return;
    setData((current) => ({
      ...current,
      assignments: current.assignments.filter((item) => item.id !== assignment.id)
    }));
  }

  function deleteCourse(course) {
    if (!window.confirm(`Delete ${course.name}? Its assignments will stay in your list.`)) return;
    setData((current) => ({
      courses: current.courses.filter((item) => item.id !== course.id),
      assignments: current.assignments.map((item) => item.course_id === course.id
        ? { ...item, course_id: '' }
        : item)
    }));
  }

  function exportData() {
    const blob = new Blob([JSON.stringify({ version: 1, ...data }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `studysync-backup-${today()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importData(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const imported = JSON.parse(await file.text());
      if (!Array.isArray(imported.courses) || !Array.isArray(imported.assignments)) {
        throw new Error('That file is not a StudySync backup.');
      }
      const courseIds = new Set(imported.courses.map((course) => course.id));
      const validCourses = imported.courses.every((course) =>
        typeof course.id === 'string' && typeof course.name === 'string' &&
        Number.isFinite(Number(course.grade)) && Number.isFinite(Number(course.credits)));
      const validAssignments = imported.assignments.every((item) =>
        typeof item.id === 'string' && typeof item.title === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(item.due_date) &&
        (!item.course_id || courseIds.has(item.course_id)));
      if (!validCourses || !validAssignments) throw new Error('The backup contains invalid planner data.');
      if (!window.confirm('Replace this browser’s StudySync data with the selected backup?')) return;
      setData({ courses: imported.courses, assignments: imported.assignments });
      setError('Backup restored.');
    } catch (importError) {
      setError(importError.message || 'Could not read that backup file.');
    }
  }

  function clearData() {
    if (!window.confirm('Permanently remove all classes and assignments saved in this browser? Export a backup first if you may need them later.')) return;
    setData(emptyData);
  }

  const visibleAssignments = assignments
    .filter((item) => filter === 'All' || (filter === 'To do' ? !item.completed : item.completed))
    .filter((item) => {
      const course = courses.find((entry) => entry.id === item.course_id);
      return `${item.title} ${course?.name || ''}`.toLowerCase().includes(search.toLowerCase());
    })
    .sort(byDueDate);

  return (
    <div className="app-shell">
      {mobileNav && <button className="scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <a className="brand" href="#overview" onClick={() => setView('Overview')}>
          <span className="brand-mark"><BookOpen size={19} /></span>
          <span>study<span className="brand-light">sync</span></span>
        </a>
        <div className="sidebar-kicker">YOUR STUDY DESK</div>
        <nav className="side-nav" aria-label="Main navigation">
          {[
            { name: 'Overview', icon: LayoutDashboard },
            { name: 'Classes', icon: GraduationCap },
            { name: 'Assignments', icon: CalendarDays }
          ].map(({ name, icon: Icon }) => (
            <button key={name} className={`nav-item ${view === name ? 'active' : ''}`} onClick={() => { setView(name); setMobileNav(false); }}>
              <Icon size={17} /><span>{name}</span>
              {name === 'Assignments' && pending.length > 0 && <span className="nav-count">{pending.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-status"><span className="status-dot" /><span><b>Private to this browser</b><small>Saved on this device</small></span></div>
          <button className={`nav-item ${view === 'Data & privacy' ? 'active' : ''}`} onClick={() => { setView('Data & privacy'); setMobileNav(false); }}>
            <ShieldCheck size={17} /><span>Data & privacy</span>
          </button>
          <div className="sidebar-caption">YOUR SPACE, YOUR PACE</div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button menu-button" aria-label="Open menu" onClick={() => setMobileNav(true)}><Menu size={20} /></button>
          <div className="breadcrumb"><span>StudySync</span><span className="crumb-slash">/</span><b>{view}</b></div>
          <div className="topbar-date"><CalendarDays size={15} />{formatDate(today(), { weekday: 'long', month: 'long', day: 'numeric' })}</div>
        </header>

        <div className="page-content">
          {error && <div className="notice" role="status"><span>{error}</span><button aria-label="Dismiss message" onClick={() => setError('')}><X size={15} /></button></div>}
          {view === 'Overview' && <Overview
            assignments={assignments} courses={courses} gpa={gpa} pending={pending} overdue={overdue}
            upcoming={upcoming} onAdd={() => showModal('assignment')} onView={setView}
            onToggle={toggleAssignment} onEdit={(item) => showModal('assignment', item)} onDelete={deleteAssignment}
          />}
          {view === 'Classes' && <Classes
            courses={courses} gpa={gpa} creditTotal={creditTotal}
            onAdd={() => showModal('course')} onEdit={(item) => showModal('course', item)} onDelete={deleteCourse}
          />}
          {view === 'Assignments' && <Assignments
            items={visibleAssignments} total={assignments.length} pending={pending.length}
            search={search} setSearch={setSearch} filter={filter} setFilter={setFilter}
            courses={courses} onAdd={() => showModal('assignment')} onToggle={toggleAssignment}
            onEdit={(item) => showModal('assignment', item)} onDelete={deleteAssignment}
          />}
          {view === 'Data & privacy' && <DataPrivacy
            importRef={importRef} onExport={exportData} onImport={importData} onClear={clearData}
            courseCount={courses.length} assignmentCount={assignments.length}
          />}
          <footer className="page-footer"><span>Made for the work you’re putting in.</span><span>STUDYSYNC · LOCAL MODE</span></footer>
        </div>
      </main>

      <input ref={importRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={importData} />
      {modal && <EditorModal
        type={modal} item={editing} courses={courses} onClose={() => { setModal(''); setEditing(null); }}
        onSubmit={modal === 'course' ? saveCourse : saveAssignment}
      />}
    </div>
  );
}

function byDueDate(first, second) {
  return first.due_date.localeCompare(second.due_date) || first.title.localeCompare(second.title);
}

function Overview({ assignments, courses, gpa, pending, overdue, upcoming, onAdd, onView, onToggle, onEdit, onDelete }) {
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${today()}T12:00:00`);
    date.setDate(date.getDate() + index);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return { key, label: date.toLocaleDateString('en-US', { weekday: 'short' }), count: pending.filter((item) => item.due_date === key).length };
  });
  const maxCount = Math.max(1, ...week.map((day) => day.count));
  return <>
    <section className="page-heading overview-heading">
      <div><div className="eyebrow">A FRESH LOOK AT YOUR WEEK</div><h1>Your study desk.</h1><p>Keep the moving parts in one place. Take them one at a time.</p></div>
      <button className="button button-dark" onClick={onAdd}><Plus size={16} /> New assignment</button>
    </section>
    <section className="metric-grid" aria-label="Semester summary">
      <Metric label="ESTIMATED GPA" value={gpa.toFixed(2)} suffix="/ 4.0" icon={GraduationCap} tone="sage">
        <div className="metric-progress"><span style={{ width: `${Math.min(gpa / 4 * 100, 100)}%` }} /></div>
        <small>Weighted across {courses.length} {courses.length === 1 ? 'class' : 'classes'}</small>
      </Metric>
      <Metric label="CURRENT CLASSES" value={String(courses.length).padStart(2, '0')} icon={BookOpen} tone="gold">
        <small>{courses.reduce((sum, course) => sum + Number(course.credits), 0)} credits in progress</small>
      </Metric>
      <Metric label="STILL TO DO" value={String(pending.length).padStart(2, '0')} icon={CheckCircle2} tone="rose">
        <small>{overdue.length ? `${overdue.length} past due` : 'Room to make progress'}</small>
      </Metric>
    </section>
    <section className="overview-columns">
      <div className="section-block week-block">
        <div className="section-heading"><div><span className="section-index">01 / THE NEXT SEVEN DAYS</span><h2>Workload</h2></div><span className="section-aside">{pending.length} open</span></div>
        <div className="week-chart" role="img" aria-label="Assignments due over the next seven days">
          {week.map((day) => <div className="chart-day" key={day.key} title={`${day.count} due`}><span className="chart-count">{day.count || ''}</span><span className="bar-track"><i className={day.count ? 'bar-fill has-work' : 'bar-fill'} style={{ height: `${day.count ? Math.max(day.count / maxCount * 100, 12) : 3}%` }} /></span><span className="chart-label">{day.label}</span></div>)}
        </div>
        <div className="chart-key"><span /> Assignment due date</div>
      </div>
      <div className="section-block snapshot-block">
        <div className="section-heading"><div><span className="section-index">02 / IN PROGRESS</span><h2>Class snapshot</h2></div><button className="link-button" onClick={() => onView('Classes')}>All classes <ArrowRight size={14} /></button></div>
        {courses.length ? <div className="course-list">{courses.slice(0, 4).map((course) => <CourseRow key={course.id} course={course} onEdit={() => onView('Classes')} />)}</div> : <EmptyState icon={BookOpen} text="Your classes will appear here." action="Add your first class" onClick={() => onView('Classes')} />}
      </div>
    </section>
    <section className="section-block upcoming-block">
      <div className="section-heading"><div><span className="section-index">03 / ON YOUR RADAR</span><h2>Coming up</h2></div><button className="link-button" onClick={() => onView('Assignments')}>All assignments <ArrowRight size={14} /></button></div>
      {upcoming.length ? <AssignmentList items={upcoming} courses={courses} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} /> : <EmptyState icon={CheckCircle2} text={assignments.length ? 'Nothing else due soon. You’re caught up.' : 'Add a deadline when you’re ready.'} action={assignments.length ? '' : 'Add assignment'} onClick={onAdd} />}
    </section>
  </>;
}

function Metric({ label, value, suffix, icon: Icon, tone, children }) {
  return <article className={`metric metric-${tone}`}><div className="metric-top"><span>{label}</span><span className="metric-icon"><Icon size={17} /></span></div><div className="metric-value">{value}{suffix && <small>{suffix}</small>}</div><div className="metric-foot">{children}</div></article>;
}

function Classes({ courses, gpa, creditTotal, onAdd, onEdit, onDelete }) {
  return <>
    <section className="page-heading"><div><div className="eyebrow">THE FULL PICTURE</div><h1>Your classes.</h1><p>Track grades and credits throughout the semester.</p></div><button className="button button-dark" onClick={onAdd}><Plus size={16} /> Add class</button></section>
    <section className="class-summary"><div><span className="section-index">SEMESTER GPA</span><strong>{gpa.toFixed(2)} <small>/ 4.0</small></strong><span>{courses.length} {courses.length === 1 ? 'class' : 'classes'} · {creditTotal} total credits</span></div><div className="summary-rule"><span style={{ width: `${Math.min(gpa / 4 * 100, 100)}%` }} /></div></section>
    <section className="section-block class-list-block"><div className="section-heading"><div><span className="section-index">YOUR SEMESTER</span><h2>Current classes</h2></div><span className="section-aside">{courses.length} TOTAL</span></div>
      {courses.length ? <div className="full-course-list">{courses.map((course) => <CourseRow key={course.id} course={course} onEdit={() => onEdit(course)} onDelete={() => onDelete(course)} />)}</div> : <EmptyState icon={GraduationCap} text="Add a class to start tracking your semester." action="Add a class" onClick={onAdd} />}
    </section>
    <p className="grade-disclaimer"><CircleHelp size={14} /> GPA is an estimate based on a standard 4.0 scale and your entered credits.</p>
  </>;
}

function Assignments({ items, total, pending, search, setSearch, filter, setFilter, courses, onAdd, onToggle, onEdit, onDelete }) {
  return <>
    <section className="page-heading"><div><div className="eyebrow">ONE THING AT A TIME</div><h1>Your assignments.</h1><p>Deadlines, priorities, and scores in one list.</p></div><button className="button button-dark" onClick={onAdd}><Plus size={16} /> Add assignment</button></section>
    <section className="assignment-controls">
      <label className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search assignments or classes" aria-label="Search assignments or classes" /></label>
      <div className="segmented" aria-label="Filter assignments">{['All', 'To do', 'Done'].map((option) => <button key={option} className={filter === option ? 'selected' : ''} onClick={() => setFilter(option)}>{option}</button>)}</div>
      <span className="list-count">{pending} open <span>/</span> {total} total</span>
    </section>
    <section className="section-block assignment-page-list"><div className="section-heading"><div><span className="section-index">YOUR DEADLINES</span><h2>{filter === 'Done' ? 'Completed work' : filter === 'To do' ? 'Still to do' : 'All assignments'}</h2></div><span className="section-aside">BY DUE DATE</span></div>
      {items.length ? <AssignmentList items={items} courses={courses} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} showCompleted /> : <EmptyState icon={CalendarDays} text={search ? 'Nothing matches that search.' : 'No assignments in this view yet.'} action={filter === 'Done' ? '' : 'Add assignment'} onClick={onAdd} />}
    </section>
  </>;
}

function DataPrivacy({ importRef, onExport, onImport, onClear, courseCount, assignmentCount }) {
  return <>
    <section className="page-heading"><div><div className="eyebrow">YOUR DATA, YOUR CALL</div><h1>Data & privacy.</h1><p>StudySync stores your planner in this browser, on this device.</p></div></section>
    <section className="section-block privacy-panel"><div className="privacy-lead"><span className="privacy-symbol"><ShieldCheck size={22} /></span><div><h2>Local by design</h2><p>Your classes and assignments stay in this browser’s local storage. There’s no account, server upload, or cross-device sync. Anyone with access to this browser profile can access this planner.</p></div></div><div className="privacy-facts"><div><span>CLASSES</span><b>{courseCount}</b></div><div><span>ASSIGNMENTS</span><b>{assignmentCount}</b></div><div><span>STORAGE</span><b>THIS BROWSER</b></div></div></section>
    <section className="section-block data-tools"><div className="section-heading"><div><span className="section-index">BACKUP & RESTORE</span><h2>Take your data with you</h2></div></div><p>Export a JSON backup before clearing browser data or moving to another device. Restore replaces the planner currently saved in this browser.</p><div className="tool-actions"><button className="button button-dark" onClick={onExport}><ArrowDownToLine size={16} /> Export backup</button><button className="button button-outline" onClick={() => importRef.current?.click()}><FileUp size={16} /> Restore backup</button></div></section>
    <section className="section-block danger-zone"><div><span className="section-index">IRREVERSIBLE</span><h2>Clear this planner</h2><p>Remove all classes and assignments saved in this browser. Export a backup first if you may need this data later.</p></div><button className="button button-danger" onClick={onClear}><Trash2 size={15} /> Clear all data</button></section>
    <p className="grade-disclaimer"><CircleHelp size={14} /> Browser storage is not encrypted. Keep your browser profile and device protected.</p>
  </>;
}

function CourseRow({ course, onEdit, onDelete }) {
  const percentage = Number(course.grade);
  return <article className="course-row"><span className="course-mark"><BookOpen size={17} /></span><span className="course-details"><b>{course.name}</b><small>{course.subject || 'General'} · {course.credits} {Number(course.credits) === 1 ? 'credit' : 'credits'}</small></span><span className="course-progress"><span><i style={{ width: `${Math.min(Math.max(percentage, 0), 100)}%` }} /></span><small>{percentage}%</small></span><span className={`grade-chip ${percentage < 60 ? 'grade-low' : ''}`}>{letterGrade(percentage)}</span><strong className="course-gpa">{gradePoints(percentage).toFixed(1)}</strong><button className="icon-button row-action" onClick={onEdit} aria-label={`Edit ${course.name}`}><Settings2 size={15} /></button>{onDelete && <button className="icon-button row-action danger-action" onClick={onDelete} aria-label={`Delete ${course.name}`}><Trash2 size={15} /></button>}</article>;
}

function AssignmentList({ items, courses, onToggle, onDelete, onEdit, showCompleted = false }) {
  const sorted = [...items].sort((a, b) => Number(a.completed) - Number(b.completed) || byDueDate(a, b));
  return <div className="assignment-list">{sorted.map((item) => {
    const course = courses.find((entry) => entry.id === item.course_id);
    const isOverdue = !item.completed && item.due_date < today();
    const scored = item.score !== null && item.score !== undefined && item.max_score;
    return <article className={`assignment-row ${item.completed ? 'assignment-complete' : ''}`} key={item.id}>
      <button className={`assignment-check ${item.completed ? 'checked' : ''}`} aria-label={item.completed ? 'Mark incomplete' : 'Mark complete'} onClick={() => onToggle(item)}>{item.completed && <Check size={13} />}</button>
      <div className="assignment-info"><b>{item.title}</b><small>{course?.name || 'Personal'}{scored && <span className="score-note"> · {item.score}/{item.max_score} pts</span>}</small></div>
      <span className={`priority priority-${(item.priority || 'Medium').toLowerCase()}`}>{item.priority || 'Medium'}</span>
      <span className={`due-date ${isOverdue ? 'overdue' : ''}`}><Clock3 size={14} />{isOverdue ? 'Overdue' : formatDate(item.due_date)}</span>
      {onEdit && <button className="icon-button row-action" onClick={() => onEdit(item)} aria-label={`Edit ${item.title}`}><Settings2 size={15} /></button>}
      {onDelete && <button className="icon-button row-action danger-action" onClick={() => onDelete(item)} aria-label={`Delete ${item.title}`}><Trash2 size={15} /></button>}
    </article>;
  })}{showCompleted && items.some((item) => item.completed) && <div className="completed-caption"><CheckCircle2 size={14} /> Nicely done. Keep that momentum going.</div>}</div>;
}

function EmptyState({ icon: Icon, text, action, onClick }) {
  return <div className="empty-state"><span className="empty-icon"><Icon size={20} /></span><p>{text}</p>{action && <button className="link-button" onClick={onClick}>{action} <ArrowRight size={14} /></button>}</div>;
}

function EditorModal({ type, item, courses, onClose, onSubmit }) {
  useEffect(() => {
    const handleKey = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);
  const courseEditor = type === 'course';
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="modal" role="dialog" aria-modal="true" aria-label={courseEditor ? 'Class details' : 'Assignment details'}>
      <div className="modal-heading"><div><span className="section-index">{courseEditor ? 'YOUR SEMESTER' : 'YOUR TO-DO LIST'}</span><h2>{courseEditor ? (item ? 'Update class' : 'Add a class') : (item ? 'Update assignment' : 'Add an assignment')}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={19} /></button></div>
      {courseEditor ? <form className="form-stack" onSubmit={onSubmit}>
        <label>Class name<input name="name" placeholder="e.g. Biology II" required maxLength="80" autoFocus defaultValue={item?.name || ''} /></label>
        <div className="form-row"><label>Subject<input name="subject" placeholder="e.g. Science" maxLength="50" defaultValue={item?.subject || ''} /></label><label>Credits<input name="credits" type="number" min="0.5" max="10" step="0.5" defaultValue={item?.credits || 1} required /></label></div>
        <label>Current grade (%)<input name="grade" type="number" min="0" max="100" step="0.1" placeholder="e.g. 91" defaultValue={item?.grade ?? ''} required /><small>Used to estimate your GPA across classes.</small></label>
        <ModalActions onClose={onClose} label={item ? 'Save changes' : 'Add class'} />
      </form> : <form className="form-stack" onSubmit={onSubmit}>
        <label>Assignment name<input name="title" placeholder="e.g. Lab report: cell division" required maxLength="120" autoFocus defaultValue={item?.title || ''} /></label>
        <div className="form-row"><label>Class<select name="course_id" defaultValue={item?.course_id || ''}><option value="">No class</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select></label><label>Due date<input name="due_date" type="date" required defaultValue={item?.due_date || today()} /></label></div>
        <div className="form-row"><label>Priority<select name="priority" defaultValue={item?.priority || 'Medium'}><option>Low</option><option>Medium</option><option>High</option></select></label><span className="field-note">Score tracking is optional</span></div>
        <div className="form-row"><label>Points earned<input name="score" type="number" min="0" step="0.1" placeholder="e.g. 18" defaultValue={item?.score ?? ''} /></label><label>Out of<input name="max_score" type="number" min="0.1" step="0.1" placeholder="e.g. 20" defaultValue={item?.max_score ?? ''} /></label></div>
        <ModalActions onClose={onClose} label={item ? 'Save changes' : 'Add assignment'} />
      </form>}
    </section>
  </div>;
}

function ModalActions({ onClose, label }) {
  return <div className="modal-actions"><button type="button" className="button button-outline" onClick={onClose}>Cancel</button><button className="button button-dark"><Plus size={15} />{label}</button></div>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
