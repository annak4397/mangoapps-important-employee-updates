import { test } from 'node:test';
import assert from 'node:assert/strict';
import {seed, employees, audience, visibleTo, acknowledge, acknowledgedCount, managers, stores, createAnnouncement, visibleToManager, isArchived, archiveAnnouncement, loadAnnouncements, STORAGE_KEY, addComment, newCommentCount, markCommentsRead, acknowledgeAsManager} from './model.ts';
test('mock workforce has 200 people across five stores',()=>{assert.equal(employees.length,200);assert.equal(new Set(employees.map(e=>e.store)).size,5);});
test('all-store and selected-store audiences are consistent',()=>{const rows=seed();assert.equal(audience(rows[0]).length,200);const selected=rows[2];assert.equal(audience(selected).length,80);assert.equal(visibleTo(selected,employees[0]),true);assert.equal(visibleTo(selected,employees[80]),false);});
test('acknowledgment records once and updates manager totals',()=>{const a=seed()[0];const before=acknowledgedCount(a);const next=acknowledge(a,employees[0]);assert.ok(next.acknowledgments[employees[0].id]);assert.equal(acknowledgedCount(next),before+1);assert.equal(acknowledge(next,employees[0]),next);assert.equal(acknowledgedCount(a),before);});
test('unrelated store and informational updates cannot be acknowledged',()=>{const rows=seed();assert.equal(acknowledge(rows[2],employees[80]),rows[2]);assert.equal(acknowledge(rows[1],employees[0]),rows[1]);});

const draft = { title: 'Test update', body: 'An important store update.', category: 'Operations', important: true, stores: [] as string[] };
test('each store has one manager and one assistant, within the 200-person workforce', () => {
 assert.equal(managers.length, 11);
 for (const store of stores) {
  const leaders = managers.filter(m => m.store === store);
  assert.deepEqual(leaders.map(m => m.role).sort(), ['Assistant Store Manager', 'Store Manager']);
  assert.ok(leaders.every(m => employees.some(e => e.id === m.id && e.store === store)));
 }
});
test('all store managers and assistants publish only to their own store', () => {
 for (const manager of managers.filter(m => m.store)) {
  for (const targets of [[], stores, ...stores.map(store=>[store]), ['Not a store']]) {
   const announcement = createAnnouncement(manager.id, {...draft, stores: targets});
   assert.deepEqual(announcement.stores, [manager.store]);
   assert.equal(announcement.author, manager.name);
   assert.equal(audience(announcement).length, 40);
   assert.ok(audience(announcement).every(e => e.store === manager.store));
   assert.deepEqual(announcement.acknowledgments, {[manager.id]:announcement.createdAt});
   assert.equal(acknowledgedCount(announcement),1);
  }
 }
});
test('Michael can publish to everyone, one store, or multiple selected stores', () => {
 for (const targets of [[], ['Downtown'], ['Westside', 'Lakeside']]) {
  const announcement = createAnnouncement('michael', {...draft, stores: targets});
  assert.deepEqual(announcement.stores, targets);
  assert.equal(announcement.author, 'Michael Torres');
  assert.equal(audience(announcement).length, targets.length ? targets.length * 40 : 200);
 }
 assert.throws(() => createAnnouncement('michael', {...draft, stores:['Unknown']}), /valid stores/);
});
test('publishing requires a known manager and a nonblank message', () => {
 assert.throws(() => createAnnouncement(employees[0].id, draft), /valid manager/);
 assert.throws(() => createAnnouncement('michael', {...draft, title:'  '}), /title and message/);
 assert.throws(() => createAnnouncement('michael', {...draft, body:'  '}), /title and message/);
});

test('switching managers scopes acknowledgment tracking to applicable updates', () => {
 const rows = seed().filter(a => a.important);
 const downtown = managers.find(m => m.store === 'Downtown')!;
 const northgate = managers.find(m => m.store === 'Northgate')!;
 assert.deepEqual(rows.filter(a => visibleToManager(a, managers[0])).map(a => a.id), ['seed-0', 'seed-2', 'seed-4']);
 assert.deepEqual(rows.filter(a => visibleToManager(a, downtown)).map(a => a.id), ['seed-0', 'seed-2']);
 assert.deepEqual(rows.filter(a => visibleToManager(a, northgate)).map(a => a.id), ['seed-0', 'seed-4']);
 for (const manager of managers.filter(m => m.store)) {
  for (const announcement of rows.filter(a => visibleToManager(a, manager))) {
   assert.equal(audience(announcement, manager).length, 40);
   assert.ok(audience(announcement, manager).every(e => e.store === manager.store));
  }
 }
});
test('tracking counts and recipient rows use the selected manager scope', () => {
 const announcement = { ...seed()[0], acknowledgments: { [employees[0].id]: '2026-11-09T00:00:00Z' } };
 const downtown = managers.find(m => m.store === 'Downtown')!;
 const westside = managers.find(m => m.store === 'Westside')!;
 assert.equal(acknowledgedCount(announcement, downtown), 1);
 assert.equal(acknowledgedCount(announcement, westside), 0);
 assert.equal(acknowledgedCount(announcement, managers[0]), 1);
 assert.equal(audience(announcement, managers[0]).length, 200);
 const confirmed = acknowledge(announcement, employees[40]);
 assert.equal(acknowledgedCount(confirmed, downtown), 1);
 assert.equal(acknowledgedCount(confirmed, westside), 1);
 assert.equal(acknowledgedCount(confirmed, managers[0]), 2);
 assert.equal(audience(seed()[2], managers[0]).length, 80);
 assert.equal(audience(seed()[2], downtown).length, 40);
});
test('store manager and assistant share the same store tracking scope', () => {
 const rows = seed();
 for (const store of stores) {
  const [manager, assistant] = managers.filter(m => m.store === store);
  assert.deepEqual(rows.filter(a => visibleToManager(a, manager)), rows.filter(a => visibleToManager(a, assistant)));
  for (const announcement of rows) {
   assert.deepEqual(audience(announcement, manager), audience(announcement, assistant));
   assert.equal(acknowledgedCount(announcement, manager), acknowledgedCount(announcement, assistant));
  }
 }
});

test('acknowledging automatically archives only for the confirming employee', () => {
 const a = {...seed()[0], acknowledgments:{}};
 const next = acknowledge(a, employees[0]);
 assert.equal(isArchived(a, employees[0]), false);
 assert.equal(isArchived(next, employees[0]), true);
 assert.equal(isArchived(next, employees[1]), false);
 assert.equal(acknowledgedCount(next), 1);
 assert.equal(audience(next).length, 200);
 assert.equal(visibleToManager(next, managers[0]), true);
});
test('informational messages can be archived independently without acknowledging', () => {
 const a = seed()[1];
 const next = archiveAnnouncement(a, employees[0]);
 assert.equal(isArchived(a, employees[0]), false);
 assert.equal(isArchived(next, employees[0]), true);
 assert.equal(isArchived(next, employees[1]), false);
 assert.equal(acknowledgedCount(next), 0);
 assert.deepEqual(next.acknowledgments, a.acknowledgments);
 assert.equal(archiveAnnouncement(next, employees[0]), next);
 const both = archiveAnnouncement(next, employees[1]);
 assert.equal(isArchived(both, employees[0]), true);
 assert.equal(isArchived(both, employees[1]), true);
});
test('pending required updates cannot be manually archived or hidden by an archive marker', () => {
 const a = {...seed()[0], acknowledgments:{}};
 assert.equal(archiveAnnouncement(a, employees[0]), a);
 assert.equal(isArchived({...a, archivedBy:{[employees[0].id]:new Date().toISOString()}}, employees[0]), false);
});
test('an employee cannot archive an update intended for another store', () => {
 const a = {...seed()[2], important:false};
 assert.equal(archiveAnnouncement(a, employees[80]), a);
 assert.equal(isArchived(a, employees[80]), false);
});
test('archives survive storage reload and existing acknowledgments are treated as archived', t => {
 const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
 const existing = acknowledge({...seed()[0], acknowledgments:{}}, employees[0]);
 const manual = archiveAnnouncement(seed()[1], employees[0]);
 const serialized = JSON.stringify([existing, manual]);
 Object.defineProperty(globalThis, 'localStorage', {configurable:true,value:{getItem:(key:string)=>key===STORAGE_KEY?serialized:null}});
 t.after(()=>{if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else Reflect.deleteProperty(globalThis,'localStorage');});
 const loaded = loadAnnouncements();
 assert.equal(loaded.error, false);
 assert.equal(isArchived(loaded.data[0], employees[0]), true);
 assert.equal(isArchived(loaded.data[1], employees[0]), true);
 assert.equal(isArchived(loaded.data[1], employees[1]), false);
 assert.equal(acknowledgedCount(loaded.data[0]), 1);
});

test('all seeded announcements respect their author’s store permissions', () => {
 for (const announcement of seed()) {
  const author = managers.find(m => m.name === announcement.author);
  assert.ok(author, `Unknown author: ${announcement.author}`);
  if (author.store) assert.deepEqual(announcement.stores, [author.store]);
  else assert.equal(author.role, 'Operations Manager');
 }
});
test('old sample authors migrate without changing acknowledgment, archive, or custom data', t => {
 const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
 const rows = seed();
 for (const index of [2,3,4]) rows[index].author='Rachel Brooks';
 rows[2].archivedBy = {[employees[0].id]:'2026-11-09T00:00:00Z'};
 const custom = {...rows[2], id:'custom-announcement', title:'My own store update', stores:['Downtown']};
 const saved = [...rows,custom];
 Object.defineProperty(globalThis, 'localStorage', {configurable:true,value:{getItem:()=>JSON.stringify(saved)}});
 t.after(()=>{if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else Reflect.deleteProperty(globalThis,'localStorage');});
 const loaded = loadAnnouncements();
 assert.equal(loaded.error,false);
 assert.equal(loaded.data[2].author,'Michael Torres');
 assert.equal(loaded.data[3].author,'Michael Torres');
 assert.equal(loaded.data[4].author,'Elena Rivera');
 for (let i=0;i<rows.length;i++) {
  assert.deepEqual(loaded.data[i].acknowledgments, saved[i].acknowledgments);
  assert.deepEqual(loaded.data[i].archivedBy, saved[i].archivedBy);
  assert.deepEqual(loaded.data[i].stores, saved[i].stores);
  assert.equal(loaded.data[i].createdAt,saved[i].createdAt);
 }
 assert.deepEqual(loaded.data.at(-1),custom);
});

test('employees, managers, and assistants can comment with their own identity', () => {
 const a = seed()[0];
 for (const actor of [...managers, employees[0]]) {
  const next = addComment(a, actor.id, '  Thanks for sharing!  ');
  assert.equal(next.comments?.length,1);
  const comment = next.comments![0];
  assert.equal(comment.author,actor.name);
  assert.equal(comment.authorId,actor.id);
  assert.equal(comment.role,actor.role);
  assert.equal(comment.store,actor.store);
  assert.equal(comment.body,'Thanks for sharing!');
  assert.deepEqual(next.acknowledgments,a.acknowledgments);
  assert.equal(a.comments,undefined);
 }
});
test('comments respect post visibility and reject invalid messages', () => {
 const a = seed()[2];
 assert.throws(()=>addComment(a,employees[80].id,'Not my store'),/shared with you/);
 assert.throws(()=>addComment(a,managers.find(m=>m.store==='Northgate')!.id,'Not my store'),/shared with you/);
 assert.throws(()=>addComment(a,'unknown','Hello'),/shared with you/);
 assert.throws(()=>addComment(a,employees[0].id,'  '),/2,000/);
 assert.throws(()=>addComment(a,employees[0].id,'x'.repeat(2001)),/2,000/);
 assert.equal(addComment(a,'michael','Thanks').comments?.length,1);
});
test('new comment counts clear per manager, keep total comments, and return for later replies', () => {
 const michael = managers[0];
 const rachel = managers.find(m=>m.store==='Downtown')!;
 const a = addComment(seed()[0],employees[0].id,'Can we review this before our shift?');
 assert.equal(newCommentCount(a,michael),1);
 assert.equal(newCommentCount(a,rachel),1);
 const read = markCommentsRead(a,michael.id);
 assert.equal(newCommentCount(read,michael),0);
 assert.equal(newCommentCount(read,rachel),1);
 assert.equal(read.comments?.length,1);
 assert.equal(markCommentsRead(read,michael.id),read);
 const replied = addComment(read,employees[1].id,'I have the same question.');
 assert.equal(newCommentCount(replied,michael),1);
 assert.equal(newCommentCount(replied,rachel),2);
 assert.equal(replied.comments?.length,2);
 assert.equal(newCommentCount(markCommentsRead(replied,rachel.id),michael),1);
});
test('own comments are not new and archived posts still accept comments', () => {
 const manager = managers[0];
 const own = addComment(seed()[0],manager.id,'Please ask your shift lead if anything is unclear.');
 assert.equal(newCommentCount(own,manager),0);
 assert.equal(newCommentCount(own,managers[1]),1);
 const archived = archiveAnnouncement(seed()[1],employees[0]);
 const next = addComment(archived,employees[0].id,'Thank you!');
 assert.equal(isArchived(next,employees[0]),true);
 assert.equal(next.comments?.length,1);
 assert.deepEqual(next.archivedBy,archived.archivedBy);
 assert.deepEqual(next.acknowledgments,archived.acknowledgments);
});
test('comments and manager read receipts persist across reloads', t => {
 const descriptor = Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 const saved = markCommentsRead(addComment(seed()[0],employees[0].id,'Saved comment'),managers[0].id);
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>JSON.stringify([saved])}});
 t.after(()=>{if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else Reflect.deleteProperty(globalThis,'localStorage');});
 const loaded = loadAnnouncements();
 assert.equal(loaded.error,false);
 assert.deepEqual(loaded.data[0],saved);
 assert.equal(newCommentCount(loaded.data[0],managers[0]),0);
 assert.equal(newCommentCount(loaded.data[0],managers[1]),1);
});

test('store managers and assistants can acknowledge Michael’s required updates for their stores', () => {
 const a = createAnnouncement('michael',draft);
 for (const manager of managers.filter(m=>m.store)) {
  const next = acknowledgeAsManager(a,manager.id);
  assert.ok(next.acknowledgments[manager.id]);
  assert.equal(acknowledgedCount(next,manager),1);
  assert.equal(acknowledgedCount(next,managers[0]),1);
  assert.equal(acknowledgeAsManager(next,manager.id),next);
  assert.deepEqual(a.acknowledgments,{});
  const person=employees.find(e=>e.id===manager.id)!;
  assert.equal(isArchived(next,person),true);
 }
});
test('manager acknowledgments cannot bypass store targeting or create confirmations for nonrecipients', () => {
 const a = createAnnouncement('michael',{...draft,stores:['Downtown']});
 const elsewhere=managers.find(m=>m.store==='Westside')!;
 assert.equal(acknowledgeAsManager(a,elsewhere.id),a);
 assert.equal(acknowledgeAsManager(a,'michael'),a);
 assert.equal(acknowledgeAsManager(a,employees[0].id),a);
 const info=createAnnouncement('michael',{...draft,important:false});
 assert.equal(acknowledgeAsManager(info,managers[1].id),info);
});
test('publishing automatically acknowledges only the store author of a required update', () => {
 for (const manager of managers.filter(m=>m.store)) {
  const a=createAnnouncement(manager.id,draft);
  assert.equal(a.authorId,manager.id);
  assert.deepEqual(a.acknowledgments,{[manager.id]:a.createdAt});
  assert.equal(acknowledgedCount(a),1);
  const colleague=managers.find(m=>m.store===manager.store&&m.id!==manager.id)!;
  assert.equal(a.acknowledgments[colleague.id],undefined);
  assert.deepEqual(createAnnouncement(manager.id,{...draft,important:false}).acknowledgments,{});
 }
 assert.deepEqual(createAnnouncement('michael',draft).acknowledgments,{});
});
test('existing store-authored posts receive an author acknowledgment on reload without losing history', t => {
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 const author=managers.find(m=>m.store==='Downtown')!;
 const a=addComment(createAnnouncement(author.id,draft),employees[0].id,'A question');
 a.acknowledgments={[employees[0].id]:'2026-11-09T00:00:00Z'};
 // Older posts identify their author by name.
 delete a.authorId;
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>JSON.stringify([a])}});
 t.after(()=>{if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else Reflect.deleteProperty(globalThis,'localStorage');});
 const loaded=loadAnnouncements();
 assert.equal(loaded.error,false);
 assert.equal(loaded.data[0].acknowledgments[author.id],a.createdAt);
 assert.equal(loaded.data[0].acknowledgments[employees[0].id],a.acknowledgments[employees[0].id]);
 assert.deepEqual(loaded.data[0].comments,a.comments);
 assert.deepEqual(loaded.data[0].stores,[author.store]);
});
