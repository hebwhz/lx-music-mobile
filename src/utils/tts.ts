import Tts from 'react-native-tts'

let initPromise: Promise<void> | null = null
let unavailable = false

/**
 * 初始化语音合成，尽量使用中文语音，语速稍慢、音调稍高，更贴近“儿童版”提示
 */
const initTts = async(): Promise<void> => {
  initPromise ??= (async() => {
    await Tts.getInitStatus()
    try {
      await Tts.setIgnoreSilentSwitch('ignore')
    } catch {}
    await Tts.setDefaultRate(0.45)
    await Tts.setDefaultPitch(1.3)
    const voices = await Tts.voices()
    const voice = voices.find(v => v.language.toLowerCase().startsWith('zh'))
    if (voice) await Tts.setDefaultVoice(voice.id)
    else await Tts.setDefaultLanguage('zh-CN')
  })()
  return initPromise
}

/**
 * 播放语音提示，设备不支持时静默失败，不影响正常播放逻辑
 */
const disableTts = () => {
  unavailable = true
  initPromise = null
}

export const speakTip = async(text: string): Promise<void> => {
  if (!text || unavailable) return
  let failed = false
  try {
    await initTts()
    void Tts.stop()
    Tts.speak(text)
  } catch (err) {
    failed = true
    console.log('speak tip error:', err)
  }
  if (failed) disableTts()
}

/**
 * 停止语音提示
 */
export const stopSpeakTip = (): void => {
  if (unavailable) return
  try {
    void Tts.stop()
  } catch {}
}
