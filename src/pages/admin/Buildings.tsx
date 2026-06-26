import { useState, useEffect, useCallback } from "react";
import {
  Building,
  Plus,
  Edit,
  Trash2,
  Loader2,
  AlertCircle,
  Check,
  X,
  CalendarX,
} from "@/components/MathIcon";
import AdminLayout from "@/components/Layout/AdminLayout";
import { buildingApi } from "@/utils/api";
import type { Building as BuildingType } from "@/types";

export default function Buildings() {
  const [buildings, setBuildings] = useState<BuildingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchBuildings = useCallback(async () => {
    try {
      const res = await buildingApi.getAll();
      setBuildings(res.data);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBuildings();
  }, [fetchBuildings]);

  const handleAdd = () => {
    setEditingId(null);
    setName("");
    setShowForm(true);
  };

  const handleEdit = (building: BuildingType) => {
    setEditingId(building.id);
    setName(building.name);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("请输入教学楼名称");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      if (editingId) {
        await buildingApi.update(editingId, name.trim());
      } else {
        await buildingApi.create(name.trim());
      }
      setShowForm(false);
      setName("");
      setEditingId(null);
      fetchBuildings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除此教学楼吗?如果该教学楼下有教室则无法删除。")) return;
    try {
      await buildingApi.delete(id);
      fetchBuildings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setName("");
    setEditingId(null);
    setError("");
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-black dark:text-white">
            教学楼管理
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-300 mt-1">
            管理教室端注册时可选的教学楼
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
        >
          <Plus className="w-4 h-4" />
          新增教学楼
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-6 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-600 rounded-lg p-6 animate-slide-down">
          <h2 className="text-lg font-semibold text-black dark:text-white mb-4">
            {editingId ? "编辑教学楼" : "新增教学楼"}
          </h2>
          <form onSubmit={handleSubmit} className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                教学楼名称
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如:第一教学楼"
                autoFocus
                className="form-input"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2.5 text-sm font-medium text-black dark:text-white bg-white dark:bg-black border border-zinc-300 dark:border-zinc-600 hover:border-black dark:hover:border-white rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {editingId ? "保存" : "创建"}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-zinc-500 dark:text-zinc-300 animate-spin" />
        </div>
      ) : buildings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-black flex items-center justify-center mb-4">
            <CalendarX className="w-10 h-10 text-zinc-400" />
          </div>
          <h3 className="text-lg font-medium text-zinc-600 dark:text-zinc-300 mb-2">
            暂无教学楼
          </h3>
          <p className="text-sm text-zinc-400">点击右上角"新增教学楼"创建</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-600 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-950">
                <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                  教学楼名称
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                  创建时间
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-600">
              {buildings.map((building) => (
                <tr
                  key={building.id}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-black flex items-center justify-center shrink-0">
                        <Building className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                      </div>
                      <span className="text-sm font-medium text-black dark:text-white">
                        {building.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-300">
                    {new Date(building.createdAt).toLocaleString("zh-CN")}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(building)}
                        className="p-2 text-zinc-500 dark:text-zinc-300 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-950 rounded-lg transition-colors"
                        aria-label="编辑"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(building.id)}
                        className="p-2 text-zinc-500 dark:text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                        aria-label="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
