
(() => {
  const API_BASE = "http://127.0.0.1:8000";
  const $ = (id) => document.getElementById(id);

  const state = {
    recipients: [],
    jobs: [],
    poll: null,
    toast: null,
    activeId: null,
  };

  $("apiUrl").textContent = API_BASE;

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]));

  function toast(message) {
    $("toast").textContent = message;
    $("toast").classList.add("show");
    clearTimeout(state.toast);
    state.toast = setTimeout(
      () => $("toast").classList.remove("show"),
      3200
    );
  }

  async function api(path, options = {}) {
    let res;

    try {
      res = await fetch(API_BASE + path, {
        ...options,
        headers: {
          ...(options.body
            ? { "Content-Type": "application/json" }
            : {}),
          ...(options.headers || {}),
        },
      });
    } catch {
      throw new Error(
        `Cannot connect to ${API_BASE}. Check that FastAPI is running and CORS is enabled.`
      );
    }

    const type = res.headers.get("content-type") || "";
    const data = type.includes("application/json")
      ? await res.json()
      : await res.text();

    if (!res.ok) {
      throw new Error(
        typeof data === "object"
          ? (data.detail || JSON.stringify(data))
          : data
      );
    }

    return data;
  }

  async function checkApi() {
    try {
      const r = await fetch(API_BASE + "/health");
      if (!r.ok) throw new Error("API unavailable");

      $("connDot").classList.add("online");
      $("connText").textContent = "API connected";
    } catch {
      $("connDot").classList.remove("online");
      $("connText").textContent = "API not connected";
    }
  }

  function setView(view) {
    document.querySelectorAll(".nav").forEach((b) =>
      b.classList.toggle("active", b.dataset.view === view)
    );

    $("createView").classList.toggle("active", view === "create");
    $("activityView").classList.toggle("active", view === "activity");
    $("crumb").textContent =
      view === "create" ? "Create certificates" : "Job activity";

    if (view === "activity") renderActivity();
  }

  document.querySelectorAll(".nav").forEach((b) =>
    b.addEventListener("click", () => setView(b.dataset.view))
  );

  function renderRecipients() {
    $("rows").innerHTML = state.recipients
      .map(
        (r, i) => `
          <tr>
            <td>
              <input
                aria-label="Recipient ${i + 1} name"
                data-i="${i}"
                data-f="name"
                placeholder="Full name"
                maxlength="200"
                value="${esc(r.name)}"
              >
            </td>
            <td>
              <input
                type="email"
                aria-label="Recipient ${i + 1} email"
                data-i="${i}"
                data-f="email"
                placeholder="name@example.com"
                maxlength="254"
                value="${esc(r.email)}"
              >
            </td>
            <td>
              <button
                type="button"
                class="remove"
                data-remove="${i}"
                aria-label="Remove recipient"
              >×</button>
            </td>
          </tr>
        `
      )
      .join("");

    $("count").textContent =
      `${state.recipients.length} recipient` +
      (state.recipients.length === 1 ? "" : "s");
  }

  $("rows").addEventListener("input", (e) => {
    const input = e.target.closest("[data-i]");
    if (input) {
      state.recipients[Number(input.dataset.i)][input.dataset.f] =
        input.value;
    }
  });

  $("rows").addEventListener("click", (e) => {
    const button = e.target.closest("[data-remove]");
    if (button) {
      state.recipients.splice(Number(button.dataset.remove), 1);
      renderRecipients();
    }
  });

  $("add").addEventListener("click", () => {
    state.recipients.push({ name: "", email: "" });
    renderRecipients();
  });

  function parseCSV(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];

      if (c === '"') {
        if (quoted && text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = !quoted;
        }
      } else if (c === "," && !quoted) {
        row.push(cell.trim());
        cell = "";
      } else if ((c === "\n" || c === "\r") && !quoted) {
        if (c === "\r" && text[i + 1] === "\n") i++;

        row.push(cell.trim());
        cell = "";

        if (row.some((value) => value)) rows.push(row);
        row = [];
      } else {
        cell += c;
      }
    }

    if (cell.length || row.length) {
      row.push(cell.trim());
      if (row.some((value) => value)) rows.push(row);
    }

    if (rows.length < 2) {
      throw new Error(
        "CSV needs a header and at least one recipient."
      );
    }

    const headers = rows[0].map((value) =>
      value.replace(/^\uFEFF/, "").toLowerCase()
    );

    const nameIndex = headers.indexOf("name");
    const emailIndex = headers.indexOf("email");

    if (nameIndex < 0 || emailIndex < 0) {
      throw new Error("CSV headers must include name,email.");
    }

    const recipients = rows
      .slice(1)
      .map((r) => ({
        name: r[nameIndex] || "",
        email: r[emailIndex] || "",
      }))
      .filter((r) => r.name || r.email);

    if (!recipients.length) {
      throw new Error("No recipient rows found.");
    }

    return recipients;
  }

  async function importFile(file) {
    if (!file) return;

    try {
      state.recipients = parseCSV(await file.text());
      renderRecipients();

      $("csvStatus").textContent =
        `Imported ${state.recipients.length} recipients from ${file.name}`;

      toast("CSV imported successfully.");
    } catch (e) {
      toast(e.message);
    } finally {
      $("csv").value = "";
    }
  }

  $("browse").addEventListener("click", () => $("csv").click());

  $("csv").addEventListener("change", (e) =>
    importFile(e.target.files[0])
  );

  ["dragenter", "dragover"].forEach((eventName) => {
    $("drop").addEventListener(eventName, (e) => {
      e.preventDefault();
      $("drop").classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    $("drop").addEventListener(eventName, (e) => {
      e.preventDefault();
      $("drop").classList.remove("dragover");
    });
  });

  $("drop").addEventListener("drop", (e) =>
    importFile(e.dataTransfer.files[0])
  );

  $("template").addEventListener("click", () => {
    const csv =
      "name,email\r\n" +
      "Alice Johnson,alice@example.com\r\n" +
      "Bob Smith,bob@example.com\r\n";

    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" })
    );

    const a = document.createElement("a");
    a.href = url;
    a.download = "certiflow-recipients-template.csv";
    a.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  const norm = (s) => {
    const value = String(s || "").toLowerCase();
    return ["completed", "failed", "pending"].includes(value)
      ? value
      : "pending";
  };

  function getDownloadUrl(certificate) {
    const status = norm(certificate.status);

    if (certificate.download_url) {
      const url = certificate.download_url;

      // Support backend URLs such as /certificates/123
      // as well as /jobs/certificates/123.
      if (url.startsWith("/certificates/")) {
        return "/jobs" + url;
      }

      return url;
    }

    if (status === "completed" && certificate.id != null) {
      return `/jobs/certificates/${certificate.id}`;
    }

    return null;
  }

  function renderResults(job) {
    const certificates = job.certificates || [];
    const total = Number(job.total ?? certificates.length);
    const completed = Number(
      job.completed ??
        certificates.filter((c) => norm(c.status) === "completed").length
    );
    const failed = Number(
      job.failed ??
        certificates.filter((c) => norm(c.status) === "failed").length
    );

    const percent = Number(
      job.progress_percent ??
        (total
          ? Math.round(((completed + failed) / total) * 100)
          : 100)
    );

    const status = norm(job.status);
    const safePercent = Math.max(0, Math.min(100, percent));

    $("results").hidden = false;
    $("jobStatus").className = "status " + status;
    $("jobStatus").textContent = (job.status || "pending").replace(
      /_/g,
      " "
    );

    $("jobSubtitle").textContent = `Job ${job.job_id || ""}`;

    $("progressLabel").textContent =
      status === "completed"
        ? "All recipients have been processed."
        : status === "failed"
          ? "This job finished with an error."
          : "Generating your certificates…";

    $("percent").textContent = `${safePercent}%`;
    $("progressFill").style.width = `${safePercent}%`;

    $("total").textContent = total;
    $("completed").textContent = completed;
    $("failed").textContent = failed;

    $("resultRows").innerHTML = certificates
      .map((certificate) => {
        const certificateStatus = norm(certificate.status);
        const url = getDownloadUrl(certificate);

        const downloadLink = url
          ? `<a class="download" href="${esc(API_BASE + url)}" target="_blank" rel="noopener">↓ Download PDF</a>`
          : `<span class="download disabled">Not ready</span>`;

        return `
          <tr>
            <td>
              ${esc(certificate.recipient_name || "Unnamed")}
              <br>
              <span style="font-size:9px;color:#a19bac;font-weight:400">
                ${esc(certificate.recipient_email || "")}
              </span>
            </td>
            <td>
              <span class="small-status ${certificateStatus}">
                ${esc((certificate.status || "pending").replace(/_/g, " "))}
              </span>
            </td>
            <td>
              ${esc(
                certificate.error_message ||
                  (certificateStatus === "completed"
                    ? "PDF ready"
                    : certificateStatus === "failed"
                      ? "Generation failed"
                      : "Waiting to process")
              )}
            </td>
            <td>${downloadLink}</td>
          </tr>
        `;
      })
      .join("");

    $("footnote").textContent =
      status === "completed"
        ? "Your batch is ready. Download each PDF above."
        : status === "failed"
          ? "Review failed recipients and correct their details."
          : "Keep this page open while the batch runs.";

    const entry = state.jobs.find(
      (item) => item.job_id === (job.job_id || state.activeId)
    );

    if (entry) {
      Object.assign(entry, job, {
        updatedAt: new Date().toISOString(),
      });
    }

    renderActivity();
  }

  async function refreshJob(id) {
    const job = await api(`/jobs/${encodeURIComponent(id)}`);
    job.job_id = job.job_id || id;

    renderResults(job);

    if (["completed", "failed"].includes(norm(job.status))) {
      clearInterval(state.poll);
      state.poll = null;
    }

    return job;
  }

  function showError(message) {
    $("error").textContent = message;
    $("error").hidden = false;
    $("error").scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }

  $("jobForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("error").hidden = true;

    const course = $("course").value.trim();

    const recipients = state.recipients.map((r) => ({
      name: r.name.trim(),
      email: r.email.trim(),
    }));

    if (!course) {
      return showError("Enter a course or achievement name.");
    }

    if (!recipients.length) {
      return showError("Add at least one recipient or import a CSV.");
    }

    const seen = new Set();

    // FIXED: validates email syntax correctly.
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];

      if (!recipient.name || !recipient.email) {
        return showError(
          `Recipient ${i + 1} needs both name and email.`
        );
      }

      if (
        recipient.email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.email)
      ) {
        return showError(
          `"${recipient.email}" is not a valid email address.`
        );
      }

      const normalizedEmail = recipient.email.toLowerCase();

      if (seen.has(normalizedEmail)) {
        return showError(`Duplicate email: ${recipient.email}`);
      }

      seen.add(normalizedEmail);
    }

    const button = $("generate");
    button.disabled = true;
    button.querySelector("span").textContent = "Starting job…";

    try {
      const created = await api("/jobs", {
        method: "POST",
        body: JSON.stringify({
          course_name: course,
          recipients,
        }),
      });

      state.activeId = created.job_id;

      const newJob = {
        job_id: created.job_id,
        status: created.status || "pending",
        total: created.total || recipients.length,
        completed: 0,
        failed: 0,
        progress_percent: 0,
        course_name: course,
        createdAt: new Date().toISOString(),
        certificates: [],
      };

      state.jobs = [
        newJob,
        ...state.jobs.filter((j) => j.job_id !== created.job_id),
      ];

      $("results").hidden = false;
      $("resultRows").innerHTML = "";

      renderResults(newJob);
      $("results").scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      clearInterval(state.poll);

      state.poll = setInterval(async () => {
        try {
          await refreshJob(created.job_id);
        } catch (error) {
          clearInterval(state.poll);
          state.poll = null;
          toast(error.message);
        }
      }, 1500);

      await refreshJob(created.job_id);
      toast("Your certificate batch has started.");
    } catch (error) {
      showError(error.message);
    } finally {
      button.disabled = false;
      button.querySelector("span").textContent =
        "Generate certificates";
    }
  });

  async function openJob(id) {
    setView("create");
    state.activeId = id;
    $("results").hidden = false;
    $("resultRows").innerHTML =
      "<tr><td colspan='4'>Loading job…</td></tr>";

    try {
      const job = await refreshJob(id);

      if (!["completed", "failed"].includes(norm(job.status))) {
        clearInterval(state.poll);

        state.poll = setInterval(async () => {
          try {
            await refreshJob(id);
          } catch (error) {
            clearInterval(state.poll);
            state.poll = null;
            toast(error.message);
          }
        }, 1500);
      }
    } catch (error) {
      toast("Could not load job: " + error.message);
    }
  }

  function renderActivity() {
    const host = $("activityList");

    if (!state.jobs.length) {
      host.innerHTML = `
        <div class="empty">
          <b>No jobs yet</b>
          <p>Your certificate batches will appear here.</p>
        </div>
      `;
      return;
    }

    host.innerHTML = state.jobs
      .map(
        (job) => `
          <div class="activity-item">
            <div class="activity-symbol">✧</div>
            <div class="activity-details">
              <b>${esc(job.course_name || "Certificate batch")}</b>
              <p>${esc(job.job_id)}</p>
            </div>
            <span class="small-status ${norm(job.status)}">
              ${esc(job.status || "pending")}
            </span>
            <button class="light-btn" data-open="${esc(job.job_id)}">
              View job
            </button>
          </div>
        `
      )
      .join("");
  }

  $("activityList").addEventListener("click", (e) => {
    const button = e.target.closest("[data-open]");
    if (button) openJob(button.dataset.open);
  });

  $("refresh").addEventListener("click", async () => {
    for (const job of [...state.jobs]) {
      try {
        Object.assign(
          job,
          await api(`/jobs/${encodeURIComponent(job.job_id)}`)
        );
      } catch (error) {
        toast(error.message);
      }
    }

    renderActivity();
    toast("Activity list refreshed.");
  });

  $("newBatch").addEventListener("click", () => {
    clearInterval(state.poll);
    state.poll = null;

    $("results").hidden = true;
    $("jobForm").reset();

    state.activeId = null;
    state.recipients = [
      { name: "", email: "" },
      { name: "", email: "" },
      { name: "", email: "" },
    ];

    renderRecipients();
    $("csvStatus").textContent = "Or enter recipients below";
    $("error").hidden = true;

    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  state.recipients = [
    { name: "Alice Johnson", email: "alice@example.com" },
    { name: "Bob Smith", email: "bob@example.com" },
    { name: "Charlie Brown", email: "charlie@example.com" },
  ];

  renderRecipients();
  checkApi();
  setInterval(checkApi, 10000);
})();
