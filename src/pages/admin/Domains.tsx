/**
 * KeKe ExamHub - 考试信息管理系统
 * 域名管理页面
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { useState, useEffect, useCallback } from "react";
import {
  Globe,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  Check,
  X,
  RefreshCw,
  CheckCircle2,
  Shield,
  Clock,
  UploadCloud,
  Search,
} from "@/components/MathIcon";
import AdminLayout from "@/components/Layout/AdminLayout";
import { domainApi } from "@/utils/api";
import type { Domain, CertStatus } from "@/types";
import { cn } from "@/lib/utils";
import { ConfirmDialog, Modal } from "@/components/ui";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getCertStatusInfo(status: CertStatus) {
  const statusMap: Record<CertStatus, { label: string; className: string; dotClass: string }> = {
    pending: {
      label: "申请中",
      className: "bg-zinc-100 text-zinc-700 border-zinc-200",
      dotClass: "bg-zinc-500",
    },
    issued: {
      label: "已颁发",
      className: "bg-zinc-900 text-white border-zinc-900",
      dotClass: "bg-white",
    },
    expired: {
      label: "已过期",
      className: "bg-zinc-50 text-zinc-500 border-zinc-200",
      dotClass: "bg-zinc-400",
    },
    failed: {
      label: "申请失败",
      className: "bg-zinc-100 text-zinc-600 border-zinc-200",
      dotClass: "bg-zinc-400",
    },
  };
  return statusMap[status];
}

export default function Domains() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [domainName, setDomainName] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [issuingId, setIssuingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Domain | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [issueTarget, setIssueTarget] = useState<Domain | null>(null);
  // 上传证书相关状态
  const [uploadTarget, setUploadTarget] = useState<Domain | null>(null);
  const [certText, setCertText] = useState("");
  const [keyText, setKeyText] = useState("");
  const [uploading, setUploading] = useState(false);
  // 检测证书相关状态
  const [detectingId, setDetectingId] = useState<string | null>(null);

  const fetchDomains = useCallback(async () => {
    try {
      const res = await domainApi.getAll();
      setDomains(res.data);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainName.trim()) {
      setError("请输入域名");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await domainApi.create({
        domainName: domainName.trim(),
        isPrimary,
      });
      setShowForm(false);
      setDomainName("");
      setIsPrimary(false);
      fetchDomains();
    } catch (err) {
      setError(err instanceof Error ? err.message : "添加失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await domainApi.delete(id);
      setDeleteTarget(null);
      fetchDomains();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  };

  const handleSetPrimary = async (id: string) => {
    try {
      await domainApi.update(id, { isPrimary: true });
      fetchDomains();
    } catch (err) {
      setError(err instanceof Error ? err.message : "设置失败");
    }
  };

  const handleIssueCert = async (id: string) => {
    setIssuingId(id);
    try {
      await domainApi.issueCert(id);
      setIssueTarget(null);
      setTimeout(() => {
        fetchDomains();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "申请失败");
    } finally {
      setIssuingId(null);
    }
  };

  // 上传证书
  const handleUploadCert = async () => {
    if (!uploadTarget) return;
    if (!certText.trim() || !keyText.trim()) {
      setError("证书内容和私钥内容都不能为空");
      return;
    }
    setUploading(true);
    setError("");
    try {
      await domainApi.uploadCert(uploadTarget.id, {
        cert: certText.trim(),
        key: keyText.trim(),
      });
      setUploadTarget(null);
      setCertText("");
      setKeyText("");
      fetchDomains();
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
    }
  };

  // 检测服务器已有证书
  const handleDetectCert = async (id: string) => {
    setDetectingId(id);
    setError("");
    try {
      const res = await domainApi.detectCert(id);
      if (res.data.found) {
        fetchDomains();
      } else {
        setError(res.data.message || "未检测到已有证书");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "检测失败");
    } finally {
      setDetectingId(null);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setDomainName("");
    setIsPrimary(false);
    setError("");
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchDomains();
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">域名管理</h1>
              <p className="text-sm text-zinc-500">绑定域名并自动申请SSL证书</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:border-zinc-400 hover:text-zinc-900 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              刷新
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-all"
            >
              <Plus className="w-4 h-4" />
              添加域名
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-6 bg-white border border-zinc-200 rounded-xl p-6 animate-slide-down">
          <h3 className="text-lg font-semibold text-zinc-900 mb-4">添加域名</h3>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                域名
              </label>
              <input
                type="text"
                value={domainName}
                onChange={(e) => setDomainName(e.target.value)}
                placeholder="example.com"
                disabled={submitting}
                className="form-input"
              />
              <p className="mt-1 text-xs text-zinc-500">
                请输入完整域名，如 exam.example.com
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPrimary"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
              />
              <label htmlFor="isPrimary" className="text-sm text-zinc-700">
                设为主域名
              </label>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    添加中...
                  </>
                ) : (
                  "添加域名"
                )}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:border-zinc-400 hover:text-zinc-900 transition-all disabled:opacity-50"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-zinc-600 animate-spin" />
          <span className="ml-2 text-zinc-500">加载中...</span>
        </div>
      ) : domains.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white border border-zinc-200 rounded-xl">
          <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
            <Globe className="w-10 h-10 text-zinc-400" />
          </div>
          <h3 className="text-lg font-medium text-zinc-700 mb-2">暂无域名</h3>
          <p className="text-sm text-zinc-400 mb-4">点击上方按钮添加第一个域名</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-all"
          >
            <Plus className="w-4 h-4" />
            添加域名
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {domains.map((domain) => {
            const statusInfo = getCertStatusInfo(domain.certStatus);
            return (
              <div
                key={domain.id}
                className="bg-white border border-zinc-200 rounded-xl p-6 hover:border-zinc-400 transition-all"
              >
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-lg flex items-center justify-center shrink-0",
                      domain.certStatus === "issued"
                        ? "bg-zinc-900 text-white"
                        : "bg-zinc-100 text-zinc-500"
                    )}>
                      {domain.certStatus === "issued" ? (
                        <Shield className="w-6 h-6" />
                      ) : (
                        <Globe className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-lg font-semibold text-zinc-900">
                          {domain.domainName}
                        </h3>
                        {domain.isPrimary && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-zinc-900 text-white rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            主域名
                          </span>
                        )}
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border",
                          statusInfo.className
                        )}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", statusInfo.dotClass, domain.certStatus === "pending" && "animate-pulse")} />
                          {statusInfo.label}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-6 text-sm text-zinc-500">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          <span>创建于 {formatDate(domain.createdAt)}</span>
                        </div>
                        {domain.certIssuedAt && (
                          <div className="flex items-center gap-1.5">
                            <Check className="w-4 h-4" />
                            <span>颁发于 {formatDate(domain.certIssuedAt)}</span>
                          </div>
                        )}
                        {domain.certExpiresAt && (
                          <div className="flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4" />
                            <span>过期于 {formatDate(domain.certExpiresAt)}</span>
                          </div>
                        )}
                      </div>
                      {domain.errorMessage && (
                        <div className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 px-2 py-1 rounded inline-block">
                          {domain.errorMessage}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {!domain.isPrimary && (
                      <button
                        onClick={() => handleSetPrimary(domain.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:border-zinc-400 hover:text-zinc-900 transition-all"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        设为主域名
                      </button>
                    )}
                    <button
                      onClick={() => handleDetectCert(domain.id)}
                      disabled={detectingId === domain.id || issuingId === domain.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:border-zinc-400 hover:text-zinc-900 transition-all disabled:opacity-50 btn-press"
                      title="自动扫描服务器内是否已有该域名的 SSL 证书"
                    >
                      {detectingId === domain.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          检测中...
                        </>
                      ) : (
                        <>
                          <Search className="w-3.5 h-3.5" />
                          检测证书
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setUploadTarget(domain)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:border-zinc-400 hover:text-zinc-900 transition-all btn-press"
                      title="手动上传 SSL 证书（PEM 格式）"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      上传证书
                    </button>
                    <button
                      onClick={() => setIssueTarget(domain)}
                      disabled={issuingId === domain.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-all disabled:opacity-50 btn-press"
                    >
                      {issuingId === domain.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          申请中...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          自动申请
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setDeleteTarget(domain)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-white border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 hover:border-red-300 dark:hover:border-red-700 transition-all btn-press"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      删除
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 p-4 bg-zinc-50 border border-zinc-200 rounded-xl">
        <h4 className="text-sm font-semibold text-zinc-700 mb-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          说明
        </h4>
        <ul className="text-xs text-zinc-500 space-y-1 list-disc list-inside">
          <li>绑定域名前，请确保域名已正确解析到服务器 IP</li>
          <li>
            <strong>检测证书</strong>：自动扫描服务器内 Let's Encrypt、Nginx 等路径下是否已有该域名的证书
          </li>
          <li>
            <strong>上传证书</strong>：手动上传 PEM 格式的证书（fullchain）和私钥（privkey）
          </li>
          <li>
            <strong>自动申请</strong>：通过 acme.sh 申请 Let's Encrypt 免费证书（需服务器已安装 acme.sh）
          </li>
          <li>绑定域名后，通过 IP 访问将被拒绝，请通过域名访问</li>
          <li>可以绑定多个域名，但只能有一个主域名</li>
        </ul>
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
        title="删除域名"
        message={
          deleteTarget ? (
            <>
              确定要删除域名{" "}
              <span className="font-semibold text-black dark:text-white">
                {deleteTarget.domainName}
              </span>{" "}
              吗？此操作将移除相关证书配置，且不可撤销。
            </>
          ) : (
            ""
          )
        }
        confirmText="删除"
        variant="danger"
        loading={deleting}
      />

      <ConfirmDialog
        isOpen={!!issueTarget}
        onClose={() => !issuingId && setIssueTarget(null)}
        onConfirm={() => issueTarget && handleIssueCert(issueTarget.id)}
        title="申请 SSL 证书"
        message={
          issueTarget ? (
            <>
              确定要为域名{" "}
              <span className="font-semibold text-black dark:text-white">
                {issueTarget.domainName}
              </span>{" "}
              申请 SSL 证书吗？申请过程可能需要数秒，请确保域名已正确解析到服务器。
            </>
          ) : (
            ""
          )
        }
        confirmText="确认申请"
        variant="primary"
        loading={!!issuingId}
      />

      {/* 上传证书 Modal */}
      <Modal
        isOpen={!!uploadTarget}
        onClose={() => !uploading && setUploadTarget(null)}
        title={`上传 SSL 证书 - ${uploadTarget?.domainName || ""}`}
        size="xl"
        closeOnOverlayClick={!uploading}
        footer={
          <>
            <button
              onClick={() => setUploadTarget(null)}
              disabled={uploading}
              className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:border-zinc-400 hover:text-zinc-900 transition-all disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleUploadCert}
              disabled={uploading || !certText.trim() || !keyText.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-all disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  上传中...
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  确认上传
                </>
              )}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-700 dark:text-blue-400">
            <p className="mb-1 font-medium">上传说明</p>
            <ul className="text-xs space-y-0.5 list-disc list-inside">
              <li>证书内容：完整的证书链（fullchain），包含 BEGIN CERTIFICATE 标记</li>
              <li>私钥内容：对应私钥（privkey），包含 BEGIN PRIVATE KEY 标记</li>
              <li>支持 PEM 格式，可从宝塔、云服务商、Let's Encrypt 等渠道获取</li>
              <li>上传后将自动更新 Nginx SSL 配置（需手动 reload Nginx）</li>
            </ul>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              证书内容（fullchain.pem）
            </label>
            <textarea
              value={certText}
              onChange={(e) => setCertText(e.target.value)}
              placeholder="-----BEGIN CERTIFICATE-----
粘贴完整证书链内容...
-----END CERTIFICATE-----"
              disabled={uploading}
              rows={8}
              className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-500 resize-y dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              私钥内容（privkey.pem）
            </label>
            <textarea
              value={keyText}
              onChange={(e) => setKeyText(e.target.value)}
              placeholder="-----BEGIN PRIVATE KEY-----
粘贴私钥内容...
-----END PRIVATE KEY-----"
              disabled={uploading}
              rows={6}
              className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-500 resize-y dark:text-zinc-100"
            />
          </div>

          <p className="text-xs text-zinc-500">
            私钥将以 600 权限保存到 <code className="px-1 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">api/certs/{uploadTarget?.domainName}/privkey.pem</code>
          </p>
        </div>
      </Modal>
    </AdminLayout>
  );
}
