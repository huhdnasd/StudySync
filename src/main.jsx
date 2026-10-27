import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import {
  ArrowDownRight, ArrowRight, BookOpen, CalendarDays, Check, CheckCircle2,
  ChevronDown, CircleHelp, Clock3, GraduationCap, LayoutDashboard, LogOut,
  Menu, Plus, Search, Settings2, ShieldCheck, Sparkles, Target, Trash2,
  TrendingUp, X
} from 'lucide-react';
import './styles.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const gradePoints = (percentage) => {
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
};

const letterGrade = (percentage) => {
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
};

const dateLabel = (date) => new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const today = () => new Date().toISOString().slice(0, 10);

function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [authOpen, setAuthOpen] = useState(false);
  const [authError, setAuthError] = useState('');
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [view, setView] = useState('Overview');
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState('');
  const [modal, setModal] = useState('');
  const [editingCourse, setEditingCourse] = useState(null);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [search, setSearch] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return undefined;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, currentSession) => setSession(currentSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) loadData();
    else {
      setCourses([]);
      setAssignments([]);
    }
  }, [session?.user?.id]);

  async function loadData() {
    if (!supabase) return;
    setLoadingData(true);
    setDataError('');
    const [courseResult, assignmentResult] = await Promise.all([
      supabase.from('courses').select('*').order('created_at', { ascending: true }),
      supabase.from('assignments').select('*').order('due_date', { ascending: true })
    ]);
    if (courseResult.error || assignmentResult.error) {
      setDataError(courseResult.error?.message || assignmentResult.error?.message || 'Could not load your planner.');
    } else {
      setCourses(courseResult.data || []);
      setAssignments(assignmentResult.data || []);
    }
    setLoadingData(false);
  }

  async function handleAuth(event) {
    event.preventDefault();
    setAuthError('');
    if (!supabase) {
      setAuthError('Add your Supabase URL and anon key to .env.local, then restart the app.');
      return;
    }
    const result = authMode === 'login'
      ? await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword })
      : await supabase.auth.signUp({ email: authEmail, password: authPassword });
    if (result.error) setAuthError(result.error.message);
    else if (authMode === 'signup' && !result.data.session) setAuthError('Check your email to confirm your account, then sign in.');
    else setAuthOpen(false);
  }

  async function signOut() {
    await supabase?.auth.signOut();
    setView('Overview');
  }

  async function addCourse(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const grade = Number(form.get('grade'));
    const courseData = {
      name: form.get('name').trim(),
      subject: form.get('subject').trim() || 'General',
      grade,
      credits: Number(form.get('credits'))
    };
    const { data, error } = editingCourse
      ? await supabase.from('courses').update(courseData).eq('id', editingCourse.id).select().single()
      : await supabase.from('courses').insert({ ...courseData, user_id: session.user.id }).select().single();
    if (error) return setDataError(error.message);
    setCourses((items) => editingCourse ? items.map((item) => item.id === data.id ? data : item) : [...items, data]);
    setEditingCourse(null);
    setModal('');
  }

  async function addAssignment(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const score = form.get('score') === '' ? null : Number(form.get('score'));
    const maxScore = form.get('max_score') === '' ? null : Number(form.get('max_score'));
    if (score !== null && maxScore !== null && score > maxScore) {
      setDataError('Points earned cannot be greater than total points.');
      return;
    }
    const assignmentData = {
      course_id: form.get('course_id') || null,
      title: form.get('title').trim(),
      due_date: form.get('due_date'),
      priority: form.get('priority'),
      score,
      max_score: maxScore
    };
    const { data, error } = editingAssignment
      ? await supabase.from('assignments').update(assignmentData).eq('id', editingAssignment.id).select().single()
      : await supabase.from('assignments').insert({ ...assignmentData, user_id: session.user.id }).select().single();
    if (error) return setDataError(error.message);
    setAssignments((items) => (editingAssignment ? items.map((item) => item.id === data.id ? data : item) : [...items, data]).sort((a, b) => a.due_date.localeCompare(b.due_date)));
    setEditingAssignment(null);
    setModal('');
  }

  function closeModal() {
    setModal('');
    setEditingCourse(null);
    setEditingAssignment(null);
  }

  async function toggleAssignment(assignment) {
    const { error } = await supabase.from('assignments').update({ completed: !assignment.completed }).eq('id', assignment.id);
    if (error) return setDataError(error.message);
    setAssignments((items) => items.map((item) => item.id === assignment.id ? { ...item, completed: !item.completed } : item));
  }

  async function deleteAssignment(id) {
    const { error } = await supabase.from('assignments').delete().eq('id', id);
    if (error) return setDataError(error.message);
    setAssignments((items) => items.filter((item) => item.id !== id));
  }

  const gpa = courses.length
    ? courses.reduce((sum, course) => sum + gradePoints(Number(course.grade)) * Number(course.credits), 0)
      / courses.reduce((sum, course) => sum + Number(course.credits), 0)
    : 0;
  const pending = assignments.filter((item) => !item.completed);
  const dueSoon = pending.filter((item) => item.due_date >= today()).slice(0, 5);
  const nextSevenDays = Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setDate(day.getDate() + index);
    const date = day.toISOString().slice(0, 10);
    return { label: day.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2), count: pending.filter((item) => item.due_date === date).length };
  });

  if (authLoading) return <div className="boot-screen"><div className="brand-mark"><GraduationCap size={23} /></div><span>Getting your desk ready...</span></div>;

  if (!session) return (
    <PublicPage
      authOpen={authOpen}
      setAuthOpen={setAuthOpen}
      authMode={authMode}
      setAuthMode={setAuthMode}
      authError={authError}
      setAuthError={setAuthError}
      authEmail={authEmail}
      setAuthEmail={setAuthEmail}
      authPassword={authPassword}
      setAuthPassword={setAuthPassword}
      handleAuth={handleAuth}
      privacyOpen={privacyOpen}
      setPrivacyOpen={setPrivacyOpen}
      configured={Boolean(supabase)}
    />
  );

  const filteredAssignments = assignments.filter((assignment) => {
    const course = courses.find((item) => item.id === assignment.course_id);
    return `${assignment.title} ${course?.name || ''}`.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <a className="brand" href="#overview" onClick={() => setView('Overview')}><span className="brand-mark"><GraduationCap size={22} strokeWidth={2.2} /></span><span>study<span className="brand-light">sync</span></span></a>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <div className="workspace-picker"><span className="workspace-dot">{(session.user.email || 'S')[0].toUpperCase()}</span><span className="workspace-info"><b>My study space</b><small>{session.user.email}</small></span><ChevronDown size={15} /></div>
        <div className="nav-label">STUDY</div>
        <nav className="side-nav">
          {[
            { name: 'Overview', icon: LayoutDashboard },
            { name: 'My classes', icon: BookOpen },
            { name: 'Assignments', icon: CalendarDays }
          ].map(({ name, icon: Icon }) => <button key={name} className={`nav-item ${view === name ? 'active' : ''}`} onClick={() => { setView(name); setMobileNav(false); }}><Icon size={18} /><span>{name}</span>{name === 'Assignments' && pending.length > 0 && <span className="nav-count">{pending.length}</span>}</button>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note"><Sparkles size={16} /><span>Little steps add up.</span></div>
          <button className="nav-item" onClick={() => setPrivacyOpen(true)}><ShieldCheck size={18} /><span>Privacy & data</span></button>
          <button className="nav-item" onClick={signOut}><LogOut size={18} /><span>Sign out</span></button>
          <div className="sidebar-version">STUDYSYNC · YOUR SPACE, YOUR PACE</div>
        </div>
      </aside>

      {mobileNav && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button menu-button" aria-label="Open menu" onClick={() => setMobileNav(true)}><Menu size={19} /></button>
          <div className="breadcrumb"><span>My study space</span><span className="crumb-slash">/</span><b>{view}</b></div>
          <div className="topbar-right"><span className="today-label"><CalendarDays size={15} />{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span><span className="avatar">{(session.user.email || 'S')[0].toUpperCase()}</span></div>
        </header>

        <div className="page-content">
          {dataError && <div className="error-banner" role="alert"><span>{dataError}</span><button aria-label="Dismiss" onClick={() => setDataError('')}><X size={16} /></button></div>}
          {loadingData ? <div className="loading-state">Loading your courses and assignments...</div> : <>
            {view === 'Overview' && <>
              <section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line" /> YOUR SEMESTER, IN ONE PLACE</div><h1>A little more <em>in sync.</em></h1><p>One place for the work, the wins, and everything in between.</p></div><button className="button button-dark" onClick={() => setModal('assignment')}><Plus size={17} /> Add assignment</button></section>
              <section className="stat-grid">
                <article className="stat-card stat-gpa"><div className="stat-top"><span>Estimated GPA</span><span className="stat-icon"><GraduationCap size={18} /></span></div><div className="stat-value">{gpa.toFixed(2)}<span className="stat-unit">/ 4.0</span></div><div className="stat-foot"><TrendingUp size={14} /> Based on {courses.length} {courses.length === 1 ? 'class' : 'classes'}</div><div className="gpa-rule"><span style={{ width: `${Math.min(gpa / 4 * 100, 100)}%` }} /></div></article>
                <article className="stat-card"><div className="stat-top"><span>Classes</span><span className="stat-icon stat-icon-lime"><BookOpen size={17} /></span></div><div className="stat-value">{String(courses.length).padStart(2, '0')}</div><div className="stat-foot">{courses.reduce((sum, course) => sum + Number(course.credits), 0)} credits in progress</div><div className="stat-decoration"><BookOpen size={42} /></div></article>
                <article className="stat-card"><div className="stat-top"><span>To-do list</span><span className="stat-icon stat-icon-peach"><Target size={17} /></span></div><div className="stat-value">{String(pending.length).padStart(2, '0')}</div><div className="stat-foot">{pending.filter((item) => item.due_date < today()).length ? `${pending.filter((item) => item.due_date < today()).length} past due · ` : ''}you've got this</div><div className="stat-decoration stat-decoration-peach"><CheckCircle2 size={43} /></div></article>
              </section>

              <section className="overview-grid">
                <div className="panel workload-panel"><div className="panel-heading"><div><h2>Your week</h2><p>A quick look at what's coming up</p></div><span className="week-tag">NEXT 7 DAYS</span></div><div className="week-chart">{nextSevenDays.map((day, index) => <div className="chart-day" key={`${day.label}-${index}`}><div className="bar-track"><span className={`bar-fill ${day.count ? 'bar-has-items' : ''}`} style={{ height: `${day.count ? Math.min(28 + day.count * 21, 100) : 8}%` }} title={`${day.count} due`} /></div><span className="chart-label">{day.label}</span></div>)}</div><div className="chart-legend"><span className="legend-dot" /> Assignments due</div></div>
                <div className="panel gpa-panel"><div className="panel-heading"><div><h2>Class snapshot</h2><p>Your grades at a glance</p></div><button className="text-button" onClick={() => setView('My classes')}>All classes <ArrowRight size={14} /></button></div>{courses.length ? <div className="mini-course-list">{courses.slice(0, 4).map((course) => <CourseRow key={course.id} course={course} compact />)}</div> : <EmptyState icon={BookOpen} text="Your classes will show up here." action="Add a class" onClick={() => setModal('course')} />}</div>
              </section>

              <section className="panel due-panel"><div className="panel-heading"><div><h2>Coming up</h2><p>The next things on your plate</p></div><button className="text-button" onClick={() => setView('Assignments')}>See all <ArrowRight size={14} /></button></div>{dueSoon.length ? <AssignmentList items={dueSoon} courses={courses} onToggle={toggleAssignment} onDelete={deleteAssignment} /> : <EmptyState icon={CheckCircle2} text="You're all caught up. Nice work." action="Add an assignment" onClick={() => setModal('assignment')} />}</section>
            </>}

            {view === 'My classes' && <>
              <section className="page-title-row"><div><div className="eyebrow"><span className="eyebrow-line" /> THE FULL PICTURE</div><h1>Your classes</h1><p>Keep your grades and credits up to date.</p></div><button className="button button-dark" onClick={() => setModal('course')}><Plus size={17} /> Add class</button></section>
              <section className="class-summary"><span>ESTIMATED GPA</span><strong>{gpa.toFixed(2)} <small>/ 4.0</small></strong><span>{courses.length} {courses.length === 1 ? 'class' : 'classes'} · weighted by credits</span><div className="gpa-rule"><span style={{ width: `${Math.min(gpa / 4 * 100, 100)}%` }} /></div></section>
              <section className="panel class-panel"><div className="panel-heading"><div><h2>Current classes</h2><p>Grades use a standard 4.0 scale estimate</p></div><span className="week-tag">{courses.length} TOTAL</span></div>{courses.length ? <div className="full-course-list">{courses.map((course) => <CourseRow key={course.id} course={course} onEdit={() => { setEditingCourse(course); setModal('course'); }} />)}</div> : <EmptyState icon={BookOpen} text="Start by adding your first class." action="Add a class" onClick={() => setModal('course')} />}</section>
            </>}

            {view === 'Assignments' && <>
              <section className="page-title-row"><div><div className="eyebrow"><span className="eyebrow-line" /> ONE THING AT A TIME</div><h1>Your assignments</h1><p>Deadlines are easier when they're all in one place.</p></div><button className="button button-dark" onClick={() => setModal('assignment')}><Plus size={17} /> Add assignment</button></section>
              <section className="assignment-toolbar"><div className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search assignments" /></div><span>{pending.length} to do · {assignments.length - pending.length} completed</span></section>
              <section className="panel class-panel assignment-page-panel"><div className="panel-heading"><div><h2>All assignments</h2><p>Sorted by due date</p></div></div>{filteredAssignments.length ? <AssignmentList items={filteredAssignments} courses={courses} onToggle={toggleAssignment} onDelete={deleteAssignment} onEdit={(assignment) => { setEditingAssignment(assignment); setModal('assignment'); }} showCompleted /> : <EmptyState icon={CheckCircle2} text={search ? 'No assignments match that search.' : 'No assignments yet. Enjoy the breathing room.'} action={search ? '' : 'Add an assignment'} onClick={() => setModal('assignment')} />}</section>
            </>}
          </>}
          <footer className="app-footer"><span>Made for the work you're putting in.</span><button onClick={() => setPrivacyOpen(true)}>Privacy & data</button><span>STUDYSYNC</span></footer>
        </div>
      </main>

      {modal && <Modal title={modal === 'course' ? (editingCourse ? 'Update your class' : 'Add a class') : (editingAssignment ? 'Update assignment' : 'Add an assignment')} onClose={closeModal}>
        {modal === 'course' ? <form className="form-stack" onSubmit={addCourse}><label>Class name<input name="name" placeholder="e.g. Biology II" required maxLength="80" autoFocus defaultValue={editingCourse?.name || ''} /></label><div className="form-row"><label>Subject<input name="subject" placeholder="e.g. Science" maxLength="50" defaultValue={editingCourse?.subject || ''} /></label><label>Credits<input name="credits" type="number" min="0.5" max="10" step="0.5" defaultValue={editingCourse?.credits || 1} required /></label></div><label>Current grade (%)<input name="grade" type="number" min="0" max="100" step="0.1" placeholder="e.g. 91" defaultValue={editingCourse?.grade ?? 0} required /><small>Your GPA estimate is calculated from this percentage.</small></label><div className="modal-actions"><button type="button" className="button button-quiet" onClick={closeModal}>Cancel</button><button className="button button-dark">{editingCourse ? <Check size={16} /> : <Plus size={16} />}{editingCourse ? 'Save changes' : 'Add class'}</button></div></form>
          : <form className="form-stack" onSubmit={addAssignment}><label>Assignment name<input name="title" placeholder="e.g. Lab report: cell division" required maxLength="120" autoFocus defaultValue={editingAssignment?.title || ''} /></label><div className="form-row"><label>Class<select name="course_id" defaultValue={editingAssignment?.course_id || ''}><option value="">No class</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select></label><label>Due date<input name="due_date" type="date" min="2000-01-01" required defaultValue={editingAssignment?.due_date || today()} /></label></div><div className="form-row"><label>Priority<select name="priority" defaultValue={editingAssignment?.priority || 'Medium'}><option>Low</option><option>Medium</option><option>High</option></select></label><span className="field-note">Optional grade tracking</span></div><div className="form-row"><label>Points earned<input name="score" type="number" min="0" step="0.1" placeholder="e.g. 18" defaultValue={editingAssignment?.score ?? ''} /></label><label>Out of<input name="max_score" type="number" min="0.1" step="0.1" placeholder="e.g. 20" defaultValue={editingAssignment?.max_score ?? ''} /></label></div><div className="modal-actions"><button type="button" className="button button-quiet" onClick={closeModal}>Cancel</button><button className="button button-dark">{editingAssignment ? <Check size={16} /> : <Plus size={16} />}{editingAssignment ? 'Save changes' : 'Add assignment'}</button></div></form>}
      </Modal>}

      {privacyOpen && <Modal title="Your data stays yours." onClose={() => setPrivacyOpen(false)}><div className="privacy-copy"><div className="privacy-icon"><ShieldCheck size={22} /></div><p>Your account and study data are stored in Supabase. Row-level security ensures your classes and assignments are only visible to your signed-in account.</p><p>We use your email to authenticate you. Your study data is not sold or shared for advertising. You can remove individual assignments in the portal or delete your account and data through your Supabase project.</p><p>StudySync GPA values are estimates, not official academic records. Schools may use different grading scales and credit weighting.</p><button className="button button-dark" onClick={() => setPrivacyOpen(false)}>Got it <Check size={16} /></button></div></Modal>}
    </div>
  );
}

function PublicPage(props) {
  const { authOpen, setAuthOpen, authMode, setAuthMode, authError, setAuthError, authEmail, setAuthEmail, authPassword, setAuthPassword, handleAuth, privacyOpen, setPrivacyOpen, configured } = props;
  return <div className="public-page">
    <header className="public-header"><a className="brand" href="#home"><span className="brand-mark"><GraduationCap size={22} strokeWidth={2.2} /></span><span>study<span className="brand-light">sync</span></span></a><nav><a href="#how-it-works">How it works</a><button onClick={() => setPrivacyOpen(true)}>Privacy</button></nav><button className="button button-outline" onClick={() => { setAuthMode('login'); setAuthOpen(true); setAuthError(''); }}>Log in <ArrowRight size={15} /></button></header>
    <main id="home"><section className="public-hero"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-line" /> MADE FOR YOUR KIND OF BUSY</div><h1>School's a lot.<br />Let's make it <em>make sense.</em></h1><p className="hero-description">Keep your classes, GPA, and deadlines in one calm little corner of the internet. Made for wherever you are in your school story.</p><div className="hero-actions"><button className="button button-dark button-large" onClick={() => { setAuthMode('signup'); setAuthOpen(true); setAuthError(''); }}>Get started for free <ArrowRight size={17} /></button><span><ShieldCheck size={15} /> Just for you, always</span></div><div className="student-note"><div className="student-avatars"><span>J</span><span>M</span><span>A</span><span>+</span></div><span>For the first semester and the final one.</span></div></div>
      <div className="hero-art" aria-label="A preview of the student dashboard"><div className="art-topline"><span><span className="status-dot" /> YOUR STUDY SPACE</span><span>THIS WEEK</span></div><div className="art-title">A little more <em>in sync.</em></div><div className="art-subtitle">Your semester, in one place.</div><div className="art-stats"><div className="art-stat-card art-stat-main"><span>ESTIMATED GPA</span><strong>3.74 <small>/ 4.0</small></strong><div className="art-progress"><i /></div><span className="art-stat-caption"><TrendingUp size={13} /> looking good</span></div><div className="art-stat-card art-stat-side"><span>TO-DO LIST</span><strong>04</strong><span className="art-stat-caption">one thing at a time</span><div className="floating-check"><Check size={14} /></div></div></div><div className="art-agenda"><div className="art-agenda-title"><span>COMING UP</span><span>ALL THE LITTLE THINGS</span></div><div className="art-task"><span className="art-check" /><span className="art-task-name"><b>History reading response</b><small>WORLD HISTORY</small></span><span className="art-due">TODAY</span></div><div className="art-task"><span className="art-check art-check-done"><Check size={10} /></span><span className="art-task-name art-done"><b>Algebra problem set</b><small>ALGEBRA II</small></span><span className="art-due art-due-tomorrow">TOMORROW</span></div><div className="art-task"><span className="art-check" /><span className="art-task-name"><b>Biology lab notes</b><small>BIOLOGY</small></span><span className="art-due art-due-later">FRI</span></div></div><span className="art-sticker"><Sparkles size={18} /><span>you've<br />got this</span></span></div>
    </section>
    <section className="feature-strip" id="how-it-works"><div className="feature-heading"><div className="eyebrow"><span className="eyebrow-line" /> THE WHOLE PICTURE</div><h2>Less juggling.<br /><em>More you.</em></h2></div><article className="feature-item"><span className="feature-icon feature-icon-green"><GraduationCap size={20} /></span><h3>Know where you stand</h3><p>Track grades and credits to get a simple GPA estimate, whenever you need it.</p></article><article className="feature-item"><span className="feature-icon feature-icon-yellow"><CalendarDays size={20} /></span><h3>Keep the dates straight</h3><p>See due dates and priorities in one list. Add scores when assignments come back.</p></article><article className="feature-item"><span className="feature-icon feature-icon-pink"><ShieldCheck size={20} /></span><h3>Your space means yours</h3><p>Sign in securely. Your study data is private to your account, not a public feed.</p></article></section>
    </main><footer className="public-footer"><a className="brand" href="#home"><span className="brand-mark"><GraduationCap size={19} /></span><span>study<span className="brand-light">sync</span></span></a><span>Made for the work you're putting in.</span><button onClick={() => setPrivacyOpen(true)}>Privacy & data</button><span>© {new Date().getFullYear()} STUDYSYNC</span></footer>

    {authOpen && <Modal title={authMode === 'login' ? 'Welcome back.' : 'Make it your space.'} onClose={() => setAuthOpen(false)}><p className="auth-intro">{authMode === 'login' ? 'Pick up right where you left off.' : 'One account for your classes, dates, and GPA.'}</p><form className="form-stack" onSubmit={handleAuth}><label>Email address<input type="email" autoComplete="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="you@example.com" required autoFocus /></label><label>Password<input type="password" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="At least 6 characters" minLength="6" required /></label>{authError && <div className={`auth-message ${authError.startsWith('Check your email') ? 'auth-success' : ''}`} role="alert">{authError}</div>}{!configured && <div className="setup-hint"><CircleHelp size={15} /> Portal access needs a Supabase project. See <a href="/SETUP.md" target="_blank" rel="noreferrer">setup steps</a>.</div>}<button className="button button-dark auth-submit">{authMode === 'login' ? 'Log in' : 'Create account'} <ArrowRight size={16} /></button></form><div className="auth-switch">{authMode === 'login' ? 'New around here?' : 'Already have an account?'} <button onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); }}>{authMode === 'login' ? 'Create an account' : 'Log in'}</button></div><div className="auth-privacy"><ShieldCheck size={14} /> Your data is private and protected.</div></Modal>}
    {privacyOpen && <Modal title="Your data stays yours." onClose={() => setPrivacyOpen(false)}><div className="privacy-copy"><div className="privacy-icon"><ShieldCheck size={22} /></div><p>Your account and study data are stored in Supabase. Row-level security ensures your classes and assignments are only visible to your signed-in account.</p><p>We use your email to authenticate you. Your study data is not sold or shared for advertising. You can delete your account and data through your Supabase project.</p><p>StudySync GPA values are estimates, not official academic records. Schools may use different grading scales and credit weighting.</p><button className="button button-dark" onClick={() => setPrivacyOpen(false)}>Got it <Check size={16} /></button></div></Modal>}
  </div>;
}

function CourseRow({ course, compact = false, onEdit }) {
  const percentage = Number(course.grade);
  return <div className={`course-row ${compact ? 'course-row-compact' : ''}`}><span className="course-mark"><BookOpen size={17} /></span><span className="course-details"><b>{course.name}</b><small>{course.subject} · {course.credits} {Number(course.credits) === 1 ? 'credit' : 'credits'}</small></span><span className="course-progress"><span><i style={{ width: `${percentage}%` }} /></span>{!compact && <small>{percentage}%</small>}</span><span className={`grade-chip ${percentage < 60 ? 'grade-low' : ''}`}>{letterGrade(percentage)}</span><strong className="course-gpa">{gradePoints(percentage).toFixed(1)}</strong>{onEdit && <button className="edit-button" onClick={onEdit} aria-label={`Edit ${course.name}`}><Settings2 size={15} /></button>}</div>;
}

function AssignmentList({ items, courses, onToggle, onDelete, onEdit, showCompleted = false }) {
  const sortedItems = [...items].sort((a, b) => Number(a.completed) - Number(b.completed) || a.due_date.localeCompare(b.due_date));
  return <div className="assignment-list">{sortedItems.map((item) => {
    const course = courses.find((entry) => entry.id === item.course_id);
    const overdue = !item.completed && item.due_date < today();
    const hasScore = item.score !== null && item.score !== undefined && item.max_score;
    return <article className={`assignment-row ${item.completed ? 'assignment-complete' : ''}`} key={item.id}><button className={`assignment-check ${item.completed ? 'checked' : ''}`} aria-label={item.completed ? 'Mark incomplete' : 'Mark complete'} onClick={() => onToggle(item)}>{item.completed && <Check size={13} />}</button><div className="assignment-info"><b>{item.title}</b><small>{course?.name || 'Personal'}{hasScore && <span className="score-note"> · {item.score}/{item.max_score} pts</span>}</small></div><span className={`priority priority-${item.priority.toLowerCase()}`}>{item.priority}</span><span className={`due-date ${overdue ? 'overdue' : ''}`}><Clock3 size={14} />{overdue ? 'Overdue' : dateLabel(item.due_date)}</span>{onEdit && <button className="delete-button" onClick={() => onEdit(item)} aria-label={`Edit ${item.title}`}><Settings2 size={15} /></button>}<button className="delete-button" onClick={() => onDelete(item.id)} aria-label={`Delete ${item.title}`}><Trash2 size={15} /></button></article>;
  })}{showCompleted && items.some((item) => item.completed) && <div className="completed-caption"><CheckCircle2 size={14} /> Nicely done. Keep that momentum going.</div>}</div>;
}

function EmptyState({ icon: Icon, text, action, onClick }) {
  return <div className="empty-state"><span className="empty-icon"><Icon size={20} /></span><p>{text}</p>{action && <button className="text-button" onClick={onClick}>{action} <ArrowRight size={14} /></button>}</div>;
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const handleKey = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-label={title}><div className="modal-heading"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={19} /></button></div>{children}</section></div>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);