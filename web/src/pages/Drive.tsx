import React, { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import AnimatedCard from '../components/AnimatedCard'
import AnimatedButton from '../components/AnimatedButton'
import FancyInput from '../components/FancyInput'
import { useI18n } from '../contexts/I18nContext'

function humanSize(n: number) {
  if (n < 1024) return n + ' B'
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB'
  if (n < 1024 * 1024 * 1024) return (n / (1024 * 1024)).toFixed(1) + ' MB'
  return (n / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
}

export default function Drive() {
  const { t, lang } = useI18n()
  const [items, setItems] = useState<any[]>([])
  const [path, setPath] = useState('')
  const [pathInput, setPathInput] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [draggingItemPath, setDraggingItemPath] = useState<string | null>(null)
  const [dropTargetPath, setDropTargetPath] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const apiBase = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000'
  const userId = localStorage.getItem('userId') || localStorage.getItem('username') || 'Bader'

  function makeAuthHeaders() {
    const token = localStorage.getItem('token')
    if (token) return { Authorization: `Bearer ${token}` }
    return { 'x-user-id': userId }
  }

  function normalizePath(p: string) {
    return p.replace(/^\/+|\/+$/g, '')
  }

  function buildDriveUrl(p: string) {
    const normalized = normalizePath(p)
    return normalized ? `/drive?path=${encodeURIComponent(normalized)}` : '/drive'
  }

  function navigateTo(nextPath: string, pushHistory = true) {
    const normalized = normalizePath(nextPath)
    if (normalized === path) {
      setPathInput(normalized)
      return
    }

    setPath(normalized)
    setPathInput(normalized)
    const url = buildDriveUrl(normalized)
    if (pushHistory) {
      window.history.pushState({ path: normalized }, '', url)
    } else {
      window.history.replaceState({ path: normalized }, '', url)
    }
  }

  function goToTypedPath() {
    navigateTo(pathInput, true)
  }

  function basename(p: string) {
    const parts = p.split('/').filter(Boolean)
    return parts[parts.length - 1] || ''
  }

  function parentPath(p: string) {
    const parts = p.split('/').filter(Boolean)
    parts.pop()
    return parts.join('/')
  }

  function joinPath(folder: string, name: string) {
    return folder ? `${folder}/${name}` : name
  }

  const exactPathUrl = `${window.location.origin}/drive${path ? `?path=${encodeURIComponent(path)}` : ''}`

  useEffect(() => {
    const initial = normalizePath(new URLSearchParams(window.location.search).get('path') || '')
    setPath(initial)
    setPathInput(initial)
    window.history.replaceState({ path: initial }, '', buildDriveUrl(initial))

    function onPopState() {
      const next = normalizePath(new URLSearchParams(window.location.search).get('path') || '')
      setPath(next)
      setPathInput(next)
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await axios.get(`${apiBase}/storage/list`, { params: { path }, headers: makeAuthHeaders() })
      setItems(res.data)
    } catch (err) {
      console.error(err)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [path])

  async function onFiles(files: FileList | null, targetPath = path) {
    if (!files || files.length === 0) return
    setLoading(true)
    try {
      for (const f of Array.from(files)) {
        const fd = new FormData()
        fd.append('file', f)
        // let browser set multipart boundary
        await axios.post(`${apiBase}/storage/upload`, fd, { params: { path: targetPath }, headers: makeAuthHeaders() })
      }
      await load()
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  async function moveItem(sourcePath: string, targetFolder: string) {
    const name = basename(sourcePath)
    if (!name) return
    if (targetFolder === sourcePath || targetFolder.startsWith(`${sourcePath}/`)) {
      alert(t('driveMoveIntoSelf'))
      return
    }
    const newPath = joinPath(targetFolder, name)
    if (newPath === sourcePath) return
    await axios.post(`${apiBase}/storage/rename`, { path: sourcePath, newPath }, { headers: makeAuthHeaders() })
    await load()
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const draggedPath = e.dataTransfer.getData('application/x-home-drive-item') || draggingItemPath
    if (draggedPath) {
      setDropTargetPath(null)
      setDraggingItemPath(null)
      moveItem(draggedPath, path).catch(console.error)
      return
    }
    onFiles(e.dataTransfer.files, path)
  }

  function handleDragStart(e: React.DragEvent, itemPath: string) {
    setDraggingItemPath(itemPath)
    e.dataTransfer.setData('application/x-home-drive-item', itemPath)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragEnd() {
    setDraggingItemPath(null)
    setDropTargetPath(null)
  }

  function handleFolderDragOver(e: React.DragEvent, folderPath: string) {
    e.preventDefault()
    e.stopPropagation()
    setDropTargetPath(folderPath)
  }

  async function handleFolderDrop(e: React.DragEvent, folderPath: string) {
    e.preventDefault()
    e.stopPropagation()
    const draggedPath = e.dataTransfer.getData('application/x-home-drive-item') || draggingItemPath
    setDropTargetPath(null)
    if (draggedPath) {
      setDraggingItemPath(null)
      await moveItem(draggedPath, folderPath)
      return
    }
    await onFiles(e.dataTransfer.files, folderPath)
  }

  async function handleParentDrop(e: React.DragEvent) {
    e.preventDefault()
    const parent = parentPath(path)
    const draggedPath = e.dataTransfer.getData('application/x-home-drive-item') || draggingItemPath
    setDropTargetPath(null)
    if (draggedPath) {
      setDraggingItemPath(null)
      await moveItem(draggedPath, parent)
      return
    }
    await onFiles(e.dataTransfer.files, parent)
  }

  function handleBrowse() {
    fileRef.current?.click()
  }

  async function makeFolder() {
    const name = prompt(t('driveFolderNamePrompt'))
    if (!name) return
    await axios.post(`${apiBase}/storage/mkdir`, { path: (path ? path + '/' : '') + name }, { headers: makeAuthHeaders() })
    load()
  }

  async function remove(p: string) {
    if (!confirm(t('driveDeleteConfirm'))) return
    await axios.delete(`${apiBase}/storage/delete`, { data: { path: p }, headers: makeAuthHeaders() })
    load()
  }

  async function rename(p: string) {
    const newName = prompt(t('driveNewNamePrompt'), p.split('/').pop())
    if (!newName) return
    const base = p.split('/').slice(0, -1).join('/')
    const newPath = base ? `${base}/${newName}` : newName
    await axios.post(`${apiBase}/storage/rename`, { path: p, newPath }, { headers: makeAuthHeaders() })
    load()
  }

  async function doSearch() {
    if (!query) return load()
    setLoading(true)
    try {
      const res = await axios.get(`${apiBase}/storage/search`, { params: { q: query, path }, headers: makeAuthHeaders() })
      setItems(res.data)
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  async function downloadFile(p: string) {
    try {
      const res = await axios.get(`${apiBase}/storage/download`, { params: { path: p }, headers: makeAuthHeaders(), responseType: 'blob' })
      const disposition = res.headers['content-disposition'] || ''
      let filename = p.split('/').pop() || 'file'
      const m = /filename="?([^";]+)"?/.exec(disposition)
      if (m && m[1]) filename = m[1]

      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) { console.error(err); alert(t('driveDownloadFailed')) }
  }

  async function previewFile(p: string) {
    try {
      const res = await axios.get(`${apiBase}/storage/preview`, { params: { path: p }, headers: makeAuthHeaders(), responseType: 'blob' })
      const contentType = res.headers['content-type'] || 'application/octet-stream'
      const blob = new Blob([res.data], { type: contentType })
      const url = URL.createObjectURL(blob)
      const name = p.split('/').pop() || 'preview'
      const safeName = name.replace(/[&<>"']/g, '')
      const win = window.open('', '_blank')
      if (!win) {
        alert(t('drivePopupBlocked'))
        return
      }

      const isImage = contentType.startsWith('image/')
      const isVideo = contentType.startsWith('video/')
      const isAudio = contentType.startsWith('audio/')
      const isPdf = contentType === 'application/pdf'
      const isText = contentType.startsWith('text/')

      if (isImage || isVideo || isAudio || isPdf) {
        const body = isImage
          ? `<img src="${url}" alt="${safeName}" style="max-width:100%;max-height:100%;object-fit:contain;display:block;margin:auto;" />`
          : isVideo
          ? `<video src="${url}" controls autoplay style="max-width:100%;max-height:100%;display:block;margin:auto;background:#000"></video>`
          : isAudio
          ? `<audio src="${url}" controls autoplay style="width:min(900px,90vw);display:block;margin:40px auto;"></audio>`
          : `<iframe src="${url}" style="border:0;width:100%;height:100%"></iframe>`

        win.document.write(`<!doctype html><html><head><meta charset=\"utf-8\"><title>${safeName}</title><style>html,body{height:100%;margin:0;background:#0b0f14;color:#fff;font-family:Segoe UI,Arial,sans-serif}header{padding:10px 14px;border-bottom:1px solid #243244}main{height:calc(100% - 48px);display:flex;align-items:center;justify-content:center}</style></head><body><header>${safeName}</header><main>${body}</main></body></html>`)
        win.document.close()
        return
      }

      if (isText) {
        const text = await blob.text()
        const escaped = text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
        win.document.write(`<!doctype html><html><head><meta charset=\"utf-8\"><title>${safeName}</title><style>html,body{height:100%;margin:0;background:#0b0f14;color:#eaf2ff;font-family:Consolas,monospace}header{padding:10px 14px;border-bottom:1px solid #243244;font-family:Segoe UI,Arial,sans-serif}pre{margin:0;padding:16px;white-space:pre-wrap;word-break:break-word}</style></head><body><header>${safeName}</header><pre>${escaped}</pre></body></html>`)
        win.document.close()
        return
      }

      // Last-resort: open blob directly.
      win.location.href = url
    } catch (err) { console.error(err); alert(t('drivePreviewFailed')) }
  }

  return (
    <div className="space-y-4">
      <AnimatedCard className="p-4 sm:p-5">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr_auto] gap-3 items-end">
          <FancyInput
            label={t('driveRelativePath')}
            value={pathInput}
            onChange={(e:any)=>setPathInput(e.target.value)}
            onKeyDown={(e:any) => {
              if (e.key === 'Enter') goToTypedPath()
            }}
            placeholder={t('drivePathPlaceholder')}
          />

          <FancyInput
            label={t('driveSearch')}
            value={query}
            onChange={(e:any)=>setQuery(e.target.value)}
            onKeyDown={(e:any) => {
              if (e.key === 'Enter') doSearch()
            }}
          />

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <AnimatedButton onClick={goToTypedPath} className="px-4 py-2 text-sm">{t('driveGo')}</AnimatedButton>
            <AnimatedButton onClick={doSearch} className="px-4 py-2 text-sm">{t('driveSearch')}</AnimatedButton>
            <AnimatedButton onClick={makeFolder} className="px-4 py-2 text-sm">{t('driveNewFolder')}</AnimatedButton>
          </div>
        </div>

        <div className="mt-3 text-xs opacity-80">
          <div>{t('driveCurrentRelativePath')} <span className="font-semibold">/{path || t('driveRoot')}</span></div>
          <div>{t('driveExactUrl')} <span className="font-semibold break-all">{exactPathUrl}</span></div>
        </div>
      </AnimatedCard>

      <AnimatedCard className="p-0 overflow-hidden">
        <div className="p-4 sm:p-5">
        {path && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDropTargetPath('__PARENT__') }}
            onDragLeave={() => setDropTargetPath(null)}
            onDrop={handleParentDrop}
            className={`mb-4 rounded-md border p-3 text-sm ${dropTargetPath === '__PARENT__' ? 'border-emerald-400 bg-emerald-500/10' : 'border-white/15 bg-white/5'}`}
          >
              {t('driveDropToParent')} <span className="font-semibold">/{parentPath(path) || t('driveRoot')}</span>
          </div>
        )}

        <div onDrop={handleDrop} onDragOver={e=>e.preventDefault()} className="p-6 border-2 border-dashed rounded-xl text-center mb-4">
            <div className="mb-2">{t('driveDropZoneText')} /{path || t('driveRoot')}</div>
            <AnimatedButton onClick={handleBrowse}>{t('driveBrowseFiles')}</AnimatedButton>
          <input ref={fileRef} type="file" hidden onChange={e=>onFiles(e.target.files)} />
        </div>
        </div>

        <div className="overflow-x-auto border-t border-white/10">
            {loading ? <div>{t('driveLoading')}</div> : (
            <table className="w-full text-left min-w-[780px]">
              <thead className="bg-white/5">
                <tr className="text-sm opacity-90">
                    <th className="px-4 py-3">{t('driveName')}</th>
                    <th className="px-4 py-3">{t('driveSize')}</th>
                    <th className="px-4 py-3">{t('driveModified')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it:any)=> (
                  <tr
                    key={it.path}
                    draggable
                    onDragStart={(e) => handleDragStart(e, it.path)}
                    onDragEnd={handleDragEnd}
                    onDragOver={it.isDir ? (e) => handleFolderDragOver(e, it.path) : undefined}
                    onDragLeave={it.isDir ? () => setDropTargetPath(null) : undefined}
                    onDrop={it.isDir ? (e) => handleFolderDrop(e, it.path) : undefined}
                    className={`border-t border-white/8 ${it.isDir && dropTargetPath === it.path ? 'bg-emerald-500/10' : ''}`}
                  >
                    <td className="px-4 py-3">
                      {it.isDir ? '📁' : '📄'}{' '}
                      {it.isDir ? (
                        <button onClick={() => navigateTo(it.path)} className="underline">
                          {it.name}
                        </button>
                      ) : it.name}
                    </td>
                    <td className="px-4 py-3">{it.isDir ? '-' : humanSize(it.size || 0)}</td>
                    <td className="px-4 py-3">{it.mtime ? new Date(it.mtime).toLocaleString(lang === 'ar' ? 'ar' : 'en') : '-'}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {!it.isDir && <button onClick={()=>downloadFile(it.path)} className="mr-3 underline cursor-pointer">{t('driveDownload')}</button>}
                      {!it.isDir && <button onClick={()=>previewFile(it.path)} className="mr-3 underline cursor-pointer">{t('drivePreview')}</button>}
                      <button onClick={()=>rename(it.path)} className="mr-2 text-sm">{t('driveRename')}</button>
                      <button onClick={()=>remove(it.path)} className="text-sm text-rose-400">{t('driveDelete')}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </AnimatedCard>
    </div>
  )
}
