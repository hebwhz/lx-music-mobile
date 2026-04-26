import RNFS from 'react-native-fs'
import { FileSystem } from 'react-native-file-system'
import { updateTask } from '@/store/download/action'
import settingState from '@/store/setting/state'
import { writeLyric, writePic } from '@/utils/localMediaMetadata'
import { writeFile } from '@/utils/fs'

const MAX_CONCURRENT = 3
const MIN_REQUIRED_SPACE = 100 * 1024 * 1024 // 100MB
const COVER_CACHE_DIR = RNFS.DocumentDirectoryPath + '/cover_cache'
const PROGRESS_THROTTLE = 1000

interface DownloadQueueItem {
  task: LX.Download.ListItem
  onProgress: (progress: LX.Download.ProgressInfo) => void
  onComplete: (taskId: string, fileSize: number) => void
  onError: (taskId: string, error: string) => void
  onJobId: (jobId: number) => void
}

let activeCount = 0
let queue: DownloadQueueItem[] = []
const activeDownloads = new Map<string, number>()

const formatSpeed = (bytesPerSecond: number): string => {
  if (bytesPerSecond > 1024 * 1024) {
    return `${(bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s`
  }
  return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`
}

const parseErrorMessage = (err: any): string => {
  const message = err?.message ?? err?.toString() ?? 'unknown_error'
  if (message.includes('ECONNABORTED')) return '请求超时'
  if (message.includes('ENOTFOUND')) return '无法连接到服务器'
  if (message.includes('ECONNRESET') || message.includes('ETIMEDOUT')) return '网络连接失败'
  if (message.includes('ENOENT')) return '文件路径不存在'
  if (message.includes('EACCES')) return '没有写入权限'
  return message
}

const createProgressHandler = (
  onProgress: (progress: LX.Download.ProgressInfo) => void,
) => {
  let lastUpdate = 0
  let lastBytes = 0
  let lastTime = 0

  return (res: { bytesWritten: number; contentLength: number; bytesWrittenPerSecond?: number }) => {
    const progress = res.contentLength > 0 ? res.bytesWritten / res.contentLength : 0
    const now = Date.now()
    const dt = now - lastTime
    const speed = dt > 0 ? ((res.bytesWritten - lastBytes) / (dt / 1000)) : 0

    if (now - lastUpdate >= PROGRESS_THROTTLE || progress >= 1) {
      onProgress({
        progress,
        speed: formatSpeed(speed),
        downloaded: res.bytesWritten,
        total: res.contentLength,
      })
      lastUpdate = now
      lastBytes = res.bytesWritten
      lastTime = now
    }
  }
}

const processNextInQueue = () => {
  if (queue.length === 0 || activeCount >= MAX_CONCURRENT) return

  const next = queue.shift()!
  activeCount++

  const progressHandler = createProgressHandler(next.onProgress)
  updateTask(next.task.id, { status: 'run' })

  const downloadOptions: RNFS.DownloadFileOptions = {
    fromUrl: next.task.metadata.url ?? '',
    toFile: next.task.metadata.filePath,
    background: true,
    discretionary: false,
    progressInterval: PROGRESS_THROTTLE,
    begin: (res) => {
      activeDownloads.set(next.task.id, res.jobId)
      next.onJobId(res.jobId)
    },
    progress: progressHandler,
  }

  RNFS.downloadFile(downloadOptions).promise
    .then((res) => {
      activeCount--
      activeDownloads.delete(next.task.id)
      if (res.statusCode === 200 || res.statusCode === 206) {
        next.onComplete(next.task.id, res.bytesWritten)
      } else {
        next.onError(next.task.id, `HTTP ${res.statusCode}: ${res.description ?? ''}`)
      }
    })
    .catch((err) => {
      activeCount--
      activeDownloads.delete(next.task.id)
      next.onError(next.task.id, parseErrorMessage(err))
    })
    .finally(() => {
      processNextInQueue()
    })
}

export const enqueueDownload = (
  task: LX.Download.ListItem,
  onProgress: (progress: LX.Download.ProgressInfo) => void,
  onComplete: (taskId: string, fileSize: number) => void,
  onError: (taskId: string, error: string) => void,
): void => {
  if (activeCount < MAX_CONCURRENT) {
    activeCount++

    const progressHandler = createProgressHandler(onProgress)
    updateTask(task.id, { status: 'run' })

    const downloadOptions: RNFS.DownloadFileOptions = {
      fromUrl: task.metadata.url ?? '',
      toFile: task.metadata.filePath,
      background: true,
      discretionary: false,
      progressInterval: PROGRESS_THROTTLE,
      begin: (res) => {
        activeDownloads.set(task.id, res.jobId)
      },
      progress: progressHandler,
    }

    RNFS.downloadFile(downloadOptions).promise
      .then((res) => {
        activeCount--
        activeDownloads.delete(task.id)
        if (res.statusCode === 200 || res.statusCode === 206) {
          onComplete(task.id, res.bytesWritten)
        } else {
          onError(task.id, `HTTP ${res.statusCode}: ${res.description ?? ''}`)
        }
      })
      .catch((err) => {
        activeCount--
        activeDownloads.delete(task.id)
        onError(task.id, parseErrorMessage(err))
      })
      .finally(() => {
        processNextInQueue()
      })
  } else {
    updateTask(task.id, { status: 'waiting' })
    queue.push({ task, onProgress, onComplete, onError, onJobId: () => {} })
  }
}

export const stopDownload = (taskId: string): void => {
  const jobId = activeDownloads.get(taskId)
  if (jobId != null) {
    RNFS.stopDownload(jobId)
  }
}

export const getAvailableStorage = async(): Promise<number> => {
  try {
    const fsInfo = await FileSystem.getFSInfo()
    return fsInfo.freeSpace
  } catch {
    return 0
  }
}

export const checkStorageSpace = async(requiredSize?: number): Promise<boolean> => {
  const target = requiredSize ?? MIN_REQUIRED_SPACE

  try {
    const fsInfo = await FileSystem.getFSInfo()
    const free = fsInfo.freeSpace ?? fsInfo.freeDiskSpace ?? fsInfo.availableSpace ?? 0
    if (free > target) {
      return true
    }
  } catch {
    // Ignore
  }

  try {
    const fsInfo = await RNFS.getFSInfo()
    const free = fsInfo.freeSpace ?? fsInfo.freeDiskSpace ?? fsInfo.availableSpace ?? 0
    return free > target
  } catch {
    return true
  }
}

export const saveLyricFile = async(lyricInfo: LX.Music.LyricInfo, filePath: string): Promise<void> => {
  const lyricType = settingState.setting['download.lyricType']
  const lyric = lyricInfo.lyric

  if (!lyric) return

  if (lyricType === 'embed') {
    try {
      await writeLyric(filePath, lyric)
    } catch (err) {
      console.warn('[saveLyricFile] Failed to embed lyric:', err)
    }
  } else {
    const lrcPath = filePath.replace(/\.\w+$/, '.lrc')
    await writeFile(lrcPath, lyric, 'utf8')
  }
}

export const saveCoverFile = async(picUrl: string, filePath: string): Promise<void> => {
  if (!picUrl) return

  try {
    await RNFS.mkdir(COVER_CACHE_DIR)
    const ext = picUrl.split('?')[0].split('.').pop() || 'jpg'
    const coverPath = `${COVER_CACHE_DIR}/${Date.now()}.${ext}`

    await RNFS.downloadFile({ fromUrl: picUrl, toFile: coverPath }).promise

    await writePic(filePath, coverPath)

    await RNFS.unlink(coverPath).catch(() => {})
  } catch (err) {
    console.warn('[saveCoverFile] Failed to embed cover:', err)
  }
}
