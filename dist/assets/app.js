import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (selector) => document.querySelector(selector);
const rupiah = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
const tanggal = (value) =>
  new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>'"]/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        c
      ],
  );
const statusClass = (value) =>
  ["Selesai", "Terverifikasi", "Siap Diambil", "Aktif", "Dijawab"].includes(
    value,
  )
    ? "green"
    : value === "Ditolak"
      ? "red"
      : ["Menunggu", "Diterima"].includes(value)
        ? "amber"
        : "blue";
const badge = (value) =>
  `<span class="status status-${statusClass(value)}">${esc(value)}</span>`;
const menus = {
  admin: [
    ["dashboard", "▦", "Dashboard"],
    ["services", "◇", "Layanan & Harga"],
    ["orders", "▤", "Pesanan"],
    ["payments", "◉", "Verifikasi Pembayaran"],
    ["complaints", "□", "Keluhan"],
    ["users", "◎", "Pengguna"],
    ["reports", "▥", "Laporan"],
    ["profile", "○", "Profil"],
  ],
  pegawai: [
    ["dashboard", "▦", "Dashboard"],
    ["orders", "▤", "Daftar Pesanan"],
    ["profile", "○", "Profil"],
  ],
  pelanggan: [
    ["dashboard", "▦", "Dashboard"],
    ["new-order", "+", "Pesan Laundry"],
    ["my-orders", "▤", "Pesanan Saya"],
    ["payments", "◉", "Pembayaran"],
    ["complaints", "□", "Keluhan"],
    ["profile", "○", "Profil"],
  ],
};
let currentUser = null,
  profile = null,
  currentPage = "dashboard",
  toastTimer;

const authMessage = (error) => {
  const message = String(error?.message || "").toLowerCase();
  if (message.includes("invalid login credentials"))
    return "Email atau password salah.";
  if (message.includes("email not confirmed"))
    return "Email belum dikonfirmasi. Periksa kotak masuk atau folder spam.";
  if (message.includes("user already registered"))
    return "Email ini sudah terdaftar. Silakan login atau gunakan lupa password.";
  if (message.includes("password should be"))
    return "Password minimal 6 karakter.";
  if (message.includes("rate limit"))
    return "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.";
  if (message.includes("network") || message.includes("fetch"))
    return "Tidak dapat terhubung. Periksa koneksi internet Anda.";
  return error?.message || "Terjadi kesalahan autentikasi.";
};
function authNotice(message = "", type = "") {
  const element = $("#authNotice");
  element.textContent = message;
  element.classList.remove("auth-error", "auth-success");
  if (type) element.classList.add(`auth-${type}`);
}

function toast(message, type = "dark") {
  const el = $("#toast");
  el.textContent = message;
  el.style.background =
    type === "danger" ? "#b4232f" : type === "success" ? "#146c52" : "#12263f";
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3000);
}
function handleError(error, fallback = "Terjadi kesalahan") {
  console.error(error);
  toast(error?.message || fallback, "danger");
}
function showLoading() {
  $("#pageContent").innerHTML =
    '<div class="panel empty"><div class="spinner-border text-primary mb-3"></div><div>Memuat data…</div></div>';
}

async function init() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  await syncSession(session);
  supabase.auth.onAuthStateChange((event, s) =>
    setTimeout(async () => {
      await syncSession(s);
      if (event === "PASSWORD_RECOVERY") openPasswordRecovery();
    }, 0),
  );
}
async function syncSession(session) {
  if (!session?.user) {
    currentUser = null;
    profile = null;
    document.body.classList.remove("app-mode");
    $("#appScreen").classList.add("d-none");
    $("#loginScreen").classList.remove("d-none");
    return;
  }
  currentUser = session.user;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .single();
  if (error)
    return handleError(
      error,
      "Profil belum tersedia. Pastikan schema sudah dijalankan.",
    );
  profile = data;
  document.body.classList.add("app-mode");
  $("#loginScreen").classList.add("d-none");
  $("#appScreen").classList.remove("d-none");
  $("#userName").textContent = profile.nama;
  $("#userRole").textContent = profile.role;
  $("#roleLabel").textContent =
    profile.role[0].toUpperCase() + profile.role.slice(1);
  $("#avatar").textContent = profile.nama[0].toUpperCase();
  buildMenu();
  await navigate("dashboard");
}

$("#togglePassword").addEventListener("click", (event) => {
  const input = $("#password"),
    show = input.type === "password";
  input.type = show ? "text" : "password";
  event.currentTarget.textContent = show ? "Sembunyikan" : "Lihat";
  event.currentTarget.setAttribute(
    "aria-label",
    show ? "Sembunyikan password" : "Tampilkan password",
  );
});
$("#loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.submitter;
  button.disabled = true;
  button.textContent = "Memproses…";
  authNotice();
  const { error } = await supabase.auth.signInWithPassword({
    email: $("#email").value.trim().toLowerCase(),
    password: $("#password").value,
  });
  button.disabled = false;
  button.textContent = "Masuk sekarang";
  if (error) {
    authNotice(authMessage(error), "error");
    return toast(authMessage(error), "danger");
  }
  toast("Login berhasil", "success");
});
$("#forgotPassword").addEventListener("click", async () => {
  const email = $("#email").value.trim().toLowerCase();
  if (!email) {
    authNotice("Masukkan email Anda terlebih dahulu.", "error");
    $("#email").focus();
    return;
  }
  const button = $("#forgotPassword");
  button.disabled = true;
  button.textContent = "Mengirim…";
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${location.origin}${location.pathname}`,
  });
  button.disabled = false;
  button.textContent = "Lupa password?";
  if (error) {
    authNotice(authMessage(error), "error");
    return;
  }
  authNotice(
    "Tautan reset password sudah dikirim. Periksa email dan folder spam.",
    "success",
  );
  toast("Email reset password dikirim", "success");
});
$("#registerDemo").addEventListener("click", () =>
  showModal(
    "Buat akun LaundryKu",
    `<form id="registerForm"><div class="row g-3"><div class="col-md-6"><label class="form-label">Nama lengkap</label><input class="form-control" name="nama" maxlength="40" autocomplete="name" required></div><div class="col-md-6"><label class="form-label">Username</label><input class="form-control" name="username" maxlength="25" minlength="3" pattern="[A-Za-z0-9_]+" title="Gunakan huruf, angka, atau garis bawah" autocomplete="username" required></div><div class="col-md-6"><label class="form-label">Email</label><input class="form-control" name="email" type="email" autocomplete="email" required></div><div class="col-md-6"><label class="form-label">No. handphone</label><input class="form-control" name="no_handphone" maxlength="15" pattern="[0-9+ -]+" autocomplete="tel" required></div><div class="col-12"><label class="form-label">Alamat</label><textarea class="form-control" name="alamat" rows="2" autocomplete="street-address" required></textarea></div><div class="col-md-6"><label class="form-label">Password</label><input class="form-control" name="password" type="password" minlength="6" autocomplete="new-password" required></div><div class="col-md-6"><label class="form-label">Ulangi password</label><input class="form-control" name="confirm_password" type="password" minlength="6" autocomplete="new-password" required></div><div class="col-12"><div class="alert alert-info mb-0">Akun baru dibuat sebagai pelanggan. Hak akses pegawai diberikan secara internal oleh pengelola.</div></div><div class="col-12"><button class="btn btn-primary w-100">Buat akun</button></div></div></form>`,
    async (form) => {
      const values = Object.fromEntries(new FormData(form));
      if (values.password !== values.confirm_password)
        throw new Error("Konfirmasi password tidak sama.");
      const { data, error } = await supabase.auth.signUp({
        email: values.email.trim().toLowerCase(),
        password: values.password,
        options: {
          emailRedirectTo: `${location.origin}${location.pathname}`,
          data: {
            nama: values.nama.trim(),
            username: values.username.trim(),
            no_handphone: values.no_handphone.trim(),
            alamat: values.alamat.trim(),
          },
        },
      });
      if (error) throw new Error(authMessage(error));
      $("#email").value = values.email.trim().toLowerCase();
      if (!data.session)
        authNotice(
          "Akun berhasil dibuat. Periksa email untuk konfirmasi, lalu login.",
          "success",
        );
      else authNotice("Akun berhasil dibuat dan Anda sudah masuk.", "success");
      toast("Akun berhasil dibuat", "success");
    },
  ),
);
$("#logoutBtn").addEventListener("click", async () => {
  await supabase.auth.signOut();
  $("#password").value = "";
  toast("Anda berhasil keluar");
});
$("#menuToggle").addEventListener("click", () =>
  $("#sidebar").classList.toggle("open"),
);

function buildMenu() {
  $("#navMenu").innerHTML = menus[profile.role]
    .map(
      ([p, i, l]) =>
        `<button class="nav-item" data-page="${p}"><span class="nav-icon">${i}</span>${l}</button>`,
    )
    .join("");
  $("#navMenu")
    .querySelectorAll("[data-page]")
    .forEach((b) =>
      b.addEventListener("click", () => navigate(b.dataset.page)),
    );
}
async function navigate(page) {
  currentPage = page;
  $("#sidebar").classList.remove("open");
  document
    .querySelectorAll(".nav-item")
    .forEach((i) => i.classList.toggle("active", i.dataset.page === page));
  const item = menus[profile.role].find((x) => x[0] === page);
  $("#pageTitle").textContent = item?.[2] || "Dashboard";
  $("#breadcrumb").textContent = `LaundryKu / ${item?.[2] || "Dashboard"}`;
  showLoading();
  try {
    const fn = renderers[profile.role]?.[page] || renderNotFound;
    $("#pageContent").innerHTML = await fn();
    bindPageEvents();
  } catch (error) {
    handleError(error);
    $("#pageContent").innerHTML =
      `<div class="panel empty">${esc(error.message || "Gagal memuat halaman.")}</div>`;
  }
}
const panel = (t, s, c, a = "") =>
  `<section class="panel"><div class="panel-head"><div><h3>${t}</h3>${s ? `<p>${s}</p>` : ""}</div>${a}</div>${c}</section>`;
const table = (h, r) =>
  `<div class="table-responsive"><table class="table"><thead><tr>${h.map((x) => `<th>${x}</th>`).join("")}</tr></thead><tbody>${r || `<tr><td colspan="${h.length}" class="text-center text-secondary py-4">Belum ada data.</td></tr>`}</tbody></table></div>`;
const metric = (l, v, n, i) =>
  `<article class="metric-card"><div class="metric-label">${l}</div><div class="metric-value">${v}</div><div class="metric-note">${n}</div><div class="metric-icon">${i}</div></article>`;
const welcome = (s) =>
  `<div class="welcome"><div><h2>Halo, ${esc(profile.nama.split(" ")[0])}.</h2><p>${s}</p></div><div class="date-chip">${new Intl.DateTimeFormat("id-ID", { dateStyle: "full" }).format(new Date())}</div></div>`;

async function adminDashboard() {
  const [o, p, k] = await Promise.all([
    supabase.from("pesanan").select("*", { count: "exact", head: true }),
    supabase
      .from("pembayaran")
      .select("*", { count: "exact", head: true })
      .eq("status_pembayaran", "Menunggu"),
    supabase
      .from("keluhan")
      .select("*", { count: "exact", head: true })
      .is("jawaban_keluhan", null),
  ]);
  const { data, error } = await supabase
    .from("pesanan")
    .select("*, layanan(nama_layanan), profiles(nama)")
    .order("tanggal_pesanan", { ascending: false })
    .limit(5);
  if (error) throw error;
  return `${welcome("Ringkasan operasional LaundryKu hari ini.")}<div class="metric-grid">${metric("Total pesanan", o.count || 0, "Seluruh transaksi", "▤")}${metric("Pembayaran menunggu", p.count || 0, "Perlu diverifikasi", "◉")}${metric("Keluhan belum dijawab", k.count || 0, "Perlu ditindaklanjuti", "□")}</div>${panel("Pesanan terbaru", "Lima transaksi terakhir", table(["ID", "Pelanggan", "Layanan", "Total", "Status"], data.map((x) => `<tr><td><b>#${x.id_pesanan}</b></td><td>${esc(x.profiles?.nama)}</td><td>${esc(x.layanan?.nama_layanan)}</td><td>${rupiah(x.total_harga)}</td><td>${badge(x.status_pesanan)}</td></tr>`).join("")), '<button class="btn btn-sm btn-outline-primary" data-go="orders">Lihat semua</button>')}`;
}
async function employeeDashboard() {
  const { data, error } = await supabase
    .from("pesanan")
    .select("id_pesanan,status_pesanan");
  if (error) throw error;
  return `${welcome("Prioritas pekerjaan untuk shift Anda.")}<div class="metric-grid">${metric("Perlu dikerjakan", data.filter((x) => x.status_pesanan !== "Selesai").length, "Pesanan aktif", "▤")}${metric("Baru diterima", data.filter((x) => x.status_pesanan === "Diterima").length, "Segera diproses", "◇")}${metric("Siap diambil", data.filter((x) => x.status_pesanan === "Siap Diambil").length, "Hubungi pelanggan", "✓")}</div>${panel("Informasi shift", "Perbarui progres melalui Daftar Pesanan.", '<p class="text-secondary mb-0">Setiap perubahan tersimpan langsung ke Supabase.</p>', '<button class="btn btn-primary btn-sm" data-go="orders">Buka antrean</button>')}`;
}
async function customerDashboard() {
  const { data, error } = await supabase
    .from("pesanan")
    .select("*, layanan(nama_layanan)")
    .order("tanggal_pesanan", { ascending: false });
  if (error) throw error;
  const a = data[0];
  return `${welcome("Pantau cucian dan pembayaran Anda.")}<div class="metric-grid">${metric("Pesanan saya", data.length, "Semua riwayat", "▤")}${metric("Sedang diproses", data.filter((x) => !["Selesai", "Siap Diambil"].includes(x.status_pesanan)).length, "Dalam pengerjaan", "◇")}${metric("Siap diambil", data.filter((x) => x.status_pesanan === "Siap Diambil").length, "Segera diambil", "✓")}</div>${a ? panel("Pesanan terbaru", "Status diperbarui pegawai.", `<div class="d-flex justify-content-between"><div><b class="fs-5">#${a.id_pesanan}</b><p class="text-secondary">${esc(a.layanan?.nama_layanan)} · ${a.berat} kg</p></div>${badge(a.status_pesanan)}</div><div class="order-summary d-flex justify-content-between"><div><small>Estimasi</small><div>${esc(a.estimasi)}</div></div><div class="text-end"><small>Total</small><div class="order-total">${rupiah(a.total_harga)}</div></div></div>`) : panel("Belum ada pesanan", "Mulai dengan membuat pesanan.", '<button class="btn btn-primary" data-go="new-order">Pesan sekarang</button>')}`;
}
async function servicesPage() {
  const { data, error } = await supabase
    .from("layanan")
    .select("*")
    .order("id_layanan");
  if (error) throw error;
  return panel(
    "Daftar layanan",
    "Kelola layanan dan harga.",
    table(
      ["Layanan", "Harga/kg", "Status", "Aksi"],
      data
        .map(
          (s) =>
            `<tr><td><b>${esc(s.nama_layanan)}</b></td><td>${rupiah(s.harga_per_kg)}</td><td>${badge(s.aktif ? "Aktif" : "Nonaktif")}</td><td><button class="btn btn-sm btn-outline-primary" data-edit-service='${JSON.stringify(s)}'>Ubah</button></td></tr>`,
        )
        .join(""),
    ),
    '<button class="btn btn-primary btn-sm" data-add-service>Tambah layanan</button>',
  );
}
async function ordersPage() {
  const { data, error } = await supabase
    .from("pesanan")
    .select("*, layanan(nama_layanan), profiles(nama)")
    .order("tanggal_pesanan", { ascending: false });
  if (error) throw error;
  return panel(
    profile.role === "pegawai" ? "Status laundry" : "Pesanan",
    "Data dibatasi otomatis oleh RLS.",
    table(
      ["ID", "Pelanggan", "Tanggal", "Layanan", "Berat", "Total", "Status"],
      data
        .map(
          (o) =>
            `<tr><td><b>#${o.id_pesanan}</b></td><td>${esc(o.profiles?.nama || profile.nama)}</td><td>${tanggal(o.tanggal_pesanan)}</td><td>${esc(o.layanan?.nama_layanan)}</td><td>${o.berat} kg</td><td>${rupiah(o.total_harga)}</td><td>${profile.role === "pegawai" ? `<select class="form-select form-select-sm" data-order-status="${o.id_pesanan}">${["Diterima", "Dicuci", "Disetrika", "Siap Diambil", "Selesai"].map((s) => `<option ${s === o.status_pesanan ? "selected" : ""}>${s}</option>`).join("")}</select>` : badge(o.status_pesanan)}</td></tr>`,
        )
        .join(""),
    ),
  );
}
async function newOrderPage() {
  const { data, error } = await supabase
    .from("layanan")
    .select("*")
    .eq("aktif", true)
    .order("nama_layanan");
  if (error) throw error;
  return panel(
    "Buat pesanan laundry",
    "Biaya dihitung otomatis.",
    `<form id="newOrderForm"><div class="row g-3"><div class="col-md-6"><label class="form-label">Layanan</label><select class="form-select" id="serviceSelect">${data.map((s) => `<option value="${s.id_layanan}" data-price="${s.harga_per_kg}">${esc(s.nama_layanan)} — ${rupiah(s.harga_per_kg)}/kg</option>`).join("")}</select></div><div class="col-md-6"><label class="form-label">Berat (kg)</label><input class="form-control" id="weightInput" type="number" min="0.5" max="99" step="0.1" value="3" required></div><div class="col-md-6"><label class="form-label">Estimasi</label><input class="form-control" id="estimateInput" value="2–3 hari kerja" maxlength="40" required></div><div class="col-md-6"><div class="order-summary"><small>Perkiraan total</small><div class="order-total" id="orderEstimate">${rupiah((data[0]?.harga_per_kg || 0) * 3)}</div></div></div><div class="col-12"><button class="btn btn-primary">Simpan pesanan</button></div></div></form>`,
  );
}
async function paymentsPage() {
  const { data, error } = await supabase
    .from("pembayaran")
    .select("*, pesanan(id_pesanan,id_user,total_harga,profiles(nama))")
    .order("tanggal_pembayaran", { ascending: false });
  if (error) throw error;
  return panel(
    profile.role === "admin" ? "Verifikasi pembayaran" : "Pembayaran saya",
    "Bukti JPG/PNG maksimal 2 MB.",
    table(
      ["Pesanan", "Pelanggan", "Metode", "Jumlah", "Status", "Aksi"],
      data
        .map(
          (p) =>
            `<tr><td><b>#${p.id_pesanan}</b></td><td>${esc(p.pesanan?.profiles?.nama || profile.nama)}</td><td>${esc(p.metode_pembayaran)}</td><td>${rupiah(p.total_bayar)}</td><td>${badge(p.status_pembayaran)}</td><td>${profile.role === "admin" && p.status_pembayaran === "Menunggu" ? `<button class="btn btn-sm btn-outline-primary" data-proof="${esc(p.bukti_pembayaran)}">Bukti</button> <button class="btn btn-sm btn-success" data-payment="${p.id_pembayaran}" data-status="Terverifikasi">Terima</button> <button class="btn btn-sm btn-outline-danger" data-payment="${p.id_pembayaran}" data-status="Ditolak">Tolak</button>` : "—"}</td></tr>`,
        )
        .join(""),
    ),
    profile.role === "pelanggan"
      ? '<button class="btn btn-primary btn-sm" data-upload>Bayar tagihan</button>'
      : "",
  );
}
async function complaintsPage() {
  const { data, error } = await supabase
    .from("keluhan")
    .select("*, pesanan(id_pesanan), profiles(nama)")
    .order("tanggal_keluhan", { ascending: false });
  if (error) throw error;
  return panel(
    "Keluhan",
    profile.role === "admin"
      ? "Jawab keluhan pelanggan."
      : "Keluhan hanya dari pesanan Anda.",
    data
      .map(
        (c) =>
          `<article class="border-bottom py-3"><div class="d-flex justify-content-between gap-3"><div><b>${esc(c.profiles?.nama || profile.nama)}</b> <span class="text-secondary">· #${c.id_pesanan}</span><p class="my-2">${esc(c.isi_keluhan)}</p>${c.jawaban_keluhan ? `<div class="p-3 rounded bg-light"><small class="text-secondary">Jawaban pengelola</small><div>${esc(c.jawaban_keluhan)}</div></div>` : profile.role === "admin" ? `<button class="btn btn-sm btn-primary" data-answer="${c.id_keluhan}">Tulis jawaban</button>` : badge("Menunggu")}</div>${badge(c.jawaban_keluhan ? "Dijawab" : "Menunggu")}</div></article>`,
      )
      .join("") || '<div class="empty">Belum ada keluhan.</div>',
    profile.role === "pelanggan"
      ? '<button class="btn btn-primary btn-sm" data-new-complaint>Buat keluhan</button>'
      : "",
  );
}
async function usersPage() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at");
  if (error) throw error;
  return panel(
    "Pengguna & role",
    "Promosikan pelanggan menjadi pegawai.",
    table(
      ["Nama", "Username", "Kontak", "Role"],
      data
        .map(
          (u) =>
            `<tr><td><b>${esc(u.nama)}</b></td><td>${esc(u.username)}</td><td>${esc(u.no_handphone || "—")}</td><td><select class="form-select form-select-sm" data-user-role="${u.id}" ${u.id === currentUser.id ? "disabled" : ""}>${["admin", "pegawai", "pelanggan"].map((r) => `<option ${r === u.role ? "selected" : ""}>${r}</option>`).join("")}</select></td></tr>`,
        )
        .join(""),
    ),
  );
}
async function reportsPage() {
  const { data, error } = await supabase
    .from("pesanan")
    .select("*, layanan(nama_layanan), profiles(nama)")
    .order("tanggal_pesanan", { ascending: false });
  if (error) throw error;
  return panel(
    "Laporan pesanan",
    "Cetak atau simpan sebagai PDF.",
    `<div class="toolbar"><div class="text-secondary">${data.length} transaksi</div><button class="btn btn-outline-primary" onclick="window.print()">Cetak laporan</button></div>${table(["ID", "Tanggal", "Pelanggan", "Layanan", "Total", "Status"], data.map((o) => `<tr><td>#${o.id_pesanan}</td><td>${tanggal(o.tanggal_pesanan)}</td><td>${esc(o.profiles?.nama)}</td><td>${esc(o.layanan?.nama_layanan)}</td><td>${rupiah(o.total_harga)}</td><td>${badge(o.status_pesanan)}</td></tr>`).join(""))}<div class="text-end mt-3"><span class="text-secondary me-3">Total</span><b class="fs-5">${rupiah(data.reduce((s, o) => s + Number(o.total_harga), 0))}</b></div>`,
  );
}
async function profilePage() {
  return panel(
    "Informasi profil",
    "Perbarui data kontak.",
    `<form id="profileForm"><div class="row g-3"><div class="col-md-6"><label class="form-label">Nama</label><input class="form-control" name="nama" value="${esc(profile.nama)}" required maxlength="40"></div><div class="col-md-6"><label class="form-label">Email</label><input class="form-control" value="${esc(currentUser.email)}" disabled></div><div class="col-md-6"><label class="form-label">Username</label><input class="form-control" value="${esc(profile.username)}" disabled></div><div class="col-md-6"><label class="form-label">Role</label><input class="form-control text-capitalize" value="${esc(profile.role)}" disabled></div><div class="col-md-6"><label class="form-label">No. handphone</label><input class="form-control" name="no_handphone" value="${esc(profile.no_handphone || "")}" maxlength="15"></div><div class="col-12"><label class="form-label">Alamat</label><textarea class="form-control" name="alamat" rows="3">${esc(profile.alamat || "")}</textarea></div><div class="col-12"><button class="btn btn-primary">Simpan profil</button></div></div></form>`,
  );
}
const renderers = {
  admin: {
    dashboard: adminDashboard,
    services: servicesPage,
    orders: ordersPage,
    payments: paymentsPage,
    complaints: complaintsPage,
    users: usersPage,
    reports: reportsPage,
    profile: profilePage,
  },
  pegawai: {
    dashboard: employeeDashboard,
    orders: ordersPage,
    profile: profilePage,
  },
  pelanggan: {
    dashboard: customerDashboard,
    "new-order": newOrderPage,
    "my-orders": ordersPage,
    payments: paymentsPage,
    complaints: complaintsPage,
    profile: profilePage,
  },
};
const renderNotFound = async () =>
  '<div class="panel empty">Halaman tidak ditemukan.</div>';

function showModal(title, body, onSubmit) {
  $("#modalTitle").textContent = title;
  $("#modalBody").innerHTML = body;
  const modal = bootstrap.Modal.getOrCreateInstance($("#formModal"));
  modal.show();
  const form = $("#modalBody form");
  if (form && onSubmit)
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const b = e.submitter,
        originalLabel = b.textContent;
      b.disabled = true;
      b.textContent = "Memproses…";
      try {
        await onSubmit(form);
        modal.hide();
      } catch (error) {
        handleError(error);
        b.disabled = false;
        b.textContent = originalLabel;
      }
    });
}
function openPasswordRecovery() {
  showModal(
    "Buat password baru",
    `<form><div class="mb-3"><label class="form-label">Password baru</label><input class="form-control" name="password" type="password" minlength="6" autocomplete="new-password" required></div><div class="mb-3"><label class="form-label">Ulangi password</label><input class="form-control" name="confirm_password" type="password" minlength="6" autocomplete="new-password" required></div><button class="btn btn-primary w-100">Simpan password baru</button></form>`,
    async (form) => {
      const values = Object.fromEntries(new FormData(form));
      if (values.password !== values.confirm_password)
        throw new Error("Konfirmasi password tidak sama.");
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      });
      if (error) throw new Error(authMessage(error));
      toast("Password berhasil diperbarui", "success");
    },
  );
}
function serviceForm(s = {}) {
  return `<form><div class="mb-3"><label class="form-label">Nama layanan</label><input class="form-control" name="nama_layanan" value="${esc(s.nama_layanan || "")}" maxlength="40" required></div><div class="mb-3"><label class="form-label">Harga per kg</label><input class="form-control" name="harga_per_kg" type="number" min="1000" value="${s.harga_per_kg || ""}" required></div>${s.id_layanan ? `<div class="form-check mb-3"><input class="form-check-input" name="aktif" type="checkbox" ${s.aktif ? "checked" : ""}><label class="form-check-label">Aktif</label></div>` : ""}<button class="btn btn-primary w-100">Simpan</button></form>`;
}
function recalc() {
  const o = $("#serviceSelect")?.selectedOptions[0],
    total =
      Number(o?.dataset.price || 0) * Number($("#weightInput")?.value || 0);
  if ($("#orderEstimate")) $("#orderEstimate").textContent = rupiah(total);
}

function bindPageEvents() {
  document
    .querySelectorAll("[data-go]")
    .forEach((b) => b.addEventListener("click", () => navigate(b.dataset.go)));
  $("[data-add-service]")?.addEventListener("click", () =>
    showModal("Tambah layanan", serviceForm(), async (f) => {
      const v = Object.fromEntries(new FormData(f));
      const { error } = await supabase.from("layanan").insert({
        nama_layanan: v.nama_layanan,
        harga_per_kg: Number(v.harga_per_kg),
      });
      if (error) throw error;
      toast("Layanan ditambahkan", "success");
      await navigate("services");
    }),
  );
  document.querySelectorAll("[data-edit-service]").forEach((b) =>
    b.addEventListener("click", () => {
      const s = JSON.parse(b.dataset.editService);
      showModal("Ubah layanan", serviceForm(s), async (f) => {
        const v = Object.fromEntries(new FormData(f));
        const { error } = await supabase
          .from("layanan")
          .update({
            nama_layanan: v.nama_layanan,
            harga_per_kg: Number(v.harga_per_kg),
            aktif: v.aktif === "on",
          })
          .eq("id_layanan", s.id_layanan);
        if (error) throw error;
        toast("Layanan diperbarui", "success");
        await navigate("services");
      });
    }),
  );
  document.querySelectorAll("[data-order-status]").forEach((s) =>
    s.addEventListener("change", async () => {
      const { error } = await supabase
        .from("pesanan")
        .update({
          status_pesanan: s.value,
          updated_at: new Date().toISOString(),
        })
        .eq("id_pesanan", s.dataset.orderStatus);
      if (error) return handleError(error);
      toast("Status diperbarui", "success");
    }),
  );
  $("#serviceSelect")?.addEventListener("change", recalc);
  $("#weightInput")?.addEventListener("input", recalc);
  $("#newOrderForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const o = $("#serviceSelect").selectedOptions[0],
      w = Number($("#weightInput").value);
    const { error } = await supabase.from("pesanan").insert({
      id_user: currentUser.id,
      id_layanan: Number(o.value),
      berat: w,
      total_harga: Number(o.dataset.price) * w,
      status_pesanan: "Diterima",
      estimasi: $("#estimateInput").value,
    });
    if (error) return handleError(error);
    toast("Pesanan dibuat", "success");
    await navigate("my-orders");
  });
  $("[data-upload]")?.addEventListener("click", openPaymentForm);
  document.querySelectorAll("[data-payment]").forEach((b) =>
    b.addEventListener("click", async () => {
      const { error } = await supabase
        .from("pembayaran")
        .update({ status_pembayaran: b.dataset.status })
        .eq("id_pembayaran", b.dataset.payment);
      if (error) return handleError(error);
      toast("Pembayaran diperbarui", "success");
      await navigate("payments");
    }),
  );
  document.querySelectorAll("[data-proof]").forEach((b) =>
    b.addEventListener("click", async () => {
      const { data, error } = await supabase.storage
        .from("bukti-pembayaran")
        .createSignedUrl(b.dataset.proof, 300);
      if (error) return handleError(error);
      window.open(data.signedUrl, "_blank", "noopener");
    }),
  );
  $("[data-new-complaint]")?.addEventListener("click", openComplaintForm);
  document.querySelectorAll("[data-answer]").forEach((b) =>
    b.addEventListener("click", () =>
      showModal(
        "Jawab keluhan",
        `<form><label class="form-label">Jawaban</label><textarea class="form-control mb-3" name="jawaban" rows="4" required></textarea><button class="btn btn-primary w-100">Simpan</button></form>`,
        async (f) => {
          const { error } = await supabase
            .from("keluhan")
            .update({
              jawaban_keluhan: new FormData(f).get("jawaban"),
              updated_at: new Date().toISOString(),
            })
            .eq("id_keluhan", b.dataset.answer);
          if (error) throw error;
          toast("Jawaban disimpan", "success");
          await navigate("complaints");
        },
      ),
    ),
  );
  document.querySelectorAll("[data-user-role]").forEach((s) =>
    s.addEventListener("change", async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ role: s.value })
        .eq("id", s.dataset.userRole);
      if (error) return handleError(error);
      toast("Role diperbarui", "success");
    }),
  );
  $("#profileForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.currentTarget));
    const { data, error } = await supabase
      .from("profiles")
      .update(v)
      .eq("id", currentUser.id)
      .select()
      .single();
    if (error) return handleError(error);
    profile = data;
    $("#userName").textContent = profile.nama;
    toast("Profil diperbarui", "success");
  });
}

async function openPaymentForm() {
  const { data, error } = await supabase
    .from("pesanan")
    .select("id_pesanan,total_harga")
    .order("tanggal_pesanan", { ascending: false });
  if (error) return handleError(error);
  showModal(
    "Kirim pembayaran",
    `<form><div class="mb-3"><label class="form-label">Pesanan</label><select class="form-select" name="id_pesanan">${data.map((o) => `<option value="${o.id_pesanan}">#${o.id_pesanan} — ${rupiah(o.total_harga)}</option>`).join("")}</select></div><div class="mb-3"><label class="form-label">Metode</label><select class="form-select" name="metode"><option>Transfer Bank</option><option>QRIS</option><option>Tunai</option></select></div><div class="mb-3"><label class="form-label">Jumlah</label><input class="form-control" name="jumlah" type="number" min="1" value="${data[0]?.total_harga || 0}" required></div><div class="mb-3"><label class="form-label">Bukti</label><input class="form-control" name="bukti" type="file" accept="image/jpeg,image/png" required><div class="form-text">Maksimal 2 MB.</div></div><button class="btn btn-primary w-100">Kirim</button></form>`,
    async (f) => {
      const v = new FormData(f),
        file = v.get("bukti");
      if (file.size > 2097152) throw new Error("Ukuran file maksimal 2 MB");
      const path = `${currentUser.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
      const up = await supabase.storage
        .from("bukti-pembayaran")
        .upload(path, file, { contentType: file.type });
      if (up.error) throw up.error;
      const { error: e } = await supabase.from("pembayaran").insert({
        id_pesanan: Number(v.get("id_pesanan")),
        total_bayar: Number(v.get("jumlah")),
        metode_pembayaran: v.get("metode"),
        bukti_pembayaran: path,
      });
      if (e) throw e;
      toast("Pembayaran dikirim", "success");
      await navigate("payments");
    },
  );
}
async function openComplaintForm() {
  const { data, error } = await supabase
    .from("pesanan")
    .select("id_pesanan")
    .order("tanggal_pesanan", { ascending: false });
  if (error) return handleError(error);
  showModal(
    "Buat keluhan",
    `<form><div class="mb-3"><label class="form-label">Pesanan</label><select class="form-select" name="id_pesanan">${data.map((o) => `<option value="${o.id_pesanan}">#${o.id_pesanan}</option>`).join("")}</select></div><div class="mb-3"><label class="form-label">Isi keluhan</label><textarea class="form-control" name="isi" rows="4" required></textarea></div><button class="btn btn-primary w-100">Kirim</button></form>`,
    async (f) => {
      const v = Object.fromEntries(new FormData(f));
      const { error: e } = await supabase.from("keluhan").insert({
        id_user: currentUser.id,
        id_pesanan: Number(v.id_pesanan),
        isi_keluhan: v.isi,
      });
      if (e) throw e;
      toast("Keluhan dikirim", "success");
      await navigate("complaints");
    },
  );
}
init().catch(handleError);
