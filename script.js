marked.setOptions({ gfm:true, breaks:true });

const $ = sel => document.querySelector(sel);
const editor = $('#editor');
const preview = $('#preview');
const notesListEl = $('#notesList');

const STORE_KEY = 'notepad_v1_notes';
const ACTIVE_KEY = 'notepad_v1_active';
const THEME_KEY = 'notepad_v1_theme';

function uid(){ return 'n_' + Date.now() + '_' + Math.random().toString(36).slice(2,7); }

function loadNotes(){
  try{ return JSON.parse(localStorage.getItem(STORE_KEY)) || []; }catch(e){ return []; }
}
function saveNotes(notes){ localStorage.setItem(STORE_KEY, JSON.stringify(notes)); }

let notes = loadNotes();
if(notes.length === 0){
  notes.push({
    id: uid(),
    title: 'Catatan Pertama',
    content: 'Nama : Ahmad Riko Dyansyah\nNBI : 1462400002\nSaya ingin belajar coding\n\n- [ ] Coba fitur checklist\n- [ ] Coba mode gelap 🌙\n- [ ] Cetak jadi PDF',
    updated: Date.now()
  });
  saveNotes(notes);
}
let activeId = localStorage.getItem(ACTIVE_KEY) || notes[0].id;
if(!notes.find(n=>n.id===activeId)) activeId = notes[0].id;

function currentNote(){ return notes.find(n=>n.id===activeId); }

function renderNotesList(filter=''){
  notesListEl.innerHTML = '';
  const f = filter.trim().toLowerCase();
  const sorted = [...notes].sort((a,b)=>b.updated-a.updated);
  sorted.filter(n => !f || n.title.toLowerCase().includes(f) || n.content.toLowerCase().includes(f))
  .forEach(n=>{
    const div = document.createElement('div');
    div.className = 'note-item' + (n.id===activeId ? ' active':'');
    div.innerHTML = `<div class="note-title"></div><div class="note-preview"></div><button class="del" title="Hapus">✕</button>`;
    div.querySelector('.note-title').textContent = n.title || 'Tanpa judul';
    div.querySelector('.note-preview').textContent = (n.content||'').replace(/\n/g,' ').slice(0,60) || 'Kosong';
    div.addEventListener('click', (e)=>{
      if(e.target.closest('.del')) return;
      activeId = n.id;
      localStorage.setItem(ACTIVE_KEY, activeId);
      loadIntoEditor();
      renderNotesList($('#sidebarSearch').value);
      if(window.innerWidth <= 820) closeSidebar();
    });
    div.querySelector('.del').addEventListener('click',(e)=>{
      e.stopPropagation();
      if(notes.length===1){ showToast('Minimal harus ada 1 catatan'); return; }
      if(!confirm('Hapus catatan ini?')) return;
      notes = notes.filter(x=>x.id!==n.id);
      saveNotes(notes);
      if(activeId === n.id){ activeId = notes[0].id; localStorage.setItem(ACTIVE_KEY, activeId); loadIntoEditor(); }
      renderNotesList($('#sidebarSearch').value);
    });
    notesListEl.appendChild(div);
  });
}

function loadIntoEditor(){
  const n = currentNote();
  editor.value = n.content;
  updateCounts();
  renderPreviewIfNeeded();
}

function deriveTitle(content){
  const firstLine = (content.split('\n')[0] || '').replace(/^#+\s*/,'').trim();
  return firstLine ? firstLine.slice(0,40) : 'Tanpa judul';
}

let saveTimer;
function scheduleSave(){
  clearTimeout(saveTimer);
  saveTimer = setTimeout(()=>{
    const n = currentNote();
    n.content = editor.value;
    n.title = deriveTitle(editor.value);
    n.updated = Date.now();
    saveNotes(notes);
    renderNotesList($('#sidebarSearch').value);
  }, 350);
}

function updateCounts(){
  const text = editor.value;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;
  const lines = text.split('\n').length;
  $('#wordCount').textContent = `${words} kata`;
  $('#charCount').textContent = `${chars} karakter`;
  $('#lineCount').textContent = `${lines} baris`;
}

editor.addEventListener('input', ()=>{ updateCounts(); scheduleSave(); renderPreviewIfNeeded(); });

/* ---------- Toolbar formatting ---------- */
function wrapSelection(before, after=before){
  const start = editor.selectionStart, end = editor.selectionEnd;
  const val = editor.value;
  const selected = val.slice(start,end) || '';
  editor.value = val.slice(0,start) + before + selected + after + val.slice(end);
  editor.focus();
  const cursor = selected ? start + before.length + selected.length + after.length : start + before.length;
  editor.selectionStart = editor.selectionEnd = cursor;
  editor.dispatchEvent(new Event('input'));
}
function linePrefix(prefix){
  const start = editor.selectionStart;
  const val = editor.value;
  let lineStart = val.lastIndexOf('\n', start-1) + 1;
  editor.value = val.slice(0,lineStart) + prefix + val.slice(lineStart);
  editor.focus();
  editor.selectionStart = editor.selectionEnd = start + prefix.length;
  editor.dispatchEvent(new Event('input'));
}
function insertAtCursor(text){
  const start = editor.selectionStart, end = editor.selectionEnd;
  const val = editor.value;
  editor.value = val.slice(0,start) + text + val.slice(end);
  editor.focus();
  editor.selectionStart = editor.selectionEnd = start + text.length;
  editor.dispatchEvent(new Event('input'));
}

document.querySelectorAll('#toolbar [data-cmd]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const cmd = btn.dataset.cmd;
    if(cmd==='bold') wrapSelection('**');
    else if(cmd==='italic') wrapSelection('_');
    else if(cmd==='h') linePrefix('## ');
    else if(cmd==='check') linePrefix('- [ ] ');
    else if(cmd==='bullet') linePrefix('- ');
    else if(cmd==='number') linePrefix('1. ');
    else if(cmd==='code') wrapSelection('`');
    else if(cmd==='table') insertAtCursor('\n| Kolom 1 | Kolom 2 |\n| --- | --- |\n| Isi | Isi |\n');
  });
});

editor.addEventListener('keydown', (e)=>{
  if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='b'){ e.preventDefault(); wrapSelection('**'); }
  if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='i'){ e.preventDefault(); wrapSelection('_'); }
});

/* ---------- Emoji picker ---------- */
const EMOJIS = ['😀','😁','😂','🤣','😊','😍','😘','😎','🤔','😴','😢','😭','😡','👍','👎','👏','🙏','💪','✍️','📌','📎','📝','✅','❌','⭐','🔥','💡','🎯','📅','⏰','🚀','🎉','❤️','💛','💚','💙','💜','🖤','✨','🌙','☀️','☕','📖','🔖','📚','🏆','🎓','💻','📊'];
const emojiGrid = $('#emojiGrid');
EMOJIS.forEach(em=>{
  const b = document.createElement('button');
  b.textContent = em;
  b.addEventListener('click', ()=>{ insertAtCursor(em); });
  emojiGrid.appendChild(b);
});
$('#btnEmoji').addEventListener('click', (e)=>{
  e.stopPropagation();
  $('#emojiPop').classList.toggle('open');
  $('#searchPop').classList.remove('open');
});

/* ---------- Search in text ---------- */
$('#btnSearchTxt').addEventListener('click', (e)=>{
  e.stopPropagation();
  $('#searchPop').classList.toggle('open');
  $('#emojiPop').classList.remove('open');
  if($('#searchPop').classList.contains('open')) $('#findInput').focus();
});
$('#findInput').addEventListener('input', (e)=>{
  const q = e.target.value;
  if(!q) return;
  const idx = editor.value.toLowerCase().indexOf(q.toLowerCase());
  if(idx>-1){
    editor.focus();
    editor.selectionStart = idx;
    editor.selectionEnd = idx + q.length;
  }
});
document.addEventListener('click', ()=>{
  $('#emojiPop').classList.remove('open');
  $('#searchPop').classList.remove('open');
});

/* ---------- Preview / Edit toggle ---------- */
function checklistClickable(html){
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  const boxes = wrapper.querySelectorAll('input[type=checkbox]');
  boxes.forEach((box, idx)=>{
    box.disabled = false;
    box.dataset.idx = idx;
  });
  return wrapper.innerHTML;
}
function renderPreviewIfNeeded(){
  if(preview.classList.contains('show')){
    preview.innerHTML = checklistClickable(marked.parse(editor.value || ''));
    attachCheckboxHandlers();
  }
}
function attachCheckboxHandlers(){
  const boxes = preview.querySelectorAll('input[type=checkbox]');
  let taskLineIdxs = [];
  const lines = editor.value.split('\n');
  lines.forEach((l,i)=>{ if(/^\s*-\s\[[ xX]\]/.test(l)) taskLineIdxs.push(i); });
  boxes.forEach((box, idx)=>{
    box.addEventListener('click', ()=>{
      const lineIdx = taskLineIdxs[idx];
      if(lineIdx===undefined) return;
      const lines2 = editor.value.split('\n');
      const line = lines2[lineIdx];
      lines2[lineIdx] = box.checked ? line.replace('[ ]','[x]') : line.replace(/\[x\]/i,'[ ]');
      editor.value = lines2.join('\n');
      editor.dispatchEvent(new Event('input'));
    });
  });
}
$('#btnEdit').addEventListener('click', ()=>{
  $('#btnEdit').classList.add('active');
  $('#btnPreview').classList.remove('active');
  preview.classList.remove('show');
  editor.classList.remove('hide');
});
$('#btnPreview').addEventListener('click', ()=>{
  $('#btnPreview').classList.add('active');
  $('#btnEdit').classList.remove('active');
  preview.classList.add('show');
  editor.classList.add('hide');
  renderPreviewIfNeeded();
});

/* ---------- New note / sidebar ---------- */
$('#btnNewNote').addEventListener('click', ()=>{
  const n = { id: uid(), title:'Catatan Baru', content:'', updated: Date.now() };
  notes.push(n);
  saveNotes(notes);
  activeId = n.id;
  localStorage.setItem(ACTIVE_KEY, activeId);
  loadIntoEditor();
  renderNotesList();
  editor.focus();
});
$('#sidebarSearch').addEventListener('input', (e)=> renderNotesList(e.target.value));

const sidebar = $('#sidebar');
function closeSidebar(){ sidebar.classList.remove('open'); }
$('#btnMenu').addEventListener('click', (e)=>{ e.stopPropagation(); sidebar.classList.toggle('open'); });

/* ---------- Theme ---------- */
function applyTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
  document.body.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  const icon = $('#themeIcon');
  if(theme==='dark'){
    icon.innerHTML = '<path d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z"/>';
  } else {
    icon.innerHTML = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';
  }
}
$('#btnTheme').addEventListener('click', ()=>{
  const cur = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(cur);
});
applyTheme(localStorage.getItem(THEME_KEY) || 'light');

/* ---------- Export actions ---------- */
function downloadFile(filename, content, mime){
  const blob = new Blob([content], {type: mime});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function showToast(msg){
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=> t.classList.remove('show'), 1800);
}

$('#btnTxt').addEventListener('click', ()=>{
  const n = currentNote();
  downloadFile((n.title||'catatan') + '.txt', editor.value, 'text/plain');
  showToast('File .txt diunduh');
});
$('#btnMd').addEventListener('click', ()=>{
  const n = currentNote();
  downloadFile((n.title||'catatan') + '.md', editor.value, 'text/markdown');
  showToast('File .md diunduh');
});
$('#btnCopy').addEventListener('click', async ()=>{
  try{
    await navigator.clipboard.writeText(editor.value);
    showToast('Disalin ke clipboard');
  }catch(e){ showToast('Gagal menyalin'); }
});
$('#btnClear').addEventListener('click', ()=>{
  if(!editor.value.trim()) return;
  if(!confirm('Hapus semua isi catatan ini?')) return;
  editor.value = '';
  editor.dispatchEvent(new Event('input'));
  showToast('Isi catatan dihapus');
});

/* ---------- Print / Save as PDF ---------- */
$('#btnPrint').addEventListener('click', ()=>{
  const n = currentNote();
  $('#printTitle').textContent = n.title || 'Catatan';
  $('#printMeta').textContent = 'Dicetak pada ' + new Date().toLocaleString('id-ID');
  $('#printBody').innerHTML = marked.parse(editor.value || '');
  document.title = (n.title || 'Catatan') + ' — Notepad';
  window.print();
});

/* ---------- Init ---------- */
renderNotesList();
loadIntoEditor();
