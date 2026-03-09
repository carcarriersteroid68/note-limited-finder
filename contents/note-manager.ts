import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://creator.xiaohongshu.com/*"],
  world: "MAIN",
  run_at: "document_start"
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface NoteItem {
  display_title: string
  level: number
  id: string
}

interface NotesApiResponse {
  code: number
  success: boolean
  data: {
    notes: NoteItem[]
  }
}

// ─── State ────────────────────────────────────────────────────────────────────

const TARGET_API = "/api/galaxy/v2/creator/note/user/posted"
const BADGE_ATTR = "data-level-badge"

// display_title -> level
const noteLevelMap = new Map<string, number>()

let domObserver: MutationObserver | null = null

// ─── Badge Styling ────────────────────────────────────────────────────────────

function getBadgeStyle(level: number): {
  text: string
  backgroundColor: string
  color: string
} {
  if (level >= 1) {
    // Green gradient: brighter/deeper as level increases
    const text = level >= 4 ? `L${level} 正常` : `L${level} 正常`
    const backgroundColor =
      level >= 5
        ? "#135200"
        : level === 4
          ? "#237804"
          : level === 3
            ? "#389e0d"
            : level === 2
              ? "#52c41a"
              : "#73d13d" // level 1
    return { text, backgroundColor, color: "#fff" }
  }
  // Red gradient: deeper as level decreases (more limited)
  const text = level >= -1 ? `L${level} 限流` : `L${level} 限流`
  const backgroundColor =
    level <= -3
      ? "#a8071a"
      : level === -2
        ? "#cf1322"
        : level === -1
          ? "#f5222d"
          : "#ff7875" // level 0
  return { text, backgroundColor, color: "#fff" }
}

// ─── DOM Badge Application ────────────────────────────────────────────────────

function applyBadgesToCurrentDom() {
  // Try scoped selector first, fall back to generic
  let titleEls = document.querySelectorAll<HTMLElement>(
    "div.title[data-v-c905073a]"
  )
  console.log(
    `[Limited Finder] applyBadges: scoped selector found ${titleEls.length} elements`
  )
  if (titleEls.length === 0) {
    titleEls = document.querySelectorAll<HTMLElement>("div.title")
    console.log(
      `[Limited Finder] applyBadges: fallback selector found ${titleEls.length} elements`
    )
  }

  titleEls.forEach((el) => {
    const title = el.textContent?.trim()
    if (!title) return

    const level = noteLevelMap.get(title)
    if (level === undefined) return

    // Check for existing badge on the parent to avoid duplication
    const parent = el.parentElement
    if (!parent) return

    let badge = parent.querySelector<HTMLElement>(`[${BADGE_ATTR}]`)

    if (!badge) {
      badge = document.createElement("span")
      badge.setAttribute(BADGE_ATTR, "true")
      parent.insertBefore(badge, el.nextSibling)
    }

    // Skip update if level hasn't changed
    if (badge.getAttribute(BADGE_ATTR) === String(level)) return

    badge.setAttribute(BADGE_ATTR, String(level))

    const { text, backgroundColor, color } = getBadgeStyle(level)
    badge.textContent = text

    Object.assign(badge.style, {
      display: "inline-block",
      marginLeft: "6px",
      padding: "1px 6px",
      borderRadius: "4px",
      fontSize: "11px",
      fontWeight: "600",
      lineHeight: "18px",
      verticalAlign: "middle",
      backgroundColor,
      color,
      cursor: "default",
      userSelect: "none",
      whiteSpace: "nowrap",
      flexShrink: "0"
    })
  })
}

// ─── MutationObserver ─────────────────────────────────────────────────────────

function startDomObserver() {
  if (domObserver) {
    domObserver.disconnect()
  }

  domObserver = new MutationObserver((mutations) => {
    let hasRelevantChange = false

    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement) {
          if (node.matches("div.title") || node.querySelector("div.title")) {
            hasRelevantChange = true
            break
          }
        }
      }
      if (hasRelevantChange) break
    }

    if (hasRelevantChange && noteLevelMap.size > 0) {
      applyBadgesToCurrentDom()
    }
  })

  domObserver.observe(document.body, {
    childList: true,
    subtree: true
  })
}

// ─── Response Handler ─────────────────────────────────────────────────────────

function handleNotesApiResponse(data: NotesApiResponse) {
  if (data?.code === 0 && Array.isArray(data?.data?.notes)) {
    data.data.notes.forEach((note) => {
      noteLevelMap.set(note.display_title, note.level)
    })
    applyBadgesToCurrentDom()
  } else {
    console.warn("[Limited Finder] unexpected response structure", data)
  }
}

// ─── XHR Interceptor ──────────────────────────────────────────────────────────

function installXhrInterceptor() {
  const OriginalXHR = window.XMLHttpRequest
  // @ts-ignore
  window.XMLHttpRequest = function () {
    const xhr = new OriginalXHR()
    const originalOpen = xhr.open.bind(xhr)
    let targetUrl = ""

    xhr.open = function (method: string, url: string, ...rest: unknown[]) {
      if (url.includes(TARGET_API)) {
        targetUrl = url
      }
      // @ts-ignore
      return originalOpen(method, url, ...rest)
    }

    xhr.addEventListener("load", function () {
      if (!targetUrl) return
      console.log("[Limited Finder] XHR API call detected:", targetUrl)
      try {
        const data: NotesApiResponse = JSON.parse(xhr.responseText)
        handleNotesApiResponse(data)
      } catch (err) {
        console.error("[Limited Finder] failed to parse XHR response", err)
      }
    })

    return xhr
  }
  console.log("[Limited Finder] XHR interceptor installed")
}

// ─── Fetch Interceptor ────────────────────────────────────────────────────────

function installFetchInterceptor() {
  const originalFetch = window.fetch

  window.fetch = async function (...args: Parameters<typeof fetch>) {
    const response = await originalFetch.apply(this, args)

    const url =
      typeof args[0] === "string"
        ? args[0]
        : args[0] instanceof URL
          ? args[0].href
          : (args[0] as Request).url

    if (url.includes(TARGET_API)) {
      console.log("[Limited Finder] fetch API call detected:", url)
      response
        .clone()
        .json()
        .then((data: NotesApiResponse) => handleNotesApiResponse(data))
        .catch((err) => {
          console.error("[Limited Finder] failed to parse fetch response", err)
        })
    }

    return response
  }
  console.log("[Limited Finder] fetch interceptor installed")
}

// ─── SPA Navigation Handling ──────────────────────────────────────────────────

function handleNavigation() {
  if (window.location.pathname.includes("/note-manager")) {
    applyBadgesToCurrentDom()
  }
}

function installNavigationHooks() {
  const originalPushState = history.pushState
  history.pushState = function (...args) {
    originalPushState.apply(this, args)
    handleNavigation()
  }

  const originalReplaceState = history.replaceState
  history.replaceState = function (...args) {
    originalReplaceState.apply(this, args)
    handleNavigation()
  }

  window.addEventListener("popstate", handleNavigation)
}

// ─── Init ─────────────────────────────────────────────────────────────────────

function init() {
  console.log("[Limited Finder] init, url:", window.location.href)
  installXhrInterceptor()
  installFetchInterceptor()
  installNavigationHooks()

  if (document.body) {
    startDomObserver()
  } else {
    document.addEventListener("DOMContentLoaded", startDomObserver, {
      once: true
    })
  }
}

init()
