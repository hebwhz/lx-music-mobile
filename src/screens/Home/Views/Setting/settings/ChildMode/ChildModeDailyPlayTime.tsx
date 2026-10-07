import { memo, useMemo } from 'react'
import { View } from 'react-native'

import InputItem, { type InputItemProps } from '../../components/InputItem'
import { createStyle } from '@/utils/tools'
import { useI18n } from '@/lang'
import { useSettingValue } from '@/store/setting/hook'
import { updateSetting } from '@/core/common'

const MAX_TIME = 24 * 60

export default memo(() => {
  const t = useI18n()
  const dailyPlayTime = useSettingValue('childMode.dailyPlayTime')

  const size = useMemo(() => {
    return dailyPlayTime > 0 ? dailyPlayTime.toString() : ''
  }, [dailyPlayTime])

  const setTime: InputItemProps['onChanged'] = (value, callback) => {
    let time = parseInt(value)
    if (Number.isNaN(time) || time < 0) time = 0
    else if (time > MAX_TIME) time = MAX_TIME
    const timeStr = time > 0 ? time.toString() : ''
    callback(timeStr)
    if (dailyPlayTime == time) return
    updateSetting({ 'childMode.dailyPlayTime': time })
  }

  return (
    <View style={styles.content}>
      <InputItem
        value={size}
        label={t('child_mode_daily_play_time')}
        onChanged={setTime}
        keyboardType="number-pad"
        placeholder={t('child_mode_time_unlimited')} />
    </View>
  )
})

const styles = createStyle({
  content: {
    marginBottom: 5,
  },
})
