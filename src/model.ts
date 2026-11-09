export const stores = ['Downtown', 'Westside', 'Northgate', 'Lakeside', 'Oakwood'];
export type Employee = { id: string; name: string; store: string; role: string };
export type Manager = { id: string; name: string; role: 'Operations Manager' | 'Store Manager' | 'Assistant Store Manager'; store: string | null };
export type PostComment = { id: string; authorId: string; author: string; role: string; store: string | null; body: string; createdAt: string };
export type Announcement = { id: string; title: string; body: string; category: string; important: boolean; stores: string[]; author: string; authorId?: string; createdAt: string; acknowledgments: Record<string, string>; archivedBy?: Record<string, string>; comments?: PostComment[]; commentsReadBy?: Record<string, string[]> };
export type AnnouncementDraft = Pick<Announcement, 'title' | 'body' | 'category' | 'important' | 'stores'>;
const first = ['Alex','Jordan','Taylor','Morgan','Casey','Sam','Jamie','Avery','Riley','Drew','Cameron','Quinn','Reese','Parker','Blake','Skyler','Hayden','Emerson','Rowan','Finley'];
const last = ['Chen','Williams','Patel','Garcia','Johnson','Kim','Brown','Davis','Wilson','Martinez'];
const storeLeadership = [
 ['Rachel Brooks', 'Chris Bennett'],
 ['Priya Shah', 'Daniel Lee'],
 ['Elena Rivera', 'Marcus Reed'],
 ['Sofia Nguyen', 'Noah Davis'],
 ['Olivia Carter', 'Ethan Wilson'],
];
export const employees: Employee[] = stores.flatMap((store, s) => Array.from({ length: 40 }, (_, i) => ({ id: `e-${s}-${i}`, name: i >= 38 ? storeLeadership[s][i - 38] : s === 0 && i === 0 ? 'Alex Johnson' : `${first[i % 20]} ${last[(Math.floor(i / 20) + s * 2) % 10]}`, store, role: i === 38 ? 'Store Manager' : i === 39 ? 'Assistant Store Manager' : i % 8 === 0 ? 'Shift lead' : 'Sales associate' })));
export const managers: Manager[] = [
 { id: 'michael', name: 'Michael Torres', role: 'Operations Manager', store: null },
 ...employees.filter(e => e.role === 'Store Manager' || e.role === 'Assistant Store Manager').map(e => ({ ...e, role: e.role as Manager['role'] })),
];
export function createAnnouncement(managerId: string, draft: AnnouncementDraft): Announcement {
 const manager = managers.find(m => m.id === managerId);
 if (!manager) throw new Error('Choose a valid manager before publishing.');
 if (!draft.title.trim() || !draft.body.trim()) throw new Error('Add a title and message before publishing.');
 const targets = manager.store ? [manager.store] : [...new Set(draft.stores)];
 if (targets.some(store => !stores.includes(store))) throw new Error('Select valid stores.');
 return withAuthorAcknowledgment({ ...draft, title: draft.title.trim(), body: draft.body.trim(), stores: targets, id: crypto.randomUUID(), author: manager.name, authorId: manager.id, createdAt: new Date().toISOString(), acknowledgments: {} });
}
export function audience(a: Announcement, manager?: Manager): Employee[] { return employees.filter(e => (a.stores.length === 0 || a.stores.includes(e.store)) && (!manager?.store || e.store === manager.store)); }
export function visibleTo(a: Announcement, e: Employee): boolean { return a.stores.length === 0 || a.stores.includes(e.store); }
export function visibleToManager(a: Announcement, manager: Manager): boolean { return !manager.store || a.stores.length === 0 || a.stores.includes(manager.store); }
export function sortManagerUpdates(updates: Announcement[]): Announcement[] {
 return [...updates].sort((a, b) => Number(b.important) - Number(a.important) || Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
export function acknowledgedCount(a: Announcement, manager?: Manager): number { return audience(a, manager).filter(e => !!a.acknowledgments[e.id]).length; }
export function needsAcknowledgment(a: Announcement, manager?: Manager): boolean {
 return a.important && audience(a, manager).some(e => !a.acknowledgments[e.id]);
}
export function acknowledge(a: Announcement, employee: Employee): Announcement { if (!a.important || !visibleTo(a, employee) || a.acknowledgments[employee.id]) return a; return { ...a, acknowledgments: { ...a.acknowledgments, [employee.id]: new Date().toISOString() } }; }
export function acknowledgeAsManager(a: Announcement, managerId: string): Announcement {
 const manager = managers.find(m => m.id === managerId);
 const recipient = manager && employees.find(e => e.id === manager.id);
 return recipient ? acknowledge(a, recipient) : a;
}
function withAuthorAcknowledgment(a: Announcement): Announcement {
 const author = managers.find(m => a.authorId ? m.id === a.authorId : m.name === a.author);
 if (!a.important || !author?.store || !visibleToManager(a, author) || a.acknowledgments[author.id]) return a;
 return { ...a, acknowledgments: { ...a.acknowledgments, [author.id]: a.createdAt } };
}
export function isArchived(a: Announcement, employee: Employee): boolean {
 return visibleTo(a, employee) && (a.important ? !!a.acknowledgments[employee.id] : !!a.archivedBy?.[employee.id]);
}
export function archiveAnnouncement(a: Announcement, employee: Employee): Announcement {
 if (a.important || !visibleTo(a, employee) || isArchived(a, employee)) return a;
 return { ...a, archivedBy: { ...a.archivedBy, [employee.id]: new Date().toISOString() } };
}
export function addComment(a: Announcement, actorId: string, body: string): Announcement {
 const manager = managers.find(m => m.id === actorId);
 const employee = employees.find(e => e.id === actorId);
 const actor = manager || employee;
 if (!actor || (manager ? !visibleToManager(a, manager) : !employee || !visibleTo(a, employee))) throw new Error('You can only comment on updates shared with you.');
 const message = body.trim();
 if (!message || message.length > 2000) throw new Error('Write a comment between 1 and 2,000 characters.');
 const comment: PostComment = { id: crypto.randomUUID(), authorId: actor.id, author: actor.name, role: actor.role, store: actor.store, body: message, createdAt: new Date().toISOString() };
 return { ...a, comments: [...(a.comments || []), comment] };
}
export function newCommentCount(a: Announcement, manager: Manager): number {
 if (!visibleToManager(a, manager)) return 0;
 const read = new Set(a.commentsReadBy?.[manager.id] || []);
 return (a.comments || []).filter(c => c.authorId !== manager.id && !read.has(c.id)).length;
}
export function markCommentsRead(a: Announcement, managerId: string): Announcement {
 const manager = managers.find(m => m.id === managerId);
 if (!manager || !visibleToManager(a, manager) || !newCommentCount(a, manager)) return a;
 return { ...a, commentsReadBy: { ...a.commentsReadBy, [manager.id]: (a.comments || []).map(c => c.id) } };
}
export function seed(): Announcement[] {
 const now = Date.now();
 const rows = [
  { title: 'A safer store starts with all of us', body: 'Our updated store safety guidelines are ready. Please take a few minutes before your next shift to review the essentials.\n\n• Keep emergency exits and stockroom walkways clear at all times.\n• Report spills immediately and place a caution sign while cleaning.\n• Check your nearest first-aid kit and fire extinguisher location.\n• Let your shift lead know about any hazards before starting work.\n\nOnce you’ve read these guidelines, confirm below so we know everyone is ready.', category: 'Safety', important: true, stores: [], author: 'Michael Torres', fraction: .73 },
  { title: 'A little extra thanks for your hard work', body: 'You made last month a great one. To say thank you, we’re adding an extra 10% to your employee discount this weekend.\n\nShow your employee badge at checkout, Friday through Sunday. Thank you for everything you do for our customers and each other!', category: 'Team news', important: false, stores: [], author: 'Michael Torres', fraction: 0 },
  { title: 'New opening checklist, starting Monday', body: 'We’re making mornings a little smoother at Downtown and Westside.\n\nBefore the doors open:\n• Walk the sales floor and check displays.\n• Test registers and check receipt paper.\n• Review the daily brief with your shift lead.\n• Make sure the welcome area is clean and ready.\n\nPlease confirm you’ve read the new checklist before your next opening shift.', category: 'Operations', important: true, stores: ['Downtown','Westside'], author: 'Michael Torres', fraction: .55 },
  { title: 'Meet your November team champions', body: 'A big round of applause for the teammates who went the extra mile this month. From helping new starters settle in to making a customer’s day, your small acts make a big difference.\n\nLook out for this month’s team champions on your breakroom board. Have someone in mind for next month? Tell your store manager!', category: 'Team news', important: false, stores: [], author: 'Michael Torres', fraction: 0 },
  { title: 'Northgate stockroom refresh', body: 'The stockroom layout is changing this week. New shelf labels will make it easier to find our most requested items. Please ask your shift lead for a quick walkthrough before your next restock.', category: 'Operations', important: true, stores: ['Northgate'], author: 'Elena Rivera', fraction: .8 },
 ];
 return rows.map((r, i) => { const a: Announcement = { id: `seed-${i}`, title:r.title, body:r.body, category:r.category, important:r.important, stores:r.stores, author:r.author, createdAt:new Date(now - (i * 20 + 2) * 3600000).toISOString(), acknowledgments:{} }; audience(a).forEach((e, index) => { if(index > 0 && index <= Math.floor(audience(a).length * r.fraction)) a.acknowledgments[e.id] = new Date(now - 3600000).toISOString(); }); return withAuthorAcknowledgment(a); });
}
// Correct only known sample records from before store-specific managers were added.
// Leave user-created announcements and all acknowledgment/archive history intact.
const legacySampleAuthors: Record<string, {title:string;author:string}> = {
 'seed-2': {title:'New opening checklist, starting Monday', author:'Michael Torres'},
 'seed-3': {title:'Meet your November team champions', author:'Michael Torres'},
 'seed-4': {title:'Northgate stockroom refresh', author:'Elena Rivera'},
};
function migrateSampleAuthor(a: Announcement): Announcement {
 const sample = legacySampleAuthors[a.id];
 return sample && a.title === sample.title && a.author === 'Rachel Brooks' ? {...a, author:sample.author} : a;
}
function validCommentData(a: Announcement): boolean {
 return (a.comments === undefined || (Array.isArray(a.comments) && a.comments.every(c => c && typeof c.id === 'string' && typeof c.authorId === 'string' && typeof c.author === 'string' && typeof c.role === 'string' && (c.store === null || stores.includes(c.store)) && typeof c.body === 'string' && c.body.trim().length > 0 && c.body.length <= 2000 && typeof c.createdAt === 'string' && !Number.isNaN(Date.parse(c.createdAt))))) && (a.commentsReadBy === undefined || (a.commentsReadBy !== null && typeof a.commentsReadBy === 'object' && !Array.isArray(a.commentsReadBy) && Object.values(a.commentsReadBy).every(ids => Array.isArray(ids) && ids.every(id => typeof id === 'string'))));
}
export const STORAGE_KEY = 'summit-updates-v1';
export function loadAnnouncements(): { data: Announcement[]; error: boolean } {
 try { const raw = localStorage.getItem(STORAGE_KEY); if (!raw) return {data:seed(),error:false}; const value = JSON.parse(raw); if (!Array.isArray(value) || !value.every(a => typeof a.id === 'string' && typeof a.title === 'string' && typeof a.body === 'string' && typeof a.category === 'string' && typeof a.important === 'boolean' && Array.isArray(a.stores) && a.stores.every((s: unknown) => stores.includes(s as string)) && (a.archivedBy === undefined || (a.archivedBy !== null && typeof a.archivedBy === 'object' && !Array.isArray(a.archivedBy) && Object.values(a.archivedBy).every(t => typeof t === 'string' && !Number.isNaN(Date.parse(t))))) && validCommentData(a) && (a.authorId === undefined || typeof a.authorId === 'string') && typeof a.author === 'string' && !Number.isNaN(Date.parse(a.createdAt)) && a.acknowledgments && typeof a.acknowledgments === 'object')) throw Error(); return {data:value.map((a: Announcement) => withAuthorAcknowledgment(migrateSampleAuthor(a))),error:false}; } catch { return {data:seed(),error:true}; }
}
