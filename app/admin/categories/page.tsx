"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { addCategory, deleteCategory, addSubcategory, deleteSubcategory, updateCategoryFallbackPrice, updateCategory, updateSubcategory } from "@/lib/admin";
import { subscribeCategoriesWithSubs, CategoryWithSubs } from "@/lib/categories";
import {
  Plus,
  Layers,
  Trash2,
  Zap,
  Briefcase,
  Heart,
  BookOpen,
  Music,
  LayoutGrid,
  X,
  ChevronDown,
  ChevronRight,
  Tag,
  Pencil,
} from "lucide-react";
import toast from "react-hot-toast";

const ICONS = [
  { name: "Zap", icon: Zap },
  { name: "Briefcase", icon: Briefcase },
  { name: "Heart", icon: Heart },
  { name: "BookOpen", icon: BookOpen },
  { name: "Music", icon: Music },
  { name: "LayoutGrid", icon: LayoutGrid },
];

export default function AdminCategories() {
  const [categories, setCategories] = useState<CategoryWithSubs[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Modal: add category
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catName, setCatName] = useState("");
  const [catSlug, setCatSlug] = useState("");
  const [catIcon, setCatIcon] = useState("Zap");
  const [catFallbackPrice, setCatFallbackPrice] = useState("");
  const [catSaving, setCatSaving] = useState(false);

  // Modal: add subcategory
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [subParentId, setSubParentId] = useState("");
  const [subParentName, setSubParentName] = useState("");
  const [subName, setSubName] = useState("");
  const [subSlug, setSubSlug] = useState("");
  const [subSaving, setSubSaving] = useState(false);

  // Modal: edit category
  const [editCatModalOpen, setEditCatModalOpen] = useState(false);
  const [editCatId, setEditCatId] = useState("");
  const [editCatName, setEditCatName] = useState("");
  const [editCatSlug, setEditCatSlug] = useState("");
  const [editCatIcon, setEditCatIcon] = useState("Zap");
  const [editCatFallbackPrice, setEditCatFallbackPrice] = useState("");
  const [editCatSaving, setEditCatSaving] = useState(false);

  // Modal: edit subcategory
  const [editSubModalOpen, setEditSubModalOpen] = useState(false);
  const [editSubId, setEditSubId] = useState("");
  const [editSubName, setEditSubName] = useState("");
  const [editSubSlug, setEditSubSlug] = useState("");
  const [editSubSaving, setEditSubSaving] = useState(false);

  useEffect(() => {
    const unsub = subscribeCategoriesWithSubs((data) => {
      setCategories(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  // ---- Category handlers ----
  const openCatModal = () => {
    setCatName(""); setCatSlug(""); setCatIcon("Zap"); setCatFallbackPrice("");
    setCatModalOpen(true);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) { toast.error("Enter a category name"); return; }
    setCatSaving(true);
    try {
      const result = await addCategory(catName.trim(), catIcon, catSlug.trim() || autoSlug(catName));
      if (catFallbackPrice && Number(catFallbackPrice) > 0 && result?.id) {
        await updateCategoryFallbackPrice(result.id, Number(catFallbackPrice));
      }
      toast.success("Category created");
      setCatModalOpen(false);
    } catch {
      toast.error("Failed to create category");
    } finally {
      setCatSaving(false);
    }
  };

  const openEditCatModal = (cat: CategoryWithSubs) => {
    setEditCatId(cat.id);
    setEditCatName(cat.name);
    setEditCatSlug(cat.slug || autoSlug(cat.name));
    setEditCatIcon(cat.icon || "Zap");
    setEditCatFallbackPrice(cat.fallbackPrice ? String(cat.fallbackPrice) : "");
    setEditCatModalOpen(true);
  };

  const handleEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCatName.trim()) { toast.error("Enter a category name"); return; }
    setEditCatSaving(true);
    try {
      await updateCategory(
        editCatId,
        editCatName.trim(),
        editCatIcon,
        editCatSlug.trim() || autoSlug(editCatName),
        editCatFallbackPrice ? Number(editCatFallbackPrice) : null,
      );
      toast.success("Category updated");
      setEditCatModalOpen(false);
    } catch {
      toast.error("Failed to update category");
    } finally {
      setEditCatSaving(false);
    }
  };

  const openEditSubModal = (sub: { id: string; name: string; slug?: string }) => {
    setEditSubId(sub.id);
    setEditSubName(sub.name);
    setEditSubSlug(sub.slug || autoSlug(sub.name));
    setEditSubModalOpen(true);
  };

  const handleEditSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSubName.trim()) { toast.error("Enter a subcategory name"); return; }
    setEditSubSaving(true);
    try {
      await updateSubcategory(
        editSubId,
        editSubName.trim(),
        editSubSlug.trim() || autoSlug(editSubName),
      );
      toast.success("Subcategory updated");
      setEditSubModalOpen(false);
    } catch {
      toast.error("Failed to update subcategory");
    } finally {
      setEditSubSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}" and all its subcategories?`)) return;
    try {
      await deleteCategory(id);
      toast.success("Category deleted");
    } catch {
      toast.error("Failed to delete category");
    }
  };

  // ---- Subcategory handlers ----
  const openSubModal = (parentId: string, parentName: string) => {
    setSubParentId(parentId); setSubParentName(parentName);
    setSubName(""); setSubSlug("");
    setSubModalOpen(true);
  };

  const handleAddSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim()) { toast.error("Enter a subcategory name"); return; }
    setSubSaving(true);
    try {
      await addSubcategory(subName.trim(), subParentId, subSlug.trim() || autoSlug(subName));
      toast.success("Subcategory created");
      setSubModalOpen(false);
      setExpandedIds(prev => new Set(Array.from(prev).concat(subParentId)));
    } catch {
      toast.error("Failed to create subcategory");
    } finally {
      setSubSaving(false);
    }
  };

  const handleDeleteSubcategory = async (id: string, name: string) => {
    if (!window.confirm(`Delete subcategory "${name}"?`)) return;
    try {
      await deleteSubcategory(id);
      toast.success("Subcategory deleted");
    } catch {
      toast.error("Failed to delete subcategory");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-text tracking-tight">Service Categories</h1>
          <p className="text-xs font-bold text-text-light mt-0.5 uppercase tracking-wider">
            Manage parent categories and subcategories
          </p>
        </div>
        <button
          onClick={openCatModal}
          className="flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-xs font-black text-white shadow-xl shadow-primary/20 active:scale-95 transition-all shrink-0"
        >
          <Plus className="h-4 w-4" />
          New Category
        </button>
      </div>

      {/* Category List */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm font-bold text-text-light uppercase tracking-widest">Loading...</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-[2.5rem] border border-gray-100 shadow-sm">
          <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300 border border-gray-100">
            <Layers className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-black text-text">No categories yet</h3>
          <p className="text-sm font-bold text-text-light mt-1">Click "New Category" to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => {
            const IconComp = ICONS.find(i => i.name === cat.icon)?.icon || Zap;
            const isExpanded = expandedIds.has(cat.id);
            return (
              <div key={cat.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                {/* Category row */}
                <div className="flex items-center gap-4 px-6 py-4">
                  <button
                    onClick={() => toggleExpand(cat.id)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <div className="h-10 w-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary shrink-0">
                      <IconComp className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-text truncate">{cat.name}</p>
                      <p className="text-[10px] font-bold text-text-light uppercase tracking-tight">
                        {cat.subcategories.length} subcategor{cat.subcategories.length === 1 ? "y" : "ies"} · /{cat.slug}
                      </p>
                    </div>
                    <div className="ml-auto shrink-0 text-gray-400">
                      {isExpanded
                        ? <ChevronDown className="h-4 w-4" />
                        : <ChevronRight className="h-4 w-4" />}
                    </div>
                  </button>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openSubModal(cat.id, cat.name)}
                      className="flex items-center gap-1.5 rounded-xl bg-primary/5 border border-primary/10 px-3 py-2 text-[10px] font-black text-primary hover:bg-primary/10 transition-all active:scale-95"
                    >
                      <Plus className="h-3 w-3" />
                      Sub
                    </button>
                    <button
                      onClick={() => openEditCatModal(cat)}
                      className="h-8 w-8 flex items-center justify-center rounded-xl bg-blue-50 border border-blue-100 text-blue-500 hover:bg-blue-500 hover:text-white transition-all active:scale-90"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id, cat.name)}
                      className="h-8 w-8 flex items-center justify-center rounded-xl bg-red-50 border border-red-100 text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-90"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Subcategories */}
                {isExpanded && (
                  <div className="border-t border-gray-50 bg-gray-50/50 px-6 py-3 space-y-2">
                    {cat.subcategories.length === 0 ? (
                      <p className="text-[11px] font-bold text-text-light py-2 text-center">
                        No subcategories yet —{" "}
                        <button
                          onClick={() => openSubModal(cat.id, cat.name)}
                          className="text-primary underline"
                        >
                          add one
                        </button>
                      </p>
                    ) : (
                      cat.subcategories.map(sub => (
                        <div
                          key={sub.id}
                          className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-gray-100"
                        >
                          <Tag className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-text truncate">{sub.name}</p>
                            <p className="text-[10px] font-bold text-text-light">/{sub.slug}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => openEditSubModal(sub)}
                              className="h-7 w-7 flex items-center justify-center rounded-lg bg-blue-50 border border-blue-100 text-blue-400 hover:bg-blue-500 hover:text-white transition-all active:scale-90"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteSubcategory(sub.id, sub.name)}
                              className="h-7 w-7 flex items-center justify-center rounded-lg bg-red-50 border border-red-100 text-red-400 hover:bg-red-500 hover:text-white transition-all active:scale-90"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Category Modal */}
      {catModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div className="w-full max-w-md animate-in fade-in zoom-in duration-300 rounded-[2.5rem] bg-white p-10 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/10">
                  <Layers className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-black text-text">New Category</h2>
              </div>
              <button onClick={() => setCatModalOpen(false)} className="h-10 w-10 flex items-center justify-center rounded-xl bg-gray-50 text-text-light hover:bg-gray-100 transition-all">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-light pl-1">Category Name</label>
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => { setCatName(e.target.value); setCatSlug(autoSlug(e.target.value)); }}
                  placeholder="e.g. Home Services"
                  className="w-full rounded-2xl bg-gray-50 border border-gray-100 px-5 py-4 text-sm font-bold text-text outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-light pl-1">Slug (auto-generated)</label>
                <input
                  type="text"
                  value={catSlug}
                  onChange={(e) => setCatSlug(e.target.value)}
                  placeholder="home-services"
                  className="w-full rounded-2xl bg-gray-50 border border-gray-100 px-5 py-4 text-sm font-bold text-text-light outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-light pl-1">Fallback Price (₦) — Optional</label>
                <div className="flex items-center rounded-2xl bg-gray-50 border border-gray-100 px-5 py-4">
                  <span className="font-bold text-gray-400 mr-1">₦</span>
                  <input
                    type="number"
                    value={catFallbackPrice}
                    onChange={(e) => setCatFallbackPrice(e.target.value)}
                    placeholder="e.g. 5000 — used if provider has no price"
                    className="w-full bg-transparent text-sm font-bold text-text outline-none"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-light pl-1">Icon</label>
                <div className="grid grid-cols-6 gap-2">
                  {ICONS.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => setCatIcon(item.name)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                        catIcon === item.name
                          ? "bg-primary/5 border-primary text-primary"
                          : "bg-gray-50 border-gray-100 text-gray-400 hover:bg-gray-100"
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <button type="button" onClick={() => setCatModalOpen(false)} className="flex-1 rounded-2xl bg-gray-50 py-4 text-[11px] font-black text-text-light hover:bg-gray-100 transition-all active:scale-95 uppercase tracking-widest">
                  Cancel
                </button>
                <button type="submit" disabled={catSaving} className="flex-1 rounded-2xl bg-primary py-4 text-[11px] font-black text-white shadow-xl shadow-primary/20 transition-all active:scale-95 uppercase tracking-widest disabled:opacity-60">
                  {catSaving ? "Creating..." : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {editCatModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div className="w-full max-w-md animate-in fade-in zoom-in duration-300 rounded-[2.5rem] bg-white p-10 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 border border-blue-100">
                  <Pencil className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-black text-text">Edit Category</h2>
              </div>
              <button onClick={() => setEditCatModalOpen(false)} className="h-10 w-10 flex items-center justify-center rounded-xl bg-gray-50 text-text-light hover:bg-gray-100 transition-all">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditCategory} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-light pl-1">Category Name</label>
                <input
                  type="text"
                  value={editCatName}
                  onChange={(e) => { setEditCatName(e.target.value); setEditCatSlug(autoSlug(e.target.value)); }}
                  placeholder="e.g. Home Services"
                  className="w-full rounded-2xl bg-gray-50 border border-gray-100 px-5 py-4 text-sm font-bold text-text outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-light pl-1">Slug</label>
                <input
                  type="text"
                  value={editCatSlug}
                  onChange={(e) => setEditCatSlug(e.target.value)}
                  placeholder="home-services"
                  className="w-full rounded-2xl bg-gray-50 border border-gray-100 px-5 py-4 text-sm font-bold text-text-light outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-light pl-1">Fallback Price (₦) — Optional</label>
                <div className="flex items-center rounded-2xl bg-gray-50 border border-gray-100 px-5 py-4">
                  <span className="font-bold text-gray-400 mr-1">₦</span>
                  <input
                    type="number"
                    value={editCatFallbackPrice}
                    onChange={(e) => setEditCatFallbackPrice(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full bg-transparent text-sm font-bold text-text outline-none"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-light pl-1">Icon</label>
                <div className="grid grid-cols-6 gap-2">
                  {ICONS.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => setEditCatIcon(item.name)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                        editCatIcon === item.name
                          ? "bg-primary/5 border-primary text-primary"
                          : "bg-gray-50 border-gray-100 text-gray-400 hover:bg-gray-100"
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <button type="button" onClick={() => setEditCatModalOpen(false)} className="flex-1 rounded-2xl bg-gray-50 py-4 text-[11px] font-black text-text-light hover:bg-gray-100 transition-all active:scale-95 uppercase tracking-widest">
                  Cancel
                </button>
                <button type="submit" disabled={editCatSaving} className="flex-1 rounded-2xl bg-blue-500 py-4 text-[11px] font-black text-white shadow-xl shadow-blue-500/20 transition-all active:scale-95 uppercase tracking-widest disabled:opacity-60">
                  {editCatSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Subcategory Modal */}
      {editSubModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div className="w-full max-w-md animate-in fade-in zoom-in duration-300 rounded-[2.5rem] bg-white p-10 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 border border-blue-100">
                  <Pencil className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-black text-text">Edit Subcategory</h2>
              </div>
              <button onClick={() => setEditSubModalOpen(false)} className="h-10 w-10 flex items-center justify-center rounded-xl bg-gray-50 text-text-light hover:bg-gray-100 transition-all">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubcategory} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-light pl-1">Subcategory Name</label>
                <input
                  type="text"
                  value={editSubName}
                  onChange={(e) => { setEditSubName(e.target.value); setEditSubSlug(autoSlug(e.target.value)); }}
                  placeholder="e.g. Plumber"
                  className="w-full rounded-2xl bg-gray-50 border border-gray-100 px-5 py-4 text-sm font-bold text-text outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-light pl-1">Slug</label>
                <input
                  type="text"
                  value={editSubSlug}
                  onChange={(e) => setEditSubSlug(e.target.value)}
                  placeholder="plumber"
                  className="w-full rounded-2xl bg-gray-50 border border-gray-100 px-5 py-4 text-sm font-bold text-text-light outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all"
                />
              </div>

              <div className="flex gap-4 pt-2">
                <button type="button" onClick={() => setEditSubModalOpen(false)} className="flex-1 rounded-2xl bg-gray-50 py-4 text-[11px] font-black text-text-light hover:bg-gray-100 transition-all active:scale-95 uppercase tracking-widest">
                  Cancel
                </button>
                <button type="submit" disabled={editSubSaving} className="flex-1 rounded-2xl bg-blue-500 py-4 text-[11px] font-black text-white shadow-xl shadow-blue-500/20 transition-all active:scale-95 uppercase tracking-widest disabled:opacity-60">
                  {editSubSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Subcategory Modal */}
      {subModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div className="w-full max-w-md animate-in fade-in zoom-in duration-300 rounded-[2.5rem] bg-white p-10 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-orange-50 flex items-center justify-center text-primary border border-primary/10">
                  <Tag className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-text">New Subcategory</h2>
                  <p className="text-[10px] font-bold text-text-light uppercase tracking-widest mt-0.5">Under: {subParentName}</p>
                </div>
              </div>
              <button onClick={() => setSubModalOpen(false)} className="h-10 w-10 flex items-center justify-center rounded-xl bg-gray-50 text-text-light hover:bg-gray-100 transition-all">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubcategory} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-light pl-1">Subcategory Name</label>
                <input
                  type="text"
                  value={subName}
                  onChange={(e) => { setSubName(e.target.value); setSubSlug(autoSlug(e.target.value)); }}
                  placeholder="e.g. Plumber"
                  className="w-full rounded-2xl bg-gray-50 border border-gray-100 px-5 py-4 text-sm font-bold text-text outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-light pl-1">Slug (auto-generated)</label>
                <input
                  type="text"
                  value={subSlug}
                  onChange={(e) => setSubSlug(e.target.value)}
                  placeholder="plumber"
                  className="w-full rounded-2xl bg-gray-50 border border-gray-100 px-5 py-4 text-sm font-bold text-text-light outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all"
                />
              </div>

              <div className="flex gap-4 pt-2">
                <button type="button" onClick={() => setSubModalOpen(false)} className="flex-1 rounded-2xl bg-gray-50 py-4 text-[11px] font-black text-text-light hover:bg-gray-100 transition-all active:scale-95 uppercase tracking-widest">
                  Cancel
                </button>
                <button type="submit" disabled={subSaving} className="flex-1 rounded-2xl bg-primary py-4 text-[11px] font-black text-white shadow-xl shadow-primary/20 transition-all active:scale-95 uppercase tracking-widest disabled:opacity-60">
                  {subSaving ? "Creating..." : "Create Subcategory"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
