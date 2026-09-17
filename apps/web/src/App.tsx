import { useEffect, useState } from 'react';
import { Activity, Bell, CalendarDays, ChevronRight, CircleDollarSign, Clock3, LayoutDashboard, MessageSquareText, Search, Settings, Stethoscope, Users, X } from 'lucide-react';

type Appointment = { id: string; patient: string; doctor: string; time: string; status: 'Confirmed' | 'Completed' | 'Cancelled'; reason: string };
const demoAppointments: Appointment[] = [
  { id: '1', patient: 'Rahul Sharma', doctor: 'Dr. Ananya Sharma', time: '09:00 AM', status: 'Confirmed', reason: 'Routine consultation' },
  { id: '2', patient: 'Priya Verma', doctor: 'Dr. Raj Mehta', time: '09:30 AM', status: 'Confirmed', reason: 'Follow-up' },
  { id: '3', patient: 'Amit Kumar', doctor: 'Dr. Priya Kapoor', time: '10:30 AM', status: 'Completed', reason: 'Skin consultation' },
  { id: '4', patient: 'Neha Singh', doctor: 'Dr. Arjun Singh', time: '11:00 AM', status: 'Confirmed', reason: 'Pediatric review' }
];

export function App() {
  const [active, setActive] = useState('Dashboard');
  const [appointments, setAppointments] = useState<Appointment[]>(demoAppointments);
  const [query, setQuery] = useState('');
  const [showBooking, setShowBooking] = useState(false);
  const visibleAppointments = appointments.filter((appointment) => appointment.patient.toLowerCase().includes(query.toLowerCase()) || appointment.doctor.toLowerCase().includes(query.toLowerCase()));
  const nav = [
    { label: 'Dashboard', icon: LayoutDashboard }, { label: 'Appointments', icon: CalendarDays }, { label: 'Doctors', icon: Stethoscope },
    { label: 'Patients', icon: Users }, { label: 'Cancellations', icon: X }, { label: 'AI Assistant', icon: MessageSquareText }
  ];
  useEffect(() => { document.title = `MediSlot / ${active}`; }, [active]);

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">M</div><div><strong>MediSlot</strong><span>CLINIC OPERATIONS</span></div></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav>{nav.map(({ label, icon: Icon }) => <button key={label} className={active === label ? 'nav-item active' : 'nav-item'} onClick={() => setActive(label)}><Icon size={18} /><span>{label}</span>{label === 'AI Assistant' && <span className="new-badge">NEW</span>}</button>)}</nav>
      <div className="sidebar-bottom"><button className="nav-item"><Settings size={18} /><span>Settings</span></button><div className="profile"><div className="avatar">FD</div><div><strong>Front Desk</strong><span>Reception team</span></div><ChevronRight size={15} /></div></div>
    </aside>
    <main className="main-content">
      <header className="topbar"><div><p className="eyebrow">THURSDAY, SEPTEMBER 17, 2026</p><h1>{active}</h1></div><div className="top-actions"><div className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search patient or doctor" /></div><button className="icon-button" aria-label="Notifications"><Bell size={19} /><span className="notification-dot" /></button><div className="avatar avatar-large">FD</div></div></header>
      {active === 'Dashboard' ? <>
        <section className="welcome-row"><div><h2>Good morning, front desk.</h2><p>Here is the pulse of your clinic for today.</p></div><button className="primary-button" onClick={() => setShowBooking(true)}><CalendarDays size={17} /> New appointment</button></section>
        <section className="metric-grid"><Metric icon={CalendarDays} label="Today's appointments" value="42" detail="8 remaining" tone="teal" /><Metric icon={Activity} label="Completed" value="28" detail="67% of today's total" tone="blue" /><Metric icon={X} label="Cancelled" value="5" detail="2 late cancellations" tone="rose" /><Metric icon={CircleDollarSign} label="Late fees" value="₹400" detail="This month" tone="gold" /></section>
        <section className="content-grid"><div className="panel schedule-panel"><div className="panel-heading"><div><p className="eyebrow">LIVE VIEW</p><h3>Today's schedule</h3></div><button className="text-button">View calendar <ChevronRight size={15} /></button></div><div className="schedule-list">{visibleAppointments.map((appointment) => <div className="appointment-row" key={appointment.id}><div className="time"><Clock3 size={15} />{appointment.time}</div><div className="appointment-info"><strong>{appointment.patient}</strong><span>{appointment.doctor} · {appointment.reason}</span></div><span className={`status ${appointment.status.toLowerCase()}`}>{appointment.status}</span><button className="row-arrow"><ChevronRight size={17} /></button></div>)}</div></div><div className="panel doctor-panel"><div className="panel-heading"><div><p className="eyebrow">CAPACITY</p><h3>Doctor availability</h3></div><button className="icon-button"><ChevronRight size={17} /></button></div>{['Dr. Ananya Sharma', 'Dr. Raj Mehta', 'Dr. Priya Kapoor', 'Dr. Arjun Singh'].map((doctor, index) => <div className="doctor-row" key={doctor}><div className="doctor-avatar">{doctor.split(' ').slice(1).map((part) => part[0]).join('')}</div><div><strong>{doctor}</strong><span>{index === 0 ? 'General Medicine' : index === 1 ? 'Cardiology' : index === 2 ? 'Dermatology' : 'Pediatrics'}</span></div><div className="availability"><strong>{index === 0 ? '3 slots' : index === 1 ? '5 slots' : '2 slots'}</strong><span>available</span></div></div>)}</div></section>
        <section className="panel insight-panel"><div className="insight-icon"><MessageSquareText size={20} /></div><div><p className="eyebrow">MEDISLOT AI ASSISTANT</p><h3>Ask about your clinic in plain language</h3><p>“Show me Dr. Sharma's schedule” or “Find Rahul's appointment.”</p></div><button className="secondary-button" onClick={() => setActive('AI Assistant')}>Open assistant <ChevronRight size={16} /></button></section>
      </> : <section className="panel page-placeholder"><div className="placeholder-icon"><Stethoscope size={25} /></div><h2>{active}</h2><p>This operational view is ready for your clinic data. Use the dashboard search or create a new appointment to get started.</p><button className="primary-button" onClick={() => setShowBooking(true)}><CalendarDays size={17} /> New appointment</button></section>}
    </main>
    {showBooking && <BookingDialog onClose={() => setShowBooking(false)} onBook={(appointment) => { setAppointments((current) => [...current, appointment]); setShowBooking(false); }} />}
  </div>;
}

function Metric({ icon: Icon, label, value, detail, tone }: { icon: typeof CalendarDays; label: string; value: string; detail: string; tone: string }) { return <div className="metric-card"><div className={`metric-icon ${tone}`}><Icon size={19} /></div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>; }
function BookingDialog({ onClose, onBook }: { onClose: () => void; onBook: (appointment: Appointment) => void }) { const [patient, setPatient] = useState(''); const [doctor, setDoctor] = useState('Dr. Ananya Sharma'); const [time, setTime] = useState('12:00 PM'); return <div className="modal-backdrop"><div className="modal"><div className="modal-header"><div><p className="eyebrow">QUICK BOOKING</p><h2>New appointment</h2></div><button className="icon-button" onClick={onClose}><X size={19} /></button></div><div className="form-grid"><label>Patient<input autoFocus value={patient} onChange={(event) => setPatient(event.target.value)} placeholder="Search patient name" /></label><label>Doctor<select value={doctor} onChange={(event) => setDoctor(event.target.value)}><option>Dr. Ananya Sharma</option><option>Dr. Raj Mehta</option><option>Dr. Priya Kapoor</option><option>Dr. Arjun Singh</option></select></label><label>Date<input type="date" defaultValue="2026-09-17" /></label><label>Time<select value={time} onChange={(event) => setTime(event.target.value)}><option>12:00 PM</option><option>12:30 PM</option><option>01:00 PM</option><option>01:30 PM</option></select></label></div><div className="availability-note"><span className="pulse" /> Slot available <small>Backend conflict checks run on confirmation</small></div><div className="modal-actions"><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={!patient.trim()} onClick={() => onBook({ id: String(Date.now()), patient, doctor, time, status: 'Confirmed', reason: 'New consultation' })}>Confirm appointment</button></div></div></div>; }
