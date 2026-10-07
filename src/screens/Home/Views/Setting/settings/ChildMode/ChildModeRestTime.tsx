import { memo, useMemo } from 'react'
import { View } from 'react-native'

import InputItem, { type InputItemProps } from '../../components/InputItem'
import { createStyle } from '@/utils/tools'
import { useI18n } from '@/lang'
import { useSettingValue } from '@/store/setting/hook'
import { updateSetting } from '@/core/common'

const MIN_TIME = 1
const MAX_TIME = 4 * 60

export default memo(() => {
  const t = useI18n()
  const restTime = useSettingValue('childMode.restTime')

  const size = useMemo(() => {
    return restTime.toString()
  }, [restTime])

  const setTime: InputItemProps['onChanged'] = (value, callback) => {
    let time = parseInt(value)
    if (Number.isNaN(time) || time < MIN_TIME) time = MIN_TIME
    else if (time > MAX_TIME) time = MAX_TIME
    callback(time.toString())
    if (restTime == time) return
    updateSetting({ 'childMode.restTime': time })
  }

  return (
    <View style={styles.content}>
      <InputItem
        value={size}
        label={t('child_mode_rest_time')}
        onChanged={setTime}
        keyboardType="number-pad"
        placeholder={t('child_mode_rest_time_tip')} />
    </View>
  )
})

const styles = createStyle({
  content: {
    marginBottom: 5,
  },
})
