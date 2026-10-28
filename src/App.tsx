import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import WebsiteEditor from "./WebsiteEditor";
import "./editor.css";
import {
  ArrowDownRight, ArrowUpRight, Bell, Blocks, Check, ChevronDown, ChevronLeft,
  ChevronRight, CircleHelp, Clock3, ExternalLink, FilePlus2, Filter, Globe2,
  LayoutDashboard, LifeBuoy, Menu, MoreHorizontal, Plus, Search, Settings2,
  SlidersHorizontal, Sparkles, Users, WandSparkles, X, Building2, Eye,
  MonitorSmartphone, Send, Rocket, CircleCheck, CircleDot, PanelsTopLeft
} from "lucide-react";

type ProjectStatus = "In progress" | "Ready for review" | "Preview sent" | "Published" | "Needs information";
type Project = {
  id: number; business: string; category: string; location: string; owner: string;
  initials: string; color: string; status: ProjectStatus; updated: string; pages: number;
};
const PROJECTS_STORAGE_KEY = "webbon-projects-v1";
const initialProjects: Project[] = [
  { id: 1, business: "Northstar Dental", category: "Healthcare", location: "Austin, TX", owner: "Maya Chen", initials: "ND", color: "mint", status: "Ready for review", updated: "12 min ago", pages: 5 },
  { id: 2, business: "Common Grounds", category: "Restaurant & café", location: "Portland, OR", owner: "Eli Brooks", initials: "CG", color: "peach", status: "In progress", updated: "34 min ago", pages: 4 },
  { id: 3, business: "Form & Field Studio", category: "Home services", location: "Denver, CO", owner: "Nora Patel", initials: "FF", color: "lavender", status: "Preview sent", updated: "1 hour ago", pages: 6 },
  { id: 4, business: "Everwell Wellness", category: "Health & wellness", location: "Chicago, IL", owner: "Maya Chen", initials: "EW", color: "blue", status: "Needs information", updated: "3 hours ago", pages: 4 },
  { id: 5, business: "Oak & Ivy Legal", category: "Professional services", location: "Raleigh, NC", owner: "Sam Rivera", initials: "OI", color: "sand", status: "Published", updated: "Yesterday", pages: 7 },
];
const statusClass: Record<ProjectStatus, string> = {
  "In progress": "status-progress", "Ready for review": "status-review", "Preview sent": "status-preview",
  "Published": "status-live", "Needs information": "status-needs"
};
const navItems = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Websites", icon: PanelsTopLeft, count: "24" },
  { label: "Businesses", icon: Building2 },
  { label: "Team", icon: Users },
];
function App() {
  const [projects, setProjects] = useState<Project[]>(() => { try { const stored = localStorage.getItem(PROJECTS_STORAGE_KEY); return stored ? JSON.parse(stored) as Project[] : initialProjects; } catch { return initialProjects; } });
  useEffect(() => { try { localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects)); } catch { /* Browser storage may be unavailable; app remains usable for this session. */ } }, [projects]);
  const [activeNav, setActiveNav] = useState("Overview");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All websites");
  const [showCreate, setShowCreate] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editorProject, setEditorProject] = useState<Project | null>(null);
  const [form, setForm] = useState({ business: "", category: "Professional services", location: "", owner: "Maya Chen", notes: "" });
  const [searchOpen, setSearchOpen] = useState(false);

  const filteredProjects = useMemo(() => projects.filter((p) => {
    const text = [p.business, p.category, p.location, p.owner].join(" ").toLowerCase();
    const matchesQuery = text.includes(query.toLowerCase());
    const matchesFilter = filter === "All websites" || p.status === filter;
    const matchesPage = activeNav === "Websites" || activeNav === "Overview" || activeNav === "Businesses" || activeNav === "Team";
    return matchesQuery && matchesFilter && matchesPage;
  }), [projects, query, filter, activeNav]);

  const counts = {
    total: projects.length,
    progress: projects.filter((p) => p.status === "In progress").length,
    review: projects.filter((p) => p.status === "Ready for review").length,
    live: projects.filter((p) => p.status === "Published").length,
  };
  const notify = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3200);
  };
  const createProject = (event: FormEvent) => {
    event.preventDefault();
    if (!form.business.trim()) return;
    const name = form.business.trim();
    const project: Project = {
      id: Date.now(), business: name, category: form.category,
      location: form.location.trim() || "Location not added", owner: form.owner,
      initials: name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase(),
      color: ["mint", "peach", "lavender", "blue", "sand"][projects.length % 5],
      status: "In progress", updated: "Just now", pages: 1
    };
    setProjects((current) => [project, ...current]);
    setForm({ business: "", category: "Professional services", location: "", owner: "Maya Chen", notes: "" });
    setShowCreate(false);
    setFilter("All websites");
    setActiveNav("Websites");
    notify("Project created. Add the business details and start building.");
  };
  const changeStatus = (project: Project, status: ProjectStatus) => {
    setProjects((current) => current.map((p) => p.id === project.id ? { ...p, status, updated: "Just now" } : p));
    setSelectedProject({ ...project, status, updated: "Just now" });
    notify(project.business + " moved to " + status.toLowerCase() + ".");
  };

  return (
    <div className="app-shell">
      <aside className={"sidebar " + (sidebarOpen ? "sidebar-open" : "")}>
        <a className="brand" href="#" onClick={(e) => { e.preventDefault(); setActiveNav("Overview"); }}>
          <span className="brand-mark"><Blocks size={21} strokeWidth={2.7}/></span>
          <span className="brand-word">webbon<span className="brand-period">.</span></span>
        </a>
        <div className="workspace-switcher">
          <div className="workspace-icon">W</div>
          <div className="workspace-copy"><strong>Webbon Studio</strong><span>Team workspace</span></div>
          <ChevronDown size={15} className="muted-icon"/>
        </div>
        <div className="side-label">WORKSPACE</div>
        <nav className="main-nav">
          {navItems.map(({ label, icon: Icon, count }) => (
            <button key={label} className={"nav-item " + (activeNav === label ? "nav-active" : "")} onClick={() => { setActiveNav(label); setSidebarOpen(false); }}>
              <Icon size={18} strokeWidth={1.8}/><span>{label}</span>{count && <span className="nav-count">{count}</span>}
            </button>
          ))}
        </nav>
        <div className="side-label side-label-spaced">MANAGE</div>
        <nav className="main-nav">
          <button className={"nav-item " + (activeNav === "Templates" ? "nav-active" : "")} onClick={() => { setActiveNav("Templates"); setSidebarOpen(false); }}><Blocks size={18}/><span>Templates</span></button>
          <button className={"nav-item " + (activeNav === "Publishing" ? "nav-active" : "")} onClick={() => { setActiveNav("Publishing"); setSidebarOpen(false); }}><Globe2 size={18}/><span>Publishing</span></button>
        </nav>
        <div className="sidebar-bottom">
          <div className="plan-card">
            <div className="plan-card-top"><span className="plan-spark"><Sparkles size={15}/></span><span>YOUR WORKSPACE</span></div>
            <strong>Make room for more.</strong>
            <p>Keep every business website and project organized in one place.</p>
            <button onClick={() => notify("Workspace settings are coming soon.")}>Workspace settings <ChevronRight size={14}/></button>
          </div>
          <button className="nav-item" onClick={() => notify("Help center will be available soon.")}><LifeBuoy size={18}/><span>Help center</span></button>
          <button className="profile-row" onClick={() => notify("Account settings will be available soon.")}>
            <div className="avatar avatar-profile">NR</div><div className="profile-copy"><strong>Naimur Rahman</strong><span>Administrator</span></div><MoreHorizontal size={19} className="muted-icon"/>
          </button>
        </div>
      </aside>
      {sidebarOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setSidebarOpen(false)}/>}

      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu icon-button" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}><Menu size={19}/></button>
          <div className="breadcrumbs"><span>Workspace</span><ChevronRight size={14}/><strong>{activeNav}</strong></div>
          <div className="topbar-actions">
            <button className={"search-trigger " + (searchOpen ? "search-trigger-open" : "")} onClick={() => { setSearchOpen(!searchOpen); if (!searchOpen) document.getElementById("project-search")?.focus(); }}>
              <Search size={16}/><span>Search anything...</span><kbd>⌘ K</kbd>
            </button>
            {searchOpen && <div className="top-search-box"><Search size={16}/><input id="project-search" autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search businesses and websites..."/><button onClick={() => {setQuery("");setSearchOpen(false);}}><X size={16}/></button></div>}
            <div className="topbar-divider"/>
            <div className="notifications-wrap">
              <button className="icon-button notification-button" aria-label="Notifications" onClick={() => setShowNotifications(!showNotifications)}><Bell size={18}/><span className="notification-dot"/></button>
              {showNotifications && <div className="notification-popover"><strong>You're all caught up</strong><p>New project activity and review reminders will appear here.</p></div>}
            </div>
            <div className="avatar avatar-profile top-avatar">NR</div>
          </div>
        </header>

        <div className="page-content">
          <section className="welcome-row">
            <div><div className="eyebrow"><span className="eyebrow-dot"/> YOUR WEBSITE WORKSPACE</div><h1>{activeNav === "Overview" ? "Good work starts here." : activeNav}</h1><p className="welcome-subtitle">{activeNav === "Overview" ? "A little space to make something great for every business." : activeNav === "Websites" ? "Create, organize, review, and publish client websites." : activeNav === "Businesses" ? "Keep your business prospects and client details organized." : activeNav === "Team" ? "See who is keeping your websites moving." : activeNav === "Templates" ? "Reusable starting points for consistent, high-quality websites." : "Manage website previews and publishing status."}</p></div>
            <button className="primary-button" onClick={() => setShowCreate(true)}><Plus size={17} strokeWidth={2.5}/> New website</button>
          </section>

          <section className="stats-grid">
            <StatCard label="Total websites" value={String(counts.total).padStart(2, "0")} icon={<PanelsTopLeft size={18}/>} trend="All projects in your workspace" tone="ink"/>
            <StatCard label="In progress" value={String(counts.progress).padStart(2, "0")} icon={<Clock3 size={18}/>} trend="Being built by the team" tone="amber"/>
            <StatCard label="Ready for review" value={String(counts.review).padStart(2, "0")} icon={<Eye size={18}/>} trend="Waiting for a quality check" tone="violet"/>
            <StatCard label="Published" value={String(counts.live).padStart(2, "0")} icon={<Globe2 size={18}/>} trend="Live websites" tone="green"/>
          </section>

          <section className="quick-start">
            <div className="quick-art" aria-hidden="true"><div className="art-window"><div className="art-toolbar"><i/><i/><i/><span/></div><div className="art-content"><div className="art-line art-line-long"/><div className="art-line art-line-short"/><div className="art-cta"/><div className="art-photo"/></div></div><div className="art-badge"><Check size={15}/></div></div>
            <div className="quick-copy"><div className="quick-label"><Sparkles size={14}/> A GOOD PLACE TO START</div><h2>Every business deserves<br className="desktop-break"/> a better website.</h2><p>Start with a business, gather the details, and let your team turn them into a polished website that is ready to show the world.</p><button className="text-button" onClick={() => setShowCreate(true)}>Create your first draft <ArrowUpRight size={16}/></button></div>
            <div className="quick-steps"><div className="step-row"><span className="step-number">01</span><span><strong>Add a business</strong><small>Start with the essentials</small></span><ChevronRight size={16}/></div><div className="step-row"><span className="step-number">02</span><span><strong>Build the pages</strong><small>Use your team’s templates</small></span><ChevronRight size={16}/></div><div className="step-row"><span className="step-number">03</span><span><strong>Review & share</strong><small>Check it before it goes live</small></span><ChevronRight size={16}/></div></div>
          </section>

          <section className="projects-section">
            <div className="section-heading"><div><h2>{activeNav === "Businesses" ? "Business directory" : activeNav === "Team" ? "Team projects" : activeNav === "Templates" ? "Recent website projects" : activeNav === "Publishing" ? "Publishing queue" : "Recent websites"}</h2><p>A closer look at what your team is working on.</p></div><button className="subtle-button" onClick={() => {setActiveNav("Websites");setFilter("All websites");}}>View all websites <ArrowUpRight size={15}/></button></div>
            <div className="project-toolbar">
              <div className="project-tabs">
                {["All websites", "In progress", "Ready for review", "Published"].map((tab) => <button key={tab} className={"project-tab " + (filter === tab ? "project-tab-active" : "")} onClick={() => setFilter(tab)}>{tab}{tab === "All websites" && <span className="tab-count">{projects.length}</span>}</button>)}
              </div>
              <div className="table-actions">
                <label className="table-search"><Search size={15}/><input aria-label="Search websites" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search websites"/></label>
                <button className="filter-button" onClick={() => {const statuses = ["All websites", "In progress", "Ready for review", "Preview sent", "Published", "Needs information"]; const next = (statuses.indexOf(filter) + 1) % statuses.length; setFilter(statuses[next]);}}><SlidersHorizontal size={15}/><span>Filter</span></button>
              </div>
            </div>
            <div className="project-table-wrap"><table className="project-table"><thead><tr><th>BUSINESS</th><th>STATUS</th><th>ASSIGNED TO</th><th>LAST UPDATED</th><th><span className="sr-only">Open project</span></th></tr></thead><tbody>
              {filteredProjects.map((project) => <tr key={project.id} onClick={() => setSelectedProject(project)} className="project-row" tabIndex={0} onKeyDown={(event) => {if(event.key === "Enter") setSelectedProject(project);}}>
                <td><div className="business-cell"><div className={"business-logo logo-" + project.color}>{project.initials}</div><div className="business-info"><strong>{project.business}</strong><span>{project.category} <i/> {project.location}</span></div></div></td>
                <td><span className={"status-pill " + statusClass[project.status]}><span/>{project.status}</span></td>
                <td><div className="assigned-cell"><div className={"avatar avatar-" + (project.owner === "Maya Chen" ? "rose" : project.owner === "Eli Brooks" ? "blue" : project.owner === "Nora Patel" ? "gold" : "green")}>{project.owner.split(" ").map((n) => n[0]).join("")}</div><span>{project.owner}</span></div></td>
                <td><span className="updated-time">{project.updated}</span></td>
                <td><button className="row-open" aria-label={"Open " + project.business} onClick={(event) => {event.stopPropagation();setSelectedProject(project);}}><ChevronRight size={17}/></button></td>
              </tr>)}
              {filteredProjects.length === 0 && <tr><td colSpan={5}><div className="empty-state"><Search size={22}/><strong>No websites found</strong><span>Try a different search or filter, or create a new website.</span><button className="text-button" onClick={() => {setQuery("");setFilter("All websites");}}>Clear filters</button></div></td></tr>}
            </tbody></table></div>
            <div className="table-footer"><span>Showing <strong>{filteredProjects.length}</strong> of <strong>{projects.length}</strong> sample and created projects</span><div className="pagination"><button disabled aria-label="Previous page"><ChevronLeft size={16}/></button><button className="page-current">1</button><button disabled aria-label="Next page"><ChevronRight size={16}/></button></div></div>
          </section>

          <footer className="page-footer"><span>Made for the people who make websites happen.</span><span><CircleHelp size={14}/> Webbon workspace <i/> v0.1</span></footer>
        </div>
      </main>

      {showCreate && <div className="modal-backdrop" onMouseDown={(e) => {if(e.target === e.currentTarget) setShowCreate(false);}}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="create-title"><div className="modal-heading"><div><span className="modal-kicker">NEW PROJECT</span><h2 id="create-title">Start a website</h2><p>Add the business details to open a new project for your team.</p></div><button className="icon-button" onClick={() => setShowCreate(false)} aria-label="Close"><X size={19}/></button></div>
        <form onSubmit={createProject}><label className="field-label">Business name <span>*</span><input required autoFocus placeholder="e.g. The Corner Coffee Co." value={form.business} onChange={(e) => setForm({...form,business:e.target.value})}/></label>
          <div className="form-grid"><label className="field-label">Business category<select value={form.category} onChange={(e) => setForm({...form,category:e.target.value})}><option>Professional services</option><option>Restaurant & café</option><option>Healthcare</option><option>Home services</option><option>Health & wellness</option><option>Retail & ecommerce</option><option>Beauty & personal care</option><option>Education</option><option>Other</option></select></label><label className="field-label">Location<input placeholder="City, country" value={form.location} onChange={(e) => setForm({...form,location:e.target.value})}/></label></div>
          <label className="field-label">Assign to<select value={form.owner} onChange={(e) => setForm({...form,owner:e.target.value})}><option>Maya Chen</option><option>Eli Brooks</option><option>Nora Patel</option><option>Sam Rivera</option></select></label>
          <label className="field-label">Brief / notes <span className="optional-label">OPTIONAL</span><textarea rows={3} placeholder="Services, current website, required pages, brand preferences..." value={form.notes} onChange={(e) => setForm({...form,notes:e.target.value})}/></label>
          <div className="modal-note"><CircleCheck size={17}/><span>This creates a project for staff to build manually. No AI generation is triggered.</span></div>
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowCreate(false)}>Cancel</button><button type="submit" className="primary-button"><Plus size={16}/> Create project</button></div>
        </form></section></div>}

      {selectedProject && <div className="modal-backdrop" onMouseDown={(e) => {if(e.target === e.currentTarget) setSelectedProject(null);}}><section className="modal project-detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title"><div className="modal-heading"><div className="detail-title-row"><div className={"business-logo detail-logo logo-" + selectedProject.color}>{selectedProject.initials}</div><div><span className="modal-kicker">WEBSITE PROJECT</span><h2 id="detail-title">{selectedProject.business}</h2><p>{selectedProject.category} · {selectedProject.location}</p></div></div><button className="icon-button" onClick={() => setSelectedProject(null)} aria-label="Close"><X size={19}/></button></div>
          <div className="detail-stats"><div><span>Pages</span><strong>{selectedProject.pages}</strong></div><div><span>Assigned to</span><strong>{selectedProject.owner}</strong></div><div><span>Updated</span><strong>{selectedProject.updated}</strong></div></div>
          <label className="field-label">Project status<select value={selectedProject.status} onChange={(e) => changeStatus(selectedProject, e.target.value as ProjectStatus)}>{["In progress","Ready for review","Preview sent","Published","Needs information"].map((s) => <option key={s}>{s}</option>)}</select></label>
          <div className="detail-checklist"><strong>Production readiness checklist</strong>{[{label:"Business details confirmed",done:false},{label:"Mobile layout checked",done:false},{label:"Contact links and forms tested",done:false},{label:"SEO and page metadata checked",done:false},{label:"Client approval received",done:false}].map((item) => <div className="checklist-row" key={item.label}><span className="check-box"/><span>{item.label}</span></div>)}</div>
          <div className="modal-note"><CircleHelp size={17}/><span>Website editing, hosting, and live publishing integrations are not connected yet in this foundation.</span></div>
          <div className="modal-actions"><button className="secondary-button" onClick={() => setSelectedProject(null)}>Close</button><button className="primary-button" onClick={() => {setEditorProject(selectedProject);setSelectedProject(null);}}><PanelsTopLeft size={16}/> Open editor <ArrowUpRight size={14}/></button></div>
        </section></div>}

      {editorProject && <WebsiteEditor project={{ id: editorProject.id, business: editorProject.business, category: editorProject.category, location: editorProject.location }} onClose={() => setEditorProject(null)} onSaved={() => notify("Website draft saved on this device.")} />}
      {notice && <div className="toast"><span className="toast-check"><Check size={15}/></span>{notice}<button onClick={() => setNotice("")} aria-label="Dismiss"><X size={15}/></button></div>}
    </div>
  );
}

function StatCard({ label, value, icon, trend, tone }: { label: string; value: string; icon: ReactNode; trend: string; tone: string }) {
  return <article className="stat-card"><div className="stat-top"><span>{label}</span><span className={"stat-icon stat-" + tone}>{icon}</span></div><div className="stat-value">{value}</div><div className="stat-foot"><span className="stat-foot-icon">{tone === "green" ? <ArrowUpRight size={14}/> : tone === "amber" ? <Clock3 size={13}/> : tone === "violet" ? <Eye size={13}/> : <ArrowDownRight size={14}/>}</span>{trend}</div></article>;
}

export default App;
