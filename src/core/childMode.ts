import { useEffect, useState } from 'react'
import BackgroundTimer from 'react-native-background-timer'
import { pause, setBeforePlayInterceptor } from '@/core/player/player'
import playerState from '@/store/player/state'
import settingState from '@/store/setting/state'
import { getDuration } from '@/plugins/player'
import { toast, toMD5 } from '@/utils/tools'
import { updateSetting } from '@/core/common'
import { getChildModeDailyPlayInfo, saveChildModeDailyPlayInfo } from '@/utils/data'
import { speakTip, stopSpeakTip } from '@/utils/tts'
import type { Message } from '@/lang'

type MessageKey = keyof Message
type MessageValues = Record<string, string | number>

/**
 * 播放时长记录间隔 unit 毫秒
 */
const TICK_TIME = 1000
/**
 * 记录写入存储的间隔 unit 秒
 */
const SAVE_TIME_INTERVAL = 10
/**
 * 同一提示的最小间隔 unit 毫秒，避免反复播放提示音
 */
const TIP_INTERVAL = 10 * 1000
/**
 * 听完一集的比例，达到该比例才算听完一集
 */
const LISTENED_RATIO = 0.8

type LimitType = 'single' | 'episode' | 'daily'

const getToday = (): string => {
  const date = new Date()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

const hashPassword = (password: string): string => toMD5(`lx_child_mode_${password}`)

const createDailyPlayInfo = (): LX.ChildMode.DailyPlayInfo => ({ date: '', time: 0 })

const playTime = {
  dailyInfo: createDailyPlayInfo(),
  /** 单次（连续）播放时长 unit 秒 */
  singleTime: 0,
  /** 开始休息（暂停）的时间戳 unit 毫秒，0 表示当前未处于休息状态 */
  pausedStartTime: 0,
  /** 单次已听完的集数 */
  episodeCount: 0,
  /** 当前歌曲 id */
  musicId: '',
  /** 当前歌曲已播放时长 unit 秒 */
  musicListenedTime: 0,
  /** 当前歌曲总时长 unit 秒 */
  musicDuration: 0,
  /** 当前歌曲是否已计入集数 */
  musicCounted: false,
  /** 最后一次计入集数的歌曲 id */
  countedMusicId: '',
  /** 当前歌曲已统计的刻度数 */
  musicTicks: 0,
  needLoadDuration: true,
  lastTickTime: 0,
  saveTimeCount: 0,
  timer: null as number | null,
}

/**
 * 重置单次播放的记录，休息结束后重新开始统计
 */
const resetSinglePlay = () => {
  playTime.singleTime = 0
  playTime.episodeCount = 0
  playTime.musicId = ''
  playTime.musicListenedTime = 0
  playTime.musicDuration = 0
  playTime.musicCounted = false
  playTime.countedMusicId = ''
  playTime.needLoadDuration = true
}

/**
 * 统计已听完的集数，听完总时长的 LISTENED_RATIO（80%）以上才算一集
 */
const countListenedMusic = (delta: number) => {
  const musicId = playerState.musicInfo.id
  if (!musicId) return

  if (playTime.musicId != musicId) {
    playTime.musicId = musicId
    playTime.musicListenedTime = 0
    playTime.musicDuration = 0
    playTime.musicCounted = false
    playTime.needLoadDuration = true
    playTime.musicTicks = 0
  }
  playTime.musicTicks += 1

  // 歌曲切换后延迟获取时长，避免取到上一首歌曲的时长
  if (playTime.needLoadDuration && playTime.musicTicks >= 3) {
    playTime.needLoadDuration = false
    void getDuration().then(duration => {
      if (playTime.musicId != musicId) return
      playTime.musicDuration = duration
      if (!duration) playTime.needLoadDuration = true
    }).catch(err => {
      console.log('get duration error:', err)
      if (playTime.musicId == musicId) playTime.needLoadDuration = true
    })
  }
  if (playTime.musicDuration <= 0) playTime.musicDuration = playerState.progress.maxPlayTime

  playTime.musicListenedTime += delta
  if (playTime.musicCounted || playTime.musicDuration <= 0) return
  if (playTime.musicListenedTime >= playTime.musicDuration * LISTENED_RATIO) {
    playTime.musicCounted = true
    playTime.countedMusicId = musicId
    playTime.episodeCount += 1
  }
}

/**
 * 集数限制已到达，但计入的最后一集尚未播放完毕，此时允许继续播放到本集结束
 * 80% 只是用来过滤“点开某一集发现不是想听的就马上切走”的情况，不应在本集的 80% 处打断
 */
const isLastCountedMusicPlaying = (): boolean => {
  return !!playTime.countedMusicId &&
    playTime.countedMusicId == playTime.musicId &&
    playTime.musicDuration > 0 &&
    playTime.musicListenedTime < playTime.musicDuration - 1
}

/**
 * 设置是否已通过验证，未验证时不允许修改设置
 */
let isSettingVerified = false

/**
 * 达到单次播放时长限制后的休息时长 unit 秒
 */
const getRestTime = (): number => {
  return Math.max(1, settingState.setting['childMode.restTime']) * 60
}

/**
 * 已休息时长 unit 秒，用当前系统时间与开始休息的时间戳做差，避免定时器被挂起时休息时间不增加
 */
const getPausedTime = (): number => {
  if (!playTime.pausedStartTime) return 0
  return Math.max(0, (Date.now() - playTime.pausedStartTime) / 1000)
}

const isLimitEmpty = (): boolean => {
  return settingState.setting['childMode.singlePlayTime'] <= 0 &&
    settingState.setting['childMode.singlePlayCount'] <= 0 &&
    settingState.setting['childMode.dailyPlayTime'] <= 0
}

const tip = (key: MessageKey, val?: MessageValues) => {
  toast(global.i18n.t(key, val))
}

const saveDailyPlayInfo = () => {
  void saveChildModeDailyPlayInfo({
    ...playTime.dailyInfo,
    singleTime: playTime.singleTime,
    episodeCount: playTime.episodeCount,
    pauseStartTime: playTime.pausedStartTime,
  })
}

let tipType: LimitType | null = null
let tipTime = 0

interface LimitInfo {
  type: LimitType
  val: MessageValues
  tipKey: MessageKey
  voiceKey: MessageKey
}

/**
 * 当前是否已达到限制，单次播放时长、单次收听集数、每日播放总时长任一达到即限制（取交集，谁先到达谁先生效）
 */
const getLimitInfo = (): LimitInfo | null => {
  const dailyPlayTime = settingState.setting['childMode.dailyPlayTime']
  const singlePlayTime = settingState.setting['childMode.singlePlayTime']
  const singlePlayCount = settingState.setting['childMode.singlePlayCount']
  const rest = Math.max(1, Math.ceil((getRestTime() - getPausedTime()) / 60))

  if (dailyPlayTime > 0 && playTime.dailyInfo.time >= dailyPlayTime * 60) {
    return {
      type: 'daily',
      val: { time: dailyPlayTime },
      tipKey: 'child_mode_daily_limit_tip',
      voiceKey: 'child_mode_daily_limit_voice',
    }
  }
  if (singlePlayTime > 0 && playTime.singleTime >= singlePlayTime * 60) {
    return {
      type: 'single',
      val: { time: singlePlayTime, rest },
      tipKey: 'child_mode_single_limit_tip',
      voiceKey: 'child_mode_single_limit_voice',
    }
  }
  if (singlePlayCount > 0 && playTime.episodeCount >= singlePlayCount) {
    return {
      type: 'episode',
      val: { count: singlePlayCount, rest },
      tipKey: 'child_mode_episode_limit_tip',
      voiceKey: 'child_mode_episode_limit_voice',
    }
  }
  return null
}

/**
 * 播放限制到达时的提示，包含文字提示与语音提示
 */
const notifyLimit = (info: LimitInfo) => {
  const now = Date.now()
  if (tipType == info.type && now - tipTime < TIP_INTERVAL) return
  tipType = info.type
  tipTime = now
  tip(info.tipKey, info.val)
  void speakTip(global.i18n.t(info.voiceKey))
}

/**
 * 开始播放前的检查，需要休息时阻止播放并给出提示
 */
const checkBeforePlay = (): boolean => {
  if (!settingState.setting['childMode.enable']) return true

  // 跨天后重置当日记录
  if (playTime.dailyInfo.date != getToday()) {
    playTime.dailyInfo = { date: getToday(), time: 0 }
    playTime.pausedStartTime = 0
    resetSinglePlay()
    saveDailyPlayInfo()
  }
  // 休息时间已足够时重新开始单次统计，避免定时器未运行时一直无法播放
  if (playTime.pausedStartTime && getPausedTime() >= getRestTime()) {
    resetSinglePlay()
    playTime.pausedStartTime = 0
  }

  const info = getLimitInfo()
  if (!info) return true
  // 集数限制：计入的最后一集还没播完时，允许继续播完这一集
  const isPlayingCountedMusic = playTime.musicId == playerState.musicInfo.id && playerState.playMusicInfo.musicInfo?.id == playTime.musicId
  if (info.type == 'episode' && isLastCountedMusicPlaying() && isPlayingCountedMusic) return true
  notifyLimit(info)
  return false
}

const tick = () => {
  const now = Date.now()
  const delta = playTime.lastTickTime ? (now - playTime.lastTickTime) / 1000 : 0
  playTime.lastTickTime = now

  const today = getToday()
  if (playTime.dailyInfo.date != today) {
    playTime.dailyInfo = { date: today, time: 0 }
    playTime.pausedStartTime = 0
    resetSinglePlay()
    saveDailyPlayInfo()
  }

  const restTime = getRestTime()

  if (!playerState.isPlay) {
    if (!playTime.pausedStartTime) playTime.pausedStartTime = now
    if (getPausedTime() >= restTime) resetSinglePlay()
    return
  }

  // 恢复播放时结算休息时长，休息够时长才重新开始单次统计
  if (playTime.pausedStartTime) {
    if (getPausedTime() >= restTime) resetSinglePlay()
    playTime.pausedStartTime = 0
  }
  playTime.singleTime += delta
  playTime.dailyInfo.time += delta
  countListenedMusic(delta)

  playTime.saveTimeCount += delta
  if (playTime.saveTimeCount >= SAVE_TIME_INTERVAL) {
    playTime.saveTimeCount = 0
    saveDailyPlayInfo()
  }

  const info = getLimitInfo()
  if (!info) return
  // 集数限制：等计入的最后一集播完再限制，不在 80% 处打断
  if (info.type == 'episode' && isLastCountedMusicPlaying()) return

  // 以当前系统时间为休息起点，休息时长不依赖定时器累加
  playTime.pausedStartTime = now
  saveDailyPlayInfo()
  notifyLimit(info)
  if (playerState.isPlay) void pause()
}

const startMonitor = () => {
  if (playTime.timer != null) return
  playTime.lastTickTime = Date.now()
  playTime.timer = BackgroundTimer.setInterval(() => {
    tick()
  }, TICK_TIME)
}

const stopMonitor = () => {
  if (playTime.timer == null) return
  BackgroundTimer.clearInterval(playTime.timer)
  playTime.timer = null
  playTime.lastTickTime = 0
}

const restartMonitor = () => {
  if (!settingState.setting['childMode.enable'] || isLimitEmpty()) {
    stopMonitor()
    return
  }
  startMonitor()
}

/**
 * 初始化儿童模式
 */
export const initChildMode = async(): Promise<void> => {
  playTime.dailyInfo = await getChildModeDailyPlayInfo()
  if (playTime.dailyInfo.date != getToday()) {
    playTime.dailyInfo = { date: getToday(), time: 0 }
    playTime.pausedStartTime = 0
    resetSinglePlay()
    saveDailyPlayInfo()
  } else {
    playTime.singleTime = playTime.dailyInfo.singleTime ?? 0
    playTime.episodeCount = playTime.dailyInfo.episodeCount ?? 0
    playTime.pausedStartTime = playTime.dailyInfo.pauseStartTime ?? 0
  }
  restartMonitor()

  global.state_event.on('configUpdated', keys => {
    if (keys.some(key => key == 'childMode.enable' || key == 'childMode.singlePlayTime' || key == 'childMode.singlePlayCount' || key == 'childMode.dailyPlayTime')) {
      restartMonitor()
    }
  })
}

/**
 * 校验密码是否正确
 */
export const verifyPassword = (password: string): boolean => {
  const storedPassword = settingState.setting['childMode.password']
  if (!storedPassword) return false
  return storedPassword == hashPassword(password)
}

/**
 * 启用儿童模式并设置密码
 * @returns 是否启用成功
 */
export const enableChildMode = (password: string, confirmPassword: string): boolean => {
  if (!password) {
    tip('child_mode_password_empty_tip')
    return false
  }
  if (password != confirmPassword) {
    tip('child_mode_password_not_match_tip')
    return false
  }
  updateSetting({
    'childMode.enable': true,
    'childMode.password': hashPassword(password),
  })
  isSettingVerified = true
  tip('child_mode_enabled_tip')
  return true
}

/**
 * 关闭儿童模式，需验证密码
 * @returns 是否关闭成功
 */
export const disableChildMode = (password: string): boolean => {
  if (!verifyPassword(password)) {
    tip('child_mode_password_error_tip')
    return false
  }
  updateSetting({
    'childMode.enable': false,
    'childMode.password': '',
  })
  isSettingVerified = true
  stopSpeakTip()
  tip('child_mode_disabled_tip')
  return true
}

/**
 * 修改儿童模式密码，需验证旧密码
 * @returns 是否修改成功
 */
export const changeChildModePassword = (oldPassword: string, newPassword: string, confirmPassword: string): boolean => {
  if (!verifyPassword(oldPassword)) {
    tip('child_mode_password_error_tip')
    return false
  }
  if (!newPassword) {
    tip('child_mode_password_empty_tip')
    return false
  }
  if (newPassword != confirmPassword) {
    tip('child_mode_password_not_match_tip')
    return false
  }
  updateSetting({ 'childMode.password': hashPassword(newPassword) })
  tip('child_mode_password_changed_tip')
  return true
}

/**
 * 重置当日播放时长记录
 */
export const resetTodayPlayTime = () => {
  playTime.dailyInfo = { date: getToday(), time: 0 }
  resetSinglePlay()
  saveDailyPlayInfo()
}

/**
 * 获取已播放信息，今日已播放时长 unit 分钟、单次已听完集数
 */
export const getPlayInfo = (): LX.ChildMode.PlayInfo => {
  return {
    playedTime: Math.floor(playTime.dailyInfo.time / 60),
    episodeCount: playTime.episodeCount,
  }
}

export const useChildModePlayInfo = (): LX.ChildMode.PlayInfo => {
  const [info, setInfo] = useState(getPlayInfo())
  useEffect(() => {
    const timer = setInterval(() => {
      setInfo(getPlayInfo())
    }, 5000)
    return () => {
      clearInterval(timer)
    }
  }, [])
  return info
}

/**
 * 是否需要验证密码才能修改设置
 */
export const isSettingLocked = (): boolean => {
  return settingState.setting['childMode.enable'] && !isSettingVerified
}

/**
 * 验证设置密码
 * @returns 是否验证通过
 */
export const verifySettingPassword = (password: string): boolean => {
  if (!verifyPassword(password)) {
    tip('child_mode_password_error_tip')
    return false
  }
  isSettingVerified = true
  return true
}

/**
 * 重新锁定设置（离开设置页时调用）
 */
export const lockSetting = (): void => {
  isSettingVerified = false
}

// 注册播放前置检查，避免达到限制后仍会先播出一小段音频
setBeforePlayInterceptor(checkBeforePlay)
