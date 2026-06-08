import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import BuildOutlinedIcon from "@mui/icons-material/BuildOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ReportProblemOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import InventoryOutlinedIcon from "@mui/icons-material/InventoryOutlined";
import MoreVertOutlinedIcon from "@mui/icons-material/MoreVertOutlined";
import PersonSearchOutlinedIcon from "@mui/icons-material/PersonSearchOutlined";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import VideoCameraFrontOutlinedIcon from "@mui/icons-material/VideoCameraFrontOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  Divider,
  IconButton,
  InputAdornment,
  LinearProgress,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext";


const auditStatusOptions = ["assigned", "available", "repair", "retired"];
const physicalConditionOptions = ["good", "damaged", "not_working", "not_found"];
const resolutionOptions = ["open", "in_progress", "closed"];
const auditDecisionOptions = ["verified", "missing", "damaged"];
const fileValidation = {
  maxFileBytes: 50 * 1024 * 1024,
  allowedExtensions: new Set([".jpg", ".jpeg", ".png", ".mp4", ".webm"]),
  allowedMimeTypes: new Set(["image/jpeg", "image/png", "video/mp4", "video/webm"]),
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeAuditDecision(value) {
  const normalized = String(value || "").toLowerCase();
  if (auditDecisionOptions.includes(normalized)) return normalized;
  return "pending";
}

function fileExtension(name) {
  const base = String(name || "").toLowerCase();
  const dotIndex = base.lastIndexOf(".");
  return dotIndex >= 0 ? base.slice(dotIndex) : "";
}

function buildEvidenceObject(fileRecord) {
  return {
    id: fileRecord?.id || null,
    fileKind: String(fileRecord?.fileKind || "photo"),
    originalName: fileRecord?.originalName || "",
    mimeType: fileRecord?.mimeType || "",
    sizeBytes: Number(fileRecord?.sizeBytes || 0),
    createdAt: fileRecord?.createdAt || null,
  };
}

function normalizeStatus(statusValue) {
  const value = String(statusValue || "").toLowerCase();
  if (value === "in_use") return "assigned";
  if (["maintenance", "under_maintenance", "in_repair"].includes(value)) return "repair";
  return value || "available";
}

function formatDate(value) {
  if (!value) return "-";
  return String(value).slice(0, 10);
}

function buildDefaultEntry(asset) {
  return {
    auditStatus: "pending",
    auditDate: todayIsoDate(),
    auditorName: "",
    physicalStatus: normalizeStatus(asset?.status),
    physicalCondition: "good",
    evidence: [],
    remarks: "",
    reason: "",
    responsiblePerson: "",
    targetDate: "",
    resolutionStatus: "open",
  };
}

function needsReason(status) {
  return ["repair", "retired"].includes(String(status || "").toLowerCase());
}

function isAuditCompleted(entry, asset, hasEvidence) {
  const hasAuditDecision = String(entry?.auditStatus || "").toLowerCase() !== "pending";
  const hasAuditDate = Boolean(String(entry?.auditDate || "").trim());
  const hasPhysicalStatus = Boolean(String(entry?.physicalStatus || "").trim());
  const hasPhysicalCondition = Boolean(String(entry?.physicalCondition || "").trim());
  const hasReason = !needsReason(entry?.physicalStatus) || Boolean(String(entry?.reason || "").trim());
  const hasStatusMismatch = entry?.physicalStatus && normalizeStatus(asset?.status) !== entry.physicalStatus;

  return hasAuditDecision && hasAuditDate && hasPhysicalStatus && hasPhysicalCondition && hasEvidence && hasReason && !hasStatusMismatch;
}

function getIssueList(asset, entry, hasEvidence, statusMismatch) {
  const issues = [];

  if (!hasEvidence) issues.push("Asset without photo/video evidence");
  if (entry.auditStatus === "missing") issues.push("Missing asset");
  if (entry.auditStatus === "damaged") issues.push("Damaged asset requires repair workflow");
  if (statusMismatch) issues.push("Status mismatch (System != Physical)");
  if (entry.physicalCondition === "damaged" && normalizeStatus(asset.status) !== "repair") {
    issues.push("Damaged asset without status update");
  }
  if (normalizeStatus(asset.status) === "available" && entry.physicalStatus === "assigned" && !asset.assignedTo) {
    issues.push("Unassigned asset in use");
  }
  if (entry.physicalCondition === "not_found") {
    issues.push("Missing asset");
  }
  if (normalizeStatus(asset.status) === "retired" && entry.physicalStatus !== "retired") {
    issues.push("Retired asset still active in physical audit");
  }
  if (needsReason(entry.physicalStatus) && !String(entry.reason || "").trim()) {
    issues.push("Repair/Retired assets must include a reason");
  }

  return issues;
}


export default function AuditPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [totalExpected, setTotalExpected] = useState(0);
  const [auditMap, setAuditMap] = useState({});
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [rowActionAnchorEl, setRowActionAnchorEl] = useState(null);
  const [rowActionItem, setRowActionItem] = useState(null);
  const [queuedEvidenceByAsset, setQueuedEvidenceByAsset] = useState({});
  const [dragOverAssetId, setDragOverAssetId] = useState(null);
  const [search, setSearch] = useState("");
  const [issueFilter, setIssueFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [auditStatusFilter, setAuditStatusFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [photoCameraOpen, setPhotoCameraOpen] = useState(false);
  const [photoCameraError, setPhotoCameraError] = useState("");
  const [cameraAssetId, setCameraAssetId] = useState(null);
  const [photoFacingMode, setPhotoFacingMode] = useState("user");
  const [videoCameraOpen, setVideoCameraOpen] = useState(false);
  const [videoCameraError, setVideoCameraError] = useState("");
  const [videoCameraAssetId, setVideoCameraAssetId] = useState(null);
  const [videoFacingMode, setVideoFacingMode] = useState("environment");
  const [videoRecording, setVideoRecording] = useState(false);
  const [signOff, setSignOff] = useState({
    auditorName: user?.name || "",
    auditCompletionDate: "",
    managerApproval: "",
    finalRemarks: "",
  });
  const [saveError, setSaveError] = useState("");
  const canAudit = ["auditor"].includes(String(user?.role || "").toLowerCase());
  const previewToken = localStorage.getItem("asset_token") || "";
  const photoUploadRef = useRef(null);
  const videoUploadRef = useRef(null);
  const photoCameraVideoRef = useRef(null);
  const photoCameraCanvasRef = useRef(null);
  const photoCameraStreamRef = useRef(null);
  const videoCameraVideoRef = useRef(null);
  const videoCameraStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const queuedEvidenceRef = useRef({});

  function clearAuditFilters() {
    setSearch("");
    setIssueFilter("all");
    setTypeFilter("all");
    setAuditStatusFilter("all");
    setEmployeeFilter("all");
    setLocationFilter("all");
  }

  const hasActiveFilters = useMemo(
    () => Boolean(search) || issueFilter !== "all" || typeFilter !== "all" || auditStatusFilter !== "all" || employeeFilter !== "all" || locationFilter !== "all",
    [search, issueFilter, typeFilter, auditStatusFilter, employeeFilter, locationFilter]
  );

  const uiRadius = "6px";
  const controlHeight = 40;
  const panelPaddingX = "24px";
  const panelSectionPadding = "16px";
  const panelGap = "16px";
  const filterFieldSx = {
    width: "100%",
    "& .MuiOutlinedInput-root": {
      height: `${controlHeight}px`,
      borderRadius: uiRadius,
      fontSize: "14px",
      bgcolor: "#fff",
    },
    "& .MuiInputLabel-root": { fontSize: "14px" },
  };
  const panelFieldSx = {
    "& .MuiOutlinedInput-root": {
      minHeight: `${controlHeight}px`,
      borderRadius: uiRadius,
      fontSize: "14px",
      bgcolor: "#fff",
    },
    "& .MuiInputLabel-root": { fontSize: "14px" },
  };

  async function loadAuditData() {
    setLoading(true);
    setError("");
    try {
      const pageSize = 100;

      // First call — get page 1 and total count
      const first = await api.get("/assets", {
        params: { page: 1, pageSize, sortField: "id", sortDirection: "asc" },
      });
      const totalCount = Number(first.data?.total || 0);
      const rows = Array.isArray(first.data?.rows) ? [...first.data.rows] : [];

      // Fetch remaining pages in parallel
      if (totalCount > pageSize) {
        const totalPages = Math.ceil(totalCount / pageSize);
        const pageRequests = [];
        for (let p = 2; p <= totalPages; p++) {
          pageRequests.push(
            api.get("/assets", {
              params: { page: p, pageSize, sortField: "id", sortDirection: "asc" },
            })
          );
        }
        const results = await Promise.all(pageRequests);
        results.forEach((res) => {
          const chunk = Array.isArray(res.data?.rows) ? res.data.rows : [];
          rows.push(...chunk);
        });
      }

      let assignments = [];
      if (["admin", "it"].includes(user?.role)) {
        try {
          const { data } = await api.get("/assets/assignments");
          assignments = Array.isArray(data) ? data : [];
        } catch {
          assignments = [];
        }
      }

      const activeByAsset = new Map();
      assignments.forEach((assignment) => {
        const assetId = Number(assignment.assetId);
        if (!Number.isFinite(assetId)) return;
        if (!assignment.returnedAt && !activeByAsset.has(assetId)) {
          activeByAsset.set(assetId, assignment);
        }
      });

      const merged = rows.map((asset) => {
        const assignment = activeByAsset.get(Number(asset.id));
        return {
          ...asset,
          assignedTo: asset.assignedTo || assignment?.employeeName || "",
          assignedDepartment: asset.department || assignment?.department || "",
        };
      });

      let audits = [];
      try {
        const { data } = await api.get("/assets/audits");
        audits = Array.isArray(data) ? data : [];
      } catch {
        audits = [];
      }

      const nextAuditMap = {};
      audits.forEach((audit) => {
        const assetId = Number(audit.assetId);
        if (!Number.isFinite(assetId)) return;

        const baseAsset = merged.find((item) => Number(item.id) === assetId);
        const fallback = buildDefaultEntry(baseAsset || {});
        nextAuditMap[assetId] = {
          ...fallback,
          auditStatus: normalizeAuditDecision(audit.auditStatus) || "pending",
          auditDate: String(audit.auditDate || fallback.auditDate).slice(0, 10),
          auditorName: audit.auditorName || user?.name || "",
          physicalStatus: String(audit.physicalStatus || fallback.physicalStatus),
          physicalCondition: String(audit.physicalCondition || fallback.physicalCondition),
          remarks: audit.remarks || "",
          reason: audit.reason || "",
          responsiblePerson: audit.responsiblePerson || "",
          targetDate: audit.targetDate || "",
          resolutionStatus: audit.resolutionStatus || "open",
          evidence: Array.isArray(audit.files) ? audit.files.map(buildEvidenceObject) : [],
        };
      });

      setTotalExpected(totalCount);
      setAssets(merged);
      setAuditMap(nextAuditMap);
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || err.message || "Failed to load audit workspace.";
      setError(status ? `[${status}] ${msg}` : msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAuditData();
  }, []);

  useEffect(() => {
    queuedEvidenceRef.current = queuedEvidenceByAsset;
  }, [queuedEvidenceByAsset]);

  function getEntry(asset) {
    return auditMap[asset.id] || buildDefaultEntry(asset);
  }

  function updateEntry(assetId, patch) {
    setAuditMap((prev) => {
      const asset = assets.find((row) => row.id === assetId) || {};
      const current = prev[assetId] || buildDefaultEntry(asset);
      return {
        ...prev,
        [assetId]: {
          ...current,
          ...patch,
        },
      };
    });
  }

  function validateEvidenceFiles(files) {
    const selected = Array.from(files || []);
    const invalid = selected.find((file) => {
      const extension = fileExtension(file.name);
      const mime = String(file.type || "").toLowerCase();
      const allowedExtension = fileValidation.allowedExtensions.has(extension);
      const allowedMime = !mime || fileValidation.allowedMimeTypes.has(mime);
      return !allowedExtension || !allowedMime || Number(file.size || 0) > fileValidation.maxFileBytes;
    });

    if (invalid) {
      const tooLarge = Number(invalid.size || 0) > fileValidation.maxFileBytes;
      return {
        ok: false,
        message: tooLarge
          ? `${invalid.name} exceeds 50MB limit`
          : `${invalid.name} is not supported. Use only JPG, PNG, MP4, or WEBM files.`,
      };
    }

    return { ok: true, files: selected };
  }

  function getQueuedEvidence(assetId) {
    return queuedEvidenceByAsset[assetId] || [];
  }

  function addEvidenceToQueue(assetId, fileList) {
    if (!canAudit) {
      setSaveError("Only Admin or Auditor can upload evidence.");
      return;
    }

    const check = validateEvidenceFiles(fileList);
    if (!check.ok) {
      setSaveError(check.message);
      return;
    }

    if (!check.files?.length) return;

    const queuedFiles = check.files.map((file, index) => ({
      localId: `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
      file,
      fileKind: String(file.type || "").startsWith("video/") ? "video" : "photo",
      previewUrl: URL.createObjectURL(file),
      originalName: file.name,
      sizeBytes: Number(file.size || 0),
    }));

    setSaveError("");
    setQueuedEvidenceByAsset((prev) => ({
      ...prev,
      [assetId]: [...(prev[assetId] || []), ...queuedFiles],
    }));
  }

  function removeQueuedEvidence(assetId, localId) {
    setQueuedEvidenceByAsset((prev) => {
      const current = prev[assetId] || [];
      const removed = current.find((item) => item.localId === localId);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);

      return {
        ...prev,
        [assetId]: current.filter((item) => item.localId !== localId),
      };
    });
  }

  function clearQueuedEvidence(assetId) {
    setQueuedEvidenceByAsset((prev) => {
      const current = prev[assetId] || [];
      current.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      return {
        ...prev,
        [assetId]: [],
      };
    });
  }

  async function uploadEvidenceFiles(assetId, fileList) {
    if (!canAudit) {
      setSaveError("Only Admin or Auditor can upload evidence.");
      return [];
    }

    const check = validateEvidenceFiles(fileList);
    if (!check.ok) {
      setSaveError(check.message);
      return [];
    }

    if (!check.files?.length) return [];

    const formData = new FormData();
    check.files.forEach((file) => formData.append("files", file));

    try {
      setSaveError("");
      setUploadingEvidence(true);
      setUploadProgress(0);
      const { data } = await api.post(`/assets/${assetId}/audit/evidence`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (event) => {
          if (!event.total) return;
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);
        },
      });

      const uploaded = Array.isArray(data?.files) ? data.files.map(buildEvidenceObject) : [];
      updateEntry(assetId, {
        evidence: [...(getEntry({ id: assetId }).evidence || []), ...uploaded],
      });
      return uploaded;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Evidence upload failed";
      setSaveError(msg);
      return [];
    } finally {
      setUploadingEvidence(false);
      setUploadProgress(0);
    }
  }

  async function uploadQueuedEvidence(assetId) {
    const queued = getQueuedEvidence(assetId);
    if (!queued.length) return true;

    const uploaded = await uploadEvidenceFiles(assetId, queued.map((item) => item.file));
    if (!uploaded.length) return false;

    clearQueuedEvidence(assetId);
    return true;
  }

  async function removeEvidenceFile(assetId, fileId) {
    if (!canAudit) return;
    try {
      setSaveError("");
      await api.delete(`/assets/audit-files/${fileId}`);
      const entry = getEntry({ id: assetId });
      updateEntry(assetId, {
        evidence: (entry.evidence || []).filter((file) => Number(file.id) !== Number(fileId)),
      });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to remove evidence";
      setSaveError(msg);
    }
  }

  async function saveAuditRecord(asset) {
    if (!asset) return;
    if (!canAudit) {
      setSaveError("Employee role has view-only access for audit records.");
      return;
    }

    const entry = getEntry(asset);
    const evidence = Array.isArray(entry.evidence) ? entry.evidence : [];
    const queuedEvidence = getQueuedEvidence(asset.id);
    const hasPhoto =
      evidence.some((file) => String(file.fileKind) === "photo")
      || queuedEvidence.some((file) => String(file.fileKind) === "photo");
    const hasVideo =
      evidence.some((file) => String(file.fileKind) === "video")
      || queuedEvidence.some((file) => String(file.fileKind) === "video");
    const hasEvidence = hasPhoto && hasVideo;
    const statusMismatch = entry.physicalStatus && normalizeStatus(asset.status) !== entry.physicalStatus;
    const hasReason = !needsReason(entry.physicalStatus) || Boolean(String(entry.reason || "").trim());
    const compliant = entry.auditStatus === "verified" && hasEvidence && !statusMismatch && hasReason;

    if (!hasEvidence) {
      setSaveError("Please upload at least one photo and one video evidence file before saving.");
      return;
    }
    if (needsReason(entry.physicalStatus) && !hasReason) {
      setSaveError("Reason is required for repair or retired audit status.");
      return;
    }

    try {
      setSaveError("");
      const queuedUploaded = await uploadQueuedEvidence(asset.id);
      if (!queuedUploaded) return;

      const payload = {
        auditStatus: normalizeAuditDecision(entry.auditStatus),
        auditDate: entry.auditDate || todayIsoDate(),
        physicalStatus: entry.physicalStatus,
        physicalCondition: entry.physicalCondition,
        remarks: entry.remarks || "",
        reason: entry.reason || "",
        responsiblePerson: entry.responsiblePerson || "",
        targetDate: entry.targetDate || "",
        resolutionStatus: entry.resolutionStatus || "open",
        compliant,
      };

      await api.post(`/assets/${asset.id}/audit`, payload);
      await loadAuditData();
      setSelectedAsset(null);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to save audit record";
      setSaveError(msg);
    }
  }

  function stopPhotoCameraStream() {
    if (photoCameraStreamRef.current) {
      photoCameraStreamRef.current.getTracks().forEach((track) => track.stop());
      photoCameraStreamRef.current = null;
    }
    if (photoCameraVideoRef.current) {
      photoCameraVideoRef.current.srcObject = null;
    }
  }

  function stopVideoCameraStream() {
    if (videoCameraStreamRef.current) {
      videoCameraStreamRef.current.getTracks().forEach((track) => track.stop());
      videoCameraStreamRef.current = null;
    }
    if (videoCameraVideoRef.current) {
      videoCameraVideoRef.current.srcObject = null;
    }
  }

  async function getPreferredCameraStream(facingMode = "environment", withAudio = false) {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: facingMode } },
        audio: withAudio,
      });
    } catch {
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode } },
          audio: withAudio,
        });
      } catch {
        const probe = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        probe.getTracks().forEach((track) => track.stop());

        const cameras = (await navigator.mediaDevices.enumerateDevices()).filter(
          (device) => device.kind === "videoinput"
        );
        const matcher =
          facingMode === "environment"
            ? /(back|rear|environment|world)/i
            : /(front|user|face|selfie)/i;
        const matched = cameras.find((camera) => matcher.test(camera.label || "")) || cameras[0];

        if (!matched) throw new Error("No camera available");

        return await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: matched.deviceId } },
          audio: withAudio,
        });
      }
    }
  }

  async function openPhotoCamera(assetId, facingMode = "user") {
    setPhotoCameraError("");
    setCameraAssetId(assetId);
    setPhotoFacingMode(facingMode);
    setPhotoCameraOpen(true);
    stopPhotoCameraStream();

    if (!navigator.mediaDevices?.getUserMedia) {
      setPhotoCameraError("This browser does not support direct camera access. Use Chrome or Edge on desktop.");
      return;
    }

    try {
      const stream = await getPreferredCameraStream(facingMode, false);
      photoCameraStreamRef.current = stream;
      setTimeout(() => {
        if (photoCameraVideoRef.current) {
          photoCameraVideoRef.current.srcObject = stream;
        }
      }, 0);
    } catch (err) {
      const message = err?.name === "NotAllowedError"
        ? "Camera permission blocked. Allow camera for this site in browser settings, then click Retry Camera."
        : "Unable to access camera on this browser/device. Check OS privacy camera access and browser site permissions.";
      setPhotoCameraError(message);
    }
  }

  async function openVideoCamera(assetId, facingMode = "user") {
    setVideoCameraError("");
    setVideoCameraAssetId(assetId);
    setVideoFacingMode(facingMode);
    setVideoCameraOpen(true);
    setVideoRecording(false);
    stopVideoCameraStream();

    if (!navigator.mediaDevices?.getUserMedia) {
      setVideoCameraError("This browser does not support direct camera access. Use Chrome or Edge on desktop.");
      return;
    }

    try {
      const stream = await getPreferredCameraStream(facingMode, false);
      videoCameraStreamRef.current = stream;
      setTimeout(() => {
        if (videoCameraVideoRef.current) {
          videoCameraVideoRef.current.srcObject = stream;
        }
      }, 0);
    } catch (err) {
      const message = err?.name === "NotAllowedError"
        ? "Camera permission blocked. Allow camera for this site in browser settings, then click Retry Camera."
        : "Unable to access camera on this browser/device. Check OS privacy camera access and browser site permissions.";
      setVideoCameraError(message);
    }
  }

  function closePhotoCamera() {
    setPhotoCameraOpen(false);
    setPhotoCameraError("");
    setCameraAssetId(null);
    stopPhotoCameraStream();
  }

  function closeVideoCamera() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    setVideoRecording(false);
    setVideoCameraOpen(false);
    setVideoCameraError("");
    setVideoCameraAssetId(null);
    stopVideoCameraStream();
  }

  function capturePhotoFromCamera() {
    const video = photoCameraVideoRef.current;
    const canvas = photoCameraCanvasRef.current;
    if (!video || !canvas || !cameraAssetId) return;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      async (blob) => {
        if (!blob) return;
        const captured = new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
        await uploadEvidenceFiles(cameraAssetId, [captured]);
        closePhotoCamera();
      },
      "image/jpeg",
      0.92
    );
  }

  function startVideoRecording() {
    if (!videoCameraStreamRef.current || !videoCameraAssetId) return;

    const preferredTypes = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
    const mimeType = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type)) || "";
    const recorder = new MediaRecorder(videoCameraStreamRef.current, mimeType ? { mimeType } : undefined);

    recordedChunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };
    recorder.onstop = () => {
      const extension = mimeType.includes("webm") ? "webm" : "mp4";
      const recordedBlob = new Blob(recordedChunksRef.current, {
        type: mimeType || "video/webm",
      });
      const captured = new File([recordedBlob], `video-${Date.now()}.${extension}`, {
        type: mimeType || "video/webm",
      });
      uploadEvidenceFiles(videoCameraAssetId, [captured]);
      setVideoRecording(false);
      setVideoCameraOpen(false);
      setVideoCameraError("");
      setVideoCameraAssetId(null);
      stopVideoCameraStream();
      mediaRecorderRef.current = null;
    };

    mediaRecorderRef.current = recorder;
    recorder.start();
    setVideoRecording(true);
  }

  function stopVideoRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }


  const auditRows = useMemo(() => {
    return assets.map((asset) => {
      const isAudited = Object.prototype.hasOwnProperty.call(auditMap, asset.id);
      const entry = getEntry(asset);
      const evidence = Array.isArray(entry.evidence) ? entry.evidence : [];
      const hasPhoto = evidence.some((file) => String(file.fileKind) === "photo");
      const hasVideo = evidence.some((file) => String(file.fileKind) === "video");
      const hasEvidence = hasPhoto && hasVideo;
      const statusMismatch = entry.physicalStatus && normalizeStatus(asset.status) !== entry.physicalStatus;
      const hasReason = !needsReason(entry.physicalStatus) || Boolean(String(entry.reason || "").trim());
      const auditCompleted = isAuditCompleted(entry, asset, hasEvidence);
      const compliant = entry.auditStatus === "verified" && hasEvidence && !statusMismatch && hasReason;
      const issues = getIssueList(asset, entry, hasEvidence, statusMismatch);

      return {
        ...asset,
        systemStatus: normalizeStatus(asset.status),
        auditStatus: isAudited ? entry.auditStatus || "verified" : "pending",
        auditDate: isAudited ? entry.auditDate || "" : "",
        auditorName: isAudited ? entry.auditorName || "" : "",
        department: asset.assignedDepartment || asset.department || "-",
        serialNumber: String(asset.specs || "").match(/Serial:\s*([^|]+)/i)?.[1]?.trim() || "-",
        physicalStatus: entry.physicalStatus || "-",
        physicalCondition: entry.physicalCondition || "-",
        photoUploaded: hasPhoto ? "Yes" : "No",
        videoUploaded: hasVideo ? "Yes" : "No",
        auditorRemarks: entry.remarks || "-",
        auditCompleted,
        compliant,
        issues,
      };
    });
  }, [assets, auditMap]);

  const auditedCount = useMemo(
    () => auditRows.filter((row) => row.auditCompleted).length,
    [auditRows]
  );

  const evidenceCompleted = useMemo(
    () => auditRows.filter((row) => row.photoUploaded === "Yes" && row.videoUploaded === "Yes").length,
    [auditRows]
  );

  const evidencePercent = assets.length
    ? Math.round((evidenceCompleted / assets.length) * 100)
    : 0;

  const systemSummary = useMemo(() => {
    const assigned = auditRows.filter((row) => row.systemStatus === "assigned").length;
    const available = auditRows.filter((row) => row.systemStatus === "available").length;
    const repair = auditRows.filter((row) => row.systemStatus === "repair").length;
    const retired = auditRows.filter((row) => row.systemStatus === "retired").length;
    const missing = auditRows.filter((row) => row.physicalCondition === "not_found").length;

    return { assigned, available, repair, retired, missing };
  }, [auditRows]);

  const findings = useMemo(() => {
    const rows = [];
    auditRows.forEach((asset) => {
      const entry = getEntry(asset);
      asset.issues.forEach((issue) => {
        rows.push({
          id: `${asset.id}-${issue}`,
          assetTag: asset.assetTag,
          assetName: asset.name,
          issue,
          actionRequired: issue.includes("Status mismatch")
            ? "Update system status to match physical verification"
            : issue.includes("evidence")
              ? "Upload mandatory photo and video evidence"
              : issue.includes("Missing asset")
                ? "Escalate and locate physical asset immediately"
                : issue.includes("Damaged")
                  ? "Raise repair request and update status"
                  : issue.includes("Unassigned")
                    ? "Verify user assignment and update record"
                    : issue.includes("Repair/Retired")
                      ? "Capture reason and supporting remarks"
                      : "Review and rectify",
          responsiblePerson: entry.responsiblePerson || "Pending owner",
          targetDate: entry.targetDate || "-",
          resolutionStatus: entry.resolutionStatus || "open",
        });
      });
    });
    return rows;
  }, [auditRows, auditMap]);

  const correctiveRows = useMemo(
    () =>
      findings.map((item) => ({
        ...item,
        assetId: Number(String(item.id).split("-")[0]),
      })),
    [findings]
  );

  const correctiveColumns = useMemo(
    () => [
      {
        field: "assetTag",
        headerName: "Asset",
        minWidth: 130,
        flex: 0.75,
        renderCell: (params) => (
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#0f766e" }}>{params.value}</Typography>
        ),
      },
      { field: "issue", headerName: "Issue Identified", minWidth: 220, flex: 1.2 },
      { field: "actionRequired", headerName: "Action Required", minWidth: 250, flex: 1.35 },
      { field: "responsiblePerson", headerName: "Responsible", minWidth: 150, flex: 0.9 },
      { field: "targetDate", headerName: "Target Date", minWidth: 120, flex: 0.7 },
      {
        field: "resolutionStatus",
        headerName: "Status",
        minWidth: 120,
        flex: 0.7,
        renderCell: (params) => (
          <Chip
            size="small"
            label={String(params.value || "open").replace(/_/g, " ")}
            sx={{
              textTransform: "capitalize",
              fontSize: 11,
              fontWeight: 700,
              bgcolor: "#f3f4f6",
              color: "#374151",
              border: "none",
            }}
          />
        ),
      },
    ],
    []
  );

  const requestedAssetId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const assetId = Number(params.get("assetId"));
    return Number.isFinite(assetId) && assetId > 0 ? assetId : null;
  }, [location.search]);

  const requestedAsset = useMemo(
    () => (requestedAssetId ? auditRows.find((row) => Number(row.id) === requestedAssetId) || null : null),
    [auditRows, requestedAssetId]
  );

  useEffect(() => {
    if (!auditRows.length) return;
    if (!requestedAssetId) return;

    const target = auditRows.find((row) => Number(row.id) === requestedAssetId);
    if (target) {
      setSelectedAsset(target);
    }
  }, [auditRows, requestedAssetId]);

  useEffect(() => {
    return () => {
      stopPhotoCameraStream();
      stopVideoCameraStream();
      Object.values(queuedEvidenceRef.current)
        .flat()
        .forEach((item) => {
          if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
        });
    };
  }, []);

  const filteredAuditRows = useMemo(() => {
    const searchText = String(search || "").trim().toLowerCase();
    return auditRows.filter((row) => {
      const rowText = [row.assetTag, row.name, row.type, row.assignedTo, row.location]
        .map((item) => String(item || "").toLowerCase())
        .join(" ");
      const searchMatch = searchText ? rowText.includes(searchText) : true;

      if (!searchMatch) return false;
      if (typeFilter !== "all" && row.type !== typeFilter) return false;
      if (auditStatusFilter !== "all" && row.auditStatus !== auditStatusFilter) return false;
      if (employeeFilter !== "all" && String(row.assignedTo || "") !== employeeFilter) return false;
      if (locationFilter !== "all" && String(row.location || "") !== locationFilter) return false;

      if (issueFilter === "completed") return row.compliant;
      if (issueFilter === "issues_only") return !row.compliant;
      if (issueFilter === "evidence_missing") return row.photoUploaded === "No" || row.videoUploaded === "No";
      if (issueFilter === "status_mismatch") return row.issues.includes("Status mismatch (System != Physical)");
      if (issueFilter === "missing_assets") return row.physicalCondition === "not_found";

      return true;
    });
  }, [auditRows, search, issueFilter, typeFilter, auditStatusFilter, employeeFilter, locationFilter]);

  const typeFilterOptions = useMemo(
    () => Array.from(new Set(auditRows.map((row) => String(row.type || "")).filter(Boolean))).sort(),
    [auditRows]
  );

  const employeeFilterOptions = useMemo(
    () => Array.from(new Set(auditRows.map((row) => String(row.assignedTo || "")).filter(Boolean))).sort(),
    [auditRows]
  );

  const locationFilterOptions = useMemo(
    () => Array.from(new Set(auditRows.map((row) => String(row.location || "")).filter(Boolean))).sort(),
    [auditRows]
  );

  function exportAuditCsv() {
    if (!filteredAuditRows.length) return;

    const headers = [
      "Asset ID",
      "Asset Name",
      "Asset Type",
      "Serial Number",
      "Assigned User",
      "Department",
      "Location",
      "Audit Status",
      "Audit Date",
      "System Status",
      "Physical Status",
      "Physical Condition",
      "Photo Uploaded",
      "Video Uploaded",
      "Compliant",
      "Issues",
      "Auditor Remarks",
    ];

    const rows = filteredAuditRows.map((row) => [
      row.assetTag,
      row.name,
      row.type,
      row.serialNumber,
      row.assignedTo || "-",
      row.department || "-",
      row.location || "-",
      row.auditStatus,
      row.auditDate || "-",
      row.systemStatus,
      row.physicalStatus,
      row.physicalCondition,
      row.photoUploaded,
      row.videoUploaded,
      row.compliant ? "Yes" : "No",
      row.issues.join(" | "),
      row.auditorRemarks || "-",
    ]);

    const csv = [headers, ...rows]
      .map((line) => line.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-report-${formatDate(new Date().toISOString())}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function openRowActionMenu(event, row) {
    event.stopPropagation();
    setRowActionAnchorEl(event.currentTarget);
    setRowActionItem(row);
  }

  function closeRowActionMenu() {
    setRowActionAnchorEl(null);
    setRowActionItem(null);
  }

  function exportSingleAuditRow(row) {
    if (!row) return;

    const headers = [
      "Asset ID",
      "Asset Name",
      "Asset Type",
      "Serial Number",
      "Assigned User",
      "Department",
      "Location",
      "Audit Status",
      "Audit Date",
      "System Status",
      "Physical Status",
      "Physical Condition",
      "Photo Uploaded",
      "Video Uploaded",
      "Compliant",
      "Issues",
      "Auditor Remarks",
    ];

    const rowData = [
      row.assetTag,
      row.name,
      row.type,
      row.serialNumber,
      row.assignedTo || "-",
      row.department || "-",
      row.location || "-",
      row.auditStatus,
      row.auditDate || "-",
      row.systemStatus,
      row.physicalStatus,
      row.physicalCondition,
      row.photoUploaded,
      row.videoUploaded,
      row.compliant ? "Yes" : "No",
      Array.isArray(row.issues) ? row.issues.join(" | ") : "",
      row.auditorRemarks || "-",
    ];

    const csv = [headers, rowData]
      .map((line) => line.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-item-${row.assetTag || row.id}-${formatDate(new Date().toISOString())}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const columns = [
    { field: "assetTag", headerName: "Asset ID", minWidth: 130, flex: 0.85 },
    { field: "name", headerName: "Asset Name", minWidth: 180, flex: 1.1 },
    { field: "type", headerName: "Asset Type", minWidth: 140, flex: 0.85 },
    { field: "serialNumber", headerName: "Serial Number", minWidth: 150, flex: 0.9 },
    { field: "assignedTo", headerName: "Assigned User", minWidth: 170, flex: 1 },
    { field: "department", headerName: "Department", minWidth: 140, flex: 0.8 },
    { field: "location", headerName: "Location", minWidth: 130, flex: 0.8 },
    {
      field: "auditStatus",
      headerName: "Audit Status",
      minWidth: 130,
      flex: 0.8,
      align: "left",
      headerAlign: "left",
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", width: "100%", height: "100%" }}>
          <Chip
            size="small"
            label={String(params.value || "pending").replace(/_/g, " ")}
            sx={{ textTransform: "capitalize", fontWeight: 700, bgcolor: "#f3f4f6", border: "1px solid #d1d5db" }}
          />
        </Box>
      ),
    },
    {
      field: "systemStatus",
      headerName: "System Status",
      minWidth: 140,
      align: "left",
      headerAlign: "left",
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", width: "100%", height: "100%" }}>
          <Chip
            size="small"
            label={String(params.value || "-").replace(/_/g, " ")}
            sx={{ textTransform: "capitalize", fontWeight: 700, bgcolor: "#f3f4f6", border: "1px solid #d1d5db" }}
          />
        </Box>
      ),
    },
    {
      field: "physicalCondition",
      headerName: "Physical Condition",
      minWidth: 160,
      align: "left",
      headerAlign: "left",
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", width: "100%", height: "100%" }}>
          <Typography sx={{ textTransform: "capitalize", fontWeight: 600, color: "#1f2937" }}>
            {String(params.value || "-").replace(/_/g, " ")}
          </Typography>
        </Box>
      ),
    },
    {
      field: "photoUploaded",
      headerName: "Photo Uploaded",
      minWidth: 130,
      align: "left",
      headerAlign: "left",
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", width: "100%", height: "100%" }}>
          <Chip
            size="small"
            label={params.value}
            sx={{
              textTransform: "capitalize",
              fontSize: 11,
              fontWeight: 700,
              bgcolor: "#f3f4f6",
              color: "#374151",
              border: "none",
            }}
          />
        </Box>
      ),
    },
    {
      field: "videoUploaded",
      headerName: "Video Uploaded",
      minWidth: 130,
      align: "left",
      headerAlign: "left",
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", width: "100%", height: "100%" }}>
          <Chip
            size="small"
            label={params.value}
            sx={{
              textTransform: "capitalize",
              fontSize: 11,
              fontWeight: 700,
              bgcolor: "#f3f4f6",
              color: "#374151",
              border: "none",
            }}
          />
        </Box>
      ),
    },
    {
      field: "compliant",
      headerName: "Compliance",
      minWidth: 130,
      renderCell: (params) => (
        <Chip
          size="small"
          label={params.value ? "Compliant" : "Issue"}
          sx={{
            textTransform: "capitalize",
            fontSize: 11,
            fontWeight: 700,
            bgcolor: "#f3f4f6",
            color: "#374151",
            border: "none",
          }}
        />
      ),
    },
    { field: "auditDate", headerName: "Audit Date", minWidth: 120, flex: 0.7 },
    {
      field: "actions",
      headerName: "Actions",
      width: 90,
      minWidth: 90,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <IconButton
          size="small"
          onClick={(event) => openRowActionMenu(event, params.row)}
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1,
            border: "1px solid #cbd5e1",
            color: "#475569",
            bgcolor: "#fff",
            "&:hover": { bgcolor: "#f8fafc", borderColor: "#94a3b8" },
          }}
          aria-label="Open audit item"
        >
          <MoreVertOutlinedIcon sx={{ fontSize: 18 }} />
        </IconButton>
      ),
    },
  ];

  const auditProgress = assets.length ? Math.round((auditedCount / assets.length) * 100) : 0;
  const issueCount = findings.length;
  const compliantCount = auditRows.filter((r) => r.compliant).length;

  const summaryCards = [
    {
      key: "total",
      label: "Total Assets",
      value: assets.length,
      icon: <InventoryOutlinedIcon sx={{ fontSize: 32 }} />,
    },
    {
      key: "assigned",
      label: "Assigned",
      value: systemSummary.assigned,
      icon: <PersonSearchOutlinedIcon sx={{ fontSize: 32 }} />,
    },
    {
      key: "available",
      label: "Available",
      value: systemSummary.available,
      icon: <CheckCircleOutlineIcon sx={{ fontSize: 32 }} />,
    },
    {
      key: "repair",
      label: "Under Repair",
      value: systemSummary.repair,
      icon: <BuildOutlinedIcon sx={{ fontSize: 32 }} />,
    },
    {
      key: "retired",
      label: "Retired",
      value: systemSummary.retired,
      icon: <ReportProblemOutlinedIcon sx={{ fontSize: 32 }} />,
    },
    {
      key: "missing",
      label: "Missing",
      value: systemSummary.missing,
      icon: <WarningAmberOutlinedIcon sx={{ fontSize: 32 }} />,
    },
  ];

  return (
    <Stack spacing={2.5}>
      <Paper
        elevation={0}
        sx={{
          p: "20px",
          borderRadius: uiRadius,
          border: "1px solid #e5e7eb",
          bgcolor: "#fff",
          boxShadow: "0 10px 20px rgba(15, 23, 42, 0.04)",
        }}
      >
        {/* Row 1: Title + stat cards */}
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2.5}
          alignItems={{ xs: "flex-start", md: "center" }}
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{ bgcolor: "#f3f4f6", borderRadius: uiRadius, p: "6px", display: "flex", alignItems: "center" }}>
              <FactCheckOutlinedIcon sx={{ color: "#374151", fontSize: 22 }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 18, fontWeight: 800, color: "#111827", lineHeight: 1.2 }}>Asset Audit</Typography>
              <Typography sx={{ fontSize: 12, color: "#6b7280", mt: 0.25 }}>Physical verification &amp; evidence tracking</Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap>
            {[
              { label: "Total Assets", value: assets.length },
              { label: "Audited", value: `${auditedCount}/${assets.length}` },
              { label: "Compliant", value: compliantCount },
              { label: "Findings", value: issueCount },
            ].map((stat) => (
              <Box
                key={stat.label}
                sx={{
                  textAlign: "center",
                  px: "18px",
                  py: "8px",
                  borderRadius: uiRadius,
                  bgcolor: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  minWidth: 88,
                }}
              >
                <Typography sx={{ fontSize: 20, fontWeight: 800, color: "#111827", lineHeight: 1 }}>{stat.value}</Typography>
                <Typography sx={{ fontSize: 11, color: "#6b7280", mt: 0.3, fontWeight: 600, letterSpacing: "0.2px" }}>{stat.label}</Typography>
              </Box>
            ))}
          </Stack>
        </Stack>

        <Divider sx={{ my: "20px" }} />

        {/* Row 2: Progress bars */}
        <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: "100%", mb: 0.75 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>Audit Progress</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>{auditProgress}%</Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={auditProgress}
              sx={{
                height: 6,
                borderRadius: 5,
                bgcolor: "#e5e7eb",
                "& .MuiLinearProgress-bar": { bgcolor: "#374151", borderRadius: 5 },
              }}
            />
            <Typography sx={{ mt: 0.6, fontSize: 11, color: "#9ca3af" }}>
              {auditedCount} of {assets.length} assets audited
            </Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: "100%", mb: 0.75 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>Evidence Coverage</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>{evidencePercent}%</Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={evidencePercent}
              sx={{
                height: 6,
                borderRadius: 5,
                bgcolor: "#e5e7eb",
                "& .MuiLinearProgress-bar": { bgcolor: "#6b7280", borderRadius: 5 },
              }}
            />
            <Typography sx={{ mt: 0.6, fontSize: 11, color: "#9ca3af" }}>
              Target: {totalExpected || assets.length} assets with photo &amp; video
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {requestedAssetId ? (
        <Alert severity={requestedAsset ? "info" : "warning"} sx={{ borderRadius: "8px" }}>
          {requestedAsset
            ? `Opened from Assets page for ${requestedAsset.assetTag}${requestedAsset.name ? ` - ${requestedAsset.name}` : ""}. Complete this audit item here.`
            : `Opened from Assets page for asset ID ${requestedAssetId}. The asset will appear here once audit data finishes loading.`}
        </Alert>
      ) : null}

      {error ? <Alert severity="error" sx={{ borderRadius: "8px" }}>{error}</Alert> : null}

      <Paper elevation={0} sx={{ p: "20px", borderRadius: uiRadius, border: "1px solid #e5e7eb", bgcolor: "#fff", boxShadow: "0 10px 20px rgba(15, 23, 42, 0.04)" }}>
        {/* Row 1: Search + dropdowns + Export */}
        <Box
          sx={{
            display: "grid",
            gap: "12px",
            alignItems: "end",
            gridTemplateColumns: {
              xs: "1fr",
              md: "minmax(280px, 1.5fr) repeat(4, minmax(140px, 1fr)) auto",
            },
          }}
        >
          <TextField
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search asset, user, location..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchOutlinedIcon sx={{ color: "#9ca3af", fontSize: 18 }} />
                </InputAdornment>
              ),
            }}
            sx={filterFieldSx}
          />
          <TextField select size="small" label="Type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} sx={filterFieldSx}>
            <MenuItem value="all">All</MenuItem>
            {typeFilterOptions.map((value) => (
              <MenuItem key={value} value={value} sx={{ textTransform: "capitalize" }}>{value.replace(/_/g, " ")}</MenuItem>
            ))}
          </TextField>
          <TextField select size="small" label="Audit Status" value={auditStatusFilter} onChange={(e) => setAuditStatusFilter(e.target.value)} sx={filterFieldSx}>
            <MenuItem value="all">All</MenuItem>
            {auditDecisionOptions.map((value) => (
              <MenuItem key={value} value={value} sx={{ textTransform: "capitalize" }}>{value.replace(/_/g, " ")}</MenuItem>
            ))}
            <MenuItem value="pending">Pending</MenuItem>
          </TextField>
          <TextField select size="small" label="Employee" value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} sx={filterFieldSx}>
            <MenuItem value="all">All</MenuItem>
            {employeeFilterOptions.map((value) => (<MenuItem key={value} value={value}>{value}</MenuItem>))}
          </TextField>
          <TextField select size="small" label="Location" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} sx={filterFieldSx}>
            <MenuItem value="all">All</MenuItem>
            {locationFilterOptions.map((value) => (<MenuItem key={value} value={value}>{value}</MenuItem>))}
          </TextField>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ justifySelf: { xs: "stretch", md: "end" } }}>
            <Button
              variant="outlined"
              size="small"
              onClick={clearAuditFilters}
              disabled={!hasActiveFilters}
              sx={{
                height: controlHeight,
                px: 2,
                textTransform: "none",
                borderRadius: uiRadius,
                fontWeight: 600,
                borderColor: "#d1d5db",
                color: "#374151",
                whiteSpace: "nowrap",
                width: { xs: "100%", md: "auto" },
              }}
            >
              Clear
            </Button>
            <Tooltip title="Export current view as CSV">
              <span>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<FileDownloadOutlinedIcon />}
                  onClick={exportAuditCsv}
                  disabled={!filteredAuditRows.length}
                  sx={{
                    height: controlHeight,
                    px: 2,
                    textTransform: "none",
                    borderRadius: uiRadius,
                    fontWeight: 600,
                    borderColor: "#d1d5db",
                    color: "#374151",
                    whiteSpace: "nowrap",
                    width: { xs: "100%", md: "auto" },
                  }}
                >
                  Export
                </Button>
              </span>
            </Tooltip>
          </Stack>
        </Box>

        {/* Row 2: Quick-filter buttons */}
        <Box sx={{ mt: "12px", pt: "12px", borderTop: "1px solid #f3f4f6" }}>
          <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap>
            {[
              { key: "all", label: "All", minWidth: 64 },
              { key: "completed", label: "Compliant", minWidth: 108 },
              { key: "issues_only", label: "Issues", minWidth: 80 },
              { key: "evidence_missing", label: "Evidence Missing", minWidth: 148 },
            ].map(({ key, label, minWidth }) => {
              const active = issueFilter === key;
              return (
                <Button
                  key={key}
                  variant={active ? "contained" : "outlined"}
                  size="small"
                  onClick={() => setIssueFilter(key)}
                  sx={{
                    minWidth,
                    minHeight: controlHeight,
                    px: 2,
                    textTransform: "none",
                    borderRadius: uiRadius,
                    fontWeight: 600,
                    fontSize: 12,
                    boxShadow: "none",
                    bgcolor: active ? "#374151" : "#fff",
                    color: active ? "#fff" : "#374151",
                    borderColor: active ? "#374151" : "#d1d5db",
                    "&:hover": {
                      bgcolor: active ? "#1f2937" : "#f9fafb",
                      borderColor: active ? "#1f2937" : "#9ca3af",
                      boxShadow: "none",
                    },
                  }}
                >
                  {label}
                </Button>
              );
            })}
          </Stack>
        </Box>
      </Paper>

      <Paper elevation={0} sx={{ borderRadius: "10px", border: "1px solid #e5e7eb", bgcolor: "#fff", overflow: "hidden" }}>
        <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography sx={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>Audit Assets</Typography>
          <Typography sx={{ fontSize: 12, color: "#6b7280" }}>{filteredAuditRows.length} items</Typography>
        </Box>
        <DataGrid
          autoHeight
          rows={filteredAuditRows}
          columns={columns}
          loading={loading}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
          sx={{
            border: "none",
            "& .MuiDataGrid-columnHeader[data-field='actions']": {
              position: "sticky",
              right: 0,
              zIndex: 5,
              bgcolor: "#f9fafb",
              boxShadow: "-2px 0 0 #eef2f7",
            },
            "& .MuiDataGrid-cell[data-field='actions']": {
              position: "sticky",
              right: 0,
              zIndex: 3,
              bgcolor: "#fff",
              boxShadow: "-2px 0 0 #eef2f7",
            },
            "& .MuiDataGrid-columnHeaders": {
              bgcolor: "#f9fafb",
              borderBottom: "1px solid #e5e7eb",
              color: "#6b7280",
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.4px",
              fontWeight: 700,
            },
            "& .MuiDataGrid-row": { cursor: "default" },
            "& .MuiDataGrid-row:hover": { bgcolor: "#f3f4f6" },
            "& .MuiDataGrid-cell": { borderBottom: "1px solid #eef2f7", alignItems: "center" },
            "& .MuiDataGrid-footerContainer": { borderTop: "1px solid #e5e7eb" },
          }}
        />

        <Menu
          anchorEl={rowActionAnchorEl}
          open={Boolean(rowActionAnchorEl)}
          onClose={closeRowActionMenu}
          transformOrigin={{ horizontal: "right", vertical: "top" }}
          anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        >
          <MenuItem
            onClick={() => {
              if (rowActionItem) setSelectedAsset(rowActionItem);
              closeRowActionMenu();
            }}
          >
            <MoreVertOutlinedIcon sx={{ fontSize: 16, mr: 1 }} />
            Open audit item
          </MenuItem>
          <MenuItem
            onClick={() => {
              exportSingleAuditRow(rowActionItem);
              closeRowActionMenu();
            }}
          >
            <FileDownloadOutlinedIcon sx={{ fontSize: 16, mr: 1 }} />
            Extract row
          </MenuItem>
        </Menu>
      </Paper>

      {/* Audit Item Side Panel */}
      <Drawer
        anchor="right"
        open={Boolean(selectedAsset)}
        onClose={() => setSelectedAsset(null)}
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          sx: {
            width: { xs: "100vw", sm: 640 },
            maxWidth: "100vw",
            borderLeft: "1px solid #e5e7eb",
            boxShadow: "-4px 0 24px rgba(15, 23, 42, 0.12)",
            bgcolor: "#fff",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        {selectedAsset ? (
          <Stack sx={{ height: "100%" }}>
            {/* Panel Header */}
            <Box
              sx={{
                px: panelPaddingX,
                py: "16px",
                borderBottom: "1px solid #e5e7eb",
                bgcolor: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>Audit Item</Typography>
                <Typography sx={{ fontSize: 12, color: "#6b7280", mt: 0.25 }}>
                  {selectedAsset.assetTag} &mdash; {selectedAsset.location || "No location"}
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => setSelectedAsset(null)} sx={{ color: "#6b7280" }}>
                <CloseOutlinedIcon fontSize="small" />
              </IconButton>
            </Box>

            {/* Asset Identity */}
            <Box sx={{ px: panelPaddingX, py: "16px", bgcolor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
              <Typography sx={{ fontWeight: 800, fontSize: 18, color: "#111827" }}>
                {selectedAsset.name}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: "8px" }} flexWrap="wrap" useFlexGap>
                <Chip
                  size="small"
                  label={selectedAsset.type || "Unknown"}
                  sx={{ bgcolor: "#e0f2fe", color: "#0369a1", fontWeight: 600, fontSize: 11 }}
                />
                <Chip
                  size="small"
                  label={`Assigned: ${selectedAsset.assignedTo || "None"}`}
                  sx={{ bgcolor: "#f0fdf4", color: "#15803d", fontWeight: 600, fontSize: 11 }}
                />
                <Chip
                  size="small"
                  label={`System: ${normalizeStatus(selectedAsset.status)}`}
                  sx={{ bgcolor: "#f3f4f6", color: "#374151", fontWeight: 600, fontSize: 11, textTransform: "capitalize" }}
                />
              </Stack>
              <Box
                sx={{
                  mt: "12px",
                  display: "grid",
                  gridTemplateColumns: "minmax(120px, 1fr) minmax(120px, 1fr)",
                  rowGap: "4px",
                  columnGap: "12px",
                }}
              >
                <Typography sx={{ fontSize: 12, color: "#475569" }}>Asset ID: {selectedAsset.assetTag || "-"}</Typography>
                <Typography sx={{ fontSize: 12, color: "#475569" }}>Serial: {selectedAsset.serialNumber || "-"}</Typography>
                <Typography sx={{ fontSize: 12, color: "#475569" }}>Type: {selectedAsset.type || "-"}</Typography>
                <Typography sx={{ fontSize: 12, color: "#475569" }}>Department: {selectedAsset.department || "-"}</Typography>
                <Typography sx={{ fontSize: 12, color: "#475569" }}>Employee: {selectedAsset.assignedTo || "-"}</Typography>
                <Typography sx={{ fontSize: 12, color: "#475569" }}>Location: {selectedAsset.location || "-"}</Typography>
              </Box>
            </Box>

            {/* Scrollable Body */}
            <Box sx={{ px: panelPaddingX, py: "20px", overflow: "auto", flex: 1 }}>
              {(() => {
                const entry = getEntry(selectedAsset);
                const queuedEvidence = getQueuedEvidence(selectedAsset.id);
                const statusMismatch = normalizeStatus(selectedAsset.status) !== entry.physicalStatus;
                const reasonNeeded = needsReason(entry.physicalStatus);
                const reasonMissing = reasonNeeded && !String(entry.reason || "").trim();

                return (
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                      gap: panelGap,
                      alignItems: "start",
                    }}
                  >
                    {/* Section: Physical Verification */}
                    <Box sx={{ border: "1px solid #e5e7eb", borderRadius: uiRadius, p: panelSectionPadding }}>
                      <Typography
                        sx={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#6b7280",
                          textTransform: "uppercase",
                          letterSpacing: "0.6px",
                          mb: "10px",
                        }}
                      >
                        Physical Verification
                      </Typography>
                      <Stack spacing={1.25}>
                        <TextField
                          select
                          label="Audit Decision"
                          size="small"
                          value={entry.auditStatus}
                          onChange={(e) => updateEntry(selectedAsset.id, { auditStatus: e.target.value })}
                          fullWidth
                          sx={panelFieldSx}
                        >
                          {auditDecisionOptions.map((status) => (
                            <MenuItem key={status} value={status} sx={{ textTransform: "capitalize" }}>
                              {status.replace(/_/g, " ")}
                            </MenuItem>
                          ))}
                        </TextField>
                        <TextField
                          type="date"
                          label="Audit Date"
                          size="small"
                          value={entry.auditDate || ""}
                          onChange={(e) => updateEntry(selectedAsset.id, { auditDate: e.target.value })}
                          InputLabelProps={{ shrink: true }}
                          fullWidth
                          sx={panelFieldSx}
                        />
                        <TextField
                          label="Auditor Name"
                          size="small"
                          value={entry.auditorName || user?.name || "-"}
                          InputProps={{ readOnly: true }}
                          fullWidth
                          sx={panelFieldSx}
                        />
                        <TextField
                          select
                          label="Physical Status"
                          size="small"
                          value={entry.physicalStatus}
                          onChange={(e) => updateEntry(selectedAsset.id, { physicalStatus: e.target.value })}
                          fullWidth
                          sx={panelFieldSx}
                        >
                          {auditStatusOptions.map((status) => (
                            <MenuItem key={status} value={status}>
                              {status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                            </MenuItem>
                          ))}
                        </TextField>
                        <TextField
                          select
                          label="Physical Condition"
                          size="small"
                          value={entry.physicalCondition}
                          onChange={(e) => updateEntry(selectedAsset.id, { physicalCondition: e.target.value })}
                          fullWidth
                          sx={panelFieldSx}
                        >
                          {physicalConditionOptions.map((condition) => (
                            <MenuItem key={condition} value={condition}>
                              {condition.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                            </MenuItem>
                          ))}
                        </TextField>
                        {statusMismatch && (
                          <Alert severity="warning" sx={{ borderRadius: uiRadius, py: "4px" }}>
                            Physical status does not match the system record.
                          </Alert>
                        )}
                      </Stack>
                    </Box>

                    {/* Section: Evidence Upload */}
                    <Box sx={{ border: "1px solid #e5e7eb", borderRadius: uiRadius, p: panelSectionPadding }}>
                      <Typography
                        sx={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#6b7280",
                          textTransform: "uppercase",
                          letterSpacing: "0.6px",
                          mb: "10px",
                        }}
                      >
                        Evidence (Mandatory)
                      </Typography>
                      <Stack spacing={1.25}>
                        <Box
                          onDragOver={(event) => {
                            event.preventDefault();
                            setDragOverAssetId(selectedAsset.id);
                          }}
                          onDragLeave={() => {
                            setDragOverAssetId(null);
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            setDragOverAssetId(null);
                            addEvidenceToQueue(selectedAsset.id, event.dataTransfer.files);
                          }}
                          sx={{
                            border: "1px dashed #94a3b8",
                            borderRadius: uiRadius,
                            p: "16px",
                            bgcolor: dragOverAssetId === selectedAsset.id ? "#ecfeff" : "#f8fafc",
                            textAlign: "center",
                          }}
                        >
                          <UploadFileOutlinedIcon sx={{ color: "#475569", fontSize: 24 }} />
                          <Typography sx={{ mt: 0.75, fontSize: 13, fontWeight: 700, color: "#334155" }}>
                            Drag and drop photos/videos to queue
                          </Typography>
                          <Typography sx={{ fontSize: 12, color: "#64748b", mt: 0.35 }}>
                            Bulk upload supported. Max 50MB each. JPG, PNG, MP4, WEBM.
                          </Typography>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => photoUploadRef.current?.click()}
                            disabled={!canAudit || uploadingEvidence}
                            sx={{ mt: "10px", textTransform: "none", borderRadius: uiRadius, borderColor: "#cbd5e1", color: "#334155", height: `${controlHeight}px` }}
                          >
                            Add Files
                          </Button>
                          <input
                            ref={photoUploadRef}
                            type="file"
                            accept=".jpg,.jpeg,.png,.mp4,.webm"
                            multiple
                            style={{ display: "none" }}
                            onChange={(e) => {
                              addEvidenceToQueue(selectedAsset.id, e.target.files);
                              e.target.value = "";
                            }}
                          />
                        </Box>

                        {queuedEvidence.length ? (
                          <Box sx={{ border: "1px solid #e2e8f0", borderRadius: uiRadius, p: "10px", bgcolor: "#f8fafc" }}>
                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                              <Typography sx={{ fontSize: 12, fontWeight: 800, color: "#334155" }}>
                                Bulk Upload Queue ({queuedEvidence.length})
                              </Typography>
                              <Button
                                variant="text"
                                size="small"
                                onClick={() => clearQueuedEvidence(selectedAsset.id)}
                                disabled={!canAudit || uploadingEvidence}
                                sx={{ textTransform: "none", minWidth: 0 }}
                              >
                                Clear
                              </Button>
                            </Stack>
                            <Stack spacing={1}>
                              {queuedEvidence.map((file) => (
                                <Box
                                  key={file.localId}
                                  sx={{
                                    border: "1px solid #e2e8f0",
                                    borderRadius: uiRadius,
                                    p: "8px",
                                    bgcolor: "#fff",
                                  }}
                                >
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Box sx={{ width: 80, height: 56, borderRadius: "6px", bgcolor: "#f1f5f9", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                      {String(file.fileKind) === "photo" ? (
                                        <Box
                                          component="img"
                                          src={file.previewUrl}
                                          alt={file.originalName}
                                          sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                                        />
                                      ) : (
                                        <Box
                                          component="video"
                                          src={file.previewUrl}
                                          muted
                                          controls
                                          sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                                        />
                                      )}
                                    </Box>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {file.originalName}
                                      </Typography>
                                      <Typography sx={{ fontSize: 11, color: "#64748b", textTransform: "capitalize" }}>
                                        {file.fileKind} · {(Number(file.sizeBytes || 0) / 1024 / 1024).toFixed(2)} MB
                                      </Typography>
                                    </Box>
                                    <IconButton size="small" onClick={() => removeQueuedEvidence(selectedAsset.id, file.localId)}>
                                      <DeleteOutlineOutlinedIcon sx={{ fontSize: 18, color: "#64748b" }} />
                                    </IconButton>
                                  </Stack>
                                </Box>
                              ))}
                            </Stack>
                            <Typography sx={{ mt: 1, fontSize: 11, color: "#64748b" }}>
                              Queued files are uploaded and linked to this asset when you save the audit record.
                            </Typography>
                          </Box>
                        ) : null}

                        {uploadingEvidence ? (
                          <Box>
                            <LinearProgress variant="determinate" value={uploadProgress} sx={{ height: 8, borderRadius: 5 }} />
                            <Typography sx={{ mt: 0.5, fontSize: 12, color: "#475569" }}>Uploading {uploadProgress}%</Typography>
                          </Box>
                        ) : null}

                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => openPhotoCamera(selectedAsset.id, "user")}
                            disabled={!canAudit}
                            sx={{ textTransform: "none", borderRadius: uiRadius, height: `${controlHeight}px` }}
                          >
                            Take Photo
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => openVideoCamera(selectedAsset.id, "user")}
                            disabled={!canAudit}
                            sx={{ textTransform: "none", borderRadius: uiRadius, height: `${controlHeight}px` }}
                          >
                            Take Video
                          </Button>
                        </Stack>

                        <Stack spacing={1}>
                          {(entry.evidence || []).map((file) => (
                            <Box
                              key={file.id || `${file.originalName}-${file.createdAt}`}
                              sx={{
                                border: "1px solid #e2e8f0",
                                borderRadius: uiRadius,
                                p: "8px",
                                bgcolor: "#fff",
                              }}
                            >
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Box sx={{ width: 80, height: 56, borderRadius: "6px", bgcolor: "#f1f5f9", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  {String(file.fileKind) === "photo" ? (
                                    <Box
                                      component="img"
                                      src={`${api.defaults.baseURL}/assets/audit-files/${file.id}/content?token=${encodeURIComponent(previewToken)}`}
                                      alt={file.originalName}
                                      sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                                    />
                                  ) : (
                                    <Box
                                      component="video"
                                      src={`${api.defaults.baseURL}/assets/audit-files/${file.id}/content?token=${encodeURIComponent(previewToken)}`}
                                      controls
                                      muted
                                      sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                                    />
                                  )}
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {file.originalName}
                                  </Typography>
                                  <Typography sx={{ fontSize: 11, color: "#64748b", textTransform: "capitalize" }}>
                                    {file.fileKind} · {(Number(file.sizeBytes || 0) / 1024 / 1024).toFixed(2)} MB
                                  </Typography>
                                </Box>
                                {canAudit ? (
                                  <IconButton size="small" onClick={() => removeEvidenceFile(selectedAsset.id, file.id)}>
                                    <DeleteOutlineOutlinedIcon sx={{ fontSize: 18, color: "#64748b" }} />
                                  </IconButton>
                                ) : null}
                              </Stack>
                            </Box>
                          ))}
                          {!(entry.evidence || []).length ? (
                            <Typography sx={{ fontSize: 12, color: "#94a3b8" }}>No evidence uploaded yet.</Typography>
                          ) : null}
                        </Stack>
                      </Stack>
                    </Box>

                    {/* Section: Remarks & Issues */}
                    <Box sx={{ gridColumn: { xs: "1", md: "1 / -1" }, border: "1px solid #e5e7eb", borderRadius: uiRadius, p: panelSectionPadding }}>
                      <Typography
                        sx={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#6b7280",
                          textTransform: "uppercase",
                          letterSpacing: "0.6px",
                          mb: "10px",
                        }}
                      >
                        Remarks &amp; Corrective Action
                      </Typography>
                      <Stack spacing={1.25}>
                        {(needsReason(entry.physicalStatus) || needsReason(normalizeStatus(selectedAsset.status))) && (
                          <TextField
                            label="Repair / Retired Reason"
                            size="small"
                            value={entry.reason}
                            onChange={(e) => updateEntry(selectedAsset.id, { reason: e.target.value })}
                            fullWidth
                            required
                            error={reasonMissing}
                            helperText={reasonMissing ? "Reason is required for this status." : ""}
                            sx={panelFieldSx}
                          />
                        )}
                        <TextField
                          label="Auditor Remarks"
                          size="small"
                          value={entry.remarks}
                          onChange={(e) => updateEntry(selectedAsset.id, { remarks: e.target.value })}
                          fullWidth
                          multiline
                          minRows={2}
                          placeholder="Add any observations or notes…"
                          sx={panelFieldSx}
                        />
                        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                          <Box>
                            <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mb: 0.5, fontWeight: 600 }}>
                              Responsible Person
                            </Typography>
                            <TextField
                              size="small"
                              value={entry.responsiblePerson}
                              onChange={(e) => updateEntry(selectedAsset.id, { responsiblePerson: e.target.value })}
                              fullWidth
                              sx={panelFieldSx}
                            />
                          </Box>
                          <Box>
                            <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mb: 0.5, fontWeight: 600 }}>
                              Target Date
                            </Typography>
                            <TextField
                              type="date"
                              size="small"
                              value={entry.targetDate}
                              onChange={(e) => updateEntry(selectedAsset.id, { targetDate: e.target.value })}
                              fullWidth
                              sx={panelFieldSx}
                            />
                          </Box>
                        </Box>
                        <TextField
                          select
                          label="Resolution Status"
                          size="small"
                          value={entry.resolutionStatus}
                          onChange={(e) => updateEntry(selectedAsset.id, { resolutionStatus: e.target.value })}
                          fullWidth
                          sx={panelFieldSx}
                        >
                          {resolutionOptions.map((status) => (
                            <MenuItem key={status} value={status}>
                              {status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Stack>
                    </Box>
                  </Box>
                );
              })()}
            </Box>

            {/* Popup Footer */}
            <Box
              sx={{
                px: panelPaddingX,
                py: "16px",
                borderTop: "1px solid #e5e7eb",
                bgcolor: "#f9fafb",
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
              }}
            >
              {saveError ? <Typography sx={{ fontSize: 12, color: "#dc2626", alignSelf: "center", mr: "auto" }}>{saveError}</Typography> : null}
              <Button
                variant="outlined"
                size="small"
                onClick={() => { setSaveError(""); setSelectedAsset(null); }}
                sx={{
                  textTransform: "none",
                  borderRadius: uiRadius,
                  fontWeight: 600,
                  borderColor: "#d1d5db",
                  color: "#374151",
                  height: `${controlHeight}px`,
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={<VerifiedOutlinedIcon />}
                onClick={() => saveAuditRecord(selectedAsset)}
                disabled={!canAudit || uploadingEvidence}
                sx={{
                  textTransform: "none",
                  borderRadius: uiRadius,
                  fontWeight: 700,
                  bgcolor: "#0f766e",
                  "&:hover": { bgcolor: "#0d9488" },
                  px: "20px",
                  height: `${controlHeight}px`,
                }}
              >
                Save Audit Record
              </Button>
            </Box>
          </Stack>
        ) : null}
      </Drawer>

      <Dialog
        open={photoCameraOpen}
        onClose={closePhotoCamera}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Take Photo</DialogTitle>
        <DialogContent>
          {photoCameraError ? (
            <Alert severity="warning" sx={{ mt: 1 }}>
              {photoCameraError}
            </Alert>
          ) : (
            <Box sx={{ mt: 1, borderRadius: "8px", overflow: "hidden", bgcolor: "#111827" }}>
              <Box
                component="video"
                ref={photoCameraVideoRef}
                autoPlay
                playsInline
                muted
                sx={{ width: "100%", display: "block", maxHeight: 420, objectFit: "cover" }}
              />
            </Box>
          )}
          <Box component="canvas" ref={photoCameraCanvasRef} sx={{ display: "none" }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={closePhotoCamera}>Cancel</Button>
          <Button
            variant="outlined"
            onClick={() => {
              if (cameraAssetId) openPhotoCamera(cameraAssetId, photoFacingMode);
            }}
          >
            Retry Camera
          </Button>
          <Button
            variant="contained"
            onClick={capturePhotoFromCamera}
            disabled={Boolean(photoCameraError)}
            sx={{ bgcolor: "#0f766e", "&:hover": { bgcolor: "#0d9488" } }}
          >
            Capture Photo
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={videoCameraOpen}
        onClose={closeVideoCamera}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Take Video</DialogTitle>
        <DialogContent>
          {videoCameraError ? (
            <Alert severity="warning" sx={{ mt: 1 }}>
              {videoCameraError}
            </Alert>
          ) : (
            <Box sx={{ mt: 1, borderRadius: "8px", overflow: "hidden", bgcolor: "#111827" }}>
              <Box
                component="video"
                ref={videoCameraVideoRef}
                autoPlay
                playsInline
                muted
                sx={{ width: "100%", display: "block", maxHeight: 420, objectFit: "cover" }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeVideoCamera}>Cancel</Button>
          <Button
            variant="outlined"
            onClick={() => {
              if (videoCameraAssetId) openVideoCamera(videoCameraAssetId, videoFacingMode);
            }}
          >
            Retry Camera
          </Button>
          {!videoRecording ? (
            <Button
              variant="contained"
              onClick={startVideoRecording}
              disabled={Boolean(videoCameraError)}
              sx={{ bgcolor: "#0f766e", "&:hover": { bgcolor: "#0d9488" } }}
            >
              Start Recording
            </Button>
          ) : (
            <Button
              variant="contained"
              color="error"
              onClick={stopVideoRecording}
            >
              Stop & Save
            </Button>
          )}
        </DialogActions>
      </Dialog>


    </Stack>
  );
}
