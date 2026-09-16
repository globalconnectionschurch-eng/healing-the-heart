(() => {
  const init = () => {
    const root = document.querySelector('#admin-root');
    const form = document.querySelector('#student-form');
    if (!root || !form || document.querySelector('#batch-import-trigger')) return;

    const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const heading = document.createElement('div');
    heading.className = 'batch-import-heading';
    heading.innerHTML = '<div><p class="eyebrow">Batch entry</p><h3>Add several students at once</h3><p>Paste a table or rows containing first name, last name, and email.</p></div><button type="button" class="button outline" id="batch-import-trigger">＋ Add batch</button>';
    form.parentNode.insertBefore(heading, form);

    const modal = document.createElement('div');
    modal.className = 'batch-import-modal';
    modal.id = 'batch-import-modal';
    modal.hidden = true;
    modal.innerHTML = `<div class="batch-import-backdrop" data-batch-close></div>
      <section class="batch-import-dialog" role="dialog" aria-modal="true" aria-labelledby="batch-import-title">
        <header class="batch-import-header"><div><p class="eyebrow">Batch import</p><h2 id="batch-import-title">Add multiple students</h2><p>Paste directly from a spreadsheet, Markdown table, or copied list. Formatting such as <code>|</code> and <code>\\@</code> is cleaned automatically.</p></div><button type="button" class="batch-import-close" data-batch-close aria-label="Close">×</button></header>
        <div class="batch-import-body">
          <label>Class<select id="batch-import-class"><option value="">Select a class</option></select></label>
          <label>Students<textarea id="batch-import-input" rows="11" placeholder="| April-May | O'Meara | asaessentials1@gmail.com |\n| Katherine | Levitt | katherinedeckerlevitt@gmail.com |\n| William | Haye | willhaye82@gmail.com |</textarea></label>
          <div id="batch-import-preview" class="batch-import-preview"><span class="field-note">Paste your students above to preview them.</span></div>
          <label>Email action<select id="batch-import-action"><option value="none">Add students with no other action</option><option value="registration">Add students + send registration email</option><option value="custom">Add students + send the same customer email</option></select></label>
          <div id="batch-import-custom" hidden><label>Subject<input id="batch-import-subject" /></label><label>Message<textarea id="batch-import-body" rows="7"></textarea></label><p class="field-note">Available variables include {{firstName}}, {{classTitle}}, {{verificationCode}}, {{registrationLink}}, {{locationName}}, {{locationAddress}}, {{schedule}}, and {{dateRange}}.</p></div>
        </div>
        <footer class="batch-import-footer"><span id="batch-import-result" class="field-note"></span><div><button type="button" class="button outline" data-batch-close>Cancel</button><button type="button" class="button primary" id="batch-import-submit">Import students</button></div></footer>
      </section>`;
    root.parentNode.appendChild(modal);

    const trigger = document.querySelector('#batch-import-trigger');
    const closeEls = modal.querySelectorAll('[data-batch-close]');
    const classSelect = document.querySelector('#batch-import-class');
    const input = document.querySelector('#batch-import-input');
    const preview = document.querySelector('#batch-import-preview');
    const action = document.querySelector('#batch-import-action');
    const custom = document.querySelector('#batch-import-custom');
    const result = document.querySelector('#batch-import-result');

    const parse = (text) => text.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
      if (/^\|?\s*:?-{2,}/.test(line)) return null;
      let cells = line.includes('|') ? line.split('|').map(x => x.trim()).filter(Boolean) : line.includes('\t') ? line.split('\t').map(x => x.trim()) : line.split(/\s{2,}/).map(x => x.trim());
      cells = cells.map(x => x.replace(/\\@/g, '@').trim());
      const emailIndex = cells.findIndex(x => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x));
      if (emailIndex < 0) return null;
      const email = cells[emailIndex].toLowerCase();
      const names = cells.filter((_, index) => index !== emailIndex && !/^(first name|last name|name|email)$/i.test(cells[index]));
      const name = names.slice(0, 2).join(' ').trim() || email;
      return { name, email };
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

    document.querySelector('#batch-import-submit').addEventListener('click', async () => {
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
      const submit = document.querySelector('#batch-import-submit');
      submit.disabled = true; result.textContent = 'Importing…';
      try {
        const response = await fetch('/api/admin/students', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify(payload) });
        const data = await response.json();
        if (!response.ok) { result.textContent = data.error || 'Import failed.'; return; }
        result.textContent = `Imported ${data.addedCount} student${data.addedCount === 1 ? '' : 's'}${data.failedCount ? `; ${data.failedCount} failed.` : '.'}`;
        input.value = ''; updatePreview();
        if (document.querySelector('#student-class').value === classId) document.querySelector('#student-class').dispatchEvent(new Event('change'));
        document.querySelector('#manual-class').value = classId;
      } catch { result.textContent = 'Unable to complete the import.'; }
      finally { submit.disabled = false; }
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
