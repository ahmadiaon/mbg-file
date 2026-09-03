import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api/v1",
});
type Folder = {
  id: number;
  name: string;
  path: string;
  parentId?: number | null;
  _count?: { files: number; children: number };
};
type FileItem = {
  id: number;
  originalFilename: string;
  mimeType?: string;
  size: number;
  createdAt: string;
  folder?: Folder | null;
};
type AlertState = {
  type: "success" | "danger" | "info";
  title: string;
  message: string;
  shareUrl?: string;
} | null;
const headers = (token: string) => ({ Authorization: `Bearer ${token}` });
const formatSize = (value: number) =>
  value < 1024
    ? `${value} B`
    : value < 1048576
      ? `${(value / 1024).toFixed(1)} KB`
      : `${(value / 1048576).toFixed(1)} MB`;
const formatSpeed = (value: number) => `${formatSize(value)}/s`;
const formatEta = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 1) return "Sebentar lagi";
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.ceil(seconds % 60);
  return minutes ? `${minutes}m ${remaining}d` : `${remaining} detik`;
};
const fileIcon = (file: FileItem) =>
  file.mimeType?.startsWith("image")
    ? "IMG"
    : file.mimeType?.includes("pdf")
      ? "PDF"
      : file.mimeType?.includes("spreadsheet")
        ? "XLS"
        : "FILE";
const copyText = async (value: string) => {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const input = document.createElement("textarea");
    input.value = value;
    document.body.appendChild(input);
    input.select();
    const copied = document.execCommand("copy");
    input.remove();
    return copied;
  }
};

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("mbg_token"));
  const [user, setUser] = useState<any>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folderId, setFolderId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"list" | "grid">("list");
  const [selected, setSelected] = useState<FileItem | null>(null);
  const [folderDialog, setFolderDialog] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [login, setLogin] = useState({
    username: "admin",
    password: "admin123",
  });
  const [loading, setLoading] = useState(false);
  const [uploadState, setUploadState] = useState({
    active: false,
    current: 0,
    total: 0,
    percent: 0,
    filename: "",
    speed: 0,
    eta: 0,
  });
  const [alert, setAlert] = useState<AlertState>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const authHeaders = token ? headers(token) : {};
  const currentFolder = folders.find((folder) => folder.id === folderId);
  const visibleFolders = folders.filter(
    (folder) => (folder.parentId || null) === folderId,
  );
  const breadcrumbs = currentFolder ? currentFolder.path.split("/") : [];
  const folderTree = (parentId: number | null = null, depth = 0): ReactNode[] =>
    folders
      .filter((folder) => (folder.parentId || null) === parentId)
      .map((folder) => (
        <div key={folder.id}>
          <button
            className={`btn btn-link text-start text-decoration-none w-100 ${folder.id === folderId ? "bg-primary text-white" : "text-light"}`}
            style={{ paddingLeft: `${12 + depth * 16}px` }}
            onClick={() => setFolderId(folder.id)}
          >
            <span className="me-2">{depth ? "└" : "▰"}</span>
            {folder.name}
            <small className="float-end opacity-75">
              {folder._count?.files || ""}
            </small>
          </button>
          {folderTree(folder.id, depth + 1)}
        </div>
      ));
  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [fileResponse, folderResponse] = await Promise.all([
        api.get("/files", {
          headers: authHeaders,
          params: {
            ...(folderId ? { folderId } : {}),
            ...(query ? { q: query } : {}),
          },
        }),
        api.get("/folders", { headers: authHeaders }),
      ]);
      setFiles(fileResponse.data);
      setFolders(folderResponse.data);
    } catch (error: any) {
      setAlert({
        type: "danger",
        title: "Gagal memuat data",
        message:
          error.response?.data?.message || "Workspace tidak dapat dimuat.",
      });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, [token, folderId, query]);
  const totalFiles =
    folders.reduce((sum, folder) => sum + (folder._count?.files || 0), 0) +
    files.length;
  const loginSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await api.post("/auth/login", login);
      localStorage.setItem("mbg_token", response.data.access_token);
      setToken(response.data.access_token);
      setUser(response.data.user);
    } catch {
      setAlert({
        type: "danger",
        title: "Login gagal",
        message: "Username atau password salah.",
      });
    } finally {
      setLoading(false);
    }
  };
  const upload = async (list: FileList | null) => {
    if (!list || !token) return;
    const selectedFiles = Array.from(list);
    const totalBytes = selectedFiles.reduce((sum, file) => sum + file.size, 0);
    const startedAt = performance.now();
    setUploadState({
      active: true,
      current: 0,
      total: selectedFiles.length,
      percent: 0,
      filename: selectedFiles[0]?.name || "",
      speed: 0,
      eta: 0,
    });
    try {
      for (let index = 0; index < selectedFiles.length; index += 1) {
        const file = selectedFiles[index];
        const body = new FormData();
        body.append("file", file);
        if (folderId) body.append("folderId", String(folderId));
        setUploadState((state) => ({
          ...state,
          active: true,
          current: index,
          total: selectedFiles.length,
          percent: 0,
          filename: file.name,
        }));
        await api.post("/files", body, {
          headers: authHeaders,
          onUploadProgress: (event) => {
            const completedBefore = selectedFiles
              .slice(0, index)
              .reduce((sum, item) => sum + item.size, 0);
            const uploadedBytes = completedBefore + event.loaded;
            const elapsed = Math.max(
              (performance.now() - startedAt) / 1000,
              0.1,
            );
            const speed = uploadedBytes / elapsed;
            const eta = speed ? (totalBytes - uploadedBytes) / speed : 0;
            setUploadState({
              active: true,
              current: index,
              total: selectedFiles.length,
              percent: event.total
                ? Math.round((event.loaded / event.total) * 100)
                : 0,
              filename: file.name,
              speed,
              eta,
            });
          },
        });
      }
      setUploadState({
        active: false,
        current: selectedFiles.length,
        total: selectedFiles.length,
        percent: 100,
        filename: "",
        speed: 0,
        eta: 0,
      });
      setAlert({
        type: "success",
        title: "Upload selesai",
        message: `${selectedFiles.length} file berhasil diupload.`,
      });
      if (fileInput.current) fileInput.current.value = "";
      await load();
    } catch (error: any) {
      setUploadState({
        active: false,
        current: 0,
        total: 0,
        percent: 0,
        filename: "",
        speed: 0,
        eta: 0,
      });
      setAlert({
        type: "danger",
        title: "Upload gagal",
        message: error.response?.data?.message || "File gagal diupload.",
      });
    }
  };
  const createFolder = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      await api.post(
        "/folders",
        { name: folderName, parentId: folderId },
        { headers: authHeaders },
      );
      setFolderName("");
      setFolderDialog(false);
      setAlert({
        type: "success",
        title: "Folder dibuat",
        message: "Folder baru berhasil dibuat.",
      });
      await load();
    } catch (error: any) {
      setAlert({
        type: "danger",
        title: "Folder gagal dibuat",
        message: error.response?.data?.message || "Silakan coba lagi.",
      });
    } finally {
      setLoading(false);
    }
  };
  const rename = async () => {
    if (!selected) return;
    const name = window.prompt("Nama baru", selected.originalFilename);
    if (!name) return;
    setLoading(true);
    try {
      await api.patch(
        `/files/${selected.id}`,
        { name },
        { headers: authHeaders },
      );
      setSelected(null);
      setAlert({
        type: "success",
        title: "File diubah",
        message: "Nama file berhasil diubah.",
      });
      await load();
    } catch {
      setAlert({
        type: "danger",
        title: "Rename gagal",
        message: "Nama file tidak dapat diubah.",
      });
    } finally {
      setLoading(false);
    }
  };
  const remove = async () => {
    if (!selected || !window.confirm(`Hapus ${selected.originalFilename}?`))
      return;
    setLoading(true);
    try {
      await api.delete(`/files/${selected.id}`, { headers: authHeaders });
      setSelected(null);
      setAlert({
        type: "success",
        title: "File dihapus",
        message: "File berhasil dihapus dari workspace.",
      });
      await load();
    } catch {
      setAlert({
        type: "danger",
        title: "Hapus gagal",
        message: "File tidak dapat dihapus.",
      });
    } finally {
      setLoading(false);
    }
  };
  const share = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const response = await api.post(
        `/files/${selected.id}/share`,
        {},
        { headers: authHeaders },
      );
      const url = response.data.shareUrl;
      const copied = await copyText(url);
      setAlert({
        type: "success",
        title: "Share link siap",
        message: copied
          ? "Link publik berhasil disalin."
          : "Link publik berhasil dibuat. Salin dari field di bawah.",
        shareUrl: url,
      });
    } catch {
      setAlert({
        type: "danger",
        title: "Share link gagal",
        message: "Link tidak dapat dibuat.",
      });
    } finally {
      setLoading(false);
    }
  };
  const download = async (file: FileItem) => {
    try {
      const response = await api.get(`/files/${file.id}/download`, {
        headers: authHeaders,
        responseType: "blob",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(response.data);
      link.download = file.originalFilename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      setAlert({
        type: "danger",
        title: "Download gagal",
        message: "File tidak dapat diunduh.",
      });
    }
  };
  const removeFolder = async (folder: Folder) => {
    if (!window.confirm(`Hapus folder ${folder.name}? Folder harus kosong.`))
      return;
    setLoading(true);
    try {
      const response = await api.delete(`/folders/${folder.id}`, {
        headers: authHeaders,
      });
      setAlert({
        type: response.data.success ? "success" : "info",
        title: response.data.success ? "Folder dihapus" : "Folder belum kosong",
        message:
          response.data.message ||
          (response.data.success
            ? "Folder berhasil dihapus."
            : "Kosongkan folder terlebih dahulu."),
      });
      if (folderId === folder.id) setFolderId(folder.parentId || null);
      await load();
    } finally {
      setLoading(false);
    }
  };

  if (!token)
    return (
      <main className="min-vh-100 d-flex align-items-center bg-secondary-subtle">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-12 col-md-7 col-lg-5">
              <div className="card border-0 shadow-lg">
                <div className="card-body p-4 p-md-5">
                  <img
                    src="/mbg-logo.png"
                    alt="MBG"
                    className="d-block mb-3"
                    style={{ width: "96px", height: "96px", objectFit: "contain" }}
                  />
                  <span className="badge text-bg-primary mb-3">
                    MBG FILE MANAGEMENT
                  </span>
                  <h1 className="display-5 fw-bold text-primary-emphasis">
                    Semua aset,
                    <br />
                    <span className="text-primary">di satu tempat.</span>
                  </h1>
                  <p className="text-secondary">
                    Workspace internal untuk dokumen, backup, dan data proyek
                    MBG.
                  </p>
                  <form onSubmit={loginSubmit} className="mt-4">
                    <div className="mb-3">
                      <label className="form-label">Username</label>
                      <input
                        className="form-control"
                        value={login.username}
                        onChange={(e) =>
                          setLogin({ ...login, username: e.target.value })
                        }
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Password</label>
                      <input
                        className="form-control"
                        type="password"
                        value={login.password}
                        onChange={(e) =>
                          setLogin({ ...login, password: e.target.value })
                        }
                      />
                    </div>
                    <button
                      className="btn btn-primary w-100"
                      disabled={loading}
                    >
                      {loading ? "Memproses..." : "Masuk ke workspace"}
                    </button>
                  </form>
                  <small className="text-secondary">
                    Development: admin / admin123
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  return (
    <div className="container-fluid min-vh-100 bg-secondary-subtle">
      <div className="row min-vh-100">
        <aside
          className="col-auto col-md-3 col-xl-2 px-0 text-white border-end border-3 border-primary-subtle"
          style={{
            background:
              "linear-gradient(180deg, #071a33 0%, #0d294b 52%, #123e68 100%)",
          }}
        >
          <div className="d-flex flex-column h-100 p-3">
            <div className="fs-5 fw-bold mb-4">
              <img
                src="/mbg-logo.png"
                alt="MBG"
                className="rounded-circle bg-white me-2"
                style={{ width: "34px", height: "34px", objectFit: "contain" }}
              />
              MBG{" "}
              <small className="text-info">FILES</small>
            </div>
            <button
              className="btn btn-info text-dark fw-bold mb-4"
              onClick={() => fileInput.current?.click()}
            >
              ＋ Upload file
            </button>
            <input
              ref={fileInput}
              hidden
              type="file"
              multiple
              onChange={(e) => upload(e.target.files)}
            />
            <nav>
              <small className="text-info fw-bold">WORKSPACE</small>
              <button
                className={`btn text-start w-100 mt-2 ${!folderId ? "btn-primary" : "btn-link text-white text-decoration-none"}`}
                onClick={() => setFolderId(null)}
              >
                ◈ <span className="d-none d-md-inline">Semua file</span>
                <small className="float-end">{totalFiles}</small>
              </button>
              <button
                className="btn btn-link text-white text-start text-decoration-none w-100"
                onClick={() => setFolderDialog(true)}
              >
                ＋ <span className="d-none d-md-inline">Folder baru</span>
              </button>
              <small className="d-block text-info fw-bold mt-4 mb-2">
                FOLDER
              </small>
              {folderTree()}
            </nav>
            <div className="mt-auto border-top border-secondary pt-3 small text-secondary">
              Storage lokal
              <br />
              <strong className="text-white">Tanpa batas</strong>
              <br />
              <br />
              MBG File Manager
              <br />
              v1.0 · Internal
            </div>
          </div>
        </aside>
        <section className="col p-3 p-md-5 position-relative">
          <div
            className="progress position-absolute top-0 start-0 w-100 rounded-0"
            style={{ height: loading ? "4px" : "0", transition: "height .2s" }}
          >
            <div className="progress-bar progress-bar-striped progress-bar-animated bg-info w-100" />
          </div>
          <header className="d-flex justify-content-between align-items-start mb-4">
            <div>
              <small className="text-primary fw-bold">
                FILE MANAGEMENT PLATFORM
              </small>
              <h1 className="h2 text-primary-emphasis fw-bold">
                Workspace files
              </h1>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="badge rounded-pill text-bg-success">
                Terhubung
              </span>
              <span className="avatar bg-info text-dark">
                {user?.name?.[0] || "A"}
              </span>
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={() => {
                  localStorage.removeItem("mbg_token");
                  setToken(null);
                }}
              >
                Keluar
              </button>
            </div>
          </header>
          <div className="d-flex gap-2 flex-wrap mb-3">
            <div
              className="input-group flex-grow-1"
              style={{ maxWidth: "520px" }}
            >
              <span className="input-group-text">⌕</span>
              <input
                className="form-control"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari file atau folder..."
              />
            </div>
            <button className="btn btn-outline-primary" onClick={() => load()}>
              ↻
            </button>
            <div className="btn-group">
              <button
                className={`btn btn-outline-primary ${view === "list" ? "active" : ""}`}
                onClick={() => setView("list")}
              >
                ☷
              </button>
              <button
                className={`btn btn-outline-primary ${view === "grid" ? "active" : ""}`}
                onClick={() => setView("grid")}
              >
                ⊞
              </button>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => fileInput.current?.click()}
            >
              Upload file ↑
            </button>
          </div>
          <nav className="mb-4 small">
            <button
              className="btn btn-link p-0 text-decoration-none"
              onClick={() => setFolderId(null)}
            >
              Semua file
            </button>
            {breadcrumbs.map((crumb, index) => (
              <span key={`${crumb}-${index}`} className="text-secondary">
                {" "}
                / {crumb}
              </span>
            ))}
          </nav>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h2 className="h5 mb-1">{currentFolder?.name || "Semua file"}</h2>
              <small className="text-secondary">
                {files.length} file · {visibleFolders.length} folder
              </small>
            </div>
            {selected && (
              <div className="btn-group">
                <button
                  className="btn btn-sm btn-outline-primary"
                  onClick={share}
                >
                  Share link
                </button>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={rename}
                >
                  Rename
                </button>
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={remove}
                >
                  Hapus
                </button>
              </div>
            )}
          </div>
          <div className={view === "grid" ? "row g-3" : ""}>
            {visibleFolders.map((folder) => (
              <div
                className={view === "grid" ? "col-12 col-md-6 col-xl-4" : ""}
                key={folder.id}
              >
                <div className="card border-primary-subtle mb-2">
                  <div className="card-body d-flex align-items-center gap-3 py-3">
                    <span className="fs-3 text-warning">▰</span>
                    <button
                      className="btn btn-link text-start text-decoration-none p-0 flex-grow-1"
                      onDoubleClick={() => setFolderId(folder.id)}
                      onClick={() => setFolderId(folder.id)}
                    >
                      <strong>{folder.name}</strong>
                      <small className="d-block text-secondary">
                        {folder._count?.files || 0} file
                      </small>
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => removeFolder(folder)}
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {files.map((file) => (
              <div
                className={view === "grid" ? "col-12 col-md-6 col-xl-4" : ""}
                key={file.id}
              >
                <div
                  className={`card mb-2 ${selected?.id === file.id ? "border-primary bg-primary-subtle" : "border-light"}`}
                  onClick={() => setSelected(file)}
                  role="button"
                >
                  <div className="card-body d-flex align-items-center gap-3 py-3">
                    <span className="badge text-bg-primary">
                      {fileIcon(file)}
                    </span>
                    <div className="flex-grow-1">
                      <strong className="d-block text-truncate">
                        {file.originalFilename}
                      </strong>
                      <small className="text-secondary">
                        {file.mimeType || "File"} · {formatSize(file.size)}
                      </small>
                    </div>
                    <small className="text-secondary d-none d-md-block">
                      {new Date(file.createdAt).toLocaleDateString("id-ID")}
                    </small>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={(event) => {
                        event.stopPropagation();
                        download(file);
                      }}
                    >
                      ↓
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {!files.length && !visibleFolders.length && (
              <div className="text-center text-secondary py-5">
                <div className="display-6">□</div>
                <strong>Folder ini masih kosong</strong>
                <p>Upload file atau buat folder baru untuk mulai.</p>
              </div>
            )}
          </div>
          <small className="text-secondary d-block mt-4">
            Tip: klik folder untuk membukanya · klik file untuk melihat aksi
          </small>
        </section>
      </div>
      {uploadState.active && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">Mengupload file</h5>
              </div>
              <div className="modal-body p-4">
                <div className="d-flex justify-content-between mb-2">
                  <strong className="text-truncate me-3">
                    {uploadState.filename}
                  </strong>
                  <span>
                    {uploadState.current + 1} / {uploadState.total}
                  </span>
                </div>
                <div className="progress" style={{ height: "18px" }}>
                  <div
                    className="progress-bar progress-bar-striped progress-bar-animated"
                    style={{ width: `${uploadState.percent}%` }}
                  >
                    {uploadState.percent}%
                  </div>
                </div>
                <div className="row g-2 mt-3">
                  <div className="col-6">
                    <div className="border rounded p-2">
                      <small className="text-secondary d-block">Kecepatan</small>
                      <strong>{formatSpeed(uploadState.speed)}</strong>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="border rounded p-2">
                      <small className="text-secondary d-block">
                        Estimasi selesai
                      </small>
                      <strong>{formatEta(uploadState.eta)}</strong>
                    </div>
                  </div>
                </div>
                <p className="text-secondary small mt-3 mb-0">
                  Jangan tutup halaman selama proses upload berlangsung.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      {alert && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div
                className={`modal-header text-white ${alert.type === "success" ? "bg-success" : alert.type === "danger" ? "bg-danger" : "bg-primary"}`}
              >
                <h5 className="modal-title">
                  {alert.type === "success"
                    ? "✓ "
                    : alert.type === "danger"
                      ? "! "
                      : "i "}
                  {alert.title}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setAlert(null)}
                />
              </div>
              <div className="modal-body p-4">
                <p className="mb-3">{alert.message}</p>
                {alert.shareUrl && (
                  <>
                    <label className="form-label small fw-bold">
                      URL share
                    </label>
                    <input
                      className="form-control mb-3"
                      readOnly
                      value={alert.shareUrl}
                      onFocus={(e) => e.currentTarget.select()}
                    />
                    <div className="d-flex gap-2">
                      <a
                        className="btn btn-outline-primary"
                        href={alert.shareUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Buka link
                      </a>
                      <button
                        className="btn btn-primary"
                        onClick={() => copyText(alert.shareUrl || "")}
                      >
                        Salin link
                      </button>
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setAlert(null)}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {folderDialog && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <form className="modal-content" onSubmit={createFolder}>
              <div className="modal-header">
                <h5 className="modal-title">Buat folder baru</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setFolderDialog(false)}
                />
              </div>
              <div className="modal-body">
                <p className="text-secondary">
                  Folder dibuat di {currentFolder?.name || "root workspace"}.
                </p>
                <label className="form-label">
                  Nama folder
                  <input
                    className="form-control"
                    autoFocus
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    placeholder="Contoh: Dokumen HR"
                  />
                </label>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setFolderDialog(false)}
                >
                  Batal
                </button>
                <button
                  className="btn btn-primary"
                  disabled={!folderName.trim() || loading}
                >
                  Buat folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
