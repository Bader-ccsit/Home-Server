import React, { useEffect, useState } from 'react'
import axios from 'axios'
import AnimatedCard from '../components/AnimatedCard'
import { useI18n } from '../contexts/I18nContext'

type CartItem = {
  id: string
  text: string
  createdAt: string
  updatedAt: string
}

export default function ShoppingCart() {
  const { t } = useI18n()
  const apiBase = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000'
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newItemText, setNewItemText] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [clearModalOpen, setClearModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CartItem | null>(null)

  function authHeaders() {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async function loadItems() {
    setLoading(true)
    setError('')
    try {
      const res = await axios.get(`${apiBase}/shopping-cart/items`, { headers: authHeaders() })
      const list = Array.isArray(res.data) ? res.data : []
      setItems(list)
      const nextDrafts: Record<string, string> = {}
      list.forEach((item: CartItem) => {
        nextDrafts[item.id] = item.text
      })
      setDrafts(nextDrafts)
    } catch (err: any) {
      setError(err?.response?.data?.message || t('shoppingLoadFailed'))
    } finally {
      setLoading(false)
    }
  }

  async function addItem() {
    const text = newItemText.trim()
    if (!text) return
    setError('')
    try {
      await axios.post(`${apiBase}/shopping-cart/items`, { text }, { headers: authHeaders() })
      setNewItemText('')
      await loadItems()
    } catch (err: any) {
      setError(err?.response?.data?.message || t('shoppingAddFailed'))
    }
  }

  async function updateItem(id: string) {
    const text = String(drafts[id] || '').trim()
    if (!text) return
    setError('')
    try {
      await axios.patch(`${apiBase}/shopping-cart/items/${encodeURIComponent(id)}`, { text }, { headers: authHeaders() })
      await loadItems()
    } catch (err: any) {
      setError(err?.response?.data?.message || t('shoppingUpdateFailed'))
    }
  }

  async function clearAll() {
    setError('')
    try {
      await axios.delete(`${apiBase}/shopping-cart/items`, { headers: authHeaders() })
      await loadItems()
      setClearModalOpen(false)
    } catch (err: any) {
      setError(err?.response?.data?.message || t('shoppingClearFailed'))
    }
  }

  async function deleteItem(id: string) {
    setError('')
    try {
      await axios.delete(`${apiBase}/shopping-cart/items/${encodeURIComponent(id)}`, { headers: authHeaders() })
      await loadItems()
      setDeleteTarget(null)
    } catch (err: any) {
      setError(err?.response?.data?.message || t('shoppingDeleteFailed'))
    }
  }

  useEffect(() => {
    loadItems()
  }, [])

  return (
    <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 space-y-4">
      <AnimatedCard className="!max-w-none !mx-0 p-5 sm:p-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1">{t('shoppingTitle')}</h1>
        <p className="text-sm opacity-75 mb-4">{t('shoppingSubtitle')}</p>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-4">
          {loading ? (
            <div className="text-sm opacity-80">{t('shoppingLoading')}</div>
          ) : items.length === 0 ? (
            <div className="text-sm opacity-80">{t('shoppingEmpty')}</div>
          ) : (
            <div className="space-y-2">
              {items.map(item => (
                <div key={item.id} className="rounded-lg border border-white/10 bg-white/5 p-3 flex items-center gap-2">
                  {editMode ? (
                    <>
                      <input
                        value={drafts[item.id] || ''}
                        onChange={e => setDrafts(prev => ({ ...prev, [item.id]: e.target.value }))}
                        className="flex-1 rounded-md bg-white/5 border border-white/15 px-3 py-2"
                      />
                      <button
                        type="button"
                        onClick={() => updateItem(item.id)}
                        className="h-9 w-9 rounded-full border border-emerald-300/35 bg-emerald-500/15 hover:bg-emerald-500/25 inline-flex items-center justify-center"
                        title={t('shoppingSaveItem')}
                      >
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(item)}
                        className="h-9 w-9 rounded-full border border-rose-300/35 bg-rose-500/15 hover:bg-rose-500/25 inline-flex items-center justify-center"
                        title={t('shoppingDeleteItem')}
                        aria-label={t('shoppingDeleteItem')}
                      >
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/></svg>
                      </button>
                    </>
                  ) : (
                    <div className="flex-1 text-base">{item.text}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 mb-3">
          <input
            value={newItemText}
            onChange={e => setNewItemText(e.target.value)}
            placeholder={t('shoppingInputPlaceholder')}
            className="rounded-md bg-white/5 border border-white/15 px-3 py-3"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addItem()
              }
            }}
          />
          <button
            type="button"
            onClick={addItem}
            className="h-12 w-12 rounded-full border border-sky-300/35 bg-sky-500/15 hover:bg-sky-500/25 inline-flex items-center justify-center"
            title={t('shoppingAdd')}
            aria-label={t('shoppingAdd')}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setClearModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-rose-300/35 bg-rose-500/15 hover:bg-rose-500/25"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>
            <span>{t('shoppingClearAll')}</span>
          </button>

          <button
            type="button"
            onClick={() => setEditMode(v => !v)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 bg-white/5 hover:bg-white/10"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
            <span>{editMode ? t('shoppingDoneEdit') : t('shoppingEditMode')}</span>
          </button>
        </div>

        {error && <div className="text-rose-400 text-sm mt-3">{error}</div>}
      </AnimatedCard>

      {clearModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-300/30 bg-slate-900 shadow-2xl p-5">
            <h2 className="text-xl font-bold mb-2">{t('shoppingClearTitle')}</h2>
            <p className="text-sm opacity-80 mb-5">{t('shoppingClearConfirm')}</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setClearModalOpen(false)}
                className="px-4 py-2 rounded-full border border-white/20 bg-white/5 hover:bg-white/10"
              >
                {t('shoppingConfirmNo')}
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="px-4 py-2 rounded-full border border-rose-300/35 bg-rose-500/20 hover:bg-rose-500/30"
              >
                {t('shoppingConfirmYes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-amber-300/30 bg-slate-900 shadow-2xl p-5">
            <h2 className="text-xl font-bold mb-2">{t('shoppingDeleteTitle')}</h2>
            <p className="text-sm opacity-80 mb-1">{t('shoppingDeleteConfirm')}</p>
            <p className="text-sm text-amber-200/90 mb-5">{deleteTarget.text}</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-full border border-white/20 bg-white/5 hover:bg-white/10"
              >
                {t('shoppingConfirmNo')}
              </button>
              <button
                type="button"
                onClick={() => deleteItem(deleteTarget.id)}
                className="px-4 py-2 rounded-full border border-amber-300/35 bg-amber-500/20 hover:bg-amber-500/30"
              >
                {t('shoppingConfirmYes')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
