(() => {
  const root = document.querySelector('#admin-root');
  const form = document.querySelector('#student-form');
  if (!root || !form || document.querySelector('#batch-import-trigger')) return;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>\"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' })[char]);

  const parseRows = (raw) => {
    const rows = [];
    for (const line of String(raw || '').split(/\r?\n/)) {
      let cells = line.trim();
      if (!cells || /^\|?\s*:?-{2,}/.test(cells)) continue;
      if (cells.includes('|')) {
        cells = cells.replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
      } else if (cells.includes('\t')) {
        cells = cells.split('\t').map((cell) => cell.trim());
      } else {
        cells = cells.split(/\s{2,}/).map((cell) => cell.trim());
      }
      cells = cells.map((cell) => cell.replace(/\\@/g, '@').trim()).filter(Boolean);
      const emailIndex = cells.findIndex((cell) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cell));
      if (emailIndex < 0) continue;
      const email = cells[emailIndex].toLowerCase();
      const before = cells.slice(0, emailIndex).filter((cell) => !/^(first\s*name|last\s*name|name|email)$/i.test(cell));
      const name = before.join(' ').trim();
      if (!name || /^(first\s*name|last\s*name|name)$/i.test(name)) continue;
      rows.push({ name, email });
    }
    const seen = new Set();
    return rows.filter((row) => {
      if (seen.has(row.email)) return false;
      seen.add(row.email);
      return true;
    });
  };

  const heading = document.createElement('div');
  heading.className = 'batch-import-heading';
  heading.innerHTML = '<div><p class="eyebrow">Bulk entry</p><h3>Add several students at once</h3><p class="field-note">Paste a table or a list of names and email addresses, review it, then import everyone into the selected class.</p></div>';
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.id = 'batch-import-trigger';
  trigger.className = 'button outline';
  trigger.textContent = '＋ Add batch';
  heading.appendChild(trigger);
  form.parentNode.insertBefore(heading, form);

  const overlay = document.createElement('div');
  overlay.className = 'batch-import-modal';
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="batch-import-backdrop" data-batch-close></div>
    <section class="batch-import-dialog" role="dialog" aria-modal="true" aria-labelledby="batch-import-title">
      <div class="batch-import-header">
        <div><p class="eyebrow">Bulk entry</p><h2 id="batch-import-title">Add several students at once</h2><p>Paste your names and email addresses below. The preview updates as you type.</p></div>
        <button type="button" class="batch-import-close" data-batch-close aria-label="Close">×</button>
      </div>
      <div class="batch-import-body">
        <label>Class<select id="batch-import-class"><option value="">Select a class</option></select></label>
        <label>Students<textarea id="batch-import-input" rows="10" placeholder="| First Name | Last Name | Email |\n| April-May | O'Meara | asaessentials1@gmail.com |\n| Katherine | Levitt | katherinedeckerlevitt@gmail.com |</textarea><span class="field-note">Markdown tables, tabs, or columns separated by multiple spaces are supported.</span></label>
        <div class="batch-import-preview"><div class="batch-import-count" id="batch-import-count">0 students detected</div><div class="batch-import-table-wrap"><table><thead><tr><th>Name</th><th>Email</th></tr></thead><tbody id="batch-import-preview-body"><tr><td colspan="2" class="field-note">Paste your students above to preview them.</td></tr></tbody></table></div></div>
        <label>Email action<select id="batch-import-action"><option value="none">Add students with no other action</option><option value="registration">Add students + send registration email</option><option value="custom">Add students + send the same customer email</option></select></label>
        <div id="batch-import-custom" hidden>
          <label>Subject<input id="batch-import-subject" /></label>
          <label>Message<textarea id="batch-import-body" rows="7" placeholder="Write the email to send to everyone in this batch…"></textarea></label>
        </div>
        <p id="batch-import-result" class="field-note"></p>
      </div>
      <div class="batch-import-footer"><button type="button" class="button outline" data-batch-close>Cancel</button><button type="button" class="button primary" id="batch-import-submit">Import students</button></div>
    </section>`;
  document.body.appendChild(overlay);

  const classSelect = overlay.querySelector('#batch-import-class');
  const input = overlay.querySelector('#batch-import-input');
  const action = overlay.querySelector('#batch-import-action');
  const custom = overlay.querySelector('#batch-import-custom');
  const previewBody = overlay.querySelector('#batch-import-preview-body');
  const count = overlay.querySelector('#batch-import-count');
  const result = overlay.querySelector('#batch-import-result');
  const submit = overlay.querySelector('#batch-import-submit');

  const syncClasses = () => {
    const source = document.querySelector('#manual-class');
    if (!source) return;
    classSelect.innerHTML = source.innerHTML;
    classSelect.value = source.value || '';
  };

  const renderPreview = () => {
    const students = parseRows(input.value);
    count.textContent = `${students.length} student${students.length === 1 ? '' : 's'} detected`;
    previewBody.innerHTML = students.length
      ? students.map((student) => `<tr><td>${escapeHtml(student.name)}</td><td>${escapeHtml(student.email)}</td></tr>`).join('')
      : '<tr><td colspan="2" class="field-note">Paste your students above to preview them.</td></tr>';
    return students;
  };

  const close = () => { overlay.hidden = true; };
  const open = () => {
    syncClasses();
    result.textContent = '';
    renderPreview();
    overlay.hidden = false;
    input.focus();
  };

  trigger.addEventListener('click', open);
  overlay.addEventListener('click', (event) => {
    if (event.target.closest('[data-batch-close]')) close();
  });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !overlay.hidden) close(); });
  input.addEventListener('input', renderPreview);
  action.addEventListener('change', () => { custom.hidden = action.value !== 'custom'; });
  classSelect.addEventListener('change', () => {
    const manual = document.querySelector('#manual-class');
    if (manual) manual.value = classSelect.value;
  });

  submit.addEventListener('click', async () => {
    const students = renderPreview();
    const classId = classSelect.value;
    if (!classId) { result.textContent = 'Choose a class first.'; return; }
    if (!students.length) { result.textContent = 'Paste at least one valid name and email address.'; return; }
    if (action.value === 'custom' && (!overlay.querySelector('#batch-import-subject').value.trim() || !overlay.querySelector('#batch-import-body').value.trim())) {
      result.textContent = 'Enter a subject and message for the customer email.';
      return;
    }

    submit.disabled = true;
    submit.textContent = 'Importing…';
    result.textContent = 'Adding students and processing the selected email action…';
    try {
      const payload = { students, classId, emailAction: action.value };
      if (action.value === 'custom') {
        payload.subject = overlay.querySelector('#batch-import-subject').value.trim();
        payload.body = overlay.querySelector('#batch-import-body').value.trim();
      }
      const response = await fetch('/api/admin/students', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'The batch import failed.');
      result.textContent = `Imported ${data.addedCount ?? students.length} student${(data.addedCount ?? students.length) === 1 ? '' : 's'}${data.failedCount ? `; ${data.failedCount} failed.` : '.'}`;
      if (typeof window.loadStudents === 'function') window.loadStudents(classId);
      else document.querySelector('#student-class')?.dispatchEvent(new Event('change'));
      setTimeout(close, 900);
    } catch (error) {
      result.textContent = error instanceof Error ? error.message : 'The batch import failed.';
    } finally {
      submit.disabled = false;
      submit.textContent = 'Import students';
    }
  });
})();
