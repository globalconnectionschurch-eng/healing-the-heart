(() => {
  const init = () => {
    const root = document.querySelector('#admin-root');
    const form = document.querySelector('#student-form');
    const modal = document.querySelector('#batch-import-modal');
    if (!root || !form || !modal) return;
    const trigger = document.querySelector('#batch-import-trigger');
    const closeEls = modal.querySelectorAll('[data-batch-close]');
    const classSelect = document.querySelector('#batch-import-class');
    const input = document.querySelector('#batch-import-input');
    const preview = document.querySelector('#batch-import-preview');
    const action = document.querySelector('#batch-import-action');
    const custom = document.querySelector('#batch-import-custom');
    const result = document.querySelector('#batch-import-result');
    const submit = document.querySelector('#batch-import-submit');
    if (!trigger || !classSelect || !input || !preview || !action || !custom || !result || !submit || trigger.dataset.ready === 'true') return;
    trigger.dataset.ready = 'true';

    const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
    const parse = (text) => text.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
      if (/^\|?\s*:?-{2,}/.test(line)) return null;
      let cells = line.includes('|') ? line.split('|').map(x => x.trim()).filter(Boolean) : line.includes('\t') ? line.split('\t').map(x => x.trim()) : line.split(/\s{2,}/).map(x => x.trim());
      cells = cells.map(x => x.replace(/\\@/g, '@').trim());
      const emailIndex = cells.findIndex(x => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x));
      if (emailIndex < 0) return null;
      const email = cells[emailIndex].toLowerCase();
      const names = cells.filter((_, index) => index !== emailIndex && !/^(first name|last name|name|email)$/i.test(cells[index]));
      return { name: names.slice(0, 2).join(' ').trim() || email, email };
    }).filter(Boolean);

    const syncClasses = () => {
      const source = document.querySelector('#manual-class');
      if (!source) return;
      classSelect.innerHTML = source.innerHTML;
      classSelect.value = source.value;
    };
    const updatePreview = () => {
      const items = parse(input.value);
      if (!items.length) { preview.innerHTML = '<span class="field-note">Paste your students above to preview them.</span>'; return; }
      preview.innerHTML = `<div class="batch-import-count">${items.length} student${items.length === 1 ? '' : 's'} ready to import</div><div class="batch-import-table-wrap"><table><thead><tr><th>Name</th><th>Email</th></tr></thead><tbody>${items.map(item => `<tr><td>${esc(item.name)}</td><td>${esc(item.email)}</td></tr>`).join('')}</tbody></table></div>`;
    };
    const open = () => { syncClasses(); result.textContent = ''; modal.hidden = false; document.body.classList.add('batch-import-open'); updatePreview(); setTimeout(() => input.focus(), 0); };
    const close = () => { modal.hidden = true; document.body.classList.remove('batch-import-open'); };

    trigger.addEventListener('click', open);
    closeEls.forEach(el => el.addEventListener('click', close));
    input.addEventListener('input', updatePreview);
    action.addEventListener('change', () => { custom.hidden = action.value !== 'custom'; });

    submit.addEventListener('click', async () => {
      const students = parse(input.value);
      const classId = classSelect.value;
      if (!classId) { result.textContent = 'Select a class.'; return; }
      if (!students.length) { result.textContent = 'No valid student rows found.'; return; }
      const emailAction = action.value;
      const payload = { students, classId, emailAction };
      if (emailAction === 'custom') {
        payload.subject = document.querySelector('#batch-import-subject').value.trim();
        payload.body = document.querySelector('#batch-import-body').value.trim();
        if (!payload.subject || !payload.body) { result.textContent = 'Enter a subject and message.'; return; }
      }
      submit.disabled = true;
      result.textContent = `Importing ${students.length} student${students.length === 1 ? '' : 's'}…`;
      try {
        const response = await fetch('/api/admin/students', { method: 'POST', headers: { 'content-type':'application/json', 'cache-control':'no-cache' }, body: JSON.stringify(payload), credentials: 'same-origin' });
        const text = await response.text();
        let data = {};
        try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text || `Server returned ${response.status}.` }; }
        if (!response.ok || data.ok === false) { result.textContent = data.error || `Import failed (HTTP ${response.status}).`; return; }
        const added = data.addedCount ?? students.length;
        result.textContent = `Imported ${added} student${added === 1 ? '' : 's'}${data.failedCount ? `; ${data.failedCount} failed.` : '.'}`;
        input.value = '';
        updatePreview();
        const rosterClass = document.querySelector('#student-class');
        if (rosterClass && rosterClass.value === classId) rosterClass.dispatchEvent(new Event('change'));
        const manualClass = document.querySelector('#manual-class');
        if (manualClass) manualClass.value = classId;
      } catch (error) {
        result.textContent = `Unable to complete the import: ${error?.message || 'network error'}.`;
      } finally { submit.disabled = false; }
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
